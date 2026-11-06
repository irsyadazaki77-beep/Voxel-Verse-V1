// World Save & Load Manager with Atomic Saves, Rotating Backups, Version Migrations, Export/Import & Crash Recovery
import { BlockType, GameMode, Difficulty, ItemStack, WorldSaveData, PlayerEquipment } from '../../types';
import { BlockPlacementEngine } from '../world/BlockPlacementEngine';
import { FurnaceManager } from '../world/FurnaceManager';
import { FarmingManager } from '../world/FarmingManager';
import { VoxelWorld } from '../world/VoxelWorld';
import { InventoryManager } from '../items/InventoryManager';
import { IndexedDBStorage, STORE_WORLDS, STORE_RECOVERY } from './IndexedDBStorage';
import { makeDimensionChunkKey, parseDimensionChunkKey, CHUNK_SIZE_X, CHUNK_SIZE_Z } from '../world/WorldConfig';
import { Logger } from '../ui/Logger';

export const CURRENT_SAVE_VERSION = 3;
export const CURRENT_CHECKSUM_VERSION = 2;
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
  private static worldLockMap: Map<string, Promise<any>> = new Map();
  private static deletedWorldsSet: Set<string> = new Set();

  public static getWorlds(): WorldSummary[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(WORLDS_INDEX_KEY);
      let list: any[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) list = parsed;
        } catch {
          Logger.warn('SaveManager', 'Failed to parse worlds index from localStorage');
        }
      }

      // If index is missing or empty, salvage worlds from individual localStorage entries
      if (list.length === 0) {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('voxelverse_world_') && !key.includes('_backup') && !key.includes('_temp')) {
            const rawItem = localStorage.getItem(key);
            if (rawItem) {
              try {
                const parsed = JSON.parse(rawItem);
                const d = parsed.data || parsed;
                if (d && typeof d === 'object' && d.id) {
                  list.push({
                    id: d.id,
                    name: d.name || 'Recovered Realm',
                    seed: typeof d.seed === 'number' ? d.seed : 42819,
                    gameMode: d.gameMode || 'survival',
                    difficulty: d.difficulty || 'normal',
                    preset: d.preset || 'standard',
                    lastPlayed: typeof d.lastPlayed === 'number' ? d.lastPlayed : Date.now(),
                    createdAt: typeof d.createdAt === 'number' ? d.createdAt : Date.now(),
                  });
                }
              } catch {}
            }
          }
        }
        if (list.length > 0) {
          try {
            localStorage.setItem(WORLDS_INDEX_KEY, JSON.stringify(list));
          } catch {}
        }
      }

      return list
        .filter((w) => w && typeof w.id === 'string' && typeof w.name === 'string')
        .map((w) => ({
          ...w,
          preset: w.preset || 'standard',
          difficulty: w.difficulty || 'normal',
          seed: typeof w.seed === 'number' ? w.seed : 42819,
        }));
    } catch (e) {
      Logger.warn('SaveManager', 'Failed to read worlds index', { error: (e as Error).message });
      return [];
    }
  }

  // Full-Payload Checksum (examines 100% of bytes for strict tamper & corruption detection)
  public static calculateFullChecksum(str: string): string {
    if (!str) return '0';
    let h1 = 0xdeadbeef;
    let h2 = 0x41c64e6d;
    const len = str.length;
    for (let i = 0; i < len; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
  }

  // Legacy sampled checksum for backward compatibility with v1 saves
  public static calculateSampledChecksum(str: string): string {
    if (!str) return '0';
    let hash = 0;
    const len = str.length;
    const step = len > 4000 ? Math.floor(len / 2000) : 1;
    for (let i = 0; i < len; i += step) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash.toString(16);
  }

  public static calculateChecksum(str: string, version: number = CURRENT_CHECKSUM_VERSION): string {
    if (version === 1) {
      return this.calculateSampledChecksum(str);
    }
    return this.calculateFullChecksum(str);
  }

  public static createChecksum(payload: any, version: number = CURRENT_CHECKSUM_VERSION): string {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    return this.calculateChecksum(serialized, version);
  }

  // Synchronize index across IndexedDB and LocalStorage, salvaging worlds that exist only in IndexedDB
  public static async getWorldsAsync(): Promise<WorldSummary[]> {
    const localList = this.getWorlds();
    const indexMap = new Map<string, WorldSummary>();
    localList.forEach((w) => indexMap.set(w.id, w));

    try {
      const idbRecords = await IndexedDBStorage.getAll<{ id: string; payload: string; updatedAt?: number }>(STORE_WORLDS);
      for (const record of idbRecords) {
        if (!record || typeof record.id !== 'string') continue;
        const key = record.id;
        if (key.startsWith('__') || key.endsWith('_temp')) continue;

        const isBackup = key.endsWith('_backup') || key.endsWith('_backup_1') || key.endsWith('_backup_2');
        const primaryId = isBackup ? key.replace(/_backup(_\d)?$/, '') : key;

        if (!indexMap.has(primaryId) && record.payload) {
          const verified = this.verifyAndExtractData(record.payload);
          if (verified) {
            indexMap.set(verified.id, {
              id: verified.id,
              name: verified.name,
              seed: verified.seed,
              gameMode: verified.gameMode,
              difficulty: verified.difficulty || 'normal',
              preset: verified.preset || 'standard',
              lastPlayed: verified.lastPlayed || record.updatedAt || Date.now(),
              createdAt: verified.createdAt || Date.now(),
            });
          }
        }
      }

      const mergedList = Array.from(indexMap.values()).sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));

      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(WORLDS_INDEX_KEY, JSON.stringify(mergedList));
        } catch {}
      }

      return mergedList;
    } catch (e) {
      Logger.warn('SaveManager', 'Failed to synchronize worlds index from IndexedDB', { error: (e as Error).message });
      return localList;
    }
  }

  public static async syncWorldsIndex(): Promise<WorldSummary[]> {
    return this.getWorldsAsync();
  }

  // Strictly verify raw payload and reject corrupt data / checksum mismatch with multi-version fallback
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
    if (parsed.data) {
      if (parsed.checksum && typeof parsed.checksum === 'string') {
        const serialized = JSON.stringify(parsed.data);
        const checksumVer = typeof parsed.checksumVersion === 'number' ? parsed.checksumVersion : 0;

        let isValid = false;
        if (checksumVer >= 2) {
          isValid = this.calculateFullChecksum(serialized) === parsed.checksum;
        } else if (checksumVer === 1) {
          isValid = this.calculateSampledChecksum(serialized) === parsed.checksum;
        } else {
          // Unspecified version: test full checksum first, fallback to sampled checksum for legacy saves
          isValid =
            this.calculateFullChecksum(serialized) === parsed.checksum ||
            this.calculateSampledChecksum(serialized) === parsed.checksum;
        }

        if (!isValid) {
          Logger.error('SaveManager', `Save data checksum mismatch for payload`);
          return null; // Corrupt or tampered save data rejected
        }
      }
      const dataObj = parsed.data;
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

    if (initialVersion < 3) {
      Logger.info('SaveManager', `Migrating save schema from v${initialVersion} to v3`);
      data.version = 3;
      data.anomalyState = data.anomalyState || null;
      data.questRewardsClaimed = Array.isArray(data.questRewardsClaimed) ? data.questRewardsClaimed : [];
      data.clearedDungeons = Array.isArray(data.clearedDungeons) ? data.clearedDungeons : [];
      data.settlementProgress = typeof data.settlementProgress === 'object' && data.settlementProgress ? data.settlementProgress : {};
      data.bountyContracts = Array.isArray(data.bountyContracts) ? data.bountyContracts : [];
      data.treasureMaps = Array.isArray(data.treasureMaps) ? data.treasureMaps : [];
      data.worldStability = typeof data.worldStability === 'number' ? data.worldStability : 75;
      data.activatedMonoliths = Array.isArray(data.activatedMonoliths) ? data.activatedMonoliths : [];
      data.artifactState = data.artifactState || { unlocked: [], equipped: [null, null, null] };
      data.dungeonExpedition = data.dungeonExpedition || null;
    }

    // Migrate legacy chunk keys ("3,-8" -> "overworld:3,-8")
    if (data.modifiedBlocks && typeof data.modifiedBlocks === 'object') {
      const migratedBlocks: Record<string, any> = {};
      Object.entries(data.modifiedBlocks).forEach(([key, val]) => {
        const parsed = parseDimensionChunkKey(key);
        const canonicalKey = makeDimensionChunkKey(parsed.dimensionId, parsed.cx, parsed.cz);
        migratedBlocks[canonicalKey] = val;
      });
      data.modifiedBlocks = migratedBlocks;
    }

    if (data.modifiedBlockStates && typeof data.modifiedBlockStates === 'object') {
      const migratedStates: Record<string, any> = {};
      Object.entries(data.modifiedBlockStates).forEach(([key, val]) => {
        const parsed = parseDimensionChunkKey(key);
        const canonicalKey = makeDimensionChunkKey(parsed.dimensionId, parsed.cx, parsed.cz);
        migratedStates[canonicalKey] = val;
      });
      data.modifiedBlockStates = migratedStates;
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
    const modifiedBlockStates = typeof raw?.modifiedBlockStates === 'object' && raw.modifiedBlockStates ? raw.modifiedBlockStates : {};
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
    const settlementProgress = typeof raw?.settlementProgress === 'object' && raw.settlementProgress ? raw.settlementProgress : {};
    const anomalyState = raw?.anomalyState || null;
    const questRewardsClaimed = Array.isArray(raw?.questRewardsClaimed) ? raw.questRewardsClaimed : [];
    const clearedDungeons = Array.isArray(raw?.clearedDungeons) ? raw.clearedDungeons : [];
    const bountyContracts = Array.isArray(raw?.bountyContracts) ? raw.bountyContracts : undefined;
    const treasureMaps = Array.isArray(raw?.treasureMaps) ? raw.treasureMaps : undefined;
    const worldStability = typeof raw?.worldStability === 'number' ? raw.worldStability : 75;
    const activatedMonoliths = Array.isArray(raw?.activatedMonoliths) ? raw.activatedMonoliths : [];
    const artifactState = raw?.artifactState || undefined;
    const dungeonExpedition = raw?.dungeonExpedition || undefined;
    const aetherEngineering = typeof raw?.aetherEngineering === 'object' && raw.aetherEngineering ? raw.aetherEngineering : { machines: {} };
    const characterProgression = typeof raw?.characterProgression === 'object' && raw.characterProgression ? raw.characterProgression : undefined;
    const nusantaraState = typeof raw?.nusantaraState === 'object' && raw.nusantaraState ? raw.nusantaraState : undefined;

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
      modifiedBlockStates,
      containers,
      furnaces,
      farmingPlots,
      unlockedRecipes,
      weather,
      stats,
      discoveries,
      quests,
      artifactsFound,
      artifactState,
      bountyContracts,
      treasureMaps,
      worldStability,
      activatedMonoliths,
      dungeonExpedition,
      loreUnlocked,
      defeatedBosses,
      activeEvents,
      waypoints,
      exploredMapTiles,
      lootedChests,
      settlementProgress,
      anomalyState,
      questRewardsClaimed,
      clearedDungeons,
      aetherEngineering,
      characterProgression,
      nusantaraState,
    };
  }

  // Check if world exists in index or storage
  public static hasWorld(worldId: string): boolean {
    const worlds = this.getWorlds();
    if (worlds.some((w) => w.id === worldId)) return true;
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem(`voxelverse_world_${worldId}`)) return true;
    } catch (e) {
      Logger.warn('SaveManager', 'Failed to check if world exists in localStorage', { error: (e as Error).message });
    }
    return false;
  }

  public static async hasWorldAsync(worldId: string): Promise<boolean> {
    if (this.hasWorld(worldId)) return true;
    try {
      const keys = await IndexedDBStorage.getAllKeys(STORE_WORLDS);
      return (
        keys.includes(worldId) ||
        keys.includes(`${worldId}_backup`) ||
        keys.includes(`${worldId}_backup_1`) ||
        keys.includes(`${worldId}_backup_2`)
      );
    } catch {
      return false;
    }
  }

  // Coordination mutex for per-world serialization of save, delete, rename, and duplicate operations
  private static async runExclusive<T>(worldId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.worldLockMap.get(worldId) || Promise.resolve();
    let release: () => void = () => {};
    const current = new Promise<void>((resolve) => { release = resolve; });
    this.worldLockMap.set(worldId, previous.then(() => current, () => current));

    try {
      await previous.catch(() => {});
      return await operation();
    } finally {
      release();
      if (this.worldLockMap.get(worldId) === current) {
        this.worldLockMap.delete(worldId);
      }
    }
  }

  public static resetSessionState(): void {
    this.deletedWorldsSet.clear();
    this.worldLockMap.clear();
  }

  // Durable Asynchronous Save Strategy with active mutex coordination (Queues concurrent requests)
  public static async saveWorldAsync(data: WorldSaveData): Promise<boolean> {
    if (!data || typeof data !== 'object' || !data.id) {
      Logger.error('SaveManager', 'Cannot save corrupt or invalid WorldSaveData in-memory payload.');
      return false;
    }
    const worldId = data.id;
    return this.runExclusive(worldId, async () => {
      return this.executeSaveWorldAsync(data);
    });
  }

  // Internal execution of atomic persistent commit with historical backup rotation
  private static async executeSaveWorldAsync(data: WorldSaveData): Promise<boolean> {
    try {
      if (!data || typeof data !== 'object' || !data.id) {
        Logger.error('SaveManager', 'Rejected attempt to persist invalid save data structure.');
        return false;
      }

      if (this.deletedWorldsSet.has(data.id)) {
        Logger.warn('SaveManager', `Aborting save for deleted world '${data.id}'.`);
        return false;
      }

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
      data.preset = data.preset || 'standard';
      data.difficulty = data.difficulty || 'normal';
      data.furnaces = FurnaceManager.serialize();
      data.farmingPlots = FarmingManager.serialize();
      data.containers = BlockPlacementEngine.serializeContainers();

      const serialized = JSON.stringify(data);
      const checksum = this.calculateFullChecksum(serialized);
      const payload = JSON.stringify({ 
        version: CURRENT_SAVE_VERSION,
        checksumVersion: CURRENT_CHECKSUM_VERSION,
        checksum, 
        data 
      });
      
      let idbSuccess = false;
      let localSuccess = false;

      // 1. IndexedDB Safe Backup Rotation & Primary Commit
      try {
        // Inspect previous valid primary save in IndexedDB before overwriting
        const existingRecord = await IndexedDBStorage.getItem<{ id: string; payload: string }>(STORE_WORLDS, data.id);
        if (existingRecord?.payload) {
          const verifiedExisting = this.verifyAndExtractData(existingRecord.payload);
          if (verifiedExisting) {
            // Rotate prior verified backup 1 to backup 2
            const existingB1 = await IndexedDBStorage.getItem<{ id: string; payload: string }>(STORE_WORLDS, `${data.id}_backup_1`);
            if (existingB1?.payload && this.verifyAndExtractData(existingB1.payload)) {
              await IndexedDBStorage.setItem(STORE_WORLDS, {
                id: `${data.id}_backup_2`,
                payload: existingB1.payload,
                updatedAt: Date.now(),
              });
            }
            // Rotate verified healthy prior primary to backup 1 and standard backup
            await IndexedDBStorage.setItem(STORE_WORLDS, {
              id: `${data.id}_backup_1`,
              payload: existingRecord.payload,
              updatedAt: Date.now(),
            });
            await IndexedDBStorage.setItem(STORE_WORLDS, {
              id: `${data.id}_backup`,
              payload: existingRecord.payload,
              updatedAt: Date.now(),
            });
          } else {
            Logger.warn('SaveManager', `Prior primary record in IndexedDB for '${data.id}' failed checksum verification. Preserving existing backup untouched.`);
          }
        }

        // Commit new payload to primary IndexedDB slot
        idbSuccess = await IndexedDBStorage.setItem(STORE_WORLDS, {
          id: data.id,
          payload,
          updatedAt: Date.now(),
        });
      } catch (idbErr) {
        Logger.warn('SaveManager', 'IndexedDB write failed during saveWorldAsync', { error: (idbErr as Error).message });
      }

      // 2. LocalStorage with verified rotating backup support (Primary, Backup 1, Backup 2)
      try {
        if (typeof localStorage !== 'undefined') {
          const existingPrimary = localStorage.getItem(key);
          if (existingPrimary) {
            // Verify existing primary is healthy before rotating into backup_1
            const verifiedLocalPrimary = this.verifyAndExtractData(existingPrimary);
            if (verifiedLocalPrimary) {
              const existingBackup1 = localStorage.getItem(backup1Key);
              if (existingBackup1) {
                const verifiedBackup1 = this.verifyAndExtractData(existingBackup1);
                if (verifiedBackup1) {
                  localStorage.setItem(backup2Key, existingBackup1);
                }
              }
              localStorage.setItem(backup1Key, existingPrimary);
            } else {
              Logger.warn('SaveManager', `Prior localStorage primary for '${data.id}' was invalid. Healthy backups protected from corruption.`);
            }
          }
          localStorage.setItem(tempKey, payload);
          localStorage.setItem(key, payload);
          localStorage.removeItem(tempKey);
          localSuccess = true;
        }
      } catch (quotaError) {
        Logger.warn('SaveManager', 'LocalStorage quota exceeded or unavailable; IndexedDB utilized for save state.', { error: (quotaError as Error).message });
      }

      // Do NOT report success if both storage mechanisms failed
      if (!idbSuccess && !localSuccess) {
        Logger.error('SaveManager', `Both IndexedDB and LocalStorage writes failed for world '${data.id}'. Save was NOT persisted.`);
        return false;
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
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(WORLDS_INDEX_KEY, JSON.stringify(worlds));
        }
      } catch (err) {
        Logger.warn('SaveManager', 'Failed to save worlds list to localStorage', { error: (err as Error).message });
      }

      Logger.info('SaveManager', `Successfully saved world '${data.name}' (${data.id}) atomically (IDB: ${idbSuccess}, LocalStorage: ${localSuccess}).`);
      return true;
    } catch (e) {
      Logger.error('SaveManager', 'Failed atomic world save', { error: (e as Error).message });
      return false;
    }
  }

  // Awaitable Save Strategy: returns promise confirming persistent write
  public static saveWorld(data: WorldSaveData): Promise<boolean> {
    return this.saveWorldAsync(data);
  }

  // Inspect Available Recovery Snapshot for a world (IDB backups, LocalStorage backups, or crash recovery)
  public static async getAvailableRecoverySnapshot(worldId: string): Promise<{ layer: string; data: WorldSaveData; timestamp?: number } | null> {
    // 1. IndexedDB Backup 1
    try {
      const b1Record = await IndexedDBStorage.getItem<{ id: string; payload: string; updatedAt?: number }>(STORE_WORLDS, `${worldId}_backup_1`);
      if (b1Record?.payload) {
        const verified = this.verifyAndExtractData(b1Record.payload);
        if (verified) {
          return { layer: 'IndexedDB Historical Backup (Snapshot 1)', data: verified, timestamp: b1Record.updatedAt };
        }
      }
    } catch {}

    // 2. IndexedDB Standard Backup
    try {
      const backupRecord = await IndexedDBStorage.getItem<{ id: string; payload: string; updatedAt?: number }>(STORE_WORLDS, `${worldId}_backup`);
      if (backupRecord?.payload) {
        const verified = this.verifyAndExtractData(backupRecord.payload);
        if (verified) {
          return { layer: 'IndexedDB Historical Backup', data: verified, timestamp: backupRecord.updatedAt };
        }
      }
    } catch {}

    // 3. IndexedDB Backup 2
    try {
      const b2Record = await IndexedDBStorage.getItem<{ id: string; payload: string; updatedAt?: number }>(STORE_WORLDS, `${worldId}_backup_2`);
      if (b2Record?.payload) {
        const verified = this.verifyAndExtractData(b2Record.payload);
        if (verified) {
          return { layer: 'IndexedDB Historical Backup (Snapshot 2)', data: verified, timestamp: b2Record.updatedAt };
        }
      }
    } catch {}

    // 4. LocalStorage Backup 1
    try {
      if (typeof localStorage !== 'undefined') {
        const b1 = localStorage.getItem(`voxelverse_world_${worldId}_backup_1`);
        if (b1) {
          const verified = this.verifyAndExtractData(b1);
          if (verified) {
            return { layer: 'LocalStorage Backup (Snapshot 1)', data: verified, timestamp: verified.lastPlayed };
          }
        }
        const b2 = localStorage.getItem(`voxelverse_world_${worldId}_backup_2`);
        if (b2) {
          const verified = this.verifyAndExtractData(b2);
          if (verified) {
            return { layer: 'LocalStorage Backup (Snapshot 2)', data: verified, timestamp: verified.lastPlayed };
          }
        }
      }
    } catch {}

    // 5. Crash Recovery
    const crash = this.getCrashRecoveryState();
    if (crash && (crash.id === worldId || crash.id === 'recovery')) {
      return { layer: 'Session Crash Recovery Buffer', data: crash, timestamp: crash.lastPlayed };
    }

    return null;
  }

  // Load World with Strict Multi-Layer Fallback Sequence:
  // Layer 1: IndexedDB primary
  // Layer 2: IndexedDB backup 1
  // Layer 3: IndexedDB backup standard
  // Layer 4: IndexedDB backup 2
  // Layer 5: localStorage primary
  // Layer 6: localStorage backup 1
  // Layer 7: localStorage backup 2
  // Layer 8: Crash recovery
  // Layer 9: Total rejection / null
  public static async loadWorldAsync(worldId: string): Promise<WorldSaveData | null> {
    try {
      const asyncLoadPromise = (async () => {
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

        // Layer 2: IndexedDB Backup 1
        try {
          const b1Record = await IndexedDBStorage.getItem<{ id: string; payload: string }>(STORE_WORLDS, `${worldId}_backup_1`);
          if (b1Record?.payload) {
            const verified = this.verifyAndExtractData(b1Record.payload);
            if (verified) {
              Logger.warn('SaveManager', `[Layer 2 - IndexedDB Backup 1] Recovered world '${worldId}' from snapshot 1`);
              return verified;
            }
          }
        } catch (e) {
          Logger.warn('SaveManager', 'IndexedDB backup 1 read error', { error: (e as Error).message });
        }

        // Layer 3: IndexedDB Standard Backup
        try {
          const backupRecord = await IndexedDBStorage.getItem<{ id: string; payload: string }>(STORE_WORLDS, `${worldId}_backup`);
          if (backupRecord?.payload) {
            const verified = this.verifyAndExtractData(backupRecord.payload);
            if (verified) {
              Logger.warn('SaveManager', `[Layer 3 - IndexedDB Backup] Recovered world '${worldId}' from historical backup snapshot`);
              return verified;
            }
          }
        } catch (e) {
          Logger.warn('SaveManager', 'IndexedDB backup read error', { error: (e as Error).message });
        }

        // Layer 4: IndexedDB Backup 2
        try {
          const b2Record = await IndexedDBStorage.getItem<{ id: string; payload: string }>(STORE_WORLDS, `${worldId}_backup_2`);
          if (b2Record?.payload) {
            const verified = this.verifyAndExtractData(b2Record.payload);
            if (verified) {
              Logger.warn('SaveManager', `[Layer 4 - IndexedDB Backup 2] Recovered world '${worldId}' from snapshot 2`);
              return verified;
            }
          }
        } catch (e) {
          Logger.warn('SaveManager', 'IndexedDB backup 2 read error', { error: (e as Error).message });
        }

        // Layers 5 to 8: LocalStorage & Crash Recovery fallbacks
        return this.loadWorld(worldId);
      })();

      const timeoutFallback = new Promise<WorldSaveData | null>((resolve) => {
        setTimeout(() => {
          Logger.info('SaveManager', `Async load timed out after 3000ms, falling back directly to localStorage for world '${worldId}'`);
          resolve(this.loadWorld(worldId));
        }, 3000);
      });

      return await Promise.race([asyncLoadPromise, timeoutFallback]);
    } catch (e) {
      Logger.warn('SaveManager', 'loadWorldAsync failed, attempting synchronous fallback', { error: (e as Error).message });
      return this.loadWorld(worldId);
    }
  }


  // Load World with Multi-Layer Local Fallback & Strict Checksum Verification
  public static loadWorld(worldId: string): WorldSaveData | null {
    try {
      if (typeof localStorage === 'undefined') return null;

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
    } catch (e) {
      Logger.warn('SaveManager', 'Failed to read world from localStorage', { error: (e as Error).message });
    }

    // Layer 6: Crash recovery
    const recoveryState = this.getCrashRecoveryState();
    if (recoveryState && (recoveryState.id === worldId || recoveryState.id === 'recovery')) {
      Logger.warn('SaveManager', `[Layer 6 - Crash Recovery] Restoring world state from crash recovery buffer.`);
      return recoveryState;
    }

    // Layer 7: Fresh world generation fallback
    Logger.info('SaveManager', `No existing save file found across persistence layers for '${worldId}', proceeding with fresh world generation.`);
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
  public static async exportWorldJSONAsync(worldId: string): Promise<string | null> {
    const data = await this.loadWorldAsync(worldId);
    if (!data) return null;
    return JSON.stringify({ voxelVerseSave: true, schemaVersion: CURRENT_SAVE_VERSION, data }, null, 2);
  }

  public static exportWorldJSON(worldId: string): string | null {
    const data = this.loadWorld(worldId);
    if (!data) return null;
    return JSON.stringify({ voxelVerseSave: true, schemaVersion: CURRENT_SAVE_VERSION, data }, null, 2);
  }

  // Import World JSON: strictly awaits persistent storage commit before returning summary
  public static async importWorldJSON(jsonString: string): Promise<WorldSummary | null> {
    try {
      if (!jsonString || typeof jsonString !== 'string') {
        Logger.error('SaveManager', 'importWorldJSON: Payload is empty or not a string');
        return null;
      }

      let parsed: any;
      try {
        parsed = JSON.parse(jsonString);
      } catch (parseErr) {
        Logger.error('SaveManager', 'importWorldJSON: JSON parse failed', { error: (parseErr as Error).message });
        return null;
      }

      const data = parsed.data || parsed;
      if (!data || typeof data !== 'object') {
        Logger.error('SaveManager', 'importWorldJSON: Invalid save payload structure');
        return null;
      }

      // Check for recognizable world save fields to reject arbitrary non-save JSON
      const hasSaveFields =
        parsed.voxelVerseSave === true ||
        data.player !== undefined ||
        data.modifiedBlocks !== undefined ||
        data.seed !== undefined ||
        data.gameTime !== undefined ||
        (typeof data.id === 'string' && (data.name !== undefined || data.version !== undefined));

      if (!hasSaveFields) {
        Logger.error('SaveManager', 'importWorldJSON: Payload does not contain recognizable world save data');
        return null;
      }

      const importedId = `world_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      this.deletedWorldsSet.delete(importedId);

      const name = typeof data.name === 'string' && data.name.trim() ? `${data.name.trim()} (Imported)` : 'Imported Realm';
      const sanitized = this.validateAndSanitizeSave(
        data,
        importedId,
        typeof data.seed === 'number' ? data.seed : Math.floor(Math.random() * 9999999)
      );
      sanitized.id = importedId;
      sanitized.name = name;
      sanitized.createdAt = Date.now();
      sanitized.lastPlayed = Date.now();

      const success = await this.saveWorldAsync(sanitized);
      if (success) {
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

      Logger.error('SaveManager', `importWorldJSON: saveWorldAsync failed to persist imported world '${importedId}'`);
      return null;
    } catch (e) {
      Logger.error('SaveManager', 'Failed to import world from JSON', { error: (e as Error).message });
      return null;
    }
  }

  public static async deleteWorldAsync(worldId: string): Promise<boolean> {
    return this.runExclusive(worldId, async () => {
      try {
        this.deletedWorldsSet.add(worldId);
        const key = `voxelverse_world_${worldId}`;
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
          localStorage.removeItem(`${key}_temp`);
          localStorage.removeItem(`${key}_backup_1`);
          localStorage.removeItem(`${key}_backup_2`);
        }

        await IndexedDBStorage.removeItem(STORE_WORLDS, worldId);
        await IndexedDBStorage.removeItem(STORE_WORLDS, `${worldId}_backup`);
        await IndexedDBStorage.removeItem(STORE_WORLDS, `${worldId}_backup_1`);
        await IndexedDBStorage.removeItem(STORE_WORLDS, `${worldId}_backup_2`);

        const crash = this.getCrashRecoveryState();
        if (crash && crash.id === worldId) {
          this.clearCrashRecoveryState();
        }

        const worlds = this.getWorlds().filter((w) => w.id !== worldId);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(WORLDS_INDEX_KEY, JSON.stringify(worlds));
        }
        return true;
      } catch (e) {
        Logger.error('SaveManager', 'Failed to delete world', { error: (e as Error).message });
        return false;
      }
    });
  }

  public static deleteWorld(worldId: string): void {
    this.deleteWorldAsync(worldId).catch(() => {});
    try {
      const key = `voxelverse_world_${worldId}`;
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_temp`);
        localStorage.removeItem(`${key}_backup_1`);
        localStorage.removeItem(`${key}_backup_2`);
        const worlds = this.getWorlds().filter((w) => w.id !== worldId);
        localStorage.setItem(WORLDS_INDEX_KEY, JSON.stringify(worlds));
      }
    } catch {}
  }

  public static saveWorldSync(data: WorldSaveData): boolean {
    try {
      if (!data || typeof data !== 'object' || !data.id) return false;
      this.deletedWorldsSet.delete(data.id);
      const key = `voxelverse_world_${data.id}`;
      const tempKey = `${key}_temp`;
      const backup1Key = `${key}_backup_1`;
      const backup2Key = `${key}_backup_2`;

      const existingWorlds = this.getWorlds();
      const existingEntry = existingWorlds.find((w) => w.id === data.id);
      if (existingEntry && existingEntry.createdAt) {
        data.createdAt = existingEntry.createdAt;
      } else if (!data.createdAt) {
        data.createdAt = Date.now();
      }

      data.version = CURRENT_SAVE_VERSION;
      data.lastPlayed = Date.now();
      data.preset = data.preset || 'standard';
      data.difficulty = data.difficulty || 'normal';

      const serialized = JSON.stringify(data);
      const checksum = this.calculateFullChecksum(serialized);
      const payload = JSON.stringify({ 
        version: CURRENT_SAVE_VERSION,
        checksumVersion: CURRENT_CHECKSUM_VERSION,
        checksum, 
        data 
      });

      if (typeof localStorage !== 'undefined') {
        const existingPrimary = localStorage.getItem(key);
        if (existingPrimary) {
          const verifiedLocalPrimary = this.verifyAndExtractData(existingPrimary);
          if (verifiedLocalPrimary) {
            const existingBackup1 = localStorage.getItem(backup1Key);
            if (existingBackup1) {
              const verifiedBackup1 = this.verifyAndExtractData(existingBackup1);
              if (verifiedBackup1) {
                localStorage.setItem(backup2Key, existingBackup1);
              }
            }
            localStorage.setItem(backup1Key, existingPrimary);
          }
        }
        localStorage.setItem(tempKey, payload);
        localStorage.setItem(key, payload);
        localStorage.removeItem(tempKey);
      }

      this.saveWorldAsync(data).catch(() => {});

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
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(WORLDS_INDEX_KEY, JSON.stringify(worlds));
      }
      return true;
    } catch {
      return false;
    }
  }

  public static async renameWorldAsync(worldId: string, newName: string): Promise<boolean> {
    return this.runExclusive(worldId, async () => {
      try {
        const data = await this.loadWorldAsync(worldId);
        if (!data) return false;
        data.name = newName.trim() || 'Renamed Realm';
        return await this.executeSaveWorldAsync(data);
      } catch (e) {
        Logger.error('SaveManager', 'Failed to rename world', { error: (e as Error).message });
        return false;
      }
    });
  }

  public static renameWorld(worldId: string, newName: string): boolean {
    try {
      const data = this.loadWorld(worldId);
      if (!data) return false;
      data.name = newName.trim() || 'Renamed Realm';
      return this.saveWorldSync(data);
    } catch (e) {
      Logger.error('SaveManager', 'Failed to rename world', { error: (e as Error).message });
      return false;
    }
  }

  public static async duplicateWorldAsync(worldId: string): Promise<WorldSummary | null> {
    try {
      const data = await this.loadWorldAsync(worldId);
      if (!data) return null;

      const newId = `world_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      this.deletedWorldsSet.delete(newId);
      data.id = newId;
      data.name = `${data.name} (Copy)`;
      data.createdAt = Date.now();
      data.lastPlayed = Date.now();

      const success = await this.saveWorldAsync(data);
      if (success) {
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

  public static duplicateWorld(worldId: string): WorldSummary | null {
    try {
      const data = this.loadWorld(worldId);
      if (!data) return null;

      const newId = `world_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      data.id = newId;
      data.name = `${data.name} (Copy)`;
      data.createdAt = Date.now();
      data.lastPlayed = Date.now();

      if (this.saveWorldSync(data)) {
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

  public static applySaveToWorld(arg1: any, arg2: any, dimensionId?: string): void {
    const data: WorldSaveData = (arg1 && typeof arg1 === 'object' && ('modifiedBlocks' in arg1 || 'id' in arg1) && !('getBlock' in arg1)) ? arg1 : arg2;
    const world: VoxelWorld = (arg1 && typeof arg1.getBlock === 'function') ? arg1 : arg2;
    if (!world || !data) return;

    world.modifiedBlocks.clear();
    if (world.modifiedBlockStates) {
      world.modifiedBlockStates.clear();
    }

    const currentDim = dimensionId || world.dimensionId || 'overworld';

    // Hydrate modified blocks purely in memory into canonical Map without generating chunks
    if (data.modifiedBlocks && typeof data.modifiedBlocks === 'object') {
      Object.entries(data.modifiedBlocks).forEach(([rawChunkKey, blocksObj]) => {
        if (!blocksObj || typeof blocksObj !== 'object') return;
        const parsed = parseDimensionChunkKey(rawChunkKey);
        const canonicalKey = makeDimensionChunkKey(parsed.dimensionId, parsed.cx, parsed.cz);
        const legacyKey = `${parsed.cx},${parsed.cz}`;

        if (parsed.dimensionId === currentDim) {
          let localMap = world.modifiedBlocks.get(canonicalKey);
          if (!localMap) {
            localMap = new Map<string, BlockType>();
            world.modifiedBlocks.set(canonicalKey, localMap);
            if (legacyKey !== canonicalKey) {
              world.modifiedBlocks.set(legacyKey, localMap);
            }
          }
          Object.entries(blocksObj).forEach(([localKey, blockType]) => {
            localMap!.set(localKey, blockType as BlockType);
          });

          // If this chunk happens to ALREADY be loaded in memory, update loaded voxels directly (no generation)
          const loadedChunk = world.getChunkLoaded(parsed.cx, parsed.cz);
          if (loadedChunk) {
            Object.entries(blocksObj).forEach(([localKey, blockType]) => {
              const [lx, wy, lz] = localKey.split(',').map(Number);
              if (!isNaN(lx) && !isNaN(wy) && !isNaN(lz)) {
                loadedChunk.setBlock(lx, wy, lz, blockType as BlockType);
              }
            });
          }
        }
      });
    }

    // Hydrate modified block states purely in memory into canonical Map without generating chunks
    if (data.modifiedBlockStates && typeof data.modifiedBlockStates === 'object') {
      Object.entries(data.modifiedBlockStates).forEach(([rawChunkKey, statesObj]) => {
        if (!statesObj || typeof statesObj !== 'object') return;
        const parsed = parseDimensionChunkKey(rawChunkKey);
        const canonicalKey = makeDimensionChunkKey(parsed.dimensionId, parsed.cx, parsed.cz);
        const legacyKey = `${parsed.cx},${parsed.cz}`;

        if (parsed.dimensionId === currentDim) {
          let stateMap = world.modifiedBlockStates.get(canonicalKey);
          if (!stateMap) {
            stateMap = new Map<string, any>();
            world.modifiedBlockStates.set(canonicalKey, stateMap);
            if (legacyKey !== canonicalKey) {
              world.modifiedBlockStates.set(legacyKey, stateMap);
            }
          }
          Object.entries(statesObj).forEach(([localKey, state]) => {
            stateMap!.set(localKey, state);
          });

          // If chunk is ALREADY loaded in memory, update loaded state directly (no generation)
          const loadedChunk = world.getChunkLoaded(parsed.cx, parsed.cz);
          if (loadedChunk) {
            Object.entries(statesObj).forEach(([localKey, state]) => {
              const [lx, wy, lz] = localKey.split(',').map(Number);
              if (!isNaN(lx) && !isNaN(wy) && !isNaN(lz)) {
                loadedChunk.setBlockState(lx, wy, lz, state);
              }
            });
          }
        }
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
        const parsed = parseDimensionChunkKey(chunkKey);
        const dim = chunkKey.includes(':') ? parsed.dimensionId : (world.dimensionId || 'overworld');
        const canonicalKey = makeDimensionChunkKey(dim, parsed.cx, parsed.cz);
        if (!result[canonicalKey]) {
          result[canonicalKey] = {};
        }
        localMap.forEach((blockType, localKey) => {
          result[canonicalKey][localKey] = blockType;
        });
      }
    });
    return result;
  }

  public static serializeModifiedBlockStates(world: VoxelWorld): { [chunkKey: string]: { [localKey: string]: any } } {
    const result: { [chunkKey: string]: { [localKey: string]: any } } = {};
    if (world.modifiedBlockStates) {
      world.modifiedBlockStates.forEach((localMap, chunkKey) => {
        if (localMap.size > 0) {
          const parsed = parseDimensionChunkKey(chunkKey);
          const dim = chunkKey.includes(':') ? parsed.dimensionId : (world.dimensionId || 'overworld');
          const canonicalKey = makeDimensionChunkKey(dim, parsed.cx, parsed.cz);
          if (!result[canonicalKey]) {
            result[canonicalKey] = {};
          }
          localMap.forEach((state, localKey) => {
            result[canonicalKey][localKey] = state;
          });
        }
      });
    }
    return result;
  }

  public static serializeWorldToSave(
    world: VoxelWorld,
    id: string = 'world_default',
    seed: number = 42819,
    dimensionId: string = 'overworld',
    playerPos: [number, number, number] = [0, 64, 0]
  ): WorldSaveData {
    const modifiedBlocks = this.serializeModifiedBlocks(world);
    const modifiedBlockStates = this.serializeModifiedBlockStates(world);

    return {
      version: CURRENT_SAVE_VERSION,
      id,
      name: id,
      seed,
      preset: world.preset || 'standard',
      gameMode: 'survival',
      difficulty: 'normal',
      createdAt: Date.now(),
      lastPlayed: Date.now(),
      gameTime: 0,
      player: {
        position: playerPos,
        rotation: [0, 0],
        health: 100,
        stamina: 100,
        hunger: 100,
        saturation: 20,
        temperature: 37,
        xp: 0,
        level: 1,
        inventory: Array(36).fill(null),
        hotbarIndex: 0,
        equipment: {
          head: null,
          chest: null,
          legs: null,
          feet: null,
          accessory: null,
        },
      },
      modifiedBlocks,
      modifiedBlockStates,
      containers: BlockPlacementEngine.serializeContainers(),
      furnaces: FurnaceManager.serialize(),
      farmingPlots: FarmingManager.serialize(),
      weather: { type: 'clear', intensity: 0 },
      stats: { blocksMined: 0, blocksPlaced: 0, monstersDefeated: 0, distanceTraveled: 0 },
    };
  }
}
