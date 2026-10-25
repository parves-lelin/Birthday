import React, { useState } from 'react';
import type { AppConfig, AppState, AppTheme, CakeStyle, MusicTrack } from '../../types';
import { DEFAULT_CONFIG } from '../../types';
import { sounds } from '../../utils/soundEffects';
import { bgMusic } from '../../utils/backgroundMusic';
import { YouTubeMusicPlayer } from '../YouTubeMusicPlayer';
import confetti from 'canvas-confetti';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface AdminPanelProps {
  config: AppConfig;
  onUpdateConfig: (newConfig: AppConfig) => void;
  currentState: AppState;
  onSetState: (state: AppState) => void;
  onClose: () => void;
}

// Convert ISO timestamp to local HTML datetime-local format (YYYY-MM-DDTHH:mm)
const toLocalInputValue = (isoStr?: string): string => {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  if (isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const YYYY = date.getFullYear();
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
};

// Convert local HTML datetime-local value to ISO UTC string
const fromLocalInputValue = (localVal: string): string => {
  if (!localVal) return new Date().toISOString();
  const [datePart, timePart] = localVal.split('T');
  if (!datePart || !timePart) {
    const d = new Date(localVal);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  const [y, m, d] = datePart.split('-').map(Number);
  const [h, min] = timePart.split(':').map(Number);
  const date = new Date(y, m - 1, d, h, min, 0, 0);
  return date.toISOString();
};

export const AdminPanel: React.FC<AdminPanelProps> = ({
  config,
  onUpdateConfig,
  currentState,
  onSetState,
  onClose,
}) => {
  const [formData, setFormData] = useState<AppConfig>(() => ({ ...config }));
  const [newMemory, setNewMemory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'idle' | 'saving' | 'success' | 'error';
    message: string;
  }>({ type: 'idle', message: '' });
  const [isPlayingMusicPreview, setIsPlayingMusicPreview] = useState(bgMusic.getIsPlaying());
  const [currentTimestamp] = useState(() => Date.now());
  const isDirtyRef = React.useRef(false);

  // Sync external cloud updates into form if user hasn't made unsaved edits
  React.useEffect(() => {
    if (!isDirtyRef.current) {
      setFormData({ ...config });
    }
  }, [config]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus({ type: 'saving', message: 'Saving and syncing to cloud database...' });
    try {
      const payload: AppConfig & { updatedAt: string } = {
        ...formData,
        updatedAt: new Date().toISOString(),
      };

      // 1. Save locally to localStorage
      try {
        localStorage.setItem('local_app_config', JSON.stringify(payload));
      } catch (e) {
        console.warn('LocalStorage save warning:', e);
      }

      onUpdateConfig(payload);

      // 2. Sync to Firestore Cloud DB
      await setDoc(doc(db, 'settings', 'app_config'), payload, { merge: true });

      // Mark clean
      isDirtyRef.current = false;

      // Sync background music state
      if (payload.musicEnabled) {
        if (payload.musicTrack !== 'youtube' && !payload.youtubeUrl) {
          bgMusic.setTrack(payload.musicTrack);
          bgMusic.setVolume(payload.musicVolume);
          bgMusic.setStartOffset(payload.musicStartOffset || 0);
        } else {
          bgMusic.stop();
        }
      } else {
        bgMusic.stop();
        setIsPlayingMusicPreview(false);
      }

      setSaveStatus({
        type: 'success',
        message: '✓ Saved & Synced! All devices will update in real time.',
      });
      setTimeout(() => {
        setSaveStatus({ type: 'idle', message: '' });
      }, 3500);
    } catch (err) {
      console.error('Firestore cloud sync notice:', err);
      setSaveStatus({
        type: 'error',
        message: 'Saved to this device. Cloud sync error: ' + (err instanceof Error ? err.message : String(err)),
      });
      setTimeout(() => {
        setSaveStatus({ type: 'idle', message: '' });
      }, 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'app_config'), DEFAULT_CONFIG);
      isDirtyRef.current = false;
      setFormData(DEFAULT_CONFIG);
      onUpdateConfig(DEFAULT_CONFIG);
      setSaveStatus({ type: 'success', message: '✓ Reset all settings to defaults.' });
      setTimeout(() => setSaveStatus({ type: 'idle', message: '' }), 2500);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/app_config');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMusicPreview = () => {
    if (isPlayingMusicPreview) {
      if (formData.musicTrack !== 'youtube' && !formData.youtubeUrl) {
        bgMusic.stop();
      }
      setIsPlayingMusicPreview(false);
    } else {
      if (formData.musicTrack !== 'youtube' && !formData.youtubeUrl) {
        bgMusic.start(formData.musicTrack, formData.musicVolume, formData.musicStartOffset || 0);
      }
      setIsPlayingMusicPreview(true);
    }
  };

  const handleAddMemory = () => {
    if (!newMemory.trim()) return;
    setFormData({
      ...formData,
      memories: [...formData.memories, newMemory.trim()],
    });
    setNewMemory('');
  };

  const handleRemoveMemory = (index: number) => {
    setFormData({
      ...formData,
      memories: formData.memories.filter((_, i) => i !== index),
    });
  };

  const testConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#f43f5e', '#ec4899', '#f59e0b', '#8b5cf6'],
    });
    sounds.playFanfare();
  };

  const stages: { id: AppState; label: string; icon: string; desc: string }[] = [
    {
      id: 'COUNTDOWN',
      label: 'Stage 1: Countdown',
      icon: '⏳',
      desc: 'Anticipation countdown timer to birthday',
    },
    {
      id: 'CAKE_BLOW',
      label: 'Stage 2: Cake & Candles',
      icon: '🎂',
      desc: 'Interactive 3D cake with glowing candles',
    },
    {
      id: 'CANDLES_BLOWN',
      label: 'Stage 3: Wax Sealed Envelope',
      icon: '💌',
      desc: 'Candles extinguished, wax seal envelope arrives',
    },
    {
      id: 'LETTER_SHOW',
      label: 'Stage 4: Love Letter & Keepsake',
      icon: '📜',
      desc: 'Full love letter, photo polaroid, and memories',
    },
  ];

  const themes: { id: AppTheme; name: string; preview: string }[] = [
    { id: 'blackPurplePink', name: 'Black, Purple & Pink (Neon)', preview: 'from-purple-900 via-pink-600 to-black' },
    { id: 'roseGold', name: 'Rose Gold Romance', preview: 'from-rose-100 to-amber-50' },
    { id: 'midnightStar', name: 'Midnight Starlight', preview: 'from-slate-900 to-indigo-950' },
    { id: 'lavenderDream', name: 'Lavender Twilight', preview: 'from-purple-100 to-pink-50' },
    { id: 'candlelight', name: 'Candlelight Amber', preview: 'from-amber-100 to-orange-50' },
  ];

  const cakeStyles: { id: CakeStyle; name: string; desc: string }[] = [
    { id: 'butterflyPink', name: '🌸 Butterfly Pink (1-Tier)', desc: 'Single-tier soft pink cake with butterflies & white pearls' },
    { id: 'royalPurpleTwoTier', name: '💜 Royal Purple (2-Tier)', desc: 'Two-tier purple velvet cake with rosette borders' },
    { id: 'grandThreeTier', name: '👑 Grand Celebration (3-Tier)', desc: 'Three-tier luxury cake with cascading glaze' },
    { id: 'goldenLuxury', name: '✨ Golden Luxury (1-Tier)', desc: 'White cake with 24K gold dripping glaze & pearls' },
    { id: 'strawberryVelvet', name: '🍓 Strawberry Red Velvet (1-Tier)', desc: 'Rich red velvet topped with fresh strawberries & mint' },
    { id: 'midnightGalaxy', name: '🌌 Midnight Galaxy (2-Tier)', desc: 'Deep cosmic purple & blue cake with starlight sparkles' },
    { id: 'matchaBlossom', name: '🌸 Matcha Blossom (1-Tier)', desc: 'Pastel matcha green cake with pink cherry blossoms' },
    { id: 'chocolateFudge', name: '🍫 Chocolate Fudge (1-Tier)', desc: 'Rich dark chocolate fudge with caramel glaze' },
    { id: 'pastelRainbow', name: '🌈 Pastel Rainbow (3-Tier)', desc: 'Pastel rainbow tiers with fluffy clouds & gold stars' },
    { id: 'oceanBreeze', name: '🌊 Ocean Breeze (2-Tier)', desc: 'Turquoise seafoam cake with golden seashell pearls' },
    { id: 'vintageCoquette', name: '🎀 Vintage Coquette (2-Tier)', desc: 'Vintage pink coquette piping with red cherries' },
    { id: 'chocolatierGold', name: '👑 Chocolatier Truffle (1-Tier)', desc: 'Decadent chocolate truffle with gold foil leaves' },
    { id: 'fairyGarden', name: '🧚‍♀️ Fairy Garden (1-Tier)', desc: 'Enchanted lavender cake with floral vines & fairy dust' },
  ];

  const musicTracks: { id: MusicTrack; name: string; desc: string }[] = [
    { id: 'lofiBirthday', name: '🎵 Romantic Lo-Fi Birthday', desc: 'Chill lo-fi chord progressions' },
    { id: 'romanticPiano', name: '🎹 Acoustic Piano Serenade', desc: 'Warm acoustic piano arpeggios' },
    { id: 'acousticAura', name: '✨ Soft Dreamscape Aura', desc: 'Ethereal ambient pads and soft bells' },
    { id: 'youtube', name: '📺 Custom YouTube Track', desc: 'Play any YouTube music link with volume & loop' },
  ];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const srcUrl = event.target?.result as string;
      if (!srcUrl) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
          setFormData((prev) => ({
            ...prev,
            photoUrl: compressedDataUrl,
          }));
        }
      };
      img.src = srcUrl;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Celebration Admin & Background Music Controller
              </h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Configure romantic background lo-fi playlists, cake styles, love letter content, and real-time cloud sync.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-2"
            >
              {isSaving
                ? 'Saving to Cloud...'
                : saveStatus.type === 'success'
                ? '✓ Saved & Synced!'
                : 'Save & Sync Cloud'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              Back to Preview
            </button>
          </div>
        </div>

        {/* Live Save Status Banner */}
        {saveStatus.message && (
          <div
            className={`p-3.5 rounded-xl border text-sm font-medium flex items-center justify-between transition-all ${
              saveStatus.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : saveStatus.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : 'bg-blue-50 text-blue-800 border-blue-200'
            }`}
          >
            <span>{saveStatus.message}</span>
            {saveStatus.type === 'saving' && (
              <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        )}

        {/* SECTION 1: BACKGROUND MUSIC CONTROLLER */}
        <div className="bg-gradient-to-r from-rose-50 via-purple-50 to-pink-50 rounded-xl border border-rose-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🎶</span>
                <h2 className="text-base font-bold text-slate-900">
                  Background Music & Romantic Lo-Fi Playlist
                </h2>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                Automatically starts playing soft romantic lo-fi birthday melody when visitors open or touch the app.
              </p>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-rose-200 shadow-xs">
              <span className="text-xs font-semibold text-slate-700">
                {formData.musicEnabled ? 'Music Enabled' : 'Music Muted'}
              </span>
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, musicEnabled: !formData.musicEnabled })
                }
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  formData.musicEnabled ? 'bg-rose-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    formData.musicEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {formData.musicEnabled && (
            <div className="space-y-4 pt-2 border-t border-rose-200/60">
              {/* Track Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">
                  Select Melody Playlist Track
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {musicTracks.map((tr) => {
                    const isSelected = formData.musicTrack === tr.id;
                    return (
                      <button
                        key={tr.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, musicTrack: tr.id });
                          bgMusic.setTrack(tr.id);
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-rose-500 bg-white shadow-sm ring-2 ring-rose-500/20'
                            : 'border-slate-200 bg-white/60 hover:bg-white'
                        }`}
                      >
                        <div className="text-xs font-bold text-slate-800">{tr.name}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{tr.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* YouTube Custom URL Input */}
              {(formData.musicTrack === 'youtube' || formData.youtubeUrl) && (
                <div className="bg-white/90 p-4 rounded-xl border border-rose-200 space-y-2.5">
                  <label className="block text-xs font-bold text-slate-800">
                    📺 Custom YouTube Music Link
                  </label>
                  <input
                    type="text"
                    value={formData.youtubeUrl || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        youtubeUrl: e.target.value,
                        musicTrack: 'youtube',
                      })
                    }
                    placeholder="e.g. https://www.youtube.com/watch?v=dQw4w9WgXcQ or https://youtu.be/..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Paste any YouTube music video or playlist link.
                  </p>
                </div>
              )}

              {/* YouTube Music Preview in Admin Panel */}
              {formData.youtubeUrl && (
                <YouTubeMusicPlayer
                  youtubeUrl={formData.youtubeUrl}
                  volume={formData.musicVolume}
                  loop={formData.musicLoop}
                  startOffset={formData.musicStartOffset || 0}
                  isPlaying={isPlayingMusicPreview && formData.musicEnabled}
                />
              )}

              {/* Start Time Offset & Silent Intro Skip Controller */}
              <div className="bg-white/90 p-4 rounded-xl border border-rose-200 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span>⏱️ Music Start Offset & Loop Point</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold">
                        Skip Silent Intro
                      </span>
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Set where the music should begin playing and where it loops back to every time. Perfect if your song has talking, silence, or a slow intro!
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-mono font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                      {Math.floor((formData.musicStartOffset || 0) / 60)}:
                      {String((formData.musicStartOffset || 0) % 60).padStart(2, '0')}
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-0.5">({formData.musicStartOffset || 0} seconds)</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="range"
                      min="0"
                      max="180"
                      step="1"
                      value={formData.musicStartOffset || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        isDirtyRef.current = true;
                        setFormData({ ...formData, musicStartOffset: val });
                        bgMusic.setStartOffset(val);
                      }}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>0s (Beginning)</span>
                      <span>30s</span>
                      <span>1m 00s</span>
                      <span>2m 00s</span>
                      <span>3m 00s</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="600"
                      value={formData.musicStartOffset || 0}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                        isDirtyRef.current = true;
                        setFormData({ ...formData, musicStartOffset: val });
                        bgMusic.setStartOffset(val);
                      }}
                      className="w-20 px-2.5 py-1.5 text-xs font-mono font-bold text-center border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                    />
                    <span className="text-xs text-slate-500 font-medium">sec</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Presets:</span>
                  {[
                    { label: '0s (Start)', val: 0 },
                    { label: '5s', val: 5 },
                    { label: '10s', val: 10 },
                    { label: '15s', val: 15 },
                    { label: '20s', val: 20 },
                    { label: '30s', val: 30 },
                    { label: '45s', val: 45 },
                    { label: '60s (1m)', val: 60 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => {
                        isDirtyRef.current = true;
                        setFormData({ ...formData, musicStartOffset: preset.val });
                        bgMusic.setStartOffset(preset.val);
                      }}
                      className={`px-2 py-0.5 text-[11px] rounded-md font-medium transition-colors cursor-pointer border ${
                        (formData.musicStartOffset || 0) === preset.val
                          ? 'bg-rose-500 text-white border-rose-500'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Volume Slider & Loop Toggle & Test Play Button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 p-3.5 rounded-xl border border-rose-200/80">
                <div className="flex-1 max-w-xs">
                  <div className="flex justify-between items-center text-xs font-medium text-slate-700 mb-1">
                    <span>Playlist Volume</span>
                    <span className="text-rose-600 font-bold">{Math.round(formData.musicVolume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={formData.musicVolume}
                    onChange={(e) => {
                      const vol = parseFloat(e.target.value);
                      setFormData({ ...formData, musicVolume: vol });
                      bgMusic.setVolume(vol);
                    }}
                    className="w-full accent-rose-500 cursor-pointer"
                  />
                </div>

                {/* Loop Song Toggle */}
                <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
                  <span className="font-semibold text-slate-700">Loop Song:</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, musicLoop: !formData.musicLoop })}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      formData.musicLoop
                        ? 'bg-rose-500 text-white shadow-xs'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {formData.musicLoop ? '🔁 Loop On' : '➡️ Play Once'}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={toggleMusicPreview}
                  className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-2 cursor-pointer self-start sm:self-center"
                >
                  <span>{isPlayingMusicPreview ? '⏸ Pause Preview' : '▶ Play Test Loop'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: STAGE JUMP & PREVIEW CONTROLLER */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Live Stage Navigator
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Instantly switch the app into any stage to test how it looks and behaves.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {stages.map((st) => {
              const isActive = currentState === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => {
                    onSetState(st.id);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isActive
                      ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xl mb-1.5">{st.icon}</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {st.label}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{st.desc}</div>
                  {isActive && (
                    <span className="inline-block mt-2 text-[10px] uppercase font-bold tracking-wider text-rose-600">
                      Currently Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Test Effects Bar */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Sound & FX Testing:
            </span>
            <button
              onClick={testConfetti}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
            >
              🎉 Test Confetti
            </button>
            <button
              onClick={() => sounds.playBlowing()}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
            >
              🌬️ Test Candle Blow Sound
            </button>
            <button
              onClick={() => sounds.playChime()}
              className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
            >
              🔔 Test Crystal Chime
            </button>
          </div>
        </div>

        {/* SECTION 3: CAKE DESIGN SELECTOR */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-slate-900">
            Cake Architecture Design
          </h2>
          <p className="text-xs text-slate-500">
            Choose between single-tier, two-tier, or three-tier vector cakes.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {cakeStyles.map((c) => {
              const isSelected = formData.cakeStyle === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setFormData({ ...formData, cakeStyle: c.id })}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-800">{c.name}</div>
                  <div className="text-xs text-slate-500 mt-1 leading-relaxed">{c.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 4: LETTER CONTENT & RECIPIENT SETTINGS */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <h2 className="text-base font-semibold text-slate-900">
            Letter & Personalization Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Recipient Name / Salutation
              </label>
              <input
                type="text"
                value={formData.recipientName}
                onChange={(e) =>
                  setFormData({ ...formData, recipientName: e.target.value })
                }
                placeholder="e.g. My Dearest Wife, Sweetheart..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Sender Name / Signature
              </label>
              <input
                type="text"
                value={formData.senderName}
                onChange={(e) =>
                  setFormData({ ...formData, senderName: e.target.value })
                }
                placeholder="e.g. Your Loving Husband, Lelin..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Letter Title / Subtitle
            </label>
            <input
              type="text"
              value={formData.letterTitle}
              onChange={(e) =>
                setFormData({ ...formData, letterTitle: e.target.value })
              }
              placeholder="e.g. A Love Letter For Your Special Day"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Love Letter Body (Heartfelt Message)
            </label>
            <textarea
              rows={4}
              value={formData.letterBody}
              onChange={(e) =>
                setFormData({ ...formData, letterBody: e.target.value })
              }
              placeholder="Write your romantic birthday message..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 leading-relaxed"
            />
          </div>

          {/* Cherished Memories Editor */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Cherished Memories & Highlights
            </label>
            <div className="space-y-2 mb-3">
              {formData.memories.map((mem, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700"
                >
                  <span className="flex-1">♥ {mem}</span>
                  <button
                    onClick={() => handleRemoveMemory(idx)}
                    className="text-xs text-rose-500 hover:text-rose-700 font-medium px-2 py-1 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newMemory}
                onChange={(e) => setNewMemory(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMemory()}
                placeholder="Add a new memory (e.g. 'That rainy walk in Paris')..."
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
              <button
                type="button"
                onClick={handleAddMemory}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
              >
                Add Memory
              </button>
            </div>
          </div>
        </div>

        {/* SECTION 4.5: POLAROID PHOTO UPLOADER */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">📸</span>
            <h2 className="text-base font-semibold text-slate-900">
              Polaroid Keepsake Photo Uploader
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Upload a picture of you together or paste an image URL to display inside the Polaroid frame in your love letter.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Thumbnail Preview */}
            <div className="md:col-span-4 flex flex-col items-center">
              <div className="w-40 p-2.5 bg-white rounded-lg shadow-md border border-slate-200 text-center relative group">
                <div className="w-full aspect-square bg-slate-100 rounded-xs overflow-hidden relative flex items-center justify-center">
                  {formData.photoUrl ? (
                    <img
                      src={formData.photoUrl}
                      alt="Polaroid Memory Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2 text-slate-400">
                      <span className="text-2xl mb-1">🖼️</span>
                      <span className="text-[11px]">No Photo Uploaded</span>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-xs font-script text-slate-600 font-semibold truncate">
                  {formData.photoCaption || 'Us Together ✨'}
                </p>
              </div>
            </div>

            {/* Upload Controls */}
            <div className="md:col-span-8 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Option 1: Upload Photo File from Device
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports JPG, PNG, WEBP files up to 4MB.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Option 2: Image URL
                </label>
                <input
                  type="text"
                  value={formData.photoUrl}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Photo Frame Caption
                </label>
                <input
                  type="text"
                  value={formData.photoCaption}
                  onChange={(e) => setFormData({ ...formData, photoCaption: e.target.value })}
                  placeholder="e.g. Our happiest moments together ✨"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              {formData.photoUrl && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, photoUrl: '' })}
                  className="text-xs text-rose-600 hover:text-rose-800 font-medium underline cursor-pointer"
                >
                  Clear Photo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 5: COUNTDOWN TARGET & THEME */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <h2 className="text-base font-semibold text-slate-900">
            Countdown Target & Visual Theme
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Target Birthday Date & Time</span>
                <span className="text-[11px] text-rose-600 font-normal">Local device time</span>
              </label>
              <input
                type="datetime-local"
                value={toLocalInputValue(formData.targetDateISO)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) return;
                  const iso = fromLocalInputValue(val);
                  isDirtyRef.current = true;
                  setFormData((prev) => ({
                    ...prev,
                    targetDateISO: iso,
                  }));
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 font-medium text-slate-800"
              />

              {/* Formatted Preview Banner */}
              <div className="mt-2 p-2.5 bg-rose-50/80 border border-rose-200/80 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between font-medium text-slate-800">
                  <span>Selected Target:</span>
                  <span className="text-rose-700 font-bold">
                    {formData.targetDateISO && !isNaN(new Date(formData.targetDateISO).getTime())
                      ? new Date(formData.targetDateISO).toLocaleString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })
                      : 'None set'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Trigger Status:</span>
                  {(() => {
                    const targetMs = new Date(formData.targetDateISO).getTime();
                    const hasPassed = !isNaN(targetMs) && targetMs <= currentTimestamp;
                    return (
                      <span className={`font-semibold ${hasPassed ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {hasPassed
                          ? '⚡ Reached (Triggers Cake Stage immediately)'
                          : '⏳ Counting down...'}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    const past = new Date(Date.now() - 60000).toISOString();
                    isDirtyRef.current = true;
                    setFormData((prev) => ({ ...prev, targetDateISO: past }));
                  }}
                  className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md cursor-pointer transition-colors"
                >
                  ⚡ Trigger Now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const plus10 = new Date(Date.now() + 10 * 60000).toISOString();
                    isDirtyRef.current = true;
                    setFormData((prev) => ({ ...prev, targetDateISO: plus10 }));
                  }}
                  className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-md cursor-pointer transition-colors"
                >
                  +10 Mins
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const plus1h = new Date(Date.now() + 60 * 60000).toISOString();
                    isDirtyRef.current = true;
                    setFormData((prev) => ({ ...prev, targetDateISO: plus1h }));
                  }}
                  className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-md cursor-pointer transition-colors"
                >
                  +1 Hour
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const tomorrow = new Date(Date.now() + 24 * 3600000);
                    tomorrow.setHours(0, 0, 0, 0);
                    isDirtyRef.current = true;
                    setFormData((prev) => ({ ...prev, targetDateISO: tomorrow.toISOString() }));
                  }}
                  className="px-2 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-md cursor-pointer transition-colors"
                >
                  Tomorrow
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Polaroid Photo Caption
              </label>
              <input
                type="text"
                value={formData.photoCaption}
                onChange={(e) =>
                  setFormData({ ...formData, photoCaption: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>
          </div>

          {/* Theme Palette Chooser */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-2">
              Atmospheric Theme
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {themes.map((th) => {
                const isSelected = formData.theme === th.id;
                return (
                  <button
                    key={th.id}
                    onClick={() => setFormData({ ...formData, theme: th.id })}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`w-full h-8 rounded-md bg-gradient-to-r ${th.preview} border border-slate-200 mb-2`}
                    />
                    <div className="text-xs font-semibold text-slate-800">
                      {th.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Footnotes */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <button
            onClick={handleReset}
            disabled={isSaving}
            className="text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
          >
            Reset All to Defaults
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-2"
            >
              {isSaving
                ? 'Saving to Cloud...'
                : saveStatus.type === 'success'
                ? '✓ Saved & Synced!'
                : 'Save & Sync Cloud'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
