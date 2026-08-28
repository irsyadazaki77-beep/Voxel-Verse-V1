// Minimal Utility Mobile On-Screen Touch Controls
import React, { useRef } from 'react';

interface MobileControlsProps {
  onMove: (forward: number, strafe: number) => void;
  onJump: () => void;
  onSprint: () => void;
  onAttack: () => void;
  onPlace: () => void;
  onOpenInventory: () => void;
  onOpenCrafting: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMove,
  onJump,
  onSprint,
  onAttack,
  onPlace,
  onOpenInventory,
  onOpenCrafting,
}) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;
    const maxRadius = 45;

    const clampedX = Math.max(-1, Math.min(1, dx / maxRadius));
    const clampedY = Math.max(-1, Math.min(1, dy / maxRadius));

    onMove(-clampedY, clampedX);
  };

  const handleTouchEnd = () => {
    touchStartPos.current = null;
    onMove(0, 0);
  };

  return (
    <div id="mobile-controls-container" className="absolute inset-0 pointer-events-none z-20 md:hidden flex flex-col justify-between p-4 select-none">
      {/* Top Mobile Quick Buttons */}
      <div className="flex justify-end gap-2 pointer-events-auto">
        <button
          onClick={onOpenInventory}
          className="w-11 h-11 bg-black/50 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center text-xs font-bold active:bg-white/20"
        >
          INV
        </button>
        <button
          onClick={onOpenCrafting}
          className="w-11 h-11 bg-black/50 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center text-xs font-bold active:bg-white/20"
        >
          CRAFT
        </button>
      </div>

      {/* Bottom Controls (Joystick on left, action buttons on right) */}
      <div className="flex items-end justify-between w-full pointer-events-auto pb-6">
        {/* Virtual Joystick */}
        <div
          ref={joystickRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="w-28 h-28 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center relative touch-none"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 border border-white/30 shadow-inner"></div>
        </div>

        {/* Action Buttons (Jump, Mine, Place) */}
        <div className="flex flex-col gap-2.5 items-end">
          <div className="flex gap-2">
            <button
              onTouchStart={onAttack}
              className="w-14 h-14 rounded-2xl bg-rose-500/40 backdrop-blur-md border border-rose-400/40 flex items-center justify-center font-bold text-xs active:scale-90 transition-all text-white shadow-lg"
            >
              MINE
            </button>
            <button
              onTouchStart={onPlace}
              className="w-14 h-14 rounded-2xl bg-sky-500/40 backdrop-blur-md border border-sky-400/40 flex items-center justify-center font-bold text-xs active:scale-90 transition-all text-white shadow-lg"
            >
              PLACE
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onTouchStart={onSprint}
              className="w-12 h-12 rounded-2xl bg-amber-500/40 backdrop-blur-md border border-amber-400/40 flex items-center justify-center font-bold text-[10px] active:scale-90 transition-all text-white shadow-lg"
            >
              RUN
            </button>
            <button
              onTouchStart={onJump}
              className="w-14 h-14 rounded-2xl bg-emerald-500/40 backdrop-blur-md border border-emerald-400/40 flex items-center justify-center font-bold text-xs active:scale-90 transition-all text-white shadow-lg"
            >
              JUMP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
