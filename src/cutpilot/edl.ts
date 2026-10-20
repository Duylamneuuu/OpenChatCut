import type { TimelineItem, TimelineState } from '../editor/types.js';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** CMX 3600 non-drop timecode. Frame counts above 99 are clamped into the fps field. */
export function framesToTimecode(frame: number, fps: number): string {
  const rate = Math.max(1, Math.min(99, Math.round(fps)));
  const rounded = Math.max(0, Math.round(frame));
  const frames = rounded % rate;
  const totalSeconds = Math.floor(rounded / rate);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}:${pad(frames)}`;
}

function eventsFor(items: readonly TimelineItem[], fps: number, reel: string): string[] {
  const lines: string[] = [];
  const ordered = [...items].sort((a, b) => a.startFrame - b.startFrame);
  ordered.forEach((item, index) => {
    const srcIn = Math.round(item.srcInFrame ?? 0);
    const srcOut = srcIn + item.durationInFrames;
    const recIn = item.startFrame;
    const recOut = item.startFrame + item.durationInFrames;
    const number = String(index + 1).padStart(3, '0');
    lines.push(`${number}  ${reel.padEnd(8, ' ').slice(0, 8)} V     C        ${framesToTimecode(srcIn, fps)} ${framesToTimecode(srcOut, fps)} ${framesToTimecode(recIn, fps)} ${framesToTimecode(recOut, fps)}`);
    lines.push(`* FROM CLIP NAME: ${item.name.replace(/\s+/g, ' ').slice(0, 80)}`);
  });
  return lines;
}

/** CMX 3600 list of the clips still on the timeline (A-roll, then B-roll). */
export function timelineToEdl(state: TimelineState, title = 'CutPilot Live'): string {
  const fps = state.fps || 30;
  const aRoll = state.items.filter((item) => item.track === 'V1');
  const bRoll = state.items.filter((item) => item.track === 'V2');
  const lines = [
    `TITLE: ${title}`,
    'FCM: NON-DROP FRAME',
    '',
    ...eventsFor(aRoll, fps, 'SAMPLE'),
  ];
  if (bRoll.length) {
    lines.push('');
    lines.push(...eventsFor(bRoll, fps, 'BROLL'));
  }
  lines.push('');
  return lines.join('\n');
}

interface OtioTime {
  OTIO_SCHEMA: 'RationalTime.1';
  rate: number;
  value: number;
}

function rational(frame: number, fps: number): OtioTime {
  return { OTIO_SCHEMA: 'RationalTime.1', rate: fps, value: Math.max(0, Math.round(frame)) };
}

function otioClip(item: TimelineItem, fps: number): Record<string, unknown> {
  return {
    OTIO_SCHEMA: 'Clip.1',
    name: item.name,
    source_range: {
      OTIO_SCHEMA: 'TimeRange.1',
      start_time: rational(item.srcInFrame ?? 0, fps),
      duration: rational(item.durationInFrames, fps),
    },
    metadata: {
      cutpilot_track: item.track,
      cutpilot_record_in: item.startFrame,
    },
  };
}

/** Minimal OpenTimelineIO JSON for the clips still on V1 and V2. */
export function timelineToOtio(state: TimelineState, title = 'CutPilot Live'): string {
  const fps = state.fps || 30;
  const track = (name: string, id: string) => ({
    OTIO_SCHEMA: 'Track.1',
    name,
    kind: 'Video',
    children: state.items
      .filter((item) => item.track === id)
      .sort((a, b) => a.startFrame - b.startFrame)
      .map((item) => otioClip(item, fps)),
  });
  return JSON.stringify({
    OTIO_SCHEMA: 'Timeline.1',
    name: title,
    metadata: { cutpilot: true, fps },
    tracks: {
      OTIO_SCHEMA: 'Stack.1',
      name: title,
      children: [track('A-roll', 'V1'), track('B-roll', 'V2')],
    },
  }, null, 2);
}
