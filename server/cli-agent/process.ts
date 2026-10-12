import { spawn, execFile } from 'node:child_process';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { claudeCodeCommand } from '../claude-code/command';

export async function runCliProcess(options: {
  path: string; args: readonly string[]; env: NodeJS.ProcessEnv; cwd: string;
  input?: string; signal: AbortSignal; onLine?: (line: string) => void;
}): Promise<{ code: number | null; stdout: string; stderr: string }> {
  options.signal.throwIfAborted();
  const command = claudeCodeCommand(options.path, options.args);
  const child = spawn(command.executable, command.args, {
    cwd: options.cwd, env: options.env, windowsHide: true,
    windowsVerbatimArguments: command.windowsVerbatimArguments, stdio: ['pipe', 'pipe', 'pipe'],
  });
  const exited = new Promise<number | null>((resolve, reject) => {
    child.once('error', reject); child.once('close', resolve);
  });
  // Observe spawn failure immediately, even while the line reader is draining.
  void exited.catch(() => {});
  let termination: Promise<void> | undefined;
  const stop = (): Promise<void> => {
    if (termination) return termination;
    termination = process.platform === 'win32' && child.pid
      ? new Promise<void>((resolve) => execFile(
        join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'taskkill.exe'),
        ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, () => resolve(),
      ))
      : Promise.resolve().then(() => { child.kill(); });
    return termination;
  };
  let stdout = ''; let stderr = '';
  child.stdout.on('data', (chunk: Buffer) => { stdout = (stdout + chunk.toString('utf8')).slice(-4 * 1024 * 1024); });
  child.stderr.on('data', (chunk: Buffer) => { stderr = (stderr + chunk.toString('utf8')).slice(-8000); });
  child.stdin.on('error', () => {});
  const onAbort = () => { void stop(); };
  options.signal.addEventListener('abort', onAbort, { once: true });
  if (options.signal.aborted) onAbort();
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  child.stdin.end(options.input ?? '');
  try {
    for await (const line of lines) options.onLine?.(line);
    const code = await exited;
    options.signal.throwIfAborted();
    return { code, stdout, stderr };
  } finally {
    options.signal.removeEventListener('abort', onAbort); lines.close();
    if (child.exitCode === null && child.signalCode === null) await stop();
    await termination;
  }
}
