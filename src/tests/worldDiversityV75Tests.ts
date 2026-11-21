// VoxelVerse v7.5.0 World Diversity & Landform Overhaul Verification Suite:
// 1. StructureManager bug fix (spawns villages/landmarks on normal Overworld land y = 29..59)
// 2. Stratovolcano + Lava Caldera macro-landform generation (BASALT + LAVA summit)
// 3. 3 Underground Cave Biomes (Bioluminescent Karst, Aether Crystal Geode, Volcanic Magma Chamber)
// 4. Diverse Vegetation & Micro-Landmark Generators (Palm, Bamboo Grove, Giant Rainforest Tree, Waystone Shrine)
// 5. 100% Seed Determinism across repeated chunk generations
import { BlockType } from '../types';
import { WorldGeneratorCore } from '../engine/world/WorldGeneratorCore';
import { StructureGenerator } from '../engine/world/StructureGenerator';
import { StructureManager } from '../engine/world/StructureManager';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`v7.5.0 World Test Failed: ${message}`);
  }
  console.log(`  ✓ [PASS] ${message}`);
}

export function runWorldDiversityV75Tests(): void {
  console.log('\n====================================================');
  console.log(' VOXELVERSE v7.5.0: WORLD DIVERSITY & LANDFORM OVERHAUL');
  console.log('====================================================');

  const gen = new WorldGeneratorCore(42819, 'standard', { dimensionId: 'overworld' });

  // --- 1. STRUCTURE MANAGER LOWLAND SPAWN FIX ---
  console.log('\n▶ [1/5] Testing StructureManager Spawning on Normal Overworld Land (y = 29..59)...');
  {
    let foundNormalLandStructure = 0;
    let totalFound = 0;
    for (let cx = -8; cx <= 8; cx++) {
      for (let cz = -8; cz <= 8; cz++) {
        const s = StructureManager.getStructureForCell(
          cx,
          cz,
          42819,
          (wx, wz) => gen.getTerrainHeight(wx, wz),
          (wx, wz) => gen.regionManager.getDominantRegion(wx, wz)
        );
        if (s) {
          totalFound++;
          if (s.originY >= 29 && s.originY < 60) {
            foundNormalLandStructure++;
          }
        }
      }
    }
    assert(totalFound >= 5, `StructureManager spawned ${totalFound} Nusantara structures/villages across scan grid`);
    assert(
      foundNormalLandStructure >= 1,
      `StructureManager now spawns on normal Overworld land y=29..59 (${foundNormalLandStructure} found - <60 bug fixed)`
    );
  }

  // --- 2. STRATOVOLCANO & LAVA CALDERA ---
  console.log('\n▶ [2/5] Testing Stratovolcano & Lava Caldera Macro-Landform...');
  {
    let volcanoCenter: { wx: number; wz: number } | null = null;
    for (let vx = -2; vx <= 2 && !volcanoCenter; vx++) {
      for (let vz = -2; vz <= 2 && !volcanoCenter; vz++) {
        if (vx === 0 && vz === 0) continue;
        for (let ox = 128; ox < 384 && !volcanoCenter; ox += 16) {
          for (let oz = 128; oz < 384 && !volcanoCenter; oz += 16) {
            const wx = vx * 512 + ox;
            const wz = vz * 512 + oz;
            const info = gen.getVolcanoInfo(wx, wz);
            if (info.inCaldera) {
              volcanoCenter = { wx, wz };
            }
          }
        }
      }
    }
    assert(volcanoCenter !== null, `Located deterministic Stratovolcano caldera at (${volcanoCenter?.wx}, ${volcanoCenter?.wz})`);

    const vCx = Math.floor(volcanoCenter!.wx / 16);
    const vCz = Math.floor(volcanoCenter!.wz / 16);
    const vBlocks = gen.generateChunkData(vCx, vCz);
    let lavaCount = 0;
    let basaltOrMagmaCount = 0;
    for (let i = 0; i < vBlocks.length; i++) {
      if (vBlocks[i] === BlockType.LAVA) lavaCount++;
      if (vBlocks[i] === BlockType.BASALT || vBlocks[i] === BlockType.MAGMA_ROCK) basaltOrMagmaCount++;
    }
    assert(lavaCount > 0, `Volcano summit caldera filled with ${lavaCount} molten LAVA blocks`);
    assert(basaltOrMagmaCount > 50, `Volcano flanks composed of ${basaltOrMagmaCount} BASALT/MAGMA_ROCK blocks`);
  }

  // --- 3. UNDERGROUND CAVE BIOMES ---
  console.log('\n▶ [3/5] Testing Underground Cave Biomes (Bioluminescent, Aether Geode, Magma)...');
  {
    let caveSpecialBlocks = 0;
    for (let cx = -3; cx <= 3; cx++) {
      for (let cz = -3; cz <= 3; cz++) {
        const blocks = gen.generateChunkData(cx, cz);
        for (let i = 0; i < blocks.length; i++) {
          const b = blocks[i];
          if (
            b === BlockType.LUMINESCENT_MUSHROOM ||
            b === BlockType.CRYSTAL_BRICK ||
            b === BlockType.PRISMATIC_CRYSTAL ||
            b === BlockType.MAGMA_ROCK
          ) {
            caveSpecialBlocks++;
          }
        }
      }
    }
    assert(
      caveSpecialBlocks > 15,
      `Underground cave biomes populated ${caveSpecialBlocks} bioluminescent/crystal/magma cave blocks across 49 chunks`
    );
  }

  // --- 4. DIVERSE VEGETATION & WAYSTONE GENERATORS ---
  console.log('\n▶ [4/5] Testing New Nusantara Vegetation & Waystone Generators...');
  {
    const palm = StructureGenerator.generatePalmTree(42);
    assert(palm.length >= 15 && palm.some((b) => b.block === BlockType.TEAK_WOOD_LOG), `Palm tree generator built ${palm.length} blocks`);

    const bamboo = StructureGenerator.generateBambooGrove(42);
    assert(bamboo.length >= 20 && bamboo.some((b) => b.block === BlockType.BAMBOO_STALK_BLOCK), `Bamboo grove built ${bamboo.length} blocks`);

    const giant = StructureGenerator.generateGiantRainforestTree(42);
    assert(giant.length >= 60 && giant.some((b) => b.block === BlockType.ULIN_IRONWOOD_LOG), `Giant rainforest tree built ${giant.length} blocks`);

    const shrine = StructureGenerator.generateWaystoneShrine(42);
    assert(shrine.some((b) => b.block === BlockType.AETHER_LANTERN || b.block === BlockType.LANTERN), 'Waystone shrine includes glowing lantern');
  }

  // --- 5. 100% SEED DETERMINISM ---
  console.log('\n▶ [5/5] Testing 100% Seed Determinism...');
  {
    const a = gen.generateChunkData(2, -3);
    const b = new WorldGeneratorCore(42819, 'standard', { dimensionId: 'overworld' }).generateChunkData(2, -3);
    let identical = a.length === b.length;
    for (let i = 0; i < a.length && identical; i++) {
      if (a[i] !== b[i]) identical = false;
    }
    assert(identical, 'Two WorldGeneratorCore instances with same seed produce 100% bit-identical chunk buffers');
  }

  console.log('\n====================================================');
  console.log(' ALL VOXELVERSE v7.5.0 WORLD DIVERSITY TESTS PASSED!');
  console.log('====================================================\n');
}

if (typeof process !== 'undefined' && process.argv[1]?.includes('worldDiversityV75Tests')) {
  runWorldDiversityV75Tests();
}
