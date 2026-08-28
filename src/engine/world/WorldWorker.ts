// Standalone Web Worker for Asynchronous Procedural Voxel Generation 2.0
// Layered Continentalness, Erosion, Ridge Mountains, Rivers, Caves 2.0, Ravines, Biomes & Multi-chunk Structures

export interface WorkerTaskInput {
  taskId: string;
  cx: number;
  cz: number;
  seed: number;
  modifiedBlocks?: Record<string, number>;
}

export interface WorkerTaskResult {
  taskId: string;
  cx: number;
  cz: number;
  buffer: ArrayBuffer;
}

// Inline Fast Simplex Noise Generator (2D & 3D) for Web Worker
class FastSimplexNoise {
  private p = new Uint8Array(256);
  private perm = new Uint8Array(512);

  constructor(seed: number = 42819) {
    for (let i = 0; i < 256; i++) {
      this.p[i] = i;
    }
    // Seeded Fisher-Yates Shuffle
    let s = seed % 2147483647;
    if (s <= 0) s += 2147483646;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = Math.floor((s / 2147483647) * (i + 1));
      const tmp = this.p[i];
      this.p[i] = this.p[j];
      this.p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
    }
  }

  public noise2D(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    let s = (xin + yin) * F2;
    let i = Math.floor(xin + s);
    let j = Math.floor(yin + s);
    let t = (i + j) * G2;
    let X0 = i - t;
    let Y0 = j - t;
    let x0 = xin - X0;
    let y0 = yin - Y0;

    let i1 = 0, j1 = 0;
    if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }

    let x1 = x0 - i1 + G2;
    let y1 = y0 - j1 + G2;
    let x2 = x0 - 1.0 + 2.0 * G2;
    let y2 = y0 - 1.0 + 2.0 * G2;

    let ii = i & 255;
    let jj = j & 255;
    let gi0 = this.perm[ii + this.perm[jj]] % 8;
    let gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 8;
    let gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 8;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    let n0 = t0 < 0 ? 0 : Math.pow(t0, 4) * (gi0 & 1 ? -x0 : x0 + (gi0 & 2 ? -y0 : y0));

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    let n1 = t1 < 0 ? 0 : Math.pow(t1, 4) * (gi1 & 1 ? -x1 : x1 + (gi1 & 2 ? -y1 : y1));

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    let n2 = t2 < 0 ? 0 : Math.pow(t2, 4) * (gi2 & 1 ? -x2 : x2 + (gi2 & 2 ? -y2 : y2));

    return 70.0 * (n0 + n1 + n2);
  }

  public fbm2D(x: number, y: number, octaves: number = 4, persistence: number = 0.5): number {
    let total = 0, freq = 1, amp = 1, maxVal = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * freq, y * freq) * amp;
      maxVal += amp;
      amp *= persistence;
      freq *= 2.0;
    }
    return total / maxVal;
  }

  public noise3D(x: number, y: number, z: number): number {
    const nxy = this.noise2D(x, y);
    const nyz = this.noise2D(y + 100, z + 100);
    const nxz = this.noise2D(x + 200, z + 200);
    return (nxy + nyz + nxz) / 3.0;
  }

  public fbm3D(x: number, y: number, z: number, octaves: number = 3): number {
    let total = 0, freq = 1, amp = 1, maxVal = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise3D(x * freq, y * freq, z * freq) * amp;
      maxVal += amp;
      amp *= 0.5;
      freq *= 2.0;
    }
    return total / maxVal;
  }
}

// Web Worker Listener
if (typeof self !== 'undefined') {
  self.onmessage = (e: MessageEvent<WorkerTaskInput>) => {
    const { taskId, cx, cz, seed, modifiedBlocks } = e.data;

    const CHUNK_SIZE_X = 16;
    const CHUNK_SIZE_Y = 128;
    const CHUNK_SIZE_Z = 16;
    const SEA_LEVEL = 28;

    const blocks = new Uint8Array(CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z);

    const contNoise = new FastSimplexNoise(seed);
    const erosionNoise = new FastSimplexNoise(seed + 111);
    const peaksNoise = new FastSimplexNoise(seed + 222);
    const detailNoise = new FastSimplexNoise(seed + 333);
    const riverNoise = new FastSimplexNoise(seed + 444);
    const tempNoise = new FastSimplexNoise(seed + 555);
    const humidNoise = new FastSimplexNoise(seed + 666);
    const caveNoise = new FastSimplexNoise(seed + 777);
    const ravineNoise = new FastSimplexNoise(seed + 888);
    const oreNoise = new FastSimplexNoise(seed + 999);

    const getIndex = (x: number, y: number, z: number) => x + z * CHUNK_SIZE_X + y * (CHUNK_SIZE_X * CHUNK_SIZE_Z);

    const heightMap = new Int16Array(CHUNK_SIZE_X * CHUNK_SIZE_Z);

    // 1. TERRAIN & BIOME COLUMN GENERATION
    for (let lx = 0; lx < CHUNK_SIZE_X; lx++) {
      const wx = cx * CHUNK_SIZE_X + lx;
      for (let lz = 0; lz < CHUNK_SIZE_Z; lz++) {
        const wz = cz * CHUNK_SIZE_Z + lz;

        // Layered Macro Noise
        const cont = contNoise.fbm2D(wx * 0.0007, wz * 0.0007, 4, 0.45);
        const erosion = erosionNoise.fbm2D(wx * 0.0025, wz * 0.0025, 3, 0.5);
        const peaks = Math.abs(peaksNoise.fbm2D(wx * 0.004, wz * 0.004, 3, 0.5));
        const detail = detailNoise.fbm2D(wx * 0.012, wz * 0.012, 2, 0.5);

        // Climate Noise
        const temp = tempNoise.fbm2D(wx * 0.0012, wz * 0.0012, 3, 0.5);
        const humid = (humidNoise.fbm2D(wx * 0.0012 + 1000, wz * 0.0012 + 1000, 3, 0.5) + 1) * 0.5;

        // Calculate Surface Height
        let baseHeight = 30 + cont * 26 + (1.0 - Math.abs(erosion)) * 12 + detail * 5;
        if (peaks > 0.48) {
          baseHeight += Math.pow((peaks - 0.48) * 2.2, 1.8) * 40; // Mountain ridge
        }

        // River Carve (Zero-crossing valley)
        const rVal = Math.abs(riverNoise.fbm2D(wx * 0.005, wz * 0.005, 3, 0.5));
        const isRiver = cont > -0.2 && rVal < 0.035;
        let riverDepth = 0;
        if (isRiver) {
          riverDepth = Math.floor((0.035 - rVal) * 200);
          baseHeight = Math.max(SEA_LEVEL - 3, baseHeight - riverDepth);
        }

        let height = Math.floor(baseHeight);
        height = Math.max(3, Math.min(CHUNK_SIZE_Y - 4, height));
        heightMap[lx + lz * CHUNK_SIZE_X] = height;

        // Determine Primary Biome Surface Blocks
        let surfaceBlock = 2; // GRASS
        let subBlock = 1;     // DIRT
        let deepBlock = 3;    // STONE

        if (cont < -0.35) {
          surfaceBlock = 6; // GRAVEL
          subBlock = 3;     // STONE
        } else if (height <= SEA_LEVEL + 2 && cont < -0.22) {
          surfaceBlock = 5; // SAND
          subBlock = 5;
        } else if (temp > 0.5 && humid < 0.2) {
          surfaceBlock = 5; // SAND
          subBlock = 5;
        } else if (temp > 0.5 && humid < 0.35) {
          surfaceBlock = 7; // CLAY / TERRACOTTA
          subBlock = 50;    // COPPER_BLOCK
        } else if (temp < -0.35 || height > 76) {
          surfaceBlock = 38; // SNOW
          subBlock = 38;     // SNOW sub-layer for deep snow cover
        } else if (temp > 0.65 && humid < 0.1) {
          surfaceBlock = 41; // BASALT
          subBlock = 42;     // MAGMA_ROCK
        } else if (isRiver) {
          surfaceBlock = 5;  // SAND riverbed
          subBlock = 6;      // GRAVEL
        }

        // Fill vertical voxel column
        for (let y = 0; y <= height; y++) {
          let block = deepBlock;

          if (y === height) {
            block = surfaceBlock;
          } else if (y >= height - 3) {
            block = subBlock;
          } else {
            // Geological Ore Strata & Veins
            const oreVal = oreNoise.noise3D(wx * 0.12, y * 0.15, wz * 0.12);
            if (oreVal > 0.62) {
              if (y < 12) block = 25;      // MYTHRIL_ORE
              else if (y < 22) block = 24; // GOLD_ORE
              else if (y < 35) block = 23; // IRON_ORE
              else block = 22;             // COPPER_ORE
            } else if (oreVal < -0.65 && y < 55) {
              block = 27;                  // COAL_ORE
            } else if (y < 10 && oreVal > 0.55) {
              block = 26;                  // AETHER_CRYSTAL_ORE
            }
          }

          // 3D Subterranean Cave Network (Protected top surface)
          if (y > 3 && y < height - 2) {
            const caveVal = caveNoise.fbm3D(wx * 0.035, y * 0.045, wz * 0.035, 3);
            const ravVal = Math.abs(ravineNoise.noise2D(wx * 0.01, wz * 0.01));
            const isRavine = ravVal < 0.018 && y < height - 6 && y > 15;

            if (caveVal > 0.58 || isRavine) {
              block = (y < 6) ? 29 : 0; // LAVA or AIR
            }
          }

          blocks[getIndex(lx, y, lz)] = block;
        }

        // Fill Water Bodies up to SEA_LEVEL
        for (let y = height + 1; y <= SEA_LEVEL; y++) {
          blocks[getIndex(lx, y, lz)] = 28; // WATER
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

        // Check ground block & slope stability
        const topBlock = blocks[getIndex(lx, height, lz)];
        if (topBlock !== 2 && topBlock !== 44) continue; // GRASS or MOSS_STONE

        const hL = heightMap[(lx - 1) + lz * CHUNK_SIZE_X];
        const hR = heightMap[(lx + 1) + lz * CHUNK_SIZE_X];
        const hB = heightMap[lx + (lz - 1) * CHUNK_SIZE_X];
        const hF = heightMap[lx + (lz + 1) * CHUNK_SIZE_X];
        const maxDelta = Math.max(Math.abs(height - hL), Math.abs(height - hR), Math.abs(height - hB), Math.abs(height - hF));

        if (maxDelta <= 1) {
          const floraVal = detailNoise.noise2D(wx * 0.18, wz * 0.18);
          if (floraVal > 0.58) {
            let floraBlock = 33; // TALL_GRASS
            if (floraVal > 0.82) floraBlock = 34;      // BLUE_FLOWER
            else if (floraVal > 0.74) floraBlock = 35; // RED_FLOWER
            else if (floraVal > 0.68) floraBlock = 36; // SUN_ORCHID

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

        const temp = tempNoise.fbm2D(wx * 0.0012, wz * 0.0012, 3, 0.5);
        const humid = (humidNoise.fbm2D(wx * 0.0012 + 1000, wz * 0.0012 + 1000, 3, 0.5) + 1) * 0.5;
        const cont = contNoise.fbm2D(wx * 0.0007, wz * 0.0007, 4, 0.45);

        const treeRand = Math.abs(contNoise.noise2D(wx * 0.45 + 13, wz * 0.45 + 71));
        const treeChance = temp < -0.3 ? 0.08 : (humid > 0.7 ? 0.12 : 0.05);

        if (treeRand < treeChance) {
          const surfaceY = heightMap[lx + lz * CHUNK_SIZE_X];
          if (surfaceY >= SEA_LEVEL && surfaceY + 12 < CHUNK_SIZE_Y) {
            const groundB = blocks[getIndex(lx, surfaceY, lz)];
            if (groundB === 2 || groundB === 38 || groundB === 1 || groundB === 5) {
              // Select tree species based on climate
              let logType = 8;    // OAK_LOG
              let leafType = 9;   // OAK_LEAVES
              let treeShape: 'oak' | 'pine' | 'jungle' | 'crystal' = 'oak';

              if (temp < -0.35 || surfaceY > 74) {
                logType = 11;   // PINE_LOG
                leafType = 12;  // PINE_LEAVES
                treeShape = 'pine';
              } else if (humid > 0.8 && temp > 0.2) {
                logType = 13;   // CYAN_CRYSTAL_LOG
                leafType = 14;  // CYAN_CRYSTAL_LEAVES
                treeShape = 'crystal';
              } else if (temp > 0.6 && humid > 0.7) {
                logType = 8;    // OAK_LOG
                leafType = 9;   // OAK_LEAVES
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
                // Standard Oak / Crystal Tree
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

    // 3. Apply Player Modified Blocks Overrides
    if (modifiedBlocks) {
      Object.entries(modifiedBlocks).forEach(([key, blockType]) => {
        const [lx, ly, lz] = key.split(',').map(Number);
        if (lx >= 0 && lx < CHUNK_SIZE_X && ly >= 0 && ly < CHUNK_SIZE_Y && lz >= 0 && lz < CHUNK_SIZE_Z) {
          blocks[getIndex(lx, ly, lz)] = blockType;
        }
      });
    }

    // Transfer typed array buffer back to main thread
    const response: WorkerTaskResult = { taskId, cx, cz, buffer: blocks.buffer };
    (self as unknown as { postMessage: (msg: any, transfer: any[]) => void }).postMessage(response, [blocks.buffer]);
  };
}
