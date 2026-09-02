// Settings & Accessibility State Engine for VoxelVerse
export interface AudioSettings {
  masterVolume: number; // 0..1
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  ambientVolume: number; // 0..1
  environmentVolume: number; // 0..1
  creatureVolume: number; // 0..1
  combatVolume: number; // 0..1
  uiVolume: number; // 0..1
}

export interface GraphicsSettings {
  preset: 'low' | 'medium' | 'high' | 'ultra' | 'custom' | 'auto';
  resolutionMode: 'auto' | 'native' | '1080p' | '1440p' | '4k' | 'custom';
  renderScale: number; // 0.5 .. 2.0
  renderDistance: number; // 2..16 chunks
  shadows: boolean;
  shadowQuality: 'off' | 'low' | 'medium' | 'high' | 'ultra';
  shadowMapSize: 512 | 1024 | 2048 | 4096;
  waterReflections: boolean;
  waterQuality: 'low' | 'medium' | 'high' | 'ultra';
  vegetationDensity: 'off' | 'low' | 'high';
  particleQuality: 'low' | 'medium' | 'high';
  antiAliasing: boolean;
  antiAliasingMode: 'off' | 'fxaa' | 'smaa';
  postProcessing: boolean;
  bloom: boolean;
  bloomStrength: number;
  ambientOcclusion: boolean;
  ambientOcclusionQuality: 'off' | 'low' | 'medium' | 'high';
  colorGrading: 'none' | 'cinematic' | 'vibrant' | 'warm_golden' | 'cool_twilight';
  sharpening: boolean;
  sharpenStrength: number;
  dynamicResolution: boolean;
  targetFps: 30 | 60 | 120 | 144;
  fov: number; // 60..110
  clouds: boolean;
  cloudQuality: 'low' | 'medium' | 'high';
  particles: boolean;
  cameraMode: 'first_person' | 'third_person_back' | 'third_person_front';
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
    sfxVolume: 0.8,
    ambientVolume: 0.6,
    environmentVolume: 0.8,
    creatureVolume: 0.8,
    combatVolume: 0.9,
    uiVolume: 0.7,
  },
  graphics: {
    preset: 'high',
    resolutionMode: 'auto',
    renderScale: 1.0,
    renderDistance: 6,
    shadows: true,
    shadowQuality: 'high',
    shadowMapSize: 2048,
    waterReflections: true,
    waterQuality: 'high',
    vegetationDensity: 'high',
    particleQuality: 'high',
    antiAliasing: true,
    antiAliasingMode: 'smaa',
    postProcessing: true,
    bloom: true,
    bloomStrength: 0.35,
    ambientOcclusion: true,
    ambientOcclusionQuality: 'high',
    colorGrading: 'cinematic',
    sharpening: true,
    sharpenStrength: 0.25,
    dynamicResolution: true,
    targetFps: 60,
    fov: 75,
    clouds: true,
    cloudQuality: 'high',
    particles: true,
    cameraMode: 'first_person',
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
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
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
      } else {
        this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
      }
    } catch {
      this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }
    this.initialized = true;
    
    // Apply CSS variables on load
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--ui-scale', this.settings.accessibility.uiScale.toString());
      root.style.setProperty('--hud-scale', this.settings.accessibility.hudScale.toString());
      root.style.setProperty('--safe-area-padding', `${this.settings.accessibility.safeAreaPadding}px`);
    }
    
    return this.settings;
  }

  public static save(): void {
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      }
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
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.style.setProperty('--ui-scale', this.settings.accessibility.uiScale.toString());
      root.style.setProperty('--hud-scale', this.settings.accessibility.hudScale.toString());
      root.style.setProperty('--safe-area-padding', `${this.settings.accessibility.safeAreaPadding}px`);
      if (this.settings.accessibility.highContrast) {
        root.classList.add('high-contrast');
      } else {
        root.classList.remove('high-contrast');
      }
    }
    this.listeners.forEach(cb => cb(this.settings));
  }
}
