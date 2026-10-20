// Generate the bundled CutPilot sample: captioned stand-in video, transcript, and rubric labels.
// npx tsx scripts/cutpilot-sample-media.ts
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { SAMPLE_CLIP_ID, SAMPLE_DURATION_MS, SAMPLE_FPS, SAMPLE_LABEL_ABOUT, sampleSegments, sampleWords } from '../src/cutpilot/sample.ts';
import { createRuleProvider } from '../src/cutpilot/providers/rule-provider.ts';
import { createSession, runSession } from '../src/cutpilot/session.ts';
import { resolveFfmpeg } from '../src/cutpilot/node/prepare.ts';

const exec = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const publicDir = resolve(root, 'public/cutpilot');
const sampleDir = resolve(root, 'samples/cutpilot');

function escapeFilterPath(file: string): string {
  return file.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

const cues = (await import('../src/cutpilot/sample.ts')).SAMPLE_CUES;
await mkdir(publicDir, { recursive: true });
await mkdir(sampleDir, { recursive: true });
const assPath = resolve(publicDir, 'sample.ass');
const videoPath = resolve(publicDir, 'sample.mp4');
const fontFile = [
  '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf',
  'C:\\Windows\\Fonts\\arial.ttf',
  'C:\\Windows\\Fonts\\segoeui.ttf',
  '/Library/Fonts/Arial.ttf',
  '/System/Library/Fonts/Supplemental/Arial.ttf',
].find((candidate) => existsSync(candidate));
const fontName = fontFile?.toLowerCase().includes('dejavu') ? 'DejaVu Sans' : 'Arial';
const assTime = (ms: number) => {
  const clamped = Math.max(0, Math.round(ms));
  const hours = Math.floor(clamped / 3_600_000);
  const minutes = Math.floor((clamped % 3_600_000) / 60_000);
  const seconds = Math.floor((clamped % 60_000) / 1000);
  const centis = Math.floor((clamped % 1000) / 10);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${hours}:${pad(minutes)}:${pad(seconds)}.${pad(centis)}`;
};
const dialogue = cues.map((cue) => `Dialogue: 0,${assTime(cue.startMs)},${assTime(cue.endMs)},Line,,0,0,0,,${cue.text}`).join('\n');
const ass = [
  '[Script Info]',
  'ScriptType: v4.00+',
  'PlayResX: 1280',
  'PlayResY: 720',
  '',
  '[V4+ Styles]',
  'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
  `Style: Title,${fontName},34,&H00FFFFFF,&H000000FF,&H00182433,&H64000000,0,0,0,0,100,100,0,0,1,0,0,8,48,48,40,1`,
  `Style: Line,${fontName},28,&H00FFFFFF,&H000000FF,&H00182433,&H96000000,0,0,0,0,100,100,0,0,3,8,0,2,72,72,42,1`,
  '',
  '[Events]',
  'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  `Dialogue: 0,${assTime(0)},${assTime(SAMPLE_DURATION_MS)},Title,,0,0,0,,CutPilot Live sample`,
  dialogue,
  '',
].join('\n');
await writeFile(assPath, ass);

const ffmpeg = resolveFfmpeg();
const filter = `subtitles='${escapeFilterPath(assPath)}'`;
await exec(ffmpeg, [
  '-y',
  '-f', 'lavfi', '-i', 'color=c=0x1e293b:s=1280x720:r=24:d=60',
  '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono',
  '-vf', filter,
  '-shortest',
  '-t', '60',
  '-c:v', 'libx264',
  '-pix_fmt', 'yuv420p',
  '-c:a', 'aac',
  '-movflags', '+faststart',
  videoPath,
], { timeout: 120_000 });

const transcript = {
  version: 1,
  clipId: SAMPLE_CLIP_ID,
  durationMs: SAMPLE_DURATION_MS,
  fps: SAMPLE_FPS,
  words: sampleWords(),
};
await writeFile(resolve(sampleDir, 'transcript.json'), `${JSON.stringify(transcript, null, 2)}\n`);
await writeFile(resolve(publicDir, 'transcript.json'), `${JSON.stringify(transcript, null, 2)}\n`);

const session = await runSession(
  createSession(sampleSegments(), { mediaDurationMs: SAMPLE_DURATION_MS }),
  createRuleProvider(),
  null,
);
const labels = {
  version: 1,
  clipId: SAMPLE_CLIP_ID,
  fps: SAMPLE_FPS,
  directive: '',
  about: SAMPLE_LABEL_ABOUT,
  labels: session.decisions.map((decision) => ({
    segmentId: decision.segmentId,
    action: decision.action,
    text: decision.text,
  })),
};
await writeFile(resolve(sampleDir, 'labels.sample.json'), `${JSON.stringify(labels, null, 2)}\n`);
console.log(`wrote ${videoPath}`);
console.log(`wrote ${labels.labels.length} rubric labels`);
