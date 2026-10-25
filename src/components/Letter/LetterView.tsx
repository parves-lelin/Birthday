import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { AppConfig } from '../../types';

interface LetterViewProps {
  config: AppConfig;
  onReplay: () => void;
  onOpenAdmin: () => void;
}

export const LetterView: React.FC<LetterViewProps> = ({
  config,
  onReplay,
  onOpenAdmin,
}) => {
  const [failedPhotoUrl, setFailedPhotoUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const imageError = failedPhotoUrl === config.photoUrl;

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-2xl mx-auto my-4 relative z-20"
    >
      {/* Outer Glow Halo */}
      <div className="absolute -inset-4 bg-gradient-to-r from-rose-300/30 via-amber-200/25 to-purple-300/30 rounded-3xl blur-2xl -z-10" />

      {/* Parchment Love Letter Card */}
      <div className="bg-[#fffdf9] text-slate-800 rounded-2xl shadow-2xl border border-amber-200/60 p-6 sm:p-10 relative overflow-hidden">
        {/* Vintage Paper Texture & Gold Foil Border Inset */}
        <div className="absolute inset-2 sm:inset-3 border border-amber-300/40 rounded-xl pointer-events-none" />
        <div className="absolute inset-2.5 sm:inset-3.5 border border-rose-200/30 rounded-lg pointer-events-none" />

        {/* Top Header Watermark & Corner Floral Accents */}
        <div className="flex items-center justify-between border-b border-amber-200/50 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
              Special Keepsake
            </span>
          </div>
          <span className="text-xs font-serif italic text-amber-700/70">
            For Eternity & Beyond
          </span>
        </div>

        {/* Recipient Greeting in Script Calligraphy */}
        <div className="mb-6">
          <h1 className="text-4xl sm:text-5xl font-script text-rose-600 tracking-wide font-bold">
            {config.recipientName}
          </h1>
          <p className="text-sm font-medium text-amber-800/80 mt-1">
            {config.letterTitle}
          </p>
        </div>

        {/* Grid Split with Polaroid Keepsake Photo & Romantic Message */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Heartfelt Body Text */}
          <div className="md:col-span-7 space-y-4">
            <p className="text-base sm:text-lg leading-relaxed text-slate-700 font-sans whitespace-pre-line">
              {config.letterBody}
            </p>

            {/* Cherished Memories List */}
            {config.memories && config.memories.length > 0 && (
              <div className="pt-2">
                <h3 className="text-xs uppercase tracking-wider text-rose-500 font-semibold mb-2">
                  Cherished Memories
                </h3>
                <ul className="space-y-1.5 text-sm text-slate-600">
                  {config.memories.map((memory, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-rose-400 text-xs mt-1">♥</span>
                      <span>{memory}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Polaroid Photo Frame */}
          <div className="md:col-span-5 flex flex-col items-center">
            <div className="w-56 p-3 bg-white rounded-lg shadow-xl border border-slate-200/80 rotate-2 hover:rotate-0 transition-transform duration-300 relative group">
              {/* Tape Accent */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-amber-100/80 border border-amber-200/50 -rotate-2 rounded-xs shadow-xs" />

              {/* Photo */}
              <div className="w-full aspect-square bg-slate-100 rounded-sm overflow-hidden relative shadow-inner">
                {config.photoUrl && !imageError ? (
                  <img
                    src={config.photoUrl}
                    alt="Romantic memory together"
                    referrerPolicy="no-referrer"
                    onError={() => setFailedPhotoUrl(config.photoUrl)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-rose-100 to-amber-50 p-4 text-center">
                    <span className="text-3xl mb-1">💑</span>
                    <span className="text-xs text-rose-600 font-medium">Us Together</span>
                  </div>
                )}
              </div>

              {/* Polaroid Caption */}
              <p className="mt-2 text-center text-xs font-script text-slate-600 text-base font-semibold">
                {config.photoCaption}
              </p>
            </div>
          </div>
        </div>

        {/* Sender Sign-off */}
        <div className="mt-8 pt-6 border-t border-amber-200/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">
              With all my heart,
            </p>
            <p className="text-2xl sm:text-3xl font-script text-rose-600 font-bold mt-1">
              {config.senderName}
            </p>
          </div>

          {/* Wax Stamp Graphic Accent */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-700 via-rose-600 to-rose-900 border-2 border-amber-300 shadow-md flex items-center justify-center">
            <span className="text-amber-200 text-lg font-script font-bold">♥</span>
          </div>
        </div>

        {/* Action Buttons Toolbar */}
        <div className="mt-8 pt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={onReplay}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <span>↺</span>
              <span>Replay Celebration</span>
            </button>
            <button
              onClick={handleShare}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors cursor-pointer"
            >
              {copied ? '✓ Link Copied!' : 'Copy Link'}
            </button>
          </div>

          <button
            onClick={onOpenAdmin}
            className="text-rose-600 hover:text-rose-700 underline font-medium cursor-pointer"
          >
            Customize in /admin
          </button>
        </div>
      </div>
    </motion.div>
  );
};
