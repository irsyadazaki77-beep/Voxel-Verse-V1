// BlockState, Geometry, Collision, Placement, Blueprint, & Rotation Regression Test Suite
import * as THREE from 'three';
import { BlockType, RaycastHit } from '../types';
import { BlockShapeResolver } from '../engine/world/BlockShapeResolver';
import { BlockStateTransform } from '../engine/world/BlockStateTransform';
import { BlockPlacementEngine } from '../engine/world/BlockPlacementEngine';
import { BlockState, BlockStateUtils } from '../engine/world/BlockState';
import { VoxelWorld } from '../engine/world/VoxelWorld';
import { BlueprintSystem } from '../engine/engineering/BlueprintSystem';
import { SaveManager } from '../engine/storage/SaveManager';
import { NetworkSession } from '../engine/network/NetworkSession';

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`    ✓ [PASS] ${testName}`);
  } else {
    console.error(`    ✗ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
    throw new Error(`BlockState Consistency Test Failed: ${testName} - ${detail || ''}`);
  }
}

function createHit(
  blockPos: [number, number, number],
  faceNormal: [number, number, number],
  blockType: BlockType = BlockType.STONE,
  subFaceUV: [number, number] = [0.5, 0.5]
): RaycastHit {
  return {
    hit: true,
    distance: 2,
    blockPos,
    placePos: [blockPos[0] + faceNormal[0], blockPos[1] + faceNormal[1], blockPos[2] + faceNormal[2]],
    faceNormal,
    blockType,
    subFaceUV,
  };
}

export async function runBlockStateConsistencyTests(): Promise<boolean> {
  console.log('  --- Running BlockState & Canonical Geometry Consistency Tests ---');

  const world = new VoxelWorld();
  const playerAABB = new THREE.Box3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.6, 1.8, 0.6));

  // =========================================================================
  // TEST 1: Stairs Rotation, Top/Bottom Half, and Collision Consistency
  // =========================================================================
  {
    console.log('  [1] Stairs: Placement, Half, Facing, and Rotated Collision Boxes');
    // Place stairs clicking on top face of ground looking North (yaw = 0)
    const hitBottom = createHit([10, 64, 10], [0, 1, 0], BlockType.STONE, [0.5, 0.5]);
    const res1 = BlockPlacementEngine.evaluatePlacement(hitBottom, BlockType.STONE_STAIRS, playerAABB, 0, world, 0);

    assert(res1.allowed, 'Stairs placement allowed on ground');
    assert(res1.state?.half === 'bottom', 'Stairs placed with bottom half by default');
    assert(res1.state?.facing === 'north', 'Stairs facing north when yaw is 0');

    // Collision boxes: bottom stairs have base [0..1, 0..0.5, 0..1] and step [0..1, 0.5..1, 0..0.5]
    const boxesNorthBottom = BlockShapeResolver.getCollisionBoxes(BlockType.STONE_STAIRS, res1.state);
    assert(boxesNorthBottom.length === 2, 'Bottom stairs have exactly 2 collision boxes');
    assert(boxesNorthBottom[0].maxY === 0.5, 'Stairs base box has maxY = 0.5');
    assert(boxesNorthBottom[1].minY === 0.5 && boxesNorthBottom[1].maxY === 1.0, 'Stairs step box is in upper half');

    // Place stairs clicking on bottom face of ceiling -> should place upside-down (half = 'top')
    const hitTop = createHit([10, 66, 10], [0, -1, 0], BlockType.STONE, [0.5, 0.5]);
    const res2 = BlockPlacementEngine.evaluatePlacement(hitTop, BlockType.STONE_STAIRS, playerAABB, Math.PI / 2, world, 0);
    assert(res2.allowed, 'Ceiling stairs placement allowed');
    assert(res2.state?.half === 'top', 'Stairs clicked on ceiling face has half = top');
    assert(res2.state?.facing === 'east', 'Stairs facing east when yaw is PI/2');

    const boxesEastTop = BlockShapeResolver.getCollisionBoxes(BlockType.STONE_STAIRS, res2.state);
    assert(boxesEastTop.length === 2, 'Top stairs have 2 collision boxes');
    assert(boxesEastTop[0].minY === 0.5 && boxesEastTop[0].maxY === 1.0, 'Top stairs base box occupies top half');

    // Rotate stairs: North -> East (90 deg) -> South (180 deg) -> West (270 deg)
    const rot90 = BlockStateTransform.rotateState(BlockType.STONE_STAIRS, res1.state, 90);
    assert(rot90.facing === 'east', 'Stairs facing north rotated 90 deg faces east');
    assert(rot90.half === 'bottom', 'Stairs half is preserved through yaw rotation');

    const rot180 = BlockStateTransform.rotateState(BlockType.STONE_STAIRS, res1.state, 180);
    assert(rot180.facing === 'south', 'Stairs facing north rotated 180 deg faces south');

    const rot270 = BlockStateTransform.rotateState(BlockType.STONE_STAIRS, res1.state, 270);
    assert(rot270.facing === 'west', 'Stairs facing north rotated 270 deg faces west');

    // Mirror stairs
    const mirrorX = BlockStateTransform.mirrorState(BlockType.STONE_STAIRS, rot90, 'x');
    assert(mirrorX.facing === 'west', 'Stairs facing east mirrored on X axis faces west');
  }

  // =========================================================================
  // TEST 2: Slab Half & Merging into Double Slab
  // =========================================================================
  {
    console.log('  [2] Slabs: Bottom/Top Placement and Merging into Double Slabs');
    world.setBlock(20, 60, 20, BlockType.STONE);

    // Place slab on top face of solid block
    const hitSlabGround = createHit([20, 60, 20], [0, 1, 0], BlockType.STONE);
    const slabEval1 = BlockPlacementEngine.evaluatePlacement(hitSlabGround, BlockType.STONE_SLAB, playerAABB, 0, world, 0);

    assert(slabEval1.allowed, 'Slab placement allowed');
    assert(slabEval1.placePos[1] === 61, 'Slab places at Y=61 above stone');
    assert(slabEval1.state?.half === 'bottom', 'Placed slab has bottom half');

    world.setBlockWithState(slabEval1.placePos[0], slabEval1.placePos[1], slabEval1.placePos[2], slabEval1.blockTypeToPlace, slabEval1.state);

    const slabBoxes = BlockShapeResolver.getCollisionBoxes(BlockType.STONE_SLAB, slabEval1.state);
    assert(slabBoxes.length === 1 && slabBoxes[0].maxY === 0.5, 'Bottom slab collision box maxY is 0.5');

    // Click on the existing bottom slab with another STONE_SLAB -> Should MERGE into full STONE_BRICKS!
    const hitExistingSlab = createHit([20, 61, 20], [0, 1, 0], BlockType.STONE_SLAB);
    const mergeEval = BlockPlacementEngine.evaluatePlacement(hitExistingSlab, BlockType.STONE_SLAB, playerAABB, 0, world, 0);

    assert(mergeEval.allowed, 'Slab merging is allowed');
    assert(mergeEval.placePos[0] === 20 && mergeEval.placePos[1] === 61 && mergeEval.placePos[2] === 20, 'Target position is the existing slab');
    assert(mergeEval.blockTypeToPlace === BlockType.STONE_BRICKS, 'Merged into full stone bricks block');

    world.setBlockWithState(mergeEval.placePos[0], mergeEval.placePos[1], mergeEval.placePos[2], mergeEval.blockTypeToPlace, mergeEval.state);
    const mergedBoxes = BlockShapeResolver.getCollisionBoxes(world.getBlock(20, 61, 20), world.getBlockState(20, 61, 20));
    assert(mergedBoxes.length === 1 && mergedBoxes[0].maxY === 1.0, 'Merged slab has full 1.0 cube collision box');
  }

  // =========================================================================
  // TEST 3: Doors Orientation, Open State, Hinge & 2-Block Synchronization
  // =========================================================================
  {
    console.log('  [3] Doors: Multi-Block Placement, Orientation, Hinge, and Toggle Collision');
    world.setBlock(30, 60, 30, BlockType.STONE);

    const hitDoor = createHit([30, 60, 30], [0, 1, 0], BlockType.STONE);
    const doorEval = BlockPlacementEngine.evaluatePlacement(hitDoor, BlockType.DOOR_BOTTOM, playerAABB, 0, world, 0);

    assert(doorEval.allowed, 'Door placement allowed on solid foundation');
    assert(doorEval.blockTypeToPlace === BlockType.DOOR_BOTTOM, 'Places DOOR_BOTTOM at foot level');
    assert(doorEval.extraBlocks && doorEval.extraBlocks.length === 1, 'Door placement generates DOOR_TOP extra block');
    assert(doorEval.extraBlocks![0].blockType === BlockType.DOOR_TOP, 'Extra block is DOOR_TOP');
    assert(doorEval.extraBlocks![0].pos[1] === doorEval.placePos[1] + 1, 'DOOR_TOP is exactly Y+1 above DOOR_BOTTOM');
    assert(doorEval.state?.facing === 'north', 'Door orientation matches player facing');
    assert(doorEval.state?.open === false, 'Door is initially closed');

    // Place both door blocks into world
    world.setBlockWithState(doorEval.placePos[0], doorEval.placePos[1], doorEval.placePos[2], doorEval.blockTypeToPlace, doorEval.state);
    const top = doorEval.extraBlocks![0];
    world.setBlockWithState(top.pos[0], top.pos[1], top.pos[2], top.blockType, top.state);

    // Verify closed collision: Closed door is solid and blocks passage
    const closedBoxes = BlockShapeResolver.getCollisionBoxes(BlockType.DOOR_BOTTOM, world.getBlockState(doorEval.placePos[0], doorEval.placePos[1], doorEval.placePos[2]));
    assert(closedBoxes.length > 0, 'Closed door has collision box');
    assert(BlockShapeResolver.isSolidForCollision(BlockType.DOOR_BOTTOM, world.getBlockState(doorEval.placePos[0], doorEval.placePos[1], doorEval.placePos[2])), 'Closed door is solid');

    // Open door: Toggle open state on bottom half and top half
    world.setBlockState(doorEval.placePos[0], doorEval.placePos[1], doorEval.placePos[2], { open: true });
    world.setBlockState(top.pos[0], top.pos[1], top.pos[2], { open: true });

    const openState = world.getBlockState(doorEval.placePos[0], doorEval.placePos[1], doorEval.placePos[2]);
    assert(openState.open === true, 'Door state is open');
    assert(!BlockShapeResolver.isSolidForCollision(BlockType.DOOR_BOTTOM, openState), 'Open door allows passage (isSolidForCollision is false)');
  }

  // =========================================================================
  // TEST 4: Trapdoor Orientation, Half, and Open State
  // =========================================================================
  {
    console.log('  [4] Trapdoors: Half, Facing, and Open/Closed States');
    world.setBlock(40, 64, 40, BlockType.STONE);
    // Clicking south face, upper half of block
    const hitWall = createHit([40, 64, 40], [0, 0, 1], BlockType.STONE, [0.5, 0.8]);
    const trapEval = BlockPlacementEngine.evaluatePlacement(hitWall, BlockType.WOODEN_SHUTTER, playerAABB, Math.PI, world, 0);

    assert(trapEval.allowed, 'Shutter/trapdoor placement allowed');
    assert(trapEval.state?.half === 'top', 'Clicked upper portion -> top half shutter');
    assert(trapEval.state?.facing === 'north', 'Facing opposes click normal (north)');

    // Collision when closed
    const closedBoxes = BlockShapeResolver.getCollisionBoxes(BlockType.WOODEN_SHUTTER, trapEval.state);
    assert(closedBoxes.length === 1, 'Closed trapdoor has 1 thin collision box');

    // Open trapdoor
    const openState: BlockState = { ...trapEval.state, open: true };
    assert(!BlockShapeResolver.isSolidForCollision(BlockType.WOODEN_SHUTTER, openState), 'Open trapdoor allows passage');

    // Rotate trapdoor
    const rotated = BlockStateTransform.rotateState(BlockType.WOODEN_SHUTTER, trapEval.state, 90);
    assert(rotated.facing === 'east', 'Trapdoor facing north rotated 90 deg faces east');
  }

  // =========================================================================
  // TEST 5: Fence Connections & 1.5 Block Height Obstacle
  // =========================================================================
  {
    console.log('  [5] Fences: Dynamic Neighbor Connections and 1.5 Collision Height');
    world.setBlock(50, 64, 50, BlockType.FENCE_WOOD);
    world.setBlock(50, 64, 51, BlockType.FENCE_WOOD);

    const fence1State = BlockShapeResolver.resolveNeighborConnections(world, 50, 64, 50, BlockType.FENCE_WOOD);
    assert(fence1State.south === true, 'Fence connects to neighbor south fence');
    assert(fence1State.north === false, 'Fence does not connect north where air exists');

    const fenceBoxes = BlockShapeResolver.getCollisionBoxes(BlockType.FENCE_WOOD, fence1State);
    assert(fenceBoxes.length >= 2, 'Fence with connection has post and arm collision boxes');
    assert(fenceBoxes[0].maxY === 1.5, 'Fence post has 1.5 block collision height (prevents jumping over)');

    // Rotate fence state
    const rotFence = BlockStateTransform.rotateState(BlockType.FENCE_WOOD, fence1State, 90);
    assert(rotFence.west === true && rotFence.south === false, 'Fence south connection rotates to west connection');
  }

  // =========================================================================
  // TEST 6: Logs / Pillars Axis Orientation
  // =========================================================================
  {
    console.log('  [6] Logs/Pillars: Axis Determination and Rotation');
    world.setBlock(60, 64, 60, BlockType.STONE);

    // Click on top face -> Y axis
    const hitY = createHit([60, 64, 60], [0, 1, 0], BlockType.STONE);
    const resY = BlockPlacementEngine.evaluatePlacement(hitY, BlockType.OAK_LOG, playerAABB, 0, world, 0);
    assert(resY.state?.axis === 'y', 'Log placed against top face has axis = y');

    // Click on X face -> X axis
    const hitX = createHit([60, 64, 60], [1, 0, 0], BlockType.STONE);
    const resX = BlockPlacementEngine.evaluatePlacement(hitX, BlockType.OAK_LOG, playerAABB, 0, world, 0);
    assert(resX.state?.axis === 'x', 'Log placed against X side has axis = x');

    // Rotate log axis: x axis rotated 90 deg around Y becomes z axis
    const rotLog = BlockStateTransform.rotateState(BlockType.OAK_LOG, resX.state, 90);
    assert(rotLog.axis === 'z', 'Log X axis rotated 90 deg becomes Z axis');

    const rotLog2 = BlockStateTransform.rotateState(BlockType.OAK_LOG, rotLog, 90);
    assert(rotLog2.axis === 'x', 'Log Z axis rotated 90 deg returns to X axis');
  }

  // =========================================================================
  // TEST 7: Device / Piston 6-Way Facing & Inversion
  // =========================================================================
  {
    console.log('  [7] Devices/Pistons: 6-Way Facing and Inversion');
    world.setBlock(70, 64, 70, BlockType.STONE);

    // Placing looking down (pitch = -Math.PI / 3) -> device faces up
    const hitPiston = createHit([70, 64, 70], [0, 1, 0], BlockType.STONE);
    const resUp = BlockPlacementEngine.evaluatePlacement(hitPiston, BlockType.AETHER_ACTUATOR, playerAABB, 0, world, -Math.PI / 3);
    assert(resUp.state?.facing === 'up', 'Device placed looking steeply down faces up');

    // Looking steeply up -> device faces down
    const resDown = BlockPlacementEngine.evaluatePlacement(hitPiston, BlockType.AETHER_ACTUATOR, playerAABB, 0, world, Math.PI / 3);
    assert(resDown.state?.facing === 'down', 'Device placed looking steeply up faces down');

    // Invert device facing
    const inverted = BlockStateTransform.invertFacing(resUp.state?.facing || 'up');
    assert(inverted === 'down', 'Inverted facing of up is down');
  }

  // =========================================================================
  // TEST 8: Blueprint Capture, Rotation, Mirroring, and World Assembly
  // =========================================================================
  {
    console.log('  [8] Blueprints: Capture with BlockState, Rotate, Mirror, and Assembly');
    // Build a mini L-shaped staircase and fence in world
    world.setBlockWithState(80, 64, 80, BlockType.STONE_STAIRS, { facing: 'north', half: 'bottom' });
    world.setBlockWithState(81, 64, 80, BlockType.OAK_LOG, { axis: 'x' });
    world.setBlockWithState(81, 65, 80, BlockType.FENCE_WOOD, { north: true, south: false });

    // Capture blueprint
    const bp = BlueprintSystem.createFromWorld('test_arch_bp', 'Test Architecture', [80, 64, 80], [81, 65, 80], world);
    assert(bp.blocks.length === 3, 'Blueprint captured 3 blocks');
    assert(bp.blocks[0].state?.facing === 'north', 'Blueprint preserved stairs facing state');

    // Rotate blueprint 90 degrees
    const bpRot90 = BlueprintSystem.rotateBlueprint(bp, 90);
    assert(bpRot90.blocks.length === 3, 'Rotated blueprint retains 3 blocks');
    const rotatedStairs = bpRot90.blocks.find(b => b.blockType === BlockType.STONE_STAIRS);
    assert(rotatedStairs?.state?.facing === 'east', 'Rotated blueprint stair faces east');

    // Mirror blueprint along X axis
    const bpMirrorX = BlueprintSystem.mirrorBlueprint(bp, 'x');
    const mirroredStairs = bpMirrorX.blocks.find(b => b.blockType === BlockType.STONE_STAIRS);
    assert(mirroredStairs?.state?.facing === 'north', 'Mirrored stairs facing remains north on X mirror');

    // Build rotated blueprint into new coordinates
    const buildSuccess = BlueprintSystem.buildBlueprint(bpRot90.id, [100, 64, 100], world);
    assert(buildSuccess, 'Rotated blueprint built successfully in world');
    const placedStair = world.getBlock(100 + rotatedStairs!.relPos[0], 64 + rotatedStairs!.relPos[1], 100 + rotatedStairs!.relPos[2]);
    const placedState = world.getBlockState(100 + rotatedStairs!.relPos[0], 64 + rotatedStairs!.relPos[1], 100 + rotatedStairs!.relPos[2]);
    assert(placedStair === BlockType.STONE_STAIRS, 'Placed block is stairs');
    assert(placedState.facing === 'east', 'Placed stair in world has rotated east facing state');
  }

  // =========================================================================
  // TEST 9: Persistence Roundtrip (Save & Load with BlockStates)
  // =========================================================================
  {
    console.log('  [9] Persistence: Serialization and Deserialization of BlockStates');
    world.setBlockWithState(120, 70, 120, BlockType.STONE_STAIRS, { facing: 'west', half: 'top' });
    world.setBlockWithState(120, 70, 121, BlockType.WOODEN_SHUTTER, { facing: 'south', half: 'bottom', open: true });

    const saveData = SaveManager.serializeWorldToSave(world, 'state_test_realm', 42819, 'overworld', [120, 71, 120]);
    assert(Boolean(saveData.modifiedBlockStates), 'Save data includes modifiedBlockStates map');

    // Deserialize into a fresh world
    const loadedWorld = new VoxelWorld();
    SaveManager.applySaveToWorld(saveData, loadedWorld, 'overworld');

    const loadedStairs = loadedWorld.getBlock(120, 70, 120);
    const loadedStairsState = loadedWorld.getBlockState(120, 70, 120);
    assert(loadedStairs === BlockType.STONE_STAIRS, 'Loaded block is stone stairs');
    assert(loadedStairsState.facing === 'west', 'Loaded stairs facing is west');
    assert(loadedStairsState.half === 'top', 'Loaded stairs half is top');

    const loadedShutterState = loadedWorld.getBlockState(120, 70, 121);
    assert(loadedShutterState.open === true, 'Loaded shutter open state is true');
    assert(loadedShutterState.facing === 'south', 'Loaded shutter facing is south');
  }

  // =========================================================================
  // TEST 10: Multi-Player Network BlockState Protocol Synchronization
  // =========================================================================
  {
    console.log('  [10] Multiplayer: Network Packet State Serialization');
    const netSession = NetworkSession.getInstance();
    let sentPacket: any = null;

    // Intercept socket send
    (netSession as any).ws = {
      readyState: 1, // WebSocket.OPEN
      send: (data: string) => {
        sentPacket = JSON.parse(data);
      }
    };

    netSession.sendBlockChange(150, 65, 150, BlockType.AIR, BlockType.STONE_STAIRS, { facing: 'east', half: 'bottom' });
    assert(sentPacket !== null, 'Network packet sent');
    assert(sentPacket.type === 'BLOCK_CHANGE', 'Packet type is BLOCK_CHANGE');
    assert(sentPacket.state?.facing === 'east', 'Packet contains BlockState with facing east');
    assert(sentPacket.state?.half === 'bottom', 'Packet contains BlockState with half bottom');
  }

  console.log('  ✓ All BlockState & Canonical Geometry consistency assertions passed strictly!\n');
  return true;
}
