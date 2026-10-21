import type { CSSProperties } from 'react';
import type { CutAction } from '../../cutpilot/types.js';

export const ACTION_COLOR: Record<CutAction, string> = {
  keep: 'var(--cc-clip-video)',
  cut: 'var(--cc-danger)',
  trim: 'var(--cc-gold)',
  broll: 'var(--cc-clip-mg)',
};

export const quietButton: CSSProperties = {
  height: 28,
  borderRadius: 6,
  border: '0.5px solid var(--cc-border)',
  background: 'transparent',
  color: 'var(--cc-text)',
  padding: '0 10px',
  cursor: 'pointer',
  fontSize: 12,
};

export const accentButton: CSSProperties = {
  ...quietButton,
  background: 'var(--cc-accent)',
  color: 'var(--cc-on-accent)',
  border: 'none',
  fontWeight: 650,
};

export const chip: CSSProperties = {
  ...quietButton,
  color: 'var(--cc-text-dim)',
};

export const selectStyle: CSSProperties = {
  height: 28,
  borderRadius: 6,
  border: '0.5px solid var(--cc-border)',
  background: 'var(--cc-inset)',
  color: 'var(--cc-text)',
  fontSize: 12,
};

export const column: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 12,
  overflow: 'auto',
};
