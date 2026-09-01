import { GameSystem } from './GameSystem';
import type { GameRuntime } from '../core/GameRuntime';

export class EnvironmentSystem implements GameSystem {
  public readonly name = 'EnvironmentSystem';
  private runtime: GameRuntime;

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
  }

  public update(deltaTime: number): void {
    const { sky, weather, clouds, particles, player, world, camera } = this.runtime;
    if (!sky || !player || !world) return;

    // 1. World visual update loop (water wave animation, vegetation wind displacement uTime & frustum culling)
    world.update(deltaTime, camera);

    const biome = world.biomeManager.getBiome(player.position.x, player.position.z);
    sky.update(deltaTime, player.position, biome, player.isEyesInWater, weather ? weather.weather : null);

    // Dynamic Tone Mapping Exposure
    if (this.runtime.renderer) {
      let targetExposure = 1.0;
      if (sky.timeOfDay >= 7.5 && sky.timeOfDay < 16.5) {
        targetExposure = 1.05; // Bright day
      } else if (sky.timeOfDay >= 16.5 && sky.timeOfDay < 19.0) {
        targetExposure = 1.1; // Golden hour (bloom effect)
      } else if (sky.timeOfDay < 5.0 || sky.timeOfDay > 19.0) {
        targetExposure = 0.85; // Night time
      }
      if (player.position.y < 32) {
        targetExposure = 1.2; // Increase exposure in caves slightly to see
      }
      // Lerp exposure
      const curExposure = this.runtime.renderer.toneMappingExposure;
      this.runtime.renderer.toneMappingExposure += (targetExposure - curExposure) * deltaTime * 2.0;
    }

    if (weather) {
      weather.update(deltaTime, player.position, (biome?.temperature ?? 0) < 0);
    }
    if (clouds) {
      clouds.update(deltaTime, player.position, weather ? weather.weather : { type: 'clear', intensity: 0, windAngle: 0.5, windSpeed: 2.0, durationLeft: 0 }, sky.timeOfDay);
    }
    if (particles) {
      if (player.isEyesInWater) {
        particles.spawnUnderwaterBubbles(player.position);
      }
      particles.update(deltaTime);
    }
  }

  public dispose(): void {
    // cleanups
  }
}
