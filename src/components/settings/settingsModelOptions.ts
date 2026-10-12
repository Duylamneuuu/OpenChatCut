import type { SettingsField } from './settingsFields';
import type { FieldCtx } from './settingsVendorPane';
export type { CliAgentBackend } from '../../../shared/cli-agent';
export type { CliAgentSettingsController } from './useCliAgentSettings';

export function discoveredSettingsModels(field: SettingsField, ctx: FieldCtx): readonly string[] {
  switch (field.name) {
    case 'CODEX_MODEL': return ctx.codex.models.map((model) => model.id);
    case 'COPILOT_MODEL': return ctx.copilot.models.filter((model) => model.supportsTools).map((model) => model.id);
    case 'CLAUDE_CODE_MODEL': return ctx.claudeCode.models.map((model) => model.id);
    case 'OPENCODE_MODEL': return ctx.cliAgents.opencode.models.map((model) => model.id);
    case 'ANTIGRAVITY_MODEL': return ctx.cliAgents.antigravity.models.map((model) => model.id);
    default: return field.discoverableModel ? ctx.modelOptions[field.name] ?? [] : [];
  }
}
export function settingsModelBusy(field: SettingsField, ctx: FieldCtx): boolean {
  switch (field.name) {
    case 'CODEX_MODEL': return ctx.codex.modelBusy;
    case 'COPILOT_MODEL': return ctx.copilot.modelBusy;
    case 'CLAUDE_CODE_MODEL': return ctx.claudeCode.modelBusy;
    case 'OPENCODE_MODEL': return ctx.cliAgents.opencode.loading;
    case 'ANTIGRAVITY_MODEL': return ctx.cliAgents.antigravity.loading;
    default: return false;
  }
}
