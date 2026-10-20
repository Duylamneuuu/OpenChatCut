export type CutPilotProviderId = 'rule' | 'local' | 'hosted';
export type DecisionProtocol = 'chat' | 'systemone';

export interface EndpointConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  protocol: DecisionProtocol;
  usdPer1k: number | null;
}

export interface CutPilotEnvConfig {
  provider: CutPilotProviderId;
  threshold: number;
  local: EndpointConfig | null;
  hosted: EndpointConfig | null;
  escalation: EndpointConfig | null;
}

export interface PublicProviderStatus {
  available: boolean;
  model?: string;
  protocol?: DecisionProtocol;
  usdPer1k: number | null;
  priced: boolean;
}

export interface PublicCutPilotConfig {
  provider: CutPilotProviderId;
  threshold: number;
  providers: {
    rule: PublicProviderStatus;
    local: PublicProviderStatus;
    hosted: PublicProviderStatus;
    escalation: PublicProviderStatus;
  };
}

function priceOf(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function endpoint(env: Record<string, string | undefined>, prefix: string): EndpointConfig | null {
  const baseUrl = (env[`${prefix}_BASE_URL`] ?? '').trim().replace(/\/+$/, '');
  if (!baseUrl) return null;
  const protocol = (env[`${prefix}_PROTOCOL`] ?? '').trim().toLowerCase() === 'systemone' ? 'systemone' : 'chat';
  const model = (env[`${prefix}_MODEL`] ?? '').trim() || 'default';
  return {
    baseUrl,
    apiKey: (env[`${prefix}_API_KEY`] ?? '').trim(),
    model,
    protocol,
    usdPer1k: priceOf(env[`${prefix}_USD_PER_1K`]),
  };
}

/** Read provider selection from env. Missing keys select the rule baseline. */
export function configFromEnv(env: Record<string, string | undefined>): CutPilotEnvConfig {
  const requested = (env.CUTPILOT_PROVIDER ?? 'rule').trim().toLowerCase();
  const provider: CutPilotProviderId = requested === 'local' || requested === 'hosted' ? requested : 'rule';
  const thresholdRaw = Number(env.CUTPILOT_CONFIDENCE_THRESHOLD ?? '0.6');
  const threshold = Number.isFinite(thresholdRaw) ? Math.min(1, Math.max(0, thresholdRaw)) : 0.6;
  return {
    provider,
    threshold,
    local: endpoint(env, 'CUTPILOT_LOCAL'),
    hosted: endpoint(env, 'CUTPILOT_HOSTED'),
    escalation: endpoint(env, 'CUTPILOT_ESCALATION'),
  };
}

function status(endpointConfig: EndpointConfig | null, fallback?: PublicProviderStatus): PublicProviderStatus {
  if (!endpointConfig) return fallback ?? { available: false, usdPer1k: null, priced: false };
  return {
    available: true,
    model: endpointConfig.model,
    protocol: endpointConfig.protocol,
    usdPer1k: endpointConfig.usdPer1k,
    priced: endpointConfig.usdPer1k !== null,
  };
}

/** Browser-safe view. API keys never leave the server. */
export function publicConfig(config: CutPilotEnvConfig): PublicCutPilotConfig {
  return {
    provider: config.provider,
    threshold: config.threshold,
    providers: {
      rule: { available: true, usdPer1k: 0, priced: true },
      local: status(config.local),
      hosted: status(config.hosted),
      escalation: status(config.escalation),
    },
  };
}
