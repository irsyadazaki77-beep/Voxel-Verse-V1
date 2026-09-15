// Phase 2: Pure World Query & Surface Heightmap Overhaul Test Suite
import * as THREE from 'three';
import { VoxelWorld } from '../engine/world/VoxelWorld';
import { BlockType } from '../types';
import { BlockShapeResolver } from '../engine/world/BlockShapeResolver';
import { Pathfinder } from '../engine/ai/Pathfinder';
import { EntityManager } from '../engine/entities/EntityManager';
import { WorldPreset } from '../engine/world/WorldConfig';

let testCount = 0;
let passedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  testCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
    throw new Error(`Phase 2 test failed: ${testName}`);
  }
}

export async function runPhase2PureQueryTests(): Promise<boolean> {
  console.log('----------------------------------------------------');
  console.log(' PHASE 2: PURE WORLD QUERY & HEIGHTMAP OVERHAUL TEST ');
  console.log('----------------------------------------------------\n');

  testCount = 0;
  passedCount = 0;

  // 1. QUERY PURITY TEST
  console.log('▶ [1/5] Testing Query Purity (Zero Implicit Chunk Generation)...');
  {
    VoxelWorld.implicitChunkGenerationCount = 0;
    const world = new VoxelWorld(42819, 'standard', 'overworld');
    world.resetProfilerCounters();

    // Ensure spawn chunk (0,0) is loaded explicitly
    world.ensureChunkLoaded(0, 0);
    const initialSize = world.chunks.size;
    assert(initialSize === 1, 'Chunk (0,0) explicitly loaded');

    // Query far unloaded coordinate (500, 64, 500)
    const blockIfLoaded = world.getBlockIfLoaded(500, 64, 500);
    assert(blockIfLoaded === null, 'getBlockIfLoaded returns null for unloaded chunk');

    const stateIfLoaded = world.getBlockStateIfLoaded(500, 64, 500);
    assert(stateIfLoaded === null, 'getBlockStateIfLoaded returns null for unloaded chunk');

    const blockVal = world.getBlock(500, 64, 500);
    assert(blockVal === BlockType.AIR, 'getBlock returns BlockType.AIR for unloaded chunk');

    const stateVal = world.getBlockState(500, 64, 500);
    assert(stateVal.blockType === BlockType.AIR, 'getBlockState returns AIR state for unloaded chunk');

    // Raycast towards far unloaded chunks
    const rayHit = world.raycast(new THREE.Vector3(8, 65, 8), new THREE.Vector3(1, 0, 0), 300);
    assert(rayHit === null, 'Raycast returns null without generating unloaded chunks');

    // Pathfinding across unloaded chunks
    const path = Pathfinder.findPath(world, new THREE.Vector3(8, 65, 8), new THREE.Vector3(200, 65, 200), 200);
    assert(path === null, 'Pathfinder returns null without generating unloaded chunks');

    assert(world.chunks.size === initialSize, 'world.chunks.size remains unchanged after queries');
    assert(VoxelWorld.implicitChunkGenerationCount === 0, 'VoxelWorld.implicitChunkGenerationCount is 0');
    assert(world.profiler.implicitChunkGenerations === 0, 'profiler.implicitChunkGenerations is 0');

    world.dispose();
  }

  // 2. HEIGHTMAP ACCURACY TEST
  console.log('\n▶ [2/5] Testing O(1) Heightmap Accuracy Across Seeds & Presets...');
  {
    const seeds = [42819, 12345, 99999];
    const presets: WorldPreset[] = ['standard', 'mountainous', 'flattish'];

    for (const seed of seeds) {
      for (const preset of presets) {
        const world = new VoxelWorld(seed, preset, 'overworld');
        const chunk = world.ensureChunkLoaded(0, 0);

        let heightmapMatchCount = 0;

        for (let lx = 0; lx < 16; lx++) {
          for (let lz = 0; lz < 16; lz++) {
            const hmapY = chunk.surfaceHeightMap[lx + lz * 16];

            // Manual scan down from 127
            let manualY = 0;
            for (let y = 127; y >= 0; y--) {
              const b = chunk.getBlock(lx, y, lz);
              const st = chunk.getBlockState(lx, y, lz);
              if (b !== BlockType.AIR && BlockShapeResolver.isSolidForCollision(b, st)) {
                manualY = y;
                break;
              }
            }

            if (hmapY === manualY) {
              heightmapMatchCount++;
            }
          }
        }

        assert(
          heightmapMatchCount === 256,
          `Heightmap 100% matches manual scan for seed ${seed}, preset ${preset} (256/256 columns)`
        );

        world.dispose();
      }
    }
  }

  // 3. BLOCK EDIT HEIGHTMAP CONSISTENCY TEST
  console.log('\n▶ [3/5] Testing Heightmap Incremental Updates on Block Edits...');
  {
    const world = new VoxelWorld(42819, 'standard', 'overworld');
    const chunk = world.ensureChunkLoaded(0, 0);

    const lx = 5;
    const lz = 5;
    const initialSurfaceY = chunk.surfaceHeightMap[lx + lz * 16];

    // Place solid block 5 blocks above current surface
    const editY = initialSurfaceY + 5;
    world.setBlock(lx, editY, lz, BlockType.STONE);
    assert(chunk.surfaceHeightMap[lx + lz * 16] === editY, 'Heightmap updated upward to new solid block height');

    // Break the block
    world.setBlock(lx, editY, lz, BlockType.AIR);
    assert(chunk.surfaceHeightMap[lx + lz * 16] === initialSurfaceY, 'Heightmap re-scanned downward back to original height');

    // Special block cases:
    // 1. Water (non-solid for surface collision heightmap)
    world.setBlock(lx, initialSurfaceY + 2, lz, BlockType.WATER);
    assert(chunk.surfaceHeightMap[lx + lz * 16] === initialSurfaceY, 'Water does not raise solid heightmap');
    world.setBlock(lx, initialSurfaceY + 2, lz, BlockType.AIR);

    // 2. Sapling / Vegetation (non-solid)
    world.setBlock(lx, initialSurfaceY + 2, lz, BlockType.TALL_GRASS);
    assert(chunk.surfaceHeightMap[lx + lz * 16] === initialSurfaceY, 'Tall grass does not raise solid heightmap');
    world.setBlock(lx, initialSurfaceY + 2, lz, BlockType.AIR);

    // 3. Slab (solid)
    world.setBlock(lx, initialSurfaceY + 2, lz, BlockType.STONE_SLAB);
    assert(chunk.surfaceHeightMap[lx + lz * 16] === initialSurfaceY + 2, 'Stone slab raises solid heightmap');
    world.setBlock(lx, initialSurfaceY + 2, lz, BlockType.AIR);

    // 4. Fence (solid)
    world.setBlock(lx, initialSurfaceY + 2, lz, BlockType.FENCE_WOOD);
    assert(chunk.surfaceHeightMap[lx + lz * 16] === initialSurfaceY + 2, 'Wood fence raises solid heightmap');
    world.setBlock(lx, initialSurfaceY + 2, lz, BlockType.AIR);

    world.dispose();
  }

  // 4. CHUNK BOUNDARY QUERY TEST
  console.log('\n▶ [4/5] Testing Chunk Boundary Queries...');
  {
    const world = new VoxelWorld(42819, 'standard', 'overworld');
    world.ensureChunkLoaded(0, 0);

    assert(world.chunks.size === 1, 'Only chunk (0,0) is loaded');

    // Boundary queries across x=15 and x=16
    const inside = world.getBlockIfLoaded(15, 64, 15);
    assert(inside !== null, 'x=15 inside loaded chunk returns block type');

    const outside = world.getBlockIfLoaded(16, 64, 15);
    assert(outside === null, 'x=16 outside loaded chunk returns null');

    const outsideZ = world.getBlockIfLoaded(15, 64, 16);
    assert(outsideZ === null, 'z=16 outside loaded chunk returns null');

    assert(world.chunks.size === 1, 'Chunk boundary queries triggered zero chunk generations');

    world.dispose();
  }

  // 5. STRESS BENCHMARK TEST
  console.log('\n▶ [5/5] Testing Entity Stress Benchmark & Profiler Metrics...');
  {
    const entityCounts = [20, 50, 100];

    for (const count of entityCounts) {
      VoxelWorld.implicitChunkGenerationCount = 0;
      const world = new VoxelWorld(42819, 'standard', 'overworld');
      world.resetProfilerCounters();

      // Load 3x3 chunks around origin
      for (let cx = -1; cx <= 1; cx++) {
        for (let cz = -1; cz <= 1; cz++) {
          world.ensureChunkLoaded(cx, cz);
        }
      }

      const em = new EntityManager();
      const playerPos = new THREE.Vector3(0, world.getSpawnHeight(0, 0), 0);

      // Spawn entities
      for (let i = 0; i < count; i++) {
        const rx = (Math.random() - 0.5) * 20;
        const rz = (Math.random() - 0.5) * 20;
        const ry = world.getSpawnHeight(rx, rz);
        const type = i % 2 === 0 ? 'passive' : 'hostile';
        em.spawnEntity({
          id: `test_entity_${count}_${i}`,
          name: `Test Entity ${i}`,
          type: type as any,
          modelType: type === 'hostile' ? 'zombie' : 'cow',
          position: [rx, ry, rz],
          rotation: 0,
          velocity: [0, 0, 0],
          health: 100,
          maxHealth: 100,
          damage: 5,
          speed: 2.0,
          aiState: 'idle',
          drops: [],
        });
      }

      const startTime = performance.now();
      const ticks = 60;
      for (let t = 0; t < ticks; t++) {
        em.update(0.016, world, playerPos, false);
      }
      const totalCpuTimeMs = performance.now() - startTime;
      const avgTickMs = totalCpuTimeMs / ticks;

      assert(avgTickMs < 5.0, `${count} entities avg tick CPU time ${avgTickMs.toFixed(2)}ms (< 5.0ms)`);
      assert(VoxelWorld.implicitChunkGenerationCount === 0, `${count} entities simulation caused 0 implicit chunk generations`);
      assert(world.profiler.surfaceHeightQueries > 0, `${count} entities executed ${world.profiler.surfaceHeightQueries} O(1) heightmap lookups`);

      em.dispose();
      world.dispose();
    }
  }

  console.log('\n====================================================');
  console.log(` PHASE 2 PURE QUERY & HEIGHTMAP TESTS PASSED (${passedCount}/${testCount}) `);
  console.log('====================================================\n');

  return passedCount === testCount;
}
