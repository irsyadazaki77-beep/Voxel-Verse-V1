// Canonical BlockState Contract & Data Types
import { BlockType } from '../../types';

export type Direction4 = 'north' | 'south' | 'east' | 'west';
export type Direction6 = 'north' | 'south' | 'east' | 'west' | 'up' | 'down';
export type BlockAxis = 'x' | 'y' | 'z';
export type Half = 'bottom' | 'top';
export type StairsShape = 'straight' | 'inner_left' | 'inner_right' | 'outer_left' | 'outer_right';
export type DoorHinge = 'left' | 'right';
export type Rotation90 = 0 | 90 | 180 | 270;

export interface BlockConnections {
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
  up?: boolean;
  down?: boolean;
}

export interface BlockAABB {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export interface BlockState {
  blockType: BlockType;
  facing: Direction6;
  axis: BlockAxis;
  half: Half;
  open: boolean;
  hinge: DoorHinge;
  shape: StairsShape;
  connections: BlockConnections;
  powered: boolean;
  lit: boolean;
  extended: boolean;
  waterlogged: boolean;
  customData?: Record<string, any>;
  north?: boolean;
  south?: boolean;
  east?: boolean;
  west?: boolean;
  up?: boolean;
  down?: boolean;
}

export class BlockStateUtils {
  public static createDefaultState(blockType: BlockType, partial?: Partial<BlockState>): BlockState {
    const north = partial?.north ?? partial?.connections?.north ?? false;
    const south = partial?.south ?? partial?.connections?.south ?? false;
    const east = partial?.east ?? partial?.connections?.east ?? false;
    const west = partial?.west ?? partial?.connections?.west ?? false;
    const up = partial?.up ?? partial?.connections?.up ?? false;
    const down = partial?.down ?? partial?.connections?.down ?? false;

    return {
      blockType,
      facing: partial?.facing ?? 'north',
      axis: partial?.axis ?? 'y',
      half: partial?.half ?? 'bottom',
      open: partial?.open ?? false,
      hinge: partial?.hinge ?? 'left',
      shape: partial?.shape ?? 'straight',
      connections: partial?.connections ?? {
        north,
        south,
        east,
        west,
        up,
        down,
      },
      north,
      south,
      east,
      west,
      up,
      down,
      powered: partial?.powered ?? false,
      lit: partial?.lit ?? false,
      extended: partial?.extended ?? false,
      waterlogged: partial?.waterlogged ?? false,
      ...(partial?.customData ? { customData: { ...partial.customData } } : {}),
    };
  }

  public static clone(state: BlockState): BlockState {
    return {
      ...state,
      connections: { ...state.connections },
      customData: state.customData ? { ...state.customData } : undefined,
    };
  }

  public static equals(a: BlockState, b: BlockState): boolean {
    if (a.blockType !== b.blockType) return false;
    if (a.facing !== b.facing) return false;
    if (a.axis !== b.axis) return false;
    if (a.half !== b.half) return false;
    if (a.open !== b.open) return false;
    if (a.hinge !== b.hinge) return false;
    if (a.shape !== b.shape) return false;
    if (a.powered !== b.powered) return false;
    if (a.lit !== b.lit) return false;
    if (a.extended !== b.extended) return false;
    if (a.waterlogged !== b.waterlogged) return false;
    if (
      a.connections.north !== b.connections.north ||
      a.connections.south !== b.connections.south ||
      a.connections.east !== b.connections.east ||
      a.connections.west !== b.connections.west ||
      Boolean(a.connections.up) !== Boolean(b.connections.up) ||
      Boolean(a.connections.down) !== Boolean(b.connections.down)
    ) {
      return false;
    }
    return true;
  }

  // Compact JSON/object serialization for network & save storage
  public static serialize(state: BlockState): Record<string, any> {
    const out: Record<string, any> = { t: state.blockType };
    if (state.facing !== 'north') out.f = state.facing;
    if (state.axis !== 'y') out.ax = state.axis;
    if (state.half !== 'bottom') out.h = state.half;
    if (state.open) out.o = 1;
    if (state.hinge !== 'left') out.hg = state.hinge;
    if (state.shape !== 'straight') out.s = state.shape;
    if (state.powered) out.p = 1;
    if (state.lit) out.l = 1;
    if (state.extended) out.ex = 1;
    if (state.waterlogged) out.w = 1;

    const c = state.connections;
    if (c.north || c.south || c.east || c.west || c.up || c.down) {
      out.c = {
        n: c.north ? 1 : 0,
        s: c.south ? 1 : 0,
        e: c.east ? 1 : 0,
        w: c.west ? 1 : 0,
        ...(c.up ? { u: 1 } : {}),
        ...(c.down ? { d: 1 } : {}),
      };
    }
    if (state.customData && Object.keys(state.customData).length > 0) {
      out.cd = state.customData;
    }
    return out;
  }

  // Safe deserialization handling raw numbers (legacy block IDs), partial objects, or serialized records
  public static deserialize(data: any, fallbackType: BlockType = BlockType.AIR): BlockState {
    if (typeof data === 'number') {
      return BlockStateUtils.createDefaultState(data as BlockType);
    }
    if (!data || typeof data !== 'object') {
      return BlockStateUtils.createDefaultState(fallbackType);
    }

    // Check if serialized compact format or full BlockState
    const bType = (data.t ?? data.blockType ?? fallbackType) as BlockType;
    const facing = (data.f ?? data.facing ?? 'north') as Direction6;
    const axis = (data.ax ?? data.axis ?? 'y') as BlockAxis;
    const half = (data.h ?? data.half ?? 'bottom') as Half;
    const open = Boolean(data.o ?? data.open ?? false);
    const hinge = (data.hg ?? data.hinge ?? 'left') as DoorHinge;
    const shape = (data.s ?? data.shape ?? 'straight') as StairsShape;
    const powered = Boolean(data.p ?? data.powered ?? false);
    const lit = Boolean(data.l ?? data.lit ?? false);
    const extended = Boolean(data.ex ?? data.extended ?? false);
    const waterlogged = Boolean(data.w ?? data.waterlogged ?? false);

    let connections: BlockConnections = { north: false, south: false, east: false, west: false, up: false, down: false };
    if (data.c) {
      connections = {
        north: Boolean(data.c.n ?? data.c.north),
        south: Boolean(data.c.s ?? data.c.south),
        east: Boolean(data.c.e ?? data.c.east),
        west: Boolean(data.c.w ?? data.c.west),
        up: Boolean(data.c.u ?? data.c.up),
        down: Boolean(data.c.d ?? data.c.down),
      };
    } else if (data.connections) {
      connections = {
        north: Boolean(data.connections.north),
        south: Boolean(data.connections.south),
        east: Boolean(data.connections.east),
        west: Boolean(data.connections.west),
        up: Boolean(data.connections.up),
        down: Boolean(data.connections.down),
      };
    }

    return {
      blockType: bType,
      facing,
      axis,
      half,
      open,
      hinge,
      shape,
      connections,
      powered,
      lit,
      extended,
      waterlogged,
      customData: data.cd ?? data.customData,
    };
  }
}
