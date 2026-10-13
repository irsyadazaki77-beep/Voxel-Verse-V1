// Stage-Based Professional Game Loading Screen with Error Recovery & Dynamic Tips
import React, { useState, useEffect } from 'react';
import { VoxelVerseLogo } from './VoxelVerseLogo';
import { AlertTriangle, RefreshCw, LogOut, ShieldCheck } from 'lucide-react';

interface LoadingScreenProps {
  worldName: string;
  seed: number;
  stageName: string;
  progressPercent: number;
  errorMessage?: string | null;
  recoverySnapshotLayer?: string | null;
  onExit?: () => void;
  onRetry?: () => void;
  onRecoverSnapshot?: () => void;
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
  errorMessage,
  recoverySnapshotLayer,
  onExit,
  onRetry,
  onRecoverSnapshot,
}) => {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const tipTimer = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % GAME_TIPS.length);
    }, 4000);

    return () => {
      clearInterval(tipTimer);
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
          {onExit && !errorMessage && (
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
          <VoxelVerseLogo size="xl" variant="icon" animated={!errorMessage} />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight text-white">{worldName}</h2>
          <p className="text-xs text-white/50 font-mono">Building Infinite Voxel Space & Dungeons</p>
        </div>

        {/* Error / Recoverable Error State */}
        {errorMessage ? (
          <div className="bg-rose-500/10 border border-rose-500/30 p-5 rounded-2xl text-left space-y-4 backdrop-blur-md animate-fade-in">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Initialization Failed</span>
            </div>
            <p className="text-xs text-rose-200/90 leading-relaxed font-mono">
              {errorMessage}
            </p>

            {recoverySnapshotLayer && onRecoverSnapshot && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Historical Backup Available</span>
                </div>
                <p className="text-[11px] text-white/70">
                  A healthy recovery snapshot ({recoverySnapshotLayer}) is available. You can restore this world from backup.
                </p>
                <button
                  onClick={onRecoverSnapshot}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-black font-bold rounded-lg text-xs cursor-pointer shadow transition-all flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Restore World from Backup
                </button>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex-1 py-2 bg-white/10 hover:bg-white/20 active:scale-98 text-white font-bold rounded-lg text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Loading
                </button>
              )}
              {onExit && (
                <button
                  onClick={onExit}
                  className="flex-1 py-2 bg-white/5 hover:bg-white/10 active:scale-98 text-white/70 hover:text-white rounded-lg text-xs font-mono cursor-pointer transition-all flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Return to Menu
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Stage Progress Bar */
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
        )}
      </div>

      {/* Bottom Tip */}
      <div className="text-center text-xs text-white/40 font-mono min-h-[24px]">
        💡 <span className="text-white/60">Tip:</span> {GAME_TIPS[tipIndex]}
      </div>
    </div>
  );
};
