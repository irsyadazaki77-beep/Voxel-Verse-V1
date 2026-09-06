const fs = require('fs');
let code = fs.readFileSync('src/engine/world/WorldGeneratorCore.ts', 'utf8');

if (!code.includes('CulturalRegionManager')) {
  code = "import { CulturalRegionManager } from './CulturalRegionManager';\n" + code;
}

if (!code.includes('public regionManager: CulturalRegionManager;')) {
  code = code.replace(
    'public params: WorldGenParameters;',
    'public params: WorldGenParameters;\n  public regionManager: CulturalRegionManager;'
  );
  code = code.replace(
    'this.params = { ...basePreset, ...(config || {}) };',
    'this.params = { ...basePreset, ...(config || {}) };\n    this.regionManager = new CulturalRegionManager(seed);'
  );
}

// Update getTerrainHeight
const targetTerrain = `
    let baseHeight = 30 + cont * 26 + (1.0 - Math.abs(erosion)) * 12 + detail * 5;
    if (peaks > 0.48) {
      baseHeight += Math.pow((peaks - 0.48) * 2.2, 1.8) * p.mountainHeightScale;
    }
`;

const replaceTerrain = `
    const blend = this.regionManager.getRegionBlend(wx, wz);
    let regionHeightOffset = 0;
    let regionMountainScale = 1.0;
    let regionRoughness = 1.0;
    
    for (const b of blend) {
       regionHeightOffset += b.region.terrainProfile.heightOffset * b.weight;
       regionMountainScale += (b.region.terrainProfile.mountainScale - 1.0) * b.weight;
       regionRoughness += (b.region.terrainProfile.roughness - 1.0) * b.weight;
    }

    let baseHeight = 30 + regionHeightOffset + cont * 26 + (1.0 - Math.abs(erosion)) * 12 + (detail * 5 * regionRoughness);
    if (peaks > 0.48) {
      baseHeight += Math.pow((peaks - 0.48) * 2.2, 1.8) * p.mountainHeightScale * regionMountainScale;
    }
`;

if (code.includes('let baseHeight = 30 + cont * 26 + (1.0 - Math.abs(erosion)) * 12 + detail * 5;')) {
  code = code.replace(targetTerrain, replaceTerrain);
}

fs.writeFileSync('src/engine/world/WorldGeneratorCore.ts', code);
