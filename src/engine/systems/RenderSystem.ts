import { GameSystem } from './GameSystem';
import type { GameRuntime } from '../core/GameRuntime';
import { ITEM_DEFS } from '../items/ItemRegistry';

export class RenderSystem implements GameSystem {
  public readonly name = 'RenderSystem';
  private runtime: GameRuntime;

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
  }

  public update(deltaTime: number): void {
    const { renderer, scene, camera, player, inventory, activeHotbarIndex, combatSystem } = this.runtime;
    if (!renderer || !scene || !camera || !player) return;

    // Apply combat-related player visual feedback
    if (combatSystem) {
      player.bowDrawRatio = combatSystem.combatMachine.bowDrawProgress;
      player.isBlockingShield = combatSystem.combatMachine.isBlocking;
    }

    // Hand/weapon mesh sync and update
    const activeItem = inventory[activeHotbarIndex];
    const placeBlock = activeItem ? ITEM_DEFS[activeItem.itemId]?.blockType : undefined;
    
    if (this.runtime.world) {
      // Raycast highlight
      const hit = this.runtime.interactionSystem?.currentHit || null;
      this.runtime.world.updateTargetHighlight(hit, placeBlock);
    }

    const renderStart = performance.now();
    renderer.render(scene, camera);
    this.runtime.lastRenderTimeMs = performance.now() - renderStart;
  }

  public resize(width: number, height: number): void {
    const { camera, renderer } = this.runtime;
    if (!camera || !renderer) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  public dispose(): void {
    // cleanups
  }
}
