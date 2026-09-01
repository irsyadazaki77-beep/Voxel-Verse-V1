// Advanced Block Placement Engine 2.0: Orientation, Doors, Slabs, Stairs, Torches, Gravity Blocks & Chest Containers
import * as THREE from 'three';
import { BlockType, GameMode, ItemStack, RaycastHit } from '../../types';
import { BLOCK_DEFS } from './BlockRegistry';
import { VoxelWorld } from './VoxelWorld';

export interface PlacementResult {
  allowed: boolean;
  blockTypeToPlace: BlockType;
  placePos: [number, number, number];
  extraBlocks?: { pos: [number, number, number]; blockType: BlockType }[];
}

export class BlockPlacementEngine {
  // Container storage map: "x,y,z" -> (ItemStack | null)[] (27 slots for chest)
  public static containers: Map<string, (ItemStack | null)[]> = new Map();

  // Validate and determine proper block type, orientation, and multi-block structure
  public static evaluatePlacement(
    hit: RaycastHit,
    selectedBlock: BlockType,
    playerAABB: THREE.Box3,
    playerYaw: number,
    world: VoxelWorld
  ): PlacementResult {
    const [px, py, pz] = hit.placePos;
    const bDef = BLOCK_DEFS[selectedBlock];

    if (!bDef) {
      return { allowed: false, blockTypeToPlace: BlockType.AIR, placePos: hit.placePos };
    }

    // 1. AABB Collision Check against player (only for solid blocks)
    if (bDef.solid) {
      const blockBox = new THREE.Box3(
        new THREE.Vector3(px + 0.01, py + 0.01, pz + 0.01),
        new THREE.Vector3(px + 0.99, py + 0.99, pz + 0.99)
      );
      if (playerAABB.intersectsBox(blockBox)) {
        return { allowed: false, blockTypeToPlace: selectedBlock, placePos: hit.placePos };
      }
    }

    // 2. Door Multi-Block Handling (2-block height)
    if (selectedBlock === BlockType.DOOR_BOTTOM || selectedBlock === BlockType.DOOR_TOP) {
      const topBlock = world.getBlock(px, py + 1, pz);
      if (topBlock !== BlockType.AIR) {
        return { allowed: false, blockTypeToPlace: selectedBlock, placePos: hit.placePos };
      }
      // Check top block against player AABB too
      const topBox = new THREE.Box3(
        new THREE.Vector3(px + 0.01, py + 1.01, pz + 0.01),
        new THREE.Vector3(px + 0.99, py + 1.99, pz + 0.99)
      );
      if (playerAABB.intersectsBox(topBox)) {
        return { allowed: false, blockTypeToPlace: selectedBlock, placePos: hit.placePos };
      }

      return {
        allowed: true,
        blockTypeToPlace: BlockType.DOOR_BOTTOM,
        placePos: [px, py, pz],
        extraBlocks: [{ pos: [px, py + 1, pz], blockType: BlockType.DOOR_TOP }],
      };
    }

    // 3. Torch Placement rules (cannot hang on air)
    if (selectedBlock === BlockType.TORCH || selectedBlock === BlockType.LANTERN) {
      const belowBlock = world.getBlock(px, py - 1, pz);
      const isFloorSolid = belowBlock !== BlockType.AIR && Boolean(BLOCK_DEFS[belowBlock]?.solid);
      const isWallSolid = hit.faceNormal[1] === 0; // Attached to a side wall

      if (!isFloorSolid && !isWallSolid) {
        return { allowed: false, blockTypeToPlace: selectedBlock, placePos: hit.placePos };
      }
    }

    // 4. Slab combination: placing slab on matching slab turns it into full block
    if (hit.blockType === BlockType.WOOD_SLAB && selectedBlock === BlockType.WOOD_SLAB) {
      return {
        allowed: true,
        blockTypeToPlace: BlockType.WOOD_PLANKS,
        placePos: hit.blockPos,
      };
    }
    if (hit.blockType === BlockType.STONE_SLAB && selectedBlock === BlockType.STONE_SLAB) {
      return {
        allowed: true,
        blockTypeToPlace: BlockType.STONE_BRICKS,
        placePos: hit.blockPos,
      };
    }

    return {
      allowed: true,
      blockTypeToPlace: selectedBlock,
      placePos: [px, py, pz],
    };
  }

  // Handle block removal with multi-block cleanup (e.g. doors)
  public static handleBlockDestruction(
    pos: [number, number, number],
    blockType: BlockType,
    world: VoxelWorld
  ): [number, number, number][] {
    const [x, y, z] = pos;
    const removedPositions: [number, number, number][] = [pos];

    // If bottom half of door is broken, break top half
    if (blockType === BlockType.DOOR_BOTTOM) {
      const topBlock = world.getBlock(x, y + 1, z);
      if (topBlock === BlockType.DOOR_TOP) {
        world.setBlock(x, y + 1, z, BlockType.AIR);
        removedPositions.push([x, y + 1, z]);
      }
    }

    // If top half of door is broken, break bottom half
    if (blockType === BlockType.DOOR_TOP) {
      const bottomBlock = world.getBlock(x, y - 1, z);
      if (bottomBlock === BlockType.DOOR_BOTTOM) {
        world.setBlock(x, y - 1, z, BlockType.AIR);
        removedPositions.push([x, y - 1, z]);
      }
    }

    // Clean container data if chest is broken
    if (blockType === BlockType.CHEST) {
      const key = `${x},${y},${z}`;
      this.containers.delete(key);
    }

    // Trigger local gravity update for blocks above (e.g. falling sand/gravel)
    this.updateGravityBlocksAbove(x, y + 1, z, world);

    return removedPositions;
  }

  // Check gravity blocks (Sand & Gravel falling)
  public static updateGravityBlocksAbove(x: number, startY: number, z: number, world: VoxelWorld): void {
    let currY = startY;
    while (currY < 128) {
      const b = world.getBlock(x, currY, z);
      if (b === BlockType.SAND || b === BlockType.GRAVEL) {
        // Check if block below is Air
        let targetY = currY - 1;
        while (targetY >= 0 && world.getBlock(x, targetY, z) === BlockType.AIR) {
          targetY--;
        }
        targetY++;

        if (targetY < currY) {
          world.setBlock(x, currY, z, BlockType.AIR);
          world.setBlock(x, targetY, z, b);
        }
      } else {
        break;
      }
      currY++;
    }
  }

  // Generate thematic high-quality procedural loot for unopened naturally generated chests
  private static generateProceduralLoot(pos: [number, number, number]): (ItemStack | null)[] {
    const [x, y, z] = pos;
    const slots: (ItemStack | null)[] = new Array(27).fill(null);
    const distFromOrigin = Math.hypot(x, z);

    const lootTable: { itemId: string; min: number; max: number; chance: number }[] = [];

    if (y < 45) {
      // Subterranean Dungeon / Vault Chest
      lootTable.push(
        { itemId: 'iron_ingot', min: 4, max: 8, chance: 0.9 },
        { itemId: 'gold_ingot', min: 2, max: 5, chance: 0.7 },
        { itemId: 'healing_potion', min: 1, max: 3, chance: 0.8 },
        { itemId: 'swiftness_potion', min: 1, max: 2, chance: 0.5 },
        { itemId: 'wooden_arrow', min: 8, max: 24, chance: 0.75 },
        { itemId: 'hearty_stew', min: 1, max: 2, chance: 0.6 },
        { itemId: 'ancient_tome', min: 1, max: 2, chance: 0.45 },
        { itemId: 'mythril_ingot', min: 1, max: 3, chance: 0.35 },
        { itemId: 'eye_of_aether', min: 1, max: 1, chance: 0.15 },
        { itemId: 'chrono_core', min: 1, max: 1, chance: 0.1 }
      );
    } else if (distFromOrigin < 120) {
      // Haven / Starter Area Chest
      lootTable.push(
        { itemId: 'bread', min: 3, max: 6, chance: 1.0 },
        { itemId: 'torch', min: 4, max: 12, chance: 0.9 },
        { itemId: 'stick', min: 4, max: 10, chance: 0.85 },
        { itemId: 'raw_copper', min: 4, max: 8, chance: 0.8 },
        { itemId: 'wild_carrot', min: 2, max: 5, chance: 0.7 },
        { itemId: 'healing_potion', min: 1, max: 1, chance: 0.4 }
      );
    } else if (distFromOrigin < 450) {
      // Mid-Range Frontier (Suncrest Agricultural area)
      lootTable.push(
        { itemId: 'copper_ingot', min: 4, max: 8, chance: 0.9 },
        { itemId: 'bread', min: 4, max: 8, chance: 0.85 },
        { itemId: 'baked_potato', min: 3, max: 6, chance: 0.8 },
        { itemId: 'leather_pelt', min: 2, max: 5, chance: 0.75 },
        { itemId: 'cooked_meat', min: 2, max: 4, chance: 0.7 },
        { itemId: 'iron_ingot', min: 2, max: 4, chance: 0.5 },
        { itemId: 'healing_potion', min: 1, max: 2, chance: 0.5 }
      );
    } else {
      // Deep Frontier / Outpost Bastion
      lootTable.push(
        { itemId: 'iron_ingot', min: 6, max: 12, chance: 0.95 },
        { itemId: 'coal', min: 8, max: 16, chance: 0.9 },
        { itemId: 'hearty_stew', min: 2, max: 4, chance: 0.8 },
        { itemId: 'gold_ingot', min: 2, max: 4, chance: 0.6 },
        { itemId: 'mythril_ingot', min: 1, max: 3, chance: 0.4 },
        { itemId: 'swiftness_potion', min: 1, max: 3, chance: 0.6 },
        { itemId: 'ancient_tome', min: 1, max: 2, chance: 0.5 }
      );
    }

    let slotIdx = 0;
    for (const item of lootTable) {
      if (Math.random() <= item.chance && slotIdx < 27) {
        const count = item.min + Math.floor(Math.random() * (item.max - item.min + 1));
        // Distribute loosely in chest slots
        const targetSlot = Math.min(26, slotIdx * 2 + Math.floor(Math.random() * 2));
        if (!slots[targetSlot]) {
          slots[targetSlot] = { itemId: item.itemId, count };
        } else {
          slots[slotIdx] = { itemId: item.itemId, count };
        }
        slotIdx++;
      }
    }

    return slots;
  }

  // Get or initialize container storage
  public static getContainer(pos: [number, number, number]): (ItemStack | null)[] {
    const key = `${pos[0]},${pos[1]},${pos[2]}`;
    if (!this.containers.has(key)) {
      const generated = this.generateProceduralLoot(pos);
      this.containers.set(key, generated);
    }
    return this.containers.get(key)!;
  }

  // Update container storage
  public static setContainer(pos: [number, number, number], items: (ItemStack | null)[]): void {
    const key = `${pos[0]},${pos[1]},${pos[2]}`;
    this.containers.set(key, [...items]);
  }

  // Serialize all containers for save data
  public static serializeContainers(): { [posKey: string]: (ItemStack | null)[] } {
    const result: { [posKey: string]: (ItemStack | null)[] } = {};
    this.containers.forEach((items, key) => {
      if (items.some(slot => slot !== null)) {
        result[key] = items;
      }
    });
    return result;
  }

  // Deserialize containers from save data
  public static deserializeContainers(data?: { [posKey: string]: (ItemStack | null)[] }): void {
    this.containers.clear();
    if (data) {
      Object.entries(data).forEach(([key, items]) => {
        if (Array.isArray(items)) {
          this.containers.set(key, items);
        }
      });
    }
  }
}
