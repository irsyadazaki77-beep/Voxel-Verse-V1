// High Performance Zero-Allocation Greedy Voxel Mesher with Face Culling, AO, Texture Atlas UVs & Specialized Meshers
import { BlockShape, BlockType } from '../../types';
import { BLOCK_DEFS } from './BlockRegistry';
import { TextureAtlas } from './TextureAtlas';
import { BlockShapeResolver } from './BlockShapeResolver';
import { BlockState, BlockStateUtils, Direction6 } from './BlockState';

export interface TransferableMeshData {
  solidPositions: Float32Array;
  solidNormals: Float32Array;
  solidColors: Float32Array;
  solidUvs: Float32Array;
  solidTileRects: Float32Array;
  solidIndices: Uint32Array;
  solidMaterials: Float32Array;

  transPositions: Float32Array;
  transNormals: Float32Array;
  transColors: Float32Array;
  transUvs: Float32Array;
  transTileRects: Float32Array;
  transIndices: Uint32Array;
  transMaterials: Float32Array;

  waterPositions: Float32Array;
  waterNormals: Float32Array;
  waterColors: Float32Array;
  waterUvs: Float32Array;
  waterTileRects: Float32Array;
  waterIndices: Uint32Array;
  waterMaterials: Float32Array;
}

// Reusable High-Performance Typed Mesh Buffer Writer
class DynamicMeshBuffer {
  public positions: Float32Array;
  public normals: Float32Array;
  public colors: Float32Array;
  public uvs: Float32Array;
  public tileRects: Float32Array;
  public indices: Uint32Array;
  public materials: Float32Array;

  public vertexCount: number = 0;
  public indexCount: number = 0;

  constructor(initialVertexCapacity: number = 16384, initialIndexCapacity: number = 24576) {
    this.positions = new Float32Array(initialVertexCapacity * 3);
    this.normals = new Float32Array(initialVertexCapacity * 3);
    this.colors = new Float32Array(initialVertexCapacity * 3);
    this.uvs = new Float32Array(initialVertexCapacity * 2);
    this.tileRects = new Float32Array(initialVertexCapacity * 4);
    this.materials = new Float32Array(initialVertexCapacity);
    this.indices = new Uint32Array(initialIndexCapacity);
  }

  public reset(): void {
    this.vertexCount = 0;
    this.indexCount = 0;
  }

  private ensureVertexCapacity(additionalVertices: number): void {
    const required = this.vertexCount + additionalVertices;
    const currentCap = this.materials.length;
    if (required > currentCap) {
      const newCap = Math.max(required, currentCap * 2);
      
      const newPos = new Float32Array(newCap * 3);
      newPos.set(this.positions.subarray(0, this.vertexCount * 3));
      this.positions = newPos;

      const newNorm = new Float32Array(newCap * 3);
      newNorm.set(this.normals.subarray(0, this.vertexCount * 3));
      this.normals = newNorm;

      const newCol = new Float32Array(newCap * 3);
      newCol.set(this.colors.subarray(0, this.vertexCount * 3));
      this.colors = newCol;

      const newUv = new Float32Array(newCap * 2);
      newUv.set(this.uvs.subarray(0, this.vertexCount * 2));
      this.uvs = newUv;

      const newTile = new Float32Array(newCap * 4);
      newTile.set(this.tileRects.subarray(0, this.vertexCount * 4));
      this.tileRects = newTile;

      const newMat = new Float32Array(newCap);
      newMat.set(this.materials.subarray(0, this.vertexCount));
      this.materials = newMat;
    }
  }

  private ensureIndexCapacity(additionalIndices: number): void {
    const required = this.indexCount + additionalIndices;
    const currentCap = this.indices.length;
    if (required > currentCap) {
      const newCap = Math.max(required, currentCap * 2);
      const newInd = new Uint32Array(newCap);
      newInd.set(this.indices.subarray(0, this.indexCount));
      this.indices = newInd;
    }
  }

  public addQuad(
    x0: number, y0: number, z0: number,
    x1: number, y1: number, z1: number,
    x2: number, y2: number, z2: number,
    x3: number, y3: number, z3: number,
    nx: number, ny: number, nz: number,
    c0: number, c1: number, c2: number, c3: number,
    u0: number, v0: number,
    u1: number, v1: number,
    u2: number, v2: number,
    u3: number, v3: number,
    tuMin: number, tvMin: number, tuMax: number, tvMax: number,
    matClass: number
  ): void {
    this.ensureVertexCapacity(4);
    this.ensureIndexCapacity(6);

    const vIdx = this.vertexCount;
    const pOffset = vIdx * 3;
    const uvOffset = vIdx * 2;
    const tOffset = vIdx * 4;

    // Positions
    this.positions[pOffset] = x0;     this.positions[pOffset + 1] = y0; this.positions[pOffset + 2] = z0;
    this.positions[pOffset + 3] = x1; this.positions[pOffset + 4] = y1; this.positions[pOffset + 5] = z1;
    this.positions[pOffset + 6] = x2; this.positions[pOffset + 7] = y2; this.positions[pOffset + 8] = z2;
    this.positions[pOffset + 9] = x3; this.positions[pOffset + 10] = y3; this.positions[pOffset + 11] = z3;

    // Normals
    this.normals[pOffset] = nx;     this.normals[pOffset + 1] = ny; this.normals[pOffset + 2] = nz;
    this.normals[pOffset + 3] = nx; this.normals[pOffset + 4] = ny; this.normals[pOffset + 5] = nz;
    this.normals[pOffset + 6] = nx; this.normals[pOffset + 7] = ny; this.normals[pOffset + 8] = nz;
    this.normals[pOffset + 9] = nx; this.normals[pOffset + 10] = ny; this.normals[pOffset + 11] = nz;

    // Colors
    this.colors[pOffset] = c0;     this.colors[pOffset + 1] = c0; this.colors[pOffset + 2] = c0;
    this.colors[pOffset + 3] = c1; this.colors[pOffset + 4] = c1; this.colors[pOffset + 5] = c1;
    this.colors[pOffset + 6] = c2; this.colors[pOffset + 7] = c2; this.colors[pOffset + 8] = c2;
    this.colors[pOffset + 9] = c3; this.colors[pOffset + 10] = c3; this.colors[pOffset + 11] = c3;

    // UVs
    this.uvs[uvOffset] = u0;     this.uvs[uvOffset + 1] = v0;
    this.uvs[uvOffset + 2] = u1; this.uvs[uvOffset + 3] = v1;
    this.uvs[uvOffset + 4] = u2; this.uvs[uvOffset + 5] = v2;
    this.uvs[uvOffset + 6] = u3; this.uvs[uvOffset + 7] = v3;

    // TileRects
    for (let i = 0; i < 4; i++) {
      const to = tOffset + i * 4;
      this.tileRects[to] = tuMin;
      this.tileRects[to + 1] = tvMin;
      this.tileRects[to + 2] = tuMax;
      this.tileRects[to + 3] = tvMax;
    }

    // Materials
    this.materials[vIdx] = matClass;
    this.materials[vIdx + 1] = matClass;
    this.materials[vIdx + 2] = matClass;
    this.materials[vIdx + 3] = matClass;

    // Indices
    const iIdx = this.indexCount;
    this.indices[iIdx] = vIdx;
    this.indices[iIdx + 1] = vIdx + 1;
    this.indices[iIdx + 2] = vIdx + 2;
    this.indices[iIdx + 3] = vIdx;
    this.indices[iIdx + 4] = vIdx + 2;
    this.indices[iIdx + 5] = vIdx + 3;

    this.vertexCount += 4;
    this.indexCount += 6;
  }

  public toTransferable(): {
    positions: Float32Array;
    normals: Float32Array;
    colors: Float32Array;
    uvs: Float32Array;
    tileRects: Float32Array;
    indices: Uint32Array;
    materials: Float32Array;
  } {
    const v = this.vertexCount;
    const ind = this.indexCount;
    return {
      positions: this.positions.slice(0, v * 3),
      normals: this.normals.slice(0, v * 3),
      colors: this.colors.slice(0, v * 3),
      uvs: this.uvs.slice(0, v * 2),
      tileRects: this.tileRects.slice(0, v * 4),
      indices: this.indices.slice(0, ind),
      materials: this.materials.slice(0, v),
    };
  }
}

// Module-level reusable instances for single-threaded or worker-threaded execution
const solidBuffer = new DynamicMeshBuffer(24576, 36864);
const transBuffer = new DynamicMeshBuffer(4096, 6144);
const waterBuffer = new DynamicMeshBuffer(4096, 6144);
const reusableMask = new Int32Array(2048);

export class VoxelMesher {
  public static getBlockMaterialClass(block: number): number {
    switch (block) {
      case 2: // GRASS
        return 1;
      case 3: // STONE
      case 4: // COBBLESTONE
      case 17: // STONE_BRICKS
      case 18: // STONE_STAIRS
      case 19: // STONE_SLAB
      case 20: // STONE_PILLAR
      case 40: // OBSIDIAN
      case 41: // BASALT
      case 42: // MAGMA_ROCK
      case 43: // ANCIENT_RUNE_STONE
      case 54: // MOSS_STONE
      case 66: // ANVIL_SMITHING
      case 116: // TERRACOTTA_ROOF_TILE
      case 119: // CARVED_ANDESITE_STONE
      case 120: // VOLCANIC_BRICK
      case 124: // SPLIT_GATE_STONE
      case 126: // AETHER_CONDUIT_FLOOR
      case 130: // STONE_ALANG_PILLAR
        return 2; // STONE
      case 8: // OAK_LOG
      case 10: // PINE_LOG
      case 14: // WOOD_PLANKS
      case 15: // WOOD_STAIRS
      case 16: // WOOD_SLAB
      case 44: // CRAFTING_BENCH
      case 45: // FURNACE
      case 46: // CHEST
      case 47: // DOOR_BOTTOM
      case 48: // DOOR_TOP
      case 49: // FENCE_WOOD
      case 58: // BOOKSHELF
      case 110: // TEAK_WOOD_LOG
      case 111: // TEAK_WOOD_PLANKS
      case 112: // ULIN_IRONWOOD_LOG
      case 113: // ULIN_IRONWOOD_PLANKS
      case 114: // WOVEN_BAMBOO_GEDEK
      case 115: // BAMBOO_STALK_BLOCK
      case 121: // CARVED_WOOD_BEAM
      case 122: // WOODEN_SHUTTER
      case 123: // BAMBOO_FENCE
      case 127: // TERRACE_WATERWAY
      case 128: // RICE_STORAGE_CHEST
        return 3; // WOOD
      case 22: // COPPER_ORE
      case 23: // IRON_ORE
      case 24: // GOLD_ORE
      case 25: // MYTHRIL_ORE
      case 50: // COPPER_BLOCK
      case 51: // IRON_BLOCK
      case 52: // GOLD_BLOCK
      case 53: // MYTHRIL_BLOCK
        return 4; // METAL
      case 21: // GLASS
        return 5; // GLASS
      case 26: // AETHER_CRYSTAL_ORE
      case 32: // GLOWSTONE_CRYSTAL
      case 12: // CYAN_CRYSTAL_LOG
      case 13: // CYAN_CRYSTAL_LEAVES
      case 37: // LUMINESCENT_MUSHROOM
        return 6; // CRYSTAL
      case 77: // AETHER_CORE
      case 78: // AETHER_CORE_ADVANCED
      case 79: // LEY_CONDUIT
      case 80: // CRYSTAL_SENSOR
      case 81: // LOGIC_RUNE
      case 82: // DELAY_RUNE
      case 83: // PULSE_RUNE
      case 84: // LATCH_RUNE
      case 85: // AETHER_ACTUATOR
      case 86: // ITEM_FUNNEL
      case 87: // AETHER_STORAGE_RELAY
      case 88: // LEY_HARVESTER
      case 89: // IRRIGATION_NODE
      case 90: // RESONANCE_FABRICATOR
      case 91: // AETHER_SENTINEL_TURRET
      case 92: // AETHER_SPIKE
      case 93: // SHOCK_RUNE
      case 94: // FLAME_VENT
      case 95: // AETHER_LAMP
      case 96: // AETHER_RAIL
      case 97: // AETHER_RAIL_SWITCH
      case 98: // LEY_GENERATOR
      case 125: // AETHER_LANTERN
      case 131: // AETHER_ALTAR_CORE
        return 7; // AETHER
      case 29: // LAVA
        return 8; // LAVA
      case 28: // WATER
      case 39: // ICE
        return 9; // WATER
      case 9: // OAK_LEAVES
      case 11: // PINE_LEAVES
      case 33: // TALL_GRASS
      case 34: // BLUE_FLOWER
      case 35: // RED_FLOWER
      case 36: // SUN_ORCHID
      case 60: // CROP_WHEAT_0
      case 61: // CROP_WHEAT_1
      case 62: // CROP_WHEAT_2
      case 63: // CROP_WHEAT_3
      case 64: // CROP_CARROT
      case 65: // CROP_HERB
      case 117: // IJUK_THATCH_ROOF
      case 118: // ALANG_ALANG_THATCH
      case 129: // BATIK_CARPET_BLOCK
        return 10; // FOLIAGE
      case 1: // DIRT
      case 5: // SAND
      case 6: // GRAVEL
      case 7: // CLAY
      case 59: // FARMLAND
      default:
        return 0; // SOIL
    }
  }

  // Calculate vertex Ambient Occlusion (0 to 3)
  private static calculateAO(side1: boolean, side2: boolean, corner: boolean): number {
    if (side1 && side2) return 0;
    return 3 - ((side1 ? 1 : 0) + (side2 ? 1 : 0) + (corner ? 1 : 0));
  }

  private static aoToFactor(ao: number): number {
    return 0.58 + (ao / 3.0) * 0.42;
  }

  // Fast Block Property Checkers
  private static isSolidOpaque(block: BlockType): boolean {
    if (block === BlockType.AIR || block === BlockType.WATER) return false;
    const def = BLOCK_DEFS[block];
    return Boolean(def && def.solid && !def.transparent && (def.shape === 'full' || !def.shape));
  }

  private static isOccluding(block: BlockType, targetBlock: BlockType): boolean {
    if (block === BlockType.AIR) return false;
    if (targetBlock === BlockType.WATER && block === BlockType.WATER) return true;
    const def = BLOCK_DEFS[block];
    if (!def) return false;
    if (def.transparent && block === targetBlock) return true; // Cull interior leaves/glass
    return Boolean(def.solid && !def.transparent && def.shape === 'full');
  }

  public static buildChunkMeshData(
    getBlock: (lx: number, ly: number, lz: number) => BlockType | BlockState,
    chunkWidth: number,
    chunkHeight: number,
    chunkDepth: number
  ): TransferableMeshData {
    solidBuffer.reset();
    transBuffer.reset();
    waterBuffer.reset();

    const getBlockRaw = (x: number, y: number, z: number): { type: BlockType; state: BlockState } => {
      const raw = getBlock(x, y, z);
      if (typeof raw === 'number') {
        return { type: raw, state: BlockShapeResolver.getDefaultState(raw) };
      } else if (raw && typeof raw === 'object') {
        return { type: (raw as any).blockType ?? BlockType.AIR, state: raw as BlockState };
      }
      return { type: BlockType.AIR, state: BlockShapeResolver.getDefaultState(BlockType.AIR) };
    };

    const isSolidBlock = (x: number, y: number, z: number) => {
      const info = getBlockRaw(x, y, z);
      return VoxelMesher.isSolidOpaque(info.type);
    };

    // 1. HIGH SPEED ZERO-ALLOCATION GREEDY MESHING FOR FULL-CUBE BLOCKS
    for (let faceDir = 0; faceDir < 6; faceDir++) {
      const isTop = faceDir === 0;
      const isBottom = faceDir === 1;
      const isFront = faceDir === 2;
      const isBack = faceDir === 3;
      const isRight = faceDir === 4;
      const isLeft = faceDir === 5;

      let uMax = 0, vMax = 0, dMax = 0;
      if (isTop || isBottom) {
        dMax = chunkHeight; uMax = chunkWidth; vMax = chunkDepth;
      } else if (isFront || isBack) {
        dMax = chunkDepth; uMax = chunkWidth; vMax = chunkHeight;
      } else {
        dMax = chunkWidth; uMax = chunkDepth; vMax = chunkHeight;
      }

      const sliceSize = uMax * vMax;

      for (let d = 0; d < dMax; d++) {
        reusableMask.fill(0, 0, sliceSize);

        for (let v = 0; v < vMax; v++) {
          for (let u = 0; u < uMax; u++) {
            let x = 0, y = 0, z = 0;
            let nx = 0, ny = 0, nz = 0;

            if (isTop || isBottom) {
              x = u; y = d; z = v;
              ny = isTop ? 1 : -1;
            } else if (isFront || isBack) {
              x = u; y = v; z = d;
              nz = isFront ? 1 : -1;
            } else {
              x = d; y = v; z = u;
              nx = isRight ? 1 : -1;
            }

            const { type: block, state } = getBlockRaw(x, y, z);
            if (block === BlockType.AIR || block === BlockType.WATER) continue;

            const def = BLOCK_DEFS[block];
            if (!def) continue;

            // Only full standard cubes without custom non-Y axis or non-default facing in greedy mesher
            if (!BlockShapeResolver.isFullCube(block, state)) continue;
            if (state.axis && state.axis !== 'y') continue;
            if (state.facing && state.facing !== 'north' && state.facing !== 'up') continue;

            const neighborBlock = getBlockRaw(x + nx, y + ny, z + nz).type;
            if (VoxelMesher.isOccluding(neighborBlock, block)) continue;

            let ao0 = 3, ao1 = 3, ao2 = 3, ao3 = 3;
            if (isTop) {
              const sL = isSolidBlock(x - 1, y + 1, z), sR = isSolidBlock(x + 1, y + 1, z);
              const sB = isSolidBlock(x, y + 1, z - 1), sF = isSolidBlock(x, y + 1, z + 1);
              ao0 = VoxelMesher.calculateAO(sL, sF, isSolidBlock(x - 1, y + 1, z + 1));
              ao1 = VoxelMesher.calculateAO(sR, sF, isSolidBlock(x + 1, y + 1, z + 1));
              ao2 = VoxelMesher.calculateAO(sR, sB, isSolidBlock(x + 1, y + 1, z - 1));
              ao3 = VoxelMesher.calculateAO(sL, sB, isSolidBlock(x - 1, y + 1, z - 1));
            } else if (isBottom) {
              const sL = isSolidBlock(x - 1, y - 1, z), sR = isSolidBlock(x + 1, y - 1, z);
              const sB = isSolidBlock(x, y - 1, z - 1), sF = isSolidBlock(x, y - 1, z + 1);
              ao0 = VoxelMesher.calculateAO(sL, sB, isSolidBlock(x - 1, y - 1, z - 1));
              ao1 = VoxelMesher.calculateAO(sR, sB, isSolidBlock(x + 1, y - 1, z - 1));
              ao2 = VoxelMesher.calculateAO(sR, sF, isSolidBlock(x + 1, y - 1, z + 1));
              ao3 = VoxelMesher.calculateAO(sL, sF, isSolidBlock(x - 1, y - 1, z + 1));
            } else if (isFront) {
              const sL = isSolidBlock(x - 1, y, z + 1), sR = isSolidBlock(x + 1, y, z + 1);
              const sD = isSolidBlock(x, y - 1, z + 1), sU = isSolidBlock(x, y + 1, z + 1);
              ao0 = VoxelMesher.calculateAO(sL, sD, isSolidBlock(x - 1, y - 1, z + 1));
              ao1 = VoxelMesher.calculateAO(sR, sD, isSolidBlock(x + 1, y - 1, z + 1));
              ao2 = VoxelMesher.calculateAO(sR, sU, isSolidBlock(x + 1, y + 1, z + 1));
              ao3 = VoxelMesher.calculateAO(sL, sU, isSolidBlock(x - 1, y + 1, z + 1));
            } else if (isBack) {
              const sL = isSolidBlock(x + 1, y, z - 1), sR = isSolidBlock(x - 1, y, z - 1);
              const sD = isSolidBlock(x, y - 1, z - 1), sU = isSolidBlock(x, y + 1, z - 1);
              ao0 = VoxelMesher.calculateAO(sL, sD, isSolidBlock(x + 1, y - 1, z - 1));
              ao1 = VoxelMesher.calculateAO(sR, sD, isSolidBlock(x - 1, y - 1, z - 1));
              ao2 = VoxelMesher.calculateAO(sR, sU, isSolidBlock(x - 1, y + 1, z - 1));
              ao3 = VoxelMesher.calculateAO(sL, sU, isSolidBlock(x + 1, y + 1, z - 1));
            } else if (isRight) {
              const sL = isSolidBlock(x + 1, y, z + 1), sR = isSolidBlock(x + 1, y, z - 1);
              const sD = isSolidBlock(x + 1, y - 1, z), sU = isSolidBlock(x + 1, y + 1, z);
              ao0 = VoxelMesher.calculateAO(sL, sD, isSolidBlock(x + 1, y - 1, z + 1));
              ao1 = VoxelMesher.calculateAO(sR, sD, isSolidBlock(x + 1, y - 1, z - 1));
              ao2 = VoxelMesher.calculateAO(sR, sU, isSolidBlock(x + 1, y + 1, z - 1));
              ao3 = VoxelMesher.calculateAO(sL, sU, isSolidBlock(x + 1, y + 1, z + 1));
            } else if (isLeft) {
              const sL = isSolidBlock(x - 1, y, z - 1), sR = isSolidBlock(x - 1, y, z + 1);
              const sD = isSolidBlock(x - 1, y - 1, z), sU = isSolidBlock(x - 1, y + 1, z);
              ao0 = VoxelMesher.calculateAO(sL, sD, isSolidBlock(x - 1, y - 1, z - 1));
              ao1 = VoxelMesher.calculateAO(sR, sD, isSolidBlock(x - 1, y - 1, z + 1));
              ao2 = VoxelMesher.calculateAO(sR, sU, isSolidBlock(x - 1, y + 1, z + 1));
              ao3 = VoxelMesher.calculateAO(sL, sU, isSolidBlock(x - 1, y + 1, z - 1));
            }

            const isTrans = def.transparent ? 1 : 0;
            const packedKey = (block & 0xFFFF) | ((ao0 & 3) << 16) | ((ao1 & 3) << 18) | ((ao2 & 3) << 20) | ((ao3 & 3) << 22) | (isTrans << 24) | (1 << 25);
            reusableMask[u + v * uMax] = packedKey;
          }
        }

        // Fast Greedy Quad Merging using packed 32-bit integer equality
        for (let v = 0; v < vMax; v++) {
          for (let u = 0; u < uMax; u++) {
            const cell = reusableMask[u + v * uMax];
            if (cell === 0) continue;

            let w = 1;
            while (u + w < uMax) {
              if (reusableMask[(u + w) + v * uMax] === cell) w++;
              else break;
            }

            let h = 1;
            let canExtendH = true;
            while (v + h < vMax && canExtendH) {
              for (let k = 0; k < w; k++) {
                if (reusableMask[(u + k) + (v + h) * uMax] !== cell) {
                  canExtendH = false;
                  break;
                }
              }
              if (canExtendH) h++;
            }

            for (let dh = 0; dh < h; dh++) {
              for (let dw = 0; dw < w; dw++) {
                reusableMask[(u + dw) + (v + dh) * uMax] = 0;
              }
            }

            const block = cell & 0xFFFF;
            const ao0 = (cell >> 16) & 3;
            const ao1 = (cell >> 18) & 3;
            const ao2 = (cell >> 20) & 3;
            const ao3 = (cell >> 22) & 3;
            const isTransparent = ((cell >> 24) & 1) === 1;

            const faceType = isTop ? 'top' : isBottom ? 'bottom' : 'side';
            const tile = TextureAtlas.getTileForBlock(block, faceType);
            const [tuMin, tvMin, tuMax, tvMax] = TextureAtlas.getUVs(tile);

            const buffer = isTransparent ? transBuffer : solidBuffer;

            let x0 = 0, y0 = 0, z0 = 0;
            let x1 = 0, y1 = 0, z1 = 0;
            let x2 = 0, y2 = 0, z2 = 0;
            let x3 = 0, y3 = 0, z3 = 0;
            let nx = 0, ny = 0, nz = 0;
            let lu0x = 0, lu0y = 0;
            let lu1x = 0, lu1y = 0;
            let lu2x = 0, lu2y = 0;
            let lu3x = 0, lu3y = 0;

            if (isTop) {
              nx = 0; ny = 1; nz = 0;
              x0 = u;     y0 = d + 1; z0 = v + h; lu0x = 0; lu0y = h;
              x1 = u + w; y1 = d + 1; z1 = v + h; lu1x = w; lu1y = h;
              x2 = u + w; y2 = d + 1; z2 = v;     lu2x = w; lu2y = 0;
              x3 = u;     y3 = d + 1; z3 = v;     lu3x = 0; lu3y = 0;
            } else if (isBottom) {
              nx = 0; ny = -1; nz = 0;
              x0 = u;     y0 = d; z0 = v;     lu0x = 0; lu0y = 0;
              x1 = u + w; y1 = d; z1 = v;     lu1x = w; lu1y = 0;
              x2 = u + w; y2 = d; z2 = v + h; lu2x = w; lu2y = h;
              x3 = u;     y3 = d; z3 = v + h; lu3x = 0; lu3y = h;
            } else if (isFront) {
              nx = 0; ny = 0; nz = 1;
              x0 = u;     y0 = v;     z0 = d + 1; lu0x = 0; lu0y = 0;
              x1 = u + w; y1 = v;     z1 = d + 1; lu1x = w; lu1y = 0;
              x2 = u + w; y2 = v + h; z2 = d + 1; lu2x = w; lu2y = h;
              x3 = u;     y3 = v + h; z3 = d + 1; lu3x = 0; lu3y = h;
            } else if (isBack) {
              nx = 0; ny = 0; nz = -1;
              x0 = u + w; y0 = v;     z0 = d; lu0x = w; lu0y = 0;
              x1 = u;     y1 = v;     z1 = d; lu1x = 0; lu1y = 0;
              x2 = u;     y2 = v + h; z2 = d; lu2x = 0; lu2y = h;
              x3 = u + w; y3 = v + h; z3 = d; lu3x = w; lu3y = h;
            } else if (isRight) {
              nx = 1; ny = 0; nz = 0;
              x0 = d + 1; y0 = v;     z0 = u + w; lu0x = w; lu0y = 0;
              x1 = d + 1; y1 = v;     z1 = u;     lu1x = 0; lu1y = 0;
              x2 = d + 1; y2 = v + h; z2 = u;     lu2x = 0; lu2y = h;
              x3 = d + 1; y3 = v + h; z3 = u + w; lu3x = w; lu3y = h;
            } else if (isLeft) {
              nx = -1; ny = 0; nz = 0;
              x0 = d; y0 = v;     z0 = u;     lu0x = 0; lu0y = 0;
              x1 = d; y1 = v;     z1 = u + w; lu1x = w; lu1y = 0;
              x2 = d; y2 = v + h; z2 = u + w; lu2x = w; lu2y = h;
              x3 = d; y3 = v + h; z3 = u;     lu3x = 0; lu3y = h;
            }

            const dirShade = isTop ? 1.0 : isBottom ? 0.68 : (isFront || isBack) ? 0.85 : 0.90;
            const f0 = VoxelMesher.aoToFactor(ao0) * dirShade;
            const f1 = VoxelMesher.aoToFactor(ao1) * dirShade;
            const f2 = VoxelMesher.aoToFactor(ao2) * dirShade;
            const f3 = VoxelMesher.aoToFactor(ao3) * dirShade;
            const matClass = VoxelMesher.getBlockMaterialClass(block);

            buffer.addQuad(
              x0, y0, z0,
              x1, y1, z1,
              x2, y2, z2,
              x3, y3, z3,
              nx, ny, nz,
              f0, f1, f2, f3,
              lu0x, lu0y,
              lu1x, lu1y,
              lu2x, lu2y,
              lu3x, lu3y,
              tuMin, tvMin, tuMax, tvMax,
              matClass
            );
          }
        }
      }
    }

    // 2. CANONICAL BLOCK SHAPE RESOLVER MESHING FOR SPECIALIZED/DIRECTIONAL SHAPES
    for (let x = 0; x < chunkWidth; x++) {
      for (let y = 0; y < chunkHeight; y++) {
        for (let z = 0; z < chunkDepth; z++) {
          const { type: block, state } = getBlockRaw(x, y, z);
          if (block === BlockType.AIR) continue;

          const def = BLOCK_DEFS[block];
          if (!def) continue;

          // Water specialized mesher
          if (block === BlockType.WATER) {
            const topBlock = getBlockRaw(x, y + 1, z).type;
            if (topBlock !== BlockType.WATER) {
              const tile = TextureAtlas.getTileForBlock(block, 'top');
              const [uMin, vMin, uMax, vMax] = TextureAtlas.getUVs(tile);

              // Calculate depth for visual polish
              let depthCount = 1;
              for (let dy = 1; dy <= 12; dy++) {
                if (getBlockRaw(x, y - dy, z).type === BlockType.WATER) depthCount++;
                else break;
              }
              const depthFactor = Math.min(depthCount / 12.0, 1.0);

              let shoreFactor = 0.0;
              const isSolid = (bx: number, by: number, bz: number) => VoxelMesher.isSolidOpaque(getBlockRaw(bx, by, bz).type);

              if (isSolid(x - 1, y, z) || isSolid(x + 1, y, z) || isSolid(x, y, z - 1) || isSolid(x, y, z + 1)) {
                shoreFactor = 1.0;
              } else if (isSolid(x, y - 1, z)) {
                shoreFactor = 0.88;
              } else if (isSolid(x - 1, y - 1, z) || isSolid(x + 1, y - 1, z) || isSolid(x, y - 1, z - 1) || isSolid(x, y - 1, z + 1)) {
                shoreFactor = 0.72;
              } else if (isSolid(x - 2, y, z) || isSolid(x + 2, y, z) || isSolid(x, y, z - 2) || isSolid(x, y, z + 2)) {
                shoreFactor = 0.45;
              }

              waterBuffer.addQuad(
                x, y + 0.88, z + 1,
                x + 1, y + 0.88, z + 1,
                x + 1, y + 0.88, z,
                x, y + 0.88, z,
                0, 1, 0,
                depthFactor, depthFactor, depthFactor, depthFactor,
                0, 0,
                1, 0,
                1, 1,
                0, 1,
                uMin, vMin, uMax, vMax,
                9 // WATER
              );
            }
            continue;
          }

          // If block was already processed as standard full cube in section 1
          if (BlockShapeResolver.isFullCube(block, state) && (!state.axis || state.axis === 'y') && (!state.facing || state.facing === 'north' || state.facing === 'up')) {
            continue;
          }

          // Foliage Cross Shape (Flowers, Tall Grass, Crops, Mushrooms)
          if (def.shape === 'cross') {
            const tile = TextureAtlas.getTileForBlock(block, 'side');
            const [uMin, vMin, uMax, vMax] = TextureAtlas.getUVs(tile);
            const matClass = VoxelMesher.getBlockMaterialClass(block);

            transBuffer.addQuad(
              x + 0.15, y, z + 0.15,
              x + 0.85, y, z + 0.85,
              x + 0.85, y + 0.9, z + 0.85,
              x + 0.15, y + 0.9, z + 0.15,
              -0.707, 0, 0.707,
              1.0, 1.0, 1.0, 1.0,
              0, 0, 1, 0, 1, 1, 0, 1,
              uMin, vMin, uMax, vMax,
              matClass
            );

            transBuffer.addQuad(
              x + 0.15, y, z + 0.85,
              x + 0.85, y, z + 0.15,
              x + 0.85, y + 0.9, z + 0.15,
              x + 0.15, y + 0.9, z + 0.85,
              0.707, 0, 0.707,
              1.0, 1.0, 1.0, 1.0,
              0, 0, 1, 0, 1, 1, 0, 1,
              uMin, vMin, uMax, vMax,
              matClass
            );
            continue;
          }

          // Canonical BlockShapeResolver Rendering Quads for all complex shapes
          const isNeighborSolid = (face: Direction6) => {
            let nx = 0, ny = 0, nz = 0;
            switch (face) {
              case 'up': ny = 1; break;
              case 'down': ny = -1; break;
              case 'north': nz = -1; break;
              case 'south': nz = 1; break;
              case 'east': nx = 1; break;
              case 'west': nx = -1; break;
            }
            const neighbor = getBlockRaw(x + nx, y + ny, z + nz).type;
            return VoxelMesher.isOccluding(neighbor, block);
          };

          const quads = BlockShapeResolver.getRenderQuads(block, state, isNeighborSolid);
          const isTrans = Boolean(def.transparent);
          const buffer = isTrans ? transBuffer : solidBuffer;
          const matClass = VoxelMesher.getBlockMaterialClass(block);

          for (const q of quads) {
            const tileFace = q.colorType ?? (q.faceType === 'top' ? 'top' : q.faceType === 'bottom' ? 'bottom' : 'side');
            const tile = TextureAtlas.getTileForBlock(block, tileFace);
            const [tuMin, tvMin, tuMax, tvMax] = TextureAtlas.getUVs(tile);

            const dirShade = q.normal[1] > 0.5 ? 1.0 : q.normal[1] < -0.5 ? 0.68 : (Math.abs(q.normal[2]) > 0.5) ? 0.85 : 0.90;
            const p0 = q.positions[0];
            const p1 = q.positions[1];
            const p2 = q.positions[2];
            const p3 = q.positions[3];

            buffer.addQuad(
              x + p0[0], y + p0[1], z + p0[2],
              x + p1[0], y + p1[1], z + p1[2],
              x + p2[0], y + p2[1], z + p2[2],
              x + p3[0], y + p3[1], z + p3[2],
              q.normal[0], q.normal[1], q.normal[2],
              dirShade, dirShade, dirShade, dirShade,
              q.uvs[0][0], q.uvs[0][1],
              q.uvs[1][0], q.uvs[1][1],
              q.uvs[2][0], q.uvs[2][1],
              q.uvs[3][0], q.uvs[3][1],
              tuMin, tvMin, tuMax, tvMax,
              matClass
            );
          }
        }
      }
    }

    // 3. CONVERT BUFFERS TO COMPACT TRANSFERABLE TYPED ARRAYS
    const solid = solidBuffer.toTransferable();
    const trans = transBuffer.toTransferable();
    const water = waterBuffer.toTransferable();

    return {
      solidPositions: solid.positions,
      solidNormals: solid.normals,
      solidColors: solid.colors,
      solidUvs: solid.uvs,
      solidTileRects: solid.tileRects,
      solidIndices: solid.indices,
      solidMaterials: solid.materials,

      transPositions: trans.positions,
      transNormals: trans.normals,
      transColors: trans.colors,
      transUvs: trans.uvs,
      transTileRects: trans.tileRects,
      transIndices: trans.indices,
      transMaterials: trans.materials,

      waterPositions: water.positions,
      waterNormals: water.normals,
      waterColors: water.colors,
      waterUvs: water.uvs,
      waterTileRects: water.tileRects,
      waterIndices: water.indices,
      waterMaterials: water.materials,
    };
  }
}

