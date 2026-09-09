// High Performance Greedy Voxel Mesher with Face Culling, AO, Texture Atlas UVs & Specialized Meshers
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

export interface ChunkMeshData {
  solidPositions: number[];
  solidNormals: number[];
  solidColors: number[];
  solidUvs: number[];
  solidTileRects: number[];
  solidIndices: number[];
  solidMaterials: number[];

  transPositions: number[];
  transNormals: number[];
  transColors: number[];
  transUvs: number[];
  transTileRects: number[];
  transIndices: number[];
  transMaterials: number[];

  waterPositions: number[];
  waterNormals: number[];
  waterColors: number[];
  waterUvs: number[];
  waterTileRects: number[];
  waterIndices: number[];
  waterMaterials: number[];
}

export class VoxelMesher {
  public static getBlockMaterialClass(block: number): number {
    switch (block) {
      case 2: // GRASS
        return 1; // GRASS
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
    // Balanced AO response: preserves geometric depth while keeping corners readable in darkness
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
    const data: ChunkMeshData = {
      solidPositions: [],
      solidNormals: [],
      solidColors: [],
      solidUvs: [],
      solidTileRects: [],
      solidIndices: [],
      solidMaterials: [],

      transPositions: [],
      transNormals: [],
      transColors: [],
      transUvs: [],
      transTileRects: [],
      transIndices: [],
      transMaterials: [],

      waterPositions: [],
      waterNormals: [],
      waterColors: [],
      waterUvs: [],
      waterTileRects: [],
      waterIndices: [],
      waterMaterials: [],
    };

    let solidIndexOffset = 0;
    let transIndexOffset = 0;
    let waterIndexOffset = 0;

    const getBlockRaw = (x: number, y: number, z: number): { type: BlockType; state: BlockState } => {
      const raw = getBlock(x, y, z);
      if (typeof raw === 'number') {
        return { type: raw, state: BlockShapeResolver.getDefaultState(raw) };
      } else if (raw && typeof raw === 'object') {
        return { type: (raw as any).blockType ?? BlockType.AIR, state: raw as BlockState };
      }
      return { type: BlockType.AIR, state: BlockShapeResolver.getDefaultState(BlockType.AIR) };
    };

    // Helper for adding non-greedy / specialized shapes
    const isSolidBlock = (x: number, y: number, z: number) => {
      const info = getBlockRaw(x, y, z);
      return VoxelMesher.isSolidOpaque(info.type);
    };

    // 1. GREEDY MESHING FOR FULL-CUBE BLOCKS
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

      for (let d = 0; d < dMax; d++) {
        const mask = new Array(uMax * vMax).fill(null);

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

            const faceKey = `${block}_${ao0}_${ao1}_${ao2}_${ao3}`;
            mask[u + v * uMax] = { block, faceKey, ao0, ao1, ao2, ao3, transparent: Boolean(def.transparent) };
          }
        }

        // Greedy Quad Merging
        for (let v = 0; v < vMax; v++) {
          for (let u = 0; u < uMax; u++) {
            const cell = mask[u + v * uMax];
            if (!cell) continue;

            let w = 1;
            while (u + w < uMax) {
              const nextCell = mask[(u + w) + v * uMax];
              if (nextCell && nextCell.faceKey === cell.faceKey) w++;
              else break;
            }

            let h = 1;
            let canExtendH = true;
            while (v + h < vMax && canExtendH) {
              for (let k = 0; k < w; k++) {
                const nextCell = mask[(u + k) + (v + h) * uMax];
                if (!nextCell || nextCell.faceKey !== cell.faceKey) {
                  canExtendH = false;
                  break;
                }
              }
              if (canExtendH) h++;
            }

            for (let dh = 0; dh < h; dh++) {
              for (let dw = 0; dw < w; dw++) {
                mask[(u + dw) + (v + dh) * uMax] = null;
              }
            }

            const block = cell.block;
            const faceType = isTop ? 'top' : isBottom ? 'bottom' : 'side';
            const tile = TextureAtlas.getTileForBlock(block, faceType);
            const [tuMin, tvMin, tuMax, tvMax] = TextureAtlas.getUVs(tile);

            let positions = cell.transparent ? data.transPositions : data.solidPositions;
            let normals = cell.transparent ? data.transNormals : data.solidNormals;
            let colors = cell.transparent ? data.transColors : data.solidColors;
            let uvs = cell.transparent ? data.transUvs : data.solidUvs;
            let tileRects = cell.transparent ? data.transTileRects : data.solidTileRects;
            let indices = cell.transparent ? data.transIndices : data.solidIndices;
            let indexOffset = cell.transparent ? transIndexOffset : solidIndexOffset;

            let x0 = 0, y0 = 0, z0 = 0;
            let x1 = 0, y1 = 0, z1 = 0;
            let x2 = 0, y2 = 0, z2 = 0;
            let x3 = 0, y3 = 0, z3 = 0;
            let norm: [number, number, number] = [0, 0, 0];
            let lu0: [number, number] = [0, 0];
            let lu1: [number, number] = [0, 0];
            let lu2: [number, number] = [0, 0];
            let lu3: [number, number] = [0, 0];

            if (isTop) {
              norm = [0, 1, 0];
              x0 = u;     y0 = d + 1; z0 = v + h; lu0 = [0, h];
              x1 = u + w; y1 = d + 1; z1 = v + h; lu1 = [w, h];
              x2 = u + w; y2 = d + 1; z2 = v;     lu2 = [w, 0];
              x3 = u;     y3 = d + 1; z3 = v;     lu3 = [0, 0];
            } else if (isBottom) {
              norm = [0, -1, 0];
              x0 = u;     y0 = d; z0 = v;     lu0 = [0, 0];
              x1 = u + w; y1 = d; z1 = v;     lu1 = [w, 0];
              x2 = u + w; y2 = d; z2 = v + h; lu2 = [w, h];
              x3 = u;     y3 = d; z3 = v + h; lu3 = [0, h];
            } else if (isFront) {
              norm = [0, 0, 1];
              x0 = u;     y0 = v;     z0 = d + 1; lu0 = [0, 0];
              x1 = u + w; y1 = v;     z1 = d + 1; lu1 = [w, 0];
              x2 = u + w; y2 = v + h; z2 = d + 1; lu2 = [w, h];
              x3 = u;     y3 = v + h; z3 = d + 1; lu3 = [0, h];
            } else if (isBack) {
              norm = [0, 0, -1];
              x0 = u + w; y0 = v;     z0 = d; lu0 = [w, 0];
              x1 = u;     y1 = v;     z1 = d; lu1 = [0, 0];
              x2 = u;     y2 = v + h; z2 = d; lu2 = [0, h];
              x3 = u + w; y3 = v + h; z3 = d; lu3 = [w, h];
            } else if (isRight) {
              norm = [1, 0, 0];
              x0 = d + 1; y0 = v;     z0 = u + w; lu0 = [w, 0];
              x1 = d + 1; y1 = v;     z1 = u;     lu1 = [0, 0];
              x2 = d + 1; y2 = v + h; z2 = u;     lu2 = [0, h];
              x3 = d + 1; y3 = v + h; z3 = u + w; lu3 = [w, h];
            } else if (isLeft) {
              norm = [-1, 0, 0];
              x0 = d; y0 = v;     z0 = u;     lu0 = [0, 0];
              x1 = d; y1 = v;     z1 = u + w; lu1 = [w, 0];
              x2 = d; y2 = v + h; z2 = u + w; lu2 = [w, h];
              x3 = d; y3 = v + h; z3 = u;     lu3 = [0, h];
            }

            positions.push(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3);
            normals.push(...norm, ...norm, ...norm, ...norm);

            const dirShade = isTop ? 1.0 : isBottom ? 0.68 : (isFront || isBack) ? 0.85 : 0.90;
            const f0 = VoxelMesher.aoToFactor(cell.ao0) * dirShade;
            const f1 = VoxelMesher.aoToFactor(cell.ao1) * dirShade;
            const f2 = VoxelMesher.aoToFactor(cell.ao2) * dirShade;
            const f3 = VoxelMesher.aoToFactor(cell.ao3) * dirShade;
            colors.push(f0, f0, f0, f1, f1, f1, f2, f2, f2, f3, f3, f3);

            // Local quad UVs (0..w, 0..h)
            uvs.push(...lu0, ...lu1, ...lu2, ...lu3);

            // Atlas tile bounding rect (tuMin, tvMin, tuMax, tvMax)
            tileRects.push(
              tuMin, tvMin, tuMax, tvMax,
              tuMin, tvMin, tuMax, tvMax,
              tuMin, tvMin, tuMax, tvMax,
              tuMin, tvMin, tuMax, tvMax
            );

            let materials = cell.transparent ? data.transMaterials : data.solidMaterials;
            const matClass = VoxelMesher.getBlockMaterialClass(block);
            materials.push(matClass, matClass, matClass, matClass);

            indices.push(indexOffset, indexOffset + 1, indexOffset + 2, indexOffset, indexOffset + 2, indexOffset + 3);

            if (cell.transparent) transIndexOffset += 4;
            else solidIndexOffset += 4;
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
              } else if (isSolid(x - 1, y, z - 1) || isSolid(x + 1, y, z - 1) || isSolid(x - 1, y, z + 1) || isSolid(x + 1, y, z + 1)) {
                shoreFactor = 0.72;
              } else if (isSolid(x - 2, y, z) || isSolid(x + 2, y, z) || isSolid(x, y, z - 2) || isSolid(x, y, z + 2)) {
                shoreFactor = 0.45;
              }

              data.waterPositions.push(
                x, y + 0.88, z + 1,
                x + 1, y + 0.88, z + 1,
                x + 1, y + 0.88, z,
                x, y + 0.88, z
              );
              data.waterNormals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
              
              for (let i = 0; i < 4; i++) data.waterColors.push(depthFactor, shoreFactor, 1.0);
              
              const matClass = 9; // WATER
              for (let i = 0; i < 4; i++) data.waterMaterials.push(matClass);
              
              data.waterUvs.push(0, 0, 1, 0, 1, 1, 0, 1);
              data.waterTileRects.push(
                uMin, vMin, uMax, vMax,
                uMin, vMin, uMax, vMax,
                uMin, vMin, uMax, vMax,
                uMin, vMin, uMax, vMax
              );
              data.waterIndices.push(waterIndexOffset, waterIndexOffset + 1, waterIndexOffset + 2, waterIndexOffset, waterIndexOffset + 2, waterIndexOffset + 3);
              waterIndexOffset += 4;
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

            const addCrossQuad = (x1: number, z1: number, x2: number, z2: number, norm: [number, number, number]) => {
              data.transPositions.push(
                x + x1, y, z + z1,
                x + x2, y, z + z2,
                x + x2, y + 0.9, z + z2,
                x + x1, y + 0.9, z + z1
              );
              data.transNormals.push(...norm, ...norm, ...norm, ...norm);
              for (let i = 0; i < 4; i++) data.transColors.push(1.0, 1.0, 1.0);
              
              const matClass = VoxelMesher.getBlockMaterialClass(block);
              for (let i = 0; i < 4; i++) data.transMaterials.push(matClass);

              data.transUvs.push(0, 0, 1, 0, 1, 1, 0, 1);
              data.transTileRects.push(
                uMin, vMin, uMax, vMax,
                uMin, vMin, uMax, vMax,
                uMin, vMin, uMax, vMax,
                uMin, vMin, uMax, vMax
              );
              data.transIndices.push(transIndexOffset, transIndexOffset + 1, transIndexOffset + 2, transIndexOffset, transIndexOffset + 2, transIndexOffset + 3);
              data.transIndices.push(transIndexOffset, transIndexOffset + 2, transIndexOffset + 1, transIndexOffset, transIndexOffset + 3, transIndexOffset + 2);
              transIndexOffset += 4;
            };

            addCrossQuad(0.15, 0.15, 0.85, 0.85, [-0.707, 0, 0.707]);
            addCrossQuad(0.15, 0.85, 0.85, 0.15, [0.707, 0, 0.707]);
            continue;
          }

          // Canonical BlockShapeResolver Rendering Quads for all shapes
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

          let positions = isTrans ? data.transPositions : data.solidPositions;
          let normals = isTrans ? data.transNormals : data.solidNormals;
          let colors = isTrans ? data.transColors : data.solidColors;
          let uvs = isTrans ? data.transUvs : data.solidUvs;
          let tileRects = isTrans ? data.transTileRects : data.solidTileRects;
          let indices = isTrans ? data.transIndices : data.solidIndices;
          const matClass = VoxelMesher.getBlockMaterialClass(block);
          let materials = isTrans ? data.transMaterials : data.solidMaterials;

          for (const q of quads) {
            const curOffset = isTrans ? transIndexOffset : solidIndexOffset;

            // Resolve tile face
            const tileFace = q.colorType ?? (q.faceType === 'top' ? 'top' : q.faceType === 'bottom' ? 'bottom' : 'side');
            const tile = TextureAtlas.getTileForBlock(block, tileFace);
            const [tuMin, tvMin, tuMax, tvMax] = TextureAtlas.getUVs(tile);

            for (let v = 0; v < 4; v++) {
              const p = q.positions[v];
              positions.push(x + p[0], y + p[1], z + p[2]);
              normals.push(q.normal[0], q.normal[1], q.normal[2]);

              const dirShade = q.normal[1] > 0.5 ? 1.0 : q.normal[1] < -0.5 ? 0.68 : (Math.abs(q.normal[2]) > 0.5) ? 0.85 : 0.90;
              colors.push(dirShade, dirShade, dirShade);
              materials.push(matClass);
            }

            uvs.push(
              q.uvs[0][0], q.uvs[0][1],
              q.uvs[1][0], q.uvs[1][1],
              q.uvs[2][0], q.uvs[2][1],
              q.uvs[3][0], q.uvs[3][1]
            );

            tileRects.push(
              tuMin, tvMin, tuMax, tvMax,
              tuMin, tvMin, tuMax, tvMax,
              tuMin, tvMin, tuMax, tvMax,
              tuMin, tvMin, tuMax, tvMax
            );

            indices.push(curOffset, curOffset + 1, curOffset + 2, curOffset, curOffset + 2, curOffset + 3);
            if (isTrans) transIndexOffset += 4;
            else solidIndexOffset += 4;
          }
        }
      }
    }

    // 3. CONVERT ARRAYS TO TYPED ARRAYS FOR WORKER TRANSFER
    return {
      solidPositions: new Float32Array(data.solidPositions),
      solidNormals: new Float32Array(data.solidNormals),
      solidColors: new Float32Array(data.solidColors),
      solidUvs: new Float32Array(data.solidUvs),
      solidTileRects: new Float32Array(data.solidTileRects),
      solidIndices: new Uint32Array(data.solidIndices),
      solidMaterials: new Float32Array(data.solidMaterials),

      transPositions: new Float32Array(data.transPositions),
      transNormals: new Float32Array(data.transNormals),
      transColors: new Float32Array(data.transColors),
      transUvs: new Float32Array(data.transUvs),
      transTileRects: new Float32Array(data.transTileRects),
      transIndices: new Uint32Array(data.transIndices),
      transMaterials: new Float32Array(data.transMaterials),

      waterPositions: new Float32Array(data.waterPositions),
      waterNormals: new Float32Array(data.waterNormals),
      waterColors: new Float32Array(data.waterColors),
      waterUvs: new Float32Array(data.waterUvs),
      waterTileRects: new Float32Array(data.waterTileRects),
      waterIndices: new Uint32Array(data.waterIndices),
      waterMaterials: new Float32Array(data.waterMaterials),
    };
  }
}
