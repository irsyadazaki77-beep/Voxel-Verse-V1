import React from 'react';

export interface TouchDebugData {
  activeTouches: { id: number; x: number; y: number; role: string }[];
  moveVector: { x: number; z: number };
  lookDelta: { dx: number; dy: number };
  activeButtons: string[];
  isAutoSprinting: boolean;
  fps?: number;
}

interface TouchDebugOverlayProps {
  data: TouchDebugData | null;
  onClose?: () => void;
}

export const TouchDebugOverlay: React.FC<TouchDebugOverlayProps> = ({ data, onClose }) => {
  if (!data) return null;

  return (
    <div
      id="touch-debug-overlay"
      className="absolute top-16 left-3 z-40 bg-black/85 backdrop-blur-md border border-cyan-500/40 rounded-xl p-3 text-[11px] font-mono text-cyan-200 shadow-2xl max-w-xs select-none pointer-events-auto"
    >
      <div className="flex items-center justify-between border-b border-cyan-500/30 pb-1 mb-2">
        <span className="font-bold tracking-wider text-cyan-300">TOUCH TELEMETRY</span>
        <div className="flex items-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-300 text-[9px]">DEBUG</span>
          {onClose && (
            <button
              onClick={onClose}
              className="text-cyan-400/80 hover:text-cyan-200 px-1 hover:bg-white/10 rounded cursor-pointer text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="text-white/60">Touches Active:</span>
          <span className="font-bold text-white">{data.activeTouches.length}</span>
        </div>

        {data.activeTouches.map((t) => (
          <div key={t.id} className="text-[10px] text-white/70 pl-2 flex justify-between">
            <span>ID #{t.id} ({t.role}):</span>
            <span className="font-mono text-cyan-300">{Math.round(t.x)}, {Math.round(t.y)}</span>
          </div>
        ))}

        <div className="border-t border-white/10 pt-1 mt-1">
          <div className="flex justify-between">
            <span className="text-white/60">Move (X / Z):</span>
            <span className="font-bold text-emerald-300">
              {data.moveVector.x.toFixed(2)}, {data.moveVector.z.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-white/60">Auto-Sprint:</span>
            <span className={`font-bold ${data.isAutoSprinting ? 'text-amber-400' : 'text-white/40'}`}>
              {data.isAutoSprinting ? 'ACTIVE' : 'OFF'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-white/60">Look Delta (dX / dY):</span>
            <span className="font-bold text-sky-300">
              {data.lookDelta.dx.toFixed(1)}, {data.lookDelta.dy.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="border-t border-white/10 pt-1 mt-1">
          <span className="text-white/60 block mb-0.5">Pressed Actions:</span>
          <div className="flex flex-wrap gap-1">
            {data.activeButtons.length === 0 ? (
              <span className="text-white/30 text-[10px]">None</span>
            ) : (
              data.activeButtons.map((btn) => (
                <span
                  key={btn}
                  className="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[9px] font-bold"
                >
                  {btn}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
