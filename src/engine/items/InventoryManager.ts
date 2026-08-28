// Inventory Manager 2.0: Atomic Transaction Layer, Stack Splitting, Instance Tracking & Anti-Duplication
import { ItemStack, ItemDef, PlayerEquipment, StatusEffectType } from '../../types';
import { ITEM_DEFS } from './ItemRegistry';
import { PlayerStats } from '../player/PlayerStats';

export interface AddItemResult {
  success: boolean;
  remainingCount: number;
  addedCount: number;
  modifiedSlots: number[];
}

export interface RemoveItemResult {
  success: boolean;
  removedCount: number;
}

export interface ConsumeResult {
  success: boolean;
  consumedItem: ItemStack | null;
  effectsApplied: StatusEffectType[];
  message: string;
}

export class InventoryManager {
  // Generate a unique instance ID for dynamic items
  public static generateInstanceId(): string {
    return 'inst_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
  }

  // Create a validated ItemStack from itemId and count
  public static createStack(
    itemId: string,
    count: number = 1,
    customProps?: Partial<ItemStack>
  ): ItemStack | null {
    const def = ITEM_DEFS[itemId];
    if (!def || count <= 0) return null;

    const maxDur = def.durability;
    return {
      instanceId: this.generateInstanceId(),
      itemId,
      count: Math.min(count, def.maxStack),
      durability: maxDur !== undefined ? maxDur : undefined,
      maxDurability: maxDur !== undefined ? maxDur : undefined,
      ...customProps,
    };
  }

  // Sanitize and validate a single item slot
  public static sanitizeSlot(slot: any): ItemStack | null {
    if (!slot || typeof slot !== 'object') return null;
    if (typeof slot.itemId !== 'string' || !ITEM_DEFS[slot.itemId]) return null;

    const def = ITEM_DEFS[slot.itemId];
    const rawCount = typeof slot.count === 'number' ? Math.floor(slot.count) : 1;
    if (isNaN(rawCount) || rawCount <= 0) return null;

    const count = Math.min(rawCount, def.maxStack);
    const durability = typeof slot.durability === 'number' ? Math.max(0, slot.durability) : undefined;
    const maxDurability = typeof slot.maxDurability === 'number' ? slot.maxDurability : def.durability;

    return {
      instanceId: typeof slot.instanceId === 'string' ? slot.instanceId : this.generateInstanceId(),
      itemId: slot.itemId,
      count,
      durability,
      maxDurability,
      customName: typeof slot.customName === 'string' ? slot.customName : undefined,
      quality: slot.quality,
      modifiers: slot.modifiers && typeof slot.modifiers === 'object' ? slot.modifiers : undefined,
    };
  }

  // Sanitize an entire inventory array
  public static sanitizeInventory(inv: any[], size: number = 36): (ItemStack | null)[] {
    const result: (ItemStack | null)[] = new Array(size).fill(null);
    if (!Array.isArray(inv)) return result;

    for (let i = 0; i < size; i++) {
      result[i] = this.sanitizeSlot(inv[i]);
    }
    return result;
  }

  // Deep clone an inventory array to ensure immutability during previews/simulations
  public static cloneInventory(inv: (ItemStack | null)[]): (ItemStack | null)[] {
    return inv.map(slot => (slot ? { ...slot, modifiers: slot.modifiers ? { ...slot.modifiers } : undefined } : null));
  }

  // Check if two item stacks can merge together
  public static canMerge(a: ItemStack, b: ItemStack): boolean {
    if (a.itemId !== b.itemId) return false;
    // Do not merge damaged or modified items with fresh ones
    if (a.durability !== undefined || b.durability !== undefined) return false;
    if (a.customName !== b.customName) return false;
    if (a.quality !== b.quality) return false;
    return true;
  }

  // ==========================================
  // ATOMIC TRANSACTIONS
  // ==========================================

  // Add an item to an inventory array (first merges into existing stacks, then fills empty slots)
  public static addItem(
    inventory: (ItemStack | null)[],
    itemToAdd: ItemStack | string,
    rawCount?: number
  ): AddItemResult {
    let stack: ItemStack | null = null;
    if (typeof itemToAdd === 'string') {
      stack = this.createStack(itemToAdd, rawCount || 1);
    } else {
      stack = this.sanitizeSlot(itemToAdd);
    }

    if (!stack || stack.count <= 0) {
      return { success: false, remainingCount: 0, addedCount: 0, modifiedSlots: [] };
    }

    const def = ITEM_DEFS[stack.itemId];
    if (!def) {
      return { success: false, remainingCount: stack.count, addedCount: 0, modifiedSlots: [] };
    }

    let remaining = stack.count;
    const modifiedSlots: number[] = [];

    // Phase 1: Merge into existing stacks (if stackable)
    if (def.maxStack > 1 && stack.durability === undefined) {
      for (let i = 0; i < inventory.length; i++) {
        const slot = inventory[i];
        if (slot && this.canMerge(slot, stack) && slot.count < def.maxStack) {
          const space = def.maxStack - slot.count;
          const transfer = Math.min(space, remaining);
          slot.count += transfer;
          remaining -= transfer;
          modifiedSlots.push(i);

          if (remaining <= 0) break;
        }
      }
    }

    // Phase 2: Place in first available empty slots
    if (remaining > 0) {
      for (let i = 0; i < inventory.length; i++) {
        if (inventory[i] === null) {
          const placeCount = Math.min(remaining, def.maxStack);
          inventory[i] = {
            ...stack,
            instanceId: this.generateInstanceId(),
            count: placeCount,
          };
          remaining -= placeCount;
          modifiedSlots.push(i);

          if (remaining <= 0) break;
        }
      }
    }

    const addedCount = stack.count - remaining;
    return {
      success: addedCount > 0,
      remainingCount: remaining,
      addedCount,
      modifiedSlots,
    };
  }

  // Count total quantity of an itemId in an inventory
  public static countItem(inventory: (ItemStack | null)[], itemId: string): number {
    let total = 0;
    for (const slot of inventory) {
      if (slot && slot.itemId === itemId) {
        total += slot.count;
      }
    }
    return total;
  }

  // Remove a specified count of an itemId from an inventory
  public static removeItem(
    inventory: (ItemStack | null)[],
    itemId: string,
    countToRemove: number
  ): RemoveItemResult {
    if (countToRemove <= 0) return { success: true, removedCount: 0 };

    const available = this.countItem(inventory, itemId);
    if (available < countToRemove) {
      return { success: false, removedCount: 0 };
    }

    let needed = countToRemove;
    for (let i = 0; i < inventory.length; i++) {
      const slot = inventory[i];
      if (slot && slot.itemId === itemId) {
        if (slot.count <= needed) {
          needed -= slot.count;
          inventory[i] = null;
        } else {
          slot.count -= needed;
          needed = 0;
        }
        if (needed <= 0) break;
      }
    }

    return {
      success: true,
      removedCount: countToRemove,
    };
  }

  // Swap or merge two slots within the same or different inventories
  public static moveSlot(
    sourceInv: (ItemStack | null)[],
    sourceIdx: number,
    targetInv: (ItemStack | null)[],
    targetIdx: number
  ): boolean {
    if (sourceIdx < 0 || sourceIdx >= sourceInv.length) return false;
    if (targetIdx < 0 || targetIdx >= targetInv.length) return false;

    const src = sourceInv[sourceIdx];
    const tgt = targetInv[targetIdx];

    if (!src) return false;

    // Case 1: Target is empty -> move whole stack
    if (!tgt) {
      targetInv[targetIdx] = src;
      sourceInv[sourceIdx] = null;
      return true;
    }

    // Case 2: Target has same stackable item -> merge
    const def = ITEM_DEFS[src.itemId];
    if (def && this.canMerge(src, tgt) && tgt.count < def.maxStack) {
      const space = def.maxStack - tgt.count;
      const transfer = Math.min(space, src.count);
      tgt.count += transfer;
      src.count -= transfer;

      if (src.count <= 0) {
        sourceInv[sourceIdx] = null;
      }
      return true;
    }

    // Case 3: Different items or non-stackable -> swap
    targetInv[targetIdx] = src;
    sourceInv[sourceIdx] = tgt;
    return true;
  }

  // Right-click split action:
  // If target is empty, moves Math.ceil(half) to target.
  // If target has same item and space, places 1 into target.
  public static splitSlot(
    sourceInv: (ItemStack | null)[],
    sourceIdx: number,
    targetInv: (ItemStack | null)[],
    targetIdx: number
  ): boolean {
    const src = sourceInv[sourceIdx];
    if (!src || src.count <= 0) return false;

    const tgt = targetInv[targetIdx];
    const def = ITEM_DEFS[src.itemId];
    if (!def) return false;

    // Target empty: split in half
    if (!tgt) {
      const half = Math.ceil(src.count / 2);
      targetInv[targetIdx] = {
        ...src,
        instanceId: this.generateInstanceId(),
        count: half,
      };
      src.count -= half;
      if (src.count <= 0) {
        sourceInv[sourceIdx] = null;
      }
      return true;
    }

    // Target has same item: transfer 1 item
    if (this.canMerge(src, tgt) && tgt.count < def.maxStack) {
      tgt.count += 1;
      src.count -= 1;
      if (src.count <= 0) {
        sourceInv[sourceIdx] = null;
      }
      return true;
    }

    return false;
  }

  // Shift-click quick transfer:
  // Moves an item between player inventory (0-26) and hotbar (27-35) or between player and container
  public static shiftClickTransfer(
    sourceInv: (ItemStack | null)[],
    sourceIdx: number,
    targetInv: (ItemStack | null)[]
  ): boolean {
    const src = sourceInv[sourceIdx];
    if (!src) return false;

    const addRes = this.addItem(targetInv, src);
    if (addRes.success) {
      if (addRes.remainingCount <= 0) {
        sourceInv[sourceIdx] = null;
      } else {
        src.count = addRes.remainingCount;
      }
      return true;
    }
    return false;
  }

  // Fast consume food or drink from inventory
  public static consumeFoodOrDrink(
    inventory: (ItemStack | null)[],
    slotIdx: number,
    stats: PlayerStats
  ): ConsumeResult {
    const slot = inventory[slotIdx];
    if (!slot) {
      return { success: false, consumedItem: null, effectsApplied: [], message: 'Empty slot' };
    }

    const def = ITEM_DEFS[slot.itemId];
    if (!def || (def.category !== 'food' && def.category !== 'consumable')) {
      return { success: false, consumedItem: null, effectsApplied: [], message: 'Not edible' };
    }

    // Apply food & stamina & healing
    const foodVal = def.foodValue || 0;
    const satVal = def.saturationValue || Math.round(foodVal * 0.75);
    const healVal = def.healValue || 0;
    const stamVal = def.staminaRestore || 0;

    if (foodVal > 0 || satVal > 0) {
      stats.eatFood(foodVal, satVal);
    }
    if (healVal > 0) {
      stats.heal(healVal);
    }
    if (stamVal > 0) {
      stats.restoreStamina(stamVal);
    }

    const appliedEffects: StatusEffectType[] = [];
    if (def.givesEffect) {
      stats.addEffect(def.givesEffect.id, def.givesEffect.duration, def.givesEffect.magnitude);
      appliedEffects.push(def.givesEffect.id);
    }

    // Deduct 1 from stack
    slot.count -= 1;
    if (slot.count <= 0) {
      inventory[slotIdx] = null;
    }

    return {
      success: true,
      consumedItem: slot,
      effectsApplied: appliedEffects,
      message: `Consumed ${def.name}`,
    };
  }

  // Repair item on Anvil using matching materials
  public static repairItem(
    targetItem: ItemStack,
    materialStack: ItemStack
  ): { success: boolean; repairedItem: ItemStack | null; materialConsumed: number } {
    const def = ITEM_DEFS[targetItem.itemId];
    if (!def || !def.durability || !def.repairMaterial) {
      return { success: false, repairedItem: targetItem, materialConsumed: 0 };
    }

    if (materialStack.itemId !== def.repairMaterial) {
      return { success: false, repairedItem: targetItem, materialConsumed: 0 };
    }

    const currentDur = targetItem.durability !== undefined ? targetItem.durability : def.durability;
    const maxDur = targetItem.maxDurability || def.durability;

    if (currentDur >= maxDur) {
      return { success: false, repairedItem: targetItem, materialConsumed: 0 };
    }

    // Each material unit repairs 25% of max durability
    const repairPerUnit = Math.ceil(maxDur * 0.25);
    const neededUnits = Math.ceil((maxDur - currentDur) / repairPerUnit);
    const toConsume = Math.min(materialStack.count, neededUnits);

    const newDur = Math.min(maxDur, currentDur + toConsume * repairPerUnit);

    return {
      success: true,
      repairedItem: {
        ...targetItem,
        durability: newDur,
        maxDurability: maxDur,
      },
      materialConsumed: toConsume,
    };
  }
}
