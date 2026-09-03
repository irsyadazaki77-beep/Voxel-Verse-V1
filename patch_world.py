import re

with open('/src/engine/world/VoxelWorld.ts', 'r') as f:
    code = f.read()

replacement = '''public getSpawnHeight(wx: number, wz: number): number {
    const cx = Math.floor(wx / CHUNK_SIZE_X);
    const cz = Math.floor(wz / CHUNK_SIZE_Z);
    const key = this.getChunkKey(cx, cz);
    const chunk = this.chunks.get(key);
    
    if (chunk) {
      let lx = Math.floor(wx) - cx * CHUNK_SIZE_X;
      let lz = Math.floor(wz) - cz * CHUNK_SIZE_Z;
      return chunk.surfaceHeightMap[lx + lz * CHUNK_SIZE_X];
    }
    return 28;
  }'''

code = re.sub(r'public getSpawnHeight\(wx: number, wz: number\): number \{.*?(?=\n  public dispose\(\): void \{)', replacement + '\n', code, flags=re.DOTALL)

with open('/src/engine/world/VoxelWorld.ts', 'w') as f:
    f.write(code)
