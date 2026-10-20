import type { LoggedDecision } from './types.js';

export interface Percentiles {
  p50: number | null;
  p95: number | null;
  p99: number | null;
}

export interface LiveMetrics {
  count: number;
  perSecond: number;
  latency: Percentiles;
  model: Percentiles;
  network: Percentiles;
  executor: Percentiles;
  /** Sum of decisions whose price was configured. */
  costUsd: number;
  unpriced: number;
}

export function nowMs(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

/** Linear percentile. `values` need not be sorted. Empty input yields nulls. */
export function percentiles(values: readonly number[], picks: readonly number[] = [50, 95, 99]): number[] {
  if (!values.length) return picks.map(() => Number.NaN);
  const sorted = [...values].sort((a, b) => a - b);
  return picks.map((pick) => {
    const rank = (Math.min(100, Math.max(0, pick)) / 100) * (sorted.length - 1);
    const low = Math.floor(rank);
    const high = Math.ceil(rank);
    const lower = sorted[low] ?? sorted[0]!;
    const upper = sorted[high] ?? lower;
    if (low === high) return lower;
    return lower * (high - rank) + upper * (rank - low);
  });
}

export function percentileTriple(values: readonly number[]): Percentiles {
  if (!values.length) return { p50: null, p95: null, p99: null };
  const [p50, p95, p99] = percentiles(values);
  return { p50: p50 ?? null, p95: p95 ?? null, p99: p99 ?? null };
}

export function liveMetrics(decisions: readonly LoggedDecision[], elapsedMs: number): LiveMetrics {
  const elapsed = Math.max(elapsedMs, 1);
  let costUsd = 0;
  let unpriced = 0;
  for (const decision of decisions) {
    if (decision.costUsd === null) unpriced += 1;
    else costUsd += decision.costUsd;
  }
  return {
    count: decisions.length,
    perSecond: decisions.length / (elapsed / 1000),
    latency: percentileTriple(decisions.map((decision) => decision.latencyMs)),
    model: percentileTriple(decisions.map((decision) => decision.modelMs)),
    network: percentileTriple(decisions.map((decision) => decision.networkMs)),
    executor: percentileTriple(decisions.map((decision) => decision.executorMs)),
    costUsd,
    unpriced,
  };
}

export function formatMs(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '—';
  if (value < 10) return `${value.toFixed(1)} ms`;
  return `${Math.round(value)} ms`;
}

export function formatClock(ms: number): string {
  const clamped = Math.max(0, Math.round(ms));
  const minutes = Math.floor(clamped / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const hundredths = Math.floor((clamped % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(hundredths).padStart(2, '0')}`;
}

export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return 'n/a';
  if (value === 0) return '$0.000000';
  if (value < 0.01) return `$${value.toFixed(6)}`;
  return `$${value.toFixed(4)}`;
}
