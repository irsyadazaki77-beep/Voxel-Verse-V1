// High Performance Greedy Voxel Mesher with Face Culling, AO, Texture Atlas UVs & Specialized Meshers
import { BlockShape, BlockType } from '../../types';
import { BLOCK_DEFS } from './BlockRegistry';
import { TextureAtlas } from './TextureAtlas';


export interface TransferableMeshData {
  solidPositions: Float32Array;
  solidNormals: Float32Array;
  solidColors: Float32Array;
  solidUvs: Float32Array;
  solidIndices: Uint32Array;
  transPositions: Float32Array;
  transNormals: Float32Array;
  transColors: Float32Array;
  transUvs: Float32Array;
  transIndices: Uint32Array;
  waterPositions: Float32Array;
  waterNormals: Float32Array;
  waterColors: Float32Array;
  waterUvs: Float32Array;
  waterIndices: Uint32Array;
}
export interface ChunkMeshData {
  solidPositions: number[];
  solidNormals: number[];
  solidColors: number[];
  solidUvs: number[];
  solidIndices: number[];

  transPositions: number[];
  transNormals: number[];
  transColors: number[];
  transUvs: number[];
  transIndices: number[];

  waterPositions: number[];
  waterNormals: number[];
  waterColors: number[];
  waterUvs: number[];
  waterIndices: number[];
}

export class VoxelMesher {
  // Calculate vertex Ambient Occlusion (0 to 3)
  private static calculateAO(side1: boolean, side2: boolean, corner: boolean): number {
    if (side1 && side2) return 0;
    return 3 - ((side1 ? 1 : 0) + (side2 ? 1 : 0) + (corner ? 1 : 0));
  }

  private static aoToFactor(ao: number): number {
    return 0.55 + (ao / 3.0) * 0.45;
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
    getBlock: (lx: number, ly: number, lz: number) => BlockType,
    chunkWidth: number,
    chunkHeight: number,
    chunkDepth: number
  ): TransferableMeshData {
    const data: ChunkMeshData = {
      solidPositions: [],
      solidNormals: [],
      solidColors: [],
      solidUvs: [],
      solidIndices: [],

      transPositions: [],
      transNormals: [],
      transColors: [],
      transUvs: [],
      transIndices: [],

      waterPositions: [],
      waterNormals: [],
      waterColors: [],
      waterUvs: [],
      waterIndices: [],
    };

    let solidIndexOffset = 0;
    let transIndexOffset = 0;
    let waterIndexOffset = 0;

    // Helper for adding non-greedy / specialized shapes
    const isSolidBlock = (x: number, y: number, z: number) => VoxelMesher.isSolidOpaque(getBlock(x, y, z));

    // 1. GREEDY MESHING FOR FULL-CUBE BLOCKS
    // Sweep through all 6 face directions (+Y, -Y, +Z, -Z, +X, -X)
    for (let faceDir = 0; faceDir < 6; faceDir++) {
      const isTop = faceDir === 0;
      const isBottom = faceDir === 1;
      const isFront = faceDir === 2;
      const isBack = faceDir === 3;
      const isRight = faceDir === 4;
      const isLeft = faceDir === 5;

      // Determine slice axis
      let uMax = 0, vMax = 0, dMax = 0;
      if (isTop || isBottom) {
        dMax = chunkHeight; uMax = chunkWidth; vMax = chunkDepth;
      } else if (isFront || isBack) {
        dMax = chunkDepth; uMax = chunkWidth; vMax = chunkHeight;
      } else {
        dMax = chunkWidth; uMax = chunkDepth; vMax = chunkHeight;
      }

      // Slice through the axis
      for (let d = 0; d < dMax; d++) {
        // Create 2D mask for slice
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

            const block = getBlock(x, y, z);
            if (block === BlockType.AIR || block === BlockType.WATER) continue;

            const def = BLOCK_DEFS[block];
            if (!def || def.shape === 'cross' || def.shape === 'slab' || def.shape === 'stairs') continue;

            // Check neighbor occlusion
            const neighborBlock = getBlock(x + nx, y + ny, z + nz);
            if (VoxelMesher.isOccluding(neighborBlock, block)) continue;

            // Calculate AO for top/bottom/side faces
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

        // Greedy Quad Merging on 2D Mask
        for (let v = 0; v < vMax; v++) {
          for (let u = 0; u < uMax; u++) {
            const cell = mask[u + v * uMax];
            if (!cell) continue;

            // Compute width (w)
            let w = 1;
            while (u + w < uMax) {
              const nextCell = mask[(u + w) + v * uMax];
              if (nextCell && nextCell.faceKey === cell.faceKey) {
                w++;
              } else {
                break;
              }
            }

            // Compute height (h)
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

            // Mark cells as processed
            for (let dh = 0; dh < h; dh++) {
              for (let dw = 0; dw < w; dw++) {
                mask[(u + dw) + (v + dh) * uMax] = null;
              }
            }

            // Generate merged quad geometry
            const block = cell.block;
            const faceType = isTop ? 'top' : isBottom ? 'bottom' : 'side';
            const tile = TextureAtlas.getTileForBlock(block, faceType);
            const [tu0, tv0, tu1, tv1] = TextureAtlas.getUVs(tile);

            let positions = cell.transparent ? data.transPositions : data.solidPositions;
            let normals = cell.transparent ? data.transNormals : data.solidNormals;
            let colors = cell.transparent ? data.transColors : data.solidColors;
            let uvs = cell.transparent ? data.transUvs : data.solidUvs;
            let indices = cell.transparent ? data.transIndices : data.solidIndices;
            let indexOffset = cell.transparent ? transIndexOffset : solidIndexOffset;

            let x0 = 0, y0 = 0, z0 = 0;
            let x1 = 0, y1 = 0, z1 = 0;
            let x2 = 0, y2 = 0, z2 = 0;
            let x3 = 0, y3 = 0, z3 = 0;
            let norm: [number, number, number] = [0, 0, 0];

            if (isTop) {
              norm = [0, 1, 0];
              x0 = u;     y0 = d + 1; z0 = v + h;
              x1 = u + w; y1 = d + 1; z1 = v + h;
              x2 = u + w; y2 = d + 1; z2 = v;
              x3 = u;     y3 = d + 1; z3 = v;
            } else if (isBottom) {
              norm = [0, -1, 0];
              x0 = u;     y0 = d; z0 = v;
              x1 = u + w; y1 = d; z1 = v;
              x2 = u + w; y2 = d; z2 = v + h;
              x3 = u;     y3 = d; z3 = v + h;
            } else if (isFront) {
              norm = [0, 0, 1];
              x0 = u;     y0 = v;     z0 = d + 1;
              x1 = u + w; y1 = v;     z1 = d + 1;
              x2 = u + w; y2 = v + h; z2 = d + 1;
              x3 = u;     y3 = v + h; z3 = d + 1;
            } else if (isBack) {
              norm = [0, 0, -1];
              x0 = u + w; y0 = v;     z0 = d;
              x1 = u;     y1 = v;     z1 = d;
              x2 = u;     y2 = v + h; z2 = d;
              x3 = u + w; y3 = v + h; z3 = d;
            } else if (isRight) {
              norm = [1, 0, 0];
              x0 = d + 1; y0 = v;     z0 = u + w;
              x1 = d + 1; y1 = v;     z1 = u;
              x2 = d + 1; y2 = v + h; z2 = u;
              x3 = d + 1; y3 = v + h; z3 = u + w;
            } else if (isLeft) {
              norm = [-1, 0, 0];
              x0 = d; y0 = v;     z0 = u;
              x1 = d; y1 = v;     z1 = u + w;
              x2 = d; y2 = v + h; z2 = u + w;
              x3 = d; y3 = v + h; z3 = u;
            }

            positions.push(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3);
            normals.push(...norm, ...norm, ...norm, ...norm);

            const dirShade = isTop ? 1.0 : isBottom ? 0.62 : (isFront || isBack) ? 0.82 : 0.88;
            const f0 = VoxelMesher.aoToFactor(cell.ao0) * dirShade;
            const f1 = VoxelMesher.aoToFactor(cell.ao1) * dirShade;
            const f2 = VoxelMesher.aoToFactor(cell.ao2) * dirShade;
            const f3 = VoxelMesher.aoToFactor(cell.ao3) * dirShade;
            colors.push(f0, f0, f0, f1, f1, f1, f2, f2, f2, f3, f3, f3);

            // Tiled UVs over merged quad dimensions
            uvs.push(tu0, tv0, tu0 + (tu1 - tu0) * w, tv0, tu0 + (tu1 - tu0) * w, tv0 + (tv1 - tv0) * h, tu0, tv0 + (tv1 - tv0) * h);

            indices.push(indexOffset, indexOffset + 1, indexOffset + 2, indexOffset, indexOffset + 2, indexOffset + 3);

            if (cell.transparent) transIndexOffset += 4;
            else solidIndexOffset += 4;
          }
        }
      }
    }

    // 2. SPECIALIZED MESHERS FOR NON-FULL CUBES (Cross Vegetation, Water, Slabs)
    for (let x = 0; x < chunkWidth; x++) {
      for (let y = 0; y < chunkHeight; y++) {
        for (let z = 0; z < chunkDepth; z++) {
          const block = getBlock(x, y, z);
          if (block === BlockType.AIR) continue;

          const def = BLOCK_DEFS[block];
          if (!def) continue;

          // Water specialized mesher
          if (block === BlockType.WATER) {
            const topBlock = getBlock(x, y + 1, z);
            if (topBlock !== BlockType.WATER) {
              const tile = TextureAtlas.getTileForBlock(block, 'top');
              const [tu0, tv0, tu1, tv1] = TextureAtlas.getUVs(tile);

              data.waterPositions.push(
                x, y + 0.88, z + 1,
                x + 1, y + 0.88, z + 1,
                x + 1, y + 0.88, z,
                x, y + 0.88, z
              );
              data.waterNormals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
              for (let i = 0; i < 4; i++) data.waterColors.push(0.7, 0.85, 1.0);
              data.waterUvs.push(tu0, tv0, tu1, tv0, tu1, tv1, tu0, tv1);
              data.waterIndices.push(waterIndexOffset, waterIndexOffset + 1, waterIndexOffset + 2, waterIndexOffset, waterIndexOffset + 2, waterIndexOffset + 3);
              waterIndexOffset += 4;
            }
            continue;
          }

          // Foliage Cross Shape (Flowers, Tall Grass)
          if (def.shape === 'cross') {
            const tile = TextureAtlas.getTileForBlock(block, 'side');
            const [tu0, tv0, tu1, tv1] = TextureAtlas.getUVs(tile);

            const addCrossQuad = (x1: number, z1: number, x2: number, z2: number) => {
              data.transPositions.push(
                x + x1, y, z + z1,
                x + x2, y, z + z2,
                x + x2, y + 0.9, z + z2,
                x + x1, y + 0.9, z + z1
              );
              data.transNormals.push(0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0);
              for (let i = 0; i < 4; i++) data.transColors.push(1.0, 1.0, 1.0);
              data.transUvs.push(tu0, tv0, tu1, tv0, tu1, tv1, tu0, tv1);
              data.transIndices.push(transIndexOffset, transIndexOffset + 1, transIndexOffset + 2, transIndexOffset, transIndexOffset + 2, transIndexOffset + 3);
              data.transIndices.push(transIndexOffset, transIndexOffset + 2, transIndexOffset + 1, transIndexOffset, transIndexOffset + 3, transIndexOffset + 2);
              transIndexOffset += 4;
            };

            addCrossQuad(0.15, 0.15, 0.85, 0.85);
            addCrossQuad(0.15, 0.85, 0.85, 0.15);
            continue;
          }

          // Slab Shape (half block height)
          if (def.shape === 'slab') {
            const tileTop = TextureAtlas.getTileForBlock(block, 'top');
            const [tu0, tv0, tu1, tv1] = TextureAtlas.getUVs(tileTop);
            const tileSide = TextureAtlas.getTileForBlock(block, 'side');
            const [su0, sv0, su1, sv1] = TextureAtlas.getUVs(tileSide);
            const tileBottom = TextureAtlas.getTileForBlock(block, 'bottom');
            const [bu0, bv0, bu1, bv1] = TextureAtlas.getUVs(tileBottom);

            const addFace = (pos: number[], norm: number[], uv: number[]) => {
              data.solidPositions.push(...pos);
              data.solidNormals.push(...norm, ...norm, ...norm, ...norm);
              for (let i = 0; i < 4; i++) data.solidColors.push(1.0, 1.0, 1.0);
              data.solidUvs.push(...uv);
              data.solidIndices.push(solidIndexOffset, solidIndexOffset + 1, solidIndexOffset + 2, solidIndexOffset, solidIndexOffset + 2, solidIndexOffset + 3);
              solidIndexOffset += 4;
            };

            const topBlock = getBlock(x, y + 1, z);
            if (!VoxelMesher.isOccluding(topBlock, block)) {
              addFace(
                [x, y + 0.5, z + 1, x + 1, y + 0.5, z + 1, x + 1, y + 0.5, z, x, y + 0.5, z],
                [0, 1, 0],
                [tu0, tv0, tu1, tv0, tu1, tv1, tu0, tv1]
              );
            }
            
            const bottomBlock = getBlock(x, y - 1, z);
            if (!VoxelMesher.isOccluding(bottomBlock, block)) {
              addFace(
                [x, y, z, x + 1, y, z, x + 1, y, z + 1, x, y, z + 1],
                [0, -1, 0],
                [bu0, bv0, bu1, bv0, bu1, bv1, bu0, bv1]
              );
            }
            
            const frontBlock = getBlock(x, y, z + 1);
            if (!VoxelMesher.isOccluding(frontBlock, block)) {
              addFace(
                [x, y, z + 1, x + 1, y, z + 1, x + 1, y + 0.5, z + 1, x, y + 0.5, z + 1],
                [0, 0, 1],
                [su0, sv0, su1, sv0, su1, sv0 + (sv1 - sv0) * 0.5, su0, sv0 + (sv1 - sv0) * 0.5]
              );
            }
            
            const backBlock = getBlock(x, y, z - 1);
            if (!VoxelMesher.isOccluding(backBlock, block)) {
              addFace(
                [x + 1, y, z, x, y, z, x, y + 0.5, z, x + 1, y + 0.5, z],
                [0, 0, -1],
                [su0, sv0, su1, sv0, su1, sv0 + (sv1 - sv0) * 0.5, su0, sv0 + (sv1 - sv0) * 0.5]
              );
            }
            
            const rightBlock = getBlock(x + 1, y, z);
            if (!VoxelMesher.isOccluding(rightBlock, block)) {
              addFace(
                [x + 1, y, z + 1, x + 1, y, z, x + 1, y + 0.5, z, x + 1, y + 0.5, z + 1],
                [1, 0, 0],
                [su0, sv0, su1, sv0, su1, sv0 + (sv1 - sv0) * 0.5, su0, sv0 + (sv1 - sv0) * 0.5]
              );
            }
            
            const leftBlock = getBlock(x - 1, y, z);
            if (!VoxelMesher.isOccluding(leftBlock, block)) {
              addFace(
                [x, y, z, x, y, z + 1, x, y + 0.5, z + 1, x, y + 0.5, z],
                [-1, 0, 0],
                [su0, sv0, su1, sv0, su1, sv0 + (sv1 - sv0) * 0.5, su0, sv0 + (sv1 - sv0) * 0.5]
              );
            }
            continue;
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
      solidIndices: new Uint32Array(data.solidIndices),
      transPositions: new Float32Array(data.transPositions),
      transNormals: new Float32Array(data.transNormals),
      transColors: new Float32Array(data.transColors),
      transUvs: new Float32Array(data.transUvs),
      transIndices: new Uint32Array(data.transIndices),
      waterPositions: new Float32Array(data.waterPositions),
      waterNormals: new Float32Array(data.waterNormals),
      waterColors: new Float32Array(data.waterColors),
      waterUvs: new Float32Array(data.waterUvs),
      waterIndices: new Uint32Array(data.waterIndices),
    };
  }

}
