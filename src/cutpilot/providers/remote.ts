import type { PublicCutPilotConfig } from '../config.js';
import type { DecisionProvider, DecisionState, ProviderOutput } from '../types.js';
import { isCutAction } from '../types.js';

export type RemoteProviderId = 'local' | 'hosted' | 'escalation';

export interface RemoteProviderOptions {
  id: RemoteProviderId;
  usdPer1k: number | null;
  /** Ask the server to escalate this provider. Ignored for the escalation provider itself. */
  escalate: boolean;
  fetchImpl?: typeof fetch;
}

interface DecideResponse {
  action: ProviderOutput['action'];
  confidence: number;
  reason: string;
  zoom?: boolean;
  brollLabel?: string;
  modelMs?: number;
  networkMs?: number;
  upstreamUnsplit?: boolean;
  escalated?: boolean;
  providerId?: string;
  costUsd?: number | null;
  error?: string;
}

/**
 * Browser client for /api/cutpilot/decide. The key stays on the server.
 * Latency fields come from the server measurement of the upstream call.
 */
export function createRemoteProvider(options: RemoteProviderOptions): DecisionProvider {
  const fetchImpl = options.fetchImpl ?? fetch;
  return {
    id: options.id,
    usdPer1k: options.usdPer1k,
    escalatesInternally: options.escalate && options.id !== 'escalation',
    async decide(state: DecisionState): Promise<ProviderOutput> {
      const response = await fetchImpl('/api/cutpilot/decide', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ provider: options.id, escalate: options.escalate, state }),
      });
      const payload = await response.json() as DecideResponse;
      if (!response.ok || !isCutAction(payload.action)) {
        throw new Error(payload.error || `decision request failed (${response.status})`);
      }
      return {
        action: payload.action,
        confidence: payload.confidence,
        reason: payload.reason,
        zoom: payload.zoom === true,
        ...(payload.brollLabel ? { brollLabel: payload.brollLabel } : {}),
        modelMs: payload.modelMs ?? 0,
        networkMs: payload.networkMs ?? 0,
        upstreamUnsplit: payload.upstreamUnsplit !== false,
        escalated: payload.escalated === true,
        providerId: payload.providerId,
        costUsd: payload.costUsd,
      };
    },
  };
}

export async function fetchCutPilotConfig(fetchImpl: typeof fetch = fetch): Promise<PublicCutPilotConfig | null> {
  try {
    const response = await fetchImpl('/api/cutpilot/config');
    if (!response.ok) return null;
    return await response.json() as PublicCutPilotConfig;
  } catch {
    return null;
  }
}
