const fs = require('fs');
let code = fs.readFileSync('src/engine/world/BiomeManager.ts', 'utf8');

if (!code.includes('public dimensionId?: string;')) {
  code = code.replace('private peaksNoise: SimplexNoise;', 'private peaksNoise: SimplexNoise;\n  public dimensionId?: string;');
  fs.writeFileSync('src/engine/world/BiomeManager.ts', code);
}

