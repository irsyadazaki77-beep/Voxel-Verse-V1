const fs = require('fs');
let code = fs.readFileSync('src/engine/world/WorldGeneratorCore.ts', 'utf8');

// Find the start of generateChunkData
const startIdx = code.indexOf('public generateChunkData(');

// Find the end of the file, we will rewrite the end of the class.
const beforeGenerate = code.substring(0, startIdx);

const newLogic = `
  public generateChunkData(cx: number, cz: number, modifiedBlocks?: Record<string, number>): Uint8Array {
    const blocks = new Uint8Array(16 * 128 * 16);
    const getIndex = (x: number, y: number, z: number) => x + z * 16 + y * (16 * 16);
    const heightMap = new Int16Array(16 * 16);

    if (this.params.dimensionId === DIMENSION_AETHER) {
      this.generateAetherChunk(cx, cz, blocks, heightMap, getIndex);
    } else {
      this.generateOverworldChunk(cx, cz, blocks, heightMap, getIndex);
    }

    if (modifiedBlocks) {
      Object.entries(modifiedBlocks).forEach(([localKey, blockType]) => {
        const [lx, ly, lz] = localKey.split(',').map(Number);
        if (ly >= 0 && ly < 128) {
          blocks[getIndex(lx, ly, lz)] = blockType;
        }
      });
    }

    return blocks;
  }

  private generateOverworldChunk(cx: number, cz: number, blocks: Uint8Array, heightMap: Int16Array, getIndex: (x: number, y: number, z: number) => number): void {
    const p = this.params;
    
    // 1. TERRAIN & BIOME COLUMN GENERATION
    for (let lx = 0; lx < 16; lx++) {
      const wx = cx * 16 + lx;
      for (let lz = 0; lz < 16; lz++) {
        const wz = cz * 16 + lz;

        const cont = this.contNoise.fbm2D(wx * p.continentalnessScale, wz * p.continentalnessScale, 4, 0.45);
        const temp = this.tempNoise.fbm2D(wx * 0.0012, wz * 0.0012, 3, 0.5);
        const humid = (this.humidNoise.fbm2D(wx * 0.0012 + 1000, wz * 0.0012 + 1000, 3, 0.5) + 1) * 0.5;

        const height = this.getTerrainHeight(wx, wz);
        heightMap[lx + lz * 16] = height;

        const rVal = Math.abs(this.riverNoise.fbm2D(wx * p.riverFrequency, wz * p.riverFrequency, 3, 0.5));
        const isRiver = cont > -0.2 && rVal < 0.035;

        let surfaceBlock = 2; // GRASS
        let subBlock = 1;     // DIRT
        let deepBlock = 3;    // STONE

        if (cont < -0.35) {
          surfaceBlock = 6;
          subBlock = 3;
        } else if (height <= p.seaLevel + 2 && cont < -0.22) {
          surfaceBlock = 5;
          subBlock = 5;
        } else if (temp > 0.5 && humid < 0.2) {
          surfaceBlock = 5;
          subBlock = 5;
        } else if (temp > 0.5 && humid < 0.35) {
          surfaceBlock = 7;
          subBlock = 50; // COPPER?
        } else if (temp < -0.35 || height > 76) {
          surfaceBlock = 38; // SNOW
          subBlock = 38;
        } else if (temp > 0.65 && humid < 0.1) {
          surfaceBlock = 41; // BASALT
          subBlock = 42;
        } else if (isRiver) {
          surfaceBlock = 5;
          subBlock = 6;
        }

        for (let y = 0; y <= height; y++) {
          let block = deepBlock;
          if (y === height) {
            block = surfaceBlock;
          } else if (y >= height - 3) {
            block = subBlock;
          } else {
            const oreVal = this.oreNoise.noise3D(wx * 0.12, y * 0.15, wz * 0.12) * p.oreAbundance;
            if (oreVal > 0.62) {
              if (y < 12) block = 25;
              else if (y < 22) block = 24;
              else if (y < 35) block = 23;
              else block = 22;
            } else if (oreVal < -0.65 && y < 55) {
              block = 27;
            } else if (y < 10 && oreVal > 0.55) {
              block = 26;
            }
          }

          if (y > 3 && y < height - 2) {
            const caveVal = this.caveNoise.fbm3D(wx * 0.035, y * 0.045, wz * 0.035, 3);
            const ravVal = Math.abs(this.ravineNoise.noise2D(wx * 0.01, wz * 0.01));
            const isRavine = ravVal < 0.018 && y < height - 6 && y > 15;
            
            const caveThreshold = 0.62 - (p.caveDensity * 1.1);
            if (caveVal > caveThreshold || isRavine) {
              block = (y < 6) ? 29 : 0;
            }
          }

          blocks[getIndex(lx, y, lz)] = block;
        }

        for (let y = height + 1; y <= p.seaLevel; y++) {
          blocks[getIndex(lx, y, lz)] = 28;
        }
      }
    }

    // 2. SLOPE-CONSTRAINED SURFACE FOLIAGE
    for (let lx = 1; lx < 15; lx++) {
      const wx = cx * 16 + lx;
      for (let lz = 1; lz < 15; lz++) {
        const wz = cz * 16 + lz;
        const height = heightMap[lx + lz * 16];
        
        if (height < p.seaLevel) continue;

        const topBlock = blocks[getIndex(lx, height, lz)];
        if (topBlock !== 2 && topBlock !== 44) continue; // GRASS or CRAFTING_BENCH wait no 44 is not grass

        const hL = heightMap[(lx - 1) + lz * 16];
        const hR = heightMap[(lx + 1) + lz * 16];
        const hB = heightMap[lx + (lz - 1) * 16];
        const hF = heightMap[lx + (lz + 1) * 16];

        const maxDelta = Math.max(Math.abs(height - hL), Math.abs(height - hR), Math.abs(height - hB), Math.abs(height - hF));

        if (maxDelta <= 1) {
          const floraVal = this.detailNoise.noise2D(wx * 0.18, wz * 0.18);
          if (floraVal > 0.58) {
            let floraBlock = 33; // TALL_GRASS
            if (floraVal > 0.82) floraBlock = 34;
            else if (floraVal > 0.74) floraBlock = 35;
            
            blocks[getIndex(lx, height + 1, lz)] = floraBlock;
          }
        }
      }
    }

    // 3. MULTI-BIOME PROCEDURAL STRUCTURES & TREES
    const structureGen = new StructureGenerator(this.seed);
    for (let lx = 3; lx < 13; lx++) {
      const wx = cx * 16 + lx;
      for (let lz = 3; lz < 13; lz++) {
        const wz = cz * 16 + lz;
        const height = heightMap[lx + lz * 16];
        
        if (height < p.seaLevel + 1) continue;
        
        const topBlock = blocks[getIndex(lx, height, lz)];
        
        if (topBlock === 2) {
          const treeVal = this.detailNoise.noise2D(wx * 0.35 + 100, wz * 0.35 + 100);
          if (treeVal > 0.86) {
            const treeBlocks = structureGen.generateOakTree(wx, height + 1, wz);
            this.applyStructureToChunkLocal(treeBlocks, lx, height + 1, lz, blocks, getIndex);
          }
        } else if (topBlock === 38) {
          const treeVal = this.detailNoise.noise2D(wx * 0.3 + 200, wz * 0.3 + 200);
          if (treeVal > 0.83) {
            const treeBlocks = structureGen.generatePineTree(wx, height + 1, wz);
            this.applyStructureToChunkLocal(treeBlocks, lx, height + 1, lz, blocks, getIndex);
          }
        }
      }
    }
  }

  private generateAetherChunk(cx: number, cz: number, blocks: Uint8Array, heightMap: Int16Array, getIndex: (x: number, y: number, z: number) => number): void {
    // 3D Noise for floating islands!
    const BASE_Y = 64; // Mid height
    
    for (let lx = 0; lx < 16; lx++) {
      const wx = cx * 16 + lx;
      for (let lz = 0; lz < 16; lz++) {
        const wz = cz * 16 + lz;
        
        let highestY = 0;
        
        for (let y = 10; y < 118; y++) {
          // 3D noise for density
          const densityNoise = this.caveNoise.fbm3D(wx * 0.02, y * 0.025, wz * 0.02, 3);
          // Vertical falloff to create islands (density decreases further away from BASE_Y)
          const distToCenter = Math.abs(y - BASE_Y);
          const falloff = distToCenter * 0.02; // the larger, the flatter the island
          
          const density = densityNoise - falloff + 0.3; // +0.3 bias for more land
          
          if (density > 0) {
            // Solid block!
            highestY = Math.max(highestY, y);
            blocks[getIndex(lx, y, lz)] = BlockType.AETHER_STONE;
          }
        }
        
        heightMap[lx + lz * 16] = highestY;
        
        // Pass 2: Surface layers for the highest point of the island
        if (highestY > 0) {
          // Find the exact top block
          blocks[getIndex(lx, highestY, lz)] = BlockType.AETHER_GRASS;
          if (highestY > 1 && blocks[getIndex(lx, highestY - 1, lz)] === BlockType.AETHER_STONE) {
            blocks[getIndex(lx, highestY - 1, lz)] = BlockType.AETHER_DIRT;
          }
          if (highestY > 2 && blocks[getIndex(lx, highestY - 2, lz)] === BlockType.AETHER_STONE) {
            blocks[getIndex(lx, highestY - 2, lz)] = BlockType.AETHER_DIRT;
          }
        }
      }
    }
    
    // Add Aether foliage and trees
    const structureGen = new StructureGenerator(this.seed);
    for (let lx = 3; lx < 13; lx++) {
      const wx = cx * 16 + lx;
      for (let lz = 3; lz < 13; lz++) {
        const wz = cz * 16 + lz;
        const height = heightMap[lx + lz * 16];
        
        if (height > 0) {
          const topBlock = blocks[getIndex(lx, height, lz)];
          if (topBlock === BlockType.AETHER_GRASS) {
            const treeVal = this.detailNoise.noise2D(wx * 0.3, wz * 0.3);
            if (treeVal > 0.88) {
              const treeBlocks = this.generateSkyrootTree(wx, height + 1, wz);
              this.applyStructureToChunkLocal(treeBlocks, lx, height + 1, lz, blocks, getIndex);
            }
          }
        }
      }
    }
  }

  private generateSkyrootTree(wx: number, wy: number, wz: number): Record<string, number> {
    const blocks: Record<string, number> = {};
    const height = Math.floor(6 + Math.random() * 4);
    
    // Trunk
    for (let i = 0; i < height; i++) {
      blocks[\`\${wx},\${wy + i},\${wz}\`] = BlockType.SKYROOT_LOG;
    }
    
    // Leaves (canopy)
    for (let y = wy + height - 3; y <= wy + height + 1; y++) {
      const radius = y > wy + height - 1 ? 1 : 2;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (dx === 0 && dz === 0 && y < wy + height) continue; // Skip inner trunk unless top
          if (Math.abs(dx) === radius && Math.abs(dz) === radius && Math.random() > 0.5) continue; // Round corners
          
          blocks[\`\${wx + dx},\${y},\${wz + dz}\`] = BlockType.SKYROOT_LEAVES;
        }
      }
    }
    
    return blocks;
  }

  private applyStructureToChunkLocal(
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
      
      const targetLx = lx + dx;
      const targetLz = lz + dz;
      
      // Ensure we only place within the CURRENT chunk to avoid buffer overflows
      if (targetLx >= 0 && targetLx < 16 && targetLz >= 0 && targetLz < 16 && y >= 0 && y < 128) {
        blocks[getIndex(targetLx, y, targetLz)] = blockType;
      }
    });
  }
}
`;

fs.writeFileSync('src/engine/world/WorldGeneratorCore.ts', beforeGenerate + newLogic);
