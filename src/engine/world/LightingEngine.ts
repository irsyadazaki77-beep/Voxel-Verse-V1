// Voxel Lighting Engine: Sunlight (top-down column propagation) & 3D RGB Colored Block Light (BFS flood-fill propagation)
// Supports local incremental updates on block placement/destruction (0 to 15 per channel: R, G, B, Sun)
import { BlockType } from '../../types';
import { BLOCK_DEFS } from './BlockRegistry';

export interface RGBLightSample {
  r: number;
  g: number;
  b: number;
}

export class LightingEngine {
  private width: number;
  private height: number;
  private depth: number;

  // Packed Uint8 array (legacy scalar compatibility):
  // Lower 4 bits (0-15) = Max Block Light Level
  // Upper 4 bits (0-15) = Sunlight Level
  private lightData: Uint8Array;

  // Packed Uint16 array for True 3D RGB Colored Light (v7.0.0):
  // Bits  0..3  = Red   (0-15)
  // Bits  4..7  = Green (0-15)
  // Bits  8..11 = Blue  (0-15)
  // Bits 12..15 = Sun   (0-15)
  private rgbLightData: Uint16Array;

  // Reusable flat typed BFS queue (x, y, z, r, g, b packed or flat ints) to minimize GC
  private bfsQueue: Int32Array;
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
    const vol = width * height * depth;
    this.lightData = new Uint8Array(vol);
    this.rgbLightData = new Uint16Array(vol);
    // Queue holds up to vol * 2 entries (each entry = 1 packed coord int32)
    this.bfsQueue = new Int32Array(Math.min(vol * 2, 131072));
  }

  public rebind(getBlock: (x: number, y: number, z: number) => BlockType): void {
    this.getBlock = getBlock;
    this.lightData.fill(0);
    this.rgbLightData.fill(0);
  }

  private getIndex(x: number, y: number, z: number): number {
    return x + z * this.width + y * (this.width * this.depth);
  }

  /**
   * Maps emissive BlockType to physical RGB light emission (0..15 per channel).
   */
  public static getBlockEmissionRGB(block: BlockType): [number, number, number] {
    if (block === BlockType.AIR) return [0, 0, 0];
    const def = BLOCK_DEFS[block];
    const em = def?.lightEmission || 0;
    if (em <= 0) return [0, 0, 0];

    const scale = em / 15.0;
    switch (block) {
      case BlockType.LAVA:
      case BlockType.MAGMA_ROCK:
        return [
          Math.min(15, Math.round(15 * scale)),
          Math.min(15, Math.round(5.5 * scale)),
          Math.min(15, Math.round(1.5 * scale)),
        ];

      case BlockType.TORCH:
      case BlockType.LANTERN:
      case BlockType.FURNACE:
        return [
          Math.min(15, Math.round(15 * scale)),
          Math.min(15, Math.round(11 * scale)),
          Math.min(15, Math.round(5.5 * scale)),
        ];

      case BlockType.GLOWSTONE_CRYSTAL:
      case BlockType.SUN_ORCHID:
        return [
          Math.min(15, Math.round(15 * scale)),
          Math.min(15, Math.round(13.5 * scale)),
          Math.min(15, Math.round(7.5 * scale)),
        ];

      case BlockType.AETHER_CRYSTAL_ORE:
      case BlockType.AETHER_LAMP:
      case BlockType.AETHER_LANTERN:
      case BlockType.RESONANCE_NEXUS:
      case BlockType.AETHER_PORTAL:
      case BlockType.CYAN_CRYSTAL_LEAVES:
      case BlockType.CRYSTAL_BRICK:
      case BlockType.CRYSTAL_SENSOR:
        return [
          Math.min(15, Math.round(3.5 * scale)),
          Math.min(15, Math.round(13 * scale)),
          Math.min(15, Math.round(15 * scale)),
        ];

      case BlockType.PRISMATIC_CRYSTAL:
        return [
          Math.min(15, Math.round(13.5 * scale)),
          Math.min(15, Math.round(6.5 * scale)),
          Math.min(15, Math.round(15 * scale)),
        ];

      case BlockType.LUMINESCENT_MUSHROOM:
        return [
          Math.min(15, Math.round(5 * scale)),
          Math.min(15, Math.round(14.5 * scale)),
          Math.min(15, Math.round(9.5 * scale)),
        ];

      default:
        return [
          Math.min(15, em),
          Math.min(15, Math.round(em * 0.88)),
          Math.min(15, Math.round(em * 0.68)),
        ];
    }
  }

  public getBlockLight(x: number, y: number, z: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) return 0;
    return this.lightData[this.getIndex(x, y, z)] & 0x0f;
  }

  public setBlockLight(x: number, y: number, z: number, val: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) return;
    const clamped = Math.min(15, Math.max(0, val)) & 0x0f;
    const idx = this.getIndex(x, y, z);
    this.lightData[idx] = (this.lightData[idx] & 0xf0) | clamped;
    // Sync warm default to RGB buffer if set directly via legacy API
    const sunBits = this.rgbLightData[idx] & 0xf000;
    this.rgbLightData[idx] = sunBits | clamped | (clamped << 4) | (clamped << 8);
  }

  public getRGBBlockLight(x: number, y: number, z: number): [number, number, number] {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) return [0, 0, 0];
    const packed = this.rgbLightData[this.getIndex(x, y, z)];
    return [packed & 0x0f, (packed >> 4) & 0x0f, (packed >> 8) & 0x0f];
  }

  public setRGBBlockLight(x: number, y: number, z: number, r: number, g: number, b: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) return;
    const cr = Math.min(15, Math.max(0, r)) & 0x0f;
    const cg = Math.min(15, Math.max(0, g)) & 0x0f;
    const cb = Math.min(15, Math.max(0, b)) & 0x0f;
    const idx = this.getIndex(x, y, z);
    const sunBits = this.rgbLightData[idx] & 0xf000;
    this.rgbLightData[idx] = sunBits | cr | (cg << 4) | (cb << 8);
    const maxVal = Math.max(cr, cg, cb);
    this.lightData[idx] = (this.lightData[idx] & 0xf0) | maxVal;
  }

  public getSunlight(x: number, y: number, z: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) return 15;
    return (this.lightData[this.getIndex(x, y, z)] >> 4) & 0x0f;
  }

  public setSunlight(x: number, y: number, z: number, val: number): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) return;
    const clamped = Math.min(15, Math.max(0, val)) & 0x0f;
    const idx = this.getIndex(x, y, z);
    this.lightData[idx] = (this.lightData[idx] & 0x0f) | (clamped << 4);
    this.rgbLightData[idx] = (this.rgbLightData[idx] & 0x0fff) | (clamped << 12);
  }

  public getCombinedLightFactor(x: number, y: number, z: number, sunIntensity: number = 1.0): number {
    const sun = this.getSunlight(x, y, z) * sunIntensity;
    const block = this.getBlockLight(x, y, z);
    const maxVal = Math.max(sun, block);
    // Returns 0.08 (min cave ambient) to 1.0 (full brightness)
    return Math.min(1.0, 0.08 + (maxVal / 15.0) * 0.92);
  }

  /**
   * Returns per-channel RGB lighting multipliers for vertex coloring.
   * Preserves crisp daylight outdoors while tinting caves and night interiors
   * with colored torch, lava, Aether crystal, and bioluminescent glow.
   */
  public getRGBLightFactor(x: number, y: number, z: number, sunIntensity: number = 1.0): RGBLightSample {
    const cx = x < 0 ? 0 : x >= this.width ? this.width - 1 : x;
    const cy = y < 0 ? 0 : y >= this.height ? this.height - 1 : y;
    const cz = z < 0 ? 0 : z >= this.depth ? this.depth - 1 : z;

    const packed = this.rgbLightData[this.getIndex(cx, cy, cz)];
    const br = (packed & 0x0f) / 15.0;
    const bg = ((packed >> 4) & 0x0f) / 15.0;
    const bb = ((packed >> 8) & 0x0f) / 15.0;
    const sun = (((packed >> 12) & 0x0f) / 15.0) * sunIntensity;

    // Combine sunlight (neutral) with colored block light (slightly boosted for vibrancy)
    const r = Math.min(1.18, Math.max(0.16, Math.max(sun, br * 1.12) + br * 0.14));
    const g = Math.min(1.18, Math.max(0.16, Math.max(sun, bg * 1.12) + bg * 0.14));
    const b = Math.min(1.18, Math.max(0.16, Math.max(sun, bb * 1.12) + bb * 0.14));
    return { r, g, b };
  }

  /**
   * Returns quantized 12-bit key (3 bits R, 3 bits G, 3 bits B, 3 bits Sun) for greedy meshing equality checks.
   */
  public getQuantizedLightKey(x: number, y: number, z: number): number {
    const cx = x < 0 ? 0 : x >= this.width ? this.width - 1 : x;
    const cy = y < 0 ? 0 : y >= this.height ? this.height - 1 : y;
    const cz = z < 0 ? 0 : z >= this.depth ? this.depth - 1 : z;
    const packed = this.rgbLightData[this.getIndex(cx, cy, cz)];
    const qr = (packed >> 1) & 0x07;
    const qg = (packed >> 5) & 0x07;
    const qb = (packed >> 9) & 0x07;
    const qs = (packed >> 13) & 0x07;
    return qr | (qg << 3) | (qb << 6) | (qs << 9);
  }

  // Calculate full initial lighting for the chunk (Sunlight + 3D RGB Block Light BFS)
  public computeFullChunkLighting(): void {
    const w = this.width;
    const h = this.height;
    const d = this.depth;
    const strideY = w * d;

    // 1. Sunlight Top-Down Column Calculation + Emissive Source Discovery
    let qTail = 0;
    const maxQueue = this.bfsQueue.length;

    for (let x = 0; x < w; x++) {
      for (let z = 0; z < d; z++) {
        let currentSun = 15;
        for (let y = h - 1; y >= 0; y--) {
          const block = this.getBlock(x, y, z);
          const idx = x + z * w + y * strideY;
          if (block === BlockType.AIR) {
            this.lightData[idx] = (currentSun << 4);
            this.rgbLightData[idx] = (currentSun << 12);
          } else {
            const def = BLOCK_DEFS[block];
            if (def && def.transparent) {
              currentSun = currentSun > 0 ? currentSun - 1 : 0;
            } else {
              currentSun = 0;
            }

            if (def && def.lightEmission && def.lightEmission > 0) {
              const [er, eg, eb] = LightingEngine.getBlockEmissionRGB(block);
              const maxEm = Math.max(er, eg, eb);
              this.lightData[idx] = (currentSun << 4) | maxEm;
              this.rgbLightData[idx] = (currentSun << 12) | er | (eg << 4) | (eb << 8);
              if (qTail < maxQueue) {
                this.bfsQueue[qTail++] = (x & 0xff) | ((z & 0xff) << 8) | ((y & 0xff) << 16);
              }
            } else {
              this.lightData[idx] = (currentSun << 4);
              this.rgbLightData[idx] = (currentSun << 12);
            }
          }
        }
      }
    }

    // 2. Flood-Fill BFS Queue for 3-Channel RGB Block Light
    this.runRGBFloodFill(qTail);
  }

  private runRGBFloodFill(initialTail: number): void {
    const w = this.width;
    const h = this.height;
    const d = this.depth;
    const strideY = w * d;
    const maxQueue = this.bfsQueue.length;

    let head = 0;
    let tail = initialTail;

    while (head < tail) {
      const packedCoord = this.bfsQueue[head++];
      const cx = packedCoord & 0xff;
      const cz = (packedCoord >> 8) & 0xff;
      const cy = (packedCoord >> 16) & 0xff;

      const cIdx = cx + cz * w + cy * strideY;
      const cPacked = this.rgbLightData[cIdx];
      const cr = cPacked & 0x0f;
      const cg = (cPacked >> 4) & 0x0f;
      const cb = (cPacked >> 8) & 0x0f;

      const nr = cr > 1 ? cr - 1 : 0;
      const ng = cg > 1 ? cg - 1 : 0;
      const nb = cb > 1 ? cb - 1 : 0;
      if ((nr | ng | nb) === 0) continue;

      // 6 orthogonal neighbors
      for (let dir = 0; dir < 6; dir++) {
        const nx = cx + (dir === 0 ? 1 : dir === 1 ? -1 : 0);
        const ny = cy + (dir === 2 ? 1 : dir === 3 ? -1 : 0);
        const nz = cz + (dir === 4 ? 1 : dir === 5 ? -1 : 0);

        if (nx < 0 || nx >= w || ny < 0 || ny >= h || nz < 0 || nz >= d) continue;

        const nBlock = this.getBlock(nx, ny, nz);
        if (nBlock !== BlockType.AIR) {
          const nDef = BLOCK_DEFS[nBlock];
          if (!nDef || !nDef.transparent) continue;
        }

        const nIdx = nx + nz * w + ny * strideY;
        const nPacked = this.rgbLightData[nIdx];
        const or = nPacked & 0x0f;
        const og = (nPacked >> 4) & 0x0f;
        const ob = (nPacked >> 8) & 0x0f;

        if (nr > or || ng > og || nb > ob) {
          const fr = nr > or ? nr : or;
          const fg = ng > og ? ng : og;
          const fb = nb > ob ? nb : ob;
          const sunBits = nPacked & 0xf000;
          this.rgbLightData[nIdx] = sunBits | fr | (fg << 4) | (fb << 8);
          const maxVal = fr > fg ? (fr > fb ? fr : fb) : (fg > fb ? fg : fb);
          this.lightData[nIdx] = (this.lightData[nIdx] & 0xf0) | maxVal;

          if (tail < maxQueue) {
            this.bfsQueue[tail++] = (nx & 0xff) | ((nz & 0xff) << 8) | ((ny & 0xff) << 16);
          }
        }
      }
    }
  }

  // Fast Incremental Local Update on Single Block Place / Break
  public updateLocalBlockLight(lx: number, ly: number, lz: number, newBlock: BlockType): void {
    const [er, eg, eb] = LightingEngine.getBlockEmissionRGB(newBlock);
    if ((er | eg | eb) > 0) {
      this.setRGBBlockLight(lx, ly, lz, er, eg, eb);
      this.bfsQueue[0] = (lx & 0xff) | ((lz & 0xff) << 8) | ((ly & 0xff) << 16);
      this.runRGBFloodFill(1);
    }
  }
}
