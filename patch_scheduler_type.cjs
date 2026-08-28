const fs = require('fs');
let content = fs.readFileSync('src/engine/world/ChunkScheduler.ts', 'utf-8');

content = content.replace(
  "              this.workerPool.enqueueTask({",
  "              this.workerPool.enqueueTask({\n                type: 'generate',"
);

fs.writeFileSync('src/engine/world/ChunkScheduler.ts', content);
