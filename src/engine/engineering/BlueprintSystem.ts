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

  // Export BlueprintStructure to a compact shareable string (VVBP1:<base64>)
  public static exportBlueprintCode(blueprintOrId: string | BlueprintStructure): string {
    const bp =
      typeof blueprintOrId === 'string'
        ? this.BLUEPRINT_REGISTRY.get(blueprintOrId)
        : blueprintOrId;
    if (!bp) return '';

    const payload = {
      v: 1,
      id: bp.id,
      n: bp.name,
      d: bp.dimensions,
      b: bp.blocks.map((blk) => [blk.relPos[0], blk.relPos[1], blk.relPos[2], blk.blockType]),
      r: bp.requiredItems,
    };

    try {
      const jsonStr = JSON.stringify(payload);
      const encoded =
        typeof window !== 'undefined' && window.btoa
          ? window.btoa(encodeURIComponent(jsonStr))
          : jsonStr;
      return `VVBP1:${encoded}`;
    } catch {
      return '';
    }
  }

  // Import BlueprintStructure from a shareable string (VVBP1:<base64> or raw JSON)
  public static importBlueprintCode(code: string): BlueprintStructure | null {
    if (!code || !code.trim()) return null;
    try {
      const clean = code.trim();
      let jsonStr = clean;
      if (clean.startsWith('VVBP1:')) {
        const rawB64 = clean.slice(6);
        jsonStr =
          typeof window !== 'undefined' && window.atob
            ? decodeURIComponent(window.atob(rawB64))
            : rawB64;
      }

      const parsed = JSON.parse(jsonStr);
      if (!parsed || !Array.isArray(parsed.d) || !Array.isArray(parsed.b)) {
        return null;
      }

      const blocks = parsed.b.map((tuple: number[]) => ({
        relPos: [Number(tuple[0]) || 0, Number(tuple[1]) || 0, Number(tuple[2]) || 0] as [number, number, number],
        blockType: (Number(tuple[3]) || BlockType.STONE) as BlockType,
      }));

      const bp: BlueprintStructure = {
        id: parsed.id || `bp_custom_${Date.now()}`,
        name: parsed.n || 'Struktur Kustom Nusantara',
        dimensions: [
          Number(parsed.d[0]) || 3,
          Number(parsed.d[1]) || 3,
          Number(parsed.d[2]) || 3,
        ],
        blocks,
        requiredItems: Array.isArray(parsed.r) ? parsed.r : [],
      };

      this.registerBlueprint(bp);
      return bp;
    } catch {
      return null;
    }
  }
}

// Register default pre-built engineering & Nusantara blueprints
BlueprintSystem.registerBlueprint({
  id: 'bp_auto_harvester_unit',
  name: 'Stasiun Panen Otomatis Subak',
  dimensions: [3, 2, 3],
  blocks: [
    { relPos: [0, 0, 0], blockType: BlockType.FARMLAND },
    { relPos: [1, 0, 0], blockType: BlockType.FARMLAND },
    { relPos: [2, 0, 0], blockType: BlockType.FARMLAND },
    { relPos: [0, 0, 1], blockType: BlockType.TERRACE_WATERWAY },
    { relPos: [2, 0, 1], blockType: BlockType.TERRACE_WATERWAY },
    { relPos: [1, 1, 0], blockType: BlockType.LEY_HARVESTER },
    { relPos: [1, 1, 1], blockType: BlockType.CHEST },
  ],
  requiredItems: [
    { itemId: 'ley_harvester', count: 1 },
    { itemId: 'chest', count: 1 },
  ],
});

BlueprintSystem.registerBlueprint({
  id: 'bp_sentinel_defense_bastion',
  name: 'Menara Pertahanan Desa Sentinel',
  dimensions: [3, 4, 3],
  blocks: [
    { relPos: [0, 0, 0], blockType: BlockType.CARVED_ANDESITE_STONE },
    { relPos: [2, 0, 0], blockType: BlockType.CARVED_ANDESITE_STONE },
    { relPos: [0, 0, 2], blockType: BlockType.CARVED_ANDESITE_STONE },
    { relPos: [2, 0, 2], blockType: BlockType.CARVED_ANDESITE_STONE },
    { relPos: [1, 0, 1], blockType: BlockType.AETHER_CORE },
    { relPos: [1, 1, 1], blockType: BlockType.STONE_ALANG_PILLAR },
    { relPos: [1, 2, 1], blockType: BlockType.STONE_ALANG_PILLAR },
    { relPos: [1, 3, 1], blockType: BlockType.AETHER_SENTINEL_TURRET },
  ],
  requiredItems: [
    { itemId: 'aether_sentinel_turret', count: 1 },
    { itemId: 'aether_core', count: 1 },
  ],
});

BlueprintSystem.registerBlueprint({
  id: 'bp_subak_resonance_forge',
  name: 'Pabrik Peleburan & Fabrikator Ley',
  dimensions: [3, 2, 2],
  blocks: [
    { relPos: [0, 0, 0], blockType: BlockType.VOLCANIC_BRICK },
    { relPos: [1, 0, 0], blockType: BlockType.VOLCANIC_BRICK },
    { relPos: [2, 0, 0], blockType: BlockType.VOLCANIC_BRICK },
    { relPos: [0, 1, 0], blockType: BlockType.LEY_GENERATOR },
    { relPos: [1, 1, 0], blockType: BlockType.LEY_CONDUIT },
    { relPos: [2, 1, 0], blockType: BlockType.RESONANCE_FABRICATOR },
    { relPos: [2, 1, 1], blockType: BlockType.RICE_STORAGE_CHEST },
  ],
  requiredItems: [
    { itemId: 'ley_generator', count: 1 },
    { itemId: 'resonance_fabricator', count: 1 },
  ],
});

