// VoxelVerse v4.6.0: Underground Candi Sanctum & Buto Ijo 3D Boss, Pencak Silat 3-Stance & Ajian Engine,
// Subak 3D Waterwheel Crop Automation, and Village Night Market & Wayang Kulit 3D Stage System
import * as THREE from 'three';
import { BlockType } from '../../types';
import { VoxelWorld } from '../world/VoxelWorld';
import { EntityManager } from '../entities/EntityManager';
import { ParticleManager } from '../environment/ParticleManager';
import { SoundSynthesizer } from '../audio/SoundSynthesizer';
import { NotificationManager } from '../ui/NotificationManager';
import { PlayerController } from '../player/PlayerController';
import { PlayerStats } from '../player/PlayerStats';
import { PoiseSystem } from '../combat/PoiseSystem';
import { BlockPlacementEngine } from '../world/BlockPlacementEngine';

export type SilatStanceId = 'HARIMAU' | 'BANGAU' | 'NAGA';
export type AjianUltimateId = 'AJIAN_BRAJAMUSTI' | 'AJIAN_SERIBU_BAYANGAN' | 'AJIAN_PANCASONA';
export type WayangLakonId = 'LAKON_GATOTKACA' | 'LAKON_SRI_SEDANA' | 'LAKON_DEWA_RUCI';

export interface SilatStanceDef {
  id: SilatStanceId;
  name: string;
  subtitle: string;
  colorHex: string;
  colorInt: number;
  attackSpeedMultiplier: number;
  critChanceBonus: number;
  poiseDamageMultiplier: number;
  parryPoiseReflectBonus: number;
  staminaOnHitRestore: number;
}

export interface AjianUltimateDef {
  id: AjianUltimateId;
  name: string;
  description: string;
  colorHex: string;
  colorInt: number;
}

export interface WayangLakonDef {
  id: WayangLakonId;
  name: string;
  dalangQuote: string;
  blessingDesc: string;
  durationSeconds: number;
}

export const SILAT_STANCES: Record<SilatStanceId, SilatStanceDef> = {
  HARIMAU: {
    id: 'HARIMAU',
    name: 'Kuda-Kuda Harimau Sumatera',
    subtitle: '+25% Kecepatan Tebas · +22% Kritikal',
    colorHex: '#f97316',
    colorInt: 0xf97316,
    attackSpeedMultiplier: 1.25,
    critChanceBonus: 0.22,
    poiseDamageMultiplier: 1.1,
    parryPoiseReflectBonus: 1.0,
    staminaOnHitRestore: 4,
  },
  BANGAU: {
    id: 'BANGAU',
    name: 'Kuda-Kuda Bangau Putih',
    subtitle: 'Tangkisan Parry Pantul · +12 Stamina/Tebas',
    colorHex: '#38bdf8',
    colorInt: 0x38bdf8,
    attackSpeedMultiplier: 1.08,
    critChanceBonus: 0.1,
    poiseDamageMultiplier: 1.15,
    parryPoiseReflectBonus: 1.65,
    staminaOnHitRestore: 12,
  },
  NAGA: {
    id: 'NAGA',
    name: 'Kuda-Kuda Naga Saptapatala',
    subtitle: '+45% Penghancur Poise · Gelombang Kombo',
    colorHex: '#10b981',
    colorInt: 0x10b981,
    attackSpeedMultiplier: 1.12,
    critChanceBonus: 0.15,
    poiseDamageMultiplier: 1.45,
    parryPoiseReflectBonus: 1.25,
    staminaOnHitRestore: 6,
  },
};

export const AJIAN_ULTIMATES: Record<AjianUltimateId, AjianUltimateDef> = {
  AJIAN_BRAJAMUSTI: {
    id: 'AJIAN_BRAJAMUSTI',
    name: 'Ajian Brajamusti Kencana',
    description: 'Hantaman gelombang kejut emas berjarak 9m yang meremukkan Poise musuh dan Boss.',
    colorHex: '#f59e0b',
    colorInt: 0xf59e0b,
  },
  AJIAN_SERIBU_BAYANGAN: {
    id: 'AJIAN_SERIBU_BAYANGAN',
    name: 'Ajian Seribu Bayangan Angin',
    description: 'Tebasan kilat beruntun ke seluruh musuh di sekitar dan memulihkan 60 Stamina.',
    colorHex: '#38bdf8',
    colorInt: 0x38bdf8,
  },
  AJIAN_PANCASONA: {
    id: 'AJIAN_PANCASONA',
    name: 'Ajian Rawa Rontek Pancasona',
    description: 'Menyerap sari bumi Nusantara untuk memulihkan 75 HP dan meledakkan aura zamrud.',
    colorHex: '#10b981',
    colorInt: 0x10b981,
  },
};

export const WAYANG_LAKONS: Record<WayangLakonId, WayangLakonDef> = {
  LAKON_GATOTKACA: {
    id: 'LAKON_GATOTKACA',
    name: 'Lakon Gatotkaca Otot Kawat Balung Wesi',
    dalangQuote: 'Raden Gatotkaca melesat dari awan Pringgadani, menumpas angkara murka!',
    blessingDesc: '+25% Daya Serang & +30% Ketahanan Poise selama 180 detik',
    durationSeconds: 180,
  },
  LAKON_SRI_SEDANA: {
    id: 'LAKON_SRI_SEDANA',
    name: 'Lakon Dewi Sri & Sadana Kemakmuran',
    dalangQuote: 'Berkah bulir padi emas mengalir melalui saluran Subak menuju lumbung desa!',
    blessingDesc: '2x Lipat Hasil Panen Kincir Subak & Regenerasi Lapar selama 180 detik',
    durationSeconds: 180,
  },
  LAKON_DEWA_RUCI: {
    id: 'LAKON_DEWA_RUCI',
    name: 'Lakon Bima Suci & Tirta Pawitra',
    dalangQuote: 'Di dasar samudra hening, Werkudara menemukan rahasia Tenaga Dalam sejati!',
    blessingDesc: 'Pengisian Tenaga Dalam 2x Lebih Cepat & Regenerasi HP selama 180 detik',
    durationSeconds: 180,
  },
};

interface SanctumTrapInstance {
  id: string;
  origin: THREE.Vector3;
  group: THREE.Group;
  pendulumPivot: THREE.Group;
  phase: number;
}

interface SubakWaterwheelInstance {
  id: string;
  position: THREE.Vector3;
  group: THREE.Group;
  wheelGroup: THREE.Group;
  harvestTimer: number;
  totalHarvested: number;
}

interface WayangStageInstance {
  id: string;
  position: THREE.Vector3;
  group: THREE.Group;
  puppetLeft: THREE.Group;
  puppetRight: THREE.Group;
  gununganCenter: THREE.Group;
  blencongLight: THREE.PointLight;
  animTime: number;
}

interface ShockwaveVfxInstance {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  maxScale: number;
}

export class NusantaraSanctumSilatSubakSystem {
  private static rootGroup: THREE.Group | null = null;
  private static silatAuraRing: THREE.Mesh | null = null;

  // 1. Pencak Silat & Tenaga Dalam State
  public static activeStance: SilatStanceId = 'HARIMAU';
  public static activeAjian: AjianUltimateId = 'AJIAN_BRAJAMUSTI';
  public static tenagaDalam: number = 100; // Start at 100% so player can immediately test Ajian!
  private static auraPhase: number = 0;
  private static shockwaves: ShockwaveVfxInstance[] = [];

  // 2. Underground Candi Sanctum & Trap State
  public static sanctumsExcavated: number = 0;
  public static lastSanctumPos: [number, number, number] | null = null;
  private static sanctumTraps: SanctumTrapInstance[] = [];
  private static trapDamageCooldown: number = 0;

  // 3. Subak 3D Waterwheels State
  private static subakWheels: SubakWaterwheelInstance[] = [];
  public static totalSubakHarvested: number = 0;

  // 4. Wayang Kulit Stage & Night Market Blessing State
  private static wayangStages: WayangStageInstance[] = [];
  public static activeLakon: WayangLakonId | null = null;
  public static lakonTimerRemaining: number = 0;
  private static lakonRegenTick: number = 0;

  public static getOrCreateRootGroup(): THREE.Group {
    if (!this.rootGroup) {
      this.rootGroup = new THREE.Group();
      this.rootGroup.name = 'NusantaraSanctumSilatSubakRootGroup';

      // Create subtle Silat Stance Aura Ring at player feet
      const ringGeo = new THREE.RingGeometry(0.55, 0.72, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: SILAT_STANCES[this.activeStance].colorInt,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      this.silatAuraRing = new THREE.Mesh(ringGeo, ringMat);
      this.rootGroup.add(this.silatAuraRing);
    }
    return this.rootGroup;
  }

  // ============================================================================
  // PILAR 1: EKSPEDISI CANDI BAWAH TANAH & BOS RAKSASA BUTO IJO 3D
  // ============================================================================
  public static excavateUndergroundCandiSanctum(
    world: VoxelWorld,
    entities: EntityManager,
    playerOrPos: PlayerController | THREE.Vector3,
    audioOrFwd?: SoundSynthesizer | THREE.Vector3,
    particlesOrAudio?: ParticleManager | SoundSynthesizer,
    statsOrParticles?: PlayerStats | ParticleManager,
    addItemOrStats?: ((itemId: string, count: number) => void) | PlayerStats
  ): [number, number, number] {
    this.getOrCreateRootGroup();

    const isPlayerController = !(playerOrPos instanceof THREE.Vector3);
    const playerPos = isPlayerController ? (playerOrPos as PlayerController).position : (playerOrPos as THREE.Vector3);
    const forwardDir = isPlayerController
      ? (playerOrPos as PlayerController).getForwardVector()
      : (audioOrFwd as THREE.Vector3) || new THREE.Vector3(0, 0, -1);
    const audio = (isPlayerController ? audioOrFwd : particlesOrAudio) as SoundSynthesizer | undefined;
    const particles = (isPlayerController ? particlesOrAudio : statsOrParticles) as ParticleManager | undefined;
    const stats = (isPlayerController ? statsOrParticles : addItemOrStats) as PlayerStats | undefined;
    const addItemCallback = typeof addItemOrStats === 'function' ? addItemOrStats : undefined;

    const centerX = Math.floor(playerPos.x + forwardDir.x * 11);
    const centerZ = Math.floor(playerPos.z + forwardDir.z * 11);
    const surfaceY = world.getSpawnHeight(centerX, centerZ);
    const floorY = Math.max(12, surfaceY - 5);

    // 1. Carve Candi Sanctum Chamber (13x7x13) with Andesite walls, Candi reliefs & open skylight stairway
    const radiusX = 6;
    const radiusZ = 6;
    const height = 6;

    for (let dx = -radiusX; dx <= radiusX; dx++) {
      for (let dz = -radiusZ; dz <= radiusZ; dz++) {
        for (let dy = 0; dy <= height; dy++) {
          const wx = centerX + dx;
          const wy = floorY + dy;
          const wz = centerZ + dz;

          const isWall = Math.abs(dx) === radiusX || Math.abs(dz) === radiusZ;
          const isFloor = dy === 0;
          const isRoof = dy === height;

          if (isFloor) {
            const isTrapStrip = Math.abs(dx) <= 1 && dz === -2;
            world.setBlock(
              wx,
              wy,
              wz,
              isTrapStrip ? BlockType.MAGMA_ROCK : (dx + dz) % 2 === 0 ? BlockType.VOLCANIC_BRICK : BlockType.STONE_BRICKS
            );
          } else if (isWall) {
            // Leave front entrance gateway open
            if (dz === -radiusZ && Math.abs(dx) <= 1 && dy <= 3) {
              world.setBlock(wx, wy, wz, BlockType.AIR);
            } else {
              world.setBlock(
                wx,
                wy,
                wz,
                dy === 2 ? BlockType.CARVED_ANDESITE_STONE : BlockType.VOLCANIC_BRICK
              );
            }
          } else if (isRoof) {
            // Leave central skylight open so players can see or drop in easily
            if (Math.abs(dx) <= 2 && Math.abs(dz) <= 2) {
              world.setBlock(wx, wy, wz, BlockType.AIR);
            } else {
              world.setBlock(wx, wy, wz, BlockType.VOLCANIC_BRICK);
            }
          } else {
            world.setBlock(wx, wy, wz, BlockType.AIR);
          }
        }
      }
    }

    // Carve stepped entrance ramp from surface toward the sanctum gate
    for (let step = 0; step < 6; step++) {
      const sx = centerX;
      const sz = centerZ - radiusZ - step;
      const sy = floorY + step;
      for (let w = -1; w <= 1; w++) {
        world.setBlock(sx + w, sy, sz, BlockType.STONE_STAIRS);
        for (let clearY = 1; clearY <= 4; clearY++) {
          world.setBlock(sx + w, sy + clearY, sz, BlockType.AIR);
        }
      }
    }

    // Place 4 Corner Candi Pillars with Lanterns & Central Prasasti Treasure Chest
    const pillarOffsets: [number, number][] = [
      [-4, -4],
      [4, -4],
      [-4, 4],
      [4, 4],
    ];
    for (const [px, pz] of pillarOffsets) {
      for (let py = 1; py <= 4; py++) {
        world.setBlock(centerX + px, floorY + py, centerZ + pz, BlockType.CARVED_ANDESITE_STONE);
      }
      world.setBlock(centerX + px, floorY + 2, centerZ + pz + (pz < 0 ? 1 : -1), BlockType.LANTERN);
    }

    // Place Sanctum Altar & Treasure Chest at the back of the chamber
    world.setBlock(centerX, floorY + 1, centerZ + 4, BlockType.GOLD_BLOCK);
    world.setBlock(centerX, floorY + 2, centerZ + 4, BlockType.CHEST);
    BlockPlacementEngine.initializeEmptyContainer([centerX, floorY + 2, centerZ + 4]);

    // 2. Spawn 3D Swinging Kala Pendulum Blade Trap inside the Sanctum
    const trapGroup = this.buildSanctumPendulumTrapMesh();
    trapGroup.position.set(centerX + 0.5, floorY + 5.2, centerZ - 1.5);
    this.rootGroup!.add(trapGroup);
    const pivot = trapGroup.getObjectByName('PendulumPivot') as THREE.Group;
    this.sanctumTraps.push({
      id: `sanctum_trap_${Date.now()}`,
      origin: new THREE.Vector3(centerX + 0.5, floorY + 1.5, centerZ - 1.5),
      group: trapGroup,
      pendulumPivot: pivot || trapGroup,
      phase: 0,
    });

    // 3. Spawn 3-Phase Boss: Raksasa Buto Ijo 3D (`buto_ijo_colossus`)
    entities.spawnBoss('buto_ijo_colossus' as any, [centerX, floorY + 1, centerZ + 1], world);

    this.sanctumsExcavated++;
    this.lastSanctumPos = [centerX, floorY + 1, centerZ];

    if (stats && typeof stats.addXP === 'function') stats.addXP(120);
    if (addItemCallback) {
      addItemCallback('torch', 4);
    }
    audio?.playAncientGong();
    if (particles) {
      particles.spawnCombatSparks(new THREE.Vector3(centerX, floorY + 2, centerZ), true);
    }

    NotificationManager.push({
      title: '🏛️ CANDI BAWAH TANAH KALA-MAKARA TERBUKA!',
      message:
        'Waspadai Bilah Ayun Kala & hadapi Raksasa Buto Ijo 3D untuk merebut Gada Pusaka Buto Ijo!',
      priority: 'CRITICAL',
      colorTheme: 'emerald',
      durationMs: 4800,
    });

    return [centerX, floorY + 1, centerZ];
  }

  private static buildSanctumPendulumTrapMesh(): THREE.Group {
    const group = new THREE.Group();
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x3f3f46,
      roughness: 0.85,
      metalness: 0.2,
    });
    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.3,
      metalness: 0.8,
    });
    const jadeEdgeMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.2,
      metalness: 0.7,
      emissive: 0x059669,
      emissiveIntensity: 0.6,
    });

    // Ceiling anchor mount
    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.8), stoneMat);
    group.add(mount);

    const pivot = new THREE.Group();
    pivot.name = 'PendulumPivot';

    // Pendulum arm rod
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.2, 8), bronzeMat);
    rod.position.set(0, -1.6, 0);
    pivot.add(rod);

    // Crescent Kala Axe Blade (composite)
    const bladeCore = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.75, 0.14), stoneMat);
    bladeCore.position.set(0, -3.2, 0);
    pivot.add(bladeCore);

    const bladeEdge = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.28, 0.18), jadeEdgeMat);
    bladeEdge.position.set(0, -3.52, 0);
    pivot.add(bladeEdge);

    group.add(pivot);
    return group;
  }

  // ============================================================================
  // PILAR 2: PENCAK SILAT 3 ALIRAN KUDA-KUDA & SERANGAN AJIAN SAKTI PUSAKA
  // ============================================================================
  public static cycleSilatStance(audio?: SoundSynthesizer, particles?: ParticleManager, playerPos?: THREE.Vector3): SilatStanceDef {
    const order: SilatStanceId[] = ['HARIMAU', 'BANGAU', 'NAGA'];
    const nextIdx = (order.indexOf(this.activeStance) + 1) % order.length;
    this.activeStance = order[nextIdx];
    const def = SILAT_STANCES[this.activeStance];

    if (this.silatAuraRing && this.silatAuraRing.material instanceof THREE.MeshBasicMaterial) {
      this.silatAuraRing.material.color.setHex(def.colorInt);
    }

    audio?.playGamelanSaron(nextIdx + 2);
    if (particles && playerPos) {
      particles.emitBlockBreak(playerPos.clone().add(new THREE.Vector3(0, 0.5, 0)), def.colorHex, 'crystal');
    }

    NotificationManager.push({
      title: `🥋 ${def.name}`,
      message: def.subtitle,
      priority: 'NORMAL',
      colorTheme: this.activeStance === 'HARIMAU' ? 'amber' : this.activeStance === 'BANGAU' ? 'sky' : 'emerald',
      durationMs: 2200,
    });

    return def;
  }

  public static cycleAjianUltimate(audio?: SoundSynthesizer): AjianUltimateDef {
    const order: AjianUltimateId[] = ['AJIAN_BRAJAMUSTI', 'AJIAN_SERIBU_BAYANGAN', 'AJIAN_PANCASONA'];
    const nextIdx = (order.indexOf(this.activeAjian) + 1) % order.length;
    this.activeAjian = order[nextIdx];
    const def = AJIAN_ULTIMATES[this.activeAjian];
    audio?.playUIClick();
    return def;
  }

  public static getActiveStanceDef(): SilatStanceDef {
    return SILAT_STANCES[this.activeStance];
  }

  public static getActiveAjianDef(): AjianUltimateDef {
    return AJIAN_ULTIMATES[this.activeAjian];
  }

  public static addTenagaDalam(amount: number): void {
    const mult = this.activeLakon === 'LAKON_DEWA_RUCI' ? 2.0 : 1.0;
    this.tenagaDalam = Math.max(0, Math.min(100, this.tenagaDalam + amount * mult));
  }

  public static meditateFocusTenagaDalam(
    player?: PlayerController,
    audio?: SoundSynthesizer,
    particles?: ParticleManager
  ): void {
    this.addTenagaDalam(35);
    audio?.playGamelanSaron(3);
    if (particles && player) {
      particles.emitBlockBreak(
        player.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
        SILAT_STANCES[this.activeStance].colorHex,
        'crystal'
      );
    }
    NotificationManager.push({
      title: '🧘 Meditasi Tenaga Dalam Nusantara',
      message: `Tenaga Dalam terhimpun menjadi ${Math.round(this.tenagaDalam)}%!`,
      priority: 'NORMAL',
      colorTheme: 'sky',
      durationMs: 2000,
    });
  }

  public static unleashAjianUltimate(
    entities: EntityManager,
    player: PlayerController,
    stats: PlayerStats,
    audio?: SoundSynthesizer,
    particles?: ParticleManager
  ): boolean {
    if (this.tenagaDalam < 100) {
      audio?.playTone(220, 0.1);
      NotificationManager.push({
        title: 'Tenaga Dalam Belum Penuh',
        message: `Tenaga Dalam saat ini ${Math.round(this.tenagaDalam)}%. Serang atau tangkis musuh hingga 100%!`,
        priority: 'NORMAL',
        colorTheme: 'amber',
        durationMs: 2200,
      });
      return false;
    }

    this.tenagaDalam = 0;
    const ajianDef = AJIAN_ULTIMATES[this.activeAjian];
    const pPos = player.position.clone();

    // Spawn 3D Expanding Ajian Shockwave Ring
    this.spawnShockwaveRing(pPos, ajianDef.colorInt, 10.5);

    audio?.playAncientGong();
    player.applyScreenShake(0.75);
    player.triggerSwing();

    if (particles) {
      particles.spawnCombatSparks(pPos.clone().add(new THREE.Vector3(0, 1.0, 0)), true);
      particles.emitBlockBreak(pPos.clone().add(new THREE.Vector3(0, 1.0, 0)), ajianDef.colorHex, 'crystal');
    }

    let hitCount = 0;
    const radius = this.activeAjian === 'AJIAN_SERIBU_BAYANGAN' ? 11.0 : 9.0;

    entities.entities.forEach((entry, id) => {
      const st = entry.state;
      if (st.type === 'npc' || st.isTamed || st.health <= 0) return;
      const dist = Math.hypot(st.position[0] - pPos.x, st.position[2] - pPos.z);
      if (dist <= radius) {
        const dmg =
          this.activeAjian === 'AJIAN_BRAJAMUSTI'
            ? 85
            : this.activeAjian === 'AJIAN_SERIBU_BAYANGAN'
            ? 68
            : 55;
        const poiseDmg = this.activeAjian === 'AJIAN_BRAJAMUSTI' ? 160 : 95;
        entities.attackEntity(id, dmg, pPos, true, 2, 1.6, poiseDmg);
        hitCount++;
      }
    });

    if (this.activeAjian === 'AJIAN_SERIBU_BAYANGAN') {
      stats.stamina = Math.min(stats.maxStamina, stats.stamina + 65);
    } else if (this.activeAjian === 'AJIAN_PANCASONA') {
      stats.health = Math.min(stats.maxHealth, stats.health + 75);
      stats.stamina = stats.maxStamina;
      PoiseSystem.resetPlayerPoise();
    }

    NotificationManager.push({
      title: `⚡ ${ajianDef.name.toUpperCase()} DILEPASKAN!`,
      message:
        hitCount > 0
          ? `Mengguncang ${hitCount} target di sekitar dengan gelombang Tenaga Dalam Nusantara!`
          : `${ajianDef.description}`,
      priority: 'CRITICAL',
      colorTheme: 'amber',
      durationMs: 3600,
    });

    return true;
  }

  private static spawnShockwaveRing(origin: THREE.Vector3, colorHex: number, maxScale: number): void {
    this.getOrCreateRootGroup();
    const geo = new THREE.RingGeometry(0.4, 0.85, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(origin.x, origin.y + 0.15, origin.z);
    this.rootGroup!.add(mesh);
    this.shockwaves.push({
      mesh,
      life: 0,
      maxLife: 0.65,
      maxScale,
    });
  }

  // ============================================================================
  // PILAR 3: KINCIR AIR SUBAK 3D & OTOMASI PANEN SAWAH
  // ============================================================================
  public static deploySubakWaterwheel(
    world: VoxelWorld,
    playerOrPos: PlayerController | THREE.Vector3,
    audioOrFwd?: SoundSynthesizer | THREE.Vector3,
    particlesOrYaw?: ParticleManager | number,
    audioOpt?: SoundSynthesizer,
    particlesOpt?: ParticleManager
  ): SubakWaterwheelInstance {
    this.getOrCreateRootGroup();

    const isPlayerController = !(playerOrPos instanceof THREE.Vector3);
    const playerPos = isPlayerController ? (playerOrPos as PlayerController).position : (playerOrPos as THREE.Vector3);
    const forwardDir = isPlayerController
      ? (playerOrPos as PlayerController).getForwardVector()
      : (audioOrFwd as THREE.Vector3) || new THREE.Vector3(0, 0, -1);
    const yaw = isPlayerController ? (playerOrPos as PlayerController).yaw : Number(particlesOrYaw || 0);
    const audio = (isPlayerController ? audioOrFwd : audioOpt) as SoundSynthesizer | undefined;
    const particles = (isPlayerController ? particlesOrYaw : particlesOpt) as ParticleManager | undefined;

    const tx = Math.floor(playerPos.x + forwardDir.x * 4.5);
    const tz = Math.floor(playerPos.z + forwardDir.z * 4.5);
    const ty = world.getSpawnHeight(tx, tz);

    // Irrigate & plant a neat 5x5 terraced Subak rice/wheat patch around the waterwheel
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const bx = tx + dx;
        const bz = tz + dz;
        const by = world.getSpawnHeight(bx, bz) - 1;
        if (dx === 0 && dz === 0) {
          world.setBlock(bx, by, bz, BlockType.WATER);
        } else if (Math.abs(dx) <= 2 && Math.abs(dz) <= 2) {
          world.setBlock(bx, by, bz, BlockType.FARMLAND);
          world.setBlock(bx, by + 1, bz, BlockType.CROP_WHEAT_3);
        }
      }
    }

    const { group, wheelGroup } = this.buildSubakWaterwheelMesh();
    group.position.set(tx + 0.5, ty, tz + 0.5);
    group.rotation.y = yaw;
    this.rootGroup!.add(group);

    const instance: SubakWaterwheelInstance = {
      id: `subak_${Date.now()}_${this.subakWheels.length}`,
      position: new THREE.Vector3(tx + 0.5, ty, tz + 0.5),
      group,
      wheelGroup,
      harvestTimer: 0,
      totalHarvested: 0,
    };
    this.subakWheels.push(instance);

    audio?.playBlockPlace();
    if (particles) {
      particles.spawnWaterSplash(new THREE.Vector3(tx + 0.5, ty + 1.0, tz + 0.5));
    }

    NotificationManager.push({
      title: '🌾 Kincir Air Subak 3D Beroperasi!',
      message:
        'Saluran Talang Bambu aktif! Mengairi petak sawah dan memanen Beras Wangi & Gandum secara otomatis setiap 8 detik.',
      priority: 'HIGH',
      colorTheme: 'emerald',
      durationMs: 4000,
    });

    return instance;
  }

  private static buildSubakWaterwheelMesh(): { group: THREE.Group; wheelGroup: THREE.Group } {
    const group = new THREE.Group();

    const teakMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.82,
      metalness: 0.08,
    });
    const bambooMat = new THREE.MeshStandardMaterial({
      color: 0xa3e635,
      roughness: 0.65,
      metalness: 0.05,
    });
    const goldAccentMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      metalness: 0.75,
    });
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.82,
    });

    // 1. Stone & Teak Support A-Frame Pillars
    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.8, 0.28), teakMat);
    postL.position.set(-0.65, 1.4, 0);
    group.add(postL);

    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.8, 0.28), teakMat);
    postR.position.set(0.65, 1.4, 0);
    group.add(postR);

    // 2. Bamboo Aqueduct Trough (Talang Air Bambu)
    const trough = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.22, 2.8), bambooMat);
    trough.position.set(0.95, 2.25, 0.8);
    group.add(trough);

    const waterStream = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 2.75), waterMat);
    waterStream.position.set(0.95, 2.34, 0.8);
    group.add(waterStream);

    // 3. Rotating Waterwheel Assembly
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(0, 1.65, 0);

    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.6, 10), goldAccentMat);
    axle.rotation.z = Math.PI / 2;
    wheelGroup.add(axle);

    const spokeCount = 8;
    for (let i = 0; i < spokeCount; i++) {
      const angle = (Math.PI * 2 * i) / spokeCount;
      const spokePivot = new THREE.Group();
      spokePivot.rotation.x = angle;

      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.1, 0.1), teakMat);
      spoke.position.set(0, 0.75, 0);
      spokePivot.add(spoke);

      // Bamboo water bucket paddle at tip
      const paddle = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.26, 0.26), bambooMat);
      paddle.position.set(0, 1.42, 0);
      spokePivot.add(paddle);

      wheelGroup.add(spokePivot);
    }

    group.add(wheelGroup);
    return { group, wheelGroup };
  }

  // ============================================================================
  // PILAR 4: PASAR MALAM DESA & PANGGUNG KELIR WAYANG KULIT 3D
  // ============================================================================
  public static deployWayangStageAndNightMarket(
    world: VoxelWorld,
    playerOrPos: PlayerController | THREE.Vector3,
    audioOrFwd?: SoundSynthesizer | THREE.Vector3,
    particlesOrYaw?: ParticleManager | number,
    statsOrAudio?: PlayerStats | SoundSynthesizer,
    particlesOpt?: ParticleManager
  ): WayangStageInstance {
    this.getOrCreateRootGroup();

    const isPlayerController = !(playerOrPos instanceof THREE.Vector3);
    const playerPos = isPlayerController ? (playerOrPos as PlayerController).position : (playerOrPos as THREE.Vector3);
    const forwardDir = isPlayerController
      ? (playerOrPos as PlayerController).getForwardVector()
      : (audioOrFwd as THREE.Vector3) || new THREE.Vector3(0, 0, -1);
    const yaw = isPlayerController ? (playerOrPos as PlayerController).yaw : Number(particlesOrYaw || 0);
    const audio = (isPlayerController ? audioOrFwd : statsOrAudio) as SoundSynthesizer | undefined;
    const particles = (isPlayerController ? particlesOrYaw : particlesOpt) as ParticleManager | undefined;
    const stats = isPlayerController ? (statsOrAudio as PlayerStats | undefined) : undefined;

    const sx = Math.floor(playerPos.x + forwardDir.x * 5.5);
    const sz = Math.floor(playerPos.z + forwardDir.z * 5.5);
    const sy = world.getSpawnHeight(sx, sz);

    const built = this.buildWayangStageMesh();
    built.group.position.set(sx + 0.5, sy, sz + 0.5);
    built.group.rotation.y = yaw + Math.PI; // Face the player
    this.rootGroup!.add(built.group);

    const instance: WayangStageInstance = {
      id: `wayang_${Date.now()}`,
      position: new THREE.Vector3(sx + 0.5, sy, sz + 0.5),
      ...built,
      animTime: 0,
    };
    this.wayangStages.push(instance);

    if (stats && typeof stats.addXP === 'function') {
      stats.addXP(60);
    }

    // Automatically activate default Lakon blessing if none active
    if (!this.activeLakon) {
      this.activateWayangLakon('LAKON_GATOTKACA', audio, stats, particles, playerPos);
    } else {
      audio?.playAncientGong();
    }

    return instance;
  }

  public static activateWayangLakon(
    lakonId: WayangLakonId,
    audio?: SoundSynthesizer,
    statsOrParticles?: PlayerStats | ParticleManager,
    particlesOrPos?: ParticleManager | THREE.Vector3,
    playerPosOpt?: THREE.Vector3
  ): WayangLakonDef {
    const def = WAYANG_LAKONS[lakonId];
    this.activeLakon = lakonId;
    this.lakonTimerRemaining = def.durationSeconds;

    audio?.playAncientGong();
    audio?.playGamelanSaron(4);

    const particles =
      statsOrParticles instanceof ParticleManager
        ? statsOrParticles
        : particlesOrPos instanceof ParticleManager
        ? particlesOrPos
        : undefined;
    const playerPos =
      playerPosOpt || (particlesOrPos instanceof THREE.Vector3 ? particlesOrPos : undefined);

    if (particles && playerPos) {
      particles.emitBlockBreak(playerPos.clone().add(new THREE.Vector3(0, 1.2, 0)), '#fbbf24', 'crystal');
    }

    NotificationManager.push({
      title: `🎭 ${def.name}`,
      message: `"${def.dalangQuote}" · Berkah: ${def.blessingDesc}`,
      priority: 'HIGH',
      colorTheme: 'amber',
      durationMs: 4500,
    });

    return def;
  }

  private static buildWayangStageMesh(): {
    group: THREE.Group;
    puppetLeft: THREE.Group;
    puppetRight: THREE.Group;
    gununganCenter: THREE.Group;
    blencongLight: THREE.PointLight;
  } {
    const group = new THREE.Group();

    const carvedTeakMat = new THREE.MeshStandardMaterial({
      color: 0x5c2d0c,
      roughness: 0.75,
      metalness: 0.12,
    });
    const goldPradaMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.82,
    });
    const kelirScreenMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.4,
      metalness: 0.05,
      emissive: 0xfde68a,
      emissiveIntensity: 0.55,
    });
    const shadowSilhouetteMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.9,
      metalness: 0.1,
    });

    // 1. Stage Platform Base (Gedebog Pisang & Panggung Jati)
    const base = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.65, 1.6), carvedTeakMat);
    base.position.set(0, 0.32, 0);
    group.add(base);

    // 2. White Backlit Kelir Screen
    const screen = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.3, 0.12), kelirScreenMat);
    screen.position.set(0, 1.8, 0);
    group.add(screen);

    // 3. Ornate Top & Side Teak-Gold Frame
    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.38, 0.38), goldPradaMat);
    topBeam.position.set(0, 3.05, 0);
    group.add(topBeam);

    const pillarL = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.1, 0.32), carvedTeakMat);
    pillarL.position.set(-2.05, 1.55, 0);
    group.add(pillarL);

    const pillarR = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.1, 0.32), carvedTeakMat);
    pillarR.position.set(2.05, 1.55, 0);
    group.add(pillarR);

    // 4. Center Gunungan Kayon Silhouette
    const gununganCenter = new THREE.Group();
    const gununganBody = new THREE.Mesh(new THREE.ConeGeometry(0.48, 1.35, 4), goldPradaMat);
    gununganBody.scale.set(1, 1, 0.15);
    gununganCenter.add(gununganBody);
    gununganCenter.position.set(0, 1.65, 0.12);
    group.add(gununganCenter);

    // 5. Left Wayang Puppet (Raden Gatotkaca Silhouette)
    const puppetLeft = new THREE.Group();
    const pLeftTorso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.65, 0.08), shadowSilhouetteMat);
    const pLeftCrown = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.1), goldPradaMat);
    pLeftCrown.position.set(0, 0.44, 0);
    puppetLeft.add(pLeftTorso, pLeftCrown);
    puppetLeft.position.set(-1.05, 1.55, 0.12);
    group.add(puppetLeft);

    // 6. Right Wayang Puppet (Raksasa Buto Cakil Silhouette)
    const puppetRight = new THREE.Group();
    const pRightTorso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.78, 0.08), shadowSilhouetteMat);
    const pRightClub = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.55, 0.1), goldPradaMat);
    pRightClub.position.set(-0.28, 0.15, 0);
    pRightClub.rotation.z = 0.45;
    puppetRight.add(pRightTorso, pRightClub);
    puppetRight.position.set(1.05, 1.6, 0.12);
    group.add(puppetRight);

    // 7. Blencong Oil Lamp Warm PointLight
    const blencongLight = new THREE.PointLight(0xfbbf24, 2.2, 12);
    blencongLight.position.set(0, 2.4, 0.65);
    group.add(blencongLight);

    return { group, puppetLeft, puppetRight, gununganCenter, blencongLight };
  }

  // ============================================================================
  // PER-FRAME SIMULATION & ANIMATION UPDATE
  // ============================================================================
  public static update(
    dt: number,
    _world: VoxelWorld,
    _entities: EntityManager | undefined,
    player: PlayerController,
    particlesOrStats?: ParticleManager | PlayerStats,
    audio?: SoundSynthesizer,
    statsOrParticles?: PlayerStats | ParticleManager,
    addItemCallback?: (itemId: string, count: number) => void
  ): void {
    this.getOrCreateRootGroup();
    const particles =
      particlesOrStats instanceof ParticleManager
        ? particlesOrStats
        : statsOrParticles instanceof ParticleManager
        ? statsOrParticles
        : undefined;
    const stats =
      statsOrParticles instanceof PlayerStats
        ? statsOrParticles
        : particlesOrStats instanceof PlayerStats
        ? particlesOrStats
        : undefined;

    // 1. Update Silat Stance Aura Ring at Player Feet & Passive Tenaga Dalam
    this.auraPhase += dt * 3.2;
    this.addTenagaDalam(dt * 2.2); // Gentle passive meditation charge

    if (this.silatAuraRing) {
      this.silatAuraRing.position.set(player.position.x, player.position.y - 0.72, player.position.z);
      const pulse = 1.0 + Math.sin(this.auraPhase) * 0.06;
      this.silatAuraRing.scale.set(pulse, pulse, 1);
      this.silatAuraRing.rotation.z += dt * 0.8;
    }

    // 2. Update Active Ajian 3D Shockwave Rings
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life += dt;
      const t = Math.min(1, sw.life / sw.maxLife);
      const scale = 1 + t * sw.maxScale;
      sw.mesh.scale.set(scale, scale, 1);
      if (sw.mesh.material instanceof THREE.MeshBasicMaterial) {
        sw.mesh.material.opacity = (1 - t) * 0.85;
      }
      if (sw.life >= sw.maxLife) {
        this.rootGroup?.remove(sw.mesh);
        sw.mesh.geometry.dispose();
        if (sw.mesh.material instanceof THREE.Material) sw.mesh.material.dispose();
        this.shockwaves.splice(i, 1);
      }
    }

    // 3. Update Underground Sanctum Swinging Pendulum Traps
    if (this.trapDamageCooldown > 0) {
      this.trapDamageCooldown = Math.max(0, this.trapDamageCooldown - dt);
    }
    for (const trap of this.sanctumTraps) {
      trap.phase += dt * 2.6;
      const swingAngle = Math.sin(trap.phase) * 0.85;
      trap.pendulumPivot.rotation.z = swingAngle;

      // Check blade tip collision with player
      const bladeX = trap.origin.x + Math.sin(swingAngle) * 3.0;
      const bladeY = trap.origin.y + (1 - Math.cos(swingAngle)) * 1.2;
      const bladeZ = trap.origin.z;

      const distToPlayer = Math.hypot(player.position.x - bladeX, player.position.z - bladeZ);
      const dy = Math.abs(player.position.y - bladeY);
      if (distToPlayer < 1.35 && dy < 1.8 && this.trapDamageCooldown <= 0 && !player.isDodging) {
        this.trapDamageCooldown = 1.1;
        stats?.takeDamage(16, 'Bilah Ayun Candi Kala');
        player.applyDamageFeedback();
        player.applyScreenShake(0.45);
        audio?.playDamage();
      }
    }

    // 4. Update Subak 3D Waterwheels & Automated Crop Harvest Pipeline
    const harvestMult = this.activeLakon === 'LAKON_SRI_SEDANA' ? 2 : 1;
    for (const wheel of this.subakWheels) {
      const distSqToWheel =
        (player.position.x - wheel.position.x) * (player.position.x - wheel.position.x) +
        (player.position.z - wheel.position.z) * (player.position.z - wheel.position.z);
      if (distSqToWheel < 95 * 95) {
        wheel.wheelGroup.rotation.x += dt * 1.35;
      }
      if (particles && distSqToWheel < 42 * 42 && Math.random() < dt * 3.5) {
        particles.spawnWaterFoamSpray(wheel.position);
      }
      wheel.harvestTimer += dt;

      if (wheel.harvestTimer >= 8.0) {
        wheel.harvestTimer = 0;
        const berasYield = 2 * harvestMult;
        const wheatYield = 2 * harvestMult;
        wheel.totalHarvested += berasYield + wheatYield;
        this.totalSubakHarvested += berasYield + wheatYield;

        if (addItemCallback) {
          addItemCallback('beras_wangi', berasYield);
          addItemCallback('crop_wheat', wheatYield);
        }
        if (particles && distSqToWheel < 55 * 55) {
          particles.spawnWaterFoamSpray(wheel.position);
        }
        NotificationManager.push({
          title: '🌾 Panen Otomatis Kincir Subak',
          message: `Saluran Subak menyalurkan +${berasYield} Beras Wangi & +${wheatYield} Gandum ke perbekalan!`,
          priority: 'LOW',
          colorTheme: 'emerald',
          durationMs: 2400,
        });
      }
    }

    // 5. Update 3D Wayang Kulit Stage Puppet Choreography & Active Lakon Buffs
    for (const stg of this.wayangStages) {
      stg.animTime += dt * 3.5;
      stg.puppetLeft.position.x = -0.95 + Math.sin(stg.animTime) * 0.32;
      stg.puppetLeft.position.y = 1.55 + Math.abs(Math.cos(stg.animTime * 1.5)) * 0.14;
      stg.puppetLeft.rotation.z = Math.sin(stg.animTime * 2) * 0.18;

      stg.puppetRight.position.x = 0.95 - Math.sin(stg.animTime + 0.6) * 0.32;
      stg.puppetRight.position.y = 1.6 + Math.abs(Math.sin(stg.animTime * 1.5)) * 0.14;
      stg.puppetRight.rotation.z = -Math.sin(stg.animTime * 2) * 0.18;

      stg.gununganCenter.rotation.z = Math.sin(stg.animTime * 0.5) * 0.08;
      stg.blencongLight.intensity = 2.0 + Math.sin(stg.animTime * 4.2) * 0.35;
    }

    if (this.activeLakon && this.lakonTimerRemaining > 0) {
      this.lakonTimerRemaining = Math.max(0, this.lakonTimerRemaining - dt);
      this.lakonRegenTick += dt;
      if (this.lakonRegenTick >= 2.0) {
        this.lakonRegenTick = 0;
        if (stats && this.activeLakon === 'LAKON_DEWA_RUCI') {
          stats.health = Math.min(stats.maxHealth, stats.health + 4);
        } else if (stats && this.activeLakon === 'LAKON_SRI_SEDANA') {
          stats.hunger = Math.min(stats.maxHunger, stats.hunger + 3);
        }
      }
      if (this.lakonTimerRemaining <= 0) {
        this.activeLakon = null;
      }
    }
  }

  public static getTelemetry(entities?: EntityManager) {
    const stanceDef = SILAT_STANCES[this.activeStance];
    const ajianDef = AJIAN_ULTIMATES[this.activeAjian];
    const lakonDef = this.activeLakon ? WAYANG_LAKONS[this.activeLakon] : null;

    let sanctumBossAlive = false;
    if (entities) {
      entities.entities.forEach((ent) => {
        if (ent.state.modelType === 'buto_ijo_colossus' && ent.state.health > 0) {
          sanctumBossAlive = true;
        }
      });
    }

    return {
      stanceId: this.activeStance,
      stanceName: stanceDef.name,
      stanceSubtitle: stanceDef.subtitle,
      stanceIcon: this.activeStance === 'HARIMAU' ? '🐅' : this.activeStance === 'BANGAU' ? '🦢' : '🐉',
      stanceColor: stanceDef.colorHex,
      stanceBonusText: stanceDef.subtitle,
      tenagaDalam: Math.round(this.tenagaDalam),
      ajianId: this.activeAjian,
      ajianName: ajianDef.name,
      ajianIcon:
        this.activeAjian === 'AJIAN_BRAJAMUSTI'
          ? '⚡'
          : this.activeAjian === 'AJIAN_SERIBU_BAYANGAN'
          ? '🌪️'
          : '🌿',
      ajianReady: this.tenagaDalam >= 100,
      subakWheelCount: this.subakWheels.length,
      subakTotalHarvested: this.totalSubakHarvested,
      totalSubakHarvested: this.totalSubakHarvested,
      wayangStageCount: this.wayangStages.length,
      wayangActive: this.wayangStages.length > 0 && this.activeLakon !== null && this.lakonTimerRemaining > 0,
      wayangLakonId: (this.activeLakon || 'LAKON_GATOTKACA') as WayangLakonId,
      wayangLakonName: lakonDef?.name || 'Panggung Siap Pentas',
      wayangLakonIcon:
        this.activeLakon === 'LAKON_SRI_SEDANA'
          ? '🌾'
          : this.activeLakon === 'LAKON_DEWA_RUCI'
          ? '🌊'
          : '⚡',
      wayangLakonTimer: Math.ceil(this.lakonTimerRemaining),
      activeLakonName: lakonDef?.name || null,
      activeLakonBlessing: lakonDef?.blessingDesc || null,
      lakonTimerRemaining: Math.ceil(this.lakonTimerRemaining),
      sanctumsExcavated: this.sanctumsExcavated,
      sanctumActive: this.sanctumsExcavated > 0,
      sanctumCenter: this.lastSanctumPos,
      sanctumBossAlive,
    };
  }

  public static serialize(): Record<string, any> {
    return {
      activeStance: this.activeStance,
      activeAjian: this.activeAjian,
      tenagaDalam: Math.round(this.tenagaDalam),
      activeLakon: this.activeLakon,
      lakonTimerRemaining: Math.round(this.lakonTimerRemaining),
      totalSubakHarvested: this.totalSubakHarvested,
      sanctumsExcavated: this.sanctumsExcavated,
      lastSanctumPos: this.lastSanctumPos,
      subakWheelPositions: this.subakWheels.map((w) => ({
        x: w.position.x,
        y: w.position.y,
        z: w.position.z,
        rotY: w.group.rotation.y,
        totalHarvested: w.totalHarvested,
      })),
      wayangStagePositions: this.wayangStages.map((s) => ({
        x: s.position.x,
        y: s.position.y,
        z: s.position.z,
        rotY: s.group.rotation.y,
      })),
    };
  }

  public static deserialize(data?: Record<string, any> | null): void {
    this.reset();
    const root = this.getOrCreateRootGroup();
    if (!data || typeof data !== 'object') return;

    if (data.activeStance && SILAT_STANCES[data.activeStance as SilatStanceId]) {
      this.activeStance = data.activeStance as SilatStanceId;
      if (this.silatAuraRing && this.silatAuraRing.material instanceof THREE.MeshBasicMaterial) {
        this.silatAuraRing.material.color.setHex(SILAT_STANCES[this.activeStance].colorInt);
      }
    }
    if (data.activeAjian && AJIAN_ULTIMATES[data.activeAjian as AjianUltimateId]) {
      this.activeAjian = data.activeAjian as AjianUltimateId;
    }
    if (typeof data.tenagaDalam === 'number') {
      this.tenagaDalam = Math.max(0, Math.min(100, data.tenagaDalam));
    }
    if (data.activeLakon && WAYANG_LAKONS[data.activeLakon as WayangLakonId]) {
      this.activeLakon = data.activeLakon as WayangLakonId;
      this.lakonTimerRemaining = typeof data.lakonTimerRemaining === 'number' ? Math.max(0, data.lakonTimerRemaining) : 0;
    }
    if (typeof data.totalSubakHarvested === 'number') {
      this.totalSubakHarvested = Math.max(0, data.totalSubakHarvested);
    }
    if (typeof data.sanctumsExcavated === 'number') {
      this.sanctumsExcavated = Math.max(0, data.sanctumsExcavated);
    }
    if (Array.isArray(data.lastSanctumPos) && data.lastSanctumPos.length === 3) {
      this.lastSanctumPos = [
        Number(data.lastSanctumPos[0]),
        Number(data.lastSanctumPos[1]),
        Number(data.lastSanctumPos[2]),
      ];
    }

    if (Array.isArray(data.subakWheelPositions)) {
      for (const item of data.subakWheelPositions) {
        if (!item || typeof item.x !== 'number') continue;
        const { group, wheelGroup } = this.buildSubakWaterwheelMesh();
        group.position.set(item.x, item.y, item.z);
        group.rotation.y = typeof item.rotY === 'number' ? item.rotY : 0;
        root.add(group);
        this.subakWheels.push({
          id: `subak_restored_${this.subakWheels.length}`,
          position: new THREE.Vector3(item.x, item.y, item.z),
          group,
          wheelGroup,
          harvestTimer: 0,
          totalHarvested: typeof item.totalHarvested === 'number' ? item.totalHarvested : 0,
        });
      }
    }

    if (Array.isArray(data.wayangStagePositions)) {
      for (const item of data.wayangStagePositions) {
        if (!item || typeof item.x !== 'number') continue;
        const built = this.buildWayangStageMesh();
        built.group.position.set(item.x, item.y, item.z);
        built.group.rotation.y = typeof item.rotY === 'number' ? item.rotY : 0;
        root.add(built.group);
        this.wayangStages.push({
          id: `wayang_restored_${this.wayangStages.length}`,
          position: new THREE.Vector3(item.x, item.y, item.z),
          ...built,
          animTime: 0,
        });
      }
    }
  }

  public static reset(): void {
    this.sanctumTraps = [];
    this.subakWheels = [];
    this.wayangStages = [];
    this.shockwaves = [];
    this.activeLakon = null;
    this.lakonTimerRemaining = 0;
    this.tenagaDalam = 100;
    if (this.rootGroup) {
      this.rootGroup.clear();
      this.rootGroup = null;
      this.silatAuraRing = null;
    }
  }
}
