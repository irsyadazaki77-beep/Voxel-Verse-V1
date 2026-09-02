// Creature Registry & Data-Driven Fauna Definitions for VoxelVerse Living World 2.0
import { ItemRarity } from '../../types';

export type CreatureRole = 'PREY' | 'PREDATOR' | 'OMNIVORE' | 'SCAVENGER' | 'PASSIVE' | 'DOMESTIC' | 'AETHER_CREATURE';
export type DietType = 'HERBIVORE' | 'CARNIVORE' | 'OMNIVORE' | 'AETHER_FEEDER';
export type ActivityCycle = 'diurnal' | 'nocturnal' | 'crepuscular' | 'all_day';

export interface CreatureProductDef {
  itemId: string;
  count: number;
  intervalSeconds: number;
  requiresFood?: boolean;
}

export interface CreatureDropDef {
  itemId: string;
  chance: number;
  count: [number, number];
}

export interface CreatureDef {
  id: string;
  name: string;
  role: CreatureRole;
  biomes: string[];
  activity: ActivityCycle;
  diet: DietType;
  groupSize: [number, number]; // [min, max]
  fearRadius: number; // distance at which prey flees
  predatorTargets?: string[]; // IDs of prey this creature hunts
  tameable: boolean;
  preferredFood?: string[]; // items used to gain trust / tame
  mountCapable?: boolean;
  mountSpeedBonus?: number;
  mountJumpBonus?: number;
  breedable: boolean;
  breedingFood?: string[];
  productOutput?: CreatureProductDef;
  drops: CreatureDropDef[];
  rarity: 'common' | 'uncommon' | 'rare' | 'aetheric';
  modelType: string;
  baseHealth: number;
  baseSpeed: number;
  baseDamage: number;
  description: string;
}

export const CREATURE_REGISTRY: Record<string, CreatureDef> = {
  // 1. Aether Stag (Aether Mount Fauna)
  aether_stag: {
    id: 'aether_stag',
    name: 'Aurelion Crystal Stag',
    role: 'AETHER_CREATURE',
    biomes: ['plains', 'meadow', 'crystal_spires'],
    activity: 'all_day',
    diet: 'AETHER_FEEDER',
    groupSize: [2, 5],
    fearRadius: 8,
    tameable: true,
    preferredFood: ['aether_crystal', 'golden_fruit'],
    mountCapable: true,
    mountSpeedBonus: 1.45,
    mountJumpBonus: 1.6,
    breedable: true,
    breedingFood: ['aether_crystal'],
    drops: [
      { itemId: 'cooked_meat', chance: 1.0, count: [1, 2] },
      { itemId: 'aether_crystal', chance: 0.45, count: [1, 2] },
    ],
    rarity: 'uncommon',
    modelType: 'stag',
    baseHealth: 40,
    baseSpeed: 2.8,
    baseDamage: 0,
    description: 'A majestic stag crowned with glowing cyan crystal antlers that channel ley energy.',
  },

  // 2. Woolbeast (Domestic Wool/Fiber Livestock)
  woolbeast: {
    id: 'woolbeast',
    name: 'Boreal Woolbeast',
    role: 'DOMESTIC',
    biomes: ['plains', 'taiga', 'snow_forest', 'meadow'],
    activity: 'diurnal',
    diet: 'HERBIVORE',
    groupSize: [3, 6],
    fearRadius: 6,
    tameable: true,
    preferredFood: ['wheat', 'seeds'],
    breedable: true,
    breedingFood: ['wheat'],
    productOutput: {
      itemId: 'woolbeast_fiber',
      count: 2,
      intervalSeconds: 120,
      requiresFood: true,
    },
    drops: [
      { itemId: 'woolbeast_fiber', chance: 1.0, count: [2, 4] },
      { itemId: 'cooked_meat', chance: 0.8, count: [1, 2] },
    ],
    rarity: 'common',
    modelType: 'woolbeast',
    baseHealth: 35,
    baseSpeed: 1.8,
    baseDamage: 0,
    description: 'A fluffy quadrupeds that grazes peaceful fields, yielding thick, warmth-insulating fiber.',
  },

  // 3. Grazeback (Heavy Livestock & Milk Producer)
  grazeback: {
    id: 'grazeback',
    name: 'Ironhide Grazeback',
    role: 'DOMESTIC',
    biomes: ['plains', 'mountain', 'savanna'],
    activity: 'diurnal',
    diet: 'HERBIVORE',
    groupSize: [2, 4],
    fearRadius: 5,
    tameable: true,
    preferredFood: ['carrot', 'potato', 'wheat'],
    breedable: true,
    breedingFood: ['carrot'],
    productOutput: {
      itemId: 'milk_bucket',
      count: 1,
      intervalSeconds: 150,
      requiresFood: true,
    },
    drops: [
      { itemId: 'raw_meat', chance: 1.0, count: [2, 3] },
      { itemId: 'leather', chance: 0.6, count: [1, 2] },
    ],
    rarity: 'common',
    modelType: 'grazeback',
    baseHealth: 50,
    baseSpeed: 1.5,
    baseDamage: 4,
    description: 'A sturdy, armored grazer that supplies nourishing milk and rich hides to homesteaders.',
  },

  // 4. Shadow Wolf (Predator Pack Hunter)
  shadow_wolf: {
    id: 'shadow_wolf',
    name: 'Shadow Wolf',
    role: 'PREDATOR',
    biomes: ['forest', 'dense_forest', 'taiga', 'snow_forest'],
    activity: 'crepuscular',
    diet: 'CARNIVORE',
    groupSize: [2, 4],
    fearRadius: 0,
    predatorTargets: ['woolbeast', 'grazeback', 'glowhen', 'aether_stag'],
    tameable: true,
    preferredFood: ['raw_meat', 'cooked_meat'],
    breedable: true,
    breedingFood: ['cooked_meat'],
    drops: [
      { itemId: 'raw_meat', chance: 0.9, count: [1, 2] },
      { itemId: 'coal', chance: 0.5, count: [1, 2] },
    ],
    rarity: 'common',
    modelType: 'wolf',
    baseHealth: 45,
    baseSpeed: 3.6,
    baseDamage: 12,
    description: 'A dark predatory wolf that stalks in packs during twilight and night hours.',
  },

  // 5. Glowhen (Poultry Livestock & Egg Producer)
  glowhen: {
    id: 'glowhen',
    name: 'Luminescent Glowhen',
    role: 'DOMESTIC',
    biomes: ['forest', 'jungle', 'plains'],
    activity: 'diurnal',
    diet: 'HERBIVORE',
    groupSize: [3, 7],
    fearRadius: 7,
    tameable: true,
    preferredFood: ['seeds', 'wheat'],
    breedable: true,
    breedingFood: ['seeds'],
    productOutput: {
      itemId: 'glow_egg',
      count: 1,
      intervalSeconds: 90,
      requiresFood: true,
    },
    drops: [
      { itemId: 'cooked_meat', chance: 0.8, count: [1, 1] },
      { itemId: 'glow_egg', chance: 0.5, count: [1, 1] },
    ],
    rarity: 'common',
    modelType: 'glowhen',
    baseHealth: 15,
    baseSpeed: 2.2,
    baseDamage: 0,
    description: 'A vibrant feathered fowl whose tail feathers emit a soft warm bioluminescent glow.',
  },

  // 6. Crystal Bee (Aether Pollinator Insect)
  crystal_bee: {
    id: 'crystal_bee',
    name: 'Astral Crystal Bee',
    role: 'AETHER_CREATURE',
    biomes: ['meadow', 'crystal_spires', 'forest'],
    activity: 'diurnal',
    diet: 'AETHER_FEEDER',
    groupSize: [2, 5],
    fearRadius: 4,
    tameable: false,
    breedable: false,
    productOutput: {
      itemId: 'aether_wax',
      count: 1,
      intervalSeconds: 180,
    },
    drops: [
      { itemId: 'aether_wax', chance: 0.9, count: [1, 2] },
    ],
    rarity: 'uncommon',
    modelType: 'bee',
    baseHealth: 10,
    baseSpeed: 2.5,
    baseDamage: 2,
    description: 'A glowing Aether insect that pollinates flowers and significantly accelerates nearby crop growth.',
  },

  // 7. Glowfin (Aquatic Water Life)
  glowfin: {
    id: 'glowfin',
    name: 'Azure Glowfin',
    role: 'PASSIVE',
    biomes: ['ocean', 'deep_ocean', 'swamp', 'crystal_spires'],
    activity: 'all_day',
    diet: 'HERBIVORE',
    groupSize: [3, 8],
    fearRadius: 5,
    tameable: false,
    breedable: false,
    drops: [
      { itemId: 'aether_glowfin', chance: 1.0, count: [1, 1] },
    ],
    rarity: 'common',
    modelType: 'glowfin',
    baseHealth: 10,
    baseSpeed: 2.0,
    baseDamage: 0,
    description: 'An elegant aquatic creature with luminous blue fins swimming in pristine waters.',
  },

  // 8. Void Lynx (Rare Aether Predator)
  void_lynx: {
    id: 'void_lynx',
    name: 'Void Lynx',
    role: 'PREDATOR',
    biomes: ['corrupted_barrens', 'abyssal_chasm', 'volcanic'],
    activity: 'nocturnal',
    diet: 'CARNIVORE',
    groupSize: [1, 2],
    fearRadius: 0,
    predatorTargets: ['aether_stag', 'woolbeast', 'grazeback', 'shadow_wolf'],
    tameable: true,
    preferredFood: ['ancient_glyph', 'raw_iron'],
    mountCapable: false,
    breedable: true,
    breedingFood: ['ancient_glyph'],
    drops: [
      { itemId: 'aether_crystal', chance: 0.8, count: [1, 3] },
      { itemId: 'ancient_glyph', chance: 0.3, count: [1, 1] },
    ],
    rarity: 'rare',
    modelType: 'void_lynx',
    baseHealth: 80,
    baseSpeed: 4.2,
    baseDamage: 18,
    description: 'A elusive, deadly void feline with purple crackling energy around its claws.',
  },
};
