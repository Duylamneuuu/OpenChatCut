import { buildTimeline, executeDecision, type GhostSpan } from './executor.js';
import { nowMs } from './metrics.js';
import { decisionCostUsd, decideWithEscalation } from './providers/escalate.js';
import { createRuleProvider } from './providers/rule-provider.js';
import { buildDecisionState } from './state.js';
import type { DecisionProvider, LoggedDecision, Segment } from './types.js';

export interface CutSession {
  segments: Segment[];
  timeline: ReturnType<typeof buildTimeline>;
  decisions: LoggedDecision[];
  cursor: number;
  directive: string;
  mediaDurationMs: number;
  fps: number;
  startedAtMs: number | null;
}

export interface StepResult {
  session: CutSession;
  step: LoggedDecision | null;
  ghost?: GhostSpan;
  error?: string;
}

export interface SessionOptions {
  mediaDurationMs: number;
  fps?: number;
  src?: string;
  directive?: string;
  width?: number;
  height?: number;
}

export function createSession(segments: readonly Segment[], options: SessionOptions): CutSession {
  const fps = options.fps ?? 30;
  return {
    segments: [...segments],
    timeline: buildTimeline(segments, {
      mediaDurationMs: options.mediaDurationMs,
      fps,
      src: options.src,
      width: options.width,
      height: options.height,
    }),
    decisions: [],
    cursor: 0,
    directive: options.directive ?? '',
    mediaDurationMs: options.mediaDurationMs,
    fps,
    startedAtMs: null,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Decide the next slice and write it to the timeline. The directive is read
 * from the session at call time, so a mid-run note applies on the next step.
 */
export async function stepSession(
  session: CutSession,
  primary: DecisionProvider,
  escalation: DecisionProvider | null,
  threshold = 0.6,
): Promise<StepResult> {
  const segment = session.segments[session.cursor];
  if (!segment) return { session, step: null };
  const state = buildDecisionState(segment, session.directive, session.decisions);
  let fallback = false;
  let error: string | undefined;
  let decided;
  try {
    if (primary.escalatesInternally) {
      const output = await primary.decide(state);
      decided = {
        ...output,
        escalated: output.escalated === true,
        providerId: output.providerId ?? primary.id,
      };
    } else {
      decided = await decideWithEscalation(primary, escalation, state, threshold);
    }
  } catch (caught) {
    error = errorMessage(caught);
    if (primary.id !== 'rule') {
      const fallbackOutput = await createRuleProvider().decide(state);
      decided = { ...fallbackOutput, escalated: false, providerId: 'rule' };
      fallback = true;
    } else {
      decided = {
        action: 'keep' as const,
        confidence: 0,
        reason: 'rule provider failed',
        zoom: false,
        modelMs: 0,
        networkMs: 0,
        upstreamUnsplit: false,
        escalated: false,
        providerId: 'rule',
      };
      fallback = true;
    }
  }
  const executed = executeDecision(session.timeline, segment, decided.action, {
    zoom: decided.zoom,
    brollLabel: decided.brollLabel,
    reason: fallback && error ? `${error}. Rule fallback: ${decided.reason}` : (executedNote(decided.reason)),
    mediaDurationMs: session.mediaDurationMs,
  });
  const reason = fallback && error
    ? `${error}. Rule fallback: ${executed.note ?? decided.reason}`
    : (executed.note ?? decided.reason);
  const costUsd = decided.costUsd !== undefined
    ? decided.costUsd
    : decisionCostUsd(primary, escalation, decided.escalated);
  const step: LoggedDecision = {
    index: segment.index,
    segmentId: segment.id,
    startMs: segment.startMs,
    endMs: segment.endMs,
    text: segment.text,
    action: executed.applied,
    requested: decided.action,
    confidence: decided.confidence,
    modelMs: decided.modelMs,
    networkMs: decided.networkMs,
    executorMs: executed.executorMs,
    latencyMs: decided.modelMs + decided.networkMs + executed.executorMs,
    provider: decided.providerId,
    escalated: decided.escalated,
    fallback,
    reason,
    zoom: executed.zoom,
    ...(decided.brollLabel ? { brollLabel: decided.brollLabel } : {}),
    costUsd: fallback ? 0 : costUsd,
    coerced: executed.coerced,
    upstreamUnsplit: decided.upstreamUnsplit,
  };
  return {
    session: {
      ...session,
      timeline: executed.timeline,
      decisions: [...session.decisions, step],
      cursor: session.cursor + 1,
      startedAtMs: session.startedAtMs ?? nowMs(),
    },
    step,
    ...(executed.ghost ? { ghost: executed.ghost } : {}),
    ...(error ? { error } : {}),
  };
}

function executedNote(reason: string): string {
  return reason;
}

export async function runSession(
  session: CutSession,
  primary: DecisionProvider,
  escalation: DecisionProvider | null,
  threshold = 0.6,
): Promise<CutSession> {
  let current = session;
  while (current.cursor < current.segments.length) {
    const stepped = await stepSession(current, primary, escalation, threshold);
    current = stepped.session;
    if (!stepped.step) break;
  }
  return current;
}
