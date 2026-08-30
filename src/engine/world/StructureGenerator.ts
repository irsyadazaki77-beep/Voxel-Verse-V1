// Procedural Structure & Vegetation Generator 2.0
// Multi-chunk world-coordinate blueprints for seamless chunk-boundary generation & region grid checks
import { BlockType } from '../../types';
import { STRUCTURE_REGION_SIZE, CHUNK_SIZE_Y } from './WorldConfig';
import { DungeonGenerator } from '../dungeon/DungeonGenerator';

export interface VoxelBlockPlacement {
  dx: number; // Offset relative to structure origin
  dy: number;
  dz: number;
  block: BlockType;
}

export class StructureGenerator {
  // 1. TREE GENERATORS
  public static generateOakTree(seed: number): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    const height = 4 + (Math.abs(seed) % 3);

    // Trunk
    for (let y = 0; y < height; y++) {
      blocks.push({ dx: 0, dy: y, dz: 0, block: BlockType.OAK_LOG });
    }

    // Leaf Crown
    for (let y = height - 2; y <= height + 1; y++) {
      const radius = y >= height ? 1 : 2;
      for (let x = -radius; x <= radius; x++) {
        for (let z = -radius; z <= radius; z++) {
          if (x === 0 && z === 0 && y < height) continue;
          if (Math.abs(x) === radius && Math.abs(z) === radius && y === height + 1) continue;
          blocks.push({ dx: x, dy: y, dz: z, block: BlockType.OAK_LEAVES });
        }
      }
    }
    return blocks;
  }

  public static generateBirchTree(seed: number): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    const height = 5 + (Math.abs(seed) % 3);

    for (let y = 0; y < height; y++) {
      blocks.push({ dx: 0, dy: y, dz: 0, block: BlockType.OAK_LOG });
    }

    for (let y = height - 3; y <= height + 1; y++) {
      const radius = y === height + 1 ? 1 : 2;
      for (let x = -radius; x <= radius; x++) {
        for (let z = -radius; z <= radius; z++) {
          if (x === 0 && z === 0 && y < height) continue;
          if (Math.abs(x) === radius && Math.abs(z) === radius && y > height) continue;
          blocks.push({ dx: x, dy: y, dz: z, block: BlockType.OAK_LEAVES });
        }
      }
    }
    return blocks;
  }

  public static generatePineTree(seed: number): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    const height = 7 + (Math.abs(seed) % 4);

    for (let y = 0; y < height; y++) {
      blocks.push({ dx: 0, dy: y, dz: 0, block: BlockType.PINE_LOG });
    }

    for (let y = 2; y <= height; y++) {
      const radius = (height - y) % 2 === 0 ? 2 : 1;
      for (let x = -radius; x <= radius; x++) {
        for (let z = -radius; z <= radius; z++) {
          if (x === 0 && z === 0 && y < height) continue;
          if (Math.abs(x) === radius && Math.abs(z) === radius) continue;
          blocks.push({ dx: x, dy: y, dz: z, block: BlockType.PINE_LEAVES });
        }
      }
    }
    blocks.push({ dx: 0, dy: height, dz: 0, block: BlockType.PINE_LEAVES });
    return blocks;
  }

  public static generateJungleTree(seed: number): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    const height = 10 + (Math.abs(seed) % 5);

    // Thick Trunk (2x2)
    for (let y = 0; y < height; y++) {
      blocks.push({ dx: 0, dy: y, dz: 0, block: BlockType.OAK_LOG });
      blocks.push({ dx: 1, dy: y, dz: 0, block: BlockType.OAK_LOG });
      blocks.push({ dx: 0, dy: y, dz: 1, block: BlockType.OAK_LOG });
      blocks.push({ dx: 1, dy: y, dz: 1, block: BlockType.OAK_LOG });
    }

    // High Canopy Umbrella
    for (let y = height - 2; y <= height + 2; y++) {
      const radius = y <= height ? 4 : 2;
      for (let x = -radius; x <= radius + 1; x++) {
        for (let z = -radius; z <= radius + 1; z++) {
          if (x * x + z * z <= radius * radius + 2) {
            blocks.push({ dx: x, dy: y, dz: z, block: BlockType.OAK_LEAVES });
          }
        }
      }
    }
    return blocks;
  }

  public static generateGiantTree(seed: number): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    const height = 14 + (Math.abs(seed) % 6);

    for (let y = 0; y < height; y++) {
      blocks.push({ dx: 0, dy: y, dz: 0, block: BlockType.PINE_LOG });
      blocks.push({ dx: 1, dy: y, dz: 0, block: BlockType.PINE_LOG });
      blocks.push({ dx: 0, dy: y, dz: 1, block: BlockType.PINE_LOG });
      blocks.push({ dx: 1, dy: y, dz: 1, block: BlockType.PINE_LOG });
    }

    // Broad tiered branches
    for (let y = 6; y <= height + 2; y += 3) {
      const radius = Math.max(2, Math.floor((height - y) * 0.5) + 2);
      for (let x = -radius; x <= radius + 1; x++) {
        for (let z = -radius; z <= radius + 1; z++) {
          if (x * x + z * z <= radius * radius + 1) {
            blocks.push({ dx: x, dy: y, dz: z, block: BlockType.PINE_LEAVES });
          }
        }
      }
    }
    return blocks;
  }

  public static generateCrystalTree(seed: number): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    const height = 5 + (Math.abs(seed) % 3);

    for (let y = 0; y < height; y++) {
      blocks.push({ dx: 0, dy: y, dz: 0, block: BlockType.CYAN_CRYSTAL_LOG });
    }

    for (let y = height - 2; y <= height + 2; y++) {
      const radius = 2;
      for (let x = -radius; x <= radius; x++) {
        for (let z = -radius; z <= radius; z++) {
          if (x === 0 && z === 0 && y < height) continue;
          const dist = Math.sqrt(x * x + (y - height) * (y - height) + z * z);
          if (dist <= 2.2) {
            blocks.push({ dx: x, dy: y, dz: z, block: BlockType.CYAN_CRYSTAL_LEAVES });
          }
        }
      }
    }
    return blocks;
  }

  public static generatePalmTree(seed: number): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    const height = 5 + (Math.abs(seed) % 2);

    // Slanted Trunk
    for (let y = 0; y < height; y++) {
      const offsetX = Math.floor(y / 3);
      blocks.push({ dx: offsetX, dy: y, dz: 0, block: BlockType.OAK_LOG });
    }

    const topX = Math.floor(height / 3);
    // Fronds
    const fronds = [
      [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1],
      [2, -1, 0], [-2, -1, 0], [0, -1, 2], [0, -1, -2]
    ];
    for (const [fx, fy, fz] of fronds) {
      blocks.push({ dx: topX + fx, dy: height + fy, dz: fz, block: BlockType.OAK_LEAVES });
    }
    return blocks;
  }

  // 2. LARGE MULTI-CHUNK PROCEDURAL STRUCTURE BLUEPRINTS
  public static generateAncientShrine(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];

    // Base platform 7x7
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.STONE_BRICKS });
        if (Math.abs(x) === 3 || Math.abs(z) === 3) {
          blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.STONE_SLAB });
        }
      }
    }

    // Pillars
    const corners = [[-3, -3], [3, -3], [-3, 3], [3, 3]];
    for (const [cx, cz] of corners) {
      blocks.push({ dx: cx, dy: 1, dz: cz, block: BlockType.STONE_PILLAR });
      blocks.push({ dx: cx, dy: 2, dz: cz, block: BlockType.STONE_PILLAR });
      blocks.push({ dx: cx, dy: 3, dz: cz, block: BlockType.STONE_PILLAR });
      blocks.push({ dx: cx, dy: 4, dz: cz, block: BlockType.LANTERN });
    }

    // Center Obelisk
    blocks.push({ dx: 0, dy: 1, dz: 0, block: BlockType.STONE_PILLAR });
    blocks.push({ dx: 0, dy: 2, dz: 0, block: BlockType.ANCIENT_RUNE_STONE });
    blocks.push({ dx: 0, dy: 3, dz: 0, block: BlockType.AETHER_CRYSTAL_ORE });
    blocks.push({ dx: 0, dy: 4, dz: 0, block: BlockType.GLOWSTONE_CRYSTAL });

    return blocks;
  }

  public static generateExplorerCabin(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    const w = 7, d = 7, h = 5;

    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.WOOD_PLANKS });
      }
    }

    for (let y = 1; y <= h; y++) {
      for (let x = 0; x < w; x++) {
        for (let z = 0; z < d; z++) {
          const isEdge = x === 0 || x === w - 1 || z === 0 || z === d - 1;
          const isCorner = (x === 0 || x === w - 1) && (z === 0 || z === d - 1);
          if (isCorner) {
            blocks.push({ dx: x, dy: y, dz: z, block: BlockType.OAK_LOG });
          } else if (isEdge) {
            if (y === 2 && ((x === 3 && (z === 0 || z === d - 1)) || (z === 3 && (x === 0 || x === w - 1)))) {
              blocks.push({ dx: x, dy: y, dz: z, block: BlockType.GLASS });
            } else if (y === 1 && x === 3 && z === 0) {
              blocks.push({ dx: x, dy: y, dz: z, block: BlockType.AIR });
            } else {
              blocks.push({ dx: x, dy: y, dz: z, block: BlockType.WOOD_PLANKS });
            }
          }
        }
      }
    }

    // Roof
    for (let x = -1; x <= w; x++) {
      for (let z = -1; z <= d; z++) {
        blocks.push({ dx: x, dy: h + 1, dz: z, block: BlockType.WOOD_STAIRS });
      }
    }

    // Interior
    blocks.push({ dx: 1, dy: 1, dz: 1, block: BlockType.CRAFTING_BENCH });
    blocks.push({ dx: 1, dy: 1, dz: 2, block: BlockType.FURNACE });
    blocks.push({ dx: 5, dy: 1, dz: 5, block: BlockType.CHEST });
    blocks.push({ dx: 5, dy: 1, dz: 1, block: BlockType.BOOKSHELF });
    blocks.push({ dx: 3, dy: 3, dz: 3, block: BlockType.LANTERN });

    return blocks;
  }

  public static generateWatchtower(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    const height = 12;

    for (let y = 0; y <= height; y++) {
      for (let x = -2; x <= 2; x++) {
        for (let z = -2; z <= 2; z++) {
          const isCorner = (Math.abs(x) === 2 && Math.abs(z) === 2);
          const isWall = (Math.abs(x) === 2 || Math.abs(z) === 2);

          if (y === 0 || y === height) {
            blocks.push({ dx: x, dy: y, dz: z, block: BlockType.STONE_BRICKS });
          } else if (isCorner) {
            blocks.push({ dx: x, dy: y, dz: z, block: BlockType.STONE_PILLAR });
          } else if (isWall && y % 3 === 0) {
            blocks.push({ dx: x, dy: y, dz: z, block: BlockType.WOOD_PLANKS });
          }
        }
      }
    }

    // Top Outlook Parapet
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        if (Math.abs(x) === 3 || Math.abs(z) === 3) {
          if ((x + z) % 2 === 0) {
            blocks.push({ dx: x, dy: height + 1, dz: z, block: BlockType.STONE_SLAB });
          }
        }
      }
    }
    blocks.push({ dx: 0, dy: height + 1, dz: 0, block: BlockType.GLOWSTONE_CRYSTAL });

    return blocks;
  }

  // 6. Subterranean Dungeon Entrance Descent (Stairwell shaft with iron pillars & torches)
  public static generateDungeonEntrance(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];

    // Surface Gazebo / Mausoleum
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        const isCorner = Math.abs(x) === 3 && Math.abs(z) === 3;
        const isEdge = Math.abs(x) === 3 || Math.abs(z) === 3;

        // Ground Foundation
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.STONE_BRICKS });

        if (isCorner) {
          for (let y = 1; y <= 4; y++) {
            blocks.push({ dx: x, dy: y, dz: z, block: BlockType.STONE_PILLAR });
          }
        } else if (isEdge && z !== 3) {
          blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.STONE_SLAB });
        }

        // Roof Canopy
        blocks.push({ dx: x, dy: 5, dz: z, block: BlockType.STONE_BRICKS });
      }
    }

    // Descending Staircase Shaft down -15 blocks
    for (let depth = 1; depth <= 14; depth++) {
      const stepZ = -2 + (depth % 5);
      blocks.push({ dx: 0, dy: -depth, dz: stepZ, block: BlockType.STONE_BRICKS });
      blocks.push({ dx: -1, dy: -depth, dz: stepZ, block: BlockType.COBBLESTONE });
      blocks.push({ dx: 1, dy: -depth, dz: stepZ, block: BlockType.COBBLESTONE });
      blocks.push({ dx: 0, dy: -depth + 1, dz: stepZ, block: BlockType.AIR });
      blocks.push({ dx: 0, dy: -depth + 2, dz: stepZ, block: BlockType.AIR });
    }

    // Portal Torches
    blocks.push({ dx: -2, dy: 2, dz: 3, block: BlockType.TORCH });
    blocks.push({ dx: 2, dy: 2, dz: 3, block: BlockType.TORCH });
    blocks.push({ dx: 0, dy: 4, dz: 0, block: BlockType.LANTERN });

    return blocks;
  }

  // 7. Starfall Meteor Crater (Obsidian & Magma Rock Impact Basin)
  public static generateMeteorCrater(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    const radius = 5;

    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const distSq = x * x + z * z;
        if (distSq <= radius * radius) {
          const depth = Math.floor(Math.sqrt(radius * radius - distSq) * 0.7);
          for (let y = -depth; y <= 0; y++) {
            if (y === -depth) {
              blocks.push({ dx: x, dy: y, dz: z, block: distSq < 4 ? BlockType.OBSIDIAN : BlockType.MAGMA_ROCK });
            } else {
              blocks.push({ dx: x, dy: y, dz: z, block: BlockType.AIR });
            }
          }
        }
      }
    }

    // Central Glowing Astral Core Deposit
    blocks.push({ dx: 0, dy: -2, dz: 0, block: BlockType.AETHER_CRYSTAL_ORE });
    blocks.push({ dx: 1, dy: -2, dz: 0, block: BlockType.MYTHRIL_ORE });
    blocks.push({ dx: -1, dy: -2, dz: 0, block: BlockType.MYTHRIL_ORE });
    blocks.push({ dx: 0, dy: -1, dz: 0, block: BlockType.LAVA });

    return blocks;
  }

  // Multi-Chunk World-Coordinate Region Placement Query
  // Determines if a structure exists in nearby regions and returns any blocks falling inside chunk (cx, cz)
  public static getStructureBlocksForChunk(
    cx: number,
    cz: number,
    seed: number,
    structureDensity: number = 0.08,
    getHeightAt?: (wx: number, wz: number) => number
  ): VoxelBlockPlacement[] {
    const placements: VoxelBlockPlacement[] = [];

    const chunkMinX = cx * 16;
    const chunkMaxX = chunkMinX + 15;
    const chunkMinZ = cz * 16;
    const chunkMaxZ = chunkMinZ + 15;

    // 1. DYNAMIC SPECIAL SETTLEMENTS (DETERMINISTIC WORLD LOCATIONS)
    const settlements = [
      { id: 'haven_camp', x: 8, z: 8, height: 64, type: 'haven' },
      { id: 'suncrest_hamlet', x: 320, z: 280, height: 68, type: 'suncrest' },
      { id: 'ferrite_outpost', x: 650, z: -500, height: 75, type: 'ferrite' }
    ];

    for (const s of settlements) {
      const dx = s.x - (chunkMinX + 8);
      const dz = s.z - (chunkMinZ + 8);
      if (Math.abs(dx) < 36 && Math.abs(dz) < 36) {
        let bp: VoxelBlockPlacement[] = [];
        if (s.type === 'haven') {
          bp = StructureGenerator.generateHavenCampBlueprint();
        } else if (s.type === 'suncrest') {
          bp = StructureGenerator.generateSuncrestHamletBlueprint();
        } else if (s.type === 'ferrite') {
          bp = StructureGenerator.generateFerriteOutpostBlueprint();
        }

        for (const block of bp) {
          const worldX = s.x + block.dx;
          const worldY = s.height + block.dy;
          const worldZ = s.z + block.dz;

          if (
            worldX >= chunkMinX &&
            worldX <= chunkMaxX &&
            worldZ >= chunkMinZ &&
            worldZ <= chunkMaxZ &&
            worldY >= 0 &&
            worldY < CHUNK_SIZE_Y
          ) {
            placements.push({
              dx: worldX - chunkMinX,
              dy: worldY,
              dz: worldZ - chunkMinZ,
              block: block.block,
            });
          }
        }
      }
    }

    // 2. DYNAMIC SPECIAL DUNGEONS (DETERMINISTIC WORLD LOCATIONS)
    const dungeons = [
      { x: 200, z: 120, surfaceY: 65, depth: 14, theme: 'mine', tier: 1 },
      { x: 480, z: 420, surfaceY: 70, depth: 14, theme: 'crypt', tier: 2 },
      { x: 750, z: -320, surfaceY: 68, depth: 14, theme: 'crystal', tier: 3 },
      { x: 1100, z: 600, surfaceY: 65, depth: 14, theme: 'corrupted', tier: 4 },
      { x: 950, z: -750, surfaceY: 70, depth: 14, theme: 'volcanic', tier: 5 }
    ];

    for (const d of dungeons) {
      // (a) Surface Entrance
      const distS = Math.max(Math.abs(d.x - (chunkMinX + 8)), Math.abs(d.z - (chunkMinZ + 8)));
      if (distS < 30) {
        const bp = StructureGenerator.generateDungeonEntrance();
        for (const block of bp) {
          const worldX = d.x + block.dx;
          const worldY = d.surfaceY + block.dy;
          const worldZ = d.z + block.dz;

          if (
            worldX >= chunkMinX &&
            worldX <= chunkMaxX &&
            worldZ >= chunkMinZ &&
            worldZ <= chunkMaxZ &&
            worldY >= 0 &&
            worldY < CHUNK_SIZE_Y
          ) {
            placements.push({
              dx: worldX - chunkMinX,
              dy: worldY,
              dz: worldZ - chunkMinZ,
              block: block.block,
            });
          }
        }
      }

      // (b) Underground Rooms
      const originY = d.surfaceY - d.depth;
      const distD = Math.max(Math.abs(d.x - (chunkMinX + 8)), Math.abs(d.z + 15 - (chunkMinZ + 8)));
      if (distD < 50) {
        const result = DungeonGenerator.generateDungeon(d.x, originY, d.z, d.theme as any, d.tier as any, seed);
        for (const voxel of result.blocks) {
          const worldX = voxel.wx;
          const worldY = voxel.wy;
          const worldZ = voxel.wz;

          if (
            worldX >= chunkMinX &&
            worldX <= chunkMaxX &&
            worldZ >= chunkMinZ &&
            worldZ <= chunkMaxZ &&
            worldY >= 0 &&
            worldY < CHUNK_SIZE_Y
          ) {
            placements.push({
              dx: worldX - chunkMinX,
              dy: worldY,
              dz: worldZ - chunkMinZ,
              block: voxel.block,
            });
          }
        }
      }
    }

    // 3. PROCEDURAL RANDOM STRUCTURE BLUEPRINTS (CRATERS, CABINS, ETC)
    const regionSizeBlocks = 64; // 4x4 chunks per region grid
    const maxStructureRadius = 14;

    const minRegX = Math.floor((chunkMinX - maxStructureRadius) / regionSizeBlocks);
    const maxRegX = Math.floor((chunkMaxX + maxStructureRadius) / regionSizeBlocks);
    const minRegZ = Math.floor((chunkMinZ - maxStructureRadius) / regionSizeBlocks);
    const maxRegZ = Math.floor((chunkMaxZ + maxStructureRadius) / regionSizeBlocks);

    for (let rx = minRegX; rx <= maxRegX; rx++) {
      for (let rz = minRegZ; rz <= maxRegZ; rz++) {
        const hash = Math.abs(Math.sin(rx * 12.9898 + rz * 78.233 + seed * 0.001) * 43758.5453) % 1;

        if (hash < structureDensity * 3.0) {
          const offsetX = Math.floor(hash * 1000) % 24 - 12;
          const offsetZ = Math.floor(hash * 3000) % 24 - 12;
          const originWX = rx * regionSizeBlocks + 32 + offsetX;
          const originWZ = rz * regionSizeBlocks + 32 + offsetZ;

          // Avoid generating random structures directly on top of major settlements/dungeons
          let tooClose = false;
          for (const s of settlements) {
            if (Math.abs(originWX - s.x) < 48 && Math.abs(originWZ - s.z) < 48) tooClose = true;
          }
          for (const d of dungeons) {
            if (Math.abs(originWX - d.x) < 48 && Math.abs(originWZ - d.z) < 48) tooClose = true;
          }
          if (tooClose) continue;

          let originY = 36;
          if (getHeightAt) {
            originY = getHeightAt(originWX, originWZ);
          }

          if (originY < 15 || originY > 105) continue;

          const typeRand = (hash * 100) % 1;
          let blueprint: VoxelBlockPlacement[] = [];
          if (typeRand < 0.2) {
            blueprint = StructureGenerator.generateDungeonEntrance();
          } else if (typeRand < 0.4) {
            blueprint = StructureGenerator.generateMeteorCrater();
          } else if (typeRand < 0.6) {
            blueprint = StructureGenerator.generateWatchtower();
          } else if (typeRand < 0.8) {
            blueprint = StructureGenerator.generateExplorerCabin();
          } else {
            blueprint = StructureGenerator.generateAncientShrine();
          }

          for (const bp of blueprint) {
            const worldX = originWX + bp.dx;
            const worldY = originY + bp.dy;
            const worldZ = originWZ + bp.dz;

            if (
              worldX >= chunkMinX &&
              worldX <= chunkMaxX &&
              worldZ >= chunkMinZ &&
              worldZ <= chunkMaxZ &&
              worldY >= 0 &&
              worldY < CHUNK_SIZE_Y
            ) {
              placements.push({
                dx: worldX - chunkMinX,
                dy: worldY,
                dz: worldZ - chunkMinZ,
                block: bp.block,
              });
            }
          }
        }
      }
    }

    return placements;
  }

  // 4. SETTLEMENT BLUEPRINTS
  public static generateHavenCampBlueprint(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Campfire at [0, 0, 0]
    blocks.push({ dx: 0, dy: 0, dz: 0, block: BlockType.COBBLESTONE });
    blocks.push({ dx: 0, dy: 1, dz: 0, block: BlockType.TORCH });
    // Seats around campfire
    blocks.push({ dx: -2, dy: 0, dz: 0, block: BlockType.OAK_LOG });
    blocks.push({ dx: 2, dy: 0, dz: 0, block: BlockType.OAK_LOG });
    blocks.push({ dx: 0, dy: 0, dz: -2, block: BlockType.OAK_LOG });
    // Merchant Tent
    for (let x = -6; x <= -2; x++) {
      for (let z = -6; z <= -2; z++) {
        blocks.push({ dx: x, dy: -1, dz: z, block: BlockType.WOOD_PLANKS });
        const isWall = x === -6 || x === -2 || z === -6 || z === -2;
        if (isWall) {
          blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.OAK_LOG });
          blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.OAK_LOG });
          blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.GLASS });
        } else {
          blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.AIR });
          blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.AIR });
        }
        blocks.push({ dx: x, dy: 3, dz: z, block: BlockType.WOOD_SLAB });
      }
    }
    blocks.push({ dx: -4, dy: 0, dz: -5, block: BlockType.CRAFTING_BENCH });
    blocks.push({ dx: -5, dy: 0, dz: -5, block: BlockType.CHEST });
    blocks.push({ dx: -3, dy: 0, dz: -5, block: BlockType.FURNACE });

    // Fences
    for (let x = -8; x <= 8; x++) {
      blocks.push({ dx: x, dy: 0, dz: -8, block: BlockType.FENCE_WOOD });
      blocks.push({ dx: x, dy: 0, dz: 8, block: BlockType.FENCE_WOOD });
    }
    for (let z = -8; z <= 8; z++) {
      blocks.push({ dx: -8, dy: 0, dz: z, block: BlockType.FENCE_WOOD });
      blocks.push({ dx: 8, dy: 0, dz: z, block: BlockType.FENCE_WOOD });
    }
    return blocks;
  }

  public static generateSuncrestHamletBlueprint(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Water Well in center
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        const isCenter = x === 0 && z === 0;
        blocks.push({ dx: x, dy: -1, dz: z, block: isCenter ? BlockType.WATER : BlockType.STONE_BRICKS });
        if (!isCenter) {
          blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.COBBLESTONE });
        }
      }
    }
    blocks.push({ dx: -1, dy: 1, dz: -1, block: BlockType.FENCE_WOOD });
    blocks.push({ dx: 1, dy: 1, dz: -1, block: BlockType.FENCE_WOOD });
    blocks.push({ dx: -1, dy: 1, dz: 1, block: BlockType.FENCE_WOOD });
    blocks.push({ dx: 1, dy: 1, dz: 1, block: BlockType.FENCE_WOOD });
    blocks.push({ dx: 0, dy: 2, dz: 0, block: BlockType.WOOD_SLAB });

    // Elder's Lodge (from -8, -8 to -3, -3)
    for (let x = -8; x <= -3; x++) {
      for (let z = -8; z <= -3; z++) {
        blocks.push({ dx: x, dy: -1, dz: z, block: BlockType.WOOD_PLANKS });
        const isWall = x === -8 || x === -3 || z === -8 || z === -3;
        const isDoor = x === -5 && z === -3;
        if (isWall && !isDoor) {
          blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.STONE_BRICKS });
          blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.WOOD_PLANKS });
          blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.GLASS });
        } else {
          blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.AIR });
          blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.AIR });
        }
        blocks.push({ dx: x, dy: 3, dz: z, block: BlockType.WOOD_SLAB });
      }
    }
    // Chest, craft bench inside lodge
    blocks.push({ dx: -7, dy: 0, dz: -7, block: BlockType.CHEST });
    blocks.push({ dx: -4, dy: 0, dz: -7, block: BlockType.BOOKSHELF });
    blocks.push({ dx: -7, dy: 1, dz: -7, block: BlockType.LANTERN });

    // Farm Plots (from 3, -6 to 8, 6)
    for (let x = 3; x <= 8; x++) {
      for (let z = -6; z <= 6; z++) {
        const isWaterRow = x === 5;
        blocks.push({ dx: x, dy: -1, dz: z, block: isWaterRow ? BlockType.WATER : BlockType.FARMLAND });
        if (!isWaterRow) {
          blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.CROP_WHEAT_3 });
        }
      }
    }
    return blocks;
  }

  public static generateFerriteOutpostBlueprint(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Blacksmith's Forge (from -9, -9 to -4, -4)
    for (let x = -9; x <= -4; x++) {
      for (let z = -9; z <= -4; z++) {
        blocks.push({ dx: x, dy: -1, dz: z, block: BlockType.BASALT });
        const isWall = x === -9 || x === -4 || z === -9 || z === -4;
        if (isWall) {
          blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.STONE_BRICKS });
          blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.BASALT });
          blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.BASALT });
        } else {
          blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.AIR });
          blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.AIR });
        }
        blocks.push({ dx: x, dy: 3, dz: z, block: BlockType.STONE_SLAB });
      }
    }
    // Anvil, Lava Basin & Forge
    blocks.push({ dx: -7, dy: 0, dz: -7, block: BlockType.ANVIL_SMITHING });
    blocks.push({ dx: -8, dy: 0, dz: -8, block: BlockType.FURNACE });
    blocks.push({ dx: -5, dy: -1, dz: -5, block: BlockType.LAVA });
    blocks.push({ dx: -5, dy: 0, dz: -5, block: BlockType.AIR });

    // Watchtower at [5, 5]
    for (let y = 0; y <= 5; y++) {
      blocks.push({ dx: 4, dy: y, dz: 4, block: BlockType.STONE_BRICKS });
      blocks.push({ dx: 6, dy: y, dz: 4, block: BlockType.STONE_BRICKS });
      blocks.push({ dx: 4, dy: y, dz: 6, block: BlockType.STONE_BRICKS });
      blocks.push({ dx: 6, dy: y, dz: 6, block: BlockType.STONE_BRICKS });
      if (y === 5) {
        for (let x = 3; x <= 7; x++) {
          for (let z = 3; z <= 7; z++) {
            blocks.push({ dx: x, dy: y, dz: z, block: BlockType.STONE_SLAB });
          }
        }
        blocks.push({ dx: 5, dy: 6, dz: 5, block: BlockType.LANTERN });
      }
    }
    return blocks;
  }
}
