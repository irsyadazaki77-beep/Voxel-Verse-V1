// VoxelVerse v6.0.0: Multiplayer Sosial, Multi-Crew Vehicles & Gelanggang Duel Pendekar
// 1. Multi-Crew Phinisi & Kapal Selam Nanggala (Nahkoda, Penembak Meriam Cetbang, Operator Sonar)
// 2. Gelanggang Tanding Pendekar 1v1 Silat Arena (Sistem Ronde, Gong Wasit, Taruhan Reputasi & Slow-Mo Finishing)
// 3. Proximity Spatial Voice Chat Engine (WebRTC Signaling Ready + Web Audio HRTF Panner + Cave/Underwater Filter)

import * as THREE from 'three';
import { SoundSynthesizer } from '../audio/SoundSynthesizer';
import { ParticleManager } from '../environment/ParticleManager';
import { NotificationManager } from '../ui/NotificationManager';

export type VehicleCrewSeat = 'HELM' | 'CETBANG_GUNNER' | 'SONAR_OPERATOR';

export interface CetbangProjectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  age: number;
}

export interface SilatDuelState {
  active: boolean;
  opponentName: string;
  round: number;
  maxRounds: number;
  playerWins: number;
  opponentWins: number;
  playerHp: number;
  opponentHp: number;
  reputationWager: number;
  arenaCenter: [number, number, number];
  slowMoTimer: number;
}

export interface ProximityVoiceState {
  enabled: boolean;
  muted: boolean;
  environmentFilter: 'OPEN_AIR' | 'CAVE_REVERB' | 'UNDERWATER_MUFFLE';
  connectedPeers: number;
}

export interface ArenaMultiCrewTelemetry {
  activeCrewSeat: VehicleCrewSeat;
  cetbangShotsFired: number;
  duel: SilatDuelState;
  voice: ProximityVoiceState;
}

export class MultiplayerArenaSystem {
  private static rootGroup: THREE.Group = new THREE.Group();
  private static isAttached = false;

  // Multi-Crew state
  public static activeCrewSeat: VehicleCrewSeat = 'HELM';
  public static cetbangShotsFired = 0;
  private static projectiles: CetbangProjectile[] = [];
  private static cetbangCooldown = 0;

  // Gelanggang Duel state
  public static duel: SilatDuelState = {
    active: false,
    opponentName: 'Pendekar Bayangan',
    round: 1,
    maxRounds: 3,
    playerWins: 0,
    opponentWins: 0,
    playerHp: 100,
    opponentHp: 100,
    reputationWager: 25,
    arenaCenter: [0, 64, 0],
    slowMoTimer: 0,
  };
  private static arenaRingMesh: THREE.Mesh | null = null;

  // Proximity Spatial Voice state
  public static voice: ProximityVoiceState = {
    enabled: false,
    muted: false,
    environmentFilter: 'OPEN_AIR',
    connectedPeers: 0,
  };
  private static audioCtx: AudioContext | null = null;
  private static peerPanners: Map<string, { panner: PannerNode; filter: BiquadFilterNode }> = new Map();

  public static attachToScene(scene: THREE.Scene): void {
    if (this.isAttached) return;
    this.rootGroup.name = 'MultiplayerArenaRootV6';
    scene.add(this.rootGroup);
    this.isAttached = true;
  }

  public static reset(): void {
    for (const proj of this.projectiles) {
      this.rootGroup.remove(proj.mesh);
    }
    this.projectiles = [];
    if (this.arenaRingMesh) {
      this.rootGroup.remove(this.arenaRingMesh);
      this.arenaRingMesh = null;
    }
    this.duel.active = false;
    this.duel.slowMoTimer = 0;
    this.activeCrewSeat = 'HELM';
  }

  // ==================== 1. MULTI-CREW VEHICLES & MERIAM CETBANG ====================

  public static setCrewSeat(seat: VehicleCrewSeat, audio?: SoundSynthesizer): VehicleCrewSeat {
    this.activeCrewSeat = seat;
    const labels: Record<VehicleCrewSeat, string> = {
      HELM: '⚓ Kursi Nahkoda (Kemudi Utama)',
      CETBANG_GUNNER: '💥 Kursi Penembak Meriam Cetbang Majapahit',
      SONAR_OPERATOR: '📡 Kursi Operator Sonar & Lampu Sorot',
    };
    audio?.playGamelanSaron(seat === 'HELM' ? 2 : seat === 'CETBANG_GUNNER' ? 5 : 4);
    NotificationManager.push({
      title: '🚢 Pindah Tugas Awak Kapal',
      message: `Anda kini menempati ${labels[seat]}.`,
      priority: 'NORMAL',
      colorTheme: 'cyan',
      durationMs: 2400,
    });
    return seat;
  }

  public static fireCetbangCannon(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    audio?: SoundSynthesizer,
    particles?: ParticleManager
  ): boolean {
    if (this.cetbangCooldown > 0) return false;
    this.cetbangCooldown = 0.85;
    this.cetbangShotsFired++;

    const ballGeo = new THREE.SphereGeometry(0.22, 8, 8);
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      emissive: 0xf97316,
      emissiveIntensity: 0.75,
      metalness: 0.8,
      roughness: 0.3,
    });
    const mesh = new THREE.Mesh(ballGeo, ballMat);
    mesh.position.copy(origin).addScaledVector(direction, 1.4);
    this.rootGroup.add(mesh);

    const vel = direction.clone().normalize().multiplyScalar(32);
    vel.y += 4.5;
    this.projectiles.push({ mesh, velocity: vel, age: 0 });

    audio?.playAncientGong();
    particles?.emitBlockBreak(mesh.position, '#f97316', 'fire');

    // Trigger subtle gamepad rumble if connected
    this.triggerGamepadRumbleIfAvailable(0.75, 0.4, 180);

    return true;
  }

  public static triggerSonarSweep(
    origin: THREE.Vector3,
    audio?: SoundSynthesizer,
    particles?: ParticleManager
  ): void {
    audio?.playGamelanSaron(6);
    particles?.emitBlockBreak(origin, '#22d3ee', 'water');
    NotificationManager.push({
      title: '📡 Sapuan Sonar Aktif (Multi-Crew)',
      message: `Radar memindai kontur dasar laut & reruntuhan dalam radius 90m di sekitar [${Math.round(origin.x)}, ${Math.round(origin.z)}].`,
      priority: 'NORMAL',
      colorTheme: 'cyan',
      durationMs: 2800,
    });
  }

  // ==================== 2. GELANGGANG TANDING PENDEKAR (1v1 SILAT DUEL) ====================

  public static startSilatDuel(
    centerPos: [number, number, number],
    opponentName = 'Pendekar Bayangan',
    reputationWager = 25,
    audio?: SoundSynthesizer
  ): SilatDuelState {
    this.duel = {
      active: true,
      opponentName,
      round: 1,
      maxRounds: 3,
      playerWins: 0,
      opponentWins: 0,
      playerHp: 100,
      opponentHp: 100,
      reputationWager,
      arenaCenter: [Math.round(centerPos[0]), Math.round(centerPos[1]), Math.round(centerPos[2])],
      slowMoTimer: 0,
    };

    // Draw golden circular arena ring in 3D scene
    if (this.arenaRingMesh) {
      this.rootGroup.remove(this.arenaRingMesh);
    }
    const ringGeo = new THREE.RingGeometry(6.8, 7.2, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    this.arenaRingMesh = new THREE.Mesh(ringGeo, ringMat);
    this.arenaRingMesh.rotation.x = -Math.PI / 2;
    this.arenaRingMesh.position.set(centerPos[0], centerPos[1] + 0.08, centerPos[2]);
    this.rootGroup.add(this.arenaRingMesh);

    audio?.playAncientGong();
    NotificationManager.push({
      title: '⚔️ Gelanggang Tanding Pendekar Dimulai!',
      message: `Ronde 1/3 melawan ${opponentName} · Taruhan +${reputationWager} Reputasi Desa!`,
      priority: 'HIGH',
      colorTheme: 'amber',
      durationMs: 3800,
    });

    return this.duel;
  }

  public static registerDuelStrike(
    attacker: 'PLAYER' | 'OPPONENT',
    damage: number,
    audio?: SoundSynthesizer
  ): SilatDuelState {
    if (!this.duel.active) return this.duel;

    if (attacker === 'PLAYER') {
      this.duel.opponentHp = Math.max(0, this.duel.opponentHp - damage);
      this.triggerGamepadRumbleIfAvailable(0.45, 0.25, 110);
    } else {
      this.duel.playerHp = Math.max(0, this.duel.playerHp - damage);
    }

    if (this.duel.opponentHp <= 0 || this.duel.playerHp <= 0) {
      // Trigger dramatic slow-mo finishing moment!
      this.duel.slowMoTimer = 0.75;
      audio?.playAncientGong();

      if (this.duel.opponentHp <= 0) {
        this.duel.playerWins++;
      } else {
        this.duel.opponentWins++;
      }

      const winsNeeded = Math.ceil(this.duel.maxRounds / 2);
      if (this.duel.playerWins >= winsNeeded || this.duel.opponentWins >= winsNeeded) {
        const playerWon = this.duel.playerWins >= winsNeeded;
        this.duel.active = false;
        if (this.arenaRingMesh) {
          this.rootGroup.remove(this.arenaRingMesh);
          this.arenaRingMesh = null;
        }
        NotificationManager.push({
          title: playerWon ? '🏆 Juara Gelanggang Pendekar!' : '🥋 Pertandingan Berakhir',
          message: playerWon
            ? `Anda mengalahkan ${this.duel.opponentName} (${this.duel.playerWins}-${this.duel.opponentWins}) dan meraih +${this.duel.reputationWager} Reputasi!`
            : `${this.duel.opponentName} memenangkan duel (${this.duel.opponentWins}-${this.duel.playerWins}). Asah lagi Kuda-Kudamu!`,
          priority: 'HIGH',
          colorTheme: playerWon ? 'amber' : 'rose',
          durationMs: 4200,
        });
      } else {
        this.duel.round++;
        this.duel.playerHp = 100;
        this.duel.opponentHp = 100;
        NotificationManager.push({
          title: `🔔 Ronde ${this.duel.round}/${this.duel.maxRounds}`,
          message: `Skor sementara: Anda ${this.duel.playerWins} - ${this.duel.opponentWins} ${this.duel.opponentName}`,
          priority: 'NORMAL',
          colorTheme: 'amber',
          durationMs: 2600,
        });
      }
    }

    return this.duel;
  }

  public static getTimeScale(): number {
    return this.duel.slowMoTimer > 0 ? 0.35 : 1.0;
  }

  // ==================== 3. PROXIMITY SPATIAL VOICE CHAT (WEBRTC + HRTF) ====================

  public static toggleProximityVoice(enable?: boolean): ProximityVoiceState {
    const target = enable !== undefined ? enable : !this.voice.enabled;
    this.voice.enabled = target;
    if (target && typeof window !== 'undefined' && !this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    }
    NotificationManager.push({
      title: target ? '🎙️ Obrolan Suara Spasial 3D Aktif' : '🔇 Obrolan Suara Spasial Dimatikan',
      message: target
        ? 'Suara pemain di sekitar akan menyesuaikan jarak 3D, gema gua, dan redaman bawah air.'
        : 'Saluran suara spasial ditutup.',
      priority: 'NORMAL',
      colorTheme: 'cyan',
      durationMs: 2600,
    });
    return this.voice;
  }

  public static updateSpatialVoiceEnvironment(
    listenerPos: THREE.Vector3,
    isUnderwater: boolean,
    isUndergroundCave: boolean
  ): void {
    const env: ProximityVoiceState['environmentFilter'] = isUnderwater
      ? 'UNDERWATER_MUFFLE'
      : isUndergroundCave
      ? 'CAVE_REVERB'
      : 'OPEN_AIR';
    this.voice.environmentFilter = env;

    if (!this.audioCtx) return;
    if (this.audioCtx.listener.positionX) {
      this.audioCtx.listener.positionX.value = listenerPos.x;
      this.audioCtx.listener.positionY.value = listenerPos.y;
      this.audioCtx.listener.positionZ.value = listenerPos.z;
    }

    const cutoff = env === 'UNDERWATER_MUFFLE' ? 420 : env === 'CAVE_REVERB' ? 2400 : 18000;
    for (const node of this.peerPanners.values()) {
      node.filter.frequency.setTargetAtTime(cutoff, this.audioCtx.currentTime, 0.08);
    }
  }

  public static registerRemoteVoicePeer(peerId: string, pos: [number, number, number]): void {
    if (!this.audioCtx) return;
    let entry = this.peerPanners.get(peerId);
    if (!entry) {
      const panner = this.audioCtx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 3;
      panner.maxDistance = 42;
      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 18000;
      panner.connect(filter);
      filter.connect(this.audioCtx.destination);
      entry = { panner, filter };
      this.peerPanners.set(peerId, entry);
      this.voice.connectedPeers = this.peerPanners.size;
    }
    entry.panner.positionX.value = pos[0];
    entry.panner.positionY.value = pos[1];
    entry.panner.positionZ.value = pos[2];
  }

  private static triggerGamepadRumbleIfAvailable(strong: number, weak: number, duration: number): void {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    try {
      const pads = navigator.getGamepads();
      for (const pad of pads) {
        if (pad && (pad as any).vibrationActuator?.playEffect) {
          (pad as any).vibrationActuator.playEffect('dual-rumble', {
            startDelay: 0,
            duration,
            weakMagnitude: weak,
            strongMagnitude: strong,
          });
          break;
        }
      }
    } catch {
      // Ignore unsupported browsers
    }
  }

  public static update(dt: number, particles?: ParticleManager): void {
    const clampedDt = Math.min(dt, 0.1);

    if (this.cetbangCooldown > 0) {
      this.cetbangCooldown = Math.max(0, this.cetbangCooldown - clampedDt);
    }

    if (this.duel.slowMoTimer > 0) {
      this.duel.slowMoTimer = Math.max(0, this.duel.slowMoTimer - clampedDt);
    }

    // Update Cetbang cannonball projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.age += clampedDt;
      proj.velocity.y -= 18.0 * clampedDt;
      proj.mesh.position.addScaledVector(proj.velocity, clampedDt);

      if (proj.age > 3.2 || proj.mesh.position.y < 10) {
        particles?.emitBlockBreak(proj.mesh.position, '#f59e0b', 'fire');
        this.rootGroup.remove(proj.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  public static getTelemetry(): ArenaMultiCrewTelemetry {
    return {
      activeCrewSeat: this.activeCrewSeat,
      cetbangShotsFired: this.cetbangShotsFired,
      duel: { ...this.duel },
      voice: { ...this.voice },
    };
  }
}
