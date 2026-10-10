// Taste-based color grading: Reinhard-style statistical color transfer,
// baked into an Adobe .cube 3D LUT so it renders through the existing
// lut.frag pipeline like any other LUT.
//
// Flow: agent (or UI) supplies Lab mean/std of the SOURCE clip and of a
// REFERENCE image the user likes ("grade like this"). We match the source
// distribution to the reference distribution, then bake the mapping into a
// 3D LUT. Pure logic — node-safe, no DOM/WebGL.

export interface LabStats {
  /** mean of L, a, b */
  mean: [number, number, number];
  /** std-dev of L, a, b */
  std: [number, number, number];
}

export interface TransferParams {
  srcMean: [number, number, number];
  srcStd: [number, number, number];
  refMean: [number, number, number];
  refStd: [number, number, number];
  /** 0..1 — how strongly the reference look is applied */
  strength: number;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

// sRGB (0..1) → linear
function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
  const x = clamp01(c);
  return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
}

export function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  // sRGB → XYZ (D65)
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  let x = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  let y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  let z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x);
  y = f(y);
  z = f(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

export function labToRgb(L: number, a: number, b: number): [number, number, number] {
  let y = (L + 16) / 116;
  let x = a / 500 + y;
  let z = y - b / 200;
  const finv = (t: number) => {
    const t3 = t * t * t;
    return t3 > 0.008856 ? t3 : (t - 16 / 116) / 7.787;
  };
  x = 0.95047 * finv(x);
  y = finv(y);
  z = 1.08883 * finv(z);
  let R = x * 3.2404542 + y * -1.5371385 + z * -0.4985314;
  let G = x * -0.969266 + y * 1.8760108 + z * 0.041556;
  let B = x * 0.0556434 + y * -0.2040259 + z * 1.0572252;
  return [linearToSrgb(R), linearToSrgb(G), linearToSrgb(B)];
}

/** Mean/std of Lab channels over an RGB pixel buffer (0..1 floats, RGBRGB...). */
export function labStatsOfPixels(pixels: Float32Array | number[]): LabStats {
  const n = Math.floor(pixels.length / 3);
  let ml = 0;
  let ma = 0;
  let mb = 0;
  const labs: number[] = new Array(n * 3);
  for (let i = 0; i < n; i++) {
    const [L, a, b] = rgbToLab(pixels[i * 3]!, pixels[i * 3 + 1]!, pixels[i * 3 + 2]!);
    labs[i * 3] = L;
    labs[i * 3 + 1] = a;
    labs[i * 3 + 2] = b;
    ml += L;
    ma += a;
    mb += b;
  }
  ml /= n;
  ma /= n;
  mb /= n;
  let sl = 0;
  let sa = 0;
  let sb = 0;
  for (let i = 0; i < n; i++) {
    sl += (labs[i * 3]! - ml) ** 2;
    sa += (labs[i * 3 + 1]! - ma) ** 2;
    sb += (labs[i * 3 + 2]! - mb) ** 2;
  }
  return {
    mean: [ml, ma, mb],
    std: [Math.sqrt(sl / n) || 1e-6, Math.sqrt(sa / n) || 1e-6, Math.sqrt(sb / n) || 1e-6],
  };
}

export function makeTransferParams(src: LabStats, ref: LabStats, strength = 0.85): TransferParams {
  const s = Math.min(1, Math.max(0, strength));
  return { srcMean: src.mean, srcStd: src.std, refMean: ref.mean, refStd: ref.std, strength: s };
}

/** Apply the transfer to one sRGB pixel (0..1). */
export function transferPixel(
  r: number,
  g: number,
  b: number,
  p: TransferParams,
): [number, number, number] {
  const [L, a, bb] = rgbToLab(r, g, b);
  // lerp between original and fully-transferred by strength
  const t = (sv: number, sm: number, ss: number, rm: number, rs: number) => {
    const full = rm + ((sv - sm) * rs) / ss;
    return sv + (full - sv) * p.strength;
  };
  const [R, G, B] = labToRgb(
    t(L, p.srcMean[0], p.srcStd[0], p.refMean[0], p.refStd[0]),
    t(a, p.srcMean[1], p.srcStd[1], p.refMean[1], p.refStd[1]),
    t(bb, p.srcMean[2], p.srcStd[2], p.refMean[2], p.refStd[2]),
  );
  return [clamp01(R), clamp01(G), clamp01(B)];
}

/**
 * Bake the transfer into Adobe .cube text (size³ lattice, R fastest — matches
 * the repo's cube.ts parser expectations).
 */
export function bakeCubeText(p: TransferParams, size = 33, title = 'taste-grade'): string {
  if (!Number.isInteger(size) || size < 2 || size > 64) {
    throw new Error(`cube size must be integer in [2,64], got ${size}`);
  }
  const lines: string[] = [`TITLE "${title.replace(/"/g, '')}"`, `LUT_3D_SIZE ${size}`];
  const step = 1 / (size - 1);
  for (let bi = 0; bi < size; bi++) {
    for (let gi = 0; gi < size; gi++) {
      for (let ri = 0; ri < size; ri++) {
        const [R, G, B] = transferPixel(ri * step, gi * step, bi * step, p);
        lines.push(`${R.toFixed(6)} ${G.toFixed(6)} ${B.toFixed(6)}`);
      }
    }
  }
  return lines.join('\n') + '\n';
}

/** Validate stats shape coming from an agent (defensive — agents invent numbers). */
export function parseLabStats(raw: unknown): LabStats | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const mean = o.mean;
  const std = o.std;
  if (!Array.isArray(mean) || !Array.isArray(std) || mean.length !== 3 || std.length !== 3) return null;
  const nums = [...mean, ...std].map(Number);
  if (nums.some((v) => !Number.isFinite(v))) return null;
  if (nums.slice(3).some((v) => v <= 0)) return null;
  return {
    mean: [nums[0]!, nums[1]!, nums[2]!],
    std: [nums[3]!, nums[4]!, nums[5]!],
  };
}
