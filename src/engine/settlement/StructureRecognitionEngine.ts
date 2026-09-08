// Living World Integration — Structure Recognition Engine
// Scans, classifies, and evaluates player-built structures (houses, workshops, farms, storage, defenses, leyline hubs)
// Integrates player building with Settlement progression and NPC routines.

import { BlockType } from '../../types';
import { VoxelWorld } from '../world/VoxelWorld';
import { Logger } from '../ui/Logger';

export type StructureCategory =
  | 'house'           // Shelter: Bed + Door + Walls + Roof + Lighting
  | 'workshop'        // Crafting/Smelting: Workbenches, Furnaces, Anvils, Fabricators
  | 'farm'            // Agriculture: Farmland, Crops, Irrigation, Harvester
  | 'storage'         // Depots: Chests, Storage Relays, Funnels
  | 'defense'         // Fortifications: Turrets, Traps, Fences, Gates
  | 'leyline_hub'     // Energy Core, Conduits, Sensors, Logic Runes
  | 'infrastructure';  // Roads, Bridges, Rail lines

export interface RecognizedStructure {
  id: string;
  category: StructureCategory;
  name: string;
  originPos: [number, number, number];
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
  };
  blockCount: number;
  hasBed: boolean;
  hasDoor: boolean;
  hasLight: boolean;
  hasWorkstation: boolean;
  hasLeylineConnection: boolean;
  settlementId?: string;
  qualityRating: number; // 1 - 100
  createdAt: number;
  metadata?: Record<string, any>;
}

export class StructureRecognitionEngine {
  private static recognizedStructures: Map<string, RecognizedStructure> = new Map();

  public static clear(): void {
    this.recognizedStructures.clear();
  }

  // Generate deterministic ID for structure based on origin position and category
  public static generateStructureId(pos: [number, number, number], category: StructureCategory): string {
    return `struct_${category}_${Math.floor(pos[0])}_${Math.floor(pos[1])}_${Math.floor(pos[2])}`;
  }

  // Helper: Check if block is solid building material
  public static isBuildingBlock(blockType: BlockType): boolean {
    switch (blockType) {
      case BlockType.WOOD_PLANKS:
      case BlockType.WOOD_STAIRS:
      case BlockType.WOOD_SLAB:
      case BlockType.STONE:
      case BlockType.COBBLESTONE:
      case BlockType.STONE_BRICKS:
      case BlockType.STONE_STAIRS:
      case BlockType.STONE_SLAB:
      case BlockType.STONE_PILLAR:
      case BlockType.GLASS:
      case BlockType.COPPER_BLOCK:
      case BlockType.IRON_BLOCK:
      case BlockType.GOLD_BLOCK:
      case BlockType.MYTHRIL_BLOCK:
      case BlockType.MOSS_STONE:
      case BlockType.OBSIDIAN:
      case BlockType.BASALT:
      case BlockType.ANCIENT_RUNE_STONE:
        return true;
      default:
        return false;
    }
  }

  // Scan a bounding area around a target voxel to evaluate player-built structures
  public static scanStructureAt(
    world: VoxelWorld | null,
    centerPos: [number, number, number],
    radius: number = 8,
    nearestSettlementId?: string
  ): RecognizedStructure | null {
    const cx = Math.floor(centerPos[0]);
    const cy = Math.floor(centerPos[1]);
    const cz = Math.floor(centerPos[2]);

    let blockCount = 0;
    let hasBed = false;
    let hasDoor = false;
    let hasLight = false;
    let hasWorkstation = false;
    let hasLeylineConnection = false;
    let farmlandCount = 0;
    let chestCount = 0;
    let defenseCount = 0;
    let leylineCount = 0;

    const minX = cx - radius;
    const maxX = cx + radius;
    const minY = Math.max(0, cy - radius);
    const maxY = Math.min(255, cy + radius);
    const minZ = cz - radius;
    const maxZ = cz + radius;

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          const block = world ? world.getBlock(x, y, z) : BlockType.AIR;
          if (block === BlockType.AIR) continue;

          if (this.isBuildingBlock(block)) {
            blockCount++;
          }

          if (block === BlockType.BED_HEAD || block === BlockType.BED_FOOT) {
            hasBed = true;
          } else if (block === BlockType.DOOR_BOTTOM || block === BlockType.DOOR_TOP) {
            hasDoor = true;
          } else if (
            block === BlockType.TORCH ||
            block === BlockType.LANTERN ||
            block === BlockType.AETHER_LAMP ||
            block === BlockType.GLOWSTONE_CRYSTAL
          ) {
            hasLight = true;
          } else if (
            block === BlockType.CRAFTING_BENCH ||
            block === BlockType.FURNACE ||
            block === BlockType.ANVIL_SMITHING ||
            block === BlockType.RESONANCE_FABRICATOR
          ) {
            hasWorkstation = true;
          } else if (
            block === BlockType.AETHER_CORE ||
            block === BlockType.AETHER_CORE_ADVANCED ||
            block === BlockType.LEY_CONDUIT ||
            block === BlockType.LEY_GENERATOR
          ) {
            hasLeylineConnection = true;
            leylineCount++;
          } else if (
            block === BlockType.FARMLAND ||
            block === BlockType.CROP_WHEAT_0 ||
            block === BlockType.CROP_WHEAT_1 ||
            block === BlockType.CROP_WHEAT_2 ||
            block === BlockType.CROP_WHEAT_3 ||
            block === BlockType.CROP_CARROT ||
            block === BlockType.CROP_HERB ||
            block === BlockType.IRRIGATION_NODE ||
            block === BlockType.LEY_HARVESTER
          ) {
            farmlandCount++;
          } else if (block === BlockType.CHEST || block === BlockType.AETHER_STORAGE_RELAY || block === BlockType.ITEM_FUNNEL) {
            chestCount++;
          } else if (
            block === BlockType.AETHER_SENTINEL_TURRET ||
            block === BlockType.AETHER_SPIKE ||
            block === BlockType.SHOCK_RUNE ||
            block === BlockType.FLAME_VENT ||
            block === BlockType.FENCE_WOOD
          ) {
            defenseCount++;
          }
        }
      }
    }

    // Minimum requirement for structure recognition: at least 6 structural or functional blocks
    const totalFunctional = (hasBed ? 2 : 0) + (hasDoor ? 2 : 0) + (hasWorkstation ? 3 : 0) + farmlandCount + chestCount + defenseCount + leylineCount;
    if (blockCount < 4 && totalFunctional < 2) {
      return null;
    }

    // Determine primary category with logical priority for workstations & shelter
    let category: StructureCategory = 'house';

    if (leylineCount >= 3) {
      category = 'leyline_hub';
    } else if (hasWorkstation) {
      category = 'workshop';
    } else if (hasBed || hasDoor) {
      category = 'house';
    } else if (farmlandCount >= 4) {
      category = 'farm';
    } else if (chestCount >= 3) {
      category = 'storage';
    } else if (defenseCount >= 2) {
      category = 'defense';
    } else {
      category = 'infrastructure';
    }

    // Quality Rating calculation (1-100)
    let quality = Math.min(60, blockCount * 2);
    if (hasLight) quality += 10;
    if (hasDoor) quality += 10;
    if (hasBed) quality += 10;
    if (hasWorkstation) quality += 10;
    if (hasLeylineConnection) quality += 15;
    quality = Math.min(100, Math.max(10, quality));

    const id = this.generateStructureId(centerPos, category);

    const names: Record<StructureCategory, string> = {
      house: 'Rumah Hunian Pemain (Shelter)',
      workshop: 'Bengkel Kerja & Bengkel Tempa (Workshop)',
      farm: 'Lahan Pertanian & Irigasi (Automated Farm)',
      storage: 'Lumbung & Gudang Logistik (Storage Hub)',
      defense: 'Benteng & Menara Pertahanan (Fortification)',
      leyline_hub: 'Stasiun Daya Leyline (Power Hub)',
      infrastructure: 'Jalur Fasilitas & Jalan Adat (Infrastructure)',
    };

    const structure: RecognizedStructure = {
      id,
      category,
      name: names[category],
      originPos: [cx, cy, cz],
      bounds: {
        min: [minX, minY, minZ],
        max: [maxX, maxY, maxZ],
      },
      blockCount,
      hasBed,
      hasDoor,
      hasLight,
      hasWorkstation,
      hasLeylineConnection,
      settlementId: nearestSettlementId,
      qualityRating: quality,
      createdAt: Date.now(),
    };

    this.recognizedStructures.set(id, structure);
    Logger.info('StructureRecognitionEngine', `Recognized player structure [${structure.name}] at ${cx},${cy},${cz} (Quality: ${quality})`);
    return structure;
  }

  public static getStructure(id: string): RecognizedStructure | undefined {
    return this.recognizedStructures.get(id);
  }

  public static getAllStructures(): RecognizedStructure[] {
    return Array.from(this.recognizedStructures.values());
  }

  public static getStructuresBySettlement(settlementId: string): RecognizedStructure[] {
    return this.getAllStructures().filter((s) => s.settlementId === settlementId);
  }

  public static registerStructure(structure: RecognizedStructure): void {
    this.recognizedStructures.set(structure.id, structure);
  }

  public static serialize(): Record<string, RecognizedStructure> {
    const data: Record<string, RecognizedStructure> = {};
    this.recognizedStructures.forEach((val, key) => {
      data[key] = { ...val };
    });
    return data;
  }

  public static deserialize(data?: Record<string, RecognizedStructure>): void {
    this.recognizedStructures.clear();
    if (!data) return;
    Object.entries(data).forEach(([key, val]) => {
      if (val && val.id) {
        this.recognizedStructures.set(key, { ...val });
      }
    });
  }
}
