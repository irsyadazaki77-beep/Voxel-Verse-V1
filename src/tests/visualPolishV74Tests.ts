// VoxelVerse v7.4.0 Visual Polish & Rendering Overhaul Verification Suite:
// 1. SkyDome 950m radius + depthWrite:false + renderOrder:-1000 (never occludes 600m+ Distant LOD)
// 2. Chunk-Border Lighting Seam Fix (x=0 / x=15 exposed sunlit faces stay bright, zero dark vertical chunk stripes)
// 3. DistantLODSystem MeshStandardMaterial + Analytic Seamless Edge Normals across adjacent tiles
// 4. Shader Integrity: Tangent-projected micro-normals, anti-moiré detailFade/borderFade, and God Rays skyElevationWeight
import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { BlockType } from '../types';
import { SkyEnvironment } from '../engine/environment/SkyEnvironment';
import { VoxelMesher } from '../engine/world/VoxelMesher';
import { WorldGeneratorCore } from '../engine/world/WorldGeneratorCore';
import { DistantLODSystem } from '../engine/world/DistantLODSystem';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`v7.4.0 Visual Test Failed: ${message}`);
  }
  console.log(`  ✓ [PASS] ${message}`);
}

export function runVisualPolishV74Tests(): void {
  console.log('\n====================================================');
  console.log(' VOXELVERSE v7.4.0: VISUAL POLISH & RENDERING OVERHAUL');
  console.log('====================================================');

  // --- 1. SKYDOME & SHADOW FRUSTUM ---
  console.log('\n▶ [1/4] Testing SkyDome Radius, DepthWrite & Expanded Shadow Frustum...');
  {
    const scene = new THREE.Scene();
    const sky = new SkyEnvironment(scene);
    const skyMat = sky.skyDomeMesh.material as THREE.ShaderMaterial;
    const sphereParams = (sky.skyDomeMesh.geometry as THREE.SphereGeometry).parameters;

    assert(sphereParams.radius >= 900, `SkyDome radius is ${sphereParams.radius}m (>= 900m, clears 600m+ Distant LOD)`);
    assert(skyMat.depthWrite === false, 'SkyDome material disables depthWrite so distant mountains are never occluded');
    assert(sky.skyDomeMesh.renderOrder <= -1000, `SkyDome renderOrder is ${sky.skyDomeMesh.renderOrder} (renders behind world)`);

    sky.setShadowQuality('ultra');
    assert(sky.sunLight.shadow.camera.right >= 75, `Ultra shadow frustum expanded to ±${sky.sunLight.shadow.camera.right}m`);
    sky.dispose();
  }

  // --- 2. CHUNK-BORDER LIGHTING SEAM FIX ---
  console.log('\n▶ [2/4] Testing Chunk-Border Sunlit Face Brightness (Zero Dark Vertical Seams)...');
  {
    const W = 16, H = 32, D = 16;
    const blocks = new Uint8Array(W * H * D);
    const setB = (x: number, y: number, z: number, b: BlockType) => {
      blocks[x + z * W + y * W * D] = b;
    };
    const getB = (x: number, y: number, z: number): BlockType => {
      if (x < 0 || x >= W || y < 0 || y >= H || z < 0 || z >= D) return BlockType.AIR;
      return blocks[x + z * W + y * W * D] as BlockType;
    };

    // Place a sunlit pillar right on the chunk border (x = 0, z = 8, y = 1..5)
    for (let y = 1; y <= 5; y++) {
      setB(0, y, 8, BlockType.STONE);
    }

    const meshData = VoxelMesher.buildChunkMeshData(getB, W, H, D);
    assert(meshData.solidPositions.length > 0, 'Mesher generated geometry for border pillar');

    // Inspect left-facing (-X) border vertices at x == 0: they must have bright outdoor light (> 0.70), not dark clamped 0.16!
    let checkedLeftFace = 0;
    let minBorderLuma = 99;
    for (let i = 0; i < meshData.solidNormals.length; i += 3) {
      if (meshData.solidNormals[i] < -0.5) {
        checkedLeftFace++;
        const r = meshData.solidColors[i];
        const g = meshData.solidColors[i + 1];
        const b = meshData.solidColors[i + 2];
        const luma = (r + g + b) / 3;
        if (luma < minBorderLuma) minBorderLuma = luma;
      }
    }
    assert(checkedLeftFace > 0, `Checked ${checkedLeftFace} outward chunk-border vertices`);
    assert(
      minBorderLuma >= 0.65,
      `Chunk-border sunlit face stays bright (min luma ${minBorderLuma.toFixed(2)} >= 0.65, dark stripe eliminated)`
    );
  }

  // --- 3. DISTANT LOD MATERIAL & SEAMLESS ANALYTIC EDGE NORMALS ---
  console.log('\n▶ [3/4] Testing DistantLODSystem MeshStandardMaterial & Seamless Analytic Edge Normals...');
  {
    const generator = new WorldGeneratorCore(42819, 'standard', { dimensionId: 'overworld' });
    const lod = new DistantLODSystem(generator, 'overworld');

    // Build several Ring 1 tiles
    for (let i = 0; i < 12; i++) {
      lod.update(new THREE.Vector3(0, 64, 0), 4, 5.0);
    }

    const meshes = lod.group.children as THREE.Mesh[];
    assert(meshes.length >= 2, `Generated ${meshes.length} Distant LOD tiles`);
    assert(
      meshes[0].material instanceof THREE.MeshStandardMaterial,
      'DistantLODSystem uses MeshStandardMaterial matching VoxelWorld PBR lighting'
    );

    // Find two adjacent Ring 1 tiles along X (same z, x differs by 64) and verify shared edge normals match 100%
    let matchedPair = false;
    let maxNormalDiff = 0;
    for (let a = 0; a < meshes.length; a++) {
      for (let b = 0; b < meshes.length; b++) {
        if (a === b) continue;
        const mA = meshes[a];
        const mB = meshes[b];
        if (mB.position.x - mA.position.x === 64 && mB.position.z === mA.position.z) {
          const nA = mA.geometry.getAttribute('normal') as THREE.BufferAttribute;
          const nB = mB.geometry.getAttribute('normal') as THREE.BufferAttribute;
          // Right edge of mA is gx = 16; Left edge of mB is gx = 0 (vertsPerSide = 17)
          for (let gz = 0; gz < 17; gz++) {
            const idxA = gz * 17 + 16;
            const idxB = gz * 17 + 0;
            const diff = Math.hypot(
              nA.getX(idxA) - nB.getX(idxB),
              nA.getY(idxA) - nB.getY(idxB),
              nA.getZ(idxA) - nB.getZ(idxB)
            );
            if (diff > maxNormalDiff) maxNormalDiff = diff;
          }
          matchedPair = true;
          break;
        }
      }
      if (matchedPair) break;
    }
    assert(matchedPair, 'Found adjacent Ring 1 LOD tiles sharing a 64m boundary');
    assert(maxNormalDiff < 1e-5, `Shared LOD tile boundary normals match exactly (max diff ${maxNormalDiff.toExponential(2)})`);
    lod.dispose();
  }

  // --- 4. SHADER & CAMERA SOURCE INTEGRITY CHECKS ---
  console.log('\n▶ [4/4] Verifying Camera Far Plane, Tangent Micro-Normals, Anti-Moiré & God Ray Guard...');
  {
    const root = process.cwd();
    const runtimeSrc = fs.readFileSync(path.join(root, 'src/engine/core/GameRuntime.ts'), 'utf8');
    const worldSrc = fs.readFileSync(path.join(root, 'src/engine/world/VoxelWorld.ts'), 'utf8');
    const pipelineSrc = fs.readFileSync(path.join(root, 'src/engine/rendering/RenderPipeline.ts'), 'utf8');

    assert(runtimeSrc.includes('0.15, 1200'), 'GameRuntime PerspectiveCamera uses far=1200m and near=0.15m');
    assert(worldSrc.includes('tangentBump') && worldSrc.includes('detailFade'), 'VoxelWorld shader uses tangent-projected micro-normals + distance detailFade');
    assert(worldSrc.includes('borderFade'), 'VoxelWorld shader fades voxel block border lines at distance (anti-moiré)');
    assert(pipelineSrc.includes('skyElevationWeight'), 'RenderPipeline God Rays include skyElevationWeight foreground guard');
  }

  console.log('\n====================================================');
  console.log(' ALL VOXELVERSE v7.4.0 VISUAL POLISH TESTS PASSED!');
  console.log('====================================================\n');
}

if (typeof process !== 'undefined' && process.argv[1]?.includes('visualPolishV74Tests')) {
  runVisualPolishV74Tests();
}
