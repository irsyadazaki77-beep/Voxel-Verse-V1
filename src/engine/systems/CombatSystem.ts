import * as THREE from 'three';
import { GameSystem } from './GameSystem';
import type { GameRuntime } from '../core/GameRuntime';
import { CombatStateMachine } from '../combat/CombatStateMachine';
import { MiningEngine } from '../world/MiningEngine';
import { GameEventBus } from '../events/GameEventBus';
import { BossCombatState } from '../../types';
import { PoiseSystem } from '../combat/PoiseSystem';
import { ArtifactSynergyManager } from '../artifacts/ArtifactSynergyManager';
import { BalanceTelemetry } from '../telemetry/BalanceTelemetry';
import { NetworkSession } from '../network/NetworkSession';
import { TelegraphVisualEngine } from '../combat/TelegraphVisualEngine';
import { CreatureAnimationEngine } from '../entities/CreatureAnimationEngine';

export class CombatSystem implements GameSystem {
  public readonly name = 'CombatSystem';
  private runtime: GameRuntime;
  public combatMachine: CombatStateMachine;
  public activeBoss: BossCombatState | null = null;
  public telegraphEngine: TelegraphVisualEngine;
  private lastBossPhase: number = 1;
  private bossAttackTimer: number = 0;

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
    this.combatMachine = new CombatStateMachine();
    this.telegraphEngine = new TelegraphVisualEngine(runtime.scene);
  }

  public initialize(): void {
    GameEventBus.on('BOSS_SPAWNED', (e: { bossId: string; type: string; pos: [number, number, number] }) => {
      const bossEntity = this.runtime.entities.entities.get(e.bossId);
      if (bossEntity) {
        const poise = PoiseSystem.getOrCreatePoise(e.bossId, 240, true);
        this.lastBossPhase = 1;
        this.bossAttackTimer = 0;
        this.runtime.audio.playAncientGong();

        this.activeBoss = {
          id: e.bossId,
          name: bossEntity.state.name || 'Batara Kala Underchamber Colossus',
          modelType: bossEntity.state.modelType || 'batara_kala_colossus',
          health: bossEntity.state.health,
          maxHealth: bossEntity.state.maxHealth,
          phase: 1,
          maxPhases: 3,
          enraged: false,
          isShielded: false,
          phaseSubtitle: 'FASE I: TEBASAN PURBA',
          poise: poise.currentPoise,
          maxPoise: poise.maxPoise,
          position: e.pos,
        };
        this.runtime.emitBossUpdated(this.activeBoss);
      }
    });

    GameEventBus.on('BOSS_DEFEATED', () => {
      this.activeBoss = null;
      this.runtime.emitBossUpdated(null);
    });

    GameEventBus.on('BOSS_ATTACK_TELEGRAPH', (e: { bossId: string; bossName?: string; position: [number, number, number]; damage?: number; radius?: number; duration?: number }) => {
      this.triggerBossTelegraphAttack(
        this.activeBoss || {
          id: e.bossId,
          name: e.bossName || 'Batara Kala Underchamber Colossus',
          modelType: 'batara_kala_colossus',
          health: 1200,
          maxHealth: 1200,
          phase: 1,
          maxPhases: 3,
          enraged: false,
          position: e.position
        },
        false,
        e.position,
        e.radius,
        e.duration
      );
    });
  }

  public update(deltaTime: number): void {
    const { player, entities, world, inputManager, audio, gameMode } = this.runtime;
    if (!player || !entities || !world) return;

    // Update combat state machine & telegraph visual engine
    this.combatMachine.update(deltaTime);
    this.telegraphEngine.update(deltaTime);

    const activeItem = this.runtime.getActiveHotbarItem();

    // 1. Ranged Combat (Bow Draw and Release)
    if (activeItem && activeItem.itemId.includes('bow')) {
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
    } else if (activeItem && (activeItem.itemId.includes('shield') || activeItem.itemId.includes('aegis'))) {
      // Shield blocking logic
      if (inputManager.isActionActive('Use')) {
        if (this.combatMachine.state === 'IDLE') {
          this.combatMachine.startBlock();
          player.isBlockingShield = true;
        }
      } else {
        if (this.combatMachine.state === 'PARRY_BLOCK') {
          this.combatMachine.releaseBlock();
          player.isBlockingShield = false;
        }
      }
    } else {
      if (player.isBlockingShield) {
        player.isBlockingShield = false;
        this.combatMachine.releaseBlock();
      }
    }

    // 2. Update Active Boss Multi-Phase Health, Shield & Poise Status
    if (this.activeBoss) {
      const bossEntry = entities.entities.get(this.activeBoss.id);
      if (bossEntry) {
        const hp = bossEntry.state.health;
        const maxHp = bossEntry.state.maxHealth;
        const hpRatio = hp / maxHp;

        let phase = 1;
        let phaseSubtitle = 'FASE I: TEBASAN PURBA';
        let isShielded = false;
        let enraged = false;

        if (hpRatio <= 0.25) {
          phase = 3;
          phaseSubtitle = 'FASE III: AMARAH KOSMIK (BERSERK)';
          enraged = true;
        } else if (hpRatio <= 0.60) {
          phase = 2;
          phaseSubtitle = 'FASE II: PERISAI AETHER LEYLINE';
          isShielded = true;
        } else {
          phase = 1;
          phaseSubtitle = 'FASE I: TEBASAN PURBA';
        }

        const poise = PoiseSystem.getOrCreatePoise(this.activeBoss.id, 240, true);

        // If boss is staggered by poise break, temporarily disable shield so player can riposte
        if (poise.isStaggered) {
          isShielded = false;
        }

        const updated: BossCombatState = {
          ...this.activeBoss,
          health: hp,
          maxHealth: maxHp,
          phase,
          maxPhases: 3,
          enraged,
          isShielded,
          phaseSubtitle,
          poise: poise.currentPoise,
          maxPoise: poise.maxPoise,
          position: [bossEntry.mesh.position.x, bossEntry.mesh.position.y, bossEntry.mesh.position.z],
        };

        if (this.lastBossPhase !== phase) {
          const prevPhase = this.lastBossPhase;
          this.lastBossPhase = phase;
          if (phase === 2 && prevPhase < 2) {
            audio.playAncientGong();
            player.applyScreenShake(0.5);
            GameEventBus.emit('NOTIFICATION_SHOW', {
              title: '⚡ PERISAI LEYLINE DIAKTIFKAN',
              message: 'Batara Kala menyerap energi leylines purba! Patahkan poise untuk membuka perisai!',
              type: 'warning'
            });
          } else if (phase === 3 && prevPhase < 3) {
            audio.playTitanRoar();
            player.applyScreenShake(0.85);
            GameEventBus.emit('NOTIFICATION_SHOW', {
              title: '🔥 AMARAH KOSMIK BATARA KALA',
              message: 'Tungku aether meledak dalam amarah! Waspadai lingkaran telegraf merah di lantai!',
              type: 'danger'
            });
          }
        }

        // Automatic Boss Floor Slam Telegraph Timer
        this.bossAttackTimer += deltaTime;
        const attackThreshold = enraged ? 3.0 : (phase === 2 ? 4.2 : 5.8);
        if (this.bossAttackTimer >= attackThreshold && !poise.isStaggered) {
          this.bossAttackTimer = 0;
          this.triggerBossTelegraphAttack(updated, enraged);
        }

        this.activeBoss = updated;
        this.runtime.emitBossUpdated(updated);
      } else {
        this.activeBoss = null;
        this.runtime.emitBossUpdated(null);
      }
    }
  }

  public triggerBossTelegraphAttack(
    boss: BossCombatState,
    isEnraged: boolean,
    customPos?: [number, number, number],
    customRadius?: number,
    customDuration?: number
  ): void {
    const { player, audio, entities } = this.runtime;
    if (!player) return;

    const slamPos: [number, number, number] = customPos || [player.position.x, Math.floor(player.position.y), player.position.z];
    const radius = customRadius ?? (isEnraged ? 6.2 : 4.8);
    const duration = customDuration ?? (isEnraged ? 1.05 : 1.3);

    // Trigger visual windup on boss model
    const bossEntry = entities.entities.get(boss.id);
    if (bossEntry && bossEntry.mesh.userData.rig) {
      CreatureAnimationEngine.triggerAttack(bossEntry.mesh.userData.rig);
    }

    this.telegraphEngine.spawnTelegraph({
      sourceEntityId: boss.id,
      position: slamPos,
      radius,
      duration,
      color: isEnraged ? 0xef4444 : 0xf59e0b,
      onComplete: () => {
        const pPos = player.position;
        const dist = Math.hypot(pPos.x - slamPos[0], pPos.z - slamPos[2]);
        const dy = Math.abs(pPos.y - slamPos[1]);

        if (this.runtime.particles) {
          this.runtime.particles.spawnCombatSparks(new THREE.Vector3(...slamPos).add(new THREE.Vector3(0, 0.4, 0)), true);
        }
        audio.playBlockHit('stone');

        if (dist <= radius + 0.3 && dy <= 3.0) {
          if (player.isDodging) {
            audio.playTone(520, 0.12);
            GameEventBus.emit('NOTIFICATION_SHOW', {
              title: '✨ PERFECT DODGE',
              message: 'Lolos dari hantaman gada Batara Kala!',
              type: 'info'
            });
            return;
          }

          if (player.isBlockingShield) {
            audio.playShieldBlock(true);
            audio.playCriticalHit();
            player.applyScreenShake(0.35);
            PoiseSystem.applyPoiseDamage(boss.id, 80);
            GameEventBus.emit('PERFECT_PARRY', { bossId: boss.id });
            GameEventBus.emit('NOTIFICATION_SHOW', {
              title: '🛡️ TANGKISAN SEMPURNA (PARRY)',
              message: 'Hantaman gada dipantulkan! Poise boss terpukul jatuh!',
              type: 'success'
            });
            return;
          }

          const slamDmg = isEnraged ? 44 : 28;
          this.runtime.stats.takeDamage(slamDmg, boss.name);
          player.applyDamageFeedback();
          player.applyScreenShake(0.75);
          audio.playDamage();
        }
      }
    });
  }

  public handleMeleeAttack(targetEntityId: string): boolean {
    const { player, entities, stats, audio, gameMode } = this.runtime;
    if (!player || !entities) return false;

    // Check stamina cost for survival mode
    if (stats && gameMode !== 'creative') {
      if (stats.stamina < 8) return false; // Insufficient stamina
      stats.stamina = Math.max(0, stats.stamina - 8);
    }

    const activeItem = this.runtime.getActiveHotbarItem();
    const canSwing = this.combatMachine.triggerMeleeAttack(activeItem);
    if (!canSwing) return false;

    player.triggerSwing();

    // If in multiplayer, notify authoritative server of attack intent
    const netSession = NetworkSession.getInstance();
    if (netSession.isMultiplayerActive && netSession.isConnected()) {
      netSession.sendAttackIntent(targetEntityId, this.runtime.activeHotbarIndex);
    }

    const isAirborneOrFalling = !player.isGrounded && player.velocity.y < 0;
    const isTargetStaggered = PoiseSystem.isEntityStaggered(targetEntityId);
    
    const attackCalc = this.combatMachine.calculateMeleeDamage(
      activeItem,
      isAirborneOrFalling,
      player.isSprinting,
      isTargetStaggered
    );

    let damageToDeal = attackCalc.damage;
    let isShieldMitigated = false;

    // Check boss aether shield
    if (this.activeBoss && this.activeBoss.id === targetEntityId && this.activeBoss.isShielded && !isTargetStaggered) {
      damageToDeal = Math.max(1, Math.round(damageToDeal * 0.45));
      isShieldMitigated = true;
    }

    const result = entities.attackEntity(
      targetEntityId,
      damageToDeal,
      player.position,
      attackCalc.isCritical,
      attackCalc.comboIndex,
      1.0,
      attackCalc.poiseDamage
    );

    const feedback = this.combatMachine.applyHitFeedback(
      attackCalc.isCritical,
      damageToDeal,
      [player.position.x, player.position.y, player.position.z]
    );
    player.applyScreenShake(isShieldMitigated ? feedback.screenShake * 0.5 : feedback.screenShake);

    if (this.runtime.cameraMotion) {
      this.runtime.cameraMotion.triggerAttackRecoil(attackCalc.isCritical ? 0.08 : 0.04);
    }

    const targetEntity = entities.entities.get(targetEntityId);
    if (targetEntity && targetEntity.mesh && targetEntity.mesh.position && this.runtime.particles) {
      this.runtime.particles.spawnCombatSparks(
        targetEntity.mesh.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
        attackCalc.isCritical
      );
    }

    GameEventBus.emit('COMBAT_HIT', {
      hitType: isShieldMitigated ? 'blocked' : (attackCalc.isRiposte ? 'crit' : (attackCalc.isCritical ? 'crit' : 'hit')),
      damage: damageToDeal,
      targetPos: [player.position.x, player.position.y, player.position.z],
    });

    BalanceTelemetry.recordAttack(
      damageToDeal,
      attackCalc.isCritical,
      attackCalc.comboIndex,
      attackCalc.isRiposte
    );

    if (isShieldMitigated) {
      audio.playShieldBlock(true);
    } else if (attackCalc.isRiposte) {
      audio.playCriticalHit();
    } else if (attackCalc.isCritical) {
      audio.playCriticalHit();
    } else {
      audio.playPlayerHit();
    }

    // Life Leech bonus from Artifact Synergy
    const synergy = ArtifactSynergyManager.getCombinedBonuses();
    if (synergy.lifeLeechRatio && synergy.lifeLeechRatio > 0 && stats && attackCalc.isCritical) {
      const leechAmount = damageToDeal * synergy.lifeLeechRatio;
      stats.heal(leechAmount);
    }

    if (result?.killed && stats) {
      const isBossKill = targetEntity?.state.type === 'boss' || targetEntity?.state.isBoss || (this.activeBoss && this.activeBoss.id === targetEntityId);
      const xpAmount = isBossKill ? 250 : 15;
      stats.addXP(xpAmount);

      if (isBossKill) {
        const relicPool = ['mustika_naga_pusaka', 'cakra_surya_precursor', 'keris_kyai_sengkelat'];
        const chosenRelic = relicPool[Math.floor(Math.random() * relicPool.length)];
        ArtifactSynergyManager.unlockArtifact(chosenRelic);

        GameEventBus.emit('BOSS_DEFEATED', {
          bossId: targetEntityId,
          bossName: this.activeBoss?.name || targetEntity?.state.name || 'Ancient Colossus',
          pos: [player.position.x, player.position.y, player.position.z],
          relicReward: chosenRelic,
        });

        GameEventBus.emit('RELIC_DISCOVERED', {
          relicId: chosenRelic,
          bossName: this.activeBoss?.name || 'Ancient Colossus',
        });
      }
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
    if (this.telegraphEngine) {
      this.telegraphEngine.dispose();
    }
  }
}

