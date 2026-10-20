import type { DecisionProvider, DecisionState, ProviderOutput } from '../types.js';

export interface EscalatedDecision extends ProviderOutput {
  escalated: boolean;
  providerId: string;
}

/**
 * Call `escalation` only when the primary confidence is below `threshold`.
 * A missing escalation provider leaves the primary decision in place.
 */
export async function decideWithEscalation(
  primary: DecisionProvider,
  escalation: DecisionProvider | null,
  state: DecisionState,
  threshold = 0.6,
): Promise<EscalatedDecision> {
  const first = await primary.decide(state);
  if (first.confidence >= threshold || !escalation) {
    return { ...first, escalated: false, providerId: primary.id };
  }
  const second = await escalation.decide(state);
  return {
    ...second,
    escalated: true,
    providerId: `${primary.id}+${escalation.id}`,
    modelMs: first.modelMs + second.modelMs,
    networkMs: first.networkMs + second.networkMs,
    upstreamUnsplit: first.upstreamUnsplit || second.upstreamUnsplit,
  };
}

export function decisionCostUsd(
  primary: DecisionProvider,
  escalation: DecisionProvider | null,
  escalated: boolean,
): number | null {
  if (!escalated || !escalation) return primary.usdPer1k === null ? null : primary.usdPer1k / 1000;
  if (primary.usdPer1k === null || escalation.usdPer1k === null) return null;
  return (primary.usdPer1k + escalation.usdPer1k) / 1000;
}
