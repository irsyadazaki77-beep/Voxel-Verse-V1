import { WorldGeneratorCore } from './WorldGeneratorCore';
import { WorldPreset, SEA_LEVEL } from './WorldConfig';

/**
 * Pure, lightweight, deterministic Safe Spawn Resolver.
 * Computes player spawn position without instantiating VoxelWorld,
 * WebWorkers, ChunkSchedulers, Three.js scenes, or renderers.
 */
export class SafeSpawnResolver {
  public static resolve(
    seed: number,
    preset: WorldPreset = 'standard',
    dimensionId: string = 'overworld'
  ): [number, number, number] {
    const generator = new WorldGeneratorCore(seed, preset, { dimensionId });
    const seaLevel = generator.params.seaLevel ?? SEA_LEVEL;

    const isOpenScenicClearing = (wx: number, wz: number): number | null => {
      const h = Math.round(generator.getTerrainHeight(wx, wz));
      if (h <= seaLevel + 2 || h > 68) return null;
      // Verify 5x5 surrounding area has gentle slope (no rock pit / steep cliff trapping the player!)
      let minH = h;
      let maxH = h;
      for (let dx = -2; dx <= 2; dx += 2) {
        for (let dz = -2; dz <= 2; dz += 2) {
          const nh = Math.round(generator.getTerrainHeight(wx + dx, wz + dz));
          if (nh < minH) minH = nh;
          if (nh > maxH) maxH = nh;
        }
      }
      if (maxH - minH > 3) return null;
      return maxH; // Spawn above highest point in immediate 5x5 clearing
    };

    // 1. Primary check at coordinate (0, 0)
    const clear0 = isOpenScenicClearing(0, 0);
    if (clear0 !== null) {
      return [0.5, clear0 + 2, 0.5];
    }

    // 2. Outward deterministic spiral probe to find nearest open, flat, sunlit dry clearing
    const spiralOffsets: [number, number][] = [
      [8, 0], [0, 8], [-8, 0], [0, -8],
      [16, 0], [0, 16], [-16, 0], [0, -16],
      [16, 16], [-16, 16], [16, -16], [-16, -16],
      [32, 0], [0, 32], [-32, 0], [0, -32],
      [32, 32], [-32, 32], [32, -32], [-32, -32],
      [48, 0], [0, 48], [-48, 0], [0, -48],
      [64, 0], [0, 64], [-64, 0], [0, -64],
      [80, 0], [0, 80], [-80, 0], [0, -80],
    ];

    for (const [ox, oz] of spiralOffsets) {
      const clearH = isOpenScenicClearing(ox, oz);
      if (clearH !== null) {
        return [ox + 0.5, clearH + 2, oz + 0.5];
      }
    }

    // Fallback: any dry ground above sea level
    const h0 = Math.round(generator.getTerrainHeight(0, 0));
    for (const [ox, oz] of spiralOffsets) {
      const h = Math.round(generator.getTerrainHeight(ox, oz));
      if (h > seaLevel + 1 && h < 110) {
        return [ox + 0.5, h + 2, oz + 0.5];
      }
    }

    // 3. Ocean / low-lying spawn fallback
    const safeY = Math.max(seaLevel + 4, h0 + 2);
    return [0.5, safeY, 0.5];
  }
}

