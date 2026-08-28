// Input Abstraction & Gamepad Integration Layer
import { SettingsManager, KeyBindingAction } from '../ui/SettingsManager';

export type InputDeviceType = 'keyboard' | 'gamepad';

export interface InputActionState {
  moveForward: boolean;
  moveBackward: boolean;
  strafeLeft: boolean;
  strafeRight: boolean;
  jump: boolean;
  sprint: boolean;
  crouch: boolean;
  attack: boolean;
  mine: boolean;
  interact: boolean;
  inventory: boolean;
  map: boolean;
  journal: boolean;
  quest: boolean;
  pause: boolean;
  // Axis values for analog control
  moveVector: { x: number; y: number };
  lookVector: { x: number; y: number };
}

export class GamepadManager {
  private static gamepadIndex: number | null = null;

  public static init(): void {
    window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
      console.log('Gamepad connected:', e.gamepad.id);
      this.gamepadIndex = e.gamepad.index;
      InputManager.setActiveDevice('gamepad');
    });

    window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
      console.log('Gamepad disconnected:', e.gamepad.id);
      if (this.gamepadIndex === e.gamepad.index) {
        this.gamepadIndex = null;
        InputManager.setActiveDevice('keyboard');
      }
    });
  }

  public static poll(): {
    buttons: Record<string, boolean>;
    axes: { leftStick: { x: number; y: number }; rightStick: { x: number; y: number } };
  } | null {
    if (this.gamepadIndex === null) return null;

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[this.gamepadIndex];
    if (!gp || !gp.connected) return null;

    // Standard Gamepad Mapping
    // Buttons: 0=A/Cross, 1=B/Circle, 2=X/Square, 3=Y/Triangle, 4=LB, 5=RB, 6=LT, 7=RT, 8=Select/Back, 9=Start/Pause, 10=L3, 11=R3, 12=Up, 13=Down, 14=Left, 15=Right
    const deadzone = 0.15;
    const applyDeadzone = (val: number) => (Math.abs(val) < deadzone ? 0 : val);

    return {
      buttons: {
        a: gp.buttons[0]?.pressed || false,
        b: gp.buttons[1]?.pressed || false,
        x: gp.buttons[2]?.pressed || false,
        y: gp.buttons[3]?.pressed || false,
        lb: gp.buttons[4]?.pressed || false,
        rb: gp.buttons[5]?.pressed || false,
        lt: gp.buttons[6]?.pressed || false || (gp.buttons[6]?.value || 0) > 0.3,
        rt: gp.buttons[7]?.pressed || false || (gp.buttons[7]?.value || 0) > 0.3,
        select: gp.buttons[8]?.pressed || false,
        start: gp.buttons[9]?.pressed || false,
        dpadUp: gp.buttons[12]?.pressed || false,
        dpadDown: gp.buttons[13]?.pressed || false,
        dpadLeft: gp.buttons[14]?.pressed || false,
        dpadRight: gp.buttons[15]?.pressed || false,
      },
      axes: {
        leftStick: {
          x: applyDeadzone(gp.axes[0] || 0),
          y: applyDeadzone(gp.axes[1] || 0),
        },
        rightStick: {
          x: applyDeadzone(gp.axes[2] || 0),
          y: applyDeadzone(gp.axes[3] || 0),
        },
      },
    };
  }

  public static getButtonPrompt(action: KeyBindingAction): string {
    switch (action) {
      case 'interact':
        return 'Ⓧ'; // Button X / Square
      case 'jump':
        return 'Ⓐ'; // Button A / Cross
      case 'inventory':
        return 'Ⓨ'; // Button Y / Triangle
      case 'attack':
      case 'mine':
        return 'RT';
      case 'sprint':
        return 'LS'; // Left Stick Click
      case 'crouch':
        return 'RS'; // Right Stick Click
      case 'pause':
        return 'START';
      case 'map':
        return 'BACK';
      default:
        return '🎮';
    }
  }
}

export class InputManager {
  private static activeDevice: InputDeviceType = 'keyboard';
  private static listeners: Set<(device: InputDeviceType) => void> = new Set();
  private static keyState: Map<string, boolean> = new Map();
  private static mouseButtonState: Map<number, boolean> = new Map();

  public static init(): void {
    GamepadManager.init();

    window.addEventListener('keydown', (e) => {
      this.keyState.set(e.code, true);
      if (this.activeDevice !== 'keyboard') {
        this.setActiveDevice('keyboard');
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keyState.set(e.code, false);
    });

    window.addEventListener('mousedown', (e) => {
      this.mouseButtonState.set(e.button, true);
      if (this.activeDevice !== 'keyboard') {
        this.setActiveDevice('keyboard');
      }
    });

    window.addEventListener('mouseup', (e) => {
      this.mouseButtonState.set(e.button, false);
    });
  }

  public static setActiveDevice(device: InputDeviceType): void {
    if (this.activeDevice !== device) {
      this.activeDevice = device;
      this.listeners.forEach(cb => cb(device));
    }
  }

  public static getActiveDevice(): InputDeviceType {
    return this.activeDevice;
  }

  public static subscribeDeviceChange(cb: (device: InputDeviceType) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public static getState(): InputActionState {
    const settings = SettingsManager.get();
    const bindings = settings.controls.keyBindings;

    // Check keyboard & mouse
    const checkKey = (action: KeyBindingAction): boolean => {
      const code = bindings[action];
      if (!code) return false;
      if (code.startsWith('MouseButton')) {
        const btnIndex = parseInt(code.replace('MouseButton', ''), 10);
        return this.mouseButtonState.get(btnIndex) || false;
      }
      return this.keyState.get(code) || false;
    };

    let moveX = 0;
    let moveY = 0;

    if (checkKey('moveForward')) moveY -= 1;
    if (checkKey('moveBackward')) moveY += 1;
    if (checkKey('strafeLeft')) moveX -= 1;
    if (checkKey('strafeRight')) moveX += 1;

    let state: InputActionState = {
      moveForward: checkKey('moveForward'),
      moveBackward: checkKey('moveBackward'),
      strafeLeft: checkKey('strafeLeft'),
      strafeRight: checkKey('strafeRight'),
      jump: checkKey('jump'),
      sprint: checkKey('sprint'),
      crouch: checkKey('crouch'),
      attack: checkKey('attack'),
      mine: checkKey('mine'),
      interact: checkKey('interact'),
      inventory: checkKey('inventory'),
      map: checkKey('map'),
      journal: checkKey('journal'),
      quest: checkKey('quest'),
      pause: checkKey('pause'),
      moveVector: { x: moveX, y: moveY },
      lookVector: { x: 0, y: 0 },
    };

    // Check Gamepad
    const gpState = GamepadManager.poll();
    if (gpState) {
      if (
        Math.abs(gpState.axes.leftStick.x) > 0.1 ||
        Math.abs(gpState.axes.leftStick.y) > 0.1 ||
        Object.values(gpState.buttons).some(b => b)
      ) {
        if (this.activeDevice !== 'gamepad') {
          this.setActiveDevice('gamepad');
        }
      }

      if (this.activeDevice === 'gamepad') {
        state.moveVector.x += gpState.axes.leftStick.x;
        state.moveVector.y += gpState.axes.leftStick.y;
        state.lookVector.x = gpState.axes.rightStick.x * 2.0;
        state.lookVector.y = gpState.axes.rightStick.y * 2.0;

        if (gpState.buttons.a) state.jump = true;
        if (gpState.buttons.x) state.interact = true;
        if (gpState.buttons.y) state.inventory = true;
        if (gpState.buttons.rt) {
          state.attack = true;
          state.mine = true;
        }
        if (gpState.buttons.start) state.pause = true;
        if (gpState.buttons.select) state.map = true;
      }
    }

    return state;
  }

  public static getPromptText(action: KeyBindingAction): string {
    if (this.activeDevice === 'gamepad') {
      return GamepadManager.getButtonPrompt(action);
    }
    const settings = SettingsManager.get();
    const binding = settings.controls.keyBindings[action] || 'E';
    if (binding === 'KeyE') return 'E';
    if (binding === 'KeyI') return 'I';
    if (binding === 'KeyM') return 'M';
    if (binding === 'KeyJ') return 'J';
    if (binding === 'KeyL') return 'L';
    if (binding === 'Space') return 'SPACE';
    if (binding === 'ShiftLeft') return 'SHIFT';
    if (binding === 'ControlLeft') return 'CTRL';
    if (binding.startsWith('Key')) return binding.replace('Key', '');
    return binding;
  }
}
