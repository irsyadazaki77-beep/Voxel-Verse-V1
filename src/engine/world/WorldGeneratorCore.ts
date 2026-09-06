import { CulturalRegionManager } from './CulturalRegionManager';
import { BlockType, DIMENSION_AETHER } from '../../types';
import { SimplexNoise } from '../math/Noise';
import { SEA_LEVEL, WORLD_PRESETS, WorldPreset, WorldGenParameters, CHUNK_SIZE_Y } from './WorldConfig';
import { StructureGenerator } from './StructureGenerator';

const CHUNK_SIZE_X = 16;
const CHUNK_SIZE_Z = 16;

export class WorldGeneratorCore {
  public seed: number;
  public preset: WorldPreset;
  public params: WorldGenParameters;
  public regionManager: CulturalRegionManager;

  private contNoise: SimplexNoise;
  private erosionNoise: SimplexNoise;
  private peaksNoise: SimplexNoise;
  private detailNoise: SimplexNoise;
  private riverNoise: SimplexNoise;
  private tempNoise: SimplexNoise;
  private humidNoise: SimplexNoise;
  private caveNoise: SimplexNoise;
  private ravineNoise: SimplexNoise;
  private oreNoise: SimplexNoise;

  constructor(seed: number = 42819, preset: WorldPreset = 'standard', config?: Partial<WorldGenParameters>) {
    this.seed = seed;
    this.preset = preset;
    const basePreset = WORLD_PRESETS[preset] || WORLD_PRESETS.standard;
    this.params = { ...basePreset, ...(config || {}) };
    this.regionManager = new CulturalRegionManager(seed);

    this.contNoise = new SimplexNoise(seed);
    this.erosionNoise = new SimplexNoise(seed + 111);
    this.peaksNoise = new SimplexNoise(seed + 222);
    this.detailNoise = new SimplexNoise(seed + 333);
    this.riverNoise = new SimplexNoise(seed + 444);
    this.tempNoise = new SimplexNoise(seed + 555);
    this.humidNoise = new SimplexNoise(seed + 666);
    this.caveNoise = new SimplexNoise(seed + 777);
    this.ravineNoise = new SimplexNoise(seed + 888);
    this.oreNoise = new SimplexNoise(seed + 999);
  }

  public getTerrainHeight(wx: number, wz: number): number {
    const p = this.params;
    const cont = this.contNoise.fbm2D(wx * p.continentalnessScale, wz * p.continentalnessScale, 4, 0.45);
    const erosion = this.erosionNoise.fbm2D(wx * p.erosionScale, wz * p.erosionScale, 3, 0.5);
    const peaks = Math.abs(this.peaksNoise.fbm2D(wx * p.peaksScale, wz * p.peaksScale, 3, 0.5));
    const detail = this.detailNoise.fbm2D(wx * 0.012, wz * 0.012, 2, 0.5);

    const tp = this.regionManager.getBlendedTerrainProfile(wx, wz);

    let baseHeight = 30 + tp.heightOffset + cont * 26 + (1.0 - Math.abs(erosion)) * 12 + (detail * 5 * tp.roughness);

    // Sheer karst & limestone cliff walls (Toraja / Eastern Isles / Papua)
    if (tp.cliffStrength && tp.cliffStrength > 0.05 && peaks > 0.40) {
      const cliffFactor = Math.pow((peaks - 0.40) * 2.0, 0.75) * tp.cliffStrength * 16;
      baseHeight += cliffFactor;
    }

    // Mountain scaling
    if (peaks > 0.46) {
      baseHeight += Math.pow((peaks - 0.46) * 2.1, 1.8) * p.mountainHeightScale * tp.mountainScale;
    }

    // Valley & River calculation with region river width and valley depth
    const riverWidth = 0.035 * (tp.riverWidthMult || 1.0);
    const rVal = Math.abs(this.riverNoise.fbm2D(wx * p.riverFrequency, wz * p.riverFrequency, 3, 0.5));
    const isRiver = cont > -0.2 && rVal < riverWidth;
    if (isRiver) {
      const extraDepth = tp.valleyDepth || 0;
      const riverDepth = Math.floor((riverWidth - rVal) * (180 + extraDepth * 3.5));
      baseHeight = Math.max(p.seaLevel - 3, baseHeight - riverDepth);
    }

    // Sawah Bertingkat / Subak stepped agricultural terracing
    if (tp.terraceStrength && tp.terraceStrength > 0.05 && baseHeight > p.seaLevel + 1 && baseHeight < 88) {
      const step = tp.terraceStep || 3;
      const terracedH = Math.round(baseHeight / step) * step;
      baseHeight = (1.0 - tp.terraceStrength) * baseHeight + tp.terraceStrength * terracedH;
    }

    let height = Math.floor(baseHeight);
    return Math.max(3, Math.min(CHUNK_SIZE_Y - 4, height));
  }

  
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
        const riverWidth = 0.035 * (this.regionManager.getBlendedTerrainProfile(wx, wz).riverWidthMult || 1.0);
        const isRiver = cont > -0.2 && rVal < riverWidth;

        const regionBlend = this.regionManager.getRegionBlend(wx, wz);
        const dominant = regionBlend[0].region;
        const tp = this.regionManager.getBlendedTerrainProfile(wx, wz);
        const resMod = this.regionManager.getBlendedResourceModifiers(wx, wz);

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
          subBlock = 50;
        } else if (temp < -0.35 || height > 76) {
          surfaceBlock = 38; // SNOW
          subBlock = 38;
        } else if (temp > 0.65 && humid < 0.1) {
          surfaceBlock = 41; // BASALT
          subBlock = 42;
        } else if (isRiver) {
          surfaceBlock = (dominant.id === 'borneo') ? 7 : 5; // Clay or Sand riverbed
          subBlock = 6;
        } else if (dominant.id === 'toraja' && height > 65) {
          surfaceBlock = (wx + wz) % 3 === 0 ? 54 : 2; // MOSS_STONE / GRASS
        } else if (dominant.id === 'nusa' && height < p.seaLevel + 5) {
          surfaceBlock = 5; // Golden Sand / Coastal
        }

        // Stepped agricultural rice terraces (Sawah Bertingkat / Subak)
        let isTerracePaddy = false;
        if (tp.terraceStrength && tp.terraceStrength > 0.35 && height > p.seaLevel + 1 && height < 75) {
          const step = tp.terraceStep || 3;
          if (height % step === 0) {
            // Flat terrace tier!
            if ((wx + wz) % 8 === 0 && tp.terraceStrength > 0.5) {
              // Irrigation water channel (Subak / Parit Sawah)
              surfaceBlock = 28; // WATER
              subBlock = 1;      // DIRT
            } else {
              surfaceBlock = 59; // FARMLAND
              subBlock = 1;      // DIRT
              isTerracePaddy = true;
            }
          }
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
              // Ore distribution modulated by cultural region modifiers
              const goldChance = (resMod.oreMultipliers.gold || 1.0);
              const mythrilChance = (resMod.oreMultipliers.mythril || 1.0);
              if (y < 12) block = mythrilChance > 1.2 ? 25 : 25; // MYTHRIL_ORE
              else if (y < 22) block = (goldChance > 1.2 || (wx + wz) % 2 === 0) ? 24 : 23; // GOLD_ORE
              else if (y < 35) block = 23; // IRON_ORE
              else block = 22; // COPPER_ORE
            } else if (oreVal < -0.65 && y < 55) {
              block = 27; // COAL_ORE
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

        // Place paddy crops on terraced farmland
        if (isTerracePaddy && height + 1 < 128) {
          blocks[getIndex(lx, height + 1, lz)] = 63; // CROP_WHEAT_3 (Ripe golden rice stalks)
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
        if (topBlock !== 2 && topBlock !== 54) continue; // GRASS or MOSS_STONE

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
    const dominantRegion = this.regionManager.getDominantRegion(cx * 16 + 8, cz * 16 + 8);
    let regionStructureGenerated = false;

    // Check chunk-level cultural structure generation (3% chance per chunk)
    const chunkHash = Math.abs(Math.imul(cx, 73856093) ^ Math.imul(cz, 19349663));
    const shouldSpawnCultural = (chunkHash % 33) === 0;

    for (let lx = 3; lx < 13; lx++) {
      const wx = cx * 16 + lx;
      for (let lz = 3; lz < 13; lz++) {
        const wz = cz * 16 + lz;
        const height = heightMap[lx + lz * 16];
        
        if (height < p.seaLevel + 1) continue;

        // Generate Cultural Region Structure
        if (!regionStructureGenerated && shouldSpawnCultural && lx === 8 && lz === 8 && dominantRegion.structurePool.length > 0) {
           const pool = dominantRegion.structurePool;
           const sType = pool[chunkHash % pool.length];
           const structBlocks = StructureGenerator.generateNusantaraStructure(sType);
           if (structBlocks.length > 0) {
              this.applyStructureToChunkLocal(structBlocks, lx, height + 1, lz, blocks, getIndex);
              regionStructureGenerated = true;
              continue;
           }
        }
        
        const topBlock = blocks[getIndex(lx, height, lz)];
        
        if (topBlock === 2) {
          const treeVal = this.detailNoise.noise2D(wx * 0.35 + 100, wz * 0.35 + 100);
          const treeChance = dominantRegion.vegetationProfile.treeChance * 10; // Scaled to noise threshold
          if (treeVal > (1.0 - Math.min(0.25, treeChance))) {
            const primaryTrees = dominantRegion.vegetationProfile.primaryTrees;
            const treeKind = primaryTrees[(wx + wz) % primaryTrees.length];
            const treeBlocks = (treeKind === 'pine') 
              ? StructureGenerator.generatePineTree(wx + wz)
              : StructureGenerator.generateOakTree(wx + wz);
            this.applyStructureToChunkLocal(treeBlocks, lx, height + 1, lz, blocks, getIndex);
          }
        } else if (topBlock === 38) {
          const treeVal = this.detailNoise.noise2D(wx * 0.3 + 200, wz * 0.3 + 200);
          if (treeVal > 0.83) {
            const treeBlocks = StructureGenerator.generatePineTree(wx + wz);
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
    
    
    // 5% chance per chunk to spawn an Aether Temple entrance on an island
    if (this.detailNoise.noise2D(cx * 0.1, cz * 0.1) > 0.95) {
       let highestIslandY = 0;
       let bestX = 8, bestZ = 8;
       for (let lx = 3; lx < 13; lx++) {
         for (let lz = 3; lz < 13; lz++) {
           if (heightMap[lx + lz * 16] > highestIslandY) {
             highestIslandY = heightMap[lx + lz * 16];
             bestX = lx;
             bestZ = lz;
           }
         }
       }
       if (highestIslandY > 0) {
          // Just place a portal frame/temple indicator for now or basic blocks
          const wx = cx * 16 + bestX;
          const wz = cz * 16 + bestZ;
          
          const blocksToApply = {};
          blocksToApply[`${wx},${highestIslandY + 1},${wz}`] = BlockType.AETHER_GATE_FRAME;
          blocksToApply[`${wx},${highestIslandY + 2},${wz}`] = BlockType.AETHER_PORTAL;
          
          this.applyStructureToChunkLocal(blocksToApply, bestX, highestIslandY + 1, bestZ, blocks, getIndex);
       }
    }
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
      blocks[`${wx},${wy + i},${wz}`] = BlockType.SKYROOT_LOG;
    }
    
    // Leaves (canopy)
    for (let y = wy + height - 3; y <= wy + height + 1; y++) {
      const radius = y > wy + height - 1 ? 1 : 2;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (dx === 0 && dz === 0 && y < wy + height) continue; // Skip inner trunk unless top
          if (Math.abs(dx) === radius && Math.abs(dz) === radius && Math.random() > 0.5) continue; // Round corners
          
          blocks[`${wx + dx},${y},${wz + dz}`] = BlockType.SKYROOT_LEAVES;
        }
      }
    }
    
    return blocks;
  }

  private applyStructureToChunkLocal(
    structure: Record<string, number> | { dx: number, dy: number, dz: number, block: number }[],
    lx: number,
    wy: number,
    lz: number,
    blocks: Uint8Array,
    getIndex: (x: number, y: number, z: number) => number
  ): void {
    if (Array.isArray(structure)) {
      for (const item of structure) {
        const targetLx = lx + item.dx;
        const targetLy = wy + item.dy;
        const targetLz = lz + item.dz;
        if (targetLx >= 0 && targetLx < 16 && targetLz >= 0 && targetLz < 16 && targetLy >= 0 && targetLy < 128) {
          blocks[getIndex(targetLx, targetLy, targetLz)] = item.block;
        }
      }
      return;
    }

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
