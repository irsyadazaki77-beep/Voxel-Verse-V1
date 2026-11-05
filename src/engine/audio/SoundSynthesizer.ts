// Procedural Web Audio API Sound Synthesizer: Footsteps, Block Breaking/Placing, Combat, UI & Adaptive Gamelan Director
import { BlockType } from '../../types';

export type FootstepSurfaceType = 'grass' | 'stone' | 'wood' | 'sand' | 'water' | 'snow' | 'metal';

export class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private cachedNoiseBuffer: AudioBuffer | null = null;
  public masterVolume: number = 0.8;
  public sfxVolume: number = 0.8;
  public musicVolume: number = 0.5;
  private isMuted: boolean = false;

  // Adaptive Gamelan Ambient Director State
  private ambientTimer: number = 6.0; // Start first gentle phrase after 6s
  private noteStepTimer: number = 0;
  private activePhraseNotes: { freq: number; instrument: 'saron' | 'suling' | 'angklung' | 'gong'; delay: number }[] = [];
  private phraseIndex: number = 0;

  constructor() {
    // Lazy initialized on first user interaction
  }

  private initCtx(): void {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.ctx && !this.cachedNoiseBuffer) {
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
      this.cachedNoiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = this.cachedNoiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
  }

  // O(1) BlockType to Acoustic Footstep Surface Resolver
  public static resolveSurfaceFootstepType(blockId: number, isInWater: boolean = false): FootstepSurfaceType {
    if (isInWater || blockId === BlockType.WATER || blockId === BlockType.TERRACE_WATERWAY) {
      return 'water';
    }
    switch (blockId) {
      case BlockType.SAND:
      case BlockType.GRAVEL:
      case BlockType.CLAY:
      case BlockType.TERRACOTTA_ROOF_TILE:
        return 'sand';

      case BlockType.SNOW:
      case BlockType.ICE:
        return 'snow';

      case BlockType.AETHER_RAIL:
      case BlockType.IRON_BLOCK:
      case BlockType.GOLD_BLOCK:
      case BlockType.ANVIL_SMITHING:
      case BlockType.SENTINEL_TURRET:
      case BlockType.AUTO_HARVESTER:
      case BlockType.RESONANCE_NEXUS:
        return 'metal';

      case BlockType.OAK_LOG:
      case BlockType.PINE_LOG:
      case BlockType.SKYROOT_LOG:
      case BlockType.TEAK_WOOD_LOG:
      case BlockType.ULIN_IRONWOOD_LOG:
      case BlockType.WOOD_PLANKS:
      case BlockType.SKYROOT_PLANKS:
      case BlockType.TEAK_WOOD_PLANKS:
      case BlockType.ULIN_IRONWOOD_PLANKS:
      case BlockType.CRAFTING_BENCH:
      case BlockType.CHEST:
      case BlockType.RICE_STORAGE_CHEST:
      case BlockType.BOOKSHELF:
      case BlockType.DOOR_BOTTOM:
      case BlockType.DOOR_TOP:
      case BlockType.FENCE_WOOD:
      case BlockType.BAMBOO_FENCE:
      case BlockType.TORCH:
      case BlockType.WOOD_SLAB:
      case BlockType.WOOD_STAIRS:
      case BlockType.BAMBOO_STALK_BLOCK:
      case BlockType.WOVEN_BAMBOO_GEDEK:
      case BlockType.CARVED_WOOD_BEAM:
      case BlockType.WOODEN_SHUTTER:
      case BlockType.IJUK_THATCH_ROOF:
      case BlockType.ALANG_ALANG_THATCH:
      case BlockType.BATIK_CARPET_BLOCK:
        return 'wood';

      case BlockType.GRASS:
      case BlockType.AETHER_GRASS:
      case BlockType.DIRT:
      case BlockType.AETHER_DIRT:
      case BlockType.OAK_LEAVES:
      case BlockType.PINE_LEAVES:
      case BlockType.CYAN_CRYSTAL_LEAVES:
      case BlockType.SKYROOT_LEAVES:
      case BlockType.TALL_GRASS:
      case BlockType.BLUE_FLOWER:
      case BlockType.RED_FLOWER:
      case BlockType.SUN_ORCHID:
      case BlockType.LUMINESCENT_MUSHROOM:
      case BlockType.FARMLAND:
      case BlockType.CROP_WHEAT_0:
      case BlockType.CROP_WHEAT_1:
      case BlockType.CROP_WHEAT_2:
      case BlockType.CROP_WHEAT_3:
      case BlockType.CROP_CARROT:
      case BlockType.CROP_HERB:
        return 'grass';

      default:
        return 'stone';
    }
  }

  // 1. Layered Material-Aware Footstep Sound (Oscillator body + Filtered Noise texture)
  public playFootstep(type: FootstepSurfaceType = 'grass', isSprinting: boolean = false): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Slight natural pitch variation (+/- 7%) so footsteps feel organic
    const pitchJitter = 0.93 + Math.random() * 0.14;
    const sprintBoost = isSprinting ? 1.18 : 1.0;
    const baseVol = this.masterVolume * this.sfxVolume * 0.2 * sprintBoost;
    if (baseVol <= 0.001) return;

    // Layer A: Low-end physical heel impact
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    const oscFilter = this.ctx.createBiquadFilter();

    let freq = 110;
    let dur = 0.085;

    if (type === 'grass') {
      freq = 95 * pitchJitter;
      dur = 0.09;
      osc.type = 'triangle';
      oscFilter.type = 'lowpass';
      oscFilter.frequency.setValueAtTime(320, t);
    } else if (type === 'stone') {
      freq = 235 * pitchJitter;
      dur = 0.065;
      osc.type = 'sine';
      oscFilter.type = 'bandpass';
      oscFilter.frequency.setValueAtTime(620, t);
      oscFilter.Q.setValueAtTime(2.2, t);
    } else if (type === 'wood') {
      freq = 155 * pitchJitter;
      dur = 0.095;
      osc.type = 'triangle';
      oscFilter.type = 'bandpass';
      oscFilter.frequency.setValueAtTime(420, t);
      oscFilter.Q.setValueAtTime(3.5, t);
    } else if (type === 'sand') {
      freq = 82 * pitchJitter;
      dur = 0.11;
      osc.type = 'sine';
      oscFilter.type = 'lowpass';
      oscFilter.frequency.setValueAtTime(240, t);
    } else if (type === 'snow') {
      freq = 125 * pitchJitter;
      dur = 0.11;
      osc.type = 'sine';
      oscFilter.type = 'lowpass';
      oscFilter.frequency.setValueAtTime(290, t);
    } else if (type === 'water') {
      freq = 280 * pitchJitter;
      dur = 0.16;
      osc.type = 'sine';
      oscFilter.type = 'bandpass';
      oscFilter.frequency.setValueAtTime(520, t);
      oscFilter.frequency.exponentialRampToValueAtTime(1100, t + dur);
    } else if (type === 'metal') {
      freq = 440 * pitchJitter;
      dur = 0.075;
      osc.type = 'triangle';
      oscFilter.type = 'bandpass';
      oscFilter.frequency.setValueAtTime(1250, t);
      oscFilter.Q.setValueAtTime(4.5, t);
    }

    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(28, freq * 0.32), t + dur);

    oscGain.gain.setValueAtTime(baseVol, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(oscFilter);
    oscFilter.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + dur);

    // Layer B: Surface micro-texture crunch using zero-GC cached noise buffer
    if (this.cachedNoiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.cachedNoiseBuffer;

      const nFilter = this.ctx.createBiquadFilter();
      const nGain = this.ctx.createGain();
      let nDur = dur * 0.85;
      let nVol = baseVol * 0.55;

      if (type === 'grass') {
        nFilter.type = 'bandpass';
        nFilter.frequency.setValueAtTime(1400 * pitchJitter, t);
        nFilter.Q.setValueAtTime(1.8, t);
      } else if (type === 'stone') {
        nFilter.type = 'highpass';
        nFilter.frequency.setValueAtTime(1800 * pitchJitter, t);
        nDur = 0.04;
        nVol = baseVol * 0.4;
      } else if (type === 'wood') {
        nFilter.type = 'bandpass';
        nFilter.frequency.setValueAtTime(680 * pitchJitter, t);
        nFilter.Q.setValueAtTime(4.0, t);
        nVol = baseVol * 0.35;
      } else if (type === 'sand') {
        nFilter.type = 'bandpass';
        nFilter.frequency.setValueAtTime(2200 * pitchJitter, t);
        nFilter.Q.setValueAtTime(1.4, t);
        nVol = baseVol * 0.7;
      } else if (type === 'snow') {
        nFilter.type = 'bandpass';
        nFilter.frequency.setValueAtTime(1650 * pitchJitter, t);
        nFilter.Q.setValueAtTime(2.5, t);
        nVol = baseVol * 0.65;
      } else if (type === 'water') {
        nFilter.type = 'bandpass';
        nFilter.frequency.setValueAtTime(950 * pitchJitter, t);
        nFilter.Q.setValueAtTime(1.5, t);
        nDur = 0.14;
        nVol = baseVol * 0.75;
      } else if (type === 'metal') {
        nFilter.type = 'highpass';
        nFilter.frequency.setValueAtTime(2600 * pitchJitter, t);
        nDur = 0.045;
        nVol = baseVol * 0.45;
      }

      nGain.gain.setValueAtTime(nVol, t);
      nGain.gain.exponentialRampToValueAtTime(0.001, t + nDur);

      noise.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(this.ctx.destination);

      noise.start(t, Math.random() * 0.08, nDur);
    }
  }

  // 1b. Landing Impact Thud (scaled by fall height)
  public playLandingThud(type: FootstepSurfaceType = 'grass', fallDistance: number = 2.0): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const intensity = Math.min(1.5, Math.max(0.4, fallDistance / 5.0));
    this.playFootstep(type, true);

    const t = this.ctx.currentTime;
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(95 * intensity, t);
    subOsc.frequency.exponentialRampToValueAtTime(28, t + 0.16);

    const vol = this.masterVolume * this.sfxVolume * 0.32 * intensity;
    subGain.gain.setValueAtTime(vol, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 0.16);
  }

  // 2. Block Hit / Punch Crunch
  public playBlockHit(type: string): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.06;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = type === 'crystal' ? 'highpass' : 'bandpass';
    filter.frequency.setValueAtTime(type === 'crystal' ? 1200 : 400, t);

    const gain = this.ctx.createGain();
    const vol = this.masterVolume * this.sfxVolume * 0.25;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  // 3. Block Break Pop & Cracking
  public playBlockBreak(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.12);

    const vol = this.masterVolume * this.sfxVolume * 0.3;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);
  }

  // 4. Block Place Thud
  public playBlockPlace(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.09);

    const vol = this.masterVolume * this.sfxVolume * 0.35;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  // 5. Weapon Swing Woosh
  public playWeaponSwing(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.15);

    const vol = this.masterVolume * this.sfxVolume * 0.22;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  }

  // 6. Hit Impact / Combat Clang
  public playHitImpact(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(180, t + 0.18);

    const vol = this.masterVolume * this.sfxVolume * 0.35;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  // 7. Item Collect Chime
  public playItemCollect(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, t); // D5
    osc.frequency.setValueAtTime(880, t + 0.06); // A5

    const vol = this.masterVolume * this.sfxVolume * 0.25;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.16);
  }

  // 8. Level Up Fanfare
  public playLevelUp(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const t = this.ctx!.currentTime + i * 0.1;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const vol = this.masterVolume * this.sfxVolume * 0.3;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + 0.35);
    });
  }

  // 9. UI Click
  public playUIClick(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.04);

    const vol = this.masterVolume * this.sfxVolume * 0.15;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.04);
  }

  // 10. Damage & Player Hit
  public playDamage(): void {
    this.playHitImpact();
  }

  public playPlayerHit(): void {
    this.playHitImpact();
  }

  // 11. Critical Hit Strike Feedback
  public playCriticalHit(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    
    // Low punchy transient
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(320, t);
    subOsc.frequency.exponentialRampToValueAtTime(45, t + 0.25);

    const vol = this.masterVolume * this.sfxVolume * 0.45;
    subGain.gain.setValueAtTime(vol, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(t);
    subOsc.stop(t + 0.25);

    // High critical resonance chime
    const bellOsc = this.ctx.createOscillator();
    const bellGain = this.ctx.createGain();
    bellOsc.type = 'sine';
    bellOsc.frequency.setValueAtTime(1174.66, t); // D6
    bellOsc.frequency.exponentialRampToValueAtTime(1760, t + 0.35); // A6

    bellGain.gain.setValueAtTime(vol * 0.4, t);
    bellGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    bellOsc.connect(bellGain);
    bellGain.connect(this.ctx.destination);
    bellOsc.start(t);
    bellOsc.stop(t + 0.35);
  }

  // 12. Bow Tension Draw
  public playBowDraw(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.linearRampToValueAtTime(380, t + 0.4);

    const vol = this.masterVolume * this.sfxVolume * 0.18;
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(600, t);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.45);
  }

  // 13. Bow Arrow Release Twang
  public playBowRelease(isCritical: boolean = false): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isCritical ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isCritical ? 720 : 520, t);
    osc.frequency.exponentialRampToValueAtTime(isCritical ? 160 : 110, t + 0.18);

    const vol = this.masterVolume * this.sfxVolume * (isCritical ? 0.45 : 0.38);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.18);
  }

  // 14. Shield Block & Parry Clank
  public playShieldBlock(isParry: boolean = false): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isParry ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(isParry ? 950 : 380, t);
    osc.frequency.exponentialRampToValueAtTime(isParry ? 400 : 90, t + (isParry ? 0.3 : 0.12));

    const vol = this.masterVolume * this.sfxVolume * (isParry ? 0.45 : 0.35);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + (isParry ? 0.3 : 0.12));

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + (isParry ? 0.3 : 0.12));
  }

  // 15. Entity Alert Growl / Hiss
  public playEntityAlert(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, t);
    osc.frequency.linearRampToValueAtTime(240, t + 0.15);
    osc.frequency.linearRampToValueAtTime(110, t + 0.35);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(450, t);

    const vol = this.masterVolume * this.sfxVolume * 0.24;
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  // 16. Entity Death Dissolve
  public playEntityDeath(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.45);

    const vol = this.masterVolume * this.sfxVolume * 0.3;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.45);
  }

  // 17. Generic Tone Play
  public playTone(freq: number, dur: number, type: OscillatorType = 'sine'): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    const vol = this.masterVolume * this.sfxVolume * 0.25;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + dur);
  }

  // 18. Ancient Nusantara Bronze Gong
  public playAncientGong(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Harmonic partials for Indonesian Gamelan Ageng gong resonance
    const partials = [
      { freq: 110, gainRatio: 1.0, decay: 3.5 },
      { freq: 221, gainRatio: 0.6, decay: 2.8 },
      { freq: 334, gainRatio: 0.35, decay: 2.2 },
      { freq: 442, gainRatio: 0.2, decay: 1.6 },
      { freq: 558, gainRatio: 0.15, decay: 1.2 },
    ];

    partials.forEach(({ freq, gainRatio, decay }) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      const vol = this.masterVolume * this.sfxVolume * 0.45 * gainRatio;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + decay);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + decay);
    });
  }

  // 18b. Authentic Gamelan Saron (Slendro Scale: 1: Panunggul, 2: Gulu, 3: Dada, 5: Lima, 6: Nem)
  public playGamelanSaron(scaleIndex: number = 2): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const slendroFreqs = [260, 298, 340, 392, 450, 520, 596]; // Hz
    const freq = slendroFreqs[Math.abs(scaleIndex) % slendroFreqs.length];
    const t = this.ctx.currentTime;
    const dur = 1.4;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);

    // Subtle metallic overtone (ring modulation vibe)
    const overtone = this.ctx.createOscillator();
    const overGain = this.ctx.createGain();
    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 2.76, t);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(freq * 1.5, t);
    filter.Q.setValueAtTime(3.0, t);

    const vol = this.masterVolume * this.sfxVolume * 0.35;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    overGain.gain.setValueAtTime(vol * 0.4, t);
    overGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    overtone.connect(overGain);
    overGain.connect(gain);
    gain.connect(filter);
    filter.connect(this.ctx.destination);

    osc.start(t);
    overtone.start(t);
    osc.stop(t + dur);
    overtone.stop(t + 0.35);
  }

  // 18c. Sundanese Angklung Bamboo Resonance
  public playAngklungBamboo(pitchIndex: number = 0): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const pitches = [330, 370, 415, 494, 554];
    const baseFreq = pitches[Math.abs(pitchIndex) % pitches.length];
    const t = this.ctx.currentTime;

    // Bamboo rattling dual tube resonance
    [baseFreq, baseFreq * 2].forEach((f, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(f, t);
      filter.Q.setValueAtTime(8, t);

      const amp = this.masterVolume * this.sfxVolume * (idx === 0 ? 0.28 : 0.16);
      gain.gain.setValueAtTime(amp, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx!.destination);

      osc.start(t);
      osc.stop(t + 0.6);
    });
  }

  // 18d. Suling Bamboo Flute Tone
  public playSulingBamboo(freq: number = 440): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dur = 0.9;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    // Breath vibrato
    osc.frequency.linearRampToValueAtTime(freq + 4, t + 0.3);
    osc.frequency.linearRampToValueAtTime(freq - 3, t + 0.6);

    const vol = this.masterVolume * this.sfxVolume * 0.22;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + dur);
  }

  // 19. Primeval Titan Sub-Bass Roar & Earth Quake
  public playTitanRoar(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dur = 1.8;

    // Sub oscillator (sawtooth pitch sweep)
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.linearRampToValueAtTime(165, t + 0.3);
    osc.frequency.exponentialRampToValueAtTime(32, t + dur);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(280, t);
    filter.frequency.linearRampToValueAtTime(420, t + 0.4);
    filter.frequency.exponentialRampToValueAtTime(90, t + dur);
    filter.Q.setValueAtTime(4.0, t);

    const vol = this.masterVolume * this.sfxVolume * 0.55;
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + dur);
  }

  // 20. Adaptive Gamelan Nusantara Music Director (Slendro & Pelog Generative Leitmotifs)
  public updateAmbientGamelan(
    deltaTime: number,
    state: {
      biomeName: string;
      timeOfDay: number;
      isCombatOrCataclysm: boolean;
      isUnderwater: boolean;
      isSailing: boolean;
    }
  ): void {
    if (this.isMuted || this.musicVolume <= 0.01) return;
    // Only play if AudioContext has already been unlocked by user interaction
    if (!this.ctx || this.ctx.state !== 'running') return;

    // Step through active phrase notes if a phrase is currently playing
    if (this.activePhraseNotes.length > 0) {
      this.noteStepTimer -= deltaTime;
      if (this.noteStepTimer <= 0) {
        const nextNote = this.activePhraseNotes.shift()!;
        this.playAmbientGamelanNote(nextNote.freq, nextNote.instrument);
        this.noteStepTimer = nextNote.delay;
      }
      return;
    }

    // Breathing interval between musical phrases
    this.ambientTimer -= deltaTime;
    if (this.ambientTimer > 0) return;

    const isNight = state.timeOfDay < 5.5 || state.timeOfDay >= 19.0;
    // Slendro pentatonic frequencies (Hz): Panunggul, Gulu, Dada, Lima, Nem + upper octave
    const slendro = [261.6, 298.4, 342.0, 398.5, 452.8, 523.2, 596.8];
    // Pelog Barang / Bem atmospheric frequencies (Hz): ethereal & dramatic
    const pelog = [246.9, 261.6, 329.6, 370.0, 392.0, 493.8, 523.2];

    if (state.isCombatOrCataclysm) {
      // Dramatic Pelog Kendang/Gong & Saron tension motif
      const base = pelog;
      this.activePhraseNotes = [
        { freq: base[0], instrument: 'gong', delay: 0.45 },
        { freq: base[2], instrument: 'saron', delay: 0.32 },
        { freq: base[3], instrument: 'saron', delay: 0.32 },
        { freq: base[4], instrument: 'saron', delay: 0.45 },
        { freq: base[1], instrument: 'saron', delay: 0.35 },
        { freq: base[5], instrument: 'saron', delay: 0.6 },
      ];
      this.ambientTimer = 9 + Math.random() * 6;
    } else if (state.isUnderwater) {
      // Deep Sea Trench: Ethereal slow Pelog harmonics + resonant gong
      const base = pelog;
      const idx = this.phraseIndex % 4;
      this.activePhraseNotes = [
        { freq: base[idx + 2], instrument: 'saron', delay: 1.1 },
        { freq: base[idx + 4], instrument: 'suling', delay: 1.4 },
        { freq: base[idx + 1], instrument: 'saron', delay: 1.6 },
      ];
      this.ambientTimer = 16 + Math.random() * 10;
    } else if (state.isSailing) {
      // Maritime Phinisi Voyage: Uplifting Slendro Suling Bamboo & Angklung breeze
      const base = slendro;
      const offset = this.phraseIndex % 3;
      this.activePhraseNotes = [
        { freq: base[offset], instrument: 'angklung', delay: 0.75 },
        { freq: base[offset + 2], instrument: 'suling', delay: 0.9 },
        { freq: base[offset + 3], instrument: 'saron', delay: 0.75 },
        { freq: base[offset + 4], instrument: 'suling', delay: 1.2 },
      ];
      this.ambientTimer = 14 + Math.random() * 8;
    } else if (isNight) {
      // Starlit Nusantara Night: Gentle contemplative Pelog Saron & distant Gong Ageng
      const base = pelog;
      const offset = this.phraseIndex % 3;
      this.activePhraseNotes = [
        { freq: base[0], instrument: 'gong', delay: 1.1 },
        { freq: base[offset + 2], instrument: 'saron', delay: 0.95 },
        { freq: base[offset + 1], instrument: 'saron', delay: 1.15 },
        { freq: base[offset + 3], instrument: 'suling', delay: 1.4 },
      ];
      this.ambientTimer = 18 + Math.random() * 12;
    } else {
      // Daytime Emerald Highlands / Subak / Village: Peaceful Slendro Saron, Angklung & Suling
      const base = slendro;
      const offset = this.phraseIndex % 3;
      this.activePhraseNotes = [
        { freq: base[offset + 1], instrument: 'saron', delay: 0.7 },
        { freq: base[offset + 2], instrument: 'angklung', delay: 0.75 },
        { freq: base[offset + 4], instrument: 'suling', delay: 0.95 },
        { freq: base[offset + 3], instrument: 'saron', delay: 0.85 },
        { freq: base[0], instrument: 'gong', delay: 1.2 },
      ];
      this.ambientTimer = 16 + Math.random() * 12;
    }

    this.phraseIndex++;
    this.noteStepTimer = 0.05;
  }

  private playAmbientGamelanNote(
    freq: number,
    instrument: 'saron' | 'suling' | 'angklung' | 'gong'
  ): void {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;
    const musicScale = this.masterVolume * this.musicVolume;
    if (musicScale <= 0.005) return;

    if (instrument === 'gong') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 0.5, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(musicScale * 0.24, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + 3.2);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 3.2);
      return;
    }

    if (instrument === 'suling') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.linearRampToValueAtTime(freq + 3.5, t + 0.4);
      osc.frequency.linearRampToValueAtTime(freq - 2.0, t + 0.8);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(musicScale * 0.16, t + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 1.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 1.25);
      return;
    }

    // Saron / Angklung soft bell chime
    const osc = this.ctx.createOscillator();
    const overtone = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const overGain = this.ctx.createGain();

    osc.type = instrument === 'angklung' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(freq, t);

    overtone.type = 'sine';
    overtone.frequency.setValueAtTime(freq * (instrument === 'angklung' ? 2.0 : 2.76), t);

    const dur = instrument === 'angklung' ? 0.95 : 1.5;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(musicScale * 0.2, t + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);

    overGain.gain.setValueAtTime(musicScale * 0.06, t);
    overGain.gain.exponentialRampToValueAtTime(0.0005, t + dur * 0.45);

    osc.connect(gain);
    overtone.connect(overGain);
    overGain.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    overtone.start(t);
    osc.stop(t + dur);
    overtone.stop(t + dur * 0.45);
  }

  // 21. Interactive Playable 3D Gamelan & Angklung Studio Note (Pelog & Slendro)
  public playInteractiveGamelanKey(
    scale: 'PELOG' | 'SLENDRO',
    noteIndex: number,
    instrument: 'SARON' | 'BONANG' | 'ANGKLUNG' | 'GONG'
  ): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const pelogFreqs = [261.63, 277.18, 329.63, 369.99, 392.0, 440.0, 523.25];
    const slendroFreqs = [261.63, 293.66, 339.29, 392.0, 449.5, 523.25, 587.33];
    const table = scale === 'PELOG' ? pelogFreqs : slendroFreqs;
    const freq = table[Math.max(0, Math.min(table.length - 1, noteIndex))] || 329.63;

    const t = this.ctx.currentTime;
    const vol = this.masterVolume * this.sfxVolume * 0.42;
    if (vol <= 0.005) return;

    if (instrument === 'GONG') {
      this.playAncientGong();
      return;
    }

    if (instrument === 'ANGKLUNG') {
      // Dual-tube bamboo rattle harmonic (octave pair + gentle tremolo)
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, t);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2.0, t);

      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(11.5, t);
      lfoGain.gain.setValueAtTime(vol * 0.18, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(vol * 0.75, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.95);

      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(t);
      osc2.start(t);
      lfo.start(t);
      osc1.stop(t + 0.95);
      osc2.stop(t + 0.95);
      lfo.stop(t + 0.95);
      return;
    }

    // SARON or BONANG metallic bronze resonance
    const osc = this.ctx.createOscillator();
    const overtone = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const overGain = this.ctx.createGain();

    osc.type = 'sine';
    const baseFreq = instrument === 'BONANG' ? freq * 1.5 : freq;
    osc.frequency.setValueAtTime(baseFreq, t);

    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(baseFreq * (instrument === 'BONANG' ? 2.42 : 2.76), t);

    const dur = instrument === 'BONANG' ? 1.35 : 1.15;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);

    overGain.gain.setValueAtTime(vol * 0.28, t);
    overGain.gain.exponentialRampToValueAtTime(0.0005, t + dur * 0.35);

    osc.connect(gain);
    overtone.connect(overGain);
    overGain.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    overtone.start(t);
    osc.stop(t + dur);
    overtone.stop(t + dur * 0.35);
  }

  // 22. Submarine Sonar Hydrophone Ping
  public playSubmarineSonarPing(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const echo = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const echoGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1480, t);
    osc.frequency.exponentialRampToValueAtTime(1420, t + 0.85);

    echo.type = 'sine';
    echo.frequency.setValueAtTime(1480, t + 0.38);

    const vol = this.masterVolume * this.sfxVolume * 0.35;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + 0.9);

    echoGain.gain.setValueAtTime(0.0001, t);
    echoGain.gain.setValueAtTime(vol * 0.28, t + 0.38);
    echoGain.gain.exponentialRampToValueAtTime(0.0005, t + 1.35);

    osc.connect(gain);
    echo.connect(echoGain);
    gain.connect(this.ctx.destination);
    echoGain.connect(this.ctx.destination);

    osc.start(t);
    echo.start(t + 0.38);
    osc.stop(t + 0.9);
    echo.stop(t + 1.35);
  }

  // 23. Aether Steam Locomotive Whistle & Chug
  public playLocomotiveWhistle(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'triangle';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(587.33, t);
    osc2.frequency.setValueAtTime(739.99, t);

    const vol = this.masterVolume * this.sfxVolume * 0.28;
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.06);
    gain.gain.setValueAtTime(vol * 0.85, t + 0.45);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.95);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.95);
    osc2.stop(t + 0.95);
  }

  // 24. Camera Shutter Sound for 3D Photo Mode
  public playCameraShutter(): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(320, t + 0.055);

    const vol = this.masterVolume * this.sfxVolume * 0.45;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  // 25. 3-Stage Keris & Melee Combo Slash Audio (Step 0: Quick, Step 1: Cross, Step 2: Pamungkas Finisher)
  public playComboSlash(comboStep: number = 0): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const isFinisher = comboStep === 2;
    const vol = this.masterVolume * this.sfxVolume * (isFinisher ? 0.44 : 0.28);
    if (vol <= 0.005) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = isFinisher ? 'sawtooth' : 'triangle';

    const startFreq = comboStep === 0 ? 480 : comboStep === 1 ? 610 : 820;
    const endFreq = comboStep === 0 ? 150 : comboStep === 1 ? 190 : 120;
    const dur = isFinisher ? 0.22 : 0.13;

    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0008, t + dur);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur);

    if (isFinisher) {
      // Metallic Pamor Keris ring overtone on 3rd-stage Finisher
      const ring = this.ctx.createOscillator();
      const ringGain = this.ctx.createGain();
      ring.type = 'sine';
      ring.frequency.setValueAtTime(1318.5, t);
      ring.frequency.exponentialRampToValueAtTime(880, t + 0.28);
      ringGain.gain.setValueAtTime(vol * 0.4, t);
      ringGain.gain.exponentialRampToValueAtTime(0.0008, t + 0.28);
      ring.connect(ringGain);
      ringGain.connect(this.ctx.destination);
      ring.start(t);
      ring.stop(t + 0.28);
    }
  }

  public dispose(): void {
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
