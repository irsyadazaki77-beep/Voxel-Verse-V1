import { GameSystem } from './GameSystem';
import type { GameRuntime } from '../core/GameRuntime';

export class WorldStreamingSystem implements GameSystem {
  public readonly name = 'WorldStreamingSystem';
  private runtime: GameRuntime;

  // Movement & Interval Tracking State
  private timeSinceLastUpdate: number = 0;
  private lastPlayerChunkX: number = -999999;
  private lastPlayerChunkZ: number = -999999;
  private lastPlayerX: number = 0;
  private lastPlayerY: number = 0;
  private lastPlayerZ: number = 0;
  private lastYaw: number = 0;

  // Timing thresholds (adaptive interval: min 120ms, max 250ms fallback)
  private readonly minUpdateIntervalSec: number = 0.12;
  private readonly maxUpdateIntervalSec: number = 0.25;
  private readonly movementDistanceSqThreshold: number = 16.0; // 4.0 blocks movement
  private readonly yawAngleThresholdRad: number = 0.35; // ~20 degrees direction change

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
  }

  public update(deltaTime: number): void {
    const { world, player, settings } = this.runtime;
    if (!world || !player) return;

    this.timeSinceLastUpdate += deltaTime;

    const currentChunkX = Math.floor(player.position.x / 16);
    const currentChunkZ = Math.floor(player.position.z / 16);

    const dx = player.position.x - this.lastPlayerX;
    const dy = player.position.y - this.lastPlayerY;
    const dz = player.position.z - this.lastPlayerZ;
    const movedDistSq = dx * dx + dy * dy + dz * dz;

    const currentYaw = player.yaw || 0;
    const yawDiff = Math.abs(currentYaw - this.lastYaw);

    const hasPendingDirtyChunks = world.scheduler.metrics.dirtyChunks > 0;
    const chunkCrossed = currentChunkX !== this.lastPlayerChunkX || currentChunkZ !== this.lastPlayerChunkZ;
    const movedFarEnough = movedDistSq >= this.movementDistanceSqThreshold;
    const turnedFarEnough = yawDiff >= this.yawAngleThresholdRad;
    const reachedMaxInterval = this.timeSinceLastUpdate >= this.maxUpdateIntervalSec;

    // Evaluate streaming conditions:
    // Only stream if max interval reached, OR min interval satisfied with movement/direction/chunk cross/dirty chunks
    const shouldUpdate =
      reachedMaxInterval ||
      (this.timeSinceLastUpdate >= this.minUpdateIntervalSec &&
        (chunkCrossed || movedFarEnough || turnedFarEnough || hasPendingDirtyChunks));

    if (shouldUpdate) {
      world.updateChunks(
        player.position,
        player.getForwardVector(),
        settings.graphics.renderDistance,
        3.0 // 3.0 ms per-frame budget
      );

      this.timeSinceLastUpdate = 0;
      this.lastPlayerChunkX = currentChunkX;
      this.lastPlayerChunkZ = currentChunkZ;
      this.lastPlayerX = player.position.x;
      this.lastPlayerY = player.position.y;
      this.lastPlayerZ = player.position.z;
      this.lastYaw = currentYaw;
    }
  }

  public forceUpdate(): void {
    const { world, player, settings } = this.runtime;
    if (!world || !player) return;

    world.updateChunks(
      player.position,
      player.getForwardVector(),
      settings.graphics.renderDistance,
      4.0
    );

    this.timeSinceLastUpdate = 0;
    this.lastPlayerChunkX = Math.floor(player.position.x / 16);
    this.lastPlayerChunkZ = Math.floor(player.position.z / 16);
    this.lastPlayerX = player.position.x;
    this.lastPlayerY = player.position.y;
    this.lastPlayerZ = player.position.z;
    this.lastYaw = player.yaw || 0;
  }

  public dispose(): void {
    this.timeSinceLastUpdate = 0;
  }
}
