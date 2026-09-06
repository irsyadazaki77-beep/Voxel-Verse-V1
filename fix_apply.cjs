const fs = require('fs');
let code = fs.readFileSync('src/engine/world/WorldGeneratorCore.ts', 'utf8');

const target = `  private applyStructureToChunkLocal(
    structure: Record<string, number>,
    lx: number,
    wy: number,
    lz: number,
    blocks: Uint8Array,
    getIndex: (x: number, y: number, z: number) => number
  ): void {
    // Extract base coordinates from the first key to calculate relative offsets
    const keys = Object.keys(structure);
    if (keys.length === 0) return;
    
    const firstKey = keys[0];
    const [baseWx, , baseWz] = firstKey.split(',').map(Number);
    
    Object.entries(structure).forEach(([posKey, blockType]) => {
      const [wx, y, wz] = posKey.split(',').map(Number);
      
      const dx = wx - baseWx;
      const dz = wz - baseWz;
      
      const tx = lx + dx;
      const tz = lz + dz;
      
      if (tx >= 0 && tx < 16 && tz >= 0 && tz < 16 && y >= 0 && y < 128) {
        blocks[getIndex(tx, y, tz)] = blockType;
      }
    });
  }`;

const replace = `  private applyStructureToChunkLocal(
    structure: Record<string, number> | { dx: number, dy: number, dz: number, block: number }[],
    lx: number,
    wy: number,
    lz: number,
    blocks: Uint8Array,
    getIndex: (x: number, y: number, z: number) => number
  ): void {
    if (Array.isArray(structure)) {
      for (const b of structure) {
        const tx = lx + b.dx;
        const ty = wy + b.dy;
        const tz = lz + b.dz;
        if (tx >= 0 && tx < 16 && tz >= 0 && tz < 16 && ty >= 0 && ty < 128) {
          blocks[getIndex(tx, ty, tz)] = b.block;
        }
      }
    } else {
      const keys = Object.keys(structure);
      if (keys.length === 0) return;
      
      const firstKey = keys[0];
      const [baseWx, , baseWz] = firstKey.split(',').map(Number);
      
      Object.entries(structure).forEach(([posKey, blockType]) => {
        const [wx, y, wz] = posKey.split(',').map(Number);
        
        const dx = wx - baseWx;
        const dz = wz - baseWz;
        
        const tx = lx + dx;
        const tz = lz + dz;
        
        if (tx >= 0 && tx < 16 && tz >= 0 && tz < 16 && y >= 0 && y < 128) {
          blocks[getIndex(tx, y, tz)] = blockType as number;
        }
      });
    }
  }`;

code = code.replace(target, replace);

// Fix the call to generateOakTree and generatePineTree
code = code.replace('structureGen.generateOakTree(wx, height + 1, wz)', 'structureGen.generateOakTree(wx + wz)');
code = code.replace('structureGen.generatePineTree(wx, height + 1, wz)', 'structureGen.generatePineTree(wx + wz)');

fs.writeFileSync('src/engine/world/WorldGeneratorCore.ts', code);
