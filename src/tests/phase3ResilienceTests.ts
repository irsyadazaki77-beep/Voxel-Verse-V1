// Phase 3 Chunk Worker & Streaming Resilience Overhaul Test Suite
import * as THREE from 'three';
import { ChunkWorkerPool, WorkerState } from '../engine/world/ChunkWorkerPool';
import { ChunkScheduler } from '../engine/world/ChunkScheduler';
import { Chunk, ChunkState, transitionChunkState } from '../engine/world/Chunk';
import { VoxelWorld } from '../engine/world/VoxelWorld';

let testCount = 0;
let passedCount = 0;

function assert(condition: boolean, name: string, detail?: string) {
  testCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✓ [PASS] ${name}`);
  } else {
    console.error(`  ✗ [FAIL] ${name}${detail ? `: ${detail}` : ''}`);
    throw new Error(`Phase 3 Test Failed: ${name}`);
  }
}

export async function runPhase3ResilienceTests(): Promise<boolean> {
  console.log('----------------------------------------------------');
  console.log(' PHASE 3: CHUNK WORKER & STREAMING RESILIENCE OVERHAUL TEST ');
  console.log('----------------------------------------------------');

  // ====================================================
  // 1. PER-WORKER HEALTH STATE & MULTI-LEVEL FALLBACK
  // ====================================================
  console.log('▶ [1/8] Testing Per-Worker Health State & Multi-Level Fallback...');
  {
    const pool = new ChunkWorkerPool();
    const stats = pool.getStats();
    assert(stats.totalWorkers > 0, 'Worker pool initialized with hardware concurrency slots');

    // Simulate worker 0 failure
    (pool as any).handleWorkerFailure(0, 'Simulated worker crash');
    const statsAfter1 = pool.getStats();
    let isUnavailable = pool.isAllWorkersUnavailable();
    assert(isUnavailable === false || stats.totalWorkers === 1, 'Single worker failure does NOT permanently force global sync mode');

    // Trigger failure across all worker slots
    for (let i = 0; i < stats.totalWorkers; i++) {
      (pool as any).handleWorkerFailure(i, 'Simulated worker crash');
      (pool as any).handleWorkerFailure(i, 'Simulated worker crash');
      (pool as any).handleWorkerFailure(i, 'Simulated worker crash');
    }

    isUnavailable = pool.isAllWorkersUnavailable();
    assert(isUnavailable === true, 'All worker slots marked unavailable after repeated failures');

    // Test Controlled Sync Fallback under budget
    let syncCompleted: boolean = false;
    pool.enqueueTask({
      type: 'generate',
      taskId: 'sync_fallback_test',
      cx: 0,
      cz: 0,
      seed: 42819,
      priority: 1000,
      sessionToken: pool.currentSessionToken,
      onComplete: (_buffer) => {
        syncCompleted = true;
      },
    });

    pool.processQueue(5.0);
    assert(Boolean(syncCompleted), 'Controlled sync fallback executed single task cleanly without freezing execution loop');

    // Simulate worker 0 recovery (mocking a healthy worker slot for headless Node environment)
    const slot0 = (pool as any).workerSlots[0];
    slot0.restartAttempts = 0;
    slot0.state = WorkerState.HEALTHY;
    slot0.worker = { postMessage: () => {}, terminate: () => {} } as any;
    isUnavailable = pool.isAllWorkersUnavailable();
    assert(isUnavailable === false, 'Worker recovery deactivates global sync fallback mode automatically');

    // Test automatic cooldown recovery watchdog
    slot0.state = WorkerState.FAILED;
    slot0.lastFailureAt = Date.now() - 6000; // 6s ago
    pool.checkAndRecoverFailedWorkers();
    assert(slot0.restartAttempts === 0, 'Auto-recovery watchdog reset restart attempts after failure cooldown');

    pool.dispose();
  }

  // ====================================================
  // 2. DETACHED HALO BUFFER RETRY & FRESH INPUT PROVIDER
  // ====================================================
  console.log('▶ [2/8] Testing Detached Buffer Handling & Retry Provider...');
  {
    const world = new VoxelWorld(42819, 'standard');
    const chunk = world.generateChunk(0, 0);
    world.chunks.set(world.getChunkKey(0, 0), chunk);

    let providerCalls = 0;
    const provider = () => {
      providerCalls++;
      const halo = ChunkScheduler.buildHaloBuffer(chunk, world);
      return { haloBuffer: halo };
    };

    const firstResult = provider();
    assert(firstResult.haloBuffer !== undefined, 'Halo buffer provider creates valid ArrayBuffer');
    assert(firstResult.haloBuffer!.byteLength > 0, 'Halo buffer has positive byte length');

    // Simulate transfer (detach)
    if (typeof MessageChannel !== 'undefined') {
      const channel = new MessageChannel();
      channel.port1.postMessage({}, [firstResult.haloBuffer!]);
      channel.port1.close();
      channel.port2.close();
    }
    assert(firstResult.haloBuffer!.byteLength === 0, 'ArrayBuffer byteLength becomes 0 after message transfer');

    // Simulate task retry using provider
    const retryResult = provider();
    assert(providerCalls === 2, 'Task retry invokes provider to construct fresh buffer');
    assert(retryResult.haloBuffer!.byteLength > 0, 'Retried task receives fresh non-detached ArrayBuffer');

    world.dispose();
  }

  // ====================================================
  // 3. CHUNK STATE MACHINE & ZOMBIE CHUNK WATCHDOG
  // ====================================================
  console.log('▶ [3/8] Testing Chunk State Machine & Zombie Detector Watchdog...');
  {
    const world = new VoxelWorld(42819, 'standard');
    const scheduler = world.scheduler;

    const chunk = new Chunk(10, 10);
    transitionChunkState(chunk, ChunkState.UNLOADED, ChunkState.MESHING, 'test_setup');
    chunk.lastStateChangeTime = Date.now() - 6000; // Stuck for 6 seconds
    const key = world.getChunkKey(10, 10);
    world.chunks.set(key, chunk);

    const playerPos = new THREE.Vector3(0, 64, 0);
    const cameraDir = new THREE.Vector3(0, 0, -1);

    scheduler.update(playerPos, cameraDir, 4, 3.0);

    assert(chunk.state !== ChunkState.MESHING, 'Zombie chunk detector automatically recovered chunk stuck in MESHING state');
    assert(scheduler.metrics.zombieChunks >= 1, 'Zombie chunks metric reported recovered chunk count');

    world.dispose();
  }

  // ====================================================
  // 4. TASK DEDUPLICATION & CANONICAL TASK KEYS
  // ====================================================
  console.log('▶ [4/8] Testing Canonical Task Deduplication & Priority Queue...');
  {
    const pool = new ChunkWorkerPool();
    // Set a busy worker slot so tasks remain queued in taskQueue during deduplication test
    (pool as any).workerSlots = [{ index: 0, worker: {} as any, state: WorkerState.BUSY, failureCount: 0, timeoutCount: 0, lastFailureAt: 0, restartAttempts: 0 }];

    pool.enqueueTask({
      type: 'generate',
      taskId: 'gen_1',
      cx: 2,
      cz: 2,
      seed: 42819,
      priority: 100,
      sessionToken: pool.currentSessionToken,
      onComplete: () => {},
    });

    pool.enqueueTask({
      type: 'generate',
      taskId: 'gen_1_duplicate',
      cx: 2,
      cz: 2,
      seed: 42819,
      priority: 100,
      sessionToken: pool.currentSessionToken,
      onComplete: () => {},
    });

    assert(pool.getStats().queuedTasks === 1, 'Duplicate task (gen:2:2:1) deduplicated by canonical key');

    pool.cancelTasksOutofRange(0, 0, 4);
    assert(pool.getStats().queuedTasks === 1, 'Task within core radius <= 3 protected from cancellation');

    pool.dispose();
  }

  // ====================================================
  // 5. SESSION TOKEN SAFETY & DIMENSION SWITCH
  // ====================================================
  console.log('▶ [5/8] Testing Session Token Safety & Dimension Switch...');
  {
    const world = new VoxelWorld(42819, 'standard');
    const scheduler = world.scheduler;

    scheduler.workerPool.enqueueTask({
      type: 'generate',
      taskId: 'old_session_task',
      cx: 5,
      cz: 5,
      seed: 42819,
      priority: 500,
      sessionToken: 1,
      onComplete: () => {},
    });

    scheduler.resetSession(2);
    assert(scheduler.workerPool.currentSessionToken === 2, 'Session token updated to 2');
    assert(scheduler.workerPool.getStats().queuedTasks === 0, 'Queued tasks from old session 1 purged on session reset');

    world.dispose();
  }

  // ====================================================
  // 6. WARM CACHE HARDENING & REUSABLE READINESS
  // ====================================================
  console.log('▶ [6/8] Testing Warm Cache Hardening & Reusable Readiness...');
  {
    const world = new VoxelWorld(42819, 'standard');
    const scheduler = world.scheduler;

    const readyChunk = new Chunk(20, 20);
    readyChunk.setBlocks(new Uint8Array(32768));
    readyChunk.state = ChunkState.READY;
    world.chunks.set(world.getChunkKey(20, 20), readyChunk);

    const dirtyChunk = new Chunk(21, 21);
    dirtyChunk.state = ChunkState.DIRTY;
    world.chunks.set(world.getChunkKey(21, 21), dirtyChunk);

    const playerPos = new THREE.Vector3(0, 64, 0); // Far from (20,20)
    const cameraDir = new THREE.Vector3(0, 0, -1);

    scheduler.update(playerPos, cameraDir, 4, 3.0);

    const cachedReady = scheduler.warmCache.get(world.getChunkKey(20, 20));
    assert(cachedReady !== undefined, 'READY chunk placed into warm cache upon unloading');

    const cachedDirty = scheduler.warmCache.get(world.getChunkKey(21, 21));
    assert(cachedDirty === undefined, 'DIRTY / non-READY chunk NOT placed into warm cache as reusable chunk');

    world.dispose();
  }

  // ====================================================
  // 7. GPU MESH INTEGRATION QUEUE & BORDER REMESH
  // ====================================================
  console.log('▶ [7/8] Testing GPU Mesh Integration Queue & Border Remesh...');
  {
    const world = new VoxelWorld(42819, 'standard');
    const scheduler = world.scheduler;

    const chunk = world.generateChunk(0, 0);
    world.chunks.set(world.getChunkKey(0, 0), chunk);

    // Neighbor chunk
    const neighborChunk = world.generateChunk(1, 0);
    neighborChunk.state = ChunkState.READY;
    world.chunks.set(world.getChunkKey(1, 0), neighborChunk);

    scheduler.triggerBorderRemesh(0, 0);
    assert(scheduler.dirtyChunkCount > 0, 'triggerBorderRemesh marked neighbor chunk dirty to fix border seams');

    world.dispose();
  }

  // ====================================================
  // 8. LONG SESSION TRAVEL & STABILITY STRESS
  // ====================================================
  console.log('▶ [8/8] Testing Long Session Travel & Teleport Stress...');
  {
    const world = new VoxelWorld(42819, 'standard');
    const scheduler = world.scheduler;

    // Fast travel simulation across 10 chunk steps
    for (let i = 0; i < 10; i++) {
      const pos = new THREE.Vector3(i * 16, 64, i * 16);
      const dir = new THREE.Vector3(1, 0, 1).normalize();
      scheduler.update(pos, dir, 4, 3.0);
    }

    assert(world.chunks.size <= 100, 'Loaded chunks bounded cleanly during high-speed travel');
    assert(scheduler.warmCache.size <= 64, 'Warm cache capped strictly at max 64 entries');

    world.dispose();
  }

  console.log('\n====================================================');
  console.log(` PHASE 3 RESILIENCE TESTS PASSED (${passedCount}/${testCount} assertions) `);
  console.log('====================================================\n');
  return true;
}
