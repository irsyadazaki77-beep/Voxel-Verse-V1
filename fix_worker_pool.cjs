const fs = require('fs');

let content = fs.readFileSync('src/engine/world/ChunkWorkerPool.ts', 'utf-8');

// replace \` with ` and \$ with $
content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');

fs.writeFileSync('src/engine/world/ChunkWorkerPool.ts', content);
