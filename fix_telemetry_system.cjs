const fs = require('fs');
let code = fs.readFileSync('src/engine/systems/TelemetrySystem.ts', 'utf8');

const target = 'biomeName: currentBiome.name,';
const replacement = `biomeName: currentBiome.name,
      culturalRegionName: world.regionManager ? world.regionManager.getDominantRegion(player.position.x, player.position.z)?.displayName : 'Unknown',`;

if (!code.includes('culturalRegionName: world.regionManager')) {
  code = code.replace(target, replacement);
  fs.writeFileSync('src/engine/systems/TelemetrySystem.ts', code);
}
