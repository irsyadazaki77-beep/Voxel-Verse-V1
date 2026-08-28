import * as THREE from 'three';
import { VoxelWorld } from '../world/VoxelWorld';

interface PathNode {
  x: number;
  y: number;
  z: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
}


interface CachedPath {
  path: [number, number, number][] | null;
  timestamp: number;
}

export class Pathfinder {
  private static pathCache: Map<string, CachedPath> = new Map();

  private static getCacheKey(startX: number, startY: number, startZ: number, goalX: number, goalY: number, goalZ: number): string {
    // Quantize coordinates to roughly 1 block size to increase cache hits
    return `${Math.round(startX)},${Math.round(startY)},${Math.round(startZ)}_${Math.round(goalX)},${Math.round(goalY)},${Math.round(goalZ)}`;
  }

  // A* implementation adapted for Voxel Terrain
  public static findPath(
    world: VoxelWorld,
    start: THREE.Vector3,
    goal: THREE.Vector3,
    maxDistance: number = 24
  ): [number, number, number][] | null {
    const startX = Math.floor(start.x);
    const startY = Math.floor(start.y);
    const startZ = Math.floor(start.z);

    const goalX = Math.floor(goal.x);
    const goalY = Math.floor(goal.y);
    const goalZ = Math.floor(goal.z);

    const cacheKey = this.getCacheKey(startX, startY, startZ, goalX, goalY, goalZ);
    const cached = this.pathCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 2000) {
      return cached.path;
    }

    // Don't pathfind if too far
    if (start.distanceTo(goal) > maxDistance) return null;

    const openSet: PathNode[] = [];
    const closedSet = new Set<string>();

    const startNode: PathNode = {
      x: startX,
      y: startY,
      z: startZ,
      g: 0,
      h: this.heuristic(startX, startY, startZ, goalX, goalY, goalZ),
      f: 0,
      parent: null,
    };
    startNode.f = startNode.g + startNode.h;

    openSet.push(startNode);

    let iterations = 0;
    const maxIterations = 300; // Limit to prevent freezing

    while (openSet.length > 0) {
      iterations++;
      if (iterations > maxIterations) break; // Abort if too complex

      // Get node with lowest f
      let lowestIndex = 0;
      for (let i = 1; i < openSet.length; i++) {
        if (openSet[i].f < openSet[lowestIndex].f) {
          lowestIndex = i;
        }
      }
      const current = openSet.splice(lowestIndex, 1)[0];

      if (current.x === goalX && Math.abs(current.y - goalY) <= 1 && current.z === goalZ) {
        const path = this.reconstructPath(current);
        this.pathCache.set(cacheKey, { path, timestamp: Date.now() });
        return path;
      }

      const key = `${current.x},${current.y},${current.z}`;
      closedSet.add(key);

      const neighbors = this.getNeighbors(world, current.x, current.y, current.z);

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y},${neighbor.z}`;
        if (closedSet.has(neighborKey)) continue;

        const tentativeG = current.g + 1;

        let neighborNode = openSet.find((n) => n.x === neighbor.x && n.y === neighbor.y && n.z === neighbor.z);

        if (!neighborNode) {
          neighborNode = {
            x: neighbor.x,
            y: neighbor.y,
            z: neighbor.z,
            g: tentativeG,
            h: this.heuristic(neighbor.x, neighbor.y, neighbor.z, goalX, goalY, goalZ),
            f: 0,
            parent: current,
          };
          neighborNode.f = neighborNode.g + neighborNode.h;
          openSet.push(neighborNode);
        } else if (tentativeG < neighborNode.g) {
          neighborNode.g = tentativeG;
          neighborNode.f = neighborNode.g + neighborNode.h;
          neighborNode.parent = current;
        }
      }
    }

    // No path found
    this.pathCache.set(cacheKey, { path: null, timestamp: Date.now() });
    return null;
  }

  
  public static cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.pathCache.entries()) {
      if (now - value.timestamp > 5000) {
        this.pathCache.delete(key);
      }
    }
  }

  private static heuristic(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number {
    // Manhattan distance
    return Math.abs(x1 - x2) + Math.abs(y1 - y2) + Math.abs(z1 - z2);
  }

  private static getNeighbors(world: VoxelWorld, cx: number, cy: number, cz: number) {
    const neighbors = [];
    const dirs = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 0, 1],
      [0, 0, -1],
      [1, 0, 1],
      [-1, 0, 1],
      [1, 0, -1],
      [-1, 0, -1]
    ];

    for (const [dx, dy, dz] of dirs) {
      const nx = cx + dx;
      const nz = cz + dz;
      
      // Check level, step up (1), step down (1, 2)
      for (let nyOff = 1; nyOff >= -2; nyOff--) {
        const ny = cy + nyOff;
        
        // Block we are trying to stand on
        const standBlock = world.getBlock(nx, ny - 1, nz);
        if (standBlock === 0) continue; // Air underneath, can't stand
        
        // Blocks our body occupies
        const bodyBlock1 = world.getBlock(nx, ny, nz);
        const bodyBlock2 = world.getBlock(nx, ny + 1, nz);

        if (bodyBlock1 === 0 && bodyBlock2 === 0) {
          // Valid placement
          neighbors.push({ x: nx, y: ny, z: nz });
          break; // Stop checking lower Ys for this x/z if we found a valid surface
        }
      }
    }

    return neighbors;
  }

  private static reconstructPath(node: PathNode): [number, number, number][] {
    const path: [number, number, number][] = [];
    let current: PathNode | null = node;
    while (current !== null) {
      // Center position
      path.push([current.x + 0.5, current.y, current.z + 0.5]);
      current = current.parent;
    }
    return path.reverse();
  }
}
