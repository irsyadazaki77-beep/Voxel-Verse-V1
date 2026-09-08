// Creature Locomotion & Animation Engine 3.0
// High-performance procedural hierarchical animation with LOD, gait physics, attack wind-up telegraphs, and per-instance hit feedback
import * as THREE from 'three';
import { CreatureRig } from './CreatureRigTypes';
import { EntityState } from '../../types';
import { CreatureMaterialFactory } from './CreatureMaterialFactory';

export class CreatureAnimationEngine {
  private static animTime: number = 0;

  /**
   * Triggers zero-allocation per-instance hit feedback and physical flinch.
   */
  public static triggerHit(rig: CreatureRig, isCritical: boolean = false, isStaggered: boolean = false): void {
    rig.hitFlashTimer = isCritical ? 0.22 : 0.16;
    rig.hitFlashType = isCritical ? 'crit' : 'normal';
    rig.flinchTimer = isCritical ? 0.26 : 0.18;

    if (isStaggered) {
      rig.staggerTimer = 1.35;
    }

    // Zero-allocation material swap: substitute with static hit flash material
    const flashMat = isCritical ? CreatureMaterialFactory.HIT_FLASH_CRIT : CreatureMaterialFactory.HIT_FLASH_NORMAL;
    for (const [mesh] of rig.originalMaterials.entries()) {
      mesh.material = flashMat;
    }
  }

  /**
   * Main per-frame animation update for a creature rig.
   */
  public static update(
    dt: number,
    rig: CreatureRig,
    entityState: EntityState,
    distToPlayerSq: number,
    frameCount: number
  ): void {
    // 1. Distance-based LOD
    // NEAR: < 22m (distSq < 484) -> Full 60fps update, all secondary motions, contact shadow active
    // MID:  22-42m (distSq < 1764) -> 30fps update (every 2nd frame), simplified secondary motions
    // FAR:  > 42m -> 15fps update (every 4th frame), contact shadow disabled
    let isNear = distToPlayerSq < 484;
    let isMid = !isNear && distToPlayerSq < 1764;
    let isFar = !isNear && !isMid;

    if (isFar) {
      if ((frameCount + Math.floor(rig.animPhase * 10)) % 4 !== 0) {
        return;
      }
      if (rig.contactShadow) rig.contactShadow.visible = false;
    } else {
      if (isMid && (frameCount + Math.floor(rig.animPhase * 10)) % 2 !== 0) {
        return;
      }
      if (rig.contactShadow) rig.contactShadow.visible = true;
    }

    this.animTime += dt * 0.001; // subtle global drifting base
    const entityTime = (performance.now() * 0.001) + rig.animPhase;

    // 2. Hit Flash Recovery
    if (rig.hitFlashTimer > 0) {
      rig.hitFlashTimer -= dt;
      if (rig.hitFlashTimer <= 0) {
        rig.hitFlashTimer = 0;
        rig.hitFlashType = 'none';
        this.restoreOriginalMaterials(rig);
      }
    }

    // 3. Flinch & Stagger Timers
    if (rig.flinchTimer > 0) rig.flinchTimer -= dt;
    if (rig.staggerTimer > 0) rig.staggerTimer -= dt;

    // 4. Locomotion Parameters
    const vx = entityState.velocity[0];
    const vz = entityState.velocity[2];
    const horizontalSpeed = Math.hypot(vx, vz);
    const isMoving = horizontalSpeed > 0.12;
    const isRunning = horizontalSpeed > 2.6 || entityState.aiState === 'flee' || entityState.aiState === 'chase';
    const isDead = entityState.aiState === 'dead' || entityState.health <= 0;
    const isSleeping = entityState.aiState === 'sleep';

    // 5. Handle Death Animation
    if (isDead) {
      rig.root.rotation.z = THREE.MathUtils.lerp(rig.root.rotation.z, Math.PI / 2, dt * 6.0);
      rig.torso.position.y = THREE.MathUtils.lerp(rig.torso.position.y, 0.15, dt * 6.0);
      if (rig.contactShadow) rig.contactShadow.visible = false;
      return;
    }

    // 6. Handle Sleep Animation
    if (isSleeping) {
      const breathe = Math.sin(entityTime * 1.2) * 0.02;
      rig.torso.position.y = (rig.initialTorsoPos?.y || 0) * 0.5 + breathe;
      rig.torso.rotation.z = 0.15;
      if (rig.head) rig.head.rotation.x = 0.45;
      if (rig.legFL) rig.legFL.rotation.x = 0.8;
      if (rig.legFR) rig.legFR.rotation.x = 0.8;
      if (rig.legBL) rig.legBL.rotation.x = 0.8;
      if (rig.legBR) rig.legBR.rotation.x = 0.8;
      return;
    }

    // 7. Dispatch by Locomotion Type
    switch (rig.locomotion) {
      case 'quadruped':
        this.updateQuadruped(dt, rig, entityState, entityTime, isMoving, isRunning, isNear);
        break;
      case 'biped':
      case 'humanoid':
        this.updateBiped(dt, rig, entityState, entityTime, isMoving, isRunning, isNear);
        break;
      case 'avian':
        this.updateFlying(dt, rig, entityState, entityTime, isMoving, isRunning, isNear);
        break;
      case 'aquatic':
        this.updateAquatic(dt, rig, entityState, entityTime, isMoving, isRunning, isNear);
        break;
      case 'arachnid':
        this.updateArachnid(dt, rig, entityState, entityTime, isMoving, isRunning, isNear);
        break;
      case 'aberration':
        this.updateAberration(dt, rig, entityState, entityTime, isMoving, isRunning, isNear);
        break;
      case 'golem':
      case 'boss_golem':
      case 'boss':
        this.updateBossGolem(dt, rig, entityState, entityTime, isMoving, isRunning, isNear);
        break;
      case 'boss_sovereign':
        this.updateBossSovereign(dt, rig, entityState, entityTime, isMoving, isRunning, isNear);
        break;
    }

    // 8. Apply Physical Flinch Recoil
    if (rig.flinchTimer > 0) {
      const flinch = Math.sin((rig.flinchTimer / 0.2) * Math.PI);
      rig.torso.position.y += flinch * 0.08;
      rig.torso.rotation.x -= flinch * 0.22;
    }

    // 9. Apply Stagger Wobble
    if (rig.staggerTimer > 0) {
      const wobble = Math.sin(entityTime * 14) * 0.22;
      rig.torso.rotation.z += wobble * 0.5;
      if (rig.head) {
        rig.head.rotation.z += wobble;
        rig.head.rotation.x = THREE.MathUtils.lerp(rig.head.rotation.x, 0.4, dt * 6);
      }
    }
  }

  // ==========================================
  // QUADRUPED LOCOMOTION (Stag, Woolbeast, Grazeback, Wolf, Lynx)
  // ==========================================
  private static updateQuadruped(
    dt: number,
    rig: CreatureRig,
    state: EntityState,
    time: number,
    isMoving: boolean,
    isRunning: boolean,
    isNear: boolean
  ): void {
    const initTorsoY = rig.initialTorsoPos?.y || 0;
    const initHeadY = rig.initialHeadPos?.y || 0;

    if (isMoving) {
      // Dynamic diagonal quadruped gait (Front-Left + Back-Right vs Front-Right + Back-Left)
      const gaitFrequency = isRunning ? 11.5 : 7.2;
      const walkCycle = time * gaitFrequency;
      const swingAngle = isRunning ? 0.65 : 0.42;

      const swingFL = Math.sin(walkCycle) * swingAngle;
      const swingFR = -Math.sin(walkCycle) * swingAngle;
      const swingBL = -Math.sin(walkCycle) * swingAngle;
      const swingBR = Math.sin(walkCycle) * swingAngle;

      if (rig.legFL) rig.legFL.rotation.x = swingFL;
      if (rig.legFR) rig.legFR.rotation.x = swingFR;
      if (rig.legBL) rig.legBL.rotation.x = swingBL;
      if (rig.legBR) rig.legBR.rotation.x = swingBR;

      // Torso weight shift (roll Z and vertical bounce)
      rig.torso.rotation.z = Math.sin(walkCycle) * (isRunning ? 0.07 : 0.035);
      rig.torso.position.y = initTorsoY + Math.abs(Math.sin(walkCycle * 2)) * (isRunning ? 0.08 : 0.04);
      rig.torso.rotation.x = isRunning ? 0.12 : 0.02; // Pitch forward when sprinting

      // Head bobbing rhythmically with stride
      if (rig.head) {
        rig.head.rotation.x = Math.sin(walkCycle * 2) * (isRunning ? 0.12 : 0.06);
        rig.head.position.y = initHeadY + Math.sin(walkCycle * 2) * 0.03;
      }

      // Tail swishing when running
      if (rig.tail) {
        rig.tail.rotation.y = Math.sin(walkCycle) * 0.45;
        rig.tail.rotation.x = isRunning ? 0.35 : 0.1;
      }

      rig.isGrazing = false;
      rig.grazeTimer = 0;
    } else {
      // Idle Pose: Smooth natural breathing
      const breathe = Math.sin(time * 1.8) * 0.02;
      rig.torso.position.y = initTorsoY + breathe;
      rig.torso.rotation.z = 0;
      rig.torso.rotation.x = 0;

      // Zero out legs smoothly
      if (rig.legFL) rig.legFL.rotation.x = THREE.MathUtils.lerp(rig.legFL.rotation.x, 0, dt * 6);
      if (rig.legFR) rig.legFR.rotation.x = THREE.MathUtils.lerp(rig.legFR.rotation.x, 0, dt * 6);
      if (rig.legBL) rig.legBL.rotation.x = THREE.MathUtils.lerp(rig.legBL.rotation.x, 0, dt * 6);
      if (rig.legBR) rig.legBR.rotation.x = THREE.MathUtils.lerp(rig.legBR.rotation.x, 0, dt * 6);

      // Herbivore Periodic Grazing Behavior (Woolbeast, Grazeback, Stag)
      const isHerbivore = rig.modelType === 'woolbeast' || rig.modelType === 'grazeback' || rig.modelType === 'stag';
      if (isHerbivore) {
        rig.grazeTimer += dt;
        if (!rig.isGrazing && rig.grazeTimer > 8.0) {
          rig.isGrazing = true;
          rig.grazeTimer = 0;
        } else if (rig.isGrazing && rig.grazeTimer > 3.5) {
          rig.isGrazing = false;
          rig.grazeTimer = 0;
        }

        if (rig.isGrazing && rig.head) {
          rig.head.rotation.x = THREE.MathUtils.lerp(rig.head.rotation.x, 0.65, dt * 4.0);
          rig.head.position.y = THREE.MathUtils.lerp(rig.head.position.y, initHeadY - 0.18, dt * 4.0);
        } else if (rig.head) {
          // Alert / looking around
          const lookYaw = Math.sin(time * 0.8) * 0.15;
          rig.head.rotation.y = lookYaw;
          rig.head.rotation.x = THREE.MathUtils.lerp(rig.head.rotation.x, 0, dt * 4.0);
          rig.head.position.y = THREE.MathUtils.lerp(rig.head.position.y, initHeadY, dt * 4.0);
        }
      } else if (rig.head) {
        // Predator looking / sniffing
        rig.head.rotation.y = Math.sin(time * 1.2) * 0.22;
        rig.head.rotation.x = Math.sin(time * 1.5) * 0.08;
      }

      // Idle tail swish
      if (rig.tail && isNear) {
        rig.tail.rotation.y = Math.sin(time * 2.5) * 0.25;
      }
    }

    // Predator Attack Anticipation & Strike
    if (state.aiState === 'attack' && (rig.modelType === 'wolf' || rig.modelType === 'void_lynx')) {
      rig.attackWindupProgress = Math.min(1.0, rig.attackWindupProgress + dt * 4.0);
      const crouch = Math.sin(rig.attackWindupProgress * Math.PI);
      rig.torso.position.y -= crouch * 0.12;
      rig.torso.rotation.x += crouch * 0.18;
      if (rig.head) rig.head.rotation.x += crouch * 0.25;
    } else {
      rig.attackWindupProgress = 0;
    }
  }

  // ==========================================
  // BIPED LOCOMOTION (Shadow Stalker, Merchant, Elder)
  // ==========================================
  private static updateBiped(
    dt: number,
    rig: CreatureRig,
    state: EntityState,
    time: number,
    isMoving: boolean,
    isRunning: boolean,
    isNear: boolean
  ): void {
    const initTorsoY = rig.initialTorsoPos?.y || 0;
    const initHeadY = rig.initialHeadPos?.y || 0;

    if (isMoving) {
      const walkCycle = time * (isRunning ? 11.0 : 7.0);
      const swingAngle = isRunning ? 0.72 : 0.45;

      const legSwing = Math.sin(walkCycle) * swingAngle;
      if (rig.legL) rig.legL.rotation.x = legSwing;
      if (rig.legR) rig.legR.rotation.x = -legSwing;

      // Arm swing opposite to leg
      if (rig.armL) rig.armL.rotation.x = -legSwing * 0.85;
      if (rig.armR) rig.armR.rotation.x = legSwing * 0.85;

      // Torso bobbing and subtle pelvic yaw
      rig.torso.position.y = initTorsoY + Math.abs(Math.sin(walkCycle * 2)) * (isRunning ? 0.09 : 0.045);
      rig.torso.rotation.y = Math.sin(walkCycle) * 0.08;
      rig.torso.rotation.z = Math.sin(walkCycle) * 0.03;

      if (rig.head) {
        rig.head.rotation.x = Math.sin(walkCycle * 2) * 0.06;
      }
    } else {
      // Idle Breathing
      const breathe = Math.sin(time * 1.6) * 0.02;
      rig.torso.position.y = initTorsoY + breathe;
      rig.torso.rotation.y = 0;
      rig.torso.rotation.z = 0;

      if (rig.legL) rig.legL.rotation.x = THREE.MathUtils.lerp(rig.legL.rotation.x, 0, dt * 6);
      if (rig.legR) rig.legR.rotation.x = THREE.MathUtils.lerp(rig.legR.rotation.x, 0, dt * 6);

      // Stalker hunched predatory idle vs NPC idle
      if (rig.modelType === 'stalker' || rig.modelType === 'shadow_stalker') {
        rig.torso.rotation.x = 0.18; // Hunched spine
        if (rig.armL) rig.armL.rotation.x = 0.35 + Math.sin(time * 2.0) * 0.08;
        if (rig.armR) rig.armR.rotation.x = 0.35 - Math.sin(time * 2.0) * 0.08;
        if (rig.head) rig.head.rotation.y = Math.sin(time * 1.5) * 0.25;
      } else {
        // Merchant / Elder idle breathing
        if (rig.armL) rig.armL.rotation.x = THREE.MathUtils.lerp(rig.armL.rotation.x, 0, dt * 6);
        if (rig.armR) rig.armR.rotation.x = THREE.MathUtils.lerp(rig.armR.rotation.x, 0, dt * 6);
        if (rig.head && isNear) {
          rig.head.rotation.y = Math.sin(time * 0.7) * 0.2;
        }
      }
    }

    // Hostile Biped Attack Wind-up (Stalker Claw Slash)
    if (state.aiState === 'attack' && (rig.modelType === 'stalker' || rig.modelType === 'shadow_stalker')) {
      rig.attackWindupProgress = Math.min(1.0, rig.attackWindupProgress + dt * 5.0);
      const strike = Math.sin(rig.attackWindupProgress * Math.PI);
      if (rig.armR) rig.armR.rotation.x = -1.2 + strike * 2.2;
      rig.torso.rotation.y = -strike * 0.3;
    } else {
      rig.attackWindupProgress = 0;
    }
  }

  // ==========================================
  // FLYING LOCOMOTION (Crystal Bee, Glowhen Flap)
  // ==========================================
  private static updateFlying(
    dt: number,
    rig: CreatureRig,
    state: EntityState,
    time: number,
    isMoving: boolean,
    isRunning: boolean,
    isNear: boolean
  ): void {
    const initTorsoY = rig.initialTorsoPos?.y || 0;

    // High frequency wing flutter
    const wingSpeed = isMoving ? 38.0 : 26.0;
    const flap = Math.sin(time * wingSpeed) * 0.65;

    if (rig.wingL) rig.wingL.rotation.z = flap;
    if (rig.wingR) rig.wingR.rotation.z = -flap;

    // Hovering altitude oscillation
    const hover = Math.sin(time * 4.0) * 0.12;
    rig.torso.position.y = initTorsoY + hover;

    // Banking into movement
    if (isMoving) {
      rig.torso.rotation.x = 0.22;
      rig.torso.rotation.z = Math.sin(time * 4.0) * 0.08;
    } else {
      rig.torso.rotation.x = 0;
      rig.torso.rotation.z = 0;
    }
  }

  // ==========================================
  // AQUATIC LOCOMOTION (Azure Glowfin)
  // ==========================================
  private static updateAquatic(
    dt: number,
    rig: CreatureRig,
    state: EntityState,
    time: number,
    isMoving: boolean,
    isRunning: boolean,
    isNear: boolean
  ): void {
    const initTorsoY = rig.initialTorsoPos?.y || 0;
    const swimSpeed = isMoving ? 10.0 : 4.5;
    const swimWave = Math.sin(time * swimSpeed);

    // Spine and Caudal Fin Horizontal Undulation
    if (rig.tail) {
      rig.tail.rotation.y = swimWave * 0.55;
    }
    rig.torso.rotation.y = swimWave * 0.15;
    rig.torso.position.y = initTorsoY + Math.sin(time * 2.5) * 0.06;

    // Pectoral Fin Steering
    if (rig.armL) rig.armL.rotation.y = Math.sin(time * 6.0) * 0.35;
    if (rig.armR) rig.armR.rotation.y = -Math.sin(time * 6.0) * 0.35;
  }

  // ==========================================
  // ABERRATION LOCOMOTION (Void Spitter)
  // ==========================================
  private static updateAberration(
    dt: number,
    rig: CreatureRig,
    state: EntityState,
    time: number,
    isMoving: boolean,
    isRunning: boolean,
    isNear: boolean
  ): void {
    const initTorsoY = rig.initialTorsoPos?.y || 0;

    // Pulsing central dark core
    const corePulse = 1.0 + Math.sin(time * 3.5) * 0.08;
    rig.torso.scale.set(corePulse, corePulse, corePulse);
    rig.torso.position.y = initTorsoY + Math.sin(time * 2.0) * 0.18;
    rig.torso.rotation.y += dt * 0.6;

    // Orbiting levitating shards
    if (rig.shards) {
      rig.shards.forEach((shard, idx) => {
        const angle = (idx / rig.shards!.length) * Math.PI * 2 + (time * 1.5);
        const radius = 0.65 + Math.sin(time * 3.0 + idx) * 0.08;
        shard.position.x = Math.cos(angle) * radius;
        shard.position.z = Math.sin(angle) * radius;
        shard.position.y = (rig.initialTorsoPos?.y || 0) + Math.sin(time * 4.0 + idx * 1.5) * 0.15;
        shard.rotation.y = -angle;
      });
    }
  }

  // ==========================================
  // ARACHNID LOCOMOTION (Spiders, Scorpions)
  // ==========================================
  private static updateArachnid(
    dt: number,
    rig: CreatureRig,
    state: EntityState,
    time: number,
    isMoving: boolean,
    isRunning: boolean,
    isNear: boolean
  ): void {
    const initTorsoY = rig.initialTorsoPos?.y || 0;
    const legSpeed = isRunning ? 22.0 : isMoving ? 14.0 : 0.0;
    const legCycle = time * legSpeed;

    rig.torso.position.y = initTorsoY + (isMoving ? Math.abs(Math.sin(legCycle * 2)) * 0.08 : Math.sin(time * 2.0) * 0.02);
    rig.torso.rotation.x = isMoving ? 0.1 : 0.0;

    if (legSpeed > 0) {
      if (rig.legFL) { rig.legFL.rotation.z = 0.4 + Math.sin(legCycle) * 0.3; rig.legFL.rotation.y = Math.cos(legCycle) * 0.3; }
      if (rig.legFR) { rig.legFR.rotation.z = -0.4 - Math.sin(legCycle + Math.PI) * 0.3; rig.legFR.rotation.y = Math.cos(legCycle + Math.PI) * 0.3; }
      if (rig.legBL) { rig.legBL.rotation.z = 0.4 + Math.sin(legCycle + Math.PI) * 0.3; rig.legBL.rotation.y = Math.cos(legCycle + Math.PI) * 0.3; }
      if (rig.legBR) { rig.legBR.rotation.z = -0.4 - Math.sin(legCycle) * 0.3; rig.legBR.rotation.y = Math.cos(legCycle) * 0.3; }
    } else {
      if (rig.legFL) { rig.legFL.rotation.z = THREE.MathUtils.lerp(rig.legFL.rotation.z, 0.4, dt * 6); rig.legFL.rotation.y = THREE.MathUtils.lerp(rig.legFL.rotation.y, 0, dt * 6); }
      if (rig.legFR) { rig.legFR.rotation.z = THREE.MathUtils.lerp(rig.legFR.rotation.z, -0.4, dt * 6); rig.legFR.rotation.y = THREE.MathUtils.lerp(rig.legFR.rotation.y, 0, dt * 6); }
      if (rig.legBL) { rig.legBL.rotation.z = THREE.MathUtils.lerp(rig.legBL.rotation.z, 0.4, dt * 6); rig.legBL.rotation.y = THREE.MathUtils.lerp(rig.legBL.rotation.y, 0, dt * 6); }
      if (rig.legBR) { rig.legBR.rotation.z = THREE.MathUtils.lerp(rig.legBR.rotation.z, -0.4, dt * 6); rig.legBR.rotation.y = THREE.MathUtils.lerp(rig.legBR.rotation.y, 0, dt * 6); }
    }
  }

  // ==========================================
  // BOSS GOLEM LOCOMOTION (Ancient Ruin Sentinel)
  // ==========================================
  private static updateBossGolem(
    dt: number,
    rig: CreatureRig,
    state: EntityState,
    time: number,
    isMoving: boolean,
    isRunning: boolean,
    isNear: boolean
  ): void {
    const initTorsoY = rig.initialTorsoPos?.y || 0;

    // Heavy Monolithic Stomps
    if (isMoving) {
      const stompCycle = time * 4.0;
      const legSwing = Math.sin(stompCycle) * 0.38;

      if (rig.legL) rig.legL.rotation.x = legSwing;
      if (rig.legR) rig.legR.rotation.x = -legSwing;
      if (rig.armL) rig.armL.rotation.x = -legSwing * 0.5;
      if (rig.armR) rig.armR.rotation.x = legSwing * 0.5;

      rig.torso.position.y = initTorsoY + Math.abs(Math.sin(stompCycle * 2)) * 0.06;
      rig.torso.rotation.z = Math.sin(stompCycle) * 0.04;
    } else {
      rig.torso.position.y = initTorsoY + Math.sin(time * 1.2) * 0.02;
      if (rig.legL) rig.legL.rotation.x = THREE.MathUtils.lerp(rig.legL.rotation.x, 0, dt * 5);
      if (rig.legR) rig.legR.rotation.x = THREE.MathUtils.lerp(rig.legR.rotation.x, 0, dt * 5);
      if (rig.armL) rig.armL.rotation.x = THREE.MathUtils.lerp(rig.armL.rotation.x, 0, dt * 5);
      if (rig.armR) rig.armR.rotation.x = THREE.MathUtils.lerp(rig.armR.rotation.x, 0, dt * 5);
    }

    // Chest Reactor Core Pulsing Emission
    if (rig.core) {
      const isPhase2 = state.health < state.maxHealth * 0.4;
      const pulseSpeed = isPhase2 ? 7.0 : 3.0;
      const coreScale = 1.0 + Math.sin(time * pulseSpeed) * 0.12;
      rig.core.scale.set(coreScale, coreScale, coreScale);
    }

    // Boss Attack Telegraph: Giant Smash Wind-Up
    if (state.aiState === 'attack') {
      rig.attackWindupProgress = Math.min(1.0, rig.attackWindupProgress + dt * 2.2);
      const windup = Math.sin(rig.attackWindupProgress * Math.PI);
      // Raise massive crushing stone fists high overhead
      if (rig.armL) rig.armL.rotation.x = -windup * 1.8;
      if (rig.armR) rig.armR.rotation.x = -windup * 1.8;
      rig.torso.rotation.x = -windup * 0.25;
    } else {
      rig.attackWindupProgress = 0;
    }
  }

  // ==========================================
  // BOSS WORLD SOVEREIGN LOCOMOTION (The Void Sovereign)
  // ==========================================
  private static updateBossSovereign(
    dt: number,
    rig: CreatureRig,
    state: EntityState,
    time: number,
    isMoving: boolean,
    isRunning: boolean,
    isNear: boolean
  ): void {
    const initTorsoY = rig.initialTorsoPos?.y || 0;

    // Majestic Floating Hover
    rig.torso.position.y = initTorsoY + Math.sin(time * 1.8) * 0.22;

    // Dual Layered Segmented Void Wings
    const wingFlap = Math.sin(time * 2.4) * 0.45;
    if (rig.wingL) {
      rig.wingL.rotation.y = wingFlap;
      rig.wingL.rotation.z = Math.sin(time * 2.4) * 0.15;
    }
    if (rig.wingR) {
      rig.wingR.rotation.y = -wingFlap;
      rig.wingR.rotation.z = -Math.sin(time * 2.4) * 0.15;
    }

    // 6 Levitating Orbiting Runes (Elliptical Orbit with Trail Effect)
    if (rig.runes) {
      const orbitSpeed = state.aiState === 'attack' ? 4.5 : 1.2;
      rig.runes.forEach((rune, idx) => {
        const angle = (idx / rig.runes!.length) * Math.PI * 2 + (time * orbitSpeed);
        rune.position.x = Math.cos(angle) * 1.4;
        rune.position.z = Math.sin(angle) * 1.4;
        rune.position.y = (rig.initialTorsoPos?.y || 0) + Math.sin(time * 3.0 + idx) * 0.25;
        rune.rotation.y = -angle;
        rune.rotation.z = Math.sin(time * 4.0 + idx) * 0.2;
      });
    }

    // Floating Crown Shards
    if (rig.crown) {
      rig.crown.position.y = Math.sin(time * 3.0) * 0.08;
      rig.crown.rotation.y = time * 0.5;
    }

    // Pulsing Singularity Heart Core
    if (rig.core) {
      const pulse = 1.0 + Math.sin(time * 4.0) * 0.15;
      rig.core.scale.set(pulse, pulse, pulse);
    }

    // Boss Attack Telegraph: Flare Wings & Rune Vortex
    if (state.aiState === 'attack') {
      rig.attackWindupProgress = Math.min(1.0, rig.attackWindupProgress + dt * 2.0);
      const telegraph = Math.sin(rig.attackWindupProgress * Math.PI);
      if (rig.wingL) rig.wingL.rotation.y = 0.85 + telegraph * 0.35;
      if (rig.wingR) rig.wingR.rotation.y = -0.85 - telegraph * 0.35;
      rig.torso.position.y += telegraph * 0.35;
    } else {
      rig.attackWindupProgress = 0;
    }
  }

  /**
   * Triggers an attack anticipation / release pulse on the rig
   */
  public static triggerAttack(rig: CreatureRig): void {
    rig.attackWindupProgress = 0.8;
  }

  /**
   * Restores cached original materials on all rig sub-meshes
   */
  public static restoreOriginalMaterials(rig: CreatureRig): void {
    for (const [mesh, origMat] of rig.originalMaterials.entries()) {
      mesh.material = origMat;
    }
  }

  /**
   * Cleans up rig state and restores original materials to prevent any leaks or desynced colors
   */
  public static cleanup(rig: CreatureRig): void {
    if (rig.hitFlashType !== 'none') {
      this.restoreOriginalMaterials(rig);
      rig.hitFlashType = 'none';
      rig.hitFlashTimer = 0;
    }
  }
}
