import { BlockType } from '../../types';
import { SimplexNoise } from '../math/Noise';
import { SEA_LEVEL, WORLD_PRESETS, WorldPreset, WorldGenParameters, CHUNK_SIZE_Y } from './WorldConfig';
import { StructureGenerator } from './StructureGenerator';

const CHUNK_SIZE_X = 16;
const CHUNK_SIZE_Z = 16;

export class WorldGeneratorCore {
  public seed: number;
  public preset: WorldPreset;
  public params: WorldGenParameters;

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

    let baseHeight = 30 + cont * 26 + (1.0 - Math.abs(erosion)) * 12 + detail * 5;
    if (peaks > 0.48) {
      baseHeight += Math.pow((peaks - 0.48) * 2.2, 1.8) * p.mountainHeightScale;
    }

    const rVal = Math.abs(this.riverNoise.fbm2D(wx * p.riverFrequency, wz * p.riverFrequency, 3, 0.5));
    const isRiver = cont > -0.2 && rVal < 0.035;
    if (isRiver) {
      const riverDepth = Math.floor((0.035 - rVal) * 200);
      baseHeight = Math.max(p.seaLevel - 3, baseHeight - riverDepth);
    }

    let height = Math.floor(baseHeight);
    return Math.max(3, Math.min(CHUNK_SIZE_Y - 4, height));
  }

  public generateChunkData(cx: number, cz: number, modifiedBlocks?: Record<string, number>): Uint8Array {
    const blocks = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z);
    const getIndex = (x: number, y: number, z: number) => x + z * CHUNK_SIZE_X + y * (CHUNK_SIZE_X * CHUNK_SIZE_Z);
    const heightMap = new Int16Array(CHUNK_SIZE_X * CHUNK_SIZE_Z);
    const p = this.params;

    // 1. TERRAIN & BIOME COLUMN GENERATION
    for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
      const wx = cx * CHUNK_SIZE_X + lx;
      for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
        const wz = cz * CHUNK_SIZE_Z + lz;

        const cont = this.contNoise.fbm2D(wx * p.continentalnessScale, wz * p.continentalnessScale, 4, 0.45);
        const temp = this.tempNoise.fbm2D(wx * 0.0012, wz * 0.0012, 3, 0.5);
        const humid = (this.humidNoise.fbm2D(wx * 0.0012 + 1000, wz * 0.0012 + 1000, 3, 0.5) + 1) * 0.5;

        const height = this.getTerrainHeight(wx, wz);
        heightMap[lx + lz * CHUNK_SIZE_X] = height;

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
          subBlock = 50;
        } else if (temp < -0.35 || height > 76) {
          surfaceBlock = 38;
          subBlock = 38;
        } else if (temp > 0.65 && humid < 0.1) {
          surfaceBlock = 41;
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

            // Scaled by caveDensity (standard density: ~0.035 -> threshold 0.58)
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
    for (let lx = 1; lx < CHUNK_SIZE_X - 1; lx++) {
      const wx = cx * CHUNK_SIZE_X + lx;
      for (let lz = 1; lz < CHUNK_SIZE_Z - 1; lz++) {
        const wz = cz * CHUNK_SIZE_Z + lz;
        const height = heightMap[lx + lz * CHUNK_SIZE_X];

        if (height < SEA_LEVEL) continue;

        const topBlock = blocks[getIndex(lx, height, lz)];
        if (topBlock !== 2 && topBlock !== 44) continue;

        const hL = heightMap[(lx - 1) + lz * CHUNK_SIZE_X];
        const hR = heightMap[(lx + 1) + lz * CHUNK_SIZE_X];
        const hB = heightMap[lx + (lz - 1) * CHUNK_SIZE_X];
        const hF = heightMap[lx + (lz + 1) * CHUNK_SIZE_X];
        const maxDelta = Math.max(Math.abs(height - hL), Math.abs(height - hR), Math.abs(height - hB), Math.abs(height - hF));

        if (maxDelta <= 1) {
          const floraVal = this.detailNoise.noise2D(wx * 0.18, wz * 0.18);
          if (floraVal > 0.58) {
            let floraBlock = 33;
            if (floraVal > 0.82) floraBlock = 34;
            else if (floraVal > 0.74) floraBlock = 35;
            else if (floraVal > 0.68) floraBlock = 36;

            if (blocks[getIndex(lx, height + 1, lz)] === 0) {
              blocks[getIndex(lx, height + 1, lz)] = floraBlock;
            }
          }
        }
      }
    }

    // 3. BIOME-AWARE PROCEDURAL TREES
    for (let lx = 2; lx < CHUNK_SIZE_X - 2; lx += 4) {
      for (let lz = 2; lz < CHUNK_SIZE_Z - 2; lz += 4) {
        const wx = cx * CHUNK_SIZE_X + lx;
        const wz = cz * CHUNK_SIZE_Z + lz;

        const temp = this.tempNoise.fbm2D(wx * 0.0012, wz * 0.0012, 3, 0.5);
        const humid = (this.humidNoise.fbm2D(wx * 0.0012 + 1000, wz * 0.0012 + 1000, 3, 0.5) + 1) * 0.5;
        const cont = this.contNoise.fbm2D(wx * 0.0007, wz * 0.0007, 4, 0.45);

        const treeRand = Math.abs(this.contNoise.noise2D(wx * 0.45 + 13, wz * 0.45 + 71));
        const treeChance = temp < -0.3 ? 0.08 : (humid > 0.7 ? 0.12 : 0.05);

        if (treeRand < treeChance) {
          const surfaceY = heightMap[lx + lz * CHUNK_SIZE_X];
          if (surfaceY >= SEA_LEVEL && surfaceY + 12 < CHUNK_SIZE_Y) {
            const groundB = blocks[getIndex(lx, surfaceY, lz)];
            if (groundB === 2 || groundB === 38 || groundB === 1 || groundB === 5) {
              let logType = 8;
              let leafType = 9;
              let treeShape: 'oak' | 'pine' | 'jungle' | 'crystal' = 'oak';

              if (temp < -0.35 || surfaceY > 74) {
                logType = 11;
                leafType = 12;
                treeShape = 'pine';
              } else if (humid > 0.8 && temp > 0.2) {
                logType = 13;
                leafType = 14;
                treeShape = 'crystal';
              } else if (temp > 0.6 && humid > 0.7) {
                logType = 8;
                leafType = 9;
                treeShape = 'jungle';
              }

              if (treeShape === 'pine') {
                const trunkH = 6 + (Math.abs(wx + wz) % 3);
                for (let ty = 1; ty <= trunkH; ty++) {
                  blocks[getIndex(lx, surfaceY + ty, lz)] = logType;
                }
                for (let ly = 2; ly <= trunkH; ly++) {
                  const rad = (trunkH - ly) % 2 === 0 ? 2 : 1;
                  for (let dx = -rad; dx <= rad; dx++) {
                    for (let dz = -rad; dz <= rad; dz++) {
                      if (Math.abs(dx) === rad && Math.abs(dz) === rad) continue;
                      const tx = lx + dx;
                      const tz = lz + dz;
                      if (tx >= 0 && tx < CHUNK_SIZE_X && tz >= 0 && tz < CHUNK_SIZE_Z) {
                        if (blocks[getIndex(tx, surfaceY + ly, tz)] === 0) {
                          blocks[getIndex(tx, surfaceY + ly, tz)] = leafType;
                        }
                      }
                    }
                  }
                }
                blocks[getIndex(lx, surfaceY + trunkH + 1, lz)] = leafType;
              } else if (treeShape === 'jungle') {
                const trunkH = 8 + (Math.abs(wx + wz) % 3);
                for (let ty = 1; ty <= trunkH; ty++) {
                  blocks[getIndex(lx, surfaceY + ty, lz)] = logType;
                }
                for (let ly = trunkH - 2; ly <= trunkH + 1; ly++) {
                  const rad = ly <= trunkH ? 3 : 2;
                  for (let dx = -rad; dx <= rad; dx++) {
                    for (let dz = -rad; dz <= rad; dz++) {
                      if (dx * dx + dz * dz <= rad * rad) {
                        const tx = lx + dx;
                        const tz = lz + dz;
                        if (tx >= 0 && tx < CHUNK_SIZE_X && tz >= 0 && tz < CHUNK_SIZE_Z) {
                          if (blocks[getIndex(tx, surfaceY + ly, tz)] === 0) {
                            blocks[getIndex(tx, surfaceY + ly, tz)] = leafType;
                          }
                        }
                      }
                    }
                  }
                }
              } else {
                const trunkH = 4 + (Math.abs(wx + wz) % 3);
                for (let ty = 1; ty <= trunkH; ty++) {
                  blocks[getIndex(lx, surfaceY + ty, lz)] = logType;
                }
                for (let ly = trunkH - 1; ly <= trunkH + 1; ly++) {
                  const rad = ly === trunkH + 1 ? 1 : 2;
                  for (let dx = -rad; dx <= rad; dx++) {
                    for (let dz = -rad; dz <= rad; dz++) {
                      if (Math.abs(dx) === rad && Math.abs(dz) === rad && ly === trunkH + 1) continue;
                      const tx = lx + dx;
                      const tz = lz + dz;
                      if (tx >= 0 && tx < CHUNK_SIZE_X && tz >= 0 && tz < CHUNK_SIZE_Z) {
                        if (blocks[getIndex(tx, surfaceY + ly, tz)] === 0) {
                          blocks[getIndex(tx, surfaceY + ly, tz)] = leafType;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    // 4. MULTI-CHUNK PROCEDURAL STRUCTURE BLUEPRINTS
    const structures = StructureGenerator.getStructureBlocksForChunk(
      cx,
      cz,
      this.seed,
      p.structureDensity,
      (wx, wz) => this.getTerrainHeight(wx, wz)
    );

    for (const place of structures) {
      if (
        place.dx >= 0 &&
        place.dx < CHUNK_SIZE_X &&
        place.dy >= 0 &&
        place.dy < CHUNK_SIZE_Y &&
        place.dz >= 0 &&
        place.dz < CHUNK_SIZE_Z
      ) {
        blocks[getIndex(place.dx, place.dy, place.dz)] = place.block;
      }
    }

    if (modifiedBlocks) {
      Object.entries(modifiedBlocks).forEach(([key, blockType]) => {
        const [lx, ly, lz] = key.split(',').map(Number);
        if (lx >= 0 && lx < CHUNK_SIZE_X && ly >= 0 && ly < CHUNK_SIZE_Y && lz >= 0 && lz < CHUNK_SIZE_Z) {
          blocks[getIndex(lx, ly, lz)] = blockType;
        }
      });
    }

    return blocks;
  }
}
