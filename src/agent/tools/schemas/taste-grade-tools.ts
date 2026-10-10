import type { AgentToolSchema } from '../../tool-schema';

export const TASTE_GRADE_TOOL_SCHEMAS: AgentToolSchema[] = [
  {
    name: 'taste_grade',
    description:
      'AI color grading that follows the USER\'S TASTE — not generic auto-correction. '
      + 'action=suggest ranks LUT/look presets for a mood ("phim Hàn ấm áp", "ngầu kiểu cyber", "vintage") using keyword matching plus the user\'s personal taste profile. '
      + 'action=from_reference bakes a custom 3D LUT that copies the color mood of a REFERENCE image the user likes: pass referenceStats {mean:[L,a,b], std:[L,a,b]} (get them from your vision analysis of the reference, or ask the user). Returns a new assetId ready for manage_effects. '
      + 'action=record_pick saves the user\'s choice so future suggestions learn their taste. '
      + 'action=per_segment applies one LUT/look to every scene segment of the target clips (uses scene detection to split first). '
      + 'Prefer this over auto_grade whenever the user talks about style, mood, vibe, or "like this image".',
    input_schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['suggest', 'from_reference', 'record_pick', 'per_segment'],
          description: 'Which taste-grading operation.',
        },
        mood: {
          type: 'string',
          description: 'suggest: free text mood, Vietnamese or English, e.g. "ấm áp kiểu phim Hàn".',
        },
        itemIds: {
          type: 'string',
          description: 'from_reference/per_segment: comma-separated clip ids/prefixes. Omit to target all eligible video/image clips.',
        },
        referenceStats: {
          type: 'object',
          description: 'from_reference: Lab stats of the reference image the user likes. {mean:[L,a,b], std:[L,a,b]}.',
        },
        strength: {
          type: 'number',
          description: 'from_reference: 0..1 how strongly the reference mood is applied (default 0.85).',
        },
        lutName: {
          type: 'string',
          description: 'from_reference: display name for the generated LUT.',
        },
        assetId: {
          type: 'string',
          description: 'record_pick/per_segment: LUT/look assetId, e.g. "builtin:look-teal-orange" or a taste: id from from_reference.',
        },
        intensity: {
          type: 'number',
          description: 'per_segment: LUT intensity 0..1 (default 0.85).',
        },
        limit: {
          type: 'number',
          description: 'suggest: max suggestions (default 6).',
        },
      },
      required: ['action'],
    },
  },
];

export const TASTE_GRADE_TOOL_NAMES = new Set(TASTE_GRADE_TOOL_SCHEMAS.map((t) => t.name));
