// Global Types & Interfaces for VoxelVerse 3D
// Phase 1-6: Canonical Contracts, Type Safety, Survival Engine & Economy Systems

export type GameMode = 'survival' | 'creative' | 'adventure' | 'hardcore';
export type Difficulty = 'peaceful' | 'easy' | 'normal' | 'hard';
export type WorldPreset = 'standard' | 'continental' | 'archipelago' | 'mountainous' | 'flattish';

export enum BlockType {
  AIR = 0,
  DIRT = 1,
  GRASS = 2,
  STONE = 3,
  COBBLESTONE = 4,
  SAND = 5,
  GRAVEL = 6,
  CLAY = 7,
  OAK_LOG = 8,
  OAK_LEAVES = 9,
  PINE_LOG = 10,
  PINE_LEAVES = 11,
  CYAN_CRYSTAL_LOG = 12,
  CYAN_CRYSTAL_LEAVES = 13,
  WOOD_PLANKS = 14,
  WOOD_STAIRS = 15,
  WOOD_SLAB = 16,
  STONE_BRICKS = 17,
  STONE_STAIRS = 18,
  STONE_SLAB = 19,
  STONE_PILLAR = 20,
  GLASS = 21,
  COPPER_ORE = 22,
  IRON_ORE = 23,
  GOLD_ORE = 24,
  MYTHRIL_ORE = 25,
  AETHER_CRYSTAL_ORE = 26,
  COAL_ORE = 27,
  WATER = 28,
  LAVA = 29,
  TORCH = 30,
  LANTERN = 31,
  GLOWSTONE_CRYSTAL = 32,
  TALL_GRASS = 33,
  BLUE_FLOWER = 34,
  RED_FLOWER = 35,
  SUN_ORCHID = 36,
  LUMINESCENT_MUSHROOM = 37,
  SNOW = 38,
  ICE = 39,
  OBSIDIAN = 40,
  BASALT = 41,
  MAGMA_ROCK = 42,
  ANCIENT_RUNE_STONE = 43,
  CRAFTING_BENCH = 44,
  FURNACE = 45,
  CHEST = 46,
  DOOR_BOTTOM = 47,
  DOOR_TOP = 48,
  FENCE_WOOD = 49,
  COPPER_BLOCK = 50,
  IRON_BLOCK = 51,
  GOLD_BLOCK = 52,
  MYTHRIL_BLOCK = 53,
  MOSS_STONE = 54,
  CORAL_BLOCK = 55,
  BED_FOOT = 56,
  BED_HEAD = 57,
  BOOKSHELF = 58,
  FARMLAND = 59,
  CROP_WHEAT_0 = 60,
  CROP_WHEAT_1 = 61,
  CROP_WHEAT_2 = 62,
  CROP_WHEAT_3 = 63,
  CROP_CARROT = 64,
  CROP_HERB = 65,
  ANVIL_SMITHING = 66,
  AETHER_CORE = 77,
  AETHER_CORE_ADVANCED = 78,
  LEY_CONDUIT = 79,
  CRYSTAL_SENSOR = 80,
  LOGIC_RUNE = 81,
  DELAY_RUNE = 82,
  PULSE_RUNE = 83,
  LATCH_RUNE = 84,
  AETHER_ACTUATOR = 85,
  ITEM_FUNNEL = 86,
  AETHER_STORAGE_RELAY = 87,
  LEY_HARVESTER = 88,
  IRRIGATION_NODE = 89,
  RESONANCE_FABRICATOR = 90,
  AETHER_SENTINEL_TURRET = 91,
  AETHER_SPIKE = 92,
  SHOCK_RUNE = 93,
  FLAME_VENT = 94,
  AETHER_LAMP = 95,
  AETHER_RAIL = 96,
  AETHER_RAIL_SWITCH = 97,
  LEY_GENERATOR = 98,
}

// Block Geometry Shapes supported by engine
export type BlockShape = 'full' | 'slab' | 'stairs' | 'cross' | 'pillar' | 'torch' | 'fence' | 'door' | 'chest' | 'ladder' | 'fluid' | 'farmland' | 'crop' | 'conduit' | 'rail';

export interface BlockDef {
  id: BlockType;
  name: string;
  category: 'natural' | 'stone' | 'wood' | 'ore' | 'building' | 'functional' | 'foliage' | 'liquid' | 'magic' | 'farming' | 'engineering';
  shape: BlockShape;
  hardness: number; // break time in seconds with hand
  requiredTool?: 'pickaxe' | 'axe' | 'shovel' | 'hoe' | 'none';
  minToolTier?: number; // 0: Hand/Wood, 1: Stone/Copper, 2: Iron, 3: Mythril
  transparent?: boolean;
  solid?: boolean;
  climbable?: boolean;
  gravity?: boolean;
  movableByActuator?: boolean; // false for bedrock, containers with items, portal cores, etc.
  hazard?: 'fire' | 'lava' | 'poison';
  interactive?: boolean;
  lightEmission?: number; // 0 to 15
  color: [number, number, number]; // RGB 0-1
  topColor?: [number, number, number];
  bottomColor?: [number, number, number];
  sideColor?: [number, number, number];
  dropItem: string;
  dropCount?: [number, number]; // min, max
  soundType: 'grass' | 'stone' | 'wood' | 'sand' | 'glass' | 'snow' | 'crystal' | 'metal';
}

export interface RaycastHit {
  blockPos: [number, number, number];
  placePos: [number, number, number];
  blockType: BlockType;
  faceNormal: [number, number, number];
  distance: number;
  subHitPos?: [number, number, number];
}

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'ancient';
export type ItemCategory = 'tool' | 'weapon' | 'armor' | 'material' | 'block' | 'food' | 'consumable' | 'seed' | 'accessory' | 'potion';

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  maxStack: number;
  iconColor: string;
  description: string;
  blockType?: BlockType;
  toolType?: 'pickaxe' | 'axe' | 'shovel' | 'hoe' | 'hammer';
  tier?: number; // 0: Wood/Stone, 1: Copper/Bronze, 2: Iron/Ferrite, 3: Mythril, 4: Aurum/Aetherium, 5: Ancient
  miningEfficiency?: number;
  attackDamage?: number;
  attackSpeed?: number; // swings per second
  armorValue?: number; // base defense points
  armorSlot?: 'head' | 'chest' | 'legs' | 'feet' | 'accessory';
  thermalInsulation?: number; // cold/heat resistance
  durability?: number;
  repairMaterial?: string; // itemId used to repair
  foodValue?: number; // hunger restored
  foodRestoration?: number; // alias for foodValue
  saturationValue?: number; // saturation pool restored
  consumeTime?: number; // seconds to consume (default 1.6s)
  staminaRestore?: number;
  healValue?: number;
  fuelBurnTime?: number; // seconds of fuel provided in furnace
  burnTime?: number; // alias for fuelBurnTime
  givesEffect?: {
    id: StatusEffectType;
    duration: number;
    magnitude: number;
  };
  baseValue?: number; // economy credit / barter trade value
}

export interface ItemModifiers {
  damageBonus?: number;
  miningSpeedBonus?: number;
  defenseBonus?: number;
  durabilityBonus?: number;
}

export interface ItemStack {
  instanceId?: string;
  itemId: string;
  count: number;
  durability?: number;
  maxDurability?: number;
  customName?: string;
  quality?: 'crude' | 'common' | 'fine' | 'masterwork' | 'astral';
  modifiers?: ItemModifiers;
}

export type StatusEffectType =
  | 'regeneration'
  | 'poison'
  | 'burning'
  | 'freezing'
  | 'swiftness'
  | 'slowness'
  | 'strength'
  | 'weakness'
  | 'well_fed'
  | 'heat_exhaustion';

export interface StatusEffect {
  id: StatusEffectType;
  name: string;
  duration: number; // seconds remaining
  maxDuration: number;
  magnitude: number;
  type: 'buff' | 'debuff';
  color: string;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  category: 'basics' | 'tools' | 'weapons' | 'armor' | 'building' | 'functional' | 'food' | 'alchemy' | 'farming';
  station: 'hand' | 'crafting_bench' | 'furnace' | 'anvil';
  inputs: { itemId: string; count: number }[];
  ingredients?: { itemId: string; count: number }[]; // alias for inputs
  output: { itemId: string; count: number };
  fuelRequired?: number; // for furnace recipes
  unlockedByDefault?: boolean;
  unlockRequiresItem?: string; // itemId that unlocks recipe when picked up
  xpReward?: number;
  description?: string;
}

export interface FurnaceState {
  posKey?: string; // "x,y,z"
  pos?: [number, number, number];
  input?: ItemStack | null;
  inputSlot?: ItemStack | null;
  fuel?: ItemStack | null;
  fuelSlot?: ItemStack | null;
  output?: ItemStack | null;
  outputSlot?: ItemStack | null;
  burnTimeRemaining: number;
  maxBurnTime: number;
  cookProgress: number;
  maxCookProgress?: number;
  maxCookTime?: number;
  isLit?: boolean;
  lastWorldTime?: number;
  lastUpdateTimestamp?: number;
}

export interface FarmingPlotState {
  posKey?: string; // "x,y,z"
  pos: [number, number, number];
  cropType: 'wheat' | 'carrot' | 'potato' | 'herb' | null;
  stage?: number; // 0 to 3
  growthStage: number;
  maxGrowthStage: number;
  growthProgress: number;
  isHydrated: boolean;
  plantedWorldTime?: number;
  growthDuration?: number; // in seconds
  lastTickTimestamp?: number;
}

export interface LootItemDef {
  itemId: string;
  minCount: number;
  maxCount: number;
  weight: number;
  rarity?: ItemRarity;
}

export interface LootTableDef {
  id: string;
  rolls: [number, number]; // min, max
  items: LootItemDef[];
}

export interface BiomeDef {
  id: string;
  name: string;
  temperature: number; // -1 (freezing) to +1 (scorching)
  humidity: number; // 0 (arid) to 1 (lush)
  heightOffset: number;
  heightScale: number;
  surfaceBlock: BlockType;
  subSurfaceBlock: BlockType;
  deepStoneBlock: BlockType;
  foliageDensity: number;
  treeChance: number;
  treeType: 'oak' | 'pine' | 'crystal' | 'palm' | 'birch' | 'giant' | 'jungle' | 'dead' | 'none';
  skyColor: [number, number, number];
  fogColor: [number, number, number];
  waterColor: [number, number, number];
}

export interface EntityState {
  id: string;
  type: 'passive' | 'hostile' | 'neutral' | 'npc' | 'boss' | string;
  name: string;
  position: [number, number, number];
  velocity: [number, number, number];
  rotation: number;
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  aiState: 'idle' | 'wander' | 'roam' | 'alert' | 'investigate' | 'chase' | 'attack' | 'flee' | 'sleep' | 'return' | 'returnHome' | 'dead';
  targetEntityId?: string;
  targetPos?: [number, number, number];
  faction?: 'player' | 'wildlife' | 'predator' | 'hostile' | 'villager' | 'ancient';
  attackCooldown?: number;
  lastAttackTime?: number;
  attackRange?: number;
  attackWindup?: number; // Time before attack lands
  activeAttack?: {
    startTime: number;
    windupComplete: boolean;
    duration: number;
  };
  path?: [number, number, number][];
  pathTarget?: [number, number, number];
  pathUpdateCooldown?: number;
  modelType: string;
  scale?: [number, number, number] | number;
  drops: { itemId: string; chance: number; count: [number, number] }[];
  dialogue?: string[];
  tradeOffers?: { give: { itemId: string; count: number }; receive: { itemId: string; count: number } }[];
  isTamed?: boolean;
  isBoss?: boolean;
  isBaby?: boolean;
  trustMeter?: number;
  lastFedTime?: number;
  command?: 'follow' | 'stay' | 'wander' | 'FOLLOW' | 'STAY' | 'ROAM' | 'GUARD';
  lastProductionTime?: number;
  lastBreedingTime?: number;
  birthTime?: number;
}

export interface WeatherState {
  type: 'clear' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';
  intensity: number; // 0 - 1
  windAngle: number;
  windSpeed: number;
  durationLeft: number;
}

export interface PlayerEquipment {
  head: ItemStack | null;
  chest: ItemStack | null;
  legs: ItemStack | null;
  feet: ItemStack | null;
  accessory?: ItemStack | null;
}

export interface WorldSaveData {
  version: number;
  id: string;
  name: string;
  seed: number;
  gameMode: GameMode;
  difficulty: Difficulty;
  preset?: WorldPreset;
  createdAt: number;
  lastPlayed: number;
  gameTime: number; // seconds
  player: {
    position: [number, number, number];
    rotation: [number, number]; // [pitch, yaw]
    health: number;
    maxHealth?: number;
    stamina: number;
    maxStamina?: number;
    hunger: number;
    maxHunger?: number;
    saturation?: number;
    temperature?: number;
    oxygen?: number;
    maxOxygen?: number;
    xp: number;
    level: number;
    inventory: (ItemStack | null)[];
    hotbarIndex: number;
    equipment: PlayerEquipment;
    activeEffects?: StatusEffect[];
  };
  unlockedRecipes?: string[];
  modifiedBlocks: { [chunkKey: string]: { [localKey: string]: number } };
  containers?: { [posKey: string]: (ItemStack | null)[] };
  furnaces?: { [posKey: string]: FurnaceState };
  farmingPlots?: { [posKey: string]: FarmingPlotState };
  weather: {
    type: string;
    intensity: number;
  };
  stats: {
    blocksMined: number;
    blocksPlaced: number;
    monstersDefeated: number;
    distanceTraveled: number;
  };
  // Phase 8 & Phase 1 Hardening: Progression, Discovery, Quest, Artifact & Event Persistence
  discoveries?: { [key: string]: number }; // id -> timestamp discovered
  quests?: { [questId: string]: { state: QuestState; progress: { [objIdx: number]: number } } };
  artifactsFound?: string[];
  artifactState?: {
    unlocked: string[];
    equipped: (string | null)[];
  };
  bountyContracts?: BountyContract[];
  treasureMaps?: TreasureMap[];
  worldStability?: number;
  activatedMonoliths?: string[];
  dungeonExpedition?: ExpeditionRunState | null;
  loreUnlocked?: string[];
  defeatedBosses?: { [bossId: string]: { count: number; lastDefeatedDay: number } };
  activeEvents?: WorldEventInstance[];
  waypoints?: Waypoint[];
  exploredMapTiles?: string[]; // "chunkX,chunkZ" for fog-of-war
  lootedChests?: string[]; // posKey for one-time chests
  settlementProgress?: {
    [settlementId: string]: {
      level: number;
      reputation: number;
    }
  };
  anomalyState?: {
    status: string;
    timer: number;
    activeIntensity: number;
    climaxBossId: string | null;
    anomalyCoords: [number, number, number] | null;
    rewardClaimed: boolean;
  };
  questRewardsClaimed?: string[];
  clearedDungeons?: string[];
  aetherEngineering?: {
    machines?: Record<string, any>;
    blueprints?: any[];
  };
}

// ==========================================
// BOUNTY & TREASURE MAP TYPES
// ==========================================

export type ContractCategory = 'monster_hunt' | 'expedition' | 'foraging' | 'crafting' | 'relic_retrieval';
export type ContractStatus = 'available' | 'active' | 'completed' | 'claimed';

export interface BountyContract {
  id: string;
  title: string;
  category: ContractCategory;
  issuerSettlementId: string;
  description: string;
  targetType: string;
  targetCount: number;
  currentCount: number;
  status: ContractStatus;
  rewards: {
    xp: number;
    credits: number;
    reputation: number;
    itemReward?: { itemId: string; count: number };
  };
  timeLimitSeconds?: number;
  dangerStars: number;
}

export interface TreasureMap {
  id: string;
  name: string;
  regionHint: string;
  landmarkClue: string;
  targetPos: [number, number, number];
  isDeciphered: boolean;
  isFound: boolean;
  rewards: {
    itemId: string;
    count: number;
  }[];
  xpReward: number;
}

export interface DungeonModifier {
  id: string;
  name: string;
  description: string;
  enemyHealthMultiplier: number;
  enemyDamageMultiplier: number;
  lootDropMultiplier: number;
  rareRelicChanceBonus: number;
  hazardEffect?: 'blazing_floors' | 'aether_storm' | 'void_fog' | 'armored_horde';
}

export interface ExpeditionRunState {
  isActive: boolean;
  dungeonId: string;
  modifier: DungeonModifier | null;
  roomsCleared: number;
  totalRooms: number;
  lootCollectedCount: number;
  bossDefeated: boolean;
}

// ==========================================
// PHASE 8: EXPLORATION, PROGRESSION & CONTENT TYPES
// ==========================================

export type WorldTierId = 'tier1_haven' | 'tier2_frontier' | 'tier3_ancient' | 'tier4_abyss' | 'tier5_void';

export interface WorldTierDef {
  id: WorldTierId;
  name: string;
  subtitle: string;
  minDistance: number; // blocks from world origin (0,0)
  dangerLevel: number; // 1 to 5
  recommendedGearTier: number;
  description: string;
  hazard?: 'none' | 'cold' | 'heat' | 'poison' | 'darkness' | 'void';
}

export type DiscoveryType = 'biome' | 'landmark' | 'structure' | 'creature' | 'artifact' | 'lore' | 'settlement';

export interface DiscoveryRecord {
  id: string;
  name: string;
  type: DiscoveryType;
  description: string;
  timestamp: number;
  worldPos?: [number, number, number];
  xpReward: number;
  tier: WorldTierId;
}

export interface LoreEntry {
  id: string;
  title: string;
  category: 'origins' | 'precursors' | 'void_cataclysm' | 'fauna_flora' | 'ancient_craft';
  era: 'First Age of Ley' | 'The Zenith Era' | 'The Void Sundering' | 'Present Reclamation';
  content: string;
  discoveryLocation?: string;
}

export interface ArtifactDef {
  id: string;
  name: string;
  rarity: ItemRarity;
  description: string;
  lore: string;
  passiveAbility: string;
  effectType: 'night_vision' | 'stamina_boost' | 'thermal_aegis' | 'water_breathing' | 'void_step' | 'precursor_forge';
  tags?: string[];
  unlockedRecipes?: string[];
  iconColor: string;
}

export type QuestObjectiveType = 'kill' | 'collect' | 'visit' | 'discover' | 'craft' | 'boss';

export interface QuestObjective {
  type: QuestObjectiveType;
  description: string;
  targetId: string; // entity model, itemId, biomeId, etc.
  requiredCount: number;
  currentCount?: number;
}

export type QuestState = 'unavailable' | 'available' | 'active' | 'completed';

export interface QuestDef {
  id: string;
  title: string;
  giverName: string;
  giverSettlement?: string;
  category: 'exploration' | 'hunting' | 'gathering' | 'dungeon' | 'boss' | 'storyline';
  tier: WorldTierId;
  description: string;
  objectives: QuestObjective[];
  rewards: {
    xp: number;
    items?: { itemId: string; count: number }[];
    reputation?: { settlementId: string; amount: number };
    unlockedRecipe?: string;
    artifactHint?: string;
  };
  prerequisites?: string[]; // quest IDs required before unlocking
}

export type WorldEventType = 'meteor' | 'eclipse' | 'caravan' | 'invasion' | 'aurora';

export interface WorldEventInstance {
  id: string;
  type: WorldEventType;
  name: string;
  startTime: number;
  duration: number; // in seconds
  worldPos?: [number, number, number];
  data?: any;
  intensity?: number;
}

export interface Waypoint {
  id: string;
  name: string;
  pos: [number, number, number];
  color: string;
  icon?: string;
}

export type DungeonTheme = 'mine' | 'crypt' | 'crystal' | 'corrupted' | 'volcanic';

export type DungeonRoomType = 'entrance' | 'hallway' | 'combat' | 'puzzle' | 'treasure' | 'secret' | 'boss';

export interface DungeonRoom {
  id: string;
  type: DungeonRoomType;
  bounds: { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number };
  doors: { x: number; y: number; z: number; direction: 'north' | 'south' | 'east' | 'west' }[];
  cleared?: boolean;
  hasChest?: boolean;
  hasSpawners?: boolean;
  spawnerType?: string;
}

export interface DungeonDef {
  id: string;
  name: string;
  theme: DungeonTheme;
  tier: WorldTierId;
  originPos: [number, number, number];
  rooms: DungeonRoom[];
  bossId?: string;
  completed?: boolean;
}

export interface SettlementDef {
  id: string;
  name: string;
  biomeId: string;
  tier: WorldTierId;
  originPos: [number, number, number];
  npcIds: string[];
  services: ('trade' | 'quest' | 'craft' | 'rest')[];
}

export interface BossCombatState {
  id: string;
  name: string;
  modelType: string;
  health: number;
  maxHealth: number;
  phase: number;
  maxPhases: number;
  enraged: boolean;
  position: [number, number, number];
  activeAbility?: string;
}

export type {
  GameSettings,
  AudioSettings,
  GraphicsSettings,
  ControlSettings,
  AccessibilitySettings,
  GameplaySettings,
} from './engine/ui/SettingsManager';
