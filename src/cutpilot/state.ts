import type { CutAction, DecisionState, LoggedDecision, Segment } from './types.js';

const MAX_TEXT = 240;
const PREV_LIMIT = 4;

/** Build the compact JSON a decision provider sees for one slice. */
export function buildDecisionState(
  segment: Segment,
  directive: string,
  previous: readonly Pick<LoggedDecision, 'segmentId' | 'action'>[],
): DecisionState {
  const prev: Array<{ segmentId: string; action: CutAction }> = previous.slice(-PREV_LIMIT).map((row) => ({
    segmentId: row.segmentId,
    action: row.action,
  }));
  return {
    segmentId: segment.id,
    index: segment.index,
    text: segment.text.replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT),
    durationMs: Math.max(0, segment.endMs - segment.startMs),
    silenceMs: segment.silenceMs,
    gapBeforeMs: segment.gapBeforeMs,
    directive: directive.replace(/\s+/g, ' ').trim().slice(0, 280),
    prev,
  };
}
