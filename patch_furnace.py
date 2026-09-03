import re

with open('/src/engine/world/FurnaceManager.ts', 'r') as f:
    code = f.read()

recipe_cache = '''
  private static recipeCache: Map<string, any> = new Map();
  private static recipeCacheInitialized = false;

  private static initRecipeCache() {
    if (this.recipeCacheInitialized) return;
    this.recipeCacheInitialized = true;
    for (const r of CRAFTING_RECIPES) {
      if (r.station === 'furnace' && r.inputs[0]) {
        this.recipeCache.set(r.inputs[0].itemId, r);
      }
    }
  }

  // Find furnace recipe for input item
  public static getSmeltingRecipe(inputStack: ItemStack | null | undefined) {
    if (!inputStack) return null;
    this.initRecipeCache();
    return this.recipeCache.get(inputStack.itemId) || null;
  }
'''

code = re.sub(r'// Find furnace recipe for input item.*?return CRAFTING_RECIPES\.find\(\s*r => r\.station === \'furnace\' && r\.inputs\[0\]\?\.itemId === inputStack\.itemId\s*\) \|\| null;\s*\}', recipe_cache, code, flags=re.DOTALL)


update_method = '''
  private static accumulator: number = 0;

  // Main update loop for all active furnaces
  public static update(deltaTime: number): void {
    this.accumulator += deltaTime;
    // 5 Hz tick
    if (this.accumulator < 0.2) return;
    const dt = this.accumulator;
    this.accumulator = 0;

    const now = Date.now();
    this.furnaces.forEach(furnace => {
      // Only process if there's fuel or cook progress or an input
      if (!furnace.isLit && !furnace.fuelSlot && furnace.cookProgress <= 0) return;

      furnace.lastUpdateTimestamp = now;
      this.updateSingle(furnace, dt);
    });
  }
'''

code = re.sub(r'// Main update loop for all active furnaces.*?public static catchupOfflineTime', update_method + '\n  // Catchup simulation for offline elapsed time', code, flags=re.DOTALL)

with open('/src/engine/world/FurnaceManager.ts', 'w') as f:
    f.write(code)
