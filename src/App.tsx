import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CountdownTimer } from './components/CountdownTimer';
import { useCountdown } from './hooks/useCountdown';
import { BirthdayCake } from './components/Celebration/BirthdayCake';
import { useBlowDetection } from './hooks/useBlowDetection';
import { Envelope } from './components/Letter/Envelope';
import { LetterView } from './components/Letter/LetterView';
import { FairyLights, Butterfly } from './components/VisualAssets';
import { CuteCatFleet } from './components/CuteCatFleet';
import { PetalCanvas } from './components/PetalCanvas';
import { FloatingBalloons } from './components/Balloon';
import { Navbar } from './components/Navbar';
import { AdminPanel } from './components/Admin/AdminPanel';
import { sounds } from './utils/soundEffects';
import { bgMusic } from './utils/backgroundMusic';
import { YouTubeMusicPlayer } from './components/YouTubeMusicPlayer';
import type { AppState, AppConfig } from './types';
import { DEFAULT_CONFIG } from './types';
import confetti from 'canvas-confetti';
import { db, testConnection, handleFirestoreError, OperationType } from './firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';

const checkIsAdminRoute = (): boolean => {
  if (typeof window === 'undefined') return false;
  const { pathname, hash, search } = window.location;
  const normPath = pathname.toLowerCase();
  const normHash = hash.toLowerCase();
  const normSearch = search.toLowerCase();

  const isAdmin = (
    normPath === '/admin' ||
    normPath === '/admin/' ||
    normPath.startsWith('/admin') ||
    normPath.endsWith('/admin') ||
    normHash === '#/admin' ||
    normHash === '#admin' ||
    normHash.startsWith('#/admin') ||
    normSearch.includes('admin')
  );

  // If accessed via /#/admin or ?admin, replace URL in address bar with pure clean /admin path
  if (isAdmin && (hash || search)) {
    try {
      window.history.replaceState({}, '', '/admin');
    } catch {
      // ignore
    }
  }

  return isAdmin;
};

const getInitialConfig = (): AppConfig => {
  try {
    const stored = localStorage.getItem('local_app_config');
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_CONFIG;
};

export default function App() {
  const [isAdminPage, setIsAdminPage] = useState<boolean>(checkIsAdminRoute);
  const [appState, setAppState] = useState<AppState>('COUNTDOWN');
  const [config, setConfig] = useState<AppConfig>(getInitialConfig);
  const [isMusicActive, setIsMusicActive] = useState(false);

  // Real-time Firestore sync across all devices
  useEffect(() => {
    testConnection();

    const unsub = onSnapshot(
      doc(db, 'settings', 'app_config'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as AppConfig;
          setConfig((prev) => ({ ...prev, ...data }));
        } else {
          setDoc(doc(db, 'settings', 'app_config'), DEFAULT_CONFIG).catch((err) => {
            console.warn('Initial cloud config seed warning:', err);
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/app_config');
      }
    );

    return () => unsub();
  }, []);

  // Sync background music engine parameters when config changes
  useEffect(() => {
    if (config.musicEnabled && !config.youtubeUrl) {
      bgMusic.setTrack(config.musicTrack);
      bgMusic.setVolume(config.musicVolume);
      bgMusic.setStartOffset(config.musicStartOffset || 0);
    } else if (!config.musicEnabled) {
      bgMusic.stop();
    } else if (config.youtubeUrl) {
      // YouTube is selected; avoid synth overlap
      bgMusic.stop();
    }
  }, [config.musicEnabled, config.musicTrack, config.musicVolume, config.musicStartOffset, config.youtubeUrl]);

  // Ask for microphone permission immediately after entering the website
  useEffect(() => {
    let requested = false;
    const requestMicPermissionOnEntry = async () => {
      if (requested || !navigator?.mediaDevices?.getUserMedia) return;
      requested = true;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        // Permission successfully granted! Release tracks until cake blow stage
        stream.getTracks().forEach((track) => track.stop());
      } catch (err) {
        console.info('Mic permission request on entry:', err);
      }
    };

    // Ask immediately on entry
    requestMicPermissionOnEntry();

    // Trigger on first screen interaction if browser requires user gesture to show prompt
    const handleEntryInteraction = () => {
      requestMicPermissionOnEntry();
    };
    window.addEventListener('click', handleEntryInteraction, { once: true, passive: true });
    window.addEventListener('touchstart', handleEntryInteraction, { once: true, passive: true });

    return () => {
      window.removeEventListener('click', handleEntryInteraction);
      window.removeEventListener('touchstart', handleEntryInteraction);
    };
  }, []);

  // Set music on by default: play automatically on entry and first interaction
  useEffect(() => {
    const playDefaultMusic = () => {
      if (config.musicEnabled && !config.youtubeUrl) {
        if (!bgMusic.getIsPlaying()) {
          bgMusic.start(config.musicTrack, config.musicVolume, config.musicStartOffset || 0);
        }
        setIsMusicActive(true);
      }
    };

    // Try playing immediately
    playDefaultMusic();

    // Browser audio autoplay policy: ensure music starts on first user touch/click
    const handleGesture = () => {
      playDefaultMusic();
    };

    window.addEventListener('click', handleGesture, { passive: true });
    window.addEventListener('touchstart', handleGesture, { passive: true });

    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, [config.musicEnabled, config.musicTrack, config.musicVolume, config.musicStartOffset, config.youtubeUrl]);

  // URL Navigation helper
  const navigateTo = (path: '/admin' | '/') => {
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({}, '', path);
      } catch {
        // ignore
      }
    }
    setIsAdminPage(path === '/admin');
  };

  // Synchronize route on browser back/forward and hashchange
  useEffect(() => {
    const handleRouteChange = () => {
      setIsAdminPage(checkIsAdminRoute());
    };

    window.addEventListener('popstate', handleRouteChange);
    window.addEventListener('hashchange', handleRouteChange);
    return () => {
      window.removeEventListener('popstate', handleRouteChange);
      window.removeEventListener('hashchange', handleRouteChange);
    };
  }, []);

  const timeLeft = useCountdown(config.targetDateISO);

  // Automatically transition to CAKE_BLOW stage when countdown ends
  useEffect(() => {
    if (timeLeft.isCompleted && appState === 'COUNTDOWN') {
      const timer = setTimeout(() => {
        sounds.playFanfare();
        confetti({
          particleCount: 140,
          spread: 90,
          origin: { y: 0.55 },
          colors: ['#f43f5e', '#ec4899', '#a855f7', '#fbbf24', '#38bdf8'],
        });
        setAppState('CAKE_BLOW');
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [timeLeft.isCompleted, appState]);

  const triggerCandleExtinguished = () => {
    sounds.playBlowing();
    setTimeout(() => {
      sounds.playFanfare();
      confetti({
        particleCount: 170,
        spread: 90,
        origin: { y: 0.55 },
        colors: ['#f43f5e', '#ec4899', '#a855f7', '#fbbf24', '#38bdf8'],
      });
      setAppState('CANDLES_BLOWN');
    }, 400);
  };

  // Microphone blow detection is strictly enabled ONLY when on the CAKE_BLOW stage.
  // This guarantees zero audio ducking, distortion, or OS communication mode interference during countdown!
  const isCakeBlowStage = appState === 'CAKE_BLOW';
  const { permissionError, isListening, micVolume, enableMic } = useBlowDetection(() => {
    triggerCandleExtinguished();
  }, isCakeBlowStage);

  const handleOpenEnvelope = () => {
    sounds.playEnvelopeOpen();
    setTimeout(() => {
      sounds.playChime();
      setAppState('LETTER_SHOW');
    }, 450);
  };

  const isDark = config.theme === 'blackPurplePink' || config.theme === 'midnightStar';

  const getThemeBackground = () => {
    switch (config.theme) {
      case 'blackPurplePink':
        return 'bg-[#090514] text-white';
      case 'midnightStar':
        return 'bg-gradient-to-b from-[#0b0f19] via-[#1e1b4b] to-[#172554] text-slate-100';
      case 'lavenderDream':
        return 'bg-gradient-to-b from-[#faf5ff] via-[#f3e8ff] to-[#fdf2f8] text-slate-800';
      case 'candlelight':
        return 'bg-gradient-to-b from-[#fefce8] via-[#fff7ed] to-[#ffe4e6] text-slate-800';
      case 'roseGold':
      default:
        return 'bg-gradient-to-b from-[#fff5f7] via-[#fff1f2] to-[#fef3c7] text-slate-800';
    }
  };

  // 1. DEDICATED /admin PAGE VIEW
  if (isAdminPage) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <AdminPanel
          config={config}
          onUpdateConfig={(newConfig) => setConfig(newConfig)}
          currentState={appState}
          onSetState={(st) => {
            setAppState(st);
            navigateTo('/');
          }}
          onClose={() => navigateTo('/')}
        />
      </div>
    );
  }

  // 2. CELEBRATION APP VIEW (/)
  return (
    <div className={`min-h-screen relative overflow-x-hidden selection:bg-pink-500 selection:text-white transition-colors duration-500 ${getThemeBackground()}`}>
      {/* Ambient Radial Mesh */}
      {config.theme === 'blackPurplePink' && (
        <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-15%,rgba(168,85,247,0.28),rgba(244,63,94,0.18),rgba(9,5,20,1))]" />
      )}

      {/* Custom YouTube Music Player */}
      {config.youtubeUrl && (
        <YouTubeMusicPlayer
          youtubeUrl={config.youtubeUrl}
          volume={config.musicVolume}
          loop={config.musicLoop}
          startOffset={config.musicStartOffset || 0}
          isPlaying={isMusicActive && config.musicEnabled}
        />
      )}

      {/* Layered Visual Elements */}
      <PetalCanvas />
      <FairyLights />
      <FloatingBalloons />

      {/* Butterflies */}
      {Array.from({ length: 4 }).map((_, i) => (
        <Butterfly key={i} delay={i * 3.5} />
      ))}

      {/* Cute Cats Fleet */}
      <CuteCatFleet />

      {/* Navigation */}
      <Navbar
        currentStage={appState}
        onSelectStage={(stage) => setAppState(stage)}
        recipientName={config.recipientName}
        isDark={isDark}
      />

      {/* Main Experience Viewport */}
      <main className="relative z-20 max-w-5xl mx-auto px-4 py-4 sm:py-8 min-h-[calc(100vh-90px)] flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {/* STAGE 1: COUNTDOWN */}
          {appState === 'COUNTDOWN' && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5 }}
              className="text-center w-full max-w-xl mx-auto flex flex-col items-center"
            >
              <div className="mb-4 sm:mb-6">
                <span className="text-xs font-bold uppercase tracking-widest text-pink-400 mb-2 inline-block drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                  A Special Celebration For You
                </span>
                <h1 className={`text-4xl sm:text-6xl font-script font-bold tracking-wide ${isDark ? 'text-white drop-shadow-[0_0_25px_rgba(236,72,153,0.5)]' : 'text-slate-800'}`}>
                  Birthday Countdown
                </h1>
                <p className={`mt-2 text-sm sm:text-base max-w-md mx-auto ${isDark ? 'text-purple-200/80' : 'text-slate-600'}`}>
                  Counting every precious second until your special day arrives!
                </p>
              </div>

              <CountdownTimer timeLeft={timeLeft} onProceed={() => setAppState('CAKE_BLOW')} />
            </motion.div>
          )}

          {/* STAGE 2: VECTOR CAKE & BLOW CANDLES */}
          {appState === 'CAKE_BLOW' && (
            <motion.div
              key="cake"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="w-full flex flex-col items-center"
            >
              <div className="text-center mb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-pink-400 mb-1 inline-block drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                  Happy Birthday, {config.recipientName}!
                </span>
                <h2 className={`text-3xl sm:text-5xl font-script font-bold ${isDark ? 'text-white drop-shadow-[0_0_20px_rgba(236,72,153,0.5)]' : 'text-slate-800'}`}>
                  Make a Special Wish
                </h2>
              </div>

              <BirthdayCake
                isBlown={false}
                onBlow={triggerCandleExtinguished}
                permissionError={permissionError}
                isListening={isListening}
                micVolume={micVolume}
                enableMic={enableMic}
                soundEnabled={config.soundEnabled}
                recipientName={config.recipientName}
                cakeStyle={config.cakeStyle}
              />
            </motion.div>
          )}

          {/* STAGE 3: WAX SEAL ENVELOPE */}
          {appState === 'CANDLES_BLOWN' && (
            <motion.div
              key="envelope"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.5 }}
              className="w-full flex flex-col items-center"
            >
              <div className="text-center mb-6">
                <span className="text-xs font-bold uppercase tracking-widest text-pink-400 mb-1 inline-block drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                  A Special Delivery
                </span>
                <h2 className={`text-3xl sm:text-5xl font-script font-bold ${isDark ? 'text-white drop-shadow-[0_0_20px_rgba(236,72,153,0.5)]' : 'text-slate-800'}`}>
                  Your Love Letter Awaits
                </h2>
              </div>

              <Envelope
                isOpen={false}
                onOpen={handleOpenEnvelope}
                recipientName={config.recipientName}
              />
            </motion.div>
          )}

          {/* STAGE 4: LOVE LETTER & KEEPSAKE */}
          {appState === 'LETTER_SHOW' && (
            <motion.div
              key="letter"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -25 }}
              transition={{ duration: 0.5 }}
              className="w-full"
            >
              <LetterView
                config={config}
                onReplay={() => setAppState('COUNTDOWN')}
                onOpenAdmin={() => navigateTo('/admin')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
