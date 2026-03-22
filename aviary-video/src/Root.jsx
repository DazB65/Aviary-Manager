import { Composition } from 'remotion';
import { AviaryVideo } from './AviaryVideo';

const PAGES = 15; // 13 app pages + intro + outro
const HOLD_FRAMES = 90;
const TRANSITION_FRAMES = 15;
const FRAMES_PER_PAGE = HOLD_FRAMES + TRANSITION_FRAMES;
const TOTAL_FRAMES = PAGES * FRAMES_PER_PAGE;

export const RemotionRoot = () => {
  return (
    <Composition
      id="AviaryVideo"
      component={AviaryVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};
