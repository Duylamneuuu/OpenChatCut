import { Composition } from 'remotion';
import { Film, type FilmProps } from './Film';
import { DURATION, FPS } from './timeline';

export function Root() {
  const defaults: FilmProps = { music: false };
  return (
    <>
      <Composition
        id="IntroducingCutPilot"
        component={Film}
        defaultProps={defaults}
        durationInFrames={DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="IntroducingCutPilotSquare"
        component={Film}
        defaultProps={defaults}
        durationInFrames={DURATION}
        fps={FPS}
        width={1080}
        height={1080}
      />
    </>
  );
}
