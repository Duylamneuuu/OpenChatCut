import type { AgentToolSchema } from '../../tool-schema';

export const QUICK_EDIT_TOOL_SCHEMAS: AgentToolSchema[] = [
  {
    name: 'quick_edit',
    description:
      'One-command speed editing for beginners — chains the boring work into a single call. '
      + 'action=vlog: transcribe audio → remove dead air → apply your favorite taste grade. '
      + 'Perfect for talking-head vlogs, tutorials, podcasts. '
      + 'action=short: AI finds the best highlights for a vertical short → applies your taste grade. '
      + 'Perfect for cutting TikTok/Reels/Shorts from a long video. '
      + 'action=cleanup: just remove dead air (silence) from all clips. '
      + 'Each step is undoable as its own batch; failures are reported per-step without stopping the chain. '
      + 'After quick_edit, use edit_captions to style captions or manage_effects to tweak the grade.',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['vlog', 'short', 'cleanup'],
          description: 'vlog = full talking-head pipeline; short = highlights for vertical; cleanup = silence only.',
        },
        grade: {
          type: 'string',
          description: 'LUT/look assetId to apply (e.g. "builtin:look-teal-orange"). Omit to use your most-picked taste.',
        },
        dryRun: {
          type: 'boolean',
          description: 'true = report what would happen without editing.',
        },
      },
      required: ['action'],
    },
  },
];

export const QUICK_EDIT_TOOL_NAMES = new Set(QUICK_EDIT_TOOL_SCHEMAS.map((t) => t.name));
