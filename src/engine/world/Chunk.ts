// Chunk Representation, Linear Voxel Storage & State Pipeline
import * as THREE from 'three';
import { BlockType } from '../../types';
import { VoxelMesher, TransferableMeshData } from './VoxelMesher';
import { BlockState, BlockStateUtils } from './BlockState';
import { BlockShapeResolver } from './BlockShapeResolver';

export const CHUNK_SIZE_X = 16;
export const CHUNK_SIZE_Y = 128; // Increased 128-block vertical world height
export const CHUNK_SIZE_Z = 16;
export const CHUNK_VOL = CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z; // 32,768 voxels per chunk

export enum ChunkState {
  UNLOADED = 'unloaded',
  QUEUED_GENERATION = 'queued_generation',
  QUEUED = 'queued_generation', // Backward compatibility alias
  GENERATING = 'generating',
  GENERATED = 'generated',
  QUEUED_MESH = 'queued_mesh',
  MESHING = 'meshing',
  READY = 'ready',
  DIRTY = 'dirty',
  GENERATION_RETRY = 'generation_retry',
  MESH_RETRY = 'mesh_retry',
  ERROR = 'error',
  UNLOADING = 'unloading',
}

export function transitionChunkState(
  chunk: Chunk,
  expected: ChunkState | ChunkState[],
  next: ChunkState,
  reason?: string
): boolean {
  const allowed = Array.isArray(expected) ? expected.includes(chunk.state) : chunk.state === expected;
  if (!allowed) {
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.warn(
        `[ChunkState] Invalid transition for chunk (${chunk.cx}, ${chunk.cz}): expected [${
          Array.isArray(expected) ? expected.join(', ') : expected
        }] but current state is '${chunk.state}' -> target '${next}' (${reason || 'unspecified'})`
      );
    }
  }
  chunk.state = next;
  chunk.lastStateChangeTime = Date.now();
  return allowed;
}


function createGeometryFromTransferable(data: TransferableMeshData): { solidMesh: THREE.BufferGeometry | null; transMesh: THREE.BufferGeometry | null; waterMesh: THREE.BufferGeometry | null } {
  const createGeo = (pos: Float32Array, norm: Float32Array, col: Float32Array, uv: Float32Array, tileRect: Float32Array, ind: Uint32Array, matClass: Float32Array): THREE.BufferGeometry | null => {
    if (!pos || pos.length === 0) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('localUv', new THREE.BufferAttribute(uv, 2));
    geo.setAttribute('tileRect', new THREE.BufferAttribute(tileRect, 4));
    if (matClass) {
      geo.setAttribute('materialClass', new THREE.BufferAttribute(matClass, 1));
    }
    geo.setIndex(new THREE.BufferAttribute(ind, 1));
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    return geo;
  };

  return {
    solidMesh: createGeo(data.solidPositions, data.solidNormals, data.solidColors, data.solidUvs, data.solidTileRects, data.solidIndices, data.solidMaterials),
    transMesh: createGeo(data.transPositions, data.transNormals, data.transColors, data.transUvs, data.transTileRects, data.transIndices, data.transMaterials),
    waterMesh: createGeo(data.waterPositions, data.waterNormals, data.waterColors, data.waterUvs, data.waterTileRects, data.waterIndices, data.waterMaterials),
  };
}

export class Chunk {
  public cx: number;
  public cz: number;
  public state: ChunkState = ChunkState.UNLOADED;
  public blocks: Uint8Array;
  public blockStates: Map<number, BlockState> = new Map();
  public surfaceHeightMap: Uint8Array = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Z);
  public isDirty: boolean = true;
  public voxelRevision: number = 0;
  public meshRevision: number = 0;
  public lastActiveTime: number = Date.now();
  public lastStateChangeTime: number = Date.now();

  // Three.js Render Meshes
  public solidMesh: THREE.Mesh | null = null;
  public transMesh: THREE.Mesh | null = null;
  public waterMesh: THREE.Mesh | null = null;
  public group: THREE.Group;

  // Precalculated world-space AABB for zero-allocation Frustum Culling
  public readonly worldBounds: THREE.Box3;

  constructor(cx: number, cz: number) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_VOL);
    this.group = new THREE.Group();
    const minX = cx * CHUNK_SIZE_X;
    const minZ = cz * CHUNK_SIZE_Z;
    this.group.position.set(minX, 0, minZ);

    this.worldBounds = new THREE.Box3(
      new THREE.Vector3(minX, 0, minZ),
      new THREE.Vector3(minX + CHUNK_SIZE_X, CHUNK_SIZE_Y, minZ + CHUNK_SIZE_Z)
    );

    // Bounding box for accurate Three.js Frustum Culling
    const bbox = new THREE.Box3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z)
    );
    (this.group as any).boundingBox = bbox;
  }

  public setBlocks(data: Uint8Array): void {
    this.blocks = data;
    this.voxelRevision++;
    this.isDirty = true;
    transitionChunkState(this, this.state, ChunkState.GENERATED, 'setBlocks');
    this.buildHeightMap();
  }

  public buildHeightMap(): void {
    if (!this.blocks) return;
    for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
        let surfaceY = 0;
        for (let ly = CHUNK_SIZE_Y - 1; ly >= 0; ly--) {
          const idx = Chunk.getIndex(lx, ly, lz);
          const b = this.blocks[idx];
          if (b !== BlockType.AIR) {
            const st = this.blockStates.get(idx);
            if (BlockShapeResolver.isSolidForCollision(b, st)) {
              surfaceY = ly;
              break;
            }
          }
        }
        this.surfaceHeightMap[lx + lz * CHUNK_SIZE_X] = surfaceY;
      }
    }
  }

  public updateHeightMapColumn(lx: number, lz: number, editY: number): void {
    if (!this.blocks) return;
    const colIdx = lx + lz * CHUNK_SIZE_X;
    const currentSurfaceY = this.surfaceHeightMap[colIdx];

    const idx = Chunk.getIndex(lx, editY, lz);
    const b = this.blocks[idx];
    const st = this.blockStates.get(idx);
    const isSolid = b !== BlockType.AIR && BlockShapeResolver.isSolidForCollision(b, st);

    if (isSolid) {
      if (editY >= currentSurfaceY) {
        this.surfaceHeightMap[colIdx] = editY;
      }
    } else {
      if (editY >= currentSurfaceY) {
        // Current surface top or higher was removed/changed to non-solid -> scan downward
        let newSurface = 0;
        for (let ly = editY - 1; ly >= 0; ly--) {
          const scanIdx = Chunk.getIndex(lx, ly, lz);
          const scanB = this.blocks[scanIdx];
          if (scanB !== BlockType.AIR) {
            const scanSt = this.blockStates.get(scanIdx);
            if (BlockShapeResolver.isSolidForCollision(scanB, scanSt)) {
              newSurface = ly;
              break;
            }
          }
        }
        this.surfaceHeightMap[colIdx] = newSurface;
      }
    }
  }

  public updateShadowLOD(distSq: number): void {
    if (!this.solidMesh) return;
    if (distSq <= 4) {
      this.solidMesh.castShadow = true;
    } else if (distSq <= 16) {
      this.solidMesh.castShadow = ((this.cx + this.cz) & 1) === 0;
    } else {
      this.solidMesh.castShadow = false;
    }
  }

  public applyTransferableMesh(
    meshData: TransferableMeshData,
    solidMaterial: THREE.Material,
    transMaterial: THREE.Material,
    waterMaterial: THREE.Material,
    sourceRevision?: number
  ): boolean {
    if (sourceRevision !== undefined && sourceRevision !== this.voxelRevision) {
      // Stale mesh result: chunk voxels were modified while worker was meshing
      return false;
    }

    if (this.solidMesh) {
      this.group.remove(this.solidMesh);
      this.solidMesh.geometry.dispose();
      this.solidMesh = null;
    }
    if (this.transMesh) {
      this.group.remove(this.transMesh);
      this.transMesh.geometry.dispose();
      this.transMesh = null;
    }
    if (this.waterMesh) {
      this.group.remove(this.waterMesh);
      this.waterMesh.geometry.dispose();
      this.waterMesh = null;
    }

    const { solidMesh: sGeo, transMesh: tGeo, waterMesh: wGeo } = createGeometryFromTransferable(meshData);

    if (sGeo) {
      this.solidMesh = new THREE.Mesh(sGeo, solidMaterial);
      this.solidMesh.castShadow = true;
      this.solidMesh.receiveShadow = true;
      this.group.add(this.solidMesh);
    }
    if (tGeo) {
      this.transMesh = new THREE.Mesh(tGeo, transMaterial);
      this.group.add(this.transMesh);
    }
    if (wGeo) {
      this.waterMesh = new THREE.Mesh(wGeo, waterMaterial);
      this.group.add(this.waterMesh);
    }

    if (sourceRevision !== undefined) {
      this.meshRevision = sourceRevision;
    } else {
      this.meshRevision = this.voxelRevision;
    }
    this.isDirty = false;
    transitionChunkState(this, this.state, ChunkState.READY, 'applyTransferableMesh');
    return true;
  }

  // Fast Linear Index Calculation: X + Z * 16 + Y * 256
  public static getIndex(lx: number, ly: number, lz: number): number {
    return lx + lz * CHUNK_SIZE_X + ly * (CHUNK_SIZE_X * CHUNK_SIZE_Z);
  }

  public getBlock(lx: number, ly: number, lz: number): BlockType {
    if (lx < 0 || lx >= CHUNK_SIZE_X || ly < 0 || ly >= CHUNK_SIZE_Y || lz < 0 || lz >= CHUNK_SIZE_Z) {
      return BlockType.AIR;
    }
    return this.blocks[Chunk.getIndex(lx, ly, lz)];
  }

  public getBlockState(lx: number, ly: number, lz: number): BlockState {
    if (lx < 0 || lx >= CHUNK_SIZE_X || ly < 0 || ly >= CHUNK_SIZE_Y || lz < 0 || lz >= CHUNK_SIZE_Z) {
      return BlockShapeResolver.getDefaultState(BlockType.AIR);
    }
    const idx = Chunk.getIndex(lx, ly, lz);
    const custom = this.blockStates.get(idx);
    if (custom) return custom;
    return BlockShapeResolver.getDefaultState(this.blocks[idx]);
  }

  public setBlock(lx: number, ly: number, lz: number, type: BlockType): boolean {
    if (lx < 0 || lx >= CHUNK_SIZE_X || ly < 0 || ly >= CHUNK_SIZE_Y || lz < 0 || lz >= CHUNK_SIZE_Z) {
      return false;
    }
    const idx = Chunk.getIndex(lx, ly, lz);
    if (this.blocks[idx] !== type) {
      this.blocks[idx] = type;
      this.blockStates.delete(idx);
      this.updateHeightMapColumn(lx, lz, ly);
      this.voxelRevision++;
      this.isDirty = true;
      this.state = ChunkState.DIRTY;
      return true;
    }
    return false;
  }

  public setBlockWithState(lx: number, ly: number, lz: number, type: BlockType, state?: Partial<BlockState>): boolean {
    if (lx < 0 || lx >= CHUNK_SIZE_X || ly < 0 || ly >= CHUNK_SIZE_Y || lz < 0 || lz >= CHUNK_SIZE_Z) {
      return false;
    }
    const idx = Chunk.getIndex(lx, ly, lz);
    this.blocks[idx] = type;
    if (state) {
      this.blockStates.set(idx, BlockStateUtils.createDefaultState(type, state));
    } else {
      this.blockStates.delete(idx);
    }
    this.updateHeightMapColumn(lx, lz, ly);
    this.voxelRevision++;
    this.isDirty = true;
    this.state = ChunkState.DIRTY;
    return true;
  }

  public setBlockState(lx: number, ly: number, lz: number, state: Partial<BlockState>): boolean {
    if (lx < 0 || lx >= CHUNK_SIZE_X || ly < 0 || ly >= CHUNK_SIZE_Y || lz < 0 || lz >= CHUNK_SIZE_Z) {
      return false;
    }
    const idx = Chunk.getIndex(lx, ly, lz);
    const currentBlock = this.blocks[idx];
    const existing = this.blockStates.get(idx) || BlockShapeResolver.getDefaultState(currentBlock);
    const updated = BlockStateUtils.createDefaultState(currentBlock, { ...existing, ...state });
    this.blockStates.set(idx, updated);
    this.updateHeightMapColumn(lx, lz, ly);
    this.voxelRevision++;
    this.isDirty = true;
    this.state = ChunkState.DIRTY;
    return true;
  }

  public setDirty(): void {
    this.isDirty = true;
    if (this.state === ChunkState.READY) {
      this.state = ChunkState.DIRTY;
    }
  }

  // Rebuild 3D meshes using VoxelMesher
  public rebuildMesh(
    getNeighborBlock: (wx: number, wy: number, wz: number) => BlockType | BlockState,
    solidMaterial: THREE.Material,
    transMaterial: THREE.Material,
    waterMaterial: THREE.Material
  ): void {
    if (!this.isDirty) return;
    const rev = this.voxelRevision;

    // Discard old geometries
    if (this.solidMesh) {
      this.group.remove(this.solidMesh);
      this.solidMesh.geometry.dispose();
      this.solidMesh = null;
    }
    if (this.transMesh) {
      this.group.remove(this.transMesh);
      this.transMesh.geometry.dispose();
      this.transMesh = null;
    }
    if (this.waterMesh) {
      this.group.remove(this.waterMesh);
      this.waterMesh.geometry.dispose();
      this.waterMesh = null;
    }

    const meshData = VoxelMesher.buildChunkMeshData(
      (lx, ly, lz) => {
        if (lx >= 0 && lx < CHUNK_SIZE_X && ly >= 0 && ly < CHUNK_SIZE_Y && lz >= 0 && lz < CHUNK_SIZE_Z) {
          return this.getBlockState(lx, ly, lz);
        }
        return getNeighborBlock(this.cx * CHUNK_SIZE_X + lx, ly, this.cz * CHUNK_SIZE_Z + lz);
      },
      CHUNK_SIZE_X,
      CHUNK_SIZE_Y,
      CHUNK_SIZE_Z
    );
    const { solidMesh: sGeo, transMesh: tGeo, waterMesh: wGeo } = createGeometryFromTransferable(meshData);

    if (sGeo) {
      this.solidMesh = new THREE.Mesh(sGeo, solidMaterial);
      this.solidMesh.castShadow = true;
      this.solidMesh.receiveShadow = true;
      this.group.add(this.solidMesh);
    }
    if (tGeo) {
      this.transMesh = new THREE.Mesh(tGeo, transMaterial);
      this.group.add(this.transMesh);
    }
    if (wGeo) {
      this.waterMesh = new THREE.Mesh(wGeo, waterMaterial);
      this.group.add(this.waterMesh);
    }

    this.meshRevision = rev;
    this.isDirty = false;
    this.state = ChunkState.READY;
  }

  public dispose(): void {
    this.blockStates.clear();
    if (this.solidMesh) {
      this.group.remove(this.solidMesh);
      this.solidMesh.geometry.dispose();
      this.solidMesh = null;
    }
    if (this.transMesh) {
      this.group.remove(this.transMesh);
      this.transMesh.geometry.dispose();
      this.transMesh = null;
    }
    if (this.waterMesh) {
      this.group.remove(this.waterMesh);
      this.waterMesh.geometry.dispose();
      this.waterMesh = null;
    }
    this.group.clear();
    this.state = ChunkState.UNLOADED;
  }
}
