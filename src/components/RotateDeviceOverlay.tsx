import React from 'react';
import { Smartphone, RotateCw, Maximize2 } from 'lucide-react';
import { VoxelVerseLogo } from './VoxelVerseLogo';

interface RotateDeviceOverlayProps {
  onRotateClick?: () => void;
  onFullscreenClick?: () => void;
}

export const RotateDeviceOverlay: React.FC<RotateDeviceOverlayProps> = ({
  onRotateClick,
  onFullscreenClick,
}) => {
  return (
    <div 
      id="rotate-device-landscape-overlay"
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-[#07090e]/95 backdrop-blur-xl p-6 text-center select-none animate-fade-in"
      style={{
        paddingTop: 'max(24px, env(safe-area-inset-top))',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(24px, env(safe-area-inset-left))',
        paddingRight: 'max(24px, env(safe-area-inset-right))',
      }}
    >
      <div className="max-w-sm w-full flex flex-col items-center gap-6">
        
        {/* Logo */}
        <VoxelVerseLogo size="md" variant="full" />

        {/* Animated Rotate Phone Icon Graphic */}
        <div className="relative w-28 h-28 flex items-center justify-center my-2">
          {/* Pulsing Aura */}
          <div className="absolute inset-0 rounded-full bg-sky-500/15 animate-ping duration-1000" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-sky-500/20 via-indigo-500/20 to-emerald-500/20 border border-sky-400/30 backdrop-blur-md" />
          
          {/* Rotating Device Graphic */}
          <div className="relative flex items-center justify-center animate-bounce">
            <Smartphone className="w-14 h-14 text-sky-400 transform -rotate-90 transition-transform" />
            <RotateCw className="absolute w-7 h-7 text-emerald-300 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
        </div>

        {/* Heading & Instructions */}
        <div className="space-y-2">
          <h2 className="text-xl font-black uppercase tracking-wider text-white">
            Putar Perangkat ke Mode Landscape
          </h2>
          <p className="text-xs text-zinc-300 leading-relaxed max-w-xs mx-auto">
            VoxelVerse dirancang khusus untuk tampilan <strong className="text-sky-400 font-bold">Landscape (Mendatar)</strong> agar joystick, kamera, dan kontrol tombol nyaman di kedua ibu jari.
          </p>
        </div>

        {/* Helper Action Buttons */}
        <div className="flex flex-col w-full gap-3 pt-2">
          {onRotateClick && (
            <button
              id="btn-request-landscape"
              onClick={onRotateClick}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(56,189,248,0.4)] flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>Kunci Mode Landscape</span>
            </button>
          )}

          {onFullscreenClick && (
            <button
              id="btn-request-fullscreen"
              onClick={onFullscreenClick}
              className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-zinc-200 hover:text-white font-semibold text-xs tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Maximize2 className="w-4 h-4 text-sky-400" />
              <span>Masuk Layar Penuh (Fullscreen)</span>
            </button>
          )}
        </div>

        {/* Hint footer */}
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest pt-2">
          [ Putar HP Anda ke Posisi Horizontal ]
        </div>
      </div>
    </div>
  );
};
