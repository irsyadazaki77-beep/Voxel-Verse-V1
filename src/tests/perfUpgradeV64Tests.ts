// VoxelVerse v6.4.0: Deep Performance Upgrade Unit Tests
import { EntityManager } from '../engine/entities/EntityManager';
import { VoxelWorld } from '../engine/world/VoxelWorld';

export function runPerfUpgradeV64Tests(
  assert: (cond: boolean, message: string) => void
): void {
  console.log('\n[Phase 16] VoxelVerse v6.4.0: Deep Performance Upgrade Suite');

  // 1. EntityManager distance AI throttling & visibility culling
  assert(
    EntityManager.shouldTickEntityAtDistance(100, 1) === true &&
      EntityManager.shouldRenderEntityAtDistance(100) === true,
    'Entities within 10m tick every frame and remain visible'
  );
  assert(
    EntityManager.shouldTickEntityAtDistance(3600, 1) === false &&
      EntityManager.shouldTickEntityAtDistance(3600, 4) === true &&
      EntityManager.shouldRenderEntityAtDistance(3600) === true,
    'Entities at 60m throttle AI to 1/4 frequency while remaining visible'
  );
  assert(
    EntityManager.shouldRenderEntityAtDistance(14400) === false,
    'Entities beyond 105m (120m) are visibility-culled to save draw calls'
  );

  // 2. VoxelWorld shaderRealismLevel mapping
  assert(
    typeof VoxelWorld.prototype.setShaderRealism === 'function',
    'VoxelWorld exposes setShaderRealism() for GPU ALU bypass'
  );
}
