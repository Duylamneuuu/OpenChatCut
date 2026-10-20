// Run the same labeled clip through each configured CutPilot provider.
// Prints measured latency and agreement. It does not invent numbers for a
// provider that was not called.
//
//   npx tsx scripts/cutpilot-benchmark.ts
//   npx tsx scripts/cutpilot-benchmark.ts --providers rule,hosted --steer
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { formatScoreCard, scoreDecisions } from '../src/cutpilot/benchmark.ts';
import { configFromEnv, type CutPilotProviderId, type EndpointConfig } from '../src/cutpilot/config.ts';
import { loadCutpilotEnv } from '../src/cutpilot/node/load-env.ts';
import { detectSceneCuts, extractWav, probeDurationMs, transcribeWav } from '../src/cutpilot/node/prepare.ts';
import { createOpenAiProvider } from '../src/cutpilot/providers/openai.ts';
import { createRuleProvider } from '../src/cutpilot/providers/rule-provider.ts';
import { isJoke } from '../src/cutpilot/providers/rule.ts';
import { repeatSegments, segmentTranscript, splitSegmentsAtScenes } from '../src/cutpilot/segmenter.ts';
import { SAMPLE_DURATION_MS, sampleWords } from '../src/cutpilot/sample.ts';
import { createSession, runSession } from '../src/cutpilot/session.ts';
import { importTranscript } from '../src/cutpilot/transcript-import.ts';
import type { DecisionProvider } from '../src/cutpilot/types.ts';
import type { LabelFile } from '../src/cutpilot/types.ts';

const { values } = parseArgs({
  options: {
    providers: { type: 'string', default: '' },
    labels: { type: 'string', default: 'samples/cutpilot/labels.sample.json' },
    transcript: { type: 'string', default: 'samples/cutpilot/transcript.json' },
    video: { type: 'string', default: 'public/cutpilot/sample.mp4' },
    directive: { type: 'string', default: '' },
    steer: { type: 'boolean', default: false },
    transcribe: { type: 'boolean', default: false },
    'apply-scenes': { type: 'boolean', default: false },
    sprint: { type: 'boolean', default: false },
  },
});

const root = resolve(import.meta.dirname, '..');
const env = loadCutpilotEnv(root);
const config = configFromEnv(env);

function providerById(id: CutPilotProviderId | 'escalation'): { provider: DecisionProvider; skip?: string } {
  if (id === 'rule') return { provider: createRuleProvider() };
  const endpoint: EndpointConfig | null = id === 'local' ? config.local : id === 'hosted' ? config.hosted : config.escalation;
  if (!endpoint) {
    const name = id === 'local' ? 'CUTPILOT_LOCAL_BASE_URL' : id === 'hosted' ? 'CUTPILOT_HOSTED_BASE_URL' : 'CUTPILOT_ESCALATION_BASE_URL';
    return { provider: createRuleProvider(), skip: `${id} skipped: set ${name}` };
  }
  return { provider: createOpenAiProvider({ ...endpoint, id }) };
}

const requested = (values.providers || [config.provider, 'rule'].filter((id, index, all) => all.indexOf(id) === index).join(','))
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const ids = requested.filter((id): id is CutPilotProviderId => id === 'rule' || id === 'local' || id === 'hosted');

let words = sampleWords();
let durationMs = SAMPLE_DURATION_MS;
let sceneCuts: number[] = [];
const transcriptPath = resolve(root, values.transcript);
if (existsSync(transcriptPath)) {
  const file = JSON.parse(await readFile(transcriptPath, 'utf8')) as { words?: unknown; durationMs?: number };
  const imported = importTranscript(file);
  if (imported.length) words = imported;
  if (typeof file.durationMs === 'number') durationMs = file.durationMs;
}

const videoPath = resolve(root, values.video);
if (existsSync(videoPath)) {
  try {
    const probed = await probeDurationMs(videoPath);
    console.log(`ffmpeg probe: ${videoPath} ${probed} ms`);
    const directory = await mkdtemp(join(tmpdir(), 'cutpilot-'));
    try {
      const wav = join(directory, 'audio.wav');
      await extractWav(videoPath, wav);
      console.log(`ffmpeg audio: extracted ${wav}`);
      const scenes = await detectSceneCuts(videoPath);
      console.log(`ffmpeg scenes: ${scenes.length} cut${scenes.length === 1 ? '' : 's'}${scenes.length ? ` at ${scenes.join(', ')} ms` : ''}`);
      if (values['apply-scenes'] && scenes.length) sceneCuts = scenes;
      if (values.transcribe) {
        const transcribed = await transcribeWav(wav, env);
        if (!transcribed) console.log('transcription: no whisper command or model configured; using the transcript file');
        else {
          words = transcribed;
          console.log(`transcription: ${transcribed.length} words`);
        }
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  } catch (error) {
    console.log(`ffmpeg prepare failed: ${error instanceof Error ? error.message : String(error)}`);
  }
} else {
  console.log(`ffmpeg prepare skipped: ${values.video} is not on disk`);
}

let segments = segmentTranscript(words, { durationMs });
if (sceneCuts.length) {
  segments = splitSegmentsAtScenes(segments, sceneCuts);
  console.log('scene cuts were applied; bundled labels will not line up with the new ids');
}
if (values.sprint) segments = repeatSegments(segments, 600);

const labelPath = resolve(root, values.labels);
const labelFile = existsSync(labelPath) && !values.sprint && !sceneCuts.length
  ? JSON.parse(await readFile(labelPath, 'utf8')) as LabelFile
  : null;
if (!labelFile) console.log(`labels: not scored (${values.sprint ? 'sprint has no fixed ids' : sceneCuts.length ? 'scene split' : `${values.labels} missing`})`);

const escalation = config.escalation
  ? createOpenAiProvider({ ...config.escalation, id: 'escalation' })
  : null;

for (const id of ids) {
  const selected = providerById(id);
  if (selected.skip) {
    console.log(`\n${selected.skip}`);
    continue;
  }
  const started = performance.now();
  try {
    const session = await runSession(
      createSession(segments, { mediaDurationMs: durationMs, directive: values.directive }),
      selected.provider,
      escalation,
    );
    const card = scoreDecisions(session.decisions, labelFile?.labels ?? []);
    console.log(`\n${formatScoreCard(id, card, `wall ${(performance.now() - started).toFixed(0)} ms, ${session.decisions.length} decisions`)}`);
    if (values.steer && !values.sprint) {
      const steered = await runSession(
        createSession(segments, { mediaDurationMs: durationMs, directive: 'keep the jokes, slower pace' }),
        selected.provider,
        escalation,
      );
      const jokes = session.decisions.filter((decision) => isJoke(decision.text));
      let flipped = 0;
      for (const joke of jokes) {
        const after = steered.decisions.find((decision) => decision.segmentId === joke.segmentId);
        if (joke.action === 'cut' && after?.action === 'keep') flipped += 1;
      }
      console.log(`steerability: ${flipped}/${jokes.length} joke slices flipped from cut to keep after "keep the jokes, slower pace"`);
    }
  } catch (error) {
    console.log(`\n${id} failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (!ids.length) console.log('no providers selected');
