const fs = require('fs');
let code = fs.readFileSync('src/engine/world/WorldGeneratorCore.ts', 'utf8');

const target = `
    // Add Aether foliage and trees
    const structureGen = new StructureGenerator(this.seed);
`;

const replace = `
    // Add Aether foliage and trees
    const structureGen = new StructureGenerator(this.seed);
    
    // 5% chance per chunk to spawn an Aether Temple entrance on an island
    if (this.detailNoise.noise2D(cx * 0.1, cz * 0.1) > 0.95) {
       let highestIslandY = 0;
       let bestX = 8, bestZ = 8;
       for (let lx = 3; lx < 13; lx++) {
         for (let lz = 3; lz < 13; lz++) {
           if (heightMap[lx + lz * 16] > highestIslandY) {
             highestIslandY = heightMap[lx + lz * 16];
             bestX = lx;
             bestZ = lz;
           }
         }
       }
       if (highestIslandY > 0) {
          // Just place a portal frame/temple indicator for now or basic blocks
          const wx = cx * 16 + bestX;
          const wz = cz * 16 + bestZ;
          
          const blocksToApply = {};
          blocksToApply[\`\${wx},\${highestIslandY + 1},\${wz}\`] = BlockType.AETHER_GATE_FRAME;
          blocksToApply[\`\${wx},\${highestIslandY + 2},\${wz}\`] = BlockType.AETHER_PORTAL;
          
          this.applyStructureToChunkLocal(blocksToApply, bestX, highestIslandY + 1, bestZ, blocks, getIndex);
       }
    }
`;

code = code.replace(target, replace);
fs.writeFileSync('src/engine/world/WorldGeneratorCore.ts', code);
