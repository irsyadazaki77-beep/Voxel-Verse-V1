// Canonical BlockShapeResolver: Single Source of Truth for Geometry, Collision, Selection, Rendering & Interactions
import { BlockDef, BlockShape, BlockType, RaycastHit } from '../../types';
import { BLOCK_DEFS } from './BlockRegistry';
export type {
  BlockAABB,
  BlockAxis,
  BlockConnections,
  BlockState,
  Direction4,
  Direction6,
  DoorHinge,
  Half,
  StairsShape,
} from './BlockState';
export { BlockStateUtils } from './BlockState';

import {
  BlockAABB,
  BlockAxis,
  BlockConnections,
  BlockState,
  BlockStateUtils,
  Direction4,
  Direction6,
  DoorHinge,
  Half,
  StairsShape,
} from './BlockState';

export interface RenderQuad {
  positions: [
    [number, number, number],
    [number, number, number],
    [number, number, number],
    [number, number, number]
  ];
  normal: [number, number, number];
  uvs: [[number, number], [number, number], [number, number], [number, number]];
  faceType: 'top' | 'bottom' | 'north' | 'south' | 'east' | 'west';
  colorType?: 'top' | 'bottom' | 'side';
  cullsNeighborFace?: Direction6;
}

export class BlockShapeResolver {
  // Check if a block type with state is a full 1x1x1 solid cube
  public static isFullCube(blockType: BlockType, state?: BlockState): boolean {
    if (BlockShapeResolver.isSlab(blockType)) {
      return Boolean(state?.customData?.double);
    }
    if (BlockShapeResolver.isStairs(blockType)) return false;
    if (BlockShapeResolver.isDoor(blockType)) return false;
    if (BlockShapeResolver.isFence(blockType)) return false;
    const def = BLOCK_DEFS[blockType];
    if (!def || def.solid === false) return false;
    if (def.shape && def.shape !== 'full' && def.shape !== 'pillar') return false;
    return true;
  }

  // Check if a block type is stairs
  public static isStairs(blockType: BlockType): boolean {
    const def = BLOCK_DEFS[blockType];
    return (
      def?.shape === 'stairs' ||
      blockType === BlockType.WOOD_STAIRS ||
      blockType === BlockType.STONE_STAIRS ||
      blockType === BlockType.TERRACOTTA_ROOF_TILE ||
      blockType === BlockType.IJUK_THATCH_ROOF ||
      blockType === BlockType.ALANG_ALANG_THATCH
    );
  }

  // Check if a block type is a slab
  public static isSlab(blockType: BlockType): boolean {
    const def = BLOCK_DEFS[blockType];
    return (
      def?.shape === 'slab' ||
      blockType === BlockType.WOOD_SLAB ||
      blockType === BlockType.STONE_SLAB ||
      blockType === BlockType.FARMLAND ||
      blockType === BlockType.TERRACE_WATERWAY ||
      blockType === BlockType.BATIK_CARPET_BLOCK ||
      blockType === BlockType.BED_FOOT ||
      blockType === BlockType.BED_HEAD
    );
  }

  // Check if a block type is a door
  public static isDoor(blockType: BlockType): boolean {
    return blockType === BlockType.DOOR_BOTTOM || blockType === BlockType.DOOR_TOP;
  }

  // Check if a block type is a trapdoor or shutter
  public static isTrapdoor(blockType: BlockType): boolean {
    const def = BLOCK_DEFS[blockType];
    return def?.shape === 'trapdoor' || blockType === BlockType.WOODEN_SHUTTER;
  }

  // Check if a block type is a fence
  public static isFence(blockType: BlockType): boolean {
    const def = BLOCK_DEFS[blockType];
    return (
      def?.shape === 'fence' ||
      blockType === BlockType.FENCE_WOOD ||
      blockType === BlockType.BAMBOO_FENCE
    );
  }

  // Check if a block type is a log or pillar
  public static isPillarOrLog(blockType: BlockType): boolean {
    const def = BLOCK_DEFS[blockType];
    return (
      def?.shape === 'pillar' ||
      blockType === BlockType.OAK_LOG ||
      blockType === BlockType.PINE_LOG ||
      blockType === BlockType.CYAN_CRYSTAL_LOG ||
      blockType === BlockType.STONE_PILLAR ||
      blockType === BlockType.TEAK_WOOD_LOG ||
      blockType === BlockType.ULIN_IRONWOOD_LOG ||
      blockType === BlockType.BAMBOO_STALK_BLOCK ||
      blockType === BlockType.CARVED_WOOD_BEAM ||
      blockType === BlockType.SPLIT_GATE_STONE ||
      blockType === BlockType.STONE_ALANG_PILLAR
    );
  }

  // Check if a block is a directional engineering device
  public static isDirectionalDevice(blockType: BlockType): boolean {
    return (
      blockType === BlockType.AETHER_ACTUATOR ||
      blockType === BlockType.ITEM_FUNNEL ||
      blockType === BlockType.AETHER_STORAGE_RELAY ||
      blockType === BlockType.LEY_HARVESTER ||
      blockType === BlockType.AETHER_SENTINEL_TURRET ||
      blockType === BlockType.FLAME_VENT ||
      blockType === BlockType.FURNACE ||
      blockType === BlockType.CHEST ||
      blockType === BlockType.RICE_STORAGE_CHEST
    );
  }

  // Get full solid block state default
  public static getDefaultState(blockType: BlockType): BlockState {
    return BlockStateUtils.createDefaultState(blockType);
  }

  // Determine placement state from RaycastHit & Player Look
  public static determinePlacementState(
    hit: RaycastHit,
    blockType: BlockType,
    playerYaw: number,
    playerPitch: number,
    playerPos?: [number, number, number],
    neighborGetter?: (dx: number, dy: number, dz: number) => BlockState | null
  ): {
    state: BlockState;
    shouldMergeSlab?: boolean;
    placePos: [number, number, number];
    extraBlocks?: { pos: [number, number, number]; blockType: BlockType; state: BlockState }[];
  } {
    const placePos: [number, number, number] = [...hit.placePos];
    const def = BLOCK_DEFS[blockType];

    // Compute player cardinal facing
    const normalizedYaw = ((playerYaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    let playerFacing: Direction4 = 'north';
    if (normalizedYaw >= Math.PI * 0.25 && normalizedYaw < Math.PI * 0.75) {
      playerFacing = 'east';
    } else if (normalizedYaw >= Math.PI * 0.75 && normalizedYaw < Math.PI * 1.25) {
      playerFacing = 'south';
    } else if (normalizedYaw >= Math.PI * 1.25 && normalizedYaw < Math.PI * 1.75) {
      playerFacing = 'west';
    }

    const state = BlockStateUtils.createDefaultState(blockType);

    // 1. Slabs
    if (BlockShapeResolver.isSlab(blockType)) {
      const hitNormalY = hit.faceNormal[1];
      const subHitY = hit.subFaceUV ? hit.subFaceUV[1] : (hit.subHitPos ? hit.subHitPos[1] - hit.blockPos[1] : 0.5);

      // Check if clicking directly on a slab of same type to merge into a double slab
      if (hit.blockType === blockType) {
        if (hitNormalY > 0) {
          // Clicked top of bottom slab -> merge into target block
          return {
            state: { ...state, half: 'bottom', customData: { double: true } },
            shouldMergeSlab: true,
            placePos: [...hit.blockPos],
          };
        } else if (hitNormalY < 0) {
          // Clicked bottom of top slab -> merge into target block
          return {
            state: { ...state, half: 'bottom', customData: { double: true } },
            shouldMergeSlab: true,
            placePos: [...hit.blockPos],
          };
        }
      }

      // If clicked top face of any block -> bottom slab
      if (hitNormalY > 0) {
        state.half = 'bottom';
      } else if (hitNormalY < 0) {
        state.half = 'top';
      } else {
        // Clicked side face -> top half if clicked in upper half, bottom if lower half
        state.half = subHitY > 0.5 ? 'top' : 'bottom';
      }
      return { state, placePos };
    }

    // 2. Stairs
    if (BlockShapeResolver.isStairs(blockType)) {
      // Facing is the direction the stairs ascend towards
      state.facing = playerFacing;
      const hitNormalY = hit.faceNormal[1];
      const subHitY = hit.subFaceUV ? hit.subFaceUV[1] : (hit.subHitPos ? hit.subHitPos[1] - hit.blockPos[1] : 0.5);

      if (hitNormalY < 0 || (hitNormalY === 0 && subHitY > 0.5)) {
        state.half = 'top';
      } else {
        state.half = 'bottom';
      }

      if (neighborGetter) {
        state.shape = BlockShapeResolver.resolveStairsShape(state.facing, state.half, neighborGetter);
      }
      return { state, placePos };
    }

    // 3. Doors
    if (BlockShapeResolver.isDoor(blockType)) {
      state.facing = playerFacing;
      state.half = 'bottom';
      state.open = false;
      state.hinge = 'left';

      // Check right-side hinge placement heuristic
      if (neighborGetter) {
        const rightDir = BlockShapeResolver.getRelativeDirection(playerFacing, 'right');
        const rightOffset = BlockShapeResolver.getDirectionOffset(rightDir);
        const rightNeighbor = neighborGetter(rightOffset[0], rightOffset[1], rightOffset[2]);
        if (rightNeighbor && BlockShapeResolver.isSolidForCollision(rightNeighbor.blockType, rightNeighbor)) {
          state.hinge = 'right';
        }
      }

      // If placing the bottom of a door, automatically register top half companion
      const extraBlocks = blockType === BlockType.DOOR_BOTTOM ? [
        {
          pos: [placePos[0], placePos[1] + 1, placePos[2]] as [number, number, number],
          blockType: BlockType.DOOR_TOP,
          state: { ...state, half: 'top' as Half },
        }
      ] : undefined;

      return { state, placePos, extraBlocks };
    }

    // 4. Trapdoors & Shutters
    if (BlockShapeResolver.isTrapdoor(blockType)) {
      state.open = false;
      const hitNormalY = hit.faceNormal[1];
      const subHitY = hit.subFaceUV ? hit.subFaceUV[1] : (hit.subHitPos ? hit.subHitPos[1] - hit.blockPos[1] : 0.5);

      if (hitNormalY > 0.5) {
        state.half = 'bottom';
        state.facing = playerFacing;
      } else if (hitNormalY < -0.5) {
        state.half = 'top';
        state.facing = playerFacing;
      } else {
        // Clicked side face -> top half if clicked in upper half, bottom if lower half
        state.half = subHitY > 0.5 ? 'top' : 'bottom';
        // Facing opposes the click face normal (hinged to that wall)
        if (hit.faceNormal[0] > 0.5) state.facing = 'west';
        else if (hit.faceNormal[0] < -0.5) state.facing = 'east';
        else if (hit.faceNormal[2] > 0.5) state.facing = 'north';
        else if (hit.faceNormal[2] < -0.5) state.facing = 'south';
        else state.facing = playerFacing;
      }
      return { state, placePos };
    }

    // 5. Logs / Pillars
    if (BlockShapeResolver.isPillarOrLog(blockType)) {
      const nx = Math.abs(hit.faceNormal[0]);
      const ny = Math.abs(hit.faceNormal[1]);
      const nz = Math.abs(hit.faceNormal[2]);

      if (nx > 0.5) state.axis = 'x';
      else if (nz > 0.5) state.axis = 'z';
      else state.axis = 'y';

      return { state, placePos };
    }

    // 5. Directional devices / Actuators / Chests / Furnaces
    if (BlockShapeResolver.isDirectionalDevice(blockType)) {
      if (blockType === BlockType.AETHER_ACTUATOR || blockType === BlockType.ITEM_FUNNEL) {
        if (playerPitch < -Math.PI / 4) state.facing = 'up';
        else if (playerPitch > Math.PI / 4) state.facing = 'down';
        else if (hit.faceNormal[1] > 0.5) state.facing = 'up';
        else if (hit.faceNormal[1] < -0.5) state.facing = 'down';
        else state.facing = playerFacing;
      } else {
        state.facing = playerFacing;
      }
      return { state, placePos };
    }

    // 6. Fences & Conduits
    if (BlockShapeResolver.isFence(blockType) || blockType === BlockType.LEY_CONDUIT) {
      if (neighborGetter) {
        state.connections = BlockShapeResolver.resolveFenceConnections(blockType, neighborGetter);
      }
      return { state, placePos };
    }

    // 7. Torches & Lanterns
    if (def?.shape === 'torch') {
      if (hit.faceNormal[1] > 0.5) state.facing = 'up';
      else if (hit.faceNormal[0] > 0.5) state.facing = 'east';
      else if (hit.faceNormal[0] < -0.5) state.facing = 'west';
      else if (hit.faceNormal[2] > 0.5) state.facing = 'south';
      else if (hit.faceNormal[2] < -0.5) state.facing = 'north';
      else state.facing = 'up';
      return { state, placePos };
    }

    return { state, placePos };
  }

  // Canonical alias for resolvePlacementState
  public static resolvePlacementState(
    blockType: BlockType,
    hit: RaycastHit,
    playerYaw: number,
    playerPitch: number = 0,
    neighborGetter?: (dx: number, dy: number, dz: number) => BlockState | null
  ): {
    state: BlockState;
    shouldMergeSlab?: boolean;
    placePos: [number, number, number];
    extraBlocks?: { pos: [number, number, number]; blockType: BlockType; state: BlockState }[];
  } {
    return BlockShapeResolver.determinePlacementState(hit, blockType, playerYaw, playerPitch, undefined, neighborGetter);
  }

  // Resolve stairs dynamic shape (straight, inner_left, inner_right, outer_left, outer_right)
  public static resolveStairsShape(
    facing: Direction6,
    half: Half,
    neighborGetter: (dx: number, dy: number, dz: number) => BlockState | null
  ): StairsShape {
    const fOffset = BlockShapeResolver.getDirectionOffset(facing);
    const bOffset = [-fOffset[0], 0, -fOffset[2]];

    const frontNeighbor = neighborGetter(fOffset[0], fOffset[1], fOffset[2]);
    const backNeighbor = neighborGetter(bOffset[0], bOffset[1], bOffset[2]);

    // Check front neighbor for inner corners
    if (frontNeighbor && BlockShapeResolver.isStairs(frontNeighbor.blockType) && frontNeighbor.half === half) {
      if (BlockShapeResolver.isPerpendicular(facing, frontNeighbor.facing)) {
        const rel = BlockShapeResolver.getRelativeTurn(facing, frontNeighbor.facing);
        if (rel === 'left') return 'inner_left';
        if (rel === 'right') return 'inner_right';
      }
    }

    // Check back neighbor for outer corners
    if (backNeighbor && BlockShapeResolver.isStairs(backNeighbor.blockType) && backNeighbor.half === half) {
      if (BlockShapeResolver.isPerpendicular(facing, backNeighbor.facing)) {
        const rel = BlockShapeResolver.getRelativeTurn(facing, backNeighbor.facing);
        if (rel === 'left') return 'outer_left';
        if (rel === 'right') return 'outer_right';
      }
    }

    return 'straight';
  }

  // Resolve fence / wall connections with 4 cardinal neighbors
  public static resolveFenceConnections(
    blockType: BlockType,
    neighborGetter: (dx: number, dy: number, dz: number) => BlockState | null
  ): BlockConnections {
    const isConnectable = (neighbor: BlockState | null): boolean => {
      if (!neighbor || neighbor.blockType === BlockType.AIR) return false;
      if (BlockShapeResolver.isFence(neighbor.blockType)) return true;
      if (neighbor.blockType === BlockType.LEY_CONDUIT && blockType === BlockType.LEY_CONDUIT) return true;
      if (BlockShapeResolver.isSolidForCollision(neighbor.blockType, neighbor)) {
        const def = BLOCK_DEFS[neighbor.blockType];
        if (def && def.shape === 'full') return true;
      }
      return false;
    };

    const north = isConnectable(neighborGetter(0, 0, -1));
    const south = isConnectable(neighborGetter(0, 0, 1));
    const east = isConnectable(neighborGetter(1, 0, 0));
    const west = isConnectable(neighborGetter(-1, 0, 0));

    return { north, south, east, west, up: false, down: false };
  }

  // Canonical alias for resolveNeighborConnections
  public static resolveNeighborConnections(
    worldOrBlockType: any,
    xOrGetter: any,
    y?: number,
    z?: number,
    blockType?: BlockType
  ): any {
    if (typeof xOrGetter === 'function') {
      return BlockShapeResolver.resolveFenceConnections(worldOrBlockType, xOrGetter);
    }
    const world = worldOrBlockType;
    const x = xOrGetter;
    const bType = blockType ?? (typeof z === 'number' && typeof y === 'number' ? world.getBlock(x, y, z) : BlockType.FENCE_WOOD);
    const neighborGetter = (dx: number, dy: number, dz: number) => {
      const b = world.getBlock(x + dx, y! + dy, z! + dz);
      if (b === BlockType.AIR) return null;
      return world.getBlockState(x + dx, y! + dy, z! + dz);
    };
    const connections = BlockShapeResolver.resolveFenceConnections(bType, neighborGetter);
    const state: BlockState = {
      ...BlockShapeResolver.getDefaultState(bType),
      connections,
    };
    return Object.assign(state, connections);
  }

  // Check if block type is solid for collision
  public static isSolidForCollision(blockType: BlockType, state?: BlockState): boolean {
    const def = BLOCK_DEFS[blockType];
    if (!def) return false;
    if (BlockShapeResolver.isDoor(blockType) || BlockShapeResolver.isTrapdoor(blockType)) {
      return state ? !state.open : true;
    }
    return Boolean(def.solid);
  }

  // Single Canonical Source of Truth for Collision Boxes
  public static getCollisionBoxes(blockType: BlockType, state?: BlockState): BlockAABB[] {
    const def = BLOCK_DEFS[blockType];
    if (!def) return [];
    if (def.solid === false && !BlockShapeResolver.isDoor(blockType) && !BlockShapeResolver.isTrapdoor(blockType)) {
      // Non-solid blocks have zero collision
      return [];
    }

    const s = state ?? BlockStateUtils.createDefaultState(blockType);

    // 1. Slabs
    if (BlockShapeResolver.isSlab(blockType)) {
      if (s.customData?.double) {
        return [{ minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 }];
      }
      if (blockType === BlockType.BATIK_CARPET_BLOCK) {
        return [{ minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 0.0625, maxZ: 1 }];
      }
      if (blockType === BlockType.FARMLAND) {
        return [{ minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 0.9375, maxZ: 1 }];
      }
      if (blockType === BlockType.BED_FOOT || blockType === BlockType.BED_HEAD) {
        return [{ minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 0.5625, maxZ: 1 }];
      }
      if (s.half === 'top') {
        return [{ minX: 0, minY: 0.5, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 }];
      }
      return [{ minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 0.5, maxZ: 1 }];
    }

    // 2. Stairs
    if (BlockShapeResolver.isStairs(blockType)) {
      const boxes: BlockAABB[] = [];
      const isTop = s.half === 'top';
      const baseMinY = isTop ? 0.5 : 0;
      const baseMaxY = isTop ? 1.0 : 0.5;
      const stepMinY = isTop ? 0 : 0.5;
      const stepMaxY = isTop ? 0.5 : 1.0;

      // Base slab
      boxes.push({ minX: 0, minY: baseMinY, minZ: 0, maxX: 1, maxY: baseMaxY, maxZ: 1 });

      // Step part based on facing and shape
      const f = s.facing;
      const sh = s.shape;

      if (sh === 'straight') {
        switch (f) {
          case 'north':
            boxes.push({ minX: 0, minY: stepMinY, minZ: 0, maxX: 1, maxY: stepMaxY, maxZ: 0.5 });
            break;
          case 'south':
            boxes.push({ minX: 0, minY: stepMinY, minZ: 0.5, maxX: 1, maxY: stepMaxY, maxZ: 1 });
            break;
          case 'west':
            boxes.push({ minX: 0, minY: stepMinY, minZ: 0, maxX: 0.5, maxY: stepMaxY, maxZ: 1 });
            break;
          case 'east':
          default:
            boxes.push({ minX: 0.5, minY: stepMinY, minZ: 0, maxX: 1, maxY: stepMaxY, maxZ: 1 });
            break;
        }
      } else if (sh === 'inner_left' || sh === 'inner_right') {
        // Inner corner has 3 quarters
        switch (f) {
          case 'north':
            boxes.push({ minX: 0, minY: stepMinY, minZ: 0, maxX: 1, maxY: stepMaxY, maxZ: 0.5 });
            if (sh === 'inner_left') {
              boxes.push({ minX: 0, minY: stepMinY, minZ: 0.5, maxX: 0.5, maxY: stepMaxY, maxZ: 1 });
            } else {
              boxes.push({ minX: 0.5, minY: stepMinY, minZ: 0.5, maxX: 1, maxY: stepMaxY, maxZ: 1 });
            }
            break;
          case 'south':
            boxes.push({ minX: 0, minY: stepMinY, minZ: 0.5, maxX: 1, maxY: stepMaxY, maxZ: 1 });
            if (sh === 'inner_left') {
              boxes.push({ minX: 0.5, minY: stepMinY, minZ: 0, maxX: 1, maxY: stepMaxY, maxZ: 0.5 });
            } else {
              boxes.push({ minX: 0, minY: stepMinY, minZ: 0, maxX: 0.5, maxY: stepMaxY, maxZ: 0.5 });
            }
            break;
          case 'west':
            boxes.push({ minX: 0, minY: stepMinY, minZ: 0, maxX: 0.5, maxY: stepMaxY, maxZ: 1 });
            if (sh === 'inner_left') {
              boxes.push({ minX: 0.5, minY: stepMinY, minZ: 0.5, maxX: 1, maxY: stepMaxY, maxZ: 1 });
            } else {
              boxes.push({ minX: 0.5, minY: stepMinY, minZ: 0, maxX: 1, maxY: stepMaxY, maxZ: 0.5 });
            }
            break;
          case 'east':
          default:
            boxes.push({ minX: 0.5, minY: stepMinY, minZ: 0, maxX: 1, maxY: stepMaxY, maxZ: 1 });
            if (sh === 'inner_left') {
              boxes.push({ minX: 0, minY: stepMinY, minZ: 0, maxX: 0.5, maxY: stepMaxY, maxZ: 0.5 });
            } else {
              boxes.push({ minX: 0, minY: stepMinY, minZ: 0.5, maxX: 0.5, maxY: stepMaxY, maxZ: 1 });
            }
            break;
        }
      } else if (sh === 'outer_left' || sh === 'outer_right') {
        // Outer corner has 1 quarter
        switch (f) {
          case 'north':
            if (sh === 'outer_left') {
              boxes.push({ minX: 0, minY: stepMinY, minZ: 0, maxX: 0.5, maxY: stepMaxY, maxZ: 0.5 });
            } else {
              boxes.push({ minX: 0.5, minY: stepMinY, minZ: 0, maxX: 1, maxY: stepMaxY, maxZ: 0.5 });
            }
            break;
          case 'south':
            if (sh === 'outer_left') {
              boxes.push({ minX: 0.5, minY: stepMinY, minZ: 0.5, maxX: 1, maxY: stepMaxY, maxZ: 1 });
            } else {
              boxes.push({ minX: 0, minY: stepMinY, minZ: 0.5, maxX: 0.5, maxY: stepMaxY, maxZ: 1 });
            }
            break;
          case 'west':
            if (sh === 'outer_left') {
              boxes.push({ minX: 0, minY: stepMinY, minZ: 0.5, maxX: 0.5, maxY: stepMaxY, maxZ: 1 });
            } else {
              boxes.push({ minX: 0, minY: stepMinY, minZ: 0, maxX: 0.5, maxY: stepMaxY, maxZ: 0.5 });
            }
            break;
          case 'east':
          default:
            if (sh === 'outer_left') {
              boxes.push({ minX: 0.5, minY: stepMinY, minZ: 0, maxX: 1, maxY: stepMaxY, maxZ: 0.5 });
            } else {
              boxes.push({ minX: 0.5, minY: stepMinY, minZ: 0.5, maxX: 1, maxY: stepMaxY, maxZ: 1 });
            }
            break;
        }
      }

      return boxes;
    }

    // 3. Doors
    if (BlockShapeResolver.isDoor(blockType)) {
      if (s.open) {
        // When open, door swings parallel to wall against hinge
        const thickness = 0.1875;
        if (s.facing === 'north' || s.facing === 'south') {
          if (s.hinge === 'left') {
            return [{ minX: 0, minY: 0, minZ: 0, maxX: thickness, maxY: 1, maxZ: 1 }];
          } else {
            return [{ minX: 1 - thickness, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 }];
          }
        } else {
          if (s.hinge === 'left') {
            return [{ minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: thickness }];
          } else {
            return [{ minX: 0, minY: 0, minZ: 1 - thickness, maxX: 1, maxY: 1, maxZ: 1 }];
          }
        }
      } else {
        // Closed door
        const thickness = 0.1875;
        switch (s.facing) {
          case 'north':
            return [{ minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: thickness }];
          case 'south':
            return [{ minX: 0, minY: 0, minZ: 1 - thickness, maxX: 1, maxY: 1, maxZ: 1 }];
          case 'west':
            return [{ minX: 0, minY: 0, minZ: 0, maxX: thickness, maxY: 1, maxZ: 1 }];
          case 'east':
          default:
            return [{ minX: 1 - thickness, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 }];
        }
      }
    }

    // 4. Trapdoors / Shutters
    if (BlockShapeResolver.isTrapdoor(blockType)) {
      if (s.open) {
        return [];
      }
      const thickness = 0.1875;
      const isTop = s.half === 'top';
      const minY = isTop ? 1 - thickness : 0;
      const maxY = isTop ? 1 : thickness;
      return [{ minX: 0, minY, minZ: 0, maxX: 1, maxY, maxZ: 1 }];
    }

    // 5. Fences
    if (BlockShapeResolver.isFence(blockType)) {
      const boxes: BlockAABB[] = [];
      const postHeight = 1.5; // 1.5 height prevents entities from hopping over fences without jump buffs
      // Center post
      boxes.push({ minX: 0.375, minY: 0, minZ: 0.375, maxX: 0.625, maxY: postHeight, maxZ: 0.625 });

      const c = s.connections;
      if (c.north) boxes.push({ minX: 0.375, minY: 0, minZ: 0, maxX: 0.625, maxY: postHeight, maxZ: 0.375 });
      if (c.south) boxes.push({ minX: 0.375, minY: 0, minZ: 0.625, maxX: 0.625, maxY: postHeight, maxZ: 1 });
      if (c.east) boxes.push({ minX: 0.625, minY: 0, minZ: 0.375, maxX: 1, maxY: postHeight, maxZ: 0.625 });
      if (c.west) boxes.push({ minX: 0, minY: 0, minZ: 0.375, maxX: 0.375, maxY: postHeight, maxZ: 0.625 });

      return boxes;
    }

    // 5. Default full solid cube
    return [{ minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 }];
  }

  // Single Canonical Source of Truth for Selection / Outline Boxes
  public static getSelectionBoxes(blockType: BlockType, state?: BlockState): BlockAABB[] {
    const def = BLOCK_DEFS[blockType];
    if (!def) return [{ minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 }];

    const s = state ?? BlockStateUtils.createDefaultState(blockType);

    // Torches & lanterns
    if (def.shape === 'torch') {
      if (s.facing === 'up') {
        return [{ minX: 0.375, minY: 0, minZ: 0.375, maxX: 0.625, maxY: 0.625, maxZ: 0.625 }];
      } else if (s.facing === 'north') {
        return [{ minX: 0.375, minY: 0.2, minZ: 0.7, maxX: 0.625, maxY: 0.8, maxZ: 1 }];
      } else if (s.facing === 'south') {
        return [{ minX: 0.375, minY: 0.2, minZ: 0, maxX: 0.625, maxY: 0.8, maxZ: 0.3 }];
      } else if (s.facing === 'west') {
        return [{ minX: 0.7, minY: 0.2, minZ: 0.375, maxX: 1, maxY: 0.8, maxZ: 0.625 }];
      } else if (s.facing === 'east') {
        return [{ minX: 0, minY: 0.2, minZ: 0.375, maxX: 0.3, maxY: 0.8, maxZ: 0.625 }];
      }
    }

    // Cross foliage / crops
    if (def.shape === 'cross') {
      return [{ minX: 0.125, minY: 0, minZ: 0.125, maxX: 0.875, maxY: 0.875, maxZ: 0.875 }];
    }

    // Fences (1.0 height for selection outline)
    if (BlockShapeResolver.isFence(blockType)) {
      const boxes: BlockAABB[] = [];
      boxes.push({ minX: 0.375, minY: 0, minZ: 0.375, maxX: 0.625, maxY: 1.0, maxZ: 0.625 });
      const c = s.connections;
      if (c.north) boxes.push({ minX: 0.375, minY: 0, minZ: 0, maxX: 0.625, maxY: 1.0, maxZ: 0.375 });
      if (c.south) boxes.push({ minX: 0.375, minY: 0, minZ: 0.625, maxX: 0.625, maxY: 1.0, maxZ: 1 });
      if (c.east) boxes.push({ minX: 0.625, minY: 0, minZ: 0.375, maxX: 1, maxY: 1.0, maxZ: 0.625 });
      if (c.west) boxes.push({ minX: 0, minY: 0, minZ: 0.375, maxX: 0.375, maxY: 1.0, maxZ: 0.625 });
      return boxes;
    }

    // For other solid blocks, selection matches collision
    return BlockShapeResolver.getCollisionBoxes(blockType, state);
  }

  // Get standing surface height for Pathfinder & Entity Navigation
  public static getStandHeight(blockType: BlockType, state?: BlockState): number {
    if (blockType === BlockType.AIR) return 0;
    const s = state ?? BlockStateUtils.createDefaultState(blockType);
    if (BlockShapeResolver.isSlab(blockType)) {
      if (s.customData?.double) return 1.0;
      if (s.half === 'top') return 1.0;
      return 0.5;
    }
    if (BlockShapeResolver.isStairs(blockType)) {
      return s.half === 'top' ? 1.0 : 0.5;
    }
    if (BlockShapeResolver.isFence(blockType)) {
      return 1.5;
    }
    const def = BLOCK_DEFS[blockType];
    return def?.solid ? 1.0 : 0.0;
  }

  // Single Canonical Source of Truth for Render Geometry Quads
  public static getRenderQuads(
    blockType: BlockType,
    state: BlockState,
    isNeighborSolid: (face: Direction6) => boolean
  ): RenderQuad[] {
    const quads: RenderQuad[] = [];
    const def = BLOCK_DEFS[blockType];
    if (!def) return quads;

    // Helper to generate a full box face
    const addBoxFaces = (box: BlockAABB, colors?: { top?: 'top'; bottom?: 'bottom'; side?: 'side' }) => {
      const { minX: x0, minY: y0, minZ: z0, maxX: x1, maxY: y1, maxZ: z1 } = box;

      // Top (+Y)
      if (y1 < 1 || !isNeighborSolid('up')) {
        quads.push({
          positions: [
            [x0, y1, z1],
            [x1, y1, z1],
            [x1, y1, z0],
            [x0, y1, z0],
          ],
          normal: [0, 1, 0],
          uvs: [[x0, z1], [x1, z1], [x1, z0], [x0, z0]],
          faceType: 'top',
          colorType: colors?.top ?? 'top',
          cullsNeighborFace: y1 === 1 && x0 === 0 && x1 === 1 && z0 === 0 && z1 === 1 ? 'up' : undefined,
        });
      }

      // Bottom (-Y)
      if (y0 > 0 || !isNeighborSolid('down')) {
        quads.push({
          positions: [
            [x0, y0, z0],
            [x1, y0, z0],
            [x1, y0, z1],
            [x0, y0, z1],
          ],
          normal: [0, -1, 0],
          uvs: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]],
          faceType: 'bottom',
          colorType: colors?.bottom ?? 'bottom',
          cullsNeighborFace: y0 === 0 && x0 === 0 && x1 === 1 && z0 === 0 && z1 === 1 ? 'down' : undefined,
        });
      }

      // North (-Z)
      if (z0 > 0 || !isNeighborSolid('north')) {
        quads.push({
          positions: [
            [x1, y0, z0],
            [x0, y0, z0],
            [x0, y1, z0],
            [x1, y1, z0],
          ],
          normal: [0, 0, -1],
          uvs: [[x1, y0], [x0, y0], [x0, y1], [x1, y1]],
          faceType: 'north',
          colorType: colors?.side ?? 'side',
          cullsNeighborFace: z0 === 0 && x0 === 0 && x1 === 1 && y0 === 0 && y1 === 1 ? 'north' : undefined,
        });
      }

      // South (+Z)
      if (z1 < 1 || !isNeighborSolid('south')) {
        quads.push({
          positions: [
            [x0, y0, z1],
            [x1, y0, z1],
            [x1, y1, z1],
            [x0, y1, z1],
          ],
          normal: [0, 0, 1],
          uvs: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]],
          faceType: 'south',
          colorType: colors?.side ?? 'side',
          cullsNeighborFace: z1 === 1 && x0 === 0 && x1 === 1 && y0 === 0 && y1 === 1 ? 'south' : undefined,
        });
      }

      // West (-X)
      if (x0 > 0 || !isNeighborSolid('west')) {
        quads.push({
          positions: [
            [x0, y0, z0],
            [x0, y0, z1],
            [x0, y1, z1],
            [x0, y1, z0],
          ],
          normal: [-1, 0, 0],
          uvs: [[z0, y0], [z1, y0], [z1, y1], [z0, y1]],
          faceType: 'west',
          colorType: colors?.side ?? 'side',
          cullsNeighborFace: x0 === 0 && y0 === 0 && y1 === 1 && z0 === 0 && z1 === 1 ? 'west' : undefined,
        });
      }

      // East (+X)
      if (x1 < 1 || !isNeighborSolid('east')) {
        quads.push({
          positions: [
            [x1, y0, z1],
            [x1, y0, z0],
            [x1, y1, z0],
            [x1, y1, z1],
          ],
          normal: [1, 0, 0],
          uvs: [[z1, y0], [z0, y0], [z0, y1], [z1, y1]],
          faceType: 'east',
          colorType: colors?.side ?? 'side',
          cullsNeighborFace: x1 === 1 && y0 === 0 && y1 === 1 && z0 === 0 && z1 === 1 ? 'east' : undefined,
        });
      }
    };

    // Cross foliage (grass, flowers, crops)
    if (def.shape === 'cross') {
      // Diagonal 1: (0,0,0) to (1,1,1)
      quads.push({
        positions: [
          [0.1, 0, 0.1],
          [0.9, 0, 0.9],
          [0.9, 1, 0.9],
          [0.1, 1, 0.1],
        ],
        normal: [0.707, 0, -0.707],
        uvs: [[0, 0], [1, 0], [1, 1], [0, 1]],
        faceType: 'top',
      });
      quads.push({
        positions: [
          [0.9, 0, 0.9],
          [0.1, 0, 0.1],
          [0.1, 1, 0.1],
          [0.9, 1, 0.9],
        ],
        normal: [-0.707, 0, 0.707],
        uvs: [[1, 0], [0, 0], [0, 1], [1, 1]],
        faceType: 'top',
      });

      // Diagonal 2: (0,0,1) to (1,0,0)
      quads.push({
        positions: [
          [0.1, 0, 0.9],
          [0.9, 0, 0.1],
          [0.9, 1, 0.1],
          [0.1, 1, 0.9],
        ],
        normal: [0.707, 0, 0.707],
        uvs: [[0, 0], [1, 0], [1, 1], [0, 1]],
        faceType: 'top',
      });
      quads.push({
        positions: [
          [0.9, 0, 0.1],
          [0.1, 0, 0.9],
          [0.1, 1, 0.9],
          [0.9, 1, 0.1],
        ],
        normal: [-0.707, 0, -0.707],
        uvs: [[1, 0], [0, 0], [0, 1], [1, 1]],
        faceType: 'top',
      });
      return quads;
    }

    // Get all geometric collision/shape boxes and construct precise rendered geometry
    const boxes = BlockShapeResolver.getCollisionBoxes(blockType, state);
    for (const box of boxes) {
      addBoxFaces(box);
    }

    return quads;
  }

  // Directional math utilities
  public static getDirectionOffset(dir: Direction6): [number, number, number] {
    switch (dir) {
      case 'north':
        return [0, 0, -1];
      case 'south':
        return [0, 0, 1];
      case 'east':
        return [1, 0, 0];
      case 'west':
        return [-1, 0, 0];
      case 'up':
        return [0, 1, 0];
      case 'down':
        return [0, -1, 0];
    }
  }

  public static getRelativeDirection(dir: Direction4, rel: 'left' | 'right' | 'opposite'): Direction4 {
    const order: Direction4[] = ['north', 'east', 'south', 'west'];
    const idx = order.indexOf(dir);
    if (rel === 'left') return order[(idx + 3) % 4];
    if (rel === 'right') return order[(idx + 1) % 4];
    return order[(idx + 2) % 4];
  }

  public static isPerpendicular(a: Direction6, b: Direction6): boolean {
    if ((a === 'north' || a === 'south') && (b === 'east' || b === 'west')) return true;
    if ((a === 'east' || a === 'west') && (b === 'north' || b === 'south')) return true;
    return false;
  }

  public static getRelativeTurn(base: Direction6, target: Direction6): 'left' | 'right' | 'none' {
    if (base === 'north') return target === 'west' ? 'left' : target === 'east' ? 'right' : 'none';
    if (base === 'south') return target === 'east' ? 'left' : target === 'west' ? 'right' : 'none';
    if (base === 'east') return target === 'north' ? 'left' : target === 'south' ? 'right' : 'none';
    if (base === 'west') return target === 'south' ? 'left' : target === 'north' ? 'right' : 'none';
    return 'none';
  }
}
