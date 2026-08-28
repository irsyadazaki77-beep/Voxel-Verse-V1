// World Save & Load Manager with Atomic Saves, Rotating Backups, Version Migrations, Export/Import & Crash Recovery
import { BlockType, GameMode, ItemStack, WorldSaveData, PlayerEquipment } from '../../types';
import { BlockPlacementEngine } from '../world/BlockPlacementEngine';
import { FurnaceManager } from '../world/FurnaceManager';
import { FarmingManager } from '../world/FarmingManager';
import { VoxelWorld } from '../world/VoxelWorld';
import { InventoryManager } from '../items/InventoryManager';
import { IndexedDBStorage, STORE_WORLDS, STORE_RECOVERY } from './IndexedDBStorage';
import { Logger } from '../ui/Logger';

export const CURRENT_SAVE_VERSION = 2;
const WORLDS_INDEX_KEY = 'voxelverse_worlds_index';
const RECOVERY_KEY = 'voxelverse_crash_recovery';

export interface WorldSummary {
  id: string;
  name: string;
  seed: number;
  gameMode: GameMode;
  lastPlayed: number;
  createdAt: number;
}

export class SaveManager {
  public static getWorlds(): WorldSummary[] {
    try {
      const raw = localStorage.getItem(WORLDS_INDEX_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      return list.filter((w) => w && typeof w.id === 'string' && typeof w.name === 'string');
    } catch (e) {
      Logger.warn('SaveManager', 'Failed to parse worlds index', { error: (e as Error).message });
      return [];
    }
  }

  // Simple string checksum calculation for save validation
  private static calculateChecksum(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  // Migration Pipeline: Migrate raw data from older schema versions deterministically
  public static migrateSaveData(raw: any): any {
    if (!raw || typeof raw !== 'object') return raw;

    let data = { ...raw };
    const initialVersion = typeof data.version === 'number' ? data.version : 1;

    if (initialVersion < 2) {
      Logger.info('SaveManager', `Migrating save schema from v${initialVersion} to v2`);
      data.version = 2;
      data.discoveries = data.discoveries || {};
      data.quests = data.quests || {};
      data.artifactsFound = Array.isArray(data.artifactsFound) ? data.artifactsFound : [];
      data.loreUnlocked = Array.isArray(data.loreUnlocked) ? data.loreUnlocked : [];
      data.defeatedBosses = data.defeatedBosses || {};
      data.activeEvents = Array.isArray(data.activeEvents) ? data.activeEvents : [];
      data.waypoints = Array.isArray(data.waypoints) ? data.waypoints : [];
      data.exploredMapTiles = Array.isArray(data.exploredMapTiles) ? data.exploredMapTiles : [];
      data.lootedChests = Array.isArray(data.lootedChests) ? data.lootedChests : [];
    }

    return data;
  }

  // Validate loaded raw data against schema and fill safe defaults
  public static validateAndSanitizeSave(rawInput: any, fallbackId: string, fallbackSeed: number): WorldSaveData {
    const raw = this.migrateSaveData(rawInput);
    const now = Date.now();
    const version = typeof raw?.version === 'number' ? raw.version : CURRENT_SAVE_VERSION;
    const id = typeof raw?.id === 'string' && raw.id ? raw.id : fallbackId;
    const name = typeof raw?.name === 'string' && raw.name ? raw.name : 'Voxel Realm';
    const seed = typeof raw?.seed === 'number' ? raw.seed : fallbackSeed;

    const validGameModes: GameMode[] = ['survival', 'creative', 'adventure', 'hardcore'];
    const gameMode: GameMode = validGameModes.includes(raw?.gameMode) ? raw.gameMode : 'survival';

    const createdAt = typeof raw?.createdAt === 'number' ? raw.createdAt : now;
    const lastPlayed = typeof raw?.lastPlayed === 'number' ? raw.lastPlayed : now;
    const gameTime = typeof raw?.gameTime === 'number' ? raw.gameTime : 28800; // 8:00 AM

    // Player validation
    const pPos =
      Array.isArray(raw?.player?.position) && raw.player.position.length === 3
        ? ([Number(raw.player.position[0]), Number(raw.player.position[1]), Number(raw.player.position[2])] as [
            number,
            number,
            number
          ])
        : ([0, 80, 0] as [number, number, number]);

    const pRot =
      Array.isArray(raw?.player?.rotation) && raw.player.rotation.length === 2
        ? ([Number(raw.player.rotation[0]), Number(raw.player.rotation[1])] as [number, number])
        : ([0, 0] as [number, number]);

    const health = typeof raw?.player?.health === 'number' ? Math.max(0, raw.player.health) : 100;
    const stamina = typeof raw?.player?.stamina === 'number' ? Math.max(0, raw.player.stamina) : 100;
    const hunger = typeof raw?.player?.hunger === 'number' ? Math.max(0, raw.player.hunger) : 100;
    const saturation = typeof raw?.player?.saturation === 'number' ? Math.max(0, raw.player.saturation) : 20;
    const temperature = typeof raw?.player?.temperature === 'number' ? raw.player.temperature : 20;
    const xp = typeof raw?.player?.xp === 'number' ? Math.max(0, raw.player.xp) : 0;
    const level = typeof raw?.player?.level === 'number' ? Math.max(1, raw.player.level) : 1;
    const hotbarIndex =
      typeof raw?.player?.hotbarIndex === 'number' ? Math.min(8, Math.max(0, raw.player.hotbarIndex)) : 0;

    // Inventory sanitize
    let inventory: (ItemStack | null)[] = new Array(36).fill(null);
    if (Array.isArray(raw?.player?.inventory)) {
      inventory = InventoryManager.sanitizeInventory(raw.player.inventory, 36);
    } else {
      inventory[0] = InventoryManager.createStack('wooden_pickaxe', 1);
      inventory[1] = InventoryManager.createStack('wooden_axe', 1);
      inventory[2] = InventoryManager.createStack('torch', 16);
      inventory[3] = InventoryManager.createStack('bread', 8);
      inventory[4] = InventoryManager.createStack('seeds_wheat', 4);
    }

    // Equipment sanitize
    const rawEq = raw?.player?.equipment || {};
    const equipment: PlayerEquipment = {
      head: InventoryManager.sanitizeSlot(rawEq.head),
      chest: InventoryManager.sanitizeSlot(rawEq.chest),
      legs: InventoryManager.sanitizeSlot(rawEq.legs),
      feet: InventoryManager.sanitizeSlot(rawEq.feet),
      accessory: InventoryManager.sanitizeSlot(rawEq.accessory),
    };

    const modifiedBlocks = typeof raw?.modifiedBlocks === 'object' && raw.modifiedBlocks ? raw.modifiedBlocks : {};
    const containers = typeof raw?.containers === 'object' && raw.containers ? raw.containers : {};
    const furnaces = typeof raw?.furnaces === 'object' && raw.furnaces ? raw.furnaces : {};
    const farmingPlots = typeof raw?.farmingPlots === 'object' && raw.farmingPlots ? raw.farmingPlots : {};
    const unlockedRecipes = Array.isArray(raw?.unlockedRecipes) ? raw.unlockedRecipes : [];

    const weather = {
      type: typeof raw?.weather?.type === 'string' ? raw.weather.type : 'clear',
      intensity: typeof raw?.weather?.intensity === 'number' ? raw.weather.intensity : 0,
    };

    const stats = {
      blocksMined: typeof raw?.stats?.blocksMined === 'number' ? raw.stats.blocksMined : 0,
      blocksPlaced: typeof raw?.stats?.blocksPlaced === 'number' ? raw.stats.blocksPlaced : 0,
      monstersDefeated: typeof raw?.stats?.monstersDefeated === 'number' ? raw.stats.monstersDefeated : 0,
      distanceTraveled: typeof raw?.stats?.distanceTraveled === 'number' ? raw.stats.distanceTraveled : 0,
    };

    const discoveries = typeof raw?.discoveries === 'object' && raw.discoveries ? raw.discoveries : {};
    const quests = typeof raw?.quests === 'object' && raw.quests ? raw.quests : {};
    const artifactsFound = Array.isArray(raw?.artifactsFound) ? raw.artifactsFound : [];
    const loreUnlocked = Array.isArray(raw?.loreUnlocked) ? raw.loreUnlocked : [];
    const defeatedBosses = typeof raw?.defeatedBosses === 'object' && raw.defeatedBosses ? raw.defeatedBosses : {};
    const activeEvents = Array.isArray(raw?.activeEvents) ? raw.activeEvents : [];
    const waypoints = Array.isArray(raw?.waypoints) ? raw.waypoints : [];
    const exploredMapTiles = Array.isArray(raw?.exploredMapTiles) ? raw.exploredMapTiles : [];
    const lootedChests = Array.isArray(raw?.lootedChests) ? raw.lootedChests : [];

    return {
      version,
      id,
      name,
      seed,
      gameMode,
      difficulty: raw?.difficulty || 'normal',
      createdAt,
      lastPlayed,
      gameTime,
      player: {
        position: pPos,
        rotation: pRot,
        health,
        stamina,
        hunger,
        saturation,
        temperature,
        xp,
        level,
        inventory,
        hotbarIndex,
        equipment,
      },
      modifiedBlocks,
      containers,
      furnaces,
      farmingPlots,
      unlockedRecipes,
      weather,
      stats,
      discoveries,
      quests,
      artifactsFound,
      loreUnlocked,
      defeatedBosses,
      activeEvents,
      waypoints,
      exploredMapTiles,
      lootedChests,
    };
  }

  // Atomic Save Strategy: Write temporary save -> validate -> rotate backups -> swap to primary save
  public static saveWorld(data: WorldSaveData): boolean {
    try {
      const key = `voxelverse_world_${data.id}`;
      const tempKey = `${key}_temp`;
      const backup1Key = `${key}_backup_1`;
      const backup2Key = `${key}_backup_2`;

      data.version = CURRENT_SAVE_VERSION;
      data.lastPlayed = Date.now();
      data.furnaces = FurnaceManager.serialize();
      data.farmingPlots = FarmingManager.serialize();
      data.containers = BlockPlacementEngine.serializeContainers();

      const serialized = JSON.stringify(data);
      const checksum = this.calculateChecksum(serialized);
      const payload = JSON.stringify({ data, checksum });

      // Step 1: Write to temp save
      localStorage.setItem(tempKey, payload);

      // Step 2: Validate temp save payload
      const verifyRaw = localStorage.getItem(tempKey);
      if (!verifyRaw) throw new Error('Temp save validation failed: empty payload');
      const verifyParsed = JSON.parse(verifyRaw);
      if (verifyParsed.checksum !== checksum) {
        throw new Error('Temp save validation failed: checksum mismatch');
      }

      // Step 3: Rotate backups
      const existingCurrent = localStorage.getItem(key);
      const existingBackup1 = localStorage.getItem(backup1Key);

      if (existingBackup1) {
        localStorage.setItem(backup2Key, existingBackup1);
      }
      if (existingCurrent) {
        localStorage.setItem(backup1Key, existingCurrent);
      }

      // Step 4: Promote temp to primary save
      localStorage.setItem(key, payload);
      localStorage.removeItem(tempKey);

      // Async sync to IndexedDB for high-capacity persistence
      IndexedDBStorage.setItem(STORE_WORLDS, { id: data.id, payload, updatedAt: Date.now() });

      // Step 5: Update world index
      const existingWorlds = this.getWorlds();
      const existingEntry = existingWorlds.find((w) => w.id === data.id);
      const createdAt = existingEntry ? existingEntry.createdAt : data.createdAt;

      const worlds = existingWorlds.filter((w) => w.id !== data.id);
      worlds.unshift({
        id: data.id,
        name: data.name,
        seed: data.seed,
        gameMode: data.gameMode,
        lastPlayed: data.lastPlayed,
        createdAt,
      });
      localStorage.setItem(WORLDS_INDEX_KEY, JSON.stringify(worlds));

      Logger.info('SaveManager', `Successfully saved world '${data.name}' (${data.id}) atomically.`);
      return true;
    } catch (e) {
      Logger.error('SaveManager', 'Failed atomic world save', { error: (e as Error).message });
      return false;
    }
  }

  // Load World with Automatic Backup Fallback
  public static loadWorld(worldId: string): WorldSaveData | null {
    const keysToTry = [
      `voxelverse_world_${worldId}`,
      `voxelverse_world_${worldId}_backup_1`,
      `voxelverse_world_${worldId}_backup_2`,
    ];

    for (const key of keysToTry) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        let parsed: any;
        try {
          parsed = JSON.parse(raw);
        } catch {
          continue;
        }

        const dataObj = parsed?.data ? parsed.data : parsed;
        if (dataObj) {
          Logger.info('SaveManager', `Loaded world '${worldId}' from key '${key}'`);
          return this.validateAndSanitizeSave(dataObj, worldId, 42819);
        }
      } catch (e) {
        Logger.warn('SaveManager', `Failed loading key '${key}'`, { error: (e as Error).message });
      }
    }

    Logger.error('SaveManager', `All load attempts and backups failed for world '${worldId}'`);
    return null;
  }

  // Crash Recovery Methods
  public static saveCrashRecoveryState(data: WorldSaveData): void {
    try {
      const payload = JSON.stringify({ data, timestamp: Date.now() });
      localStorage.setItem(RECOVERY_KEY, payload);
      IndexedDBStorage.setItem(STORE_RECOVERY, { id: 'latest_session', payload });
    } catch (e) {
      Logger.warn('SaveManager', 'Failed to write crash recovery state', { error: (e as Error).message });
    }
  }

  public static getCrashRecoveryState(): WorldSaveData | null {
    try {
      const raw = localStorage.getItem(RECOVERY_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.data) {
        return this.validateAndSanitizeSave(parsed.data, parsed.data.id || 'recovery', 12345);
      }
      return null;
    } catch {
      return null;
    }
  }

  public static clearCrashRecoveryState(): void {
    try {
      localStorage.removeItem(RECOVERY_KEY);
      IndexedDBStorage.removeItem(STORE_RECOVERY, 'latest_session');
    } catch (e) {
      Logger.warn('SaveManager', 'Failed to clear crash recovery state', { error: (e as Error).message });
    }
  }

  // Export / Import World Capabilities
  public static exportWorldJSON(worldId: string): string | null {
    const data = this.loadWorld(worldId);
    if (!data) return null;
    return JSON.stringify({ voxelVerseSave: true, schemaVersion: CURRENT_SAVE_VERSION, data }, null, 2);
  }

  public static importWorldJSON(jsonString: string): WorldSummary | null {
    try {
      const parsed = JSON.parse(jsonString);
      const data = parsed.data || parsed;
      if (!data || typeof data !== 'object') throw new Error('Invalid save payload structure');

      const importedId = `world_${Date.now()}`;
      const name = data.name ? `${data.name} (Imported)` : 'Imported Realm';
      const sanitized = this.validateAndSanitizeSave(data, importedId, data.seed || Math.floor(Math.random() * 9999999));
      sanitized.id = importedId;
      sanitized.name = name;

      if (this.saveWorld(sanitized)) {
        return {
          id: sanitized.id,
          name: sanitized.name,
          seed: sanitized.seed,
          gameMode: sanitized.gameMode,
          lastPlayed: sanitized.lastPlayed,
          createdAt: sanitized.createdAt,
        };
      }
      return null;
    } catch (e) {
      Logger.error('SaveManager', 'Failed to import world from JSON', { error: (e as Error).message });
      return null;
    }
  }

  public static deleteWorld(worldId: string): void {
    try {
      const key = `voxelverse_world_${worldId}`;
      localStorage.removeItem(key);
      localStorage.removeItem(`${key}_temp`);
      localStorage.removeItem(`${key}_backup_1`);
      localStorage.removeItem(`${key}_backup_2`);
      IndexedDBStorage.removeItem(STORE_WORLDS, worldId);

      const worlds = this.getWorlds().filter((w) => w.id !== worldId);
      localStorage.setItem(WORLDS_INDEX_KEY, JSON.stringify(worlds));
    } catch (e) {
      Logger.error('SaveManager', 'Failed to delete world', { error: (e as Error).message });
    }
  }

  public static renameWorld(worldId: string, newName: string): boolean {
    try {
      const data = this.loadWorld(worldId);
      if (!data) return false;
      data.name = newName.trim() || 'Renamed Realm';
      return this.saveWorld(data);
    } catch (e) {
      Logger.error('SaveManager', 'Failed to rename world', { error: (e as Error).message });
      return false;
    }
  }

  public static duplicateWorld(worldId: string): WorldSummary | null {
    try {
      const data = this.loadWorld(worldId);
      if (!data) return null;

      const newId = `world_${Date.now()}`;
      data.id = newId;
      data.name = `${data.name} (Copy)`;
      data.createdAt = Date.now();
      data.lastPlayed = Date.now();

      if (this.saveWorld(data)) {
        return {
          id: data.id,
          name: data.name,
          seed: data.seed,
          gameMode: data.gameMode,
          lastPlayed: data.lastPlayed,
          createdAt: data.createdAt,
        };
      }
      return null;
    } catch (e) {
      Logger.error('SaveManager', 'Failed to duplicate world', { error: (e as Error).message });
      return null;
    }
  }

  public static applySaveToWorld(world: VoxelWorld, data: WorldSaveData): void {
    world.modifiedBlocks.clear();
    if (data.modifiedBlocks) {
      Object.entries(data.modifiedBlocks).forEach(([chunkKey, blocksObj]) => {
        const localMap = new Map<string, BlockType>();
        Object.entries(blocksObj).forEach(([localKey, blockType]) => {
          localMap.set(localKey, blockType as BlockType);
        });
        world.modifiedBlocks.set(chunkKey, localMap);
      });
    }

    BlockPlacementEngine.deserializeContainers(data.containers);
    FurnaceManager.deserialize(data.furnaces);
    FarmingManager.deserialize(data.farmingPlots, world);
  }

  public static serializeModifiedBlocks(world: VoxelWorld): { [chunkKey: string]: { [localKey: string]: number } } {
    const result: { [chunkKey: string]: { [localKey: string]: number } } = {};
    world.modifiedBlocks.forEach((localMap, chunkKey) => {
      if (localMap.size > 0) {
        result[chunkKey] = {};
        localMap.forEach((blockType, localKey) => {
          result[chunkKey][localKey] = blockType;
        });
      }
    });
    return result;
  }
}
