// Weapon Archetypes & Tactical Combat Profiles for VoxelVerse Combat 3.0
import { ItemStack } from '../../types';
import { ITEM_DEFS } from '../items/ItemRegistry';

export type WeaponCategory = 'sword' | 'axe' | 'spear' | 'bow' | 'shield' | 'hammer' | 'staff' | 'unarmed';

export interface WeaponProfile {
  category: WeaponCategory;
  attackRange: number; // in meters (e.g. sword: 3.2m, spear: 4.8m)
  cleaveAngle: number; // in radians (e.g. sword 0.8 rad, spear 0.2 rad thrust)
  poiseDamage: number; // base poise damage dealt
  windupTime: number; // seconds
  activeTime: number; // seconds
  recoveryTime: number; // seconds
  canParry: boolean;
  canBlock: boolean;
  shieldBreaker: boolean;
  armorPiercingRatio: number; // 0..1 (bypasses % of armor)
  specialPerkName: string;
  specialPerkDesc: string;
}

export const WEAPON_PROFILES: Record<WeaponCategory, WeaponProfile> = {
  sword: {
    category: 'sword',
    attackRange: 3.2,
    cleaveAngle: 0.85,
    poiseDamage: 18,
    windupTime: 0.08,
    activeTime: 0.12,
    recoveryTime: 0.22,
    canParry: true,
    canBlock: true,
    shieldBreaker: false,
    armorPiercingRatio: 0.1,
    specialPerkName: 'Fluid Riposte',
    specialPerkDesc: '3-hit combo chain with wide finisher cleave. Parry deflects attacks into guaranteed critical ripostes.',
  },
  axe: {
    category: 'axe',
    attackRange: 2.9,
    cleaveAngle: 0.6,
    poiseDamage: 38,
    windupTime: 0.16,
    activeTime: 0.18,
    recoveryTime: 0.38,
    canParry: false,
    canBlock: false,
    shieldBreaker: true,
    armorPiercingRatio: 0.25,
    specialPerkName: 'Heavy Sunder',
    specialPerkDesc: 'Crushing overhead swing that obliterates enemy poise and shatters enemy shields.',
  },
  spear: {
    category: 'spear',
    attackRange: 4.8,
    cleaveAngle: 0.25,
    poiseDamage: 22,
    windupTime: 0.11,
    activeTime: 0.10,
    recoveryTime: 0.28,
    canParry: true,
    canBlock: false,
    shieldBreaker: false,
    armorPiercingRatio: 0.45,
    specialPerkName: 'Sweet-Spot Thrust',
    specialPerkDesc: 'Extended reach. Striking targets at maximum tip distance deals +40% bonus critical damage.',
  },
  hammer: {
    category: 'hammer',
    attackRange: 3.0,
    cleaveAngle: 1.1,
    poiseDamage: 55,
    windupTime: 0.22,
    activeTime: 0.20,
    recoveryTime: 0.45,
    canParry: false,
    canBlock: false,
    shieldBreaker: true,
    armorPiercingRatio: 0.35,
    specialPerkName: 'Ground Tremor',
    specialPerkDesc: 'Massive concussion shockwave that staggers nearby swarming foes.',
  },
  bow: {
    category: 'bow',
    attackRange: 40.0,
    cleaveAngle: 0.05,
    poiseDamage: 15,
    windupTime: 0.4,
    activeTime: 0.05,
    recoveryTime: 0.3,
    canParry: false,
    canBlock: false,
    shieldBreaker: false,
    armorPiercingRatio: 0.2,
    specialPerkName: 'Precision Draw',
    specialPerkDesc: 'Full charge grants accelerated velocity and critical trajectory damage.',
  },
  shield: {
    category: 'shield',
    attackRange: 2.0,
    cleaveAngle: 1.2,
    poiseDamage: 30,
    windupTime: 0.05,
    activeTime: 0.15,
    recoveryTime: 0.2,
    canParry: true,
    canBlock: true,
    shieldBreaker: false,
    armorPiercingRatio: 0,
    specialPerkName: 'Aegis Deflection',
    specialPerkDesc: 'Absorbs 85% damage. Timed parry in first 220ms completely nullifies damage and staggers the attacker.',
  },
  staff: {
    category: 'staff',
    attackRange: 6.0,
    cleaveAngle: 0.4,
    poiseDamage: 25,
    windupTime: 0.15,
    activeTime: 0.15,
    recoveryTime: 0.3,
    canParry: false,
    canBlock: false,
    shieldBreaker: false,
    armorPiercingRatio: 0.6,
    specialPerkName: 'Aether Burst',
    specialPerkDesc: 'Channels arcane energy that ignores physical armor and inflicts crystal resonance.',
  },
  unarmed: {
    category: 'unarmed',
    attackRange: 2.5,
    cleaveAngle: 0.6,
    poiseDamage: 8,
    windupTime: 0.06,
    activeTime: 0.10,
    recoveryTime: 0.18,
    canParry: false,
    canBlock: false,
    shieldBreaker: false,
    armorPiercingRatio: 0,
    specialPerkName: 'Brawler Punch',
    specialPerkDesc: 'Rapid light jabs.',
  },
};

export class WeaponArchetypes {
  public static getProfile(item: ItemStack | null): WeaponProfile {
    if (!item || !item.itemId) {
      return WEAPON_PROFILES.unarmed;
    }

    const id = item.itemId.toLowerCase();
    const def = ITEM_DEFS[item.itemId];

    if (id.includes('bow')) return WEAPON_PROFILES.bow;
    if (id.includes('shield') || id.includes('aegis')) return WEAPON_PROFILES.shield;
    if (id.includes('spear') || id.includes('halberd') || id.includes('trident')) return WEAPON_PROFILES.spear;
    if (id.includes('hammer') || id.includes('mace') || id.includes('warhammer')) return WEAPON_PROFILES.hammer;
    if (id.includes('axe') || def?.toolType === 'axe') return WEAPON_PROFILES.axe;
    if (id.includes('staff') || id.includes('wand') || id.includes('scepter')) return WEAPON_PROFILES.staff;
    if (id.includes('sword') || id.includes('blade') || id.includes('dagger') || id.includes('katana') || id.includes('saber')) {
      return WEAPON_PROFILES.sword;
    }

    if (def?.toolType === 'pickaxe' || def?.toolType === 'shovel') {
      return {
        ...WEAPON_PROFILES.axe,
        poiseDamage: 16,
        attackRange: 2.6,
        shieldBreaker: false,
      };
    }

    return WEAPON_PROFILES.unarmed;
  }
}
