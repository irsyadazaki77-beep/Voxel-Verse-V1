// Aether Rail & Cargo Cart Motion & Junction Switching Engine
import { BlockType, ItemStack } from '../../types';
import { VoxelWorld } from '../world/VoxelWorld';
import { InventoryManager } from '../items/InventoryManager';
import { BlockPlacementEngine } from '../world/BlockPlacementEngine';

export interface CargoCartState {
  id: string;
  pos: [number, number, number];
  velocity: [number, number, number];
  speed: number;
  inventory: (ItemStack | null)[]; // 18 slots
}

export class AetherRailEngine {
  public static carts: Map<string, CargoCartState> = new Map();

  public static createCart(id: string, pos: [number, number, number]): CargoCartState {
    const cart: CargoCartState = {
      id,
      pos,
      velocity: [0, 0, 0],
      speed: 8.0, // blocks per second
      inventory: new Array(18).fill(null),
    };
    this.carts.set(id, cart);
    return cart;
  }

  public static updateCarts(dt: number, world: VoxelWorld): void {
    this.carts.forEach((cart) => {
      const [cx, cy, cz] = cart.pos.map(Math.floor);
      const currentBlock = world.getBlock(cx, cy, cz);

      if (currentBlock !== BlockType.AETHER_RAIL && currentBlock !== BlockType.AETHER_RAIL_SWITCH) {
        // Not on rail, stop velocity
        cart.velocity = [0, 0, 0];
        return;
      }

      // Check for item funnel or container directly below rail for auto-cargo transfer
      const belowPos: [number, number, number] = [cx, cy - 1, cz];
      const belowContainer = BlockPlacementEngine.getContainer(belowPos);
      if (belowContainer) {
        // Transfer 1 item stack between cart and container
        for (let i = 0; i < cart.inventory.length; i++) {
          const item = cart.inventory[i];
          if (item && item.count > 0) {
            const addRes = InventoryManager.addItem(belowContainer, item);
            if (addRes.remainingCount < item.count) {
              item.count = addRes.remainingCount;
              if (item.count <= 0) cart.inventory[i] = null;
              BlockPlacementEngine.setContainer(belowPos, belowContainer);
              break;
            }
          }
        }
      }
    });
  }

  public static clear(): void {
    this.carts.clear();
  }
}
