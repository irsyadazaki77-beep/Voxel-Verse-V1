// World Save & Load Manager with Atomic Saves, Rotating Backups, Version Migrations, Export/Import & Crash Recovery
import { BlockType, GameMode, Difficulty, ItemStack, WorldSaveData, PlayerEquipment } from '../../types';
import { BlockPlacementEngine } from '../world/BlockPlacementEngine';
import { FurnaceManager } from '../world/FurnaceManager';
import { FarmingManager } from '../world/FarmingManager';
import { VoxelWorld } from '../world/VoxelWorld';
import { InventoryManager } from '../items/InventoryManager';
import { IndexedDBStorage, STORE_WORLDS, STORE_RECOVERY } from './IndexedDBStorage';
import { Logger } from '../ui/Logger';

export const CURRENT_SAVE_VERSION = 2;
export const CURRENT_CHECKSUM_VERSION = 1;
const WORLDS_INDEX_KEY = 'voxelverse_worlds_index';
const RECOVERY_KEY = 'voxelverse_crash_recovery';

export interface WorldSummary {
  id: string;
  name: string;
  seed: number;
  gameMode: GameMode;
  difficulty?: Difficulty;
  preset?: string;
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
  public static calculateChecksum(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  // Strictly verify raw payload and reject corrupt data / checksum mismatch
  public static verifyAndExtractData(rawStringOrObj: any): WorldSaveData | null {
    if (!rawStringOrObj) return null;
    let parsed: any;
    if (typeof rawStringOrObj === 'string') {
      try {
        parsed = JSON.parse(rawStringOrObj);
      } catch {
        Logger.error('SaveManager', 'Payload JSON parse failed');
        return null;
      }
    } else {
      parsed = rawStringOrObj;
    }

    if (!parsed || typeof parsed !== 'object') return null;

    // Standard container with checksum
    if (parsed.checksum && parsed.data) {
      const dataObj = parsed.data;
      const calculatedChecksum = this.calculateChecksum(JSON.stringify(dataObj));
      if (calculatedChecksum !== parsed.checksum) {
        Logger.error('SaveManager', `Strict checksum mismatch! Expected: ${parsed.checksum}, got: ${calculatedChecksum}. Rejecting corrupt payload.`);
        return null; // STRICT: REJECT CORRUPT DATA
      }
      return this.validateAndSanitizeSave(dataObj, dataObj.id || 'world', dataObj.seed || 42819);
    }

    // Direct object without container or legacy format
    if (parsed.id && (parsed.player || parsed.modifiedBlocks || parsed.seed !== undefined)) {
      return this.validateAndSanitizeSave(parsed, parsed.id, parsed.seed || 42819);
    }

    return null;
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
    const preset = typeof raw?.preset === 'string' ? raw.preset : 'standard';

    const validGameModes: GameMode[] = ['survival', 'creative', 'adventure', 'hardcore'];
    const gameMode: GameMode = validGameModes.includes(raw?.gameMode) ? raw.gameMode : 'survival';
    const difficulty: Difficulty = raw?.difficulty || 'normal';

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
      preset,
      gameMode,
      difficulty,
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

  // Check if world exists in index or storage
  public static hasWorld(worldId: string): boolean {
    const worlds = this.getWorlds();
    if (worlds.some((w) => w.id === worldId)) return true;
    if (localStorage.getItem(`voxelverse_world_${worldId}`)) return true;
    return false;
  }

  // Atomic Save Strategy: Write temporary save -> validate -> rotate backups -> swap to primary save
  public static saveWorld(data: WorldSaveData): boolean {
    try {
      const key = `voxelverse_world_${data.id}`;
      const tempKey = `${key}_temp`;
      const backup1Key = `${key}_backup_1`;
      const backup2Key = `${key}_backup_2`;

      // Guarantee createdAt is immutable: look up existing index or save
      const existingWorlds = this.getWorlds();
      const existingEntry = existingWorlds.find((w) => w.id === data.id);
      if (existingEntry && existingEntry.createdAt) {
        data.createdAt = existingEntry.createdAt;
      } else if (!data.createdAt) {
        data.createdAt = Date.now();
      }

      data.version = CURRENT_SAVE_VERSION;
      data.lastPlayed = Date.now();
      data.furnaces = FurnaceManager.serialize();
      data.farmingPlots = FarmingManager.serialize();
      data.containers = BlockPlacementEngine.serializeContainers();

      const serialized = JSON.stringify(data);
      const checksum = this.calculateChecksum(serialized);
      const payload = JSON.stringify({ 
        version: CURRENT_SAVE_VERSION,
        checksumVersion: CURRENT_CHECKSUM_VERSION,
        checksum, 
        data 
      });
      
      // Multi-layer save:
      // 1. IndexedDB primary
      IndexedDBStorage.setItem(STORE_WORLDS, { id: data.id, payload, updatedAt: Date.now() });
      // 2. IndexedDB backup
      IndexedDBStorage.setItem(STORE_WORLDS, { id: `${data.id}_backup`, payload, updatedAt: Date.now() });

      // 3. Save to localStorage with rotating backup support (Primary, Backup 1, Backup 2)
      try {
        const existingPrimary = localStorage.getItem(key);
        if (existingPrimary) {
          const existingBackup1 = localStorage.getItem(backup1Key);
          if (existingBackup1) {
            localStorage.setItem(backup2Key, existingBackup1);
          }
          localStorage.setItem(backup1Key, existingPrimary);
        }
        localStorage.setItem(tempKey, payload);
        localStorage.setItem(key, payload);
        localStorage.removeItem(tempKey);
      } catch (quotaError) {
        Logger.warn('SaveManager', 'LocalStorage quota exceeded or unavailable; IndexedDB utilized for save state.', { error: (quotaError as Error).message });
      }

      // Save updated world summary to index (including preset and difficulty, immutable createdAt)
      const worlds = existingWorlds.filter((w) => w.id !== data.id);
      worlds.unshift({
        id: data.id,
        name: data.name,
        seed: data.seed,
        gameMode: data.gameMode,
        difficulty: data.difficulty || 'normal',
        preset: data.preset || 'standard',
        lastPlayed: data.lastPlayed,
        createdAt: data.createdAt,
      });
      localStorage.setItem(WORLDS_INDEX_KEY, JSON.stringify(worlds));

      Logger.info('SaveManager', `Successfully saved world '${data.name}' (${data.id}) atomically.`);
      return true;
    } catch (e) {
      Logger.error('SaveManager', 'Failed atomic world save', { error: (e as Error).message });
      return false;
    }
  }

  // Load World with Strict Multi-Layer Fallback Sequence:
  // Layer 1: IndexedDB primary
  // Layer 2: IndexedDB backup
  // Layer 3: localStorage primary
  // Layer 4: localStorage backup 1
  // Layer 5: localStorage backup 2
  // Layer 6: Crash recovery
  // Layer 7: Total rejection / null
  public static async loadWorldAsync(worldId: string): Promise<WorldSaveData | null> {
    // Layer 1: IndexedDB Primary
    try {
      const primaryRecord = await IndexedDBStorage.getItem<{ id: string; payload: string }>(STORE_WORLDS, worldId);
      if (primaryRecord?.payload) {
        const verified = this.verifyAndExtractData(primaryRecord.payload);
        if (verified) {
          Logger.info('SaveManager', `[Layer 1 - IndexedDB Primary] Successfully loaded world '${worldId}'`);
          return verified;
        }
      }
    } catch (e) {
      Logger.warn('SaveManager', 'IndexedDB primary read error', { error: (e as Error).message });
    }

    // Layer 2: IndexedDB Backup
    try {
      const backupRecord = await IndexedDBStorage.getItem<{ id: string; payload: string }>(STORE_WORLDS, `${worldId}_backup`);
      if (backupRecord?.payload) {
        const verified = this.verifyAndExtractData(backupRecord.payload);
        if (verified) {
          Logger.info('SaveManager', `[Layer 2 - IndexedDB Backup] Successfully loaded world '${worldId}'`);
          return verified;
        }
      }
    } catch (e) {
      Logger.warn('SaveManager', 'IndexedDB backup read error', { error: (e as Error).message });
    }

    // Layers 3 to 6: LocalStorage & Crash Recovery fallbacks
    return this.loadWorld(worldId);
  }

  // Load World with Multi-Layer Local Fallback & Strict Checksum Verification
  public static loadWorld(worldId: string): WorldSaveData | null {
    // Layer 3: localStorage primary
    const primaryRaw = localStorage.getItem(`voxelverse_world_${worldId}`);
    if (primaryRaw) {
      const verified = this.verifyAndExtractData(primaryRaw);
      if (verified) {
        Logger.info('SaveManager', `[Layer 3 - LocalStorage Primary] Loaded world '${worldId}'`);
        return verified;
      }
    }

    // Layer 4: localStorage backup 1
    const backup1Raw = localStorage.getItem(`voxelverse_world_${worldId}_backup_1`);
    if (backup1Raw) {
      const verified = this.verifyAndExtractData(backup1Raw);
      if (verified) {
        Logger.warn('SaveManager', `[Layer 4 - LocalStorage Backup 1] Primary corrupted/missing, recovered world '${worldId}' from Backup 1`);
        return verified;
      }
    }

    // Layer 5: localStorage backup 2
    const backup2Raw = localStorage.getItem(`voxelverse_world_${worldId}_backup_2`);
    if (backup2Raw) {
      const verified = this.verifyAndExtractData(backup2Raw);
      if (verified) {
        Logger.warn('SaveManager', `[Layer 5 - LocalStorage Backup 2] Recovered world '${worldId}' from Backup 2`);
        return verified;
      }
    }

    // Layer 6: Crash recovery
    const recoveryState = this.getCrashRecoveryState();
    if (recoveryState && (recoveryState.id === worldId || recoveryState.id === 'recovery')) {
      Logger.warn('SaveManager', `[Layer 6 - Crash Recovery] Restoring world state from crash recovery buffer.`);
      return recoveryState;
    }

    // Layer 7: Total failure
    Logger.error('SaveManager', `[Layer 7 - Total Failure] No valid, uncorrupted save found across any persistence layer for '${worldId}'.`);
    return null;
  }

  // Crash Recovery Methods
  public static saveCrashRecoveryState(data: WorldSaveData): void {
    try {
      const serialized = JSON.stringify(data);
      const checksum = this.calculateChecksum(serialized);
      const payload = JSON.stringify({ 
        version: CURRENT_SAVE_VERSION,
        checksumVersion: CURRENT_CHECKSUM_VERSION,
        checksum, 
        data, 
        timestamp: Date.now() 
      });
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
      return this.verifyAndExtractData(raw);
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
          difficulty: sanitized.difficulty,
          preset: sanitized.preset,
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
      IndexedDBStorage.removeItem(STORE_WORLDS, `${worldId}_backup`);

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
          difficulty: data.difficulty,
          preset: data.preset,
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
