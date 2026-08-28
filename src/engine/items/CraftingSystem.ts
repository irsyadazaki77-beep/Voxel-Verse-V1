// Crafting System 2.0: Comprehensive Recipe Registry, Station Checks, Multi-Craft & Discovery
import { CraftingRecipe, ItemStack } from '../../types';
import { ITEM_DEFS } from './ItemRegistry';
import { InventoryManager } from './InventoryManager';

export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // ==========================================
  // 1. HAND FIELD CRAFTING (2x2 grid / on-the-go)
  // ==========================================
  {
    id: 'planks_from_oak',
    name: 'Timber Planks (4x)',
    category: 'basics',
    station: 'hand',
    unlockedByDefault: true,
    inputs: [{ itemId: 'oak_log', count: 1 }],
    output: { itemId: 'wood_planks', count: 4 },
    xpReward: 1,
  },
  {
    id: 'planks_from_pine',
    name: 'Timber Planks (4x)',
    category: 'basics',
    station: 'hand',
    unlockedByDefault: true,
    inputs: [{ itemId: 'pine_log', count: 1 }],
    output: { itemId: 'wood_planks', count: 4 },
    xpReward: 1,
  },
  {
    id: 'sticks_from_planks',
    name: 'Carved Rods (4x)',
    category: 'basics',
    station: 'hand',
    unlockedByDefault: true,
    inputs: [{ itemId: 'wood_planks', count: 2 }],
    output: { itemId: 'stick', count: 4 },
    xpReward: 1,
  },
  {
    id: 'crafting_bench_hand',
    name: 'Artisan Workbench',
    category: 'functional',
    station: 'hand',
    unlockedByDefault: true,
    inputs: [{ itemId: 'wood_planks', count: 4 }],
    output: { itemId: 'crafting_bench', count: 1 },
    xpReward: 3,
  },
  {
    id: 'torch_from_coal',
    name: 'Resin Torches (4x)',
    category: 'functional',
    station: 'hand',
    unlockedByDefault: true,
    inputs: [
      { itemId: 'coal', count: 1 },
      { itemId: 'stick', count: 1 },
    ],
    output: { itemId: 'torch', count: 4 },
    xpReward: 2,
  },
  {
    id: 'torch_from_charcoal',
    name: 'Resin Torches (Charcoal) (4x)',
    category: 'functional',
    station: 'hand',
    unlockRequiresItem: 'charcoal',
    inputs: [
      { itemId: 'charcoal', count: 1 },
      { itemId: 'stick', count: 1 },
    ],
    output: { itemId: 'torch', count: 4 },
    xpReward: 2,
  },
  {
    id: 'wooden_pickaxe_hand',
    name: 'Timber Pickaxe',
    category: 'tools',
    station: 'hand',
    unlockedByDefault: true,
    inputs: [
      { itemId: 'wood_planks', count: 3 },
      { itemId: 'stick', count: 2 },
    ],
    output: { itemId: 'wooden_pickaxe', count: 1 },
    xpReward: 3,
  },
  {
    id: 'wooden_axe_hand',
    name: 'Timber Hatchet',
    category: 'tools',
    station: 'hand',
    unlockedByDefault: true,
    inputs: [
      { itemId: 'wood_planks', count: 3 },
      { itemId: 'stick', count: 2 },
    ],
    output: { itemId: 'wooden_axe', count: 1 },
    xpReward: 3,
  },
  {
    id: 'wooden_shovel_hand',
    name: 'Timber Spade',
    category: 'tools',
    station: 'hand',
    unlockedByDefault: true,
    inputs: [
      { itemId: 'wood_planks', count: 1 },
      { itemId: 'stick', count: 2 },
    ],
    output: { itemId: 'wooden_shovel', count: 1 },
    xpReward: 2,
  },
  {
    id: 'wooden_hoe_hand',
    name: 'Timber Cultivator',
    category: 'tools',
    station: 'hand',
    unlockedByDefault: true,
    inputs: [
      { itemId: 'wood_planks', count: 2 },
      { itemId: 'stick', count: 2 },
    ],
    output: { itemId: 'wooden_hoe', count: 1 },
    xpReward: 2,
  },
  {
    id: 'wooden_sword_hand',
    name: 'Hardwood Practice Blade',
    category: 'weapons',
    station: 'hand',
    unlockedByDefault: true,
    inputs: [
      { itemId: 'wood_planks', count: 2 },
      { itemId: 'stick', count: 1 },
    ],
    output: { itemId: 'wooden_sword', count: 1 },
    xpReward: 3,
  },
  {
    id: 'bread_hand',
    name: 'Hearth Bread',
    category: 'food',
    station: 'hand',
    unlockRequiresItem: 'crop_wheat',
    inputs: [{ itemId: 'crop_wheat', count: 3 }],
    output: { itemId: 'bread', count: 1 },
    xpReward: 2,
  },

  // ==========================================
  // 2. ARTISAN WORKBENCH CRAFTING (3x3 station)
  // ==========================================
  {
    id: 'furnace_bench',
    name: 'Kiln Smelter',
    category: 'functional',
    station: 'crafting_bench',
    unlockedByDefault: true,
    inputs: [{ itemId: 'cobblestone', count: 8 }],
    output: { itemId: 'furnace', count: 1 },
    xpReward: 5,
  },
  {
    id: 'chest_bench',
    name: 'Storage Vault (Chest)',
    category: 'functional',
    station: 'crafting_bench',
    unlockedByDefault: true,
    inputs: [{ itemId: 'wood_planks', count: 8 }],
    output: { itemId: 'chest', count: 1 },
    xpReward: 4,
  },
  {
    id: 'anvil_smithing_bench',
    name: 'Forgemaster Smithing Anvil',
    category: 'functional',
    station: 'crafting_bench',
    unlockRequiresItem: 'iron_ingot',
    inputs: [
      { itemId: 'iron_block', count: 3 },
      { itemId: 'iron_ingot', count: 4 },
    ],
    output: { itemId: 'anvil_smithing', count: 1 },
    xpReward: 15,
  },
  {
    id: 'explorer_bed_bench',
    name: 'Explorer Rest Cot',
    category: 'functional',
    station: 'crafting_bench',
    unlockedByDefault: true,
    inputs: [
      { itemId: 'wood_planks', count: 3 },
      { itemId: 'leather_pelt', count: 3 },
    ],
    output: { itemId: 'explorer_bed', count: 1 },
    xpReward: 6,
  },
  {
    id: 'lantern_bench',
    name: 'Gilded Lantern',
    category: 'functional',
    station: 'crafting_bench',
    unlockRequiresItem: 'copper_ingot',
    inputs: [
      { itemId: 'torch', count: 1 },
      { itemId: 'copper_ingot', count: 4 },
    ],
    output: { itemId: 'lantern', count: 1 },
    xpReward: 4,
  },
  {
    id: 'stone_pickaxe_bench',
    name: 'Cobble Pickaxe',
    category: 'tools',
    station: 'crafting_bench',
    unlockedByDefault: true,
    inputs: [
      { itemId: 'cobblestone', count: 3 },
      { itemId: 'stick', count: 2 },
    ],
    output: { itemId: 'stone_pickaxe', count: 1 },
    xpReward: 4,
  },
  {
    id: 'copper_pickaxe_bench',
    name: 'Bronze Pickaxe',
    category: 'tools',
    station: 'crafting_bench',
    unlockRequiresItem: 'copper_ingot',
    inputs: [
      { itemId: 'copper_ingot', count: 3 },
      { itemId: 'stick', count: 2 },
    ],
    output: { itemId: 'copper_pickaxe', count: 1 },
    xpReward: 6,
  },
  {
    id: 'copper_axe_bench',
    name: 'Bronze Felling Axe',
    category: 'tools',
    station: 'crafting_bench',
    unlockRequiresItem: 'copper_ingot',
    inputs: [
      { itemId: 'copper_ingot', count: 3 },
      { itemId: 'stick', count: 2 },
    ],
    output: { itemId: 'copper_axe', count: 1 },
    xpReward: 6,
  },
  {
    id: 'copper_shovel_bench',
    name: 'Bronze Excavator',
    category: 'tools',
    station: 'crafting_bench',
    unlockRequiresItem: 'copper_ingot',
    inputs: [
      { itemId: 'copper_ingot', count: 1 },
      { itemId: 'stick', count: 2 },
    ],
    output: { itemId: 'copper_shovel', count: 1 },
    xpReward: 5,
  },
  {
    id: 'copper_blade_bench',
    name: 'Bronze Gladius',
    category: 'weapons',
    station: 'crafting_bench',
    unlockRequiresItem: 'copper_ingot',
    inputs: [
      { itemId: 'copper_ingot', count: 2 },
      { itemId: 'stick', count: 1 },
    ],
    output: { itemId: 'copper_blade', count: 1 },
    xpReward: 6,
  },
  {
    id: 'hunting_bow_bench',
    name: 'Recurve Hunting Bow',
    category: 'weapons',
    station: 'crafting_bench',
    unlockedByDefault: true,
    inputs: [
      { itemId: 'stick', count: 3 },
      { itemId: 'leather_pelt', count: 2 },
    ],
    output: { itemId: 'hunting_bow', count: 1 },
    xpReward: 6,
  },
  {
    id: 'wooden_arrow_bench',
    name: 'Flint Arrows (8x)',
    category: 'weapons',
    station: 'crafting_bench',
    unlockedByDefault: true,
    inputs: [
      { itemId: 'flint', count: 1 },
      { itemId: 'stick', count: 1 },
      { itemId: 'feather', count: 1 },
    ],
    output: { itemId: 'wooden_arrow', count: 8 },
    xpReward: 4,
  },
  {
    id: 'iron_pickaxe_bench',
    name: 'Ferrite Pickaxe',
    category: 'tools',
    station: 'crafting_bench',
    unlockRequiresItem: 'iron_ingot',
    inputs: [
      { itemId: 'iron_ingot', count: 3 },
      { itemId: 'stick', count: 2 },
    ],
    output: { itemId: 'iron_pickaxe', count: 1 },
    xpReward: 10,
  },
  {
    id: 'iron_axe_bench',
    name: 'Forged Battle-Axe',
    category: 'tools',
    station: 'crafting_bench',
    unlockRequiresItem: 'iron_ingot',
    inputs: [
      { itemId: 'iron_ingot', count: 3 },
      { itemId: 'stick', count: 2 },
    ],
    output: { itemId: 'iron_axe', count: 1 },
    xpReward: 10,
  },
  {
    id: 'iron_shovel_bench',
    name: 'Steel Trench Spade',
    category: 'tools',
    station: 'crafting_bench',
    unlockRequiresItem: 'iron_ingot',
    inputs: [
      { itemId: 'iron_ingot', count: 1 },
      { itemId: 'stick', count: 2 },
    ],
    output: { itemId: 'iron_shovel', count: 1 },
    xpReward: 8,
  },
  {
    id: 'iron_hoe_bench',
    name: 'Ferrite Agricultural Hoe',
    category: 'tools',
    station: 'crafting_bench',
    unlockRequiresItem: 'iron_ingot',
    inputs: [
      { itemId: 'iron_ingot', count: 2 },
      { itemId: 'stick', count: 2 },
    ],
    output: { itemId: 'iron_hoe', count: 1 },
    xpReward: 8,
  },
  {
    id: 'iron_blade_bench',
    name: 'Ferrite Longsword',
    category: 'weapons',
    station: 'crafting_bench',
    unlockRequiresItem: 'iron_ingot',
    inputs: [
      { itemId: 'iron_ingot', count: 2 },
      { itemId: 'stick', count: 1 },
    ],
    output: { itemId: 'iron_blade', count: 1 },
    xpReward: 12,
  },

  // Armor Sets (Workbench)
  // Leather Armor
  {
    id: 'leather_cap_bench',
    name: 'Trapper Fur Hood',
    category: 'armor',
    station: 'crafting_bench',
    unlockedByDefault: true,
    inputs: [{ itemId: 'leather_pelt', count: 5 }],
    output: { itemId: 'leather_cap', count: 1 },
    xpReward: 4,
  },
  {
    id: 'leather_tunic_bench',
    name: 'Trapper Leather Vest',
    category: 'armor',
    station: 'crafting_bench',
    unlockedByDefault: true,
    inputs: [{ itemId: 'leather_pelt', count: 8 }],
    output: { itemId: 'leather_tunic', count: 1 },
    xpReward: 6,
  },
  {
    id: 'leather_pants_bench',
    name: 'Trapper Hide Breeches',
    category: 'armor',
    station: 'crafting_bench',
    unlockedByDefault: true,
    inputs: [{ itemId: 'leather_pelt', count: 7 }],
    output: { itemId: 'leather_pants', count: 1 },
    xpReward: 5,
  },
  {
    id: 'leather_boots_bench',
    name: 'Trapper Moccasins',
    category: 'armor',
    station: 'crafting_bench',
    unlockedByDefault: true,
    inputs: [{ itemId: 'leather_pelt', count: 4 }],
    output: { itemId: 'leather_boots', count: 1 },
    xpReward: 3,
  },

  // Copper Armor
  {
    id: 'copper_helmet_bench',
    name: 'Bronze Hoplite Sallet',
    category: 'armor',
    station: 'crafting_bench',
    unlockRequiresItem: 'copper_ingot',
    inputs: [{ itemId: 'copper_ingot', count: 5 }],
    output: { itemId: 'copper_helmet', count: 1 },
    xpReward: 6,
  },
  {
    id: 'copper_chestplate_bench',
    name: 'Bronze Hoplite Cuirass',
    category: 'armor',
    station: 'crafting_bench',
    unlockRequiresItem: 'copper_ingot',
    inputs: [{ itemId: 'copper_ingot', count: 8 }],
    output: { itemId: 'copper_chestplate', count: 1 },
    xpReward: 10,
  },
  {
    id: 'copper_greaves_bench',
    name: 'Bronze Hoplite Greaves',
    category: 'armor',
    station: 'crafting_bench',
    unlockRequiresItem: 'copper_ingot',
    inputs: [{ itemId: 'copper_ingot', count: 7 }],
    output: { itemId: 'copper_greaves', count: 1 },
    xpReward: 8,
  },
  {
    id: 'copper_boots_bench',
    name: 'Bronze Hoplite Sabatons',
    category: 'armor',
    station: 'crafting_bench',
    unlockRequiresItem: 'copper_ingot',
    inputs: [{ itemId: 'copper_ingot', count: 4 }],
    output: { itemId: 'copper_boots', count: 1 },
    xpReward: 5,
  },

  // Iron Armor
  {
    id: 'iron_helmet_bench',
    name: 'Ferrite Greathelm',
    category: 'armor',
    station: 'crafting_bench',
    unlockRequiresItem: 'iron_ingot',
    inputs: [{ itemId: 'iron_ingot', count: 5 }],
    output: { itemId: 'iron_helmet', count: 1 },
    xpReward: 10,
  },
  {
    id: 'iron_chestplate_bench',
    name: 'Ferrite Cuirass',
    category: 'armor',
    station: 'crafting_bench',
    unlockRequiresItem: 'iron_ingot',
    inputs: [{ itemId: 'iron_ingot', count: 8 }],
    output: { itemId: 'iron_chestplate', count: 1 },
    xpReward: 16,
  },
  {
    id: 'iron_greaves_bench',
    name: 'Ferrite Greaves',
    category: 'armor',
    station: 'crafting_bench',
    unlockRequiresItem: 'iron_ingot',
    inputs: [{ itemId: 'iron_ingot', count: 7 }],
    output: { itemId: 'iron_greaves', count: 1 },
    xpReward: 14,
  },
  {
    id: 'iron_boots_bench',
    name: 'Ferrite Sabatons',
    category: 'armor',
    station: 'crafting_bench',
    unlockRequiresItem: 'iron_ingot',
    inputs: [{ itemId: 'iron_ingot', count: 4 }],
    output: { itemId: 'iron_boots', count: 1 },
    xpReward: 8,
  },

  // High-Tier Astral Gear (Mythril & Aether)
  {
    id: 'mythril_pickaxe_bench',
    name: 'Astral Mythril Pickaxe',
    category: 'tools',
    station: 'crafting_bench',
    unlockRequiresItem: 'mythril_ingot',
    inputs: [
      { itemId: 'mythril_ingot', count: 3 },
      { itemId: 'stick', count: 2 },
    ],
    output: { itemId: 'mythril_pickaxe', count: 1 },
    xpReward: 25,
  },
  {
    id: 'mythril_axe_bench',
    name: 'Astral War-Axe',
    category: 'tools',
    station: 'crafting_bench',
    unlockRequiresItem: 'mythril_ingot',
    inputs: [
      { itemId: 'mythril_ingot', count: 3 },
      { itemId: 'stick', count: 2 },
    ],
    output: { itemId: 'mythril_axe', count: 1 },
    xpReward: 25,
  },
  {
    id: 'mythril_saber_bench',
    name: 'Astral Mythril Saber',
    category: 'weapons',
    station: 'crafting_bench',
    unlockRequiresItem: 'mythril_ingot',
    inputs: [
      { itemId: 'mythril_ingot', count: 2 },
      { itemId: 'stick', count: 1 },
    ],
    output: { itemId: 'mythril_saber', count: 1 },
    xpReward: 30,
  },
  {
    id: 'mythril_chestplate_bench',
    name: 'Astral Mythril Plate',
    category: 'armor',
    station: 'crafting_bench',
    unlockRequiresItem: 'mythril_ingot',
    inputs: [{ itemId: 'mythril_ingot', count: 8 }],
    output: { itemId: 'mythril_chestplate', count: 1 },
    xpReward: 40,
  },
  {
    id: 'aether_staff_bench',
    name: 'Prismatic Archon Staff',
    category: 'weapons',
    station: 'crafting_bench',
    unlockRequiresItem: 'aether_crystal',
    inputs: [
      { itemId: 'aether_crystal', count: 3 },
      { itemId: 'gold_ingot', count: 2 },
      { itemId: 'stick', count: 1 },
    ],
    output: { itemId: 'aether_staff', count: 1 },
    xpReward: 60,
  },
  {
    id: 'hearty_stew_bench',
    name: 'Nomad Forest Stew',
    category: 'food',
    station: 'crafting_bench',
    unlockRequiresItem: 'cooked_meat',
    inputs: [
      { itemId: 'cooked_meat', count: 1 },
      { itemId: 'wild_carrot', count: 1 },
      { itemId: 'crop_potato', count: 1 },
    ],
    output: { itemId: 'hearty_stew', count: 1 },
    xpReward: 5,
  },

  // Blocks & Construction (Workbench)
  {
    id: 'copper_block_bench',
    name: 'Solid Bronze Alloy Block',
    category: 'building',
    station: 'crafting_bench',
    unlockRequiresItem: 'copper_ingot',
    inputs: [{ itemId: 'copper_ingot', count: 9 }],
    output: { itemId: 'copper_block', count: 1 },
    xpReward: 8,
  },
  {
    id: 'iron_block_bench',
    name: 'Forged Ferrite Block',
    category: 'building',
    station: 'crafting_bench',
    unlockRequiresItem: 'iron_ingot',
    inputs: [{ itemId: 'iron_ingot', count: 9 }],
    output: { itemId: 'iron_block', count: 1 },
    xpReward: 12,
  },
  {
    id: 'gold_block_bench',
    name: 'Ingot Aurum Block',
    category: 'building',
    station: 'crafting_bench',
    unlockRequiresItem: 'gold_ingot',
    inputs: [{ itemId: 'gold_ingot', count: 9 }],
    output: { itemId: 'gold_block', count: 1 },
    xpReward: 20,
  },
  {
    id: 'stone_bricks_bench',
    name: 'Carved Masonry Bricks (4x)',
    category: 'building',
    station: 'crafting_bench',
    unlockedByDefault: true,
    inputs: [{ itemId: 'cobblestone', count: 4 }],
    output: { itemId: 'stone_bricks', count: 4 },
    xpReward: 2,
  },
  {
    id: 'wood_stairs_bench',
    name: 'Timber Steps (4x)',
    category: 'building',
    station: 'crafting_bench',
    unlockedByDefault: true,
    inputs: [{ itemId: 'wood_planks', count: 6 }],
    output: { itemId: 'wood_stairs', count: 4 },
    xpReward: 2,
  },
  {
    id: 'wood_slab_bench',
    name: 'Timber Half-Block (6x)',
    category: 'building',
    station: 'crafting_bench',
    unlockedByDefault: true,
    inputs: [{ itemId: 'wood_planks', count: 3 }],
    output: { itemId: 'wood_slab', count: 6 },
    xpReward: 2,
  },
  {
    id: 'wood_fence_bench',
    name: 'Timber Barrier Fence (3x)',
    category: 'building',
    station: 'crafting_bench',
    unlockedByDefault: true,
    inputs: [
      { itemId: 'wood_planks', count: 4 },
      { itemId: 'stick', count: 2 },
    ],
    output: { itemId: 'wood_fence', count: 3 },
    xpReward: 2,
  },

  // ==========================================
  // 3. KILN / FURNACE SMELTING RECIPES
  // ==========================================
  {
    id: 'smelt_copper',
    name: 'Smelt Bronze Ingot',
    category: 'basics',
    station: 'furnace',
    unlockedByDefault: true,
    inputs: [{ itemId: 'raw_copper', count: 1 }],
    output: { itemId: 'copper_ingot', count: 1 },
    fuelRequired: 1,
    xpReward: 2,
  },
  {
    id: 'smelt_iron',
    name: 'Smelt Ferrite Steel Ingot',
    category: 'basics',
    station: 'furnace',
    unlockedByDefault: true,
    inputs: [{ itemId: 'raw_iron', count: 1 }],
    output: { itemId: 'iron_ingot', count: 1 },
    fuelRequired: 1.5,
    xpReward: 4,
  },
  {
    id: 'smelt_gold',
    name: 'Smelt Aurum Ingot',
    category: 'basics',
    station: 'furnace',
    unlockedByDefault: true,
    inputs: [{ itemId: 'raw_gold', count: 1 }],
    output: { itemId: 'gold_ingot', count: 1 },
    fuelRequired: 2,
    xpReward: 6,
  },
  {
    id: 'smelt_mythril',
    name: 'Smelt Astral Mythril Ingot',
    category: 'basics',
    station: 'furnace',
    unlockedByDefault: true,
    inputs: [{ itemId: 'raw_mythril', count: 1 }],
    output: { itemId: 'mythril_ingot', count: 1 },
    fuelRequired: 3,
    xpReward: 12,
  },
  {
    id: 'smelt_glass',
    name: 'Smelt Silica Glass',
    category: 'building',
    station: 'furnace',
    unlockedByDefault: true,
    inputs: [{ itemId: 'sand', count: 1 }],
    output: { itemId: 'glass', count: 1 },
    fuelRequired: 1,
    xpReward: 1,
  },
  {
    id: 'smelt_charcoal',
    name: 'Pyrolyze Charcoal',
    category: 'basics',
    station: 'furnace',
    unlockedByDefault: true,
    inputs: [{ itemId: 'oak_log', count: 1 }],
    output: { itemId: 'charcoal', count: 1 },
    fuelRequired: 1,
    xpReward: 1,
  },
  {
    id: 'smelt_clay_brick',
    name: 'Fire Terracotta Brick',
    category: 'basics',
    station: 'furnace',
    unlockedByDefault: true,
    inputs: [{ itemId: 'clay_ball', count: 1 }],
    output: { itemId: 'brick', count: 1 },
    fuelRequired: 1,
    xpReward: 1,
  },
  {
    id: 'cook_meat_furnace',
    name: 'Roast Game Tenderloin',
    category: 'food',
    station: 'furnace',
    unlockedByDefault: true,
    inputs: [{ itemId: 'raw_meat', count: 1 }],
    output: { itemId: 'cooked_meat', count: 1 },
    fuelRequired: 1,
    xpReward: 2,
  },
  {
    id: 'cook_fish_furnace',
    name: 'Sear Silver Tide Fish',
    category: 'food',
    station: 'furnace',
    unlockedByDefault: true,
    inputs: [{ itemId: 'raw_fish', count: 1 }],
    output: { itemId: 'cooked_fish', count: 1 },
    fuelRequired: 1,
    xpReward: 2,
  },
  {
    id: 'cook_potato_furnace',
    name: 'Roast Russet Potato',
    category: 'food',
    station: 'furnace',
    unlockedByDefault: true,
    inputs: [{ itemId: 'crop_potato', count: 1 }],
    output: { itemId: 'baked_potato', count: 1 },
    fuelRequired: 1,
    xpReward: 1,
  },
];

export interface CraftCalculation {
  canCraft: boolean;
  maxCraftable: number;
  missingIngredients: { itemId: string; name: string; required: number; current: number }[];
}

export class CraftingSystem {
  // Check if recipe is discovered by the player
  public static isRecipeUnlocked(recipe: CraftingRecipe, unlockedList: string[] = []): boolean {
    if (recipe.unlockedByDefault) return true;
    if (unlockedList.includes(recipe.id)) return true;
    return false;
  }

  // Scan player inventory on item acquisition to unlock matching recipes
  public static checkNewUnlocks(
    acquiredItemId: string,
    currentUnlocked: string[]
  ): { newlyUnlockedIds: string[]; newlyUnlockedRecipes: CraftingRecipe[] } {
    const newlyUnlockedIds: string[] = [];
    const newlyUnlockedRecipes: CraftingRecipe[] = [];

    for (const recipe of CRAFTING_RECIPES) {
      if (recipe.unlockRequiresItem === acquiredItemId && !currentUnlocked.includes(recipe.id)) {
        newlyUnlockedIds.push(recipe.id);
        newlyUnlockedRecipes.push(recipe);
      }
    }

    return { newlyUnlockedIds, newlyUnlockedRecipes };
  }

  // Calculate craft eligibility, max craft count, and missing ingredients breakdown
  public static calculateCraftability(
    recipe: CraftingRecipe,
    inventory: (ItemStack | null)[],
    multiplier: number = 1
  ): CraftCalculation {
    const missingIngredients: { itemId: string; name: string; required: number; current: number }[] = [];
    let maxCraftable = 9999;

    for (const input of recipe.inputs) {
      const current = InventoryManager.countItem(inventory, input.itemId);
      const needed = input.count * multiplier;
      const def = ITEM_DEFS[input.itemId];

      if (current < needed) {
        missingIngredients.push({
          itemId: input.itemId,
          name: def ? def.name : input.itemId,
          required: needed,
          current,
        });
      }

      const canMakeUnits = Math.floor(current / input.count);
      if (canMakeUnits < maxCraftable) {
        maxCraftable = canMakeUnits;
      }
    }

    return {
      canCraft: missingIngredients.length === 0 && maxCraftable >= multiplier,
      maxCraftable: Math.max(0, maxCraftable),
      missingIngredients,
    };
  }

  // Check if player can craft
  public static canCraft(recipe: CraftingRecipe, inventory: (ItemStack | null)[]): boolean {
    return this.calculateCraftability(recipe, inventory, 1).canCraft;
  }

  // Atomic craft execution with multi-craft support
  public static craftRecipe(
    recipe: CraftingRecipe,
    inventory: (ItemStack | null)[],
    countToCraft: number = 1
  ): { success: boolean; craftedCount: number; xpEarned: number } {
    if (countToCraft <= 0) return { success: false, craftedCount: 0, xpEarned: 0 };

    const calc = this.calculateCraftability(recipe, inventory, countToCraft);
    if (!calc.canCraft) return { success: false, craftedCount: 0, xpEarned: 0 };

    // Deduct inputs atomically
    for (const input of recipe.inputs) {
      const totalToRemove = input.count * countToCraft;
      const removeRes = InventoryManager.removeItem(inventory, input.itemId, totalToRemove);
      if (!removeRes.success) {
        return { success: false, craftedCount: 0, xpEarned: 0 };
      }
    }

    // Add outputs
    const totalOutputCount = recipe.output.count * countToCraft;
    InventoryManager.addItem(inventory, recipe.output.itemId, totalOutputCount);

    const xpEarned = (recipe.xpReward || 1) * countToCraft;

    return {
      success: true,
      craftedCount: totalOutputCount,
      xpEarned,
    };
  }

  // Boolean helper for single/multi-craft
  public static craft(
    recipe: CraftingRecipe,
    inventory: (ItemStack | null)[],
    countToCraft: number = 1
  ): boolean {
    return this.craftRecipe(recipe, inventory, countToCraft).success;
  }

  // Get max possible craftable count
  public static getMaxCraftable(
    recipe: CraftingRecipe,
    inventory: (ItemStack | null)[]
  ): number {
    return this.calculateCraftability(recipe, inventory, 1).maxCraftable;
  }

  // Count item helper
  public static getItemCount(
    inventory: (ItemStack | null)[],
    itemId: string
  ): number {
    return InventoryManager.countItem(inventory, itemId);
  }

  // Add item helper
  public static addItem(
    inventory: (ItemStack | null)[],
    itemId: string,
    count: number = 1
  ): number {
    const res = InventoryManager.addItem(inventory, itemId, count);
    return res.remainingCount;
  }

  // Consume item helper
  public static consumeItem(
    inventory: (ItemStack | null)[],
    itemId: string,
    count: number = 1
  ): boolean {
    const res = InventoryManager.removeItem(inventory, itemId, count);
    return res.success;
  }
}
