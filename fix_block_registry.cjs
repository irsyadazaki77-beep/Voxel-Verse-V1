const fs = require('fs');
let code = fs.readFileSync('src/engine/world/BlockRegistry.ts', 'utf8');
code = code.replace('export const BLOCK_DEFS: Record<BlockType, BlockDef> = {', 'export const BLOCK_DEFS: Record<number, BlockDef> = {');
fs.writeFileSync('src/engine/world/BlockRegistry.ts', code);

// Fix ChunkScheduler dimensionId
let chunkCode = fs.readFileSync('src/engine/world/ChunkScheduler.ts', 'utf8');
chunkCode = chunkCode.replace('dimensionId: this.world.dimensionId', '');
fs.writeFileSync('src/engine/world/ChunkScheduler.ts', chunkCode);

