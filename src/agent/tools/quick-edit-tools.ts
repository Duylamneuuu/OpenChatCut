export { QUICK_EDIT_TOOL_SCHEMAS, QUICK_EDIT_TOOL_NAMES } from './schemas/quick-edit-tools';
import type { AgentContext } from '../context';
import { TasteProfile, defaultTasteProfilePath } from '../../color/taste/tasteProfile';
import { ALL_FX } from '../../gl/fx/effects';

type Args = Record<string, unknown>;
type StepResult = { step: string; ok: boolean; detail?: unknown; error?: string };

function profile(): TasteProfile {
  const p = defaultTasteProfilePath();
  return new TasteProfile(p ?? undefined);
}

/** User's most-picked taste, or null when they haven't picked anything yet. */
function favoriteGrade(): string | null {
  const top = profile().top(1);
  const id = top[0]?.assetId;
  return id && ALL_FX[id] ? id : null;
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
    if (detail && typeof detail === 'object' && 'error' in (detail as Record<string, unknown>)) {
      steps.push({ step, ok: false, error: String((detail as Record<string, unknown>).error) });
    } else {
      steps.push({ step, ok: true, detail });
    }
  } catch (e) {
    steps.push({ step, ok: false, error: e instanceof Error ? e.message : String(e) });
  }
}

async function actionVlog(args: Args, ctx: AgentContext, dryRun: boolean): Promise<unknown> {
  const steps: StepResult[] = [];
  const { execTranscriptTool } = await import('./transcript-tools');
  const { execSilenceTool } = await import('./silence-tools');
  const { execTasteGradeTool } = await import('./taste-grade-tools');

  await runStep(
    'transcribe',
    () => execTranscriptTool('transcribe_track', {}, ctx),
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
    (typeof args.grade === 'string' && ALL_FX[args.grade] ? args.grade : null) ??
    favoriteGrade();
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
    steps: steps.map((s) => ({ step: s.step, ok: s.ok, error: s.error })),
    next: failed.length
      ? 'Some steps failed — fix them individually, then re-run the failed step.'
      : 'Done. Style captions with edit_captions, tweak grade with manage_effects, export with export tools.',
  };
}

async function actionShort(args: Args, ctx: AgentContext, dryRun: boolean): Promise<unknown> {
  const steps: StepResult[] = [];
  const { execTranscriptTool } = await import('./transcript-tools');
  const { execHighlightTool } = await import('./highlight-tool');
  const { execTasteGradeTool } = await import('./taste-grade-tools');

  await runStep(
    'transcribe',
    () => execTranscriptTool('transcribe_track', {}, ctx),
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
    (typeof args.grade === 'string' && ALL_FX[args.grade] ? args.grade : null) ??
    favoriteGrade();
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
    steps: steps.map((s) => ({ step: s.step, ok: s.ok, error: s.error })),
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
