// World Stability & Ley Resonance Engine for VoxelVerse 3.0
import { GameEventBus } from '../events/GameEventBus';

export interface LeyMonolith {
  id: string;
  name: string;
  pos: [number, number, number];
  activated: boolean;
  biomeId: string;
  blessing: string;
}

export class WorldStabilitySystem {
  public static stability: number = 75; // 0 to 100%
  public static activeBlessings: string[] = [];
  public static monoliths: LeyMonolith[] = [
    {
      id: 'monolith_plains',
      name: 'Verdant Ley Pillar',
      pos: [0, 80, 0],
      activated: false,
      biomeId: 'highlands',
      blessing: 'Harvest Abundance: +25% Crop & Foraging Yield',
    },
    {
      id: 'monolith_crystals',
      name: 'Cyan Resonance Spire',
      pos: [350, 95, 280],
      activated: false,
      biomeId: 'crystal_grove',
      blessing: 'Arcane Focus: +20% Stamina Regeneration & Glow Aura',
    },
    {
      id: 'monolith_volcano',
      name: 'Pyroclastic Obelisk',
      pos: [-450, 75, 520],
      activated: false,
      biomeId: 'volcanic_badlands',
      blessing: 'Flame Tempering: +15% Weapon Damage & Fire Resistance',
    },
    {
      id: 'monolith_abyss',
      name: 'Abyssal Void Ward',
      pos: [600, 60, -650],
      activated: false,
      biomeId: 'void_rift',
      blessing: 'Void Ward: -30% Damage Taken from Void Entities',
    },
  ];

  private static listeners: (() => void)[] = [];

  public static initialize(): void {
    GameEventBus.on('BOSS_DEFEATED', () => {
      this.increaseStability(25);
    });

    GameEventBus.on('ANOMALY_RESOLVED', () => {
      this.increaseStability(20);
    });

    GameEventBus.on('DUNGEON_CLEARED', () => {
      this.increaseStability(15);
    });
  }

  public static increaseStability(amount: number): void {
    this.stability = Math.min(100, Math.round(this.stability + amount));
    this.notify();
    GameEventBus.emit('STABILITY_CHANGED', { stability: this.stability });
  }

  public static decreaseStability(amount: number): void {
    this.stability = Math.max(0, Math.round(this.stability - amount));
    this.notify();
    GameEventBus.emit('STABILITY_CHANGED', { stability: this.stability });
  }

  public static activateMonolith(monolithId: string): boolean {
    const mono = this.monoliths.find(m => m.id === monolithId);
    if (mono && !mono.activated) {
      mono.activated = true;
      this.activeBlessings.push(mono.blessing);
      this.increaseStability(30);
      GameEventBus.emit('MONOLITH_ACTIVATED', { monolith: mono });
      return true;
    }
    return false;
  }

  public static getStabilityTier(): { name: string; color: string; desc: string } {
    if (this.stability >= 80) {
      return {
        name: 'Harmonious Ley Alignment',
        color: '#38bdf8',
        desc: 'The realm is in balance. +15% Mining Yield & Passive Life Bloom.',
      };
    } else if (this.stability >= 45) {
      return {
        name: 'Stable Equilibrium',
        color: '#34d399',
        desc: 'Standard physical laws hold. Normal monster activity.',
      };
    } else if (this.stability >= 20) {
      return {
        name: 'Turbulent Ley Fracture',
        color: '#fbbf24',
        desc: 'High monster spawn rate. Nocturnal stalkers emerge in shadows.',
      };
    } else {
      return {
        name: 'Void Cataclysm Rift',
        color: '#f43f5e',
        desc: 'Severe instability! Elite void aberrants roam the surface.',
      };
    }
  }

  public static subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error(e);
      }
    }
  }

  public static loadState(data: { stability?: number; activatedMonoliths?: string[] }): void {
    if (typeof data.stability === 'number') {
      this.stability = data.stability;
    }
    if (data.activatedMonoliths) {
      this.activeBlessings = [];
      for (const mono of this.monoliths) {
        if (data.activatedMonoliths.includes(mono.id)) {
          mono.activated = true;
          this.activeBlessings.push(mono.blessing);
        }
      }
    }
    this.notify();
  }

  public static saveState(): { stability: number; activatedMonoliths: string[] } {
    return {
      stability: this.stability,
      activatedMonoliths: this.monoliths.filter(m => m.activated).map(m => m.id),
    };
  }
}
