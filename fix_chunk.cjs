const fs = require('fs');
let code = fs.readFileSync('src/engine/world/ChunkScheduler.ts', 'utf8');
code = code.replace('preset: this.world.preset,\n                ,\n                priority,', 'preset: this.world.preset,\n                priority,');
fs.writeFileSync('src/engine/world/ChunkScheduler.ts', code);
