import type { CodexAgentModel, CodexTurnRequest, CodexTurnStreamEvent } from './codex-agent';

export const CLI_AGENT_BACKENDS = ['opencode', 'antigravity'] as const;
export type CliAgentBackend = typeof CLI_AGENT_BACKENDS[number];
export function isCliAgentBackend(value: unknown): value is CliAgentBackend {
  return value === 'opencode' || value === 'antigravity';
}
export const CLI_AGENT_LABELS: Record<CliAgentBackend, string> = {
  opencode: 'OpenCode CLI', antigravity: 'Antigravity CLI',
};
export function cliAgentConfigPrefix(backend: CliAgentBackend): string {
  return backend === 'opencode' ? 'OPENCODE' : 'ANTIGRAVITY';
}
export interface CliAgentStatus {
  readonly installed: boolean;
  readonly supported: boolean;
  readonly version: string | null;
  /** null means the CLI does not expose a read-only authentication probe. */
  readonly authenticated: boolean | null;
  readonly loginCommand: string;
  readonly error?: string;
}
export interface CliAgentModelsResponse {
  readonly models: readonly CodexAgentModel[];
  readonly error?: string;
}
export type CliTurnRequest = CodexTurnRequest;
export type CliTurnStreamEvent = CodexTurnStreamEvent;
