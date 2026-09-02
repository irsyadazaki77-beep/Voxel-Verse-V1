import { GameSystem } from './GameSystem';
import type { GameRuntime } from '../core/GameRuntime';
import { SaveManager, CURRENT_SAVE_VERSION } from '../storage/SaveManager';
import { WorldSaveData } from '../../types';
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

export class PersistenceSystem implements GameSystem {
  public readonly name = 'PersistenceSystem';
  private runtime: GameRuntime;
  private autoSaveTimer: number = 0;
  private readonly autoSaveInterval: number = 30; // 30 seconds

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
  }

  public update(deltaTime: number): void {
    this.autoSaveTimer += deltaTime;
    if (this.autoSaveTimer >= this.autoSaveInterval) {
      this.saveGame();
      this.autoSaveTimer = 0;
    }
  }

  public saveGame(): void {
    const { world, player, stats, gameStats, sky, weather, worldId, seed, gameMode, inventory, equipment, activeHotbarIndex } = this.runtime;
    if (!world || !player || !stats) return;

    const pPos = player.position;
    const stabilityState = WorldStabilitySystem.saveState();

    const saveData: WorldSaveData = {
      version: CURRENT_SAVE_VERSION,
      id: worldId,
      name: this.runtime.worldName || 'Voxel Realm',
      seed,
      gameMode,
      difficulty: 'normal',
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
      modifiedBlocks: SaveManager.serializeModifiedBlocks(world),
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

    SaveManager.saveWorld(saveData);
  }

  public dispose(): void {
    // cleanups
  }
}
