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
  };

  constructor(world: VoxelWorld) {
    this.world = world;
    this.workerPool = new ChunkWorkerPool();
  }

  public updateFrustumCulling(camera: THREE.PerspectiveCamera): void {
    this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

    for (const chunk of this.world.chunks.values()) {
      chunk.group.visible = this.frustum.intersectsBox(chunk.worldBounds);
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

  public update(
    playerPos: THREE.Vector3,
    cameraDir: THREE.Vector3,
    renderDistance: number = 4,
    frameBudgetMs: number = 3.0
  ): void {
    const startTime = performance.now();
    const playerCX = Math.floor(playerPos.x / CHUNK_SIZE_X);
    const playerCZ = Math.floor(playerPos.z / CHUNK_SIZE_Z);

    const loadRadius = renderDistance;
    const unloadRadius = renderDistance + 2; // Hysteresis to prevent thrashing
    const loadRadiusSq = loadRadius * loadRadius + 1;
    const unloadRadiusSq = unloadRadius * unloadRadius;

    // 1. Identify chunks within Load Radius and calculate Priority
    let tasksEnqueuedThisFrame = 0;
    const maxNewTasksPerCall = 4; // Prevent worker starvation / CPU spike

    for (let dx = -loadRadius; dx <= loadRadius; dx++) {
      for (let dz = -loadRadius; dz <= loadRadius; dz++) {
        // Enforce frame budget check during chunk discovery
        if (performance.now() - startTime >= frameBudgetMs) {
          break;
        }

        const distSq = dx * dx + dz * dz;
        if (distSq <= loadRadiusSq) {
          const cx = playerCX + dx;
          const cz = playerCZ + dz;
          const key = `${cx},${cz}`;

          if (!this.world.chunks.has(key)) {
            // Check Warm Cache first (fast synchronous recovery)
            if (this.warmCache.has(key)) {
              const cached = this.warmCache.get(key)!;
              this.warmCache.delete(key);
              this.world.chunks.set(key, cached.chunk);
              this.world.worldGroup.add(cached.chunk.group);
            } else if (tasksEnqueuedThisFrame < maxNewTasksPerCall) {
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
              tasksEnqueuedThisFrame++;

              const modBlocksObj = this.getModifiedBlocksObject(cx, cz);

              this.workerPool.enqueueTask({
                type: 'generate',
                taskId: `task_${key}_${Date.now()}`,
                cx,
                cz,
                seed: this.world.seed,
                preset: this.world.preset,
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
                    const n1 = `${cx - 1},${cz}`;
                    const n2 = `${cx + 1},${cz}`;
                    const n3 = `${cx},${cz - 1}`;
                    const n4 = `${cx},${cz + 1}`;
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
      }
    }

    // Cancel queued tasks for chunks that are now out of range
    this.workerPool.cancelTasksOutofRange(playerCX, playerCZ, unloadRadius);

    // 2. Unload Chunks outside Unload Radius (with Hysteresis) - Zero string split
    for (const [key, chunk] of this.world.chunks.entries()) {
      const dx = chunk.cx - playerCX;
      const dz = chunk.cz - playerCZ;

      if (dx * dx + dz * dz > unloadRadiusSq) {
        this.world.worldGroup.remove(chunk.group);
        this.world.chunks.delete(key);
        this.dirtyQueue.delete(key);

        // Place into Warm Cache for 10 seconds before full disposal
        this.warmCache.set(key, { chunk, unloadTime: Date.now() });
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

    for (const key of this.dirtyQueue) {
      if (meshingTasksEnqueued >= maxMeshTasksPerCall || (performance.now() - startTime >= frameBudgetMs)) {
        break;
      }

      const chunk = this.world.chunks.get(key);
      if (chunk && chunk.isDirty && chunk.state !== ChunkState.QUEUED && chunk.state !== ChunkState.GENERATING && chunk.state !== ChunkState.MESHING) {
        const cx = chunk.cx;
        const cz = chunk.cz;

        // Prepare neighbor buffers using zero-allocation coordinate offsets
        const neighborBuffers: Record<string, ArrayBuffer> = {};
        for (let i = 0; i < ChunkScheduler.NEIGHBOR_OFFSETS.length; i++) {
          const [ox, oz] = ChunkScheduler.NEIGHBOR_OFFSETS[i];
          const nx = cx + ox;
          const nz = cz + oz;
          const nChunk = this.world.chunks.get(`${nx},${nz}`);
          if (nChunk && nChunk.blocks) {
            neighborBuffers[`${nx}_${nz}`] = nChunk.blocks.buffer;
          }
        }

        chunk.state = ChunkState.MESHING;
        chunk.isDirty = false;
        this.dirtyQueue.delete(key);
        meshingTasksEnqueued++;

        const dx = cx - playerCX;
        const dz = cz - playerCZ;
        const distSq = dx * dx + dz * dz;
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
          centerBuffer: chunk.blocks!.buffer,
          neighborBuffers,
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

    // 4. Update Profiler Metrics
    const poolStats = this.workerPool.getStats();
    this.metrics = {
      activeChunks: this.world.chunks.size,
      cachedChunks: this.warmCache.size,
      queuedTasks: poolStats.queuedTasks,
      generatingTasks: poolStats.activeWorkers,
      dirtyChunks: this.dirtyQueue.size,
      meshUploadsPerFrame: uploads,
    };
  }

  public markDirty(cx: number, cz: number): void {
    const key = `${cx},${cz}`;
    const chunk = this.world.chunks.get(key);
    if (chunk) {
      chunk.setDirty();
      this.dirtyQueue.add(key);
    }
  }

  private getModifiedBlocksObject(cx: number, cz: number): Record<string, number> | undefined {
    const cKey = `${cx},${cz}`;
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
