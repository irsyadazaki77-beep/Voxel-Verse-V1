// Mining Engine 2.0: Tool Hardness, Tier Matrix, Durability, Crack Stages & Data-Driven Drops
import { BlockType, GameMode, ItemStack } from '../../types';
import { ITEM_DEFS } from '../items/ItemRegistry';
import { BLOCK_DEFS } from './BlockRegistry';

export interface BreakCalculation {
  breakTime: number; // in seconds
  canHarvest: boolean; // whether drops will be generated
  isOptimalTool: boolean;
}

export class MiningEngine {
  // Calculate break time in seconds based on block hardness, held tool efficiency & tier
  public static calculateBreakTime(
    blockType: BlockType,
    heldItem: ItemStack | null,
    gameMode: GameMode
  ): BreakCalculation {
    if (gameMode === 'creative') {
      return { breakTime: 0.02, canHarvest: true, isOptimalTool: true };
    }

    const bDef = BLOCK_DEFS[blockType];
    if (!bDef || bDef.hardness <= 0) {
      return { breakTime: 0.05, canHarvest: true, isOptimalTool: true };
    }

    const baseHardness = bDef.hardness;
    const requiredTool = bDef.requiredTool || 'none';
    const minTier = bDef.minToolTier || 0;

    const itemDef = heldItem ? ITEM_DEFS[heldItem.itemId] : null;
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
        canHarvest = minTier === 0; // Only soft blocks drop with bare hands
      }
    }

    return {
      breakTime,
      canHarvest,
      isOptimalTool: isCorrectTool && meetsTier,
    };
  }

  // Get data-driven item drops for broken block
  public static getBlockDrops(
    blockType: BlockType,
    heldItem: ItemStack | null,
    gameMode: GameMode
  ): { itemId: string; count: number }[] {
    if (gameMode === 'creative') return [];

    const bDef = BLOCK_DEFS[blockType];
    if (!bDef || !bDef.dropItem) return [];

    const calc = this.calculateBreakTime(blockType, heldItem, gameMode);
    if (!calc.canHarvest) return [];

    let count = 1;
    if (bDef.dropCount) {
      const [min, max] = bDef.dropCount;
      count = Math.floor(Math.random() * (max - min + 1)) + min;
    }

    return [{ itemId: bDef.dropItem, count }];
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
