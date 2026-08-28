// Procedural Web Audio API Sound Synthesizer: Footsteps, Block Breaking/Placing, Combat, UI & Ambient Chords

export class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  public masterVolume: number = 0.8;
  public sfxVolume: number = 0.8;
  public musicVolume: number = 0.5;
  private isMuted: boolean = false;

  constructor() {
    // Lazy initialized on first user interaction
  }

  private initCtx(): void {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 1. Footstep sound based on material
  public playFootstep(type: 'grass' | 'stone' | 'wood' | 'sand' | 'water' = 'grass'): void {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    let freq = 120;
    let dur = 0.08;

    if (type === 'grass') {
      freq = 90;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, t);
    } else if (type === 'stone') {
      freq = 220;
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(400, t);
    } else if (type === 'wood') {
      freq = 150;
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(500, t);
    } else if (type === 'sand') {
      freq = 80;
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(250, t);
    } else if (type === 'water') {
      freq = 320;
      dur = 0.15;
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, t);
    }

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + dur);

    const vol = this.masterVolume * this.sfxVolume * 0.18;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + dur);
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
}
