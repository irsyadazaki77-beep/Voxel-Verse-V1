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
    const frameDt = Math.min(dt, 0.1);

    this.carts.forEach((cart) => {
      const [cx, cy, cz] = cart.pos.map(Math.floor);
      const currentBlock = world.getBlock(cx, cy, cz);

      const isRailBlock = (b: number) => b === BlockType.AETHER_RAIL || b === BlockType.AETHER_RAIL_SWITCH;

      if (!isRailBlock(currentBlock)) {
        // Not on rail, stop velocity
        cart.velocity = [0, 0, 0];
        return;
      }

      // If cart has zero velocity but speed > 0, find initial rail heading
      if (cart.velocity[0] === 0 && cart.velocity[1] === 0 && cart.velocity[2] === 0 && cart.speed > 0) {
        if (isRailBlock(world.getBlock(cx + 1, cy, cz))) cart.velocity = [cart.speed, 0, 0];
        else if (isRailBlock(world.getBlock(cx - 1, cy, cz))) cart.velocity = [-cart.speed, 0, 0];
        else if (isRailBlock(world.getBlock(cx, cy, cz + 1))) cart.velocity = [0, 0, cart.speed];
        else if (isRailBlock(world.getBlock(cx, cy, cz - 1))) cart.velocity = [0, 0, -cart.speed];
      }

      // Move cart along velocity
      if (cart.velocity[0] !== 0 || cart.velocity[2] !== 0) {
        const nextX = cart.pos[0] + cart.velocity[0] * frameDt;
        const nextZ = cart.pos[2] + cart.velocity[2] * frameDt;
        const nextBlock = world.getBlock(Math.floor(nextX), cy, Math.floor(nextZ));

        if (isRailBlock(nextBlock)) {
          cart.pos[0] = nextX;
          cart.pos[2] = nextZ;
        } else {
          // Rail ended or curve hit - check turn directions
          let turned = false;
          const currX = Math.floor(cart.pos[0]);
          const currZ = Math.floor(cart.pos[2]);

          if (cart.velocity[0] !== 0) {
            // Check North / South perpendicular turn
            if (isRailBlock(world.getBlock(currX, cy, currZ + 1))) {
              cart.velocity = [0, 0, cart.speed];
              turned = true;
            } else if (isRailBlock(world.getBlock(currX, cy, currZ - 1))) {
              cart.velocity = [0, 0, -cart.speed];
              turned = true;
            }
          } else if (cart.velocity[2] !== 0) {
            // Check East / West perpendicular turn
            if (isRailBlock(world.getBlock(currX + 1, cy, currZ))) {
              cart.velocity = [cart.speed, 0, 0];
              turned = true;
            } else if (isRailBlock(world.getBlock(currX - 1, cy, currZ))) {
              cart.velocity = [-cart.speed, 0, 0];
              turned = true;
            }
          }

          if (!turned) {
            cart.velocity = [0, 0, 0]; // End of track
          }
        }
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
