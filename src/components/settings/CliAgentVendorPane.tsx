import type { ReactNode } from 'react';
import { CLI_AGENT_LABELS, isCliAgentBackend } from '../../../shared/cli-agent';
import { theme } from '../../theme';
import { useT } from '../../i18n/locale';
import { VendorIcon } from './vendorIcons';
import { fieldCardBox, ON, pageNote, pane, testBtn } from './settingsVendorPane.styles';
import type { FieldCtx } from './settingsVendorPane';
import type { SettingsVendorPage } from './settingsFields';

export function CliAgentVendorPane({ page, ctx, children }: {
  page: SettingsVendorPage; ctx: FieldCtx; children: ReactNode;
}) {
  const t = useT();
  if (!isCliAgentBackend(page.connection)) return null;
  const backend = page.connection;
  const controller = ctx.cliAgents[backend];
  const status = controller.status;
  const available = status?.installed && status.supported;
  const label = controller.loading ? 'Checking CLI…' : available ? 'CLI available' : 'CLI unavailable';
  return <div style={pane}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <VendorIcon vendor={backend} size={18} /><b>{CLI_AGENT_LABELS[backend]}</b>
      <span style={{ fontSize: 11, color: available ? ON : theme.textDim }}>{t(label)}</span>
    </div>
    <section style={fieldCardBox}>
      <div>{status?.version ? `${CLI_AGENT_LABELS[backend]} ${status.version}` : t('No CLI version detected.')}</div>
      <p style={pageNote}>{t(page.note || '')}</p>
      <div style={pageNote}>{t('Authentication is managed by the CLI and verified when a request runs.')}</div>
      <div style={pageNote}>{t('Sign in through your CLI, then refresh:')} <code>{status?.loginCommand || (backend === 'opencode' ? 'opencode auth login' : 'agy')}</code></div>
      <button type="button" style={testBtn} disabled={controller.loading} onClick={() => { void controller.refresh(); }}>
        {t('Refresh CLI and models')}
      </button>
      {controller.error && <div role="alert" style={{ color: theme.danger, whiteSpace: 'pre-wrap' }}>{controller.error}</div>}
    </section>
    <section style={fieldCardBox}>{children}</section>
  </div>;
}
