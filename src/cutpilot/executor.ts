import { reduce } from '../editor/reduce.js';
import type { MarkerColor, MediaAsset, TimelineItem, TimelineState } from '../editor/types.js';
import { nowMs } from './metrics.js';
import type { CutAction, Segment } from './types.js';

/** Hard floor from the demo spec: do not cut a slice shorter than this. */
export const MIN_CUT_MS = 300;

export interface TimelineBuildOptions {
  mediaDurationMs: number;
  fps?: number;
  src?: string;
  width?: number;
  height?: number;
}

export interface GhostSpan {
  startFrame: number;
  durationInFrames: number;
}

export interface ExecuteResult {
  timeline: TimelineState;
  applied: CutAction;
  coerced: boolean;
  note?: string;
  executorMs: number;
  zoom: boolean;
  ghost?: GhostSpan;
}

const A_ROLL = 'V1';
const B_ROLL = 'V2';

function msToFrames(ms: number, fps: number): number {
  return Math.max(1, Math.round((ms / 1000) * fps));
}

export function buildTimeline(segments: readonly Segment[], options: TimelineBuildOptions): TimelineState {
  const fps = options.fps ?? 30;
  const src = options.src ?? '/cutpilot/sample.mp4';
  const asset: MediaAsset = {
    id: 'asset-cutpilot-sample',
    name: 'CutPilot sample',
    kind: 'video',
    src,
    durationInFrames: Math.max(1, Math.round((options.mediaDurationMs / 1000) * fps)),
    width: options.width ?? 640,
    height: options.height ?? 360,
  };
  let frame = 0;
  const items: TimelineItem[] = segments.map((segment) => {
    const durationInFrames = msToFrames(segment.endMs - segment.startMs, fps);
    const item: TimelineItem = {
      id: segment.id,
      track: A_ROLL,
      startFrame: frame,
      durationInFrames,
      name: segment.text.slice(0, 80) || 'silence',
      kind: 'video',
      src,
      sourceAssetId: asset.id,
      srcInFrame: Math.max(0, Math.round(((segment.sourceStartMs ?? segment.startMs) / 1000) * fps)),
      volume: 1,
    };
    frame += durationInFrames;
    return item;
  });
  return {
    fps,
    width: options.width ?? 1280,
    height: options.height ?? 720,
    items,
    assets: [asset],
    selectedId: null,
    trackOrder: [B_ROLL, A_ROLL],
    tracks: {
      [B_ROLL]: { kind: 'video', name: 'B-roll' },
      [A_ROLL]: { kind: 'video', name: 'A-roll' },
    },
    markers: [],
  };
}

function shiftTrack(state: TimelineState, track: string, atOrAfter: number, delta: number): TimelineState {
  if (delta === 0) return state;
  const moving = state.items
    .filter((item) => item.track === track && item.startFrame >= atOrAfter)
    .sort((a, b) => delta < 0 ? a.startFrame - b.startFrame : b.startFrame - a.startFrame);
  let next = state;
  for (const item of moving) {
    const current = next.items.find((candidate) => candidate.id === item.id);
    if (!current) continue;
    next = reduce(next, { type: 'move', id: item.id, startFrame: Math.max(0, current.startFrame + delta) });
  }
  return next;
}

function markerColor(action: CutAction): MarkerColor {
  if (action === 'cut') return 'red';
  if (action === 'trim') return 'yellow';
  if (action === 'broll') return 'purple';
  return 'green';
}

function annotate(
  state: TimelineState,
  segment: Segment,
  action: CutAction,
  frame: number,
  duration: number,
  note: string,
): TimelineState {
  return reduce(state, {
    type: 'addMarker',
    marker: {
      id: `mk-${segment.id}`,
      scope: 'project',
      fromFrame: Math.max(0, Math.round(frame)),
      durationFrames: Math.max(0, Math.round(duration)),
      note: `${action.toUpperCase()} ${note}`.slice(0, 180),
      color: markerColor(action),
    },
  });
}

/**
 * Apply one decision to the editor timeline. Cuts ripple on A-roll and pull
 * later B-roll with them. Slices under 300ms, and the opening or closing
 * source frame, are not fully removed.
 */
export function executeDecision(
  timeline: TimelineState,
  segment: Segment,
  requested: CutAction,
  extras: { zoom: boolean; brollLabel?: string; reason: string; mediaDurationMs: number },
): ExecuteResult {
  const started = nowMs();
  const item = timeline.items.find((candidate) => candidate.id === segment.id);
  if (!item) {
    return {
      timeline,
      applied: 'keep',
      coerced: requested !== 'keep',
      note: 'segment is no longer on the timeline',
      executorMs: nowMs() - started,
      zoom: false,
    };
  }
  const durationMs = segment.endMs - segment.startMs;
  const sourceStart = segment.sourceStartMs ?? segment.startMs;
  const sourceEnd = sourceStart + durationMs;
  const coversOpen = sourceStart <= 1;
  const coversClose = sourceEnd >= extras.mediaDurationMs - 1;
  let applied = requested;
  let coerced = false;
  let note = extras.reason;
  if (requested === 'cut' && durationMs < MIN_CUT_MS) {
    applied = 'keep';
    coerced = true;
    note = `kept: slice is under ${MIN_CUT_MS}ms`;
  } else if (requested === 'cut' && coversOpen && coversClose) {
    applied = 'keep';
    coerced = true;
    note = 'kept: refusing to drop the whole program';
  }

  let next = timeline;
  let ghost: GhostSpan | undefined;
  const oldStart = item.startFrame;
  const oldDuration = item.durationInFrames;
  const brollId = `broll-${segment.id}`;

  const pullBroll = (durationInFrames: number): void => {
    const stacked = next.items.find((candidate) => candidate.id === brollId);
    if (stacked) {
      next = reduce(next, { type: 'retime', id: stacked.id, durationInFrames, ripple: true });
      return;
    }
    next = shiftTrack(next, B_ROLL, oldStart + oldDuration, durationInFrames - oldDuration);
  };

  if (applied === 'cut' && (coversOpen || coversClose)) {
    const srcIn = item.srcInFrame ?? 0;
    const patch = coversOpen
      ? { durationInFrames: 1, srcInFrame: srcIn }
      : { durationInFrames: 1, srcInFrame: srcIn + Math.max(0, oldDuration - 1) };
    next = reduce(next, { type: 'retime', id: item.id, ...patch, ripple: true });
    pullBroll(1);
    applied = 'trim';
    coerced = true;
    note = coversOpen ? 'kept the opening frame' : 'kept the closing frame';
    ghost = { startFrame: oldStart, durationInFrames: oldDuration };
  } else if (applied === 'cut') {
    ghost = { startFrame: oldStart, durationInFrames: oldDuration };
    next = reduce(next, { type: 'remove', id: item.id, ripple: true });
    const stacked = next.items.find((candidate) => candidate.id === brollId);
    if (stacked) next = reduce(next, { type: 'remove', id: stacked.id, ripple: true });
    else next = shiftTrack(next, B_ROLL, oldStart + oldDuration, -oldDuration);
  } else if (applied === 'trim') {
    const trimFrames = Math.max(1, Math.round(oldDuration * 0.2));
    const durationInFrames = Math.max(1, oldDuration - trimFrames);
    if (durationInFrames < oldDuration) {
      next = reduce(next, { type: 'retime', id: item.id, durationInFrames, ripple: true });
      pullBroll(durationInFrames);
    }
  } else if (applied === 'broll') {
    const label = extras.brollLabel || 'B-roll';
    next = reduce(next, {
      type: 'add',
      startFrame: oldStart,
      item: {
        id: brollId,
        track: B_ROLL,
        durationInFrames: oldDuration,
        name: label,
        kind: 'solid',
        props: { color: '#d946ef' },
      },
    });
  }

  const still = next.items.find((candidate) => candidate.id === segment.id);
  if (extras.zoom && still && applied !== 'cut') {
    next = reduce(next, {
      type: 'setZoom',
      id: still.id,
      patch: { magnification: 1.35, shape: 'slow-push', focalPointX: 0.5, focalPointY: 0.42 },
    });
  }
  const markerFrame = still?.startFrame ?? oldStart;
  next = annotate(next, segment, applied, markerFrame, still ? Math.min(still.durationInFrames, 1) : 0, note);
  return {
    timeline: next,
    applied,
    coerced,
    note,
    executorMs: Math.max(0, nowMs() - started),
    zoom: Boolean(extras.zoom && still && applied !== 'cut'),
    ...(ghost ? { ghost } : {}),
  };
}
