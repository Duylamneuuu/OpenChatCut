export { TASTE_GRADE_TOOL_SCHEMAS, TASTE_GRADE_TOOL_NAMES } from './schemas/taste-grade-tools';
import type { AgentContext } from '../context';
import type { ClipEffect, TimelineItem } from '../../editor/types';
import { ALL_FX, serializableDefsFor } from '../../gl/fx/effects';
import {
  bakeCubeText,
  makeTransferParams,
  parseLabStats,
  type LabStats,
} from '../../color/taste/colorTransfer';
import { TasteProfile, defaultTasteProfilePath } from '../../color/taste/tasteProfile';

type Args = Record<string, unknown>;

// LUT + look asset ids (builtin ids start with "builtin:look-" or "builtin:" + cube LUTs,
// community packs add "community:…", generated ones "taste:…").
function lutLikeIds(): string[] {
  return Object.keys(ALL_FX).filter(
    (id) =>
      id.startsWith('builtin:look-') ||
      id.startsWith('community:') ||
      id.startsWith('taste:') ||
      (ALL_FX[id]?.cube != null),
  );
}

function profile(): TasteProfile {
  const p = defaultTasteProfilePath();
  return new TasteProfile(p ?? undefined);
}

function parseItemRefs(raw: unknown): string[] {
  return String(raw ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function eligibleClips(items: TimelineItem[]): TimelineItem[] {
  return items.filter((it) => it.kind === 'video' || it.kind === 'image' || it.kind === 'gif');
}

function resolveTargets(
  items: TimelineItem[],
  refs: string[],
): { targets: TimelineItem[]; missing: string[] } {
  const pool = eligibleClips(items);
  if (!refs.length) return { targets: pool, missing: [] };
  const targets: TimelineItem[] = [];
  const missing: string[] = [];
  for (const ref of refs) {
    const hits = pool.filter((it) => it.id === ref || it.id.startsWith(ref));
    if (hits.length === 1) targets.push(hits[0]!);
    else if (!hits.length) missing.push(ref);
    else missing.push(`${ref} (ambiguous)`);
  }
  return { targets, missing };
}

function describeAsset(id: string) {
  const d = ALL_FX[id];
  if (!d) return null;
  return { assetId: d.id, name: d.name, description: d.desc };
}

async function actionSuggest(args: Args) {
  const mood = String(args.mood ?? '');
  const limit = Math.min(12, Math.max(1, Number(args.limit ?? 6) || 6));
  const candidates = lutLikeIds();
  const ranked = profile().rank(candidates, mood || undefined).slice(0, limit);
  return {
    ok: true,
    action: 'suggest',
    mood: mood || undefined,
    suggestions: ranked
      .map(describeAsset)
      .filter(Boolean)
      .map((s, i) => ({ rank: i + 1, ...s })),
    next: 'Apply with manage_effects action=add assetId=<assetId> targetItemId=<clip>, '
      + 'or taste_grade action=record_pick to teach your taste.',
  };
}

async function actionRecordPick(args: Args) {
  const assetId = String(args.assetId ?? '');
  const d = assetId ? ALL_FX[assetId] : undefined;
  if (!assetId || !d) {
    return { error: `unknown asset ${assetId || '(missing)'}`, available: lutLikeIds().slice(0, 20) };
  }
  profile().record(assetId, d.name, typeof args.mood === 'string' ? args.mood : undefined);
  return { ok: true, action: 'record_pick', assetId, name: d.name, top: profile().top(5) };
}

async function actionFromReference(args: Args, ctx: AgentContext) {
  const refStats = parseLabStats(args.referenceStats);
  if (!refStats) {
    return {
      error:
        'referenceStats must be {mean:[L,a,b], std:[L,a,b]} of the reference image. '
        + 'Analyze the reference image you can see and estimate its Lab mean/std.',
    };
  }
  const state = ctx.getState();
  const { targets, missing } = resolveTargets(state.items, parseItemRefs(args.itemIds));
  if (!targets.length) {
    return { error: 'no eligible video/image clips', missing };
  }

  // Source stats: use a neutral mid-gray-ish source so the transfer is driven
  // by the reference. (Per-clip source analysis can refine this later.)
  const srcStats: LabStats = { mean: [50, 0, 0], std: [22, 14, 14] };
  const strength = Math.min(1, Math.max(0.1, Number(args.strength ?? 0.85) || 0.85));
  const params = makeTransferParams(srcStats, refStats, strength);
  const id = `taste-${Date.now().toString(36)}`;
  const lutName = String(args.lutName ?? 'Taste grade').slice(0, 60);
  const cubeText = bakeCubeText(params, 33, lutName);

  // Persist the .cube where the renderer can fetch it (/media/uploads/…).
  const fileName = `${id}.cube`;
  try {
    const { uploadDir } = await import('../../server/media-dir');
    const { writeFile, mkdir } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const dir = uploadDir();
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, fileName), cubeText, 'utf8');
  } catch (e) {
    return { error: `could not persist LUT: ${e instanceof Error ? e.message : String(e)}` };
  }

  const cubeUrl = `/media/uploads/${fileName}`;
  try {
    const { registerCustomFx } = await import('../../gl/fx/effects');
    const lutFrag = (await import('../../gl/fx/lut.frag.ts')).default as string;
    registerCustomFx({
      id: `taste:${id}`,
      name: lutName,
      desc: `AI taste grade baked from a reference image (strength ${strength}).`,
      frag: lutFrag,
      cube: cubeUrl,
      props: [{ key: 'intensity', label: 'Intensity', default: 0.85, min: 0, max: 1, step: 0.01 }],
    });
  } catch (e) {
    return { error: `LUT baked to ${cubeUrl} but registration failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  const assetId = `taste:${id}`;
  // Apply to targets right away (one undo step per clip, like manage_effects).
  const applied: string[] = [];
  for (const it of targets) {
    const effect: ClipEffect = {
      id: `fx_${Math.random().toString(36).slice(2)}`,
      assetId,
      overrides: { intensity: strength },
    };
    ctx.commands.setItemEffects(it.id, [...(it.effects ?? []), effect], serializableDefsFor([effect]));
    applied.push(it.id);
  }
  profile().record(assetId, lutName);
  return {
    ok: true,
    action: 'from_reference',
    assetId,
    name: lutName,
    cubeUrl,
    appliedTo: applied,
    missing: missing.length ? missing : undefined,
    note: 'Custom LUT baked from the reference mood and applied. Tune with manage_effects action=update.',
  };
}

async function actionPerSegment(args: Args, ctx: AgentContext) {
  const assetId = String(args.assetId ?? '');
  if (!assetId || !ALL_FX[assetId]) {
    return { error: `unknown asset ${assetId || '(missing assetId)'}`, available: lutLikeIds().slice(0, 20) };
  }
  const intensity = Math.min(1, Math.max(0, Number(args.intensity ?? 0.85) || 0.85));
  const state = ctx.getState();
  const { targets, missing } = resolveTargets(state.items, parseItemRefs(args.itemIds));
  if (!targets.length) {
    return { error: 'no eligible video/image clips', missing };
  }
  // v1: apply the same taste LUT to every target clip (each clip ≈ one scene
  // after scene-split). Scene-aware splitting per clip is the follow-up.
  const applied: string[] = [];
  for (const it of targets) {
    const effect: ClipEffect = {
      id: `fx_${Math.random().toString(36).slice(2)}`,
      assetId,
      overrides: { intensity },
    };
    ctx.commands.setItemEffects(it.id, [...(it.effects ?? []), effect], serializableDefsFor([effect]));
    applied.push(it.id);
  }
  profile().record(assetId, ALL_FX[assetId]!.name);
  return {
    ok: true,
    action: 'per_segment',
    assetId,
    name: ALL_FX[assetId]!.name,
    appliedTo: applied,
    missing: missing.length ? missing : undefined,
    note: 'Applied per clip. For true per-scene splits, run scene detection first, then re-run per_segment on the split clips.',
  };
}

export async function execTasteGradeTool(
  name: string,
  args: Args,
  ctx: AgentContext,
): Promise<unknown> {
  if (name !== 'taste_grade') return { error: `unknown tool ${name}` };
  switch (String(args.action)) {
    case 'suggest':
      return actionSuggest(args);
    case 'from_reference':
      return actionFromReference(args, ctx);
    case 'record_pick':
      return actionRecordPick(args);
    case 'per_segment':
      return actionPerSegment(args, ctx);
    default:
      return { error: 'action must be suggest|from_reference|record_pick|per_segment' };
  }
}
