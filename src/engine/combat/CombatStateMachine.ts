// Advanced Combat State Machine & Feedback Engine (Phase 3 & Master Overhaul)
// Handles weapon wind-up, active swing window, recovery cooldowns, bow charge dynamics, combos, parry, poise & critical ripostes
import * as THREE from 'three';
import { ItemDef, ItemStack } from '../../types';
import { ITEM_DEFS } from '../items/ItemRegistry';
import { WeaponArchetypes, WeaponProfile } from './WeaponArchetypes';
import { PoiseSystem } from './PoiseSystem';
import { ArtifactSynergyManager } from '../artifacts/ArtifactSynergyManager';

export type CombatState =
  | 'IDLE'
  | 'WIND_UP'
  | 'ACTIVE_SWING'
  | 'RECOVERY'
  | 'BOW_DRAWING'
  | 'BOW_CHARGED'
  | 'PARRY_BLOCK'
  | 'HIT_STUN';

export interface AttackResult {
  hit: boolean;
  damage: number;
  isCritical: boolean;
  isRiposte: boolean;
  poiseDamage: number;
  knockback: THREE.Vector3;
  comboIndex: number;
  damageType: 'physical' | 'piercing' | 'fire' | 'magic';
  weaponProfile: WeaponProfile;
}

export interface HitFeedback {
  screenShake: number; // 0..1 intensity
  hitStopMs: number;
  crosshairFlash: 'none' | 'hit' | 'crit' | 'blocked';
  damageDealt: number;
  targetPos: [number, number, number];
}

export class CombatStateMachine {
  public state: CombatState = 'IDLE';
  public stateTimer: number = 0;
  
  // Combo tracking (3-hit combo chain: Quick -> Heavy -> Finisher)
  public comboStep: number = 0;
  public comboWindowTimer: number = 0;
  public readonly maxComboSteps: number = 3;

  // Bow & Ranged Mechanics
  public bowDrawProgress: number = 0; // 0..1
  public maxBowDrawTime: number = 1.1; // seconds for full power
  public zoomLevel: number = 1.0; // Dynamic FOV multiplier

  // Shield & Parry
  public isBlocking: boolean = false;
  public parryWindowTimer: number = 0; // First 0.22s of block is a perfect parry

  // Hit reaction & Hit-stop
  public hitStopRemaining: number = 0;
  public lastHitFeedback: HitFeedback | null = null;

  // Timings per weapon tier/type
  private currentWindUpDuration: number = 0.08;
  private currentActiveDuration: number = 0.12;
  private currentRecoveryDuration: number = 0.22;

  public update(deltaTime: number): void {
    PoiseSystem.update(deltaTime);

    if (this.hitStopRemaining > 0) {
      this.hitStopRemaining -= deltaTime;
      if (this.hitStopRemaining > 0) return; // Freeze frame hitstop
    }

    this.stateTimer += deltaTime;

    // Combo reset window
    if (this.comboWindowTimer > 0) {
      this.comboWindowTimer -= deltaTime;
      if (this.comboWindowTimer <= 0) {
        this.comboStep = 0;
      }
    }

    // Parry window countdown
    if (this.parryWindowTimer > 0) {
      this.parryWindowTimer -= deltaTime;
    }

    // State Transitions
    switch (this.state) {
      case 'WIND_UP':
        if (this.stateTimer >= this.currentWindUpDuration) {
          this.state = 'ACTIVE_SWING';
          this.stateTimer = 0;
        }
        break;

      case 'ACTIVE_SWING':
        if (this.stateTimer >= this.currentActiveDuration) {
          this.state = 'RECOVERY';
          this.stateTimer = 0;
        }
        break;

      case 'RECOVERY':
        if (this.stateTimer >= this.currentRecoveryDuration) {
          this.state = 'IDLE';
          this.stateTimer = 0;
          this.comboWindowTimer = 0.65; // 650ms to chain next combo attack
        }
        break;

      case 'BOW_DRAWING':
        this.bowDrawProgress = Math.min(1.0, this.stateTimer / this.maxBowDrawTime);
        this.zoomLevel = 1.0 - this.bowDrawProgress * 0.18; // Subtle zoom-in focus
        if (this.bowDrawProgress >= 1.0) {
          this.state = 'BOW_CHARGED';
        }
        break;

      case 'BOW_CHARGED':
        this.bowDrawProgress = 1.0;
        this.zoomLevel = 0.82;
        break;

      case 'HIT_STUN':
        if (this.stateTimer >= 0.25) {
          this.state = 'IDLE';
          this.stateTimer = 0;
        }
        break;

      case 'PARRY_BLOCK':
        // Maintained while block button held
        break;

      case 'IDLE':
      default:
        this.zoomLevel = 1.0;
        break;
    }
  }

  // Initiate Melee Strike
  public triggerMeleeAttack(heldItem: ItemStack | null): boolean {
    if (this.state !== 'IDLE' && this.state !== 'RECOVERY') {
      return false; // Action blocked by ongoing animation or stun
    }

    const itemDef = heldItem ? ITEM_DEFS[heldItem.itemId] : null;
    const profile = WeaponArchetypes.getProfile(heldItem);
    const baseSpeed = itemDef?.attackSpeed || (1.0 / (profile.windupTime + profile.activeTime + profile.recoveryTime));

    // Scale animation timings based on weapon profile & speed
    const cycleTime = 1.0 / Math.max(0.5, baseSpeed);
    this.currentWindUpDuration = profile.windupTime * (cycleTime / 0.5);
    this.currentActiveDuration = profile.activeTime * (cycleTime / 0.5);
    this.currentRecoveryDuration = profile.recoveryTime * (cycleTime / 0.5);

    // Advance combo step
    if (this.comboWindowTimer > 0) {
      this.comboStep = (this.comboStep + 1) % this.maxComboSteps;
    } else {
      this.comboStep = 0;
    }
    this.comboWindowTimer = 0;

    this.state = 'WIND_UP';
    this.stateTimer = 0;
    return true;
  }

  // Calculate Damage, Poise Break, Riposte and Critical Strikes
  public calculateMeleeDamage(
    heldItem: ItemStack | null,
    isFallingOrJumping: boolean,
    isSprinting: boolean,
    isTargetStaggered: boolean = false
  ): AttackResult {
    const itemDef = heldItem ? ITEM_DEFS[heldItem.itemId] : null;
    const profile = WeaponArchetypes.getProfile(heldItem);
    const synergy = ArtifactSynergyManager.getCombinedBonuses();

    let baseDamage = itemDef?.attackDamage || 1.0;
    baseDamage *= synergy.damageMultiplier;

    // Combo multiplier: Step 0 (1.0x), Step 1 (1.15x), Step 2 Finisher (1.45x)
    let comboMultiplier = 1.0;
    if (this.comboStep === 1) comboMultiplier = 1.15;
    else if (this.comboStep === 2) comboMultiplier = 1.45;

    // Critical Hit condition: Falling jump attack OR sweet-spot spacing OR staggered foe
    let isCritical = isFallingOrJumping || Math.random() < synergy.critChanceBonus;
    let isRiposte = isTargetStaggered;

    let critMultiplier = isCritical ? 1.5 : 1.0;
    if (isRiposte) {
      critMultiplier = 2.2; // Staggered Riposte Finisher deals 220% massive damage
      isCritical = true;
    }

    const totalDamage = Math.round((baseDamage * comboMultiplier * critMultiplier) * 10) / 10;

    // Poise damage calculation
    let totalPoiseDamage = profile.poiseDamage * synergy.poiseDamageBonus;
    if (this.comboStep === 2) totalPoiseDamage *= 1.4; // Finisher deals heavy poise break

    // Knockback force calculation
    let knockbackStrength = 5.0 + (itemDef?.tier || 0) * 1.5;
    if (isSprinting) knockbackStrength += 3.5; // Sprint tackle knockback
    if (this.comboStep === 2) knockbackStrength += 4.5; // Finisher blast

    return {
      hit: true,
      damage: totalDamage,
      isCritical,
      isRiposte,
      poiseDamage: Math.round(totalPoiseDamage),
      knockback: new THREE.Vector3(0, 0, knockbackStrength),
      comboIndex: this.comboStep,
      damageType: itemDef?.category === 'weapon' ? 'physical' : 'physical',
      weaponProfile: profile,
    };
  }

  // Bow & Arrow Draw Management
  public startBowDraw(): boolean {
    if (this.state !== 'IDLE') return false;
    this.state = 'BOW_DRAWING';
    this.stateTimer = 0;
    this.bowDrawProgress = 0;
    return true;
  }

  public releaseBow(heldItem: ItemStack | null): { released: boolean; arrowVelocity: number; arrowDamage: number; isCritical: boolean } {
    if (this.state !== 'BOW_DRAWING' && this.state !== 'BOW_CHARGED') {
      return { released: false, arrowVelocity: 0, arrowDamage: 0, isCritical: false };
    }

    const chargeRatio = this.bowDrawProgress; // 0..1
    const isFullCharge = chargeRatio >= 0.95;
    const synergy = ArtifactSynergyManager.getCombinedBonuses();

    // Projectile speed curve (18 m/s up to 45 m/s)
    const arrowVelocity = 18.0 + chargeRatio * 27.0;
    // Damage scaling (3 base up to 18 on full charge)
    let baseDamage = (3.0 + chargeRatio * 15.0) * synergy.damageMultiplier;
    const isCritical = isFullCharge || Math.random() < synergy.critChanceBonus;
    const arrowDamage = Math.round((baseDamage * (isCritical ? 1.45 : 1.0)) * 10) / 10;

    this.state = 'IDLE';
    this.stateTimer = 0;
    this.bowDrawProgress = 0;
    this.zoomLevel = 1.0;

    return {
      released: true,
      arrowVelocity,
      arrowDamage,
      isCritical,
    };
  }

  public cancelBowDraw(): void {
    if (this.state === 'BOW_DRAWING' || this.state === 'BOW_CHARGED') {
      this.state = 'IDLE';
      this.stateTimer = 0;
      this.bowDrawProgress = 0;
      this.zoomLevel = 1.0;
    }
  }

  // Start Shield Block
  public startBlock(): boolean {
    if (this.state !== 'IDLE') return false;
    this.state = 'PARRY_BLOCK';
    this.isBlocking = true;
    this.parryWindowTimer = 0.22; // 220ms parry opportunity
    return true;
  }

  public releaseBlock(): void {
    if (this.state === 'PARRY_BLOCK') {
      this.state = 'IDLE';
      this.isBlocking = false;
      this.parryWindowTimer = 0;
    }
  }

  // Trigger Hit Feedback (Screen Shake, Hit-Stop, Sound Clues)
  public applyHitFeedback(isCrit: boolean, damage: number, targetPos: [number, number, number]): HitFeedback {
    const feedback: HitFeedback = {
      screenShake: isCrit ? 0.65 : 0.35,
      hitStopMs: isCrit ? 65 : 30, // Brief freeze frame on heavy impacts
      crosshairFlash: isCrit ? 'crit' : 'hit',
      damageDealt: damage,
      targetPos,
    };
    this.lastHitFeedback = feedback;
    this.hitStopRemaining = feedback.hitStopMs / 1000;
    return feedback;
  }

  // Apply Stun when player is hit hard or parried
  public applyHitStun(): void {
    this.state = 'HIT_STUN';
    this.stateTimer = 0;
    this.isBlocking = false;
    this.bowDrawProgress = 0;
  }

  // Get weapon swing visual progress for rendering model arcs (0..1)
  public getSwingProgress(): number {
    if (this.state === 'WIND_UP') {
      return (this.stateTimer / this.currentWindUpDuration) * 0.25;
    }
    if (this.state === 'ACTIVE_SWING') {
      return 0.25 + (this.stateTimer / this.currentActiveDuration) * 0.50;
    }
    if (this.state === 'RECOVERY') {
      return 0.75 + (this.stateTimer / this.currentRecoveryDuration) * 0.25;
    }
    return 0;
  }
}
