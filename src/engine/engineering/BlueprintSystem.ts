// Blueprint Structure Engine - Small Structure Blueprints & Survival Material Assembly
import { BlockType } from '../../types';
import { VoxelWorld } from '../world/VoxelWorld';
import { InventoryManager } from '../items/InventoryManager';
import { BLOCK_DEFS } from '../world/BlockRegistry';
import { BlueprintStructure } from './AetherNetworkTypes';

export class BlueprintSystem {
  public static readonly BLUEPRINT_REGISTRY: Map<string, BlueprintStructure> = new Map();

  public static registerBlueprint(blueprint: BlueprintStructure): void {
    this.BLUEPRINT_REGISTRY.set(blueprint.id, blueprint);
  }

  // Evaluate if player inventory contains required blueprint items
  public static validateMaterials(
    blueprintId: string,
    playerInventory: (any | null)[]
  ): { valid: boolean; missing: Array<{ itemId: string; required: number; count: number }> } {
    const bp = this.BLUEPRINT_REGISTRY.get(blueprintId);
    if (!bp) return { valid: false, missing: [] };

    const missing: Array<{ itemId: string; required: number; count: number }> = [];

    bp.requiredItems.forEach((req) => {
      const hasCount = InventoryManager.countItem(playerInventory, req.itemId);
      if (hasCount < req.count) {
        missing.push({ itemId: req.itemId, required: req.count, count: hasCount });
      }
    });

    return { valid: missing.length === 0, missing };
  }

  // Construct blueprint structure at origin position
  public static buildBlueprint(
    blueprintId: string,
    originPos: [number, number, number],
    world: VoxelWorld,
    playerInventory?: (any | null)[]
  ): boolean {
    const bp = this.BLUEPRINT_REGISTRY.get(blueprintId);
    if (!bp) return false;

    // Validate materials if inventory provided
    if (playerInventory) {
      const evalRes = this.validateMaterials(blueprintId, playerInventory);
      if (!evalRes.valid) return false;

      // Consume materials
      bp.requiredItems.forEach((req) => {
        InventoryManager.removeItem(playerInventory, req.itemId, req.count);
      });
    }

    const [ox, oy, oz] = originPos;

    // Place structure blocks
    bp.blocks.forEach((item) => {
      const targetX = ox + item.relPos[0];
      const targetY = oy + item.relPos[1];
      const targetZ = oz + item.relPos[2];

      world.setBlock(targetX, targetY, targetZ, item.blockType);
    });

    return true;
  }
}

// Register default pre-built engineering blueprints
BlueprintSystem.registerBlueprint({
  id: 'bp_auto_harvester_unit',
  name: 'Auto-Harvester Station',
  dimensions: [3, 2, 3],
  blocks: [
    { relPos: [0, 0, 0], blockType: BlockType.FARMLAND },
    { relPos: [1, 0, 0], blockType: BlockType.FARMLAND },
    { relPos: [2, 0, 0], blockType: BlockType.FARMLAND },
    { relPos: [1, 1, 0], blockType: BlockType.LEY_HARVESTER },
    { relPos: [1, 1, 1], blockType: BlockType.CHEST },
  ],
  requiredItems: [
    { itemId: 'ley_harvester', count: 1 },
    { itemId: 'chest', count: 1 },
  ],
});
