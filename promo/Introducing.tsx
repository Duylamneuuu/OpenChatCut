import { AbsoluteFill, Img, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { PROMO_FONTS } from './fonts';

function fontBytes(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

const fontHandle = typeof document === 'undefined' ? null : delayRender('cutpilot-promo-fonts');
if (fontHandle) {
  void Promise.all(PROMO_FONTS.map(async (font) => {
    const face = new FontFace(font.family, fontBytes(font.base64), { weight: font.weight });
    document.fonts.add(await face.load());
  })).then(() => continueRender(fontHandle)).catch(() => continueRender(fontHandle));
}

const ink = {
  bg: '#101010',
  panel: '#181818',
  line: '#363636',
  text: '#f4f4f4',
  muted: '#b0b0b0',
  dim: '#8a8a8a',
  gold: '#e6ac42',
  accent: '#dc7036',
  keep: '#2d7fb5',
  cut: '#e06c60',
  good: '#3fae6a',
};

interface Slice {
  label: string;
  action: 'keep' | 'cut';
  weight: number;
  joke?: boolean;
  confidence: string;
  ms: string;
}

const SLICES: Slice[] = [
  { label: 'Welcome back', action: 'keep', weight: 1.35, confidence: '0.86', ms: '0.1' },
  { label: 'um', action: 'cut', weight: 0.48, confidence: '0.95', ms: '0.1' },
  { label: 'The desk is ready', action: 'keep', weight: 1.25, confidence: '0.88', ms: '0.2' },
  { label: '(silence)', action: 'cut', weight: 0.62, confidence: '0.97', ms: '0.1' },
  { label: 'Here is a joke', action: 'cut', weight: 1.2, joke: true, confidence: '0.84', ms: '0.2' },
  { label: 'Ship the cut', action: 'keep', weight: 1.05, confidence: '0.9', ms: '0.1' },
];

function fade(frame: number, start: number, end: number, edge = 14): number {
  const enter = interpolate(frame, [start, start + edge], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const exit = interpolate(frame, [end - edge, end], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return Math.min(enter, exit);
}

function letters(text: string, frame: number, fps: number, from: number) {
  return text.split('').map((char, index) => {
    const progress = spring({
      frame: frame - from - index * 2,
      fps,
      config: { damping: 14, stiffness: 180, mass: 0.6 },
    });
    return (
      <span
        key={`${char}-${index}`}
        style={{
          display: 'inline-block',
          transform: `translateY(${(1 - progress) * 28}px)`,
          opacity: progress,
          whiteSpace: 'pre',
        }}
      >
        {char}
      </span>
    );
  });
}

export function IntroducingCutPilot() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: ink.bg, color: ink.text, fontFamily: 'Geist, sans-serif', overflow: 'hidden' }}>
      <AbsoluteFill style={{
        background: 'radial-gradient(900px 520px at 18% 8%, rgba(220,112,54,0.16), transparent 60%), radial-gradient(800px 480px at 90% 100%, rgba(230,172,66,0.1), transparent 55%)',
      }} />
      <Title frame={frame} fps={fps} opacity={fade(frame, 0, 188, 16)} />
      <Workspace frame={frame} fps={fps} opacity={fade(frame, 168, 820, 16)} />
      <Steer frame={frame} fps={fps} opacity={fade(frame, 790, 990, 12)} />
      <EndCard frame={frame} fps={fps} opacity={fade(frame, 970, 1080, 16)} />
    </AbsoluteFill>
  );
}

function Title({ frame, fps, opacity }: { frame: number; fps: number; opacity: number }) {
  const rule = spring({ frame: frame - 6, fps, config: { damping: 18, stiffness: 120 } });
  const word = spring({ frame: frame - 28, fps, config: { damping: 16, stiffness: 90, mass: 0.8 } });
  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', padding: '0 140px' }}>
      <div style={{ width: 1200 * rule, height: 3, background: ink.gold, borderRadius: 2, marginBottom: 28 }} />
      <div style={{ fontFamily: 'Ioskeley Mono, monospace', letterSpacing: 8, fontSize: 22, color: ink.gold, fontWeight: 500 }}>
        {letters('INTRODUCING', frame, fps, 8)}
      </div>
      <div style={{
        marginTop: 18,
        fontSize: 132,
        lineHeight: 0.92,
        fontWeight: 700,
        letterSpacing: -4,
        transform: `translateY(${(1 - word) * 36}px)`,
        opacity: word,
      }}>
        CutPilot <span style={{ color: ink.accent }}>Live</span>
      </div>
      <div style={{ marginTop: 22, fontSize: 32, color: ink.muted, maxWidth: 820, opacity: word }}>
        The timeline edits itself while the picture is still playing.
      </div>
    </AbsoluteFill>
  );
}

function Workspace({ frame, fps, opacity }: { frame: number; fps: number; opacity: number }) {
  const enter = spring({ frame: frame - 176, fps, config: { damping: 18, stiffness: 110 } });
  const weights = SLICES.map((slice, index) => {
    const cutAt = 250 + index * 36;
    const cut = slice.action === 'cut'
      ? spring({ frame: frame - cutAt, fps, config: { damping: 16, stiffness: 150 } })
      : 0;
    const restore = slice.joke
      ? spring({ frame: frame - 860, fps, config: { damping: 13, stiffness: 120 } })
      : 0;
    const removed = cut * (1 - restore);
    return slice.weight * (1 - removed);
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0.001);
  const active = Math.min(SLICES.length - 1, Math.max(0, Math.floor((frame - 250) / 36)));
  const rate = interpolate(frame, [250, 430, 620, 760], [0, 3.2, 8.4, 11.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const decided = SLICES.filter((_, index) => frame >= 250 + index * 36).length;
  return (
    <AbsoluteFill style={{ opacity, padding: '72px 80px', transform: `translateY(${(1 - enter) * 40}px)` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontFamily: 'Ioskeley Mono, monospace', color: ink.dim, letterSpacing: 3, fontSize: 16 }}>WHILE IT PLAYS</div>
          <div style={{ fontSize: 54, fontWeight: 700, letterSpacing: -1.5, marginTop: 6 }}>Every slice gets a decision.</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'Ioskeley Mono, monospace', color: ink.dim, fontSize: 16 }}>DECISIONS / SEC</div>
          <div style={{ fontSize: 84, fontWeight: 700, letterSpacing: -2, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{rate.toFixed(1)}</div>
        </div>
      </div>
      <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '560px 1fr', gap: 28, alignItems: 'stretch' }}>
        <div style={{ background: '#000', borderRadius: 18, overflow: 'hidden', border: `1px solid ${ink.line}`, position: 'relative' }}>
          <Img src={staticFile('cutpilot/talk-still.jpg')} style={{ width: '100%', height: 340, objectFit: 'cover', objectPosition: 'center 20%' }} />
          <div style={{ position: 'absolute', left: 16, top: 16, background: 'rgba(16,16,16,0.82)', borderRadius: 8, padding: '8px 12px', fontSize: 18 }}>
            {SLICES[active]?.label}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
          {SLICES.map((slice, index) => {
            const born = spring({ frame: frame - (210 + index * 8), fps, config: { damping: 16, stiffness: 140 } });
            if (frame < 200 + index * 8) return null;
            const shown = frame >= 250 + index * 36;
            const action = slice.joke && frame >= 880 ? 'KEEP' : shown ? slice.action.toUpperCase() : '···';
            const color = action === 'CUT' ? ink.cut : action === 'KEEP' ? ink.good : ink.dim;
            return (
              <div key={slice.label} style={{
                opacity: born,
                transform: `translateX(${(1 - born) * 24}px)`,
                display: 'grid',
                gridTemplateColumns: '72px 1fr 72px 148px',
                gap: 12,
                alignItems: 'center',
                whiteSpace: 'nowrap',
                background: ink.panel,
                border: `1px solid ${ink.line}`,
                borderRadius: 10,
                padding: '10px 14px',
                fontFamily: 'Ioskeley Mono, monospace',
                fontSize: 18,
              }}>
                <span style={{ color: ink.dim }}>s00{index}</span>
                <span>{slice.label}</span>
                <span style={{ color, fontWeight: 700 }}>{action}</span>
                <span style={{ color: ink.muted, textAlign: 'right' }}>{shown ? `${slice.confidence} · ${slice.ms}ms` : ''}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ marginTop: 26 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: ink.dim, fontFamily: 'Ioskeley Mono, monospace', marginBottom: 8 }}>
          <span>A-ROLL</span>
          <span>{decided} DECISIONS ON THIS PASS</span>
        </div>
        <div style={{ position: 'relative', height: 72, background: '#25262b', borderRadius: 12, overflow: 'hidden', display: 'flex' }}>
          {SLICES.map((slice, index) => {
            const width = (weights[index]! / total) * 100;
            if (width < 0.4) return null;
            const cutting = slice.action === 'cut' && frame >= 250 + index * 36 && !(slice.joke && frame >= 880);
            return (
              <div key={slice.label} style={{
                width: `${width}%`,
                margin: 8,
                borderRadius: 6,
                background: cutting ? ink.cut : ink.keep,
                display: 'flex',
                alignItems: 'center',
                padding: '0 10px',
                fontSize: 16,
                fontWeight: 600,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}>
                {slice.label}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Steer({ frame, fps, opacity }: { frame: number; fps: number; opacity: number }) {
  const pop = spring({ frame: frame - 800, fps, config: { damping: 12, stiffness: 140, mass: 0.7 } });
  const note = 'keep the jokes';
  const typed = note.slice(0, Math.floor(interpolate(frame, [820, 870], [0, note.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })));
  const flipped = spring({ frame: frame - 888, fps, config: { damping: 12, stiffness: 160 } });
  return (
    <AbsoluteFill style={{ opacity, justifyContent: 'center', padding: '0 100px' }}>
      <div style={{
        transform: `scale(${0.96 + pop * 0.04})`,
        opacity: pop,
        background: '#141414',
        border: `1px solid ${ink.line}`,
        borderRadius: 20,
        padding: '28px 32px',
        display: 'grid',
        gridTemplateColumns: '1.1fr 0.9fr',
        gap: 28,
        boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
      }}>
        <div>
          <div style={{ fontFamily: 'Ioskeley Mono, monospace', color: ink.gold, letterSpacing: 3, fontSize: 16 }}>MID-RUN NOTE</div>
          <div style={{ fontSize: 42, fontWeight: 700, marginTop: 8, letterSpacing: -1 }}>Change the next cut without stopping.</div>
          <div style={{
            marginTop: 18,
            height: 64,
            borderRadius: 12,
            border: `1px solid ${ink.line}`,
            background: '#101010',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            fontSize: 28,
            fontFamily: 'Ioskeley Mono, monospace',
          }}>
            {typed}
            <span style={{ opacity: frame % 16 < 8 ? 1 : 0, color: ink.gold }}>|</span>
          </div>
        </div>
        <div style={{
          borderRadius: 14,
          background: flipped > 0.5 ? 'rgba(63,174,106,0.14)' : 'rgba(224,108,96,0.12)',
          border: `1px solid ${flipped > 0.5 ? ink.good : ink.cut}`,
          padding: 20,
          transform: `translateY(${(1 - flipped) * 8}px)`,
        }}>
          <div style={{ fontFamily: 'Ioskeley Mono, monospace', color: ink.dim, fontSize: 16 }}>s004 · Here is a joke</div>
          <div style={{ fontSize: 40, fontWeight: 700, marginTop: 8, color: flipped > 0.5 ? ink.good : ink.cut }}>
            {flipped > 0.5 ? 'KEEP' : 'CUT'}
          </div>
          <div style={{ marginTop: 8, color: ink.muted, fontSize: 18 }}>
            {flipped > 0.5 ? '0.93 · directive kept the joke' : '0.84 · joke aside'}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}

function EndCard({ frame, fps, opacity }: { frame: number; fps: number; opacity: number }) {
  const enter = spring({ frame: frame - 980, fps, config: { damping: 16, stiffness: 100 } });
  return (
    <AbsoluteFill style={{ opacity, padding: '80px 90px', display: 'flex', flexDirection: 'row', gap: 48, alignItems: 'center' }}>
      <div style={{ flex: '0 0 620px' }}>
        <div style={{ fontFamily: 'Ioskeley Mono, monospace', color: ink.gold, letterSpacing: 3, fontSize: 18 }}>OPENCHATCUT</div>
        <div style={{ fontSize: 78, fontWeight: 700, letterSpacing: -2.5, lineHeight: 0.95, marginTop: 12 }}>
          Introducing<br />CutPilot Live
        </div>
        <div style={{ marginTop: 22, fontSize: 26, color: ink.muted, maxWidth: 520 }}>
          Open the demo. The rule pass needs no key. A local model is optional.
        </div>
        <div style={{ marginTop: 28, fontFamily: 'Ioskeley Mono, monospace', fontSize: 22, color: ink.text }}>
          localhost:5199/#/cutpilot
        </div>
      </div>
      <div style={{
        flex: 1,
        transform: `translateY(${(1 - enter) * 30}px) scale(${0.98 + enter * 0.02})`,
        opacity: enter,
        borderRadius: 16,
        overflow: 'hidden',
        border: `1px solid ${ink.line}`,
        boxShadow: '0 24px 70px rgba(0,0,0,0.4)',
      }}>
        <Img src={staticFile('cutpilot/promo-steered.png')} style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>
    </AbsoluteFill>
  );
}
