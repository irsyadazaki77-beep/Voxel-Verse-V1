// Stage-Based Professional Game Loading Screen with Escape Hatch & Dynamic Tips
import React, { useState, useEffect } from 'react';
import { VoxelVerseLogo } from './VoxelVerseLogo';

interface LoadingScreenProps {
  worldName: string;
  seed: number;
  stageName: string;
  progressPercent: number;
  onExit?: () => void;
  onForceEnter?: () => void;
}

const GAME_TIPS = [
  "Craft thermal insulation gear before exploring the Glacial Peak or Infernal Crags!",
  "Smelt ores in the Furnace to forge reinforced tools and armor.",
  "Construct an Aether Conduit network to automate resource processing.",
  "Dungeons hold ancient relics and rare boss contracts.",
  "Press [E] to open your inventory and [F] to toggle third-person view.",
  "Beds set your respawn point and let you sleep through dangerous nights."
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  worldName,
  seed,
  stageName,
  progressPercent,
  onExit,
  onForceEnter,
}) => {
  const [tipIndex, setTipIndex] = useState(0);
  const [isTakingLong, setIsTakingLong] = useState(false);

  useEffect(() => {
    const tipTimer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % GAME_TIPS.length);
    }, 4000);

    const longTimer = setTimeout(() => {
      setIsTakingLong(true);
    }, 2500);

    return () => {
      clearInterval(tipTimer);
      clearTimeout(longTimer);
    };
  }, []);

  return (
    <div id="loading-screen" className="fixed inset-0 z-50 flex flex-col justify-between p-8 md:p-12 bg-[#08090d] text-white font-sans select-none animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <VoxelVerseLogo size="sm" variant="full" />

        <div className="flex items-center gap-4">
          <div className="text-xs font-mono text-white/40">
            Seed: {seed}
          </div>
          {onExit && (
            <button
              id="loading-screen-exit-btn"
              onClick={onExit}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 hover:text-white rounded text-xs font-mono transition-colors border border-white/10 cursor-pointer"
            >
              Cancel / Menu
            </button>
          )}
        </div>
      </div>

      {/* Center Animated Voxel Logo & World Name */}
      <div className="my-auto max-w-md w-full mx-auto text-center space-y-6">
        <div className="flex justify-center">
          <VoxelVerseLogo size="xl" variant="icon" animated={true} />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight text-white">{worldName}</h2>
          <p className="text-xs text-white/50 font-mono">Building Infinite Voxel Space & Dungeons</p>
        </div>

        {/* Stage Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-sky-300 uppercase font-bold">{stageName}</span>
            <span className="text-white/70">{Math.round(progressPercent)}%</span>
          </div>

          <div className="w-full h-2.5 bg-white/5 rounded-full p-0.5 border border-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(56,189,248,0.5)]"
              style={{ width: `${Math.max(4, Math.min(100, progressPercent))}%` }}
            ></div>
          </div>
        </div>

        {(isTakingLong || progressPercent >= 85) && (
          <div className="flex flex-col items-center justify-center gap-2 pt-2 text-xs font-mono animate-fade-in">
            <span className="text-amber-400 font-semibold">World generated & pre-warmed.</span>
            {onForceEnter && (
              <button
                id="loading-force-enter-btn"
                onClick={onForceEnter}
                className="px-5 py-2 bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-white font-bold rounded-xl transition shadow-lg shadow-sky-500/20 active:scale-95 cursor-pointer uppercase tracking-wider text-[11px]"
              >
                🎮 Enter World Now
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom Tip */}
      <div className="text-center text-xs text-white/40 font-mono min-h-[24px]">
        💡 <span className="text-white/60">Tip:</span> {GAME_TIPS[tipIndex]}
      </div>
    </div>
  );
};
