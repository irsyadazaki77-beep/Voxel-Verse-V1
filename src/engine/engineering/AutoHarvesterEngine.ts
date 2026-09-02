// Auto Harvester Engine - Crop Sensing, Harvesting & Replanting Automation
import { BlockType } from '../../types';
import { FarmingManager } from '../world/FarmingManager';
import { VoxelWorld } from '../world/VoxelWorld';
import { BlockPlacementEngine } from '../world/BlockPlacementEngine';
import { InventoryManager } from '../items/InventoryManager';
import { ActuatorEngine } from './ActuatorEngine';
import { AetherNode } from './AetherNetworkTypes';

export class AutoHarvesterEngine {
  public static readonly HARVEST_INTERVAL = 1.0; // seconds

  public static tick(node: AetherNode, dt: number, world: VoxelWorld): boolean {
    if (node.nodeType !== 'harvester') return false;

    node.internalState.timer = (node.internalState.timer || 0) + dt;
    if (node.internalState.timer < this.HARVEST_INTERVAL) {
      return false;
    }
    node.internalState.timer = 0;

    const [hx, hy, hz] = node.pos;
    const facing = node.facing || 'north';
    const dir = ActuatorEngine.getDirectionOffset(facing);

    // Target plot position in front of or below harvester
    const targetPos: [number, number, number] = [hx + dir[0], hy + dir[1], hz + dir[2]];
    const [tx, ty, tz] = targetPos;

    // Check crop block at target
    const targetBlock = world.getBlock(tx, ty, tz);
    let farmlandPos: [number, number, number] | null = null;
    let seedTypeToReplant = 'seeds_wheat';

    if (targetBlock === BlockType.CROP_WHEAT_3) {
      farmlandPos = [tx, ty - 1, tz];
      seedTypeToReplant = 'seeds_wheat';
    } else if (targetBlock === BlockType.CROP_CARROT) {
      farmlandPos = [tx, ty - 1, tz];
      seedTypeToReplant = 'wild_carrot';
    } else if (targetBlock === BlockType.CROP_HERB) {
      farmlandPos = [tx, ty - 1, tz];
      seedTypeToReplant = 'crop_herb';
    }

    if (!farmlandPos) return false;

    // Execute harvest
    const harvestRes = FarmingManager.harvestCrop(farmlandPos, world);
    if (!harvestRes.success || harvestRes.drops.length === 0) return false;

    // Deposit drops into container attached to harvester (e.g. behind or above)
    const containerPos: [number, number, number] = [hx - dir[0], hy - dir[1], hz - dir[2]];
    const targetContainer = BlockPlacementEngine.getContainer(containerPos);

    if (targetContainer) {
      harvestRes.drops.forEach((drop) => {
        InventoryManager.addItem(targetContainer, drop.itemId, drop.count);
      });
      BlockPlacementEngine.setContainer(containerPos, targetContainer);
    }

    // Auto replant seed onto farmland
    FarmingManager.plantSeed(farmlandPos, seedTypeToReplant, world);
    return true;
  }
}
