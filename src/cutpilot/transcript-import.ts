import type { TranscriptWord } from '../transcript/types.js';

interface LooseWord {
  text?: unknown;
  word?: unknown;
  start?: unknown;
  end?: unknown;
  offsets?: { from?: unknown; to?: unknown };
}

function asNumber(value: unknown): number | null {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function pushWord(out: TranscriptWord[], text: string, start: number, end: number, scale: number): void {
  const clean = text.trim();
  if (!clean) return;
  const startMs = Math.round(start * scale);
  const endMs = Math.round(end * scale);
  if (endMs <= startMs) return;
  out.push({ text: clean, start: startMs, end: endMs });
}

/**
 * Accept this repo's millisecond transcript, whisper.cpp token JSON, or an
 * OpenAI verbose_json word list (seconds). Values that look like seconds
 * (a fractional timestamp, and nothing above 1000) are scaled to milliseconds.
 */
export function importTranscript(payload: unknown): TranscriptWord[] {
  const root = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const buckets: LooseWord[] = [];
  const take = (value: unknown): void => {
    if (!Array.isArray(value)) return;
    for (const entry of value) {
      if (entry && typeof entry === 'object') buckets.push(entry as LooseWord);
    }
  };
  take(root.words);
  if (Array.isArray(root.segments)) {
    for (const segment of root.segments) {
      if (segment && typeof segment === 'object') take((segment as { words?: unknown }).words);
    }
  }
  if (Array.isArray(root.transcription)) {
    for (const segment of root.transcription) {
      if (!segment || typeof segment !== 'object') continue;
      const tokens = (segment as { tokens?: unknown }).tokens;
      take(tokens);
      if (!Array.isArray(tokens) && (segment as LooseWord).text) buckets.push(segment as LooseWord);
    }
  }

  const raw: Array<{ text: string; start: number; end: number }> = [];
  for (const word of buckets) {
    const text = typeof word.text === 'string' ? word.text : typeof word.word === 'string' ? word.word : '';
    const offsetStart = asNumber(word.offsets?.from);
    const offsetEnd = asNumber(word.offsets?.to);
    const start = offsetStart ?? asNumber(word.start);
    const end = offsetEnd ?? asNumber(word.end);
    if (!text.trim() || start === null || end === null) continue;
    raw.push({ text, start, end });
  }
  const looksLikeSeconds = raw.some((word) => !Number.isInteger(word.start) || !Number.isInteger(word.end))
    && raw.every((word) => word.end <= 1000);
  const scale = looksLikeSeconds ? 1000 : 1;
  const words: TranscriptWord[] = [];
  for (const word of raw) pushWord(words, word.text, word.start, word.end, scale);
  words.sort((a, b) => a.start - b.start || a.end - b.end);
  return words;
}
