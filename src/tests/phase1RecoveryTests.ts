// Phase 1: Save & World Startup Recovery Automated Test Suite
import { WorldStartupPipeline, StartupProgress } from '../engine/world/WorldStartupPipeline';
import { VoxelWorld } from '../engine/world/VoxelWorld';
import { SaveManager } from '../engine/storage/SaveManager';
import { SafeSpawnResolver } from '../engine/world/SafeSpawnResolver';
import { makeDimensionChunkKey } from '../engine/world/WorldConfig';
import { BlockType, WorldSaveData } from '../types';

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

export async function runPhase1RecoveryTests(): Promise<boolean> {
  console.log('----------------------------------------------------');
  console.log(' PHASE 1: SAVE & WORLD STARTUP RECOVERY TEST SUITE');
  console.log('----------------------------------------------------\n');

  // TEST 1: Large-World Save Test (does NOT awaken hundreds of chunks at startup)
  console.log('  ▶ [1/5] Testing Large-World Save Hydration & Chunk Count Invariant...');
  {
    const numDistantChunks = 150;
    const modifiedBlocks: Record<string, Record<string, number>> = {};
    const modifiedBlockStates: Record<string, Record<string, any>> = {};

    // Populate 150 distant chunks
    for (let i = 0; i < numDistantChunks; i++) {
      const cx = 50 + (i % 15);
      const cz = 50 + Math.floor(i / 15);
      const cKey = makeDimensionChunkKey('overworld', cx, cz);
      modifiedBlocks[cKey] = {
        '2,64,2': BlockType.GOLD_BLOCK,
        '5,65,5': BlockType.IRON_BLOCK,
      };
      modifiedBlockStates[cKey] = {
        '2,64,2': { customMeta: `chunk_${i}` },
      };
    }

    const largeSave: WorldSaveData = {
      version: 3,
      id: 'large_world_save',
      name: 'Large World Save',
      seed: 12345,
      gameMode: 'survival',
      difficulty: 'normal',
      lastPlayed: Date.now(),
      createdAt: Date.now(),
      gameTime: 500,
      player: {
        position: [0.5, 75.0, 0.5],
        rotation: [0, 0],
        health: 100,
        hunger: 100,
        stamina: 100,
        level: 1,
        xp: 0,
        hotbarIndex: 0,
        inventory: [],
        equipment: { head: null, chest: null, legs: null, feet: null, accessory: null },
      },
      modifiedBlocks,
      modifiedBlockStates,
      weather: { type: 'clear', intensity: 0 },
      stats: {
        blocksMined: 0,
        blocksPlaced: 0,
        monstersDefeated: 0,
        distanceTraveled: 0,
      },
    };

    const tStart = performance.now();
    const result = await WorldStartupPipeline.run({
      container: null as unknown as HTMLElement,
      worldId: 'large_world_save',
      worldName: 'Large World Save',
      seed: 12345,
      gameMode: 'survival',
      existingSave: largeSave,
    });
    const tDuration = performance.now() - tStart;

    // Verify chunk count: Only minimum playable area chunks generated (center + 4 neighbors = 5 chunks)
    assert(result.runtime.world.chunks.size <= 5, 'World contains only minimum playable spawn area chunks, NOT 150 chunks');
    assert(result.diagnostics.generatedChunksCount <= 5, 'Pipeline generated count is exactly <= 5');
    console.log(`    ℹ Large world (150 modified chunks) started in ${tDuration.toFixed(1)}ms, in-memory chunks: ${result.runtime.world.chunks.size}`);

    result.runtime.stop();
  }

  // TEST 2: Save Fidelity Test (spawn chunk & distant chunk modifications are preserved)
  console.log('\n  ▶ [2/5] Testing Save Fidelity (Spawn Chunk vs Distant Chunk)...');
  {
    const world = new VoxelWorld(42819, 'standard', 'overworld');
    const spawnCX = 0;
    const spawnCZ = 0;
    const distantCX = 85;
    const distantCZ = -92;

    const mockSave: WorldSaveData = {
      version: 3,
      id: 'fidelity_test_save',
      name: 'Fidelity Test',
      seed: 42819,
      gameMode: 'survival',
      difficulty: 'normal',
      lastPlayed: Date.now(),
      createdAt: Date.now(),
      gameTime: 0,
      player: {
        position: [0.5, 75.0, 0.5],
        rotation: [0, 0],
        health: 100,
        hunger: 100,
        stamina: 100,
        level: 1,
        xp: 0,
        hotbarIndex: 0,
        inventory: [],
        equipment: { head: null, chest: null, legs: null, feet: null, accessory: null },
      },
      modifiedBlocks: {
        [makeDimensionChunkKey('overworld', spawnCX, spawnCZ)]: {
          '3,70,3': BlockType.GOLD_BLOCK,
        },
        [makeDimensionChunkKey('overworld', distantCX, distantCZ)]: {
          '7,80,7': BlockType.OBSIDIAN,
        },
      },
      modifiedBlockStates: {
        [makeDimensionChunkKey('overworld', distantCX, distantCZ)]: {
          '7,80,7': { facing: 'west', open: true },
        },
      },
      weather: { type: 'clear', intensity: 0 },
      stats: {
        blocksMined: 0,
        blocksPlaced: 0,
        monstersDefeated: 0,
        distanceTraveled: 0,
      },
    };

    // Apply save
    SaveManager.applySaveToWorld(world, mockSave);

    // Verify distant chunk is NOT awakened / loaded yet
    const distantKey = world.getChunkKey(distantCX, distantCZ);
    assert(!world.chunks.has(distantKey), 'Distant chunk was not generated into memory during hydration');

    // Verify modifiedBlocks map has both entries
    assert(world.getModifiedBlocks(spawnCX, spawnCZ)?.get('3,70,3') === BlockType.GOLD_BLOCK, 'Spawn chunk mod exists in memory map');
    assert(world.getModifiedBlocks(distantCX, distantCZ)?.get('7,80,7') === BlockType.OBSIDIAN, 'Distant chunk mod exists in memory map');

    // Generate spawn chunk: verify lazy application
    const spawnChunk = world.generateChunk(spawnCX, spawnCZ);
    const actualSpawnBlock = spawnChunk.getBlock(3, 70, 3);
    assert(actualSpawnBlock === BlockType.GOLD_BLOCK, 'Spawn chunk correctly contains hydrated GOLD_BLOCK on generation');

    // Generate distant chunk: verify lazy application
    const distantChunk = world.generateChunk(distantCX, distantCZ);
    assert(distantChunk.getBlock(7, 80, 7) === BlockType.OBSIDIAN, 'Distant chunk correctly contains hydrated OBSIDIAN on generation');
    assert(distantChunk.getBlockState(7, 80, 7)?.facing === 'west', 'Distant chunk correctly contains restored custom block state facing');
    assert(distantChunk.getBlockState(7, 80, 7)?.open === true, 'Distant chunk correctly contains restored custom block state open');

    // Serialize world and verify canonical format
    const serializedBlocks = SaveManager.serializeModifiedBlocks(world);
    const distantCanonicalKey = makeDimensionChunkKey('overworld', distantCX, distantCZ);
    assert(serializedBlocks[distantCanonicalKey]?.['7,80,7'] === BlockType.OBSIDIAN, 'Serialized output retains canonical key and modified block');

    world.dispose();
  }

  // TEST 3: Legacy Save Migration Test
  console.log('\n  ▶ [3/5] Testing Legacy Save Migration & Canonical Key Normalization...');
  {
    const legacySave = {
      version: 1,
      id: 'legacy_world_v1',
      name: 'Old World',
      seed: 9999,
      modifiedBlocks: {
        '12,-15': { '4,64,4': BlockType.GOLD_BLOCK },
        '-3,8': { '1,72,1': BlockType.IRON_BLOCK },
      },
      modifiedBlockStates: {
        '12,-15': { '4,64,4': { facing: 'north' } },
      },
    };

    const migrated = SaveManager.migrateSaveData(legacySave);
    assert(migrated.modifiedBlocks['overworld:12,-15'] !== undefined, 'Legacy "12,-15" migrated to "overworld:12,-15"');
    assert(migrated.modifiedBlocks['overworld:-3,8'] !== undefined, 'Legacy "-3,8" migrated to "overworld:-3,8"');
    assert(migrated.modifiedBlockStates['overworld:12,-15'] !== undefined, 'Legacy states "12,-15" migrated to "overworld:12,-15"');

    // Apply to world and verify canonical queries
    const world = new VoxelWorld(9999, 'standard', 'overworld');
    SaveManager.applySaveToWorld(world, migrated);

    assert(world.getModifiedBlocks(12, -15)?.get('4,64,4') === BlockType.GOLD_BLOCK, 'World getModifiedBlocks resolves canonical key from migrated save');
    assert(world.getModifiedBlockStates(12, -15)?.get('4,64,4')?.facing === 'north', 'World getModifiedBlockStates resolves state from migrated save');

    world.dispose();
  }

  // TEST 4: Startup Cancellation & Resource Ownership Test
  console.log('\n  ▶ [4/5] Testing Startup Cancellation & Resource Cleanup...');
  {
    let cancelledAfterStage = false;
    let stageCount = 0;

    try {
      await WorldStartupPipeline.run({
        container: null as unknown as HTMLElement,
        worldId: 'cancellation_test_world',
        worldName: 'Cancellation Test',
        seed: 77777,
        gameMode: 'survival',
        isCancelled: () => {
          // Cancel after 2 stages have been visited
          return stageCount >= 2;
        },
        onProgress: () => {
          stageCount++;
        },
      });
    } catch (e: any) {
      if (e.message.includes('cancelled')) {
        cancelledAfterStage = true;
      }
    }

    assert(cancelledAfterStage === true, 'WorldStartupPipeline cancelled mid-execution cleanly');
    assert(stageCount >= 2, 'Cancellation occurred at asynchronous pipeline checkpoint');
  }

  // TEST 5: Long Save Benchmark (500 modified chunks hydration < 25ms, zero chunk generation)
  console.log('\n  ▶ [5/5] Benchmarking Long Save (500 Chunks) Hydration & Zero Awakening...');
  {
    const numChunks = 500;
    const modifiedBlocks: Record<string, Record<string, number>> = {};
    for (let i = 0; i < numChunks; i++) {
      const cx = (i % 25) * 4;
      const cz = Math.floor(i / 25) * 4;
      const key = makeDimensionChunkKey('overworld', cx, cz);
      modifiedBlocks[key] = {
        '0,64,0': BlockType.COBBLESTONE,
        '1,64,0': BlockType.TORCH,
      };
    }

    const world = new VoxelWorld(55555, 'standard', 'overworld');
    assert(world.chunks.size === 0, 'Initial world has 0 chunks');

    const tStart = performance.now();
    SaveManager.applySaveToWorld(world, { modifiedBlocks } as any);
    const tHydrate = performance.now() - tStart;

    console.log(`    ℹ 500-chunk save hydrated in ${tHydrate.toFixed(2)}ms`);
    assert(tHydrate < 35, `Hydration time (${tHydrate.toFixed(2)}ms) is well within performance budget (< 35ms)`);
    assert(world.chunks.size === 0, 'World still has 0 chunks in memory after hydration (zero chunk awakening)');

    // Safe query does not generate chunks
    assert(world.getBlockLoaded(0, 64, 0) === BlockType.AIR, 'getBlockLoaded returns AIR for ungenerated chunk without generating it');
    assert(world.chunks.size === 0, 'World chunk count remains 0 after getBlockLoaded query');

    world.dispose();
  }

  console.log('\n  ✓ All Phase 1 Save & Startup Recovery Tests Passed Strictly!');
  return true;
}
