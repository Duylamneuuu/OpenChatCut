import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { configFromEnv, publicConfig, type CutPilotEnvConfig, type EndpointConfig } from '../../src/cutpilot/config.js';
import { loadCutpilotEnv } from '../../src/cutpilot/node/load-env.js';
import { decisionCostUsd, decideWithEscalation } from '../../src/cutpilot/providers/escalate.js';
import { createOpenAiProvider } from '../../src/cutpilot/providers/openai.js';
import { createRuleProvider } from '../../src/cutpilot/providers/rule-provider.js';
import { isCutAction, type DecisionProvider, type DecisionState } from '../../src/cutpilot/types.js';

export interface CutpilotDeps {
  /** When set, ignore .env files and process.env so tests stay hermetic. */
  isolate?: boolean;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  cwd?: string;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  if (res.writableEnded) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function resolveEnv(deps: CutpilotDeps): Record<string, string | undefined> {
  if (deps.isolate) return { ...deps.env };
  return { ...loadCutpilotEnv(deps.cwd), ...deps.env };
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > 32_000) throw new Error('body is too large');
    chunks.push(buffer);
  }
  if (!total) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function asState(value: unknown): DecisionState | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  if (typeof record.segmentId !== 'string' || typeof record.text !== 'string') return null;
  if (typeof record.directive !== 'string') return null;
  const durationMs = Number(record.durationMs);
  const silenceMs = Number(record.silenceMs ?? 0);
  const gapBeforeMs = Number(record.gapBeforeMs ?? 0);
  const index = Number(record.index ?? 0);
  if (![durationMs, silenceMs, gapBeforeMs, index].every(Number.isFinite)) return null;
  const prev = Array.isArray(record.prev) ? record.prev.flatMap((row) => {
    if (!row || typeof row !== 'object') return [];
    const item = row as { segmentId?: unknown; action?: unknown };
    if (typeof item.segmentId !== 'string' || !isCutAction(item.action)) return [];
    return [{ segmentId: item.segmentId, action: item.action }];
  }).slice(-4) : [];
  return {
    segmentId: record.segmentId.slice(0, 80),
    index,
    text: record.text.slice(0, 2000),
    durationMs,
    silenceMs,
    gapBeforeMs,
    directive: record.directive.slice(0, 280),
    prev,
  };
}

function endpointProvider(id: string, endpoint: EndpointConfig, fetchImpl: typeof fetch, env: Record<string, string | undefined>): DecisionProvider {
  const timeoutRaw = Number(env.CUTPILOT_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(timeoutRaw) && timeoutRaw > 0 ? timeoutRaw : undefined;
  return createOpenAiProvider({ ...endpoint, id, fetchImpl, timeoutMs });
}

export async function dispatchCutpilot(
  method: string,
  pathname: string,
  body: unknown,
  deps: CutpilotDeps = {},
): Promise<{ status: number; payload: unknown }> {
  const env = resolveEnv(deps);
  const config: CutPilotEnvConfig = configFromEnv(env);
  if (method === 'GET' && pathname.endsWith('/config')) {
    return { status: 200, payload: publicConfig(config) };
  }
  if (method !== 'POST' || !pathname.endsWith('/decide')) {
    return { status: 404, payload: { error: 'not found' } };
  }
  const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const which = record.provider === 'local' || record.provider === 'hosted' || record.provider === 'rule' || record.provider === 'escalation'
    ? record.provider
    : null;
  if (!which) return { status: 400, payload: { error: 'provider must be rule, local, hosted, or escalation' } };
  const state = asState(record.state);
  if (!state) return { status: 400, payload: { error: 'state must include segmentId, text, directive, and durationMs' } };
  const fetchImpl = deps.fetchImpl ?? fetch;
  let primary: DecisionProvider;
  let escalation: DecisionProvider | null = null;
  if (which === 'rule') primary = createRuleProvider();
  else if (which === 'escalation') {
    if (!config.escalation) return { status: 400, payload: { error: 'CUTPILOT_ESCALATION_BASE_URL is not set' } };
    primary = endpointProvider('escalation', config.escalation, fetchImpl, env);
  } else if (which === 'local') {
    if (!config.local) return { status: 400, payload: { error: 'CUTPILOT_LOCAL_BASE_URL is not set' } };
    primary = endpointProvider('local', config.local, fetchImpl, env);
  } else {
    if (!config.hosted) return { status: 400, payload: { error: 'CUTPILOT_HOSTED_BASE_URL is not set' } };
    primary = endpointProvider('hosted', config.hosted, fetchImpl, env);
  }
  if (which !== 'escalation' && record.escalate !== false && config.escalation) {
    escalation = endpointProvider('escalation', config.escalation, fetchImpl, env);
  }
  try {
    const decided = await decideWithEscalation(primary, escalation, state, config.threshold);
    return {
      status: 200,
      payload: {
        action: decided.action,
        confidence: decided.confidence,
        reason: decided.reason,
        zoom: decided.zoom,
        ...(decided.brollLabel ? { brollLabel: decided.brollLabel } : {}),
        modelMs: decided.modelMs,
        networkMs: decided.networkMs,
        upstreamUnsplit: decided.upstreamUnsplit,
        escalated: decided.escalated,
        providerId: decided.providerId,
        costUsd: decisionCostUsd(primary, escalation, decided.escalated),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'decision provider failed';
    return { status: 502, payload: { error: message } };
  }
}

export async function handleCutpilotRequest(
  req: IncomingMessage,
  res: ServerResponse,
  deps: CutpilotDeps = {},
): Promise<void> {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const body = (req.method ?? 'GET').toUpperCase() === 'POST' ? await readJson(req) : undefined;
    const result = await dispatchCutpilot((req.method ?? 'GET').toUpperCase(), url.pathname, body, deps);
    sendJson(res, result.status, result.payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'bad request';
    sendJson(res, 400, { error: message });
  }
}

export function cutpilotPlugin(): Plugin {
  return {
    name: 'openchatcut-cutpilot',
    configureServer(server) {
      server.middlewares.use('/api/cutpilot', (req, res) => {
        void handleCutpilotRequest(req, res);
      });
    },
  };
}
