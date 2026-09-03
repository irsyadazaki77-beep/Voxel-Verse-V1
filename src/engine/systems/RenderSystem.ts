import { GameSystem } from './GameSystem';
import type { GameRuntime } from '../core/GameRuntime';
import { ITEM_DEFS } from '../items/ItemRegistry';
import { MiningVisualEngine } from '../world/MiningVisualEngine';

export class RenderSystem implements GameSystem {
  public readonly name = 'RenderSystem';
  private runtime: GameRuntime;

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
  }

  public update(deltaTime: number): void {
    const { renderer, scene, camera, player, inventory, activeHotbarIndex, combatSystem, viewmodel, cameraMotion } = this.runtime;
    if (!renderer || !scene || !camera || !player) return;

    // 1. Apply combat-related player visual feedback
    let isBlocking = false;
    let bowDrawRatio = 0;
    if (combatSystem) {
      bowDrawRatio = combatSystem.combatMachine.bowDrawProgress;
      isBlocking = combatSystem.combatMachine.isBlocking;
      player.bowDrawRatio = bowDrawRatio;
      player.isBlockingShield = isBlocking;
    }

    // 2. Camera Dynamic Motion & Physics (Bob, Landing Dip, Damage Tilt, Shake)
    const isMoving = !!(player.keys.forward || player.keys.backward || player.keys.left || player.keys.right || Math.abs(player.velocity.x) > 0.1 || Math.abs(player.velocity.z) > 0.1);
    const isGrounded = player.isGrounded;
    const isSprinting = player.isSprinting;

    if (cameraMotion) {
      const motion = cameraMotion.update(deltaTime, isMoving, isGrounded, isSprinting);

      camera.position.y += motion.bobOffset - motion.landingDip;
      camera.rotation.z += motion.bobRoll + motion.damageTilt;
      camera.rotation.x -= motion.recoilPitch;
      camera.position.x += motion.shakeOffsetX;
      camera.position.y += motion.shakeOffsetY;
    }

    // 3. Viewmodel sync & animation
    const activeItem = inventory[activeHotbarIndex] || null;
    const placeBlock = activeItem ? ITEM_DEFS[activeItem.itemId]?.blockType : undefined;
    
    if (viewmodel) {
      viewmodel.setHeldItem(activeItem);
      viewmodel.update(
        deltaTime,
        isMoving,
        isGrounded,
        isSprinting,
        isBlocking,
        bowDrawRatio
      );
    }

    // 4. World raycast & Progressive 3D Mining Crack sync
    if (this.runtime.world) {
      const hit = this.runtime.interactionSystem?.currentHit || null;
      this.runtime.world.updateTargetHighlight(hit, placeBlock);

      const miningState = this.runtime.interactionSystem?.miningState;
      const isMining = !!miningState?.active;
      const miningProgress = isMining ? (miningState?.progress || 0) : 0;

      MiningVisualEngine.updateCrack(
        isMining && hit ? hit.blockPos : null,
        miningProgress
      );
    }

    const renderStart = performance.now();
    
    const isEyesInWater = player.isEyesInWater || false;
    const exposure = renderer.toneMappingExposure || 1.0;

    if (this.runtime.renderPipeline) {
      this.runtime.renderPipeline.render(deltaTime, isEyesInWater, exposure);
    } else {
      renderer.render(scene, camera);
    }
    
    const renderTime = performance.now() - renderStart;
    this.runtime.lastRenderTimeMs = renderTime;

    if (this.runtime.renderQualityManager && this.runtime.settings?.graphics) {
      const totalFrameMs = Math.max(renderTime, deltaTime * 1000);
      this.runtime.renderQualityManager.trackFrameTime(totalFrameMs, renderTime, this.runtime.settings.graphics);
    }
  }

  public resize(width: number, height: number): void {
    const { camera, renderer, renderPipeline } = this.runtime;
    if (!camera || !renderer) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);

    if (renderPipeline) {
      renderPipeline.setSize(width, height);
    }
  }

  public dispose(): void {
    // cleanups
  }
}
