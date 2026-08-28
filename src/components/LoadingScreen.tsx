// Stage-Based Professional Game Loading Screen
import React from 'react';

interface LoadingScreenProps {
  worldName: string;
  seed: number;
  stageName: string;
  progressPercent: number;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  worldName,
  seed,
  stageName,
  progressPercent,
}) => {
  return (
    <div id="loading-screen" className="fixed inset-0 z-50 flex flex-col justify-between p-12 bg-[#08090d] text-white font-sans select-none animate-fade-in">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10 backdrop-blur-md">
          <div className="w-3 h-3 rounded-md bg-sky-400 animate-pulse shadow-[0_0_12px_rgba(56,189,248,0.8)]"></div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-white/90">VoxelVerse Engine</h1>
            <span className="text-[9px] uppercase font-mono tracking-wider text-sky-400">Phase 9 Game Architecture</span>
          </div>
        </div>

        <div className="text-xs font-mono text-white/40">
          Seed: {seed}
        </div>
      </div>

      {/* Center Animated Voxel Spinner & World Name */}
      <div className="my-auto max-w-md mx-auto text-center space-y-6">
        <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl border-2 border-sky-400/30 animate-spin"></div>
          <div className="w-12 h-12 bg-sky-500/20 rounded-xl border border-sky-400 flex items-center justify-center text-xl font-black text-sky-300 shadow-[0_0_20px_rgba(56,189,248,0.4)]">
            🧊
          </div>
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
              style={{ width: `${Math.max(2, Math.min(100, progressPercent))}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Bottom Tip */}
      <div className="text-center text-xs text-white/40 font-mono">
        💡 <span className="text-white/60">Tip:</span> Craft thermal insulation gear before exploring the Glacial Peak or Infernal Crags!
      </div>
    </div>
  );
};
