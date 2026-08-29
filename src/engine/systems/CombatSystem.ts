import * as THREE from 'three';
import { GameSystem } from './GameSystem';
import type { GameRuntime } from '../core/GameRuntime';
import { CombatStateMachine } from '../combat/CombatStateMachine';
import { MiningEngine } from '../world/MiningEngine';
import { GameEventBus } from '../events/GameEventBus';
import { BossCombatState } from '../../types';

export class CombatSystem implements GameSystem {
  public readonly name = 'CombatSystem';
  private runtime: GameRuntime;
  public combatMachine: CombatStateMachine;
  public activeBoss: BossCombatState | null = null;

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
    this.combatMachine = new CombatStateMachine();
  }

  public initialize(): void {
    GameEventBus.on('BOSS_SPAWNED', (e: { bossId: string; type: string; pos: [number, number, number] }) => {
      const bossEntity = this.runtime.entities.entities.get(e.bossId);
      if (bossEntity) {
        this.activeBoss = {
          id: e.bossId,
          name: bossEntity.state.name || 'Ancient Guardian',
          modelType: bossEntity.state.modelType || 'demon_lord',
          health: bossEntity.state.health,
          maxHealth: bossEntity.state.maxHealth,
          phase: 1,
          maxPhases: 3,
          enraged: false,
          position: e.pos,
        };
        this.runtime.emitBossUpdated(this.activeBoss);
      }
    });

    GameEventBus.on('BOSS_DEFEATED', () => {
      this.activeBoss = null;
      this.runtime.emitBossUpdated(null);
    });
  }

  public update(deltaTime: number): void {
    const { player, entities, world, inputManager, audio, gameMode } = this.runtime;
    if (!player || !entities || !world) return;

    // Update combat state machine
    this.combatMachine.update(deltaTime);

    const activeItem = this.runtime.getActiveHotbarItem();

    // 1. Ranged Combat (Bow Draw and Release)
    if (activeItem && activeItem.itemId === 'hunting_bow') {
      if (inputManager.isActionActive('Use')) {
        if (this.combatMachine.state === 'IDLE') {
          this.combatMachine.startBowDraw();
          audio.playBowDraw();
        }
      } else {
        if (this.combatMachine.state === 'BOW_DRAWING' || this.combatMachine.state === 'BOW_CHARGED') {
          const bowRelease = this.combatMachine.releaseBow(activeItem);
          if (bowRelease.released) {
            const rayOrigin = player.getCameraPosition();
            const rayDir = player.getForwardVector();

            // Spawn Arrow Projectile
            entities.spawnProjectile(
              rayOrigin.clone().addScaledVector(rayDir, 0.6),
              rayDir.clone().multiplyScalar(bowRelease.arrowVelocity),
              bowRelease.arrowDamage,
              true
            );

            audio.playBowRelease(bowRelease.isCritical);
            player.applyScreenShake(bowRelease.isCritical ? 0.4 : 0.2);

            // Consume weapon durability
            if (gameMode !== 'creative') {
              const durResult = MiningEngine.consumeDurability(activeItem, 'combat');
              if (durResult.broken) {
                audio.playDamage();
                this.runtime.setHotbarItem(this.runtime.activeHotbarIndex, null);
              } else {
                this.runtime.setHotbarItem(this.runtime.activeHotbarIndex, durResult.item);
              }
            }
          }
        }
      }
    }

    // 2. Update Active Boss Health & Status
    if (this.activeBoss) {
      const bossEntry = entities.entities.get(this.activeBoss.id);
      if (bossEntry) {
        if (bossEntry.state.health !== this.activeBoss.health) {
          this.activeBoss.health = bossEntry.state.health;
          this.runtime.emitBossUpdated({ ...this.activeBoss });
        }
      } else {
        this.activeBoss = null;
        this.runtime.emitBossUpdated(null);
      }
    }
  }

  public handleMeleeAttack(targetEntityId: string): boolean {
    const { player, entities, stats, audio, gameMode } = this.runtime;
    if (!player || !entities) return false;

    const activeItem = this.runtime.getActiveHotbarItem();
    const canSwing = this.combatMachine.triggerMeleeAttack(activeItem);
    if (!canSwing) return false;

    player.triggerSwing();

    const isAirborneOrFalling = !player.isGrounded && player.velocity.y < 0;
    const attackCalc = this.combatMachine.calculateMeleeDamage(activeItem, isAirborneOrFalling, player.isSprinting);

    const result = entities.attackEntity(
      targetEntityId,
      attackCalc.damage,
      player.position,
      attackCalc.isCritical,
      attackCalc.comboIndex
    );

    const feedback = this.combatMachine.applyHitFeedback(
      attackCalc.isCritical,
      attackCalc.damage,
      [player.position.x, player.position.y, player.position.z]
    );
    player.applyScreenShake(feedback.screenShake);

    GameEventBus.emit('COMBAT_HIT', {
      hitType: attackCalc.isCritical ? 'crit' : 'hit',
      damage: attackCalc.damage,
      targetPos: [player.position.x, player.position.y, player.position.z],
    });

    if (attackCalc.isCritical) {
      audio.playCriticalHit();
    } else {
      audio.playPlayerHit();
    }

    if (result?.killed && stats) {
      stats.addXP(5);
    }

    // Consume weapon durability
    if (activeItem && gameMode !== 'creative') {
      const durResult = MiningEngine.consumeDurability(activeItem, 'combat');
      if (durResult.broken) {
        audio.playDamage();
        this.runtime.setHotbarItem(this.runtime.activeHotbarIndex, null);
      } else {
        this.runtime.setHotbarItem(this.runtime.activeHotbarIndex, durResult.item);
      }
    }

    return true;
  }

  public dispose(): void {
    this.activeBoss = null;
  }
}
