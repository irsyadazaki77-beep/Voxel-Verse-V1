// Artifact Loadout & Synergy Engine for VoxelVerse 3.0
import { ARTIFACT_REGISTRY } from '../progression/ArtifactRegistry';
import { GameEventBus } from '../events/GameEventBus';

export interface ArtifactSynergy {
  id: string;
  name: string;
  requiredArtifactCount: number;
  description: string;
  bonus: {
    damageMultiplier?: number;
    critChanceBonus?: number;
    staminaCostReduction?: number;
    parryShockwave?: boolean;
    lifeLeechRatio?: number;
    poiseDamageBonus?: number;
    moveSpeedBonus?: number;
    lootDropMultiplier?: number;
  };
}

export const ARTIFACT_SYNERGIES: ArtifactSynergy[] = [
  {
    id: 'synergy_berserker',
    name: "Berserker's Bloodlust",
    requiredArtifactCount: 2,
    description: 'When below 50% HP, gain +35% Attack Damage and 8% Life Leech on critical strikes.',
    bonus: {
      damageMultiplier: 1.35,
      critChanceBonus: 0.15,
      lifeLeechRatio: 0.08,
    },
  },
  {
    id: 'synergy_juggernaut',
    name: 'Iron Juggernaut',
    requiredArtifactCount: 2,
    description: 'Timed parries unleash a concussive shockwave that staggers surrounding enemies and +50% Poise Damage.',
    bonus: {
      poiseDamageBonus: 1.5,
      parryShockwave: true,
    },
  },
  {
    id: 'synergy_aether_weaver',
    name: 'Aether Ley Weaver',
    requiredArtifactCount: 2,
    description: 'Attacks generate arcane resonance. Dodging costs 40% less stamina and grants a burst of speed.',
    bonus: {
      staminaCostReduction: 0.4,
      moveSpeedBonus: 1.2,
    },
  },
  {
    id: 'synergy_master_delver',
    name: 'Ascended Precursor',
    requiredArtifactCount: 3,
    description: 'Ultimate 3-Relic resonance: +25% all stats, +50% dungeon loot drops, and immunity to environmental hazards.',
    bonus: {
      damageMultiplier: 1.25,
      critChanceBonus: 0.2,
      lootDropMultiplier: 1.5,
      staminaCostReduction: 0.3,
    },
  },
];

export class ArtifactSynergyManager {
  private static equippedArtifacts: (string | null)[] = [null, null, null]; // 3 artifact slots
  private static unlockedArtifacts: Set<string> = new Set();
  private static listeners: (() => void)[] = [];

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

  public static getActiveSynergies(): ArtifactSynergy[] {
    const activeArtifacts = this.equippedArtifacts.filter(Boolean) as string[];
    const count = activeArtifacts.length;
    const activeList: ArtifactSynergy[] = [];

    for (const syn of ARTIFACT_SYNERGIES) {
      if (syn.id === 'synergy_master_delver') {
        if (count >= 3) activeList.push(syn);
      } else if (count >= 2) {
        activeList.push(syn);
      }
    }

    return activeList;
  }

  public static getCombinedBonuses(): {
    damageMultiplier: number;
    critChanceBonus: number;
    staminaCostReduction: number;
    parryShockwave: boolean;
    lifeLeechRatio: number;
    poiseDamageBonus: number;
    moveSpeedBonus: number;
    lootDropMultiplier: number;
  } {
    const synergies = this.getActiveSynergies();
    let dmg = 1.0;
    let crit = 0;
    let staminaRed = 0;
    let parryShock = false;
    let leech = 0;
    let poise = 1.0;
    let speed = 1.0;
    let loot = 1.0;

    for (const s of synergies) {
      if (s.bonus.damageMultiplier) dmg *= s.bonus.damageMultiplier;
      if (s.bonus.critChanceBonus) crit += s.bonus.critChanceBonus;
      if (s.bonus.staminaCostReduction) staminaRed = Math.max(staminaRed, s.bonus.staminaCostReduction);
      if (s.bonus.parryShockwave) parryShock = true;
      if (s.bonus.lifeLeechRatio) leech += s.bonus.lifeLeechRatio;
      if (s.bonus.poiseDamageBonus) poise *= s.bonus.poiseDamageBonus;
      if (s.bonus.moveSpeedBonus) speed *= s.bonus.moveSpeedBonus;
      if (s.bonus.lootDropMultiplier) loot *= s.bonus.lootDropMultiplier;
    }

    return {
      damageMultiplier: dmg,
      critChanceBonus: crit,
      staminaCostReduction: staminaRed,
      parryShockwave: parryShock,
      lifeLeechRatio: leech,
      poiseDamageBonus: poise,
      moveSpeedBonus: speed,
      lootDropMultiplier: loot,
    };
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
