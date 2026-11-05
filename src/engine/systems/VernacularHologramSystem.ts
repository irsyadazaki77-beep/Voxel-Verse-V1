// 3D Hologram Preview & Instant Vernacular Nusantara Structure Builder
// Projects a translucent 3D hologram in front of the player when holding 'lontar_arsitek_nusantara'
import * as THREE from 'three';
import { BlockType } from '../../types';
import { VoxelWorld } from '../world/VoxelWorld';
import { NotificationManager } from '../ui/NotificationManager';
import { SoundSynthesizer } from '../audio/SoundSynthesizer';
import { ParticleManager } from '../environment/ParticleManager';

export interface VernacularBlueprintTemplate {
  id: string;
  name: string;
  region: string;
  description: string;
  dimensions: [number, number, number];
  blocks: Array<{ dx: number; dy: number; dz: number; type: BlockType }>;
}

export class VernacularHologramSystem {
  public static hologramGroup: THREE.Group = new THREE.Group();
  public static activeTemplateIndex: number = 0;
  public static rotationSteps: number = 0; // 0, 1 (90°), 2 (180°), 3 (270°)
  public static currentAnchorPos: [number, number, number] | null = null;
  public static isVisible: boolean = false;

  private static previewMeshes: THREE.Mesh[] = [];
  private static boxGeo: THREE.BoxGeometry | null = null;
  private static holoMatPrimary: THREE.MeshBasicMaterial | null = null;
  private static holoMatAccent: THREE.MeshBasicMaterial | null = null;
  private static holoMatRoof: THREE.MeshBasicMaterial | null = null;
  private static wireframeMat: THREE.LineBasicMaterial | null = null;
  private static lastRebuiltKey: string = '';

  public static readonly TEMPLATES: VernacularBlueprintTemplate[] = [
    VernacularHologramSystem.createPendopoJogloTemplate(),
    VernacularHologramSystem.createLumbungTongkonanTemplate(),
    VernacularHologramSystem.createGapuraCandiBentarTemplate(),
    VernacularHologramSystem.createMenaraSuarBahariTemplate(),
  ];

  private static createPendopoJogloTemplate(): VernacularBlueprintTemplate {
    const blocks: Array<{ dx: number; dy: number; dz: number; type: BlockType }> = [];
    // 7x7 Andesite & Teak Foundation
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const isEdge = Math.abs(dx) === 3 || Math.abs(dz) === 3;
        blocks.push({
          dx,
          dy: 0,
          dz,
          type: isEdge ? BlockType.CARVED_ANDESITE_STONE : BlockType.TEAK_WOOD_PLANKS,
        });
      }
    }
    // 4 Soko Guru (Central Master Pillars) & 4 Corner Pillars
    const pillars = [
      [-1, -1], [1, -1], [-1, 1], [1, 1],
      [-3, -3], [3, -3], [-3, 3], [3, 3],
    ];
    for (const [px, pz] of pillars) {
      const maxH = Math.abs(px) === 1 ? 4 : 3;
      for (let dy = 1; dy <= maxH; dy++) {
        blocks.push({ dx: px, dy, dz: pz, type: BlockType.CARVED_WOOD_BEAM });
      }
    }
    // Lower Tiered Tajug/Joglo Roof
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        if (Math.abs(dx) >= 2 || Math.abs(dz) >= 2) {
          blocks.push({ dx, dy: 4, dz, type: BlockType.IJUK_THATCH_ROOF });
        }
      }
    }
    // Upper Tiered Joglo Crown
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        blocks.push({ dx, dy: 5, dz, type: BlockType.TERRACOTTA_ROOF_TILE });
      }
    }
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        blocks.push({ dx, dy: 6, dz, type: BlockType.TERRACOTTA_ROOF_TILE });
      }
    }
    // Center Lantern & Crafting/Storage Amenities
    blocks.push({ dx: 0, dy: 3, dz: 0, type: BlockType.LANTERN });
    blocks.push({ dx: 0, dy: 1, dz: -2, type: BlockType.CHEST });
    blocks.push({ dx: 2, dy: 1, dz: 0, type: BlockType.CRAFTING_BENCH });

    return {
      id: 'bp_pendopo_joglo',
      name: 'Pendopo Joglo Agung (Jawa)',
      region: 'Tanah Jawa',
      description: 'Balai agung berpillar Soko Guru Jati Ukir dengan atap tajug bertingkat, peti pusaka, dan meja kerajinan.',
      dimensions: [7, 7, 7],
      blocks,
    };
  }

  private static createLumbungTongkonanTemplate(): VernacularBlueprintTemplate {
    const blocks: Array<{ dx: number; dy: number; dz: number; type: BlockType }> = [];
    // Stone Alang Stilt Pillars
    const stilts = [
      [-2, -2], [2, -2], [-2, 0], [2, 0], [-2, 2], [2, 2],
    ];
    for (const [sx, sz] of stilts) {
      blocks.push({ dx: sx, dy: 0, dz: sz, type: BlockType.STONE_ALANG_PILLAR });
      blocks.push({ dx: sx, dy: 1, dz: sz, type: BlockType.STONE_ALANG_PILLAR });
    }
    // Elevated Cabin Floor
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        blocks.push({ dx, dy: 2, dz, type: BlockType.TEAK_WOOD_PLANKS });
      }
    }
    // Bamboo Woven Walls
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const isWall = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        if (isWall && !(dx === 0 && dz === 2)) {
          blocks.push({ dx, dy: 3, dz, type: BlockType.WOVEN_BAMBOO_GEDEK });
        }
      }
    }
    // Sweeping Saddle Roof (Upward prow at front/back Z = -3, +3)
    for (let dz = -3; dz <= 3; dz++) {
      const prowRaise = Math.abs(dz) === 3 ? 1 : 0;
      for (let dx = -2; dx <= 2; dx++) {
        blocks.push({ dx, dy: 4 + prowRaise, dz, type: BlockType.TERRACOTTA_ROOF_TILE });
      }
      blocks.push({ dx: 0, dy: 5 + prowRaise, dz, type: BlockType.IJUK_THATCH_ROOF });
    }
    blocks.push({ dx: 0, dy: 3, dz: 0, type: BlockType.RICE_STORAGE_CHEST });
    blocks.push({ dx: 0, dy: 3, dz: -1, type: BlockType.CHEST });

    return {
      id: 'bp_lumbung_tongkonan',
      name: 'Lumbung Alang Tongkonan (Toraja)',
      region: 'Pegunungan Toraja',
      description: 'Lumbung padi panggung di atas tiang batu pahat dengan atap lengkung perahu dan wadah lumbung.',
      dimensions: [5, 7, 7],
      blocks,
    };
  }

  private static createGapuraCandiBentarTemplate(): VernacularBlueprintTemplate {
    const blocks: Array<{ dx: number; dy: number; dz: number; type: BlockType }> = [];
    // Split Temple Towers Left (dx = -3..-2) and Right (dx = 2..3), Pathway in middle (dx = -1..1)
    for (let dx = -4; dx <= 4; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        blocks.push({ dx, dy: 0, dz, type: BlockType.CARVED_ANDESITE_STONE });
      }
    }
    for (const side of [-1, 1]) {
      for (let dy = 1; dy <= 6; dy++) {
        const width = dy <= 3 ? 2 : 1;
        for (let w = 0; w < width; w++) {
          const dx = side * (2 + w);
          for (let dz = -1; dz <= 1; dz++) {
            const bType =
              dy === 3 || dy === 5
                ? BlockType.SPLIT_GATE_STONE
                : BlockType.CARVED_ANDESITE_STONE;
            blocks.push({ dx, dy, dz, type: bType });
          }
        }
      }
      blocks.push({ dx: side * 2, dy: 7, dz: 0, type: BlockType.LANTERN });
    }

    return {
      id: 'bp_gapura_candi',
      name: 'Gapura Candi Bentar (Majapahit & Bali)',
      region: 'Wilwatikta & Subak',
      description: 'Gerbang kembar terbelah dari batu andesit berukir relief kuno dan lentera penjaga.',
      dimensions: [9, 8, 3],
      blocks,
    };
  }

  private static createMenaraSuarBahariTemplate(): VernacularBlueprintTemplate {
    const blocks: Array<{ dx: number; dy: number; dz: number; type: BlockType }> = [];
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        blocks.push({ dx, dy: 0, dz, type: BlockType.CARVED_ANDESITE_STONE });
      }
    }
    for (let dy = 1; dy <= 7; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          if (dx === 0 && dz === 0) {
            blocks.push({ dx, dy, dz, type: BlockType.AETHER_CONDUIT_FLOOR });
          } else if (Math.abs(dx) + Math.abs(dz) === 2) {
            blocks.push({ dx, dy, dz, type: BlockType.CARVED_WOOD_BEAM });
          }
        }
      }
    }
    blocks.push({ dx: 0, dy: 8, dz: 0, type: BlockType.BIOLUMINESCENT_CORAL });
    blocks.push({ dx: 0, dy: 9, dz: 0, type: BlockType.LANTERN });

    return {
      id: 'bp_menara_suar',
      name: 'Menara Suar Pelabuhan Phinisi',
      region: 'Pesisir Nusantara',
      description: 'Menara mercusuar bercahaya Aether dan karang bioluminesensi sebagai penuntun kapal di malam hari.',
      dimensions: [5, 10, 5],
      blocks,
    };
  }

  private static ensureMaterials(): void {
    if (!this.boxGeo) {
      this.boxGeo = new THREE.BoxGeometry(0.98, 0.98, 0.98);
      this.holoMatPrimary = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      });
      this.holoMatAccent = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      });
      this.holoMatRoof = new THREE.MeshBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
      });
      this.wireframeMat = new THREE.LineBasicMaterial({
        color: 0x7dd3fc,
        transparent: true,
        opacity: 0.55,
      });
    }
  }

  public static getActiveTemplate(): VernacularBlueprintTemplate {
    return this.TEMPLATES[this.activeTemplateIndex % this.TEMPLATES.length];
  }

  public static cycleTemplate(audio?: SoundSynthesizer): VernacularBlueprintTemplate {
    this.activeTemplateIndex = (this.activeTemplateIndex + 1) % this.TEMPLATES.length;
    this.lastRebuiltKey = '';
    const next = this.getActiveTemplate();
    audio?.playGamelanSaron(this.activeTemplateIndex + 1);
    NotificationManager.push({
      title: `📐 Cetak Biru: ${next.name}`,
      message: `${next.description} ([Klik Kanan] Bangun · [Klik Kiri/R] Ganti & Putar)`,
      priority: 'NORMAL',
      colorTheme: 'sky',
      durationMs: 3200,
    });
    return next;
  }

  public static rotateHologram(audio?: SoundSynthesizer): void {
    this.rotationSteps = (this.rotationSteps + 1) % 4;
    this.lastRebuiltKey = '';
    audio?.playUIClick();
  }

  private static transformOffset(dx: number, dz: number, rotSteps: number): [number, number] {
    const r = ((rotSteps % 4) + 4) % 4;
    if (r === 1) return [-dz, dx];
    if (r === 2) return [-dx, -dz];
    if (r === 3) return [dz, -dx];
    return [dx, dz];
  }

  public static update(
    deltaTime: number,
    world: VoxelWorld,
    playerPos: THREE.Vector3,
    playerYaw: number,
    activeItemId: string | null
  ): void {
    const shouldShow = activeItemId === 'lontar_arsitek_nusantara';
    this.isVisible = shouldShow;
    this.hologramGroup.visible = shouldShow;

    if (!shouldShow) {
      this.currentAnchorPos = null;
      return;
    }

    this.ensureMaterials();

    // Project anchor 7 blocks ahead of player's look yaw
    const forwardX = Math.sin(playerYaw);
    const forwardZ = Math.cos(playerYaw);
    const targetX = Math.floor(playerPos.x + forwardX * 7.5);
    const targetZ = Math.floor(playerPos.z + forwardZ * 7.5);
    const targetY = world.getSpawnHeight(targetX, targetZ);

    this.currentAnchorPos = [targetX, targetY, targetZ];
    this.hologramGroup.position.set(targetX + 0.5, targetY + 0.5, targetZ + 0.5);

    // Subtle hologram pulse
    const pulse = 0.28 + Math.sin(performance.now() * 0.005) * 0.08;
    if (this.holoMatPrimary) this.holoMatPrimary.opacity = pulse;
    if (this.holoMatRoof) this.holoMatRoof.opacity = pulse + 0.05;

    const rebuildKey = `${this.activeTemplateIndex}_${this.rotationSteps}`;
    if (this.lastRebuiltKey !== rebuildKey) {
      this.lastRebuiltKey = rebuildKey;
      this.rebuildHologramMeshes();
    }
  }

  private static rebuildHologramMeshes(): void {
    this.ensureMaterials();
    for (const m of this.previewMeshes) {
      this.hologramGroup.remove(m);
    }
    this.previewMeshes = [];

    const tmpl = this.getActiveTemplate();
    for (const b of tmpl.blocks) {
      const [rx, rz] = this.transformOffset(b.dx, b.dz, this.rotationSteps);
      let mat = this.holoMatPrimary!;
      if (
        b.type === BlockType.IJUK_THATCH_ROOF ||
        b.type === BlockType.TERRACOTTA_ROOF_TILE
      ) {
        mat = this.holoMatRoof!;
      } else if (
        b.type === BlockType.LANTERN ||
        b.type === BlockType.CHEST ||
        b.type === BlockType.BIOLUMINESCENT_CORAL
      ) {
        mat = this.holoMatAccent!;
      }

      const mesh = new THREE.Mesh(this.boxGeo!, mat);
      mesh.position.set(rx, b.dy, rz);
      this.hologramGroup.add(mesh);
      this.previewMeshes.push(mesh);
    }
  }

  public static constructActiveHologram(
    world: VoxelWorld,
    audio?: SoundSynthesizer,
    particles?: ParticleManager
  ): boolean {
    if (!this.currentAnchorPos) return false;
    const [ax, ay, az] = this.currentAnchorPos;
    const tmpl = this.getActiveTemplate();

    for (const b of tmpl.blocks) {
      const [rx, rz] = this.transformOffset(b.dx, b.dz, this.rotationSteps);
      world.setBlock(ax + rx, ay + b.dy, az + rz, b.type);
    }

    audio?.playAncientGong();
    particles?.emitBlockBreak(
      new THREE.Vector3(ax, ay + 2, az),
      '#38bdf8',
      'crystal'
    );

    NotificationManager.push({
      title: `🏛️ Mahakarya Terbangun: ${tmpl.name}`,
      message: `${tmpl.name} telah berdiri kokoh di koordinat [${ax}, ${ay}, ${az}]!`,
      priority: 'HIGH',
      colorTheme: 'amber',
      durationMs: 3800,
    });

    return true;
  }
}
