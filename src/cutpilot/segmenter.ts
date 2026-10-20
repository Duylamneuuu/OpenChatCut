import type { TranscriptWord } from '../transcript/types.js';
import type { Segment } from './types.js';

export const DEFAULT_SILENCE_GAP_MS = 400;
export const DEFAULT_MAX_SEGMENT_MS = 8_000;

export interface SegmentOptions {
  /** End of the media. A trailing gap at least `silenceGapMs` becomes a silence slice. */
  durationMs?: number;
  silenceGapMs?: number;
  maxSegmentMs?: number;
}

interface Draft {
  words: TranscriptWord[];
  startMs: number;
  endMs: number;
  gapBeforeMs: number;
}

function endsSentence(text: string): boolean {
  return /[.!?。！？]$/.test(text.trim());
}

function reindex(segments: Array<Omit<Segment, 'id' | 'index'> & { id?: string }>): Segment[] {
  return segments.map((segment, index) => ({
    ...segment,
    index,
    id: `s${String(index).padStart(3, '0')}`,
  }));
}

function speechSlice(draft: Draft): Omit<Segment, 'id' | 'index'> {
  return {
    startMs: draft.startMs,
    endMs: Math.max(draft.endMs, draft.startMs + 1),
    sourceStartMs: draft.startMs,
    text: draft.words.map((word) => word.text).join(' ').trim(),
    silenceMs: 0,
    gapBeforeMs: draft.gapBeforeMs,
    words: draft.words,
  };
}

function silenceSlice(startMs: number, endMs: number, gapBeforeMs: number): Omit<Segment, 'id' | 'index'> {
  return {
    startMs,
    endMs,
    sourceStartMs: startMs,
    text: '(silence)',
    silenceMs: endMs - startMs,
    gapBeforeMs,
    words: [],
  };
}

/**
 * Split words on sentence punctuation, silence gaps, and a max duration.
 * Silence longer than the gap threshold becomes its own slice so a rule
 * provider can drop dead air without a model.
 */
export function segmentTranscript(
  words: readonly TranscriptWord[],
  options: SegmentOptions = {},
): Segment[] {
  const silenceGapMs = options.silenceGapMs ?? DEFAULT_SILENCE_GAP_MS;
  const maxSegmentMs = options.maxSegmentMs ?? DEFAULT_MAX_SEGMENT_MS;
  const sorted = [...words]
    .filter((word) => Number.isFinite(word.start) && Number.isFinite(word.end) && word.end > word.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const slices: Array<Omit<Segment, 'id' | 'index'>> = [];
  let draft: Draft | null = null;

  const close = (): void => {
    if (!draft || draft.words.length === 0) {
      draft = null;
      return;
    }
    slices.push(speechSlice(draft));
    draft = null;
  };

  const addSilence = (startMs: number, endMs: number): void => {
    if (endMs - startMs < silenceGapMs) return;
    slices.push(silenceSlice(startMs, endMs, 0));
  };

  for (const word of sorted) {
    if (!draft) {
      const prevEnd = slices.length ? slices[slices.length - 1]!.endMs : 0;
      if (word.start - prevEnd >= silenceGapMs) addSilence(prevEnd, word.start);
      draft = { words: [word], startMs: word.start, endMs: word.end, gapBeforeMs: Math.max(0, word.start - prevEnd) };
    } else {
      const gap = word.start - draft.endMs;
      const wouldEnd = Math.max(draft.endMs, word.end);
      if (gap >= silenceGapMs) {
        close();
        addSilence(slices.length ? slices[slices.length - 1]!.endMs : draft.endMs, word.start);
        const prevEnd = slices.length ? slices[slices.length - 1]!.endMs : word.start;
        draft = { words: [word], startMs: word.start, endMs: word.end, gapBeforeMs: Math.max(0, word.start - prevEnd) };
      } else if (wouldEnd - draft.startMs > maxSegmentMs && draft.words.length) {
        close();
        draft = { words: [word], startMs: word.start, endMs: word.end, gapBeforeMs: 0 };
      } else {
        draft.words.push(word);
        draft.endMs = wouldEnd;
      }
    }
    if (draft && endsSentence(word.text) && draft.endMs - draft.startMs >= 300) close();
  }
  close();

  const durationMs = options.durationMs;
  if (durationMs !== undefined && slices.length) {
    const tail = durationMs - slices[slices.length - 1]!.endMs;
    if (tail >= silenceGapMs) addSilence(slices[slices.length - 1]!.endMs, durationMs);
  } else if (durationMs !== undefined && durationMs >= silenceGapMs) {
    addSilence(0, durationMs);
  }
  return reindex(slices);
}

/** Split any slice a scene cut falls inside. Cuts within 80ms of an edge stay put. */
export function splitSegmentsAtScenes(segments: readonly Segment[], sceneMs: readonly number[]): Segment[] {
  let current: Segment[] = [...segments];
  for (const cut of [...sceneMs].filter((value) => Number.isFinite(value)).sort((a, b) => a - b)) {
    const next: Array<Omit<Segment, 'id' | 'index'>> = [];
    for (const segment of current) {
      if (cut <= segment.startMs + 80 || cut >= segment.endMs - 80) {
        next.push(segment);
        continue;
      }
      const sourceOffset = segment.sourceStartMs - segment.startMs;
      const leftWords = segment.words.filter((word) => word.start < cut);
      const rightWords = segment.words.filter((word) => word.start >= cut);
      const leftText = leftWords.map((word) => word.text).join(' ').trim();
      const rightText = rightWords.map((word) => word.text).join(' ').trim();
      next.push({
        startMs: segment.startMs,
        endMs: cut,
        sourceStartMs: segment.sourceStartMs,
        text: leftText || '(silence)',
        silenceMs: leftWords.length ? 0 : cut - segment.startMs,
        gapBeforeMs: segment.gapBeforeMs,
        words: leftWords,
      }, {
        startMs: cut,
        endMs: segment.endMs,
        sourceStartMs: cut + sourceOffset,
        text: rightText || '(silence)',
        silenceMs: rightWords.length ? 0 : segment.endMs - cut,
        gapBeforeMs: 0,
        words: rightWords,
      });
    }
    current = reindex(next);
  }
  return current;
}

/** Replay `segments` until `count` decisions exist. Source in-points stay on the original media. */
export function repeatSegments(segments: readonly Segment[], count: number): Segment[] {
  if (!segments.length || count <= 0) return [];
  const out: Array<Omit<Segment, 'id' | 'index'>> = [];
  let cursor = 0;
  while (out.length < count) {
    const source = segments[out.length % segments.length]!;
    const duration = Math.max(1, source.endMs - source.startMs);
    out.push({
      ...source,
      startMs: cursor,
      endMs: cursor + duration,
      sourceStartMs: source.sourceStartMs ?? source.startMs,
    });
    cursor += duration;
  }
  return reindex(out);
}
