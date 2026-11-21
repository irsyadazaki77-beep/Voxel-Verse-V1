// VoxelVerse v6.1.0: Minecraft-Grade Fluid Cellular Automata (Water & Lava Flow + Obsidian/Cobblestone Reaction)
import { BlockType } from '../../types';
import { VoxelWorld } from './VoxelWorld';

interface FluidNode {
  x: number;
  y: number;
  z: number;
  type: BlockType.WATER | BlockType.LAVA;
  level: number; // 0 = source, 1..7 = flowing water (1..3 for lava)
}

export class FluidSimulationSystem {
  private static activeQueue: FluidNode[] = [];
  private static visitedKeys: Set<string> = new Set();
  private static tickAccumulator = 0;
  public static totalReactions = 0;
  public static totalBlocksFlowed = 0;

  public static reset(): void {
    this.activeQueue = [];
    this.visitedKeys.clear();
    this.tickAccumulator = 0;
    this.totalReactions = 0;
    this.totalBlocksFlowed = 0;
  }

  public static scheduleFluidAt(
    x: number,
    y: number,
    z: number,
    type: BlockType.WATER | BlockType.LAVA,
    level = 0
  ): void {
    const bx = Math.floor(x);
    const by = Math.floor(y);
    const bz = Math.floor(z);
    const key = `${bx},${by},${bz}`;
    if (this.visitedKeys.has(key)) return;
    if (this.activeQueue.length >= 256) return; // Bounded memory & FPS protection
    this.visitedKeys.add(key);
    this.activeQueue.push({ x: bx, y: by, z: bz, type, level });
  }

  /**
   * Deterministic single-step fluid simulation (bounded maxOps per tick for 60 FPS stability)
   */
  public static step(world: VoxelWorld, maxOps = 24): number {
    let processed = 0;
    while (processed < maxOps && this.activeQueue.length > 0) {
      const node = this.activeQueue.shift()!;
      const key = `${node.x},${node.y},${node.z}`;
      this.visitedKeys.delete(key);
      processed++;

      const maxSpread = node.type === BlockType.WATER ? 7 : 3;
      const oppositeFluid = node.type === BlockType.WATER ? BlockType.LAVA : BlockType.WATER;

      // 1. Check for Water + Lava reaction -> Obsidian (if source) or Cobblestone (if flowing)
      const neighbors: Array<[number, number, number]> = [
        [node.x, node.y - 1, node.z],
        [node.x + 1, node.y, node.z],
        [node.x - 1, node.y, node.z],
        [node.x, node.y, node.z + 1],
        [node.x, node.y, node.z - 1],
      ];

      let reacted = false;
      for (const [nx, ny, nz] of neighbors) {
        if (ny < 1) continue;
        if (world.getBlock(nx, ny, nz) === oppositeFluid) {
          const resultBlock = node.level === 0 ? BlockType.OBSIDIAN : BlockType.COBBLESTONE;
          world.setBlock(nx, ny, nz, resultBlock);
          this.totalReactions++;
          reacted = true;
        }
      }
      if (reacted) continue;

      // 2. Flow downward first (gravity priority like Minecraft)
      if (node.y > 1) {
        const below = world.getBlock(node.x, node.y - 1, node.z);
        if (below === BlockType.AIR) {
          world.setBlock(node.x, node.y - 1, node.z, node.type);
          this.totalBlocksFlowed++;
          this.scheduleFluidAt(node.x, node.y - 1, node.z, node.type, 1);
          continue; // Falling water doesn't spread sideways until hitting a floor
        }
      }

      // 3. Spread horizontally if level < maxSpread
      if (node.level < maxSpread) {
        const nextLevel = node.level + 1;
        const horiz: Array<[number, number, number]> = [
          [node.x + 1, node.y, node.z],
          [node.x - 1, node.y, node.z],
          [node.x, node.y, node.z + 1],
          [node.x, node.y, node.z - 1],
        ];
        for (const [hx, hy, hz] of horiz) {
          const target = world.getBlock(hx, hy, hz);
          if (target === BlockType.AIR) {
            world.setBlock(hx, hy, hz, node.type);
            this.totalBlocksFlowed++;
            this.scheduleFluidAt(hx, hy, hz, node.type, nextLevel);
          }
        }
      }
    }
    return processed;
  }

  public static update(dt: number, world?: VoxelWorld): void {
    if (!world || this.activeQueue.length === 0) return;
    this.tickAccumulator += Math.min(dt, 0.1);
    if (this.tickAccumulator >= 0.25) {
      this.tickAccumulator = 0;
      this.step(world, 20);
    }
  }

  public static getQueueSize(): number {
    return this.activeQueue.length;
  }
}
