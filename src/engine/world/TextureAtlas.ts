// Procedural 16x16 Pixel Texture Atlas Generator for Authentic Stylized 3D Voxels
import * as THREE from 'three';
import { BlockType } from '../../types';

export class TextureAtlas {
  public static atlasTexture: THREE.CanvasTexture | null = null;
  public static readonly ATLAS_COLS = 16;
  public static readonly ATLAS_ROWS = 16;
  public static readonly TILE_SIZE = 16;

  // Tile index coordinates in 16x16 atlas (column, row)
  public static readonly TILE_COORDS: Record<string, [number, number]> = {
    // Row 0: Natural Terrain & Core Blocks
    grass_top: [0, 0],
    grass_side: [1, 0],
    dirt: [2, 0],
    stone: [3, 0],
    cobblestone: [4, 0],
    sand: [5, 0],
    gravel: [6, 0],
    clay: [7, 0],
    snow: [8, 0],
    snow_side: [9, 0],
    ice: [10, 0],
    obsidian: [11, 0],
    basalt: [12, 0],
    magma_rock: [13, 0],
    moss_stone: [14, 0],
    coral_block: [15, 0],

    // Row 1: Wood, Logs & Foliage
    oak_log_side: [0, 1],
    oak_log_top: [1, 1],
    oak_leaves: [2, 1],
    pine_log_side: [3, 1],
    pine_log_top: [4, 1],
    pine_leaves: [5, 1],
    crystal_log_side: [6, 1],
    crystal_log_top: [7, 1],
    crystal_leaves: [8, 1],
    wood_planks: [9, 1],
    stone_bricks: [10, 1],
    stone_pillar_top: [11, 1],
    stone_pillar_side: [12, 1],
    glass: [13, 1],
    bookshelf: [14, 1],
    farmland: [15, 1],

    // Row 2: Ores & Minerals
    copper_ore: [0, 2],
    iron_ore: [1, 2],
    gold_ore: [2, 2],
    mythril_ore: [3, 2],
    aether_crystal_ore: [4, 2],
    coal_ore: [5, 2],
    copper_block: [6, 2],
    iron_block: [7, 2],
    gold_block: [8, 2],
    mythril_block: [9, 2],
    ancient_rune: [10, 2],
    water: [11, 2],
    lava: [12, 2],
    torch: [13, 2],
    lantern: [14, 2],
    glowstone: [15, 2],

    // Row 3: Vegetation, Flowers & Crops
    tall_grass: [0, 3],
    blue_flower: [1, 3],
    red_flower: [2, 3],
    sun_orchid: [3, 3],
    mushroom: [4, 3],
    wheat_stage0: [5, 3],
    wheat_stage1: [6, 3],
    wheat_stage2: [7, 3],
    wheat_stage3: [8, 3],
    crop_carrot: [9, 3],
    crop_herb: [10, 3],
    door_bottom: [11, 3],
    door_top: [12, 3],
    bed: [13, 3],
    anvil: [14, 3],
    farmland_moist: [15, 3],

    // Row 4: Containers & Utility Blocks
    crafting_bench_top: [0, 4],
    crafting_bench_side: [1, 4],
    furnace_front: [2, 4],
    furnace_side: [3, 4],
    chest_top: [4, 4],
    chest_side: [5, 4],
    aether_core: [6, 4],
    aether_core_advanced: [7, 4],
    ley_conduit: [8, 4],
    crystal_sensor: [9, 4],
    logic_rune: [10, 4],
    delay_rune: [11, 4],
    pulse_rune: [12, 4],
    latch_rune: [13, 4],
    aether_actuator: [14, 4],
    item_funnel: [15, 4],

    // Row 5: Engineering & Advanced Technology
    aether_storage_relay: [0, 5],
    ley_harvester: [1, 5],
    irrigation_node: [2, 5],
    resonance_fabricator: [3, 5],
    aether_sentinel_turret: [4, 5],
    aether_spike: [5, 5],
    shock_rune: [6, 5],
    flame_vent: [7, 5],
    aether_lamp: [8, 5],
    aether_rail: [9, 5],
    aether_rail_switch: [10, 5],
    ley_generator: [11, 5],

    // Row 15: Special System Fallback
    missing_texture: [15, 15],
  };

  public static getAtlasTexture(): THREE.CanvasTexture {
    if (this.atlasTexture) return this.atlasTexture;
    if (typeof document === 'undefined') return null as any;

    const width = this.ATLAS_COLS * this.TILE_SIZE;
    const height = this.ATLAS_ROWS * this.TILE_SIZE;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

    ctx.imageSmoothingEnabled = false;

    // Helper: draw 16x16 tile at (col, row)
    const drawTile = (col: number, row: number, renderFn: (c: CanvasRenderingContext2D, ox: number, oy: number) => void) => {
      const ox = col * this.TILE_SIZE;
      const oy = row * this.TILE_SIZE;
      ctx.save();
      renderFn(ctx, ox, oy);
      ctx.restore();
    };

    // Helper: set pixel at local (x, y)
    const setPx = (ox: number, oy: number, x: number, y: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(ox + x, oy + y, 1, 1);
    };

    // Helper: fill background tile
    const fillBg = (ox: number, oy: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(ox, oy, 16, 16);
    };

    // Procedural pixel tile designs:
    // 1. Dirt
    drawTile(2, 0, (c, ox, oy) => {
      fillBg(ox, oy, '#60422c');
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const r = Math.sin(x * 12.3 + y * 91.7) * 43758.5453;
          const noise = (r - Math.floor(r));
          if (noise > 0.75) setPx(ox, oy, x, y, '#4e3321');
          else if (noise < 0.2) setPx(ox, oy, x, y, '#704e35');
        }
      }
    });

    // 2. Grass Top
    drawTile(0, 0, (c, ox, oy) => {
      fillBg(ox, oy, '#4c8c36');
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const r = Math.sin(x * 37.1 + y * 53.9) * 23421.631;
          const noise = (r - Math.floor(r));
          if (noise > 0.8) setPx(ox, oy, x, y, '#3e752b');
          else if (noise < 0.25) setPx(ox, oy, x, y, '#5ba642');
        }
      }
    });

    // 3. Grass Side (Grass top + dirt bottom)
    drawTile(1, 0, (c, ox, oy) => {
      fillBg(ox, oy, '#60422c');
      // dirt noise
      for (let x = 0; x < 16; x++) {
        for (let y = 3; y < 16; y++) {
          const r = Math.sin(x * 12.3 + y * 91.7) * 43758.5453;
          if (r - Math.floor(r) > 0.75) setPx(ox, oy, x, y, '#4e3321');
        }
      }
      // grass hanging blades
      for (let x = 0; x < 16; x++) {
        const hang = 2 + Math.floor((Math.sin(x * 2.5) + 1) * 1.5);
        for (let y = 0; y <= hang; y++) {
          setPx(ox, oy, x, y, (x + y) % 2 === 0 ? '#4c8c36' : '#3e752b');
        }
      }
    });

    // 4. Stone
    drawTile(3, 0, (c, ox, oy) => {
      fillBg(ox, oy, '#787c82');
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const r = Math.sin(x * 17.3 + y * 29.1) * 12345.67;
          const noise = (r - Math.floor(r));
          if (noise > 0.82) setPx(ox, oy, x, y, '#62666c');
          else if (noise < 0.18) setPx(ox, oy, x, y, '#8c9096');
        }
      }
    });

    // 5. Cobblestone
    drawTile(4, 0, (c, ox, oy) => {
      fillBg(ox, oy, '#50545a');
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const isBorder = (x % 5 === 0 || y % 5 === 0);
          if (isBorder) setPx(ox, oy, x, y, '#383a3e');
          else setPx(ox, oy, x, y, (x + y) % 2 === 0 ? '#72767d' : '#82878e');
        }
      }
    });

    // 6. Sand
    drawTile(5, 0, (c, ox, oy) => {
      fillBg(ox, oy, '#dfc578');
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const r = Math.sin(x * 9.1 + y * 73.3) * 9876.54;
          if (r - Math.floor(r) > 0.8) setPx(ox, oy, x, y, '#cdb265');
        }
      }
    });

    // 7. Gravel
    drawTile(6, 0, (c, ox, oy) => {
      fillBg(ox, oy, '#6c6864');
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const r = Math.sin(x * 31.7 + y * 13.9) * 4567.89;
          const n = r - Math.floor(r);
          if (n > 0.7) setPx(ox, oy, x, y, '#54504c');
          else if (n < 0.25) setPx(ox, oy, x, y, '#86827e');
        }
      }
    });

    // 8. Clay
    drawTile(7, 0, (c, ox, oy) => {
      fillBg(ox, oy, '#969da8');
    });

    // 9. Oak Log Side
    drawTile(0, 1, (c, ox, oy) => {
      fillBg(ox, oy, '#5c4028');
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          if (x === 0 || x === 15 || x === 7 || x === 8) setPx(ox, oy, x, y, '#48301c');
          else if (x === 3 || x === 11) setPx(ox, oy, x, y, '#6e4f34');
        }
      }
    });

    // 10. Oak Log Top
    drawTile(1, 1, (c, ox, oy) => {
      fillBg(ox, oy, '#48301c');
      for (let x = 1; x < 15; x++) {
        for (let y = 1; y < 15; y++) {
          const dist = Math.sqrt((x - 7.5) * (x - 7.5) + (y - 7.5) * (y - 7.5));
          if (dist < 2.2) setPx(ox, oy, x, y, '#7d5c3f');
          else if (dist < 4.5) setPx(ox, oy, x, y, '#6b4d33');
          else if (dist < 6.8) setPx(ox, oy, x, y, '#5a3f28');
        }
      }
    });

    // 11. Oak Leaves
    drawTile(2, 1, (c, ox, oy) => {
      fillBg(ox, oy, '#326c26');
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          const r = Math.sin(x * 19.3 + y * 41.7) * 31415.92;
          const n = r - Math.floor(r);
          if (n > 0.8) setPx(ox, oy, x, y, '#224e18');
          else if (n < 0.3) setPx(ox, oy, x, y, '#488f36');
        }
      }
    });

    // 12. Pine Log Side
    drawTile(3, 1, (c, ox, oy) => {
      fillBg(ox, oy, '#3d281a');
      for (let x = 0; x < 16; x++) {
        if (x % 3 === 0) {
          for (let y = 0; y < 16; y++) setPx(ox, oy, x, y, '#2d1b10');
        }
      }
    });

    // 13. Pine Log Top
    drawTile(4, 1, (c, ox, oy) => {
      fillBg(ox, oy, '#2d1b10');
      for (let x = 2; x < 14; x++) {
        for (let y = 2; y < 14; y++) setPx(ox, oy, x, y, '#4a3322');
      }
    });

    // 14. Pine Leaves
    drawTile(5, 1, (c, ox, oy) => {
      fillBg(ox, oy, '#1e4834');
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if ((x + y) % 3 === 0) setPx(ox, oy, x, y, '#2a6348');
        }
      }
    });

    // 15. Crystal Log Side
    drawTile(6, 1, (c, ox, oy) => {
      fillBg(ox, oy, '#16384a');
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if (x === 4 || x === 11 || (x + y) % 6 === 0) setPx(ox, oy, x, y, '#38d1d8');
        }
      }
    });

    // 16. Crystal Leaves
    drawTile(7, 1, (c, ox, oy) => {
      fillBg(ox, oy, '#18829c');
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if ((x * y) % 5 === 0) setPx(ox, oy, x, y, '#5cedfc');
        }
      }
    });

    // 17. Wood Planks
    drawTile(0, 2, (c, ox, oy) => {
      fillBg(ox, oy, '#946d42');
      for (let y = 0; y < 16; y++) {
        if (y === 0 || y === 4 || y === 8 || y === 12) {
          for (let x = 0; x < 16; x++) setPx(ox, oy, x, y, '#70502e');
        }
      }
      for (let x = 0; x < 16; x += 8) {
        setPx(ox, oy, x, 2, '#70502e');
        setPx(ox, oy, x + 4, 6, '#70502e');
        setPx(ox, oy, x, 10, '#70502e');
        setPx(ox, oy, x + 4, 14, '#70502e');
      }
    });

    // 18. Stone Bricks
    drawTile(1, 2, (c, ox, oy) => {
      fillBg(ox, oy, '#757980');
      for (let y = 0; y < 16; y += 4) {
        for (let x = 0; x < 16; x++) setPx(ox, oy, x, y, '#4b4d52');
      }
      for (let y = 0; y < 16; y += 8) {
        setPx(ox, oy, 7, y + 1, '#4b4d52');
        setPx(ox, oy, 7, y + 2, '#4b4d52');
        setPx(ox, oy, 7, y + 3, '#4b4d52');
        setPx(ox, oy, 15, y + 5, '#4b4d52');
        setPx(ox, oy, 15, y + 6, '#4b4d52');
        setPx(ox, oy, 15, y + 7, '#4b4d52');
      }
    });

    // 19. Glass
    drawTile(2, 2, (c, ox, oy) => {
      c.clearRect(ox, oy, 16, 16);
      ctx.fillStyle = 'rgba(210, 240, 255, 0.45)';
      ctx.fillRect(ox, oy, 16, 16);
      // Border frame
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.strokeRect(ox + 0.5, oy + 0.5, 15, 15);
      // Glint streak
      setPx(ox, oy, 3, 3, '#ffffff');
      setPx(ox, oy, 4, 3, '#ffffff');
      setPx(ox, oy, 3, 4, '#ffffff');
    });

    // 20. Copper Ore
    drawTile(3, 2, (c, ox, oy) => {
      fillBg(ox, oy, '#787c82');
      const specks = [[3, 4], [4, 4], [4, 5], [10, 8], [11, 8], [10, 9], [7, 12], [8, 12]];
      for (const [x, y] of specks) setPx(ox, oy, x, y, '#e07646');
    });

    // 21. Iron Ore
    drawTile(4, 2, (c, ox, oy) => {
      fillBg(ox, oy, '#787c82');
      const specks = [[4, 3], [5, 3], [5, 4], [11, 7], [12, 7], [11, 8], [6, 11], [7, 11]];
      for (const [x, y] of specks) setPx(ox, oy, x, y, '#d4a885');
    });

    // 22. Gold Ore
    drawTile(5, 2, (c, ox, oy) => {
      fillBg(ox, oy, '#787c82');
      const specks = [[3, 3], [4, 3], [10, 6], [11, 6], [7, 10], [8, 10], [12, 12]];
      for (const [x, y] of specks) setPx(ox, oy, x, y, '#f6c938');
    });

    // 23. Mythril Ore
    drawTile(6, 2, (c, ox, oy) => {
      fillBg(ox, oy, '#787c82');
      const specks = [[3, 3], [4, 3], [4, 4], [10, 7], [11, 7], [8, 11], [9, 11]];
      for (const [x, y] of specks) setPx(ox, oy, x, y, '#38bdf8');
    });

    // 24. Aether Crystal Ore
    drawTile(7, 2, (c, ox, oy) => {
      fillBg(ox, oy, '#4a4855');
      const specks = [[4, 4], [5, 4], [5, 5], [10, 8], [11, 8], [7, 12]];
      for (const [x, y] of specks) setPx(ox, oy, x, y, '#c084fc');
    });

    // 25. Coal Ore
    drawTile(0, 3, (c, ox, oy) => {
      fillBg(ox, oy, '#787c82');
      const specks = [[3, 4], [4, 4], [4, 5], [10, 8], [11, 8], [6, 12], [7, 12]];
      for (const [x, y] of specks) setPx(ox, oy, x, y, '#232428');
    });

    // 26. Water
    drawTile(1, 3, (c, ox, oy) => {
      fillBg(ox, oy, '#246cb8');
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if ((x + y) % 4 === 0) setPx(ox, oy, x, y, '#388ee8');
        }
      }
    });

    // 27. Lava
    drawTile(2, 3, (c, ox, oy) => {
      fillBg(ox, oy, '#e24816');
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if ((x * y) % 7 === 0) setPx(ox, oy, x, y, '#fca224');
        }
      }
    });

    // 28. Glowstone Crystal
    drawTile(5, 3, (c, ox, oy) => {
      fillBg(ox, oy, '#fde047');
      for (let x = 0; x < 16; x++) {
        for (let y = 0; y < 16; y++) {
          if ((x + y) % 3 === 0) setPx(ox, oy, x, y, '#facc15');
        }
      }
    });

    // 29. Flowers & Grass foliage
    drawTile(7, 3, (c, ox, oy) => {
      // Blue flower
      c.clearRect(ox, oy, 16, 16);
      for (let y = 6; y < 16; y++) setPx(ox, oy, 8, y, '#38782a');
      setPx(ox, oy, 8, 4, '#38bdf8');
      setPx(ox, oy, 7, 5, '#38bdf8');
      setPx(ox, oy, 9, 5, '#38bdf8');
      setPx(ox, oy, 8, 6, '#38bdf8');
      setPx(ox, oy, 8, 5, '#fde047');
    });

    // 30. Crafting Bench Top & Side
    drawTile(2, 5, (c, ox, oy) => {
      fillBg(ox, oy, '#a4784a');
      ctx.fillStyle = '#654321';
      ctx.strokeRect(ox + 1.5, oy + 1.5, 13, 13);
      // 3x3 grid
      for (let i = 5; i <= 11; i += 3) {
        ctx.fillRect(ox + i, oy + 2, 1, 12);
        ctx.fillRect(ox + 2, oy + i, 12, 1);
      }
    });

    drawTile(3, 5, (c, ox, oy) => {
      fillBg(ox, oy, '#855d36');
      // Hammer / saw silhouette
      setPx(ox, oy, 4, 5, '#3a3a3a');
      setPx(ox, oy, 5, 6, '#3a3a3a');
      setPx(ox, oy, 6, 7, '#d4a885');
    });

    // 31. Furnace Front
    drawTile(4, 5, (c, ox, oy) => {
      fillBg(ox, oy, '#60646a');
      ctx.fillStyle = '#222326';
      ctx.fillRect(ox + 4, oy + 7, 8, 7);
      ctx.fillStyle = '#ff7315';
      ctx.fillRect(ox + 6, oy + 9, 4, 3);
    });

    // 32. Missing Texture Checkerboard (15, 15)
    drawTile(15, 15, (c, ox, oy) => {
      fillBg(ox, oy, '#ff00ff');
      ctx.fillStyle = '#000000';
      for (let x = 0; x < 16; x += 4) {
        for (let y = 0; y < 16; y += 4) {
          if (((x / 4) + (y / 4)) % 2 === 0) {
            ctx.fillRect(ox + x, oy + y, 4, 4);
          }
        }
      }
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;

    this.atlasTexture = texture;
    return texture;
  }

  // Get UV rectangle coordinates [uMin, vMin, uMax, vMax] for a given tile
  public static getUVs(tileName: string): [number, number, number, number] {
    let coords = this.TILE_COORDS[tileName];
    if (!coords) {
      if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
        console.warn(`[TextureAtlas] Unknown tileName '${tileName}', using missing_texture tile.`);
      }
      coords = this.TILE_COORDS['missing_texture'] || [15, 15];
    }
    const tileW = 1.0 / this.ATLAS_COLS;
    const tileH = 1.0 / this.ATLAS_ROWS;
    // Half-texel padding inset to prevent neighbor tile bleeding
    const padX = 0.5 / (this.ATLAS_COLS * this.TILE_SIZE);
    const padY = 0.5 / (this.ATLAS_ROWS * this.TILE_SIZE);

    const uMin = coords[0] * tileW + padX;
    const vMin = 1.0 - (coords[1] + 1) * tileH + padY;
    const uMax = (coords[0] + 1) * tileW - padX;
    const vMax = 1.0 - coords[1] * tileH - padY;
    return [uMin, vMin, uMax, vMax];
  }

  // Resolve tile name for a given block and face normal
  public static getTileForBlock(block: BlockType, face: 'top' | 'bottom' | 'side'): string {
    switch (block) {
      case BlockType.AIR:
        return 'missing_texture';
      case BlockType.GRASS:
        if (face === 'top') return 'grass_top';
        if (face === 'bottom') return 'dirt';
        return 'grass_side';
      case BlockType.SNOW:
        if (face === 'top') return 'snow';
        if (face === 'bottom') return 'dirt';
        return 'snow_side';
      case BlockType.ICE:
        return 'ice';
      case BlockType.DIRT:
        return 'dirt';
      case BlockType.STONE:
        return 'stone';
      case BlockType.COBBLESTONE:
        return 'cobblestone';
      case BlockType.SAND:
        return 'sand';
      case BlockType.GRAVEL:
        return 'gravel';
      case BlockType.CLAY:
        return 'clay';
      case BlockType.OBSIDIAN:
        return 'obsidian';
      case BlockType.BASALT:
        return 'basalt';
      case BlockType.MAGMA_ROCK:
        return 'magma_rock';
      case BlockType.MOSS_STONE:
        return 'moss_stone';
      case BlockType.CORAL_BLOCK:
        return 'coral_block';

      case BlockType.OAK_LOG:
        return face === 'side' ? 'oak_log_side' : 'oak_log_top';
      case BlockType.OAK_LEAVES:
        return 'oak_leaves';
      case BlockType.PINE_LOG:
        return face === 'side' ? 'pine_log_side' : 'pine_log_top';
      case BlockType.PINE_LEAVES:
        return 'pine_leaves';
      case BlockType.CYAN_CRYSTAL_LOG:
        return face === 'side' ? 'crystal_log_side' : 'crystal_log_top';
      case BlockType.CYAN_CRYSTAL_LEAVES:
        return 'crystal_leaves';
      case BlockType.WOOD_PLANKS:
      case BlockType.WOOD_STAIRS:
      case BlockType.WOOD_SLAB:
      case BlockType.FENCE_WOOD:
        return 'wood_planks';
      case BlockType.STONE_BRICKS:
      case BlockType.STONE_STAIRS:
      case BlockType.STONE_SLAB:
        return 'stone_bricks';
      case BlockType.STONE_PILLAR:
        return face === 'side' ? 'stone_pillar_side' : 'stone_pillar_top';
      case BlockType.GLASS:
        return 'glass';
      case BlockType.BOOKSHELF:
        return face === 'side' ? 'bookshelf' : 'wood_planks';
      case BlockType.FARMLAND:
        return face === 'top' ? 'farmland' : 'dirt';

      case BlockType.COPPER_ORE:
        return 'copper_ore';
      case BlockType.IRON_ORE:
        return 'iron_ore';
      case BlockType.GOLD_ORE:
        return 'gold_ore';
      case BlockType.MYTHRIL_ORE:
        return 'mythril_ore';
      case BlockType.AETHER_CRYSTAL_ORE:
        return 'aether_crystal_ore';
      case BlockType.COAL_ORE:
        return 'coal_ore';
      case BlockType.COPPER_BLOCK:
        return 'copper_block';
      case BlockType.IRON_BLOCK:
        return 'iron_block';
      case BlockType.GOLD_BLOCK:
        return 'gold_block';
      case BlockType.MYTHRIL_BLOCK:
        return 'mythril_block';
      case BlockType.ANCIENT_RUNE_STONE:
        return 'ancient_rune';
      case BlockType.WATER:
        return 'water';
      case BlockType.LAVA:
        return 'lava';
      case BlockType.TORCH:
        return 'torch';
      case BlockType.LANTERN:
        return 'lantern';
      case BlockType.GLOWSTONE_CRYSTAL:
        return 'glowstone';

      case BlockType.TALL_GRASS:
        return 'tall_grass';
      case BlockType.BLUE_FLOWER:
        return 'blue_flower';
      case BlockType.RED_FLOWER:
        return 'red_flower';
      case BlockType.SUN_ORCHID:
        return 'sun_orchid';
      case BlockType.LUMINESCENT_MUSHROOM:
        return 'mushroom';
      case BlockType.CROP_WHEAT_0:
        return 'wheat_stage0';
      case BlockType.CROP_WHEAT_1:
        return 'wheat_stage1';
      case BlockType.CROP_WHEAT_2:
        return 'wheat_stage2';
      case BlockType.CROP_WHEAT_3:
        return 'wheat_stage3';
      case BlockType.CROP_CARROT:
        return 'crop_carrot';
      case BlockType.CROP_HERB:
        return 'crop_herb';
      case BlockType.DOOR_BOTTOM:
        return 'door_bottom';
      case BlockType.DOOR_TOP:
        return 'door_top';
      case BlockType.BED_FOOT:
      case BlockType.BED_HEAD:
        return 'bed';
      case BlockType.ANVIL_SMITHING:
        return 'anvil';

      case BlockType.CRAFTING_BENCH:
        if (face === 'top') return 'crafting_bench_top';
        if (face === 'bottom') return 'wood_planks';
        return 'crafting_bench_side';
      case BlockType.FURNACE:
        if (face === 'top' || face === 'bottom') return 'stone';
        return 'furnace_front';
      case BlockType.CHEST:
        if (face === 'top') return 'chest_top';
        return 'chest_side';

      case BlockType.AETHER_CORE:
        return 'aether_core';
      case BlockType.AETHER_CORE_ADVANCED:
        return 'aether_core_advanced';
      case BlockType.LEY_CONDUIT:
        return 'ley_conduit';
      case BlockType.CRYSTAL_SENSOR:
        return 'crystal_sensor';
      case BlockType.LOGIC_RUNE:
        return 'logic_rune';
      case BlockType.DELAY_RUNE:
        return 'delay_rune';
      case BlockType.PULSE_RUNE:
        return 'pulse_rune';
      case BlockType.LATCH_RUNE:
        return 'latch_rune';
      case BlockType.AETHER_ACTUATOR:
        return 'aether_actuator';
      case BlockType.ITEM_FUNNEL:
        return 'item_funnel';
      case BlockType.AETHER_STORAGE_RELAY:
        return 'aether_storage_relay';
      case BlockType.LEY_HARVESTER:
        return 'ley_harvester';
      case BlockType.IRRIGATION_NODE:
        return 'irrigation_node';
      case BlockType.RESONANCE_FABRICATOR:
        return 'resonance_fabricator';
      case BlockType.AETHER_SENTINEL_TURRET:
        return 'aether_sentinel_turret';
      case BlockType.AETHER_SPIKE:
        return 'aether_spike';
      case BlockType.SHOCK_RUNE:
        return 'shock_rune';
      case BlockType.FLAME_VENT:
        return 'flame_vent';
      case BlockType.AETHER_LAMP:
        return 'aether_lamp';
      case BlockType.AETHER_RAIL:
        return 'aether_rail';
      case BlockType.AETHER_RAIL_SWITCH:
        return 'aether_rail_switch';
      case BlockType.LEY_GENERATOR:
        return 'ley_generator';

      default:
        if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
          console.warn(`[TextureAtlas] Missing texture mapping for BlockType.${BlockType[block] || block}`);
        }
        return 'missing_texture';
    }
  }
}
