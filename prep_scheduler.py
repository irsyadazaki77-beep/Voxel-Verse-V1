import re

with open('/src/engine/world/ChunkScheduler.ts', 'r') as f:
    code = f.read()

# Replace neighbor buffer construction
old_neighbor = '''        // Prepare neighbor buffers using zero-allocation coordinate offsets
        const neighborBuffers: Record<string, ArrayBuffer> = {};
        for (let i = 0; i < ChunkScheduler.NEIGHBOR_OFFSETS.length; i++) {
          const [ox, oz] = ChunkScheduler.NEIGHBOR_OFFSETS[i];
          const nx = cx + ox;
          const nz = cz + oz;
          const nChunk = this.world.chunks.get(`${nx},${nz}`);
          if (nChunk && nChunk.blocks) {
            neighborBuffers[`${nx}_${nz}`] = nChunk.blocks.buffer;
          }
        }'''

new_neighbor = '''        // Prepare a 18x128x18 padded buffer
        const paddedBuffer = new Uint8Array(18 * 128 * 18);
        const centerBlocks = chunk.blocks;
        
        // Helper to safely get blocks
        const getB = (x, z) => {
           if (x >= 0 && x < 16 && z >= 0 && z < 16) return centerBlocks;
           let nx = cx; let nz = cz;
           if (x < 0) nx--; else if (x >= 16) nx++;
           if (z < 0) nz--; else if (z >= 16) nz++;
           const nc = this.world.chunks.get(`${nx},${nz}`);
           return nc ? nc.blocks : null;
        };
        
        // Cache neighboring chunk blocks
        const nBlocks = {
          '0,0': centerBlocks,
          '-1,0': getB(-1, 0),
          '1,0': getB(16, 0),
          '0,-1': getB(0, -1),
          '0,1': getB(0, 16),
          '-1,-1': getB(-1, -1),
          '1,-1': getB(16, -1),
          '-1,1': getB(-1, 16),
          '1,1': getB(16, 16)
        };

        // Fill padded buffer
        // Instead of full loop, we can just loop over 18x18
        for (let x = -1; x < 17; x++) {
          for (let z = -1; z < 17; z++) {
            let nX = 0, nZ = 0;
            let srcX = x, srcZ = z;
            if (x < 0) { nX = -1; srcX = 15; }
            else if (x >= 16) { nX = 1; srcX = 0; }
            
            if (z < 0) { nZ = -1; srcZ = 15; }
            else if (z >= 16) { nZ = 1; srcZ = 0; }
            
            const srcBlocks = nBlocks[`${nX},${nZ}`];
            if (!srcBlocks) continue;
            
            const dstIdxBase = (x + 1) + (z + 1) * 18;
            const srcIdxBase = srcX + srcZ * 16;
            
            for (let y = 0; y < 128; y++) {
               paddedBuffer[dstIdxBase + y * 324] = srcBlocks[srcIdxBase + y * 256];
            }
          }
        }
'''

code = code.replace(old_neighbor, new_neighbor)
code = code.replace(
    'centerBuffer: chunk.blocks!.buffer,\n          neighborBuffers,',
    'paddedBuffer: paddedBuffer.buffer,'
)

with open('/src/engine/world/ChunkScheduler.ts', 'w') as f:
    f.write(code)
