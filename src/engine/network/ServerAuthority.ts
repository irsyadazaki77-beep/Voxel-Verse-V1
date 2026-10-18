// Server Authority Validation Foundation
import {
  BlockChangeMessage,
  InventoryActionMessage,
  CraftRequestMessage,
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
import { ITEM_DEFS } from '../items/ItemRegistry';
import { CRAFTING_RECIPES } from '../items/CraftingSystem';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
  consumedMaterialId?: string;
}

export type Vector3Like = [number, number, number] | { x: number; y: number; z: number };

export function isValidVector3(v: unknown): v is Vector3Like {
  if (Array.isArray(v)) {
    return (
      v.length === 3 &&
      typeof v[0] === 'number' && Number.isFinite(v[0]) &&
      typeof v[1] === 'number' && Number.isFinite(v[1]) &&
      typeof v[2] === 'number' && Number.isFinite(v[2])
    );
  }
  if (typeof v === 'object' && v !== null && 'x' in v && 'y' in v && 'z' in v) {
    const obj = v as { x: unknown; y: unknown; z: unknown };
    return (
      typeof obj.x === 'number' && Number.isFinite(obj.x) &&
      typeof obj.y === 'number' && Number.isFinite(obj.y) &&
      typeof obj.z === 'number' && Number.isFinite(obj.z)
    );
  }
  return false;
}

export function toVector3Tuple(v: unknown): [number, number, number] | null {
  if (!isValidVector3(v)) return null;
  if (Array.isArray(v)) {
    return [v[0], v[1], v[2]];
  }
  return [v.x, v.y, v.z];
}

export class ServerAuthority {
  public static readonly maxReachDistance = MAX_INTERACTION_REACH;
  public static readonly maxCombatReach = MAX_COMBAT_REACH;
  public static readonly maxPlayerSpeed = MAX_PLAYER_SPEED;

  public static isValidVector3(v: unknown): v is Vector3Like {
    return isValidVector3(v);
  }

  public static toVector3Tuple(v: unknown): [number, number, number] | null {
    return toVector3Tuple(v);
  }

  /**
   * Validates mining actions with anti-exploit coordinate, NaN/Infinity, and reach checks
   */
  public static validateMining(
    playerPos: unknown,
    blockPos: unknown,
    blockType?: number,
    worldCurrentBlock?: number
  ): ValidationResult {
    if (!isValidVector3(playerPos) || !isValidVector3(blockPos)) {
      return { valid: false, reason: 'INVALID_COORDINATES' };
    }

    const pPos = toVector3Tuple(playerPos)!;
    const bPos = toVector3Tuple(blockPos)!;

    const bx = bPos[0];
    const by = bPos[1];
    const bz = bPos[2];

    if (!Number.isInteger(bx) || !Number.isInteger(by) || !Number.isInteger(bz)) {
      return { valid: false, reason: 'COORDINATES_MUST_BE_INTEGERS' };
    }

    if (by < WORLD_MIN_Y || by >= WORLD_MAX_Y) {
      return { valid: false, reason: 'OUT_OF_WORLD_HEIGHT_BOUNDS' };
    }

    if (worldCurrentBlock !== undefined && blockType !== undefined && worldCurrentBlock !== blockType) {
      return { valid: false, reason: 'OLD_BLOCK_STATE_DESYNC' };
    }

    const dx = (bx + 0.5) - pPos[0];
    const dy = (by + 0.5) - pPos[1];
    const dz = (bz + 0.5) - pPos[2];
    const distanceSq = dx * dx + dy * dy + dz * dz;

    // Maximum 6 blocks interaction reach (distanceSq <= 36)
    const MAX_MINING_DISTANCE_SQ = 36;
    if (distanceSq > MAX_MINING_DISTANCE_SQ) {
      return { valid: false, reason: 'EXCEEDS_MAX_REACH' };
    }

    return { valid: true };
  }

  /**
   * Strongly typed crafting validator without any type
   */
  public static validateCrafting(
    recipeId: string,
    quantity: number,
    inventory: Array<{ itemId: string; count: number } | null>,
    stationContext?: string
  ): ValidationResult {
    return this.validateCraftRequest(recipeId, quantity, inventory, stationContext);
  }

  /**
   * Validates block placement, verifying:
   * 1. Integer coordinates
   * 2. Vertical world bounds [WORLD_MIN_Y, WORLD_MAX_Y)
   * 3. Valid block type ID
   * 4. Reach distance
   * 5. Inventory contains the specific item corresponding to newBlockType
   */
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

    // Material validation: verify the player actually possesses an item that places this block
    if (inventory !== undefined && newBlockType !== 0) {
      let foundMatchingItemId: string | undefined;
      for (const slot of inventory) {
        if (!slot || slot.count <= 0) continue;
        const def = ITEM_DEFS[slot.itemId];
        if (def && def.blockType === newBlockType) {
          foundMatchingItemId = slot.itemId;
          break;
        }
      }
      if (!foundMatchingItemId) {
        return { valid: false, reason: 'ITEM_NOT_IN_INVENTORY' };
      }
      return { valid: true, consumedMaterialId: foundMatchingItemId };
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

  public static validateBlockChange(
    msg: BlockChangeMessage,
    playerPos: [number, number, number],
    inventory?: Array<{ itemId: string; count: number } | null>,
    worldCurrentBlock?: number
  ): ValidationResult {
    if (msg.newBlockType === 0) {
      return this.validateBlockBreak(playerPos, msg.x, msg.y, msg.z, msg.oldBlockType, worldCurrentBlock);
    }
    return this.validateBlockPlacement(playerPos, msg.x, msg.y, msg.z, msg.oldBlockType, msg.newBlockType, inventory, worldCurrentBlock);
  }

  public static validateInventoryAction(
    msg: InventoryActionMessage,
    currentInventory: Array<{ itemId: string; count: number } | null>
  ): ValidationResult {
    if (msg.fromSlot < 0 || msg.fromSlot >= currentInventory.length) {
      return { valid: false, reason: 'Out of bounds source inventory slot' };
    }
    if (msg.toSlot < 0 || msg.toSlot >= currentInventory.length) {
      return { valid: false, reason: 'Out of bounds destination inventory slot' };
    }

    if (msg.actionType === 'drop' || msg.actionType === 'consume') {
      const slotItem = currentInventory[msg.fromSlot];
      if (!slotItem || slotItem.count < (msg.count || 1) || (msg.count || 1) <= 0) {
        return { valid: false, reason: 'Insufficient item count for transaction' };
      }
      if (msg.itemId && slotItem.itemId !== msg.itemId) {
        return { valid: false, reason: 'Item ID mismatch in slot' };
      }
    }

    return { valid: true };
  }

  public static validateCraftRequest(
    recipeId: string,
    quantity: number,
    inventory: Array<{ itemId: string; count: number } | null>,
    stationContext?: string
  ): ValidationResult {
    if (quantity <= 0 || !Number.isInteger(quantity) || quantity > 64) {
      return { valid: false, reason: 'INVALID_CRAFT_QUANTITY' };
    }

    const recipe = CRAFTING_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) {
      return { valid: false, reason: 'UNKNOWN_RECIPE' };
    }

    // Verify station requirements
    if (recipe.station && recipe.station !== 'hand') {
      if (stationContext && stationContext !== recipe.station && stationContext !== 'creative') {
        return { valid: false, reason: 'INCORRECT_WORKSTATION_CONTEXT' };
      }
    }

    // Verify required ingredients exist in inventory in sufficient quantities
    for (const input of recipe.inputs) {
      const requiredTotal = input.count * quantity;
      let totalFound = 0;
      for (const slot of inventory) {
        if (slot && slot.itemId === input.itemId) {
          totalFound += slot.count;
        }
      }
      if (totalFound < requiredTotal) {
        return { valid: false, reason: `INSUFFICIENT_INGREDIENTS_${input.itemId}` };
      }
    }

    // Check output capacity: will the output fit into current inventory?
    const outputDef = ITEM_DEFS[recipe.output.itemId];
    const maxStack = outputDef ? outputDef.maxStack : 64;
    let unitsToAdd = recipe.output.count * quantity;

    let availableSpace = 0;
    for (const slot of inventory) {
      if (slot === null) {
        availableSpace += maxStack;
      } else if (slot.itemId === recipe.output.itemId) {
        availableSpace += Math.max(0, maxStack - slot.count);
      }
    }

    // Even if input items are consumed, to avoid edge cases we require that the inventory has room
    // Note that consumed inputs may free up slots, but checking total capacity prevents overflows
    let freedSlots = 0;
    for (const input of recipe.inputs) {
      const required = input.count * quantity;
      let rem = required;
      for (const slot of inventory) {
        if (slot && slot.itemId === input.itemId) {
          if (slot.count <= rem) {
            rem -= slot.count;
            freedSlots++;
          } else {
            break;
          }
        }
      }
    }
    availableSpace += freedSlots * maxStack;

    if (availableSpace < unitsToAdd) {
      return { valid: false, reason: 'INSUFFICIENT_INVENTORY_CAPACITY' };
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
    lastPos: unknown,
    nextPos: unknown,
    deltaTime: number
  ): ValidationResult {
    if (!isValidVector3(lastPos) || !isValidVector3(nextPos)) {
      return { valid: false, reason: 'Invalid coordinates' };
    }

    const p1 = toVector3Tuple(lastPos)!;
    const p2 = toVector3Tuple(nextPos)!;

    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const dz = p2[2] - p1[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const dt = Math.max(0.016, deltaTime);
    const maxAllowedDist = this.maxPlayerSpeed * dt * 1.5 + 2.0; // Allowance factor

    if (dist > maxAllowedDist && dist > 2.5) {
      return { valid: false, reason: 'Speed violation / teleportation detected' };
    }

    return { valid: true };
  }
}

