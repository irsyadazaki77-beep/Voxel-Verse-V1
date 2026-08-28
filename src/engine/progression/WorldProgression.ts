// World Progression & Region Tiers 2.0
// Soft Gating, Environmental Hazards, Distance Tiers & Danger Scalers
import { WorldTierDef, WorldTierId, PlayerEquipment } from '../../types';

export const WORLD_TIERS: Record<WorldTierId, WorldTierDef> = {
  tier1_haven: {
    id: 'tier1_haven',
    name: 'Verdant Haven',
    subtitle: 'Safe Starting Frontier',
    minDistance: 0,
    dangerLevel: 1,
    recommendedGearTier: 0, // Wood / Stone
    description: 'Temperate meadows, rolling hills, and abundant timber. Gentle wildlife with manageable nocturnal stalkers.',
    hazard: 'none',
  },
  tier2_frontier: {
    id: 'tier2_frontier',
    name: 'The Wild Frontier',
    subtitle: 'Dense Boreal & Dune Wastelands',
    minDistance: 250,
    dangerLevel: 2,
    recommendedGearTier: 1, // Copper / Bronze
    description: 'Thick untamed taiga forests, scorching dune expanses, and murky wetlands. Hostiles possess greater agility.',
    hazard: 'heat',
  },
  tier3_ancient: {
    id: 'tier3_ancient',
    name: 'Ancient Highlands & Ruins',
    subtitle: 'Alpine Peaks & Precursor Sanctuaries',
    minDistance: 550,
    dangerLevel: 3,
    recommendedGearTier: 2, // Iron / Ferrite
    description: 'Towering jagged alpine ridges and crumbling monoliths of the lost Precursors. Bitter mountain chill and armored sentinels.',
    hazard: 'cold',
  },
  tier4_abyss: {
    id: 'tier4_abyss',
    name: 'Abyssal Deeps & Crystal Hollows',
    subtitle: 'Subterranean & Crystal Realm',
    minDistance: 900,
    dangerLevel: 4,
    recommendedGearTier: 3, // Mythril
    description: 'Deep subterranean caverns beneath magma strata and glowing aetherial groves. Dense atmospheric pressure and toxic miasma.',
    hazard: 'poison',
  },
  tier5_void: {
    id: 'tier5_void',
    name: 'Void-Scarred Cataclysm',
    subtitle: 'Eldritch Badlands & Rift Shards',
    minDistance: 1400,
    dangerLevel: 5,
    recommendedGearTier: 4, // Aetherium / Astral
    description: 'The epicenter of the ancient Void Incursion. Corrupted gravity, lethal void rifts, and formidable sovereign bosses.',
    hazard: 'void',
  },
};

export class WorldProgression {
  public static getTierByDistance(distanceFromOrigin: number, yLevel: number = 60, biomeCategory?: string): WorldTierDef {
    // Deep underground check (< 20 Y)
    if (yLevel < 18) {
      return WORLD_TIERS.tier4_abyss;
    }

    // Biome hazard overrides
    if (biomeCategory === 'cold' && distanceFromOrigin > 200) {
      return distanceFromOrigin > 800 ? WORLD_TIERS.tier4_abyss : WORLD_TIERS.tier3_ancient;
    }
    if (biomeCategory === 'exotic' || biomeCategory === 'volcanic') {
      return distanceFromOrigin > 1000 ? WORLD_TIERS.tier5_void : WORLD_TIERS.tier4_abyss;
    }

    if (distanceFromOrigin >= 1400) return WORLD_TIERS.tier5_void;
    if (distanceFromOrigin >= 900) return WORLD_TIERS.tier4_abyss;
    if (distanceFromOrigin >= 550) return WORLD_TIERS.tier3_ancient;
    if (distanceFromOrigin >= 250) return WORLD_TIERS.tier2_frontier;
    return WORLD_TIERS.tier1_haven;
  }

  // Calculate environmental hazard damage or debuff based on gear protection
  public static evaluateEnvironmentalHazard(
    tier: WorldTierDef,
    temp: number,
    equipment: PlayerEquipment,
    isUnderwater: boolean,
    hasNightVision: boolean
  ): { hazardActive: boolean; type?: string; damageRate?: number; message?: string } {
    // 1. Extreme Freezing
    if (temp < -10) {
      // Check thermal armor (fur armor, iron insulated)
      const hasChestInsul = (equipment.chest?.itemId === 'fur_chest' || equipment.chest?.itemId === 'iron_chest');
      const hasFeetInsul = (equipment.feet?.itemId === 'fur_boots' || equipment.feet?.itemId === 'iron_boots');
      if (!hasChestInsul || !hasFeetInsul) {
        return {
          hazardActive: true,
          type: 'freezing',
          damageRate: 3, // 3 HP/sec
          message: 'Biting Frostbite! Wear insulated Fur or Iron armor.',
        };
      }
    }

    // 2. Extreme Scorching Heat
    if (temp > 45) {
      const hasWaterflaskOrCool = equipment.accessory?.itemId === 'solaris_aegis' || equipment.head?.itemId === 'copper_helmet';
      if (!hasWaterflaskOrCool) {
        return {
          hazardActive: true,
          type: 'heat',
          damageRate: 2,
          message: 'Extreme Heat Exhaustion! Equip sun protection.',
        };
      }
    }

    // 3. Toxic Spores / Miasma (Tier 4 Abyss / Deep Swamp)
    if (tier.hazard === 'poison') {
      const hasAccessoryProtection = equipment.accessory?.itemId === 'tidal_pearl' || equipment.accessory?.itemId === 'chrono_core';
      if (!hasAccessoryProtection && equipment.head?.itemId !== 'mythril_helmet') {
        return {
          hazardActive: true,
          type: 'poison',
          damageRate: 4,
          message: 'Toxic Abyssal Miasma! A protective Mythril Visor or Relic is needed.',
        };
      }
    }

    // 4. Void Corruption (Tier 5)
    if (tier.hazard === 'void') {
      const hasVoidRing = equipment.accessory?.itemId === 'void_walker_ring';
      if (!hasVoidRing) {
        return {
          hazardActive: true,
          type: 'void',
          damageRate: 6,
          message: 'Void Decay! The Void-Walker\'s Ring is required to resist corruption.',
        };
      }
    }

    return { hazardActive: false };
  }
}
