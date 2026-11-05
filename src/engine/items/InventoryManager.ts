// Inventory Manager 2.0: Atomic Transaction Layer, Stack Splitting, Instance Tracking & Anti-Duplication
import { ItemStack, ItemDef, PlayerEquipment, StatusEffectType, PamorElement } from '../../types';
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

  // Pre-validate whether an inventory can fit all specified items without any overflow or truncation
  public static canFitItems(
    inventory: (ItemStack | null)[],
    itemsToAdd: Array<{ itemId: string; count: number }>
  ): boolean {
    if (!Array.isArray(itemsToAdd) || itemsToAdd.length === 0) return true;
    const simulated = this.cloneInventory(inventory);
    for (const item of itemsToAdd) {
      if (!item || item.count <= 0) continue;
      const res = this.addItem(simulated, item.itemId, item.count);
      if (!res.success || res.remainingCount > 0 || res.addedCount < item.count) {
        return false;
      }
    }
    return true;
  }

  // Add an item to an inventory array (first merges into existing stacks, then fills empty slots without truncating at maxStack)
  public static addItem(
    inventory: (ItemStack | null)[],
    itemToAdd: ItemStack | string,
    rawCount?: number
  ): AddItemResult {
    let itemId: string;
    let totalToAdd: number;
    let templateStack: ItemStack | null = null;

    if (typeof itemToAdd === 'string') {
      itemId = itemToAdd;
      totalToAdd = typeof rawCount === 'number' ? Math.floor(rawCount) : 1;
      const def = ITEM_DEFS[itemId];
      if (!def || isNaN(totalToAdd) || totalToAdd <= 0) {
        return { success: false, remainingCount: Math.max(0, totalToAdd || 0), addedCount: 0, modifiedSlots: [] };
      }
      templateStack = this.createStack(itemId, 1);
    } else {
      if (!itemToAdd || typeof itemToAdd !== 'object' || typeof itemToAdd.itemId !== 'string') {
        return { success: false, remainingCount: 0, addedCount: 0, modifiedSlots: [] };
      }
      itemId = itemToAdd.itemId;
      const explicitCount = typeof rawCount === 'number' ? Math.floor(rawCount) : Math.floor(itemToAdd.count);
      totalToAdd = explicitCount;
      const def = ITEM_DEFS[itemId];
      if (!def || isNaN(totalToAdd) || totalToAdd <= 0) {
        return { success: false, remainingCount: Math.max(0, totalToAdd || 0), addedCount: 0, modifiedSlots: [] };
      }
      templateStack = this.sanitizeSlot({ ...itemToAdd, count: 1 });
    }

    if (!templateStack) {
      return { success: false, remainingCount: totalToAdd, addedCount: 0, modifiedSlots: [] };
    }

    const def = ITEM_DEFS[itemId];
    if (!def) {
      return { success: false, remainingCount: totalToAdd, addedCount: 0, modifiedSlots: [] };
    }

    let remaining = totalToAdd;
    const modifiedSlots: number[] = [];

    // Phase 1: Merge into existing stacks (if stackable)
    if (def.maxStack > 1 && templateStack.durability === undefined) {
      for (let i = 0; i < inventory.length; i++) {
        const slot = inventory[i];
        if (slot && this.canMerge(slot, templateStack) && slot.count < def.maxStack) {
          const space = def.maxStack - slot.count;
          const transfer = Math.min(space, remaining);
          slot.count += transfer;
          remaining -= transfer;
          modifiedSlots.push(i);

          if (remaining <= 0) break;
        }
      }
    }

    // Phase 2: Place in available empty slots in chunks of up to def.maxStack
    if (remaining > 0) {
      for (let i = 0; i < inventory.length; i++) {
        if (inventory[i] === null) {
          const placeCount = Math.min(remaining, def.maxStack);
          inventory[i] = {
            ...templateStack,
            instanceId: this.generateInstanceId(),
            count: placeCount,
          };
          remaining -= placeCount;
          modifiedSlots.push(i);

          if (remaining <= 0) break;
        }
      }
    }

    const addedCount = totalToAdd - remaining;
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
    if (
      !def ||
      (def.category !== 'food' &&
        def.category !== 'consumable' &&
        def.category !== 'potion' &&
        !def.foodValue &&
        !def.healValue)
    ) {
      return { success: false, consumedItem: null, effectsApplied: [], message: 'Not edible' };
    }

    // Apply food & stamina & healing (with sensible Nusantara regional food defaults)
    const foodVal =
      def.foodValue ||
      (def as any).foodRestoration ||
      (def.category === 'food' ? 18 : 0);
    const satVal = def.saturationValue || Math.round(foodVal * 0.75);
    const healVal =
      def.healValue ||
      (def.category === 'potion' ? 25 : def.rarity === 'uncommon' && def.category === 'food' ? 8 : 0);
    const stamVal =
      def.staminaRestore ||
      (def.category === 'food' ? 20 : def.category === 'potion' ? 35 : 0);

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
      message: `Mengonsumsi ${def.name}`,
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

  // Consolidate partial stacks and sort slots by category, rarity, and item name
  public static sortAndConsolidate(
    slots: (ItemStack | null)[],
    startIndex: number = 0
  ): (ItemStack | null)[] {
    const result = this.cloneInventory(slots);

    // 1. Consolidate identical stackable items across the entire array (preferring earlier/hotbar slots)
    for (let i = 0; i < result.length; i++) {
      const slotA = result[i];
      if (!slotA) continue;
      const defA = ITEM_DEFS[slotA.itemId];
      const maxStack = defA?.maxStack || 64;
      if (slotA.count >= maxStack) continue;

      for (let j = i + 1; j < result.length; j++) {
        const slotB = result[j];
        if (!slotB) continue;
        if (this.canMerge(slotA, slotB)) {
          const space = maxStack - slotA.count;
          const transfer = Math.min(space, slotB.count);
          if (transfer > 0) {
            slotA.count += transfer;
            slotB.count -= transfer;
            if (slotB.count <= 0) {
              result[j] = null;
            }
          }
          if (slotA.count >= maxStack) break;
        }
      }
    }

    // 2. Extract non-null items from startIndex..end and sort them
    const categoryOrder: Record<string, number> = {
      weapon: 1,
      tool: 2,
      armor: 3,
      accessory: 4,
      consumable: 5,
      farming: 6,
      material: 7,
      block: 8,
    };
    const rarityOrder: Record<string, number> = {
      mythic: 1,
      legendary: 2,
      epic: 3,
      rare: 4,
      uncommon: 5,
      common: 6,
    };

    const sortable = result.slice(startIndex).filter((s): s is ItemStack => s !== null);
    sortable.sort((a, b) => {
      const defA = ITEM_DEFS[a.itemId];
      const defB = ITEM_DEFS[b.itemId];
      const catA = categoryOrder[defA?.category || 'block'] ?? 99;
      const catB = categoryOrder[defB?.category || 'block'] ?? 99;
      if (catA !== catB) return catA - catB;

      const rarA = rarityOrder[defA?.rarity || 'common'] ?? 99;
      const rarB = rarityOrder[defB?.rarity || 'common'] ?? 99;
      if (rarA !== rarB) return rarA - rarB;

      const nameA = defA?.name || a.itemId;
      const nameB = defB?.name || b.itemId;
      if (nameA !== nameB) return nameA.localeCompare(nameB);

      return b.count - a.count;
    });

    for (let i = startIndex; i < result.length; i++) {
      result[i] = sortable[i - startIndex] || null;
    }

    return result;
  }

  // Quick-stack items from source (e.g. backpack) into target container (e.g. chest) if target already holds that itemId
  public static quickStackMatching(
    sourceSlots: (ItemStack | null)[],
    targetSlots: (ItemStack | null)[],
    sourceStartIndex: number = 9
  ): {
    updatedSource: (ItemStack | null)[];
    updatedTarget: (ItemStack | null)[];
    movedCount: number;
  } {
    const src = this.cloneInventory(sourceSlots);
    const tgt = this.cloneInventory(targetSlots);
    let movedCount = 0;

    const existingItemIds = new Set<string>();
    for (const slot of tgt) {
      if (slot) existingItemIds.add(slot.itemId);
    }

    for (let i = sourceStartIndex; i < src.length; i++) {
      const item = src[i];
      if (!item || !existingItemIds.has(item.itemId)) continue;

      const def = ITEM_DEFS[item.itemId];
      const maxStack = def?.maxStack || 64;

      // 1. Fill partial stacks in target
      for (let j = 0; j < tgt.length; j++) {
        const tSlot = tgt[j];
        if (tSlot && this.canMerge(tSlot, item) && tSlot.count < maxStack) {
          const toAdd = Math.min(maxStack - tSlot.count, item.count);
          tSlot.count += toAdd;
          item.count -= toAdd;
          movedCount += toAdd;
          if (item.count <= 0) break;
        }
      }

      // 2. Place remaining into empty target slots
      if (item.count > 0) {
        for (let j = 0; j < tgt.length; j++) {
          if (tgt[j] === null) {
            tgt[j] = { ...item };
            movedCount += item.count;
            item.count = 0;
            break;
          }
        }
      }

      if (item.count <= 0) {
        src[i] = null;
      }
    }

    return { updatedSource: src, updatedTarget: tgt, movedCount };
  }

  // Forge Nusantara Elemental Pamor onto a Weapon or Tool at the Smithing Anvil
  public static forgeWeaponPamor(
    targetItem: ItemStack,
    pamorElement: PamorElement,
    catalystItem?: ItemStack | null
  ): {
    success: boolean;
    forgedItem?: ItemStack;
    catalystConsumed: number;
    message: string;
  } {
    const def = ITEM_DEFS[targetItem.itemId];
    if (!def || (def.category !== 'weapon' && def.category !== 'tool')) {
      return {
        success: false,
        catalystConsumed: 0,
        message: 'Pilih senjata atau peralatan tempur terlebih dahulu.',
      };
    }

    const pamorCatalog: Record<
      PamorElement,
      { name: string; dmgBonus: number; critBonus: number; poiseBonus: number; duraBonus: number }
    > = {
      surya_api: {
        name: 'Pamor Surya Merapi (Api Kawah)',
        dmgBonus: 16,
        critBonus: 0.1,
        poiseBonus: 15,
        duraBonus: 150,
      },
      bajra_petir: {
        name: 'Pamor Bajra Kilat (Petir Berantai)',
        dmgBonus: 12,
        critBonus: 0.18,
        poiseBonus: 20,
        duraBonus: 120,
      },
      tirta_beku: {
        name: 'Pamor Tirta Puncak Jaya (Es Pelumpuh Poise)',
        dmgBonus: 10,
        critBonus: 0.08,
        poiseBonus: 40,
        duraBonus: 180,
      },
    };

    const chosen = pamorCatalog[pamorElement];
    const currentMods = targetItem.modifiers || {};
    const nextTier = Math.min(3, (currentMods.pamorTier || 0) + 1);

    let catalystConsumed = 0;
    if (catalystItem && catalystItem.count > 0) {
      catalystConsumed = 1;
    }

    const baseMaxDura = targetItem.maxDurability || def.durability || 500;
    const newMaxDura = baseMaxDura + chosen.duraBonus;

    const forgedItem: ItemStack = {
      ...targetItem,
      durability: newMaxDura,
      maxDurability: newMaxDura,
      quality: nextTier >= 2 ? 'astral' : 'masterwork',
      modifiers: {
        ...currentMods,
        pamorElement,
        pamorName: chosen.name,
        pamorTier: nextTier,
        damageBonus: chosen.dmgBonus * nextTier + (currentMods.socketedMustika ? 15 : 0),
        critChanceBonus: chosen.critBonus,
        poiseDamageBonus: chosen.poiseBonus,
      },
    };

    return {
      success: true,
      forgedItem,
      catalystConsumed,
      message: `Berhasil menempa ${chosen.name} (Tingkat ${nextTier}) pada ${def.name}!`,
    };
  }

  // Socket a Sacred Mustika Relic Gem into a Weapon, Tool, or Armor Piece
  public static socketMustikaGem(
    targetItem: ItemStack,
    mustikaItem: ItemStack | null
  ): {
    success: boolean;
    socketedItem?: ItemStack;
    gemConsumed: number;
    message: string;
  } {
    const def = ITEM_DEFS[targetItem.itemId];
    if (!def || (def.category !== 'weapon' && def.category !== 'tool' && def.category !== 'armor')) {
      return {
        success: false,
        gemConsumed: 0,
        message: 'Pilih senjata, peralatan, atau zirah untuk disematkan Batu Mustika.',
      };
    }

    const gemId = mustikaItem?.itemId || 'mustika_merah_delima';
    const gemCatalog: Record<
      string,
      { name: string; dmg: number; def: number; crit: number; poise: number }
    > = {
      mustika_merah_delima: { name: 'Mustika Merah Delima', dmg: 18, def: 10, crit: 0.12, poise: 15 },
      mustika_zamrud_khatulistiwa: { name: 'Mustika Zamrud Khatulistiwa', dmg: 12, def: 14, crit: 0.08, poise: 35 },
      mustika_bintang_jatuh: { name: 'Mustika Inti Bintang Jatuh', dmg: 22, def: 18, crit: 0.18, poise: 25 },
      mustika_naga_pusaka: { name: 'Mustika Naga Warisan Purba', dmg: 25, def: 20, crit: 0.15, poise: 40 },
      aether_crystal: { name: 'Kristal Ley Aether', dmg: 8, def: 6, crit: 0.06, poise: 12 },
      starfall_ore: { name: 'Inti Meteorit Starfall', dmg: 14, def: 12, crit: 0.1, poise: 20 },
    };

    const gemStats = gemCatalog[gemId] || gemCatalog['mustika_merah_delima'];
    const currentMods = targetItem.modifiers || {};

    const socketedItem: ItemStack = {
      ...targetItem,
      quality: 'astral',
      modifiers: {
        ...currentMods,
        socketedMustika: gemId,
        mustikaName: gemStats.name,
        damageBonus: (currentMods.damageBonus || 0) + gemStats.dmg,
        defenseBonus: (currentMods.defenseBonus || 0) + gemStats.def,
        critChanceBonus: Math.min(0.65, (currentMods.critChanceBonus || 0) + gemStats.crit),
        poiseDamageBonus: (currentMods.poiseDamageBonus || 0) + gemStats.poise,
      },
    };

    return {
      success: true,
      socketedItem,
      gemConsumed: mustikaItem ? 1 : 0,
      message: `${gemStats.name} berhasil disematkan ke ${def.name}! (+${gemStats.dmg} DMG, +${gemStats.poise} Poise)`,
    };
  }
}

