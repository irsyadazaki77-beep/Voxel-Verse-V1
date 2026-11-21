// Distant Horizons Hierarchical Chunk LOD System (v7.0.0)
// Renders ultra-lightweight distant terrain macro-tiles beyond activeRenderDistance (up to ~600m+)
// using deterministic WorldGeneratorCore heightfields & Nusantara biome color palettes.
import * as THREE from 'three';
import { WorldGeneratorCore } from './WorldGeneratorCore';
import { CHUNK_SIZE_X, CHUNK_SIZE_Z } from './WorldConfig';
import { DIMENSION_AETHER } from '../../types';

export interface DistantLODMetrics {
  enabled: boolean;
  activeTiles: number;
  ring1Tiles: number;
  ring2Tiles: number;
  totalTriangles: number;
  maxVisibleDistanceMeters: number;
  lastBuildMs: number;
}

interface LODTileEntry {
  key: string;
  tx: number;
  tz: number;
  ring: 1 | 2;
  tileSize: number;
  mesh: THREE.Mesh;
  triangles: number;
}

export class DistantLODSystem {
  public readonly group: THREE.Group;
  private generator: WorldGeneratorCore;
  private dimensionId: string;
  private enabled: boolean = true;

  private tiles: Map<string, LODTileEntry> = new Map();
  private material: THREE.MeshStandardMaterial;

  // Ring configuration
  // Ring 1: 64m macro-tiles (4m sample step = 16x16 grid)
  // Ring 2: 128m macro-tiles (8m sample step = 16x16 grid)
  private readonly RING1_TILE_SIZE = 64;
  private readonly RING1_STEP = 4;
  private readonly RING2_TILE_SIZE = 128;
  private readonly RING2_STEP = 8;

  private lastCenterTx1 = Number.NaN;
  private lastCenterTz1 = Number.NaN;
  private lastRenderDistance = -1;
  private lastBuildMs = 0;
  private maxVisibleDistanceMeters = 0;

  constructor(generator: WorldGeneratorCore, dimensionId: string = 'overworld') {
    this.generator = generator;
    this.dimensionId = dimensionId;
    this.group = new THREE.Group();
    this.group.name = 'DistantHorizonsLODGroup';

    this.material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.02,
      flatShading: false,
      fog: true,
      side: THREE.FrontSide,
    });
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.group.visible = enabled;
    if (!enabled) {
      this.clearAllTiles();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public resetForDimension(generator: WorldGeneratorCore, dimensionId: string): void {
    this.generator = generator;
    this.dimensionId = dimensionId;
    this.clearAllTiles();
    this.lastCenterTx1 = Number.NaN;
    this.lastCenterTz1 = Number.NaN;
  }

  private clearAllTiles(): void {
    for (const entry of this.tiles.values()) {
      this.group.remove(entry.mesh);
      entry.mesh.geometry.dispose();
    }
    this.tiles.clear();
  }

  /**
   * Computes deterministic Nusantara surface color for a distant terrain sample point.
   */
  private sampleSurfaceColor(wx: number, wz: number, height: number, seaLevel: number): [number, number, number] {
    if (this.dimensionId === DIMENSION_AETHER) {
      if (height < 42) return [0.32, 0.48, 0.68];
      if (height > 88) return [0.76, 0.88, 0.96];
      return [0.44, 0.72, 0.82];
    }

    // Deep & shallow tropical ocean
    if (height <= seaLevel - 2) return [0.07, 0.25, 0.44];
    if (height <= seaLevel) return [0.11, 0.42, 0.56];
    // Sandy beach / coastal rim
    if (height <= seaLevel + 2) return [0.78, 0.72, 0.54];

    const tp = this.generator.regionManager.getBlendedTerrainProfile(wx, wz);

    // High volcanic / alpine peaks
    if (height >= 96) return [0.88, 0.90, 0.94]; // Mist/snow peak
    if (height >= 78) return [0.34, 0.35, 0.38]; // Volcanic basalt / andesite ridge
    if (height >= 64 && tp.cliffStrength && tp.cliffStrength > 0.25) {
      return [0.58, 0.56, 0.51]; // Karst limestone cliffs
    }

    // Sawah terraced emerald lowlands vs deep rimba highlands
    if (tp.terraceStrength && tp.terraceStrength > 0.2 && height < 62) {
      return [0.33, 0.58, 0.24]; // Lush Subak sawah green
    }

    const elevFactor = Math.min(1.0, Math.max(0.0, (height - seaLevel) / 48.0));
    const r = 0.20 + elevFactor * 0.10;
    const g = 0.48 - elevFactor * 0.12;
    const b = 0.18 + elevFactor * 0.06;
    return [r, g, b];
  }

  /**
   * Builds a single low-poly LOD terrain macro-tile using deterministic heightfield sampling.
   */
  private buildTileMesh(tx: number, tz: number, ring: 1 | 2): LODTileEntry {
    const tileSize = ring === 1 ? this.RING1_TILE_SIZE : this.RING2_TILE_SIZE;
    const step = ring === 1 ? this.RING1_STEP : this.RING2_STEP;
    const cells = tileSize / step; // 16
    const vertsPerSide = cells + 1; // 17
    const vertCount = vertsPerSide * vertsPerSide;

    const positions = new Float32Array(vertCount * 3);
    const normals = new Float32Array(vertCount * 3);
    const colors = new Float32Array(vertCount * 3);
    const indices = new Uint16Array(cells * cells * 6);

    const originX = tx * tileSize;
    const originZ = tz * tileSize;
    const seaLevel = this.generator.params.seaLevel;
    // Slight vertical offset (-0.65m) prevents z-fighting with full-detail chunks along the seam
    const seamYOffset = ring === 1 ? -0.65 : -1.15;

    let vIdx = 0;
    for (let gz = 0; gz < vertsPerSide; gz++) {
      const wz = originZ + gz * step;
      for (let gx = 0; gx < vertsPerSide; gx++) {
        const wx = originX + gx * step;
        const rawH = this.generator.getTerrainHeight(wx, wz);
        const surfaceY = Math.max(rawH, seaLevel) + seamYOffset;
        const [r, g, b] = this.sampleSurfaceColor(wx, wz, rawH, seaLevel);

        // v7.4.0 Analytic heightfield normal across tile boundaries -> zero dark normal seams between adjacent LOD tiles!
        const hL = Math.max(this.generator.getTerrainHeight(wx - step, wz), seaLevel);
        const hR = Math.max(this.generator.getTerrainHeight(wx + step, wz), seaLevel);
        const hD = Math.max(this.generator.getTerrainHeight(wx, wz - step), seaLevel);
        const hU = Math.max(this.generator.getTerrainHeight(wx, wz + step), seaLevel);
        const nx = hL - hR;
        const ny = 2.0 * step;
        const nz = hD - hU;
        const invLen = 1.0 / Math.hypot(nx, ny, nz);

        const pOff = vIdx * 3;
        positions[pOff] = gx * step;
        positions[pOff + 1] = surfaceY;
        positions[pOff + 2] = gz * step;

        normals[pOff] = nx * invLen;
        normals[pOff + 1] = ny * invLen;
        normals[pOff + 2] = nz * invLen;

        colors[pOff] = r;
        colors[pOff + 1] = g;
        colors[pOff + 2] = b;
        vIdx++;
      }
    }

    let iOff = 0;
    for (let gz = 0; gz < cells; gz++) {
      for (let gx = 0; gx < cells; gx++) {
        const a = gz * vertsPerSide + gx;
        const b = a + 1;
        const c = a + vertsPerSide;
        const d = c + 1;

        indices[iOff++] = a;
        indices[iOff++] = c;
        indices[iOff++] = b;

        indices[iOff++] = b;
        indices[iOff++] = c;
        indices[iOff++] = d;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.computeBoundingSphere();

    const mesh = new THREE.Mesh(geometry, this.material);
    mesh.position.set(originX, 0, originZ);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    mesh.receiveShadow = false;
    mesh.castShadow = false;
    mesh.frustumCulled = true;

    const key = `r${ring}_${tx}_${tz}`;
    return {
      key,
      tx,
      tz,
      ring,
      tileSize,
      mesh,
      triangles: cells * cells * 2,
    };
  }

  /**
   * Time-sliced update called from VoxelWorld.updateChunks().
   * Streams Ring 1 & Ring 2 LOD tiles outside the active full-detail chunk radius.
   */
  public update(
    playerPos: { x: number; y: number; z: number },
    activeRenderDistanceChunks: number,
    budgetMs: number = 1.6
  ): void {
    if (!this.enabled) return;

    const startTime = performance.now();
    const activeRadiusMeters = Math.max(32, activeRenderDistanceChunks * Math.max(CHUNK_SIZE_X, CHUNK_SIZE_Z));
    // Inner cutoff slightly inside active radius so there is zero gap at chunk borders
    const ring1Inner = Math.max(24, activeRadiusMeters - 20);
    const ring1Outer = activeRadiusMeters + 192; // +12 chunks
    const ring2Inner = ring1Outer - 32;
    const ring2Outer = activeRadiusMeters + 448; // +28 chunks (~600m+ horizon)
    this.maxVisibleDistanceMeters = ring2Outer;

    const centerTx1 = Math.floor(playerPos.x / this.RING1_TILE_SIZE);
    const centerTz1 = Math.floor(playerPos.z / this.RING1_TILE_SIZE);
    const centerTx2 = Math.floor(playerPos.x / this.RING2_TILE_SIZE);
    const centerTz2 = Math.floor(playerPos.z / this.RING2_TILE_SIZE);

    const movedOrChanged =
      centerTx1 !== this.lastCenterTx1 ||
      centerTz1 !== this.lastCenterTz1 ||
      activeRenderDistanceChunks !== this.lastRenderDistance;

    // 1. Evict out-of-range or overlapped tiles when player moves or render distance changes
    if (movedOrChanged) {
      for (const [key, entry] of this.tiles.entries()) {
        const tileCenterX = (entry.tx + 0.5) * entry.tileSize;
        const tileCenterZ = (entry.tz + 0.5) * entry.tileSize;
        const dist = Math.hypot(tileCenterX - playerPos.x, tileCenterZ - playerPos.z);

        const minAllowed = entry.ring === 1 ? ring1Inner - entry.tileSize * 0.45 : ring2Inner - entry.tileSize * 0.45;
        const maxAllowed = entry.ring === 1 ? ring1Outer + entry.tileSize * 0.75 : ring2Outer + entry.tileSize * 0.75;

        if (dist < minAllowed || dist > maxAllowed) {
          this.group.remove(entry.mesh);
          entry.mesh.geometry.dispose();
          this.tiles.delete(key);
        }
      }
      this.lastCenterTx1 = centerTx1;
      this.lastCenterTz1 = centerTz1;
      this.lastRenderDistance = activeRenderDistanceChunks;
    }

    // 2. Incrementally build missing tiles within the per-frame CPU budget
    let builtThisTick = 0;
    const maxBuildsPerTick = 3;

    const tryBuildRing = (
      ring: 1 | 2,
      centerTx: number,
      centerTz: number,
      tileSize: number,
      innerR: number,
      outerR: number
    ) => {
      const tileRadius = Math.ceil(outerR / tileSize);
      for (let dz = -tileRadius; dz <= tileRadius; dz++) {
        for (let dx = -tileRadius; dx <= tileRadius; dx++) {
          if (builtThisTick >= maxBuildsPerTick) return;
          if (performance.now() - startTime >= budgetMs) return;

          const tx = centerTx + dx;
          const tz = centerTz + dz;
          const key = `r${ring}_${tx}_${tz}`;
          if (this.tiles.has(key)) continue;

          const tileCenterX = (tx + 0.5) * tileSize;
          const tileCenterZ = (tz + 0.5) * tileSize;
          const dist = Math.hypot(tileCenterX - playerPos.x, tileCenterZ - playerPos.z);

          if (dist < innerR || dist > outerR) continue;

          const entry = this.buildTileMesh(tx, tz, ring);
          this.tiles.set(key, entry);
          this.group.add(entry.mesh);
          builtThisTick++;
        }
      }
    };

    tryBuildRing(1, centerTx1, centerTz1, this.RING1_TILE_SIZE, ring1Inner, ring1Outer);
    tryBuildRing(2, centerTx2, centerTz2, this.RING2_TILE_SIZE, ring2Inner, ring2Outer);

    this.lastBuildMs = performance.now() - startTime;
  }

  public getMetrics(): DistantLODMetrics {
    let ring1Tiles = 0;
    let ring2Tiles = 0;
    let totalTriangles = 0;
    for (const entry of this.tiles.values()) {
      if (entry.ring === 1) ring1Tiles++;
      else ring2Tiles++;
      totalTriangles += entry.triangles;
    }
    return {
      enabled: this.enabled,
      activeTiles: this.tiles.size,
      ring1Tiles,
      ring2Tiles,
      totalTriangles,
      maxVisibleDistanceMeters: this.maxVisibleDistanceMeters,
      lastBuildMs: this.lastBuildMs,
    };
  }

  public dispose(): void {
    this.clearAllTiles();
    this.material.dispose();
  }
}
