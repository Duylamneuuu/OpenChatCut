import type { ReactNode } from 'react';
import { AbsoluteFill, spring, useVideoConfig } from 'remotion';
import {
  ACCENT,
  BG,
  CLIP,
  DISPLAY,
  HOLD,
  LINE,
  MONO,
  MUTED,
  PAD,
  SURFACE,
  TEXT,
  WAVE,
  TITLE_H,
  TRACK_CENTER_Y,
  TRACK_H,
  TRACK_W,
  WINDOW_H,
  WINDOW_TOP,
  WINDOW_W,
  enter,
  exit,
  rise,
  windowLeft,
} from './theme';
import {
  INTERVIEW_DECISIONS,
  KEEP_FLIP,
  LATENCY,
  LOG_ROWS,
  SCENES,
  SILENCE_LABEL,
  SILENCE_SNAP,
  UM_LABEL,
  UM_SNAP,
  cameraAt,
  chromeAt,
  panelAt,
  playheadUnit,
} from './timeline';

const WAVE_LEVELS = [18, 32, 48, 70, 54, 86, 64, 40, 58, 78, 92, 66, 44, 30, 52, 74, 60, 38, 46, 82, 68, 50, 28, 42, 63, 88, 57, 36, 24, 44, 70, 48];

const CLIPS = [
  { key: 'confusing', label: 'confusing', width: 200, kind: 'keep' as const },
  { key: 'silence', label: '', width: 140, kind: 'silence' as const },
  { key: 'history', label: 'history.', width: 140, kind: 'keep' as const },
  { key: 'um', label: 'um', width: 88, kind: 'um' as const },
  { key: 'point', label: 'point', width: 136, kind: 'keep' as const },
];

const GAP = 8;
/** Hero spring may pass 1. Keep a sliver of the gap so a ripple cannot cross the previous chip. */
const OVERSHOOT = 4;

function placeClips(silenceSpring: number, umSpring: number) {
  let cursor = 0;
  const base = CLIPS.map((clip) => {
    const spring = clip.kind === 'silence' ? silenceSpring : clip.kind === 'um' ? umSpring : 0;
    const open = 1 - Math.min(1, Math.max(0, spring));
    const full = clip.width;
    const width = full * open;
    const left = cursor;
    cursor += (full + GAP) * open;
    return { ...clip, width, left, spring, full };
  });
  let pull = 0;
  return base.map((clip) => {
    const left = Math.max(0, clip.left - pull);
    if (clip.kind === 'silence' || clip.kind === 'um') {
      pull += Math.min(OVERSHOOT, Math.max(0, clip.spring - 1) * clip.full);
    }
    return { ...clip, left };
  });
}

function accentMix(t: number): string {
  const amount = Math.min(1, Math.max(0, t));
  const from = [0xf4, 0xf4, 0xf5];
  const to = [0x4d, 0x7c, 0x0f];
  const rgb = from.map((channel, index) => Math.round(channel + (to[index]! - channel) * amount));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

export function Stage() {
  return (
    <AbsoluteFill style={{ background: BG }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 72% 56% at 50% 42%, #FFFFFF 0%, #FAFAFA 70%)' }} />
    </AbsoluteFill>
  );
}

export function Camera({ frame, children }: { frame: number; children: ReactNode }) {
  const { width } = useVideoConfig();
  const cam = cameraAt(frame, width);
  return (
    <AbsoluteFill style={{ perspective: 1400 }}>
      <AbsoluteFill
        style={{
          transformOrigin: `${width / 2}px ${TRACK_CENTER_Y}px`,
          transform: `rotateX(${cam.tilt}deg) scale(${cam.scale})`,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export function Headline({
  lines,
  frame,
  duration,
  size = 96,
}: {
  lines: readonly string[];
  frame: number;
  duration: number;
  size?: number;
}) {
  const { width } = useVideoConfig();
  const shown = Math.min(enter(frame, 6, 16), exit(frame, duration - 10, 8));
  const motion = rise(shown, 18);
  const column = Math.min(880, width - 200);
  return (
    <div
      style={{
        position: 'absolute',
        top: 112,
        left: (width - column) / 2,
        width: column,
        textAlign: 'center',
        ...motion,
      }}
    >
      {lines.map((line) => (
        <div
          key={line}
          style={{
            fontFamily: DISPLAY,
            fontWeight: 600,
            fontSize: size,
            lineHeight: 0.96,
            letterSpacing: '-0.03em',
            color: TEXT,
            whiteSpace: 'nowrap',
          }}
        >
          {line}
        </div>
      ))}
    </div>
  );
}

function Playhead({ unit }: { unit: number }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: PAD + TRACK_W * unit,
        top: PAD,
        width: 2,
        height: TRACK_H,
        background: ACCENT,
        translate: '-1px 0',
        zIndex: 4,
      }}
    />
  );
}

function Timeline({ frame }: { frame: number }) {
  const { fps } = useVideoConfig();
  const silence = spring({
    frame: frame - SILENCE_SNAP,
    fps,
    config: { damping: 18, stiffness: 180 },
    durationInFrames: 24,
  });
  const um = spring({
    frame: frame - UM_SNAP,
    fps,
    config: { damping: 18, stiffness: 180 },
    durationInFrames: 24,
  });
  const silenceHot = enter(frame, SILENCE_SNAP - 14, 14);
  const umHot = enter(frame, UM_SNAP - 14, 14);
  const unit = playheadUnit(frame);
  const placed = placeClips(silence, um);

  const label = frame >= 252 && frame < 308 ? SILENCE_LABEL : frame >= 322 && frame < 360 ? UM_LABEL : null;
  const labelIn = label === SILENCE_LABEL ? enter(frame, 252, 14) : label === UM_LABEL ? enter(frame, 322, 14) : 0;
  const labelOut = label === SILENCE_LABEL ? exit(frame, 300, 8) : 1;
  const labelP = Math.min(labelIn, labelOut);

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', left: PAD, top: PAD + 80, width: TRACK_W, height: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        {WAVE_LEVELS.map((height, index) => {
          const barX = (index + 0.5) / WAVE_LEVELS.length;
          const printed = enter(frame, 75 + Math.max(0, barX - 0.5) * 140, 14);
          return (
            <div
              key={index}
              style={{
                width: 8,
                height: 40 * (height / 100) * printed,
                background: WAVE,
                borderRadius: 2,
                flex: '0 0 8px',
              }}
            />
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: PAD, top: PAD + TRACK_H - 1, width: TRACK_W, height: 1, background: LINE }} />
      {placed.map((clip, index) => {
        if (clip.width < 1) return null;
        const hot = clip.kind === 'silence' ? silenceHot : clip.kind === 'um' ? umHot : 0;
        const printed = enter(frame, 78 + index * 8, 16);
        return (
          <div
            key={clip.key}
            style={{
              position: 'absolute',
              left: PAD + clip.left,
              top: PAD + 8,
              width: clip.width,
              height: 72,
              borderRadius: 8,
              background: hot > 0 ? accentMix(hot) : CLIP,
              border: hot > 0.85 ? 'none' : `1px solid ${LINE}`,
              boxShadow: hot > 0.85 ? 'none' : '0 8px 20px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              paddingLeft: 16,
              opacity: printed,
              translate: `0 ${(1 - printed) * 12}px`,
            }}
          >
            {clip.label ? (
              <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 28, letterSpacing: '-0.03em', color: TEXT, whiteSpace: 'nowrap' }}>
                {clip.label}
              </span>
            ) : null}
          </div>
        );
      })}
      <Playhead unit={unit} />
      {label ? (
        <div
          style={{
            position: 'absolute',
            left: PAD,
            top: PAD + TRACK_H + 16,
            ...rise(labelP, 12),
            fontFamily: MONO,
            fontSize: 28,
            fontWeight: 500,
            color: TEXT,
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}

function LogRows({ frame }: { frame: number }) {
  const start = SCENES.log.from + 18;
  return (
    <div style={{ position: 'absolute', left: PAD, right: PAD, top: 24 }}>
      {LOG_ROWS.map((row, index) => {
        const p = enter(frame, start + index * 14, 16);
        const motion = rise(p, 16);
        const fill = enter(frame, start + index * 14 + 6, 16);
        return (
          <div key={row.t + row.detail} style={{ display: 'flex', alignItems: 'center', height: 56, gap: 16, ...motion }}>
            <span style={{ width: 148, fontFamily: MONO, fontWeight: 500, fontSize: 28, color: MUTED, fontVariantNumeric: 'tabular-nums' }}>{row.t}</span>
            <span style={{ width: 88, fontFamily: MONO, fontWeight: 500, fontSize: 28, color: TEXT }}>{row.action}</span>
            <span style={{ width: 220, fontFamily: MONO, fontWeight: 500, fontSize: 28, color: TEXT }}>{row.detail}</span>
            <span style={{ width: 72, fontFamily: MONO, fontWeight: 500, fontSize: 28, color: TEXT, fontVariantNumeric: 'tabular-nums' }}>{row.conf.toFixed(2)}</span>
            <span style={{ width: 96, height: 8, borderRadius: 4, background: LINE, overflow: 'hidden' }}>
              <span style={{ display: 'block', width: 96 * row.conf * fill, height: 8, background: ACCENT }} />
            </span>
          </div>
        );
      })}
      <div style={{ marginTop: 12, ...rise(enter(frame, start + 52, 16), 12), fontFamily: MONO, fontWeight: 500, fontSize: 28, color: MUTED, fontVariantNumeric: 'tabular-nums', whiteSpace: 'pre' }}>
        {LATENCY}
      </div>
    </div>
  );
}

function Steer({ frame }: { frame: number }) {
  const text = 'keep the jokes';
  const typed = Math.max(0, Math.min(text.length, Math.floor((frame - 504) / 2)));
  const shown = text.slice(0, Math.max(0, typed));
  const caretOn = frame < 532 || Math.floor(frame / 8) % 2 === 0;
  const flip = enter(frame, KEEP_FLIP, 16);
  const rows = [
    { t: '10.90s', action: 'CUT', conf: 0.84, live: false },
    { t: '26.90s', action: flip > 0.45 ? 'KEEP' : 'CUT', conf: flip > 0.45 ? 0.93 : 0.84, live: true },
  ];
  return (
    <div style={{ position: 'absolute', left: PAD, right: PAD, top: 28 }}>
      <div style={{ height: 80, borderRadius: 12, border: `1px solid ${LINE}`, background: HOLD, display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 32, letterSpacing: '-0.03em', color: TEXT }}>
          {shown}
        </span>
        <span style={{ width: 2, height: 32, marginLeft: 4, background: ACCENT, opacity: caretOn ? 1 : 0 }} />
      </div>
      <div style={{ marginTop: 28 }}>
        {rows.map((row) => {
          const dim = !row.live || flip < 0.45;
          return (
            <div key={row.t} style={{ display: 'flex', alignItems: 'center', height: 56, gap: 16 }}>
              <span style={{ width: 148, fontFamily: MONO, fontWeight: 500, fontSize: 28, color: MUTED, fontVariantNumeric: 'tabular-nums' }}>{row.t}</span>
              <span style={{ width: 220, fontFamily: MONO, fontWeight: 500, fontSize: 28, color: dim ? MUTED : TEXT }}>joke</span>
              <span style={{ width: 96, fontFamily: MONO, fontWeight: 500, fontSize: 28, color: dim ? MUTED : ACCENT }}>{row.action}</span>
              <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: 28, color: dim ? MUTED : TEXT, fontVariantNumeric: 'tabular-nums' }}>{row.conf.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stream({ frame }: { frame: number }) {
  const local = frame - SCENES.stream.from;
  const started = Math.max(0, local - 8);
  const slot = 48;
  const visible = 5;
  const maxScroll = Math.max(0, (INTERVIEW_DECISIONS.length - visible) * slot);
  const scroll = Math.min(maxScroll, started * (slot / 3));
  const moving = scroll < maxScroll - 1;
  const blur = moving ? 3 : (1 - enter(started, (INTERVIEW_DECISIONS.length - visible) * 3, 8)) * 3;
  return (
    <div style={{ position: 'absolute', left: PAD, right: PAD, top: 8 }}>
      <div style={{ display: 'flex', gap: 8, height: 48, alignItems: 'center' }}>
        {[168, 104, 136].map((width) => (
          <div key={width} style={{ width, height: 40, borderRadius: 8, background: CLIP, border: `1px solid ${LINE}` }} />
        ))}
      </div>
      <div style={{ marginTop: 12, height: slot * visible, overflow: 'hidden', position: 'relative' }}>
        {INTERVIEW_DECISIONS.map((row, index) => {
          const y = index * slot - scroll;
          if (y < -slot || y > slot * visible) return null;
          return (
            <div
              key={row.t}
              style={{
                position: 'absolute',
                left: 0,
                top: y,
                height: slot,
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                fontFamily: MONO,
                fontWeight: 500,
                fontSize: 28,
                color: TEXT,
                fontVariantNumeric: 'tabular-nums',
                filter: blur > 0.4 ? `blur(${blur}px)` : undefined,
              }}
            >
              <span style={{ width: 140, color: MUTED }}>{row.t}</span>
              <span style={{ width: 88 }}>{row.action}</span>
              <span>{row.conf.toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CutPilotWindow({ frame, width }: { frame: number; width: number }) {
  const left = windowLeft(width);
  const chrome = chromeAt(frame);
  const panel = panelAt(frame);
  const streaming = frame >= SCENES.stream.from && frame < SCENES.hold.from;
  const insetTop = (1 - chrome) * (TITLE_H + PAD);
  const insetX = (1 - chrome) * PAD;
  const insetBottom = (1 - chrome) * (WINDOW_H - TITLE_H - PAD - TRACK_H);
  const radius = 8 + chrome * 8;
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: WINDOW_TOP,
        width: WINDOW_W,
        height: WINDOW_H,
        borderRadius: radius,
        border: `1px solid rgba(0,0,0,${0.08 * chrome})`,
        background: chrome > 0.02 ? SURFACE : 'transparent',
        boxShadow: chrome >= 1 ? '0 28px 80px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04)' : 'none',
        overflow: 'hidden',
        clipPath: chrome >= 1 ? undefined : `inset(${insetTop}px ${insetX}px ${insetBottom}px ${insetX}px round ${radius}px)`,
      }}
    >
      <div style={{ height: TITLE_H, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', opacity: chrome }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 8, height: 8, background: ACCENT }} />
          <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 28, letterSpacing: '-0.03em', color: TEXT }}>CutPilot</span>
        </div>
        <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: 28, color: MUTED }}>live</span>
      </div>
      <div style={{ height: WINDOW_H - TITLE_H, overflow: 'hidden', position: 'relative' }}>
        {streaming ? <Stream frame={frame} /> : (
          <div style={{ display: 'flex', width: (WINDOW_W) * 3, height: '100%', translate: `${-panel * WINDOW_W}px 0` }}>
            <div style={{ width: WINDOW_W, height: '100%', position: 'relative' }}><Timeline frame={frame} /></div>
            <div style={{ width: WINDOW_W, height: '100%', position: 'relative' }}><LogRows frame={frame} /></div>
            <div style={{ width: WINDOW_W, height: '100%', position: 'relative' }}><Steer frame={frame} /></div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Counter({ frame }: { frame: number }) {
  const { width } = useVideoConfig();
  const local = frame - SCENES.stream.from;
  const shown = enter(local, 4, 16);
  const count = Math.round(Math.min(10, Math.max(0, ((local - 18) / 30) * 10)));
  const landed = local >= 48;
  const label = landed ? '~10' : String(Math.max(0, count));
  const column = Math.min(880, width - 200);
  return (
    <div style={{ position: 'absolute', top: 104, left: (width - column) / 2, width: column, textAlign: 'center', ...rise(shown, 18) }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 140, lineHeight: 0.9, letterSpacing: '-0.04em', color: TEXT, fontVariantNumeric: 'tabular-nums' }}>
        {label}
      </div>
      <div style={{ marginTop: 8, fontFamily: DISPLAY, fontWeight: 600, fontSize: 44, letterSpacing: '-0.03em', color: MUTED }}>
        decisions / second
      </div>
    </div>
  );
}
