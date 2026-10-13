// ============================================================================
// MULTIPLAYER AUTHORITY, REAL-TIME SYNCHRONIZATION & NETWORK RELIABILITY TESTS
// ============================================================================

import { ServerAuthority } from '../engine/network/ServerAuthority';
import { NetworkSession } from '../engine/network/NetworkSession';
import { RemotePlayer } from '../engine/network/RemotePlayer';
import {
  PROTOCOL_VERSION,
  PlayerBootstrapMessage,
  BlockChangeMessage,
  CraftRequestMessage,
  InventoryActionMessage,
  DamageEventMessage,
} from '../engine/network/NetworkProtocol';
import { BlockType } from '../types';
import { WORLD_MIN_Y, WORLD_MAX_Y, MAX_INTERACTION_REACH, MAX_COMBAT_REACH } from '../engine/world/WorldConfig';
import * as THREE from 'three';

let testCount = 0;
let passedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  testCount++;
  if (condition) {
    passedCount++;
    console.log(`    ✓ [PASS] ${testName}`);
  } else {
    console.error(`    ✗ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
    throw new Error(`Multiplayer Test Failed: ${testName}`);
  }
}

export async function runMultiplayerAuthorityTests(): Promise<boolean> {
  console.log('--- Running Multiplayer Authority & Synchronization Tests ---');

  // =========================================================================
  // TEST 1: Protocol Version & Connection State Progression
  // =========================================================================
  console.log('  [1] Protocol Version & Explicit Connection States');
  {
    assert(typeof PROTOCOL_VERSION === 'string' && PROTOCOL_VERSION.length > 0, 'Protocol version is defined');
    
    const netSession = NetworkSession.getInstance();
    const observedStates: string[] = [];

    const unsub = netSession.onConnectionStateChange((state) => {
      observedStates.push(state);
    });

    netSession.setConnectionState('CONNECTING');
    netSession.setConnectionState('AUTHENTICATING');
    netSession.setConnectionState('SYNCHRONIZING');
    netSession.setConnectionState('READY');
    netSession.setConnectionState('RECONNECTING');
    netSession.setConnectionState('FAILED');
    netSession.setConnectionState('DISCONNECTED');

    assert(observedStates.includes('CONNECTING'), 'Observed CONNECTING state');
    assert(observedStates.includes('AUTHENTICATING'), 'Observed AUTHENTICATING state');
    assert(observedStates.includes('SYNCHRONIZING'), 'Observed SYNCHRONIZING state');
    assert(observedStates.includes('READY'), 'Observed READY state');
    assert(observedStates.includes('RECONNECTING'), 'Observed RECONNECTING state');
    assert(observedStates.includes('FAILED'), 'Observed FAILED state');
    assert(observedStates.includes('DISCONNECTED'), 'Observed DISCONNECTED state');

    unsub();
  }

  // =========================================================================
  // TEST 2: Authoritative Block Placement Validation
  // =========================================================================
  console.log('  [2] Server-Authoritative Block Placement');
  {
    const playerPos: [number, number, number] = [0, 64, 0];
    const playerInventory = [
      { itemId: 'stone', count: 10 },
      { itemId: 'oak_log', count: 4 },
      null,
    ];

    // 1. Valid placement: stone block at [2, 64, 0] with stone in inventory
    const validStone = ServerAuthority.validateBlockPlacement(
      playerPos,
      2, 64, 0,
      BlockType.AIR,
      BlockType.STONE,
      playerInventory
    );
    assert(validStone.valid === true, 'Stone placement approved when player holds stone');
    assert(validStone.consumedMaterialId === 'stone', 'Identifies correct material to consume');

    // 2. Reject placement when player does NOT hold the block item
    const missingObsidian = ServerAuthority.validateBlockPlacement(
      playerPos,
      2, 64, 0,
      BlockType.AIR,
      BlockType.OBSIDIAN,
      playerInventory
    );
    assert(missingObsidian.valid === false, 'Obsidian block rejected when not in inventory');
    assert(missingObsidian.reason === 'ITEM_NOT_IN_INVENTORY', 'Reason matches ITEM_NOT_IN_INVENTORY');

    // 3. Reject placement exceeding max reach distance
    const reachViolation = ServerAuthority.validateBlockPlacement(
      playerPos,
      0, 64, Math.ceil(MAX_INTERACTION_REACH + 5),
      BlockType.AIR,
      BlockType.STONE,
      playerInventory
    );
    assert(reachViolation.valid === false, 'Placement beyond reach rejected');
    assert(reachViolation.reason === 'EXCEEDS_MAX_REACH', 'Reason matches EXCEEDS_MAX_REACH');

    // 4. Reject placement below world bottom Y
    const belowWorld = ServerAuthority.validateBlockPlacement(
      playerPos,
      0, WORLD_MIN_Y - 1, 0,
      BlockType.AIR,
      BlockType.STONE,
      playerInventory
    );
    assert(belowWorld.valid === false, 'Placement below WORLD_MIN_Y rejected');
    assert(belowWorld.reason === 'OUT_OF_WORLD_HEIGHT_BOUNDS', 'Reason matches OUT_OF_WORLD_HEIGHT_BOUNDS');

    // 5. Reject placement above world ceiling Y
    const aboveWorld = ServerAuthority.validateBlockPlacement(
      playerPos,
      0, WORLD_MAX_Y + 10, 0,
      BlockType.AIR,
      BlockType.STONE,
      playerInventory
    );
    assert(aboveWorld.valid === false, 'Placement above WORLD_MAX_Y rejected');

    // 6. Reject non-integer floating coordinates
    const floatCoords = ServerAuthority.validateBlockPlacement(
      playerPos,
      1.25, 64, 0,
      BlockType.AIR,
      BlockType.STONE,
      playerInventory
    );
    assert(floatCoords.valid === false, 'Floating point placement coordinate rejected');
    assert(floatCoords.reason === 'COORDINATES_MUST_BE_INTEGERS', 'Reason matches COORDINATES_MUST_BE_INTEGERS');

    // 7. Reject when client claims old block that doesn't match authoritative world
    const desyncOldBlock = ServerAuthority.validateBlockPlacement(
      playerPos,
      2, 64, 0,
      BlockType.STONE, // Client claims stone was there
      BlockType.OAK_LOG,
      playerInventory,
      BlockType.AIR // Server world actually has air
    );
    assert(desyncOldBlock.valid === false, 'Mismatched old block state rejected');
    assert(desyncOldBlock.reason === 'OLD_BLOCK_STATE_DESYNC', 'Reason matches OLD_BLOCK_STATE_DESYNC');
  }

  // =========================================================================
  // TEST 3: Authoritative Block Break Validation
  // =========================================================================
  console.log('  [3] Server-Authoritative Block Destruction');
  {
    const playerPos: [number, number, number] = [10, 50, 10];

    // Valid break
    const validBreak = ServerAuthority.validateBlockBreak(
      playerPos,
      11, 50, 10,
      BlockType.STONE,
      BlockType.STONE
    );
    assert(validBreak.valid === true, 'Valid block destruction approved');

    // Break out of reach
    const outOfReachBreak = ServerAuthority.validateBlockBreak(
      playerPos,
      100, 50, 10,
      BlockType.STONE,
      BlockType.STONE
    );
    assert(outOfReachBreak.valid === false, 'Out of reach block destruction rejected');
    assert(outOfReachBreak.reason === 'EXCEEDS_MAX_REACH', 'Reason matches EXCEEDS_MAX_REACH');

    // Desync break (block was already broken or changed)
    const desyncBreak = ServerAuthority.validateBlockBreak(
      playerPos,
      11, 50, 10,
      BlockType.STONE,
      BlockType.AIR
    );
    assert(desyncBreak.valid === false, 'Destruction of already-removed block rejected');
    assert(desyncBreak.reason === 'OLD_BLOCK_STATE_DESYNC', 'Reason matches OLD_BLOCK_STATE_DESYNC');
  }

  // =========================================================================
  // TEST 4: Authoritative Crafting Validation
  // =========================================================================
  console.log('  [4] Server-Authoritative Crafting Transactions');
  {
    // Inventory with 2 oak logs
    const inventory = [
      { itemId: 'oak_log', count: 2 },
      null,
      null,
    ];

    // 1. Valid craft: planks_from_oak from oak_log (1 log -> 4 planks)
    const validCraft = ServerAuthority.validateCraftRequest(
      'planks_from_oak',
      1,
      inventory,
      'hand'
    );
    assert(validCraft.valid === true, 'Valid plank craft request approved');

    // 2. Reject unknown recipe
    const unknownRecipe = ServerAuthority.validateCraftRequest(
      'non_existent_unobtainium_sword',
      1,
      inventory,
      'hand'
    );
    assert(unknownRecipe.valid === false, 'Unknown recipe rejected');
    assert(unknownRecipe.reason === 'UNKNOWN_RECIPE', 'Reason matches UNKNOWN_RECIPE');

    // 3. Reject insufficient ingredients
    const tooMany = ServerAuthority.validateCraftRequest(
      'planks_from_oak',
      100, // Requires 100 logs, player only has 2
      inventory,
      'hand'
    );
    assert(tooMany.valid === false, 'Excessive craft quantity with insufficient materials rejected');

    // 4. Reject negative or zero quantity
    const zeroQuantity = ServerAuthority.validateCraftRequest(
      'planks_from_oak',
      0,
      inventory,
      'hand'
    );
    assert(zeroQuantity.valid === false, 'Zero craft quantity rejected');
    assert(zeroQuantity.reason === 'INVALID_CRAFT_QUANTITY', 'Reason matches INVALID_CRAFT_QUANTITY');

    const negativeQuantity = ServerAuthority.validateCraftRequest(
      'planks_from_oak',
      -5,
      inventory,
      'hand'
    );
    assert(negativeQuantity.valid === false, 'Negative craft quantity rejected');

    // 5. Workstation requirement enforcement
    // e.g. Artisan workbench recipe requested with 'hand'
    const wrongStation = ServerAuthority.validateCraftRequest(
      'furnace_bench',
      1,
      [{ itemId: 'cobblestone', count: 16 }],
      'hand' // furnace_bench requires crafting_bench
    );
    assert(wrongStation.valid === false, 'Workbench recipe attempted with hand rejected');
    assert(wrongStation.reason === 'INCORRECT_WORKSTATION_CONTEXT', 'Workstation context strictly enforced');
  }

  // =========================================================================
  // TEST 5: Authoritative Inventory Mutation Validation
  // =========================================================================
  console.log('  [5] Server-Authoritative Inventory Action Validation');
  {
    const inv = [
      { itemId: 'torch', count: 16 },
      null,
      { itemId: 'apple', count: 5 },
    ];

    // 1. Valid move/swap within slot bounds
    const validMove: InventoryActionMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'INVENTORY_ACTION',
      sessionId: 'test_player',
      actionType: 'move',
      fromSlot: 0,
      toSlot: 1,
      count: 1,
      timestamp: Date.now(),
    };
    const moveRes = ServerAuthority.validateInventoryAction(validMove, inv);
    assert(moveRes.valid === true, 'Valid inventory slot move approved');

    // 2. Reject out of bounds slot indices
    const outOfBounds: InventoryActionMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'INVENTORY_ACTION',
      sessionId: 'test_player',
      actionType: 'move',
      fromSlot: 0,
      toSlot: 999,
      count: 1,
      timestamp: Date.now(),
    };
    const oobRes = ServerAuthority.validateInventoryAction(outOfBounds, inv);
    assert(oobRes.valid === false, 'Out of bounds slot index rejected');

    // 3. Reject consuming more items than exist in slot
    const overConsume: InventoryActionMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'INVENTORY_ACTION',
      sessionId: 'test_player',
      actionType: 'consume',
      fromSlot: 2,
      toSlot: 2,
      itemId: 'apple',
      count: 100, // Only 5 available
      timestamp: Date.now(),
    };
    const overConsumeRes = ServerAuthority.validateInventoryAction(overConsume, inv);
    assert(overConsumeRes.valid === false, 'Over-consumption of items rejected');

    // 4. Reject item ID spoofing
    const itemMismatch: InventoryActionMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'INVENTORY_ACTION',
      sessionId: 'test_player',
      actionType: 'consume',
      fromSlot: 2,
      toSlot: 2,
      itemId: 'diamond', // Slot 2 actually contains apple
      count: 1,
      timestamp: Date.now(),
    };
    const mismatchRes = ServerAuthority.validateInventoryAction(itemMismatch, inv);
    assert(mismatchRes.valid === false, 'Mismatched item ID transaction rejected');
  }

  // =========================================================================
  // TEST 6: Authoritative Combat Validation
  // =========================================================================
  console.log('  [6] Server-Authoritative Combat Reach & Damage Validation');
  {
    const attackerPos: [number, number, number] = [0, 60, 0];
    const nearbyTargetPos: [number, number, number] = [2, 60, 0];
    const farawayTargetPos: [number, number, number] = [50, 60, 0];

    // Valid attack
    const validDmg: DamageEventMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'DAMAGE_EVENT',
      attackerId: 'p1',
      targetId: 'p2',
      damageAmount: 15,
      damageType: 'physical',
      timestamp: Date.now(),
    };
    const validDmgRes = ServerAuthority.validateDamageEvent(validDmg, attackerPos, nearbyTargetPos);
    assert(validDmgRes.valid === true, 'Damage within combat reach approved');

    // Target out of combat reach
    const reachDmgRes = ServerAuthority.validateDamageEvent(validDmg, attackerPos, farawayTargetPos);
    assert(reachDmgRes.valid === false, 'Damage beyond max combat reach rejected');

    // Exploitative damage amount (e.g. 99999 or negative)
    const cheatDmg: DamageEventMessage = {
      ...validDmg,
      damageAmount: 99999,
    };
    const cheatDmgRes = ServerAuthority.validateDamageEvent(cheatDmg, attackerPos, nearbyTargetPos);
    assert(cheatDmgRes.valid === false, 'Unrealistic damage amount rejected');
  }

  // =========================================================================
  // TEST 7: Movement Validation & Anti-Teleport Checks
  // =========================================================================
  console.log('  [7] Movement Validation & Speed Limits');
  {
    const posA: [number, number, number] = [0, 50, 0];
    const posB: [number, number, number] = [0.5, 50, 0.5];
    const posTeleport: [number, number, number] = [500, 50, 500];

    // Normal movement tick (dt = 0.05s)
    const normalMove = ServerAuthority.validateMovement(posA, posB, 0.05);
    assert(normalMove.valid === true, 'Legitimate player movement accepted');

    // Blatant speedhack / teleportation
    const speedHack = ServerAuthority.validateMovement(posA, posTeleport, 0.05);
    assert(speedHack.valid === false, 'Instantaneous teleportation / speed violation rejected');
  }

  // =========================================================================
  // TEST 8: RemotePlayer Lifecycle & Mesh Cleanup
  // =========================================================================
  console.log('  [8] RemotePlayer Interpolation & Mesh Cleanup');
  {
    const remote = new RemotePlayer('remote_test_123', 'HeroRemote');
    assert(remote.sessionId === 'remote_test_123', 'RemotePlayer initialized with correct sessionId');
    assert(remote.playerName === 'HeroRemote', 'RemotePlayer initialized with correct name');
    assert(remote.group instanceof THREE.Group, 'RemotePlayer group is THREE.Group');

    // Push snapshots
    remote.pushTransformSnapshot([10, 60, 10], [0, 0, 0], Date.now() - 50);
    remote.pushTransformSnapshot([12, 60, 10], [0, 0.5, 0], Date.now());

    // Update interpolation (delta 0.05s)
    remote.update(0.05);
    assert(remote.group.position.x > 0, 'RemotePlayer interpolated position towards target');

    // Clean disposal
    remote.dispose();
    assert(remote.group.children.length === 0, 'Disposing RemotePlayer frees all mesh children without memory leaks');
  }

  // =========================================================================
  // TEST 9: Player Bootstrap Deserialization & Deduplication
  // =========================================================================
  console.log('  [9] Player Bootstrap Processing & Deduplication');
  {
    const netSession = NetworkSession.getInstance();
    const scene = new THREE.Scene();
    netSession.setScene(scene);

    let bootstrapInventoryReceived: any = null;
    let eventReceivedCount = 0;

    const unsubBoot = netSession.onBootstrap((payload) => {
      eventReceivedCount++;
    });

    const unsubInv = netSession.onInventorySync((inv) => {
      bootstrapInventoryReceived = inv;
    });

    const sampleBootstrap: PlayerBootstrapMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'PLAYER_BOOTSTRAP',
      playerId: 'assigned_player_99',
      playerName: 'PlayerAuthoritative',
      position: [15, 75, 15],
      inventory: [{ itemId: 'oak_log', count: 12 }],
      equipment: {},
      stats: { health: 100, maxHealth: 100, level: 1, exp: 0 },
      questProgress: {},
      reputation: {},
      worldSeed: 12345,
      worldPreset: 'standard',
      blocks: [{ x: 5, y: 64, z: 5, blockType: BlockType.COBBLESTONE, revision: 10 }],
      onlinePlayers: [
        { sessionId: 'assigned_player_99', playerName: 'PlayerAuthoritative', position: [15, 75, 15] },
        { sessionId: 'peer_1', playerName: 'PeerOne', position: [20, 75, 20] },
      ],
      timestamp: Date.now(),
    };

    // Simulate incoming bootstrap message
    (netSession as any).handleIncomingMessage(sampleBootstrap);

    assert(eventReceivedCount > 0, 'onBootstrap event triggered upon message arrival');
    assert(netSession.getLocalSessionId() === 'assigned_player_99', 'Local player identity bound to server-assigned ID');
    assert(bootstrapInventoryReceived !== null && bootstrapInventoryReceived[0]?.itemId === 'oak_log', 'Authoritative inventory synchronized');
    assert(netSession.getRemotePlayers().has('peer_1'), 'Remote peer spawned from bootstrap online players');
    assert(!netSession.getRemotePlayers().has('assigned_player_99'), 'Local player NOT spawned as remote duplicate');

    unsubBoot();
    unsubInv();
  }

  console.log('  ✓ All Multiplayer Authority & Synchronization Tests Passed Successfully!\n');
  return true;
}
