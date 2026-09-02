// Resonance Fabricator Engine - Server-Authoritative Auto-Crafting Machine
import { CRAFTING_RECIPES } from '../items/CraftingSystem';
import { InventoryManager } from '../items/InventoryManager';
import { BlockPlacementEngine } from '../world/BlockPlacementEngine';
import { ActuatorEngine } from './ActuatorEngine';
import { AetherNode } from './AetherNetworkTypes';

export class ResonanceFabricatorEngine {
  public static readonly FABRICATE_INTERVAL = 2.0; // seconds per crafting cycle

  public static tick(node: AetherNode, dt: number): boolean {
    if (node.nodeType !== 'fabricator') return false;
    const recipeId = node.config.recipeId;
    if (!recipeId) return false;

    const recipe = CRAFTING_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return false;

    node.internalState.timer = (node.internalState.timer || 0) + dt;
    if (node.internalState.timer < this.FABRICATE_INTERVAL) {
      return false;
    }
    node.internalState.timer = 0;

    const [fx, fy, fz] = node.pos;
    const facing = node.facing || 'north';
    const dir = ActuatorEngine.getDirectionOffset(facing);

    // Input container behind machine
    const inputContainerPos: [number, number, number] = [fx - dir[0], fy - dir[1], fz - dir[2]];
    // Output container in front of machine
    const outputContainerPos: [number, number, number] = [fx + dir[0], fy + dir[1], fz + dir[2]];

    const inputContainer = BlockPlacementEngine.getContainer(inputContainerPos);
    const outputContainer = BlockPlacementEngine.getContainer(outputContainerPos);

    if (!inputContainer || !outputContainer) return false;

    // Check if input container has all required ingredients
    for (const req of recipe.inputs) {
      const countInContainer = InventoryManager.countItem(inputContainer, req.itemId);
      if (countInContainer < req.count) {
        return false; // Insufficient ingredients
      }
    }

    // Check if output container can accept result item
    const resultItem = { itemId: recipe.output.itemId, count: recipe.output.count };

    // Consume ingredients
    for (const req of recipe.inputs) {
      InventoryManager.removeItem(inputContainer, req.itemId, req.count);
    }

    // Add result to output container
    InventoryManager.addItem(outputContainer, resultItem);

    BlockPlacementEngine.setContainer(inputContainerPos, inputContainer);
    BlockPlacementEngine.setContainer(outputContainerPos, outputContainer);

    return true;
  }
}
