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
      const minX = chunk.cx * CHUNK_SIZE_X;
      const minZ = chunk.cz * CHUNK_SIZE_Z;
      this.tempBox.min.set(minX, 0, minZ);
      this.tempBox.max.set(minX + CHUNK_SIZE_X, CHUNK_SIZE_Y, minZ + CHUNK_SIZE_Z);

      chunk.group.visible = this.frustum.intersectsBox(this.tempBox);
    }
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

    const activeKeys = new Set<string>();

    // 1. Identify chunks within Load Radius and calculate Priority
    for (let dx = -loadRadius; dx <= loadRadius; dx++) {
      for (let dz = -loadRadius; dz <= loadRadius; dz++) {
        const distSq = dx * dx + dz * dz;
        if (distSq <= loadRadius * loadRadius + 1) {
          const cx = playerCX + dx;
          const cz = playerCZ + dz;
          const key = `${cx},${cz}`;
          activeKeys.add(key);

          // Calculate Priority (Camera Direction Boost)
          const dirX = dx === 0 && dz === 0 ? 0 : dx / Math.sqrt(distSq);
          const dirZ = dx === 0 && dz === 0 ? 0 : dz / Math.sqrt(distSq);
          const dot = dirX * cameraDir.x + dirZ * cameraDir.z;

          let priority = 1000 - distSq * 10;
          if (dot > 0) priority += dot * 250; // Boost chunks in front of camera
          if (dx === 0 && dz === 0) priority += 2000; // Player current chunk top priority

          if (!this.world.chunks.has(key)) {
            // Check Warm Cache first
            if (this.warmCache.has(key)) {
              const cached = this.warmCache.get(key)!;
              this.warmCache.delete(key);
              this.world.chunks.set(key, cached.chunk);
              this.world.worldGroup.add(cached.chunk.group);
            } else {
              // Create new Chunk & Enqueue Async Worker Task
              const chunk = new Chunk(cx, cz);
              chunk.state = ChunkState.QUEUED;
              this.world.chunks.set(key, chunk);
              this.world.worldGroup.add(chunk.group);

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
                    const neighborKeys = [
                      `${cx - 1},${cz}`,
                      `${cx + 1},${cz}`,
                      `${cx},${cz - 1}`,
                      `${cx},${cz + 1}`,
                    ];
                    for (const nKey of neighborKeys) {
                      const nChunk = this.world.chunks.get(nKey);
                      if (nChunk && nChunk.state !== ChunkState.QUEUED && nChunk.state !== ChunkState.UNLOADED) {
                        nChunk.setDirty();
                        this.dirtyQueue.add(nKey);
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

    // 2. Unload Chunks outside Unload Radius (with Hysteresis)
    for (const [key, chunk] of this.world.chunks.entries()) {
      const [cx, cz] = key.split(',').map(Number);
      const dx = cx - playerCX;
      const dz = cz - playerCZ;

      if (dx * dx + dz * dz > unloadRadius * unloadRadius) {
        this.world.worldGroup.remove(chunk.group);
        this.world.chunks.delete(key);
        this.dirtyQueue.delete(key);

        // Place into Warm Cache for 10 seconds before full disposal
        this.warmCache.set(key, { chunk, unloadTime: Date.now() });
      }
    }

    // Clean warm cache items older than 10s
    const now = Date.now();
    for (const [key, cached] of this.warmCache.entries()) {
      if (now - cached.unloadTime > 10000) {
        cached.chunk.dispose();
        this.warmCache.delete(key);
      }
    }

    // 3. Process Remesh / Dirty Queue to Worker
    let uploads = 0;
    for (const key of Array.from(this.dirtyQueue)) {
      const chunk = this.world.chunks.get(key);
      if (chunk && chunk.isDirty && chunk.state !== ChunkState.QUEUED && chunk.state !== ChunkState.GENERATING && chunk.state !== ChunkState.MESHING) {
        
        // Prepare neighbor buffers
        const [cx, cz] = key.split(',').map(Number);
        const neighborKeys = [
          `${cx - 1}_${cz}`, `${cx + 1}_${cz}`, `${cx}_${cz - 1}`, `${cx}_${cz + 1}`,
          `${cx - 1}_${cz - 1}`, `${cx + 1}_${cz - 1}`, `${cx - 1}_${cz + 1}`, `${cx + 1}_${cz + 1}`
        ];
        
        const neighborBuffers: Record<string, ArrayBuffer> = {};
        for (const nKey of neighborKeys) {
          const [nx, nz] = nKey.split('_').map(Number);
          const nChunk = this.world.chunks.get(`${nx},${nz}`);
          if (nChunk && nChunk.blocks) {
            neighborBuffers[nKey] = nChunk.blocks.buffer;
          }
        }

        chunk.state = ChunkState.MESHING;
        chunk.isDirty = false;
        this.dirtyQueue.delete(key);

        const dx = cx - playerCX;
        const dz = cz - playerCZ;
        const distSq = dx * dx + dz * dz;
        const dirX = dx === 0 && dz === 0 ? 0 : dx / Math.sqrt(distSq || 1);
        const dirZ = dx === 0 && dz === 0 ? 0 : dz / Math.sqrt(distSq || 1);
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
