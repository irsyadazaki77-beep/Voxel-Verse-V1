// Nusantara Modular Architecture Kit 1.0
// Procedural modular building families for 7 cultural regions & rare Aether-infused megastructures
import { BlockType } from '../../types';
import { VoxelBlockPlacement } from './StructureGenerator';

export class NusantaraBuildingKit {

  // ==========================================
  // 1. TANAH MINANG BUILDING FAMILY
  // ==========================================

  /**
   * Rumah Gadang - Curved gonjong roof, teak posts, carved beams, wooden shutters, woven gedek & batik accents
   */
  public static generateRumahGadang(isGrand: boolean = false): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    const halfLen = isGrand ? 8 : 5;
    const width = 3; // z from -3 to 3

    // 1. Foundation stilts on stone umpak
    for (let x = -halfLen; x <= halfLen; x += 2) {
      for (let z = -width; z <= width; z += 2) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.STONE_ALANG_PILLAR });
        blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.TEAK_WOOD_LOG });
        blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.TEAK_WOOD_LOG });
      }
    }

    // 2. Elevated Main Floor & Veranda Deck
    for (let x = -halfLen - 1; x <= halfLen + 1; x++) {
      for (let z = -width; z <= width; z++) {
        blocks.push({ dx: x, dy: 3, dz: z, block: BlockType.TEAK_WOOD_PLANKS });
        // Batik carpet in central anjuang
        if (Math.abs(x) <= 2 && Math.abs(z) <= 1) {
          blocks.push({ dx: x, dy: 4, dz: z, block: BlockType.BATIK_CARPET_BLOCK });
        }
      }
    }

    // 3. Front Ladder Entry (tangga)
    blocks.push({ dx: 0, dy: 1, dz: width + 2, block: BlockType.WOOD_STAIRS });
    blocks.push({ dx: 0, dy: 2, dz: width + 1, block: BlockType.WOOD_STAIRS });

    // 4. Carved Timber Walls & Shutters (y = 4 to 6)
    for (let y = 4; y <= 6; y++) {
      for (let x = -halfLen; x <= halfLen; x++) {
        // Back wall
        blocks.push({
          dx: x,
          dy: y,
          dz: -width,
          block: y === 5 ? BlockType.WOVEN_BAMBOO_GEDEK : BlockType.TEAK_WOOD_PLANKS,
        });
        // Front wall with door and shutters
        if (x === 0 && (y === 4 || y === 5)) {
          blocks.push({ dx: x, dy: y, dz: width, block: BlockType.AIR });
        } else if (Math.abs(x) % 2 === 1 && y === 5) {
          blocks.push({ dx: x, dy: y, dz: width, block: BlockType.WOODEN_SHUTTER });
        } else {
          blocks.push({
            dx: x,
            dy: y,
            dz: width,
            block: y === 4 ? BlockType.CARVED_WOOD_BEAM : BlockType.TEAK_WOOD_PLANKS,
          });
        }
      }
      // Side walls (Anjuang elevated wings)
      for (let z = -width + 1; z < width; z++) {
        blocks.push({ dx: -halfLen, dy: y, dz: z, block: BlockType.TEAK_WOOD_PLANKS });
        blocks.push({ dx: halfLen, dy: y, dz: z, block: BlockType.TEAK_WOOD_PLANKS });
      }
    }

    // 5. Interior Furnishing & Lanterns
    blocks.push({ dx: -halfLen + 1, dy: 4, dz: -width + 1, block: BlockType.RICE_STORAGE_CHEST });
    blocks.push({ dx: halfLen - 1, dy: 4, dz: -width + 1, block: BlockType.CHEST });
    blocks.push({ dx: 0, dy: 6, dz: 0, block: BlockType.AETHER_LANTERN });
    blocks.push({ dx: -Math.floor(halfLen / 2), dy: 6, dz: 0, block: BlockType.LANTERN });
    blocks.push({ dx: Math.floor(halfLen / 2), dy: 6, dz: 0, block: BlockType.LANTERN });

    // 6. Iconic Gonjong Curved Horn Roof
    // Sweeping up sharply at both ends like water buffalo horns
    for (let x = -halfLen - 2; x <= halfLen + 2; x++) {
      const distFromCenter = Math.abs(x);
      // Gonjong curve formula: quadratic sweep at ends
      const gonjongRise = distFromCenter >= halfLen - 1 ? Math.floor(Math.pow(distFromCenter - (halfLen - 2), 1.8)) : 0;

      for (let z = -width - 1; z <= width + 1; z++) {
        const roofDistZ = Math.abs(z);
        const y = 7 + gonjongRise + (width + 1 - roofDistZ);

        if (roofDistZ === width + 1 || roofDistZ === width) {
          blocks.push({ dx: x, dy: y, dz: z, block: BlockType.IJUK_THATCH_ROOF });
        } else {
          blocks.push({ dx: x, dy: y, dz: z, block: BlockType.IJUK_THATCH_ROOF });
        }
      }
    }

    // Pinnacles / Horn tips (tanduk gonjong)
    blocks.push({ dx: -halfLen - 2, dy: 11 + (isGrand ? 2 : 0), dz: 0, block: BlockType.CARVED_WOOD_BEAM });
    blocks.push({ dx: halfLen + 2, dy: 11 + (isGrand ? 2 : 0), dz: 0, block: BlockType.CARVED_WOOD_BEAM });

    return blocks;
  }

  /**
   * Surau Minang - Communal wooden pavilion on stilts, tiered hipped roof, open prayer area & water basin
   */
  public static generateSurau(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    const size = 4;

    // Foundation pillars
    for (let x = -size; x <= size; x += 2) {
      for (let z = -size; z <= size; z += 2) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.STONE_ALANG_PILLAR });
        blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.TEAK_WOOD_LOG });
      }
    }

    // Teak floor platform
    for (let x = -size; x <= size; x++) {
      for (let z = -size; z <= size; z++) {
        blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.TEAK_WOOD_PLANKS });
        if (Math.abs(x) <= size - 1 && Math.abs(z) <= size - 1) {
          blocks.push({ dx: x, dy: 3, dz: z, block: BlockType.BATIK_CARPET_BLOCK });
        }
      }
    }

    // Open columns & low carved railings
    for (let x = -size; x <= size; x += 2) {
      for (let z = -size; z <= size; z += 2) {
        for (let y = 3; y <= 5; y++) {
          blocks.push({ dx: x, dy: y, dz: z, block: BlockType.TEAK_WOOD_LOG });
        }
      }
    }
    // Low bamboo fence perimeter
    for (let x = -size; x <= size; x++) {
      if (Math.abs(x) > 1) {
        blocks.push({ dx: x, dy: 3, dz: -size, block: BlockType.BAMBOO_FENCE });
        blocks.push({ dx: x, dy: 3, dz: size, block: BlockType.BAMBOO_FENCE });
      }
    }

    // Tiered hipped roof
    for (let layer = 0; layer < 4; layer++) {
      const r = size + 1 - layer;
      const y = 6 + layer;
      for (let x = -r; x <= r; x++) {
        for (let z = -r; z <= r; z++) {
          if (Math.abs(x) === r || Math.abs(z) === r) {
            blocks.push({ dx: x, dy: y, dz: z, block: BlockType.IJUK_THATCH_ROOF });
          }
        }
      }
    }
    // Finial & Aether Lantern
    blocks.push({ dx: 0, dy: 10, dz: 0, block: BlockType.CARVED_ANDESITE_STONE });
    blocks.push({ dx: 0, dy: 5, dz: 0, block: BlockType.AETHER_LANTERN });

    // Water basin (kolam wudhu) at side
    blocks.push({ dx: size + 2, dy: 0, dz: 0, block: BlockType.COBBLESTONE });
    blocks.push({ dx: size + 2, dy: 1, dz: 0, block: BlockType.TERRACE_WATERWAY });
    blocks.push({ dx: size + 2, dy: 1, dz: 1, block: BlockType.WATER });

    return blocks;
  }

  /**
   * Rangkiang (Lumbung Minang) - Elevated granary on 4 round pest-guarded disc pillars, high gonjong roof
   */
  public static generateRangkiang(type: 'si_bayau_bayau' | 'sitinjau_lauik' = 'si_bayau_bayau'): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];

    // 4 disc-guarded stilts
    for (let x = -1; x <= 1; x += 2) {
      for (let z = -1; z <= 1; z += 2) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.STONE_ALANG_PILLAR });
        blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.TEAK_WOOD_LOG });
        blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.STONE_ALANG_PILLAR }); // Pest disc guard
      }
    }

    // Granary chamber
    for (let y = 3; y <= 5; y++) {
      const expand = y === 4 ? 2 : 1;
      for (let x = -expand; x <= expand; x++) {
        for (let z = -expand; z <= expand; z++) {
          if (y === 3) {
            blocks.push({ dx: x, dy: y, dz: z, block: BlockType.TEAK_WOOD_PLANKS });
          } else if (Math.abs(x) === expand || Math.abs(z) === expand) {
            blocks.push({ dx: x, dy: y, dz: z, block: BlockType.CARVED_WOOD_BEAM });
          }
        }
      }
    }
    // Inside storage
    blocks.push({ dx: 0, dy: 4, dz: 0, block: BlockType.RICE_STORAGE_CHEST });

    // Steep gonjong roof
    for (let x = -3; x <= 3; x++) {
      const dist = Math.abs(x);
      const sweep = dist >= 2 ? dist : 0;
      for (let z = -2; z <= 2; z++) {
        const y = 6 + sweep + (2 - Math.abs(z));
        blocks.push({ dx: x, dy: y, dz: z, block: BlockType.IJUK_THATCH_ROOF });
      }
    }
    blocks.push({ dx: -3, dy: 9, dz: 0, block: BlockType.CARVED_WOOD_BEAM });
    blocks.push({ dx: 3, dy: 9, dz: 0, block: BlockType.CARVED_WOOD_BEAM });

    return blocks;
  }

  // ==========================================
  // 2. TANAH JAWA BUILDING FAMILY
  // ==========================================

  /**
   * Rumah Joglo - 4 Soko Guru carved teak pillars, tiered pyramidal terracotta roof, open front veranda
   */
  public static generateJoglo(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    const size = 5;

    // 1. Plinth Foundation (Umpak)
    for (let x = -size; x <= size; x++) {
      for (let z = -size; z <= size; z++) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.CARVED_ANDESITE_STONE });
        blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.TEAK_WOOD_PLANKS });
      }
    }

    // 2. Soko Guru (4 central sacred columns)
    const sokoPositions = [
      [-2, -1], [2, -1],
      [-2, -3], [2, -3]
    ];
    for (const [sx, sz] of sokoPositions) {
      blocks.push({ dx: sx, dy: 1, dz: sz, block: BlockType.STONE_ALANG_PILLAR });
      for (let y = 2; y <= 6; y++) {
        blocks.push({ dx: sx, dy: y, dz: sz, block: BlockType.TEAK_WOOD_LOG });
      }
      blocks.push({ dx: sx, dy: 6, dz: sz, block: BlockType.CARVED_WOOD_BEAM });
    }

    // 3. Perimeter Columns & Gebyok Carved Partition
    for (let x = -size; x <= size; x += 2) {
      blocks.push({ dx: x, dy: 2, dz: -size, block: BlockType.TEAK_WOOD_LOG });
      blocks.push({ dx: x, dy: 2, dz: size, block: BlockType.TEAK_WOOD_LOG });
    }
    for (let z = -size; z <= size; z += 2) {
      blocks.push({ dx: -size, dy: 2, dz: z, block: BlockType.TEAK_WOOD_LOG });
      blocks.push({ dx: size, dy: 2, dz: z, block: BlockType.TEAK_WOOD_LOG });
    }

    // Rear living quarters (dalem) walls with woven gedek
    for (let y = 2; y <= 4; y++) {
      for (let x = -size + 1; x <= size - 1; x++) {
        blocks.push({ dx: x, dy: y, dz: -size, block: BlockType.WOVEN_BAMBOO_GEDEK });
        // Gebyok middle partition separating pendopo and dalem
        blocks.push({ dx: x, dy: y, dz: 0, block: x === 0 && y < 4 ? BlockType.AIR : BlockType.CARVED_WOOD_BEAM });
      }
      for (let z = -size; z <= 0; z++) {
        blocks.push({ dx: -size, dy: y, dz: z, block: BlockType.WOVEN_BAMBOO_GEDEK });
        blocks.push({ dx: size, dy: y, dz: z, block: BlockType.WOVEN_BAMBOO_GEDEK });
      }
    }

    // Front veranda (pendopo) open space with batik mats
    for (let x = -2; x <= 2; x++) {
      for (let z = 1; z <= 4; z++) {
        blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.BATIK_CARPET_BLOCK });
      }
    }

    // 4. Tiered Pyramidal Joglo Roof (Genteng Tanah Liat)
    // Lower gentle overhang eaves
    for (let x = -size - 1; x <= size + 1; x++) {
      for (let z = -size - 1; z <= size + 1; z++) {
        if (Math.abs(x) >= size || Math.abs(z) >= size) {
          blocks.push({ dx: x, dy: 5, dz: z, block: BlockType.TERRACOTTA_ROOF_TILE });
        }
      }
    }
    // Mid tier
    for (let x = -size + 1; x <= size - 1; x++) {
      for (let z = -size + 1; z <= size - 1; z++) {
        if (Math.abs(x) >= size - 2 || Math.abs(z) >= size - 2) {
          blocks.push({ dx: x, dy: 6, dz: z, block: BlockType.TERRACOTTA_ROOF_TILE });
        }
      }
    }
    // High central steep pyramid (Brunjung) above Soko Guru
    for (let step = 0; step < 3; step++) {
      const rx = 3 - step;
      const rz = 2 - Math.floor(step / 2);
      const y = 7 + step;
      for (let x = -rx; x <= rx; x++) {
        for (let z = -rz - 2; z <= rz; z++) {
          blocks.push({ dx: x, dy: y, dz: z, block: BlockType.TERRACOTTA_ROOF_TILE });
        }
      }
    }
    // Pinnacle ridge & lantern
    blocks.push({ dx: 0, dy: 10, dz: -1, block: BlockType.TERRACOTTA_ROOF_TILE });
    blocks.push({ dx: 0, dy: 4, dz: 2, block: BlockType.LANTERN });
    blocks.push({ dx: 0, dy: 5, dz: -2, block: BlockType.AETHER_LANTERN });

    return blocks;
  }

  /**
   * Limasan Jawa - Elongated 5-ridged residential house with gedek walls
   */
  public static generateLimasan(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    const len = 5;
    const width = 3;

    // Foundation
    for (let x = -len; x <= len; x++) {
      for (let z = -width; z <= width; z++) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.COBBLESTONE });
        blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.TEAK_WOOD_PLANKS });
      }
    }

    // Walls with woven gedek
    for (let y = 2; y <= 4; y++) {
      for (let x = -len; x <= len; x++) {
        blocks.push({ dx: x, dy: y, dz: -width, block: BlockType.WOVEN_BAMBOO_GEDEK });
        if (x === 0 && y <= 3) {
          blocks.push({ dx: x, dy: y, dz: width, block: BlockType.AIR });
        } else if (Math.abs(x) === 2 && y === 3) {
          blocks.push({ dx: x, dy: y, dz: width, block: BlockType.WOODEN_SHUTTER });
        } else {
          blocks.push({ dx: x, dy: y, dz: width, block: BlockType.WOVEN_BAMBOO_GEDEK });
        }
      }
      for (let z = -width; z <= width; z++) {
        blocks.push({ dx: -len, dy: y, dz: z, block: BlockType.WOVEN_BAMBOO_GEDEK });
        blocks.push({ dx: len, dy: y, dz: z, block: BlockType.WOVEN_BAMBOO_GEDEK });
      }
    }

    // Limasan Trapezoid Hip Roof
    for (let y = 0; y <= 3; y++) {
      const rx = len + 1 - y;
      const rz = width + 1 - y;
      for (let x = -rx; x <= rx; x++) {
        for (let z = -rz; z <= rz; z++) {
          if (Math.abs(x) === rx || Math.abs(z) === rz || y === 3) {
            blocks.push({ dx: x, dy: 5 + y, dz: z, block: BlockType.TERRACOTTA_ROOF_TILE });
          }
        }
      }
    }
    blocks.push({ dx: 0, dy: 3, dz: 0, block: BlockType.LANTERN });
    blocks.push({ dx: -len + 1, dy: 2, dz: -width + 1, block: BlockType.RICE_STORAGE_CHEST });

    return blocks;
  }

  /**
   * Pendopo Jawa - Open pavilion with raised carved stone base and 12 teak columns
   */
  public static generatePendopo(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    const size = 6;

    // Raised stone podium
    for (let x = -size; x <= size; x++) {
      for (let z = -size; z <= size; z++) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.CARVED_ANDESITE_STONE });
        blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.CARVED_ANDESITE_STONE });
      }
    }

    // Perimeter pillars
    for (let x = -size + 1; x <= size - 1; x += 3) {
      for (let z = -size + 1; z <= size - 1; z += 3) {
        blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.STONE_ALANG_PILLAR });
        for (let y = 3; y <= 6; y++) {
          blocks.push({ dx: x, dy: y, dz: z, block: BlockType.TEAK_WOOD_LOG });
        }
      }
    }

    // Wide pyramid roof
    for (let layer = 0; layer < 4; layer++) {
      const r = size + 1 - layer;
      const y = 7 + layer;
      for (let x = -r; x <= r; x++) {
        for (let z = -r; z <= r; z++) {
          if (Math.abs(x) === r || Math.abs(z) === r || layer >= 3) {
            blocks.push({ dx: x, dy: y, dz: z, block: BlockType.TERRACOTTA_ROOF_TILE });
          }
        }
      }
    }
    blocks.push({ dx: 0, dy: 6, dz: 0, block: BlockType.AETHER_LANTERN });

    return blocks;
  }

  /**
   * Pasar Tradisional - Village bazaar stalls with awnings and trade chests
   */
  public static generatePasarTradisional(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];

    // Gravel plaza
    for (let x = -5; x <= 5; x++) {
      for (let z = -4; z <= 4; z++) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.GRAVEL });
      }
    }

    // 4 Market Stalls
    const stallOffsets = [[-3, -2], [3, -2], [-3, 2], [3, 2]];
    for (const [ox, oz] of stallOffsets) {
      // Counter table
      blocks.push({ dx: ox - 1, dy: 1, dz: oz, block: BlockType.WOOD_SLAB });
      blocks.push({ dx: ox, dy: 1, dz: oz, block: BlockType.WOOD_PLANKS });
      blocks.push({ dx: ox + 1, dy: 1, dz: oz, block: BlockType.WOOD_SLAB });
      blocks.push({ dx: ox, dy: 1, dz: oz + 1, block: BlockType.CHEST });

      // Awning posts
      blocks.push({ dx: ox - 1, dy: 1, dz: oz - 1, block: BlockType.BAMBOO_FENCE });
      blocks.push({ dx: ox - 1, dy: 2, dz: oz - 1, block: BlockType.BAMBOO_FENCE });
      blocks.push({ dx: ox + 1, dy: 1, dz: oz - 1, block: BlockType.BAMBOO_FENCE });
      blocks.push({ dx: ox + 1, dy: 2, dz: oz - 1, block: BlockType.BAMBOO_FENCE });

      // Bamboo gedek awning
      for (let ax = -1; ax <= 1; ax++) {
        for (let az = -1; az <= 1; az++) {
          blocks.push({ dx: ox + ax, dy: 3, dz: oz + az, block: BlockType.WOVEN_BAMBOO_GEDEK });
        }
      }
      blocks.push({ dx: ox, dy: 2, dz: oz, block: BlockType.LANTERN });
    }

    return blocks;
  }

  /**
   * Gapura Majapahit - Red volcanic brick paduraksa gate
   */
  public static generateGapuraMajapahit(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];

    // Left and Right gateway pillars
    for (const side of [-2, 2]) {
      for (let x = side - 1; x <= side + 1; x++) {
        for (let z = -1; z <= 1; z++) {
          for (let y = 0; y <= 5; y++) {
            blocks.push({ dx: x, dy: y, dz: z, block: BlockType.VOLCANIC_BRICK });
          }
          // Stepped pediment top
          blocks.push({ dx: x, dy: 6, dz: z, block: Math.abs(x - side) === 0 ? BlockType.VOLCANIC_BRICK : BlockType.STONE_SLAB });
        }
      }
      blocks.push({ dx: side, dy: 7, dz: 0, block: BlockType.CARVED_ANDESITE_STONE });
      blocks.push({ dx: side, dy: 3, dz: -2, block: BlockType.AETHER_LANTERN });
    }

    // Portal arch lintel connecting at top
    blocks.push({ dx: -1, dy: 5, dz: 0, block: BlockType.VOLCANIC_BRICK });
    blocks.push({ dx: 0, dy: 5, dz: 0, block: BlockType.CARVED_WOOD_BEAM });
    blocks.push({ dx: 1, dy: 5, dz: 0, block: BlockType.VOLCANIC_BRICK });

    // Cobble threshold
    blocks.push({ dx: 0, dy: 0, dz: 0, block: BlockType.CARVED_ANDESITE_STONE });

    return blocks;
  }

  // ==========================================
  // 3. BALI HIGHLANDS BUILDING FAMILY
  // ==========================================

  /**
   * Candi Bentar - Iconic soaring split gate built from volcanic brick & carved andesite
   */
  public static generateCandiBentar(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];

    // Symmetrical Split Gateway halves at -2 and +2
    for (const side of [-2, 2]) {
      const innerX = side > 0 ? 1 : -1;
      const outerX = side > 0 ? 3 : -3;

      for (let y = 0; y <= 8; y++) {
        const width = y <= 3 ? 3 : y <= 6 ? 2 : 1;
        for (let w = 0; w < width; w++) {
          const px = side > 0 ? innerX + w : innerX - w;
          for (let z = -1; z <= 1; z++) {
            const isRelief = (y + Math.abs(z)) % 2 === 0;
            blocks.push({
              dx: px,
              dy: y,
              dz: z,
              block: isRelief ? BlockType.CARVED_ANDESITE_STONE : BlockType.VOLCANIC_BRICK,
            });
          }
        }
      }
      // Stepped sharp finial
      blocks.push({ dx: side, dy: 9, dz: 0, block: BlockType.SPLIT_GATE_STONE });
      blocks.push({ dx: side, dy: 10, dz: 0, block: BlockType.SPLIT_GATE_STONE });
      // Guardian pedestal in front
      blocks.push({ dx: side > 0 ? 2 : -2, dy: 1, dz: -2, block: BlockType.CARVED_ANDESITE_STONE });
      blocks.push({ dx: side > 0 ? 2 : -2, dy: 2, dz: -2, block: BlockType.AETHER_LANTERN });
    }

    // Sacred stone threshold
    for (let z = -2; z <= 2; z++) {
      blocks.push({ dx: 0, dy: 0, dz: z, block: BlockType.CARVED_ANDESITE_STONE });
      blocks.push({ dx: 0, dy: 0, dz: z, block: BlockType.AETHER_CONDUIT_FLOOR });
    }

    return blocks;
  }

  /**
   * Kori Agung (Paduraksa) - Monumental covered portal with Bhoma crest, wooden gate, and stepped stone roof
   */
  public static generateKoriAgung(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];

    // Foundation and steps
    for (let x = -3; x <= 3; x++) {
      for (let z = -2; z <= 2; z++) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.CARVED_ANDESITE_STONE });
      }
    }

    // Flanking Pylons (Left & Right)
    for (const side of [-2, 2]) {
      for (let z = -1; z <= 1; z++) {
        for (let y = 1; y <= 6; y++) {
          blocks.push({ dx: side, dy: y, dz: z, block: BlockType.VOLCANIC_BRICK });
          blocks.push({ dx: side + (side > 0 ? 1 : -1), dy: y, dz: z, block: BlockType.CARVED_ANDESITE_STONE });
        }
      }
      // Guardian pedestal in front
      blocks.push({ dx: side, dy: 1, dz: -2, block: BlockType.CARVED_ANDESITE_STONE });
      blocks.push({ dx: side, dy: 2, dz: -2, block: BlockType.AETHER_LANTERN });
    }

    // Portal Opening & Archway
    blocks.push({ dx: -1, dy: 1, dz: 0, block: BlockType.TEAK_WOOD_LOG });
    blocks.push({ dx: 1, dy: 1, dz: 0, block: BlockType.TEAK_WOOD_LOG });
    blocks.push({ dx: 0, dy: 1, dz: 0, block: BlockType.TEAK_WOOD_PLANKS });
    blocks.push({ dx: 0, dy: 2, dz: 0, block: BlockType.TEAK_WOOD_PLANKS });
    blocks.push({ dx: 0, dy: 3, dz: 0, block: BlockType.CARVED_WOOD_BEAM });

    // Bhoma head carved lintel above portal arch
    for (let x = -1; x <= 1; x++) {
      blocks.push({ dx: x, dy: 4, dz: 0, block: BlockType.CARVED_ANDESITE_STONE });
      blocks.push({ dx: x, dy: 4, dz: -1, block: BlockType.CARVED_ANDESITE_STONE });
    }
    blocks.push({ dx: 0, dy: 5, dz: 0, block: BlockType.GOLD_BLOCK });

    // Multi-tier Stepped Paduraksa Roof
    for (let tier = 0; tier < 3; tier++) {
      const rx = 2 - tier;
      const ry = 7 + tier;
      for (let x = -rx; x <= rx; x++) {
        for (let z = -1; z <= 1; z++) {
          blocks.push({ dx: x, dy: ry, dz: z, block: BlockType.VOLCANIC_BRICK });
        }
      }
    }
    // Crown Finial
    blocks.push({ dx: 0, dy: 10, dz: 0, block: BlockType.SPLIT_GATE_STONE });
    blocks.push({ dx: 0, dy: 11, dz: 0, block: BlockType.AETHER_LANTERN });

    return blocks;
  }

  /**
   * Meru Tower - Multi-tiered black ijuk aren pagoda shrine
   */
  public static generateMeruTower(tiers: number = 5): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];

    // Carved andesite multi-stage plinth base
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.CARVED_ANDESITE_STONE });
        blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.VOLCANIC_BRICK });
      }
    }
    blocks.push({ dx: 0, dy: 2, dz: 0, block: BlockType.AETHER_ALTAR_CORE });

    // Multi-tiered ijuk roofs stepping inward as it ascends
    for (let t = 0; t < tiers; t++) {
      const radius = Math.max(1, 3 - Math.floor(t / 2));
      const roofY = 3 + t * 2;

      // Wooden pillar supports
      blocks.push({ dx: 0, dy: roofY - 1, dz: 0, block: BlockType.TEAK_WOOD_LOG });

      // Ijuk roof layer
      for (let x = -radius; x <= radius; x++) {
        for (let z = -radius; z <= radius; z++) {
          blocks.push({ dx: x, dy: roofY, dz: z, block: BlockType.IJUK_THATCH_ROOF });
        }
      }
    }
    // Top sacred finial
    const topY = 3 + tiers * 2;
    blocks.push({ dx: 0, dy: topY, dz: 0, block: BlockType.SPLIT_GATE_STONE });
    blocks.push({ dx: 0, dy: topY + 1, dz: 0, block: BlockType.AETHER_LANTERN });

    return blocks;
  }

  /**
   * Subak Water Division Weir - Flumes, water gates, and miniature shrine
   */
  public static generateSubakWaterDivision(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];

    // Stone aqueduct basin
    for (let x = -4; x <= 4; x++) {
      for (let z = -2; z <= 2; z++) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.CARVED_ANDESITE_STONE });
        if (Math.abs(z) <= 1 && Math.abs(x) <= 3) {
          blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.WATER });
        } else {
          blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.CARVED_ANDESITE_STONE });
        }
      }
    }

    // Wooden division flumes (talang air) branching outwards
    for (let z = -4; z <= -2; z++) {
      blocks.push({ dx: -2, dy: 1, dz: z, block: BlockType.TERRACE_WATERWAY });
      blocks.push({ dx: 2, dy: 1, dz: z, block: BlockType.TERRACE_WATERWAY });
    }

    // Small Pura Ulun Subak shrine on the bank
    blocks.push({ dx: 0, dy: 2, dz: 3, block: BlockType.CARVED_ANDESITE_STONE });
    blocks.push({ dx: 0, dy: 3, dz: 3, block: BlockType.IJUK_THATCH_ROOF });
    blocks.push({ dx: 0, dy: 2, dz: 2, block: BlockType.AETHER_LANTERN });

    return blocks;
  }

  // ==========================================
  // 4. BORNEO RIVERLANDS BUILDING FAMILY
  // ==========================================

  /**
   * Rumah Betang Dayak - Massive communal timber longhouse elevated on heavy ulin ironwood stilts
   */
  public static generateRumahBetang(length: number = 24): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    const width = 4;
    const halfLen = Math.floor(length / 2);

    // 1. Heavy Ulin Ironwood Stilts (3-4 blocks high above river/mud)
    for (let x = -halfLen; x <= halfLen; x += 3) {
      for (let z = -width; z <= width; z += 2) {
        for (let y = 0; y <= 3; y++) {
          blocks.push({ dx: x, dy: y, dz: z, block: BlockType.ULIN_IRONWOOD_LOG });
        }
      }
    }

    // 2. Front Gallery Deck (Serambi / Losari) & Living Floor
    for (let x = -halfLen - 1; x <= halfLen + 1; x++) {
      for (let z = -width - 1; z <= width + 1; z++) {
        blocks.push({ dx: x, dy: 4, dz: z, block: BlockType.ULIN_IRONWOOD_PLANKS });
      }
    }

    // 3. Notched Log Ladder (Hejan) at front center
    for (let y = 0; y <= 3; y++) {
      blocks.push({ dx: 0, dy: y, dz: width + 2 + (3 - y), block: BlockType.ULIN_IRONWOOD_LOG });
      blocks.push({ dx: 0, dy: y + 1, dz: width + 2 + (3 - y), block: BlockType.WOOD_STAIRS });
    }

    // 4. Walls with Ulin Planks and Carved Beams (y = 5 to 7)
    for (let y = 5; y <= 7; y++) {
      for (let x = -halfLen; x <= halfLen; x++) {
        // Back wall (living cubicles)
        blocks.push({ dx: x, dy: y, dz: -width, block: BlockType.ULIN_IRONWOOD_PLANKS });
        // Front gallery railing / wall
        if (y === 5) {
          blocks.push({ dx: x, dy: y, dz: width, block: BlockType.WOODEN_SHUTTER });
        } else if (y === 7) {
          blocks.push({ dx: x, dy: y, dz: width, block: BlockType.CARVED_WOOD_BEAM });
        }
      }
      for (let z = -width; z <= width; z++) {
        blocks.push({ dx: -halfLen, dy: y, dz: z, block: BlockType.ULIN_IRONWOOD_PLANKS });
        blocks.push({ dx: halfLen, dy: y, dz: z, block: BlockType.ULIN_IRONWOOD_PLANKS });
      }
    }

    // 5. Interior Hearth & Storage Chests
    for (let x = -halfLen + 4; x <= halfLen - 4; x += 6) {
      blocks.push({ dx: x, dy: 4, dz: -width + 1, block: BlockType.COBBLESTONE });
      blocks.push({ dx: x, dy: 5, dz: -width + 1, block: BlockType.TORCH });
      blocks.push({ dx: x + 1, dy: 5, dz: -width + 1, block: BlockType.RICE_STORAGE_CHEST });
      blocks.push({ dx: x, dy: 7, dz: 0, block: BlockType.AETHER_LANTERN });
    }

    // 6. Vast Gabled Thatched Roof (Sirap / Alang-alang)
    for (let layer = 0; layer <= 3; layer++) {
      const rz = width + 2 - layer;
      const y = 8 + layer;
      for (let x = -halfLen - 2; x <= halfLen + 2; x++) {
        for (let z = -rz; z <= rz; z++) {
          if (Math.abs(z) === rz || layer === 3) {
            blocks.push({ dx: x, dy: y, dz: z, block: BlockType.ALANG_ALANG_THATCH });
          }
        }
      }
    }

    // Ancestral Totem Pole (Sapundu) at entry
    blocks.push({ dx: 3, dy: 0, dz: width + 4, block: BlockType.ULIN_IRONWOOD_LOG });
    blocks.push({ dx: 3, dy: 1, dz: width + 4, block: BlockType.CARVED_WOOD_BEAM });
    blocks.push({ dx: 3, dy: 2, dz: width + 4, block: BlockType.CARVED_WOOD_BEAM });
    blocks.push({ dx: 3, dy: 3, dz: width + 4, block: BlockType.AETHER_LANTERN });

    return blocks;
  }

  /**
   * River Pier & Catwalk - Elevated boardwalks connecting houses over water
   */
  public static generateRiverPier(length: number = 8): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    for (let z = 0; z < length; z++) {
      // Ulin pilings every 2 blocks
      if (z % 2 === 0) {
        blocks.push({ dx: -1, dy: 0, dz: z, block: BlockType.ULIN_IRONWOOD_LOG });
        blocks.push({ dx: 1, dy: 0, dz: z, block: BlockType.ULIN_IRONWOOD_LOG });
      }
      // Deck boards
      blocks.push({ dx: -1, dy: 1, dz: z, block: BlockType.ULIN_IRONWOOD_PLANKS });
      blocks.push({ dx: 0, dy: 1, dz: z, block: BlockType.ULIN_IRONWOOD_PLANKS });
      blocks.push({ dx: 1, dy: 1, dz: z, block: BlockType.ULIN_IRONWOOD_PLANKS });

      // Mooring post & lantern at end
      if (z === length - 1) {
        blocks.push({ dx: -1, dy: 2, dz: z, block: BlockType.ULIN_IRONWOOD_LOG });
        blocks.push({ dx: 1, dy: 2, dz: z, block: BlockType.ULIN_IRONWOOD_LOG });
        blocks.push({ dx: 0, dy: 2, dz: z, block: BlockType.AETHER_LANTERN });
      }
    }
    return blocks;
  }

  // ==========================================
  // 5. TORAJA HIGHLANDS BUILDING FAMILY
  // ==========================================

  /**
   * Tongkonan Toraja - Soaring boat-shaped curved saddleback roof pointing north-south
   */
  public static generateTongkonan(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];

    // Foundation posts on stone pedestals
    for (let x = -3; x <= 3; x += 2) {
      for (let z = -2; z <= 2; z += 2) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.STONE_PILLAR });
        blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.TEAK_WOOD_LOG });
      }
    }

    // Living floor
    for (let x = -3; x <= 3; x++) {
      for (let z = -2; z <= 2; z++) {
        blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.TEAK_WOOD_PLANKS });
      }
    }

    // Carved pa'tedong walls
    for (let y = 3; y <= 5; y++) {
      for (let x = -3; x <= 3; x++) {
        blocks.push({ dx: x, dy: y, dz: -2, block: BlockType.CARVED_WOOD_BEAM });
        blocks.push({ dx: x, dy: y, dz: 2, block: BlockType.CARVED_WOOD_BEAM });
      }
      for (let z = -1; z <= 1; z++) {
        blocks.push({ dx: -3, dy: y, dz: z, block: BlockType.CARVED_WOOD_BEAM });
        blocks.push({ dx: 3, dy: y, dz: z, block: BlockType.CARVED_WOOD_BEAM });
      }
    }

    // Tulak Somba - Central buffalo horn pillar at front
    blocks.push({ dx: 0, dy: 1, dz: 3, block: BlockType.STONE_PILLAR });
    blocks.push({ dx: 0, dy: 2, dz: 3, block: BlockType.CARVED_WOOD_BEAM });
    blocks.push({ dx: 0, dy: 3, dz: 3, block: BlockType.CARVED_WOOD_BEAM });
    blocks.push({ dx: 0, dy: 4, dz: 3, block: BlockType.AETHER_LANTERN });

    // Dramatic saddleback boat-shaped roof extending far forward and backward
    for (let z = -5; z <= 5; z++) {
      const dist = Math.abs(z);
      // Toraja roof sweeps up at both front and back
      const sweepUp = dist >= 2 ? Math.floor(Math.pow(dist - 1, 1.8)) : 0;
      for (let x = -3; x <= 3; x++) {
        const y = 6 + sweepUp + (2 - Math.abs(x));
        blocks.push({ dx: x, dy: y, dz: z, block: BlockType.IJUK_THATCH_ROOF });
      }
    }
    // High finial horns
    blocks.push({ dx: 0, dy: 12, dz: -5, block: BlockType.CARVED_WOOD_BEAM });
    blocks.push({ dx: 0, dy: 12, dz: 5, block: BlockType.CARVED_WOOD_BEAM });

    return blocks;
  }

  /**
   * Alang Surap - Elevated Toraja granary facing Tongkonan across courtyard
   */
  public static generateAlangSurap(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];

    // 4 Round smooth poles on stone umpak
    for (let x = -1; x <= 1; x += 2) {
      for (let z = -1; z <= 1; z += 2) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.STONE_ALANG_PILLAR });
        blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.TEAK_WOOD_LOG });
        blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.STONE_ALANG_PILLAR });
      }
    }

    // Lower resting deck (sali)
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.WOVEN_BAMBOO_GEDEK });
      }
    }

    // Upper grain storage chamber
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        blocks.push({ dx: x, dy: 3, dz: z, block: BlockType.TEAK_WOOD_PLANKS });
        if (Math.abs(x) === 2 || Math.abs(z) === 2) {
          blocks.push({ dx: x, dy: 4, dz: z, block: BlockType.CARVED_WOOD_BEAM });
        }
      }
    }
    blocks.push({ dx: 0, dy: 4, dz: 0, block: BlockType.RICE_STORAGE_CHEST });

    // Mini boat-shaped saddle roof
    for (let z = -3; z <= 3; z++) {
      const sweep = Math.abs(z) >= 2 ? 1 : 0;
      for (let x = -2; x <= 2; x++) {
        const y = 5 + sweep + (1 - Math.abs(x));
        blocks.push({ dx: x, dy: y, dz: z, block: BlockType.IJUK_THATCH_ROOF });
      }
    }

    return blocks;
  }

  // ==========================================
  // 6. PAPUAN HIGHLANDS BUILDING FAMILY
  // ==========================================

  /**
   * Honai Papua - Circular two-story hut with dense domed thatched roof of dried alang-alang grass
   */
  public static generateHonai(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    const radius = 3;

    // Circular wall base and floor
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const d2 = x * x + z * z;
        if (d2 <= radius * radius + 1) {
          blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.DIRT });
          // Lower wooden wall
          if (d2 >= (radius - 1) * (radius - 1)) {
            blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.WOOD_PLANKS });
            blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.WOOD_PLANKS });
          }
        }
      }
    }

    // Door opening
    blocks.push({ dx: 0, dy: 1, dz: -radius, block: BlockType.AIR });
    blocks.push({ dx: 0, dy: 2, dz: -radius, block: BlockType.AIR });

    // Central fireplace hearth
    blocks.push({ dx: 0, dy: 0, dz: 0, block: BlockType.COBBLESTONE });
    blocks.push({ dx: 0, dy: 1, dz: 0, block: BlockType.TORCH });

    // Domed thatched grass roof
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        const dist = Math.sqrt(x * x + z * z);
        if (dist <= radius) {
          blocks.push({ dx: x, dy: 3, dz: z, block: BlockType.ALANG_ALANG_THATCH });
        }
        if (dist <= 2) {
          blocks.push({ dx: x, dy: 4, dz: z, block: BlockType.ALANG_ALANG_THATCH });
        }
        if (dist <= 1) {
          blocks.push({ dx: x, dy: 5, dz: z, block: BlockType.ALANG_ALANG_THATCH });
        }
      }
    }
    return blocks;
  }

  // ==========================================
  // 7. EASTERN ISLES BUILDING FAMILY
  // ==========================================

  /**
   * Uma Kalada (Sumba) - High towering pointed alang-alang thatched roof reaching upward
   */
  public static generateUmaKalada(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    const size = 3;

    // 4 Corner stone disc stilts
    for (let x = -size; x <= size; x += size * 2) {
      for (let z = -size; z <= size; z += size * 2) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.STONE_ALANG_PILLAR });
        blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.TEAK_WOOD_LOG });
      }
    }

    // Platform floor
    for (let x = -size; x <= size; x++) {
      for (let z = -size; z <= size; z++) {
        blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.WOOD_PLANKS });
        if (Math.abs(x) === size || Math.abs(z) === size) {
          blocks.push({ dx: x, dy: 3, dz: z, block: BlockType.WOVEN_BAMBOO_GEDEK });
        }
      }
    }
    // Door opening
    blocks.push({ dx: 0, dy: 3, dz: size, block: BlockType.AIR });
    blocks.push({ dx: 0, dy: 2, dz: 0, block: BlockType.RICE_STORAGE_CHEST });

    // High pointed tower roof
    for (let layer = 0; layer < 6; layer++) {
      const r = Math.max(0, size + 1 - Math.floor(layer * 0.7));
      const y = 4 + layer;
      for (let x = -r; x <= r; x++) {
        for (let z = -r; z <= r; z++) {
          if (Math.abs(x) === r || Math.abs(z) === r || r === 0) {
            blocks.push({ dx: x, dy: y, dz: z, block: BlockType.ALANG_ALANG_THATCH });
          }
        }
      }
    }
    blocks.push({ dx: 0, dy: 10, dz: 0, block: BlockType.AETHER_LANTERN });

    return blocks;
  }

  /**
   * Sasak Lumbung - Arched bonnet-shaped thatched granary on disc pillars
   */
  public static generateSasakLumbung(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];

    // Disc-guarded stilts
    for (let x = -1; x <= 1; x += 2) {
      for (let z = -1; z <= 1; z += 2) {
        blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.STONE_ALANG_PILLAR });
        blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.STONE_PILLAR });
        blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.STONE_ALANG_PILLAR });
      }
    }

    // Raised platform & walls
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        blocks.push({ dx: x, dy: 3, dz: z, block: BlockType.TEAK_WOOD_PLANKS });
        if (Math.abs(x) === 2 || Math.abs(z) === 2) {
          blocks.push({ dx: x, dy: 4, dz: z, block: BlockType.WOVEN_BAMBOO_GEDEK });
        }
      }
    }
    blocks.push({ dx: 0, dy: 4, dz: 0, block: BlockType.RICE_STORAGE_CHEST });

    // Rounded arch thatched grass bonnet roof
    for (let x = -2; x <= 2; x++) {
      for (let z = -2; z <= 2; z++) {
        blocks.push({ dx: x, dy: 5, dz: z, block: BlockType.ALANG_ALANG_THATCH });
        if (Math.abs(z) <= 1) {
          blocks.push({ dx: x, dy: 6, dz: z, block: BlockType.ALANG_ALANG_THATCH });
        }
      }
    }
    return blocks;
  }

  // ==========================================
  // 8. RARE NUSANTARA MEGASTRUCTURES
  // ==========================================

  /**
   * Ancient Nusantara Temple Complex (Candi Agung) - Concentric stepped andesite terraces, stupas,
   * underground Aether conduits, and central sanctuary with Ancient Altar Core
   */
  public static generateAncientTempleComplex(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    const size = 12;

    // 1. Concentric stepped outer terrace
    for (let x = -size; x <= size; x++) {
      for (let z = -size; z <= size; z++) {
        const d = Math.max(Math.abs(x), Math.abs(z));
        if (d >= size - 1) {
          blocks.push({ dx: x, dy: 0, dz: z, block: BlockType.CARVED_ANDESITE_STONE });
          blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.VOLCANIC_BRICK });
        } else if (d >= 8) {
          blocks.push({ dx: x, dy: 1, dz: z, block: BlockType.CARVED_ANDESITE_STONE });
        } else if (d >= 4) {
          blocks.push({ dx: x, dy: 2, dz: z, block: BlockType.CARVED_ANDESITE_STONE });
        }
      }
    }

    // 2. Inlaid Aether Conduit Runes radiating to 4 cardinal directions
    for (let i = -size + 1; i <= size - 1; i++) {
      blocks.push({ dx: i, dy: 1, dz: 0, block: BlockType.AETHER_CONDUIT_FLOOR });
      blocks.push({ dx: 0, dy: 1, dz: i, block: BlockType.AETHER_CONDUIT_FLOOR });
    }

    // 3. Four Corner Perwara Shrines
    const corners = [[-8, -8], [8, -8], [-8, 8], [8, 8]];
    for (const [cx, cz] of corners) {
      for (let y = 1; y <= 3; y++) {
        blocks.push({ dx: cx, dy: y, dz: cz, block: BlockType.CARVED_ANDESITE_STONE });
      }
      blocks.push({ dx: cx, dy: 4, dz: cz, block: BlockType.SPLIT_GATE_STONE });
      blocks.push({ dx: cx, dy: 2, dz: cz - 1, block: BlockType.AETHER_LANTERN });
    }

    // 4. Central Sanctuary Podium & Stepped Spire (Candi Induk)
    for (let x = -3; x <= 3; x++) {
      for (let z = -3; z <= 3; z++) {
        blocks.push({ dx: x, dy: 3, dz: z, block: BlockType.CARVED_ANDESITE_STONE });
        for (let y = 4; y <= 6; y++) {
          if (Math.abs(x) === 3 || Math.abs(z) === 3) {
            blocks.push({ dx: x, dy: y, dz: z, block: BlockType.CARVED_ANDESITE_STONE });
          }
        }
      }
    }

    // 5. Central Ancient Altar Core & Ley Energy Focus
    blocks.push({ dx: 0, dy: 4, dz: 0, block: BlockType.AETHER_ALTAR_CORE });
    blocks.push({ dx: 0, dy: 3, dz: 0, block: BlockType.AETHER_CONDUIT_FLOOR });
    blocks.push({ dx: 1, dy: 4, dz: 0, block: BlockType.CHEST });
    blocks.push({ dx: -1, dy: 4, dz: 0, block: BlockType.CHEST });

    // Spire Roof
    for (let layer = 0; layer < 4; layer++) {
      const r = 3 - layer;
      const y = 7 + layer;
      for (let x = -r; x <= r; x++) {
        for (let z = -r; z <= r; z++) {
          blocks.push({ dx: x, dy: y, dz: z, block: BlockType.CARVED_ANDESITE_STONE });
        }
      }
    }
    blocks.push({ dx: 0, dy: 11, dz: 0, block: BlockType.SPLIT_GATE_STONE });
    blocks.push({ dx: 0, dy: 12, dz: 0, block: BlockType.AETHER_LANTERN });

    return blocks;
  }

  /**
   * Royal Hall Pagaruyung (Balairung Adat Megah) - Grand imperial pavilion with multiple gonjong peaks
   */
  public static generateRoyalHall(): VoxelBlockPlacement[] {
    return this.generateRumahGadang(true);
  }

  /**
   * Grand Betang Kahayan - Gigantic longhouse citadel with river trade warehouse and ancestral totems
   */
  public static generateGrandBetang(): VoxelBlockPlacement[] {
    return this.generateRumahBetang(36);
  }

  /**
   * Toraja Cliff Sanctuary - Perched tomb vault and megalithic stone courtyard
   */
  public static generateCliffSanctuary(): VoxelBlockPlacement[] {
    const blocks: VoxelBlockPlacement[] = [];
    // Cliff rock facade
    for (let x = -4; x <= 4; x++) {
      for (let y = 0; y <= 6; y++) {
        blocks.push({ dx: x, dy: y, dz: 0, block: BlockType.CARVED_ANDESITE_STONE });
      }
    }
    // Wooden tau-tau balcony
    for (let x = -3; x <= 3; x++) {
      blocks.push({ dx: x, dy: 2, dz: -1, block: BlockType.TEAK_WOOD_PLANKS });
      blocks.push({ dx: x, dy: 3, dz: -1, block: BlockType.WOODEN_SHUTTER });
    }
    // Secret tomb chamber behind cliff
    blocks.push({ dx: 0, dy: 2, dz: 1, block: BlockType.AIR });
    blocks.push({ dx: 0, dy: 2, dz: 2, block: BlockType.AETHER_ALTAR_CORE });
    blocks.push({ dx: -1, dy: 2, dz: 2, block: BlockType.CHEST });
    blocks.push({ dx: 1, dy: 2, dz: 2, block: BlockType.CHEST });

    return blocks;
  }
}
