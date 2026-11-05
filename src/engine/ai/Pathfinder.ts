import * as THREE from 'three';
import { VoxelWorld } from '../world/VoxelWorld';
import { BlockShapeResolver } from '../world/BlockShapeResolver';
import { GameEventBus } from '../events/GameEventBus';

interface PathNode {
  x: number;
  y: number;
  z: number;
  g: number;
  h: number;
  f: number;
  parent: PathNode | null;
  heapIndex: number;
  key: number;
  closed: boolean;
}

interface CachedPath {
  path: [number, number, number][] | null;
  timestamp: number;
}

const DIRS_8: readonly [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
];

export class Pathfinder {
  private static pathCache: Map<string, CachedPath> = new Map();
  private static readonly MAX_CACHE_ENTRIES = 240;
  private static readonly CACHE_TTL_MS = 2500;
  private static isInitialized = false;

  // Per-frame pathfinding budget to prevent multi-entity A* spikes
  private static frameWindowStartMs = 0;
  private static searchesThisFrame = 0;
  private static readonly MAX_SEARCHES_PER_FRAME = 4;

  // Zero-GC Pre-allocated Node Pool & Binary Min-Heap
  private static readonly MAX_POOL_NODES = 512;
  private static readonly nodePool: PathNode[] = Array.from({ length: 512 }, () => ({
    x: 0,
    y: 0,
    z: 0,
    g: 0,
    h: 0,
    f: 0,
    parent: null,
    heapIndex: -1,
    key: 0,
    closed: false,
  }));
  private static poolCursor = 0;
  private static readonly openHeap: PathNode[] = [];
  private static readonly nodeLookup: Map<number, PathNode> = new Map();

  // Reusable flat neighbor coordinate buffer: [x0, y0, z0, x1, y1, z1, ...]
  private static readonly neighborCoords = new Int32Array(24);

  public static initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    GameEventBus.on('BLOCK_MINED', () => {
      Pathfinder.clearCache();
    });
    GameEventBus.on('BLOCK_PLACED', () => {
      Pathfinder.clearCache();
    });
  }

  public static clearCache(): void {
    this.pathCache.clear();
  }

  private static getCacheKey(
    startX: number,
    startY: number,
    startZ: number,
    goalX: number,
    goalY: number,
    goalZ: number
  ): string {
    return `${startX},${startY},${startZ}_${goalX},${goalY},${goalZ}`;
  }

  // Pack local offset relative to start into a collision-free 32-bit integer key
  private static packCoordKey(x: number, y: number, z: number, originX: number, originZ: number): number {
    const dx = (x - originX + 512) & 0x3ff; // 10 bits (-512..+511)
    const dy = y & 0xff;                    // 8 bits (0..255)
    const dz = (z - originZ + 512) & 0x3ff; // 10 bits (-512..+511)
    return (dx << 18) | (dy << 10) | dz;
  }

  private static acquireNode(
    x: number,
    y: number,
    z: number,
    g: number,
    h: number,
    parent: PathNode | null,
    key: number
  ): PathNode {
    let node: PathNode;
    if (this.poolCursor < this.MAX_POOL_NODES) {
      node = this.nodePool[this.poolCursor++];
    } else {
      node = { x: 0, y: 0, z: 0, g: 0, h: 0, f: 0, parent: null, heapIndex: -1, key: 0, closed: false };
    }
    node.x = x;
    node.y = y;
    node.z = z;
    node.g = g;
    node.h = h;
    node.f = g + h;
    node.parent = parent;
    node.heapIndex = -1;
    node.key = key;
    node.closed = false;
    return node;
  }

  private static heapPush(node: PathNode): void {
    const heap = this.openHeap;
    node.heapIndex = heap.length;
    heap.push(node);
    this.siftUp(node.heapIndex);
  }

  private static heapPop(): PathNode | undefined {
    const heap = this.openHeap;
    if (heap.length === 0) return undefined;
    const top = heap[0];
    const bottom = heap.pop()!;
    if (heap.length > 0) {
      heap[0] = bottom;
      bottom.heapIndex = 0;
      this.siftDown(0);
    }
    top.heapIndex = -1;
    return top;
  }

  private static siftUp(idx: number): void {
    const heap = this.openHeap;
    const node = heap[idx];
    while (idx > 0) {
      const parentIdx = (idx - 1) >> 1;
      const parent = heap[parentIdx];
      if (node.f >= parent.f) break;
      heap[idx] = parent;
      parent.heapIndex = idx;
      idx = parentIdx;
    }
    heap[idx] = node;
    node.heapIndex = idx;
  }

  private static siftDown(idx: number): void {
    const heap = this.openHeap;
    const len = heap.length;
    const node = heap[idx];
    const half = len >> 1;

    while (idx < half) {
      let leftIdx = (idx << 1) + 1;
      const rightIdx = leftIdx + 1;
      let best = heap[leftIdx];

      if (rightIdx < len && heap[rightIdx].f < best.f) {
        leftIdx = rightIdx;
        best = heap[rightIdx];
      }

      if (node.f <= best.f) break;

      heap[idx] = best;
      best.heapIndex = idx;
      idx = leftIdx;
    }
    heap[idx] = node;
    node.heapIndex = idx;
  }

  // Zero-Allocation Binary Min-Heap A* implementation adapted for Voxel Terrain
  public static findPath(
    world: VoxelWorld,
    start: THREE.Vector3,
    goal: THREE.Vector3,
    maxDistance: number = 24
  ): [number, number, number][] | null {
    if (!this.isInitialized) {
      this.initialize();
    }

    const startX = Math.floor(start.x);
    const startY = Math.floor(start.y);
    const startZ = Math.floor(start.z);

    const goalX = Math.floor(goal.x);
    const goalY = Math.floor(goal.y);
    const goalZ = Math.floor(goal.z);

    const cacheKey = this.getCacheKey(startX, startY, startZ, goalX, goalY, goalZ);
    const cached = this.pathCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.path;
    }

    // Distance check using squared distance to avoid unnecessary sqrt
    const dxGoal = start.x - goal.x;
    const dyGoal = start.y - goal.y;
    const dzGoal = start.z - goal.z;
    if (dxGoal * dxGoal + dyGoal * dyGoal + dzGoal * dzGoal > maxDistance * maxDistance) {
      return null;
    }

    // Frame-level search budget guard (prevents frame spike if 15 entities pathfind on same tick)
    const perfNow = typeof performance !== 'undefined' ? performance.now() : now;
    if (perfNow - this.frameWindowStartMs > 14.0) {
      this.frameWindowStartMs = perfNow;
      this.searchesThisFrame = 0;
    }
    if (this.searchesThisFrame >= this.MAX_SEARCHES_PER_FRAME) {
      return cached ? cached.path : null;
    }
    this.searchesThisFrame++;

    if (world && world.profiler) {
      world.profiler.pathfinderQueries++;
    }

    // Reset reusable pools
    this.poolCursor = 0;
    this.openHeap.length = 0;
    this.nodeLookup.clear();

    const startKey = this.packCoordKey(startX, startY, startZ, startX, startZ);
    const startNode = this.acquireNode(
      startX,
      startY,
      startZ,
      0,
      this.heuristic(startX, startY, startZ, goalX, goalY, goalZ),
      null,
      startKey
    );

    this.heapPush(startNode);
    this.nodeLookup.set(startKey, startNode);

    let iterations = 0;
    const maxIterations = 160;

    while (this.openHeap.length > 0) {
      iterations++;
      if (iterations > maxIterations) break;

      const current = this.heapPop()!;
      if (current.closed) continue;
      current.closed = true;

      if (current.x === goalX && Math.abs(current.y - goalY) <= 1 && current.z === goalZ) {
        const path = this.reconstructPath(current);
        this.setCached(cacheKey, path);
        return path;
      }

      const neighborCount = this.fillNeighbors(world, current.x, current.y, current.z);
      const coords = this.neighborCoords;

      for (let i = 0; i < neighborCount; i++) {
        const base = i * 3;
        const nx = coords[base];
        const ny = coords[base + 1];
        const nz = coords[base + 2];

        const neighborKey = this.packCoordKey(nx, ny, nz, startX, startZ);
        const existing = this.nodeLookup.get(neighborKey);
        if (existing && existing.closed) continue;

        // Diagonal steps cost 1.414, cardinal steps cost 1.0
        const stepCost = nx !== current.x && nz !== current.z ? 1.414 : 1.0;
        const tentativeG = current.g + stepCost;

        if (!existing) {
          const h = this.heuristic(nx, ny, nz, goalX, goalY, goalZ);
          const nNode = this.acquireNode(nx, ny, nz, tentativeG, h, current, neighborKey);
          this.nodeLookup.set(neighborKey, nNode);
          this.heapPush(nNode);
        } else if (tentativeG < existing.g) {
          existing.g = tentativeG;
          existing.f = tentativeG + existing.h;
          existing.parent = current;
          if (existing.heapIndex >= 0) {
            this.siftUp(existing.heapIndex);
          } else {
            this.heapPush(existing);
          }
        }
      }
    }

    this.setCached(cacheKey, null);
    return null;
  }

  private static setCached(key: string, path: [number, number, number][] | null): void {
    if (this.pathCache.size >= this.MAX_CACHE_ENTRIES) {
      this.cleanCache();
      if (this.pathCache.size >= this.MAX_CACHE_ENTRIES) {
        const firstKey = this.pathCache.keys().next().value;
        if (firstKey) this.pathCache.delete(firstKey);
      }
    }
    this.pathCache.set(key, { path, timestamp: Date.now() });
  }

  public static cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.pathCache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL_MS) {
        this.pathCache.delete(key);
      }
    }
  }

  private static heuristic(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2) + Math.abs(z1 - z2);
  }

  // Zero-allocation neighbor expansion writing into static Int32Array
  private static fillNeighbors(world: VoxelWorld, cx: number, cy: number, cz: number): number {
    let count = 0;
    const out = this.neighborCoords;

    for (let d = 0; d < 8; d++) {
      const dx = DIRS_8[d][0];
      const dz = DIRS_8[d][1];
      const nx = cx + dx;
      const nz = cz + dz;

      for (let nyOff = 1; nyOff >= -2; nyOff--) {
        const ny = cy + nyOff;

        const standBlock = world.getBlockIfLoaded(nx, ny - 1, nz);
        if (standBlock === null || standBlock === 0) continue;
        const standState = world.getBlockStateIfLoaded(nx, ny - 1, nz);
        if (!BlockShapeResolver.isSolidForCollision(standBlock, standState ?? undefined)) continue;

        if (nyOff === 1 && BlockShapeResolver.isFence(standBlock)) continue;

        const body1Block = world.getBlockIfLoaded(nx, ny, nz);
        const body2Block = world.getBlockIfLoaded(nx, ny + 1, nz);
        if (body1Block === null || body2Block === null) continue;

        const isOcc1 =
          body1Block !== 0 &&
          BlockShapeResolver.isSolidForCollision(body1Block, world.getBlockStateIfLoaded(nx, ny, nz) ?? undefined);
        if (isOcc1) continue;

        const isOcc2 =
          body2Block !== 0 &&
          BlockShapeResolver.isSolidForCollision(body2Block, world.getBlockStateIfLoaded(nx, ny + 1, nz) ?? undefined);
        if (isOcc2) continue;

        const idx = count * 3;
        out[idx] = nx;
        out[idx + 1] = ny;
        out[idx + 2] = nz;
        count++;
        break;
      }
    }

    return count;
  }

  private static reconstructPath(node: PathNode): [number, number, number][] {
    const path: [number, number, number][] = [];
    let current: PathNode | null = node;
    while (current !== null) {
      path.push([current.x + 0.5, current.y, current.z + 0.5]);
      current = current.parent;
    }
    return path.reverse();
  }
}
