// Overhauled Game Pause & System Menu (Phase 9)
import React, { useState } from 'react';
import { SettingsModal } from './SettingsModal';
import { VoxelVerseLogo } from './VoxelVerseLogo';
import { Loader2, Play, Settings, Globe, LogOut } from 'lucide-react';

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
    <div id="modal-pause-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in font-sans select-none">
      <div className="w-full max-w-sm bg-[#0a101c] rounded-xl border border-sky-400/20 p-6 shadow-2xl text-slate-100 space-y-5 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/60 to-transparent pointer-events-none" />
        {/* Header */}
        <div className="text-center space-y-2 flex flex-col items-center">
          <VoxelVerseLogo size="md" variant="full" />
          <div className="inline-block px-3 py-0.5 rounded-md bg-sky-500/10 border border-sky-400/25 text-[10px] uppercase font-mono font-bold text-sky-300 tracking-wider">
            {isMultiplayer ? 'Multiplayer Session' : 'Game Suspended'}
          </div>
        </div>

        {/* Save Error Notice */}
        {saveError && (
          <div className="p-3 bg-rose-500/15 border border-rose-500/40 rounded-lg text-rose-200 text-xs text-center space-y-1 animate-fade-in">
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
            className="w-full py-3 bg-gradient-to-b from-[#2563eb] to-[#1d4ed8] hover:from-[#3b82f6] hover:to-[#2563eb] disabled:opacity-50 disabled:cursor-not-allowed text-white border border-sky-300/35 rounded-lg font-bold text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Resume Journey</span>
          </button>

          <button
            onClick={() => setShowSettings(true)}
            disabled={isSaving}
            className="w-full py-2.5 bg-[#10192b] hover:bg-[#162238] disabled:opacity-50 disabled:cursor-not-allowed border border-sky-400/15 text-slate-200 rounded-lg font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Settings className="w-3.5 h-3.5 text-sky-400" />
            <span>Settings & Accessibility</span>
          </button>

          {onOpenMultiplayerLobby && (
            <button
              onClick={onOpenMultiplayerLobby}
              disabled={isSaving}
              className="w-full py-2.5 bg-[#10192b] hover:bg-[#162238] disabled:opacity-50 disabled:cursor-not-allowed border border-sky-400/20 text-sky-200 rounded-lg font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>Multiplayer Lobby</span>
            </button>
          )}

          <button
            id="btn-save-quit"
            onClick={onSaveAndQuit}
            disabled={isSaving}
            className="w-full py-2.5 bg-rose-950/35 hover:bg-rose-900/45 disabled:opacity-60 disabled:cursor-wait border border-rose-500/25 text-rose-200 rounded-lg font-semibold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-300" />
                <span>Saving World to Disk...</span>
              </>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5 text-rose-300" />
                <span>Save & Exit to Main Menu</span>
              </>
            )}
          </button>
        </div>

        <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    </div>
  );
};
