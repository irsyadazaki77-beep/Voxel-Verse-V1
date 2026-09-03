import re

with open('/src/engine/world/WorldWorker.ts', 'r') as f:
    code = f.read()

old_worker = '''      const { cx, cz, centerBuffer, neighborBuffers, sourceRevision = 0 } = input;
      
      const centerBlocks = new Uint8Array(centerBuffer);
      const neighbors: Record<string, Uint8Array> = {};
      for (const key in neighborBuffers) {
        neighbors[key] = new Uint8Array(neighborBuffers[key]);
      }

      const getBlock = (lx: number, ly: number, lz: number): number => {
        if (ly < 0 || ly >= 128) return 0;
        
        let targetCx = cx;
        let targetCz = cz;
        let targetLx = lx;
        let targetLz = lz;

        if (lx < 0) { targetCx -= 1; targetLx += 16; }
        else if (lx >= 16) { targetCx += 1; targetLx -= 16; }
        
        if (lz < 0) { targetCz -= 1; targetLz += 16; }
        else if (lz >= 16) { targetCz += 1; targetLz -= 16; }

        if (targetCx === cx && targetCz === cz) {
          return centerBlocks[targetLx + targetLz * 16 + ly * 256];
        } else {
          const nKey = `${targetCx}_${targetCz}`;
          const nBuffer = neighbors[nKey];
          if (nBuffer) {
            return nBuffer[targetLx + targetLz * 16 + ly * 256];
          }
          return 0; // AIR if neighbor not provided
        }
      };'''

new_worker = '''      const { cx, cz, paddedBuffer, sourceRevision = 0 } = input as any;
      
      const paddedBlocks = new Uint8Array(paddedBuffer);
      
      const getBlock = (lx: number, ly: number, lz: number): number => {
        if (ly < 0 || ly >= 128) return 0;
        const px = lx + 1;
        const pz = lz + 1;
        if (px < 0 || px >= 18 || pz < 0 || pz >= 18) return 0;
        return paddedBlocks[px + pz * 18 + ly * 324];
      };'''

code = code.replace(old_worker, new_worker)

with open('/src/engine/world/WorldWorker.ts', 'w') as f:
    f.write(code)
