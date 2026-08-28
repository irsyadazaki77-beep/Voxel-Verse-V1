const fs = require('fs');

let content = fs.readFileSync('src/engine/world/VoxelWorld.ts', 'utf-8');

// Add import
if (!content.includes("import { WorldGeneratorCore }")) {
  content = content.replace("import { ChunkScheduler } from './ChunkScheduler';", "import { ChunkScheduler } from './ChunkScheduler';\nimport { WorldGeneratorCore } from './WorldGeneratorCore';");
}

// Add generator to class
if (!content.includes("private generatorCore")) {
  content = content.replace("public biomeManager: BiomeManager;", "public biomeManager: BiomeManager;\n  private generatorCore: WorldGeneratorCore;");
}

// Initialize generator in constructor
content = content.replace("this.biomeManager = new BiomeManager(seed);", "this.biomeManager = new BiomeManager(seed);\n    this.generatorCore = new WorldGeneratorCore(seed);");

// Replace generateChunk method
const generateChunkRegex = /public generateChunk\(cx: number, cz: number\): Chunk \{[\s\S]*?return chunk;\n  \}/;

const newGenerateChunk = `public generateChunk(cx: number, cz: number): Chunk {
    const chunk = new Chunk(cx, cz);
    const cKey = this.getChunkKey(cx, cz);

    const modifiedBlocks: Record<string, number> = {};
    if (this.modifiedBlocks.has(cKey)) {
      const deltas = this.modifiedBlocks.get(cKey)!;
      deltas.forEach((blockType, localKey) => {
        modifiedBlocks[localKey] = blockType;
      });
    }

    const blocksData = this.generatorCore.generateChunkData(cx, cz, modifiedBlocks);
    chunk.blocks = new Uint8Array(blocksData);

    return chunk;
  }`;

content = content.replace(generateChunkRegex, newGenerateChunk);
fs.writeFileSync('src/engine/world/VoxelWorld.ts', content);
