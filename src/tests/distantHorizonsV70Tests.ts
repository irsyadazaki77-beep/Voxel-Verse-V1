// VoxelVerse v7.0.0 Verification Suite:
// 1. True 3D RGB Colored Voxel Light Propagation & Mesher Vertex Color Integration
// 2. Distant Horizons Hierarchical Chunk LOD (Ring 1 & Ring 2, 600m+ Vista, Budget & Eviction)
// 3. 3D Spatial Audio Listener & Dynamic Environmental Acoustics (Karst Cave Reverb & Underwater Low-Pass)
import * as THREE from 'three';
import { BlockType } from '../types';
import { LightingEngine } from '../engine/world/LightingEngine';
import { VoxelMesher } from '../engine/world/VoxelMesher';
import { WorldGeneratorCore } from '../engine/world/WorldGeneratorCore';
import { DistantLODSystem } from '../engine/world/DistantLODSystem';
import { SoundSynthesizer } from '../engine/audio/SoundSynthesizer';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`v7.0.0 Test Failed: ${message}`);
  }
  console.log(`  ✓ [PASS] ${message}`);
}

export function runDistantHorizonsV70Tests(): void {
  console.log('\n====================================================');
  console.log(' VOXELVERSE v7.0.0: DISTANT HORIZONS, RGB LIGHT & 3D AUDIO');
  console.log('====================================================');

  // --- 1. TRUE 3D RGB COLORED VOXEL LIGHTING ---
  console.log('\n▶ [1/3] Testing True 3D RGB Colored Voxel Light Propagation & Mesher...');
  {
    const W = 16, H = 32, D = 16;
    const blocks = new Uint8Array(W * H * D);
    const setB = (x: number, y: number, z: number, b: BlockType) => {
      blocks[x + z * W + y * W * D] = b;
    };
    const getB = (x: number, y: number, z: number): BlockType => {
      if (x < 0 || x >= W || y < 0 || y >= H || z < 0 || z >= D) return BlockType.STONE;
      return blocks[x + z * W + y * W * D] as BlockType;
    };

    // Build an enclosed dark stone cavern (y = 0..16 ceiling at y=16 blocks sunlight)
    for (let x = 0; x < W; x++) {
      for (let z = 0; z < D; z++) {
        setB(x, 0, z, BlockType.STONE); // floor
        setB(x, 16, z, BlockType.STONE); // roof blocking sunlight
      }
    }

    // Place a warm TORCH at (3, 2, 8) and a cool cyan AETHER_LAMP at (12, 2, 8)
    setB(3, 2, 8, BlockType.TORCH);
    setB(12, 2, 8, BlockType.AETHER_LAMP);

    const lighting = new LightingEngine(W, H, D, getB);
    lighting.computeFullChunkLighting();

    // Verify sunlight is blocked inside the cavern
    assert(lighting.getSunlight(7, 2, 8) === 0, 'Sunlight is blocked inside enclosed stone cavern');

    // Verify warm amber propagation near TORCH (R > G > B)
    const [tr, tg, tb] = lighting.getRGBBlockLight(4, 2, 8);
    assert(tr > tg && tg > tb && tr >= 10, `Torch propagates warm amber RGB (${tr}, ${tg}, ${tb})`);

    // Verify cyan-teal propagation near AETHER_LAMP (B > R)
    const [ar, ag, ab] = lighting.getRGBBlockLight(11, 2, 8);
    assert(ab > ar && ag > ar && ab >= 10, `Aether Lamp propagates cool cyan RGB (${ar}, ${ag}, ${ab})`);

    // Verify natural RGB blending in the middle between both lights
    const [mr, mg, mb] = lighting.getRGBBlockLight(7, 2, 8);
    assert(mr > 0 && mg > 0 && mb > 0, `Overlapping torch & Aether lamp blend RGB channels (${mr}, ${mg}, ${mb})`);

    // Verify VoxelMesher writes non-grayscale RGB colored light into vertex colors
    const meshData = VoxelMesher.buildChunkMeshData(getB, W, H, D);
    assert(meshData.solidColors.length > 0, 'VoxelMesher produced solid vertex colors');
    let foundColoredVertex = false;
    for (let i = 0; i < meshData.solidColors.length; i += 3) {
      const r = meshData.solidColors[i];
      const b = meshData.solidColors[i + 2];
      if (Math.abs(r - b) > 0.05) {
        foundColoredVertex = true;
        break;
      }
    }
    assert(foundColoredVertex, 'VoxelMesher encodes true RGB chromatic light into vertex color buffer (R != B)');
  }

  // --- 2. DISTANT HORIZONS HIERARCHICAL CHUNK LOD ---
  console.log('\n▶ [2/3] Testing Distant Horizons Hierarchical Chunk LOD System...');
  {
    const generator = new WorldGeneratorCore(42819, 'standard', { dimensionId: 'overworld' });
    const lod = new DistantLODSystem(generator, 'overworld');

    const playerPos = new THREE.Vector3(0, 64, 0);
    // Run a few incremental ticks to build Ring 1 & Ring 2 tiles
    for (let i = 0; i < 8; i++) {
      lod.update(playerPos, 6, 4.0);
    }

    const metrics = lod.getMetrics();
    assert(metrics.enabled === true, 'DistantLODSystem initializes enabled');
    assert(metrics.activeTiles > 0, `DistantLODSystem streamed ${metrics.activeTiles} macro-tiles`);
    assert(metrics.totalTriangles > 0, `DistantLODSystem generated ${metrics.totalTriangles} distant terrain triangles`);
    assert(
      metrics.maxVisibleDistanceMeters >= 500,
      `DistantLODSystem extends visible horizon to ${metrics.maxVisibleDistanceMeters}m (>= 500m)`
    );

    // Toggle off cleanly disposes tiles
    lod.setEnabled(false);
    const disabledMetrics = lod.getMetrics();
    assert(disabledMetrics.activeTiles === 0, 'Disabling DistantLODSystem cleanly evicts and disposes all LOD tiles');
    lod.dispose();
  }

  // --- 3. 3D SPATIAL AUDIO & DYNAMIC ACOUSTICS ---
  console.log('\n▶ [3/3] Testing 3D Spatial Audio & Dynamic Environmental Acoustics...');
  {
    const audio = new SoundSynthesizer();

    // Listener sync
    audio.updateListener({ x: 10, y: 45, z: -20 }, { x: 0, y: 0, z: -1 }, { x: 0, y: 1, z: 0 });
    let telemetry = audio.getAcousticTelemetry();
    assert(
      telemetry.listenerPos[0] === 10 && telemetry.listenerPos[1] === 45 && telemetry.listenerPos[2] === -20,
      '3D Audio listener position syncs accurately'
    );

    // Transition to Karst Cave (high enclosure)
    for (let i = 0; i < 20; i++) {
      audio.updateAcousticEnvironment({ isUnderwater: false, caveEnclosure: 0.9, isOpenOcean: false }, 0.1);
    }
    telemetry = audio.getAcousticTelemetry();
    assert(telemetry.zone === 'karst_cave', `Acoustic zone resolves to karst_cave (got ${telemetry.zone})`);
    assert(telemetry.reverbWet > 0.35, `Karst cave increases cavern reverb wetness (${telemetry.reverbWet.toFixed(2)})`);

    // Transition to Underwater (strong low-pass muffling)
    for (let i = 0; i < 20; i++) {
      audio.updateAcousticEnvironment({ isUnderwater: true, caveEnclosure: 0, isOpenOcean: false }, 0.1);
    }
    telemetry = audio.getAcousticTelemetry();
    assert(telemetry.zone === 'underwater', `Acoustic zone resolves to underwater (got ${telemetry.zone})`);
    assert(telemetry.lowpassHz < 1200, `Underwater applies muffled low-pass filter (${Math.round(telemetry.lowpassHz)}Hz)`);

    // Spatial sound emission in headless Node environment is safe and tracked
    audio.playSpatialSound('aether_hum', { x: 18, y: 45, z: -25 }, { volume: 0.6 });
    assert(audio.getAcousticTelemetry().spatialSoundsPlayed >= 1, '3D HRTF spatial sound emitter executes safely');
    audio.dispose();
  }

  console.log('\n====================================================');
  console.log(' ALL VOXELVERSE v7.0.0 TESTS PASSED!');
  console.log('====================================================\n');
}

// Allow direct standalone execution via tsx
if (typeof process !== 'undefined' && process.argv[1]?.includes('distantHorizonsV70Tests')) {
  runDistantHorizonsV70Tests();
}
