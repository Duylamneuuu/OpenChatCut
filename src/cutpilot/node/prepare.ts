import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { importTranscript } from '../transcript-import.js';
import type { TranscriptWord } from '../../transcript/types.js';

function binary(envName: string, fallbackEnv: string, packageName: string | null, command: string): string {
  const override = process.env[envName] || process.env[fallbackEnv];
  if (override) return override;
  if (packageName) {
    try {
      const resolved = createRequire(import.meta.url)(packageName) as string | { path?: string } | null;
      if (typeof resolved === 'string' && resolved) return resolved;
      if (resolved && typeof resolved === 'object' && resolved.path) return resolved.path;
    } catch {
      // The optional binary package is absent; the PATH command is the fallback.
    }
  }
  return command;
}

export function resolveFfmpeg(): string {
  return binary('OPENCHATCUT_FFMPEG', 'FFMPEG_PATH', 'ffmpeg-static', 'ffmpeg');
}

export function resolveFfprobe(): string {
  return binary('OPENCHATCUT_FFPROBE', 'FFPROBE_PATH', '@ffprobe-installer/ffprobe', 'ffprobe');
}

function resolveWhisper(env: Record<string, string | undefined>): string {
  return env.OPENCHATCUT_WHISPER_CLI?.trim()
    || process.env.OPENCHATCUT_WHISPER_CLI
    || 'whisper-cli';
}

const exec = promisify(execFile);

export function parseScenePts(stderr: string): number[] {
  const times: number[] = [];
  for (const match of stderr.matchAll(/pts_time:([0-9]+(?:\.[0-9]+)?)/g)) {
    const ms = Math.round(Number(match[1]) * 1000);
    if (Number.isFinite(ms)) times.push(ms);
  }
  return times;
}

async function run(bin: string, args: readonly string[], timeout = 60_000): Promise<{ stdout: string; stderr: string }> {
  const result = await exec(bin, args, { timeout, maxBuffer: 32 * 1024 * 1024, windowsHide: true });
  return { stdout: String(result.stdout ?? ''), stderr: String(result.stderr ?? '') };
}

export async function probeDurationMs(file: string, bin = resolveFfprobe()): Promise<number> {
  const { stdout } = await run(bin, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    file,
  ]);
  const seconds = Number(stdout.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`ffprobe returned no duration for ${file}`);
  return Math.round(seconds * 1000);
}

export async function extractWav(video: string, wav: string, bin = resolveFfmpeg()): Promise<void> {
  await run(bin, ['-y', '-i', video, '-vn', '-ac', '1', '-ar', '16000', wav], 120_000);
}

export async function detectSceneCuts(video: string, bin = resolveFfmpeg()): Promise<number[]> {
  try {
    const { stderr } = await run(bin, [
      '-hide_banner', '-i', video,
      '-filter:v', "select='gt(scene,0.3)',showinfo",
      '-an', '-f', 'null', '-',
    ], 120_000);
    return parseScenePts(stderr);
  } catch (error) {
    const stderr = error instanceof Error && 'stderr' in error ? String((error as { stderr?: unknown }).stderr ?? '') : '';
    const parsed = parseScenePts(stderr);
    if (parsed.length) return parsed;
    return [];
  }
}

export async function transcribeWav(wav: string, env: Record<string, string | undefined>): Promise<TranscriptWord[] | null> {
  const command = env.CUTPILOT_WHISPER_CMD?.trim();
  if (command) {
    const { stdout } = await run(command, [wav], 10 * 60_000);
    return importTranscript(JSON.parse(stdout));
  }
  const model = env.CUTPILOT_WHISPER_MODEL?.trim();
  if (!model) return null;
  const bin = resolveWhisper(env);
  if (!existsSync(bin) || !existsSync(model)) return null;
  const base = wav.replace(/\.wav$/i, '');
  await run(bin, ['-m', model, '-f', wav, '-sow', '-ojf', '-nt', '-of', base], 10 * 60_000);
  return importTranscript(JSON.parse(await readFile(`${base}.json`, 'utf8')));
}
