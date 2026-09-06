// Chunk Streaming Scheduler with Camera Direction Priority, Frame Time Budget & Load Hysteresis
import * as THREE from 'three';
import { Chunk, ChunkState, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from './Chunk';
import { VoxelWorld } from './VoxelWorld';
import { ChunkWorkerPool } from './ChunkWorkerPool';

export class ChunkScheduler {
  private world: VoxelWorld;
  private workerPool: ChunkWorkerPool;
  private dirtyQueue: Set<string> = new Set(); // Chunk keys scheduled for remesh
  public warmCache: Map<string, { chunk: Chunk; unloadTime: number }> = new Map();

  private projScreenMatrix = new THREE.Matrix4();
  private frustum = new THREE.Frustum();
  private tempBox = new THREE.Box3();

  // Metrics for Performance Profiler
  public metrics = {
    activeChunks: 0,
    cachedChunks: 0,
    queuedTasks: 0,
    generatingTasks: 0,
    dirtyChunks: 0,
    meshUploadsPerFrame: 0,
    // Debug overlay counts
    loadedChunks: 0,
    generatedChunks: 0,
    meshedChunks: 0,
    visibleChunks: 0,
    pendingGeneration: 0,
    pendingMeshing: 0,
    pendingUpload: 0,
    culledChunks: 0,
    worldGroupChildren: 0,
    solidMeshCount: 0,
    waterMeshCount: 0,
  };

  private lastDiscoveryPlayerCX: number = -999999;
  private lastDiscoveryPlayerCZ: number = -999999;
  private lastDiscoveryTime: number = 0;

  constructor(world: VoxelWorld) {
    this.world = world;
    this.workerPool = new ChunkWorkerPool();
  }

  public updateFrustumCulling(camera: THREE.PerspectiveCamera): void {
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

    const playerCX = Math.floor(camera.position.x / CHUNK_SIZE_X);
    const playerCZ = Math.floor(camera.position.z / CHUNK_SIZE_Z);

    for (const chunk of this.world.chunks.values()) {
      const dx = chunk.cx - playerCX;
      const dz = chunk.cz - playerCZ;
      const isVeryNear = (dx * dx + dz * dz) <= 9; // 3 chunks radius fail-safe

      if (isVeryNear) {
        chunk.group.visible = true;
      } else {
        chunk.group.visible = this.frustum.intersectsBox(chunk.worldBounds);
      }
    }
  }

  private lastCacheCleanTime: number = 0;
  private static readonly NEIGHBOR_OFFSETS: readonly [number, number][] = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-1, -1], [1, -1], [-1, 1], [1, 1]
  ];

  public get dirtyChunkCount(): number {
    return this.dirtyQueue.size;
  }

  public static buildHaloBuffer(chunk: Chunk, world: VoxelWorld): ArrayBuffer {
    const halo = new Uint8Array(18 * 128 * 18);
    const center = chunk.blocks;
    if (!center) return halo.buffer;

    const cx = chunk.cx;
    const cz = chunk.cz;

    // 1. Copy center chunk (16x128x16) into px: 1..16, pz: 1..16
    for (let ly = 0; ly < 128; ly++) {
      const srcY = ly * 256;
      const dstY = ly * 324;
      for (let lz = 0; lz < 16; lz++) {
        const srcOffset = lz * 16 + srcY;
        const dstOffset = (lz + 1) * 18 + 1 + dstY;
        halo.set(center.subarray(srcOffset, srcOffset + 16), dstOffset);
      }
    }

    // 2. Fill borders from 8 neighbors if present
    const offsets = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [1, -1], [-1, 1], [1, 1]
    ];

    for (let i = 0; i < offsets.length; i++) {
      const [ox, oz] = offsets[i];
      const nChunkKey = world.getChunkKey(cx + ox, cz + oz);
      const nChunk = world.chunks.get(nChunkKey);
      if (!nChunk || !nChunk.blocks) continue;
      const nBlocks = nChunk.blocks;

      const srcLxStart = ox === 1 ? 0 : (ox === -1 ? 15 : 0);
      const srcLxEnd = ox === 1 ? 0 : (ox === -1 ? 15 : 15);
      const srcLzStart = oz === 1 ? 0 : (oz === -1 ? 15 : 0);
      const srcLzEnd = oz === 1 ? 0 : (oz === -1 ? 15 : 15);

      for (let ly = 0; ly < 128; ly++) {
        const srcY = ly * 256;
        const dstY = ly * 324;
        for (let lz = srcLzStart; lz <= srcLzEnd; lz++) {
          const pz = oz === 0 ? lz + 1 : (oz === -1 ? 0 : 17);
          for (let lx = srcLxStart; lx <= srcLxEnd; lx++) {
            const px = ox === 0 ? lx + 1 : (ox === -1 ? 0 : 17);
            halo[px + pz * 18 + dstY] = nBlocks[lx + lz * 16 + srcY];
          }
        }
      }
    }

    return halo.buffer;
  }

  private static spiralOffsets: [number, number][] = [];
  private static initializedOffsets = false;

  private static initSpiralOffsets(): void {
    if (this.initializedOffsets) return;
    this.initializedOffsets = true;
    const maxR = 24;
    for (let dx = -maxR; dx <= maxR; dx++) {
      for (let dz = -maxR; dz <= maxR; dz++) {
        this.spiralOffsets.push([dx, dz]);
      }
    }
    this.spiralOffsets.sort((a, b) => (a[0] * a[0] + a[1] * a[1]) - (b[0] * b[0] + b[1] * b[1]));
  }

  public update(
    playerPos: THREE.Vector3,
    cameraDir: THREE.Vector3,
    renderDistance: number = 4,
    frameBudgetMs: number = 3.0
  ): void {
    ChunkScheduler.initSpiralOffsets();
    
    const startTime = performance.now();
    const playerCX = Math.floor(playerPos.x / CHUNK_SIZE_X);
    const playerCZ = Math.floor(playerPos.z / CHUNK_SIZE_Z);

    const loadRadius = renderDistance;
    const unloadRadius = renderDistance + 2; // Hysteresis to prevent thrashing
    const loadRadiusSq = loadRadius * loadRadius + 1;
    const unloadRadiusSq = unloadRadius * unloadRadius;

    // 1. Identify chunks within Load Radius and calculate Priority (Capped & Prioritized)
    let tasksEnqueuedThisFrame = 0;
    const maxNewTasksPerCall = 4; // Prevent worker starvation / CPU spike

    discoveryLoop:
    for (let i = 0; i < ChunkScheduler.spiralOffsets.length; i++) {
      const [dx, dz] = ChunkScheduler.spiralOffsets[i];
      const distSq = dx * dx + dz * dz;
      
      if (distSq > loadRadiusSq) {
        // Since offsets are sorted by distance, we can safely stop checking further
        break discoveryLoop;
      }

      const isVeryNear = distSq <= 4; // 2 chunks radius close-range fail-safe

      // Enforce frame budget check unless very near player
      if (!isVeryNear && performance.now() - startTime >= frameBudgetMs) {
        break discoveryLoop;
      }

      const cx = playerCX + dx;
      const cz = playerCZ + dz;
      const key = this.world.getChunkKey(cx, cz);

          if (!this.world.chunks.has(key)) {
            // Check Warm Cache first (fast synchronous recovery)
            if (this.warmCache.has(key)) {
              const cached = this.warmCache.get(key)!;
              this.warmCache.delete(key);
              this.world.chunks.set(key, cached.chunk);
              this.world.worldGroup.add(cached.chunk.group);
            } else if (isVeryNear || tasksEnqueuedThisFrame < maxNewTasksPerCall) {
              // Calculate Priority (Camera Direction Boost)
              const invDist = distSq > 0 ? 1 / Math.sqrt(distSq) : 0;
              const dirX = dx * invDist;
              const dirZ = dz * invDist;
              const dot = dirX * cameraDir.x + dirZ * cameraDir.z;

              let priority = 1000 - distSq * 10;
              if (dot > 0) priority += dot * 250; // Boost chunks in front of camera
              if (dx === 0 && dz === 0) priority += 2000; // Player current chunk top priority

              // Create new Chunk & Enqueue Async Worker Task
              const chunk = new Chunk(cx, cz);
              chunk.state = ChunkState.QUEUED;
              this.world.chunks.set(key, chunk);
              this.world.worldGroup.add(chunk.group);
              
              if (!isVeryNear) {
                tasksEnqueuedThisFrame++;
              }

              const modBlocksObj = this.getModifiedBlocksObject(cx, cz);

              this.workerPool.enqueueTask({
                type: 'generate',
                taskId: `task_${key}_${Date.now()}`,
                cx,
                cz,
                seed: this.world.seed,
                preset: this.world.preset,
                dimensionId: this.world.dimensionId,
                priority,
                sessionToken: this.workerPool.currentSessionToken,
                modifiedBlocks: modBlocksObj,
                onComplete: (buffer) => {
                  const targetChunk = this.world.chunks.get(key);
                  if (targetChunk) {
                    targetChunk.setBlocks(new Uint8Array(buffer));
                    targetChunk.state = ChunkState.GENERATED;
                    targetChunk.isDirty = true;
                    this.dirtyQueue.add(key);

                    // Re-mesh adjacent neighbor chunks to resolve border face culling seams
                    const n1 = this.world.getChunkKey(cx - 1, cz);
                    const n2 = this.world.getChunkKey(cx + 1, cz);
                    const n3 = this.world.getChunkKey(cx, cz - 1);
                    const n4 = this.world.getChunkKey(cx, cz + 1);
                    const neighbors = [n1, n2, n3, n4];
                    for (let i = 0; i < neighbors.length; i++) {
                      const nChunk = this.world.chunks.get(neighbors[i]);
                      if (nChunk && nChunk.state !== ChunkState.QUEUED && nChunk.state !== ChunkState.UNLOADED) {
                        nChunk.setDirty();
                        this.dirtyQueue.add(neighbors[i]);
                      }
                    }
                  }
                },
              });
            }
          }
    }

    // Cancel queued tasks for chunks that are now out of range
    this.workerPool.cancelTasksOutofRange(playerCX, playerCZ, unloadRadius);

    // 2. Unload Chunks outside Unload Radius (with Hysteresis) - Zero string split
    for (const [key, chunk] of this.world.chunks.entries()) {
      const dx = chunk.cx - playerCX;
      const dz = chunk.cz - playerCZ;
      const distSq = dx * dx + dz * dz;

      if (distSq > unloadRadiusSq) {
        this.world.worldGroup.remove(chunk.group);
        this.world.chunks.delete(key);
        this.dirtyQueue.delete(key);

        // Place into Warm Cache for 10 seconds before full disposal (capped at 100 entries)
        if (this.warmCache.size >= 100) {
          const oldestKey = this.warmCache.keys().next().value;
          if (oldestKey !== undefined) {
            const old = this.warmCache.get(oldestKey);
            if (old) old.chunk.dispose();
            this.warmCache.delete(oldestKey);
          }
        }
        this.warmCache.set(key, { chunk, unloadTime: Date.now() });
      } else {
        // Update Shadow LOD based on distance
        chunk.updateShadowLOD(distSq);
      }
    }

    // Clean warm cache items older than 10s (Throttled check every 1500ms)
    const now = Date.now();
    if (now - this.lastCacheCleanTime > 1500) {
      this.lastCacheCleanTime = now;
      for (const [key, cached] of this.warmCache.entries()) {
        if (now - cached.unloadTime > 10000) {
          cached.chunk.dispose();
          this.warmCache.delete(key);
        }
      }
    }

    // 3. Process Remesh / Dirty Queue to Worker (Stepwise & Budget-capped)
    let uploads = 0;
    let meshingTasksEnqueued = 0;
    const maxMeshTasksPerCall = 3;

    // Convert Set to Array and sort by distance to prevent near-chunk starvation
    const dirtyBatch = Array.from(this.dirtyQueue);
    dirtyBatch.sort((a, b) => {
      const ca = this.world.chunks.get(a);
      const cb = this.world.chunks.get(b);
      if (!ca) return 1;
      if (!cb) return -1;
      const da = (ca.cx - playerCX) ** 2 + (ca.cz - playerCZ) ** 2;
      const db = (cb.cx - playerCX) ** 2 + (cb.cz - playerCZ) ** 2;
      return da - db;
    });

    for (const key of dirtyBatch) {
      // Guarantee at least some meshing progress even if generation took the whole budget,
      // but break if we exceed the budget and have already enqueued tasks.
      if (meshingTasksEnqueued >= maxMeshTasksPerCall || (meshingTasksEnqueued > 0 && performance.now() - startTime >= frameBudgetMs)) {
        break;
      }

      const chunk = this.world.chunks.get(key);
      if (chunk && chunk.isDirty && chunk.state !== ChunkState.QUEUED && chunk.state !== ChunkState.GENERATING && chunk.state !== ChunkState.MESHING) {
        const cx = chunk.cx;
        const cz = chunk.cz;

        const dx = cx - playerCX;
        const dz = cz - playerCZ;
        const distSq = dx * dx + dz * dz;
        const isVeryNear = distSq <= 4; // 2 chunks radius close-range fail-safe

        if (!isVeryNear && meshingTasksEnqueued >= maxMeshTasksPerCall) {
          break; // Stop enqueuing far meshes if limit is hit
        }

        // Build compact 18x128x18 halo buffer (41.4 KB transferable vs 295 KB 9 full chunks)
        const haloBuffer = ChunkScheduler.buildHaloBuffer(chunk, this.world);

        chunk.state = ChunkState.MESHING;
        chunk.isDirty = false;
        this.dirtyQueue.delete(key);
        
        if (!isVeryNear) {
          meshingTasksEnqueued++;
        }

        const invDist = distSq > 0 ? 1 / Math.sqrt(distSq) : 0;
        const dirX = dx * invDist;
        const dirZ = dz * invDist;
        const dot = dirX * cameraDir.x + dirZ * cameraDir.z;

        let meshPriority = Math.max(10, 1200 - distSq * 20);
        if (dot > 0) meshPriority += dot * 250;
        if (dx === 0 && dz === 0) meshPriority += 2000;
        meshPriority += 150; // Meshing boost so re-meshing always beats far generation

        const chunkSourceRev = chunk.voxelRevision;

        this.workerPool.enqueueTask({
          type: 'mesh',
          taskId: `mesh_${key}_${Date.now()}`,
          cx,
          cz,
          sourceRevision: chunkSourceRev,
          priority: meshPriority,
          sessionToken: this.workerPool.currentSessionToken,
          haloBuffer,
          centerBuffer: chunk.blocks!.buffer,
          neighborBuffers: {},
          onComplete: (meshData, sourceRevision) => {
            const targetChunk = this.world.chunks.get(key);
            if (targetChunk) {
              const applied = targetChunk.applyTransferableMesh(
                meshData, 
                this.world.solidMaterial, 
                this.world.transMaterial, 
                this.world.waterMaterial,
                sourceRevision
              );
              if (applied) {
                targetChunk.state = ChunkState.READY;
                targetChunk.updateShadowLOD(distSq);
                uploads++;
              } else {
                // Chunk voxels changed while worker was meshing; mark dirty so it re-meshes with new revision
                targetChunk.setDirty();
                this.dirtyQueue.add(key);
              }
            }
          }
        });
      } else if (!chunk) {
        this.dirtyQueue.delete(key);
      }
    }

    // Calculate chunk counts for debug overlay
    let loaded = 0;
    let generated = 0;
    let meshed = 0;
    let visible = 0;
    let pendingGen = 0;
    let pendingMesh = this.dirtyQueue.size;
    let pendingUpload = 0;
    let culled = 0;
    let solidCount = 0;
    let waterCount = 0;

    for (const chunk of this.world.chunks.values()) {
      loaded++;
      if (chunk.state === ChunkState.READY) {
        meshed++;
        if (chunk.group.visible) {
          visible++;
        } else {
          culled++;
        }
        if (chunk.solidMesh) solidCount++;
        if (chunk.waterMesh) waterCount++;
      }
      if (chunk.state === ChunkState.GENERATED || chunk.state === ChunkState.READY) {
        generated++;
      }
      if (chunk.state === ChunkState.QUEUED || chunk.state === ChunkState.GENERATING) {
        pendingGen++;
      }
      if (chunk.state === ChunkState.MESHING) {
        pendingUpload++;
      }
    }

    // 4. Update Profiler Metrics
    const poolStats = this.workerPool.getStats();
    this.metrics = {
      activeChunks: this.world.chunks.size,
      cachedChunks: this.warmCache.size,
      queuedTasks: poolStats.queuedTasks,
      generatingTasks: poolStats.activeWorkers,
      dirtyChunks: this.dirtyQueue.size,
      meshUploadsPerFrame: uploads,
      loadedChunks: loaded,
      generatedChunks: generated,
      meshedChunks: meshed,
      visibleChunks: visible,
      pendingGeneration: pendingGen,
      pendingMeshing: pendingMesh,
      pendingUpload: pendingUpload,
      culledChunks: culled,
      worldGroupChildren: this.world.worldGroup.children.length,
      solidMeshCount: solidCount,
      waterMeshCount: waterCount,
    };
  }

  public markDirty(cx: number, cz: number): void {
    const key = this.world.getChunkKey(cx, cz);
    const chunk = this.world.chunks.get(key);
    if (chunk) {
      chunk.setDirty();
      this.dirtyQueue.add(key);
    }
  }

  private getModifiedBlocksObject(cx: number, cz: number): Record<string, number> | undefined {
    const cKey = this.world.getChunkKey(cx, cz);
    if (!this.world.modifiedBlocks.has(cKey)) return undefined;
    const map = this.world.modifiedBlocks.get(cKey)!;
    const obj: Record<string, number> = {};
    map.forEach((val, key) => {
      obj[key] = val;
    });
    return obj;
  }

  public dispose(): void {
    this.workerPool.dispose();
    this.dirtyQueue.clear();
    for (const cached of this.warmCache.values()) {
      cached.chunk.dispose();
    }
    this.warmCache.clear();
  }
}
