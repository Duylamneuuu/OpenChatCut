import { existsSync, readFileSync } from 'node:fs';

const INTERESTING = /^(?:CUTPILOT_|FFMPEG_PATH|FFPROBE_PATH|OPENCHATCUT_FFMPEG|OPENCHATCUT_FFPROBE|OPENCHATCUT_WHISPER_CLI)/;

function parseEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/** Process env wins over .env files. Only CutPilot and local media-binary keys are kept. */
export function loadCutpilotEnv(cwd = process.cwd()): Record<string, string> {
  const merged: Record<string, string> = {};
  for (const name of ['.env', '.env.local']) {
    const path = `${cwd}/${name}`;
    if (!existsSync(path)) continue;
    const parsed = parseEnvFile(readFileSync(path, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      if (INTERESTING.test(key)) merged[key] = value;
    }
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && INTERESTING.test(key)) merged[key] = value;
  }
  return merged;
}
