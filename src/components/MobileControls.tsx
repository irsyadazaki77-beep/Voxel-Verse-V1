import React, { useRef, useEffect } from 'react';

interface MobileControlsProps {
  onMove: (forward: number, strafe: number) => void;
  onLook: (dx: number, dy: number) => void;
  onJump: (active: boolean) => void;
  onSprint: (active: boolean) => void;
  onAttack: (active: boolean) => void;
  onPlace: (active: boolean) => void;
  onOpenInventory: () => void;
  onOpenCrafting: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMove,
  onLook,
  onJump,
  onSprint,
  onAttack,
  onPlace,
  onOpenInventory,
  onOpenCrafting,
}) => {
  const joystickRef = useRef<HTMLDivElement>(null);
  const movementTouchId = useRef<number | null>(null);
  const lookTouchId = useRef<number | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const lookLastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    // Clear inputs on unmount
    return () => {
      onMove(0, 0);
      onJump(false);
      onSprint(false);
      onAttack(false);
      onPlace(false);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    // We let touch start propagate if it's UI buttons, but for the container we capture look touches
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      // Only capture look if we don't have one and it's on the right half of the screen
      // OR just any touch on the background container that isn't the joystick.
      const target = touch.target as HTMLElement;
      if (!target.closest('.action-btn') && !target.closest('.joystick-zone')) {
        if (lookTouchId.current === null) {
          lookTouchId.current = touch.identifier;
          lookLastPos.current = { x: touch.clientX, y: touch.clientY };
        }
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      
      if (touch.identifier === movementTouchId.current && touchStartPos.current) {
        const dx = touch.clientX - touchStartPos.current.x;
        const dy = touch.clientY - touchStartPos.current.y;
        const maxRadius = 45;

        const clampedX = Math.max(-1, Math.min(1, dx / maxRadius));
        const clampedY = Math.max(-1, Math.min(1, dy / maxRadius));
        
        onMove(-clampedY, clampedX);
      }
      
      if (touch.identifier === lookTouchId.current && lookLastPos.current) {
        const dx = touch.clientX - lookLastPos.current.x;
        const dy = touch.clientY - lookLastPos.current.y;
        lookLastPos.current = { x: touch.clientX, y: touch.clientY };
        
        // Multiplier for mobile sensitivity
        onLook(dx, dy);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === movementTouchId.current) {
        movementTouchId.current = null;
        touchStartPos.current = null;
        onMove(0, 0);
      }
      if (touch.identifier === lookTouchId.current) {
        lookTouchId.current = null;
        lookLastPos.current = null;
      }
    }
  };

  const handleJoystickTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (movementTouchId.current === null) {
        movementTouchId.current = touch.identifier;
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const preventDefault = (e: React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
  };

  return (
    <div 
      id="mobile-controls-container" 
      className="absolute inset-0 z-20 md:hidden flex flex-col justify-between p-4 select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Top Mobile Quick Buttons */}
      <div className="flex justify-end gap-2 pointer-events-auto action-btn">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenInventory(); }}
          onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onOpenInventory(); }}
          className="w-11 h-11 bg-black/50 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center text-xs font-bold active:bg-white/20"
        >
          INV
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpenCrafting(); }}
          onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onOpenCrafting(); }}
          className="w-11 h-11 bg-black/50 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center text-xs font-bold active:bg-white/20"
        >
          CRAFT
        </button>
      </div>

      {/* Bottom Controls (Joystick on left, action buttons on right) */}
      <div className="flex items-end justify-between w-full pointer-events-none pb-6">
        {/* Virtual Joystick */}
        <div
          ref={joystickRef}
          onTouchStart={handleJoystickTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="w-32 h-32 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center relative touch-none pointer-events-auto joystick-zone"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 border border-white/30 shadow-inner pointer-events-none"></div>
        </div>

        {/* Action Buttons (Jump, Mine, Place) */}
        <div className="flex flex-col gap-2.5 items-end pointer-events-auto action-btn">
          <div className="flex gap-2">
            <button
              onTouchStart={(e) => { preventDefault(e); onAttack(true); }}
              onTouchEnd={(e) => { preventDefault(e); onAttack(false); }}
              onTouchCancel={(e) => { preventDefault(e); onAttack(false); }}
              className="w-14 h-14 rounded-2xl bg-rose-500/40 backdrop-blur-md border border-rose-400/40 flex items-center justify-center font-bold text-xs active:scale-90 transition-all text-white shadow-lg touch-none"
            >
              MINE
            </button>
            <button
              onTouchStart={(e) => { preventDefault(e); onPlace(true); }}
              onTouchEnd={(e) => { preventDefault(e); onPlace(false); }}
              onTouchCancel={(e) => { preventDefault(e); onPlace(false); }}
              className="w-14 h-14 rounded-2xl bg-sky-500/40 backdrop-blur-md border border-sky-400/40 flex items-center justify-center font-bold text-xs active:scale-90 transition-all text-white shadow-lg touch-none"
            >
              PLACE
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onTouchStart={(e) => { preventDefault(e); onSprint(true); }}
              onTouchEnd={(e) => { preventDefault(e); onSprint(false); }}
              onTouchCancel={(e) => { preventDefault(e); onSprint(false); }}
              className="w-12 h-12 rounded-2xl bg-amber-500/40 backdrop-blur-md border border-amber-400/40 flex items-center justify-center font-bold text-[10px] active:scale-90 transition-all text-white shadow-lg touch-none"
            >
              RUN
            </button>
            <button
              onTouchStart={(e) => { preventDefault(e); onJump(true); }}
              onTouchEnd={(e) => { preventDefault(e); onJump(false); }}
              onTouchCancel={(e) => { preventDefault(e); onJump(false); }}
              className="w-14 h-14 rounded-2xl bg-emerald-500/40 backdrop-blur-md border border-emerald-400/40 flex items-center justify-center font-bold text-xs active:scale-90 transition-all text-white shadow-lg touch-none"
            >
              JUMP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
