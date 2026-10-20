import { Composition } from 'remotion';
import { IntroducingCutPilot } from './Introducing';

export const PROMO_FPS = 30;
export const PROMO_FRAMES = 36 * PROMO_FPS;

export function Root() {
  return (
    <Composition
      id="IntroducingCutPilot"
      component={IntroducingCutPilot}
      durationInFrames={PROMO_FRAMES}
      fps={PROMO_FPS}
      width={1920}
      height={1080}
    />
  );
}
