// Furnace Manager 2.0: Persistent Kiln Smelting, Offline Catchup & Fuel Burning Logic
import { FurnaceState, ItemStack } from '../../types';
import { CRAFTING_RECIPES } from '../items/CraftingSystem';
import { ITEM_DEFS } from '../items/ItemRegistry';
import { InventoryManager } from '../items/InventoryManager';

export type { FurnaceState };

export class FurnaceManager {
  // Map: "x,y,z" -> FurnaceState
  public static furnaces: Map<string, FurnaceState> = new Map();

  // Get or initialize furnace state
  public static getFurnace(pos: [number, number, number]): FurnaceState {
    const key = `${pos[0]},${pos[1]},${pos[2]}`;
    if (!this.furnaces.has(key)) {
      const freshState: FurnaceState = {
        pos,
        inputSlot: null,
        fuelSlot: null,
        outputSlot: null,
        burnTimeRemaining: 0,
        maxBurnTime: 0,
        cookProgress: 0,
        maxCookProgress: 8, // 8 seconds per smelt
        isLit: false,
        lastUpdateTimestamp: Date.now(),
      };
      this.furnaces.set(key, freshState);
    }
    return this.furnaces.get(key)!;
  }

  // Set furnace state
  public static setFurnace(pos: [number, number, number], state: FurnaceState): void {
    const key = `${pos[0]},${pos[1]},${pos[2]}`;
    this.furnaces.set(key, state);
  }

  // Remove furnace data when block is destroyed
  public static removeFurnace(pos: [number, number, number]): void {
    const key = `${pos[0]},${pos[1]},${pos[2]}`;
    this.furnaces.delete(key);
  }

  // Find furnace recipe for input item
  public static getSmeltingRecipe(inputStack: ItemStack | null | undefined) {
    if (!inputStack) return null;
    return CRAFTING_RECIPES.find(
      r => r.station === 'furnace' && r.inputs[0]?.itemId === inputStack.itemId
    ) || null;
  }

  // Main update loop for all active furnaces
  public static update(deltaTime: number): void {
    const now = Date.now();

    this.furnaces.forEach(furnace => {
      furnace.lastUpdateTimestamp = now;

      const recipe = this.getSmeltingRecipe(furnace.inputSlot);
      const canSmeltRecipe = recipe !== null && this.canAcceptOutput(furnace.outputSlot || null, recipe.output.itemId, recipe.output.count);

      // 1. If currently burning, deplete burn time
      if (furnace.burnTimeRemaining > 0) {
        furnace.burnTimeRemaining = Math.max(0, furnace.burnTimeRemaining - deltaTime);
        furnace.isLit = furnace.burnTimeRemaining > 0;
      }

      // 2. If fuel ran out but there is work to do, ignite new fuel from fuelSlot
      if (furnace.burnTimeRemaining <= 0 && canSmeltRecipe && furnace.fuelSlot) {
        const fuelDef = ITEM_DEFS[furnace.fuelSlot.itemId];
        if (fuelDef && fuelDef.fuelBurnTime && fuelDef.fuelBurnTime > 0) {
          furnace.burnTimeRemaining = fuelDef.fuelBurnTime;
          furnace.maxBurnTime = fuelDef.fuelBurnTime;
          furnace.isLit = true;

          // Consume 1 fuel
          furnace.fuelSlot.count -= 1;
          if (furnace.fuelSlot.count <= 0) {
            furnace.fuelSlot = null;
          }
        }
      }

      // 3. Progress cooking if furnace is actively burning and recipe is valid
      if (furnace.isLit && canSmeltRecipe && recipe) {
        furnace.cookProgress += deltaTime;
        const maxProgress = furnace.maxCookProgress || 8;

        if (furnace.cookProgress >= maxProgress) {
          // Completed 1 smelting cycle!
          furnace.cookProgress = 0;

          // Deduct 1 input
          if (furnace.inputSlot) {
            furnace.inputSlot.count -= recipe.inputs[0].count;
            if (furnace.inputSlot.count <= 0) {
              furnace.inputSlot = null;
            }
          }

          // Add to output stack
          if (!furnace.outputSlot) {
            furnace.outputSlot = InventoryManager.createStack(recipe.output.itemId, recipe.output.count);
          } else {
            furnace.outputSlot.count += recipe.output.count;
          }
        }
      } else {
        // If not burning or no valid recipe, slowly reset cooking progress
        if (furnace.cookProgress > 0) {
          furnace.cookProgress = Math.max(0, furnace.cookProgress - deltaTime * 1.5);
        }
      }
    });
  }

  // Catchup simulation for offline elapsed time (chunk reload or world load)
  public static catchupOfflineTime(now: number = Date.now()): void {
    this.furnaces.forEach(furnace => {
      if (!furnace.lastUpdateTimestamp) {
        furnace.lastUpdateTimestamp = now;
        return;
      }

      const elapsedSeconds = Math.min(3600, (now - furnace.lastUpdateTimestamp) / 1000);
      if (elapsedSeconds > 1) {
        // Run fast discrete simulation steps
        const stepSize = 1.0;
        let remainingTime = elapsedSeconds;
        while (remainingTime > 0) {
          const dt = Math.min(stepSize, remainingTime);
          this.updateSingle(furnace, dt);
          remainingTime -= dt;
        }
      }
      furnace.lastUpdateTimestamp = now;
    });
  }

  private static updateSingle(furnace: FurnaceState, deltaTime: number): void {
    const recipe = this.getSmeltingRecipe(furnace.inputSlot);
    const canSmelt = recipe !== null && this.canAcceptOutput(furnace.outputSlot || null, recipe.output.itemId, recipe.output.count);

    if (furnace.burnTimeRemaining > 0) {
      furnace.burnTimeRemaining = Math.max(0, furnace.burnTimeRemaining - deltaTime);
      furnace.isLit = furnace.burnTimeRemaining > 0;
    }

    if (furnace.burnTimeRemaining <= 0 && canSmelt && furnace.fuelSlot) {
      const fuelDef = ITEM_DEFS[furnace.fuelSlot.itemId];
      if (fuelDef && fuelDef.fuelBurnTime && fuelDef.fuelBurnTime > 0) {
        furnace.burnTimeRemaining = fuelDef.fuelBurnTime;
        furnace.maxBurnTime = fuelDef.fuelBurnTime;
        furnace.isLit = true;
        furnace.fuelSlot.count -= 1;
        if (furnace.fuelSlot.count <= 0) {
          furnace.fuelSlot = null;
        }
      }
    }

    if (furnace.isLit && canSmelt && recipe) {
      furnace.cookProgress += deltaTime;
      const maxProgress = furnace.maxCookProgress || 8;
      if (furnace.cookProgress >= maxProgress) {
        furnace.cookProgress = 0;
        if (furnace.inputSlot) {
          furnace.inputSlot.count -= recipe.inputs[0].count;
          if (furnace.inputSlot.count <= 0) furnace.inputSlot = null;
        }
        if (!furnace.outputSlot) {
          furnace.outputSlot = InventoryManager.createStack(recipe.output.itemId, recipe.output.count);
        } else {
          furnace.outputSlot.count += recipe.output.count;
        }
      }
    }
  }

  // Check if output slot can accept the smelted item
  public static canAcceptOutput(outputSlot: ItemStack | null | undefined, outputItemId: string, outputCount: number): boolean {
    if (!outputSlot) return true;
    if (outputSlot.itemId !== outputItemId) return false;
    const def = ITEM_DEFS[outputItemId];
    const maxStack = def ? def.maxStack : 64;
    return outputSlot.count + outputCount <= maxStack;
  }

  // Serialization for WorldSaveData
  public static serialize(): { [posKey: string]: FurnaceState } {
    const result: { [posKey: string]: FurnaceState } = {};
    this.furnaces.forEach((state, key) => {
      result[key] = {
        ...state,
        inputSlot: InventoryManager.sanitizeSlot(state.inputSlot),
        fuelSlot: InventoryManager.sanitizeSlot(state.fuelSlot),
        outputSlot: InventoryManager.sanitizeSlot(state.outputSlot),
      };
    });
    return result;
  }

  // Deserialization from WorldSaveData
  public static deserialize(data?: { [posKey: string]: FurnaceState }): void {
    this.furnaces.clear();
    if (!data) return;

    Object.entries(data).forEach(([key, state]) => {
      if (state && Array.isArray(state.pos)) {
        this.furnaces.set(key, {
          pos: state.pos,
          inputSlot: InventoryManager.sanitizeSlot(state.inputSlot),
          fuelSlot: InventoryManager.sanitizeSlot(state.fuelSlot),
          outputSlot: InventoryManager.sanitizeSlot(state.outputSlot),
          burnTimeRemaining: typeof state.burnTimeRemaining === 'number' ? state.burnTimeRemaining : 0,
          maxBurnTime: typeof state.maxBurnTime === 'number' ? state.maxBurnTime : 0,
          cookProgress: typeof state.cookProgress === 'number' ? state.cookProgress : 0,
          maxCookProgress: typeof state.maxCookProgress === 'number' ? state.maxCookProgress : 8,
          isLit: Boolean(state.isLit),
          lastUpdateTimestamp: typeof state.lastUpdateTimestamp === 'number' ? state.lastUpdateTimestamp : Date.now(),
        });
      }
    });

    this.catchupOfflineTime();
  }
}
