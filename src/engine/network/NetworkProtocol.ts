// Typed Network Protocol Schema & Serialization Layer
export const PROTOCOL_VERSION = '1.0.0-phase9';

export type NetworkMessageType =
  | 'PLAYER_JOIN'
  | 'PLAYER_LEAVE'
  | 'INPUT_COMMAND'
  | 'TRANSFORM_SNAPSHOT'
  | 'BLOCK_CHANGE'
  | 'INVENTORY_ACTION'
  | 'DAMAGE_EVENT'
  | 'CHAT_MESSAGE'
  | 'ENTITY_SNAPSHOT'
  | 'SERVER_STATE_SNAPSHOT';

export interface BaseNetworkMessage {
  protocolVersion: string;
  type: NetworkMessageType;
  timestamp: number;
}

export interface PlayerJoinMessage extends BaseNetworkMessage {
  type: 'PLAYER_JOIN';
  sessionId: string;
  playerName: string;
  isHost: boolean;
  spawnPos: [number, number, number];
}

export interface PlayerLeaveMessage extends BaseNetworkMessage {
  type: 'PLAYER_LEAVE';
  sessionId: string;
  reason?: string;
}

export interface InputCommandMessage extends BaseNetworkMessage {
  type: 'INPUT_COMMAND';
  sessionId: string;
  sequence: number;
  moveVector: [number, number];
  buttons: Record<string, boolean>;
  yaw: number;
  pitch: number;
}

export interface TransformSnapshotMessage extends BaseNetworkMessage {
  type: 'TRANSFORM_SNAPSHOT';
  sessionId: string;
  position: [number, number, number];
  rotation: [number, number, number];
  velocity: [number, number, number];
  animState: 'idle' | 'walk' | 'run' | 'jump' | 'attack';
}

export interface BlockChangeMessage extends BaseNetworkMessage {
  type: 'BLOCK_CHANGE';
  x: number;
  y: number;
  z: number;
  oldBlockType: number;
  newBlockType: number;
  playerSessionId: string;
}

export interface InventoryActionMessage extends BaseNetworkMessage {
  type: 'INVENTORY_ACTION';
  sessionId: string;
  actionType: 'move' | 'swap' | 'craft' | 'drop';
  fromSlot: number;
  toSlot: number;
  itemId?: string;
  count: number;
}

export interface DamageEventMessage extends BaseNetworkMessage {
  type: 'DAMAGE_EVENT';
  attackerId: string;
  targetId: string;
  damageAmount: number;
  damageType: 'physical' | 'fire' | 'frost' | 'magic';
}

export interface ChatMessageMessage extends BaseNetworkMessage {
  type: 'CHAT_MESSAGE';
  senderId: string;
  senderName: string;
  text: string;
}

export interface EntitySnapshotMessage extends BaseNetworkMessage {
  type: 'ENTITY_SNAPSHOT';
  entities: Array<{
    id: string;
    type: string;
    position: [number, number, number];
    rotation: [number, number, number];
    health: number;
  }>;
}

export type NetworkMessagePayload =
  | PlayerJoinMessage
  | PlayerLeaveMessage
  | InputCommandMessage
  | TransformSnapshotMessage
  | BlockChangeMessage
  | InventoryActionMessage
  | DamageEventMessage
  | ChatMessageMessage
  | EntitySnapshotMessage;

export class NetworkSerializer {
  public static serialize(msg: NetworkMessagePayload): string {
    return JSON.stringify(msg);
  }

  public static deserialize(raw: string): NetworkMessagePayload | null {
    try {
      const parsed = JSON.parse(raw) as NetworkMessagePayload;
      if (parsed.protocolVersion !== PROTOCOL_VERSION) {
        console.warn(`[Network] Protocol mismatch. Local: ${PROTOCOL_VERSION}, Msg: ${parsed.protocolVersion}`);
      }
      return parsed;
    } catch (e) {
      console.error('[Network] Serialization error:', e);
      return null;
    }
  }
}
