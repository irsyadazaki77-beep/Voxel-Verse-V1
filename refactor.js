const fs = require('fs');
let code = fs.readFileSync('src/engine/world/WorldGeneratorCore.ts', 'utf8');

// Find start and end of generateChunkData
const startIdx = code.indexOf('public generateChunkData(');
const modStart = code.indexOf('// Apply runtime block modifications', startIdx);
const endIdx = code.indexOf('return blocks;', modStart) + 14;

let newFunc = `
  public generateChunkData(cx: number, cz: number, modifiedBlocks?: Record<string, number>): Uint8Array {
    const blocks = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z);
    const getIndex = (x: number, y: number, z: number) => x + z * CHUNK_SIZE_X + y * (CHUNK_SIZE_X * CHUNK_SIZE_Z);
    const heightMap = new Int16Array(CHUNK_SIZE_X * CHUNK_SIZE_Z);
    const p = this.params;

    if (p.dimensionId === DIMENSION_AETHER) {
      this.generateAetherChunk(cx, cz, blocks, heightMap, getIndex);
    } else {
      this.generateOverworldChunk(cx, cz, blocks, heightMap, getIndex);
    }

    if (modifiedBlocks) {
      Object.entries(modifiedBlocks).forEach(([localKey, blockType]) => {
        const [lx, ly, lz] = localKey.split(',').map(Number);
        if (ly >= 0 && ly < CHUNK_SIZE_Y) {
          blocks[getIndex(lx, ly, lz)] = blockType;
        }
      });
    }

    return blocks;
  }
`;

// Extract overworld logic
const overworldStart = code.indexOf('// 1. TERRAIN & BIOME COLUMN GENERATION', startIdx);
const overworldEnd = code.indexOf('// Apply runtime block modifications', startIdx);

const overworldBody = code.substring(overworldStart, overworldEnd);

const generateOverworldChunkStr = `
  private generateOverworldChunk(cx: number, cz: number, blocks: Uint8Array, heightMap: Int16Array, getIndex: (x: number, y: number, z: number) => number): void {
    const p = this.params;
    ${overworldBody}
  }
`;

const generateAetherChunkStr = `
  private generateAetherChunk(cx: number, cz: number, blocks: Uint8Array, heightMap: Int16Array, getIndex: (x: number, y: number, z: number) => number): void {
    const p = this.params;
    const ISLAND_Y = 40;
    
    // Low frequency noise for island placement
    for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
      const wx = cx * CHUNK_SIZE_X + lx;
      for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
        const wz = cz * CHUNK_SIZE_Z + lz;
        
        const islandShape = this.contNoise.fbm2D(wx * 0.015, wz * 0.015, 3, 0.5);
        
        if (islandShape > 0.2) {
          // It's an island!
          const height = ISLAND_Y + Math.floor((islandShape - 0.2) * 40);
          heightMap[lx + lz * CHUNK_SIZE_X] = height;
          
          const depth = Math.floor(10 + Math.random() * 5); // Simple bottom
          
          for (let y = height; y >= height - depth && y >= 0; y--) {
            let block = BlockType.AETHER_STONE;
            if (y === height) block = BlockType.AETHER_GRASS;
            else if (y >= height - 3) block = BlockType.AETHER_DIRT;
            blocks[getIndex(lx, y, lz)] = block;
          }
        } else {
           heightMap[lx + lz * CHUNK_SIZE_X] = 0;
        }
      }
    }
  }
`;

// Replace in file
code = code.substring(0, startIdx) + newFunc + generateOverworldChunkStr + generateAetherChunkStr + code.substring(endIdx);
fs.writeFileSync('src/engine/world/WorldGeneratorCore.ts', code);
