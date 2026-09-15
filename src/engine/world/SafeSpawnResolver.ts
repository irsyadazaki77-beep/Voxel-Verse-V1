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

    // 1. Primary check at coordinate (0, 0)
    const h0 = Math.round(generator.getTerrainHeight(0, 0));
    if (h0 > seaLevel + 1 && h0 < 110) {
      return [0.5, h0 + 2, 0.5];
    }

    // 2. Outward deterministic spiral probe to find nearest dry ground above sea level
    const spiralOffsets: [number, number][] = [
      [16, 0], [0, 16], [-16, 0], [0, -16],
      [16, 16], [-16, 16], [16, -16], [-16, -16],
      [32, 0], [0, 32], [-32, 0], [0, -32],
      [32, 32], [-32, 32], [32, -32], [-32, -32],
      [48, 0], [0, 48], [-48, 0], [0, -48],
      [64, 0], [0, 64], [-64, 0], [0, -64],
    ];

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

