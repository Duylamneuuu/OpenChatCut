export { QUICK_EDIT_TOOL_SCHEMAS, QUICK_EDIT_TOOL_NAMES } from './schemas/quick-edit-tools';
import type { AgentContext } from '../context';
import { loadTasteProfile } from '../../color/taste/client';
import { ALL_FX } from '../../gl/fx/effects';

type Args = Record<string, unknown>;
type StepResult = { step: string; ok: boolean; detail?: unknown; error?: string };

/** User's most-picked taste, or null when they haven't picked anything yet. */
async function favoriteGrade(ctx: AgentContext): Promise<string | null> {
  const top = (await loadTasteProfile()).top(200);
  return top.find((pick) => ALL_FX[pick.assetId] || ctx.getState().fxDefs?.[pick.assetId])?.assetId ?? null;
}

async function transcribeTimeline(ctx: AgentContext): Promise<unknown> {
  const { execTranscriptTool } = await import('./transcript-tools');
  const tracks = [...new Set(ctx.getState().items
    .filter((item) => (item.kind === 'video' || item.kind === 'audio') && item.src)
    .map((item) => item.track))];
  if (!tracks.length) return { error: 'no audio/video clips to transcribe' };
  const results: unknown[] = [];
  for (const track of tracks) {
    const result = await execTranscriptTool('transcribe_track', { track }, ctx);
    results.push(result);
    if (result && typeof result === 'object' && 'error' in result) {
      return { error: String(result.error), results };
    }
  }
  return { ok: true, results };
}

async function runStep(
  step: string,
  fn: () => Promise<unknown>,
  steps: StepResult[],
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    steps.push({ step, ok: true, detail: 'dry-run: skipped' });
    return;
  }
  try {
    const detail = await fn();
    // Unwrap common error shapes from sub-tools
    const result = detail && typeof detail === 'object' ? detail as Record<string, unknown> : undefined;
    if (result && ('error' in result || result.ok === false)) {
      steps.push({ step, ok: false, detail, error: String(result.error ?? 'step failed') });
    } else if (step === 'remove_silence' && result
      && Array.isArray(result.edited) && result.edited.length === 0
      && (result.skippedReason === 'vad-disabled'
        || Array.isArray(result.skipped) && result.skipped.length > 0)) {
      steps.push({ step, ok: false, detail, error: String(result.note ?? 'silence removal skipped clips') });
    } else {
      steps.push({ step, ok: true, detail });
    }
  } catch (e) {
    steps.push({ step, ok: false, error: e instanceof Error ? e.message : String(e) });
  }
}

async function actionVlog(args: Args, ctx: AgentContext, dryRun: boolean): Promise<unknown> {
  const steps: StepResult[] = [];
  const { execSilenceTool } = await import('./silence-tools');
  const { execTasteGradeTool } = await import('./taste-grade-tools');

  await runStep(
    'transcribe',
    () => transcribeTimeline(ctx),
    steps,
    dryRun,
  );
  await runStep(
    'remove_silence',
    () => execSilenceTool('remove_silence', {}, ctx),
    steps,
    dryRun,
  );

  const gradeId =
    (typeof args.grade === 'string' && (ALL_FX[args.grade] || ctx.getState().fxDefs?.[args.grade]) ? args.grade : null) ??
    await favoriteGrade(ctx);
  if (gradeId) {
    await runStep(
      'taste_grade',
      () => execTasteGradeTool('taste_grade', { action: 'per_segment', assetId: gradeId }, ctx),
      steps,
      dryRun,
    );
  } else {
    steps.push({
      step: 'taste_grade',
      ok: false,
      error: 'no favorite grade yet — pick a LUT/look once (taste_grade record_pick) or pass grade:',
    });
  }

  const failed = steps.filter((s) => !s.ok);
  return {
    ok: failed.length === 0,
    action: 'vlog',
    dryRun,
    steps,
    next: failed.length
      ? 'Some steps failed — fix them individually, then re-run the failed step.'
      : 'Done. Style captions with edit_captions, tweak grade with manage_effects, export with export tools.',
  };
}

async function actionShort(args: Args, ctx: AgentContext, dryRun: boolean): Promise<unknown> {
  const steps: StepResult[] = [];
  const { execHighlightTool } = await import('./highlight-tool');
  const { execTasteGradeTool } = await import('./taste-grade-tools');

  await runStep(
    'transcribe',
    () => transcribeTimeline(ctx),
    steps,
    dryRun,
  );
  await runStep(
    'find_highlights',
    () => execHighlightTool('find_highlights', { count: 3 }, ctx),
    steps,
    dryRun,
  );

  const gradeId =
    (typeof args.grade === 'string' && (ALL_FX[args.grade] || ctx.getState().fxDefs?.[args.grade]) ? args.grade : null) ??
    await favoriteGrade(ctx);
  if (gradeId) {
    await runStep(
      'taste_grade',
      () => execTasteGradeTool('taste_grade', { action: 'per_segment', assetId: gradeId }, ctx),
      steps,
      dryRun,
    );
  } else {
    steps.push({ step: 'taste_grade', ok: false, error: 'no favorite grade yet — pass grade: or pick one first.' });
  }

  const failed = steps.filter((s) => !s.ok);
  return {
    ok: failed.length === 0,
    action: 'short',
    dryRun,
    steps,
    next: failed.length
      ? 'Some steps failed.'
      : 'Highlights ready. Reframe vertical with reframe tools if needed, then export.',
  };
}

async function actionCleanup(args: Args, ctx: AgentContext, dryRun: boolean): Promise<unknown> {
  const steps: StepResult[] = [];
  const { execSilenceTool } = await import('./silence-tools');
  if (dryRun) {
    // Preview mode: let the silence tool itself report would-be cuts.
    const detail = await execSilenceTool('remove_silence', { dryRun: true }, ctx);
    return { ok: true, action: 'cleanup', dryRun: true, preview: detail };
  }
  await runStep(
    'remove_silence',
    () => execSilenceTool('remove_silence', {}, ctx),
    steps,
    false,
  );
  void args;
  return { ok: steps[0]?.ok ?? false, action: 'cleanup', dryRun: false, steps };
}

export async function execQuickEditTool(
  name: string,
  args: Args,
  ctx: AgentContext,
): Promise<unknown> {
  if (name !== 'quick_edit') return { error: `unknown tool ${name}` };
  const dryRun = args.dryRun === true;
  switch (String(args.action)) {
    case 'vlog':
      return actionVlog(args, ctx, dryRun);
    case 'short':
      return actionShort(args, ctx, dryRun);
    case 'cleanup':
      return actionCleanup(args, ctx, dryRun);
    default:
      return { error: 'action must be vlog|short|cleanup' };
  }
}
