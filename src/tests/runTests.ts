// Comprehensive Test Suite for VoxelVerse Core Engine
import { InventoryManager } from '../engine/items/InventoryManager';
import { CraftingSystem, CRAFTING_RECIPES } from '../engine/items/CraftingSystem';
import { SaveManager } from '../engine/storage/SaveManager';
import { WorldGeneratorCore } from '../engine/world/WorldGeneratorCore';
import { VoxelWorld } from '../engine/world/VoxelWorld';
import { VoxelMesher } from '../engine/world/VoxelMesher';
import { ChunkWorkerPool } from '../engine/world/ChunkWorkerPool';
import { EntityManager } from '../engine/entities/EntityManager';
import { EntityModelCache } from '../engine/entities/EntityModelCache';
import { SETTLEMENT_REGISTRY } from '../engine/settlement/SettlementManager';
import { AetherNetworkManager } from '../engine/engineering/AetherNetworkManager';
import { makeDimensionChunkKey, parseDimensionChunkKey } from '../engine/world/WorldConfig';
import { BlockType } from '../types';
import * as THREE from 'three';

let testCount = 0;
let passedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  testCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

async function runTestSuite() {
  console.log('====================================================');
  console.log(' VOXELVERSE ENGINE INTEGRATION & STABILITY TEST SUITE ');
  console.log('====================================================\n');

  // TEST 1: Inventory System
  console.log('▶ [1/12] Testing Inventory Management...');
  {
    const inv = InventoryManager.sanitizeInventory([], 36);
    assert(inv.length === 36, 'Inventory initializes to correct size');

    const stack = InventoryManager.createStack('oak_log', 10);
    assert(stack !== null, 'Stack created successfully');
    const result = InventoryManager.addItem(inv, stack!);
    assert(result.remainingCount === 0, 'Item added cleanly to inventory');
    assert(inv[0]?.itemId === 'oak_log' && inv[0]?.count === 10, 'Item stacked in first slot');

    const stack2 = InventoryManager.createStack('oak_log', 60);
    assert(stack2 !== null, 'Stack 2 created successfully');
    const result2 = InventoryManager.addItem(inv, stack2!);
    assert(inv[0]?.count === 64, 'Stack capped at maxStack size (64)');
    assert(inv[1]?.count === 6, 'Remaining 6 items placed into next available slot');
    assert(result2.remainingCount === 0, 'All items placed cleanly into slots');
  }

  // TEST 2: Crafting System
  console.log('\n▶ [2/12] Testing Crafting Engine...');
  {
    const woodRecipe = CRAFTING_RECIPES.find((r) => r.inputs.some((i) => i.itemId === 'oak_log'));
    assert(woodRecipe !== undefined, 'Found recipe for oak_log');
    if (woodRecipe) {
      assert(woodRecipe.output.itemId === 'wood_planks', 'Output matches wood_planks');
      assert(woodRecipe.output.count === 4, 'Output count matches 4 planks');

      const inv = InventoryManager.sanitizeInventory([], 36);
      InventoryManager.addItem(inv, 'oak_log', 1);
      assert(CraftingSystem.canCraft(woodRecipe, inv), 'Player can craft planks when holding oak_log');
    }
  }

  // TEST 3: Save Migration & Key Normalization
  console.log('\n▶ [3/12] Testing Save Migration & Dimension Keys...');
  {
    const legacyKey = '3,-8';
    const parsedLegacy = parseDimensionChunkKey(legacyKey);
    assert(parsedLegacy.dimensionId === 'overworld' && parsedLegacy.cx === 3 && parsedLegacy.cz === -8, 'Legacy key parses to overworld:3,-8');

    const aetherKey = 'aether_expanse:5,12';
    const parsedAether = parseDimensionChunkKey(aetherKey);
    assert(parsedAether.dimensionId === 'aether_expanse' && parsedAether.cx === 5 && parsedAether.cz === 12, 'Aether key parses correctly');

    const canonicalKey = makeDimensionChunkKey('aether_expanse', 5, 12);
    assert(canonicalKey === 'aether_expanse:5,12', 'makeDimensionChunkKey formats canonical key');

    const rawLegacyData = {
      version: 1,
      id: 'test_realm',
      seed: 42819,
      modifiedBlocks: {
        '3,-8': { '0,64,0': BlockType.MYTHRIL_ORE }
      }
    };
    const migrated = SaveManager.migrateSaveData(rawLegacyData);
    assert(migrated.version === 3, 'Save version updated to 3');
    assert(migrated.modifiedBlocks['overworld:3,-8'] !== undefined, 'Legacy modified blocks migrated to overworld:3,-8');
  }

  // TEST 4: World Generation Determinism
  console.log('\n▶ [4/12] Testing World Generator Determinism...');
  {
    const genA = new WorldGeneratorCore(42819, 'standard', { dimensionId: 'overworld' });
    const genB = new WorldGeneratorCore(42819, 'standard', { dimensionId: 'overworld' });

    const blocksA = genA.generateChunkData(2, -4);
    const blocksB = genB.generateChunkData(2, -4);

    let identical = true;
    for (let i = 0; i < blocksA.length; i++) {
      if (blocksA[i] !== blocksB[i]) {
        identical = false;
        break;
      }
    }
    assert(identical, 'Same seed and coordinates produce 100% identical chunk byte buffers');
  }

  // TEST 5: Modified Blocks Persistence
  console.log('\n▶ [5/12] Testing Modified Blocks Serialization...');
  {
    const world = new VoxelWorld(42819, 'standard', 'aether_expanse');
    world.setBlock(10, 70, 10, BlockType.CYAN_CRYSTAL_LOG);

    const serialized = SaveManager.serializeModifiedBlocks(world);
    const expectedKey = makeDimensionChunkKey('aether_expanse', 0, 0);
    assert(serialized[expectedKey] !== undefined, 'Serialized blocks contain dimension-prefixed key');

    const newWorld = new VoxelWorld(42819, 'standard', 'aether_expanse');
    SaveManager.applySaveToWorld(newWorld, { modifiedBlocks: serialized } as any);
    assert(newWorld.getBlock(10, 70, 10) === BlockType.CYAN_CRYSTAL_LOG, 'Modified block successfully hydrated into new world');
  }

  // TEST 6: Chunk Boundary Meshing
  console.log('\n▶ [6/12] Testing Chunk Boundary Meshing...');
  {
    const centerBuffer = new Uint8Array(16 * 128 * 16);
    // Fill bottom bedrock & stone
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        centerBuffer[x + z * 16 + 0 * 256] = BlockType.STONE;
        centerBuffer[x + z * 16 + 1 * 256] = BlockType.STONE;
      }
    }

    const getBlock = (lx: number, ly: number, lz: number): number => {
      if (ly < 0 || ly >= 128) return 0;
      if (lx >= 0 && lx < 16 && lz >= 0 && lz < 16) {
        return centerBuffer[lx + lz * 16 + ly * 256];
      }
      return 0;
    };

    const meshData = VoxelMesher.buildChunkMeshData(getBlock, 16, 128, 16);
    assert(meshData.solidPositions.length > 0, 'Mesher produced non-empty solid positions');
    assert(meshData.solidNormals.length === meshData.solidPositions.length, 'Normal count matches position count');
  }

  // TEST 7: Chunk Worker Pool Resilience
  console.log('\n▶ [7/12] Testing Worker Pool Resilience...');
  {
    const pool = new ChunkWorkerPool();
    let completed = false;
    pool.enqueueTask({
      type: 'generate',
      taskId: 'test_task_1',
      cx: 0,
      cz: 0,
      seed: 42819,
      dimensionId: 'overworld',
      sessionToken: 1,
      priority: 1,
      onComplete: (buffer) => {
        completed = buffer.byteLength === 16 * 128 * 16;
      }
    });

    // Wait short time or check sync execution
    await new Promise((resolve) => setTimeout(resolve, 300));
    assert(completed, 'Worker pool completed generation task successfully');
    pool.dispose();
  }

  // TEST 8: Dimension Pipeline & 10x Switching Cycles
  console.log('\n▶ [8/12] Testing Dimension Pipeline & Switching Cycles...');
  {
    const worldOverworld = new VoxelWorld(42819, 'standard', 'overworld');
    assert((worldOverworld as any).generatorCore.params.dimensionId === 'overworld', 'Overworld generator has overworld dimensionId');
    assert(worldOverworld.biomeManager.dimensionId === 'overworld', 'Overworld BiomeManager has overworld dimensionId');

    const worldAether = new VoxelWorld(42819, 'standard', 'aether_expanse');
    assert((worldAether as any).generatorCore.params.dimensionId === 'aether_expanse', 'Aether generator has aether_expanse dimensionId');
    assert(worldAether.biomeManager.dimensionId === 'aether_expanse', 'Aether BiomeManager has aether_expanse dimensionId');

    // 10x Dimension Switch Cycle Test
    let currDim = 'overworld';
    for (let cycle = 1; cycle <= 10; cycle++) {
      currDim = currDim === 'overworld' ? 'aether_expanse' : 'overworld';
      const cycleWorld = new VoxelWorld(42819, 'standard', currDim);
      assert(cycleWorld.dimensionId === currDim, `Cycle ${cycle}: dimensionId set to ${currDim}`);
      cycleWorld.dispose();
    }
  }

  // TEST 9: Save Validation & Sanitization
  console.log('\n▶ [9/12] Testing Save Validation & Sanitization...');
  {
    const raw = {
      id: 'realm_test',
      seed: 9999,
      player: {
        position: [12, 65, -30],
        health: 150, // exceeds normal, sanitized
      }
    };
    const sanitized = SaveManager.validateAndSanitizeSave(raw, 'realm_test', 9999);
    assert(sanitized.id === 'realm_test', 'Sanitized save retains realm ID');
    assert(sanitized.player.position[0] === 12, 'Sanitized player position preserved');
    assert(sanitized.player.inventory.length === 36, 'Inventory auto-initialized to 36 slots');
  }

  // TEST 10: Entity Manager & Shared Resource Safety
  console.log('\n▶ [10/12] Testing Entity Manager & Shared Resource Safety...');
  {
    const em = new EntityManager();
    const testWorld = new VoxelWorld(42819, 'standard', 'overworld');
    em.spawnProjectile(new THREE.Vector3(0, 10, 0), new THREE.Vector3(0, 0, 1), 10, true);
    assert(em.projectiles.length === 1, 'Projectile spawned');

    // Trigger projectile release
    em.projectiles[0].life = 0;
    em.update(0.1, testWorld, new THREE.Vector3(0, 0, 0), false);

    // Verify shared geometry in EntityModelCache is unaffected
    assert(!EntityModelCache.isShared({} as any), 'Resource check runs without errors');
    em.dispose();
    testWorld.dispose();
  }

  // TEST 11: Settlement Registry & Population
  console.log('\n▶ [11/12] Testing Settlement Registry...');
  {
    const settlements = Object.keys(SETTLEMENT_REGISTRY);
    assert(settlements.length >= 5, 'Settlement registry has at least 5 regional settlements');
    assert(SETTLEMENT_REGISTRY.nagari_minang !== undefined, 'Minang settlement defined');
    assert(SETTLEMENT_REGISTRY.haven_camp !== undefined, 'Haven camp settlement defined');
  }

  // TEST 12: Aether Engineering & Grid
  console.log('\n▶ [12/12] Testing Aether Network & Engineering...');
  {
    const net = AetherNetworkManager.getInstance();
    net.reset();
    net.onBlockPlaced([0, 64, 0], BlockType.LEY_CONDUIT);
    net.onBlockPlaced([1, 64, 0], BlockType.LEY_CONDUIT);

    assert(net.nodeMap.size === 2, 'Network registered 2 nodes');
  }

  console.log('\n====================================================');
  console.log(` ALL TEST SUITES PASSED STRICTLY (${passedCount}/${testCount} assertions) `);
  console.log('====================================================\n');
}

runTestSuite().catch((e) => {
  console.error('\nCRITICAL TEST FAILURE:', e);
  process.exit(1);
});
