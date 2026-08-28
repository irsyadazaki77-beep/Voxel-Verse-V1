const fs = require('fs');
let content = fs.readFileSync('src/engine/world/ChunkScheduler.ts', 'utf-8');

const regex = /              this\.world\.chunks\.set\(key, chunk\);/;
const replacement = `              this.world.chunks.set(key, chunk);
              this.world.worldGroup.add(chunk.group);`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/engine/world/ChunkScheduler.ts', content);
