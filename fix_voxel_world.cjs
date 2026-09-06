const fs = require('fs');
let code = fs.readFileSync('src/engine/world/VoxelWorld.ts', 'utf8');

if (!code.includes('CulturalRegionManager')) {
  code = "import { CulturalRegionManager } from './CulturalRegionManager';\n" + code;
}

if (!code.includes('public regionManager: CulturalRegionManager;')) {
  code = code.replace(
    'public biomeManager: BiomeManager;',
    'public biomeManager: BiomeManager;\n  public regionManager: CulturalRegionManager;'
  );
  code = code.replace(
    'this.biomeManager = new BiomeManager(seed, dimensionId);',
    'this.biomeManager = new BiomeManager(seed, dimensionId);\n    this.regionManager = new CulturalRegionManager(seed);'
  );
}

fs.writeFileSync('src/engine/world/VoxelWorld.ts', code);
