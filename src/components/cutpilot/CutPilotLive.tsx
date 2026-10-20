import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { theme } from '../../theme.js';
import { docFromTimeline, createProject } from '../../persist/projectStore.js';
import { navigateTo } from '../../app/appShell.js';
import type { PublicCutPilotConfig } from '../../cutpilot/config.js';
import { timelineToEdl, timelineToOtio } from '../../cutpilot/edl.js';
import type { GhostSpan } from '../../cutpilot/executor.js';
import { formatClock, formatMs, formatUsd, liveMetrics } from '../../cutpilot/metrics.js';
import { fetchCutPilotConfig } from '../../cutpilot/providers/remote.js';
import { repeatSegments } from '../../cutpilot/segmenter.js';
import { SAMPLE_DURATION_MS, SAMPLE_MEDIA_SRC, sampleSegments } from '../../cutpilot/sample.js';
import { TALK_DURATION_MS, TALK_MEDIA_SRC, talkSegments } from '../../cutpilot/talk-clip.js';
import { createSession, stepSession, type CutSession } from '../../cutpilot/session.js';
import type { CutAction, LoggedDecision } from '../../cutpilot/types.js';
import { providersFor } from '../../cutpilot/ui-providers.js';
import type { TimelineState } from '../../editor/types.js';

const ACTION_COLOR: Record<CutAction, string> = {
  keep: 'var(--cc-clip-video)',
  cut: 'var(--cc-danger)',
  trim: 'var(--cc-gold)',
  broll: 'var(--cc-clip-mg)',
};

const PRESETS = [
  'keep the jokes',
  'slower pace',
  'tighter, cut fillers',
  'add b-roll on the desk shot',
  'zoom the desk shot',
];

interface Ghost extends GhostSpan {
  id: string;
  until: number;
}

interface SpeechRec {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

function speechRecognition(): (new () => SpeechRec) | null {
  const host = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

function spanFrames(state: TimelineState): number {
  return state.items.reduce((max, item) => Math.max(max, item.startFrame + item.durationInFrames), 1);
}

function download(filename: string, contents: string, type: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

type DemoClipId = 'talk' | 'stand-in';

function clipSource(id: DemoClipId): { segments: ReturnType<typeof sampleSegments>; durationMs: number; src: string } {
  if (id === 'talk') return { segments: talkSegments(), durationMs: TALK_DURATION_MS, src: TALK_MEDIA_SRC };
  return { segments: sampleSegments(), durationMs: SAMPLE_DURATION_MS, src: SAMPLE_MEDIA_SRC };
}

function freshSession(sprint: boolean, directive: string, clip: DemoClipId): CutSession {
  const source = clipSource(clip);
  const segments = sprint ? repeatSegments(source.segments, 600) : source.segments;
  return createSession(segments, {
    mediaDurationMs: source.durationMs,
    src: source.src,
    directive,
  });
}

export function CutPilotLive({ onHome }: { onHome: () => void }) {
  const [clipId, setClipId] = useState<DemoClipId>('talk');
  const clipRef = useRef(clipId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [sprint, setSprint] = useState(false);
  const sprintRef = useRef(false);
  const [session, setSession] = useState<CutSession>(() => freshSession(false, '', 'talk'));
  const sessionRef = useRef(session);
  const [running, setRunning] = useState(false);
  const [directive, setDirective] = useState('');
  const directiveRef = useRef(directive);
  const [providerId, setProviderId] = useState<'rule' | 'local' | 'hosted'>('rule');
  const providerRef = useRef(providerId);
  const [config, setConfig] = useState<PublicCutPilotConfig | null>(null);
  const configRef = useRef(config);
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [scale, setScale] = useState(() => spanFrames(session.timeline));
  const [clock, setClock] = useState(0);
  const wallStart = useRef<number | null>(null);
  const speechRef = useRef<SpeechRec | null>(null);

  sessionRef.current = session;
  clipRef.current = clipId;
  directiveRef.current = directive;
  providerRef.current = providerId;
  configRef.current = config;
  sprintRef.current = sprint;

  useEffect(() => {
    void fetchCutPilotConfig().then((next) => {
      setConfig(next);
      if (next && next.provider !== 'rule' && next.providers[next.provider].available) {
        setProviderId(next.provider);
      }
    });
  }, []);

  useEffect(() => {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [session.decisions.length]);

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setInterval(() => setClock(performance.now()), 200);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => {
    if (!ghosts.length) return undefined;
    const timer = window.setTimeout(() => {
      setGhosts((rows) => rows.filter((row) => row.until > Date.now()));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [ghosts]);

  useEffect(() => {
    let frame = 0;
    const paint = () => {
      const marker = playheadRef.current;
      const current = sessionRef.current;
      const end = current.segments[current.segments.length - 1]?.endMs ?? 0;
      if (marker && end > 0 && sprintRef.current) {
        const index = Math.min(current.cursor, current.segments.length - 1);
        marker.style.left = `${((current.segments[index]?.startMs ?? 0) / end) * 100}%`;
      } else {
        const video = videoRef.current;
        if (video && marker && video.duration) {
          marker.style.left = `${(video.currentTime / video.duration) * 100}%`;
        }
      }
      frame = window.requestAnimationFrame(paint);
    };
    frame = window.requestAnimationFrame(paint);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!running) return undefined;
    let cancelled = false;
    let timer = 0;
    const tick = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      const current = { ...sessionRef.current, directive: directiveRef.current };
      const upcoming = current.segments[current.cursor];
      if (!upcoming) {
        setRunning(false);
        return;
      }
      if (!sprint) {
        const playedMs = (video?.currentTime ?? 0) * 1000;
        if (video && video.paused && !video.ended) {
          timer = window.setTimeout(() => void tick(), 80);
          return;
        }
        if (playedMs + 180 < upcoming.startMs) {
          timer = window.setTimeout(() => void tick(), 40);
          return;
        }
      }
      const selected = providersFor(providerRef.current, configRef.current);
      if (selected.error && providerRef.current !== 'rule') {
        setBanner(selected.error);
        setProviderId('rule');
      }
      const stepped = await stepSession(
        current,
        selected.primary,
        selected.escalation,
        configRef.current?.threshold ?? 0.6,
      );
      if (cancelled) return;
      sessionRef.current = stepped.session;
      setSession(stepped.session);
      if (stepped.error) setBanner(stepped.error);
      if (stepped.ghost && stepped.step) {
        const ghost = stepped.ghost;
        const id = stepped.step.segmentId;
        setGhosts((rows) => [...rows.slice(-12), { ...ghost, id, until: Date.now() + 420 }]);
      }
      if (!stepped.step) {
        setRunning(false);
        return;
      }
      timer = window.setTimeout(() => void tick(), sprint ? 100 : 16);
    };
    void tick();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [running, sprint]);

  const begin = async (reset: boolean) => {
    const selected = providersFor(providerId, config);
    if (selected.error && providerId !== 'rule') {
      setBanner(selected.error);
      return;
    }
    let next = sessionRef.current;
    if (reset || next.cursor >= next.segments.length) {
      next = freshSession(sprint, directive, clipRef.current);
      sessionRef.current = next;
      setSession(next);
      setGhosts([]);
      setScale(spanFrames(next.timeline));
      wallStart.current = performance.now();
      setClock(performance.now());
    } else if (wallStart.current === null) {
      wallStart.current = performance.now();
    }
    setBanner(null);
    setRunning(true);
    const video = videoRef.current;
    if (!video) return;
    video.loop = sprint;
    video.muted = true;
    if (reset || video.ended) video.currentTime = 0;
    try {
      await video.play();
    } catch {
      setBanner('The browser blocked autoplay. Press play on the preview.');
    }
  };

  const pause = () => {
    setRunning(false);
    videoRef.current?.pause();
  };

  const reset = () => {
    pause();
    speechRef.current?.stop();
    setListening(false);
    const next = freshSession(sprint, directive, clipRef.current);
    sessionRef.current = next;
    setSession(next);
    setGhosts([]);
    setScale(spanFrames(next.timeline));
    wallStart.current = null;
    setBanner(null);
    if (videoRef.current) videoRef.current.currentTime = 0;
  };

  const toggleMic = () => {
    if (listening) {
      speechRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = speechRecognition();
    if (!Ctor) {
      setBanner('This browser has no speech recognition. Type the instruction instead.');
      return;
    }
    const rec = new Ctor();
    rec.lang = navigator.language || 'en-US';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onresult = (event) => {
      const text = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim();
      setDirective(text);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    speechRef.current = rec;
    rec.start();
    setListening(true);
  };

  const openInEditor = async () => {
    try {
      const doc = docFromTimeline(sessionRef.current.timeline, 'CutPilot Live');
      const meta = await createProject('CutPilot Live', doc);
      navigateTo(`#/editor/${meta.id}`);
    } catch (error) {
      setBanner(error instanceof Error ? error.message : 'Could not open the timeline in the editor.');
    }
  };

  const elapsed = wallStart.current === null ? 0 : Math.max(1, (clock || performance.now()) - wallStart.current);
  const metrics = liveMetrics(session.decisions, elapsed);
  const finished = session.segments.length > 0 && session.cursor >= session.segments.length;
  const dense = session.segments.length > 80;
  const clockEnd = session.segments.length
    ? session.segments[session.segments.length - 1]!.endMs
    : clipSource(clipId).durationMs;
  const hint = !directive && (videoRef.current?.currentTime ?? 0) >= 18
    ? (clipId === 'stand-in'
      ? 'Try a mid-run note: keep the jokes, slower pace'
      : 'Try a mid-run note: slower pace, or tighter, cut fillers')
    : null;
  const preview = clipSource(clipId);

  return (
    <div style={{ height: '100vh', display: 'grid', gridTemplateRows: '48px minmax(0, 1fr) auto', background: theme.bg, color: theme.text, fontFamily: 'Geist, system-ui, sans-serif' }}>
      <style>{`
        @keyframes cutpilot-flash { from { opacity: 1; } to { opacity: 0; } }
        .cutpilot-body { min-height: 0; display: grid; grid-template-columns: minmax(280px, 1.05fr) minmax(340px, 1.25fr) minmax(300px, 0.95fr); }
        @media (max-width: 980px) { .cutpilot-body { grid-template-columns: 1fr; overflow: auto; } }
      `}</style>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', borderBottom: `0.5px solid ${theme.border}`, background: theme.panel }}>
        <button type="button" onClick={onHome} style={quietButton}>Projects</button>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <strong style={{ fontSize: 13, letterSpacing: 0.2 }}>CutPilot Live</strong>
          <span style={{ fontSize: 11, color: theme.textDim }}>600 decisions in 60 seconds</span>
        </div>
        <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme.textDim }}>
          Clip
          <select
            aria-label="Demo clip"
            value={clipId}
            disabled={running}
            onChange={(event) => {
              const nextId = event.target.value as DemoClipId;
              setClipId(nextId);
              const next = freshSession(sprint, directive, nextId);
              sessionRef.current = next;
              setSession(next);
              setGhosts([]);
              setScale(spanFrames(next.timeline));
              wallStart.current = null;
              setBanner(null);
              if (videoRef.current) videoRef.current.currentTime = 0;
            }}
            style={selectStyle}
          >
            <option value="talk">Anne Gaylor interview</option>
            <option value="stand-in">Captioned stand-in</option>
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme.textDim }}>
          Provider
          <select
            aria-label="Decision provider"
            value={providerId}
            disabled={running}
            onChange={(event) => setProviderId(event.target.value as 'rule' | 'local' | 'hosted')}
            style={selectStyle}
          >
            <option value="rule">Rule only</option>
            <option value="local" disabled={!config?.providers.local.available}>Local model</option>
            <option value="hosted" disabled={!config?.providers.hosted.available}>Hosted model</option>
          </select>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: theme.textDim }}>
          <input type="checkbox" checked={sprint} disabled={running || session.cursor > 0} onChange={(event) => setSprint(event.target.checked)} />
          Sprint 600
        </label>
      </header>

      <div className="cutpilot-body">
        <section style={column}>
          <video
            key={preview.src}
            ref={videoRef}
            src={preview.src}
            playsInline
            muted
            controls
            onPlay={() => {
              setBanner((current) => (current?.includes('autoplay') ? null : current));
              if (!running && sessionRef.current.cursor < sessionRef.current.segments.length) {
                if (wallStart.current === null) wallStart.current = performance.now();
                setRunning(true);
              }
            }}
            style={{ width: '100%', background: '#000', borderRadius: 8, aspectRatio: '16 / 9' }}
          />
          {clipId === 'talk' && (
            <p style={{ margin: 0, fontSize: 11, color: theme.textDim, lineHeight: 1.4 }}>
              Anne Gaylor, “A Second Look At Religion.” AndrewFFRF, CC BY-SA 3.0, Wikimedia Commons. First 51.3 seconds.
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }} aria-live="polite">
            <Stat label="Decisions / sec" value={session.decisions.length ? metrics.perSecond.toFixed(1) : '0.0'} />
            <Stat label="Decisions" value={String(metrics.count)} />
            <Stat label="Latency p50" value={formatMs(metrics.latency.p50)} />
            <Stat label="Latency p95" value={formatMs(metrics.latency.p95)} />
            <Stat label="Cost" value={metrics.unpriced ? `${formatUsd(metrics.costUsd)} + ${metrics.unpriced} unpriced` : formatUsd(metrics.costUsd)} />
            <Stat label="Escalated" value={String(session.decisions.filter((row) => row.escalated).length)} />
          </div>
          {banner && <p style={{ margin: 0, color: theme.danger, fontSize: 12, lineHeight: 1.45 }}>{banner}</p>}
          {hint && <p style={{ margin: 0, color: theme.gold, fontSize: 12 }}>{hint}</p>}
        </section>

        <section style={column}>
          <LaneLabel title="Program timeline" detail="A-roll and B-roll after each decision. Cuts flash, then ripple closed." />
          <ProgramLane state={session.timeline} track="V1" scale={scale} ghosts={ghosts} />
          <ProgramLane state={session.timeline} track="V2" scale={scale} ghosts={[]} />
          <LaneLabel title={dense ? 'Decision ticks' : 'Source slices'} detail={dense ? 'One tick per decision in this sprint.' : 'The sample, in source time. The playhead is the preview.'} />
          <div style={{ position: 'relative', height: dense ? 28 : 64, background: theme.tlTrack, borderRadius: 6, overflow: 'hidden' }}>
            {dense
              ? session.segments.map((segment) => {
                const decision = session.decisions.find((row) => row.segmentId === segment.id);
                return <span key={segment.id} title={decision ? `${decision.action} ${segment.text}` : segment.text} style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: `${(segment.startMs / clockEnd) * 100}%`,
                  width: `${Math.max(0.15, ((segment.endMs - segment.startMs) / clockEnd) * 100)}%`,
                  background: decision ? ACTION_COLOR[decision.action] : theme.border,
                }} />;
              })
              : session.segments.map((segment) => {
                const decision = session.decisions.find((row) => row.segmentId === segment.id);
                return (
                  <div key={segment.id} title={segment.text} style={{
                    position: 'absolute', top: 8, bottom: 8,
                    left: `${(segment.startMs / clockEnd) * 100}%`,
                    width: `${Math.max(0.4, ((segment.endMs - segment.startMs) / clockEnd) * 100)}%`,
                    background: decision ? ACTION_COLOR[decision.action] : theme.panelAlt,
                    borderRadius: 3,
                    overflow: 'hidden',
                    fontSize: 10,
                    lineHeight: '48px',
                    padding: '0 4px',
                    color: theme.text,
                    whiteSpace: 'nowrap',
                    boxSizing: 'border-box',
                  }}>{segment.text === '(silence)' ? '' : segment.text}</div>
                );
              })}
            <div ref={playheadRef} style={{ position: 'absolute', top: 0, bottom: 0, width: 2, background: theme.accent, left: 0 }} />
          </div>
        </section>

        <section style={{ ...column, minHeight: 0 }}>
          <LaneLabel title="Decision stream" detail="Segment, action, confidence, latency." />
          <div ref={logRef} style={{ flex: 1, minHeight: 0, overflow: 'auto', background: theme.panel, border: `0.5px solid ${theme.border}`, borderRadius: 8, padding: 8, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', fontSize: 11.5, lineHeight: 1.45 }}>
            {session.decisions.length === 0 && <div style={{ color: theme.textDim }}>Waiting for the first slice.</div>}
            {session.decisions.map((decision) => <DecisionRow key={decision.segmentId} decision={decision} />)}
          </div>
        </section>
      </div>

      <footer style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: 12, borderTop: `0.5px solid ${theme.border}`, background: theme.panel }}>
        <input
          aria-label="Mid-run instruction"
          value={directive}
          placeholder="keep the jokes, slower pace"
          onChange={(event) => setDirective(event.target.value)}
          style={{ flex: '1 1 220px', minWidth: 180, height: 32, borderRadius: 6, border: `0.5px solid ${theme.border}`, background: theme.inset, color: theme.text, padding: '0 10px', font: 'inherit', fontSize: 13 }}
        />
        <button type="button" onClick={toggleMic} style={quietButton}>{listening ? 'Stop mic' : 'Speak'}</button>
        {PRESETS.map((preset) => (
          <button key={preset} type="button" onClick={() => setDirective(preset)} style={chip}>{preset}</button>
        ))}
        <span style={{ flex: '1 1 auto' }} />
        {running
          ? <button type="button" onClick={pause} style={accentButton}>Pause</button>
          : <button type="button" onClick={() => void begin(finished || session.cursor === 0)} style={accentButton}>{finished ? 'Run again' : session.cursor ? 'Resume' : 'Run'}</button>}
        <button type="button" onClick={reset} style={quietButton}>Reset</button>
        <button type="button" onClick={() => download('cutpilot.edl', timelineToEdl(session.timeline), 'text/plain')} style={quietButton}>EDL</button>
        <button type="button" onClick={() => download('cutpilot.otio', timelineToOtio(session.timeline), 'application/json')} style={quietButton}>OTIO</button>
        <button type="button" onClick={() => void openInEditor()} style={quietButton}>Open in editor</button>
      </footer>
    </div>
  );
}

function DecisionRow({ decision }: { decision: LoggedDecision }) {
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

function ProgramLane({ state, track, scale, ghosts }: { state: TimelineState; track: string; scale: number; ghosts: Ghost[] }) {
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

function LaneLabel({ title, detail }: { title: string; detail: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
      <strong style={{ fontSize: 12 }}>{title}</strong>
      <span style={{ fontSize: 11, color: theme.textDim }}>{detail}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: theme.panel, border: `0.5px solid ${theme.border}`, borderRadius: 8, padding: '8px 10px' }}>
      <div style={{ fontSize: 11, color: theme.textDim }}>{label}</div>
      <div style={{ fontSize: 18, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>{value}</div>
    </div>
  );
}

const quietButton: CSSProperties = {
  height: 28,
  borderRadius: 6,
  border: '0.5px solid var(--cc-border)',
  background: 'transparent',
  color: 'var(--cc-text)',
  padding: '0 10px',
  cursor: 'pointer',
  fontSize: 12,
};

const accentButton: CSSProperties = {
  ...quietButton,
  background: 'var(--cc-accent)',
  color: 'var(--cc-on-accent)',
  border: 'none',
  fontWeight: 650,
};

const chip: CSSProperties = {
  ...quietButton,
  color: 'var(--cc-text-dim)',
};

const selectStyle: CSSProperties = {
  height: 28,
  borderRadius: 6,
  border: '0.5px solid var(--cc-border)',
  background: 'var(--cc-inset)',
  color: 'var(--cc-text)',
  fontSize: 12,
};

const column: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 12,
  overflow: 'auto',
};
