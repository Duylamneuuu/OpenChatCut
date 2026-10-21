import { AbsoluteFill, useVideoConfig } from 'remotion';
import {
  ACCENT,
  CLIP,
  DISPLAY,
  MONO,
  MUTED,
  TEXT,
  TRACK_CENTER_Y,
  TRACK_H,
  enter,
  rise,
} from './theme';
import { SCENES } from './timeline';

const END_CLIPS = [72, 128, 56, 160, 80, 104];

export function EndCard({ frame }: { frame: number }) {
  const { width } = useVideoConfig();
  const local = frame - SCENES.end.from;
  const collapse = enter(local, 4, 20);
  const word = enter(local, 36, 16);
  const tag = enter(local, 52, 16);
  const push = 1 + (local / 120) * 0.02;
  const column = Math.min(880, width - 200);
  const barW = 160 + word * 360;
  return (
    <AbsoluteFill style={{ scale: push }}>
      <div style={{ position: 'absolute', top: 468, left: 0, right: 0, height: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, opacity: 1 - collapse }}>
          {END_CLIPS.map((clipWidth, index) => {
            const toward = (index - 2.5) * 40 * collapse;
            return (
              <div
                key={clipWidth}
                style={{
                  width: clipWidth * (1 - collapse * 0.85),
                  height: 40,
                  borderRadius: 8,
                  background: index === 3 ? ACCENT : CLIP,
                  translate: `${toward}px 0`,
                }}
              />
            );
          })}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          top: 560 + (1 - word) * 40,
          left: (width - barW) / 2,
          width: barW,
          height: 4,
          borderRadius: 2,
          background: ACCENT,
          opacity: collapse,
        }}
      />
      <div style={{ position: 'absolute', top: 392, left: (width - column) / 2, width: column, textAlign: 'center', ...rise(word, 16) }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 104, letterSpacing: '-0.04em', color: TEXT, lineHeight: 1 }}>
          CutPilot Live
        </div>
      </div>
      <div style={{ position: 'absolute', top: 600, left: (width - column) / 2, width: column, textAlign: 'center', ...rise(tag, 14) }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 40, letterSpacing: '-0.03em', color: MUTED, lineHeight: 1.15 }}>
          Continuous decision AI for video.
        </div>
        <div style={{ marginTop: 8, fontFamily: DISPLAY, fontWeight: 600, fontSize: 40, letterSpacing: '-0.03em', color: MUTED }}>
          Inside OpenChatCut.
        </div>
        <div style={{ marginTop: 28, fontFamily: MONO, fontWeight: 500, fontSize: 28, color: MUTED }}>
          github.com/Duylamneuuu/OpenChatCut
        </div>
      </div>
    </AbsoluteFill>
  );
}

export function OpeningLine({ frame }: { frame: number }) {
  const { width } = useVideoConfig();
  const grow = enter(frame, 8, 18);
  const settle = enter(frame, 56, 18);
  const tall = 520;
  const short = TRACK_H;
  const height = tall * grow + (short - tall) * settle;
  const fullTop = TRACK_CENTER_Y - tall / 2;
  const settledTop = TRACK_CENTER_Y - short / 2;
  const top = fullTop + (settledTop - fullTop) * settle;
  const x = width / 2;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top,
        width: 2,
        height: Math.max(2, height),
        background: ACCENT,
        translate: '-1px 0',
      }}
    />
  );
}
