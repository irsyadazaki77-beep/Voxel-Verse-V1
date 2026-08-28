// Farming & Agriculture Manager 2.0: Soil Tilling, Hydration, Growth Cycles & Harvesting
import { BlockType, FarmingPlotState, ItemStack } from '../../types';
import { VoxelWorld } from './VoxelWorld';
import { InventoryManager } from '../items/InventoryManager';

export class FarmingManager {
  // Map: "x,y,z" -> FarmingPlotState (pos is the FARMLAND block)
  public static plots: Map<string, FarmingPlotState> = new Map();

  // Till dirt/grass into farmland
  public static tillSoil(pos: [number, number, number], world: VoxelWorld): boolean {
    const [x, y, z] = pos;
    const currentBlock = world.getBlock(x, y, z);
    const aboveBlock = world.getBlock(x, y + 1, z);

    // Can only till if block above is Air and current is Grass or Dirt
    if (aboveBlock !== BlockType.AIR) return false;
    if (currentBlock !== BlockType.GRASS && currentBlock !== BlockType.DIRT) return false;

    // Convert block to Farmland
    world.setBlock(x, y, z, BlockType.FARMLAND);

    const isHydrated = this.checkWaterNearby(x, y, z, world);
    const key = `${x},${y},${z}`;
    this.plots.set(key, {
      pos,
      isHydrated,
      cropType: null,
      growthStage: 0,
      maxGrowthStage: 3,
      growthProgress: 0,
      growthDuration: 25,
      lastTickTimestamp: Date.now(),
    });

    return true;
  }

  // Plant a crop seed onto farmland
  public static plantSeed(
    farmlandPos: [number, number, number],
    seedItemId: string,
    world: VoxelWorld
  ): boolean {
    const [x, y, z] = posToCoord(farmlandPos);
    const key = `${x},${y},${z}`;

    const plot: FarmingPlotState = this.plots.get(key) || {
      pos: farmlandPos,
      isHydrated: this.checkWaterNearby(x, y, z, world),
      cropType: null,
      growthStage: 0,
      maxGrowthStage: 3,
      growthProgress: 0,
      growthDuration: 25,
      lastTickTimestamp: Date.now(),
    };

    const blockAbove = world.getBlock(x, y + 1, z);
    if (blockAbove !== BlockType.AIR && blockAbove !== BlockType.TALL_GRASS) {
      return false;
    }

    if (seedItemId === 'seeds_wheat') {
      plot.cropType = 'wheat';
      plot.growthStage = 0;
      plot.maxGrowthStage = 3;
      plot.growthProgress = 0;
      world.setBlock(x, y + 1, z, BlockType.CROP_WHEAT_0);
      this.plots.set(key, plot);
      return true;
    }

    if (seedItemId === 'wild_carrot') {
      plot.cropType = 'carrot';
      plot.growthStage = 0;
      plot.maxGrowthStage = 1;
      plot.growthProgress = 0;
      world.setBlock(x, y + 1, z, BlockType.CROP_CARROT);
      this.plots.set(key, plot);
      return true;
    }

    if (seedItemId === 'crop_herb') {
      plot.cropType = 'herb';
      plot.growthStage = 0;
      plot.maxGrowthStage = 1;
      plot.growthProgress = 0;
      world.setBlock(x, y + 1, z, BlockType.CROP_HERB);
      this.plots.set(key, plot);
      return true;
    }

    return false;
  }

  // Accelerate growth using bone meal
  public static applyFertilizer(farmlandPos: [number, number, number], world: VoxelWorld): boolean {
    const [x, y, z] = posToCoord(farmlandPos);
    const key = `${x},${y},${z}`;
    const plot = this.plots.get(key);
    if (!plot || !plot.cropType) return false;

    if (plot.growthStage < plot.maxGrowthStage) {
      plot.growthStage = Math.min(plot.maxGrowthStage, plot.growthStage + 1 + (Math.random() > 0.5 ? 1 : 0));
      plot.growthProgress = 0;
      this.syncCropBlock(plot, world);
      return true;
    }
    return false;
  }

  // Harvest ripe crop from farmland
  public static harvestCrop(
    farmlandPos: [number, number, number],
    world: VoxelWorld
  ): { success: boolean; drops: ItemStack[] } {
    const [x, y, z] = posToCoord(farmlandPos);
    const key = `${x},${y},${z}`;
    const plot = this.plots.get(key);

    if (!plot || !plot.cropType) {
      return { success: false, drops: [] };
    }

    const drops: ItemStack[] = [];
    const isMature = plot.growthStage >= plot.maxGrowthStage;

    if (plot.cropType === 'wheat') {
      if (isMature) {
        const wheatCount = 1 + Math.floor(Math.random() * 2); // 1-2 wheat
        const seedCount = 1 + Math.floor(Math.random() * 3); // 1-3 seeds
        drops.push(InventoryManager.createStack('crop_wheat', wheatCount)!);
        drops.push(InventoryManager.createStack('seeds_wheat', seedCount)!);
      } else {
        drops.push(InventoryManager.createStack('seeds_wheat', 1)!);
      }
    } else if (plot.cropType === 'carrot') {
      if (isMature) {
        drops.push(InventoryManager.createStack('wild_carrot', 2 + Math.floor(Math.random() * 3))!);
      } else {
        drops.push(InventoryManager.createStack('wild_carrot', 1)!);
      }
    } else if (plot.cropType === 'herb') {
      if (isMature) {
        drops.push(InventoryManager.createStack('crop_herb', 2 + Math.floor(Math.random() * 2))!);
      } else {
        drops.push(InventoryManager.createStack('crop_herb', 1)!);
      }
    }

    // Clear crop block above
    world.setBlock(x, y + 1, z, BlockType.AIR);
    plot.cropType = null;
    plot.growthStage = 0;
    plot.growthProgress = 0;

    return { success: true, drops };
  }

  // Main growth update loop
  public static update(deltaTime: number, world: VoxelWorld): void {
    const now = Date.now();

    this.plots.forEach((plot, key) => {
      const [x, y, z] = plot.pos;
      plot.lastTickTimestamp = now;

      // Verify farmland block still exists
      const currentBlock = world.getBlock(x, y, z);
      if (currentBlock !== BlockType.FARMLAND) {
        this.plots.delete(key);
        return;
      }

      // Check hydration every few seconds
      plot.isHydrated = this.checkWaterNearby(x, y, z, world);

      if (plot.cropType) {
        // Crop is growing!
        if (plot.growthStage < plot.maxGrowthStage) {
          // Growth speed: Hydrated plots grow 2.5x faster
          const speedMultiplier = plot.isHydrated ? 2.5 : 1.0;
          const stageDuration = 25; // seconds per growth stage
          plot.growthProgress += (deltaTime * speedMultiplier) / stageDuration;

          if (plot.growthProgress >= 1.0) {
            plot.growthProgress = 0;
            plot.growthStage += 1;
            this.syncCropBlock(plot, world);
          }
        }
      } else {
        // Empty farmland: if unhydrated, 5% chance per minute to revert to Dirt
        if (!plot.isHydrated && Math.random() < deltaTime * 0.01) {
          world.setBlock(x, y, z, BlockType.DIRT);
          this.plots.delete(key);
        }
      }
    });
  }

  // Synchronize visual voxel in world based on growth stage
  private static syncCropBlock(plot: FarmingPlotState, world: VoxelWorld): void {
    const [x, y, z] = plot.pos;
    if (plot.cropType === 'wheat') {
      const stageBlocks = [
        BlockType.CROP_WHEAT_0,
        BlockType.CROP_WHEAT_1,
        BlockType.CROP_WHEAT_2,
        BlockType.CROP_WHEAT_3,
      ];
      const targetBlock = stageBlocks[Math.min(plot.growthStage, 3)];
      world.setBlock(x, y + 1, z, targetBlock);
    } else if (plot.cropType === 'carrot') {
      world.setBlock(x, y + 1, z, BlockType.CROP_CARROT);
    } else if (plot.cropType === 'herb') {
      world.setBlock(x, y + 1, z, BlockType.CROP_HERB);
    }
  }

  // Check if water is within 4 taxicab blocks
  private static checkWaterNearby(px: number, py: number, pz: number, world: VoxelWorld): boolean {
    for (let dx = -4; dx <= 4; dx++) {
      for (let dz = -4; dz <= 4; dz++) {
        for (let dy = -1; dy <= 1; dy++) {
          const b = world.getBlock(px + dx, py + dy, pz + dz);
          if (b === BlockType.WATER) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // Serialization for WorldSaveData
  public static serialize(): { [posKey: string]: FarmingPlotState } {
    const result: { [posKey: string]: FarmingPlotState } = {};
    this.plots.forEach((state, key) => {
      result[key] = { ...state };
    });
    return result;
  }

  // Deserialization from WorldSaveData
  public static deserialize(data?: { [posKey: string]: FarmingPlotState }, world?: VoxelWorld): void {
    this.plots.clear();
    if (!data) return;

    Object.entries(data).forEach(([key, state]) => {
      if (state && Array.isArray(state.pos)) {
        this.plots.set(key, { ...state });
      }
    });

    if (world) {
      // Re-sync blocks on load
      this.plots.forEach(plot => {
        if (plot.cropType) {
          this.syncCropBlock(plot, world);
        }
      });
    }
  }
}

function posToCoord(pos: [number, number, number]): [number, number, number] {
  return [Math.floor(pos[0]), Math.floor(pos[1]), Math.floor(pos[2])];
}
