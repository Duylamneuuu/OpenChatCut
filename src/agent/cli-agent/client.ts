import type { CliAgentBackend, CliAgentModelsResponse, CliAgentStatus } from '../../../shared/cli-agent';
import { consumeNdjson } from '../codex/client';
import { estimateTextTokens } from '../context-compaction';

async function requestJson<T>(backend: CliAgentBackend, action: string): Promise<T> {
  const response = await fetch(`/api/cli-agents/${backend}/${action}`);
  if (!response.ok) throw new Error(`CLI service returned ${response.status}.`);
  return response.json() as Promise<T>;
}
export function fetchCliAgentStatus(backend: CliAgentBackend): Promise<CliAgentStatus> {
  return requestJson(backend, 'status');
}
export function fetchCliAgentModels(backend: CliAgentBackend): Promise<CliAgentModelsResponse> {
  return requestJson(backend, 'models');
}
export async function generateCliAgentText(backend: CliAgentBackend, request: {
  system: string; prompt: string; projectId: string; model: string;
  maxOutputTokens: number; signal: AbortSignal;
}): Promise<string> {
  const response = await fetch(`/api/cli-agents/${backend}/text`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request), signal: request.signal,
  });
  if (!response.ok || !response.body) throw new Error(`CLI text request failed (${response.status}).`);
  let text = ''; let done = false;
  await consumeNdjson(response.body, (event) => {
    if (event.type === 'error') throw new Error(event.message);
    if (event.type === 'done') done = true;
    if (event.type === 'text-delta') {
      text += event.delta;
      if (estimateTextTokens(text) > request.maxOutputTokens) throw new Error('CLI response exceeded its output limit.');
    }
  });
  if (!done) throw new Error('CLI text response ended before completion.');
  return text.trim();
}
