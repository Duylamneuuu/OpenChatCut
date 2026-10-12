import assert from 'node:assert/strict';
import { makeDraft } from '../../editor/store';
import { docFromTimeline } from '../../persist/projectStore';
import type { AgentContext } from '../context';
import { execTasteGradeTool } from './taste-grade-tools';
import { execQuickEditTool } from './quick-edit-tools';
import { TasteProfile } from '../../color/taste/tasteProfile';
import { execLoudnessTool } from './loudness-tools';
import { execTranscriptTool } from './transcript-tools';

const draft = makeDraft(docFromTimeline({
  fps: 30, width: 640, height: 360, selectedId: null,
  assets: [], trackOrder: ['V1'], tracks: { V1: { kind: 'video' } },
  items: [{ id: 'taste-clip', name: 'Test', kind: 'video', track: 'V1', startFrame: 0, durationInFrames: 90, src: '/media/uploads/test.mp4' }],
}));
const ctx: AgentContext = {
  commands: draft.commands, getState: draft.getState, getDoc: draft.getDoc,
  getCreativeMode: () => null, templates: [], audio: [],
};
const profile = new TasteProfile();
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  if (String(input).endsWith('/lut')) {
    return Response.json({ assetId: 'taste:generated', cubeUrl: '/media/uploads/generated.cube' });
  }
  assert.equal(String(input), '/api/taste-grade/profile');
  if (init?.method === 'POST') {
    const pick = JSON.parse(String(init.body)) as { assetId: string; name: string; mood?: string };
    profile.record(pick.assetId, pick.name, pick.mood);
  }
  return Response.json({ profile: profile.toJSON() });
}) as typeof fetch;
try {
  const recorded = await execTasteGradeTool('taste_grade', { action: 'record_pick', assetId: 'builtin:look-warm' }, ctx) as { top: Array<{ assetId: string }> };
  assert.equal(recorded.top[0]?.assetId, 'builtin:look-warm');
  for (const intensity of [0, 0.5, 1]) {
    await execTasteGradeTool('taste_grade', { action: 'per_segment', assetId: 'builtin:look-warm', intensity }, ctx);
    assert.equal(draft.getState().items[0]?.effects?.at(-1)?.overrides?.intensity, intensity);
  }
  assert.equal(draft.getState().items[0]?.effects?.length, 1, 'repeating a grade updates its intensity instead of stacking copies');
  const generated = await execTasteGradeTool('taste_grade', {
    action: 'from_reference', referenceStats: { mean: [60, 2, 5], std: [20, 12, 12] }, strength: 0,
  }, ctx) as { ok: boolean; assetId: string };
  assert.equal(generated.ok, true);
  assert.equal(draft.getState().items[0]?.effects?.at(-1)?.overrides?.intensity, 0);
  assert.equal(draft.getState().fxDefs?.[generated.assetId]?.cube, '/media/uploads/generated.cube');
  const quick = await execQuickEditTool('quick_edit', { action: 'cleanup' }, ctx) as { ok: boolean; steps: Array<{ detail?: unknown }> };
  assert.equal(quick.ok, false, 'disabled VAD must not be reported as completed cleanup');
  assert.ok(quick.steps[0]?.detail, 'step details survive the wrapper');
  draft.commands.setItemTranscript('taste-clip', [{ text: 'Hello', start: 0, end: 1000 }]);
  const translations = await execTranscriptTool('manage_transcript', { action: 'translation_list', itemId: 'taste-clip' }, ctx) as { ok: boolean };
  assert.equal(translations.ok, true, 'video transcript management resolves the target track without an A1 track');
  const vlog = await execQuickEditTool('quick_edit', { action: 'vlog', grade: 'builtin:look-warm' }, ctx) as {
    steps: Array<{ step: string; ok: boolean }>;
  };
  assert.equal(vlog.steps.find((step) => step.step === 'transcribe')?.ok, true,
    'a video-only timeline can transcribe its video track without requiring an A1 track');
  const originalDecoder = globalThis.OfflineAudioContext;
  globalThis.OfflineAudioContext = class {
    async decodeAudioData() {
      const samples = new Float32Array(44100).fill(0.1);
      return { numberOfChannels: 1, length: samples.length, sampleRate: 44100,
        getChannelData: () => samples };
    }
  } as unknown as typeof OfflineAudioContext;
  globalThis.fetch = (async () => new Response(new ArrayBuffer(4))) as typeof fetch;
  try {
    const loudness = await execLoudnessTool('normalize_loudness', { itemId: 'taste-clip' }, ctx) as {
      ok: boolean; normalized: Array<{ itemId: string; gain: number }>;
    };
    assert.equal(loudness.ok, true);
    assert.equal(loudness.normalized[0]?.itemId, 'taste-clip', 'embedded video audio is normalized');
    assert.equal(draft.getState().items[0]?.volume, loudness.normalized[0]?.gain);
  } finally { globalThis.OfflineAudioContext = originalDecoder; }
  console.log('taste-grade tools, intensity, quick-edit and video loudness: ok');
} finally {
  globalThis.fetch = originalFetch;
}
