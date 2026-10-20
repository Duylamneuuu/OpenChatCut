import { interpolate } from 'remotion';
import { EASE } from './theme';

/** 30 fps, 900 frames, hard cuts on a 120 BPM grid (15 frames). */
export const FPS = 30;
export const DURATION = 900;

export const SCENES = {
  playhead: { from: 0, duration: 75 },
  print: { from: 75, duration: 75 },
  reveal: { from: 150, duration: 90 },
  snap: { from: 240, duration: 120 },
  log: { from: 360, duration: 120 },
  steer: { from: 480, duration: 120 },
  stream: { from: 600, duration: 120 },
  black: { from: 720, duration: 60 },
  end: { from: 780, duration: 120 },
} as const;

export const LINE_DRAWN = 28;
export const SILENCE_SNAP = 258;
export const UM_SNAP = 318;
export const KEEP_FLIP = 536;
export const TICK_FRAMES = [28, 266, 326, 548] as const;

if (TICK_FRAMES.join(',') !== [LINE_DRAWN, SILENCE_SNAP + 8, UM_SNAP + 8, KEEP_FLIP + 12].join(',')) {
  throw new Error('TICK_FRAMES drifted from the snap frames');
}

/**
 * Rule outputs on real slices. Confidences are the deterministic baseline
 * (src/cutpilot/providers/rule.ts), not a model score.
 * Silence: interview s005, 18290–18990 ms, cut 0.97.
 * Filler: stand-in s003, 3600–4100 ms, cut 0.95.
 * Jokes: stand-in s009 (10900 ms) and s015 (26900 ms). Empty directive cuts
 * both at 0.84. "keep the jokes" keeps a later joke at 0.93; an earlier
 * executed cut stays cut.
 * Latency is the measured rule row in samples/cutpilot/talk/benchmark-log.txt.
 */
export const SILENCE_LABEL = 'cut · silence 0.70 s';
export const UM_LABEL = 'cut · filler "um" 0.50 s';

export const LOG_ROWS = [
  { t: '18.29s', action: 'CUT', detail: 'silence', conf: 0.97 },
  { t: '3.60s', action: 'CUT', detail: 'filler "um"', conf: 0.95 },
  { t: '10.90s', action: 'CUT', detail: 'joke', conf: 0.84 },
] as const;

export const LATENCY = 'rule  p50 0.02 ms  p99 1.40 ms';

/** The 20 rule decisions on the benchmarked interview, in order. */
export const INTERVIEW_DECISIONS = [
  { t: '0.00s', action: 'KEEP', conf: 0.86 },
  { t: '6.22s', action: 'TRIM', conf: 0.72 },
  { t: '14.15s', action: 'KEEP', conf: 0.86 },
  { t: '15.56s', action: 'KEEP', conf: 0.86 },
  { t: '16.80s', action: 'KEEP', conf: 0.86 },
  { t: '18.29s', action: 'CUT', conf: 0.97 },
  { t: '18.99s', action: 'KEEP', conf: 0.86 },
  { t: '19.59s', action: 'KEEP', conf: 0.86 },
  { t: '23.41s', action: 'KEEP', conf: 0.86 },
  { t: '23.97s', action: 'CUT', conf: 0.97 },
  { t: '24.68s', action: 'KEEP', conf: 0.86 },
  { t: '26.32s', action: 'CUT', conf: 0.97 },
  { t: '26.89s', action: 'KEEP', conf: 0.86 },
  { t: '33.34s', action: 'KEEP', conf: 0.86 },
  { t: '39.39s', action: 'KEEP', conf: 0.86 },
  { t: '40.87s', action: 'KEEP', conf: 0.86 },
  { t: '42.37s', action: 'KEEP', conf: 0.86 },
  { t: '43.60s', action: 'KEEP', conf: 0.86 },
  { t: '48.27s', action: 'CUT', conf: 0.97 },
  { t: '48.98s', action: 'KEEP', conf: 0.86 },
] as const;

const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };

export function cameraAt(frame: number, width = 1920): { scale: number; tilt: number } {
  // Wide film pulls back from 1.30. The square cut caps the same move so the
  // 800px window stays inside the 100px safe area.
  const peak = Math.min(1.3, (width - 200) / 800);
  const approach = interpolate(frame, [75, 149], [1, peak], { easing: EASE, ...clamp });
  const pull = interpolate(frame, [166, 236], [peak, 1], { easing: EASE, ...clamp });
  const hero = interpolate(frame, [240, 340], [1, 1.06], { easing: EASE, ...clamp });
  const widen = interpolate(frame, [600, 660], [1.06, 0.96], { easing: EASE, ...clamp });
  let scale = 1;
  if (frame >= 75 && frame < 166) scale = approach;
  else if (frame >= 166 && frame < 240) scale = pull;
  else if (frame >= 240 && frame < 600) scale = hero;
  else if (frame >= 600 && frame < 720) scale = widen;

  const tiltIn = interpolate(frame, [150, 166], [0, 7], { easing: EASE, ...clamp });
  const tiltOut = interpolate(frame, [166, 230], [7, 0], { easing: EASE, ...clamp });
  let tilt = 0;
  if (frame >= 150 && frame < 166) tilt = tiltIn;
  else if (frame >= 166 && frame < 240) tilt = tiltOut;
  return { scale, tilt };
}

/** 0 = track only, 1 = full window. Morph, not a dissolve. */
export function chromeAt(frame: number): number {
  return interpolate(frame, [150, 168], [0, 1], { easing: EASE, ...clamp });
}

/** 0 timeline, 1 log, 2 steer. */
export function panelAt(frame: number): number {
  const toLog = interpolate(frame, [360, 378], [0, 1], { easing: EASE, ...clamp });
  const toSteer = interpolate(frame, [480, 498], [0, 1], { easing: EASE, ...clamp });
  if (frame < 360) return 0;
  if (frame < 480) return toLog;
  if (frame < 600) return 1 + toSteer;
  return 2;
}

/** Linear. 0.5 at the scene 1/2 cut, then slides right. */
export function playheadUnit(frame: number): number {
  if (frame < 75) return 0.5;
  if (frame >= 150) return 0.8;
  return 0.5 + (0.3 * (frame - 75)) / 75;
}
