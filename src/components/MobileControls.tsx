import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Sword, 
  Hammer, 
  ArrowUp, 
  Zap, 
  ShieldAlert, 
  Package, 
  Camera, 
  Menu, 
  Map, 
  BookOpen, 
  Maximize2,
  ChevronDown
} from 'lucide-react';
import { requestFullscreenMode } from '../utils/orientation';
import { SettingsManager, MobileControlsSettings } from '../engine/ui/SettingsManager';
import { triggerHaptic } from '../utils/haptics';
import { TouchDebugData } from './TouchDebugOverlay';

interface MobileControlsProps {
  onMove: (forward: number, strafe: number) => void;
  onLook: (dx: number, dy: number) => void;
  onJump: (active: boolean) => void;
  onSprint: (active: boolean) => void;
  onCrouch?: (active: boolean) => void;
  onAttack: (active: boolean) => void;
  onPlace: (active: boolean) => void;
  onOpenInventory: () => void;
  onOpenCrafting: () => void;
  onToggleCamera?: () => void;
  onOpenPause?: () => void;
  onOpenMap?: () => void;
  onOpenJournal?: () => void;
  breakProgress?: number; // 0..1
  isBlocked?: boolean;
  onTelemetryUpdate?: (data: TouchDebugData) => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({
  onMove,
  onLook,
  onJump,
  onSprint,
  onCrouch,
  onAttack,
  onPlace,
  onOpenInventory,
  onOpenCrafting,
  onToggleCamera,
  onOpenPause,
  onOpenMap,
  onOpenJournal,
  breakProgress = 0,
  isBlocked = false,
  onTelemetryUpdate,
}) => {
  const [mobileSettings, setMobileSettings] = useState<MobileControlsSettings>(
    SettingsManager.get().mobileControls
  );

  // Subscribe to settings updates
  useEffect(() => {
    return SettingsManager.subscribe((s) => {
      setMobileSettings(s.mobileControls);
    });
  }, []);

  // Joystick state refs
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const movementTouchId = useRef<number | null>(null);
  const joystickCenter = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dynamicJoystickPos, setDynamicJoystickPos] = useState<{ x: number; y: number } | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  const [isAutoSprinting, setIsAutoSprinting] = useState(false);

  // Camera look state refs
  const lookTouchId = useRef<number | null>(null);
  const lookLastPos = useRef<{ x: number; y: number } | null>(null);
  const lookSmoothedDelta = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  // Action touches tracking for seamless multitouch
  const actionTouchMap = useRef<{ [key: number]: string }>({});

  // Button visual tactile states
  const [isAttacking, setIsAttacking] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [isSprintingManual, setIsSprintingManual] = useState(false);
  const [isCrouching, setIsCrouching] = useState(false);

  // Reset all inputs safely
  const resetAllInputs = useCallback(() => {
    movementTouchId.current = null;
    lookTouchId.current = null;
    lookLastPos.current = null;
    lookSmoothedDelta.current = { dx: 0, dy: 0 };
    actionTouchMap.current = {};
    setKnobOffset({ x: 0, y: 0 });
    setDynamicJoystickPos(null);
    setIsJoystickActive(false);
    setIsAutoSprinting(false);
    setIsAttacking(false);
    setIsPlacing(false);
    setIsJumping(false);
    setIsSprintingManual(false);
    setIsCrouching(false);

    onMove(0, 0);
    onJump(false);
    onSprint(false);
    onCrouch?.(false);
    onAttack(false);
    onPlace(false);
  }, [onMove, onJump, onSprint, onCrouch, onAttack, onPlace]);

  // Handle blocking / unmounting / window blur
  useEffect(() => {
    if (isBlocked) {
      resetAllInputs();
    }
  }, [isBlocked, resetAllInputs]);

  useEffect(() => {
    const handleBlurOrCancel = () => {
      resetAllInputs();
    };

    window.addEventListener('blur', handleBlurOrCancel);
    window.addEventListener('orientationchange', handleBlurOrCancel);
    document.addEventListener('fullscreenchange', handleBlurOrCancel);

    return () => {
      window.removeEventListener('blur', handleBlurOrCancel);
      window.removeEventListener('orientationchange', handleBlurOrCancel);
      document.removeEventListener('fullscreenchange', handleBlurOrCancel);
      resetAllInputs();
    };
  }, [resetAllInputs]);

  // Telemetry updates
  const reportTelemetry = useCallback((activeTouchesList: React.TouchList | TouchList) => {
    if (!onTelemetryUpdate || !mobileSettings.showTouchDebug) return;

    const touches: { id: number; x: number; y: number; role: string }[] = [];
    for (let i = 0; i < activeTouchesList.length; i++) {
      const t = activeTouchesList[i];
      let role = 'look / ambient';
      if (t.identifier === movementTouchId.current) role = 'joystick';
      else if (t.identifier === lookTouchId.current) role = 'camera look';
      else if (actionTouchMap.current[t.identifier]) role = `action (${actionTouchMap.current[t.identifier]})`;

      touches.push({
        id: t.identifier,
        x: t.clientX,
        y: t.clientY,
        role,
      });
    }

    const activeBtns: string[] = [];
    if (isAttacking) activeBtns.push('HIT');
    if (isPlacing) activeBtns.push('USE');
    if (isJumping) activeBtns.push('JUMP');
    if (isSprintingManual || isAutoSprinting) activeBtns.push('RUN');
    if (isCrouching) activeBtns.push('SNEAK');

    onTelemetryUpdate({
      activeTouches: touches,
      moveVector: { x: knobOffset.x / 48, z: knobOffset.y / 48 },
      lookDelta: lookSmoothedDelta.current,
      activeButtons: activeBtns,
      isAutoSprinting,
    });
  }, [onTelemetryUpdate, mobileSettings.showTouchDebug, isAttacking, isPlacing, isJumping, isSprintingManual, isAutoSprinting, isCrouching, knobOffset]);

  // Touch look & swipe handler
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isBlocked) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const target = touch.target as HTMLElement;

      // Ignore interactive buttons or joystick zone
      if (target.closest('.mobile-interactive-btn') || target.closest('.joystick-zone')) {
        continue;
      }

      // If floating joystick is active and touch is in left half of screen without an active joystick
      if (mobileSettings.floatingJoystick && movementTouchId.current === null && touch.clientX < window.innerWidth * 0.45) {
        movementTouchId.current = touch.identifier;
        joystickCenter.current = { x: touch.clientX, y: touch.clientY };
        setDynamicJoystickPos({ x: touch.clientX, y: touch.clientY });
        setIsJoystickActive(true);
        triggerHaptic('light');
        continue;
      }

      // Assign first free touch to camera rotation look
      if (lookTouchId.current === null) {
        lookTouchId.current = touch.identifier;
        lookLastPos.current = { x: touch.clientX, y: touch.clientY };
      }
    }

    reportTelemetry(e.touches);
  }, [isBlocked, mobileSettings.floatingJoystick, reportTelemetry]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isBlocked) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      // 1. Process Movement Joystick
      if (touch.identifier === movementTouchId.current) {
        const dx = touch.clientX - joystickCenter.current.x;
        const dy = touch.clientY - joystickCenter.current.y;
        const maxRadius = 48 * mobileSettings.controlScale;

        const distance = Math.hypot(dx, dy);
        const clampedDist = Math.min(maxRadius, distance);
        const angle = Math.atan2(dy, dx);

        const clampedX = Math.cos(angle) * clampedDist;
        const clampedY = Math.sin(angle) * clampedDist;

        setKnobOffset({ x: clampedX, y: clampedY });

        // Normalize output [-1..1]
        let normForward = -clampedY / maxRadius;
        let normStrafe = clampedX / maxRadius;

        // Apply Deadzone
        const deadzone = mobileSettings.joystickDeadzone;
        const inputMagnitude = Math.hypot(normForward, normStrafe);

        if (inputMagnitude < deadzone) {
          normForward = 0;
          normStrafe = 0;
        } else {
          // Re-scale post-deadzone smoothly
          const scaledMagnitude = (inputMagnitude - deadzone) / (1 - deadzone);
          const factor = (scaledMagnitude / inputMagnitude) * mobileSettings.joystickSensitivity;
          normForward *= factor;
          normStrafe *= factor;
        }

        // Auto-sprint detection when pushed forward past threshold
        let shouldAutoSprint = false;
        if (mobileSettings.autoSprint && normForward >= mobileSettings.autoSprintThreshold) {
          shouldAutoSprint = true;
        }
        setIsAutoSprinting(shouldAutoSprint);
        onSprint(isSprintingManual || shouldAutoSprint);

        onMove(normForward, normStrafe);
      }

      // 2. Process Camera Look Swipe
      if (touch.identifier === lookTouchId.current && lookLastPos.current) {
        const rawDx = touch.clientX - lookLastPos.current.x;
        const rawDy = touch.clientY - lookLastPos.current.y;
        lookLastPos.current = { x: touch.clientX, y: touch.clientY };

        // Apply separate horizontal & vertical sensitivities
        const sensX = mobileSettings.cameraSensitivityX * 0.9;
        const sensY = mobileSettings.cameraSensitivityY * (mobileSettings.invertY ? -0.9 : 0.9);

        const targetDx = rawDx * sensX;
        const targetDy = rawDy * sensY;

        // Apply Smoothing
        const smoothing = mobileSettings.cameraSmoothing;
        const smoothedDx = lookSmoothedDelta.current.dx * smoothing + targetDx * (1 - smoothing);
        const smoothedDy = lookSmoothedDelta.current.dy * smoothing + targetDy * (1 - smoothing);

        lookSmoothedDelta.current = { dx: smoothedDx, dy: smoothedDy };
        onLook(smoothedDx, smoothedDy);
      }
    }

    reportTelemetry(e.touches);
  }, [isBlocked, mobileSettings, isSprintingManual, onSprint, onMove, onLook, reportTelemetry]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      // End movement joystick
      if (touch.identifier === movementTouchId.current) {
        movementTouchId.current = null;
        setKnobOffset({ x: 0, y: 0 });
        setDynamicJoystickPos(null);
        setIsJoystickActive(false);
        setIsAutoSprinting(false);
        onMove(0, 0);
        onSprint(isSprintingManual);
      }

      // End camera look
      if (touch.identifier === lookTouchId.current) {
        lookTouchId.current = null;
        lookLastPos.current = null;
        lookSmoothedDelta.current = { dx: 0, dy: 0 };
      }

      // End any mapped action touch
      if (actionTouchMap.current[touch.identifier]) {
        delete actionTouchMap.current[touch.identifier];
      }
    }

    reportTelemetry(e.touches);
  }, [onMove, onSprint, isSprintingManual, reportTelemetry]);

  // Dedicated Fixed Joystick Touchdown
  const handleJoystickTouchStart = useCallback((e: React.TouchEvent) => {
    if (isBlocked) return;
    e.stopPropagation();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (movementTouchId.current === null && joystickBaseRef.current) {
        movementTouchId.current = touch.identifier;
        setIsJoystickActive(true);
        triggerHaptic('light');

        const rect = joystickBaseRef.current.getBoundingClientRect();
        joystickCenter.current = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };

        const dx = touch.clientX - joystickCenter.current.x;
        const dy = touch.clientY - joystickCenter.current.y;
        const maxRadius = 48 * mobileSettings.controlScale;
        const dist = Math.min(maxRadius, Math.hypot(dx, dy));
        const angle = Math.atan2(dy, dx);

        const clampedX = Math.cos(angle) * dist;
        const clampedY = Math.sin(angle) * dist;

        setKnobOffset({ x: clampedX, y: clampedY });
        onMove(-clampedY / maxRadius, clampedX / maxRadius);
      }
    }

    reportTelemetry(e.touches);
  }, [isBlocked, mobileSettings.controlScale, onMove, reportTelemetry]);

  const preventEvent = (e: React.TouchEvent | React.MouseEvent) => {
    if ((e as React.TouchEvent).cancelable) {
      e.preventDefault();
    }
    e.stopPropagation();
  };

  // Helper for touch-action buttons
  const bindActionButton = (
    actionName: string,
    setActive: (v: boolean) => void,
    callback: (active: boolean) => void,
    hapticType: 'light' | 'medium' | 'heavy' = 'light'
  ) => ({
    onTouchStart: (e: React.TouchEvent) => {
      preventEvent(e);
      if (isBlocked) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        actionTouchMap.current[e.changedTouches[i].identifier] = actionName;
      }
      setActive(true);
      callback(true);
      triggerHaptic(hapticType);
      reportTelemetry(e.touches);
    },
    onTouchEnd: (e: React.TouchEvent) => {
      preventEvent(e);
      for (let i = 0; i < e.changedTouches.length; i++) {
        delete actionTouchMap.current[e.changedTouches[i].identifier];
      }
      setActive(false);
      callback(false);
      triggerHaptic('selection');
      reportTelemetry(e.touches);
    },
    onTouchCancel: (e: React.TouchEvent) => {
      preventEvent(e);
      for (let i = 0; i < e.changedTouches.length; i++) {
        delete actionTouchMap.current[e.changedTouches[i].identifier];
      }
      setActive(false);
      callback(false);
      reportTelemetry(e.touches);
    },
  });

  const scale = mobileSettings.controlScale || 1.0;
  const opacity = mobileSettings.buttonOpacity || 0.75;

  return (
    <div
      id="android-landscape-mobile-controls"
      className="absolute inset-0 z-20 md:hidden pointer-events-none select-none overflow-hidden touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        opacity: isBlocked ? 0 : opacity,
        transition: 'opacity 0.2s ease-in-out',
      }}
    >
      {/* 1. Fullscreen Touch Look Swipe Surface (covers full screen except buttons) */}
      <div 
        id="camera-touch-swipe-zone"
        className="absolute inset-0 pointer-events-auto"
        style={{ touchAction: 'none' }}
      />

      {/* 2. Top-Right Quick Utilities Tray */}
      <div 
        className="absolute top-0 right-0 flex items-center gap-1.5 p-3 pointer-events-auto z-30"
        style={{
          paddingTop: 'max(10px, env(safe-area-inset-top))',
          paddingRight: 'max(14px, env(safe-area-inset-right))',
          transform: `scale(${Math.max(0.85, scale)})`,
          transformOrigin: 'top right',
        }}
      >
        {onToggleCamera && (
          <button
            id="mobile-btn-camera"
            onClick={(e) => { preventEvent(e); triggerHaptic('selection'); onToggleCamera(); }}
            onTouchEnd={(e) => { preventEvent(e); triggerHaptic('selection'); onToggleCamera(); }}
            title="Toggle Perspective"
            className="mobile-interactive-btn w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 active:scale-90 flex items-center justify-center text-white/90 shadow-lg cursor-pointer transition-transform"
          >
            <Camera className="w-4 h-4 text-sky-300" />
          </button>
        )}

        {onOpenJournal && (
          <button
            id="mobile-btn-journal"
            onClick={(e) => { preventEvent(e); triggerHaptic('selection'); onOpenJournal(); }}
            onTouchEnd={(e) => { preventEvent(e); triggerHaptic('selection'); onOpenJournal(); }}
            title="Journal"
            className="mobile-interactive-btn w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 active:scale-90 flex items-center justify-center text-white/90 shadow-lg cursor-pointer transition-transform"
          >
            <BookOpen className="w-4 h-4 text-amber-300" />
          </button>
        )}

        {onOpenMap && (
          <button
            id="mobile-btn-map"
            onClick={(e) => { preventEvent(e); triggerHaptic('selection'); onOpenMap(); }}
            onTouchEnd={(e) => { preventEvent(e); triggerHaptic('selection'); onOpenMap(); }}
            title="World Map"
            className="mobile-interactive-btn w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 active:scale-90 flex items-center justify-center text-white/90 shadow-lg cursor-pointer transition-transform"
          >
            <Map className="w-4 h-4 text-emerald-300" />
          </button>
        )}

        <button
          id="mobile-btn-fullscreen"
          onClick={(e) => { preventEvent(e); triggerHaptic('selection'); requestFullscreenMode(); }}
          onTouchEnd={(e) => { preventEvent(e); triggerHaptic('selection'); requestFullscreenMode(); }}
          title="Fullscreen Mode"
          className="mobile-interactive-btn w-10 h-10 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 active:scale-90 flex items-center justify-center text-white/90 shadow-lg cursor-pointer transition-transform"
        >
          <Maximize2 className="w-4 h-4 text-cyan-300" />
        </button>

        {onOpenPause && (
          <button
            id="mobile-btn-pause"
            onClick={(e) => { preventEvent(e); triggerHaptic('selection'); onOpenPause(); }}
            onTouchEnd={(e) => { preventEvent(e); triggerHaptic('selection'); onOpenPause(); }}
            title="Menu & Settings"
            className="mobile-interactive-btn px-3 h-10 rounded-xl bg-sky-500/30 backdrop-blur-md border border-sky-400/50 active:scale-90 flex items-center justify-center gap-1 text-white font-bold text-xs shadow-lg cursor-pointer transition-transform"
          >
            <Menu className="w-4 h-4" />
            <span>MENU</span>
          </button>
        )}
      </div>

      {/* 3. Top-Left Quick Inventory / Crafting Access */}
      <div 
        className="absolute top-0 left-0 flex items-center gap-2 p-3 pointer-events-auto z-30"
        style={{
          paddingTop: 'max(10px, env(safe-area-inset-top))',
          paddingLeft: 'max(14px, env(safe-area-inset-left))',
          transform: `scale(${Math.max(0.85, scale)})`,
          transformOrigin: 'top left',
        }}
      >
        <button
          id="mobile-btn-inventory"
          onClick={(e) => { preventEvent(e); triggerHaptic('selection'); onOpenInventory(); }}
          onTouchEnd={(e) => { preventEvent(e); triggerHaptic('selection'); onOpenInventory(); }}
          className="mobile-interactive-btn px-3.5 h-10 rounded-xl bg-black/65 backdrop-blur-md border border-sky-400/40 active:scale-95 flex items-center gap-1.5 text-xs font-bold text-sky-200 shadow-xl cursor-pointer transition-transform"
        >
          <Package className="w-4 h-4 text-sky-400" />
          <span>INV</span>
        </button>

        <button
          id="mobile-btn-crafting"
          onClick={(e) => { preventEvent(e); triggerHaptic('selection'); onOpenCrafting(); }}
          onTouchEnd={(e) => { preventEvent(e); triggerHaptic('selection'); onOpenCrafting(); }}
          className="mobile-interactive-btn px-3.5 h-10 rounded-xl bg-black/65 backdrop-blur-md border border-amber-400/40 active:scale-95 flex items-center gap-1.5 text-xs font-bold text-amber-200 shadow-xl cursor-pointer transition-transform"
        >
          <Hammer className="w-4 h-4 text-amber-400" />
          <span>CRAFT</span>
        </button>
      </div>

      {/* 4. Left Thumb Zone: Virtual Analog Movement Joystick */}
      <div 
        className="absolute bottom-0 left-0 p-4 pointer-events-auto z-30 flex items-end gap-3"
        style={{
          paddingBottom: 'max(18px, env(safe-area-inset-bottom))',
          paddingLeft: 'max(16px, env(safe-area-inset-left))',
          transform: `scale(${scale})`,
          transformOrigin: 'bottom left',
        }}
      >
        {/* Fixed or Floating Base */}
        <div
          id="mobile-virtual-joystick-base"
          ref={joystickBaseRef}
          onTouchStart={handleJoystickTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className={`joystick-zone w-36 h-36 rounded-full bg-black/45 backdrop-blur-lg border ${
            isJoystickActive 
              ? isAutoSprinting 
                ? 'border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.5)]' 
                : 'border-sky-400/70 shadow-[0_0_20px_rgba(56,189,248,0.4)]' 
              : 'border-white/20 shadow-2xl'
          } flex items-center justify-center relative touch-none cursor-pointer transition-all duration-150`}
          style={
            dynamicJoystickPos
              ? {
                  position: 'fixed',
                  left: `${dynamicJoystickPos.x - 72}px`,
                  top: `${dynamicJoystickPos.y - 72}px`,
                }
              : undefined
          }
        >
          {/* Inner Guide Crosshairs */}
          <div className="absolute w-20 h-[1px] bg-white/10 pointer-events-none" />
          <div className="absolute h-20 w-[1px] bg-white/10 pointer-events-none" />
          
          {/* Direction Guides & Sprint Ring */}
          <div className={`absolute inset-2 rounded-full border border-dashed transition-colors ${
            isAutoSprinting ? 'border-amber-400/50 animate-pulse' : 'border-white/10'
          }`} />

          <div className="absolute top-2 text-[9px] font-mono font-bold text-white/40 pointer-events-none">▲</div>
          <div className="absolute bottom-2 text-[9px] font-mono font-bold text-white/40 pointer-events-none">▼</div>
          <div className="absolute left-2 text-[9px] font-mono font-bold text-white/40 pointer-events-none">◀</div>
          <div className="absolute right-2 text-[9px] font-mono font-bold text-white/40 pointer-events-none">▶</div>

          {/* Draggable Knob Handle */}
          <div
            id="mobile-joystick-knob"
            className={`w-14 h-14 rounded-full pointer-events-none flex items-center justify-center transition-transform duration-75 ${
              isJoystickActive
                ? isAutoSprinting
                  ? 'bg-gradient-to-tr from-amber-600 to-amber-400 border-2 border-white shadow-[0_0_18px_rgba(245,158,11,0.9)] scale-110'
                  : 'bg-gradient-to-tr from-sky-600 to-sky-400 border-2 border-white shadow-[0_0_15px_rgba(56,189,248,0.8)] scale-110'
                : 'bg-white/20 border border-white/30'
            }`}
            style={{
              transform: `translate(${knobOffset.x}px, ${knobOffset.y}px)`,
            }}
          >
            <div className="w-4 h-4 rounded-full bg-white/70 shadow-sm" />
          </div>
        </div>

        {/* Crouch / Sneak button located near left thumb */}
        {onCrouch && (
          <button
            id="mobile-btn-crouch"
            {...bindActionButton('Crouch', setIsCrouching, onCrouch, 'light')}
            className={`mobile-interactive-btn w-12 h-12 rounded-2xl backdrop-blur-md border flex flex-col items-center justify-center font-bold text-[10px] active:scale-90 transition-all text-white shadow-lg touch-none cursor-pointer ${
              isCrouching ? 'bg-indigo-500/90 border-indigo-300 scale-95 shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'bg-black/50 border-white/20'
            }`}
          >
            <ChevronDown className="w-5 h-5 text-indigo-300" />
            <span className="text-[8px] font-mono">SNEAK</span>
          </button>
        )}
      </div>

      {/* 5. Right Thumb Zone: Ergonomic Action Button Cluster */}
      <div 
        className="absolute bottom-0 right-0 p-4 pointer-events-auto z-30 flex flex-col items-end gap-2.5"
        style={{
          paddingBottom: 'max(18px, env(safe-area-inset-bottom))',
          paddingRight: 'max(16px, env(safe-area-inset-right))',
          transform: `scale(${scale})`,
          transformOrigin: 'bottom right',
        }}
      >
        {/* Upper Action Row: Sprint / Run Toggle & Place / Use Block */}
        <div className="flex items-center gap-3">
          {/* SPRINT BUTTON */}
          <button
            id="mobile-btn-sprint"
            {...bindActionButton('Sprint', setIsSprintingManual, onSprint, 'medium')}
            className={`mobile-interactive-btn w-13 h-13 rounded-2xl backdrop-blur-md border flex flex-col items-center justify-center font-bold active:scale-90 transition-all text-white shadow-xl touch-none cursor-pointer ${
              isSprintingManual || isAutoSprinting
                ? 'bg-amber-500/90 border-amber-200 shadow-[0_0_18px_rgba(245,158,11,0.7)] scale-95' 
                : 'bg-black/55 border-amber-400/40 text-amber-200'
            }`}
          >
            <Zap className="w-5 h-5 text-amber-300" />
            <span className="text-[9px] font-mono uppercase tracking-wider font-bold">RUN</span>
          </button>

          {/* PLACE / USE BLOCK BUTTON */}
          <button
            id="mobile-btn-place"
            {...bindActionButton('Place', setIsPlacing, onPlace, 'medium')}
            className={`mobile-interactive-btn w-15 h-15 rounded-2xl backdrop-blur-md border flex flex-col items-center justify-center font-bold active:scale-90 transition-all text-white shadow-xl touch-none cursor-pointer ${
              isPlacing ? 'bg-sky-500/90 border-sky-200 shadow-[0_0_18px_rgba(56,189,248,0.7)] scale-95' : 'bg-sky-950/75 border-sky-400/50 text-sky-200'
            }`}
          >
            <ShieldAlert className="w-6 h-6 text-sky-300" />
            <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold">USE</span>
          </button>
        </div>

        {/* Lower Action Row: MINE / ATTACK (Primary) & JUMP (Primary) */}
        <div className="flex items-center gap-3">
          {/* MINE / ATTACK BUTTON WITH HOLD-TO-BREAK PROGRESS RING */}
          <div className="relative">
            <button
              id="mobile-btn-attack"
              {...bindActionButton('Attack', setIsAttacking, onAttack, 'heavy')}
              className={`mobile-interactive-btn w-16 h-16 rounded-3xl backdrop-blur-md border flex flex-col items-center justify-center font-bold active:scale-90 transition-all text-white shadow-2xl touch-none cursor-pointer relative overflow-hidden ${
                isAttacking ? 'bg-rose-600/95 border-rose-300 shadow-[0_0_22px_rgba(244,63,94,0.8)] scale-95' : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
              }`}
            >
              {/* Radial Break Progress Animation */}
              {(isAttacking || breakProgress > 0) && (
                <div 
                  className="absolute inset-0 bg-rose-500/30 transition-all origin-bottom pointer-events-none"
                  style={{ height: `${Math.max(10, breakProgress * 100)}%` }}
                />
              )}
              <Sword className="w-7 h-7 text-rose-300 relative z-10" />
              <span className="text-[10px] font-mono uppercase tracking-widest font-black relative z-10">HIT</span>
            </button>
          </div>

          {/* JUMP BUTTON */}
          <button
            id="mobile-btn-jump"
            {...bindActionButton('Jump', setIsJumping, onJump, 'medium')}
            className={`mobile-interactive-btn w-16 h-16 rounded-3xl backdrop-blur-md border flex flex-col items-center justify-center font-bold active:scale-90 transition-all text-white shadow-2xl touch-none cursor-pointer ${
              isJumping ? 'bg-emerald-600/95 border-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.8)] scale-95' : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
            }`}
          >
            <ArrowUp className="w-7 h-7 text-emerald-300" />
            <span className="text-[10px] font-mono uppercase tracking-widest font-black">JUMP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
