import { liveMetrics, percentileTriple, type Percentiles } from './metrics.js';
import type { CutAction, LabelRow, LoggedDecision } from './types.js';
import { CUT_ACTIONS } from './types.js';

export interface ClassScore {
  precision: number;
  recall: number;
  f1: number;
  support: number;
  predicted: number;
}

export interface ScoreCard {
  matched: number;
  labeled: number;
  agreement: number | null;
  f1Macro: number | null;
  f1Cut: number | null;
  perClass: Record<CutAction, ClassScore>;
  chain20: number | null;
  latency: Percentiles;
  model: Percentiles;
  network: Percentiles;
  executor: Percentiles;
  usdPer1k: number | null;
  unpriced: number;
  upstreamUnsplit: boolean;
}

function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}

function f1(precision: number, recall: number): number {
  if (precision + recall === 0) return 0;
  return (2 * precision * recall) / (precision + recall);
}

export function scoreDecisions(decisions: readonly LoggedDecision[], labels: readonly LabelRow[]): ScoreCard {
  const byId = new Map(decisions.map((decision) => [decision.segmentId, decision]));
  const matrix = Object.fromEntries(CUT_ACTIONS.map((action) => [action, { tp: 0, fp: 0, fn: 0 }])) as Record<CutAction, { tp: number; fp: number; fn: number }>;
  let matched = 0;
  let correct = 0;
  const labeledSequence: boolean[] = [];
  for (const label of labels) {
    const decision = byId.get(label.segmentId);
    if (!decision) {
      matrix[label.action].fn += 1;
      continue;
    }
    matched += 1;
    const hit = decision.action === label.action;
    if (hit) correct += 1;
    labeledSequence.push(hit);
    if (hit) matrix[label.action].tp += 1;
    else {
      matrix[label.action].fn += 1;
      matrix[decision.action].fp += 1;
    }
  }
  const predictedIds = new Set(labels.map((label) => label.segmentId));
  for (const decision of decisions) {
    if (predictedIds.has(decision.segmentId)) continue;
    matrix[decision.action].fp += 1;
  }
  const perClass = Object.fromEntries(CUT_ACTIONS.map((action) => {
    const cell = matrix[action];
    const precision = safeDivide(cell.tp, cell.tp + cell.fp);
    const recall = safeDivide(cell.tp, cell.tp + cell.fn);
    return [action, {
      precision,
      recall,
      f1: f1(precision, recall),
      support: cell.tp + cell.fn,
      predicted: cell.tp + cell.fp,
    }];
  })) as Record<CutAction, ClassScore>;
  const active = CUT_ACTIONS.filter((action) => perClass[action].support > 0 || perClass[action].predicted > 0);
  const f1Macro = active.length ? active.reduce((sum, action) => sum + perClass[action].f1, 0) / active.length : null;
  const cut = perClass.cut;
  const windows: number[] = [];
  for (let index = 0; index + 20 <= labeledSequence.length; index += 1) {
    windows.push(labeledSequence.slice(index, index + 20).every(Boolean) ? 1 : 0);
  }
  const priced = decisions.filter((decision) => decision.costUsd !== null);
  const usdPer1k = priced.length
    ? (priced.reduce((sum, decision) => sum + (decision.costUsd ?? 0), 0) / priced.length) * 1000
    : null;
  const metrics = liveMetrics(decisions, Math.max(1, decisions.reduce((sum, decision) => sum + decision.latencyMs, 0)));
  return {
    matched,
    labeled: labels.length,
    agreement: labels.length ? correct / labels.length : null,
    f1Macro,
    f1Cut: cut.support + cut.predicted > 0 ? cut.f1 : null,
    perClass,
    chain20: windows.length ? windows.reduce((sum, value) => sum + value, 0) / windows.length : null,
    latency: percentileTriple(decisions.map((decision) => decision.latencyMs)),
    model: percentileTriple(decisions.map((decision) => decision.modelMs)),
    network: percentileTriple(decisions.map((decision) => decision.networkMs)),
    executor: percentileTriple(decisions.map((decision) => decision.executorMs)),
    usdPer1k,
    unpriced: metrics.unpriced,
    upstreamUnsplit: decisions.some((decision) => decision.upstreamUnsplit),
  };
}

function num(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'n/a';
  return value.toFixed(3);
}

function ms(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'n/a';
  return value.toFixed(2);
}

export function formatScoreCard(provider: string, card: ScoreCard, note?: string): string {
  const lines = [
    `provider: ${provider}${note ? ` (${note})` : ''}`,
    `decisions: ${card.matched}/${card.labeled} labeled matched`,
    `agreement: ${num(card.agreement)}`,
    `macro F1: ${num(card.f1Macro)}    cut F1: ${num(card.f1Cut)}    chain-20: ${num(card.chain20)}`,
    `latency ms  p50 ${ms(card.latency.p50)}  p95 ${ms(card.latency.p95)}  p99 ${ms(card.latency.p99)}`,
    `model ms    p50 ${ms(card.model.p50)}  p95 ${ms(card.model.p95)}  p99 ${ms(card.model.p99)}`,
    `network ms  p50 ${ms(card.network.p50)}  p95 ${ms(card.network.p95)}  p99 ${ms(card.network.p99)}`,
    `executor ms p50 ${ms(card.executor.p50)}  p95 ${ms(card.executor.p95)}  p99 ${ms(card.executor.p99)}`,
    `usd / 1000 decisions: ${card.usdPer1k === null ? 'not configured' : card.usdPer1k.toFixed(6)}${card.unpriced ? ` (${card.unpriced} unpriced)` : ''}`,
  ];
  if (card.upstreamUnsplit) {
    lines.push('note: model compute was not reported separately; network ms is the full upstream round trip and model ms is 0.');
  }
  return lines.join('\n');
}
