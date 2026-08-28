// Centralized Input Manager with Configurable Keybinds, Double-Tap Detection, and Pointer Lock Management
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
  private activeActions: Set<InputAction> = new Set();
  private justPressedActions: Set<InputAction> = new Set();
  private justReleasedActions: Set<InputAction> = new Set();

  public mouseDeltaX: number = 0;
  public mouseDeltaY: number = 0;
  public mouseWheelDelta: number = 0;
  public isPointerLocked: boolean = false;

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

  constructor(customBindings?: Record<string, InputAction>) {
    this.keyBindings = { ...DEFAULT_KEY_BINDINGS, ...(customBindings || {}) };

    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    this.boundMouseDown = this.handleMouseDown.bind(this);
    this.boundMouseUp = this.handleMouseUp.bind(this);
    this.boundWheel = this.handleWheel.bind(this);
    this.boundPointerLockChange = this.handlePointerLockChange.bind(this);

    this.attachListeners();
  }

  private attachListeners(): void {
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    window.addEventListener('mousemove', this.boundMouseMove);
    window.addEventListener('mousedown', this.boundMouseDown);
    window.addEventListener('mouseup', this.boundMouseUp);
    window.addEventListener('wheel', this.boundWheel, { passive: true });
    document.addEventListener('pointerlockchange', this.boundPointerLockChange);
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    window.removeEventListener('mousemove', this.boundMouseMove);
    window.removeEventListener('mousedown', this.boundMouseDown);
    window.removeEventListener('mouseup', this.boundMouseUp);
    window.removeEventListener('wheel', this.boundWheel);
    document.removeEventListener('pointerlockchange', this.boundPointerLockChange);
    this.onPointerLockCallbacks = [];
    this.onActionPressedCallbacks.clear();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // If target is an input field, ignore
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

      if (!this.activeActions.has(action)) {
        this.activeActions.add(action);
        this.justPressedActions.add(action);

        // Double tap detection on Jump
        if (action === 'Jump') {
          const now = performance.now();
          if (now - this.lastJumpReleaseTime < 300) {
            this.doubleTapJumpTriggered = true;
          }
        }

        const cbs = this.onActionPressedCallbacks.get(action);
        if (cbs) {
          cbs.forEach(cb => cb());
        }
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const action = this.keyBindings[e.code] || this.keyBindings[e.key];
    if (action) {
      this.activeActions.delete(action);
      this.justReleasedActions.add(action);

      if (action === 'Jump') {
        this.lastJumpReleaseTime = performance.now();
      }
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
    if (e.button === 0) {
      this.activeActions.add('Attack');
      this.justPressedActions.add('Attack');
    } else if (e.button === 2) {
      this.activeActions.add('Use');
      this.justPressedActions.add('Use');
    }
  }

  private handleMouseUp(e: MouseEvent): void {
    if (e.button === 0) {
      this.activeActions.delete('Attack');
      this.justReleasedActions.add('Attack');
    } else if (e.button === 2) {
      this.activeActions.delete('Use');
      this.justReleasedActions.add('Use');
    }
  }

  private handleWheel(e: WheelEvent): void {
    if (this.isPointerLocked) {
      this.mouseWheelDelta += Math.sign(e.deltaY);
    }
  }

  private handlePointerLockChange(): void {
    this.isPointerLocked = Boolean(document.pointerLockElement);
    this.onPointerLockCallbacks.forEach(cb => cb(this.isPointerLocked));
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
    if (!document.pointerLockElement) {
      element.requestPointerLock?.();
    }
  }

  public exitPointerLock(): void {
    if (document.pointerLockElement) {
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

  // End of frame tick: clear single-frame deltas
  public postUpdate(): void {
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.mouseWheelDelta = 0;
    this.doubleTapJumpTriggered = false;
    this.justPressedActions.clear();
    this.justReleasedActions.clear();
  }
}
