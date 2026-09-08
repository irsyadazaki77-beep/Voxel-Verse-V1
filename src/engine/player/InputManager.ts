// Centralized Input Manager with Configurable Keybinds, Double-Tap Detection, Pointer Lock, Gamepad, and Touch/Mobile Support
export type InputAction =
  | 'MoveForward'
  | 'MoveBackward'
  | 'MoveLeft'
  | 'MoveRight'
  | 'Jump'
  | 'Sprint'
  | 'Crouch'
  | 'Fly'
  | 'Attack'
  | 'Use'
  | 'Inventory'
  | 'Crafting'
  | 'Drop'
  | 'Perspective'
  | 'DebugMap'
  | 'Journal'
  | 'Map'
  | 'ContentDebug'
  | 'Pause'
  | 'Dodge'
  | 'Hotbar1'
  | 'Hotbar2'
  | 'Hotbar3'
  | 'Hotbar4'
  | 'Hotbar5'
  | 'Hotbar6'
  | 'Hotbar7'
  | 'Hotbar8'
  | 'Hotbar9';

export interface KeyBindings {
  [key: string]: InputAction;
}

export const DEFAULT_KEY_BINDINGS: Record<string, InputAction> = {
  KeyW: 'MoveForward',
  w: 'MoveForward',
  W: 'MoveForward',
  KeyS: 'MoveBackward',
  s: 'MoveBackward',
  S: 'MoveBackward',
  KeyA: 'MoveLeft',
  a: 'MoveLeft',
  A: 'MoveLeft',
  KeyD: 'MoveRight',
  d: 'MoveRight',
  D: 'MoveRight',
  ArrowUp: 'MoveForward',
  ArrowDown: 'MoveBackward',
  ArrowLeft: 'MoveLeft',
  ArrowRight: 'MoveRight',
  Space: 'Jump',
  ' ': 'Jump',
  ShiftLeft: 'Sprint',
  ShiftRight: 'Sprint',
  ControlLeft: 'Crouch',
  ControlRight: 'Crouch',
  KeyC: 'Crouch',
  c: 'Crouch',
  C: 'Crouch',
  KeyF: 'Fly',
  f: 'Fly',
  F: 'Fly',
  KeyE: 'Inventory',
  e: 'Inventory',
  E: 'Inventory',
  KeyQ: 'Drop',
  q: 'Drop',
  Q: 'Drop',
  KeyJ: 'Journal',
  j: 'Journal',
  J: 'Journal',
  KeyM: 'Map',
  m: 'Map',
  M: 'Map',
  F7: 'ContentDebug',
  F5: 'Perspective',
  Escape: 'Pause',
  KeyR: 'Dodge',
  r: 'Dodge',
  R: 'Dodge',
  Digit1: 'Hotbar1',
  Digit2: 'Hotbar2',
  Digit3: 'Hotbar3',
  Digit4: 'Hotbar4',
  Digit5: 'Hotbar5',
  Digit6: 'Hotbar6',
  Digit7: 'Hotbar7',
  Digit8: 'Hotbar8',
  Digit9: 'Hotbar9',
  '1': 'Hotbar1',
  '2': 'Hotbar2',
  '3': 'Hotbar3',
  '4': 'Hotbar4',
  '5': 'Hotbar5',
  '6': 'Hotbar6',
  '7': 'Hotbar7',
  '8': 'Hotbar8',
  '9': 'Hotbar9',
};

export class InputManager {
  private keyBindings: Record<string, InputAction>;
  
  // States from different sources
  private keyboardActions: Set<InputAction> = new Set();
  private mouseActions: Set<InputAction> = new Set();
  private mobileActions: Set<InputAction> = new Set();
  private gamepadActions: Set<InputAction> = new Set();
  
  // Unified state
  private activeActions: Set<InputAction> = new Set();
  private justPressedActions: Set<InputAction> = new Set();
  private justReleasedActions: Set<InputAction> = new Set();

  // Mouse / Look state
  public mouseDeltaX: number = 0;
  public mouseDeltaY: number = 0;
  public mouseWheelDelta: number = 0;
  public isPointerLocked: boolean = false;

  // Mobile Analog State
  private mobileMoveVector: { x: number, z: number } = { x: 0, z: 0 };
  private mobileLookDelta: { x: number, y: number } = { x: 0, y: 0 };
  
  // Gamepad Analog State
  private gamepadIndex: number | null = null;
  private gamepadMoveVector: { x: number, z: number } = { x: 0, z: 0 };
  private gamepadLookDelta: { x: number, y: number } = { x: 0, y: 0 };

  // Double-tap Space for Creative flying
  private lastJumpReleaseTime: number = 0;
  public doubleTapJumpTriggered: boolean = false;

  private onPointerLockCallbacks: ((locked: boolean) => void)[] = [];
  private onActionPressedCallbacks: Map<InputAction, (() => void)[]> = new Map();

  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundMouseMove: (e: MouseEvent) => void;
  private boundMouseDown: (e: MouseEvent) => void;
  private boundMouseUp: (e: MouseEvent) => void;
  private boundWheel: (e: WheelEvent) => void;
  private boundPointerLockChange: () => void;
  private boundGamepadConnected: (e: GamepadEvent) => void;
  private boundGamepadDisconnected: (e: GamepadEvent) => void;
  private boundBlur: () => void;

  constructor(customBindings?: Record<string, InputAction>) {
    this.keyBindings = { ...DEFAULT_KEY_BINDINGS, ...(customBindings || {}) };

    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
    this.boundWheel = this.handleWheel.bind(this);
    this.boundPointerLockChange = this.handlePointerLockChange.bind(this);
    this.boundGamepadConnected = this.handleGamepadConnected.bind(this);
    this.boundGamepadDisconnected = this.handleGamepadDisconnected.bind(this);
    this.boundBlur = this.handleBlur.bind(this);

    this.attachListeners();
  }

  private attachListeners(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mouseup', this.boundMouseUp);
    window.addEventListener('wheel', this.boundWheel, { passive: true });
    if (typeof document !== 'undefined') {
      document.addEventListener('pointerlockchange', this.boundPointerLockChange);
    }
    window.addEventListener('gamepadconnected', this.boundGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.boundGamepadDisconnected);
    window.addEventListener('blur', this.boundBlur);
  }

  public dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.boundKeyDown);
      window.removeEventListener('keyup', this.boundKeyUp);
      window.removeEventListener('mousemove', this.boundMouseMove);
      window.removeEventListener('mousedown', this.boundMouseDown);
      window.removeEventListener('mouseup', this.boundMouseUp);
      window.removeEventListener('wheel', this.boundWheel);
      window.removeEventListener('gamepadconnected', this.boundGamepadConnected);
      window.removeEventListener('gamepaddisconnected', this.boundGamepadDisconnected);
      window.removeEventListener('blur', this.boundBlur);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('pointerlockchange', this.boundPointerLockChange);
    }
    this.onPointerLockCallbacks = [];
    this.onActionPressedCallbacks.clear();
  }

  private handleBlur(): void {
    this.keyboardActions.clear();
    this.mouseActions.clear();
    this.mobileActions.clear();
    this.gamepadActions.clear();
    this.mobileMoveVector = { x: 0, z: 0 };
    this.updateUnifiedState();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }
    const action = this.keyBindings[e.code] || this.keyBindings[e.key];
    if (action) {
      if (
        action === 'Perspective' ||
        action === 'DebugMap' ||
        action === 'MoveForward' ||
        action === 'MoveBackward' ||
        action === 'MoveLeft' ||
        action === 'MoveRight' ||
        action === 'Jump' ||
        action === 'Crouch' ||
        action === 'Sprint'
      ) {
        e.preventDefault();
      }
      if (!this.keyboardActions.has(action)) {
        this.keyboardActions.add(action);
        if (action === 'Jump') {
          const now = performance.now();
          if (now - this.lastJumpReleaseTime < 300) {
            this.doubleTapJumpTriggered = true;
          }
        }
        this.updateUnifiedState(action);
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const action = this.keyBindings[e.code] || this.keyBindings[e.key];
    if (action) {
      this.keyboardActions.delete(action);
      if (action === 'Jump') {
        this.lastJumpReleaseTime = performance.now();
      }
      this.updateUnifiedState();
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isPointerLocked) {
      this.mouseDeltaX += e.movementX;
      this.mouseDeltaY += e.movementY;
    }
  }

  private handleMouseDown(e: MouseEvent): void {
    if (!this.isPointerLocked) return;
    let action: InputAction | null = null;
    if (e.button === 0) action = 'Attack';
    else if (e.button === 2) action = 'Use';

    if (action && !this.mouseActions.has(action)) {
      this.mouseActions.add(action);
      this.updateUnifiedState(action);
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    let action: InputAction | null = null;
    if (e.button === 0) action = 'Attack';
    else if (e.button === 2) action = 'Use';

    if (action) {
      this.mouseActions.delete(action);
      this.updateUnifiedState();
    }
  }

  private handleWheel(e: WheelEvent): void {
    if (this.isPointerLocked) {
      this.mouseWheelDelta += Math.sign(e.deltaY);
    }
  }

  private handlePointerLockChange(): void {
    this.isPointerLocked = typeof document !== 'undefined' ? Boolean(document.pointerLockElement) : false;
    this.onPointerLockCallbacks.forEach(cb => cb(this.isPointerLocked));
    if (!this.isPointerLocked) {
      this.mouseActions.clear();
      this.updateUnifiedState();
    }
  }

  private handleGamepadConnected(e: GamepadEvent): void {
    this.gamepadIndex = e.gamepad.index;
  }

  private handleGamepadDisconnected(e: GamepadEvent): void {
    if (this.gamepadIndex === e.gamepad.index) {
      this.gamepadIndex = null;
      this.gamepadActions.clear();
      this.gamepadMoveVector = { x: 0, z: 0 };
      this.gamepadLookDelta = { x: 0, y: 0 };
      this.updateUnifiedState();
    }
  }

  private pollGamepad(): void {
    if (this.gamepadIndex === null) return;
    const gamepads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : [];
    const gp = gamepads[this.gamepadIndex];
    if (!gp || !gp.connected) return;

    const deadzone = 0.15;
    const applyDeadzone = (val: number) => (Math.abs(val) < deadzone ? 0 : val);

    this.gamepadMoveVector.x = applyDeadzone(gp.axes[0] || 0);
    this.gamepadMoveVector.z = applyDeadzone(gp.axes[1] || 0);
    
    // Scale joystick look speed by delta time roughly inside the controller logic, or just send large values
    this.gamepadLookDelta.x = applyDeadzone(gp.axes[2] || 0) * 40; 
    this.gamepadLookDelta.y = applyDeadzone(gp.axes[3] || 0) * 40;

    const gpMap: { btn: number, act: InputAction }[] = [
      { btn: 0, act: 'Jump' }, // A
      { btn: 2, act: 'Use' }, // X
      { btn: 3, act: 'Inventory' }, // Y
      { btn: 7, act: 'Attack' }, // RT
      { btn: 6, act: 'Use' }, // LT (Place)
      { btn: 9, act: 'Pause' }, // Start
      { btn: 8, act: 'Map' }, // Select
      { btn: 10, act: 'Sprint' }, // L3
      { btn: 11, act: 'Crouch' }, // R3
    ];

    let changed = false;
    gpMap.forEach(({ btn, act }) => {
      const pressed = gp.buttons[btn]?.pressed || (gp.buttons[btn]?.value || 0) > 0.3;
      if (pressed && !this.gamepadActions.has(act)) {
        this.gamepadActions.add(act);
        changed = true;
        this.updateUnifiedState(act);
      } else if (!pressed && this.gamepadActions.has(act)) {
        this.gamepadActions.delete(act);
        changed = true;
      }
    });

    if (changed) {
      this.updateUnifiedState();
    }
  }

  // Mobile/Touch Interfaces
  public setMobileJoystick(moveForward: number, moveRight: number): void {
    this.mobileMoveVector.x = moveRight;
    this.mobileMoveVector.z = -moveForward; // Forward is -Z in 3D
  }

  public setMobileLook(deltaX: number, deltaY: number): void {
    this.mobileLookDelta.x += deltaX;
    this.mobileLookDelta.y += deltaY;
  }

  public setMobileAction(action: InputAction, active: boolean): void {
    if (active && !this.mobileActions.has(action)) {
      this.mobileActions.add(action);
      this.updateUnifiedState(action);
    } else if (!active && this.mobileActions.has(action)) {
      this.mobileActions.delete(action);
      this.updateUnifiedState();
    }
  }
  
  public triggerMobileAction(action: InputAction): void {
    this.setMobileAction(action, true);
    setTimeout(() => {
      this.setMobileAction(action, false);
    }, 100);
  }

  private updateUnifiedState(newlyPressedAction?: InputAction): void {
    const previousActions = new Set(this.activeActions);
    this.activeActions.clear();

    const addActions = (set: Set<InputAction>) => {
      set.forEach(a => this.activeActions.add(a));
    };

    addActions(this.keyboardActions);
    addActions(this.mouseActions);
    addActions(this.mobileActions);
    addActions(this.gamepadActions);

    if (newlyPressedAction) {
      this.justPressedActions.add(newlyPressedAction);
      const cbs = this.onActionPressedCallbacks.get(newlyPressedAction);
      if (cbs) {
        cbs.forEach(cb => cb());
      }
    }

    // Check for released actions
    previousActions.forEach(action => {
      if (!this.activeActions.has(action)) {
        this.justReleasedActions.add(action);
      }
    });
  }

  public getMovementVector(): { x: number, z: number } {
    let x = 0;
    let z = 0;

    // Keyboard boolean fallback to vector
    if (this.activeActions.has('MoveLeft')) x -= 1;
    if (this.activeActions.has('MoveRight')) x += 1;
    if (this.activeActions.has('MoveForward')) z -= 1;
    if (this.activeActions.has('MoveBackward')) z += 1;

    // Analog inputs override digital
    if (Math.abs(this.mobileMoveVector.x) > 0.05 || Math.abs(this.mobileMoveVector.z) > 0.05) {
      x = this.mobileMoveVector.x;
      z = this.mobileMoveVector.z;
    } else if (Math.abs(this.gamepadMoveVector.x) > 0.1 || Math.abs(this.gamepadMoveVector.z) > 0.1) {
      x = this.gamepadMoveVector.x;
      z = this.gamepadMoveVector.z;
    } else if (x !== 0 || z !== 0) {
      // Normalize digital input
      const len = Math.sqrt(x * x + z * z);
      x /= len;
      z /= len;
    }

    return { x, z };
  }

  public getLookDeltas(): { dx: number, dy: number } {
    const dx = this.mouseDeltaX + this.mobileLookDelta.x + this.gamepadLookDelta.x;
    const dy = this.mouseDeltaY + this.mobileLookDelta.y + this.gamepadLookDelta.y;
    return { dx, dy };
  }

  public onPointerLockChange(cb: (locked: boolean) => void): () => void {
    this.onPointerLockCallbacks.push(cb);
    return () => {
      this.onPointerLockCallbacks = this.onPointerLockCallbacks.filter(c => c !== cb);
    };
  }

  public onAction(action: InputAction, cb: () => void): () => void {
    if (!this.onActionPressedCallbacks.has(action)) {
      this.onActionPressedCallbacks.set(action, []);
    }
    this.onActionPressedCallbacks.get(action)!.push(cb);
    return () => {
      const list = this.onActionPressedCallbacks.get(action);
      if (list) {
        this.onActionPressedCallbacks.set(action, list.filter(c => c !== cb));
      }
    };
  }

  public requestPointerLock(element: HTMLElement): void {
    if (typeof document !== 'undefined' && !document.pointerLockElement) {
      element.requestPointerLock?.();
    }
  }

  public exitPointerLock(): void {
    if (typeof document !== 'undefined' && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }

  public isActionActive(action: InputAction): boolean {
    return this.activeActions.has(action);
  }

  public wasActionPressed(action: InputAction): boolean {
    return this.justPressedActions.has(action);
  }

  public wasActionReleased(action: InputAction): boolean {
    return this.justReleasedActions.has(action);
  }

  public consumeAction(action: InputAction): boolean {
    if (this.justPressedActions.has(action)) {
      this.justPressedActions.delete(action);
      return true;
    }
    return false;
  }

  // Pre-update tick: sample devices
  public preUpdate(): void {
    this.pollGamepad();
  }

  // End of frame tick: clear single-frame deltas
  public postUpdate(): void {
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.mouseWheelDelta = 0;
    this.mobileLookDelta = { x: 0, y: 0 };
    // DO NOT clear mobileMoveVector here, it's continuous until touchend
    this.doubleTapJumpTriggered = false;
    this.justPressedActions.clear();
    this.justReleasedActions.clear();
  }
}
