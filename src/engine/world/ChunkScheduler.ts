// Chunk Streaming Scheduler with Camera Direction Priority, Frame Time Budget, Mesh Integration Queue & Resilience Watchdog
import * as THREE from 'three';
import { Chunk, ChunkState, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z, transitionChunkState } from './Chunk';
import { VoxelWorld } from './VoxelWorld';
import { ChunkWorkerPool } from './ChunkWorkerPool';
import { TransferableMeshData } from './VoxelMesher';
import { Logger } from '../ui/Logger';

export interface MeshIntegrationItem {
  key: string;
  cx: number;
  cz: number;
  meshData: TransferableMeshData;
  sourceRevision: number;
  sessionToken: number;
  priority: number;
}

export class ChunkScheduler {
  private world: VoxelWorld;
  public workerPool: ChunkWorkerPool;
  private dirtyQueue: Set<string> = new Set(); // Chunk keys scheduled for remesh
  private meshIntegrationQueue: MeshIntegrationItem[] = [];
  public warmCache: Map<string, { chunk: Chunk; unloadTime: number; estimatedMB: number }> = new Map();

  private projScreenMatrix = new THREE.Matrix4();
  private frustum = new THREE.Frustum();

  private lastZombieCheckTime: number = 0;
  private zombieCount: number = 0;

  // Metrics for Performance Profiler & Telemetry
  public metrics = {
    activeChunks: 0,
    cachedChunks: 0,
    queuedTasks: 0,
    generatingTasks: 0,
    dirtyChunks: 0,
    meshUploadsPerFrame: 0,
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
    healthyWorkers: 0,
    busyWorkers: 0,
    recoveringWorkers: 0,
    failedWorkers: 0,
    p95GenMs: 0,
    p95MeshMs: 0,
    zombieChunks: 0,
    cacheMemoryMB: 0,
  };

  private lastDiscoveryPlayerCX: number = -999999;
  private lastDiscoveryPlayerCZ: number = -999999;

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

    // 2. Fill borders from 8 neighbors using pure loaded query (no implicit chunk generation)
    const offsets = [
      [-1, 0], [1, 0], [0, -1], [0, 1],
      [-1, -1], [1, -1], [-1, 1], [1, 1]
    ];

    for (let i = 0; i < offsets.length; i++) {
      const [ox, oz] = offsets[i];
      const nChunkKey = world.getChunkKey(cx + ox, cz + oz);
      const nChunk = world.getChunkLoaded(cx + ox, cz + oz);
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

  public resetSession(token: number): void {
    this.workerPool.setSessionToken(token);
    this.dirtyQueue.clear();
    this.meshIntegrationQueue = [];
    for (const cached of this.warmCache.values()) {
      cached.chunk.dispose();
    }
    this.warmCache.clear();
    this.lastDiscoveryPlayerCX = -999999;
    this.lastDiscoveryPlayerCZ = -999999;
  }

  public triggerBorderRemesh(cx: number, cz: number): void {
    const neighbors = [
      this.world.getChunkKey(cx - 1, cz),
      this.world.getChunkKey(cx + 1, cz),
      this.world.getChunkKey(cx, cz - 1),
      this.world.getChunkKey(cx, cz + 1),
    ];
    for (let i = 0; i < neighbors.length; i++) {
      const nChunk = this.world.chunks.get(neighbors[i]);
      if (nChunk && nChunk.state !== ChunkState.QUEUED_GENERATION && nChunk.state !== ChunkState.UNLOADED) {
        nChunk.setDirty();
        this.dirtyQueue.add(neighbors[i]);
      }
    }
  }

  public update(
    playerPos: THREE.Vector3,
    cameraDir: THREE.Vector3,
    renderDistance: number = 4,
    frameBudgetMs: number = 3.0
  ): void {
    ChunkScheduler.initSpiralOffsets();

    const startTime = performance.now();
    const now = Date.now();
    const playerCX = Math.floor(playerPos.x / CHUNK_SIZE_X);
    const playerCZ = Math.floor(playerPos.z / CHUNK_SIZE_Z);

    const loadRadius = renderDistance;
    const unloadRadius = renderDistance + 2; // Hysteresis to prevent thrashing
    const loadRadiusSq = loadRadius * loadRadius + 1;
    const unloadRadiusSq = unloadRadius * unloadRadius;

    // 0. Zombie Detector Watchdog (Runs every 1000ms)
    if (now - this.lastZombieCheckTime > 1000) {
      this.lastZombieCheckTime = now;
      let zombiesDetected = 0;

      for (const [key, chunk] of this.world.chunks.entries()) {
        const isStuckGenerating =
          (chunk.state === ChunkState.GENERATING || chunk.state === ChunkState.QUEUED_GENERATION) &&
          now - chunk.lastStateChangeTime > 5000;

        const isStuckMeshing =
          (chunk.state === ChunkState.MESHING || chunk.state === ChunkState.QUEUED_MESH) &&
          now - chunk.lastStateChangeTime > 5000;

        if (isStuckGenerating || isStuckMeshing) {
          zombiesDetected++;
          Logger.warn('ChunkScheduler', `[ZombieDetector] Recovered zombie chunk (${chunk.cx}, ${chunk.cz}) in state '${chunk.state}'`);

          if (isStuckGenerating) {
            transitionChunkState(chunk, chunk.state, ChunkState.UNLOADED, 'zombie_recovery');
            this.world.chunks.delete(key);
            this.world.worldGroup.remove(chunk.group);
          } else {
            chunk.setDirty();
            transitionChunkState(chunk, chunk.state, ChunkState.DIRTY, 'zombie_recovery');
            this.dirtyQueue.add(key);
          }
        }
      }
      this.zombieCount = zombiesDetected;
    }

    // 1. Streaming Candidate Discovery (Budget-aware)
    let tasksEnqueuedThisFrame = 0;
    const maxNewTasksPerCall = 4;

    discoveryLoop:
    for (let i = 0; i < ChunkScheduler.spiralOffsets.length; i++) {
      const [dx, dz] = ChunkScheduler.spiralOffsets[i];
      const distSq = dx * dx + dz * dz;

      if (distSq > loadRadiusSq) {
        break discoveryLoop;
      }

      const isVeryNear = distSq <= 4; // 2 chunks radius close-range fail-safe

      if (!isVeryNear && performance.now() - startTime >= frameBudgetMs) {
        break discoveryLoop;
      }

      const cx = playerCX + dx;
      const cz = playerCZ + dz;
      const key = this.world.getChunkKey(cx, cz);

      if (!this.world.chunks.has(key)) {
        // Check Warm Cache first
        if (this.warmCache.has(key)) {
          const cached = this.warmCache.get(key)!;
          this.warmCache.delete(key);
          if (cached.chunk && cached.chunk.blocks && cached.chunk.state === ChunkState.READY) {
            this.world.chunks.set(key, cached.chunk);
            this.world.worldGroup.add(cached.chunk.group);
            this.triggerBorderRemesh(cx, cz);
            continue;
          } else {
            cached.chunk.dispose();
          }
        }

        if (isVeryNear || tasksEnqueuedThisFrame < maxNewTasksPerCall) {
          const invDist = distSq > 0 ? 1 / Math.sqrt(distSq) : 0;
          const dirX = dx * invDist;
          const dirZ = dz * invDist;
          const dot = dirX * cameraDir.x + dirZ * cameraDir.z;

          let priority = 1000 - distSq * 10;
          if (dot > 0) priority += dot * 250;
          if (dx === 0 && dz === 0) priority += 2000;

          const chunk = new Chunk(cx, cz);
          transitionChunkState(chunk, ChunkState.UNLOADED, ChunkState.QUEUED_GENERATION, 'scheduler_discovery');
          this.world.chunks.set(key, chunk);
          this.world.worldGroup.add(chunk.group);

          if (!isVeryNear) {
            tasksEnqueuedThisFrame++;
          }

          const modBlocksObj = this.getModifiedBlocksObject(cx, cz);

          this.workerPool.enqueueTask({
            type: 'generate',
            taskId: `gen_${key}_${Date.now()}`,
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

                const statesMap = this.world.getModifiedBlockStates(cx, cz);
                if (statesMap) {
                  statesMap.forEach((st, localKey) => {
                    const [lx, wy, lz] = localKey.split(',').map(Number);
                    if (!isNaN(lx) && !isNaN(wy) && !isNaN(lz)) {
                      targetChunk.setBlockState(lx, wy, lz, st);
                    }
                  });
                }

                transitionChunkState(targetChunk, [ChunkState.QUEUED_GENERATION, ChunkState.GENERATING, ChunkState.GENERATION_RETRY, ChunkState.GENERATED], ChunkState.GENERATED, 'gen_complete');
                targetChunk.isDirty = true;
                this.dirtyQueue.add(key);
                this.triggerBorderRemesh(cx, cz);
              }
            },
            onError: (_err) => {
              const targetChunk = this.world.chunks.get(key);
              if (targetChunk) {
                targetChunk.setDirty();
                transitionChunkState(targetChunk, targetChunk.state, ChunkState.DIRTY, 'gen_error');
                this.dirtyQueue.add(key);
              }
            },
          });
        }
      }
    }

    // Cancel queued tasks for chunks out of range
    this.workerPool.cancelTasksOutofRange(playerCX, playerCZ, unloadRadius);

    // 2. Unload Chunks outside Unload Radius (Hardened Warm Cache)
    for (const [key, chunk] of this.world.chunks.entries()) {
      const dx = chunk.cx - playerCX;
      const dz = chunk.cz - playerCZ;
      const distSq = dx * dx + dz * dz;

      if (distSq > unloadRadiusSq) {
        this.world.worldGroup.remove(chunk.group);
        this.world.chunks.delete(key);
        this.dirtyQueue.delete(key);

        // Requirement 24: DO NOT CACHE BROKEN / DIRTY / MESHING / GENERATING CHUNKS
        const isCacheable = chunk.state === ChunkState.READY || chunk.state === ChunkState.GENERATED;
        if (isCacheable && chunk.blocks) {
          // Warm Cache LRU Eviction (max 64 entries)
          if (this.warmCache.size >= 64) {
            const oldestKey = this.warmCache.keys().next().value;
            if (oldestKey !== undefined) {
              const old = this.warmCache.get(oldestKey);
              if (old) old.chunk.dispose();
              this.warmCache.delete(oldestKey);
            }
          }
          const estimatedMB = 0.35; // ~350 KB per cached chunk
          this.warmCache.set(key, { chunk, unloadTime: now, estimatedMB });
        } else {
          chunk.dispose();
        }
      } else {
        chunk.updateShadowLOD(distSq);
      }
    }

    // Clean warm cache items older than 10s (Throttled check every 1500ms)
    if (now - this.lastCacheCleanTime > 1500) {
      this.lastCacheCleanTime = now;
      for (const [key, cached] of this.warmCache.entries()) {
        if (now - cached.unloadTime > 10000) {
          cached.chunk.dispose();
          this.warmCache.delete(key);
        }
      }
    }

    // 3. Process Remesh / Dirty Queue to Worker
    let meshingTasksEnqueued = 0;
    const maxMeshTasksPerCall = 3;

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
      if (meshingTasksEnqueued >= maxMeshTasksPerCall || (meshingTasksEnqueued > 0 && performance.now() - startTime >= frameBudgetMs)) {
        break;
      }

      const chunk = this.world.chunks.get(key);
      if (
        chunk &&
        chunk.isDirty &&
        chunk.state !== ChunkState.QUEUED_GENERATION &&
        chunk.state !== ChunkState.GENERATING &&
        chunk.state !== ChunkState.MESHING &&
        chunk.state !== ChunkState.QUEUED_MESH
      ) {
        const cx = chunk.cx;
        const cz = chunk.cz;

        const dx = cx - playerCX;
        const dz = cz - playerCZ;
        const distSq = dx * dx + dz * dz;
        const isVeryNear = distSq <= 4;

        if (!isVeryNear && meshingTasksEnqueued >= maxMeshTasksPerCall) {
          break;
        }

        transitionChunkState(chunk, [ChunkState.GENERATED, ChunkState.DIRTY, ChunkState.READY], ChunkState.QUEUED_MESH, 'enqueue_mesh');
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
        meshPriority += 150;

        const chunkSourceRev = chunk.voxelRevision;

        this.workerPool.enqueueTask({
          type: 'mesh',
          taskId: `mesh_${key}_${Date.now()}`,
          cx,
          cz,
          sourceRevision: chunkSourceRev,
          priority: meshPriority,
          sessionToken: this.workerPool.currentSessionToken,
          // Requirement 3 & 4: Provide fresh buffer dynamically at execution time
          bufferProvider: () => {
            const freshChunk = this.world.getChunkLoaded(cx, cz);
            if (!freshChunk || !freshChunk.blocks) return {};
            const freshHalo = ChunkScheduler.buildHaloBuffer(freshChunk, this.world);
            return { haloBuffer: freshHalo };
          },
          onComplete: (meshData, sourceRevision) => {
            // Push to Mesh Integration Queue (Req 18 & 19)
            this.meshIntegrationQueue.push({
              key,
              cx,
              cz,
              meshData,
              sourceRevision,
              sessionToken: this.workerPool.currentSessionToken,
              priority: meshPriority,
            });
          },
          onError: (_err) => {
            const targetChunk = this.world.chunks.get(key);
            if (targetChunk) {
              targetChunk.setDirty();
              transitionChunkState(targetChunk, targetChunk.state, ChunkState.DIRTY, 'mesh_error');
              this.dirtyQueue.add(key);
            }
          },
        });
      } else if (!chunk) {
        this.dirtyQueue.delete(key);
      }
    }

    // 4. GPU Mesh Integration Queue (Req 18 & 19)
    let uploads = 0;
    if (this.meshIntegrationQueue.length > 0) {
      // Sort integration queue by priority (near player first)
      this.meshIntegrationQueue.sort((a, b) => b.priority - a.priority);

      const maxUploadsPerFrame = 3;
      const gpuStart = performance.now();

      while (
        this.meshIntegrationQueue.length > 0 &&
        uploads < maxUploadsPerFrame &&
        performance.now() - gpuStart < 2.0
      ) {
        const item = this.meshIntegrationQueue.shift()!;
        if (item.sessionToken !== this.workerPool.currentSessionToken) continue;

        const targetChunk = this.world.chunks.get(item.key);
        if (targetChunk) {
          const applied = targetChunk.applyTransferableMesh(
            item.meshData,
            this.world.solidMaterial,
            this.world.transMaterial,
            this.world.waterMaterial,
            item.sourceRevision
          );

          if (applied) {
            transitionChunkState(targetChunk, [ChunkState.QUEUED_MESH, ChunkState.MESHING, ChunkState.DIRTY, ChunkState.READY], ChunkState.READY, 'mesh_applied');
            const dx = targetChunk.cx - playerCX;
            const dz = targetChunk.cz - playerCZ;
            targetChunk.updateShadowLOD(dx * dx + dz * dz);
            uploads++;
            this.triggerBorderRemesh(item.cx, item.cz);
          } else {
            // Stale revision: mark dirty and re-enqueue
            targetChunk.setDirty();
            transitionChunkState(targetChunk, targetChunk.state, ChunkState.DIRTY, 'stale_revision');
            this.dirtyQueue.add(item.key);
          }
        }
      }
    }

    // Process Worker Queue
    this.workerPool.processQueue(1.5);

    // 5. Update Profiler Metrics
    let loaded = 0;
    let generated = 0;
    let meshed = 0;
    let visible = 0;
    let pendingGen = 0;
    let pendingMesh = this.dirtyQueue.size;
    let pendingUpload = this.meshIntegrationQueue.length;
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
      if (chunk.state === ChunkState.QUEUED_GENERATION || chunk.state === ChunkState.GENERATING) {
        pendingGen++;
      }
      if (chunk.state === ChunkState.QUEUED_MESH || chunk.state === ChunkState.MESHING) {
        pendingMesh++;
      }
    }

    let cacheMemMB = 0;
    for (const cached of this.warmCache.values()) {
      cacheMemMB += cached.estimatedMB;
    }

    const poolStats = this.workerPool.getStats();
    this.metrics = {
      activeChunks: this.world.chunks.size,
      cachedChunks: this.warmCache.size,
      queuedTasks: poolStats.queuedTasks,
      generatingTasks: poolStats.busyWorkers,
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
      healthyWorkers: poolStats.healthyWorkers,
      busyWorkers: poolStats.busyWorkers,
      recoveringWorkers: poolStats.recoveringWorkers,
      failedWorkers: poolStats.failedWorkers,
      p95GenMs: poolStats.p95GenMs,
      p95MeshMs: poolStats.p95MeshMs,
      zombieChunks: this.zombieCount,
      cacheMemoryMB: Math.round(cacheMemMB * 10) / 10,
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
    const map = this.world.getModifiedBlocks(cx, cz);
    if (!map || map.size === 0) return undefined;
    const obj: Record<string, number> = {};
    map.forEach((val, key) => {
      obj[key] = val;
    });
    return obj;
  }

  public dispose(): void {
    this.workerPool.dispose();
    this.dirtyQueue.clear();
    this.meshIntegrationQueue = [];
    for (const cached of this.warmCache.values()) {
      cached.chunk.dispose();
    }
    this.warmCache.clear();
  }
}
