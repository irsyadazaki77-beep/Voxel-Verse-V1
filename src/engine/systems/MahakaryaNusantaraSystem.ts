// VoxelVerse v4.8.0: Ekspansi Mahakarya Nusantara
// 1. Kapal Selam Nanggala Kencana 3D & Ekspedisi Candi Samudra Bawah Laut
// 2. Lokomotif Uap Aether 3D, Jaringan Rel & Otomasi Mesin Bor Tambang
// 3. Ansambel Gamelan & Angklung 3D Interaktif Berkah (Pelog & Slendro)
// 4. Turnamen Arena Pendekar, Companion Khodam 3D & Bos Raja Kala Samudra
// 5. Sistem Cuaca Ekstrem, Erupsi Vulkanik Merapi & Jatuhan Kristal Lahar
// 6. Mode Foto Sinematik 3D (Free-Cam) & Kustomisasi Jubah Batik / Kostum Prajurit Nusantara

import * as THREE from 'three';
import { BlockType } from '../../types';
import { VoxelWorld } from '../world/VoxelWorld';
import { EntityManager } from '../entities/EntityManager';
import { ParticleManager } from '../environment/ParticleManager';
import { SoundSynthesizer } from '../audio/SoundSynthesizer';
import { NotificationManager } from '../ui/NotificationManager';
import { PlayerController } from '../player/PlayerController';
import { PlayerStats } from '../player/PlayerStats';
import { BlockPlacementEngine } from '../world/BlockPlacementEngine';
import { MapManager } from '../map/MapManager';
import { SkyEnvironment } from '../environment/SkyEnvironment';
import { WeatherSystem } from '../environment/WeatherSystem';

export type KhodamCompanionId = 'MACAN_PUTIH' | 'GARUDA_API' | 'NAGA_TIRTA';
export type NusantaraWardrobeId = 'BATIK_PARANG_KENCANA' | 'ZIRAH_SENOPATI_MAJAPAHIT' | 'JUBAH_PENDEKAR_SILIWANGI' | 'BUSANA_RAJA_SAMUDRA';
export type ExtremeWeatherEventId = 'CLEAR' | 'VOLCANIC_ERUPTION' | 'EQUATORIAL_THUNDERSTORM' | 'MYSTIC_CALDERA_MIST';
export type PhotoFrameStyleId = 'NONE' | 'UKIRAN_MAJAPAHIT' | 'WAYANG_KLASIK' | 'SINEMA_21_9';

export interface KhodamDef {
  id: KhodamCompanionId;
  name: string;
  subtitle: string;
  primaryColor: number;
  accentColor: number;
  passiveBonusText: string;
  attackDamage: number;
}

export interface WardrobeOutfitDef {
  id: NusantaraWardrobeId;
  name: string;
  originRegion: string;
  bonusSummary: string;
  capeColor: number;
  trimColor: number;
  crownColor: number;
  armorBonus: number;
  speedMultiplier: number;
  critBonus: number;
}

export const KHODAM_COMPANIONS: Record<KhodamCompanionId, KhodamDef> = {
  MACAN_PUTIH: {
    id: 'MACAN_PUTIH',
    name: 'Khodam Macan Putih Siliwangi',
    subtitle: 'Cakar Kilat Prabu · +20% Kritikal & Serangan Pendamping',
    primaryColor: 0xf8fafc,
    accentColor: 0x38bdf8,
    passiveBonusText: '+20% Peluang Kritikal · Cakar Roh 38 DMG tiap 2.2d',
    attackDamage: 38,
  },
  GARUDA_API: {
    id: 'GARUDA_API',
    name: 'Khodam Garuda Api Merapi',
    subtitle: 'Sayap Surya Bara · +25% Daya Tebas & Semburan Api',
    primaryColor: 0xf59e0b,
    accentColor: 0xef4444,
    passiveBonusText: '+25% Daya Serang · Bola Api Surya 44 DMG tiap 2.2d',
    attackDamage: 44,
  },
  NAGA_TIRTA: {
    id: 'NAGA_TIRTA',
    name: 'Khodam Naga Tirta Samudra',
    subtitle: 'Perisai Air Suci · Regenerasi +4 HP/d & Semburan Es',
    primaryColor: 0x06b6d4,
    accentColor: 0x10b981,
    passiveBonusText: '+4 HP/detik & +30 Pertahanan · Tombak Tirta 34 DMG',
    attackDamage: 34,
  },
};

export const NUSANTARA_WARDROBE_OUTFITS: Record<NusantaraWardrobeId, WardrobeOutfitDef> = {
  BATIK_PARANG_KENCANA: {
    id: 'BATIK_PARANG_KENCANA',
    name: 'Jubah Batik Parang Kencana',
    originRegion: 'Keraton Mataram & Jawa',
    bonusSummary: '+15 Pertahanan · +12% Kecepatan Gerak · Wibawa Bangsawan',
    capeColor: 0x78350f,
    trimColor: 0xf59e0b,
    crownColor: 0xfbbf24,
    armorBonus: 15,
    speedMultiplier: 1.12,
    critBonus: 0.08,
  },
  ZIRAH_SENOPATI_MAJAPAHIT: {
    id: 'ZIRAH_SENOPATI_MAJAPAHIT',
    name: 'Zirah Agung Senopati Majapahit',
    originRegion: 'Trowulan Majapahit',
    bonusSummary: '+35 Pertahanan · +25% Ketahanan Poise · Perisai Surya',
    capeColor: 0x991b1b,
    trimColor: 0xfbbf24,
    crownColor: 0xf59e0b,
    armorBonus: 35,
    speedMultiplier: 1.05,
    critBonus: 0.12,
  },
  JUBAH_PENDEKAR_SILIWANGI: {
    id: 'JUBAH_PENDEKAR_SILIWANGI',
    name: 'Pangsi & Jubah Pendekar Siliwangi',
    originRegion: 'Tatar Sunda & Pajajaran',
    bonusSummary: '+20% Kecepatan Tebas & Lari · +22% Kritikal Silat',
    capeColor: 0x0f172a,
    trimColor: 0x10b981,
    crownColor: 0x38bdf8,
    armorBonus: 20,
    speedMultiplier: 1.2,
    critBonus: 0.22,
  },
  BUSANA_RAJA_SAMUDRA: {
    id: 'BUSANA_RAJA_SAMUDRA',
    name: 'Busana Agung Penguasa Samudra',
    originRegion: 'Kesultanan Bahari Nusantara',
    bonusSummary: 'Napas Air Tak Terbatas · +25 Pertahanan · Berkah Mutiara',
    capeColor: 0x0e7490,
    trimColor: 0x22d3ee,
    crownColor: 0x38bdf8,
    armorBonus: 25,
    speedMultiplier: 1.15,
    critBonus: 0.15,
  },
};

export interface MahakaryaTelemetryState {
  // 1. Submarine & Ocean Candi
  submarineActive: boolean;
  submarineDepth: number;
  submarineSonarDist: number;
  oceanCandiBuilt: boolean;
  oceanCandiPos: [number, number, number] | null;
  // 2. Locomotive & Auto Quarry
  locomotiveActive: boolean;
  locomotiveRiding: boolean;
  locomotiveSpeed: number;
  quarryCount: number;
  quarryTotalMined: number;
  // 3. Gamelan & Angklung 3D Studio
  gamelanStageBuilt: boolean;
  gamelanScale: 'PELOG' | 'SLENDRO';
  gamelanAutoSong: string | null;
  gamelanBlessingTimer: number;
  // 4. Khodam & Pendekar Tournament Arena
  activeKhodamId: KhodamCompanionId | null;
  activeKhodamName: string | null;
  arenaActive: boolean;
  arenaWave: number;
  arenaMaxWaves: number;
  // 5. Extreme Weather & Volcanic Eruption
  weatherEventId: ExtremeWeatherEventId;
  weatherEventName: string;
  weatherEventTimer: number;
  // 6. Wardrobe & Photo Mode
  activeWardrobeId: NusantaraWardrobeId;
  activeWardrobeName: string;
  photoModeActive: boolean;
  photoFov: number;
  photoFrame: PhotoFrameStyleId;
}

// Pre-allocated reusable vectors (Zero-GC in animation loop)
const _tmpVecA = new THREE.Vector3();
const _tmpVecB = new THREE.Vector3();
const _tmpForward = new THREE.Vector3();
const _tmpRight = new THREE.Vector3();

export class MahakaryaNusantaraSystem {
  public static rootGroup: THREE.Group | null = null;

  // 1. Submarine State
  public static submarineActive: boolean = false;
  public static submarineMesh: THREE.Group | null = null;
  public static submarinePropeller: THREE.Object3D | null = null;
  public static submarineSpotLight: THREE.PointLight | null = null;
  public static oceanCandiBuilt: boolean = false;
  public static oceanCandiPos: [number, number, number] | null = null;

  // 2. Steam Locomotive & Quarry State
  public static locomotiveActive: boolean = false;
  public static locomotiveRiding: boolean = false;
  public static locomotiveMesh: THREE.Group | null = null;
  public static locomotiveWheels: THREE.Object3D[] = [];
  public static locomotiveOrigin: THREE.Vector3 = new THREE.Vector3();
  public static locomotiveAngle: number = 0;
  public static locomotiveTrackRadius: number = 9;
  public static quarryRigs: {
    pos: THREE.Vector3;
    group: THREE.Group;
    drillHead: THREE.Object3D;
    timer: number;
  }[] = [];
  public static quarryTotalMined: number = 0;

  // 3. Gamelan & Angklung 3D Studio State
  public static gamelanStageBuilt: boolean = false;
  public static gamelanGroup: THREE.Group | null = null;
  public static gamelanBars: THREE.Object3D[] = [];
  public static angklungRacks: THREE.Object3D[] = [];
  public static gongMesh: THREE.Object3D | null = null;
  public static gamelanScale: 'PELOG' | 'SLENDRO' = 'PELOG';
  public static gamelanAutoSong: string | null = null;
  public static gamelanSongStep: number = 0;
  public static gamelanSongTimer: number = 0;
  public static gamelanBlessingTimer: number = 0;

  // 4. Companion Khodam & Tournament Arena State
  public static activeKhodamId: KhodamCompanionId | null = 'MACAN_PUTIH';
  public static khodamMesh: THREE.Group | null = null;
  public static khodamAttackTimer: number = 0;
  public static khodamOrbitAngle: number = 0;
  public static arenaActive: boolean = false;
  public static arenaWave: number = 0;
  public static arenaMaxWaves: number = 3;
  public static arenaCenter: THREE.Vector3 = new THREE.Vector3();
  public static arenaSpawnedIds: Set<string> = new Set();

  // 5. Extreme Weather & Volcanic Eruption State
  public static weatherEventId: ExtremeWeatherEventId = 'CLEAR';
  public static weatherEventTimer: number = 0;
  public static volcanicMeteorTimer: number = 0;
  public static activeVolcanicBombs: {
    mesh: THREE.Group;
    velocity: THREE.Vector3;
    life: number;
  }[] = [];

  // 6. Wardrobe & 3D Free-Cam Photo Mode State
  public static activeWardrobeId: NusantaraWardrobeId = 'BATIK_PARANG_KENCANA';
  public static wardrobeOrnamentGroup: THREE.Group | null = null;
  public static photoModeActive: boolean = false;
  public static photoCamPos: THREE.Vector3 = new THREE.Vector3();
  public static photoCamTargetPos: THREE.Vector3 = new THREE.Vector3();
  public static photoCamYaw: number = 0;
  public static photoCamPitch: number = 0;
  public static photoFov: number = 68;
  public static photoFrame: PhotoFrameStyleId = 'UKIRAN_MAJAPAHIT';
  public static freezeWorldInPhotoMode: boolean = false;

  private static elapsedTime: number = 0;

  public static getOrCreateRootGroup(): THREE.Group {
    if (!this.rootGroup) {
      this.rootGroup = new THREE.Group();
      this.rootGroup.name = 'MahakaryaNusantaraV48Root';
    }
    return this.rootGroup;
  }

  // ============================================================================
  // 1. KAPAL SELAM NANGGALA KENCANA 3D & CANDI SAMUDRA BAWAH LAUT
  // ============================================================================
  private static buildSubmarineMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'KapalSelamNanggala3D';

    const hullMat = new THREE.MeshStandardMaterial({
      color: 0x0e7490,
      metalness: 0.72,
      roughness: 0.25,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.88,
      roughness: 0.18,
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.8,
      roughness: 0.35,
    });
    const domeGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.42,
      roughness: 0.08,
      metalness: 0.1,
      clearcoat: 1.0,
      depthWrite: false,
    });
    const lampGlowMat = new THREE.MeshStandardMaterial({
      color: 0xa5f3fc,
      emissive: 0x22d3ee,
      emissiveIntensity: 2.2,
      roughness: 0.1,
    });

    // Part 1: Main Cylindrical Pressure Hull
    const mainHull = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 3.6, 16), hullMat);
    mainHull.rotation.x = Math.PI / 2;
    mainHull.position.set(0, 0.95, 0);
    group.add(mainHull);

    // Part 2: Forward Observation Acrylic Dome
    const frontDome = new THREE.Mesh(new THREE.SphereGeometry(0.92, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), domeGlassMat);
    frontDome.rotation.x = Math.PI / 2;
    frontDome.position.set(0, 0.95, 1.8);
    frontDome.renderOrder = 2;
    group.add(frontDome);

    // Part 3: Rear Tapered Tail Cone
    const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.94, 1.4, 16), hullMat);
    tailCone.rotation.x = -Math.PI / 2;
    tailCone.position.set(0, 0.95, -2.5);
    group.add(tailCone);

    // Part 4 & 5: Starboard & Port Ballast Pontoons
    const pontoonGeo = new THREE.CylinderGeometry(0.32, 0.32, 3.2, 12);
    const leftPontoon = new THREE.Mesh(pontoonGeo, darkSteelMat);
    leftPontoon.rotation.x = Math.PI / 2;
    leftPontoon.position.set(-1.05, 0.55, -0.1);
    group.add(leftPontoon);

    const rightPontoon = new THREE.Mesh(pontoonGeo, darkSteelMat);
    rightPontoon.rotation.x = Math.PI / 2;
    rightPontoon.position.set(1.05, 0.55, -0.1);
    group.add(rightPontoon);

    // Part 6: Brass Conning Tower (Sail) & Gold Majapahit Rings
    const conningTower = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 1.2), brassMat);
    conningTower.position.set(0, 2.05, 0.15);
    group.add(conningTower);

    const ringGeo = new THREE.TorusGeometry(0.97, 0.06, 8, 20);
    const frontRing = new THREE.Mesh(ringGeo, brassMat);
    frontRing.position.set(0, 0.95, 1.2);
    group.add(frontRing);

    const rearRing = new THREE.Mesh(ringGeo, brassMat);
    rearRing.position.set(0, 0.95, -1.2);
    group.add(rearRing);

    // Part 7: Brass Periscope Mast
    const periscope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.75, 8), brassMat);
    periscope.position.set(0, 2.75, 0.35);
    group.add(periscope);

    // Part 8 & 9: Twin Deep-Sea Spotlights
    const leftLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.25, 10), lampGlowMat);
    leftLamp.rotation.x = Math.PI / 2;
    leftLamp.position.set(-0.68, 0.85, 1.85);
    group.add(leftLamp);

    const rightLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.25, 10), lampGlowMat);
    rightLamp.rotation.x = Math.PI / 2;
    rightLamp.position.set(0.68, 0.85, 1.85);
    group.add(rightLamp);

    // Part 10: Spinning 4-Blade Brass Propeller Assembly
    const propGroup = new THREE.Group();
    propGroup.position.set(0, 0.95, -3.28);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.25, 10), brassMat);
    hub.rotation.x = Math.PI / 2;
    propGroup.add(hub);

    const bladeGeo = new THREE.BoxGeometry(0.85, 0.14, 0.04);
    const blade1 = new THREE.Mesh(bladeGeo, brassMat);
    const blade2 = new THREE.Mesh(bladeGeo, brassMat);
    blade2.rotation.z = Math.PI / 2;
    propGroup.add(blade1, blade2);
    group.add(propGroup);
    this.submarinePropeller = propGroup;

    // Underwater PointLight
    const subLight = new THREE.PointLight(0x22d3ee, 2.4, 34);
    subLight.position.set(0, 1.1, 2.6);
    group.add(subLight);
    this.submarineSpotLight = subLight;

    return group;
  }

  public static toggleSubmarine(
    player: PlayerController,
    audio?: SoundSynthesizer,
    particles?: ParticleManager
  ): boolean {
    const root = this.getOrCreateRootGroup();
    if (this.submarineActive) {
      this.submarineActive = false;
      if (this.submarineMesh) {
        this.submarineMesh.visible = false;
      }
      audio?.playBlockPlace();
      NotificationManager.push({
        title: '⚓ Keluar dari Kapal Selam Nanggala',
        message: 'Kapal selam disimpan kembali ke dermaga pusaka.',
        priority: 'NORMAL',
        colorTheme: 'sky',
        durationMs: 2600,
      });
      return false;
    }

    if (!this.submarineMesh) {
      this.submarineMesh = this.buildSubmarineMesh();
      root.add(this.submarineMesh);
    }
    this.submarineMesh.visible = true;
    this.submarineMesh.position.copy(player.position);
    this.submarineMesh.rotation.y = player.yaw;
    this.submarineActive = true;

    audio?.playSubmarineSonarPing();
    particles?.spawnWaterSplash(player.position.clone());
    NotificationManager.push({
      title: '🌊 Kapal Selam Nanggala Kencana 3D Aktif!',
      message: 'Oksigen bertekanan 100% aman! Gunakan [W/A/S/D] berlayar, [Spasi] Naik, [Shift] Selam Dalam.',
      priority: 'HIGH',
      colorTheme: 'sky',
      durationMs: 4200,
    });
    return true;
  }

  public static buildUnderwaterOceanCandi(
    world: VoxelWorld,
    entities: EntityManager,
    player: PlayerController,
    audio?: SoundSynthesizer,
    particles?: ParticleManager,
    stats?: PlayerStats,
    onAddItem?: (itemId: string, count: number) => void
  ): void {
    const fwd = player.getForwardVector();
    const cx = Math.floor(player.position.x + fwd.x * 12);
    const cz = Math.floor(player.position.z + fwd.z * 12);
    const baseSurfY = world.getSpawnHeight(cx, cz);
    const candiFloorY = Math.max(14, baseSurfY - 6);

    // Carve water-filled sunken sanctum basin & stepped Candi Samudra pyramid
    for (let dx = -7; dx <= 7; dx++) {
      for (let dz = -7; dz <= 7; dz++) {
        const dist = Math.max(Math.abs(dx), Math.abs(dz));
        // Floor platform
        world.setBlock(cx + dx, candiFloorY, cz + dz, BlockType.ANDESITE_CANDI_STONE);

        // Fill basin with water up to surface so player can dive in submarine
        for (let y = candiFloorY + 1; y <= baseSurfY + 1; y++) {
          if (dist === 7 && y <= candiFloorY + 4) {
            world.setBlock(cx + dx, y, cz + dz, BlockType.MOSSY_CANDI_STONE);
          } else {
            world.setBlock(cx + dx, y, cz + dz, BlockType.WATER);
          }
        }

        // Stepped inner Candi shrine
        if (dist <= 4 && dist >= 3) {
          world.setBlock(cx + dx, candiFloorY + 1, cz + dz, BlockType.CARVED_CANDI_RELIEF);
        }
        // Corner glowing sea crystal pillars
        if (Math.abs(dx) === 5 && Math.abs(dz) === 5) {
          for (let py = 1; py <= 5; py++) {
            world.setBlock(cx + dx, candiFloorY + py, cz + dz, BlockType.PRISMATIC_CRYSTAL);
          }
        }
      }
    }

    // Center Altar & Giant Clam Pearl Chest
    world.setBlock(cx, candiFloorY + 1, cz, BlockType.ANCIENT_ALTAR);
    world.setBlock(cx + 1, candiFloorY + 1, cz, BlockType.CHEST);
    BlockPlacementEngine.initializeEmptyContainer([cx + 1, candiFloorY + 1, cz]);

    this.oceanCandiBuilt = true;
    this.oceanCandiPos = [cx, candiFloorY + 2, cz];

    // Register Landmark on World Map for Fast Travel!
    MapManager.addWaypoint('Candi Samudra Selatan', [cx, candiFloorY + 3, cz], '#06b6d4');

    // Spawn Abyssal Guardian Boss (Raja Kala Samudra)
    entities.spawnBoss('batara_kala_colossus', [cx, candiFloorY + 2, cz - 3], world);

    if (onAddItem) {
      onAddItem('mutiara_candi_samudra', 4);
      onAddItem('coastal_pearl', 3);
    }
    stats?.addXP(220);
    audio?.playSubmarineSonarPing();
    audio?.playAncientGong();
    particles?.spawnWaterSplash(new THREE.Vector3(cx, baseSurfY + 1, cz));

    NotificationManager.push({
      title: '🏛️ Candi Samudra Selatan Terungkap!',
      message: 'Kuil bawah laut purba telah terbuka! Memperoleh 4x Mutiara Agung Candi Samudra (+220 XP) & Waypoint Peta.',
      priority: 'CRITICAL',
      colorTheme: 'sky',
      durationMs: 5000,
    });
  }

  // ============================================================================
  // 2. KERETA UAP AETHER 3D, JARINGAN REL & OTOMASI MESIN BOR TAMBANG
  // ============================================================================
  private static buildSteamLocomotiveMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'LokomotifUapAether3D';

    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.82,
      roughness: 0.28,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.16,
    });
    const crimsonWoodMat = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      metalness: 0.15,
      roughness: 0.65,
    });
    const aetherCoreMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.8,
      roughness: 0.15,
    });

    // Part 1: Main Undercarriage Frame
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 3.8), ironMat);
    chassis.position.set(0, 0.55, 0);
    group.add(chassis);

    // Part 2: Horizontal Cylindrical Steam Boiler
    const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 2.3, 16), ironMat);
    boiler.rotation.x = Math.PI / 2;
    boiler.position.set(0, 1.22, 0.45);
    group.add(boiler);

    // Part 3: Brass Boiler Rings & Aether Core Headlamp
    const band1 = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.04, 8, 18), brassMat);
    band1.position.set(0, 1.22, 0.9);
    group.add(band1);

    const band2 = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.04, 8, 18), brassMat);
    band2.position.set(0, 1.22, 0.0);
    group.add(band2);

    const headlamp = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 12), aetherCoreMat);
    headlamp.rotation.x = Math.PI / 2;
    headlamp.position.set(0, 1.25, 1.65);
    group.add(headlamp);

    // Part 4: Smokestack Chimney & Steam Dome
    const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.85, 12), ironMat);
    chimney.position.set(0, 2.05, 1.15);
    group.add(chimney);

    const steamDome = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), brassMat);
    steamDome.position.set(0, 1.82, 0.35);
    group.add(steamDome);

    // Part 5: Engineer Cab (Teak & Crimson Majapahit Roof)
    const cabBody = new THREE.Mesh(new THREE.BoxGeometry(1.46, 1.25, 1.25), crimsonWoodMat);
    cabBody.position.set(0, 1.35, -1.15);
    group.add(cabBody);

    const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(1.64, 0.16, 1.45), brassMat);
    cabRoof.position.set(0, 2.05, -1.15);
    group.add(cabRoof);

    // Part 6: Front Cowcatcher Plow
    const plow = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.65, 4), brassMat);
    plow.rotation.x = Math.PI / 2;
    plow.rotation.y = Math.PI / 4;
    plow.position.set(0, 0.45, 2.1);
    group.add(plow);

    // Part 7–10: 4 Spoked Brass Driving Wheels
    this.locomotiveWheels = [];
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.16, 14);
    const wheelPositions: [number, number, number][] = [
      [-0.82, 0.42, 0.95],
      [0.82, 0.42, 0.95],
      [-0.82, 0.42, -0.85],
      [0.82, 0.42, -0.85],
    ];
    for (const [wx, wy, wz] of wheelPositions) {
      const wheel = new THREE.Mesh(wheelGeo, brassMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      group.add(wheel);
      this.locomotiveWheels.push(wheel);
    }

    return group;
  }

  private static buildQuarryDrillMesh(): { group: THREE.Group; drillHead: THREE.Object3D } {
    const group = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.78,
      roughness: 0.3,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.2,
    });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });

    // 4 Corner Support Pylons
    const pylonGeo = new THREE.BoxGeometry(0.22, 2.8, 0.22);
    const offsets = [
      [-0.95, 1.4, -0.95],
      [0.95, 1.4, -0.95],
      [-0.95, 1.4, 0.95],
      [0.95, 1.4, 0.95],
    ];
    for (const [ox, oy, oz] of offsets) {
      const p = new THREE.Mesh(pylonGeo, frameMat);
      p.position.set(ox, oy, oz);
      group.add(p);
    }

    // Top Gear Housing & Aether Generator Core
    const topDeck = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 2.2), brassMat);
    topDeck.position.set(0, 2.85, 0);
    group.add(topDeck);

    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), crystalMat);
    core.position.set(0, 3.4, 0);
    group.add(core);

    // Rotating Spiral Drill Head Assembly
    const drillGroup = new THREE.Group();
    drillGroup.position.set(0, 1.35, 0);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.2, 10), frameMat);
    const bitCone = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.1, 8), brassMat);
    bitCone.rotation.x = Math.PI;
    bitCone.position.set(0, -0.85, 0);
    drillGroup.add(shaft, bitCone);
    group.add(drillGroup);

    return { group, drillHead: drillGroup };
  }

  public static deployLocomotiveAndQuarry(
    world: VoxelWorld,
    player: PlayerController,
    audio?: SoundSynthesizer,
    particles?: ParticleManager
  ): void {
    const root = this.getOrCreateRootGroup();
    const fwd = player.getForwardVector();
    const centerX = Math.floor(player.position.x + fwd.x * 10);
    const centerZ = Math.floor(player.position.z + fwd.z * 10);
    const baseY = world.getSpawnHeight(centerX, centerZ);

    // 1. Lay circular Aether Rail loop around centerX, centerZ
    const R = this.locomotiveTrackRadius;
    for (let deg = 0; deg < 360; deg += 6) {
      const rad = (deg * Math.PI) / 180;
      const rx = Math.round(centerX + Math.cos(rad) * R);
      const rz = Math.round(centerZ + Math.sin(rad) * R);
      world.setBlock(rx, baseY, rz, BlockType.ANDESITE_CANDI_STONE);
      world.setBlock(rx, baseY + 1, rz, BlockType.AETHER_RAIL);
    }

    // 2. Spawn or reposition 3D Steam Locomotive
    if (!this.locomotiveMesh) {
      this.locomotiveMesh = this.buildSteamLocomotiveMesh();
      root.add(this.locomotiveMesh);
    }
    this.locomotiveOrigin.set(centerX, baseY + 1.05, centerZ);
    this.locomotiveAngle = 0;
    this.locomotiveActive = true;
    this.locomotiveMesh.visible = true;

    // 3. Deploy Automated 3D Quarry Drill at the center of the rail loop
    const { group: quarryGroup, drillHead } = this.buildQuarryDrillMesh();
    quarryGroup.position.set(centerX + 0.5, baseY + 1, centerZ + 0.5);
    root.add(quarryGroup);
    this.quarryRigs.push({
      pos: new THREE.Vector3(centerX + 0.5, baseY + 1, centerZ + 0.5),
      group: quarryGroup,
      drillHead,
      timer: 0,
    });

    MapManager.addWaypoint('Stasiun Lokomotif & Tambang Aether', [centerX, baseY + 2, centerZ], '#f59e0b');
    audio?.playLocomotiveWhistle();
    particles?.emitBlockBreak(new THREE.Vector3(centerX, baseY + 2, centerZ), '#f59e0b', 'metal');

    NotificationManager.push({
      title: '🚂 Lokomotif Uap Aether & Bor Tambang 3D Aktif!',
      message: 'Jaringan rel melingkar & Mesin Bor Tambang otomatis berhasil dibangun! Bijih tambang akan masuk berkala.',
      priority: 'HIGH',
      colorTheme: 'amber',
      durationMs: 4500,
    });
  }

  public static toggleRideLocomotive(audio?: SoundSynthesizer): boolean {
    if (!this.locomotiveActive) return false;
    this.locomotiveRiding = !this.locomotiveRiding;
    audio?.playLocomotiveWhistle();
    NotificationManager.push({
      title: this.locomotiveRiding ? '🚂 Menaiki Kabin Lokomotif Uap 3D' : '🚉 Turun dari Lokomotif Uap',
      message: this.locomotiveRiding
        ? 'Menikmati perjalanan mengelilingi jalur tambang Aether. Klik lagi untuk turun.'
        : 'Kembali berjalan kaki.',
      priority: 'NORMAL',
      colorTheme: 'amber',
      durationMs: 2800,
    });
    return this.locomotiveRiding;
  }

  // ============================================================================
  // 3. ALAT MUSIK GAMELAN & ANGKLUNG 3D INTERAKTIF BERKAH
  // ============================================================================
  private static buildGamelanEnsembleMesh(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'PendopoGamelanAngklung3D';

    const teakMat = new THREE.MeshStandardMaterial({
      color: 0x5c2d0c,
      roughness: 0.55,
      metalness: 0.15,
    });
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.92,
      roughness: 0.14,
    });
    const bambooMat = new THREE.MeshStandardMaterial({
      color: 0xd9f99d,
      roughness: 0.45,
      metalness: 0.1,
    });

    // Saron Carved Teak Soundbox
    const saronBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.75), teakMat);
    saronBase.position.set(0, 0.225, 0);
    group.add(saronBase);

    // 7 Bronze Saron Bars
    this.gamelanBars = [];
    for (let i = 0; i < 7; i++) {
      const barWidth = 0.24;
      const barLength = 0.62 - i * 0.03;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(barWidth, 0.08, barLength), bronzeMat);
      bar.position.set(-0.9 + i * 0.3, 0.49, 0);
      group.add(bar);
      this.gamelanBars.push(bar);
    }

    // Gayor Frame & Hanging Gong Ageng Behind Saron
    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.2, 10), teakMat);
    leftPost.position.set(-1.1, 1.1, -1.1);
    const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.2, 10), teakMat);
    rightPost.position.set(1.1, 1.1, -1.1);
    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.24), teakMat);
    crossBeam.position.set(0, 2.15, -1.1);
    group.add(leftPost, rightPost, crossBeam);

    const gong = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.16, 20), bronzeMat);
    gong.rotation.x = Math.PI / 2;
    gong.position.set(0, 1.25, -1.1);
    group.add(gong);
    this.gongMesh = gong;

    // Bamboo Angklung Rack on the Right
    const angklungStand = new THREE.Group();
    angklungStand.position.set(1.85, 0, -0.3);
    const rackBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.45), teakMat);
    rackBase.position.set(0, 0.06, 0);
    const rackTop = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8), bambooMat);
    rackTop.rotation.z = Math.PI / 2;
    rackTop.position.set(0, 1.15, 0);
    angklungStand.add(rackBase, rackTop);

    this.angklungRacks = [];
    for (let i = 0; i < 5; i++) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.75 - i * 0.08, 8), bambooMat);
      tube.position.set(-0.4 + i * 0.2, 0.72, 0);
      angklungStand.add(tube);
      this.angklungRacks.push(tube);
    }
    group.add(angklungStand);

    return group;
  }

  public static deployGamelanStage(
    world: VoxelWorld,
    player: PlayerController,
    audio?: SoundSynthesizer,
    particles?: ParticleManager
  ): void {
    const root = this.getOrCreateRootGroup();
    const fwd = player.getForwardVector();
    const gx = Math.floor(player.position.x + fwd.x * 4.5);
    const gz = Math.floor(player.position.z + fwd.z * 4.5);
    const gy = world.getSpawnHeight(gx, gz);

    // Build Pendopo floor carpet
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        world.setBlock(gx + dx, gy, gz + dz, BlockType.BATIK_CARPET_BLOCK);
      }
    }

    if (!this.gamelanGroup) {
      this.gamelanGroup = this.buildGamelanEnsembleMesh();
      root.add(this.gamelanGroup);
    }
    this.gamelanGroup.position.set(gx + 0.5, gy + 1, gz + 0.5);
    this.gamelanGroup.visible = true;
    this.gamelanStageBuilt = true;
    this.gamelanBlessingTimer = 240;

    audio?.playInteractiveGamelanKey(this.gamelanScale, 0, 'GONG');
    particles?.emitBlockBreak(new THREE.Vector3(gx + 0.5, gy + 1.8, gz + 0.5), '#fbbf24', 'crystal');

    NotificationManager.push({
      title: '🎶 Pendopo Gamelan & Angklung 3D Berdiri!',
      message: 'Berkah Harmoni Gamelan Aktif (240d): +25% Kecepatan Gerak & Regenerasi! Buka Studio Gamelan [N] untuk bermain.',
      priority: 'HIGH',
      colorTheme: 'amber',
      durationMs: 4200,
    });
  }

  public static strikeGamelanNote(
    noteIndex: number,
    instrument: 'SARON' | 'BONANG' | 'ANGKLUNG' | 'GONG',
    audio?: SoundSynthesizer,
    stats?: PlayerStats
  ): void {
    audio?.playInteractiveGamelanKey(this.gamelanScale, noteIndex, instrument);
    this.gamelanBlessingTimer = Math.max(this.gamelanBlessingTimer, 180);
    if (stats) {
      stats.health = Math.min(stats.maxHealth, stats.health + 2);
      stats.stamina = Math.min(stats.maxStamina, stats.stamina + 5);
    }

    // Animate 3D Saron bar / Angklung / Gong bounce
    const bar = this.gamelanBars[noteIndex % Math.max(1, this.gamelanBars.length)];
    if (bar) {
      bar.position.y = 0.56;
    }
    const angklung = this.angklungRacks[noteIndex % Math.max(1, this.angklungRacks.length)];
    if (angklung) {
      angklung.rotation.z = 0.22;
    }
    if (instrument === 'GONG' && this.gongMesh) {
      this.gongMesh.scale.setScalar(1.14);
    }
  }

  // ============================================================================
  // 4. KHODAM PENDAMPING 3D & TURNAMEN ARENA PENDEKAR
  // ============================================================================
  private static buildKhodamMesh(khodamId: KhodamCompanionId): THREE.Group {
    const def = KHODAM_COMPANIONS[khodamId];
    const group = new THREE.Group();
    group.name = `Khodam_${khodamId}`;

    const bodyMat = new THREE.MeshStandardMaterial({
      color: def.primaryColor,
      emissive: def.primaryColor,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.6,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: def.accentColor,
      emissive: def.accentColor,
      emissiveIntensity: 1.1,
      roughness: 0.15,
      metalness: 0.8,
    });

    // Core Spirit Torso
    const torso = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 1), bodyMat);
    group.add(torso);

    // Crown / Spirit Head Crest
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.55, 6), accentMat);
    head.position.set(0, 0.52, 0.15);
    head.rotation.x = Math.PI / 6;
    group.add(head);

    // Left & Right Floating Spirit Wings / Claws
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.32), accentMat);
    leftWing.position.set(-0.55, 0.1, 0);
    leftWing.rotation.z = 0.35;
    group.add(leftWing);

    const rightWing = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.32), accentMat);
    rightWing.position.set(0.55, 0.1, 0);
    rightWing.rotation.z = -0.35;
    group.add(rightWing);

    // Orbiting Halo Ring
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.035, 8, 24), accentMat);
    halo.rotation.x = Math.PI / 2;
    group.add(halo);

    return group;
  }

  public static selectAndSummonKhodam(
    khodamId: KhodamCompanionId,
    player: PlayerController,
    audio?: SoundSynthesizer,
    particles?: ParticleManager
  ): void {
    const root = this.getOrCreateRootGroup();
    this.activeKhodamId = khodamId;

    if (this.khodamMesh) {
      root.remove(this.khodamMesh);
    }
    this.khodamMesh = this.buildKhodamMesh(khodamId);
    this.khodamMesh.position.set(player.position.x + 1.8, player.position.y + 1.8, player.position.z + 1.8);
    root.add(this.khodamMesh);

    const def = KHODAM_COMPANIONS[khodamId];
    audio?.playAncientGong();
    particles?.emitBlockBreak(this.khodamMesh.position.clone(), '#10b981', 'crystal');

    NotificationManager.push({
      title: `✨ ${def.name} Bangkit!`,
      message: `${def.passiveBonusText}`,
      priority: 'HIGH',
      colorTheme: 'emerald',
      durationMs: 3800,
    });
  }

  public static cycleKhodamCompanion(
    player: PlayerController,
    audio?: SoundSynthesizer,
    particles?: ParticleManager
  ): void {
    const order: KhodamCompanionId[] = ['MACAN_PUTIH', 'GARUDA_API', 'NAGA_TIRTA'];
    const curIdx = this.activeKhodamId ? order.indexOf(this.activeKhodamId) : -1;
    const nextId = order[(curIdx + 1) % order.length];
    this.selectAndSummonKhodam(nextId, player, audio, particles);
  }

  public static startPendekarTournamentArena(
    world: VoxelWorld,
    entities: EntityManager,
    player: PlayerController,
    audio?: SoundSynthesizer,
    particles?: ParticleManager
  ): void {
    const cx = Math.floor(player.position.x);
    const cz = Math.floor(player.position.z);
    const cy = world.getSpawnHeight(cx, cz);

    // Build outdoor circular Candi stone martial arts ring with 8 perimeter torches (natural open-air perimeter)
    for (let dx = -8; dx <= 8; dx++) {
      for (let dz = -8; dz <= 8; dz++) {
        const dist = Math.round(Math.hypot(dx, dz));
        if (dist <= 8) {
          world.setBlock(cx + dx, cy - 1, cz + dz, BlockType.ANDESITE_CANDI_STONE);
        }
        if (dist === 8 && (dx === 0 || dz === 0 || Math.abs(dx) === Math.abs(dz))) {
          world.setBlock(cx + dx, cy, cz + dz, BlockType.CARVED_CANDI_RELIEF);
          world.setBlock(cx + dx, cy + 1, cz + dz, BlockType.TORCH);
        }
      }
    }

    this.arenaCenter.set(cx, cy + 1, cz);
    this.arenaActive = true;
    this.arenaWave = 1;
    this.arenaSpawnedIds.clear();

    this.spawnArenaWave(world, entities, 1);
    MapManager.addWaypoint('Gelanggang Turnamen Pendekar', [cx, cy + 1, cz], '#10b981');
    audio?.playAncientGong();
    particles?.emitBlockBreak(new THREE.Vector3(cx, cy + 1.5, cz), '#f59e0b', 'stone');

    NotificationManager.push({
      title: '⚔️ Turnamen Gelanggang Pendekar Dimulai! (Babak 1/3)',
      message: 'Kalahkan gelombang pendekar bayangan & bos penjaga untuk meraih Trofi Mahakarya Nusantara!',
      priority: 'CRITICAL',
      colorTheme: 'amber',
      durationMs: 4500,
    });
  }

  private static spawnArenaWave(world: VoxelWorld, entities: EntityManager, wave: number): void {
    this.arenaSpawnedIds.clear();
    const cx = this.arenaCenter.x;
    const cz = this.arenaCenter.z;
    const cy = this.arenaCenter.y;

    if (wave < 3) {
      const count = wave + 1;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const sx = cx + Math.cos(angle) * 6;
        const sz = cz + Math.sin(angle) * 6;
        const id = `arena_pendekar_w${wave}_${Date.now()}_${i}`;
        entities.spawnEntity({
          id,
          type: 'hostile',
          name: `Pendekar Bayangan Babak ${wave}`,
          position: [sx, cy + 1, sz],
          velocity: [0, 0, 0],
          rotation: 0,
          health: 80 * wave,
          maxHealth: 80 * wave,
          damage: 15 * wave,
          speed: 4.5,
          aiState: 'chase',
          modelType: 'corrupted_stalker',
          drops: [{ itemId: 'mythril_ingot', chance: 0.8, count: [1, 2] }],
        });
        this.arenaSpawnedIds.add(id);
      }
    } else {
      // Final Wave 3: Championship Boss!
      const bossId = entities.spawnBoss('naga_antaboga', [cx + 5, cy + 1, cz], world);
      if (bossId) {
        this.arenaSpawnedIds.add(bossId);
      }
    }
  }

  // ============================================================================
  // 5. CUACA EKSTREM, ERUPSI VULKANIK MERAPI & KRISTAL LAHAR
  // ============================================================================
  public static triggerExtremeWeatherEvent(
    eventId: ExtremeWeatherEventId,
    player: PlayerController,
    sky?: SkyEnvironment,
    weather?: WeatherSystem,
    audio?: SoundSynthesizer
  ): void {
    this.weatherEventId = eventId;
    this.weatherEventTimer = eventId === 'CLEAR' ? 0 : 180;

    if (eventId === 'VOLCANIC_ERUPTION') {
      weather?.setWeather('volcanic_ash', 0.92);
      player.applyScreenShake(0.65);
      audio?.playAncientGong();
      NotificationManager.push({
        title: '🌋 Erupsi Vulkanik Merapi & Hujan Kristal Lahar!',
        message: 'Arus termal meningkat drastis untuk Glider/Garuda & bongkahan Kristal Lahar Pijar berjatuhan di sekitar!',
        priority: 'CRITICAL',
        colorTheme: 'rose',
        durationMs: 4800,
      });
    } else if (eventId === 'EQUATORIAL_THUNDERSTORM') {
      weather?.setWeather('monsoon_rain', 0.95);
      audio?.playAncientGong();
      NotificationManager.push({
        title: '⛈️ Badai Petir Khatulistiwa Aktif!',
        message: 'Curah hujan monsun maksimum! Hasil pancingan laut & pertumbuhan sawah Subak meningkat 2x lipat.',
        priority: 'HIGH',
        colorTheme: 'sky',
        durationMs: 4200,
      });
    } else if (eventId === 'MYSTIC_CALDERA_MIST') {
      weather?.setWeather('aether_aurora', 0.88);
      if (sky) sky.setTimeOfDay(20.5);
      audio?.playInteractiveGamelanKey('PELOG', 4, 'GONG');
      NotificationManager.push({
        title: '🌌 Kabut Mistis Kawah & Aurora Nusantara',
        message: 'Langit malam berkilau dengan pendaran Aether. Pemulihan Tenaga Dalam Silat +50% lebih cepat!',
        priority: 'HIGH',
        colorTheme: 'emerald',
        durationMs: 4200,
      });
    } else {
      weather?.setWeather('clear', 0);
      NotificationManager.push({
        title: '☀️ Cuaca Cerah Khatulistiwa',
        message: 'Langit Nusantara kembali cerah dan tenang.',
        priority: 'NORMAL',
        colorTheme: 'amber',
        durationMs: 2500,
      });
    }
  }

  private static spawnVolcanicBomb(playerPos: THREE.Vector3): void {
    const root = this.getOrCreateRootGroup();
    const bombGroup = new THREE.Group();
    const magmaMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xdc2626,
      emissiveIntensity: 2.0,
      roughness: 0.3,
    });
    const crustMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.85,
    });

    const core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45, 0), magmaMat);
    const crust = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), crustMat);
    bombGroup.add(core, crust);

    const offsetX = (Math.random() - 0.5) * 26;
    const offsetZ = (Math.random() - 0.5) * 26;
    bombGroup.position.set(playerPos.x + offsetX, playerPos.y + 24, playerPos.z + offsetZ);
    root.add(bombGroup);

    this.activeVolcanicBombs.push({
      mesh: bombGroup,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 3, -11.5, (Math.random() - 0.5) * 3),
      life: 4.0,
    });
  }

  // ============================================================================
  // 6. KUSTOMISASI JUBAH BATIK & KOSTUM PRAJURIT NUSANTARA
  // ============================================================================
  public static equipWardrobeOutfit(
    outfitId: NusantaraWardrobeId,
    player: PlayerController,
    stats?: PlayerStats,
    audio?: SoundSynthesizer
  ): void {
    this.activeWardrobeId = outfitId;
    const def = NUSANTARA_WARDROBE_OUTFITS[outfitId];

    if (this.wardrobeOrnamentGroup && this.wardrobeOrnamentGroup.parent) {
      this.wardrobeOrnamentGroup.parent.remove(this.wardrobeOrnamentGroup);
    }

    const ornament = new THREE.Group();
    ornament.name = 'NusantaraWardrobeOrnament3D';

    const capeMat = new THREE.MeshStandardMaterial({
      color: def.capeColor,
      roughness: 0.5,
      metalness: 0.25,
      side: THREE.DoubleSide,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: def.trimColor,
      metalness: 0.85,
      roughness: 0.2,
    });
    const crownMat = new THREE.MeshStandardMaterial({
      color: def.crownColor,
      metalness: 0.92,
      roughness: 0.15,
    });

    // Flowing Royal Batik Cape on Back
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.15, 0.06), capeMat);
    cape.position.set(0, 0.88, -0.26);
    cape.rotation.x = 0.14;
    ornament.add(cape);

    // Gold Trim Border at Bottom of Cape
    const capeHem = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.07), trimMat);
    capeHem.position.set(0, 0.34, -0.33);
    ornament.add(capeHem);

    // Left & Right Golden Senopati Pauldrons
    const leftPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.34), trimMat);
    leftPauldron.position.set(-0.46, 1.38, 0);
    const rightPauldron = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.34), trimMat);
    rightPauldron.position.set(0.46, 1.38, 0);
    ornament.add(leftPauldron, rightPauldron);

    // Kuluk / Mahkota / Udeng Headpiece
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.22, 8), crownMat);
    crown.position.set(0, 1.88, 0);
    ornament.add(crown);

    player.playerGroup.add(ornament);
    this.wardrobeOrnamentGroup = ornament;

    if (stats) {
      stats.maxHealth = 100 + def.armorBonus;
      stats.health = Math.min(stats.maxHealth, stats.health + 15);
    }
    audio?.playItemCollect();

    NotificationManager.push({
      title: `👘 Busana Aktif: ${def.name}`,
      message: `${def.originRegion} · ${def.bonusSummary}`,
      priority: 'HIGH',
      colorTheme: 'amber',
      durationMs: 3600,
    });
  }

  // ============================================================================
  // 7. MODE FOTO SINEMATIK 3D & KAMERA BEBAS (FREE-CAM)
  // ============================================================================
  public static togglePhotoMode(
    player: PlayerController,
    camera: THREE.PerspectiveCamera,
    audio?: SoundSynthesizer
  ): boolean {
    this.photoModeActive = !this.photoModeActive;
    if (this.photoModeActive) {
      // Ensure 3D player body & Batik wardrobe are visible for hero shots
      player.playerGroup.visible = true;
      const fwd = player.getForwardVector();
      this.photoCamPos.set(
        player.position.x - fwd.x * 4.2,
        player.position.y + 2.2,
        player.position.z - fwd.z * 4.2
      );
      this.photoCamTargetPos.copy(this.photoCamPos);
      this.photoCamYaw = player.yaw;
      this.photoCamPitch = -0.15;
      this.photoFov = camera.fov;
      audio?.playCameraShutter();
    } else {
      camera.fov = player.baseFov || 75;
      camera.updateProjectionMatrix();
    }
    return this.photoModeActive;
  }

  public static captureScreenshotPNG(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    audio?: SoundSynthesizer
  ): void {
    try {
      audio?.playCameraShutter();
      // Render synchronous frame right before toDataURL so buffer is crisp
      renderer.render(scene, camera);
      const dataUrl = renderer.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `VoxelVerse_Nusantara_${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      NotificationManager.push({
        title: '📸 Potret Sinematik Tersimpan!',
        message: 'Tangkapan layar resolusi penuh berhasil diunduh sebagai PNG.',
        priority: 'HIGH',
        colorTheme: 'emerald',
        durationMs: 3200,
      });
    } catch {
      NotificationManager.push({
        title: '📸 Potret Layar Diambil',
        message: 'Frame sinematik berhasil dirender.',
        priority: 'NORMAL',
        colorTheme: 'sky',
        durationMs: 2500,
      });
    }
  }

  // ============================================================================
  // MASTER 60Hz SIMULATION & ANIMATION UPDATE
  // ============================================================================
  public static update(
    dt: number,
    world: VoxelWorld,
    entities: EntityManager,
    player: PlayerController,
    camera: THREE.PerspectiveCamera,
    particles: ParticleManager,
    audio: SoundSynthesizer,
    stats: PlayerStats,
    onAddItem: (itemId: string, count: number) => void
  ): void {
    this.elapsedTime += dt;

    // Ensure initial Khodam & Wardrobe ornament are attached once
    if (!this.wardrobeOrnamentGroup && player?.playerGroup) {
      this.equipWardrobeOutfit(this.activeWardrobeId, player);
    }
    if (this.activeKhodamId && !this.khodamMesh && player) {
      const root = this.getOrCreateRootGroup();
      this.khodamMesh = this.buildKhodamMesh(this.activeKhodamId);
      this.khodamMesh.position.copy(player.position).addScalar(1.5);
      root.add(this.khodamMesh);
    }

    // 0. If 3D Free-Cam Photo Mode is active, smoothly damp free-cam movement
    if (this.photoModeActive && camera) {
      player.playerGroup.visible = true;
      const moveSpeed = 12.0 * dt;
      _tmpForward.set(-Math.sin(this.photoCamYaw), 0, -Math.cos(this.photoCamYaw)).normalize();
      _tmpRight.set(Math.cos(this.photoCamYaw), 0, -Math.sin(this.photoCamYaw)).normalize();

      if (player.keys.forward) this.photoCamTargetPos.addScaledVector(_tmpForward, moveSpeed);
      if (player.keys.backward) this.photoCamTargetPos.addScaledVector(_tmpForward, -moveSpeed);
      if (player.keys.right) this.photoCamTargetPos.addScaledVector(_tmpRight, moveSpeed);
      if (player.keys.left) this.photoCamTargetPos.addScaledVector(_tmpRight, -moveSpeed);
      if (player.keys.jump) this.photoCamTargetPos.y += moveSpeed;
      if (player.keys.crouch) this.photoCamTargetPos.y -= moveSpeed;

      const dampFactor = 1 - Math.exp(-10 * dt);
      this.photoCamPos.lerp(this.photoCamTargetPos, dampFactor);
      camera.position.copy(this.photoCamPos);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = this.photoCamYaw;
      camera.rotation.x = this.photoCamPitch;
      if (Math.abs(camera.fov - this.photoFov) > 0.1) {
        camera.fov = THREE.MathUtils.damp(camera.fov, this.photoFov, 10, dt);
        camera.updateProjectionMatrix();
      }
    }

    // 1. Update 3D Submarine Nanggala Kencana (Smooth Damping & Seabed Floor Protection)
    if (this.submarineActive && this.submarineMesh) {
      stats.oxygen = stats.maxOxygen; // Pressurized hull keeps oxygen 100% full
      if (this.submarinePropeller) {
        this.submarinePropeller.rotation.z += dt * 16.0;
      }
      const targetSubVelY = player.keys.jump ? 6.5 : player.keys.crouch ? -6.5 : 0;
      if (player.keys.jump || player.keys.crouch) {
        player.velocity.y = THREE.MathUtils.damp(player.velocity.y, targetSubVelY, 10, dt);
      }
      // Prevent submarine from clipping below solid seabed terrain
      const seaFloorY = world.getSpawnHeight(Math.floor(player.position.x), Math.floor(player.position.z));
      if (player.position.y < seaFloorY + 1.2) {
        player.position.y = seaFloorY + 1.2;
        if (player.velocity.y < 0) player.velocity.y = 0;
      }
      this.submarineMesh.position.lerp(player.position, 1 - Math.exp(-16 * dt));
      this.submarineMesh.rotation.y = THREE.MathUtils.damp(
        this.submarineMesh.rotation.y,
        player.yaw,
        12,
        dt
      );
      const targetSubPitch = THREE.MathUtils.clamp(-player.velocity.y * 0.045, -0.28, 0.28);
      this.submarineMesh.rotation.x = THREE.MathUtils.damp(
        this.submarineMesh.rotation.x,
        targetSubPitch,
        8,
        dt
      );
    }

    // 2. Update 3D Steam Locomotive & Automated Quarry Drills (with 110m distance culling)
    if (this.locomotiveActive && this.locomotiveMesh) {
      this.locomotiveAngle = (this.locomotiveAngle + dt * 0.55) % (Math.PI * 2);
      const R = this.locomotiveTrackRadius;
      const lx = this.locomotiveOrigin.x + Math.cos(this.locomotiveAngle) * R;
      const lz = this.locomotiveOrigin.z + Math.sin(this.locomotiveAngle) * R;
      const distSqToLoco =
        (lx - player.position.x) * (lx - player.position.x) +
        (lz - player.position.z) * (lz - player.position.z);

      this.locomotiveMesh.visible = distSqToLoco <= 110 * 110 || this.locomotiveRiding;

      if (this.locomotiveMesh.visible) {
        const ly = world.getSpawnHeight(Math.round(lx), Math.round(lz)) + 1.05;
        this.locomotiveMesh.position.set(lx, ly, lz);
        this.locomotiveMesh.rotation.y = -this.locomotiveAngle;

        for (let i = 0; i < this.locomotiveWheels.length; i++) {
          this.locomotiveWheels[i].rotation.x += dt * 6.0;
        }

        if (this.locomotiveRiding && !this.photoModeActive) {
          player.position.set(lx, ly + 1.35, lz);
          player.velocity.set(0, 0, 0);
        }
      }
    }

    for (let i = 0; i < this.quarryRigs.length; i++) {
      const rig = this.quarryRigs[i];
      const distSq = rig.pos.distanceToSquared(player.position);
      rig.group.visible = distSq <= 110 * 110;
      if (rig.group.visible) {
        rig.drillHead.rotation.y += dt * 8.5;
        rig.drillHead.position.y = 1.25 + Math.sin(this.elapsedTime * 5.0 + i) * 0.22;
      }
      rig.timer += dt;
      if (rig.timer >= 9.0) {
        rig.timer = 0;
        const ores = ['iron_ore', 'gold_ore', 'coal', 'starfall_ore'];
        const picked = ores[this.quarryTotalMined % ores.length];
        onAddItem(picked, 1);
        this.quarryTotalMined += 1;
        if (rig.group.visible) {
          particles.emitBlockBreak(rig.pos, '#f59e0b', 'stone');
        }
      }
    }

    // 3. Update 3D Gamelan & Angklung Ensemble Animation & Auto-Gending
    if (this.gamelanBlessingTimer > 0) {
      this.gamelanBlessingTimer = Math.max(0, this.gamelanBlessingTimer - dt);
      if (Math.floor(this.elapsedTime * 2) !== Math.floor((this.elapsedTime - dt) * 2)) {
        stats.health = Math.min(stats.maxHealth, stats.health + 0.4);
      }
    }
    for (let i = 0; i < this.gamelanBars.length; i++) {
      this.gamelanBars[i].position.y = THREE.MathUtils.damp(this.gamelanBars[i].position.y, 0.49, 12, dt);
    }
    for (let i = 0; i < this.angklungRacks.length; i++) {
      this.angklungRacks[i].rotation.z = THREE.MathUtils.damp(this.angklungRacks[i].rotation.z, 0, 10, dt);
    }
    if (this.gongMesh) {
      const s = THREE.MathUtils.damp(this.gongMesh.scale.x, 1.0, 8, dt);
      this.gongMesh.scale.setScalar(s);
    }
    if (this.gamelanAutoSong) {
      this.gamelanSongTimer -= dt;
      if (this.gamelanSongTimer <= 0) {
        this.gamelanSongTimer = 0.48;
        const pattern =
          this.gamelanAutoSong === 'GENDING_SRIWIJAYA'
            ? [0, 2, 3, 4, 6, 4, 3, 2]
            : [1, 3, 4, 5, 4, 3, 1, 0];
        const note = pattern[this.gamelanSongStep % pattern.length];
        const inst = this.gamelanSongStep % 8 === 0 ? 'GONG' : this.gamelanSongStep % 2 === 0 ? 'SARON' : 'ANGKLUNG';
        this.strikeGamelanNote(note, inst, audio, stats);
        this.gamelanSongStep++;
      }
    }

    // 4. Update 3D Companion Khodam & Pendekar Tournament Arena
    if (this.activeKhodamId && this.khodamMesh) {
      this.khodamOrbitAngle += dt * 1.45;
      const targetX = player.position.x + Math.cos(this.khodamOrbitAngle) * 1.9;
      const targetZ = player.position.z + Math.sin(this.khodamOrbitAngle) * 1.9;
      const targetY = player.position.y + 1.55 + Math.sin(this.elapsedTime * 3.2) * 0.22;

      _tmpVecA.set(targetX, targetY, targetZ);
      this.khodamMesh.position.lerp(_tmpVecA, 1 - Math.exp(-8 * dt));
      this.khodamMesh.rotation.y += dt * 1.8;

      if (this.activeKhodamId === 'NAGA_TIRTA') {
        stats.health = Math.min(stats.maxHealth, stats.health + dt * 2.5);
      }

      // Autonomous Khodam Spirit Strike against nearest hostile within 14m
      this.khodamAttackTimer += dt;
      if (this.khodamAttackTimer >= 2.2) {
        this.khodamAttackTimer = 0;
        const khodamDef = KHODAM_COMPANIONS[this.activeKhodamId];
        let nearestEnemy: any = null;
        let minDist = 14.0;
        entities.entities.forEach((entry) => {
          if ((entry.state.type === 'hostile' || entry.state.type === 'boss' || entry.state.isBoss) && entry.state.health > 0) {
            const d = entry.mesh.position.distanceTo(player.position);
            if (d < minDist) {
              minDist = d;
              nearestEnemy = entry;
            }
          }
        });
        if (nearestEnemy) {
          nearestEnemy.state.health = Math.max(0, nearestEnemy.state.health - khodamDef.attackDamage);
          _tmpVecA.copy(nearestEnemy.mesh.position);
          particles.emitBlockBreak(_tmpVecA, '#38bdf8', 'crystal');
        }
      }
    }

    if (this.arenaActive) {
      let aliveCount = 0;
      this.arenaSpawnedIds.forEach((id) => {
        const ent = entities.entities.get(id);
        if (ent && ent.state.health > 0) {
          aliveCount++;
        }
      });

      if (aliveCount === 0) {
        if (this.arenaWave < this.arenaMaxWaves) {
          this.arenaWave++;
          this.spawnArenaWave(world, entities, this.arenaWave);
          audio.playAncientGong();
          NotificationManager.push({
            title: `⚔️ Gelanggang Pendekar: Babak ${this.arenaWave}/${this.arenaMaxWaves}!`,
            message:
              this.arenaWave === 3
                ? 'Babak Final! Bos Naga Pendekar Bangkit!'
                : 'Gelombang pendekar berikutnya telah tiba!',
            priority: 'HIGH',
            colorTheme: 'amber',
            durationMs: 3500,
          });
        } else {
          this.arenaActive = false;
          onAddItem('mustika_bintang_jatuh', 2);
          onAddItem('mutiara_candi_samudra', 2);
          stats.addXP(350);
          audio.playAncientGong();
          NotificationManager.push({
            title: '🏆 JUARA TURNAMEN PENDEKAR NUSANTARA!',
            message: 'Seluruh 3 babak berhasil ditaklukkan! Memperoleh 2x Mustika Bintang Jatuh & 2x Mutiara Samudra (+350 XP)!',
            priority: 'CRITICAL',
            colorTheme: 'emerald',
            durationMs: 5200,
          });
        }
      }
    }

    // 5. Update Extreme Weather & Volcanic Eruption Bombs
    if (this.weatherEventId !== 'CLEAR' && this.weatherEventTimer > 0) {
      this.weatherEventTimer = Math.max(0, this.weatherEventTimer - dt);
      if (this.weatherEventId === 'VOLCANIC_ERUPTION') {
        this.volcanicMeteorTimer += dt;
        if (this.volcanicMeteorTimer >= 3.2 && this.activeVolcanicBombs.length < 4) {
          this.volcanicMeteorTimer = 0;
          this.spawnVolcanicBomb(player.position);
        }
      }
      if (this.weatherEventTimer <= 0) {
        this.weatherEventId = 'CLEAR';
      }
    }

    for (let i = this.activeVolcanicBombs.length - 1; i >= 0; i--) {
      const bomb = this.activeVolcanicBombs[i];
      bomb.life -= dt;
      bomb.mesh.position.addScaledVector(bomb.velocity, dt);
      bomb.mesh.rotation.x += dt * 4;
      bomb.mesh.rotation.y += dt * 3;

      const groundY = world.getSpawnHeight(
        Math.floor(bomb.mesh.position.x),
        Math.floor(bomb.mesh.position.z)
      );
      if (bomb.mesh.position.y <= groundY + 1 || bomb.life <= 0) {
        _tmpVecA.copy(bomb.mesh.position);
        particles.emitBlockBreak(_tmpVecA, '#f97316', 'stone');
        onAddItem('kristal_lahar_merapi', 1);
        if (this.rootGroup) {
          this.rootGroup.remove(bomb.mesh);
        }
        this.activeVolcanicBombs.splice(i, 1);
      }
    }
  }

  public static getTelemetry(playerPos?: THREE.Vector3): MahakaryaTelemetryState {
    let sonarDist = 0;
    if (this.oceanCandiPos && playerPos) {
      _tmpVecB.set(this.oceanCandiPos[0], this.oceanCandiPos[1], this.oceanCandiPos[2]);
      sonarDist = Math.round(_tmpVecB.distanceTo(playerPos));
    }
    const khodamDef = this.activeKhodamId ? KHODAM_COMPANIONS[this.activeKhodamId] : null;
    const wardrobeDef = NUSANTARA_WARDROBE_OUTFITS[this.activeWardrobeId];
    const weatherNames: Record<ExtremeWeatherEventId, string> = {
      CLEAR: 'Cerah Khatulistiwa',
      VOLCANIC_ERUPTION: 'Erupsi Merapi & Hujan Lahar',
      EQUATORIAL_THUNDERSTORM: 'Badai Petir Khatulistiwa',
      MYSTIC_CALDERA_MIST: 'Aurora & Kabut Kawah Mistis',
    };

    return {
      submarineActive: this.submarineActive,
      submarineDepth: playerPos ? Math.max(0, Math.round(62 - playerPos.y)) : 0,
      submarineSonarDist: sonarDist,
      oceanCandiBuilt: this.oceanCandiBuilt,
      oceanCandiPos: this.oceanCandiPos,
      locomotiveActive: this.locomotiveActive,
      locomotiveRiding: this.locomotiveRiding,
      locomotiveSpeed: this.locomotiveActive ? 14.5 : 0,
      quarryCount: this.quarryRigs.length,
      quarryTotalMined: this.quarryTotalMined,
      gamelanStageBuilt: this.gamelanStageBuilt,
      gamelanScale: this.gamelanScale,
      gamelanAutoSong: this.gamelanAutoSong,
      gamelanBlessingTimer: Math.ceil(this.gamelanBlessingTimer),
      activeKhodamId: this.activeKhodamId,
      activeKhodamName: khodamDef?.name || null,
      arenaActive: this.arenaActive,
      arenaWave: this.arenaWave,
      arenaMaxWaves: this.arenaMaxWaves,
      weatherEventId: this.weatherEventId,
      weatherEventName: weatherNames[this.weatherEventId],
      weatherEventTimer: Math.ceil(this.weatherEventTimer),
      activeWardrobeId: this.activeWardrobeId,
      activeWardrobeName: wardrobeDef.name,
      photoModeActive: this.photoModeActive,
      photoFov: Math.round(this.photoFov),
      photoFrame: this.photoFrame,
    };
  }

  public static serialize(): Record<string, any> {
    return {
      activeKhodamId: this.activeKhodamId,
      activeWardrobeId: this.activeWardrobeId,
      gamelanScale: this.gamelanScale,
      gamelanBlessingTimer: Math.round(this.gamelanBlessingTimer),
      gamelanStageBuilt: this.gamelanStageBuilt,
      gamelanStagePos:
        this.gamelanStageBuilt && this.gamelanGroup
          ? [this.gamelanGroup.position.x, this.gamelanGroup.position.y, this.gamelanGroup.position.z]
          : null,
      quarryTotalMined: this.quarryTotalMined,
      oceanCandiBuilt: this.oceanCandiBuilt,
      oceanCandiPos: this.oceanCandiPos,
      locomotiveActive: this.locomotiveActive,
      locomotiveOrigin: this.locomotiveActive
        ? [this.locomotiveOrigin.x, this.locomotiveOrigin.y, this.locomotiveOrigin.z]
        : null,
      quarryPositions: this.quarryRigs.map((r) => [r.pos.x, r.pos.y, r.pos.z]),
    };
  }

  public static deserialize(data?: Record<string, any> | null, player?: PlayerController): void {
    this.reset();
    const root = this.getOrCreateRootGroup();
    if (!data || typeof data !== 'object') return;

    if (data.activeKhodamId && KHODAM_COMPANIONS[data.activeKhodamId as KhodamCompanionId]) {
      this.activeKhodamId = data.activeKhodamId as KhodamCompanionId;
    }
    if (data.activeWardrobeId && NUSANTARA_WARDROBE_OUTFITS[data.activeWardrobeId as NusantaraWardrobeId]) {
      this.activeWardrobeId = data.activeWardrobeId as NusantaraWardrobeId;
      if (player) {
        this.equipWardrobeOutfit(this.activeWardrobeId, player);
      }
    }
    if (data.gamelanScale === 'PELOG' || data.gamelanScale === 'SLENDRO') {
      this.gamelanScale = data.gamelanScale;
    }
    if (typeof data.gamelanBlessingTimer === 'number') {
      this.gamelanBlessingTimer = Math.max(0, data.gamelanBlessingTimer);
    }
    if (typeof data.quarryTotalMined === 'number') {
      this.quarryTotalMined = Math.max(0, data.quarryTotalMined);
    }
    if (typeof data.oceanCandiBuilt === 'boolean') {
      this.oceanCandiBuilt = data.oceanCandiBuilt;
    }
    if (Array.isArray(data.oceanCandiPos) && data.oceanCandiPos.length === 3) {
      this.oceanCandiPos = [
        Number(data.oceanCandiPos[0]),
        Number(data.oceanCandiPos[1]),
        Number(data.oceanCandiPos[2]),
      ];
    }

    if (data.gamelanStageBuilt && Array.isArray(data.gamelanStagePos) && data.gamelanStagePos.length === 3) {
      this.gamelanGroup = this.buildGamelanEnsembleMesh();
      this.gamelanGroup.position.set(
        Number(data.gamelanStagePos[0]),
        Number(data.gamelanStagePos[1]),
        Number(data.gamelanStagePos[2])
      );
      this.gamelanGroup.visible = true;
      this.gamelanStageBuilt = true;
      root.add(this.gamelanGroup);
    }

    if (data.locomotiveActive && Array.isArray(data.locomotiveOrigin) && data.locomotiveOrigin.length === 3) {
      this.locomotiveMesh = this.buildSteamLocomotiveMesh();
      root.add(this.locomotiveMesh);
      this.locomotiveOrigin.set(
        Number(data.locomotiveOrigin[0]),
        Number(data.locomotiveOrigin[1]),
        Number(data.locomotiveOrigin[2])
      );
      this.locomotiveAngle = 0;
      this.locomotiveActive = true;
      this.locomotiveMesh.visible = true;
    }

    if (Array.isArray(data.quarryPositions)) {
      for (const posArr of data.quarryPositions) {
        if (!Array.isArray(posArr) || posArr.length !== 3) continue;
        const { group: quarryGroup, drillHead } = this.buildQuarryDrillMesh();
        const qPos = new THREE.Vector3(Number(posArr[0]), Number(posArr[1]), Number(posArr[2]));
        quarryGroup.position.copy(qPos);
        root.add(quarryGroup);
        this.quarryRigs.push({
          pos: qPos,
          group: quarryGroup,
          drillHead,
          timer: 0,
        });
      }
    }
  }

  public static reset(): void {
    this.submarineActive = false;
    this.submarineMesh = null;
    this.locomotiveActive = false;
    this.locomotiveRiding = false;
    this.locomotiveMesh = null;
    this.locomotiveWheels = [];
    this.quarryRigs = [];
    this.gamelanStageBuilt = false;
    this.gamelanGroup = null;
    this.gamelanBars = [];
    this.angklungRacks = [];
    this.gamelanAutoSong = null;
    this.khodamMesh = null;
    this.arenaActive = false;
    this.arenaSpawnedIds.clear();
    this.activeVolcanicBombs = [];
    this.wardrobeOrnamentGroup = null;
    this.photoModeActive = false;
    if (this.rootGroup) {
      this.rootGroup.clear();
    }
  }
}
