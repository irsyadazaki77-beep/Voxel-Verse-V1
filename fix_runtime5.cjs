const fs = require('fs');
let code = fs.readFileSync('src/engine/core/GameRuntime.ts', 'utf8');

code = code.replace(
  'SaveManager.applySaveToWorld(this.world, worldData);',
  'this.globalModifiedBlocks = worldData.modifiedBlocks || {};\n      SaveManager.applySaveToWorld(this.world, worldData);'
);

fs.writeFileSync('src/engine/core/GameRuntime.ts', code);
