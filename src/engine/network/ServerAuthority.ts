// Server Authority Validation Foundation
import {
  BlockChangeMessage,
  InventoryActionMessage,
  DamageEventMessage,
  InputCommandMessage,
} from './NetworkProtocol';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export class ServerAuthority {
  private static maxReachDistance = 7.0; // 7 voxel units max reach
  private static maxPlayerSpeed = 18.0; // Units per second max velocity

  public static validateBlockChange(msg: BlockChangeMessage, playerPos: [number, number, number]): ValidationResult {
    const dx = msg.x - playerPos[0];
    const dy = msg.y - playerPos[1];
    const dz = msg.z - playerPos[2];
    const distSq = dx * dx + dy * dy + dz * dz;

    if (distSq > this.maxReachDistance * this.maxReachDistance) {
      return { valid: false, reason: 'Block change exceeds reach distance' };
    }

    if (msg.newBlockType < 0 || msg.newBlockType > 255) {
      return { valid: false, reason: 'Invalid block ID' };
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

    if (distSq > 100.0) { // 10 blocks max attack reach
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
