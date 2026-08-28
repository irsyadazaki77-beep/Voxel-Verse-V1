// Procedural Structure & Vegetation Generator 2.0
// Multi-chunk world-coordinate blueprints for seamless chunk-boundary generation & region grid checks
import { BlockType } from '../../types';
import { STRUCTURE_REGION_SIZE, CHUNK_SIZE_Y } from './WorldConfig';

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
  // Determines if a structure exists at world coordinate (wx, wz) and returns any block matching chunk bounds
  public static getStructureBlocksForChunk(
    cx: number,
    cz: number,
    seed: number
  ): VoxelBlockPlacement[] {
    const placements: VoxelBlockPlacement[] = [];

    // Check 3x3 neighbor regions to capture multi-chunk structures overflowing into this chunk
    const chunkMinX = cx * 16;
    const chunkMaxX = chunkMinX + 15;
    const chunkMinZ = cz * 16;
    const chunkMaxZ = chunkMinZ + 15;

    const searchRadiusChunks = 2; // Search within 2 chunk radius

    for (let ncx = cx - searchRadiusChunks; ncx <= cx + searchRadiusChunks; ncx++) {
      for (let ncz = cz - searchRadiusChunks; ncz <= cz + searchRadiusChunks; ncz++) {
        // Region Hash
        const regionX = Math.floor(ncx / 4);
        const regionZ = Math.floor(ncz / 4);
        const hash = Math.abs(Math.sin(regionX * 12.9898 + regionZ * 78.233 + seed) * 43758.5453) % 1;

        if (hash < 0.32) {
          // Structure origin in world space
          const originWX = regionX * 64 + 32 + Math.floor((hash * 100) % 16) - 8;
          const originWZ = regionZ * 64 + 32 + Math.floor((hash * 500) % 16) - 8;
          const originY = 38; // Adjusted to surface in worker

          let structType = 'shrine';
          if (hash < 0.06) structType = 'dungeon_entrance';
          else if (hash < 0.12) structType = 'meteor_crater';
          else if (hash < 0.18) structType = 'tower';
          else if (hash < 0.25) structType = 'cabin';

          let blueprint: VoxelBlockPlacement[] = [];
          if (structType === 'dungeon_entrance') blueprint = StructureGenerator.generateDungeonEntrance();
          else if (structType === 'meteor_crater') blueprint = StructureGenerator.generateMeteorCrater();
          else if (structType === 'tower') blueprint = StructureGenerator.generateWatchtower();
          else if (structType === 'cabin') blueprint = StructureGenerator.generateExplorerCabin();
          else blueprint = StructureGenerator.generateAncientShrine();

          for (const bp of blueprint) {
            const worldX = originWX + bp.dx;
            const worldZ = originWZ + bp.dz;

            // Check if within current chunk
            if (worldX >= chunkMinX && worldX <= chunkMaxX && worldZ >= chunkMinZ && worldZ <= chunkMaxZ) {
              const lx = worldX - chunkMinX;
              const lz = worldZ - chunkMinZ;
              placements.push({
                dx: lx,
                dy: originY + bp.dy,
                dz: lz,
                block: bp.block,
              });
            }
          }
        }
      }
    }

    return placements;
  }
}
