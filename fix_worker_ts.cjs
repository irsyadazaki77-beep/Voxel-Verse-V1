const fs = require('fs');
let code = fs.readFileSync('src/engine/world/ChunkWorkerPool.ts', 'utf8');
code = code.replace("new Worker(new URL('./WorldWorker.ts', 'http://localhost/'), { type: 'module' })", "new Worker(new URL('./WorldWorker.ts', import.meta.url), { type: 'module' })");
code = code.replace("new Worker(new URL('./WorldWorker.ts', import.meta.url)", "// @ts-ignore\n      new Worker(new URL('./WorldWorker.ts', import.meta.url)");
fs.writeFileSync('src/engine/world/ChunkWorkerPool.ts', code);
