// Death & Respawn Modal 2.0 with Survival Score & Recovery Pipeline
import React from 'react';

interface DeathModalProps {
  score: number;
  level: number;
  daysSurvived: number;
  deathReason?: string;
  onRespawn: () => void;
  onExitToMenu: () => void;
}

export const DeathModal: React.FC<DeathModalProps> = ({
  score,
  level,
  daysSurvived,
  deathReason = 'Fell victim to the harsh frontier',
  onRespawn,
  onExitToMenu,
}) => {
  return (
    <div id="modal-death-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-rose-950/80 backdrop-blur-xl p-4 animate-fade-in font-sans">
      <div
        id="modal-death-card"
        className="w-full max-w-lg bg-[#140b0f]/95 rounded-2xl border border-rose-500/30 p-8 shadow-2xl text-white text-center flex flex-col items-center gap-6 relative"
      >
        <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(244,63,94,0.4)] animate-pulse">
          ☠️
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black uppercase tracking-wider text-rose-400">You Died</h2>
          <p className="text-xs text-white/60 font-mono italic">{deathReason}</p>
        </div>

        {/* Survival Metrics */}
        <div className="grid grid-cols-3 gap-3 w-full bg-black/40 p-4 rounded-xl border border-white/5">
          <div>
            <span className="text-[9px] uppercase font-bold text-white/40 block">Score</span>
            <span className="text-sm font-mono font-bold text-amber-300">{score}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-white/40 block">Level</span>
            <span className="text-sm font-mono font-bold text-sky-400">{level}</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-white/40 block">Days</span>
            <span className="text-sm font-mono font-bold text-emerald-400">{daysSurvived}</span>
          </div>
        </div>

        {/* Respawn / Menu Action Buttons */}
        <div className="flex flex-col gap-3 w-full">
          <button
            id="btn-respawn"
            onClick={onRespawn}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-rose-600/30 active:scale-95 transition-all cursor-pointer"
          >
            Reconstitute & Respawn
          </button>
          <button
            id="btn-exit-menu-death"
            onClick={onExitToMenu}
            className="w-full py-3 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs font-semibold tracking-wide border border-white/10 active:scale-95 transition-all cursor-pointer"
          >
            Exit to Main Realm Menu
          </button>
        </div>
      </div>
    </div>
  );
};
