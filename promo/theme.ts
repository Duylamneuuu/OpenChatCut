import { Easing, interpolate } from 'remotion';

export const BG = '#FAFAFA';
export const HOLD = '#FFFFFF';
export const TEXT = '#0A0A0B';
export const MUTED = '#6B6B73';
export const ACCENT = '#4D7C0F';
export const LINE = '#00000014';
export const SURFACE = '#FFFFFF';
export const CLIP = '#F4F4F5';
export const WAVE = '#8E8E96';

export const DISPLAY = 'Geist, sans-serif';
export const MONO = '"Ioskeley Mono", ui-monospace, monospace';

/** Entrances and exits. No overshoot. */
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);

export const WINDOW_W = 800;
export const WINDOW_H = 416;
export const WINDOW_TOP = 400;
export const TITLE_H = 64;
export const PAD = 32;
export const TRACK_H = 128;
export const TRACK_W = WINDOW_W - PAD * 2;
export const TRACK_Y = WINDOW_TOP + TITLE_H + PAD;
export const TRACK_CENTER_Y = TRACK_Y + TRACK_H / 2;

export function windowLeft(width: number): number {
  return (width - WINDOW_W) / 2;
}

export function enter(frame: number, start: number, length = 16): number {
  return interpolate(frame, [start, start + length], [0, 1], {
    easing: EASE,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

export function exit(frame: number, start: number, length = 8): number {
  return interpolate(frame, [start, start + length], [1, 0], {
    easing: EASE,
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

export function rise(progress: number, distance = 16): { opacity: number; translate: string; filter?: string } {
  const blur = (1 - progress) * 8;
  return {
    opacity: progress,
    translate: `0 ${(1 - progress) * distance}px`,
    filter: blur > 0.4 ? `blur(${blur}px)` : undefined,
  };
}
