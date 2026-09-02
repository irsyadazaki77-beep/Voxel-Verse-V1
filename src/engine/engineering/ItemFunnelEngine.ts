// Item Funnel Engine - Container & Machine Logistics Engine with Item Filtering
import { ItemStack } from '../../types';
import { InventoryManager } from '../items/InventoryManager';
import { BlockPlacementEngine } from '../world/BlockPlacementEngine';
import { ActuatorEngine } from './ActuatorEngine';
import { AetherNode } from './AetherNetworkTypes';

export class ItemFunnelEngine {
  public static readonly TRANSFER_INTERVAL = 0.5; // seconds per item transfer cycle

  public static tick(node: AetherNode, dt: number): boolean {
    if (node.nodeType !== 'funnel') return false;

    node.internalState.timer = (node.internalState.timer || 0) + dt;
    if (node.internalState.timer < this.TRANSFER_INTERVAL) {
      return false;
    }
    node.internalState.timer = 0;

    const [fx, fy, fz] = node.pos;
    const facing = node.facing || 'down';
    const dir = ActuatorEngine.getDirectionOffset(facing);

    // Source container (block above funnel)
    const sourcePos: [number, number, number] = [fx, fy + 1, fz];
    // Target container (block facing direction)
    const targetPos: [number, number, number] = [fx + dir[0], fy + dir[1], fz + dir[2]];

    const sourceContainer = BlockPlacementEngine.getContainer(sourcePos);
    const targetContainer = BlockPlacementEngine.getContainer(targetPos);

    if (!sourceContainer || !targetContainer) return false;

    const filterItemId = node.config.filterItemId;

    // Find first transferable item slot in source
    let sourceSlotIdx = -1;
    let stackToMove: ItemStack | null = null;

    for (let i = 0; i < sourceContainer.length; i++) {
      const slot = sourceContainer[i];
      if (slot && slot.count > 0) {
        if (!filterItemId || slot.itemId === filterItemId) {
          sourceSlotIdx = i;
          stackToMove = slot;
          break;
        }
      }
    }

    if (sourceSlotIdx === -1 || !stackToMove) return false;

    // Try adding 1 item from stack to target container
    const singleItem: ItemStack = { itemId: stackToMove.itemId, count: 1 };
    const addResult = InventoryManager.addItem(targetContainer, singleItem);

    if (addResult.remainingCount === 0) {
      // Transfer succeeded, decrement source slot
      stackToMove.count -= 1;
      if (stackToMove.count <= 0) {
        sourceContainer[sourceSlotIdx] = null;
      }
      BlockPlacementEngine.setContainer(sourcePos, sourceContainer);
      BlockPlacementEngine.setContainer(targetPos, targetContainer);
      return true;
    }

    return false;
  }
}
