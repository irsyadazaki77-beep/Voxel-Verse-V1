// Aether Actuator Engine - Deterministic Voxel Block Motion (Push / Pull) with Safety Guardrails
import { BlockType } from '../../types';
import { BLOCK_DEFS } from '../world/BlockRegistry';
import { VoxelWorld } from '../world/VoxelWorld';
import { BlockPlacementEngine } from '../world/BlockPlacementEngine';
import { AetherNetworkManager } from './AetherNetworkManager';
import { AetherNode, Direction6 } from './AetherNetworkTypes';
import { Logger } from '../ui/Logger';

export class ActuatorEngine {
  public static readonly MAX_PUSH_BLOCKS = 12;

  // Get offset vector [dx, dy, dz] from facing direction
  public static getDirectionOffset(facing: Direction6): [number, number, number] {
    switch (facing) {
      case 'north':
        return [0, 0, -1];
      case 'south':
        return [0, 0, 1];
      case 'east':
        return [1, 0, 0];
      case 'west':
        return [-1, 0, 0];
      case 'up':
        return [0, 1, 0];
      case 'down':
        return [0, -1, 0];
      default:
        return [0, 0, -1];
    }
  }

  // Check if a block can be moved by actuator
  public static isBlockMovable(blockType: BlockType, world: VoxelWorld, pos: [number, number, number]): boolean {
    if (blockType === BlockType.AIR) return true; // Air is replaced easily

    const bDef = BLOCK_DEFS[blockType];
    if (!bDef) return false;

    if (bDef.movableByActuator === false) return false;

    // Unbreakable obsidian / portal check
    if (blockType === BlockType.OBSIDIAN || blockType === BlockType.ANCIENT_RUNE_STONE) {
      return false;
    }

    // Chest with items check
    if (blockType === BlockType.CHEST) {
      const items = BlockPlacementEngine.getContainer(pos);
      if (items.some((slot) => slot !== null)) {
        return false; // Non-empty chest cannot be moved safely
      }
    }

    return true;
  }

  // Execute Actuator Motion Trigger
  public static triggerActuator(node: AetherNode, world: VoxelWorld): boolean {
    const mode = node.config.actuatorMode || 'push';
    const facing = node.facing || 'north';
    const dir = this.getDirectionOffset(facing);
    const [dx, dy, dz] = mode === 'pull' ? [-dir[0], -dir[1], -dir[2]] : dir;

    const [startx, starty, startz] = node.pos;
    const targetPos: [number, number, number] = [startx + dx, starty + dy, startz + dz];

    // Find line of blocks to push/pull
    const lineOfBlocks: Array<{ pos: [number, number, number]; blockType: BlockType }> = [];
    let currX = targetPos[0];
    let currY = targetPos[1];
    let currZ = targetPos[2];

    for (let i = 0; i < this.MAX_PUSH_BLOCKS; i++) {
      const currPos: [number, number, number] = [currX, currY, currZ];
      const bType = world.getBlock(currX, currY, currZ);

      if (bType === BlockType.AIR) {
        break; // Reached empty space, line end
      }

      if (!this.isBlockMovable(bType, world, currPos)) {
        Logger.warn('ActuatorEngine', `Actuator at ${node.posKey} blocked by immovable block ${bType} at ${currPos}`);
        return false; // Line blocked
      }

      lineOfBlocks.push({ pos: currPos, blockType: bType });

      currX += dx;
      currY += dy;
      currZ += dz;
    }

    if (lineOfBlocks.length === 0) return false;

    // Move blocks from back to front to prevent overwriting
    for (let i = lineOfBlocks.length - 1; i >= 0; i--) {
      const item = lineOfBlocks[i];
      const nextX = item.pos[0] + dx;
      const nextY = item.pos[1] + dy;
      const nextZ = item.pos[2] + dz;
      const nextPos: [number, number, number] = [nextX, nextY, nextZ];

      world.setBlock(nextX, nextY, nextZ, item.blockType);

      // Handle container migration if chest
      if (item.blockType === BlockType.CHEST) {
        const containerItems = BlockPlacementEngine.getContainer(item.pos);
        BlockPlacementEngine.setContainer(nextPos, containerItems);
        BlockPlacementEngine.containers.delete(`${item.pos[0]},${item.pos[1]},${item.pos[2]}`);
      }

      // Handle engineering node migration if engineering block
      const netMgr = AetherNetworkManager.getInstance();
      const nodeOldKey = AetherNetworkManager.getPosKey(item.pos);
      const engNode = netMgr.nodeMap.get(nodeOldKey);
      if (engNode) {
        netMgr.onBlockRemoved(item.pos);
        netMgr.onBlockPlaced(nextPos, item.blockType, engNode.config, engNode.facing);
      }
    }

    // Clear original starting voxel
    const firstPos = lineOfBlocks[0].pos;
    world.setBlock(firstPos[0], firstPos[1], firstPos[2], BlockType.AIR);

    Logger.info('ActuatorEngine', `Actuator at ${node.posKey} moved ${lineOfBlocks.length} blocks [Mode: ${mode}]`);
    return true;
  }
}
