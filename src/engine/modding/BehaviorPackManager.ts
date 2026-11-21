// VoxelVerse v6.1.0: Data-Driven Behavior Pack & Datapack Modding API (Minecraft Bedrock/Java Add-On Parity)
import { CraftingRecipe } from '../../types';
import { CRAFTING_RECIPES } from '../items/CraftingSystem';

export interface BehaviorPackManifest {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  customRecipes?: CraftingRecipe[];
  lootMultipliers?: Record<string, number>;
  worldRules?: {
    keepInventory?: boolean;
    mobGriefing?: boolean;
    daylightCycle?: boolean;
  };
}

export class BehaviorPackManager {
  private static loadedPacks: Map<string, BehaviorPackManifest> = new Map();
  public static worldRules: {
    keepInventory: boolean;
    mobGriefing: boolean;
    daylightCycle: boolean;
  } = {
    keepInventory: false,
    mobGriefing: true,
    daylightCycle: true,
  };

  public static reset(): void {
    this.loadedPacks.clear();
    this.worldRules = {
      keepInventory: false,
      mobGriefing: true,
      daylightCycle: true,
    };
  }

  public static registerPackFromJSON(jsonStr: string): { ok: boolean; pack?: BehaviorPackManifest; error?: string } {
    try {
      const parsed = JSON.parse(jsonStr) as BehaviorPackManifest;
      if (!parsed || !parsed.id || !parsed.name) {
        return { ok: false, error: 'Manifest pack wajib memiliki id dan name.' };
      }

      this.loadedPacks.set(parsed.id, parsed);

      // Dynamically inject custom crafting recipes into CRAFTING_RECIPES
      if (Array.isArray(parsed.customRecipes)) {
        for (const recipe of parsed.customRecipes) {
          if (recipe.id && !CRAFTING_RECIPES.some((r) => r.id === recipe.id)) {
            CRAFTING_RECIPES.push(recipe);
          }
        }
      }

      // Apply world game rules if specified
      if (parsed.worldRules) {
        if (typeof parsed.worldRules.keepInventory === 'boolean') {
          this.worldRules.keepInventory = parsed.worldRules.keepInventory;
        }
        if (typeof parsed.worldRules.mobGriefing === 'boolean') {
          this.worldRules.mobGriefing = parsed.worldRules.mobGriefing;
        }
        if (typeof parsed.worldRules.daylightCycle === 'boolean') {
          this.worldRules.daylightCycle = parsed.worldRules.daylightCycle;
        }
      }

      return { ok: true, pack: parsed };
    } catch (e: any) {
      return { ok: false, error: `JSON tidak valid: ${e?.message || 'parse error'}` };
    }
  }

  public static getLootMultiplier(itemId: string): number {
    let mult = 1.0;
    for (const pack of this.loadedPacks.values()) {
      if (pack.lootMultipliers && typeof pack.lootMultipliers[itemId] === 'number') {
        mult *= pack.lootMultipliers[itemId];
      }
    }
    return mult;
  }

  public static listPacks(): BehaviorPackManifest[] {
    return Array.from(this.loadedPacks.values());
  }
}
