// Canonical BlockState & Structure Transformation System
import { BlockType } from '../../types';
import {
  BlockAxis,
  BlockConnections,
  BlockState,
  BlockStateUtils,
  Direction4,
  Direction6,
  DoorHinge,
  Rotation90,
  StairsShape,
} from './BlockState';

export class BlockStateTransform {
  // Clockwise 90-deg rotation mapping
  private static readonly ROTATE_90_FACING: Record<Direction6, Direction6> = {
    north: 'east',
    east: 'south',
    south: 'west',
    west: 'north',
    up: 'up',
    down: 'down',
  };

  private static readonly MIRROR_X_FACING: Record<Direction6, Direction6> = {
    north: 'north',
    south: 'south',
    east: 'west',
    west: 'east',
    up: 'up',
    down: 'down',
  };

  private static readonly MIRROR_Z_FACING: Record<Direction6, Direction6> = {
    north: 'south',
    south: 'north',
    east: 'east',
    west: 'west',
    up: 'up',
    down: 'down',
  };

  public static rotateFacing(facing: Direction6, rotation: Rotation90): Direction6 {
    const steps = ((rotation % 360) + 360) % 360 / 90;
    let current = facing;
    for (let i = 0; i < steps; i++) {
      current = BlockStateTransform.ROTATE_90_FACING[current];
    }
    return current;
  }

  public static rotateAxis(axis: BlockAxis, rotation: Rotation90): BlockAxis {
    const steps = ((rotation % 360) + 360) % 360 / 90;
    if (steps % 2 === 1) {
      if (axis === 'x') return 'z';
      if (axis === 'z') return 'x';
    }
    return axis;
  }

  public static rotateConnections(conn: BlockConnections, rotation: Rotation90): BlockConnections {
    const steps = ((rotation % 360) + 360) % 360 / 90;
    let current = { ...conn };
    for (let i = 0; i < steps; i++) {
      current = {
        north: current.west,
        east: current.north,
        south: current.east,
        west: current.south,
        up: current.up,
        down: current.down,
      };
    }
    return current;
  }

  public static rotate(state: BlockState, rotation: Rotation90): BlockState {
    if (rotation === 0) return BlockStateUtils.clone(state);

    const rotatedFacing = BlockStateTransform.rotateFacing(state.facing, rotation);
    const rotatedAxis = BlockStateTransform.rotateAxis(state.axis, rotation);
    const rotatedConn = BlockStateTransform.rotateConnections(state.connections, rotation);

    const res = {
      ...state,
      facing: rotatedFacing,
      axis: rotatedAxis,
      connections: rotatedConn,
    };
    return Object.assign(res, rotatedConn);
  }

  public static mirrorFacing(facing: Direction6, mirrorAxis: 'x' | 'z'): Direction6 {
    return mirrorAxis === 'x'
      ? BlockStateTransform.MIRROR_X_FACING[facing]
      : BlockStateTransform.MIRROR_Z_FACING[facing];
  }

  public static mirrorHinge(hinge: DoorHinge): DoorHinge {
    return hinge === 'left' ? 'right' : 'left';
  }

  public static mirrorStairsShape(shape: StairsShape): StairsShape {
    switch (shape) {
      case 'inner_left':
        return 'inner_right';
      case 'inner_right':
        return 'inner_left';
      case 'outer_left':
        return 'outer_right';
      case 'outer_right':
        return 'outer_left';
      default:
        return shape;
    }
  }

  public static mirrorConnections(conn: BlockConnections, mirrorAxis: 'x' | 'z'): BlockConnections {
    if (mirrorAxis === 'x') {
      return {
        ...conn,
        east: conn.west,
        west: conn.east,
      };
    } else {
      return {
        ...conn,
        north: conn.south,
        south: conn.north,
      };
    }
  }

  public static mirror(state: BlockState, mirrorAxis: 'x' | 'z'): BlockState {
    const mirroredFacing = BlockStateTransform.mirrorFacing(state.facing, mirrorAxis);
    const mirroredHinge = BlockStateTransform.mirrorHinge(state.hinge);
    const mirroredShape = BlockStateTransform.mirrorStairsShape(state.shape);
    const mirroredConn = BlockStateTransform.mirrorConnections(state.connections, mirrorAxis);

    return {
      ...state,
      facing: mirroredFacing,
      hinge: mirroredHinge,
      shape: mirroredShape,
      connections: mirroredConn,
    };
  }

  public static invertFacing(facing: Direction6): Direction6 {
    switch (facing) {
      case 'north': return 'south';
      case 'south': return 'north';
      case 'east': return 'west';
      case 'west': return 'east';
      case 'up': return 'down';
      case 'down': return 'up';
    }
  }

  public static rotateState(blockType: BlockType, state: BlockState, rotation: Rotation90): BlockState {
    return BlockStateTransform.rotate(state, rotation);
  }

  public static mirrorState(blockType: BlockType, state: BlockState, mirrorAxis: 'x' | 'z'): BlockState {
    return BlockStateTransform.mirror(state, mirrorAxis);
  }

  // Rotate a 3D coordinate around an integer center point
  public static rotatePosition(
    pos: [number, number, number],
    center: [number, number, number],
    rotation: Rotation90
  ): [number, number, number] {
    const dx = pos[0] - center[0];
    const dy = pos[1] - center[1];
    const dz = pos[2] - center[2];

    const steps = ((rotation % 360) + 360) % 360 / 90;
    let rdx = dx;
    let rdz = dz;

    for (let i = 0; i < steps; i++) {
      const prevX = rdx;
      rdx = -rdz;
      rdz = prevX;
    }

    return [Math.round(center[0] + rdx), Math.round(center[1] + dy), Math.round(center[2] + rdz)];
  }

  // Mirror a 3D coordinate across an axis relative to a center point
  public static mirrorPosition(
    pos: [number, number, number],
    center: [number, number, number],
    mirrorAxis: 'x' | 'z'
  ): [number, number, number] {
    const dx = pos[0] - center[0];
    const dy = pos[1] - center[1];
    const dz = pos[2] - center[2];

    if (mirrorAxis === 'x') {
      return [Math.round(center[0] - dx), Math.round(center[1] + dy), Math.round(center[2] + dz)];
    } else {
      return [Math.round(center[0] + dx), Math.round(center[1] + dy), Math.round(center[2] - dz)];
    }
  }

  // Rotate an entire list of structural blocks & their states
  public static rotateStructure<T extends { pos: [number, number, number]; blockType: BlockType; state?: BlockState }>(
    blocks: T[],
    rotation: Rotation90,
    customCenter?: [number, number, number]
  ): T[] {
    if (blocks.length === 0 || rotation === 0) return blocks.map((b) => ({ ...b, state: b.state ? BlockStateUtils.clone(b.state) : undefined }));

    let center = customCenter;
    if (!center) {
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (const b of blocks) {
        minX = Math.min(minX, b.pos[0]);
        minY = Math.min(minY, b.pos[1]);
        minZ = Math.min(minZ, b.pos[2]);
        maxX = Math.max(maxX, b.pos[0]);
        maxY = Math.max(maxY, b.pos[1]);
        maxZ = Math.max(maxZ, b.pos[2]);
      }
      center = [Math.floor((minX + maxX) / 2), Math.floor((minY + maxY) / 2), Math.floor((minZ + maxZ) / 2)];
    }

    return blocks.map((b) => {
      const newPos = BlockStateTransform.rotatePosition(b.pos, center!, rotation);
      const rawState = b.state ?? BlockStateUtils.createDefaultState(b.blockType);
      const newState = BlockStateTransform.rotate(rawState, rotation);
      return {
        ...b,
        pos: newPos,
        state: newState,
      };
    });
  }

  // Mirror an entire list of structural blocks & their states
  public static mirrorStructure<T extends { pos: [number, number, number]; blockType: BlockType; state?: BlockState }>(
    blocks: T[],
    mirrorAxis: 'x' | 'z',
    customCenter?: [number, number, number]
  ): T[] {
    if (blocks.length === 0) return [];

    let center = customCenter;
    if (!center) {
      let minX = Infinity, minY = Infinity, minZ = Infinity;
      let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (const b of blocks) {
        minX = Math.min(minX, b.pos[0]);
        minY = Math.min(minY, b.pos[1]);
        minZ = Math.min(minZ, b.pos[2]);
        maxX = Math.max(maxX, b.pos[0]);
        maxY = Math.max(maxY, b.pos[1]);
        maxZ = Math.max(maxZ, b.pos[2]);
      }
      center = [Math.floor((minX + maxX) / 2), Math.floor((minY + maxY) / 2), Math.floor((minZ + maxZ) / 2)];
    }

    return blocks.map((b) => {
      const newPos = BlockStateTransform.mirrorPosition(b.pos, center!, mirrorAxis);
      const rawState = b.state ?? BlockStateUtils.createDefaultState(b.blockType);
      const newState = BlockStateTransform.mirror(rawState, mirrorAxis);
      return {
        ...b,
        pos: newPos,
        state: newState,
      };
    });
  }
}
