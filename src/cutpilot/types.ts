// Shared contracts for the CutPilot Live decision loop.
import type { TranscriptWord } from '../transcript/types.js';

export type CutAction = 'keep' | 'cut' | 'trim' | 'broll';

export const CUT_ACTIONS: readonly CutAction[] = ['keep', 'cut', 'trim', 'broll'];

export function isCutAction(value: unknown): value is CutAction {
  return value === 'keep' || value === 'cut' || value === 'trim' || value === 'broll';
}

/** One deterministic slice of a transcript (sentence, silence gap, or scene cut). */
export interface Segment {
  id: string;
  index: number;
  /** Placement on the decision clock, in milliseconds. */
  startMs: number;
  endMs: number;
  /**
   * Position in the source media. Repeats of a clip keep this stable while
   * `startMs` walks forward on the decision clock.
   */
  sourceStartMs: number;
  text: string;
  /** How much of this slice is silence. Speech slices are 0. */
  silenceMs: number;
  /** Silence that immediately preceded this slice. */
  gapBeforeMs: number;
  words: TranscriptWord[];
}

/** Compact per-step payload. Providers see this, not the whole project. */
export interface DecisionState {
  segmentId: string;
  index: number;
  text: string;
  durationMs: number;
  silenceMs: number;
  gapBeforeMs: number;
  directive: string;
  prev: Array<{ segmentId: string; action: CutAction }>;
}

export interface ProviderOutput {
  action: CutAction;
  confidence: number;
  reason: string;
  zoom: boolean;
  brollLabel?: string;
  /** In-process decision time. Zero when the endpoint does not report it. */
  modelMs: number;
  /** Round-trip wait. Zero for the in-process rule provider. */
  networkMs: number;
  /**
   * True when the endpoint did not separate compute from transport.
   * `networkMs` then holds the whole upstream wait and `modelMs` is 0.
   */
  upstreamUnsplit: boolean;
  /** Set when a remote provider already applied the confidence escalation. */
  escalated?: boolean;
  providerId?: string;
  /** Set when the server already priced this call, including an escalation. */
  costUsd?: number | null;
}

export interface DecisionProvider {
  readonly id: string;
  /** Dollars per 1,000 decisions. Null means the price was not configured. */
  readonly usdPer1k: number | null;
  /** True when `decide` already escalates below the confidence threshold. */
  readonly escalatesInternally?: boolean;
  decide(state: DecisionState): Promise<ProviderOutput>;
}

export interface LoggedDecision {
  index: number;
  segmentId: string;
  startMs: number;
  endMs: number;
  text: string;
  /** Action written to the timeline. */
  action: CutAction;
  /** Action the provider returned before hard rules. */
  requested: CutAction;
  confidence: number;
  latencyMs: number;
  modelMs: number;
  networkMs: number;
  executorMs: number;
  provider: string;
  escalated: boolean;
  fallback: boolean;
  reason: string;
  zoom: boolean;
  brollLabel?: string;
  costUsd: number | null;
  coerced: boolean;
  upstreamUnsplit: boolean;
}

export interface LabelRow {
  segmentId: string;
  action: CutAction;
}

export interface LabelFile {
  version: 1;
  clipId: string;
  fps: number;
  directive: string;
  about: string;
  labels: LabelRow[];
}
