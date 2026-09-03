import re

with open('/src/engine/world/FarmingManager.ts', 'r') as f:
    code = f.read()

# First, modify the class to add an event listener for BLOCK_PLACED / BLOCK_MINED to invalidate hydration cache
init_code = '''
import { GameEventBus } from '../events/GameEventBus';
import { BlockType } from '../../types';

let initialized = false;

export class FarmingManager {
  public static initEvents(): void {
    if (initialized) return;
    initialized = true;
    GameEventBus.on('BLOCK_PLACED', ({ pos }) => this.onBlockChanged(pos));
    GameEventBus.on('BLOCK_MINED', ({ pos }) => this.onBlockChanged(pos));
  }

  private static onBlockChanged(pos: [number, number, number]): void {
    const [bx, by, bz] = pos;
    // Check if block is near any plot (within 4 blocks)
    for (const [key, plot] of this.plots.entries()) {
      const [px, py, pz] = plot.pos;
      if (Math.abs(bx - px) <= 4 && Math.abs(by - py) <= 1 && Math.abs(bz - pz) <= 4) {
        plot.hydrationDirty = true;
      }
    }
  }

  // Map: "x,y,z" -> FarmingPlotState (pos is the FARMLAND block)
'''

code = code.replace('export class FarmingManager {\n  // Map: "x,y,z" -> FarmingPlotState', init_code)

# Ensure hydrationDirty is handled in the plot state type if needed, but we can just add it dynamically or cast to any.
# In TypeScript we might need to suppress or we can just extend the FarmingPlotState type since it's probably defined in types.ts.
# Let's just cast to any or add it. Actually, wait. FarmingPlotState might not have hydrationDirty.
# We can just use `(plot as any).hydrationDirty = true;`

init_code = init_code.replace('plot.hydrationDirty = true;', '(plot as any).hydrationDirty = true;')
code = code.replace('import { GameEventBus } from \'../events/GameEventBus\';\nimport { BlockType } from \'../../types\';\n\nlet initialized = false;\n\nexport class FarmingManager {', init_code)

# Add accumulator for update
update_method = '''
  private static accumulator: number = 0;

  // Main growth update loop
  public static update(deltaTime: number, world: VoxelWorld): void {
    this.initEvents();
    this.accumulator += deltaTime;
    // 2 Hz tick
    if (this.accumulator < 0.5) return;
    const dt = this.accumulator;
    this.accumulator = 0;

    const now = Date.now();
    this.plots.forEach((plot, key) => {
      const [x, y, z] = plot.pos;
      plot.lastTickTimestamp = now;

      const currentBlock = world.getBlock(x, y, z);
      if (currentBlock !== BlockType.FARMLAND) {
        this.plots.delete(key);
        return;
      }

      const pAny = plot as any;
      if (pAny.hydrationDirty === undefined || pAny.hydrationDirty) {
        plot.isHydrated = this.checkWaterNearby(x, y, z, world);
        pAny.hydrationDirty = false;
      }

      if (plot.cropType) {
        if (plot.growthStage < plot.maxGrowthStage) {
          const speedMultiplier = plot.isHydrated ? 2.5 : 1.0;
          const stageDuration = 25; // seconds per growth stage
          plot.growthProgress += (dt * speedMultiplier) / stageDuration;
          
          if (plot.growthProgress >= 1.0) {
            plot.growthProgress = 0;
            plot.growthStage += 1;
            this.syncCropBlock(plot, world);
          }
        }
      } else {
        if (!plot.isHydrated && Math.random() < dt * 0.01) {
          world.setBlock(x, y, z, BlockType.DIRT);
          this.plots.delete(key);
        }
      }
    });
  }
'''
code = re.sub(r'// Main growth update loop.*?// Synchronize visual voxel in world based on growth stage', update_method + '  // Synchronize visual voxel in world based on growth stage', code, flags=re.DOTALL)

with open('/src/engine/world/FarmingManager.ts', 'w') as f:
    f.write(code)
