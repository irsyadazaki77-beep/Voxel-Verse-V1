// World Stability & Ley Resonance Engine for VoxelVerse 3.0
// Manages global realm equilibrium, data-driven ley blessings, stability decay/recovery loops, and procedural monolith placement.
import { GameEventBus } from '../events/GameEventBus';

export interface LeyBlessingModifiers {
  harvestYieldBonus?: number;
  staminaRegenBonus?: number;
  damageBonus?: number;
  damageReductionVoid?: number;
  miningSpeedBonus?: number;
}

export interface LeyBlessing {
  id: string;
  name: string;
  description: string;
  modifiers: LeyBlessingModifiers;
}

export interface LeyMonolith {
  id: string;
  name: string;
  pos: [number, number, number];
  activated: boolean;
  biomeId: string;
  blessing: LeyBlessing;
}

export const LEY_BLESSINGS: Record<string, LeyBlessing> = {
  harvest_abundance: {
    id: 'harvest_abundance',
    name: 'Harvest Abundance',
    description: '+25% Crop & Foraging Yield',
    modifiers: { harvestYieldBonus: 0.25 },
  },
  arcane_focus: {
    id: 'arcane_focus',
    name: 'Arcane Focus',
    description: '+20% Stamina Regeneration & Ley Glow',
    modifiers: { staminaRegenBonus: 0.20 },
  },
  flame_tempering: {
    id: 'flame_tempering',
    name: 'Flame Tempering',
    description: '+15% Weapon Attack Damage & Thermal Shielding',
    modifiers: { damageBonus: 0.15 },
  },
  void_ward: {
    id: 'void_ward',
    name: 'Abyssal Void Ward',
    description: '-30% Damage Taken from Void Aberrations',
    modifiers: { damageReductionVoid: 0.30 },
  },
};

export class WorldStabilitySystem {
  public static stability: number = 75; // 0 to 100%
  public static activeBlessings: LeyBlessing[] = [];
  public static monoliths: LeyMonolith[] = [];

  private static listeners: (() => void)[] = [];
  private static unsubscribers: (() => void)[] = [];

  /**
   * Deterministic procedural monolith placement based on world seed
   */
  public static generateMonoliths(seed: number = 1337): LeyMonolith[] {
    // Simple deterministic pseudo-random hash generator
    const pseudoRandom = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    const definitions = [
      {
        id: 'monolith_plains',
        name: 'Verdant Ley Pillar',
        biomeId: 'highlands',
        blessing: LEY_BLESSINGS.harvest_abundance,
        baseX: 40,
        baseZ: -50,
      },
      {
        id: 'monolith_crystals',
        name: 'Cyan Resonance Spire',
        biomeId: 'crystal_grove',
        blessing: LEY_BLESSINGS.arcane_focus,
        baseX: 320,
        baseZ: 260,
      },
      {
        id: 'monolith_volcano',
        name: 'Pyroclastic Obelisk',
        biomeId: 'volcanic_badlands',
        blessing: LEY_BLESSINGS.flame_tempering,
        baseX: -420,
        baseZ: 480,
      },
      {
        id: 'monolith_abyss',
        name: 'Abyssal Void Ward',
        biomeId: 'void_rift',
        blessing: LEY_BLESSINGS.void_ward,
        baseX: 580,
        baseZ: -620,
      },
    ];

    return definitions.map((def, idx) => {
      const offsetX = Math.floor(pseudoRandom(idx * 31) * 80) - 40;
      const offsetZ = Math.floor(pseudoRandom(idx * 73) * 80) - 40;
      const x = def.baseX + offsetX;
      const z = def.baseZ + offsetZ;
      const y = 68 + Math.floor(pseudoRandom(idx * 17) * 20);

      return {
        id: def.id,
        name: def.name,
        pos: [x, y, z] as [number, number, number],
        activated: false,
        biomeId: def.biomeId,
        blessing: def.blessing,
      };
    });
  }

  public static initialize(savedData?: { stability?: number; activatedMonoliths?: string[] }, seed: number = 1337): void {
    this.dispose();

    // Generate monoliths deterministically
    this.monoliths = this.generateMonoliths(seed);
    this.stability = 75;
    this.activeBlessings = [];

    if (savedData) {
      this.loadState(savedData);
    }

    // Stability Increase Sources
    const unBoss = GameEventBus.on('BOSS_DEFEATED', () => {
      this.increaseStability(25);
    });
    this.unsubscribers.push(unBoss);

    const unAnomaly = GameEventBus.on('ANOMALY_RESOLVED', () => {
      this.increaseStability(20);
    });
    this.unsubscribers.push(unAnomaly);

    const unDungeon = GameEventBus.on('DUNGEON_CLEARED', () => {
      this.increaseStability(15);
    });
    this.unsubscribers.push(unDungeon);

    const unBounty = GameEventBus.on('CONTRACT_CLAIMED', () => {
      this.increaseStability(8);
    });
    this.unsubscribers.push(unBounty);

    // Stability Decrease Sources (Failures, raids, and corruption)
    const unAnomalyFail = GameEventBus.on('ANOMALY_FAILED', () => {
      this.decreaseStability(15);
    });
    this.unsubscribers.push(unAnomalyFail);

    const unRaidFail = GameEventBus.on('SETTLEMENT_RAID_FAILED', () => {
      this.decreaseStability(20);
    });
    this.unsubscribers.push(unRaidFail);

    const unExpFail = GameEventBus.on('EXPEDITION_FAILED', () => {
      this.decreaseStability(12);
    });
    this.unsubscribers.push(unExpFail);

    const unCorruption = GameEventBus.on('CORRUPTION_SPREAD', () => {
      this.decreaseStability(5);
    });
    this.unsubscribers.push(unCorruption);
  }

  public static dispose(): void {
    this.unsubscribers.forEach((un) => un());
    this.unsubscribers = [];
    this.listeners = [];
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
    const mono = this.monoliths.find((m) => m.id === monolithId);
    if (mono && !mono.activated) {
      mono.activated = true;
      if (!this.activeBlessings.some((b) => b.id === mono.blessing.id)) {
        this.activeBlessings.push(mono.blessing);
      }
      this.increaseStability(30);
      GameEventBus.emit('MONOLITH_ACTIVATED', { monolith: mono });
      return true;
    }
    return false;
  }

  public static getStability(): number {
    return this.stability;
  }

  public static getMonoliths(): LeyMonolith[] {
    return this.monoliths;
  }

  public static getActiveBlessings(): LeyBlessing[] {
    return this.activeBlessings;
  }

  public static getStabilityTier(): { name: string; color: string; desc: string; key: 'harmonious' | 'stable' | 'turbulent' | 'cataclysm' } {
    if (this.stability >= 80) {
      return {
        name: 'Harmonious Ley Alignment',
        color: '#38bdf8',
        desc: 'The realm is in balance. +25% Harvest Yield, +15% Mining Yield & reduced monster density.',
        key: 'harmonious',
      };
    } else if (this.stability >= 45) {
      return {
        name: 'Stable Equilibrium',
        color: '#34d399',
        desc: 'Standard physical laws hold. Normal monster activity.',
        key: 'stable',
      };
    } else if (this.stability >= 20) {
      return {
        name: 'Turbulent Ley Fracture',
        color: '#fbbf24',
        desc: 'High monster spawn rate. Hostiles deal +15% damage and Shadow Stalkers roam freely.',
        key: 'turbulent',
      };
    } else {
      return {
        name: 'Void Cataclysm Rift',
        color: '#f43f5e',
        desc: 'Severe instability! Elite void aberrants roam the surface with massive aggression.',
        key: 'cataclysm',
      };
    }
  }

  /**
   * Aggregates active world stability modifiers and unlocked ley blessings into gameplay multipliers
   */
  public static getGameplayModifiers(): {
    harvestYieldMultiplier: number;
    miningYieldMultiplier: number;
    mobSpawnMultiplier: number;
    hostileDamageMultiplier: number;
    staminaRegenMultiplier: number;
    voidDamageReduction: number;
    weaponDamageMultiplier: number;
  } {
    const tier = this.getStabilityTier();
    let harvest = 1.0;
    let mining = 1.0;
    let mobSpawn = 1.0;
    let hostileDmg = 1.0;
    let staminaRegen = 1.0;
    let voidReduction = 0.0;
    let weaponDmg = 1.0;

    // Stability tier effects
    if (tier.key === 'harmonious') {
      harvest += 0.25;
      mining += 0.15;
      mobSpawn *= 0.75;
    } else if (tier.key === 'turbulent') {
      mobSpawn *= 1.5;
      hostileDmg *= 1.15;
    } else if (tier.key === 'cataclysm') {
      mobSpawn *= 2.2;
      hostileDmg *= 1.35;
    }

    // Active Ley Blessing bonuses
    for (const b of this.activeBlessings) {
      if (b.modifiers.harvestYieldBonus) harvest += b.modifiers.harvestYieldBonus;
      if (b.modifiers.miningSpeedBonus) mining += b.modifiers.miningSpeedBonus;
      if (b.modifiers.staminaRegenBonus) staminaRegen += b.modifiers.staminaRegenBonus;
      if (b.modifiers.damageReductionVoid) voidReduction += b.modifiers.damageReductionVoid;
      if (b.modifiers.damageBonus) weaponDmg += b.modifiers.damageBonus;
    }

    return {
      harvestYieldMultiplier: harvest,
      miningYieldMultiplier: mining,
      mobSpawnMultiplier: mobSpawn,
      hostileDamageMultiplier: hostileDmg,
      staminaRegenMultiplier: staminaRegen,
      voidDamageReduction: Math.min(0.75, voidReduction),
      weaponDamageMultiplier: weaponDmg,
    };
  }

  public static subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
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
          if (!this.activeBlessings.some((b) => b.id === mono.blessing.id)) {
            this.activeBlessings.push(mono.blessing);
          }
        }
      }
    }
    this.notify();
  }

  public static saveState(): { stability: number; activatedMonoliths: string[] } {
    return {
      stability: this.stability,
      activatedMonoliths: this.monoliths.filter((m) => m.activated).map((m) => m.id),
    };
  }
}
