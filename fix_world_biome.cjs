const fs = require('fs');
let code = fs.readFileSync('src/engine/world/WorldGeneratorCore.ts', 'utf8');

// The instruction is to pass the region to getBiome, but the BiomeManager is the one giving the biome.
// Actually, they asked to modify BiomeManager to query CulturalRegionManager and bias the biome selection.

// Let's modify BiomeManager.ts directly.
let biomeCode = fs.readFileSync('src/engine/world/BiomeManager.ts', 'utf8');
const importStmt = "import { CulturalRegionManager } from './CulturalRegionManager';";
if (!biomeCode.includes('CulturalRegionManager')) {
   biomeCode = importStmt + '\n' + biomeCode;
}
if (!biomeCode.includes('private regionManager: CulturalRegionManager;')) {
   biomeCode = biomeCode.replace('public dimensionId?: string;', 'public dimensionId?: string;\n  private regionManager: CulturalRegionManager;');
   biomeCode = biomeCode.replace('this.peaksNoise = new SimplexNoise(seed + 104);', 'this.peaksNoise = new SimplexNoise(seed + 104);\n    this.regionManager = new CulturalRegionManager(seed);');
}

const getBiomeTarget = `    // 3. Exotic Biomes (Rare)
    if (humid > 0.82 && temp > 0.25 && temp < 0.6) {
      if (erosion < -0.3) return BIOMES_2.mycelium_grove;
      if (erosion > 0.2) return BIOMES_2.enchanted_forest;
    }`;

const getBiomeReplace = `    const region = this.regionManager.getDominantRegion(wx, wz);
    if (region && continental > -0.35) {
       // Apply Nusantara overrides based on the active Cultural Region
       const name = region.id;
       if (name === 'minang' && peaks > 0.3) return BIOMES_2.highlands;
       if (name === 'minang' && temp > 0.5) return BIOMES_2.jungle;
       if (name === 'jawa' && peaks > 0.5) return BIOMES_2.volcanic;
       if (name === 'jawa' && humid > 0.3) return BIOMES_2.plains; // Sawah simulation
       if (name === 'jawa' && temp > 0.3) return BIOMES_2.forest; // Jati forest
       if (name === 'bali' && peaks > 0.4) return BIOMES_2.volcanic;
       if (name === 'bali' && humid > 0.4) return BIOMES_2.jungle;
       if (name === 'borneo' && humid > 0.5) return BIOMES_2.swamp;
       if (name === 'borneo') return BIOMES_2.jungle;
       if (name === 'toraja' && peaks > 0.2) return BIOMES_2.highlands;
       if (name === 'papua' && peaks > 0.6) return BIOMES_2.alpine;
       if (name === 'papua') return BIOMES_2.jungle;
       if (name === 'isles' && continental < -0.1) return BIOMES_2.beach;
       if (name === 'isles') return BIOMES_2.forest;
    }

    // 3. Exotic Biomes (Rare)
    if (humid > 0.82 && temp > 0.25 && temp < 0.6) {
      if (erosion < -0.3) return BIOMES_2.mycelium_grove;
      if (erosion > 0.2) return BIOMES_2.enchanted_forest;
    }`;

biomeCode = biomeCode.replace(getBiomeTarget, getBiomeReplace);

fs.writeFileSync('src/engine/world/BiomeManager.ts', biomeCode);
