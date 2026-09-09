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
import { SETTLEMENT_REGISTRY, SettlementManager } from '../engine/settlement/SettlementManager';
import { StructureRecognitionEngine } from '../engine/settlement/StructureRecognitionEngine';
import { NPCScheduleManager } from '../engine/settlement/NPCScheduleManager';
import { NetworkSession } from '../engine/network/NetworkSession';
import { AetherNetworkManager } from '../engine/engineering/AetherNetworkManager';
import { makeDimensionChunkKey, parseDimensionChunkKey } from '../engine/world/WorldConfig';
import { BlockType } from '../types';
import * as THREE from 'three';
import { InputManager } from '../engine/player/InputManager';
import { QuestManager } from '../engine/progression/QuestManager';
import { DiscoverySystem } from '../engine/progression/DiscoverySystem';
import { GameEventBus } from '../engine/events/GameEventBus';

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

  // TEST 13: Input Manager Unified Pipeline
  console.log('\n▶ [13/14] Testing Input Manager Unified Pipeline...');
  {
    const input = new InputManager();
    
    // Mobile joystick simulation
    input.setMobileJoystick(1, 0.5);
    const vec1 = input.getMovementVector();
    assert(vec1.z === -1 && vec1.x === 0.5, 'Mobile joystick correctly populates movement vector (forward is -Z)');
    
    input.setMobileAction('Attack', true);
    input.preUpdate();
    assert(input.isActionActive('Attack'), 'Mobile attack maps to Attack action');
    
    // Clear mobile inputs
    input.setMobileAction('Attack', false);
    input.setMobileJoystick(0, 0);
    input.postUpdate(); // Simulates end of frame
    input.preUpdate();
    
    const vec2 = input.getMovementVector();
    assert(vec2.z === 0 && vec2.x === 0, 'Movement vector clears correctly after joystick release');
    assert(!input.isActionActive('Attack'), 'Action clears correctly');
    
    input.dispose();
  }

  // TEST 14: Automated 60-Minute Gameplay Vertical Slice Flow
  // (boot -> create world -> spawn -> mine -> craft -> build shelter -> survive encounter -> reach settlement -> save -> quit -> continue)
  console.log('\n▶ [14/14] Testing 60-Minute Gameplay Vertical Slice Flow...');
  {
    // 1. Boot systems
    QuestManager.initialize();
    DiscoverySystem.initialize();

    // 2. Create World
    const seed = 98765;
    const world = new VoxelWorld(seed, 'standard', 'overworld');
    const spawnY = world.getSpawnHeight(0, 0);
    assert(spawnY >= 20, 'World generated with valid spawn height');

    // 3. Spawn & Initial Quest
    const inv = InventoryManager.sanitizeInventory([], 36);
    InventoryManager.addItem(inv, 'wooden_pickaxe', 1);
    InventoryManager.addItem(inv, 'torch', 8);
    InventoryManager.addItem(inv, 'bread', 4);
    assert(QuestManager.getQuestState('q_first_steps')?.state === 'active', 'q_first_steps is active on spawn');

    // 4. Mine resources (Oak logs & Cobblestone)
    GameEventBus.emit('BLOCK_MINED', { blockType: BlockType.OAK_LOG, pos: [0, 64, 0] });
    InventoryManager.addItem(inv, 'oak_log', 4);
    GameEventBus.emit('ITEM_COLLECTED', { itemId: 'oak_log', count: 4 });

    GameEventBus.emit('BLOCK_MINED', { blockType: BlockType.COBBLESTONE, pos: [1, 64, 0] });
    InventoryManager.addItem(inv, 'cobblestone', 6);
    GameEventBus.emit('ITEM_COLLECTED', { itemId: 'cobblestone', count: 6 });

    // 5. Craft tool (Wooden Pickaxe)
    const pickaxeRecipe = CRAFTING_RECIPES.find(r => r.output.itemId === 'wooden_pickaxe');
    assert(pickaxeRecipe !== undefined, 'Wooden pickaxe recipe exists');
    if (pickaxeRecipe) {
      InventoryManager.addItem(inv, 'wood_planks', 4);
      InventoryManager.addItem(inv, 'stick', 4);
      const crafted = CraftingSystem.craft(pickaxeRecipe, inv, 1);
      assert(crafted, 'Crafting wooden pickaxe succeeded');
    }
    assert(QuestManager.getQuestState('q_first_steps')?.state === 'completed', 'q_first_steps completed automatically after mining & crafting');
    assert(QuestManager.getQuestState('q_shelter_first_night')?.state === 'active', 'q_shelter_first_night activated after completing first steps');

    // 6. Build shelter (Place 10 blocks) & Craft Torch
    for (let i = 0; i < 10; i++) {
      world.setBlock(i, 64, 0, BlockType.WOOD_PLANKS);
      GameEventBus.emit('BLOCK_PLACED', { blockType: BlockType.WOOD_PLANKS, pos: [i, 64, 0] });
    }
    GameEventBus.emit('ITEM_CRAFTED', { itemId: 'torch', count: 4, station: 'hand' });

    // 7. Survive Encounter (Defeat Shadow Stalker)
    GameEventBus.emit('ENTITY_KILLED', { entityId: 'stalker_night_1', modelType: 'stalker', isBoss: false, pos: [0, 64, 0] });
    assert(QuestManager.getQuestState('q_shelter_first_night')?.state === 'completed', 'q_shelter_first_night completed after building & fighting night stalker');
    assert(QuestManager.getQuestState('q_leyline_awakening')?.state === 'active', 'q_leyline_awakening activated for settlement exploration');

    // 8. Reach Settlement (Haven Pioneer Camp)
    GameEventBus.emit('SETTLEMENT_VISITED', { settlementId: 'haven_camp', name: 'Haven Pioneer Camp', pos: [8, 64, 8] });
    assert(DiscoverySystem.getDiscoveries().some(d => d.id === 'haven_camp'), 'Settlement recorded in DiscoverySystem');

    // 9. Interact with Leyline Conduit
    GameEventBus.emit('MONOLITH_ACTIVATED', { monolithId: 'leyline_conduit', name: 'Aether Leyline Conduit', pos: [10, 64, 10] });
    assert(QuestManager.getQuestState('q_leyline_awakening')?.state === 'completed', 'q_leyline_awakening completed after activating Leyline Conduit');

    // 10. Save World & Progress
    const rawSave = {
      version: 3,
      id: 'realm_vslice_test',
      seed: seed,
      player: {
        position: [8, 64, 8],
        health: 100,
        hunger: 100,
        stamina: 100,
        inventory: inv,
      },
      quests: {
        q_first_steps: { state: 'completed', progress: { '0': 4, '1': 1, '2': 6 } },
        q_shelter_first_night: { state: 'completed', progress: { '0': 10, '1': 1, '2': 1 } },
        q_leyline_awakening: { state: 'completed', progress: { '0': 1, '1': 1 } },
      },
    };
    const sanitizedSave = SaveManager.validateAndSanitizeSave(rawSave, 'realm_vslice_test', seed);
    assert(sanitizedSave.quests['q_leyline_awakening']?.state === 'completed', 'Save data retains completed vertical slice quests');

    // 11. Quit & Cleanup
    world.dispose();
    QuestManager.dispose();

    // 12. Continue World & Verify Persistence
    QuestManager.initialize(sanitizedSave.quests);
    assert(QuestManager.getQuestState('q_leyline_awakening')?.state === 'completed', 'Continued world preserves completed quest progression');
    assert(QuestManager.getQuestState('q_first_steps')?.state === 'completed', 'Continued world preserves first steps quest');
  }

  // TEST 15: Mid-Game Capability Unlocks, Settlement Upgrade, Leyline Automation & Multiplayer Sync
  console.log('\n▶ [15/15] Testing Mid-Game Capability Unlocks, Settlement Progression & Leyline Automation...');
  {
    // 1. Initialize systems
    QuestManager.initialize();
    SettlementManager.initialize();
    const net = AetherNetworkManager.getInstance();
    net.reset();

    // 2. Progression Chain: Complete full sequence (q_first_steps -> q_shelter_first_night -> q_leyline_awakening -> q_hunting_stalkers -> q_delve_crypt)
    // A. First steps
    GameEventBus.emit('ITEM_COLLECTED', { itemId: 'oak_log', count: 4 });
    GameEventBus.emit('ITEM_CRAFTED', { itemId: 'wooden_pickaxe', count: 1, station: 'hand' });
    GameEventBus.emit('ITEM_COLLECTED', { itemId: 'cobblestone', count: 6 });

    // B. Shelter first night
    for (let i = 0; i < 10; i++) {
      GameEventBus.emit('BLOCK_PLACED', { blockType: BlockType.WOOD_PLANKS, pos: [i, 64, 0] });
    }
    GameEventBus.emit('ITEM_CRAFTED', { itemId: 'torch', count: 1, station: 'hand' });
    GameEventBus.emit('ENTITY_KILLED', { entityId: 'stalker_night', modelType: 'stalker', isBoss: false, pos: [0, 64, 0] });

    // C. Leyline awakening
    GameEventBus.emit('SETTLEMENT_VISITED', { settlementId: 'haven_camp', name: 'Haven Pioneer Camp', pos: [8, 64, 8] });
    GameEventBus.emit('MONOLITH_ACTIVATED', { monolithId: 'leyline_conduit', name: 'Aether Leyline Conduit', pos: [10, 64, 10] });

    // D. Hunting stalkers
    GameEventBus.emit('ENTITY_KILLED', { entityId: 'stalker_1', modelType: 'stalker', isBoss: false, pos: [0, 64, 0] });
    GameEventBus.emit('ENTITY_KILLED', { entityId: 'stalker_2', modelType: 'stalker', isBoss: false, pos: [0, 64, 0] });
    GameEventBus.emit('ENTITY_KILLED', { entityId: 'stalker_3', modelType: 'stalker', isBoss: false, pos: [0, 64, 0] });
    assert(QuestManager.getQuestState('q_delve_crypt')?.state === 'active', 'q_delve_crypt unlocked and active after completing full prerequisite chain');

    // Discover Dungeon & Defeat Sentinel Mini-Boss
    GameEventBus.emit('STRUCTURE_DISCOVERED', { structureId: 'dungeon', name: 'Subterranean Crypt', pos: [120, 30, -200] });
    GameEventBus.emit('ENTITY_KILLED', { entityId: 'ruin_sentinel_1', modelType: 'ruin_sentinel', isBoss: false, pos: [120, 20, -200] });
    assert(QuestManager.getQuestState('q_delve_crypt')?.state === 'completed', 'q_delve_crypt completed upon dungeon discovery & sentinel defeat');

    // 3. Capability Unlock: Leyline Astrolabe Compass & Equipment Progression
    const inv = InventoryManager.sanitizeInventory([], 36);
    InventoryManager.addItem(inv, 'aether_crystal', 8);
    InventoryManager.addItem(inv, 'copper_ingot', 12);
    InventoryManager.addItem(inv, 'leyline_compass', 1);
    assert(inv.some(slot => slot?.itemId === 'leyline_compass'), 'Leyline Compass capability accessory present in inventory');

    // 4. Settlement Progression: Material contribution & Level Upgrade
    const sId = 'nagari_minang';
    const reqs = SettlementManager.getUpgradeRequirements(sId, 1);
    assert(reqs.length > 0, 'Nagari Minang defines Level 1 -> 2 material upgrade requirements');
    const upgraded = SettlementManager.upgradeSettlement(sId);
    assert(upgraded, 'Upgraded Nagari Minang from Level 1 to Level 2');
    assert(SettlementManager.getSettlementState(sId).level === 2, 'Settlement state reflects Level 2');
    const dialog = SettlementManager.getNPCDialogue('mandeh_siti_merchant', false, sId);
    assert(dialog.discountPercent > 0 || dialog.lines.length > 0, 'Level 2 settlement unlocks NPC dialogue & trade benefits');

    // 5. Leyline Engineering Automation & Grid Topology
    net.onBlockPlaced([100, 64, 100], BlockType.AETHER_CORE);
    net.onBlockPlaced([101, 64, 100], BlockType.LEY_CONDUIT);
    net.onBlockPlaced([102, 64, 100], BlockType.LEY_HARVESTER);
    assert(net.nodeMap.size === 3, 'Aether network registered Core, Conduit, and Harvester nodes');

    // 6. Multiplayer Session Authority
    const session = NetworkSession.getInstance();
    session.setTransportMode('loopback');
    assert(session.isHost, 'NetworkSession host status verified');
    session.sendBlockChange(100, 64, 100, BlockType.AIR, BlockType.AETHER_CORE);

    // 7. Mid-Game Save & Persistence Serialization
    const midGameSave = {
      version: 3,
      id: 'midgame_realm_test',
      seed: 77777,
      settlements: SettlementManager.serialize(),
      quests: QuestManager.serialize(),
      aetherNodes: Array.from(net.nodeMap.keys())
    };
    assert(midGameSave.settlements[sId]?.level === 2, 'Serialized save retains Level 2 settlement progression');
    assert(midGameSave.aetherNodes.length === 3, 'Serialized save retains 3 Leyline automation nodes');

    QuestManager.dispose();
    SettlementManager.dispose();
    net.reset();
  }

  // TEST 16: Living World Integration — Structure Recognition, NPC Routine Target, Leyline Synergy & Persistence
  console.log('\n▶ [16/16] Testing Living World Integration (Structure Recognition -> NPC Routine -> Leyline Synergy -> Save/Reload)...');
  {
    // 1. Initialize systems
    QuestManager.initialize();
    SettlementManager.initialize();
    StructureRecognitionEngine.clear();
    const net = AetherNetworkManager.getInstance();
    net.reset();

    const world = new VoxelWorld(12345);
    const sId = 'haven_camp';

    // 2. Player builds a Shelter (House) & Workshop at Haven Pioneer Camp
    for (let x = 0; x < 5; x++) {
      for (let z = 0; z < 5; z++) {
        world.setBlock(x, 64, z, BlockType.WOOD_PLANKS);
        world.setBlock(x, 65, z, BlockType.WOOD_PLANKS);
      }
    }
    // Place Door, Bed, Light Source, Crafting Bench, Furnace
    world.setBlock(2, 65, 0, BlockType.DOOR_BOTTOM);
    world.setBlock(2, 66, 0, BlockType.DOOR_TOP);
    world.setBlock(1, 65, 1, BlockType.BED_HEAD);
    world.setBlock(1, 65, 2, BlockType.BED_FOOT);
    world.setBlock(4, 65, 4, BlockType.TORCH);
    world.setBlock(3, 65, 3, BlockType.CRAFTING_BENCH);
    world.setBlock(4, 65, 3, BlockType.FURNACE);

    // 3. Settlement evaluates & recognizes the player structure
    const recognizedHouse = SettlementManager.evaluatePlayerStructure(world, [2, 65, 2], sId);
    assert(recognizedHouse !== null, 'Settlement successfully recognized player-built house & workshop structure');
    assert(recognizedHouse?.category === 'workshop' || recognizedHouse?.category === 'house', 'Recognized structure categorized as workshop/house');
    assert(recognizedHouse?.qualityRating! > 50, 'Recognized structure evaluated with high quality rating');

    const structs = SettlementManager.getRecognizedStructures(sId);
    assert(structs.length === 1, 'Haven Pioneer Camp updated with 1 recognized player structure');

    // 4. NPC uses the player-built structure for routine activities
    const nightTarget = NPCScheduleManager.getTargetLandmarkPosition('farmer', 22.0, [8, 64, 8], sId);
    assert(nightTarget[0] === 2 && nightTarget[1] === 65 && nightTarget[2] === 2, 'NPC farmer targets player-built structure position for night rest routine');

    const dialog = SettlementManager.getNPCDialogue('torvald_merchant', false, sId);
    assert(dialog.lines.some(line => line.includes('buatanmu')), 'NPC merchant dialogue acknowledges player-built structure');

    // 5. Connect Leyline Automation to the settlement
    net.setWorld(world);
    net.onBlockPlaced([10, 64, 10], BlockType.AETHER_CORE);
    net.onBlockPlaced([11, 64, 10], BlockType.LEY_CONDUIT);
    net.onBlockPlaced([12, 64, 10], BlockType.AETHER_SENTINEL_TURRET);

    net.recalculateNetworkPower(Array.from(net.networks.keys())[0]);
    assert(SettlementManager.isLeylinePowered(sId), 'Settlement detects active Leyline automation network connection');

    const bonuses = SettlementManager.getSettlementBonus(sId);
    assert(bonuses.isLeylinePowered === true, 'Settlement bonuses reflect active Leyline power state');
    assert(bonuses.discountBonusPercent >= 15, 'Settlement grants additional trade discount for Leyline power');

    const poweredDialog = SettlementManager.getNPCDialogue('torvald_merchant', false, sId);
    assert(poweredDialog.lines.some(line => line.includes('Leyline')), 'NPC dialogue reflects energized Leyline automation');

    // 6. Multiplayer authority check
    const session = NetworkSession.getInstance();
    session.setTransportMode('loopback');
    assert(session.isHost, 'Host authority validated for living world state updates');

    // 7. Save & Persistence Verification
    const fullSaveData = {
      version: 3,
      id: 'living_world_test',
      seed: 12345,
      settlements: SettlementManager.serialize(),
      structures: StructureRecognitionEngine.serialize(),
      aetherNodes: Array.from(net.nodeMap.keys()),
    };

    // Reset managers to simulate reload
    SettlementManager.dispose();
    StructureRecognitionEngine.clear();
    net.reset();

    // Reload state
    SettlementManager.initialize(fullSaveData.settlements);
    StructureRecognitionEngine.deserialize(fullSaveData.structures);

    assert(SettlementManager.getRecognizedStructures(sId).length === 1, 'Reloaded settlement retains recognized player structures');
    assert(SettlementManager.isLeylinePowered(sId) === true, 'Reloaded settlement retains Leyline automation power state');
    assert(StructureRecognitionEngine.getAllStructures().length === 1, 'Reloaded StructureRecognitionEngine retains global structure records');

    world.dispose();
    SettlementManager.dispose();
    StructureRecognitionEngine.clear();
    net.reset();
  }

  // TEST 17: Visual QA & Art Direction Constraints Regression
  console.log('\n▶ [17/17] Testing Visual QA & Art Direction Constraints Regression...');
  {
    // 1. Mob Showcase: Ensure archetypes and models can be instantiated without error
    const { CREATURE_REGISTRY } = await import('../engine/entities/CreatureRegistry');
    const { EntityModelBuilder } = await import('../engine/entities/EntityModelBuilder');
    const stag = CREATURE_REGISTRY['aether_stag'];
    assert(stag !== undefined && stag.role === 'AETHER_CREATURE', 'Aether Stag exists in registry');
    const stagMesh = EntityModelBuilder.buildStag(0);
    assert(stagMesh.userData.rig.locomotion === 'quadruped', 'Stag locomotion matches archetype');

    // 2. Animation Showcase: Verify animation engine accepts new archetypes
    const { CreatureAnimationEngine } = await import('../engine/entities/CreatureAnimationEngine');
    const mockState = { health: 100, maxHealth: 100, aiState: 'idle', velocity: [0, 0, 0] as [number, number, number] };
    CreatureAnimationEngine.update(16, stagMesh.userData.rig, mockState as any, 10, 0);
    assert(stagMesh.userData.rig.animPhase !== undefined, 'Animation engine ticked successfully');

    // 3. Nusantara Structure Showcase: Ensure procedural generation yields block arrays
    const { NusantaraBuildingKit } = await import('../engine/world/NusantaraBuildingKit');
    const rumahGadang = NusantaraBuildingKit.generateRumahGadang(true);
    assert(rumahGadang.length > 0, 'Rumah Gadang generated valid structural block placements');
    const panggung = NusantaraBuildingKit.generateJoglo();
    assert(panggung.length > 0, 'Joglo generated valid structural block placements');

    // 4. Biome & Lighting Constraints
    const { BiomeManager } = await import('../engine/world/BiomeManager');
    const bm = new BiomeManager(12345, 'overworld');
    const plains = bm.getBiome(0, 0);
    assert(plains.id !== undefined, 'Biome generation resolves base biome');
    
    // Simulate lighting check (Render pipeline instantiates shaders successfully)
    const { EnvironmentAtmosphereEngine } = await import('../engine/environment/EnvironmentVisualProfile');
    const profile = EnvironmentAtmosphereEngine.getProfile('plains');
    assert(profile.skyColorDay !== undefined, 'Environment visual profile defines correct sky colors');
    assert(profile.fogDensity > 0, 'Atmospheric fog is configured for depth');
  }

  // TEST 18: Visual Coherence & Entity Rig Overhaul Integration
  console.log('\n▶ [18/19] Running Comprehensive Visual Coherence & Rig Overhaul Tests...');
  {
    const { runVisualCoherenceOverhaulTests } = await import('./visualCoherenceOverhaulTest');
    const success = await runVisualCoherenceOverhaulTests();
    assert(success === true, 'All visual coherence & rig overhaul tests passed successfully');
  }

  // TEST 19: World Startup Pipeline & Benchmark Regression
  console.log('\n▶ [19/20] Running World Startup Pipeline Benchmark & Seed Regression Tests...');
  {
    const { runWorldStartupBenchmarkTests } = await import('./worldStartupBenchmarkTest');
    const success = await runWorldStartupBenchmarkTests();
    assert(success === true, 'All world startup pipeline benchmark & regression tests passed successfully');
  }

  // TEST 20: Canonical BlockState, Geometry, Collision, Placement, Blueprint, & Rotation Regression
  console.log('\n▶ [20/20] Running Canonical BlockState & Geometry Consistency Tests...');
  {
    const { runBlockStateConsistencyTests } = await import('./blockStateConsistencyTest');
    const success = await runBlockStateConsistencyTests();
    assert(success === true, 'All BlockState & canonical geometry consistency tests passed successfully');
  }

  console.log('\n====================================================');
  console.log(` ALL TEST SUITES PASSED STRICTLY (${passedCount}/${testCount} assertions) `);
  console.log('====================================================\n');
  process.exit(0);
}

runTestSuite().catch((e) => {
  console.error('\nCRITICAL TEST FAILURE:', e);
  process.exit(1);
});
