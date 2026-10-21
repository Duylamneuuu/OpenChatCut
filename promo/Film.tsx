import type { ReactNode } from 'react';
import { AbsoluteFill, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { Audio } from '@remotion/media';
import { usePromoFonts } from './load-fonts';
import { SCENES } from './timeline';
import { BG, HOLD } from './theme';
import { EndCard, OpeningLine } from './cards';
import { Camera, Counter, CutPilotWindow, Headline, Stage } from './ui';

export type FilmProps = { music?: boolean };

function World({ frame, children }: { frame: number; children?: ReactNode }) {
  const { width } = useVideoConfig();
  return (
    <Camera frame={frame}>
      <CutPilotWindow frame={frame} width={width} />
      {children}
    </Camera>
  );
}

function PlayheadScene() {
  const frame = useCurrentFrame();
  return (
    <Camera frame={frame}>
      <OpeningLine frame={frame} />
    </Camera>
  );
}

function PrintScene() {
  const frame = useCurrentFrame() + SCENES.print.from;
  const { width } = useVideoConfig();
  return (
    <>
      <Headline frame={frame - SCENES.print.from} duration={SCENES.print.duration} lines={['Editing has always', 'waited for you.']} />
      <Camera frame={frame}>
        <CutPilotWindow frame={frame} width={width} />
      </Camera>
    </>
  );
}

function RevealScene() {
  const local = useCurrentFrame();
  const frame = local + SCENES.reveal.from;
  const { width } = useVideoConfig();
  return (
    <>
      <Headline frame={local} duration={SCENES.reveal.duration} lines={['What if the timeline', 'cut itself?']} />
      <Camera frame={frame}>
        <CutPilotWindow frame={frame} width={width} />
      </Camera>
    </>
  );
}

function SnapScene() {
  const frame = useCurrentFrame() + SCENES.snap.from;
  return <World frame={frame} />;
}

function LogScene() {
  const local = useCurrentFrame();
  const frame = local + SCENES.log.from;
  return (
    <>
      <Headline frame={local} duration={SCENES.log.duration} lines={['Every decision,', 'logged.']} />
      <World frame={frame} />
    </>
  );
}

function SteerScene() {
  const local = useCurrentFrame();
  const frame = local + SCENES.steer.from;
  return (
    <>
      <Headline frame={local} duration={SCENES.steer.duration} lines={['Steer it', 'mid-flight.']} />
      <World frame={frame} />
    </>
  );
}

function StreamScene() {
  const local = useCurrentFrame();
  const frame = local + SCENES.stream.from;
  return (
    <>
      <Counter frame={frame} />
      <World frame={frame} />
    </>
  );
}

function HoldScene() {
  return <AbsoluteFill style={{ background: HOLD }} />;
}

function EndScene() {
  const frame = useCurrentFrame() + SCENES.end.from;
  return <EndCard frame={frame} />;
}

export function Film({ music = false }: FilmProps) {
  usePromoFonts();
  return (
    <AbsoluteFill style={{ background: BG, overflow: 'hidden', fontFamily: 'Geist, sans-serif' }}>
      <Stage />
      <Sequence from={SCENES.playhead.from} durationInFrames={SCENES.playhead.duration} name="Playhead">
        <PlayheadScene />
      </Sequence>
      <Sequence from={SCENES.print.from} durationInFrames={SCENES.print.duration} name="Print">
        <PrintScene />
      </Sequence>
      <Sequence from={SCENES.reveal.from} durationInFrames={SCENES.reveal.duration} name="Reveal">
        <RevealScene />
      </Sequence>
      <Sequence from={SCENES.snap.from} durationInFrames={SCENES.snap.duration} name="Snap">
        <SnapScene />
      </Sequence>
      <Sequence from={SCENES.log.from} durationInFrames={SCENES.log.duration} name="Log">
        <LogScene />
      </Sequence>
      <Sequence from={SCENES.steer.from} durationInFrames={SCENES.steer.duration} name="Steer">
        <SteerScene />
      </Sequence>
      <Sequence from={SCENES.stream.from} durationInFrames={SCENES.stream.duration} name="Stream">
        <StreamScene />
      </Sequence>
      <Sequence from={SCENES.hold.from} durationInFrames={SCENES.hold.duration} name="Hold">
        <HoldScene />
      </Sequence>
      <Sequence from={SCENES.end.from} durationInFrames={SCENES.end.duration} name="End">
        <EndScene />
      </Sequence>
      <Audio src={staticFile('cutpilot/promo-vo.wav')} />
      <Audio src={staticFile(music ? 'cutpilot/promo-bed.wav' : 'cutpilot/promo-ticks.wav')} />
    </AbsoluteFill>
  );
}
