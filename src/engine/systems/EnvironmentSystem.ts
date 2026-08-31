import { GameSystem } from './GameSystem';
import type { GameRuntime } from '../core/GameRuntime';

export class EnvironmentSystem implements GameSystem {
  public readonly name = 'EnvironmentSystem';
  private runtime: GameRuntime;

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
  }

  public update(deltaTime: number): void {
    const { sky, weather, clouds, particles, player, world } = this.runtime;
    if (!sky || !player || !world) return;

    // 1. World visual update loop (water wave animation & vegetation wind displacement uTime)
    world.update(deltaTime);

    const biome = world.biomeManager.getBiome(player.position.x, player.position.z);
    sky.update(deltaTime, player.position, biome, player.isEyesInWater);

    if (weather) {
      weather.update(deltaTime, player.position, (biome?.temperature ?? 0) < 0);
    }
    if (clouds) {
      clouds.update(deltaTime, player.position, weather ? weather.weather : { type: 'clear', intensity: 0, windAngle: 0.5, windSpeed: 2.0, durationLeft: 0 });
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
