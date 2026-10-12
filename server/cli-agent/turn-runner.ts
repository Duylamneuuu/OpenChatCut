import { mkdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { CodexTurnRequest, CodexTurnStreamEvent } from '../../shared/codex-agent';
import { CLI_AGENT_LABELS, type CliAgentBackend } from '../../shared/cli-agent';
import { cliAgentEnvironment, cliAgentRoot, resolveCliAgent } from './installation';
import { runCliProcess } from './process';
import { startCliToolBridge } from './tool-bridge';

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
export function createCliEventTranslator(backend: CliAgentBackend, emit: (event: CodexTurnStreamEvent) => void) {
  let text = ''; let completed = false; let failed = false;
  return {
    get completed() { return completed; },
    get failed() { return failed; },
    line(line: string) {
      let value: Record<string, unknown> | null;
      try { value = object(JSON.parse(line)); } catch { return; }
      if (!value) return;
      if (backend === 'opencode') {
        const part = object(value.part);
        if ((value.type === 'text' || value.type === 'reasoning') && typeof part?.text === 'string') {
          if (value.type === 'text') text += part.text;
          emit({ type: value.type === 'text' ? 'text-delta' : 'thinking-delta', delta: part.text });
        } else if (value.type === 'error') {
          failed = true;
          const error = object(value.error); const data = object(error?.data);
          emit({ type: 'error', message: String(data?.message ?? error?.message ?? 'OpenCode request failed.') });
        } else if (value.type === 'step_finish') {
          const tokens = object(part?.tokens);
          const cache = object(tokens?.cache);
          if (typeof tokens?.input === 'number') emit({ type: 'context-usage',
            inputTokens: tokens.input + (typeof cache?.read === 'number' ? cache.read : 0) + (typeof cache?.write === 'number' ? cache.write : 0),
            noCacheInputTokens: tokens.input,
            cacheReadTokens: typeof cache?.read === 'number' ? cache.read : undefined,
            reasoningTokens: typeof tokens.reasoning === 'number' ? tokens.reasoning : undefined,
            outputTokens: typeof tokens.output === 'number' ? tokens.output : undefined });
          // An intermediate tool step is not a completed CLI turn.
          if (part?.reason === 'stop') completed = true;
        }
      } else {
        const step = object(value.step_update);
        if (value.event === 'step_update' && step?.step_type === 'agent_response' && typeof step.text_delta === 'string') {
          text += step.text_delta; emit({ type: 'text-delta', delta: step.text_delta });
        } else if (value.event === 'result') {
          const result = object(value.result);
          completed = true;
          if (result?.status !== 'SUCCESS') {
            failed = true; emit({ type: 'error', message: String(result?.error ?? `Antigravity ended with ${result?.status}.`) });
          } else if (!text && typeof result.response === 'string') emit({ type: 'text-delta', delta: result.response });
          const usage = object(result?.usage);
          if (typeof usage?.input_tokens === 'number') emit({ type: 'context-usage', inputTokens: usage.input_tokens,
            outputTokens: typeof usage.output_tokens === 'number' ? usage.output_tokens : undefined,
            reasoningTokens: typeof usage.thinking_tokens === 'number' ? usage.thinking_tokens : undefined });
        }
      }
    },
  };
}

export async function runServerCliTurn(
  backend: CliAgentBackend, request: CodexTurnRequest,
  emit: (event: CodexTurnStreamEvent) => void, signal: AbortSignal,
): Promise<void> {
  const path = await resolveCliAgent(backend);
  if (!path) throw new Error(`${CLI_AGENT_LABELS[backend]} was not found. Configure its executable in Settings.`);
  const env = await cliAgentEnvironment(backend);
  const dir = await mkdtemp(join(cliAgentRoot(backend), 'turn-'));
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) abort();
  const timer = setTimeout(() => controller.abort(new Error('CLI turn timed out after 600s.')), 600_000);
  const bridge = await startCliToolBridge(request, emit, controller.signal);
  try {
    const system = `${request.system}\n\nUse only the OpenChatCut MCP tools to inspect and edit video. `
      + 'Do not use shell, file, web, subagent or external tools. Tool results are authoritative; report actual outcomes.';
    let args: string[]; let input: string;
    if (backend === 'opencode') {
      const config = {
        instructions: [join(dir, 'openchatcut-instructions.txt')],
        // Zen requires the normal read/bash tools in the CLI harness. Reads are
        // confined to this disposable workspace; shell calls still require a
        // human permission and are rejected by `run` in non-interactive mode.
        permission: { '*': 'deny', read: 'allow', bash: 'ask', external_directory: 'deny', 'openchatcut_*': 'allow' },
        mcp: { openchatcut: { type: 'remote', url: bridge.url, oauth: false,
          headers: { Authorization: `Bearer ${bridge.token}` }, timeout: 600_000 } },
      };
      const configPath = join(dir, 'opencode.json');
      await writeFile(join(dir, 'openchatcut-instructions.txt'), system, 'utf8');
      await writeFile(configPath, JSON.stringify(config), 'utf8');
      env.OPENCODE_CONFIG = configPath;
      args = ['run', '--pure', '--format', 'json', '--agent', 'build', '--dir', dir];
      if (request.model) args.push('--model', request.model);
      input = request.prompt;
    } else {
      const settingsDir = join(env.HOME!, '.gemini', 'antigravity-cli');
      await mkdir(settingsDir, { recursive: true });
      await writeFile(join(settingsDir, 'settings.json'), JSON.stringify({
        allowNonWorkspaceAccess: false, notifications: false,
        permissions: { allow: ['mcp(openchatcut/*)'], deny: ['command(*)', 'read_file(*)', 'write_file(*)', 'read_url(*)', 'execute_url(*)'] },
      }), 'utf8');
      await mkdir(join(dir, '.agents'), { recursive: true });
      await writeFile(join(dir, '.agents', 'mcp_config.json'), JSON.stringify({ mcpServers: {
        openchatcut: { serverUrl: bridge.url, headers: { Authorization: `Bearer ${bridge.token}` } },
      } }), 'utf8');
      args = ['--input-format', 'stream-json', '--output-format', 'stream-json', '--print-timeout', '10m',
        '--disable-slash-commands', '--log-file', join(dir, 'cli.log')];
      if (request.model) args.push('--model', request.model);
      input = JSON.stringify({ event: 'user', message: { content: `${system}\n\n${request.prompt}` } }) + '\n';
    }
    const translator = createCliEventTranslator(backend, emit);
    const output = await runCliProcess({ path, args, env, cwd: dir, input,
      signal: controller.signal, onLine: (line) => translator.line(line) });
    if (!translator.failed && (output.code !== 0 || !translator.completed)) {
      emit({ type: 'error', message: output.stderr.trim() || `${CLI_AGENT_LABELS[backend]} exited before completing a response (code ${output.code}).` });
    }
    emit({ type: 'done' });
  } finally {
    clearTimeout(timer); signal.removeEventListener('abort', abort);
    await bridge.close(); await rm(dir, { recursive: true, force: true });
  }
}
