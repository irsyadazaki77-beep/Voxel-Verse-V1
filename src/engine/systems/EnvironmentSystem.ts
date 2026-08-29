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

    const biome = world.biomeManager.getBiome(player.position.x, player.position.z);
    sky.update(deltaTime, player.position, biome);

    if (weather) {
      weather.update(deltaTime, player.position, (biome?.temperature ?? 0) < 0);
    }
    if (clouds) {
      clouds.update(deltaTime, player.position, weather ? weather.weather : { type: 'clear', intensity: 0, windAngle: 0.5, windSpeed: 2.0, durationLeft: 0 });
    }
    if (particles) {
      particles.update(deltaTime);
    }
  }

  public dispose(): void {
    // cleanups
  }
}
