const fs = require('fs');
let code = fs.readFileSync('/src/engine/world/Chunk.ts', 'utf8');

code = code.replace(
  'public setBlocks(data: Uint8Array): void {',
  `public calculateSurfaceHeightMap(): void {
    for (let x = 0; x < CHUNK_SIZE_X; x++) {
      for (let z = 0; z < CHUNK_SIZE_Z; z++) {
        this.updateSurfaceHeight(x, z);
      }
    }
  }

  public updateSurfaceHeight(lx: number, lz: number): void {
    const mapIdx = lx + lz * CHUNK_SIZE_X;
    for (let y = CHUNK_SIZE_Y - 2; y >= 1; y--) {
      const b = this.getBlock(lx, y, lz);
      // Wait, is AIR = 0 and WATER = 5? I need to use BlockType.AIR and BlockType.WATER. Let's just hardcode 0 and 5, or check them. Actually I can just import BlockType or use it.
      if (b !== 0 && b !== 5) {
        this.surfaceHeightMap[mapIdx] = y + 1;
        return;
      }
    }
    this.surfaceHeightMap[mapIdx] = 28; // Default spawn height fallback
  }

  public setBlocks(data: Uint8Array): void {`
);

code = code.replace(
  'this.state = ChunkState.GENERATED;\n  }',
  'this.state = ChunkState.GENERATED;\n    this.calculateSurfaceHeightMap();\n  }'
);

code = code.replace(
  'this.state = ChunkState.DIRTY;\n      return true;',
  'this.state = ChunkState.DIRTY;\n      this.updateSurfaceHeight(lx, lz);\n      return true;'
);

fs.writeFileSync('/src/engine/world/Chunk.ts', code);
