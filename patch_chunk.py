import re

with open('/src/engine/world/Chunk.ts', 'r') as f:
    code = f.read()

code = code.replace(
  'public setBlocks(data: Uint8Array): void {',
  '''public calculateSurfaceHeightMap(): void {
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
      // Assuming BlockType.AIR=0, BlockType.WATER=5.
      if (b !== 0 && b !== 5) {
        this.surfaceHeightMap[mapIdx] = y + 1;
        return;
      }
    }
    this.surfaceHeightMap[mapIdx] = 28;
  }

  public setBlocks(data: Uint8Array): void {'''
)

code = code.replace(
  'this.state = ChunkState.GENERATED;\n  }',
  'this.state = ChunkState.GENERATED;\n    this.calculateSurfaceHeightMap();\n  }'
)

code = code.replace(
  'this.state = ChunkState.DIRTY;\n      return true;',
  'this.state = ChunkState.DIRTY;\n      this.updateSurfaceHeight(lx, lz);\n      return true;'
)

with open('/src/engine/world/Chunk.ts', 'w') as f:
    f.write(code)
