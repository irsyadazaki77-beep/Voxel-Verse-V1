import { GameSystem } from './GameSystem';
import type { GameRuntime } from '../core/GameRuntime';
import { TelemetryStore } from '../ui/TelemetryStore';
import { ITEM_DEFS } from '../items/ItemRegistry';
import { ItemStack } from '../../types';

export class TelemetrySystem implements GameSystem {
  public readonly name = 'TelemetrySystem';
  private runtime: GameRuntime;
  private telemetryTimer: number = 0;
  private readonly telemetryInterval: number = 0.15; // 150ms throttled telemetry updates
  private frameTimesBuffer: number[] = [];
  private readonly maxFrameSamples: number = 60;

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
  }

  public update(deltaTime: number): void {
    const frameMs = Math.max(1, deltaTime * 1000);
    this.frameTimesBuffer.push(frameMs);
    if (this.frameTimesBuffer.length > this.maxFrameSamples) {
      this.frameTimesBuffer.shift();
    }

    this.telemetryTimer += deltaTime;
    if (this.telemetryTimer >= this.telemetryInterval) {
      this.updateTelemetry(deltaTime);
      this.telemetryTimer = 0;
    }
  }

  private calculate1PctLowFps(): number {
    if (this.frameTimesBuffer.length < 5) return this.runtime.currentFps || 60;
    const sorted = [...this.frameTimesBuffer].sort((a, b) => a - b);
    const p99Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99));
    const p99FrameMs = sorted[p99Index];
    return p99FrameMs > 0 ? Math.round(1000 / p99FrameMs) : 60;
  }

  private updateTelemetry(deltaTime: number): void {
    const { world, player, stats, sky, weather, equipment, activeHotbarIndex, inventory, combatSystem, interactionSystem, renderer, renderQualityManager, entities, particles } = this.runtime;
    if (!world || !player || !stats || !renderer) return;

    const currentBiome = world.biomeManager.getBiome(player.position.x, player.position.z);
    const armorDefense = (Object.values(equipment) as (ItemStack | null)[]).reduce((sum, item) => {
      if (!item) return sum;
      const def = ITEM_DEFS[item.itemId];
      return sum + (def?.armorValue || 0);
    }, 0);

    const activeItem = inventory[activeHotbarIndex];
    const bowChargeRatio = activeItem?.itemId === 'hunting_bow' ? combatSystem?.combatMachine?.bowDrawProgress ?? 0 : 0;
    const breakProgress = interactionSystem?.miningState?.progress ?? 0;

    const fpsLow1Pct = this.calculate1PctLowFps();
    const dynamicScale = renderQualityManager ? Math.round(renderQualityManager.scale * 100) / 100 : 1.0;
    const bottleneck = renderQualityManager ? renderQualityManager.state.bottleneck : 'BALANCED';
    const activeEntities = entities ? entities.getActiveEntityCount() : 0;
    const activeParticles = particles ? particles.getActiveParticleCount() : 0;

    TelemetryStore.update({
      health: stats.health,
      maxHealth: stats.maxHealth,
      stamina: stats.stamina,
      maxStamina: stats.maxStamina,
      hunger: stats.hunger,
      maxHunger: stats.maxHunger,
      saturation: stats.saturation,
      temperature: stats.temperature,
      defenseRating: armorDefense,
      oxygen: stats.oxygen,
      maxOxygen: stats.maxOxygen,
      level: stats.level,
      xp: stats.xp,
      biomeName: currentBiome.name,
      playerPos: [player.position.x, player.position.y, player.position.z],
      playerYaw: player.yaw,
      fps: this.runtime.currentFps || 60,
      loadedChunks: world.chunks.size,
      profilerMetrics: {
        ...world.scheduler.metrics,
        frameTimeMs: deltaTime * 1000,
        simTimeMs: this.runtime.lastSimTimeMs || 0,
        renderTimeMs: this.runtime.lastRenderTimeMs || 0,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        memoryEst: (performance as any).memory ? (performance as any).memory.usedJSHeapSize / 1048576 : 0,
        fpsLow1Pct,
        dynamicScale,
        bottleneck,
        activeEntities,
        activeParticles,
        sunIntensity: sky?.sunLight.intensity || 0,
        ambientIntensity: sky?.ambientLight.intensity || 0,
        hemiIntensity: sky?.hemiLight.intensity || 0,
        exposure: renderer.toneMappingExposure,
      },
      timeOfDay: sky ? sky.timeOfDay : 8.0,
      weatherType: weather ? weather.weather.type : 'clear',
      breakProgress,
      bowChargeRatio,
    });
  }

  public dispose(): void {
    // cleanups
  }
}
