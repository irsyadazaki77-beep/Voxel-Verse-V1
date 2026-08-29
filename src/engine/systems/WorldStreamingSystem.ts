import { GameSystem } from './GameSystem';
import type { GameRuntime } from '../core/GameRuntime';

export class WorldStreamingSystem implements GameSystem {
  public readonly name = 'WorldStreamingSystem';
  private runtime: GameRuntime;
  private updateTimer: number = 0;

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
  }

  public update(deltaTime: number): void {
    const { world, player, settings } = this.runtime;
    if (!world || !player) return;

    // Stream chunks around player
    world.updateChunks(
      player.position,
      player.getForwardVector(),
      settings.renderDistance,
      3.0 // 3.0 chunk hysteresis for stable unloading
    );
  }

  public dispose(): void {
    this.updateTimer = 0;
  }
}
