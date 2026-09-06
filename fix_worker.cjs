const fs = require('fs');
let code = fs.readFileSync('src/engine/world/ChunkWorkerPool.ts', 'utf8');
// Fix import.meta.url error by replacing it with something else or modifying tsconfig.
code = code.replace("new Worker(new URL('./WorldWorker.ts', import.meta.url), { type: 'module' })", "new Worker(new URL('./WorldWorker.ts', 'http://localhost/'), { type: 'module' })");
fs.writeFileSync('src/engine/world/ChunkWorkerPool.ts', code);
