// Blueprint Structure Engine - Small Structure Blueprints & Survival Material Assembly
import { BlockType } from '../../types';
import { VoxelWorld } from '../world/VoxelWorld';
import { InventoryManager } from '../items/InventoryManager';
import { BLOCK_DEFS } from '../world/BlockRegistry';
import { BlueprintStructure } from './AetherNetworkTypes';
import { BlockState, Rotation90 } from '../world/BlockState';
import { BlockStateTransform } from '../world/BlockStateTransform';

export class BlueprintSystem {
  public static readonly BLUEPRINT_REGISTRY: Map<string, BlueprintStructure> = new Map();

  public static registerBlueprint(blueprint: BlueprintStructure): void {
    this.BLUEPRINT_REGISTRY.set(blueprint.id, blueprint);
  }

  // Copy a region from world into a new BlueprintStructure including BlockStates
  public static createFromWorld(
    id: string,
    name: string,
    minPos: [number, number, number],
    maxPos: [number, number, number],
    world: VoxelWorld
  ): BlueprintStructure {
    const minX = Math.min(minPos[0], maxPos[0]);
    const minY = Math.min(minPos[1], maxPos[1]);
    const minZ = Math.min(minPos[2], maxPos[2]);
    const maxX = Math.max(minPos[0], maxPos[0]);
    const maxY = Math.max(minPos[1], maxPos[1]);
    const maxZ = Math.max(minPos[2], maxPos[2]);

    const blocks: Array<{ relPos: [number, number, number]; blockType: BlockType; state?: BlockState }> = [];
    const itemCounts = new Map<string, number>();

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const bType = world.getBlock(x, y, z);
          if (bType === BlockType.AIR) continue;

          const state = world.getBlockState(x, y, z);
          const relPos: [number, number, number] = [x - minX, y - minY, z - minZ];
          blocks.push({
            relPos,
            blockType: bType,
            state: { ...state },
          });

          const def = BLOCK_DEFS[bType];
          const itemId = def?.dropItem || def?.name?.toLowerCase().replace(/\s+/g, '_') || 'stone';
          itemCounts.set(itemId, (itemCounts.get(itemId) || 0) + 1);
        }
      }
    }

    const requiredItems = Array.from(itemCounts.entries()).map(([itemId, count]) => ({ itemId, count }));
    const dimensions: [number, number, number] = [maxX - minX + 1, maxY - minY + 1, maxZ - minZ + 1];

    const bp: BlueprintStructure = {
      id,
      name,
      dimensions,
      blocks,
      requiredItems,
    };

    this.registerBlueprint(bp);
    return bp;
  }

  // Rotate an entire blueprint and its constituent block states
  public static rotateBlueprint(blueprint: BlueprintStructure, angle: Rotation90): BlueprintStructure {
    if (angle === 0) return { ...blueprint };

    const rotatedRaw = BlockStateTransform.rotateStructure(
      blueprint.blocks.map((b) => ({
        pos: b.relPos,
        blockType: b.blockType,
        state: b.state,
      })),
      angle
    );

    // Normalize coordinates to 0-based relative coordinates
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const r of rotatedRaw) {
      minX = Math.min(minX, r.pos[0]);
      minY = Math.min(minY, r.pos[1]);
      minZ = Math.min(minZ, r.pos[2]);
      maxX = Math.max(maxX, r.pos[0]);
      maxY = Math.max(maxY, r.pos[1]);
      maxZ = Math.max(maxZ, r.pos[2]);
    }

    const blocks = rotatedRaw.map((r) => ({
      relPos: [r.pos[0] - minX, r.pos[1] - minY, r.pos[2] - minZ] as [number, number, number],
      blockType: r.blockType,
      state: r.state,
    }));

    const res: BlueprintStructure = {
      ...blueprint,
      id: `${blueprint.id}_rot${angle}`,
      dimensions: [maxX - minX + 1, maxY - minY + 1, maxZ - minZ + 1],
      blocks,
    };
    this.registerBlueprint(res);
    return res;
  }

  // Mirror an entire blueprint and its constituent block states along an axis ('x' | 'z')
  public static mirrorBlueprint(blueprint: BlueprintStructure, axis: 'x' | 'z'): BlueprintStructure {
    const mirroredRaw = BlockStateTransform.mirrorStructure(
      blueprint.blocks.map((b) => ({
        pos: b.relPos,
        blockType: b.blockType,
        state: b.state,
      })),
      axis
    );

    // Normalize coordinates to 0-based relative coordinates
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const m of mirroredRaw) {
      minX = Math.min(minX, m.pos[0]);
      minY = Math.min(minY, m.pos[1]);
      minZ = Math.min(minZ, m.pos[2]);
      maxX = Math.max(maxX, m.pos[0]);
      maxY = Math.max(maxY, m.pos[1]);
      maxZ = Math.max(maxZ, m.pos[2]);
    }

    const blocks = mirroredRaw.map((m) => ({
      relPos: [m.pos[0] - minX, m.pos[1] - minY, m.pos[2] - minZ] as [number, number, number],
      blockType: m.blockType,
      state: m.state,
    }));

    const res: BlueprintStructure = {
      ...blueprint,
      id: `${blueprint.id}_mirror_${axis}`,
      dimensions: [maxX - minX + 1, maxY - minY + 1, maxZ - minZ + 1],
      blocks,
    };
    this.registerBlueprint(res);
    return res;
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
    blueprintOrId: string | BlueprintStructure,
    originPos: [number, number, number],
    world: VoxelWorld,
    playerInventory?: (any | null)[]
  ): boolean {
    const bp = typeof blueprintOrId === 'string'
      ? this.BLUEPRINT_REGISTRY.get(blueprintOrId)
      : blueprintOrId;
    if (!bp) return false;

    // Validate materials if inventory provided
    if (playerInventory) {
      const evalRes = this.validateMaterials(bp.id, playerInventory);
      if (!evalRes.valid) return false;

      // Consume materials
      bp.requiredItems.forEach((req) => {
        InventoryManager.removeItem(playerInventory, req.itemId, req.count);
      });
    }

    const [ox, oy, oz] = originPos;

    // Place structure blocks with exact BlockStates
    bp.blocks.forEach((item) => {
      const targetX = ox + item.relPos[0];
      const targetY = oy + item.relPos[1];
      const targetZ = oz + item.relPos[2];

      world.setBlockWithState(targetX, targetY, targetZ, item.blockType, item.state);
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
