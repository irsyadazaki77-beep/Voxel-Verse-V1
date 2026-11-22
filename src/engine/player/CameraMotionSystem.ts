// Centralized Camera Physics & Screen Motion Feedback System
// Handles walking view bob, sprint acceleration tilt, jump reaction, landing dip, damage tilt, attack recoil, harmonic trauma shake & vessel wave sway
import { SettingsManager } from '../ui/SettingsManager';

export interface CameraMotionState {
  bobOffset: number;
  bobRoll: number;
  landingDip: number;
  damageTilt: number;
  shakeOffsetX: number;
  shakeOffsetY: number;
  recoilPitch: number;
  vesselWavePitch: number;
  vesselWaveRoll: number;
}

export class CameraMotionSystem {
  private bobTimer: number = 0;
  private bobAmplitude: number = 0;
  private shakePhase: number = 0;
  private landingDipAmount: number = 0;
  private damageTiltAmount: number = 0;
  private screenShakeAmount: number = 0;
  private recoilPitchAmount: number = 0;
  private vesselWavePitch: number = 0;
  private vesselWaveRoll: number = 0;
  private lastState: CameraMotionState = {
    bobOffset: 0,
    bobRoll: 0,
    landingDip: 0,
    damageTilt: 0,
    shakeOffsetX: 0,
    shakeOffsetY: 0,
    recoilPitch: 0,
    vesselWavePitch: 0,
    vesselWaveRoll: 0,
  };

  public setVesselWaveSway(pitch: number, roll: number): void {
    this.vesselWavePitch = pitch;
    this.vesselWaveRoll = roll;
  }

  public getLastState(): CameraMotionState {
    return this.lastState;
  }

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

    // 1. Silky-Smooth Walking & Sprinting View Bob (v8.5.0: monotonic phase + exponential amplitude damping, zero stop-rewind jitter!)
    const targetAmp = isMoving && isGrounded && bobMult > 0 ? 1.0 : 0.0;
    const ampSmooth = 1.0 - Math.exp(-dt * 11.0);
    this.bobAmplitude += (targetAmp - this.bobAmplitude) * ampSmooth;
    if (this.bobAmplitude > 0.005) {
      this.bobTimer += dt * (isSprinting ? 13.5 : 9.2);
    }

    const bobOffset = Math.sin(this.bobTimer) * 0.034 * bobMult * this.bobAmplitude;
    const bobRoll = Math.cos(this.bobTimer * 0.5) * 0.0065 * bobMult * this.bobAmplitude;

    // 2. Landing Impact Dip Recovery
    this.landingDipAmount = Math.max(0, this.landingDipAmount - dt * 2.4);

    // 3. Damage Tilt Decay
    this.damageTiltAmount = Math.max(0, this.damageTiltAmount - dt * 1.4);

    // 4. Attack / Combat Recoil Pitch Decay
    this.recoilPitchAmount = Math.max(0, this.recoilPitchAmount - dt * 8.5);

    // 5. Harmonic Trauma Screen Shake (Smooth multi-frequency wave instead of harsh white noise)
    this.screenShakeAmount = Math.max(0, this.screenShakeAmount - dt * 4.2);
    this.shakePhase += dt * 42.0;
    const trauma = this.screenShakeAmount * this.screenShakeAmount; // Non-linear trauma feel
    const shakeX =
      (Math.sin(this.shakePhase * 1.1) * 0.65 + Math.cos(this.shakePhase * 2.3) * 0.35) *
      trauma *
      0.085 *
      shakeMult;
    const shakeY =
      (Math.cos(this.shakePhase * 1.4) * 0.65 + Math.sin(this.shakePhase * 2.9) * 0.35) *
      trauma *
      0.085 *
      shakeMult;

    // 6. Decay vessel wave sway smoothly if not actively updated
    this.vesselWavePitch *= Math.max(0, 1 - dt * 5.0);
    this.vesselWaveRoll *= Math.max(0, 1 - dt * 5.0);

    this.lastState = {
      bobOffset,
      bobRoll,
      landingDip: this.landingDipAmount * (motionReduced ? 0.3 : 1.0),
      damageTilt: this.damageTiltAmount * (motionReduced ? 0.4 : 1.0),
      shakeOffsetX: shakeX,
      shakeOffsetY: shakeY,
      recoilPitch: this.recoilPitchAmount,
      vesselWavePitch: motionReduced ? 0 : this.vesselWavePitch * 0.35,
      vesselWaveRoll: motionReduced ? 0 : this.vesselWaveRoll * 0.45,
    };
    return this.lastState;
  }

  public triggerLandingImpact(velocityDown: number, fallDist: number): void {
    const rawDip = Math.min(0.28, Math.abs(velocityDown) * 0.02 + fallDist * 0.03);
    this.landingDipAmount = Math.max(this.landingDipAmount, rawDip);
    if (fallDist > 3.2) {
      this.triggerScreenShake(Math.min(0.65, (fallDist - 2.5) * 0.08));
    }
  }

  public triggerDamageTilt(amount: number = 0.14): void {
    this.damageTiltAmount = amount;
    this.triggerScreenShake(0.38);
  }

  public triggerAttackRecoil(amount: number = 0.04): void {
    this.recoilPitchAmount = amount;
    if (amount >= 0.06) {
      // Finisher / Critical strike punchy directional camera trauma
      this.triggerScreenShake(amount * 2.2);
    }
  }

  public triggerScreenShake(amount: number = 0.5): void {
    this.screenShakeAmount = Math.min(1.0, this.screenShakeAmount + amount);
  }

  public triggerExplosionImpulse(intensity: number = 0.9): void {
    this.triggerScreenShake(intensity);
    this.damageTiltAmount = 0.18 * intensity;
  }
}
