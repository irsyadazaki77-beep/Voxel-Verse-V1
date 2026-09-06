const fs = require('fs');
let code = fs.readFileSync('src/engine/world/WorldGeneratorCore.ts', 'utf8');

const target = `
    // 3. MULTI-BIOME PROCEDURAL STRUCTURES & TREES
    const structureGen = new StructureGenerator(this.seed);
    for (let lx = 3; lx < 13; lx++) {
      const wx = cx * 16 + lx;
      for (let lz = 3; lz < 13; lz++) {
        const wz = cz * 16 + lz;
        const height = heightMap[lx + lz * 16];
`;

const replacement = `
    // 3. MULTI-BIOME PROCEDURAL STRUCTURES & TREES
    const structureGen = new StructureGenerator(this.seed);
    const dominantRegion = this.regionManager.getDominantRegion(cx * 16 + 8, cz * 16 + 8);
    let regionStructureGenerated = false;

    for (let lx = 3; lx < 13; lx++) {
      const wx = cx * 16 + lx;
      for (let lz = 3; lz < 13; lz++) {
        const wz = cz * 16 + lz;
        const height = heightMap[lx + lz * 16];
        
        if (height < p.seaLevel + 1) continue;

        // Generate Cultural Region Structure (1% chance per chunk, only one per chunk max)
        if (!regionStructureGenerated && dominantRegion && dominantRegion.structurePool.length > 0) {
           const structVal = this.detailNoise.noise2D(wx * 0.123 + 400, wz * 0.123 + 400);
           if (structVal > 0.95 && lx === 8 && lz === 8) {
              const pool = dominantRegion.structurePool;
              // Pick random structure from pool deterministically
              const sType = pool[Math.abs(Math.floor(wx * wz)) % pool.length];
              const structBlocks = StructureGenerator.generateNusantaraStructure(sType);
              if (structBlocks.length > 0) {
                 this.applyStructureToChunkLocal(structBlocks, lx, height, lz, blocks, getIndex);
                 regionStructureGenerated = true;
                 continue;
              }
           }
        }
`;

code = code.replace(target, replacement);
fs.writeFileSync('src/engine/world/WorldGeneratorCore.ts', code);
