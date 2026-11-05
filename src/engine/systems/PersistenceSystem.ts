import { GameSystem } from './GameSystem';
import type { GameRuntime } from '../core/GameRuntime';
import { SaveManager, CURRENT_SAVE_VERSION } from '../storage/SaveManager';
import { WorldSaveData, SaveOperationResult, WorldPreset } from '../../types';
import { DiscoverySystem } from '../progression/DiscoverySystem';
import { QuestManager } from '../progression/QuestManager';
import { SettlementManager } from '../settlement/SettlementManager';
import { WorldEventManager } from '../events/WorldEventManager';
import { MapManager } from '../map/MapManager';
import { BlockPlacementEngine } from '../world/BlockPlacementEngine';
import { FurnaceManager } from '../world/FurnaceManager';
import { FarmingManager } from '../world/FarmingManager';
import { ArtifactSynergyManager } from '../artifacts/ArtifactSynergyManager';
import { BountyContractManager } from '../exploration/BountyContractManager';
import { TreasureMapSystem } from '../exploration/TreasureMapSystem';
import { WorldStabilitySystem } from '../exploration/WorldStabilitySystem';
import { DungeonExpeditionManager } from '../dungeon/DungeonExpeditionManager';
import { AetherAnomalyManager } from '../anomaly/AetherAnomalyManager';
import { AetherNetworkManager } from '../engineering/AetherNetworkManager';
import { CharacterProgressionManager } from '../progression/CharacterProgressionManager';
import { GameEventBus } from '../events/GameEventBus';
import { Logger } from '../ui/Logger';

export class PersistenceSystem implements GameSystem {
  public readonly name = 'PersistenceSystem';
  private runtime: GameRuntime;
  private autoSaveTimer: number = 0;
  private readonly autoSaveInterval: number = 30; // 30 seconds periodic save
  private isDirty: boolean = false;
  private dirtyDebounceTimer: number = 0;
  private readonly dirtyDebounceDelay: number = 1.5; // 1.5s fast save after block/inventory changes
  private isSaving: boolean = false;
  private eventUnsubscribers: Array<() => void> = [];
  private boundBeforeUnload: () => void;

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;

    const markDirty = () => {
      this.isDirty = true;
      this.dirtyDebounceTimer = 0;
    };

    this.eventUnsubscribers.push(
      GameEventBus.on('BLOCK_MINED', markDirty),
      GameEventBus.on('BLOCK_PLACED', markDirty),
      GameEventBus.on('ITEM_CRAFTED', markDirty),
      GameEventBus.on('ITEM_COLLECTED', markDirty),
      GameEventBus.on('QUEST_COMPLETED', markDirty)
    );

    this.boundBeforeUnload = () => {
      if (this.isDirty) {
        const snapshot = this.buildSaveDataSnapshot();
        if (snapshot) {
          SaveManager.saveWorldSync(snapshot);
          this.isDirty = false;
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.boundBeforeUnload);
      window.addEventListener('pagehide', this.boundBeforeUnload);
    }
  }

  public markDirty(): void {
    this.isDirty = true;
    this.dirtyDebounceTimer = 0;
  }

  public isSavingInProgress(): boolean {
    return this.isSaving;
  }

  public update(deltaTime: number): void {
    this.autoSaveTimer += deltaTime;
    if (this.isDirty) {
      this.dirtyDebounceTimer += deltaTime;
    }

    const shouldFastSave = this.isDirty && this.dirtyDebounceTimer >= this.dirtyDebounceDelay;
    const shouldPeriodicSave = this.autoSaveTimer >= this.autoSaveInterval;

    if (shouldFastSave || shouldPeriodicSave) {
      this.autoSaveTimer = 0;
      this.dirtyDebounceTimer = 0;
      this.isDirty = false;
      if (!this.isSaving) {
        this.saveGame().catch((err) => {
          Logger.warn('PersistenceSystem', 'Autosave encountered background error', { error: err });
        });
      }
    }
  }

  public async saveGame(): Promise<boolean> {
    const res = await this.saveGameWithResult();
    return res.success;
  }

  private pendingSavePromise: Promise<SaveOperationResult> | null = null;

  public async saveGameWithResult(): Promise<SaveOperationResult> {
    if (this.pendingSavePromise) {
      Logger.info('PersistenceSystem', 'Save operation already in progress, queuing behind current save');
      const activePromise = this.pendingSavePromise;
      this.pendingSavePromise = (async () => {
        try {
          await activePromise;
        } catch {}
        return this.executeSaveGameWithResult();
      })();
      return this.pendingSavePromise;
    }

    this.pendingSavePromise = this.executeSaveGameWithResult();
    try {
      return await this.pendingSavePromise;
    } finally {
      this.pendingSavePromise = null;
    }
  }

  private buildSaveDataSnapshot(): WorldSaveData | null {
    const { world, player, stats, gameStats, sky, weather, worldId, seed, gameMode, inventory, equipment, activeHotbarIndex } = this.runtime;
    if (!world || !player || !stats) {
      return null;
    }

    const pPos = player.position;
    const stabilityState = WorldStabilitySystem.saveState();
    const preset: WorldPreset = this.runtime.preset || (world.preset as WorldPreset) || 'standard';
    const difficulty = this.runtime.difficulty || 'normal';

    return {
      version: CURRENT_SAVE_VERSION,
      id: worldId,
      name: this.runtime.worldName || 'Voxel Realm',
      seed,
      preset,
      gameMode,
      difficulty,
      lastPlayed: Date.now(),
      createdAt: Date.now(),
      gameTime: sky ? sky.timeOfDay * 3600 : 28800,
      player: {
        position: [pPos.x, pPos.y, pPos.z],
        rotation: [player.pitch, player.yaw],
        health: stats.health,
        hunger: stats.hunger,
        stamina: stats.stamina,
        saturation: stats.saturation,
        temperature: stats.temperature,
        level: stats.level,
        xp: stats.xp,
        inventory,
        hotbarIndex: activeHotbarIndex,
        equipment,
      },
      weather: {
        type: weather ? weather.weather.type : 'clear',
        intensity: weather ? weather.weather.intensity : 0,
      },
      stats: gameStats ? gameStats.getStats() : { blocksMined: 0, blocksPlaced: 0, monstersDefeated: 0, distanceTraveled: 0 },
      modifiedBlocks: {
        ...(this.runtime.globalModifiedBlocks || {}),
        ...SaveManager.serializeModifiedBlocks(world),
      },
      modifiedBlockStates: {
        ...(this.runtime.globalModifiedBlockStates || {}),
        ...SaveManager.serializeModifiedBlockStates(world),
      },
      containers: BlockPlacementEngine.serializeContainers(),
      furnaces: FurnaceManager.serialize(),
      farmingPlots: FarmingManager.serialize(),
      discoveries: DiscoverySystem.serialize(),
      quests: QuestManager.serialize(),
      settlementProgress: SettlementManager.serialize(),
      activeEvents: WorldEventManager.serialize(),
      waypoints: MapManager.serializeWaypoints(),
      exploredMapTiles: MapManager.serializeExplored(),
      artifactsFound: ArtifactSynergyManager.getUnlocked(),
      artifactState: ArtifactSynergyManager.saveState(),
      bountyContracts: BountyContractManager.saveState(),
      treasureMaps: TreasureMapSystem.saveState(),
      worldStability: stabilityState.stability,
      activatedMonoliths: stabilityState.activatedMonoliths,
      dungeonExpedition: DungeonExpeditionManager.saveState(),
      anomalyState: AetherAnomalyManager.serialize(),
      questRewardsClaimed: QuestManager.getClaimedRewards(),
      aetherEngineering: {
        machines: AetherNetworkManager.getInstance().serialize(),
      },
      characterProgression: CharacterProgressionManager.serialize(),
    };
  }

  private async executeSaveGameWithResult(): Promise<SaveOperationResult> {
    const saveData = this.buildSaveDataSnapshot();
    if (!saveData) {
      return { success: false, error: 'Runtime or player not initialized' };
    }

    this.isSaving = true;
    GameEventBus.emit('AUTOSAVE_STATUS', { saving: true, timestamp: Date.now() });
    const worldId = saveData.id;

    try {
      const success = await SaveManager.saveWorldAsync(saveData);
      if (!success) {
        return {
          success: false,
          error: 'Persistent storage commit failed (IndexedDB / LocalStorage write error)',
          targetId: worldId,
        };
      }
      this.isDirty = false;
      GameEventBus.emit('AUTOSAVE_STATUS', { saving: false, saved: true, timestamp: Date.now() });
      return { success: true, targetId: worldId };
    } catch (e: any) {
      Logger.error('PersistenceSystem', 'Error persisting game state', { error: e?.message || e });
      return { success: false, error: e?.message || String(e), targetId: worldId };
    } finally {
      this.isSaving = false;
    }
  }

  public dispose(): void {
    if (this.isDirty) {
      const snapshot = this.buildSaveDataSnapshot();
      if (snapshot) {
        SaveManager.saveWorldSync(snapshot);
      }
      this.isDirty = false;
    }
    this.eventUnsubscribers.forEach((unsub) => unsub());
    this.eventUnsubscribers = [];
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.boundBeforeUnload);
      window.removeEventListener('pagehide', this.boundBeforeUnload);
    }
    this.isSaving = false;
    this.pendingSavePromise = null;
  }
}

