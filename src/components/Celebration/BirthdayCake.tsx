import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { sounds } from '../../utils/soundEffects';
import type { CakeStyle } from '../../types';

interface BirthdayCakeProps {
  isBlown: boolean;
  onBlow: () => void;
  permissionError?: boolean;
  isListening?: boolean;
  micVolume?: number;
  enableMic?: () => void;
  soundEnabled?: boolean;
  recipientName?: string;
  cakeStyle?: CakeStyle;
}

export const BirthdayCake: React.FC<BirthdayCakeProps> = ({
  isBlown,
  onBlow,
  permissionError = false,
  isListening = false,
  micVolume = 0,
  enableMic,
  recipientName = 'My Love',
  cakeStyle = 'butterflyPink',
}) => {
  const [blownCandles, setBlownCandles] = useState<boolean[]>([false, false, false]);

  const allCandlesExtinguished = isBlown || blownCandles.every(Boolean);

  const handleCandleClick = (index: number) => {
    sounds.playBlowing();
    const updated = [...blownCandles];
    updated[index] = !updated[index];
    setBlownCandles(updated);

    if (updated.every(Boolean) && !isBlown) {
      onBlow();
    }
  };

  const handleBlowAll = () => {
    sounds.playBlowing();
    setBlownCandles([true, true, true]);
    onBlow();
  };

  // Candle placements tailored to cake tier geometry
  const candlePositions =
    cakeStyle === 'grandThreeTier' || cakeStyle === 'pastelRainbow'
      ? [
          { id: 0, x: 140, y: 55, delay: 0 },
          { id: 1, x: 180, y: 48, delay: 0.15 },
          { id: 2, x: 220, y: 55, delay: 0.3 },
        ]
      : cakeStyle === 'royalPurpleTwoTier' ||
        cakeStyle === 'midnightGalaxy' ||
        cakeStyle === 'oceanBreeze' ||
        cakeStyle === 'vintageCoquette'
      ? [
          { id: 0, x: 135, y: 65, delay: 0 },
          { id: 1, x: 180, y: 56, delay: 0.15 },
          { id: 2, x: 225, y: 65, delay: 0.3 },
        ]
      : [
          // 1-Tier styles (butterflyPink, goldenLuxury, strawberryVelvet, matchaBlossom, chocolateFudge, chocolatierGold, fairyGarden)
          { id: 0, x: 135, y: 85, delay: 0 },
          { id: 1, x: 180, y: 75, delay: 0.15 },
          { id: 2, x: 225, y: 85, delay: 0.3 },
        ];

  return (
    <div className="relative flex flex-col items-center select-none py-2 px-4 max-w-lg mx-auto">
      {/* Ambient Candlelight Glow */}
      {!allCandlesExtinguished && (
        <motion.div
          animate={{
            scale: [1, 1.12, 0.98, 1.06, 1],
            opacity: [0.45, 0.65, 0.5, 0.6, 0.45],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-4 w-96 h-80 rounded-full pointer-events-none blur-3xl bg-radial from-pink-400/50 via-purple-400/25 to-transparent z-0"
        />
      )}

      {/* VECTOR CAKE DISPLAY */}
      <motion.div
        animate={allCandlesExtinguished ? { y: [0, -12, 0], scale: [1, 1.03, 1] } : {}}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative w-80 sm:w-96 aspect-[360/320] z-10 flex items-center justify-center cursor-pointer"
        onClick={() => {
          if (!allCandlesExtinguished) handleBlowAll();
        }}
        title="Tap the cake to blow out candles!"
      >
        <svg
          viewBox="0 0 360 320"
          className="w-full h-full drop-shadow-2xl overflow-visible"
        >
          <defs>
            {/* Pink Gradients */}
            <linearGradient id="pinkCakeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f472b6" />
              <stop offset="40%" stopColor="#ec4899" />
              <stop offset="100%" stopColor="#db2777" />
            </linearGradient>

            <linearGradient id="cakeTopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbcfe8" />
              <stop offset="100%" stopColor="#f472b6" />
            </linearGradient>

            {/* Purple Two-Tier Gradients */}
            <linearGradient id="purpleBottomGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="50%" stopColor="#9333ea" />
              <stop offset="100%" stopColor="#6b21a8" />
            </linearGradient>

            <linearGradient id="purpleTopGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e879f9" />
              <stop offset="50%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>

            {/* Gold Stand & Accents Gradient */}
            <linearGradient id="goldStandGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>

            {/* Velvet & Chocolate Gradients */}
            <linearGradient id="velvetGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#dc2626" />
              <stop offset="100%" stopColor="#991b1b" />
            </linearGradient>

            <linearGradient id="chocolateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="50%" stopColor="#451a03" />
              <stop offset="100%" stopColor="#290e02" />
            </linearGradient>

            <linearGradient id="galaxyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </linearGradient>

            <linearGradient id="matchaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#bbf7d0" />
              <stop offset="50%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>

            <linearGradient id="oceanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>

            <radialGradient id="pearlGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="70%" stopColor="#fbcfe8" />
              <stop offset="100%" stopColor="#f472b6" />
            </radialGradient>

            <linearGradient id="pinkCandleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fff1f2" />
              <stop offset="50%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#be123c" />
            </linearGradient>

            <filter id="pinkGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* CAKE BASE STAND */}
          <g id="cake-board">
            <ellipse cx="180" cy="280" rx="145" ry="18" fill="url(#goldStandGrad)" stroke="#a16207" strokeWidth="2" />
            <ellipse cx="180" cy="283" rx="148" ry="8" fill="#000000" opacity="0.12" />
          </g>

          {/* CAKE STYLE 1: BUTTERFLY PINK (1 TIER) */}
          {cakeStyle === 'butterflyPink' && (
            <g id="style-butterfly-pink">
              <path d="M60,140 C60,140 60,250 60,250 C60,270 115,280 180,280 C245,280 300,270 300,250 L300,140 Z" fill="url(#pinkCakeGrad)" stroke="#be123c" strokeWidth="2" />
              <path d="M60,245 C80,265 110,268 140,260 C170,268 200,268 230,260 C260,268 285,260 300,245 C300,255 245,280 180,280 C115,280 60,255 60,245 Z" fill="#ffffff" stroke="#f472b6" strokeWidth="1.2" />
              <path d="M60,170 C100,182 180,186 300,170" fill="none" stroke="#fbcfe8" strokeWidth="2.5" opacity="0.7" />
              <path d="M60,195 C100,207 180,211 300,195" fill="none" stroke="#fbcfe8" strokeWidth="2.5" opacity="0.7" />
              <ellipse cx="180" cy="140" rx="120" ry="30" fill="url(#cakeTopGrad)" stroke="#be123c" strokeWidth="2" />
              <text x="180" y="142" textAnchor="middle" fill="#ffffff" fontSize="14" fontFamily="Dancing Script, cursive" fontWeight="bold" filter="url(#pinkGlow)">
                Happy Birthday, {recipientName}!
              </text>
            </g>
          )}

          {/* CAKE STYLE 2: ROYAL PURPLE TWO-TIER */}
          {cakeStyle === 'royalPurpleTwoTier' && (
            <g id="style-purple-two-tier">
              <path d="M60,180 C60,180 60,255 60,255 C60,272 115,280 180,280 C245,280 300,272 300,255 L300,180 Z" fill="url(#purpleBottomGrad)" stroke="#581c87" strokeWidth="2" />
              <ellipse cx="180" cy="180" rx="120" ry="26" fill="#c084fc" stroke="#581c87" strokeWidth="2" />
              <path d="M95,115 C95,115 95,175 95,175 C95,190 135,198 180,198 C225,198 265,190 265,175 L265,115 Z" fill="url(#purpleTopGrad)" stroke="#581c87" strokeWidth="2" />
              <ellipse cx="180" cy="115" rx="85" ry="18" fill="#f5d0fe" stroke="#581c87" strokeWidth="2" />
              <rect x="135" y="142" width="90" height="22" rx="11" fill="#ffffff" stroke="#c084fc" strokeWidth="1.5" />
              <text x="180" y="157" textAnchor="middle" fill="#9333ea" fontSize="11" fontFamily="Dancing Script, cursive" fontWeight="bold">Happy Birthday!</text>
            </g>
          )}

          {/* CAKE STYLE 3: GRAND THREE-TIER */}
          {cakeStyle === 'grandThreeTier' && (
            <g id="style-grand-three-tier">
              <path d="M50,210 L50,260 C50,275 110,283 180,283 C250,283 310,275 310,260 L310,210 Z" fill="url(#pinkCakeGrad)" stroke="#be123c" strokeWidth="2" />
              <ellipse cx="180" cy="210" rx="130" ry="25" fill="#fbcfe8" stroke="#be123c" strokeWidth="2" />
              <path d="M85,145 L85,195 C85,208 128,216 180,216 C232,216 275,208 275,195 L275,145 Z" fill="url(#purpleTopGrad)" stroke="#6b21a8" strokeWidth="2" />
              <ellipse cx="180" cy="145" rx="95" ry="20" fill="#f5d0fe" stroke="#6b21a8" strokeWidth="2" />
              <path d="M115,90 L115,130 C115,140 145,148 180,148 C215,148 245,140 245,130 L245,90 Z" fill="url(#pinkCakeGrad)" stroke="#be123c" strokeWidth="2" />
              <ellipse cx="180" cy="90" rx="65" ry="15" fill="#fbcfe8" stroke="#be123c" strokeWidth="2" />
            </g>
          )}

          {/* CAKE STYLE 4: GOLDEN LUXURY */}
          {cakeStyle === 'goldenLuxury' && (
            <g id="style-golden-luxury">
              <path d="M60,140 L60,250 C60,270 115,280 180,280 C245,280 300,270 300,250 L300,140 Z" fill="#ffffff" stroke="#eab308" strokeWidth="2" />
              <path d="M60,140 Q90,180 120,150 Q150,190 180,145 Q210,185 240,150 Q270,180 300,140 L300,165 Q270,205 240,175 Q210,210 180,170 Q150,215 120,175 Q90,205 60,165 Z" fill="url(#goldStandGrad)" opacity="0.95" />
              <ellipse cx="180" cy="140" rx="120" ry="30" fill="#fefce8" stroke="#ca8a04" strokeWidth="2" />
              {Array.from({ length: 11 }).map((_, i) => (
                <circle key={i} cx={70 + i * 22} cy={268} r="4.5" fill="url(#goldStandGrad)" stroke="#ca8a04" strokeWidth="0.8" />
              ))}
              <text x="180" y="142" textAnchor="middle" fill="#854d0e" fontSize="13" fontFamily="Dancing Script, cursive" fontWeight="bold">Shine Bright ✨</text>
            </g>
          )}

          {/* CAKE STYLE 5: STRAWBERRY VELVET */}
          {cakeStyle === 'strawberryVelvet' && (
            <g id="style-strawberry-velvet">
              <path d="M60,140 L60,250 C60,270 115,280 180,280 C245,280 300,270 300,250 L300,140 Z" fill="url(#velvetGrad)" stroke="#991b1b" strokeWidth="2" />
              <ellipse cx="180" cy="140" rx="120" ry="30" fill="#fff1f2" stroke="#991b1b" strokeWidth="2" />
              {/* Fresh Strawberries */}
              {[105, 145, 180, 215, 255].map((cx, i) => (
                <g key={i} transform={`translate(${cx}, 132) scale(0.7)`}>
                  <path d="M0,0 C-12,-15 12,-15 0,0 C-15,18 15,18 0,0 Z" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1" />
                  <circle cx="-2" cy="4" r="1" fill="#fef08a" />
                  <circle cx="3" cy="-2" r="1" fill="#fef08a" />
                </g>
              ))}
              <text x="180" y="210" textAnchor="middle" fill="#ffffff" fontSize="15" fontFamily="Dancing Script, cursive" fontWeight="bold">Sweetest Love 🍓</text>
            </g>
          )}

          {/* CAKE STYLE 6: MIDNIGHT GALAXY */}
          {cakeStyle === 'midnightGalaxy' && (
            <g id="style-midnight-galaxy">
              <path d="M60,180 L60,255 C60,272 115,280 180,280 C245,280 300,272 300,255 L300,180 Z" fill="url(#galaxyGrad)" stroke="#312e81" strokeWidth="2" />
              <ellipse cx="180" cy="180" rx="120" ry="26" fill="#1e1b4b" stroke="#312e81" strokeWidth="2" />
              <path d="M95,115 L95,175 C95,190 135,198 180,198 C225,198 265,190 265,175 L265,115 Z" fill="url(#galaxyGrad)" stroke="#312e81" strokeWidth="2" />
              <ellipse cx="180" cy="115" rx="85" ry="18" fill="#312e81" stroke="#312e81" strokeWidth="2" />
              {/* Constellation Sparkles */}
              {[120, 160, 200, 240].map((x, i) => (
                <text key={i} x={x} y={150 + (i % 2) * 20} fill="#fef08a" fontSize="12">✨</text>
              ))}
            </g>
          )}

          {/* CAKE STYLE 7: MATCHA BLOSSOM */}
          {cakeStyle === 'matchaBlossom' && (
            <g id="style-matcha-blossom">
              <path d="M60,140 L60,250 C60,270 115,280 180,280 C245,280 300,270 300,250 L300,140 Z" fill="url(#matchaGrad)" stroke="#14532d" strokeWidth="2" />
              <ellipse cx="180" cy="140" rx="120" ry="30" fill="#f0fdf4" stroke="#14532d" strokeWidth="2" />
              {/* Cherry Blossoms */}
              {[100, 150, 210, 260].map((x, i) => (
                <circle key={i} cx={x} cy={160 + i * 20} r="7" fill="#fbcfe8" stroke="#f472b6" strokeWidth="1" />
              ))}
              <text x="180" y="142" textAnchor="middle" fill="#14532d" fontSize="13" fontFamily="Dancing Script, cursive" fontWeight="bold">Matcha Blossom 🌸</text>
            </g>
          )}

          {/* CAKE STYLE 8: CHOCOLATE FUDGE */}
          {cakeStyle === 'chocolateFudge' && (
            <g id="style-chocolate-fudge">
              <path d="M60,140 L60,250 C60,270 115,280 180,280 C245,280 300,270 300,250 L300,140 Z" fill="url(#chocolateGrad)" stroke="#290e02" strokeWidth="2" />
              <ellipse cx="180" cy="140" rx="120" ry="30" fill="#451a03" stroke="#290e02" strokeWidth="2" />
              <path d="M60,140 Q90,170 120,145 Q150,180 180,140 Q210,175 240,145 Q270,170 300,140 L300,160 C245,180 115,180 60,160 Z" fill="#78350f" opacity="0.9" />
              <text x="180" y="210" textAnchor="middle" fill="#fef08a" fontSize="15" fontFamily="Dancing Script, cursive" fontWeight="bold">Decadent Fudge 🍫</text>
            </g>
          )}

          {/* CAKE STYLE 9: PASTEL RAINBOW */}
          {cakeStyle === 'pastelRainbow' && (
            <g id="style-pastel-rainbow">
              <path d="M50,210 L50,260 C50,275 110,283 180,283 C250,283 310,275 310,260 L310,210 Z" fill="#fbcfe8" stroke="#f472b6" strokeWidth="2" />
              <ellipse cx="180" cy="210" rx="130" ry="25" fill="#bae6fd" stroke="#0284c7" strokeWidth="2" />
              <path d="M85,145 L85,195 C85,208 128,216 180,216 C232,216 275,208 275,195 L275,145 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="2" />
              <ellipse cx="180" cy="145" rx="95" ry="20" fill="#f5d0fe" stroke="#a855f7" strokeWidth="2" />
              <path d="M115,90 L115,130 C115,140 145,148 180,148 C215,148 245,140 245,130 L245,90 Z" fill="#bbf7d0" stroke="#16a34a" strokeWidth="2" />
              <ellipse cx="180" cy="90" rx="65" ry="15" fill="#ffffff" stroke="#16a34a" strokeWidth="2" />
            </g>
          )}

          {/* CAKE STYLE 10: OCEAN BREEZE */}
          {cakeStyle === 'oceanBreeze' && (
            <g id="style-ocean-breeze">
              <path d="M60,180 L60,255 C60,272 115,280 180,280 C245,280 300,272 300,255 L300,180 Z" fill="url(#oceanGrad)" stroke="#0891b2" strokeWidth="2" />
              <ellipse cx="180" cy="180" rx="120" ry="26" fill="#cff4fc" stroke="#0891b2" strokeWidth="2" />
              <path d="M95,115 L95,175 C95,190 135,198 180,198 C225,198 265,190 265,175 L265,115 Z" fill="url(#oceanGrad)" stroke="#0891b2" strokeWidth="2" />
              <ellipse cx="180" cy="115" rx="85" ry="18" fill="#e0f2fe" stroke="#0891b2" strokeWidth="2" />
              <text x="180" y="155" textAnchor="middle" fill="#0891b2" fontSize="12" fontFamily="Dancing Script, cursive" fontWeight="bold">Ocean Dreams 🌊</text>
            </g>
          )}

          {/* CAKE STYLE 11: VINTAGE COQUETTE */}
          {cakeStyle === 'vintageCoquette' && (
            <g id="style-vintage-coquette">
              <path d="M60,180 L60,255 C60,272 115,280 180,280 C245,280 300,272 300,255 L300,180 Z" fill="url(#pinkCakeGrad)" stroke="#be123c" strokeWidth="2" />
              <ellipse cx="180" cy="180" rx="120" ry="26" fill="#fbcfe8" stroke="#be123c" strokeWidth="2" />
              <path d="M95,115 L95,175 C95,190 135,198 180,198 C225,198 265,190 265,175 L265,115 Z" fill="url(#pinkCakeGrad)" stroke="#be123c" strokeWidth="2" />
              <ellipse cx="180" cy="115" rx="85" ry="18" fill="#ffffff" stroke="#be123c" strokeWidth="2" />
              {/* Red Cherries */}
              {[115, 180, 245].map((x, i) => (
                <circle key={i} cx={x} cy={110} r="5" fill="#dc2626" />
              ))}
            </g>
          )}

          {/* CAKE STYLE 12: CHOCOLATIER GOLD */}
          {cakeStyle === 'chocolatierGold' && (
            <g id="style-chocolatier-gold">
              <path d="M60,140 L60,250 C60,270 115,280 180,280 C245,280 300,270 300,250 L300,140 Z" fill="url(#chocolateGrad)" stroke="#18181b" strokeWidth="2" />
              <ellipse cx="180" cy="140" rx="120" ry="30" fill="#27272a" stroke="#18181b" strokeWidth="2" />
              <text x="180" y="142" textAnchor="middle" fill="#fef08a" fontSize="13" fontFamily="Dancing Script, cursive" fontWeight="bold">Golden Truffle 👑</text>
            </g>
          )}

          {/* CAKE STYLE 13: FAIRY GARDEN */}
          {cakeStyle === 'fairyGarden' && (
            <g id="style-fairy-garden">
              <path d="M60,140 L60,250 C60,270 115,280 180,280 C245,280 300,270 300,250 L300,140 Z" fill="url(#purpleTopGrad)" stroke="#6b21a8" strokeWidth="2" />
              <ellipse cx="180" cy="140" rx="120" ry="30" fill="#f5d0fe" stroke="#6b21a8" strokeWidth="2" />
              <text x="180" y="142" textAnchor="middle" fill="#6b21a8" fontSize="13" fontFamily="Dancing Script, cursive" fontWeight="bold">Fairy Garden 🧚‍♀️</text>
            </g>
          )}

          {/* CANDLES & FLAMES */}
          {candlePositions.map((c, i) => {
            const isCandleExtinguished = isBlown || blownCandles[i];

            return (
              <g
                key={c.id}
                onClick={(e) => {
                  e.stopPropagation();
                  handleCandleClick(i);
                }}
                className="cursor-pointer group"
              >
                {/* Candle Stand */}
                <ellipse cx={c.x} cy={c.y + 30} rx="5" ry="2" fill="#f472b6" stroke="#be123c" strokeWidth="1" />

                {/* Candle Body */}
                <rect
                  x={c.x - 3.5}
                  y={c.y}
                  width="7"
                  height="30"
                  rx="1.5"
                  fill="url(#pinkCandleGrad)"
                  stroke="#be123c"
                  strokeWidth="1"
                />

                {/* Candle Stripes */}
                <line x1={c.x - 3.5} y1={c.y + 6} x2={c.x + 3.5} y2={c.y + 11} stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
                <line x1={c.x - 3.5} y1={c.y + 16} x2={c.x + 3.5} y2={c.y + 21} stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.9" />

                {/* Wick */}
                <line x1={c.x} y1={c.y} x2={c.x} y2={c.y - 5} stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />

                {/* FLAME OR SMOKE */}
                {!isCandleExtinguished ? (
                  <g>
                    <circle cx={c.x} cy={c.y - 12} r="14" fill="#fbcfe8" opacity="0.5" filter="url(#pinkGlow)" />
                    <motion.g
                      animate={{
                        scale: [1, 1.15, 0.95, 1.1, 1],
                        rotate: [-2, 3, -1, 2, -2],
                        y: [0, -1.5, 0.5, -1, 0],
                      }}
                      transition={{
                        duration: 0.65,
                        repeat: Infinity,
                        delay: c.delay,
                        ease: 'easeInOut',
                      }}
                      style={{ originX: `${c.x}px`, originY: `${c.y - 5}px` }}
                    >
                      <path
                        d={`M${c.x},${c.y - 22}
                            C${c.x - 7},${c.y - 13} ${c.x - 5},${c.y - 5} ${c.x},${c.y - 5}
                            C${c.x + 5},${c.y - 5} ${c.x + 7},${c.y - 13} ${c.x},${c.y - 22} Z`}
                        fill="#f43f5e"
                        stroke="#e11d48"
                        strokeWidth="0.8"
                      />
                      <path
                        d={`M${c.x},${c.y - 18}
                            C${c.x - 4},${c.y - 11} ${c.x - 3},${c.y - 5} ${c.x},${c.y - 5}
                            C${c.x + 3},${c.y - 5} ${c.x + 4},${c.y - 11} ${c.x},${c.y - 18} Z`}
                        fill="#fde047"
                      />
                      <path
                        d={`M${c.x},${c.y - 13}
                            C${c.x - 2},${c.y - 9} ${c.x - 1.5},${c.y - 5} ${c.x},${c.y - 5}
                            C${c.x + 1.5},${c.y - 5} ${c.x + 2},${c.y - 9} ${c.x},${c.y - 13} Z`}
                        fill="#ffffff"
                      />
                    </motion.g>
                  </g>
                ) : (
                  <motion.g
                    initial={{ opacity: 0, scale: 0.4, y: 0 }}
                    animate={{
                      opacity: [0.9, 0.5, 0],
                      scale: [0.6, 1.8, 2.5],
                      y: [0, -25, -45],
                      x: [0, i === 0 ? -8 : i === 2 ? 8 : 2, i === 0 ? -16 : i === 2 ? 16 : 4],
                    }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    style={{ originX: `${c.x}px`, originY: `${c.y - 5}px` }}
                  >
                    <circle cx={c.x} cy={c.y - 5} r="1.5" fill="#f97316" />
                    <circle cx={c.x} cy={c.y - 12} r="5" fill="#f1f5f9" opacity="0.7" />
                    <circle cx={c.x + 2} cy={c.y - 18} r="7" fill="#e2e8f0" opacity="0.5" />
                  </motion.g>
                )}
              </g>
            );
          })}
        </svg>
      </motion.div>

      {/* Interactive Microphone & Blow Controls */}
      <div className="mt-4 flex flex-col items-center gap-3 z-30 w-full max-w-sm">
        {allCandlesExtinguished ? (
          <div className="text-center mb-1 flex flex-col items-center gap-2">
            <p className="text-pink-400 font-script text-2xl sm:text-3xl font-bold drop-shadow-[0_0_15px_rgba(244,63,94,0.8)]">
              Your birthday wish is set in the stars! ✨
            </p>
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setBlownCandles([false, false, false])}
              className="mt-2 px-4 py-2 text-xs font-semibold text-pink-300 hover:text-white bg-slate-900/80 hover:bg-slate-900 rounded-xl border border-pink-500/40 shadow-xs transition-colors cursor-pointer"
            >
              Relight All Candles
            </motion.button>
          </div>
        ) : (
          <>
            {/* Live Microphone Status Banner */}
            {isListening ? (
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-emerald-500/50 backdrop-blur-md shadow-[0_0_15px_rgba(16,185,129,0.25)] text-xs text-emerald-200">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-medium">Mic Active: Blow into your phone!</span>
                {/* Responsive sound energy meter */}
                <div className="w-14 h-2 bg-slate-800 rounded-full overflow-hidden border border-emerald-500/30 shrink-0">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-pink-500 transition-all duration-75"
                    style={{ width: `${Math.min(100, Math.max(8, micVolume))}%` }}
                  />
                </div>
              </div>
            ) : !permissionError && enableMic ? (
              <button
                type="button"
                onClick={() => enableMic()}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-pink-400/40 text-xs font-semibold text-pink-300 hover:text-white transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95"
              >
                <span>🎤</span>
                <span>Mic Not Active — Click to Enable</span>
              </button>
            ) : permissionError ? (
              <span className="text-[11px] text-pink-300/80 text-center bg-slate-900/60 px-3 py-1 rounded-full border border-pink-500/20">
                Tap any candle or the button below to blow them out! ✨
              </span>
            ) : null}

            {/* Primary Action Button */}
            <div className="flex flex-wrap items-center justify-center gap-2.5">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleBlowAll}
                className="px-6 py-2.5 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-2xl shadow-[0_0_25px_rgba(244,63,94,0.5)] transition-all text-sm sm:text-base flex items-center gap-2 cursor-pointer border border-white/30"
              >
                <span>🎂</span>
                <span>Make a Wish (Blow Candles)</span>
              </motion.button>
            </div>

            <p className="text-[11px] text-pink-200/60 text-center">
              Tap the cake, tap each flame, or click the button to extinguish them
            </p>
          </>
        )}
      </div>
    </div>
  );
};
