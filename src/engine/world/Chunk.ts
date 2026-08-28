// Chunk Representation, Linear Voxel Storage & State Pipeline
import * as THREE from 'three';
import { BlockType } from '../../types';
import { VoxelMesher } from './VoxelMesher';

export const CHUNK_SIZE_X = 16;
export const CHUNK_SIZE_Y = 128; // Increased 128-block vertical world height
export const CHUNK_SIZE_Z = 16;
export const CHUNK_VOL = CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z; // 32,768 voxels per chunk

export enum ChunkState {
  UNLOADED = 'unloaded',
  QUEUED = 'queued',
  GENERATING = 'generating',
  GENERATED = 'generated',
  MESHING = 'meshing',
  READY = 'ready',
  DIRTY = 'dirty',
  UNLOADING = 'unloading',
}

export class Chunk {
  public cx: number;
  public cz: number;
  public state: ChunkState = ChunkState.UNLOADED;
  public blocks: Uint8Array;
  public isDirty: boolean = true;
  public lastActiveTime: number = Date.now();

  // Three.js Render Meshes
  public solidMesh: THREE.Mesh | null = null;
  public transMesh: THREE.Mesh | null = null;
  public waterMesh: THREE.Mesh | null = null;
  public group: THREE.Group;

  constructor(cx: number, cz: number) {
    this.cx = cx;
    this.cz = cz;
    this.blocks = new Uint8Array(CHUNK_VOL);
    this.group = new THREE.Group();
    this.group.position.set(cx * CHUNK_SIZE_X, 0, cz * CHUNK_SIZE_Z);

    // Bounding box for accurate Three.js Frustum Culling
    const bbox = new THREE.Box3(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z)
    );
    (this.group as any).boundingBox = bbox;
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

  public setBlock(lx: number, ly: number, lz: number, type: BlockType): boolean {
    if (lx < 0 || lx >= CHUNK_SIZE_X || ly < 0 || ly >= CHUNK_SIZE_Y || lz < 0 || lz >= CHUNK_SIZE_Z) {
      return false;
    }
    const idx = Chunk.getIndex(lx, ly, lz);
    if (this.blocks[idx] !== type) {
      this.blocks[idx] = type;
      this.isDirty = true;
      this.state = ChunkState.DIRTY;
      return true;
    }
    return false;
  }

  public setDirty(): void {
    this.isDirty = true;
    if (this.state === ChunkState.READY) {
      this.state = ChunkState.DIRTY;
    }
  }

  // Rebuild 3D meshes using VoxelMesher
  public rebuildMesh(
    getNeighborBlock: (wx: number, wy: number, wz: number) => BlockType,
    solidMaterial: THREE.Material,
    transMaterial: THREE.Material,
    waterMaterial: THREE.Material
  ): void {
    if (!this.isDirty) return;

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

    const { solidMesh: sGeo, transMesh: tGeo, waterMesh: wGeo } = VoxelMesher.buildChunkMesh(
      (lx, ly, lz) => {
        if (lx >= 0 && lx < CHUNK_SIZE_X && ly >= 0 && ly < CHUNK_SIZE_Y && lz >= 0 && lz < CHUNK_SIZE_Z) {
          return this.getBlock(lx, ly, lz);
        }
        return getNeighborBlock(this.cx * CHUNK_SIZE_X + lx, ly, this.cz * CHUNK_SIZE_Z + lz);
      },
      CHUNK_SIZE_X,
      CHUNK_SIZE_Y,
      CHUNK_SIZE_Z
    );

    if (sGeo.attributes.position && sGeo.attributes.position.count > 0) {
      this.solidMesh = new THREE.Mesh(sGeo, solidMaterial);
      this.solidMesh.castShadow = true;
      this.solidMesh.receiveShadow = true;
      this.group.add(this.solidMesh);
    }
    if (tGeo.attributes.position && tGeo.attributes.position.count > 0) {
      this.transMesh = new THREE.Mesh(tGeo, transMaterial);
      this.group.add(this.transMesh);
    }
    if (wGeo.attributes.position && wGeo.attributes.position.count > 0) {
      this.waterMesh = new THREE.Mesh(wGeo, waterMaterial);
      this.group.add(this.waterMesh);
    }

    this.isDirty = false;
    this.state = ChunkState.READY;
  }

  public dispose(): void {
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
    this.state = ChunkState.UNLOADED;
  }
}
