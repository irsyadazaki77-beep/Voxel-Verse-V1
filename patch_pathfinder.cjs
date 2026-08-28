const fs = require('fs');
let content = fs.readFileSync('src/engine/ai/Pathfinder.ts', 'utf-8');

// Add LRU cache
const cacheImpl = `
interface CachedPath {
  path: [number, number, number][] | null;
  timestamp: number;
}

export class Pathfinder {
  private static pathCache: Map<string, CachedPath> = new Map();

  private static getCacheKey(startX: number, startY: number, startZ: number, goalX: number, goalY: number, goalZ: number): string {
    // Quantize coordinates to roughly 1 block size to increase cache hits
    return \`\${Math.round(startX)},\${Math.round(startY)},\${Math.round(startZ)}_\${Math.round(goalX)},\${Math.round(goalY)},\${Math.round(goalZ)}\`;
  }
`;

content = content.replace("export class Pathfinder {", cacheImpl);

// Inside findPath
const oldFindPathStart = `  public static findPath(
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
    const goalZ = Math.floor(goal.z);`;

const newFindPathStart = `  public static findPath(
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
    }`;

content = content.replace(oldFindPathStart, newFindPathStart);

// Cache the results before returning
const oldReturnNull = "    return null;";
const newReturnNull = "    this.pathCache.set(cacheKey, { path: null, timestamp: Date.now() });\n    return null;";
content = content.replace(oldReturnNull, newReturnNull);

const oldReturnPath = "return this.reconstructPath(current);";
const newReturnPath = "const path = this.reconstructPath(current);\n        this.pathCache.set(cacheKey, { path, timestamp: Date.now() });\n        return path;";
content = content.replace(oldReturnPath, newReturnPath);

// Cache cleanup
const cacheCleanup = `
  public static cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.pathCache.entries()) {
      if (now - value.timestamp > 5000) {
        this.pathCache.delete(key);
      }
    }
  }
`;

content = content.replace("private static heuristic(", cacheCleanup + "\n  private static heuristic(");

fs.writeFileSync('src/engine/ai/Pathfinder.ts', content);
