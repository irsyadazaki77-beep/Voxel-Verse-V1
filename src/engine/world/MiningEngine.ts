// Mining Engine 2.0: Tool Hardness, Tier Matrix, Durability, Crack Stages & Data-Driven Drops
import { BlockType, GameMode, ItemStack } from '../../types';
import { ITEM_DEFS } from '../items/ItemRegistry';
import { BLOCK_DEFS } from './BlockRegistry';

export interface BreakCalculation {
  breakTime: number; // in seconds
  canBreak: boolean; // whether block can be broken at all
  canHarvest: boolean; // whether drops will be generated
  isOptimalTool: boolean;
}

export class MiningEngine {
  // Resolve ItemDef from either an ItemStack or an itemId string
  private static resolveToolDef(heldItem?: ItemStack | string | null) {
    if (!heldItem) return null;
    if (typeof heldItem === 'string') {
      return ITEM_DEFS[heldItem] || null;
    }
    return ITEM_DEFS[heldItem.itemId] || null;
  }

  // Calculate break time in seconds based on block hardness, held tool efficiency & tier
  public static calculateBreakTime(
    blockType: BlockType,
    heldItem?: ItemStack | string | null,
    gameMode: GameMode = 'survival'
  ): BreakCalculation {
    if (gameMode === 'creative') {
      return { breakTime: 0.02, canBreak: true, canHarvest: true, isOptimalTool: true };
    }

    if (blockType === BlockType.AIR || blockType === BlockType.WATER || blockType === BlockType.LAVA) {
      return { breakTime: Infinity, canBreak: false, canHarvest: false, isOptimalTool: false };
    }

    const bDef = BLOCK_DEFS[blockType];
    if (bDef && bDef.hardness < 0) {
      return { breakTime: Infinity, canBreak: false, canHarvest: false, isOptimalTool: false };
    }

    if (!bDef) {
      return { breakTime: 0.6, canBreak: true, canHarvest: true, isOptimalTool: true };
    }

    if (bDef.hardness === 0) {
      return { breakTime: 0.05, canBreak: true, canHarvest: true, isOptimalTool: true };
    }

    const baseHardness = bDef.hardness;
    const requiredTool = bDef.requiredTool || (bDef as any).preferredTool || 'none';
    const minTier = bDef.minToolTier || 0;

    const itemDef = this.resolveToolDef(heldItem);
    const itemToolType = itemDef?.toolType || 'none';
    const itemTier = itemDef?.tier || 0;
    const efficiency = itemDef?.miningEfficiency || 1.0;

    const isCorrectTool = requiredTool === 'none' || itemToolType === requiredTool;
    const meetsTier = itemTier >= minTier;

    let breakTime: number;
    let canHarvest: boolean;

    if (isCorrectTool && meetsTier) {
      breakTime = Math.max(0.12, baseHardness / efficiency);
      canHarvest = true;
    } else if (isCorrectTool && !meetsTier) {
      // Correct tool category but under-tiered
      breakTime = Math.max(0.2, (baseHardness * 1.8) / efficiency);
      canHarvest = false;
    } else {
      // Wrong tool or bare hand
      if (requiredTool === 'none') {
        breakTime = Math.max(0.15, baseHardness);
        canHarvest = true;
      } else {
        breakTime = Math.max(0.4, baseHardness * 3.5);
        canHarvest = minTier === 0; // Only tier-0 blocks drop without required tool
      }
    }

    return {
      breakTime,
      canBreak: true,
      canHarvest,
      isOptimalTool: isCorrectTool && meetsTier,
    };
  }

  // Resolve canonical drop item ID for a block (either explicit dropItem in BLOCK_DEFS or matching block item in ITEM_DEFS)
  public static resolveDropItemId(blockType: BlockType): string | null {
    const bDef = BLOCK_DEFS[blockType];
    if (bDef?.dropItem && ITEM_DEFS[bDef.dropItem]) {
      return bDef.dropItem;
    }
    for (const [id, itemDef] of Object.entries(ITEM_DEFS)) {
      if (itemDef.blockType === blockType) {
        return id;
      }
    }
    return null;
  }

  // Get data-driven item drops for broken block (deterministic when blockPos is supplied)
  public static getBlockDrops(
    blockType: BlockType,
    heldItem?: ItemStack | string | null,
    gameMode: GameMode = 'survival',
    blockPos?: [number, number, number]
  ): { itemId: string; count: number }[] {
    if (gameMode === 'creative') return [];
    const bDef = BLOCK_DEFS[blockType];
    if (blockType === BlockType.AIR || blockType === BlockType.WATER || blockType === BlockType.LAVA || (bDef && bDef.hardness < 0)) {
      return [];
    }

    const dropItemId = this.resolveDropItemId(blockType);
    if (!dropItemId) return [];

    const calc = this.calculateBreakTime(blockType, heldItem, gameMode);
    if (!calc.canHarvest) return [];

    let count = 1;
    if (typeof bDef?.dropCount === 'number') {
      count = bDef.dropCount;
    } else if (Array.isArray(bDef?.dropCount)) {
      const [min, max] = bDef.dropCount;
      const span = Math.max(0, max - min + 1);
      if (span <= 1) {
        count = min;
      } else if (blockPos && blockPos.length === 3) {
        // Deterministic spatial hash so client and server always compute identical drop counts
        const h = Math.abs(
          ((Math.floor(blockPos[0]) * 73856093) ^
            (Math.floor(blockPos[1]) * 19349663) ^
            (Math.floor(blockPos[2]) * 83492791) ^
            (blockType * 49999)) | 0
        );
        count = min + (h % span);
      } else {
        count = Math.floor(Math.random() * span) + min;
      }
    }

    if (count <= 0) return [];

    return [{ itemId: dropItemId, count }];
  }

  // Deduct durability from held tool/weapon
  public static consumeDurability(
    item: ItemStack,
    action: 'mine' | 'attack' | 'combat' = 'mine'
  ): { broken: boolean; item: ItemStack | null } {
    const itemDef = ITEM_DEFS[item.itemId];
    if (!itemDef || !itemDef.durability) {
      return { broken: false, item }; // Indestructible
    }

    const maxDur = item.maxDurability || itemDef.durability;
    const currentDur = item.durability !== undefined ? item.durability : maxDur;
    const cost = (action === 'attack' || action === 'combat') && itemDef.category === 'tool' ? 2 : 1;
    const nextDur = currentDur - cost;

    if (nextDur <= 0) {
      return { broken: true, item: null };
    }

    return {
      broken: false,
      item: {
        ...item,
        durability: nextDur,
        maxDurability: maxDur,
      },
    };
  }

  // Get crack visual stage (0 to 9)
  public static getCrackStage(progress: number): number {
    return Math.min(9, Math.floor(progress * 10));
  }
}
