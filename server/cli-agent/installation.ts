import { stat, access, mkdir, copyFile, readdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join, resolve } from 'node:path';
import { runtimeProfile } from '../runtime-profile';
import { getKey, type KeyName } from '../keystore';
import { cliAgentConfigPrefix, type CliAgentBackend, type CliAgentModelsResponse, type CliAgentStatus } from '../../shared/cli-agent';
import { runCliProcess } from './process';

export function cliAgentRoot(backend: CliAgentBackend): string {
  return join(runtimeProfile().rootDir, 'cli-agents', backend);
}
export async function cliAgentEnvironment(backend: CliAgentBackend): Promise<NodeJS.ProcessEnv> {
  const root = cliAgentRoot(backend);
  const home = join(root, 'home');
  const env = { ...process.env,
    HOME: home, USERPROFILE: home, APPDATA: join(home, 'AppData', 'Roaming'), LOCALAPPDATA: join(home, 'AppData', 'Local'),
    XDG_CONFIG_HOME: join(root, 'config'), XDG_DATA_HOME: join(root, 'data'),
    XDG_CACHE_HOME: join(root, 'cache'), XDG_STATE_HOME: join(root, 'state'),
    TEMP: join(root, 'temp'), TMP: join(root, 'temp'), TMPDIR: join(root, 'temp'),
    OPENCODE_DISABLE_AUTOUPDATE: '1', OPENCODE_DISABLE_LSP_DOWNLOAD: '1',
    OPENCODE_DISABLE_CLAUDE_CODE: '1', AGY_CLI_DISABLE_AUTO_UPDATE: '1',
  };
  await Promise.all([home, env.APPDATA, env.LOCALAPPDATA, env.XDG_CONFIG_HOME,
    env.XDG_DATA_HOME, env.XDG_CACHE_HOME, env.XDG_STATE_HOME, env.TEMP].map((path) => mkdir(path, { recursive: true })));
  if (backend === 'opencode') {
    // Reuse existing login without exposing credentials or changing its source.
    const source = join(process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'opencode', 'auth.json');
    const destination = join(env.XDG_DATA_HOME, 'opencode', 'auth.json');
    await mkdir(join(env.XDG_DATA_HOME, 'opencode'), { recursive: true });
    try { await copyFile(source, destination, constants.COPYFILE_EXCL); } catch { /* absent or already seeded */ }
    // Zen uses OpenCode's own catalog. Keep unrelated gateways and plugins outside this runtime.
    await mkdir(join(env.XDG_CONFIG_HOME, 'opencode'), { recursive: true });
    await writeFile(join(env.XDG_CONFIG_HOME, 'opencode', 'opencode.json'), '{}', 'utf8');
    delete (env as NodeJS.ProcessEnv).OPENCODE_CONFIG_CONTENT;
    delete (env as NodeJS.ProcessEnv).OPENCODE_CONFIG_DIR;
    delete (env as NodeJS.ProcessEnv).OPENCODE_PERMISSION;
    delete (env as NodeJS.ProcessEnv).OPENCODE_CONFIG;
  }
  return env;
}

async function isExecutable(path: string): Promise<boolean> {
  try {
    if (!(await stat(path)).isFile()) return false;
    if (process.platform !== 'win32') await access(path, constants.X_OK);
    return true;
  } catch { return false; }
}
export async function resolveCliAgent(backend: CliAgentBackend): Promise<string | null> {
  const name = backend === 'opencode' ? 'opencode' : 'agy';
  const candidates = [getKey(`${cliAgentConfigPrefix(backend)}_CLI_PATH` as KeyName)];
  for (const dir of (process.env.PATH || '').split(delimiter).filter(Boolean)) {
    for (const extension of process.platform === 'win32' ? ['.exe', '.cmd', '.bat'] : ['']) candidates.push(join(dir, name + extension));
  }
  if (backend === 'opencode' && process.env.APPDATA) {
    candidates.splice(1, 0, join(process.env.APPDATA, 'npm', 'node_modules', 'opencode-ai', 'bin', 'opencode.exe'));
  }
  candidates.push(join(homedir(), '.local', 'bin', name), join(homedir(), '.bun', 'bin', name));
  if (backend === 'antigravity') {
    candidates.push(join(process.env.LOCALAPPDATA || '', 'agy', 'bin', 'agy.exe'));
    const portable = resolve(runtimeProfile().rootDir, '..', '..', 'tools', 'antigravity-cli');
    const versions = await readdir(portable).catch(() => [] as string[]);
    for (const version of versions.sort().reverse()) candidates.push(join(portable, version, 'antigravity.exe'));
  }
  for (const path of [...new Set(candidates.filter(Boolean))]) if (await isExecutable(path)) return path;
  return null;
}

export async function probeCli(backend: CliAgentBackend, args: readonly string[]) {
  const path = await resolveCliAgent(backend);
  if (!path) throw new Error(`${backend} CLI was not found. Set its executable path in Settings.`);
  const env = await cliAgentEnvironment(backend);
  return runCliProcess({ path, args, env, cwd: cliAgentRoot(backend), signal: AbortSignal.timeout(30_000) });
}
export async function inspectCliAgent(backend: CliAgentBackend): Promise<CliAgentStatus> {
  const base = { installed: false, supported: false, version: null, authenticated: null,
    loginCommand: backend === 'opencode' ? 'opencode auth login' : 'agy' };
  if (!await resolveCliAgent(backend)) return base;
  try {
    const output = await probeCli(backend, ['--version']);
    const version = output.stdout.match(/\b\d+\.\d+\.\d+\b/)?.[0] ?? null;
    return { ...base, installed: true, supported: output.code === 0 && Boolean(version), version };
  } catch (error) {
    return { ...base, installed: true, error: error instanceof Error ? error.message : String(error) };
  }
}
export function parseCliModels(backend: CliAgentBackend, output: string): CliAgentModelsResponse {
  const models = output.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g'), '').split(/\r?\n/).flatMap((line) => {
    const match = backend === 'opencode'
      ? line.trim().match(/^([\w.-]+\/[\w./:-]+)$/)
      : line.trim().match(/^([a-z][\w.-]+)\s+(.+)$/);
    return match ? [{ id: match[1], label: match[2] || match[1], isDefault: false,
      defaultReasoningEffort: null, supportedReasoningEfforts: [] }] : [];
  });
  if (models[0]) models[0].isDefault = true;
  return { models: [...new Map(models.map((model) => [model.id, model])).values()] };
}
export async function discoverCliModels(backend: CliAgentBackend): Promise<CliAgentModelsResponse> {
  try {
    const output = await probeCli(backend, ['models']);
    if (output.code !== 0) throw new Error(output.stderr.trim() || 'CLI model discovery failed.');
    return parseCliModels(backend, output.stdout);
  } catch (error) { return { models: [], error: error instanceof Error ? error.message : String(error) }; }
}
