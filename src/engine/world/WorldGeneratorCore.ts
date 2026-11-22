import { CulturalRegionManager } from './CulturalRegionManager';
import { BlockType, DIMENSION_AETHER } from '../../types';
import { SimplexNoise } from '../math/Noise';
import { SEA_LEVEL, WORLD_PRESETS, WorldPreset, WorldGenParameters, CHUNK_SIZE_Y } from './WorldConfig';
import { StructureGenerator } from './StructureGenerator';
import { StructureManager } from './StructureManager';

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
    this.params = { dimensionId: 'overworld', ...basePreset, ...(config || {}) };
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

  /**
   * v7.5.0: Deterministic Stratovolcano & Lava Caldera Macro-Landform Evaluator
   * Places majestic Nusantara volcanoes (Merapi / Bromo style) in 1 of 2 regional 512x512 cells.
   */
  public getVolcanoInfo(wx: number, wz: number): {
    inVolcano: boolean;
    inCaldera: boolean;
    heightDelta: number;
    calderaLavaY: number;
    distRatio: number;
  } {
    const CELL = 512;
    const vxCell = Math.floor(wx / CELL);
    const vzCell = Math.floor(wz / CELL);
    // Keep immediate spawn cell (0,0) clear of giant volcanoes so new players spawn in pleasant valleys
    if (vxCell === 0 && vzCell === 0) {
      return { inVolcano: false, inCaldera: false, heightDelta: 0, calderaLavaY: 0, distRatio: 1 };
    }
    const vHash = Math.abs(Math.imul(vxCell, 73856093) ^ Math.imul(vzCell, 19349663) ^ Math.imul(this.seed, 2654435761));
    if (vHash % 2 !== 0) {
      return { inVolcano: false, inCaldera: false, heightDelta: 0, calderaLavaY: 0, distRatio: 1 };
    }

    const centerX = vxCell * CELL + 128 + (vHash % 256);
    const centerZ = vzCell * CELL + 128 + ((vHash >> 8) % 256);
    const radius = 64 + (vHash % 20); // 64..83m volcanic cone radius
    const dist = Math.hypot(wx - centerX, wz - centerZ);
    if (dist >= radius) {
      return { inVolcano: false, inCaldera: false, heightDelta: 0, calderaLavaY: 0, distRatio: 1 };
    }

    const distRatio = dist / radius;
    const peakBoost = 54 + ((vHash >> 4) % 14); // +54..+67m soaring volcanic cone
    const calderaRadius = 11.5;

    if (dist < calderaRadius) {
      // Sunken glowing caldera bowl at summit
      const bowlRatio = 1.0 - dist / calderaRadius;
      const bowlDepth = bowlRatio * 14.0;
      const coneAtRim = Math.pow(1.0 - calderaRadius / radius, 1.35) * peakBoost;
      return {
        inVolcano: true,
        inCaldera: true,
        heightDelta: Math.max(12, coneAtRim - bowlDepth),
        calderaLavaY: Math.max(1, Math.floor(bowlRatio * 6)), // Relative molten lava depth inside the sunken crater bowl
        distRatio,
      };
    }

    const coneProfile = Math.pow(1.0 - distRatio, 1.35) * peakBoost;
    return {
      inVolcano: true,
      inCaldera: false,
      heightDelta: coneProfile,
      calderaLavaY: 84,
      distRatio,
    };
  }

  public getTerrainHeight(wx: number, wz: number): number {
    const p = this.params;
    const cont = this.contNoise.fbm2D(wx * p.continentalnessScale, wz * p.continentalnessScale, 4, 0.45);
    const erosion = this.erosionNoise.fbm2D(wx * p.erosionScale, wz * p.erosionScale, 3, 0.5);
    const peaks = Math.abs(this.peaksNoise.fbm2D(wx * p.peaksScale, wz * p.peaksScale, 3, 0.5));
    const detail = this.detailNoise.fbm2D(wx * 0.012, wz * 0.012, 2, 0.5);

    const tp = this.regionManager.getBlendedTerrainProfile(wx, wz);

    let baseHeight = 30 + tp.heightOffset + cont * 26 + (1.0 - Math.abs(erosion)) * 12 + (detail * 5 * tp.roughness);

    // v7.5.0 Landform 1: Raja Ampat Karst Sea Stacks & Archipelago Pillars rising out of coastal seas
    if (cont < -0.10 && cont > -0.48) {
      const stackNoise = this.peaksNoise.noise2D(wx * 0.032 + 410, wz * 0.032 - 310);
      if (stackNoise > 0.52) {
        const pillarFactor = Math.min(1.0, (stackNoise - 0.52) / 0.22);
        const targetPillarH = p.seaLevel + 10 + Math.pow(pillarFactor, 0.65) * 18;
        baseHeight = Math.max(baseHeight, targetPillarH);
      }
    }

    // v7.5.0 Landform 2: Stepped Highland Mesa / Lembah Harau Plateaus
    if (cont > 0.24 && erosion < -0.26) {
      const plateauStrength = Math.min(1.0, (-erosion - 0.26) / 0.25);
      const mesaHeight = 64 + Math.round((detail + 1.0) * 2.0) * 4;
      baseHeight = baseHeight * (1.0 - plateauStrength * 0.75) + mesaHeight * (plateauStrength * 0.75);
    }

    // Sheer karst & limestone cliff walls (toned for natural sculpted silhouettes, not razor needles)
    if (tp.cliffStrength && tp.cliffStrength > 0.05 && peaks > 0.48) {
      const cliffFactor = Math.min(14, Math.pow((peaks - 0.48) * 1.8, 0.85) * tp.cliffStrength * 10);
      baseHeight += cliffFactor;
    }

    // Broad, majestic mountain ranges (capped smoothly to eliminate spiky vertical needles)
    if (peaks > 0.50) {
      const rawMount = Math.pow((peaks - 0.50) * 1.75, 1.55) * (p.mountainHeightScale * 0.62) * Math.min(1.25, tp.mountainScale);
      baseHeight += Math.min(34, rawMount);
    }

    // v7.5.0 Landform 3: Towering Nusantara Stratovolcano & Lava Caldera
    const volcano = this.getVolcanoInfo(wx, wz);
    if (volcano.inVolcano) {
      baseHeight = Math.max(p.seaLevel + 8, baseHeight * 0.55 + 22) + volcano.heightDelta;
    }

    // Valley & River calculation with region river width and valley depth
    const riverWidth = 0.035 * (tp.riverWidthMult || 1.0);
    const rVal = Math.abs(this.riverNoise.fbm2D(wx * p.riverFrequency, wz * p.riverFrequency, 3, 0.5));
    const isRiver = !volcano.inVolcano && cont > -0.2 && rVal < riverWidth;
    if (isRiver) {
      const extraDepth = tp.valleyDepth || 0;
      const riverDepth = Math.floor((riverWidth - rVal) * (180 + extraDepth * 3.5));
      baseHeight = Math.max(p.seaLevel - 3, baseHeight - riverDepth);
    }

    // Sawah Bertingkat / Subak stepped agricultural terracing
    if (!volcano.inVolcano && tp.terraceStrength && tp.terraceStrength > 0.05 && baseHeight > p.seaLevel + 1 && baseHeight < 88) {
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

        const volcano = this.getVolcanoInfo(wx, wz);

        if (volcano.inVolcano && volcano.distRatio < 0.72) {
          // Volcanic basalt flanks & glowing magma rock rim
          surfaceBlock = volcano.inCaldera ? BlockType.MAGMA_ROCK : BlockType.BASALT;
          subBlock = BlockType.BASALT;
          deepBlock = BlockType.BASALT;
        } else if (cont < -0.35 && height < p.seaLevel) {
          surfaceBlock = 6;
          subBlock = 3;
        } else if (height <= p.seaLevel + 3 && height >= p.seaLevel - 1 && cont < -0.08) {
          surfaceBlock = 5; // Coastal golden beach sand
          subBlock = 5;
        } else if (temp > 0.5 && humid < 0.2) {
          surfaceBlock = 5;
          subBlock = 5;
        } else if (temp > 0.5 && humid < 0.35) {
          surfaceBlock = 7;
          subBlock = 50;
        } else if (temp < -0.35 || (height > 82 && !volcano.inVolcano)) {
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

        // v7.5.0: Fill Stratovolcano Summit Caldera with glowing Molten Lava Pool
        if (volcano.inCaldera && volcano.calderaLavaY > 0) {
          const lavaTop = Math.min(CHUNK_SIZE_Y - 5, height + volcano.calderaLavaY);
          for (let y = height + 1; y <= lavaTop; y++) {
            blocks[getIndex(lx, y, lz)] = BlockType.LAVA;
          }
        }

        // v7.5.0: 3 Rich Underground Cave Biomes (Bioluminescent Karst, Aether Crystal Geode, Volcanic Magma Chamber)
        const caveBiomeVal = this.detailNoise.noise2D(wx * 0.018 + 777, wz * 0.018 - 555);
        const colHash = Math.abs(Math.imul(wx, 73856093) ^ Math.imul(wz, 19349663) ^ this.seed);
        for (let y = 5; y < Math.min(height - 3, 52); y++) {
          const cur = blocks[getIndex(lx, y, lz)];
          const below = blocks[getIndex(lx, y - 1, lz)];
          const above = blocks[getIndex(lx, y + 1, lz)];

          // Cave Floor Decorations (AIR with solid block below)
          if (cur === BlockType.AIR && below !== BlockType.AIR && below !== BlockType.WATER && below !== BlockType.LAVA) {
            if (y < 16) {
              // Volcanic Magma Chamber floor
              blocks[getIndex(lx, y - 1, lz)] = (colHash % 3 === 0) ? BlockType.MAGMA_ROCK : BlockType.BASALT;
            } else if (caveBiomeVal > 0.35) {
              // Aether Crystal Geode floor
              blocks[getIndex(lx, y - 1, lz)] = BlockType.CRYSTAL_BRICK;
              if ((colHash + y) % 7 === 0) {
                blocks[getIndex(lx, y, lz)] = ((colHash + y) % 14 === 0) ? BlockType.PRISMATIC_CRYSTAL : BlockType.AETHER_CRYSTAL_ORE;
              }
            } else if (humid > 0.48 || caveBiomeVal < -0.15) {
              // Bioluminescent Karst Cavern floor
              blocks[getIndex(lx, y - 1, lz)] = BlockType.MOSS_STONE;
              if ((colHash + y) % 5 === 0) {
                blocks[getIndex(lx, y, lz)] = BlockType.LUMINESCENT_MUSHROOM;
              }
            }
          }
          // Cave Ceiling Stalactites (AIR with solid stone above)
          if (cur === BlockType.AIR && above === BlockType.STONE && y > 12 && (colHash + y) % 19 === 0) {
            blocks[getIndex(lx, y, lz)] = BlockType.STONE;
            if (y - 1 > 6 && blocks[getIndex(lx, y - 1, lz)] === BlockType.AIR && colHash % 2 === 0) {
              blocks[getIndex(lx, y - 1, lz)] = BlockType.STONE;
            }
          }
        }

        // v7.5.0: Rare Floating Aether Sky-Sanctuaries high in Overworld sky (y = 88..102)
        const SKY_CELL = 384;
        const scx = Math.floor(wx / SKY_CELL);
        const scz = Math.floor(wz / SKY_CELL);
        if (scx !== 0 || scz !== 0) {
          const sHash = Math.abs(Math.imul(scx, 83492791) ^ Math.imul(scz, 19349663) ^ this.seed);
          if (sHash % 4 === 0) {
            const islandX = scx * SKY_CELL + 96 + (sHash % 192);
            const islandZ = scz * SKY_CELL + 96 + ((sHash >> 6) % 192);
            const iRadius = 11 + (sHash % 5);
            const iDist = Math.hypot(wx - islandX, wz - islandZ);
            if (iDist <= iRadius) {
              const topY = 96;
              const thickness = Math.max(2, Math.floor((1.0 - iDist / iRadius) * 10));
              for (let y = topY - thickness; y <= topY; y++) {
                if (y > height + 10 && y < CHUNK_SIZE_Y - 2) {
                  let skyBlock = BlockType.AETHER_STONE;
                  if (y === topY) skyBlock = BlockType.AETHER_GRASS;
                  else if (y === topY - 1) skyBlock = BlockType.AETHER_DIRT;
                  else if (iDist < 3 && y === topY - thickness) skyBlock = BlockType.AETHER_CRYSTAL_ORE;
                  blocks[getIndex(lx, y, lz)] = skyBlock;
                }
              }
              // Sky waterfall pouring from one edge of the floating island
              if (Math.round(wx) === islandX + iRadius - 1 && Math.round(wz) === islandZ) {
                for (let wy = Math.max(height + 1, p.seaLevel + 1); wy <= topY; wy++) {
                  blocks[getIndex(lx, wy, lz)] = BlockType.WATER;
                }
              }
            }
          }
        }

        for (let y = height + 1; y <= p.seaLevel; y++) {
          blocks[getIndex(lx, y, lz)] = 28;
        }

        // Underwater Nusantara Reefs: Bioluminescent Coral, Coral Blocks & Giant Pearl Clams
        if (height <= p.seaLevel - 3 && height >= 8) {
          const reefNoise = this.detailNoise.noise2D(wx * 0.14 + 310, wz * 0.14 - 210);
          if (reefNoise > 0.56) {
            const hash = Math.abs(Math.imul(wx, 73856093) ^ Math.imul(wz, 19349663) ^ this.seed);
            if (hash % 18 === 0) {
              // Giant Pearl Clam on the seabed
              blocks[getIndex(lx, height + 1, lz)] = BlockType.PEARL_CLAM_BLOCK;
            } else if (hash % 4 === 0) {
              // Glowing Bioluminescent Coral
              blocks[getIndex(lx, height, lz)] = BlockType.BIOLUMINESCENT_CORAL;
              if (hash % 8 === 0 && height + 2 < p.seaLevel) {
                blocks[getIndex(lx, height + 1, lz)] = BlockType.BIOLUMINESCENT_CORAL;
              }
            } else if (hash % 5 === 1) {
              blocks[getIndex(lx, height, lz)] = BlockType.CORAL_BLOCK;
            }
          }
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

    // 3. MULTI-BIOME PROCEDURAL STRUCTURES & TREES (MULTI-CHUNK BLUEPRINTS)
    const overlappingStructures = StructureManager.getOverlappingStructuresForChunk(
      cx, cz, this.seed, 
      (wx, wz) => this.getTerrainHeight(wx, wz),
      (wx, wz) => this.regionManager.getDominantRegion(wx, wz)
    );

    for (const instance of overlappingStructures) {
      for (const item of instance.placements) {
        const bWx = instance.originX + item.dx;
        const bWy = instance.originY + 1 + item.dy;
        const bWz = instance.originZ + item.dz;

        const targetCx = Math.floor(bWx / 16);
        const targetCz = Math.floor(bWz / 16);

        if (targetCx === cx && targetCz === cz && bWy >= 0 && bWy < 128) {
          const lx = bWx - cx * 16;
          const lz = bWz - cz * 16;
          blocks[getIndex(lx, bWy, lz)] = item.block;
        }
      }
    }

    const dominantRegion = this.regionManager.getDominantRegion(cx * 16 + 8, cz * 16 + 8);

    for (let lx = 3; lx < 13; lx++) {
      const wx = cx * 16 + lx;
      for (let lz = 3; lz < 13; lz++) {
        const wz = cz * 16 + lz;
        const height = heightMap[lx + lz * 16];
        
        if (height < p.seaLevel + 1) continue;

        // v8.1.0 Slope Guard: Never spawn trees on sheer vertical cliff walls (eliminates floating cliffside trees!)
        const hL = heightMap[(lx - 1) + lz * 16];
        const hR = heightMap[(lx + 1) + lz * 16];
        const hB = heightMap[lx + (lz - 1) * 16];
        const hF = heightMap[lx + (lz + 1) * 16];
        const maxSlope = Math.max(Math.abs(height - hL), Math.abs(height - hR), Math.abs(height - hB), Math.abs(height - hF));
        if (maxSlope > 1) continue;

        // Prevent trees from spawning inside structures
        let insideStructure = false;
        for (const s of overlappingStructures) {
           if (wx >= s.boundingBox.minX && wx <= s.boundingBox.maxX &&
               wz >= s.boundingBox.minZ && wz <= s.boundingBox.maxZ) {
             insideStructure = true;
             break;
           }
        }
        if (insideStructure) continue;

        const topBlock = blocks[getIndex(lx, height, lz)];
        const localHash = Math.abs(Math.imul(wx, 73856093) ^ Math.imul(wz, 19349663) ^ this.seed);
        
        if (topBlock === 5 && height <= p.seaLevel + 5) {
          // v7.5.0: Coastal Palm Groves on tropical sandy beaches & Raja Ampat islets
          const palmVal = this.detailNoise.noise2D(wx * 0.28 + 333, wz * 0.28 - 111);
          if (palmVal > 0.72 && localHash % 7 === 0) {
            const palmBlocks = StructureGenerator.generatePalmTree(localHash);
            this.applyStructureToChunkLocal(palmBlocks, lx, height + 1, lz, blocks, getIndex);
          }
        } else if (topBlock === 2) {
          const treeVal = this.detailNoise.noise2D(wx * 0.35 + 100, wz * 0.35 + 100);
          const treeChance = Math.max(0.14, dominantRegion.vegetationProfile.treeChance * 14);
          if (treeVal > (1.0 - Math.min(0.38, treeChance))) {
            const regionId = dominantRegion.id;
            let treeBlocks;
            if ((regionId === 'jawa' || regionId === 'bali' || regionId === 'minang') && localHash % 4 === 0) {
              treeBlocks = StructureGenerator.generateBambooGrove(localHash);
            } else if ((regionId === 'borneo' || regionId === 'papua' || regionId === 'minang') && localHash % 5 === 1 && lx >= 4 && lx <= 11 && lz >= 4 && lz <= 11) {
              treeBlocks = StructureGenerator.generateGiantRainforestTree(localHash);
            } else if (localHash % 29 === 0 && lx >= 4 && lx <= 11 && lz >= 4 && lz <= 11) {
              treeBlocks = StructureGenerator.generateWaystoneShrine(localHash);
            } else {
              const primaryTrees = dominantRegion.vegetationProfile.primaryTrees;
              const treeKind = primaryTrees[localHash % primaryTrees.length];
              treeBlocks = (treeKind === 'pine' || height > 64)
                ? StructureGenerator.generatePineTree(localHash)
                : StructureGenerator.generateOakTree(localHash);
            }
            this.applyStructureToChunkLocal(treeBlocks, lx, height + 1, lz, blocks, getIndex);
          }
        } else if (topBlock === 38) {
          const treeVal = this.detailNoise.noise2D(wx * 0.3 + 200, wz * 0.3 + 200);
          if (treeVal > 0.80) {
            const treeBlocks = StructureGenerator.generatePineTree(localHash);
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
    const posHash = Math.abs(Math.imul(wx, 31237) ^ Math.imul(wy, 654321) ^ Math.imul(wz, 99991) ^ this.seed);
    const height = 6 + (posHash % 4);
    
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
          const cornerHash = Math.abs(Math.imul(wx + dx, 17) ^ Math.imul(y, 101) ^ Math.imul(wz + dz, 13) ^ this.seed);
          if (Math.abs(dx) === radius && Math.abs(dz) === radius && (cornerHash % 2 === 0)) continue; // Round corners
          
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
