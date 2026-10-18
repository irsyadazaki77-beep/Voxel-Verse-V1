// Overhauled Game Pause & System Menu (Phase 9)
import React, { useState } from 'react';
import { SettingsModal } from './SettingsModal';
import { VoxelVerseLogo } from './VoxelVerseLogo';
import { Loader2 } from 'lucide-react';

interface PauseMenuProps {
  onResume: () => void;
  onSaveAndQuit: () => void;
  onOpenMultiplayerLobby?: () => void;
  isMultiplayer?: boolean;
  isSaving?: boolean;
  saveError?: string | null;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onSaveAndQuit,
  onOpenMultiplayerLobby,
  isMultiplayer = false,
  isSaving = false,
  saveError,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div id="modal-pause-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans select-none">
      <div className="w-full max-w-sm bg-[#0c0e14] rounded-3xl border border-white/15 p-6 shadow-2xl text-white space-y-5">
        {/* Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <VoxelVerseLogo size="md" variant="full" />
          <div className="inline-block px-3 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-[10px] uppercase font-mono font-bold text-sky-400 tracking-wider">
            {isMultiplayer ? 'Multiplayer Session' : 'Game Suspended'}
          </div>
        </div>

        {/* Save Error Notice */}
        {saveError && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-2xl text-rose-200 text-xs text-center space-y-1 animate-fade-in">
            <p className="font-bold text-rose-300">Penyimpanan Tertunda / Error</p>
            <p className="text-[11px] opacity-90">{saveError}</p>
            <p className="text-[10px] text-white/60">Progres pemain tetap aman di memori sesi saat ini.</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            id="btn-resume-game"
            onClick={onResume}
            disabled={isSaving}
            className="w-full py-3 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 text-white rounded-2xl font-bold text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer"
          >
            ▶ Resume Journey
          </button>

          <button
            onClick={() => setShowSettings(true)}
            disabled={isSaving}
            className="w-full py-2.5 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 text-white/90 rounded-2xl font-bold text-xs transition-all cursor-pointer"
          >
            ⚙ Settings & Accessibility
          </button>

          {onOpenMultiplayerLobby && (
            <button
              onClick={onOpenMultiplayerLobby}
              disabled={isSaving}
              className="w-full py-2.5 bg-emerald-950/40 hover:bg-emerald-900/60 disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500/30 text-emerald-300 rounded-2xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>🌐 Multiplayer Test Harness</span>
            </button>
          )}

          <button
            id="btn-save-quit"
            onClick={onSaveAndQuit}
            disabled={isSaving}
            className="w-full py-2.5 bg-rose-500/20 hover:bg-rose-500/30 disabled:bg-rose-500/10 disabled:opacity-60 disabled:cursor-wait border border-rose-500/30 text-rose-300 rounded-2xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-300" />
                <span>Saving World to Disk...</span>
              </>
            ) : (
              <span>Save & Exit to Main Menu</span>
            )}
          </button>
        </div>

        <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    </div>
  );
};
