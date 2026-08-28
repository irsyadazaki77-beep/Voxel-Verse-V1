// Voxel Lighting Engine: Sunlight (top-down column propagation) & Block Light (BFS local queue propagation)
// Supports local incremental updates on block placement/destruction (0 to 15 scale)
import { BlockType } from '../../types';
import { BLOCK_DEFS } from './BlockRegistry';

export class LightingEngine {
  private width: number;
  private height: number;
  private depth: number;

  // Packed Uint8 arrays for fast memory access:
  // Lower 4 bits (0-15) = Block Light Level
  // Upper 4 bits (0-15) = Sunlight Level
  private lightData: Uint8Array;
  private getBlock: (x: number, y: number, z: number) => BlockType;

  constructor(
    width: number,
    height: number,
    depth: number,
    getBlock: (x: number, y: number, z: number) => BlockType
  ) {
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.getBlock = getBlock;
    this.lightData = new Uint8Array(width * height * depth);
  }

  private getIndex(x: number, y: number, z: number): number {
    return x + z * this.width + y * (this.width * this.depth);
  }

  public getBlockLight(x: number, y: number, z: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) return 0;
    return this.lightData[this.getIndex(x, y, z)] & 0x0f;
  }

  public setBlockLight(x: number, y: number, z: number, val: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) return;
    const idx = this.getIndex(x, y, z);
    this.lightData[idx] = (this.lightData[idx] & 0xf0) | (Math.min(15, Math.max(0, val)) & 0x0f);
  }

  public getSunlight(x: number, y: number, z: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) return 15;
    return (this.lightData[this.getIndex(x, y, z)] >> 4) & 0x0f;
  }

  public setSunlight(x: number, y: number, z: number, val: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) return;
    const idx = this.getIndex(x, y, z);
    this.lightData[idx] = (this.lightData[idx] & 0x0f) | ((Math.min(15, Math.max(0, val)) & 0x0f) << 4);
  }

  public getCombinedLightFactor(x: number, y: number, z: number, sunIntensity: number = 1.0): number {
    const sun = this.getSunlight(x, y, z) * sunIntensity;
    const block = this.getBlockLight(x, y, z);
    const maxVal = Math.max(sun, block);
    // Returns 0.08 (min cave ambient) to 1.0 (full brightness)
    return Math.min(1.0, 0.08 + (maxVal / 15.0) * 0.92);
  }

  // Calculate full initial lighting for the chunk
  public computeFullChunkLighting(): void {
    // 1. Sunlight Top-Down Column Calculation
    for (let x = 0; x < this.width; x++) {
      for (let z = 0; z < this.depth; z++) {
        let currentSun = 15;
        for (let y = this.height - 1; y >= 0; y--) {
          const block = this.getBlock(x, y, z);
          if (block === BlockType.AIR) {
            this.setSunlight(x, y, z, currentSun);
          } else {
            const def = BLOCK_DEFS[block];
            if (def && def.transparent) {
              currentSun = Math.max(0, currentSun - 1);
              this.setSunlight(x, y, z, currentSun);
            } else {
              currentSun = 0;
              this.setSunlight(x, y, z, 0);
            }
          }
        }
      }
    }

    // 2. Block Light Sources & BFS Propagation
    const blockQueue: [number, number, number, number][] = [];

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        for (let z = 0; z < this.depth; z++) {
          const block = this.getBlock(x, y, z);
          if (block !== BlockType.AIR) {
            const def = BLOCK_DEFS[block];
            if (def && def.lightEmission && def.lightEmission > 0) {
              this.setBlockLight(x, y, z, def.lightEmission);
              blockQueue.push([x, y, z, def.lightEmission]);
            }
          }
        }
      }
    }

    // 3. Flood-Fill BFS Queue for Block Light
    const neighbors = [
      [1, 0, 0], [-1, 0, 0],
      [0, 1, 0], [0, -1, 0],
      [0, 0, 1], [0, 0, -1]
    ];

    let head = 0;
    while (head < blockQueue.length) {
      const [cx, cy, cz, lightVal] = blockQueue[head++];
      if (lightVal <= 1) continue;

      for (const [dx, dy, dz] of neighbors) {
        const nx = cx + dx;
        const ny = cy + dy;
        const nz = cz + dz;

        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height && nz >= 0 && nz < this.depth) {
          const nBlock = this.getBlock(nx, ny, nz);
          const nDef = BLOCK_DEFS[nBlock];
          const canPass = nBlock === BlockType.AIR || (nDef && nDef.transparent);

          if (canPass) {
            const currentNLight = this.getBlockLight(nx, ny, nz);
            if (currentNLight < lightVal - 1) {
              this.setBlockLight(nx, ny, nz, lightVal - 1);
              blockQueue.push([nx, ny, nz, lightVal - 1]);
            }
          }
        }
      }
    }
  }

  // Fast Incremental Local Update on Single Block Place / Break
  public updateLocalBlockLight(lx: number, ly: number, lz: number, newBlock: BlockType): void {
    const def = BLOCK_DEFS[newBlock];
    const emission = (def && def.lightEmission) ? def.lightEmission : 0;

    if (emission > 0) {
      // Placed light source (e.g. Torch / Lantern)
      this.setBlockLight(lx, ly, lz, emission);
      const queue: [number, number, number, number][] = [[lx, ly, lz, emission]];
      const neighbors = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];

      let head = 0;
      while (head < queue.length) {
        const [cx, cy, cz, lVal] = queue[head++];
        if (lVal <= 1) continue;

        for (const [dx, dy, dz] of neighbors) {
          const nx = cx + dx, ny = cy + dy, nz = cz + dz;
          if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height && nz >= 0 && nz < this.depth) {
            const nb = this.getBlock(nx, ny, nz);
            const ndef = BLOCK_DEFS[nb];
            if (nb === BlockType.AIR || (ndef && ndef.transparent)) {
              if (this.getBlockLight(nx, ny, nz) < lVal - 1) {
                this.setBlockLight(nx, ny, nz, lVal - 1);
                queue.push([nx, ny, nz, lVal - 1]);
              }
            }
          }
        }
      }
    }
  }
}
