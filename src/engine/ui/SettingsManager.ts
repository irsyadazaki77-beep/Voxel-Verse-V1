// Settings & Accessibility State Engine for VoxelVerse
export interface AudioSettings {
  masterVolume: number; // 0..1
  musicVolume: number; // 0..1
  environmentVolume: number; // 0..1
  creatureVolume: number; // 0..1
  combatVolume: number; // 0..1
  uiVolume: number; // 0..1
}

export interface GraphicsSettings {
  preset: 'low' | 'medium' | 'high' | 'ultra';
  renderDistance: number; // 2..16 chunks
  shadows: boolean;
  waterReflections: boolean;
  vegetationDensity: 'off' | 'low' | 'high';
  particleQuality: 'low' | 'high';
  antiAliasing: boolean;
  postProcessing: boolean;
  fov: number; // 60..110
}

export type KeyBindingAction =
  | 'moveForward'
  | 'moveBackward'
  | 'strafeLeft'
  | 'strafeRight'
  | 'jump'
  | 'sprint'
  | 'crouch'
  | 'attack'
  | 'mine'
  | 'interact'
  | 'inventory'
  | 'hotbarPrev'
  | 'hotbarNext'
  | 'map'
  | 'journal'
  | 'quest'
  | 'pause';

export interface ControlSettings {
  keyBindings: Record<KeyBindingAction, string>;
  mouseSensitivity: number; // 0.1 .. 3.0
  invertY: boolean;
  sprintToggle: boolean;
  crouchToggle: boolean;
}

export interface AccessibilitySettings {
  uiScale: number; // 0.75 .. 1.5
  hudScale: number; // 0.75 .. 1.5
  safeAreaPadding: number; // 0 .. 32 px
  motionReduction: boolean;
  cameraShakeIntensity: number; // 0 .. 1
  headBobIntensity: number; // 0 .. 1
  subtitles: boolean;
  highContrast: boolean;
  damageFlashIntensity: number; // 0 .. 1
}

export interface GameplaySettings {
  showFps: boolean;
  showMinimap: boolean;
  autoSaveInterval: number; // minutes (1, 5, 10)
  chatEnabled: boolean;
}

export interface GameSettings {
  audio: AudioSettings;
  graphics: GraphicsSettings;
  controls: ControlSettings;
  accessibility: AccessibilitySettings;
  gameplay: GameplaySettings;
}

const STORAGE_KEY = 'voxelverse_settings_v1';

export const DEFAULT_SETTINGS: GameSettings = {
  audio: {
    masterVolume: 0.8,
    musicVolume: 0.6,
    environmentVolume: 0.8,
    creatureVolume: 0.8,
    combatVolume: 0.9,
    uiVolume: 0.7,
  },
  graphics: {
    preset: 'high',
    renderDistance: 6,
    shadows: true,
    waterReflections: true,
    vegetationDensity: 'high',
    particleQuality: 'high',
    antiAliasing: true,
    postProcessing: true,
    fov: 75,
  },
  controls: {
    keyBindings: {
      moveForward: 'KeyW',
      moveBackward: 'KeyS',
      strafeLeft: 'KeyA',
      strafeRight: 'KeyD',
      jump: 'Space',
      sprint: 'ShiftLeft',
      crouch: 'ControlLeft',
      attack: 'MouseButton0',
      mine: 'MouseButton0',
      interact: 'KeyE',
      inventory: 'KeyI',
      hotbarPrev: 'WheelUp',
      hotbarNext: 'WheelDown',
      map: 'KeyM',
      journal: 'KeyJ',
      quest: 'KeyL',
      pause: 'Escape',
    },
    mouseSensitivity: 1.0,
    invertY: false,
    sprintToggle: false,
    crouchToggle: false,
  },
  accessibility: {
    uiScale: 1.0,
    hudScale: 1.0,
    safeAreaPadding: 12,
    motionReduction: false,
    cameraShakeIntensity: 1.0,
    headBobIntensity: 1.0,
    subtitles: true,
    highContrast: false,
    damageFlashIntensity: 0.8,
  },
  gameplay: {
    showFps: true,
    showMinimap: true,
    autoSaveInterval: 5,
    chatEnabled: true,
  },
};

type Listener = (settings: GameSettings) => void;

export class SettingsManager {
  private static settings: GameSettings = DEFAULT_SETTINGS;
  private static listeners: Set<Listener> = new Set();
  private static initialized = false;

  public static get(): GameSettings {
    if (!this.initialized) {
      this.load();
    }
    return this.settings;
  }

  public static load(): GameSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.settings = {
          audio: { ...DEFAULT_SETTINGS.audio, ...parsed.audio },
          graphics: { ...DEFAULT_SETTINGS.graphics, ...parsed.graphics },
          controls: {
            ...DEFAULT_SETTINGS.controls,
            ...parsed.controls,
            keyBindings: { ...DEFAULT_SETTINGS.controls.keyBindings, ...(parsed.controls?.keyBindings || {}) },
          },
          accessibility: { ...DEFAULT_SETTINGS.accessibility, ...parsed.accessibility },
          gameplay: { ...DEFAULT_SETTINGS.gameplay, ...parsed.gameplay },
        };
      } else {
        this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      }
    } catch {
      this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }
    this.initialized = true;
    return this.settings;
  }

  public static save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to persist settings:', e);
    }
    this.notify();
  }

  public static update(partial: Partial<GameSettings>): void {
    if (partial.audio) this.settings.audio = { ...this.settings.audio, ...partial.audio };
    if (partial.graphics) this.settings.graphics = { ...this.settings.graphics, ...partial.graphics };
    if (partial.controls) this.settings.controls = { ...this.settings.controls, ...partial.controls };
    if (partial.accessibility) this.settings.accessibility = { ...this.settings.accessibility, ...partial.accessibility };
    if (partial.gameplay) this.settings.gameplay = { ...this.settings.gameplay, ...partial.gameplay };
    this.save();
  }

  public static resetToDefault(): void {
    this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    this.save();
  }

  public static subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.get());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private static notify(): void {
    this.listeners.forEach(cb => cb(this.settings));
  }
}
