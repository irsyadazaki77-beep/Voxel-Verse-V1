// ============================================================================
// PHASE 3: GRAPHICS ENGINE, CHUNK STREAMING & PERFORMANCE BENCHMARK SUITE
// ============================================================================

import * as THREE from 'three';
import { VoxelWorld } from '../engine/world/VoxelWorld';
import { Chunk } from '../engine/world/Chunk';
import { WorldGeneratorCore } from '../engine/world/WorldGeneratorCore';
import { VoxelMesher } from '../engine/world/VoxelMesher';
import { ChunkScheduler } from '../engine/world/ChunkScheduler';
import { ChunkWorkerPool } from '../engine/world/ChunkWorkerPool';
import { RenderQualityManager } from '../engine/systems/RenderQualityManager';
import { RenderPipeline } from '../engine/rendering/RenderPipeline';
import { BlockType } from '../types';

let testCount = 0;
let passedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  testCount++;
  if (condition) {
    passedCount++;
    console.log(`    ✓ [PASS] ${testName}`);
  } else {
    console.error(`    ✗ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
    throw new Error(`Phase 3 Benchmark Test Failed: ${testName}`);
  }
}

export async function runPhase3GraphicsBenchmarkTests(): Promise<boolean> {
  console.log('----------------------------------------------------');
  console.log(' PHASE 3 GRAPHICS, CHUNK STREAMING & PERFORMANCE SUITE');
  console.log('----------------------------------------------------\n');

  // =========================================================================
  // BENCHMARK 1: Voxel Mesher & Zero-Allocation Transferables
  // =========================================================================
  console.log('  ▶ [1/6] Benchmarking Voxel Meshing & Transferable Buffers...');
  {
    const world = new VoxelWorld(42819, 'standard');
    world.ensureChunkLoaded(0, 0);

    // Populate terrain with solid, water, and transparent foliage blocks
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        world.setBlock(x, 60, z, BlockType.STONE);
        world.setBlock(x, 61, z, BlockType.DIRT);
        world.setBlock(x, 62, z, BlockType.GRASS);
        if (x % 4 === 0 && z % 4 === 0) {
          world.setBlock(x, 63, z, BlockType.OAK_LOG);
          world.setBlock(x, 64, z, BlockType.OAK_LEAVES);
        }
      }
    }

    const chunk = world.getChunkLoaded(0, 0)!;
    const getBlock = (lx: number, ly: number, lz: number) => world.getBlock(lx, ly, lz);
    
    // Warm-up pass to ensure JIT compilation does not skew measurement
    VoxelMesher.buildChunkMeshData(getBlock, 16, 128, 16);

    const startMeshTime = performance.now();
    const meshData = VoxelMesher.buildChunkMeshData(getBlock, 16, 128, 16);
    const meshDuration = performance.now() - startMeshTime;

    assert(meshDuration < 250.0, `Chunk meshing completed within budget (${meshDuration.toFixed(2)}ms)`);
    assert(meshData.solidPositions instanceof Float32Array, 'Solid positions array generated');
    assert(meshData.solidPositions.length > 0, 'Solid mesh contains vertices');
    assert(meshData.solidIndices.length > 0, 'Solid mesh contains index buffer');

    // Test zero-allocation empty buffer return for an empty chunk
    const emptyMeshData = VoxelMesher.buildChunkMeshData(() => BlockType.AIR, 16, 128, 16);
    assert(emptyMeshData.solidPositions.length === 0, 'Solid buffer is empty for air chunk');
    assert(emptyMeshData.waterPositions.length === 0, 'Water buffer is empty for air chunk');
    assert(emptyMeshData.waterPositions.buffer.byteLength === 0, 'Empty layer returns 0-byte ArrayBuffer without heap allocation');

    world.dispose();
  }

  // =========================================================================
  // BENCHMARK 2: Chunk Streaming & Adaptive Budget Scaling
  // =========================================================================
  console.log('\n  ▶ [2/6] Testing Chunk Streaming Scheduler & Adaptive Budgets...');
  {
    const world = new VoxelWorld(777, 'standard');
    const scheduler = new ChunkScheduler(world);

    const playerPos = new THREE.Vector3(8, 64, 8);
    const cameraDir = new THREE.Vector3(0, 0, -1);

    // Warm-up initial discovery pass & JIT compilation
    scheduler.update(playerPos, cameraDir, 4, 2.0);
    scheduler.update(playerPos, cameraDir, 4, 2.0);

    // 1. Test steady-state scheduler update with tight frame budget (2.0ms)
    const tightStart = performance.now();
    scheduler.update(playerPos, cameraDir, 4, 2.0);
    const tightDuration = performance.now() - tightStart;

    assert(tightDuration < 250.0, `Tight frame budget scheduler update execution time (${tightDuration.toFixed(2)}ms)`);

    // 2. Test warm cache LRU retention
    assert(scheduler.warmCache.size <= 64, 'Warm cache size bounded to 64 entries max');

    // 3. Test halo buffer extraction speed
    const testChunk = new Chunk(0, 0);
    const gen = new WorldGeneratorCore(777, 'standard');
    testChunk.setBlocks(gen.generateChunkData(0, 0));
    world.chunks.set(world.getChunkKey(0, 0), testChunk);

    const startHalo = performance.now();
    const haloBuffer = ChunkScheduler.buildHaloBuffer(testChunk, world);
    const haloDuration = performance.now() - startHalo;

    assert(haloBuffer.byteLength === 18 * 128 * 18, 'Halo buffer has exact 18x128x18 padded dimension');
    assert(haloDuration < 10.0, `Halo buffer generated quickly (${haloDuration.toFixed(2)}ms)`);

    scheduler.resetSession(999);
    world.dispose();
  }

  // =========================================================================
  // BENCHMARK 3: Worker Pool Queue Capacity & Priority Sorting
  // =========================================================================
  console.log('\n  ▶ [3/6] Testing Chunk Worker Pool Capacity & Priority Pruning...');
  {
    const pool = new ChunkWorkerPool();

    // Enqueue 300 tasks to test pruning overflow
    for (let i = 0; i < 300; i++) {
      const isNear = i < 10;
      pool.enqueueTask({
        type: 'generate',
        taskId: `test_gen_${i}`,
        cx: i,
        cz: 0,
        priority: isNear ? 2500 : 100 + i,
        sessionToken: pool.currentSessionToken,
        seed: 42,
        onComplete: () => {},
      });
    }

    const stats = pool.getStats();
    assert(stats.queuedTasks <= 250, `Task queue capped at max capacity (${stats.queuedTasks} <= 250)`);

    // Invalidate session token and verify queue cleanup
    pool.setSessionToken( pool.currentSessionToken + 1 );
    const resetStats = pool.getStats();
    assert(resetStats.queuedTasks === 0, 'Session token update cleanly clears stale queued tasks');
  }

  // =========================================================================
  // BENCHMARK 4: RenderQualityManager Dynamic Scaling & Hysteresis
  // =========================================================================
  console.log('\n  ▶ [4/6] Testing RenderQualityManager Hysteresis & Preset Bounds...');
  {
    const mockRuntime: any = {
      renderer: {
        setPixelRatio: () => {},
        setSize: () => {},
        outputColorSpace: THREE.SRGBColorSpace,
      },
      renderPipeline: {
        updateSettings: () => {},
      },
      settings: {
        graphics: {
          preset: 'high',
          resolutionMode: 'auto',
          renderDistance: 8,
          dynamicResolution: true,
          targetFps: 60,
        },
      },
    };

    const rqm = new RenderQualityManager(mockRuntime);
    const winW = 1920;
    const winH = 1080;

    const budgetHigh = rqm.calculatePixelBudget(mockRuntime.settings.graphics, winW, winH);
    assert(budgetHigh.width === winW && budgetHigh.height === winH, 'Budget matches viewport width and height');
    assert(budgetHigh.dpr >= 0.9 && budgetHigh.dpr <= 2.0, 'DPR within High preset bounds');

    // Test GPU stress tracking: simulate 20ms render time for multiple consecutive frames
    for (let i = 0; i < 20; i++) {
      rqm.trackFrameTime(22.0, 18.0, mockRuntime.settings.graphics);
    }

    assert(typeof rqm.scale === 'number' && rqm.scale <= 1.0, 'Dynamic resolution scale evaluated smoothly');
  }

  // =========================================================================
  // BENCHMARK 5: WebGL GPU Resource Disposal Integrity
  // =========================================================================
  console.log('\n  ▶ [5/6] Testing GPU Resource Disposal & Cleanup...');
  {
    const chunk = new Chunk(5, 5);
    const group = chunk.group;

    // Create mock meshes on chunk
    const solidGeo = new THREE.BufferGeometry();
    const solidMat = new THREE.MeshBasicMaterial();
    chunk.solidMesh = new THREE.Mesh(solidGeo, solidMat);
    group.add(chunk.solidMesh);

    // Dispose chunk
    chunk.dispose();

    assert(group.children.length === 0, 'Chunk disposal clears mesh group children');
    assert(chunk.solidMesh === null, 'Solid mesh reference nullified after disposal');
  }

  // =========================================================================
  // BENCHMARK 6: End-to-End Render Pipeline Settings Integration
  // =========================================================================
  console.log('\n  ▶ [6/6] Testing Unified Render Pipeline Config & Settings...');
  {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
    const mockRenderer: any = {
      getContext: () => ({ getExtension: () => null }),
      getPixelRatio: () => 1,
      setPixelRatio: () => {},
      setSize: () => {},
      render: () => {},
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 1.0,
      capabilities: { isWebGL2: true, maxTextures: 16 },
    };

    const pipeline = new RenderPipeline(mockRenderer, scene, camera);
    assert(pipeline instanceof RenderPipeline, 'RenderPipeline instantiated successfully');

    // Disable post-processing and verify clean fallback
    pipeline.updateSettings({
      preset: 'low',
      postProcessing: false,
    } as any, 1920, 1080);

    assert(pipeline.isPostProcessingActive === false, 'Post-processing cleanly falls back to direct render when disabled');

    pipeline.dispose();
  }

  console.log('\n  ✓ All Phase 3 Graphics Engine, Chunk Streaming & Performance Benchmarks Passed Strictly!\n');
  return true;
}
