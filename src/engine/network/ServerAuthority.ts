// Server Authority Validation Foundation
import {
  BlockChangeMessage,
  InventoryActionMessage,
  DamageEventMessage,
  InputCommandMessage,
} from './NetworkProtocol';
import {
  WORLD_MIN_Y,
  WORLD_MAX_Y,
  MAX_INTERACTION_REACH,
  MAX_COMBAT_REACH,
  MAX_BLOCK_TYPE_ID,
  MAX_PLAYER_SPEED,
} from '../world/WorldConfig';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export class ServerAuthority {
  public static readonly maxReachDistance = MAX_INTERACTION_REACH;
  public static readonly maxCombatReach = MAX_COMBAT_REACH;
  public static readonly maxPlayerSpeed = MAX_PLAYER_SPEED;

  public static validateBlockPlacement(
    playerPos: [number, number, number],
    x: number,
    y: number,
    z: number,
    oldBlockType: number,
    newBlockType: number,
    inventory?: Array<{ itemId: string; count: number } | null>,
    worldCurrentBlock?: number
  ): ValidationResult {
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) {
      return { valid: false, reason: 'COORDINATES_MUST_BE_INTEGERS' };
    }
    if (y < WORLD_MIN_Y || y >= WORLD_MAX_Y) {
      return { valid: false, reason: 'OUT_OF_WORLD_HEIGHT_BOUNDS' };
    }
    if (typeof newBlockType !== 'number' || newBlockType < 0 || newBlockType > MAX_BLOCK_TYPE_ID) {
      return { valid: false, reason: 'INVALID_BLOCK_ID' };
    }
    if (worldCurrentBlock !== undefined && worldCurrentBlock !== oldBlockType) {
      return { valid: false, reason: 'OLD_BLOCK_STATE_DESYNC' };
    }
    const dx = (x + 0.5) - playerPos[0];
    const dy = (y + 0.5) - playerPos[1];
    const dz = (z + 0.5) - playerPos[2];
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq > this.maxReachDistance * this.maxReachDistance) {
      return { valid: false, reason: 'EXCEEDS_MAX_REACH' };
    }
    if (inventory !== undefined && newBlockType !== 0) {
      const hasItem = inventory.some((slot) => slot && slot.count > 0);
      if (!hasItem) {
        return { valid: false, reason: 'ITEM_NOT_IN_INVENTORY' };
      }
    }
    return { valid: true };
  }

  public static validateBlockBreak(
    playerPos: [number, number, number],
    x: number,
    y: number,
    z: number,
    oldBlockType: number,
    worldCurrentBlock?: number
  ): ValidationResult {
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) {
      return { valid: false, reason: 'COORDINATES_MUST_BE_INTEGERS' };
    }
    if (y < WORLD_MIN_Y || y >= WORLD_MAX_Y) {
      return { valid: false, reason: 'OUT_OF_WORLD_HEIGHT_BOUNDS' };
    }
    if (worldCurrentBlock !== undefined && worldCurrentBlock !== oldBlockType) {
      return { valid: false, reason: 'OLD_BLOCK_STATE_DESYNC' };
    }
    const dx = (x + 0.5) - playerPos[0];
    const dy = (y + 0.5) - playerPos[1];
    const dz = (z + 0.5) - playerPos[2];
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq > this.maxReachDistance * this.maxReachDistance) {
      return { valid: false, reason: 'EXCEEDS_MAX_REACH' };
    }
    return { valid: true };
  }

  public static validateBlockChange(msg: BlockChangeMessage, playerPos: [number, number, number]): ValidationResult {
    // 1. Integer coordinates check
    if (!Number.isInteger(msg.x) || !Number.isInteger(msg.y) || !Number.isInteger(msg.z)) {
      return { valid: false, reason: 'Block coordinates must be integers' };
    }

    // 2. World height boundary check
    if (msg.y < WORLD_MIN_Y || msg.y >= WORLD_MAX_Y) {
      return { valid: false, reason: `Block Y out of world bounds [${WORLD_MIN_Y}, ${WORLD_MAX_Y})` };
    }

    // 3. Block ID range check
    if (typeof msg.newBlockType !== 'number' || msg.newBlockType < 0 || msg.newBlockType > MAX_BLOCK_TYPE_ID) {
      return { valid: false, reason: 'Invalid block ID' };
    }

    // 4. Reach distance check (center of block to player eye/feet)
    const dx = (msg.x + 0.5) - playerPos[0];
    const dy = (msg.y + 0.5) - playerPos[1];
    const dz = (msg.z + 0.5) - playerPos[2];
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq > this.maxReachDistance * this.maxReachDistance) {
      return { valid: false, reason: 'Block change exceeds reach distance' };
    }

    return { valid: true };
  }

  public static validateInventoryAction(
    msg: InventoryActionMessage,
    currentInventory: Array<{ itemId: string; count: number } | null>
  ): ValidationResult {
    if (msg.fromSlot < 0 || msg.fromSlot >= currentInventory.length) {
      return { valid: false, reason: 'Out of bounds source inventory slot' };
    }

    const slotItem = currentInventory[msg.fromSlot];
    if (!slotItem || slotItem.count < msg.count) {
      return { valid: false, reason: 'Insufficient item count for transaction' };
    }

    return { valid: true };
  }

  public static validateDamageEvent(
    msg: DamageEventMessage,
    attackerPos: [number, number, number],
    targetPos: [number, number, number]
  ): ValidationResult {
    const dx = attackerPos[0] - targetPos[0];
    const dy = attackerPos[1] - targetPos[1];
    const dz = attackerPos[2] - targetPos[2];
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq > this.maxCombatReach * this.maxCombatReach) {
      return { valid: false, reason: 'Target out of combat range' };
    }

    if (msg.damageAmount <= 0 || msg.damageAmount > 500) {
      return { valid: false, reason: 'Unrealistic damage value' };
    }

    return { valid: true };
  }

  public static validateMovement(
    lastPos: [number, number, number],
    nextPos: [number, number, number],
    deltaTime: number
  ): ValidationResult {
    const dx = nextPos[0] - lastPos[0];
    const dy = nextPos[1] - lastPos[1];
    const dz = nextPos[2] - lastPos[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const maxAllowedDist = this.maxPlayerSpeed * Math.max(0.016, deltaTime) * 1.5; // Allowance factor

    if (dist > maxAllowedDist && dist > 1.0) {
      return { valid: false, reason: 'Speed violation / teleportation detected' };
    }

    return { valid: true };
  }
}
