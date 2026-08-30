// Centralized Camera Physics & Screen Motion Feedback System
// Handles walking view bob, sprint acceleration tilt, jump reaction, landing dip, damage tilt, attack recoil & screen shake
import * as THREE from 'three';
import { SettingsManager } from '../ui/SettingsManager';

export interface CameraMotionState {
  bobOffset: number;
  bobRoll: number;
  landingDip: number;
  damageTilt: number;
  shakeOffsetX: number;
  shakeOffsetY: number;
  recoilPitch: number;
}

export class CameraMotionSystem {
  private bobTimer: number = 0;
  private landingDipAmount: number = 0;
  private damageTiltAmount: number = 0;
  private screenShakeAmount: number = 0;
  private recoilPitchAmount: number = 0;

  public update(
    deltaTime: number,
    isMoving: boolean,
    isGrounded: boolean,
    isSprinting: boolean
  ): CameraMotionState {
    const dt = Math.min(deltaTime, 0.05);
    const settings = SettingsManager.get().accessibility;

    const motionReduced = settings?.motionReduction ?? false;
    const bobMult = motionReduced ? 0 : (settings?.headBobIntensity ?? 1.0);
    const shakeMult = motionReduced ? 0.2 : (settings?.cameraShakeIntensity ?? 1.0);

    // 1. Walking & Sprinting View Bob
    if (isMoving && isGrounded && bobMult > 0) {
      this.bobTimer += dt * (isSprinting ? 14.5 : 9.5);
    } else {
      this.bobTimer += (0 - this.bobTimer) * 6.0 * dt;
    }

    const bobOffset = Math.sin(this.bobTimer) * 0.038 * bobMult;
    const bobRoll = Math.cos(this.bobTimer * 0.5) * 0.008 * bobMult;

    // 2. Landing Impact Dip Recovery
    this.landingDipAmount = Math.max(0, this.landingDipAmount - dt * 2.2);

    // 3. Damage Tilt Decay
    this.damageTiltAmount = Math.max(0, this.damageTiltAmount - dt * 1.2);

    // 4. Attack / Combat Recoil Pitch Decay
    this.recoilPitchAmount = Math.max(0, this.recoilPitchAmount - dt * 8.0);

    // 5. Screen Shake Vibration Decay
    this.screenShakeAmount = Math.max(0, this.screenShakeAmount - dt * 4.5);
    const shakeX = (Math.random() * 2 - 1) * this.screenShakeAmount * 0.07 * shakeMult;
    const shakeY = (Math.random() * 2 - 1) * this.screenShakeAmount * 0.07 * shakeMult;

    return {
      bobOffset,
      bobRoll,
      landingDip: this.landingDipAmount * (motionReduced ? 0.3 : 1.0),
      damageTilt: this.damageTiltAmount * (motionReduced ? 0.4 : 1.0),
      shakeOffsetX: shakeX,
      shakeOffsetY: shakeY,
      recoilPitch: this.recoilPitchAmount,
    };
  }

  public triggerLandingImpact(velocityDown: number, fallDist: number): void {
    const rawDip = Math.min(0.28, Math.abs(velocityDown) * 0.02 + fallDist * 0.03);
    this.landingDipAmount = Math.max(this.landingDipAmount, rawDip);
  }

  public triggerDamageTilt(amount: number = 0.14): void {
    this.damageTiltAmount = amount;
    this.triggerScreenShake(0.35);
  }

  public triggerAttackRecoil(amount: number = 0.04): void {
    this.recoilPitchAmount = amount;
  }

  public triggerScreenShake(amount: number = 0.5): void {
    this.screenShakeAmount = Math.min(1.0, this.screenShakeAmount + amount);
  }

  public triggerExplosionImpulse(intensity: number = 0.9): void {
    this.triggerScreenShake(intensity);
    this.damageTiltAmount = 0.18 * intensity;
  }
}
