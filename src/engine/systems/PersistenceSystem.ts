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
import { Logger } from '../ui/Logger';

export class PersistenceSystem implements GameSystem {
  public readonly name = 'PersistenceSystem';
  private runtime: GameRuntime;
  private autoSaveTimer: number = 0;
  private readonly autoSaveInterval: number = 30; // 30 seconds
  private isSaving: boolean = false;

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
  }

  public isSavingInProgress(): boolean {
    return this.isSaving;
  }

  public update(deltaTime: number): void {
    this.autoSaveTimer += deltaTime;
    if (this.autoSaveTimer >= this.autoSaveInterval) {
      this.autoSaveTimer = 0;
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

  public async saveGameWithResult(): Promise<SaveOperationResult> {
    const { world, player, stats, gameStats, sky, weather, worldId, seed, gameMode, inventory, equipment, activeHotbarIndex } = this.runtime;
    if (!world || !player || !stats) {
      return { success: false, error: 'Runtime or player not initialized' };
    }

    if (this.isSaving) {
      Logger.info('PersistenceSystem', 'Save operation already in progress, queuing behind current save');
    }

    this.isSaving = true;

    try {
      const pPos = player.position;
      const stabilityState = WorldStabilitySystem.saveState();
      const preset: WorldPreset = this.runtime.preset || (world.preset as WorldPreset) || 'standard';
      const difficulty = this.runtime.difficulty || 'normal';

      const saveData: WorldSaveData = {
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
      };

      const success = await SaveManager.saveWorldAsync(saveData);
      if (!success) {
        return {
          success: false,
          error: 'Persistent storage commit failed (IndexedDB / LocalStorage write error)',
          targetId: worldId,
        };
      }
      return { success: true, targetId: worldId };
    } catch (e: any) {
      Logger.error('PersistenceSystem', 'Error persisting game state', { error: e?.message || e });
      return { success: false, error: e?.message || String(e), targetId: worldId };
    } finally {
      this.isSaving = false;
    }
  }

  public dispose(): void {
    this.isSaving = false;
  }
}
