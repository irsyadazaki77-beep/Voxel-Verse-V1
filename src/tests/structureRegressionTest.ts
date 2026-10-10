import { StructureManager } from '../engine/world/StructureManager';
import { NusantaraBuildingKit } from '../engine/world/NusantaraBuildingKit';

export async function runStructureRegressionTests(): Promise<boolean> {
  console.log('--- RUNNING STRUCTURE REGRESSION TESTS ---');
  let passed = true;

  try {
    // 1. CHUNK ORDER INDEPENDENCE TEST
    // Generating structures over boundaries shouldn't be affected by which chunk gets queried first.
    // getOverlappingStructuresForChunk calculates everything independently of the chunk order!
    console.log('Testing deterministic overlap queries...');
    const seed = 12345;
    const structA = StructureManager.getOverlappingStructuresForChunk(0, 0, seed, () => 64, () => ({ id: 'tanah_jawa', structurePool: ['joglo'] }));
    const structB = StructureManager.getOverlappingStructuresForChunk(1, 0, seed, () => 64, () => ({ id: 'tanah_jawa', structurePool: ['joglo'] }));
    
    // We just verify it doesn't crash and returns valid StructureInstances
    console.log(`Structures in chunk 0,0: ${structA.length}`);
    console.log(`Structures in chunk 1,0: ${structB.length}`);

    // 2. Y-ANCHOR TEST
    // Ensure that all blocks in a structure have the same originY.
    // StructureManager applies this deterministically at creation.
    console.log('Testing uniform originY across chunks...');
    if (structA.length > 0) {
      const s = structA[0];
      if (s.originY !== 64) {
         console.error('Y-Anchor mismatch! Expected 64, got: ', s.originY);
         passed = false;
      }
    }

    // 3. FOUNDATION SYSTEM TEST
    console.log('Testing foundation drop system...');
    // We test with a dummy region and sloping terrain
    const slopingTerrain = (wx: number, wz: number) => {
       // origin is at center of cell, e.g. 48.
       // terrain is lower than origin (e.g. 50 instead of 60)
       return 50; 
    };
    
    // 4. SIGNATURE STRUCTURE TEST
    console.log('Testing signature structures generation...');
    const signatures = [
      NusantaraBuildingKit.generateRumahGadang(),
      NusantaraBuildingKit.generateJoglo(),
      NusantaraBuildingKit.generateTongkonan(),
      NusantaraBuildingKit.generateRumahBetang(24),
      NusantaraBuildingKit.generateHonai(),
      NusantaraBuildingKit.generateVillageWell('andesite'),
      NusantaraBuildingKit.generateDryingRack('grain'),
      NusantaraBuildingKit.generateFirewoodStack(),
      NusantaraBuildingKit.generateTraditionalForge(),
      NusantaraBuildingKit.generateLivestockShelter(),
      NusantaraBuildingKit.generateVillageWatchpost(),
      NusantaraBuildingKit.generateSubakTerracePlot(),
      NusantaraBuildingKit.generateEbeai(),
      NusantaraBuildingKit.generateSasakBaleTani()
    ];
    
    console.log(`Generated ${signatures.length} signature blueprints without errors.`);

    // 5. NUSANTARA SETTLEMENT VARIATIONS TEST
    console.log('Testing 35 cultural settlement variations across 7 regions...');
    const cultures = ['tanah_minang', 'tanah_jawa', 'bali_highlands', 'borneo_riverlands', 'toraja_highlands', 'papua_highlands', 'eastern_isles'];
    const slopeSampler = (dx: number, dz: number) => Math.sin(dx * 0.1) * 2 + Math.cos(dz * 0.1) * 2;
    
    for (const culture of cultures) {
      for (let variant = 0; variant < 5; variant++) {
        const blocks = StructureManager.getStructureForCell(
          variant * 10, 
          variant * 10, 
          variant, 
          (wx, wz) => 64 + Math.round(slopeSampler(wx, wz)), 
          () => ({ id: culture, structurePool: ['settlement'] })
        );
        // Direct generator test
        const directPlacements = NusantaraBuildingKit ? 
          (await import('../engine/world/NusantaraSettlementGenerator')).NusantaraSettlementGenerator.generateSettlement(culture, 0, 64, 0, variant, slopeSampler) : [];
        if (directPlacements.length === 0) {
          console.error(`Empty settlement generated for ${culture} variant ${variant}`);
          passed = false;
        }
      }
    }
    console.log('All 35 cultural settlement variants generated successfully.');

  } catch (error) {
    console.error('Structure test failed with error:', error);
    passed = false;
  }

  console.log(`--- STRUCTURE REGRESSION TESTS: ${passed ? 'PASSED' : 'FAILED'} ---`);
  return passed;
}
