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
import { BLOCK_DEFS } from '../world/BlockRegistry';
import { BlockType } from '../../types';

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
    worldCurrentBlock?: number,
    consumedMaterial?: string
  ): ValidationResult {
    if (!isValidVector3(playerPos)) {
      return { valid: false, reason: 'INVALID_PLAYER_COORDINATES' };
    }
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) {
      return { valid: false, reason: 'COORDINATES_MUST_BE_INTEGERS' };
    }
    if (y < WORLD_MIN_Y || y >= WORLD_MAX_Y) {
      return { valid: false, reason: 'OUT_OF_WORLD_HEIGHT_BOUNDS' };
    }
    if (typeof newBlockType !== 'number' || newBlockType < 0 || newBlockType > MAX_BLOCK_TYPE_ID) {
      return { valid: false, reason: 'INVALID_BLOCK_ID' };
    }
    // Prevent overwriting unbreakable blocks (hardness < 0, e.g., AETHER_PORTAL)
    const oldDef = BLOCK_DEFS[oldBlockType];
    const worldDef = worldCurrentBlock !== undefined ? BLOCK_DEFS[worldCurrentBlock] : undefined;
    if ((oldDef && oldDef.hardness < 0) || (worldDef && worldDef.hardness < 0)) {
      return { valid: false, reason: 'CANNOT_OVERWRITE_UNBREAKABLE_BLOCK' };
    }
    if (worldCurrentBlock !== undefined && worldCurrentBlock !== oldBlockType) {
      return { valid: false, reason: 'OLD_BLOCK_STATE_DESYNC' };
    }
    const p = toVector3Tuple(playerPos)!;
    const dx = (x + 0.5) - p[0];
    const dy = (y + 0.5) - p[1];
    const dz = (z + 0.5) - p[2];
    const distSq = dx * dx + dy * dy + dz * dz;
    if (distSq > this.maxReachDistance * this.maxReachDistance) {
      return { valid: false, reason: 'EXCEEDS_MAX_REACH' };
    }

    // Material validation: verify the player actually possesses an item that places this block
    if (inventory !== undefined && newBlockType !== BlockType.AIR) {
      let foundMatchingItemId: string | undefined;
      if (consumedMaterial) {
        const cDef = ITEM_DEFS[consumedMaterial];
        const isSlabCombine =
          (cDef?.blockType === BlockType.WOOD_SLAB && newBlockType === BlockType.WOOD_PLANKS) ||
          (cDef?.blockType === BlockType.STONE_SLAB && newBlockType === BlockType.STONE_BRICKS);
        if (!cDef || (cDef.blockType !== newBlockType && !isSlabCombine)) {
          return { valid: false, reason: 'MATERIAL_BLOCK_MISMATCH' };
        }
        for (const slot of inventory) {
          if (slot && slot.itemId === consumedMaterial && slot.count > 0) {
            foundMatchingItemId = slot.itemId;
            break;
          }
        }
      } else {
        for (const slot of inventory) {
          if (!slot || slot.count <= 0) continue;
          const def = ITEM_DEFS[slot.itemId];
          const isSlabCombine =
            (def?.blockType === BlockType.WOOD_SLAB && newBlockType === BlockType.WOOD_PLANKS) ||
            (def?.blockType === BlockType.STONE_SLAB && newBlockType === BlockType.STONE_BRICKS);
          if (def && (def.blockType === newBlockType || isSlabCombine)) {
            foundMatchingItemId = slot.itemId;
            break;
          }
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
    if (!isValidVector3(playerPos)) {
      return { valid: false, reason: 'INVALID_PLAYER_COORDINATES' };
    }
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) {
      return { valid: false, reason: 'COORDINATES_MUST_BE_INTEGERS' };
    }
    if (y < WORLD_MIN_Y || y >= WORLD_MAX_Y) {
      return { valid: false, reason: 'OUT_OF_WORLD_HEIGHT_BOUNDS' };
    }
    // Prevent breaking unbreakable blocks (hardness < 0, e.g., AETHER_PORTAL)
    const oldDef = BLOCK_DEFS[oldBlockType];
    const worldDef = worldCurrentBlock !== undefined ? BLOCK_DEFS[worldCurrentBlock] : undefined;
    if ((oldDef && oldDef.hardness < 0) || (worldDef && worldDef.hardness < 0)) {
      return { valid: false, reason: 'UNBREAKABLE_BLOCK' };
    }
    if (worldCurrentBlock !== undefined && worldCurrentBlock !== oldBlockType) {
      return { valid: false, reason: 'OLD_BLOCK_STATE_DESYNC' };
    }
    const p = toVector3Tuple(playerPos)!;
    const dx = (x + 0.5) - p[0];
    const dy = (y + 0.5) - p[1];
    const dz = (z + 0.5) - p[2];
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
    if (msg.newBlockType === BlockType.AIR) {
      return this.validateBlockBreak(playerPos, msg.x, msg.y, msg.z, msg.oldBlockType, worldCurrentBlock);
    }
    return this.validateBlockPlacement(
      playerPos,
      msg.x,
      msg.y,
      msg.z,
      msg.oldBlockType,
      msg.newBlockType,
      inventory,
      worldCurrentBlock,
      msg.consumedMaterial
    );
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
    stationContext?: string,
    stationPos?: [number, number, number],
    playerPos?: [number, number, number],
    getBlockAt?: (x: number, y: number, z: number) => number
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
      const normalizedContext = stationContext === 'bench' ? 'crafting_bench' : stationContext;
      if (normalizedContext && normalizedContext !== recipe.station && normalizedContext !== 'creative') {
        return { valid: false, reason: 'INCORRECT_WORKSTATION_CONTEXT' };
      }

      // If world block lookup and playerPos are provided, verify physical workstation proximity and block type
      if (getBlockAt && playerPos && isValidVector3(playerPos)) {
        const p = toVector3Tuple(playerPos)!;
        const expectedStationBlocks: number[] =
          recipe.station === 'crafting_bench'
            ? [BlockType.CRAFTING_BENCH]
            : recipe.station === 'furnace'
            ? [BlockType.FURNACE]
            : recipe.station === 'anvil'
            ? [BlockType.ANVIL_SMITHING]
            : [];

        if (isValidVector3(stationPos)) {
          const sp = toVector3Tuple(stationPos)!;
          const sx = Math.floor(sp[0]);
          const sy = Math.floor(sp[1]);
          const sz = Math.floor(sp[2]);
          const dist = Math.hypot((sx + 0.5) - p[0], (sy + 0.5) - p[1], (sz + 0.5) - p[2]);
          if (dist > this.maxReachDistance) {
            return { valid: false, reason: 'WORKSTATION_OUT_OF_REACH' };
          }
          const blockAtPos = getBlockAt(sx, sy, sz);
          if (expectedStationBlocks.length > 0 && !expectedStationBlocks.includes(blockAtPos)) {
            return { valid: false, reason: 'WORKSTATION_BLOCK_MISSING' };
          }
        } else if (expectedStationBlocks.length > 0) {
          // Scan nearby blocks within reach for the required workstation
          const r = Math.ceil(this.maxReachDistance);
          const px = Math.floor(p[0]);
          const py = Math.floor(p[1]);
          const pz = Math.floor(p[2]);
          let found = false;
          for (let dx = -r; dx <= r && !found; dx++) {
            for (let dy = -r; dy <= r && !found; dy++) {
              for (let dz = -r; dz <= r && !found; dz++) {
                const wx = px + dx;
                const wy = py + dy;
                const wz = pz + dz;
                if (wy < WORLD_MIN_Y || wy >= WORLD_MAX_Y) continue;
                const d = Math.hypot((wx + 0.5) - p[0], (wy + 0.5) - p[1], (wz + 0.5) - p[2]);
                if (d <= this.maxReachDistance && expectedStationBlocks.includes(getBlockAt(wx, wy, wz))) {
                  found = true;
                }
              }
            }
          }
          if (!found) {
            return { valid: false, reason: 'WORKSTATION_NOT_NEARBY' };
          }
        }
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

    // Simulate input deduction on a clone to accurately check post-deduction output capacity
    const simInv = inventory.map((slot) => (slot ? { ...slot } : null));
    for (const input of recipe.inputs) {
      let rem = input.count * quantity;
      for (let i = 0; i < simInv.length && rem > 0; i++) {
        const slot = simInv[i];
        if (slot && slot.itemId === input.itemId) {
          const take = Math.min(slot.count, rem);
          slot.count -= take;
          rem -= take;
          if (slot.count <= 0) simInv[i] = null;
        }
      }
    }

    const outputDef = ITEM_DEFS[recipe.output.itemId];
    const maxStack = outputDef ? outputDef.maxStack : 64;
    const unitsToAdd = recipe.output.count * quantity;

    let availableSpace = 0;
    for (const slot of simInv) {
      if (slot === null) {
        availableSpace += maxStack;
      } else if (slot.itemId === recipe.output.itemId) {
        availableSpace += Math.max(0, maxStack - slot.count);
      }
    }

    if (availableSpace < unitsToAdd) {
      return { valid: false, reason: 'INSUFFICIENT_INVENTORY_CAPACITY' };
    }

    return { valid: true };
  }

  public static validateCrafting(
    recipeId: string,
    quantity: number,
    inventory: Array<{ itemId: string; count: number } | null>,
    stationContext?: string,
    stationPos?: [number, number, number],
    playerPos?: [number, number, number],
    getBlockAt?: (x: number, y: number, z: number) => number
  ): ValidationResult {
    return this.validateCraftRequest(recipeId, quantity, inventory, stationContext, stationPos, playerPos, getBlockAt);
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

