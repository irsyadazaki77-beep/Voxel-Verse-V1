// Aerial Flight (Garuda Kencana 3D & Dragon Kite Glider) & Village Siege / Sky Lantern Festival System
import * as THREE from 'three';
import { BlockType } from '../../types';
import { VoxelWorld } from '../world/VoxelWorld';
import { ParticleManager } from '../environment/ParticleManager';
import { SoundSynthesizer } from '../audio/SoundSynthesizer';
import { NotificationManager } from '../ui/NotificationManager';
import { EntityManager } from '../entities/EntityManager';
import { WorldStabilitySystem } from '../exploration/WorldStabilitySystem';

export type AerialFlightMode = 'none' | 'garuda' | 'glider';

export interface AerialHUDTelemetry {
  active: boolean;
  mode: AerialFlightMode;
  mountName: string;
  altitudeMeters: number;
  airspeedKnots: number;
  inThermalUpdraft: boolean;
  isDiving: boolean;
  wingFlapCooldown: number;
}

export interface SiegeAndFestivalTelemetry {
  siegeActive: boolean;
  wave: number;
  maxWaves: number;
  enemiesRemaining: number;
  villageIntegrity: number;
  festivalActive: boolean;
  festivalTimeLeft: number;
  activeLanternCount: number;
}

interface FloatingLanternInstance {
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  swayPhase: number;
  life: number;
  maxLife: number;
}

export class AerialFlightAndSiegeSystem {
  public static flightMode: AerialFlightMode = 'none';
  public static inThermalUpdraft: boolean = false;
  public static isDiving: boolean = false;
  public static wingFlapCooldown: number = 0;
  public static currentAirspeed: number = 0;
  public static bankRollAngle: number = 0;
  private static wingAnimPhase: number = 0;
  private static particleTimer: number = 0;
  private static pendingTakeoffBoostY: number = 0;

  public static get mode(): AerialFlightMode {
    return this.flightMode;
  }

  public static get altitude(): number {
    return Math.round(this.rootGroup ? this.rootGroup.position.y : 0);
  }

  public static summonAndMountGaruda(
    playerPos: THREE.Vector3,
    yaw: number = 0,
    audio?: SoundSynthesizer,
    particles?: ParticleManager
  ): void {
    const dummyVel = new THREE.Vector3(0, 0, 0);
    this.toggleFlightMode('garuda', playerPos, dummyVel, audio, particles);
  }

  public static deployDragonKiteGlider(
    playerPos: THREE.Vector3,
    yaw: number = 0,
    audio?: SoundSynthesizer,
    particles?: ParticleManager
  ): void {
    const dummyVel = new THREE.Vector3(0, 0, 0);
    this.toggleFlightMode('glider', playerPos, dummyVel, audio, particles);
  }

  public static dismount(audio?: SoundSynthesizer): void {
    this.dismountFlight(audio);
  }

  // 3D Mount / Glider Visual Groups attached to scene
  private static rootGroup: THREE.Group | null = null;
  private static garudaMeshGroup: THREE.Group | null = null;
  private static garudaWingL: THREE.Group | null = null;
  private static garudaWingR: THREE.Group | null = null;
  private static gliderMeshGroup: THREE.Group | null = null;
  private static gliderTailSegments: THREE.Mesh[] = [];

  // Village Siege Defense State
  public static siegeActive: boolean = false;
  public static siegeWave: number = 1;
  public static readonly maxSiegeWaves: number = 3;
  public static siegeSpawnedIds: Set<string> = new Set();
  public static villageIntegrity: number = 100;
  private static siegeCheckTimer: number = 0;

  // 3D Sky Lantern Festival State
  public static festivalActive: boolean = false;
  public static festivalTimer: number = 0;
  private static lanternSpawnTimer: number = 0;
  private static lanterns: FloatingLanternInstance[] = [];
  private static lanternContainer: THREE.Group | null = null;

  public static get siege() {
    return {
      active: this.siegeActive,
      festivalActive: this.festivalActive,
      settlementName: 'Desa Adat Nusantara',
      wave: this.siegeWave,
      maxWaves: this.maxSiegeWaves,
      villageIntegrity: this.villageIntegrity,
      spawnedEnemyIds: this.siegeSpawnedIds,
      festivalTimer: this.festivalTimer,
    };
  }

  public static getOrCreateRootGroup(): THREE.Group {
    if (!this.rootGroup) {
      this.rootGroup = new THREE.Group();
      this.rootGroup.name = 'AerialFlightAndSiegeRootGroup';

      this.garudaMeshGroup = this.buildGarudaKencanaMesh();
      this.garudaMeshGroup.visible = false;
      this.rootGroup.add(this.garudaMeshGroup);

      this.gliderMeshGroup = this.buildDragonKiteGliderMesh();
      this.gliderMeshGroup.visible = false;
      this.rootGroup.add(this.gliderMeshGroup);

      this.lanternContainer = new THREE.Group();
      this.lanternContainer.name = 'SkyLanternFestivalGroup';
      this.rootGroup.add(this.lanternContainer);
    }
    return this.rootGroup;
  }

  /**
   * Builds a composite 10-part 3D Garuda Kencana mount model with articulated wings
   */
  private static buildGarudaKencanaMesh(): THREE.Group {
    const group = new THREE.Group();

    const goldPradaMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.28,
      metalness: 0.78,
    });
    const crimsonFeatherMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.62,
      metalness: 0.12,
    });
    const creamPlumeMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.7,
      metalness: 0.05,
    });
    const cyanGemMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
    });

    // 1. Chest & Saddle Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.75, 1.45), crimsonFeatherMat);
    torso.position.set(0, 0, 0);
    group.add(torso);

    // 2. Golden Breastplate & Kalung Kencana
    const breastplate = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.55, 0.65), goldPradaMat);
    breastplate.position.set(0, 0.05, 0.48);
    group.add(breastplate);

    // 3. Neck & Fierce Garuda Head with Mahkota Crown
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.55, 0.78);
    const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.52, 0.62), crimsonFeatherMat);
    headGroup.add(cranium);

    const beakUpper = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.48), goldPradaMat);
    beakUpper.position.set(0, -0.04, 0.48);
    headGroup.add(beakUpper);

    const crownTier1 = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.54), goldPradaMat);
    crownTier1.position.set(0, 0.34, -0.02);
    headGroup.add(crownTier1);

    const crownSpire = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.28), goldPradaMat);
    crownSpire.position.set(0, 0.58, -0.05);
    headGroup.add(crownSpire);

    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.12), cyanGemMat);
    eyeL.position.set(0.26, 0.08, 0.25);
    const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.12), cyanGemMat);
    eyeR.position.set(-0.26, 0.08, 0.25);
    headGroup.add(eyeL, eyeR);
    group.add(headGroup);

    // 4. Articulated Left & Right Wings (Multi-layered feathers)
    const buildWing = (dir: 1 | -1): THREE.Group => {
      const wing = new THREE.Group();
      const innerSpan = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.12, 0.85), crimsonFeatherMat);
      innerSpan.position.set(dir * 0.75, 0, 0.05);
      wing.add(innerSpan);

      const goldCovert = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.14, 0.32), goldPradaMat);
      goldCovert.position.set(dir * 0.75, 0.02, 0.35);
      wing.add(goldCovert);

      const outerPrimary = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.09, 0.68), creamPlumeMat);
      outerPrimary.position.set(dir * 1.95, 0.04, -0.08);
      outerPrimary.rotation.y = dir * -0.18;
      wing.add(outerPrimary);

      return wing;
    };

    this.garudaWingL = buildWing(1);
    this.garudaWingL.position.set(0.45, 0.22, 0.1);
    this.garudaWingR = buildWing(-1);
    this.garudaWingR.position.set(-0.45, 0.22, 0.1);
    group.add(this.garudaWingL, this.garudaWingR);

    // 5. Tail Fan Plumes
    const tailFan = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.12, 0.95), goldPradaMat);
    tailFan.position.set(0, 0.08, -1.05);
    tailFan.rotation.x = 0.22;
    group.add(tailFan);

    return group;
  }

  /**
   * Builds a composite 3D Dragon Kite Glider (Layang-Layang Naga Batik) mounted above the player
   */
  private static buildDragonKiteGliderMesh(): THREE.Group {
    const group = new THREE.Group();

    const bambooMat = new THREE.MeshStandardMaterial({
      color: 0xd4b459,
      roughness: 0.55,
      metalness: 0.05,
    });
    const batikSailMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.72,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    const goldTrimMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      roughness: 0.32,
      metalness: 0.7,
    });

    // Overhead Canopy Frame
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 2.2), bambooMat);
    spine.position.set(0, 2.05, 0);
    group.add(spine);

    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.1, 0.12), bambooMat);
    crossbar.position.set(0, 2.05, 0.25);
    group.add(crossbar);

    // Left & Right Swept Dragon Kite Wings
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.05, 1.35), batikSailMat);
    wingL.position.set(0.9, 2.02, 0.05);
    wingL.rotation.z = -0.12;
    wingL.rotation.y = -0.15;

    const wingR = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.05, 1.35), batikSailMat);
    wingR.position.set(-0.9, 2.02, 0.05);
    wingR.rotation.z = 0.12;
    wingR.rotation.y = 0.15;

    const dragonCrest = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.55), goldTrimMat);
    dragonCrest.position.set(0, 2.12, 1.05);
    group.add(wingL, wingR, dragonCrest);

    // Articulated Trailing Dragon Tail Discs
    this.gliderTailSegments = [];
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Mesh(new THREE.BoxGeometry(0.36 - i * 0.05, 0.08, 0.36), i % 2 === 0 ? goldTrimMat : batikSailMat);
      seg.position.set(0, 2.0 - i * 0.06, -1.25 - i * 0.52);
      group.add(seg);
      this.gliderTailSegments.push(seg);
    }

    return group;
  }

  /**
   * Toggle or activate Garuda Kencana or Dragon Kite Glider
   */
  public static toggleFlightMode(
    targetMode: 'garuda' | 'glider',
    playerPos: THREE.Vector3,
    playerVel: THREE.Vector3,
    audio?: SoundSynthesizer,
    particles?: ParticleManager
  ): AerialFlightMode {
    this.getOrCreateRootGroup();

    if (this.flightMode === targetMode) {
      this.dismountFlight(audio);
      return 'none';
    }

    this.flightMode = targetMode;
    this.wingFlapCooldown = 0;

    // Give immediate takeoff lift (and queue for next update frame if called with dummy velocity)
    const boostY = targetMode === 'garuda' ? 11.5 : 7.5;
    playerPos.y += 0.6;
    playerVel.y = Math.max(playerVel.y, boostY);
    this.pendingTakeoffBoostY = boostY;

    if (this.garudaMeshGroup) this.garudaMeshGroup.visible = targetMode === 'garuda';
    if (this.gliderMeshGroup) this.gliderMeshGroup.visible = targetMode === 'glider';

    audio?.playGamelanSaron(4);
    if (particles) {
      particles.emitBlockBreak(playerPos.clone(), targetMode === 'garuda' ? '#f59e0b' : '#38bdf8', 'crystal');
    }

    NotificationManager.push({
      title: targetMode === 'garuda' ? '🦅 GARUDA KENCANA MENGANGKASA!' : '🪁 LAYANG-LAYANG NAGA TERBENTANG!',
      message:
        targetMode === 'garuda'
          ? 'Tekan [Spasi] untuk kepakan naik, [Shift/Sprint] untuk menukik cepat, atau [C] untuk mendarat.'
          : 'Meluncur mengikuti arus angin! Lewati kawah atau dataran tinggi untuk terangkat arus termal.',
      priority: 'HIGH',
      colorTheme: targetMode === 'garuda' ? 'amber' : 'sky',
      durationMs: 3800,
    });

    return this.flightMode;
  }

  public static dismountFlight(audio?: SoundSynthesizer): void {
    if (this.flightMode === 'none') return;
    const prev = this.flightMode;
    this.flightMode = 'none';
    this.inThermalUpdraft = false;
    this.isDiving = false;
    this.bankRollAngle = 0;

    if (this.garudaMeshGroup) this.garudaMeshGroup.visible = false;
    if (this.gliderMeshGroup) this.gliderMeshGroup.visible = false;

    audio?.playFootstep('grass');
    NotificationManager.push({
      title: prev === 'garuda' ? '🦅 Garuda Kencana Mendarat' : '🪁 Layang-Layang Naga Dilipat',
      message: 'Anda kembali berpijak di daratan.',
      priority: 'NORMAL',
      colorTheme: 'emerald',
      durationMs: 2200,
    });
  }

  /**
   * Trigger manual wing-flap ascent (from HUD button or Jump key)
   */
  public static triggerAscentBoost(playerVel: THREE.Vector3, audio?: SoundSynthesizer, particles?: ParticleManager, playerPos?: THREE.Vector3): void {
    if (this.flightMode === 'none') return;
    playerVel.y = this.flightMode === 'garuda' ? 12.5 : 8.5;
    this.wingFlapCooldown = 0.45;
    audio?.playGamelanSaron(5);
    if (particles && playerPos) {
      particles.emitBlockBreak(playerPos.clone(), '#fbbf24', 'crystal');
    }
  }

  public static triggerVillageSiege(
    world: VoxelWorld,
    entities: EntityManager,
    playerPos: THREE.Vector3,
    audio?: SoundSynthesizer,
    particles?: ParticleManager,
    _addItemCallback?: (itemId: string, count: number) => void,
    addXpCallback?: (xp: number) => void
  ): void {
    this.startVillageSiege(world, entities, playerPos, audio, particles);
    if (addXpCallback) {
      addXpCallback(35);
    }
  }

  public static releaseSkyLanterns(
    playerPos: THREE.Vector3,
    count: number = 6,
    audio?: SoundSynthesizer,
    particles?: ParticleManager,
    stats?: any
  ): void {
    this.getOrCreateRootGroup();
    this.festivalActive = true;
    this.festivalTimer = Math.max(this.festivalTimer, 65);
    for (let i = 0; i < count; i++) {
      this.spawnSingleLantern(playerPos);
    }
    if (stats && typeof stats.addXP === 'function') {
      stats.addXP(25);
    }
    WorldStabilitySystem.modifyStability(10, 'Pelepasan Lampion Harapan Nusantara');
    audio?.playGamelanSaron(3);
    if (particles) {
      particles.emitBlockBreak(playerPos.clone().add(new THREE.Vector3(0, 1.5, 0)), '#fbbf24', 'crystal');
    }
    NotificationManager.push({
      title: `🏮 ${count} Lampion Terbang Dilepaskan!`,
      message: 'Cahaya Lampion Harapan membubung ke langit malam membawa berkah ketenteraman.',
      priority: 'HIGH',
      colorTheme: 'amber',
      durationMs: 3200,
    });
  }

  /**
   * Starts or toggles the Village Blood Moon Siege Defense Event
   */
  public static startVillageSiege(
    world: VoxelWorld,
    entities: EntityManager,
    playerPos: THREE.Vector3,
    audio?: SoundSynthesizer,
    particles?: ParticleManager
  ): void {
    this.getOrCreateRootGroup();
    this.siegeActive = true;
    this.siegeWave = 1;
    this.villageIntegrity = 100;
    this.siegeSpawnedIds.clear();

    this.spawnSiegeWave(1, world, entities, playerPos, audio, particles);

    audio?.playAncientGong();
    NotificationManager.push({
      title: '🛡️ SIAGA PERTAHANAN DESA DIMULAI!',
      message: 'Gelombang I Penyerbu Malam Bulan Darah mendekat! Lindungi desa bersama prajurit untuk memicu Festival Lampion!',
      priority: 'CRITICAL',
      colorTheme: 'rose',
      durationMs: 4800,
    });
  }

  private static spawnSiegeWave(
    wave: number,
    world: VoxelWorld,
    entities: EntityManager,
    playerPos: THREE.Vector3,
    audio?: SoundSynthesizer,
    particles?: ParticleManager
  ): void {
    this.siegeSpawnedIds.clear();
    const count = 2 + wave;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dist = 12 + Math.random() * 6;
      const sx = Math.floor(playerPos.x + Math.cos(angle) * dist);
      const sz = Math.floor(playerPos.z + Math.sin(angle) * dist);
      const sy = world.getSpawnHeight(sx, sz) + 1;

      const id = `siege_raider_w${wave}_${Date.now()}_${i}`;
      const isElite = wave === 3 && i === 0;
      entities.spawnEntity({
        id,
        type: 'hostile',
        name: isElite ? 'Penyerbu Korupsi Elit' : `Penyerbu Bulan Darah (Gelombang ${wave})`,
        position: [sx, sy, sz],
        velocity: [0, 0, 0],
        rotation: 0,
        health: isElite ? 150 : 80,
        maxHealth: isElite ? 150 : 80,
        damage: isElite ? 22 : 14,
        speed: isElite ? 3.2 : 2.8,
        aiState: 'chase',
        modelType: isElite ? 'leak_wraith' : 'shadow_wolf',
        drops: [{ itemId: 'aether_crystal', count: [1, 3], chance: 0.85 }],
      });
      this.siegeSpawnedIds.add(id);
      if (particles) {
        particles.emitBlockBreak(new THREE.Vector3(sx, sy, sz), '#ef4444', 'crystal');
      }
    }
    audio?.playTitanRoar();
  }

  /**
   * Launches the 3D Sky Lantern Festival (Festival Lampion Terbang Nusantara)
   */
  public static startSkyLanternFestival(
    playerPos: THREE.Vector3,
    audio?: SoundSynthesizer,
    particles?: ParticleManager,
    onReward?: () => void
  ): void {
    this.getOrCreateRootGroup();
    this.siegeActive = false;
    this.siegeSpawnedIds.clear();
    this.festivalActive = true;
    this.festivalTimer = 95; // 95 seconds of floating 3D sky lanterns

    // Spawn an immediate burst of 18 3D floating sky lanterns around the village
    for (let i = 0; i < 18; i++) {
      this.spawnSingleLantern(playerPos);
    }

    WorldStabilitySystem.modifyStability(25, 'Perayaan Festival Lampion Terbang Nusantara');
    audio?.playAncientGong();
    audio?.playGamelanSaron(2);
    if (particles) {
      particles.emitBlockBreak(playerPos.clone().add(new THREE.Vector3(0, 2, 0)), '#fbbf24', 'crystal');
    }

    if (onReward) {
      onReward();
    }

    NotificationManager.push({
      title: '🏮 FESTIVAL LAMPION TERBANG NUSANTARA!',
      message: 'Desa berhasil dipertahankan! Puluhan Lampion Harapan 3D melayang ke angkasa membawa berkah & hadiah Mustika!',
      priority: 'CRITICAL',
      colorTheme: 'amber',
      durationMs: 5500,
    });
  }

  public static spawnSingleLantern(centerPos: THREE.Vector3): void {
    this.getOrCreateRootGroup();
    if (!this.lanternContainer) return;

    const lanternGroup = new THREE.Group();
    const paperMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.9,
      roughness: 0.4,
      transparent: true,
      opacity: 0.92,
    });
    const flameCoreMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.8,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.68, 0.48), paperMat);
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.25, 0.22), flameCoreMat);
    core.position.set(0, -0.1, 0);
    const rim = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.08, 0.52), rimMat);
    rim.position.set(0, -0.34, 0);

    lanternGroup.add(body, core, rim);

    const angle = Math.random() * Math.PI * 2;
    const radius = 3.5 + Math.random() * 24;
    lanternGroup.position.set(
      centerPos.x + Math.cos(angle) * radius,
      centerPos.y + 1.5 + Math.random() * 6.0,
      centerPos.z + Math.sin(angle) * radius
    );

    this.lanternContainer.add(lanternGroup);
    this.lanterns.push({
      mesh: lanternGroup,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 0.4, 1.35 + Math.random() * 0.9, (Math.random() - 0.5) * 0.4),
      swayPhase: Math.random() * Math.PI * 2,
      life: 0,
      maxLife: 28 + Math.random() * 18,
    });
  }

  /**
   * Main per-frame update for Aerial Flight, Thermal Updrafts, Village Siege, and 3D Sky Lanterns
   */
  public static update(
    dt: number,
    world: VoxelWorld,
    entities: EntityManager | undefined,
    player: {
      position: THREE.Vector3;
      velocity: THREE.Vector3;
      yaw: number;
      keys: { forward: boolean; backward: boolean; left: boolean; right: boolean; jump: boolean; sprint: boolean; crouch: boolean };
    },
    particles?: ParticleManager,
    audio?: SoundSynthesizer,
    stats?: any,
    addItemCallback?: (itemId: string, count: number) => void
  ): void {
    this.getOrCreateRootGroup();
    const playerPos = player.position;
    const playerVel = player.velocity;
    const playerYaw = player.yaw;
    const keys = player.keys;
    const onSiegeVictoryReward = () => {
      if (addItemCallback) {
        addItemCallback('mustika_bintang_jatuh', 1);
        addItemCallback('lampion_terbang_nusantara', 4);
      }
      if (stats && typeof stats.addXP === 'function') {
        stats.addXP(120);
      }
    };

    // 1. Update Aerial Flight Mode (Garuda Kencana 3D or Dragon Kite Glider)
    if (this.flightMode !== 'none') {
      if (this.pendingTakeoffBoostY > 0) {
        playerVel.y = Math.max(playerVel.y, this.pendingTakeoffBoostY);
        this.pendingTakeoffBoostY = 0;
      }
      this.wingFlapCooldown = Math.max(0, this.wingFlapCooldown - dt);
      this.wingAnimPhase += dt * (keys.jump ? 11.0 : this.flightMode === 'garuda' ? 6.5 : 3.5);

      // Check for thermal updrafts beneath player (Lava, Magma, Torches, or high ridges > Y=74)
      let foundThermal = playerPos.y > 76;
      const bx = Math.floor(playerPos.x);
      const bz = Math.floor(playerPos.z);
      const by = Math.floor(playerPos.y);
      for (let scanY = by - 1; scanY >= Math.max(2, by - 12); scanY--) {
        const b = world.getBlock(bx, scanY, bz);
        if (
          b === BlockType.LAVA ||
          b === BlockType.MAGMA_ROCK ||
          b === BlockType.TORCH ||
          b === BlockType.LANTERN ||
          b === BlockType.AETHER_LANTERN ||
          b === BlockType.AETHER_CORE
        ) {
          foundThermal = true;
          break;
        }
      }
      this.inThermalUpdraft = foundThermal;

      const forwardX = -Math.sin(playerYaw);
      const forwardZ = -Math.cos(playerYaw);
      const targetCruiseSpeed = this.flightMode === 'garuda' ? (keys.sprint ? 16.5 : 11.8) : (keys.sprint ? 13.5 : 9.6);

      if (keys.forward) {
        playerVel.x = THREE.MathUtils.damp(playerVel.x, forwardX * targetCruiseSpeed, 6.5, dt);
        playerVel.z = THREE.MathUtils.damp(playerVel.z, forwardZ * targetCruiseSpeed, 6.5, dt);
      } else if (!keys.backward) {
        // Gentle forward glide momentum
        const glideSpeed = this.flightMode === 'garuda' ? 5.2 : 6.4;
        playerVel.x = THREE.MathUtils.damp(playerVel.x, forwardX * glideSpeed, 3.2, dt);
        playerVel.z = THREE.MathUtils.damp(playerVel.z, forwardZ * glideSpeed, 3.2, dt);
      }

      // Vertical lift & glide physics with ground clearance protection
      const groundHeight = world.getSpawnHeight(bx, bz);
      if (keys.jump) {
        const climbSpeed = this.flightMode === 'garuda' ? 9.2 : 5.5;
        playerVel.y = THREE.MathUtils.damp(playerVel.y, climbSpeed, 8.5, dt);
        this.isDiving = false;
      } else if (keys.sprint && !keys.jump) {
        // Swoop / Dive with automatic terrain pull-up clearance
        this.isDiving = true;
        const targetDiveVel = playerPos.y <= groundHeight + 2.8 ? -1.0 : -9.5;
        playerVel.y = THREE.MathUtils.damp(playerVel.y, targetDiveVel, 5.5, dt);
      } else if (this.inThermalUpdraft) {
        // Thermal updraft automatic lift
        this.isDiving = false;
        const thermalLift = this.flightMode === 'glider' ? 4.8 : 3.2;
        playerVel.y = THREE.MathUtils.damp(playerVel.y, thermalLift, 4.8, dt);
      } else {
        // Smooth low-gravity soaring descent
        this.isDiving = false;
        const sinkRate = this.flightMode === 'garuda' ? -0.65 : -1.45;
        if (playerVel.y < sinkRate) {
          playerVel.y = THREE.MathUtils.damp(playerVel.y, sinkRate, 7.5, dt);
        }
      }

      // Dismount on crouch key
      if (keys.crouch) {
        this.dismountFlight(audio);
      }

      this.currentAirspeed = Math.hypot(playerVel.x, playerVel.z);

      // Bank roll animation based on left/right steering
      const targetBank = keys.left ? 0.28 : keys.right ? -0.28 : 0;
      this.bankRollAngle = THREE.MathUtils.damp(this.bankRollAngle, targetBank, 8.5, dt);

      // Position & animate 3D Garuda or Dragon Kite Glider relative to player
      if (this.garudaMeshGroup && this.flightMode === 'garuda') {
        this.garudaMeshGroup.position.set(playerPos.x, playerPos.y - 0.35, playerPos.z);
        this.garudaMeshGroup.rotation.set(this.isDiving ? 0.25 : -0.08, playerYaw + Math.PI, this.bankRollAngle);
        const flapAngle = Math.sin(this.wingAnimPhase) * 0.52;
        if (this.garudaWingL) this.garudaWingL.rotation.z = flapAngle;
        if (this.garudaWingR) this.garudaWingR.rotation.z = -flapAngle;
      }

      if (this.gliderMeshGroup && this.flightMode === 'glider') {
        this.gliderMeshGroup.position.set(playerPos.x, playerPos.y, playerPos.z);
        this.gliderMeshGroup.rotation.set(this.isDiving ? 0.2 : 0, playerYaw + Math.PI, this.bankRollAngle);
        for (let i = 0; i < this.gliderTailSegments.length; i++) {
          this.gliderTailSegments[i].position.x = Math.sin(this.wingAnimPhase * 1.5 - i * 0.7) * 0.18;
        }
      }

      // Feather / Thermal Wind Trail Particles
      this.particleTimer += dt;
      if (this.particleTimer >= 0.18 && particles) {
        this.particleTimer = 0;
        particles.emitBlockBreak(
          new THREE.Vector3(playerPos.x, playerPos.y - 0.2, playerPos.z),
          this.flightMode === 'garuda' ? '#f59e0b' : '#38bdf8',
          'crystal'
        );
      }
    }

    // 2. Update Village Siege Defense Wave Progression
    if (this.siegeActive && entities) {
      this.siegeCheckTimer += dt;
      if (this.siegeCheckTimer >= 0.5) {
        this.siegeCheckTimer = 0;

        // Prune defeated enemies
        const aliveIds: string[] = [];
        this.siegeSpawnedIds.forEach((id) => {
          const ent = entities.entities.get(id);
          if (ent && ent.state.health > 0 && ent.state.aiState !== 'dead') {
            aliveIds.push(id);
          }
        });
        this.siegeSpawnedIds = new Set(aliveIds);

        if (aliveIds.length > 0) {
          // Slight village integrity pressure while enemies are active
          this.villageIntegrity = Math.max(15, this.villageIntegrity - aliveIds.length * 0.25);
        } else {
          // Wave cleared!
          if (this.siegeWave < this.maxSiegeWaves) {
            this.siegeWave += 1;
            this.spawnSiegeWave(this.siegeWave, world, entities, playerPos, audio, particles);
            NotificationManager.push({
              title: `⚔️ GELOMBANG ${this.siegeWave} MENYERBU!`,
              message: `Gelombang sebelumnya berhasil dipukul mundur! Bersiap menghadapi Gelombang ${this.siegeWave}/${this.maxSiegeWaves}!`,
              priority: 'HIGH',
              colorTheme: 'amber',
              durationMs: 3500,
            });
          } else {
            // All 3 waves defeated -> Launch Sky Lantern Festival!
            this.startSkyLanternFestival(playerPos, audio, particles, onSiegeVictoryReward);
          }
        }
      }
    }

    // 3. Update 3D Sky Lantern Festival Physics & Spawning
    if (this.festivalActive) {
      this.festivalTimer -= dt;
      this.lanternSpawnTimer += dt;
      if (this.lanternSpawnTimer >= 1.2 && this.lanterns.length < 42) {
        this.lanternSpawnTimer = 0;
        this.spawnSingleLantern(playerPos);
      }
      if (this.festivalTimer <= 0) {
        this.festivalActive = false;
      }
    }

    // Update active 3D lanterns rising into the sky
    for (let i = this.lanterns.length - 1; i >= 0; i--) {
      const l = this.lanterns[i];
      l.life += dt;
      l.swayPhase += dt * 1.8;
      l.mesh.position.x += (l.velocity.x + Math.sin(l.swayPhase) * 0.25) * dt;
      l.mesh.position.y += l.velocity.y * dt;
      l.mesh.position.z += (l.velocity.z + Math.cos(l.swayPhase) * 0.25) * dt;
      l.mesh.rotation.y += dt * 0.4;

      if (l.life >= l.maxLife) {
        this.lanternContainer?.remove(l.mesh);
        this.lanterns.splice(i, 1);
      }
    }
  }

  public static getAerialHUDTelemetry(playerPos?: THREE.Vector3): AerialHUDTelemetry {
    const alt = playerPos ? Math.max(0, Math.round(playerPos.y - 62)) : 0;
    return {
      active: this.flightMode !== 'none',
      mode: this.flightMode,
      mountName: this.flightMode === 'garuda' ? 'Garuda Kencana Dirgantara' : 'Layang-Layang Naga Batik',
      altitudeMeters: alt,
      airspeedKnots: Math.round(this.currentAirspeed * 1.94 * 10) / 10,
      inThermalUpdraft: this.inThermalUpdraft,
      isDiving: this.isDiving,
      wingFlapCooldown: this.wingFlapCooldown,
    };
  }

  public static getSiegeAndFestivalTelemetry(): SiegeAndFestivalTelemetry {
    return {
      siegeActive: this.siegeActive,
      wave: this.siegeWave,
      maxWaves: this.maxSiegeWaves,
      enemiesRemaining: this.siegeSpawnedIds.size,
      villageIntegrity: Math.round(this.villageIntegrity),
      festivalActive: this.festivalActive,
      festivalTimeLeft: Math.max(0, Math.round(this.festivalTimer)),
      activeLanternCount: this.lanterns.length,
    };
  }

  public static reset(): void {
    this.flightMode = 'none';
    this.inThermalUpdraft = false;
    this.isDiving = false;
    this.siegeActive = false;
    this.siegeSpawnedIds.clear();
    this.festivalActive = false;
    if (this.lanternContainer) {
      this.lanternContainer.clear();
    }
    this.lanterns = [];
  }
}
