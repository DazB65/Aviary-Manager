import { AbsoluteFill, Audio, Img, interpolate, useCurrentFrame, useVideoConfig, staticFile } from 'remotion';

const PAGES = [
  { type: 'intro' },
  { type: 'page', file: 'landing.png', label: 'Landing' },
  { type: 'page', file: 'login.png', label: 'Sign In' },
  { type: 'page', file: 'dashboard.png', label: 'Dashboard' },
  { type: 'page', file: 'birds.png', label: 'My Birds' },
  { type: 'page', file: 'pairs.png', label: 'Breeding Pairs' },
  { type: 'page', file: 'broods.png', label: 'Broods & Eggs' },
  { type: 'page', file: 'events.png', label: 'Events & Reminders' },
  { type: 'page', file: 'cages.png', label: 'Cages' },
  { type: 'page', file: 'statistics.png', label: 'Statistics' },
  { type: 'page', file: 'marketing.png', label: 'Content Ideas' },
  { type: 'page', file: 'settings.png', label: 'Settings' },
  { type: 'page', file: 'billing.png', label: 'Billing & Plan' },
  { type: 'page', file: 'help.png', label: 'Help Centre' },
  { type: 'outro' },
];

const HOLD_FRAMES = 90;
const TRANSITION_FRAMES = 15;
const FRAMES_PER_PAGE = HOLD_FRAMES + TRANSITION_FRAMES;

// Sidebar label position (1920x1080 video, sidebar ~210px wide)
// Placed just below "Admin: Users" nav item
const LABEL_LEFT = 8;
const LABEL_TOP = 648;
const LABEL_WIDTH = 194;

const IntroSlide = ({ opacity }) => (
  <AbsoluteFill
    style={{
      opacity,
      background: 'linear-gradient(160deg, #fdf9f5 0%, #f5ede3 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
    }}
  >
    <Img src={staticFile('logo.svg')} style={{ width: 200, height: 200, objectFit: 'contain' }} />
    <div
      style={{
        fontFamily: 'Georgia, serif',
        fontSize: 64,
        fontWeight: 700,
        color: '#1a1a1a',
        letterSpacing: '-0.02em',
      }}
    >
      Aviary Manager
    </div>
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 28,
        color: '#666',
        fontWeight: 400,
      }}
    >
      Your complete aviary management tool
    </div>
    <div
      style={{
        marginTop: 16,
        background: '#E8652A',
        color: 'white',
        padding: '12px 36px',
        borderRadius: 40,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 24,
        fontWeight: 600,
      }}
    >
      aviarymanager.app
    </div>
  </AbsoluteFill>
);

const OutroSlide = ({ opacity }) => (
  <AbsoluteFill
    style={{
      opacity,
      background: 'linear-gradient(160deg, #E8652A 0%, #d45a22 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 32,
    }}
  >
    <Img src={staticFile('logo.svg')} style={{ width: 200, height: 200, objectFit: 'contain' }} />
    <div
      style={{
        fontFamily: 'Georgia, serif',
        fontSize: 72,
        fontWeight: 700,
        color: 'white',
        letterSpacing: '-0.02em',
      }}
    >
      Thank You
    </div>
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 28,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: 400,
      }}
    >
      Start managing your aviary today
    </div>
    <div
      style={{
        marginTop: 16,
        background: 'white',
        color: '#E8652A',
        padding: '12px 36px',
        borderRadius: 40,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 26,
        fontWeight: 700,
      }}
    >
      aviarymanager.app
    </div>
  </AbsoluteFill>
);

export const AviaryVideo = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const pageIndex = Math.floor(frame / FRAMES_PER_PAGE);
  const frameInPage = frame % FRAMES_PER_PAGE;

  const currentPage = PAGES[Math.min(pageIndex, PAGES.length - 1)];
  const nextPage = PAGES[Math.min(pageIndex + 1, PAGES.length - 1)];

  const currentOpacity = interpolate(
    frameInPage,
    [0, 5, HOLD_FRAMES, FRAMES_PER_PAGE],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const nextOpacity = interpolate(
    frameInPage,
    [HOLD_FRAMES, FRAMES_PER_PAGE],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const labelOpacity = interpolate(
    frameInPage,
    [0, 10, HOLD_FRAMES - 10, HOLD_FRAMES],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const musicVolume = interpolate(
    frame,
    [durationInFrames - 30, durationInFrames],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const renderSlide = (page, opacity) => {
    if (page.type === 'intro') return <IntroSlide opacity={opacity} />;
    if (page.type === 'outro') return <OutroSlide opacity={opacity} />;
    return (
      <AbsoluteFill style={{ opacity }}>
        <Img
          src={staticFile(page.file)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
        />
      </AbsoluteFill>
    );
  };

  return (
    <AbsoluteFill style={{ background: '#f0f4f0' }}>
      <Audio src={staticFile('music.mp3')} volume={musicVolume} />

      {/* Next page underneath */}
      {nextPage && pageIndex < PAGES.length - 1 && renderSlide(nextPage, nextOpacity)}

      {/* Current page on top */}
      {renderSlide(currentPage, currentOpacity)}

      {/* Blur bottom-left corner to hide user details (only on page slides) */}
      {currentPage.type === 'page' && (
        <AbsoluteFill style={{ pointerEvents: 'none' }}>
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: 210,
              height: 80,
              backdropFilter: 'blur(18px)',
              WebkitBackdropFilter: 'blur(18px)',
              background: 'rgba(255,255,255,0.15)',
            }}
          />
        </AbsoluteFill>
      )}

      {/* Sidebar page label — shown only on page slides */}
      {currentPage.type === 'page' && (
        <div
          style={{
            position: 'absolute',
            top: LABEL_TOP,
            left: LABEL_LEFT,
            width: LABEL_WIDTH,
            opacity: labelOpacity,
            pointerEvents: 'none',
            background: '#E8652A',
            color: 'white',
            padding: '8px 16px',
            borderRadius: 10,
            fontSize: 17,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontWeight: 600,
            letterSpacing: '0.01em',
            textAlign: 'center',
          }}
        >
          {currentPage.label}
        </div>
      )}
    </AbsoluteFill>
  );
};
