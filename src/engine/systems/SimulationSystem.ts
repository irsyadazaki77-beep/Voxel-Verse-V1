import * as THREE from 'three';
import { GameSystem } from './GameSystem';
import type { GameRuntime } from '../core/GameRuntime';
import { BlockType } from '../../types';
import { GameEventBus } from '../events/GameEventBus';
import { QuestManager } from '../progression/QuestManager';

export class SimulationSystem implements GameSystem {
  public readonly name = 'SimulationSystem';
  private runtime: GameRuntime;
  private accumulator: number = 0;
  public readonly fixedDt: number = 1 / 60; // 60Hz fixed simulation timestep
  public readonly maxCatchUpSteps: number = 5;

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
  }

  public update(frameDeltaTime: number): void {
    // Clamp frame delta time to prevent spiral of death on tab freeze
    const clampedFrameTime = Math.min(frameDeltaTime, 0.1);
    this.accumulator += clampedFrameTime;

    let steps = 0;
    while (this.accumulator >= this.fixedDt && steps < this.maxCatchUpSteps) {
      this.fixedTick(this.fixedDt);
      this.accumulator -= this.fixedDt;
      steps++;
    }

    // If accumulator is still excessively large after max catch-up steps, drop leftover time
    if (this.accumulator > this.fixedDt * 2) {
      this.accumulator = 0;
    }
  }

  private fixedTick(dt: number): void {
    const { player, world, stats, gameMode, audio, settings } = this.runtime;
    if (!player || !world || !stats) return;

    // 1. Update Player Movement Physics & Voxel Collisions
    player.update(dt, world, gameMode, settings.viewBobbing, stats.stamina);

    // 2. Underwater & Submerged Checks
    const eyePos = player.getEyePosition ? player.getEyePosition() : player.getCameraPosition();
    const headBlock = world.getBlock(Math.floor(eyePos.x), Math.floor(eyePos.y), Math.floor(eyePos.z));
    const isSubmerged = headBlock === BlockType.WATER;

    // 3. Update Player Survival Stats, Metabolism & Vitals (if not creative)
    if (gameMode !== 'creative') {
      const isMoving = player.keys.forward || player.keys.backward || player.keys.left || player.keys.right;
      const isSprinting = player.isSprinting;
      const isSwimming = player.isSwimming;
      const isMining = this.runtime.interactionSystem?.miningState?.active ?? false;

      // Altitude & Temperature calculation
      const currentBiome = world.biomeManager.getBiome(player.position.x, player.position.z);
      const altitude = player.position.y;
      const baseTemp = currentBiome.temperature || 20;
      const lapseRate = (altitude - 60) * 0.25; // 0.25 deg drop per meter above sea level
      const currentTemp = Math.max(-10, Math.min(45, baseTemp - lapseRate));
      stats.temperature = currentTemp;

      // Update Player Vitals
      stats.update(
        dt,
        isSprinting,
        isSubmerged,
        isSwimming,
        isMining,
        currentTemp,
        false
      );

      // Sound FX on low health or damage
      if (stats.health < 25 && Math.random() < 0.02) {
        audio.playDamage();
      }

      // Check Player Death
      if (stats.health <= 0 && !stats.isDead) {
        stats.isDead = true;
        this.runtime.handlePlayerDeath();
      }
    }

    // 4. Update Game Event / Discovery triggers for Biome change
    const biome = world.biomeManager.getBiome(player.position.x, player.position.z);
    GameEventBus.emit('BIOME_DISCOVERED', {
      biomeId: biome.name.toLowerCase().replace(/\s+/g, '_'),
      biomeName: biome.name,
      pos: [player.position.x, player.position.y, player.position.z],
    });
    QuestManager.advanceObjective('visit', biome.name, 1);
  }

  public dispose(): void {
    this.accumulator = 0;
  }
}
