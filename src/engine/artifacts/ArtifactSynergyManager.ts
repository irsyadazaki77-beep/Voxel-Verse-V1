// Artifact Loadout & Synergy Engine for VoxelVerse 3.0
// Tag-based and Combination-based Relic Resonance with Capped Multipliers and Conditional Contexts
import { ARTIFACT_REGISTRY } from '../progression/ArtifactRegistry';
import { GameEventBus } from '../events/GameEventBus';

export interface ArtifactCombatContext {
  healthRatio?: number; // 0.0 to 1.0 (current / max HP)
  isNight?: boolean;
  biomeId?: string;
  inCombat?: boolean;
}

export interface ArtifactSynergyBonus {
  damageMultiplier?: number;
  critChanceBonus?: number;
  critDamageMultiplier?: number;
  staminaCostReduction?: number;
  parryShockwave?: boolean;
  lifeLeechRatio?: number;
  poiseDamageBonus?: number;
  moveSpeedBonus?: number;
  lootDropMultiplier?: number;
  defenseBonus?: number;
}

export interface ArtifactSynergy {
  id: string;
  name: string;
  description: string;
  requiredTags?: string[];
  requiredArtifacts?: string[];
  requiredArtifactCount?: number; // Optional fallback threshold
  condition?: (context?: ArtifactCombatContext) => boolean;
  bonus: ArtifactSynergyBonus;
}

export const ARTIFACT_SYNERGIES: ArtifactSynergy[] = [
  {
    id: 'synergy_berserker',
    name: "Berserker's Bloodlust",
    description: 'When below 50% HP, gain +30% Attack Damage, +15% Crit Chance, and 8% Life Leech on critical strikes.',
    requiredTags: ['berserker', 'shadow'],
    condition: (context) => (context?.healthRatio !== undefined ? context.healthRatio < 0.5 : true),
    bonus: {
      damageMultiplier: 1.30,
      critChanceBonus: 0.15,
      lifeLeechRatio: 0.08,
    },
  },
  {
    id: 'synergy_juggernaut',
    name: 'Iron Juggernaut',
    description: 'Timed parries unleash a concussive shockwave that staggers surrounding enemies and +50% Poise Damage.',
    requiredTags: ['thermal', 'defense'],
    bonus: {
      poiseDamageBonus: 1.5,
      parryShockwave: true,
      defenseBonus: 1.2,
    },
  },
  {
    id: 'synergy_aether_weaver',
    name: 'Aether Ley Weaver',
    description: 'Attacks generate arcane resonance. Dodging costs 35% less stamina and grants a burst of speed.',
    requiredTags: ['arcane', 'chrono'],
    bonus: {
      staminaCostReduction: 0.35,
      moveSpeedBonus: 1.2,
    },
  },
  {
    id: 'synergy_celestial_alignment',
    name: 'Celestial Ley Resonance',
    description: 'Harmonizes with celestial leylines. Grants daylight agility, +25% mining speed, and night vision resonance.',
    requiredTags: ['vision', 'aether'],
    bonus: {
      moveSpeedBonus: 1.15,
      lootDropMultiplier: 1.25,
      staminaCostReduction: 0.2,
    },
  },
  {
    id: 'synergy_colossus_bastion',
    name: 'Bastion of the Colossus',
    description: 'Unshakeable earth resonance. +60% Poise damage, parry shockwave, and heavy knockback resistance.',
    requiredTags: ['defense', 'earth'],
    bonus: {
      poiseDamageBonus: 1.6,
      parryShockwave: true,
      defenseBonus: 1.3,
    },
  },
  {
    id: 'synergy_abyssal_tide',
    name: 'Abyssal Oceanic Surge',
    description: 'Water breathing and fluid agility. +20% movement speed and +25% stamina recovery.',
    requiredTags: ['elemental', 'ocean'],
    bonus: {
      moveSpeedBonus: 1.20,
      staminaCostReduction: 0.25,
    },
  },
  {
    id: 'synergy_master_delver',
    name: 'Ascended Precursor Resonance',
    description: 'Ultimate 3-Relic resonance: +25% damage, +15% crit, +50% loot drops, and 30% stamina cost reduction.',
    requiredTags: ['precursor', 'arcane', 'knowledge'],
    bonus: {
      damageMultiplier: 1.25,
      critChanceBonus: 0.15,
      lootDropMultiplier: 1.5,
      staminaCostReduction: 0.3,
    },
  },
];

export class ArtifactSynergyManager {
  private static equippedArtifacts: (string | null)[] = [null, null, null]; // 3 artifact slots
  private static unlockedArtifacts: Set<string> = new Set();
  private static listeners: (() => void)[] = [];

  public static initialize(savedData?: { unlocked?: string[]; equipped?: (string | null)[] }): void {
    this.dispose();
    if (savedData) {
      this.loadState(savedData);
    } else {
      this.equippedArtifacts = [null, null, null];
      this.unlockedArtifacts = new Set();
    }
  }

  public static dispose(): void {
    this.listeners = [];
    this.unlockedArtifacts.clear();
    this.equippedArtifacts = [null, null, null];
  }

  public static getEquipped(): (string | null)[] {
    return [...this.equippedArtifacts];
  }

  public static getUnlocked(): string[] {
    return Array.from(this.unlockedArtifacts);
  }

  public static isUnlocked(artifactId: string): boolean {
    return this.unlockedArtifacts.has(artifactId);
  }

  public static unlockArtifact(artifactId: string): boolean {
    if (!this.unlockedArtifacts.has(artifactId)) {
      this.unlockedArtifacts.add(artifactId);
      // Auto-equip into first empty slot
      const emptyIdx = this.equippedArtifacts.indexOf(null);
      if (emptyIdx !== -1) {
        this.equippedArtifacts[emptyIdx] = artifactId;
      }
      this.notify();
      GameEventBus.emit('ARTIFACT_DISCOVERED', { artifactId });
      return true;
    }
    return false;
  }

  public static equipArtifact(slotIndex: number, artifactId: string | null): boolean {
    if (slotIndex < 0 || slotIndex >= 3) return false;
    if (artifactId && !this.unlockedArtifacts.has(artifactId)) return false;

    // Avoid duplicate artifact equipped in multiple slots
    if (artifactId) {
      const existingSlot = this.equippedArtifacts.indexOf(artifactId);
      if (existingSlot !== -1 && existingSlot !== slotIndex) {
        this.equippedArtifacts[existingSlot] = null;
      }
    }

    this.equippedArtifacts[slotIndex] = artifactId;
    this.notify();
    return true;
  }

  /**
   * Retrieves all currently active synergies based on tags, combinations, and count
   */
  public static getActiveSynergies(): ArtifactSynergy[] {
    const activeArtifactIds = this.equippedArtifacts.filter(Boolean) as string[];
    if (activeArtifactIds.length === 0) return [];

    // Collect all unique tags from currently equipped artifacts
    const equippedTags = new Set<string>();
    for (const artId of activeArtifactIds) {
      const def = ARTIFACT_REGISTRY[artId];
      if (def?.tags) {
        for (const tag of def.tags) {
          equippedTags.add(tag);
        }
      }
    }

    const activeList: ArtifactSynergy[] = [];

    for (const syn of ARTIFACT_SYNERGIES) {
      let isMatch = false;

      // 1. Check specific artifact IDs combination if specified
      if (syn.requiredArtifacts && syn.requiredArtifacts.length > 0) {
        const hasAllArtifacts = syn.requiredArtifacts.every((reqId) => activeArtifactIds.includes(reqId));
        if (hasAllArtifacts) {
          isMatch = true;
        }
      }

      // 2. Check tags requirement if specified
      if (!isMatch && syn.requiredTags && syn.requiredTags.length > 0) {
        const hasAllTags = syn.requiredTags.every((tag) => equippedTags.has(tag));
        if (hasAllTags) {
          isMatch = true;
        }
      }

      // 3. Fallback count threshold (for backward compatibility if no tags/artifacts specified)
      if (!isMatch && !syn.requiredArtifacts && !syn.requiredTags && syn.requiredArtifactCount) {
        if (activeArtifactIds.length >= syn.requiredArtifactCount) {
          isMatch = true;
        }
      }

      if (isMatch) {
        activeList.push(syn);
      }
    }

    return activeList;
  }

  /**
   * Evaluates combined bonuses with conditional context and strict multiplier caps
   */
  public static getCombinedBonuses(context?: ArtifactCombatContext): {
    damageMultiplier: number;
    critChanceBonus: number;
    critDamageMultiplier: number;
    staminaCostReduction: number;
    parryShockwave: boolean;
    lifeLeechRatio: number;
    poiseDamageBonus: number;
    moveSpeedBonus: number;
    lootDropMultiplier: number;
    defenseBonus: number;
  } {
    const synergies = this.getActiveSynergies();
    let dmg = 1.0;
    let crit = 0;
    let critDmg = 1.5; // Base 1.5x crit damage
    let staminaRed = 0;
    let parryShock = false;
    let leech = 0;
    let poise = 1.0;
    let speed = 1.0;
    let loot = 1.0;
    let defense = 1.0;

    for (const s of synergies) {
      // Evaluate condition if present
      if (s.condition && !s.condition(context)) {
        continue;
      }

      if (s.bonus.damageMultiplier) dmg *= s.bonus.damageMultiplier;
      if (s.bonus.critChanceBonus) crit += s.bonus.critChanceBonus;
      if (s.bonus.critDamageMultiplier) critDmg *= s.bonus.critDamageMultiplier;
      if (s.bonus.staminaCostReduction) staminaRed = Math.max(staminaRed, s.bonus.staminaCostReduction);
      if (s.bonus.parryShockwave) parryShock = true;
      if (s.bonus.lifeLeechRatio) leech += s.bonus.lifeLeechRatio;
      if (s.bonus.poiseDamageBonus) poise *= s.bonus.poiseDamageBonus;
      if (s.bonus.moveSpeedBonus) speed *= s.bonus.moveSpeedBonus;
      if (s.bonus.lootDropMultiplier) loot *= s.bonus.lootDropMultiplier;
      if (s.bonus.defenseBonus) defense *= s.bonus.defenseBonus;
    }

    // Apply strict safety caps to prevent infinite or overpowered stacking
    return {
      damageMultiplier: Math.min(2.5, Math.max(1.0, dmg)),
      critChanceBonus: Math.min(0.50, Math.max(0, crit)),
      critDamageMultiplier: Math.min(3.0, Math.max(1.5, critDmg)),
      staminaCostReduction: Math.min(0.60, Math.max(0, staminaRed)),
      parryShockwave: parryShock,
      lifeLeechRatio: Math.min(0.20, Math.max(0, leech)),
      poiseDamageBonus: Math.min(2.5, Math.max(1.0, poise)),
      moveSpeedBonus: Math.min(1.50, Math.max(1.0, speed)),
      lootDropMultiplier: Math.min(3.0, Math.max(1.0, loot)),
      defenseBonus: Math.min(2.0, Math.max(1.0, defense)),
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

  public static loadState(data: { unlocked?: string[]; equipped?: (string | null)[] }): void {
    if (data.unlocked) {
      this.unlockedArtifacts = new Set(data.unlocked);
    }
    if (data.equipped && Array.isArray(data.equipped)) {
      this.equippedArtifacts = [
        data.equipped[0] || null,
        data.equipped[1] || null,
        data.equipped[2] || null,
      ];
    }
    this.notify();
  }

  public static saveState(): { unlocked: string[]; equipped: (string | null)[] } {
    return {
      unlocked: Array.from(this.unlockedArtifacts),
      equipped: [...this.equippedArtifacts],
    };
  }
}
