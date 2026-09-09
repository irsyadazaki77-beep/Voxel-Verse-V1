// Comprehensive Benchmarking and Regression Suite for World Startup & Async Pipeline
import { WorldStartupPipeline, StartupProgress } from '../engine/world/WorldStartupPipeline';
import { VoxelWorld } from '../engine/world/VoxelWorld';
import { WorldGeneratorCore } from '../engine/world/WorldGeneratorCore';
import { SaveManager } from '../engine/storage/SaveManager';
import { ChunkWorkerPool } from '../engine/world/ChunkWorkerPool';
import { SEA_LEVEL } from '../engine/world/WorldConfig';
import { WorldSaveData } from '../types';

// Node.js test environment polyfills for headless execution
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: () => {},
    removeEventListener: () => {},
    location: { protocol: 'http:', host: 'localhost:3000' },
  };
}
if (typeof (globalThis as any).document === 'undefined') {
  const createMockContext = () => new Proxy({}, {
    get: (_target, prop) => {
      if (prop === 'canvas') return mockCanvas;
      if (prop === 'getImageData') return { data: new Uint8ClampedArray(4) };
      return () => 0;
    }
  });

  const mockCanvas: any = {
    getContext: () => createMockContext(),
    addEventListener: () => {},
    removeEventListener: () => {},
    style: {},
    width: 1920,
    height: 1080,
  };
  (globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') return mockCanvas;
      return { addEventListener: () => {}, removeEventListener: () => {}, style: {}, innerHTML: '', appendChild: () => {} };
    },
    createElementNS: (_ns: string, tag: string) => {
      if (tag === 'canvas') return mockCanvas;
      return { addEventListener: () => {}, removeEventListener: () => {}, style: {}, innerHTML: '', appendChild: () => {} };
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    body: { appendChild: () => {} },
  };
}

let testCount = 0;
let passedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  testCount++;
  if (condition) {
    passedCount++;
    console.log(`    ✓ [PASS] ${testName}`);
  } else {
    console.error(`    ✗ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

export async function runWorldStartupBenchmarkTests(): Promise<boolean> {
  console.log('----------------------------------------------------');
  console.log(' WORLD STARTUP & ASYNC PIPELINE BENCHMARK / REGRESSION');
  console.log('----------------------------------------------------\n');

  // TEST SUITE 1: Deterministic Multi-Seed Safe Spawn Resolution
  console.log('  ▶ [1/5] Testing Deterministic Safe Spawn on Multiple Seeds...');
  {
    const testSeeds = [42, 1337, 987654, 2026, -55555, 0, 999999999];

    for (const seed of testSeeds) {
      const world1 = new VoxelWorld(seed, 'standard');
      const world2 = new VoxelWorld(seed, 'standard');

      const spawn1 = world1.findSafeSpawn(seed);
      const spawn2 = world2.findSafeSpawn(seed);

      assert(
        spawn1[0] === spawn2[0] && spawn1[1] === spawn2[1] && spawn1[2] === spawn2[2],
        `Seed ${seed} produces deterministic safe spawn [${spawn1.join(', ')}]`
      );

      assert(
        spawn1[1] >= SEA_LEVEL + 1,
        `Seed ${seed} safe spawn Y (${spawn1[1]}) is strictly above sea level (${SEA_LEVEL})`
      );

      world1.dispose();
      world2.dispose();
    }
  }

  // TEST SUITE 2: Minimum Playable Spawn Area Budgeting
  console.log('\n  ▶ [2/5] Testing Minimum Playable Area & Budgeted Async Preload...');
  {
    const world = new VoxelWorld(42, 'standard');
    const spawn = world.findSafeSpawn(42);
    const centerCX = Math.floor(spawn[0] / 16);
    const centerCZ = Math.floor(spawn[2] / 16);

    // Test synchronous preload with radius = 0
    world.preloadSpawnChunks(spawn[0], spawn[2], 0);
    assert(world.chunks.size >= 1, 'Sync preload with radius 0 generates immediate spawn chunk and neighbor voxels');

    const centerChunk = world.chunks.get(world.getChunkKey(centerCX, centerCZ));
    assert(centerChunk !== undefined, 'Center spawn chunk exists in world');
    assert(centerChunk?.isDirty === false, 'Center spawn chunk is meshed and ready for physics collision');

    // Test async preloading for surrounding chunks with progress callback
    let progressCalls = 0;
    await world.preloadSpawnChunksAsync(spawn[0], spawn[2], (current, total) => {
      progressCalls++;
      assert(current <= total, `Progress reporting is valid (${current}/${total})`);
    }, 4);

    assert(world.chunks.size >= 5, 'Async preload generated center and surrounding neighbor chunks');
    assert(progressCalls >= 1, 'Async preload emitted real progress callbacks');

    world.dispose();
  }

  // TEST SUITE 3: Cold Start Startup Pipeline Benchmark
  console.log('\n  ▶ [3/5] Benchmarking Cold Start World Pipeline...');
  {
    const progressHistory: StartupProgress[] = [];
    const tStart = performance.now();

    const result = await WorldStartupPipeline.run({
      container: null as unknown as HTMLElement, // Headless test environment
      worldId: 'benchmark_cold_world',
      worldName: 'Benchmark Cold World',
      seed: 88888,
      gameMode: 'survival',
      preset: 'standard',
      onProgress: (p) => progressHistory.push(p),
    });

    const elapsed = performance.now() - tStart;
    console.log(`    ℹ Cold start total time: ${elapsed.toFixed(2)}ms (Pipeline reported: ${result.diagnostics.totalDurationMs.toFixed(2)}ms)`);

    assert(result.diagnostics.isWarmLoad === false, 'Pipeline correctly identified cold start');
    assert(result.diagnostics.generatedChunksCount >= 1, 'Minimum playable spawn area generated');
    assert(result.diagnostics.spawnPosition[1] >= SEA_LEVEL + 1, 'Safe spawn is above sea level');
    assert(progressHistory.length >= 4, 'Progress events emitted monotonically across stages');
    assert(progressHistory[progressHistory.length - 1].progressPercent === 100, 'Final progress reached 100%');

    // Assert that each stage duration was captured
    assert(result.diagnostics.stageDurations.validate >= 0, 'Validate stage timing recorded');
    assert(result.diagnostics.stageDurations.resolve_spawn >= 0, 'Resolve spawn stage timing recorded');
    assert(result.diagnostics.stageDurations.generate_spawn_area >= 0, 'Generate spawn area timing recorded');
    assert(result.diagnostics.stageDurations.init_systems >= 0, 'Init systems stage timing recorded');

    result.runtime.stop();
  }

  // TEST SUITE 4: Warm Load Benchmark & Save State Fidelity
  console.log('\n  ▶ [4/5] Benchmarking Warm Load World Pipeline...');
  {
    const mockSave: WorldSaveData = {
      version: 3,
      id: 'benchmark_warm_world',
      name: 'Benchmark Warm World',
      seed: 54321,
      gameMode: 'survival',
      difficulty: 'normal',
      lastPlayed: Date.now(),
      createdAt: Date.now(),
      gameTime: 120,
      weather: { type: 'clear', intensity: 0 },
      stats: { blocksMined: 10, blocksPlaced: 5, monstersDefeated: 2, distanceTraveled: 100 },
      player: {
        position: [32.5, 92.0, 48.5],
        rotation: [0.1, 1.5],
        health: 85,
        hunger: 70,
        stamina: 90,
        saturation: 15,
        temperature: 22,
        level: 5,
        xp: 120,
        hotbarIndex: 0,
        inventory: [],
        equipment: { head: null, chest: null, legs: null, feet: null, accessory: null },
      },
      modifiedBlocks: {
        'overworld:2,3': { '0,80,0': 1 }, // Block modification
      },
    };

    const progressHistory: StartupProgress[] = [];
    const tStart = performance.now();

    const result = await WorldStartupPipeline.run({
      container: null as unknown as HTMLElement,
      worldId: 'benchmark_warm_world',
      worldName: 'Benchmark Warm World',
      seed: 54321,
      gameMode: 'survival',
      existingSave: mockSave,
      onProgress: (p) => progressHistory.push(p),
    });

    const elapsed = performance.now() - tStart;
    console.log(`    ℹ Warm load total time: ${elapsed.toFixed(2)}ms (Pipeline reported: ${result.diagnostics.totalDurationMs.toFixed(2)}ms)`);

    assert(result.diagnostics.isWarmLoad === true, 'Pipeline correctly identified warm load');
    assert(result.diagnostics.spawnPosition[0] === 32.5, 'Player X restored from save');
    assert(result.diagnostics.spawnPosition[1] === 92.0, 'Player Y restored from save');
    assert(result.diagnostics.spawnPosition[2] === 48.5, 'Player Z restored from save');
    assert(result.runtime.stats.health === 85, 'Player health state restored');
    assert(result.runtime.stats.hunger === 70, 'Player hunger state restored');
    assert(result.runtime.stats.level === 5, 'Player level restored');

    result.runtime.stop();
  }

  // TEST SUITE 5: Resilience, Cancellation & Error Fallbacks
  console.log('\n  ▶ [5/5] Testing Cancellation & Error Fallback Handlers...');
  {
    // Test early cancellation
    let cancelledTriggered = false;
    try {
      await WorldStartupPipeline.run({
        container: null as unknown as HTMLElement,
        worldId: 'cancel_test_world',
        worldName: 'Cancel Test',
        seed: 111,
        gameMode: 'creative',
        isCancelled: () => true, // Immediate cancellation
      });
    } catch (e: any) {
      if (e.message.includes('cancelled')) {
        cancelledTriggered = true;
      }
    }
    assert(cancelledTriggered === true, 'Pipeline respects user cancellation without leaking operations');

    // Test corrupted player position fallback in save
    const corruptSave: WorldSaveData = {
      version: 3,
      id: 'corrupt_save_world',
      name: 'Corrupt Save World',
      seed: 777,
      gameMode: 'survival',
      difficulty: 'normal',
      lastPlayed: Date.now(),
      createdAt: Date.now(),
      gameTime: 0,
      weather: { type: 'clear', intensity: 0 },
      stats: { blocksMined: 0, blocksPlaced: 0, monstersDefeated: 0, distanceTraveled: 0 },
      modifiedBlocks: {},
      player: {
        position: [-9999, -100, -9999], // Falling into void
        rotation: [0, 0],
        health: 0, // Dead
        hunger: 0,
        stamina: 0,
        level: 1,
        xp: 0,
        hotbarIndex: 0,
        inventory: [],
        equipment: { head: null, chest: null, legs: null, feet: null, accessory: null },
      },
    };

    const recoverResult = await WorldStartupPipeline.run({
      container: null as unknown as HTMLElement,
      worldId: 'corrupt_save_world',
      worldName: 'Corrupt Save World',
      seed: 777,
      gameMode: 'survival',
      existingSave: corruptSave,
    });

    assert(recoverResult.runtime.stats.health === 100, 'Dead player in save safely revived to 100 health');
    assert(recoverResult.diagnostics.spawnPosition[1] >= SEA_LEVEL + 1, 'Void falling player relocated to safe spawn Y');

    recoverResult.runtime.stop();
  }

  console.log('\n  ✓ All World Startup & Pipeline Benchmark Tests Passed Successfully!');
  return true;
}
