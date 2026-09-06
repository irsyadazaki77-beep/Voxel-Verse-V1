// Procedural Structure & Vegetation Generator 2.0
// Multi-chunk world-coordinate blueprints for seamless chunk-boundary generation & region grid checks
import { BlockType } from '../../types';
import { STRUCTURE_REGION_SIZE, CHUNK_SIZE_Y } from './WorldConfig';
import { DungeonGenerator } from '../dungeon/DungeonGenerator';
import { SettlementManager } from '../settlement/SettlementManager';
import { NusantaraBuildingKit } from './NusantaraBuildingKit';
import { NusantaraSettlementGenerator } from './NusantaraSettlementGenerator';

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
      { id: 'haven_camp', x: 8, z: 8, height: 64, type: 'haven', regionId: '' },
      { id: 'suncrest_hamlet', x: 320, z: 280, height: 68, type: 'suncrest', regionId: '' },
      { id: 'ferrite_outpost', x: 650, z: -500, height: 75, type: 'ferrite', regionId: '' },
      { id: 'nagari_minang', x: -420, z: -350, height: 72, type: 'nusantara', regionId: 'tanah_minang' },
      { id: 'desa_majapahit', x: 380, z: 450, height: 64, type: 'nusantara', regionId: 'tanah_jawa' },
      { id: 'banjar_subak', x: 520, z: -480, height: 78, type: 'nusantara', regionId: 'bali_highlands' },
      { id: 'kampung_dayak', x: -600, z: 580, height: 62, type: 'nusantara', regionId: 'borneo_riverlands' },
      { id: 'desa_kete_kesu', x: 720, z: 180, height: 84, type: 'nusantara', regionId: 'toraja_highlands' },
      { id: 'kampung_baliem', x: -800, z: -750, height: 88, type: 'nusantara', regionId: 'papua_highlands' },
      { id: 'desa_sasak', x: -280, z: 850, height: 66, type: 'nusantara', regionId: 'eastern_isles' }
    ];

    for (const s of settlements) {
      // Determine ground height and spiral search if on steep slope or water
      let placeX = s.x;
      let placeZ = s.z;
      let groundY = s.height;

      if (getHeightAt) {
        groundY = getHeightAt(s.x, s.z);
        if (groundY < 58 || Math.abs(getHeightAt(s.x + 8, s.z) - getHeightAt(s.x - 8, s.z)) > 6) {
          for (let r = 4; r <= 32; r += 4) {
            let found = false;
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
              const testX = Math.round(s.x + Math.cos(angle + seed * 0.1) * r);
              const testZ = Math.round(s.z + Math.sin(angle + seed * 0.1) * r);
              const testY = getHeightAt(testX, testZ);
              const slope = Math.abs(getHeightAt(testX + 4, testZ) - getHeightAt(testX - 4, testZ));
              if (testY >= 58 && slope <= 6) {
                placeX = testX;
                placeZ = testZ;
                groundY = testY;
                found = true;
                break;
              }
            }
            if (found) break;
          }
        }
      }

      const dx = placeX - (chunkMinX + 8);
      const dz = placeZ - (chunkMinZ + 8);

      if (Math.abs(dx) < 60 && Math.abs(dz) < 60) {
        const state = SettlementManager.getSettlementState(s.id);
        const level = state ? state.level : 1;

        let bp: VoxelBlockPlacement[] = [];
        if (s.type === 'haven') {
          bp = StructureGenerator.generateHavenCampBlueprint(level);
        } else if (s.type === 'suncrest') {
          bp = StructureGenerator.generateSuncrestHamletBlueprint(level);
        } else if (s.type === 'ferrite') {
          bp = StructureGenerator.generateFerriteOutpostBlueprint(level);
        } else if (s.type === 'nusantara') {
          bp = NusantaraSettlementGenerator.generateSettlement(s.regionId, placeX, groundY, placeZ, seed);
        }

        for (const block of bp) {
          const worldX = placeX + block.dx;
          const worldY = groundY + block.dy;
          const worldZ = placeZ + block.dz;

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

            // Foundation support: fill beneath floor if terrain is lower
            if (block.dy === 0 || block.dy === -1) {
              const terrainY = getHeightAt ? getHeightAt(worldX, worldZ) : groundY;
              if (terrainY < worldY) {
                for (let fy = worldY - 1; fy >= Math.max(0, terrainY); fy--) {
                  placements.push({
                    dx: worldX - chunkMinX,
                    dy: fy,
                    dz: worldZ - chunkMinZ,
                    block: BlockType.STONE_BRICKS,
                  });
                }
              }
            }
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
      const surfaceY = getHeightAt ? getHeightAt(d.x, d.z) : d.surfaceY;
      // (a) Surface Entrance
      const distS = Math.max(Math.abs(d.x - (chunkMinX + 8)), Math.abs(d.z - (chunkMinZ + 8)));
      if (distS < 30) {
        const bp = StructureGenerator.generateDungeonEntrance();
        for (const block of bp) {
          const worldX = d.x + block.dx;
          const worldY = surfaceY + block.dy;
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
      const originY = surfaceY - d.depth;
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
          if (typeRand < 0.12) {
            blueprint = StructureGenerator.generateDungeonEntrance();
          } else if (typeRand < 0.22) {
            blueprint = StructureGenerator.generateMeteorCrater();
          } else if (typeRand < 0.32) {
            blueprint = StructureGenerator.generateWatchtower();
          } else if (typeRand < 0.42) {
            blueprint = StructureGenerator.generateExplorerCabin();
          } else if (typeRand < 0.52) {
            blueprint = StructureGenerator.generateAncientShrine();
          } else if (typeRand < 0.65) {
            // Rare Nusantara Megastructure: Ancient Temple Complex (Candi Agung)
            blueprint = NusantaraBuildingKit.generateAncientTempleComplex();
          } else if (typeRand < 0.77) {
            // Rare Nusantara Megastructure: Royal Hall Pagaruyung
            blueprint = NusantaraBuildingKit.generateRoyalHall();
          } else if (typeRand < 0.88) {
            // Rare Nusantara Megastructure: Grand Betang Kahayan
            blueprint = NusantaraBuildingKit.generateGrandBetang();
          } else {
            // Rare Nusantara Megastructure: Toraja Cliff Sanctuary
            blueprint = NusantaraBuildingKit.generateCliffSanctuary();
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

  // 4. SETTLEMENT BLUEPRINTS WITH LEVEL PROGRESSION (1-5)
  public static generateHavenCampBlueprint(level: number = 1): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Campfire at [0, 0, 0]
    blocks.push({ dx: 0, dy: 0, dz: 0, block: BlockType.COBBLESTONE });
    blocks.push({ dx: 0, dy: 1, dz: 0, block: BlockType.TORCH });
    // Seats around campfire
    blocks.push({ dx: -2, dy: 0, dz: 0, block: BlockType.OAK_LOG });
    blocks.push({ dx: 2, dy: 0, dz: 0, block: BlockType.OAK_LOG });
    blocks.push({ dx: 0, dy: 0, dz: -2, block: BlockType.OAK_LOG });

    // Merchant Tent (Level 1+)
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

    // Level 2+: Crafting/Smithy Annex
    if (level >= 2) {
      blocks.push({ dx: -7, dy: 0, dz: -4, block: BlockType.ANVIL_SMITHING });
      blocks.push({ dx: -7, dy: 0, dz: -3, block: BlockType.FURNACE });
      blocks.push({ dx: -7, dy: 0, dz: -2, block: BlockType.LANTERN });
    }

    // Level 3+: Farm Plot
    if (level >= 3) {
      for (let x = 2; x <= 6; x++) {
        for (let z = -6; z <= -2; z++) {
          const isWater = x === 4;
          blocks.push({ dx: x, dy: -1, dz: z, block: isWater ? BlockType.WATER : BlockType.FARMLAND });
          if (!isWater) {
            blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.CROP_WHEAT_3 });
          }
        }
      }
    }

    // Level 4+: Watchtower & Wall Perimeter
    if (level >= 4) {
      for (let y = 0; y <= 6; y++) {
        blocks.push({ dx: 6, dy: y, dz: 6, block: BlockType.STONE_PILLAR });
        blocks.push({ dx: 8, dy: y, dz: 6, block: BlockType.STONE_PILLAR });
        blocks.push({ dx: 6, dy: y, dz: 8, block: BlockType.STONE_PILLAR });
        blocks.push({ dx: 8, dy: y, dz: 8, block: BlockType.STONE_PILLAR });
        if (y === 6) {
          for (let tx = 5; tx <= 9; tx++) {
            for (let tz = 5; tz <= 9; tz++) {
              blocks.push({ dx: tx, dy: y, dz: tz, block: BlockType.STONE_SLAB });
            }
          }
          blocks.push({ dx: 7, dy: 7, dz: 7, block: BlockType.LANTERN });
        }
      }
    }

    // Level 5+: Aether Monument
    if (level >= 5) {
      blocks.push({ dx: 0, dy: 1, dz: 4, block: BlockType.ANCIENT_RUNE_STONE });
      blocks.push({ dx: 0, dy: 2, dz: 4, block: BlockType.AETHER_CRYSTAL_ORE });
      blocks.push({ dx: 0, dy: 3, dz: 4, block: BlockType.GLOWSTONE_CRYSTAL });
    }

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

  public static generateSuncrestHamletBlueprint(level: number = 1): VoxelBlockPlacement[] {
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

    // Level 2+: Blacksmith Shed
    if (level >= 2) {
      blocks.push({ dx: -8, dy: 0, dz: 2, block: BlockType.FURNACE });
      blocks.push({ dx: -7, dy: 0, dz: 2, block: BlockType.ANVIL_SMITHING });
    }

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

    // Level 4+: Watchtower / Guard post
    if (level >= 4) {
      for (let y = 0; y <= 5; y++) {
        blocks.push({ dx: -7, dy: y, dz: 7, block: BlockType.STONE_BRICKS });
      }
      blocks.push({ dx: -7, dy: 6, dz: 7, block: BlockType.LANTERN });
    }

    // Level 5+: Aether Spire
    if (level >= 5) {
      blocks.push({ dx: 0, dy: 3, dz: 0, block: BlockType.GLOWSTONE_CRYSTAL });
    }

    return blocks;
  }

  public static generateFerriteOutpostBlueprint(level: number = 1): VoxelBlockPlacement[] {
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

    // Level 2+: Armory vault
    if (level >= 2) {
      blocks.push({ dx: -6, dy: 0, dz: -8, block: BlockType.CHEST });
      blocks.push({ dx: -6, dy: 1, dz: -8, block: BlockType.LANTERN });
    }

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

    // Level 5+: Leyline Terminal
    if (level >= 5) {
      blocks.push({ dx: 0, dy: 0, dz: 0, block: BlockType.ANCIENT_RUNE_STONE });
      blocks.push({ dx: 0, dy: 1, dz: 0, block: BlockType.GLOWSTONE_CRYSTAL });
    }

    return blocks;
  }

  public static generateRumahGadang(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Floor on stilts (7x5 footprint)
    for (let x = -4; x <= 4; x++) {
      for (let z = -2; z <= 2; z++) {
        // Foundation pillars
        if ((Math.abs(x) === 4 || Math.abs(x) === 2 || x === 0) && (Math.abs(z) === 2)) {
          blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.STONE_PILLAR });
          blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.STONE_PILLAR });
        }
        // Planks floor
        blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.WOOD_PLANKS });
      }
    }
    // Wooden walls (walls flare outward slightly)
    for (let y = 3; y <= 5; y++) {
      for (let x = -4; x <= 4; x++) {
        blocks.push({ dx: x, dy: y, dz: -2, block: BlockType.WOOD_PLANKS });
        blocks.push({ dx: x, dy: y, dz: 2, block: BlockType.WOOD_PLANKS });
      }
      for (let z = -1; z <= 1; z++) {
        blocks.push({ dx: -4, dy: y, dz: z, block: BlockType.WOOD_PLANKS });
        blocks.push({ dx: 4, dy: y, dz: z, block: BlockType.WOOD_PLANKS });
      }
    }
    // Door opening & lantern
    blocks.push({ dx: 0, dy: 3, dz: -2, block: BlockType.AIR });
    blocks.push({ dx: 0, dy: 4, dz: -2, block: BlockType.AIR });
    blocks.push({ dx: 0, dy: 4, dz: 0, block: BlockType.LANTERN });

    // Sweeping Roof with multiple iconic Gonjong horns (Minangkabau style)
    for (let x = -5; x <= 5; x++) {
      const dist = Math.abs(x);
      // Sweeping upward curved profile
      const hornCurve = dist >= 3 ? Math.floor(Math.pow(dist - 2, 1.6)) : 0;
      for (let z = -2; z <= 2; z++) {
        const roofY = 6 + hornCurve;
        if (Math.abs(z) === 2) {
          blocks.push({ dx: x, dy: roofY, dz: z, block: BlockType.WOOD_STAIRS });
        } else {
          blocks.push({ dx: x, dy: roofY + (1 - Math.abs(z)), dz: z, block: BlockType.PINE_LOG });
        }
      }
    }
    // Sharp Gonjong Horn finials on outermost ends
    blocks.push({ dx: -5, dy: 10, dz: 0, block: BlockType.WOOD_SLAB });
    blocks.push({ dx: 5, dy: 10, dz: 0, block: BlockType.WOOD_SLAB });
    return blocks;
  }

  public static generateRangkiang(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Minang rice granary on 4 tall stilts
    for (let x = -1; x <= 1; x += 2) {
      for (let z = -1; z <= 1; z += 2) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.STONE_PILLAR });
        blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.OAK_LOG });
        blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.OAK_LOG });
      }
    }
    // Raised granary box
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        blocks.push({ dx: x, dy: 3, dz: z, block: BlockType.WOOD_PLANKS });
        if (Math.abs(x) === 2 || Math.abs(z) === 2) {
          blocks.push({ dx: x, dy: 4, dz: z, block: BlockType.WOOD_PLANKS });
          blocks.push({ dx: x, dy: 5, dz: z, block: BlockType.WOOD_PLANKS });
        }
      }
    }
    // Inside storage
    blocks.push({ dx: 0, dy: 4, dz: 0, block: BlockType.CHEST });
    // Swept curved horn roof
    for (let x = -3; x <= 3; x++) {
      const up = Math.abs(x) === 3 ? 2 : Math.abs(x) === 2 ? 1 : 0;
      for (let z = -1; z <= 1; z++) {
        blocks.push({ dx: x, dy: 6 + up, dz: z, block: BlockType.PINE_LOG });
      }
    }
    return blocks;
  }

  public static generateJoglo(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Javanese Joglo (9x9 platform with central soko guru pillars)
    for (let x = -4; x <= 4; x++) {
      for (let z = -4; z <= 4; z++) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.STONE_BRICKS });
      }
    }
    // 4 Soko Guru Central Pillars
    const soko = [-1, 1];
    for (const sx of soko) {
      for (const sz of soko) {
        for (let y = 1; y <= 5; y++) {
          blocks.push({ dx: sx * 2, dy: y, dz: sz * 2, block: BlockType.OAK_LOG });
        }
      }
    }
    // Central Lantern
    blocks.push({ dx: 0, dy: 5, dz: 0, block: BlockType.LANTERN });

    // Peripheral veranda columns
    for (let x = -3; x <= 3; x += 3) {
      for (let z = -3; z <= 3; z += 3) {
        if (Math.abs(x) === 3 || Math.abs(z) === 3) {
          blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.FENCE_WOOD });
          blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.FENCE_WOOD });
        }
      }
    }

    // Outer low eave roof (Limasan veranda overhang)
    for (let x = -4; x <= 4; x++) {
      for (let z = -4; z <= 4; z++) {
        if (Math.abs(x) === 4 || Math.abs(z) === 4) {
          blocks.push({ dx: x, dy: 3, dz: z, block: BlockType.CLAY });
        }
      }
    }
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        if (Math.abs(x) === 3 || Math.abs(z) === 3) {
          blocks.push({ dx: x, dy: 4, dz: z, block: BlockType.CLAY });
        }
      }
    }
    // Steep Tajug / Brunjung Pyramid Peak over Soko Guru
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        blocks.push({ dx: x, dy: 5, dz: z, block: BlockType.WOOD_PLANKS });
      }
    }
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        blocks.push({ dx: x, dy: 6, dz: z, block: BlockType.WOOD_PLANKS });
      }
    }
    blocks.push({ dx: 0, dy: 7, dz: 0, block: BlockType.GOLD_BLOCK }); // Makuta top crown
    return blocks;
  }

  public static generateCandi(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Stepped andesite stone temple stupa (7x7 base)
    for (let y = 0; y <= 2; y++) {
      const s = 3 - y;
      for (let x = -s; x <= s; x++) {
        for (let z = -s; z <= s; z++) {
          blocks.push({ dx: x, dy: y, dz: z, block: BlockType.STONE_BRICKS });
        }
      }
    }
    // Inner hollow shrine room with relic altar
    for (let y = 3; y <= 5; y++) {
      for (let x = -2; x <= 2; x++) {
        for (let z = -2; z <= 2; z++) {
          if (Math.abs(x) === 2 || Math.abs(z) === 2) {
            blocks.push({ dx: x, dy: y, dz: z, block: BlockType.STONE_BRICKS });
          } else {
            blocks.push({ dx: x, dy: y, dz: z, block: BlockType.AIR });
          }
        }
      }
    }
    // Altar inside shrine
    blocks.push({ dx: 0, dy: 3, dz: 0, block: BlockType.ANCIENT_RUNE_STONE });
    blocks.push({ dx: 0, dy: 4, dz: 0, block: BlockType.LANTERN });
    // Arch entrance
    blocks.push({ dx: 0, dy: 3, dz: -2, block: BlockType.AIR });
    blocks.push({ dx: 0, dy: 4, dz: -2, block: BlockType.AIR });

    // Tiered Stupa Spire Top
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        blocks.push({ dx: x, dy: 6, dz: z, block: BlockType.STONE_BRICKS });
      }
    }
    blocks.push({ dx: 0, dy: 7, dz: 0, block: BlockType.STONE_PILLAR });
    blocks.push({ dx: 0, dy: 8, dz: 0, block: BlockType.STONE_SLAB });
    return blocks;
  }

  public static generateAncientStoneRuins(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Weathered collapsed temple ruin
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        if ((x + z) % 2 === 0) {
          blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.MOSS_STONE });
        } else {
          blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.STONE_BRICKS });
        }
      }
    }
    // Broken columns
    const cols = [[-2, -2, 4], [2, -2, 2], [-2, 2, 1], [2, 2, 3]];
    for (const [cx, cz, h] of cols) {
      for (let y = 1; y <= h; y++) {
        blocks.push({ dx: cx, dy: y, dz: cz, block: BlockType.STONE_PILLAR });
      }
    }
    // Central broken altar
    blocks.push({ dx: 0, dy: 1, dz: 0, block: BlockType.ANCIENT_RUNE_STONE });
    blocks.push({ dx: 0, dy: 2, dz: 0, block: BlockType.CHEST });
    return blocks;
  }

  public static generatePuraGate(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Balinese Candi Bentar (split entrance gate with carved wings)
    // Left Wing
    for (let y = 0; y <= 6; y++) {
      const width = Math.max(1, 3 - Math.floor(y / 2));
      for (let w = 0; w < width; w++) {
        const blk = y % 2 === 0 ? BlockType.STONE_BRICKS : BlockType.CLAY;
        blocks.push({ dx: -2 - w, dy: y, dz: 0, block: blk });
      }
    }
    blocks.push({ dx: -2, dy: 7, dz: 0, block: BlockType.STONE_SLAB });

    // Right Wing
    for (let y = 0; y <= 6; y++) {
      const width = Math.max(1, 3 - Math.floor(y / 2));
      for (let w = 0; w < width; w++) {
        const blk = y % 2 === 0 ? BlockType.STONE_BRICKS : BlockType.CLAY;
        blocks.push({ dx: 2 + w, dy: y, dz: 0, block: blk });
      }
    }
    blocks.push({ dx: 2, dy: 7, dz: 0, block: BlockType.STONE_SLAB });

    // Central pathway with offering stones
    blocks.push({ dx: -1, dy: 0, dz: 0, block: BlockType.STONE_BRICKS });
    blocks.push({ dx: 0, dy: 0, dz: 0, block: BlockType.STONE_BRICKS });
    blocks.push({ dx: 1, dy: 0, dz: 0, block: BlockType.STONE_BRICKS });
    blocks.push({ dx: -1, dy: 1, dz: -1, block: BlockType.LANTERN });
    blocks.push({ dx: 1, dy: 1, dz: -1, block: BlockType.LANTERN });
    return blocks;
  }

  public static generateSubakWaterGate(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Balinese Subak Water Division Weir & Sluice Gate
    for (let x = -3; x <= 3; x++) {
      blocks.push({ dx: x, dy: 0, dz: 0, block: BlockType.STONE_BRICKS });
      blocks.push({ dx: x, dy: 1, dz: -1, block: BlockType.STONE_BRICKS });
      blocks.push({ dx: x, dy: 1, dz: 1, block: BlockType.STONE_BRICKS });
      // Water channel in the center
      if (Math.abs(x) <= 2) {
        blocks.push({ dx: x, dy: 1, dz: 0, block: BlockType.WATER });
      }
    }
    // Wooden sluice dividing board & stone shrine
    blocks.push({ dx: 0, dy: 2, dz: 0, block: BlockType.WOOD_PLANKS });
    blocks.push({ dx: 2, dy: 2, dz: 1, block: BlockType.STONE_PILLAR });
    blocks.push({ dx: 2, dy: 3, dz: 1, block: BlockType.GLOWSTONE_CRYSTAL });
    return blocks;
  }

  public static generateMeruTower(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Balinese Pura Meru (Tiered Pagoda Tower, 3 tumpang tiers)
    // Base platform
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.STONE_BRICKS });
        blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.STONE_BRICKS });
      }
    }
    // Inner wooden core
    for (let y = 2; y <= 9; y++) {
      blocks.push({ dx: 0, dy: y, dz: 0, block: BlockType.OAK_LOG });
    }
    // Tier 1 Roof (Wide)
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        if (Math.abs(x) === 3 || Math.abs(z) === 3) {
          blocks.push({ dx: x, dy: 3, dz: z, block: BlockType.PINE_LEAVES });
        }
      }
    }
    // Tier 2 Roof (Medium)
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        if (Math.abs(x) === 2 || Math.abs(z) === 2) {
          blocks.push({ dx: x, dy: 5, dz: z, block: BlockType.PINE_LEAVES });
        }
      }
    }
    // Tier 3 Roof (Small)
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        blocks.push({ dx: x, dy: 7, dz: z, block: BlockType.PINE_LEAVES });
      }
    }
    // Crown
    blocks.push({ dx: 0, dy: 9, dz: 0, block: BlockType.GOLD_BLOCK });
    return blocks;
  }

  public static generateBetang(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Dayak Rumah Betang Longhouse (Stilts along riverbanks)
    for (let x = -6; x <= 6; x++) {
      for (let z = -2; z <= 2; z++) {
        // Heavy ironwood stilts
        if (x % 3 === 0 && (z === -2 || z === 2)) {
          blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.OAK_LOG });
          blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.OAK_LOG });
        }
        // Elevated wooden deck
        blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.WOOD_PLANKS });
      }
    }
    // Walls and partitions
    for (let y = 3; y <= 5; y++) {
      for (let x = -6; x <= 6; x++) {
        blocks.push({ dx: x, dy: y, dz: -2, block: BlockType.WOOD_PLANKS });
        blocks.push({ dx: x, dy: y, dz: 2, block: BlockType.WOOD_PLANKS });
      }
      for (let z = -1; z <= 1; z++) {
        blocks.push({ dx: -6, dy: y, dz: z, block: BlockType.WOOD_PLANKS });
        blocks.push({ dx: 6, dy: y, dz: z, block: BlockType.WOOD_PLANKS });
      }
    }
    // Windows and entrance
    blocks.push({ dx: 0, dy: 3, dz: -2, block: BlockType.AIR });
    blocks.push({ dx: 0, dy: 4, dz: -2, block: BlockType.AIR });
    blocks.push({ dx: -3, dy: 4, dz: -2, block: BlockType.FENCE_WOOD });
    blocks.push({ dx: 3, dy: 4, dz: -2, block: BlockType.FENCE_WOOD });
    blocks.push({ dx: 0, dy: 4, dz: 0, block: BlockType.TORCH });

    // Long gabled roof
    for (let x = -7; x <= 7; x++) {
      for (let z = -2; z <= 2; z++) {
        const roofH = 6 + (2 - Math.abs(z));
        blocks.push({ dx: x, dy: roofH, dz: z, block: BlockType.WOOD_PLANKS });
      }
    }
    return blocks;
  }

  public static generateRiverPier(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Wooden riverfront boardwalk & stilt pier for canoe docking
    for (let x = -1; x <= 1; x++) {
      for (let z = 0; z <= 6; z++) {
        // Pilings
        if (z % 2 === 0 && (x === -1 || x === 1)) {
          blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.OAK_LOG });
          blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.OAK_LOG });
        }
        // Boardwalk
        blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.WOOD_PLANKS });
      }
    }
    // Mooring posts & lantern
    blocks.push({ dx: -1, dy: 3, dz: 6, block: BlockType.FENCE_WOOD });
    blocks.push({ dx: 1, dy: 3, dz: 6, block: BlockType.FENCE_WOOD });
    blocks.push({ dx: 1, dy: 4, dz: 6, block: BlockType.LANTERN });
    return blocks;
  }

  public static generateTongkonan(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Toraja Tongkonan with sweeping boat-shaped curved roof
    for (let x = -3; x <= 3; x++) {
      for (let z = -2; z <= 2; z++) {
        // Foundation posts
        if (Math.abs(x) <= 2 && (z === -2 || z === 2)) {
          blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.OAK_LOG });
          blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.OAK_LOG });
        }
        blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.WOOD_PLANKS });
      }
    }
    // Decorated Living Quarters
    for (let y = 3; y <= 5; y++) {
      for (let x = -2; x <= 2; x++) {
        blocks.push({ dx: x, dy: y, dz: -2, block: BlockType.WOOD_PLANKS });
        blocks.push({ dx: x, dy: y, dz: 2, block: BlockType.WOOD_PLANKS });
      }
      for (let z = -1; z <= 1; z++) {
        blocks.push({ dx: -2, dy: y, dz: z, block: BlockType.WOOD_PLANKS });
        blocks.push({ dx: 2, dy: y, dz: z, block: BlockType.WOOD_PLANKS });
      }
    }
    // Central buffalo horn pillar (tulak somba)
    blocks.push({ dx: 0, dy: 1, dz: -2, block: BlockType.STONE_PILLAR });
    blocks.push({ dx: 0, dy: 2, dz: -2, block: BlockType.LANTERN });

    // Dramatic saddleback boat-shaped roof extending far forward and backward
    for (let x = -5; x <= 5; x++) {
      const dist = Math.abs(x);
      const sweepUp = dist >= 2 ? Math.floor(Math.pow(dist - 1, 1.7)) : 0;
      for (let z = -2; z <= 2; z++) {
        const y = 6 + sweepUp + (1 - Math.abs(z));
        blocks.push({ dx: x, dy: y, dz: z, block: BlockType.WOOD_PLANKS });
      }
    }
    return blocks;
  }

  public static generateCliffVault(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Toraja Cliff burial chamber with wooden effigy (tau-tau) balcony
    for (let x = -2; x <= 2; x++) {
      for (let y = 0; y <= 3; y++) {
        blocks.push({ dx: x, dy: y, dz: 0, block: BlockType.STONE_BRICKS });
      }
    }
    // Wooden tau-tau balcony
    for (let x = -2; x <= 2; x++) {
      blocks.push({ dx: x, dy: 1, dz: -1, block: BlockType.WOOD_PLANKS });
      blocks.push({ dx: x, dy: 2, dz: -1, block: BlockType.FENCE_WOOD });
    }
    // Effigy and chest
    blocks.push({ dx: 0, dy: 2, dz: 0, block: BlockType.AIR });
    blocks.push({ dx: 0, dy: 2, dz: 1, block: BlockType.CHEST });
    blocks.push({ dx: 0, dy: 3, dz: -1, block: BlockType.LANTERN });
    return blocks;
  }

  public static generateHonai(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Papuan highland circular thatched hut
    const radius = 3;
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const d2 = x * x + z * z;
        if (d2 <= radius * radius + 1) {
          // Dirt/wood floor
          blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.DIRT });
          // Lower circular wooden walls
          if (d2 >= (radius - 1) * (radius - 1)) {
            blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.WOOD_PLANKS });
            blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.WOOD_PLANKS });
          }
        }
      }
    }
    // Door opening
    blocks.push({ dx: 0, dy: 1, dz: -radius, block: BlockType.AIR });
    blocks.push({ dx: 0, dy: 2, dz: -radius, block: BlockType.AIR });

    // Central warm hearth (fire pit)
    blocks.push({ dx: 0, dy: 0, dz: 0, block: BlockType.COBBLESTONE });
    blocks.push({ dx: 0, dy: 1, dz: 0, block: BlockType.TORCH });

    // Domed Thatched Roof
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const d = Math.sqrt(x * x + z * z);
        if (d <= radius) {
          blocks.push({ dx: x, dy: 3, dz: z, block: BlockType.TALL_GRASS });
        }
        if (d <= 2) {
          blocks.push({ dx: x, dy: 4, dz: z, block: BlockType.TALL_GRASS });
        }
        if (d <= 1) {
          blocks.push({ dx: x, dy: 5, dz: z, block: BlockType.TALL_GRASS });
        }
      }
    }
    return blocks;
  }

  public static generateSasakLumbung(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Sasak traditional granary on circular disc-capped stilts with arched bonnet roof
    for (let x = -1; x <= 1; x += 2) {
      for (let z = -1; z <= 1; z += 2) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.SAND });
        blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.STONE_PILLAR });
        blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.WOOD_SLAB }); // Disc guard against pests
      }
    }
    // Raised platform
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        blocks.push({ dx: x, dy: 3, dz: z, block: BlockType.WOOD_PLANKS });
        if (Math.abs(x) === 2 || Math.abs(z) === 2) {
          blocks.push({ dx: x, dy: 4, dz: z, block: BlockType.WOOD_PLANKS });
        }
      }
    }
    blocks.push({ dx: 0, dy: 4, dz: 0, block: BlockType.CHEST });
    // Rounded arch thatched grass bonnet roof
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        blocks.push({ dx: x, dy: 5, dz: z, block: BlockType.TALL_GRASS });
        if (Math.abs(z) <= 1) {
          blocks.push({ dx: x, dy: 6, dz: z, block: BlockType.TALL_GRASS });
        }
      }
    }
    return blocks;
  }

  public static generateNusantaraStructure(type: string): VoxelBlockPlacement[] {
    switch (type) {
      // Minang
      case 'rumah_gadang': return NusantaraBuildingKit.generateRumahGadang(false);
      case 'rangkiang': return NusantaraBuildingKit.generateRangkiang('si_bayau_bayau');
      case 'surau': return NusantaraBuildingKit.generateSurau();
      case 'sawah_gazebo': return NusantaraBuildingKit.generateRangkiang('sitinjau_lauik');
      // Jawa
      case 'joglo': return NusantaraBuildingKit.generateJoglo();
      case 'limasan': return NusantaraBuildingKit.generateLimasan();
      case 'pendopo': return NusantaraBuildingKit.generatePendopo();
      case 'candi':
      case 'ancient_ruins': return NusantaraBuildingKit.generateAncientTempleComplex();
      case 'gapura_bata':
      case 'gapura': return NusantaraBuildingKit.generateGapuraMajapahit();
      // Bali
      case 'pura':
      case 'candi_bentar': return NusantaraBuildingKit.generateCandiBentar();
      case 'kori_agung':
      case 'kori_gate': return NusantaraBuildingKit.generateKoriAgung();
      case 'subak_gate': return NusantaraBuildingKit.generateSubakWaterDivision();
      case 'meru_tower': return NusantaraBuildingKit.generateMeruTower(5);
      case 'bale_kulkul': return NusantaraBuildingKit.generatePendopo();
      // Borneo
      case 'betang': return NusantaraBuildingKit.generateRumahBetang(24);
      case 'river_pier': return NusantaraBuildingKit.generateRiverPier(8);
      case 'stilt_fishery': return NusantaraBuildingKit.generateRiverPier(6);
      // Toraja
      case 'tongkonan': return NusantaraBuildingKit.generateTongkonan();
      case 'alang_granary':
      case 'alang': return NusantaraBuildingKit.generateAlangSurap();
      case 'cliff_vault': return NusantaraBuildingKit.generateCliffSanctuary();
      // Papua
      case 'honai': return NusantaraBuildingKit.generateHonai();
      case 'pilamo': return NusantaraBuildingKit.generateHonai();
      case 'highland_watchpost': return NusantaraBuildingKit.generateSasakLumbung();
      // Eastern Isles
      case 'sasak_lumbung': return NusantaraBuildingKit.generateSasakLumbung();
      case 'uma_kalada':
      case 'uma_mbaru': return NusantaraBuildingKit.generateUmaKalada();
      case 'coastal_stilt': return NusantaraBuildingKit.generateRiverPier(8);
      default: return [];
    }
  }

}