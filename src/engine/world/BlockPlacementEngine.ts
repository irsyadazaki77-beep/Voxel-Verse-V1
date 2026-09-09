// Advanced Block Placement Engine 2.0: Orientation, Doors, Slabs, Stairs, Torches, Gravity Blocks & Chest Containers
import * as THREE from 'three';
import { BlockType, GameMode, ItemStack, RaycastHit } from '../../types';
import { BLOCK_DEFS } from './BlockRegistry';
import { VoxelWorld } from './VoxelWorld';
import { BlockState } from './BlockState';
import { BlockShapeResolver } from './BlockShapeResolver';

export interface PlacementResult {
  allowed: boolean;
  blockTypeToPlace: BlockType;
  placePos: [number, number, number];
  state?: BlockState;
  extraBlocks?: { pos: [number, number, number]; blockType: BlockType; state?: BlockState }[];
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
    world: VoxelWorld,
    playerPitch: number = 0
  ): PlacementResult {
    const bDef = BLOCK_DEFS[selectedBlock];
    if (!bDef) {
      return { allowed: false, blockTypeToPlace: BlockType.AIR, placePos: hit.placePos };
    }

    // Resolve canonical BlockState, placement coordinates, and any multi-blocks via BlockShapeResolver
    const neighborGetter = (dx: number, dy: number, dz: number) => {
      const wx = hit.placePos[0] + dx;
      const wy = hit.placePos[1] + dy;
      const wz = hit.placePos[2] + dz;
      return world.getBlockState(wx, wy, wz);
    };

    const resolved = BlockShapeResolver.resolvePlacementState(
      selectedBlock,
      hit,
      playerYaw,
      playerPitch,
      neighborGetter
    );

    const [px, py, pz] = resolved.placePos;
    const state = resolved.state;

    // 1. Slab combination: placing slab on matching slab turns it into full block
    if (hit.blockType === BlockType.WOOD_SLAB && selectedBlock === BlockType.WOOD_SLAB) {
      return {
        allowed: true,
        blockTypeToPlace: BlockType.WOOD_PLANKS,
        state: BlockShapeResolver.getDefaultState(BlockType.WOOD_PLANKS),
        placePos: hit.blockPos,
      };
    }
    if (hit.blockType === BlockType.STONE_SLAB && selectedBlock === BlockType.STONE_SLAB) {
      return {
        allowed: true,
        blockTypeToPlace: BlockType.STONE_BRICKS,
        state: BlockShapeResolver.getDefaultState(BlockType.STONE_BRICKS),
        placePos: hit.blockPos,
      };
    }

    // 2. AABB Collision Check against player using precise canonical sub-collision boxes
    const boxes = BlockShapeResolver.getCollisionBoxes(selectedBlock, state);
    for (const b of boxes) {
      const boxMin = new THREE.Vector3(px + b.minX + 0.005, py + b.minY + 0.005, pz + b.minZ + 0.005);
      const boxMax = new THREE.Vector3(px + b.maxX - 0.005, py + b.maxY - 0.005, pz + b.maxZ - 0.005);
      const box = new THREE.Box3(boxMin, boxMax);
      if (playerAABB.intersectsBox(box)) {
        return { allowed: false, blockTypeToPlace: selectedBlock, placePos: hit.placePos };
      }
    }

    // 3. Multi-block extra boxes collision check (e.g. DOOR_TOP)
    if (resolved.extraBlocks) {
      for (const extra of resolved.extraBlocks) {
        const topBlock = world.getBlock(extra.pos[0], extra.pos[1], extra.pos[2]);
        if (topBlock !== BlockType.AIR) {
          return { allowed: false, blockTypeToPlace: selectedBlock, placePos: hit.placePos };
        }
        const extraBoxes = BlockShapeResolver.getCollisionBoxes(extra.blockType, extra.state);
        for (const b of extraBoxes) {
          const eBox = new THREE.Box3(
            new THREE.Vector3(extra.pos[0] + b.minX + 0.005, extra.pos[1] + b.minY + 0.005, extra.pos[2] + b.minZ + 0.005),
            new THREE.Vector3(extra.pos[0] + b.maxX - 0.005, extra.pos[1] + b.maxY - 0.005, extra.pos[2] + b.maxZ - 0.005)
          );
          if (playerAABB.intersectsBox(eBox)) {
            return { allowed: false, blockTypeToPlace: selectedBlock, placePos: hit.placePos };
          }
        }
      }
    }

    // 4. Torch / Lantern Placement rules (cannot hang on air)
    if (selectedBlock === BlockType.TORCH || selectedBlock === BlockType.LANTERN) {
      const belowBlock = world.getBlock(px, py - 1, pz);
      const isFloorSolid = belowBlock !== BlockType.AIR && Boolean(BLOCK_DEFS[belowBlock]?.solid);
      const isWallSolid = hit.faceNormal[1] === 0;

      if (!isFloorSolid && !isWallSolid) {
        return { allowed: false, blockTypeToPlace: selectedBlock, placePos: hit.placePos };
      }
    }

    return {
      allowed: true,
      blockTypeToPlace: selectedBlock,
      state,
      placePos: [px, py, pz],
      extraBlocks: resolved.extraBlocks,
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
