import { theme } from '../../theme.js';
import type { GhostSpan } from '../../cutpilot/executor.js';
import { formatClock } from '../../cutpilot/metrics.js';
import type { LoggedDecision } from '../../cutpilot/types.js';
import type { TimelineState } from '../../editor/types.js';
import { ACTION_COLOR } from './cutpilotStyles.js';

export interface Ghost extends GhostSpan {
  id: string;
  until: number;
}

export function DecisionRow({ decision }: { decision: LoggedDecision }) {
  const latency = decision.latencyMs < 10
    ? `${decision.latencyMs.toFixed(1)}ms`
    : `${Math.round(decision.latencyMs)}ms`;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '52px 72px minmax(0, 1fr) auto', gap: 8, padding: '4px 0', borderBottom: `0.5px solid ${theme.border}` }}>
      <span style={{ color: theme.textDim }}>#{String(decision.index + 1).padStart(3, '0')}</span>
      <span>{formatClock(decision.startMs)}</span>
      <span>
        “{decision.text || 'silence'}”
        {decision.zoom ? ' · zoom' : ''}
        {decision.fallback ? ' · fallback' : ''}
        {decision.escalated ? ' · escalated' : ''}
      </span>
      <span style={{ color: ACTION_COLOR[decision.action], fontWeight: 650, whiteSpace: 'nowrap' }}>
        {decision.action.toUpperCase()} p={decision.confidence.toFixed(2)} {latency}
      </span>
    </div>
  );
}

export function ProgramLane({ state, track, scale, ghosts }: { state: TimelineState; track: string; scale: number; ghosts: Ghost[] }) {
  const items = state.items.filter((item) => item.track === track);
  return (
    <div style={{ position: 'relative', height: 42, background: theme.tlTrack, borderRadius: 6, overflow: 'hidden' }}>
      <span style={{ position: 'absolute', left: 6, top: 2, fontSize: 10, color: theme.textDim }}>{track === 'V2' ? 'B-roll' : 'A-roll'}</span>
      {items.map((item) => (
        <div key={item.id} title={item.name} style={{
          position: 'absolute', top: 16, height: 20,
          left: `${(item.startFrame / scale) * 100}%`,
          width: `${Math.max(0.3, (item.durationInFrames / scale) * 100)}%`,
          background: item.kind === 'solid' ? theme.clipMg : item.zoom ? theme.gold : theme.clipVideo,
          borderRadius: 3,
        }} />
      ))}
      {ghosts.map((ghost) => (
        <div key={ghost.id} style={{
          position: 'absolute', top: 16, height: 20,
          left: `${(ghost.startFrame / scale) * 100}%`,
          width: `${Math.max(0.3, (ghost.durationInFrames / scale) * 100)}%`,
          background: '#ef4444',
          borderRadius: 3,
          animation: 'cutpilot-flash 420ms linear forwards',
        }} />
      ))}
    </div>
  );
}

export function LaneLabel({ title, detail }: { title: string; detail: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
      <strong style={{ fontSize: 12 }}>{title}</strong>
      <span style={{ fontSize: 11, color: theme.textDim }}>{detail}</span>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: theme.panel, border: `0.5px solid ${theme.border}`, borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontSize: 11, color: theme.textDim }}>{label}</div>
      <div style={{ fontSize: 18, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{value}</div>
    </div>
  );
}
