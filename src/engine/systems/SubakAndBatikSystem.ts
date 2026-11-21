// VoxelVerse v6.0.0: Ekologi & Rekayasa Tradisional Nusantara 2.0
// 1. Subak 2.0: Talang Bambu, Pintu Air Kayu Jati, Aliran Air Voxel Terasering & Lesung Padi Otomatis 3D
// 2. Studio Batik Tulis & Canting (16x16 Pixel Pattern Canvas -> Live 3D Texture untuk Jubah, Layar Phinisi & Panji Desa)
// 3. Ekspedisi Gua Karst Maros-Pangkep: Stalaktit Tirta Marta & Lukisan Cadas Purba Bercahaya (Bioluminescent)

import * as THREE from 'three';
import { BlockType } from '../../types';
import { VoxelWorld } from '../world/VoxelWorld';
import { SoundSynthesizer } from '../audio/SoundSynthesizer';
import { ParticleManager } from '../environment/ParticleManager';
import { NotificationManager } from '../ui/NotificationManager';

export type BatikPresetId = 'PARANG_RUSAK' | 'MEGAMENDUNG' | 'KAWUNG_MATARAM' | 'TRUNTUM';

export interface SubakSluiceGate {
  id: string;
  position: [number, number, number];
  isOpen: boolean;
  hydratedBlocks: number;
  lastFlowTick: number;
}

export interface LesungPadiUnit {
  id: string;
  position: [number, number, number];
  grainProcessed: number;
  phase: number;
  meshGroup?: THREE.Group;
  pestlePivot?: THREE.Object3D;
}

export interface SubakBatikTelemetry {
  sluiceGateCount: number;
  openSluiceCount: number;
  lesungCount: number;
  totalRiceMilled: number;
  activeBatikPreset: BatikPresetId;
  activeBatikBannerCount: number;
  karstCaveDiscovered: boolean;
  karstCavePos: [number, number, number] | null;
}

const BATIK_STORAGE_KEY = 'voxelverse_custom_batik_grid_v6';

export const BATIK_PALETTE: string[] = [
  '#1c1917', // Hitam Soga Tua
  '#78350f', // Cokelat Soga Jawa
  '#d97706', // Emas Kencana
  '#fef3c7', // Krem Mori
  '#0284c7', // Biru Megamendung
  '#1e3a8a', // Indigo Nila
  '#b91c1c', // Merah Kesumba
  '#059669', // Hijau Zamrud
];

export class SubakAndBatikSystem {
  private static rootGroup: THREE.Group = new THREE.Group();
  private static isAttached = false;

  public static sluiceGates: SubakSluiceGate[] = [];
  public static lesungUnits: LesungPadiUnit[] = [];
  public static totalRiceMilled = 0;

  // 16x16 Batik Grid (256 hex color strings)
  public static activePreset: BatikPresetId = 'PARANG_RUSAK';
  public static batikGrid: string[] = SubakAndBatikSystem.loadOrCreateBatikGrid();
  public static batikTexture: THREE.CanvasTexture | null = null;
  private static batikBanners: THREE.Group[] = [];

  // Karst Cave state
  public static karstCavePos: [number, number, number] | null = null;
  private static karstDecorGroup: THREE.Group = new THREE.Group();

  private static flowAccumulator = 0;
  private static lesungSoundAccumulator = 0;

  public static attachToScene(scene: THREE.Scene): void {
    if (this.isAttached) return;
    this.rootGroup.name = 'SubakAndBatikRootV6';
    this.rootGroup.add(this.karstDecorGroup);
    scene.add(this.rootGroup);
    this.isAttached = true;
  }

  public static reset(): void {
    for (const unit of this.lesungUnits) {
      if (unit.meshGroup) this.rootGroup.remove(unit.meshGroup);
    }
    for (const banner of this.batikBanners) {
      this.rootGroup.remove(banner);
    }
    this.karstDecorGroup.clear();
    this.sluiceGates = [];
    this.lesungUnits = [];
    this.batikBanners = [];
    this.karstCavePos = null;
    this.totalRiceMilled = 0;
  }

  // ==================== 1. SUBAK 2.0: TALANG BAMBU, PINTU AIR & LESUNG OTOMATIS ====================

  public static buildSubakAqueductAndSluice(
    world: VoxelWorld,
    origin: [number, number, number],
    audio?: SoundSynthesizer,
    particles?: ParticleManager
  ): SubakSluiceGate {
    const ox = Math.floor(origin[0]);
    const oy = Math.floor(origin[1]);
    const oz = Math.floor(origin[2]);

    // Build Teak Sluice Gate frame + 5-block Bamboo Aqueduct channel stepping down a terrace
    world.setBlock(ox - 1, oy, oz, BlockType.CARVED_WOOD_BEAM);
    world.setBlock(ox + 1, oy, oz, BlockType.CARVED_WOOD_BEAM);
    world.setBlock(ox - 1, oy + 1, oz, BlockType.CARVED_WOOD_BEAM);
    world.setBlock(ox + 1, oy + 1, oz, BlockType.CARVED_WOOD_BEAM);
    world.setBlock(ox, oy + 1, oz, BlockType.TEAK_WOOD_PLANKS);

    // Water source reservoir behind gate
    world.setBlock(ox, oy, oz - 1, BlockType.WATER);

    // Stepped bamboo/plank aqueduct channels
    for (let step = 1; step <= 5; step++) {
      const yDrop = step >= 3 ? -1 : 0;
      const ty = oy + yDrop;
      const tz = oz + step;
      world.setBlock(ox - 1, ty, tz, BlockType.WOOD_PLANKS);
      world.setBlock(ox + 1, ty, tz, BlockType.WOOD_PLANKS);
      world.setBlock(ox, ty - 1, tz, BlockType.WOOD_PLANKS);
      world.setBlock(ox, ty, tz, BlockType.WATER);
      // Hydrate adjacent terrace soil
      world.setBlock(ox - 2, ty - 1, tz, BlockType.DIRT);
      world.setBlock(ox + 2, ty - 1, tz, BlockType.DIRT);
    }

    const gate: SubakSluiceGate = {
      id: `sluice_${Date.now()}_${this.sluiceGates.length}`,
      position: [ox, oy, oz],
      isOpen: true,
      hydratedBlocks: 10,
      lastFlowTick: Date.now(),
    };
    this.sluiceGates.push(gate);

    audio?.playGamelanSaron(2);
    particles?.emitBlockBreak(new THREE.Vector3(ox, oy + 1, oz), '#38bdf8', 'water');
    NotificationManager.push({
      title: '🎋 Talang Bambu & Pintu Air Subak Terpasang!',
      message: `Aliran irigasi terasering aktif di [${ox}, ${oy}, ${oz}], menyuburkan sawah sekitar.`,
      priority: 'HIGH',
      colorTheme: 'cyan',
      durationMs: 3600,
    });

    return gate;
  }

  public static toggleAllSluiceGates(world?: VoxelWorld, audio?: SoundSynthesizer): boolean {
    if (this.sluiceGates.length === 0) return false;
    const nextState = !this.sluiceGates[0].isOpen;
    for (const gate of this.sluiceGates) {
      gate.isOpen = nextState;
      if (world) {
        const [gx, gy, gz] = gate.position;
        world.setBlock(gx, gy, gz, nextState ? BlockType.WATER : BlockType.TEAK_WOOD_PLANKS);
      }
    }
    audio?.playGamelanSaron(nextState ? 4 : 1);
    NotificationManager.push({
      title: nextState ? '🌊 Pintu Air Subak Dibuka' : '🪵 Pintu Air Subak Ditutup',
      message: nextState
        ? 'Air pegunungan mengalir deras ke seluruh terasering & menggerakkan Lesung Padi!'
        : 'Aliran air ditahan sementara di bendungan hulu.',
      priority: 'NORMAL',
      colorTheme: 'cyan',
      durationMs: 2600,
    });
    return nextState;
  }

  public static spawnLesungPadiOtomatis(
    origin: [number, number, number],
    audio?: SoundSynthesizer
  ): LesungPadiUnit {
    const ox = Math.floor(origin[0]) + 2;
    const oy = Math.floor(origin[1]);
    const oz = Math.floor(origin[2]) + 1;

    const group = new THREE.Group();
    group.position.set(ox + 0.5, oy, oz + 0.5);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.78 });
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0xa3e635, roughness: 0.6 });
    const riceMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.5 });

    // Wooden mortar trough (Lesung)
    const trough = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.7), woodMat);
    trough.position.set(0, 0.25, 0);
    group.add(trough);

    // Golden rice mound inside trough
    const rice = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.15, 0.42), riceMat);
    rice.position.set(0, 0.48, 0);
    group.add(rice);

    // Support post for water-driven seesaw pestle
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.9, 0.18), woodMat);
    post.position.set(0.7, 0.45, 0);
    group.add(post);

    // Animated seesaw pestle arm
    const pestlePivot = new THREE.Group();
    pestlePivot.position.set(0.7, 0.85, 0);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.12), bambooMat);
    arm.position.set(-0.2, 0, 0);
    pestlePivot.add(arm);

    const pounderHead = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.55, 8), woodMat);
    pounderHead.position.set(-0.85, -0.25, 0);
    pestlePivot.add(pounderHead);

    group.add(pestlePivot);
    this.rootGroup.add(group);

    const unit: LesungPadiUnit = {
      id: `lesung_${Date.now()}_${this.lesungUnits.length}`,
      position: [ox, oy, oz],
      grainProcessed: 0,
      phase: 0,
      meshGroup: group,
      pestlePivot,
    };
    this.lesungUnits.push(unit);

    audio?.playGamelanSaron(3);
    NotificationManager.push({
      title: '🌾 Lesung Penumbuk Padi Otomatis Berdiri!',
      message: 'Digerakkan tenaga air Subak, menumbuk gabah menjadi beras Nusantara secara berkala.',
      priority: 'HIGH',
      colorTheme: 'amber',
      durationMs: 3200,
    });

    return unit;
  }

  /**
   * Bounded cellular-automata water trickle for active open Subak sluice gates
   */
  public static stepSubakWaterFlow(world: VoxelWorld): number {
    let flowed = 0;
    for (const gate of this.sluiceGates) {
      if (!gate.isOpen) continue;
      const [gx, gy, gz] = gate.position;
      // Check terrace points downstream and hydrate dry air channels along the aqueduct
      for (let step = 1; step <= 6; step++) {
        const yOff = step >= 3 ? -1 : 0;
        const bx = gx;
        const by = gy + yOff;
        const bz = gz + step;
        const cur = world.getBlock(bx, by, bz);
        if (cur === BlockType.AIR) {
          world.setBlock(bx, by, bz, BlockType.WATER);
          gate.hydratedBlocks++;
          flowed++;
          break; // 1 block spread per tick per gate for smooth cascading visual
        }
      }
      gate.lastFlowTick = Date.now();
    }
    return flowed;
  }

  // ==================== 2. STUDIO BATIK TULIS & CANTING (16x16 LIVE TEXTURE) ====================

  public static generateBatikPreset(preset: BatikPresetId): string[] {
    const grid: string[] = new Array(256).fill('#fef3c7');
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const idx = y * 16 + x;
        if (preset === 'PARANG_RUSAK') {
          const diag = (x + y) % 8;
          if (diag === 0 || diag === 1) grid[idx] = '#78350f';
          else if (diag === 2) grid[idx] = '#d97706';
          else if (diag === 4 || diag === 5) grid[idx] = '#1c1917';
          else grid[idx] = '#fef3c7';
        } else if (preset === 'MEGAMENDUNG') {
          const wave = Math.floor(Math.sin(x * 0.65) * 2.2 + y) % 8;
          const w = (wave + 8) % 8;
          if (w <= 1) grid[idx] = '#1e3a8a';
          else if (w <= 3) grid[idx] = '#0284c7';
          else if (w === 4) grid[idx] = '#fef3c7';
          else grid[idx] = '#b91c1c';
        } else if (preset === 'KAWUNG_MATARAM') {
          const cx = (x % 8) - 3.5;
          const cy = (y % 8) - 3.5;
          const dist = Math.sqrt(cx * cx + cy * cy);
          if (dist < 1.3) grid[idx] = '#d97706';
          else if (dist < 2.9) grid[idx] = '#fef3c7';
          else grid[idx] = '#78350f';
        } else {
          // TRUNTUM (starburst night blossoms)
          const sx = x % 4;
          const sy = y % 4;
          if (sx === 2 && sy === 2) grid[idx] = '#d97706';
          else if ((sx === 2 && (sy === 1 || sy === 3)) || (sy === 2 && (sx === 1 || sx === 3))) {
            grid[idx] = '#fef3c7';
          } else {
            grid[idx] = '#1c1917';
          }
        }
      }
    }
    return grid;
  }

  private static loadOrCreateBatikGrid(): string[] {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const raw = window.localStorage.getItem(BATIK_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length === 256) {
            return parsed;
          }
        }
      } catch {
        // Fallback to default preset
      }
    }
    return this.generateBatikPreset('PARANG_RUSAK');
  }

  private static saveBatikGrid(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(BATIK_STORAGE_KEY, JSON.stringify(this.batikGrid));
      } catch {
        // Ignore storage error
      }
    }
  }

  public static applyBatikPreset(preset: BatikPresetId): string[] {
    this.activePreset = preset;
    this.batikGrid = this.generateBatikPreset(preset);
    this.saveBatikGrid();
    this.refreshBatikTexture();
    return this.batikGrid;
  }

  public static paintBatikPixel(x: number, y: number, colorHex: string): void {
    if (x < 0 || x >= 16 || y < 0 || y >= 16) return;
    this.batikGrid[y * 16 + x] = colorHex;
    this.saveBatikGrid();
    this.refreshBatikTexture();
  }

  public static refreshBatikTexture(): THREE.CanvasTexture | null {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const cell = 8;
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        ctx.fillStyle = this.batikGrid[y * 16 + x] || '#fef3c7';
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }

    if (!this.batikTexture) {
      this.batikTexture = new THREE.CanvasTexture(canvas);
      this.batikTexture.magFilter = THREE.NearestFilter;
      this.batikTexture.minFilter = THREE.NearestFilter;
    } else {
      this.batikTexture.image = canvas;
      this.batikTexture.needsUpdate = true;
    }

    // Update all placed 3D Panji Batik Banners live
    for (const banner of this.batikBanners) {
      const cloth = banner.getObjectByName('BatikClothMesh') as THREE.Mesh | undefined;
      if (cloth && cloth.material instanceof THREE.MeshStandardMaterial) {
        cloth.material.map = this.batikTexture;
        cloth.material.needsUpdate = true;
      }
    }
    return this.batikTexture;
  }

  public static placeBatikBannerInWorld(
    origin: [number, number, number],
    audio?: SoundSynthesizer
  ): THREE.Group {
    const tex = this.refreshBatikTexture();
    const ox = Math.floor(origin[0]) + 1;
    const oy = Math.floor(origin[1]);
    const oz = Math.floor(origin[2]) - 1;

    const bannerGroup = new THREE.Group();
    bannerGroup.position.set(ox + 0.5, oy, oz + 0.5);

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.7, roughness: 0.25 });
    const clothMat = new THREE.MeshStandardMaterial({
      map: tex || undefined,
      color: 0xffffff,
      roughness: 0.75,
      side: THREE.DoubleSide,
    });

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.6, 8), poleMat);
    pole.position.y = 1.8;
    bannerGroup.add(pole);

    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.08), goldMat);
    crossbar.position.y = 3.35;
    bannerGroup.add(crossbar);

    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 2.0), clothMat);
    cloth.name = 'BatikClothMesh';
    cloth.position.set(0, 2.3, 0.08);
    bannerGroup.add(cloth);

    this.rootGroup.add(bannerGroup);
    this.batikBanners.push(bannerGroup);

    audio?.playGamelanSaron(5);
    NotificationManager.push({
      title: '🎨 Panji Batik Tulis Berkibar!',
      message: `Motif batik kustom (${this.activePreset}) kini terpajang megah di [${ox}, ${oy}, ${oz}].`,
      priority: 'HIGH',
      colorTheme: 'amber',
      durationMs: 3200,
    });

    return bannerGroup;
  }

  // ==================== 3. GUA KARST MAROS-PANGKEP & LUKISAN CADAS PURBA ====================

  public static summonKarstCaveExpedition(
    world: VoxelWorld,
    origin: [number, number, number],
    audio?: SoundSynthesizer,
    particles?: ParticleManager
  ): [number, number, number] {
    const cx = Math.floor(origin[0]) + 12;
    const cy = Math.max(24, Math.floor(origin[1]) - 8);
    const cz = Math.floor(origin[2]) + 12;

    // Carve an elliptical limestone karst cavern with a clear arched entrance & pool
    const rx = 6;
    const ry = 4;
    const rz = 6;
    for (let dx = -rx; dx <= rx; dx++) {
      for (let dy = -ry; dy <= ry; dy++) {
        for (let dz = -rz; dz <= rz; dz++) {
          const norm = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) + (dz * dz) / (rz * rz);
          if (norm <= 1.0) {
            if (dy === -ry) {
              world.setBlock(cx + dx, cy + dy, cz + dz, BlockType.WATER);
            } else {
              world.setBlock(cx + dx, cy + dy, cz + dz, BlockType.AIR);
            }
          } else if (norm <= 1.28) {
            world.setBlock(cx + dx, cy + dy, cz + dz, BlockType.STONE);
          }
        }
      }
    }

    // Add bioluminescent cave art crystal markers & stalactite 3D props
    this.karstDecorGroup.clear();
    const stalactiteMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.7 });
    const glowArtMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const sx = cx + Math.cos(ang) * 3.5;
      const sz = cz + Math.sin(ang) * 3.5;
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.5 + (i % 3) * 0.4, 6), stalactiteMat);
      cone.rotation.x = Math.PI;
      cone.position.set(sx, cy + ry - 0.6, sz);
      this.karstDecorGroup.add(cone);
    }

    // Prehistoric glowing Leang-Leang handprint rock art panels on cavern walls
    for (let j = 0; j < 4; j++) {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), glowArtMat);
      const ang = (j / 4) * Math.PI * 2 + 0.4;
      panel.position.set(cx + Math.cos(ang) * (rx - 0.3), cy, cz + Math.sin(ang) * (rz - 0.3));
      panel.lookAt(cx, cy, cz);
      this.karstDecorGroup.add(panel);
    }

    // Place a glowing coral/lantern centerpiece in the subterranean pool
    world.setBlock(cx, cy - ry + 1, cz, BlockType.LANTERN);

    this.karstCavePos = [cx, cy, cz];
    audio?.playAncientGong();
    particles?.emitBlockBreak(new THREE.Vector3(cx, cy, cz), '#38bdf8', 'crystal');

    NotificationManager.push({
      title: '🦇 Gua Karst Maros-Pangkep Terbuka!',
      message: `Gua kapur purba dengan stalaktit Tirta Marta & lukisan cadas bercahaya ditemukan di [${cx}, ${cy}, ${cz}]!`,
      priority: 'HIGH',
      colorTheme: 'cyan',
      durationMs: 4200,
    });

    return [cx, cy, cz];
  }

  public static update(dt: number, world?: VoxelWorld, audio?: SoundSynthesizer): void {
    const clampedDt = Math.min(dt, 0.1);

    // 1. Subak cellular-automata water flow tick (every 1.2s)
    if (world && this.sluiceGates.length > 0) {
      this.flowAccumulator += clampedDt;
      if (this.flowAccumulator >= 1.2) {
        this.flowAccumulator = 0;
        this.stepSubakWaterFlow(world);
      }
    }

    // 2. Animate Lesung Padi seesaw pounders when any sluice gate is open (or standalone)
    const hasWaterPower = this.sluiceGates.length === 0 || this.sluiceGates.some((g) => g.isOpen);
    if (this.lesungUnits.length > 0 && hasWaterPower) {
      this.lesungSoundAccumulator += clampedDt;
      for (const unit of this.lesungUnits) {
        unit.phase += clampedDt * 2.8;
        if (unit.pestlePivot) {
          unit.pestlePivot.rotation.z = Math.sin(unit.phase) * 0.28;
        }
        if (Math.sin(unit.phase) < -0.95 && this.lesungSoundAccumulator > 1.8) {
          unit.grainProcessed += 1;
          this.totalRiceMilled += 1;
          this.lesungSoundAccumulator = 0;
          audio?.playGamelanSaron(0);
        }
      }
    }

    // 3. Subtle wind sway on placed Batik banners
    const t = performance.now() * 0.002;
    for (let i = 0; i < this.batikBanners.length; i++) {
      const cloth = this.batikBanners[i].getObjectByName('BatikClothMesh');
      if (cloth) {
        cloth.rotation.y = Math.sin(t + i) * 0.12;
      }
    }
  }

  public static getTelemetry(): SubakBatikTelemetry {
    return {
      sluiceGateCount: this.sluiceGates.length,
      openSluiceCount: this.sluiceGates.filter((g) => g.isOpen).length,
      lesungCount: this.lesungUnits.length,
      totalRiceMilled: this.totalRiceMilled,
      activeBatikPreset: this.activePreset,
      activeBatikBannerCount: this.batikBanners.length,
      karstCaveDiscovered: this.karstCavePos !== null,
      karstCavePos: this.karstCavePos,
    };
  }
}
