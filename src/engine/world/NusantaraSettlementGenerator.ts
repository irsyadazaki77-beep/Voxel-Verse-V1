// Nusantara Settlement Grammar Generator 2.0
// Procedural, Context-Aware & Topography-Conforming Settlement Generation System
// Supports 7 Cultural Styles with 5 Authentic Layout Variants each (35 Unique Settlements),
// Hierarchical Zoning (Center -> Master Residence -> Family Quarters -> Granaries -> Agriculture & Living Details),
// Dynamic Contour Steps, Stilt/Plinth Grounding, and Deterministic Seed Jittering.

import { BlockType } from '../../types';
import { VoxelBlockPlacement } from './StructureGenerator';
import { NusantaraBuildingKit } from './NusantaraBuildingKit';
import { NUSANTARA_SETTLEMENT_STYLES } from './NusantaraArchitectureStyles';

export type TerrainHeightSampler = (dx: number, dz: number) => number;

interface PlacementOptions {
  alignToGround?: boolean;
  foundationFillBlock?: BlockType;
  foundationMaxDepth?: number;
  rotation?: 0 | 90 | 180 | 270;
}

export class NusantaraSettlementGenerator {

  /**
   * Simple deterministic Pseudo-Random Number Generator (PRNG) based on seed
   */
  private static createPRNG(seed: number) {
    let s = Math.abs(seed) || 1;
    const next = (): number => {
      s = (Math.imul(s, 1664525) + 1013904223) | 0;
      return ((s >>> 0) % 100000) / 100000;
    };
    return {
      next,
      range: (min: number, max: number): number => {
        return min + Math.floor(next() * (max - min + 1));
      },
      jitter: (amount: number): number => {
        return Math.floor((next() * 2 - 1) * amount);
      }
    };
  }

  /**
   * Normalizes any cultural region alias to canonical key
   */
  public static normalizeRegionId(regionId: string): string {
    const r = (regionId || '').toLowerCase();
    if (r.includes('minang')) return 'tanah_minang';
    if (r.includes('jawa') || r.includes('majapahit')) return 'tanah_jawa';
    if (r.includes('bali') || r.includes('subak')) return 'bali_highlands';
    if (r.includes('borneo') || r.includes('dayak') || r.includes('river')) return 'borneo_riverlands';
    if (r.includes('toraja')) return 'toraja_highlands';
    if (r.includes('papua') || r.includes('baliem') || r.includes('honai')) return 'papua_highlands';
    if (r.includes('eastern') || r.includes('sasak') || r.includes('nusa') || r.includes('sumba')) return 'eastern_isles';
    return 'tanah_jawa';
  }

  /**
   * Generates a complete cultural settlement layout for a given region at a center position
   * Supports seed-based procedural layout variation (5 variants per culture) and optional terrain sampling.
   */
  public static generateSettlement(
    regionId: string,
    centerX: number,
    baseY: number,
    centerZ: number,
    seed: number = 42,
    terrainSampler?: TerrainHeightSampler
  ): VoxelBlockPlacement[] {
    const canonicalRegion = this.normalizeRegionId(regionId);
    const style = NUSANTARA_SETTLEMENT_STYLES[canonicalRegion] || NUSANTARA_SETTLEMENT_STYLES['tanah_jawa'];
    const allBlocks: VoxelBlockPlacement[] = [];

    // Deterministic PRNG initialized with seed
    const rng = this.createPRNG(seed);
    const layoutVariant = Math.abs(seed) % 5;

    // Helper: sample local relative ground height offset
    const getGroundRelY = (relX: number, relZ: number): number => {
      if (!terrainSampler) return 0;
      try {
        const h = terrainSampler(relX, relZ);
        if (Number.isFinite(h)) {
          // Clamp extreme values to keep settlement coherent
          return Math.max(-6, Math.min(8, Math.round(h)));
        }
      } catch (e) {
        // Fallback to flat ground
      }
      return 0;
    };

    // Helper: Add a building module at (relX, relZ) with automatic foundation support
    const addBuilding = (
      relX: number,
      relZ: number,
      pieces: VoxelBlockPlacement[],
      options: PlacementOptions = {}
    ) => {
      const groundOffset = options.alignToGround !== false ? getGroundRelY(relX, relZ) : 0;
      const foundationBlock = options.foundationFillBlock || BlockType.TEAK_WOOD_LOG;
      const rot = options.rotation || 0;

      for (const p of pieces) {
        let px = p.dx;
        let pz = p.dz;
        if (rot === 90) {
          px = -p.dz;
          pz = p.dx;
        } else if (rot === 180) {
          px = -p.dx;
          pz = -p.dz;
        } else if (rot === 270) {
          px = p.dz;
          pz = -p.dx;
        }

        const worldRelX = relX + px;
        const worldRelY = groundOffset + p.dy;
        const worldRelZ = relZ + pz;

        allBlocks.push({
          dx: worldRelX,
          dy: worldRelY,
          dz: worldRelZ,
          block: p.block,
          state: p.state
        });

        // Foundation downward fill if the building base is elevated above local ground
        if (p.dy === 0) {
          const localSpotGround = getGroundRelY(worldRelX, worldRelZ);
          if (worldRelY > localSpotGround) {
            const depth = Math.min(options.foundationMaxDepth || 6, worldRelY - localSpotGround);
            for (let d = 1; d <= depth; d++) {
              allBlocks.push({
                dx: worldRelX,
                dy: worldRelY - d,
                dz: worldRelZ,
                block: foundationBlock
              });
            }
          }
        }
      }
    };

    // Helper: Add a natural path with terrain-adaptive steps and stairs
    const addContourPath = (
      x1: number,
      z1: number,
      x2: number,
      z2: number,
      pathBlock: BlockType,
      stairBlock: BlockType = BlockType.STONE_SLAB
    ) => {
      const steps = Math.max(Math.abs(x2 - x1), Math.abs(z2 - z1));
      if (steps === 0) return;

      let prevY = getGroundRelY(x1, z1);
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = Math.round(x1 + (x2 - x1) * t);
        const pz = Math.round(z1 + (z2 - z1) * t);
        const py = getGroundRelY(px, pz);

        // If height transition occurs, place a slab or step
        if (py !== prevY) {
          allBlocks.push({
            dx: px,
            dy: Math.max(py, prevY),
            dz: pz,
            block: stairBlock
          });
        }

        allBlocks.push({
          dx: px,
          dy: py,
          dz: pz,
          block: pathBlock
        });
        prevY = py;
      }
    };

    // Helper: Add living village details (props) in an open courtyard area
    const addVillageDetails = (
      cx: number,
      cz: number,
      details: {
        hasWell?: boolean;
        hasDryingRack?: boolean;
        hasFirewood?: boolean;
        hasBench?: boolean;
        hasFlowerPlanters?: boolean;
        hasForge?: boolean;
        hasLivestock?: boolean;
        hasWatchpost?: boolean;
      }
    ) => {
      if (details.hasWell) {
        addBuilding(cx + 6, cz + 2, NusantaraBuildingKit.generateVillageWell('andesite'));
      }
      if (details.hasDryingRack) {
        addBuilding(cx - 7, cz + 4, NusantaraBuildingKit.generateDryingRack('grain'));
      }
      if (details.hasFirewood) {
        addBuilding(cx + 4, cz - 6, NusantaraBuildingKit.generateFirewoodStack());
      }
      if (details.hasBench) {
        addBuilding(cx - 4, cz - 5, NusantaraBuildingKit.generateVillageBench());
      }
      if (details.hasFlowerPlanters) {
        addBuilding(cx - 2, cz + 3, NusantaraBuildingKit.generateFlowerPlanter('orchid'));
        addBuilding(cx + 2, cz + 3, NusantaraBuildingKit.generateFlowerPlanter('red'));
      }
      if (details.hasForge) {
        addBuilding(cx + 12, cz - 8, NusantaraBuildingKit.generateTraditionalForge());
      }
      if (details.hasLivestock) {
        addBuilding(cx - 12, cz + 10, NusantaraBuildingKit.generateLivestockShelter(4, 5));
      }
      if (details.hasWatchpost) {
        addBuilding(cx - 14, cz - 12, NusantaraBuildingKit.generateVillageWatchpost());
      }
    };

    // =========================================================================
    // 7 CULTURAL STYLES × 5 AUTHENTIC LAYOUT VARIANTS = 35 TOTAL SETTLEMENTS
    // =========================================================================

    switch (canonicalRegion) {

      // =======================================================================
      // 1. TANAH MINANG (West Sumatra)
      // =======================================================================
      case 'tanah_minang': {
        const pathBlock = BlockType.COBBLESTONE;
        const stairBlock = BlockType.STONE_SLAB;

        switch (layoutVariant) {
          // Variant 0: Nagari Lembah Harau (Linear Mountain Valley)
          case 0: {
            addBuilding(0, -10, NusantaraBuildingKit.generateRumahGadang(true));
            addBuilding(-16, 5, NusantaraBuildingKit.generateRumahGadang(false));
            addBuilding(16, 5, NusantaraBuildingKit.generateRumahGadang(false));
            addBuilding(-6, 12, NusantaraBuildingKit.generateRangkiang('si_bayau_bayau'));
            addBuilding(6, 12, NusantaraBuildingKit.generateRangkiang('sitinjau_lauik'));
            addBuilding(18, -12, NusantaraBuildingKit.generateSurau());

            addContourPath(0, 15, 0, -8, pathBlock, stairBlock);
            addContourPath(-15, 5, 15, 5, pathBlock, stairBlock);
            addContourPath(0, -8, 18, -10, pathBlock, stairBlock);

            addBuilding(0, 22, NusantaraBuildingKit.generateSubakTerracePlot(10, 6));
            addVillageDetails(0, 0, { hasWell: true, hasDryingRack: true, hasFirewood: true, hasBench: true, hasFlowerPlanters: true });
            break;
          }

          // Variant 1: Nagari Puncak Ranah (Ridge Spine Layout)
          case 1: {
            addBuilding(0, -16, NusantaraBuildingKit.generateRumahGadang(true));
            addBuilding(-14, -4, NusantaraBuildingKit.generateRumahGadang(false));
            addBuilding(14, 6, NusantaraBuildingKit.generateRumahGadang(false));
            addBuilding(-8, 14, NusantaraBuildingKit.generateRangkiang('si_bayau_bayau'));
            addBuilding(8, 14, NusantaraBuildingKit.generateRangkiang('kaciak'));
            addBuilding(0, 18, NusantaraBuildingKit.generateBambooGate());

            addContourPath(0, 18, 0, -14, pathBlock, stairBlock);
            addContourPath(-14, -4, 0, -4, pathBlock, stairBlock);
            addContourPath(14, 6, 0, 6, pathBlock, stairBlock);

            addVillageDetails(0, 0, { hasWatchpost: true, hasWell: true, hasDryingRack: true, hasFirewood: true });
            break;
          }

          // Variant 2: Nagari Sawah Bertingkat Subur (Agrarian Riverbank Basin)
          case 2: {
            addBuilding(0, 0, NusantaraBuildingKit.generateSurau());
            addBuilding(-18, -10, NusantaraBuildingKit.generateRumahGadang(false));
            addBuilding(18, -10, NusantaraBuildingKit.generateRumahGadang(false));
            addBuilding(0, -16, NusantaraBuildingKit.generateRangkiang('si_bayau_bayau'));
            addBuilding(-8, 10, NusantaraBuildingKit.generateRangkiang('sitinjau_lauik'));
            addBuilding(8, 10, NusantaraBuildingKit.generateRangkiang('kaciak'));

            addBuilding(-16, 16, NusantaraBuildingKit.generateSubakTerracePlot(8, 6));
            addBuilding(16, 16, NusantaraBuildingKit.generateSubakTerracePlot(8, 6));

            addContourPath(-18, -10, 0, 0, pathBlock, stairBlock);
            addContourPath(18, -10, 0, 0, pathBlock, stairBlock);
            addContourPath(0, 0, 0, 16, pathBlock, stairBlock);

            addVillageDetails(0, 0, { hasWell: true, hasDryingRack: true, hasBench: true, hasFlowerPlanters: true });
            break;
          }

          // Variant 3: Nagari Adat Mandiri (Concentric Clan Compound)
          case 3: {
            addBuilding(0, -12, NusantaraBuildingKit.generateRumahGadang(true));
            addBuilding(-18, 0, NusantaraBuildingKit.generateRumahGadang(false));
            addBuilding(18, 0, NusantaraBuildingKit.generateRumahGadang(false));

            addBuilding(-8, 12, NusantaraBuildingKit.generateRangkiang('si_bayau_bayau'));
            addBuilding(8, 12, NusantaraBuildingKit.generateRangkiang('si_bayau_bayau'));
            addBuilding(-8, -4, NusantaraBuildingKit.generateRangkiang('sitinjau_lauik'));
            addBuilding(8, -4, NusantaraBuildingKit.generateRangkiang('kaciak'));

            addBuilding(0, 20, NusantaraBuildingKit.generateBambooGate());

            addContourPath(0, 20, 0, -10, pathBlock, stairBlock);
            addContourPath(-18, 0, 18, 0, pathBlock, stairBlock);

            addVillageDetails(0, 4, { hasWell: true, hasDryingRack: true, hasFirewood: true, hasBench: true });
            break;
          }

          // Variant 4: Nagari Karst & Pandai Besi (Cliffside Forge Hamlet)
          default: {
            addBuilding(0, -10, NusantaraBuildingKit.generateRumahGadang(false));
            addBuilding(-16, -6, NusantaraBuildingKit.generateSurau());
            addBuilding(14, 2, NusantaraBuildingKit.generateTraditionalForge());
            addBuilding(-8, 12, NusantaraBuildingKit.generateRangkiang('si_bayau_bayau'));
            addBuilding(6, 12, NusantaraBuildingKit.generateLivestockShelter(4, 5));

            addContourPath(0, 16, 0, -8, pathBlock, stairBlock);
            addContourPath(-16, -6, 14, 2, pathBlock, stairBlock);

            addVillageDetails(0, 2, { hasWell: true, hasFirewood: true, hasWatchpost: true });
            break;
          }
        }
        break;
      }

      // =======================================================================
      // 2. TANAH JAWA (Central & East Java)
      // =======================================================================
      case 'tanah_jawa': {
        const pathBlock = BlockType.GRAVEL;
        const stairBlock = BlockType.STONE_SLAB;

        switch (layoutVariant) {
          // Variant 0: Dusun Alun-Alun Wilwatikta (Royal Civic Square)
          case 0: {
            addBuilding(0, 0, NusantaraBuildingKit.generateJogloMarketplace());
            addBuilding(0, -18, NusantaraBuildingKit.generateJoglo());
            addBuilding(-18, -6, NusantaraBuildingKit.generateLimasan());
            addBuilding(18, -6, NusantaraBuildingKit.generateLimasan());
            addBuilding(0, 22, NusantaraBuildingKit.generateGapuraMajapahit());

            addContourPath(0, 22, 0, -18, pathBlock, stairBlock);
            addContourPath(-18, -6, 18, -6, pathBlock, stairBlock);

            addVillageDetails(0, 10, { hasWell: true, hasFlowerPlanters: true, hasBench: true, hasFirewood: true });
            break;
          }

          // Variant 1: Dusun Sawah Gemah Ripah (Agrarian Peasant Hamlet)
          case 1: {
            addBuilding(0, -4, NusantaraBuildingKit.generatePendopo());
            addBuilding(-16, -14, NusantaraBuildingKit.generateLimasan());
            addBuilding(16, -14, NusantaraBuildingKit.generateLimasan());
            addBuilding(0, -18, NusantaraBuildingKit.generateLimasan());

            addBuilding(-14, 14, NusantaraBuildingKit.generateSubakTerracePlot(8, 6));
            addBuilding(14, 14, NusantaraBuildingKit.generateSubakTerracePlot(8, 6));

            addContourPath(0, 20, 0, -16, pathBlock, stairBlock);
            addContourPath(-16, -14, 16, -14, pathBlock, stairBlock);

            addVillageDetails(0, 4, { hasWell: true, hasDryingRack: true, hasFirewood: true, hasLivestock: true });
            break;
          }

          // Variant 2: Dusun Lereng Merapi (Volcanic Stepped Hamlet)
          case 2: {
            addBuilding(0, -14, NusantaraBuildingKit.generateJoglo());
            addBuilding(-16, 0, NusantaraBuildingKit.generateLimasan());
            addBuilding(16, 0, NusantaraBuildingKit.generateTraditionalForge());
            addBuilding(0, 16, NusantaraBuildingKit.generateGapuraMajapahit());

            addContourPath(0, 16, 0, -12, BlockType.CARVED_ANDESITE_STONE, BlockType.STONE_STAIRS);
            addContourPath(-16, 0, 16, 0, BlockType.CARVED_ANDESITE_STONE, BlockType.STONE_SLAB);

            addVillageDetails(0, 2, { hasWell: true, hasFirewood: true, hasWatchpost: true });
            break;
          }

          // Variant 3: Dusun Padepokan Kuno (Ancient Hermitage & Candi Shrine)
          case 3: {
            addBuilding(0, -12, NusantaraBuildingKit.generateAncientTempleComplex());
            addBuilding(0, 10, NusantaraBuildingKit.generatePendopo());
            addBuilding(-18, 8, NusantaraBuildingKit.generateLimasan());
            addBuilding(18, 8, NusantaraBuildingKit.generateLimasan());
            addBuilding(0, 24, NusantaraBuildingKit.generateGapuraMajapahit());

            addContourPath(0, 24, 0, -8, BlockType.CARVED_ANDESITE_STONE, BlockType.STONE_SLAB);
            addContourPath(-18, 8, 18, 8, pathBlock, stairBlock);

            addVillageDetails(0, 16, { hasFlowerPlanters: true, hasBench: true, hasWell: true });
            break;
          }

          // Variant 4: Dusun Tepian Bengawan (River Trade Haven)
          default: {
            addBuilding(0, -8, NusantaraBuildingKit.generateJogloMarketplace());
            addBuilding(-16, -6, NusantaraBuildingKit.generateLimasan());
            addBuilding(16, -6, NusantaraBuildingKit.generateLimasan());
            addBuilding(0, 12, NusantaraBuildingKit.generateRiverPier(10));
            addBuilding(-12, 12, NusantaraBuildingKit.generateRiverPier(6));
            addBuilding(12, 12, NusantaraBuildingKit.generateRiverPier(6));

            addContourPath(-16, -6, 16, -6, pathBlock, stairBlock);
            addContourPath(0, -8, 0, 12, pathBlock, stairBlock);

            addVillageDetails(0, 2, { hasDryingRack: true, hasFirewood: true, hasWell: true });
            break;
          }
        }
        break;
      }

      // =======================================================================
      // 3. BALI HIGHLANDS (Bali & Lombok Foothills)
      // =======================================================================
      case 'bali_highlands': {
        const pathBlock = BlockType.CARVED_ANDESITE_STONE;
        const stairBlock = BlockType.STONE_SLAB;

        switch (layoutVariant) {
          // Variant 0: Banjar Sanga Mandala Utama (Classic 9-Fold Mandala)
          case 0: {
            addBuilding(0, 20, NusantaraBuildingKit.generateCandiBentar());
            addBuilding(-12, 6, NusantaraBuildingKit.generatePendopo());
            addBuilding(12, 6, NusantaraBuildingKit.generateSubakWaterDivision());
            addBuilding(0, -14, NusantaraBuildingKit.generateMeruTower(5));
            addBuilding(-8, -12, NusantaraBuildingKit.generateMeruTower(3));
            addBuilding(8, -12, NusantaraBuildingKit.generateMeruTower(3));

            // Central mandala ley pattern
            for (let x = -4; x <= 4; x++) {
              allBlocks.push({ dx: x, dy: 0, dz: 0, block: BlockType.AETHER_CONDUIT_FLOOR });
            }
            for (let z = -4; z <= 4; z++) {
              allBlocks.push({ dx: 0, dy: 0, dz: z, block: BlockType.AETHER_CONDUIT_FLOOR });
            }

            addContourPath(0, 20, 0, -12, pathBlock, stairBlock);
            addVillageDetails(0, 0, { hasFlowerPlanters: true, hasWell: true, hasBench: true });
            break;
          }

          // Variant 1: Banjar Lereng Subak Bertingkat (Cascading Terraced Farm)
          case 1: {
            addBuilding(0, -16, NusantaraBuildingKit.generateMeruTower(3));
            addBuilding(0, -6, NusantaraBuildingKit.generateSubakWaterDivision());
            addBuilding(-16, 6, NusantaraBuildingKit.generateSubakTerracePlot(8, 6));
            addBuilding(16, 6, NusantaraBuildingKit.generateSubakTerracePlot(8, 6));
            addBuilding(0, 10, NusantaraBuildingKit.generatePendopo());
            addBuilding(0, 22, NusantaraBuildingKit.generateCandiBentar());

            addContourPath(0, 22, 0, -14, pathBlock, stairBlock);
            addContourPath(-14, 6, 14, 6, pathBlock, stairBlock);

            addVillageDetails(0, 16, { hasDryingRack: true, hasWell: true, hasFlowerPlanters: true });
            break;
          }

          // Variant 2: Banjar Pura Luhur Bukit (Sacred Ridge Sanctuary)
          case 2: {
            addBuilding(0, -14, NusantaraBuildingKit.generateAncientTempleComplex());
            addBuilding(-14, 4, NusantaraBuildingKit.generatePendopo());
            addBuilding(14, 4, NusantaraBuildingKit.generateMeruTower(3));
            addBuilding(0, 20, NusantaraBuildingKit.generateKoriAgung());

            addContourPath(0, 20, 0, -10, pathBlock, stairBlock);
            addContourPath(-14, 4, 14, 4, pathBlock, stairBlock);

            addVillageDetails(0, 8, { hasFlowerPlanters: true, hasBench: true, hasWell: true });
            break;
          }

          // Variant 3: Banjar Pesisir Segara Dewata (Coastal Sanctuary)
          case 3: {
            addBuilding(0, 18, NusantaraBuildingKit.generateCandiBentar());
            addBuilding(0, -4, NusantaraBuildingKit.generatePendopo());
            addBuilding(-12, -12, NusantaraBuildingKit.generateMeruTower(3));
            addBuilding(12, -12, NusantaraBuildingKit.generateMeruTower(3));

            addContourPath(0, 18, 0, -10, pathBlock, stairBlock);
            addContourPath(-12, -12, 12, -12, pathBlock, stairBlock);

            addVillageDetails(0, 6, { hasDryingRack: true, hasFlowerPlanters: true, hasWell: true });
            break;
          }

          // Variant 4: Banjar Pengrajin & Pasar Seni (Artisan & Crafts Village)
          default: {
            addBuilding(0, 0, NusantaraBuildingKit.generatePendopo());
            addBuilding(-16, -8, NusantaraBuildingKit.generateTraditionalForge());
            addBuilding(16, -8, NusantaraBuildingKit.generateMeruTower(3));
            addBuilding(0, 18, NusantaraBuildingKit.generateCandiBentar());

            addContourPath(0, 18, 0, -6, pathBlock, stairBlock);
            addContourPath(-16, -8, 16, -8, pathBlock, stairBlock);

            addVillageDetails(0, 8, { hasWell: true, hasFlowerPlanters: true, hasDryingRack: true, hasBench: true });
            break;
          }
        }
        break;
      }

      // =======================================================================
      // 4. BORNEO RIVERLANDS (Kalimantan Rainforest & Rivers)
      // =======================================================================
      case 'borneo_riverlands': {
        const pathBlock = BlockType.ULIN_IRONWOOD_PLANKS;
        const stairBlock = BlockType.WOOD_SLAB;

        switch (layoutVariant) {
          // Variant 0: Betang Panjang Sungai Kahayan (Grand Longhouse & Piers)
          case 0: {
            addBuilding(0, 0, NusantaraBuildingKit.generateRumahBetang(28), {
              foundationFillBlock: BlockType.ULIN_IRONWOOD_LOG
            });
            addBuilding(0, 10, NusantaraBuildingKit.generateRiverPier(10));
            addBuilding(-12, 10, NusantaraBuildingKit.generateRiverPier(8));
            addBuilding(12, 10, NusantaraBuildingKit.generateRiverPier(8));

            addContourPath(-16, 10, 16, 10, pathBlock, stairBlock);
            addVillageDetails(0, -6, { hasDryingRack: true, hasFirewood: true, hasWatchpost: true });
            break;
          }

          // Variant 1: Dermaga Muara Pasar Terapung (Floating River Market Hub)
          case 1: {
            addBuilding(0, -6, NusantaraBuildingKit.generateRumahBetang(20), {
              foundationFillBlock: BlockType.ULIN_IRONWOOD_LOG
            });
            addBuilding(-14, 8, NusantaraBuildingKit.generateRiverPier(10));
            addBuilding(0, 8, NusantaraBuildingKit.generateRiverPier(10));
            addBuilding(14, 8, NusantaraBuildingKit.generateRiverPier(10));

            addContourPath(-18, 8, 18, 8, pathBlock, stairBlock);
            addVillageDetails(0, -12, { hasDryingRack: true, hasFirewood: true });
            break;
          }

          // Variant 2: Kampung Titian Rawa Gambut (Interconnected Swamp Walkways)
          case 2: {
            addBuilding(-12, -8, NusantaraBuildingKit.generateRumahBetang(16));
            addBuilding(12, -8, NusantaraBuildingKit.generateRumahBetang(16));
            addBuilding(0, 8, NusantaraBuildingKit.generateRiverPier(12));

            addContourPath(-12, -4, 12, -4, pathBlock, stairBlock);
            addContourPath(0, -4, 0, 8, pathBlock, stairBlock);

            addVillageDetails(0, 0, { hasDryingRack: true, hasFirewood: true, hasWatchpost: true });
            break;
          }

          // Variant 3: Huma Betang Rimba Perawan (Canopy Rainforest Citadel)
          case 3: {
            addBuilding(0, -4, NusantaraBuildingKit.generateRumahBetang(32), {
              foundationFillBlock: BlockType.ULIN_IRONWOOD_LOG
            });
            addBuilding(-16, 8, NusantaraBuildingKit.generateTraditionalForge());
            addBuilding(16, 8, NusantaraBuildingKit.generateVillageWatchpost());

            addContourPath(-16, 8, 16, 8, pathBlock, stairBlock);
            addContourPath(0, 0, 0, 8, pathBlock, stairBlock);

            addVillageDetails(0, 4, { hasDryingRack: true, hasFirewood: true });
            break;
          }

          // Variant 4: Dusun Nelayan Pesisir Batang Air (Stilt Fishery Pier)
          default: {
            addBuilding(0, -10, NusantaraBuildingKit.generateRumahBetang(20));
            addBuilding(-10, 6, NusantaraBuildingKit.generateRiverPier(8));
            addBuilding(10, 6, NusantaraBuildingKit.generateRiverPier(8));
            addBuilding(0, 14, NusantaraBuildingKit.generateRiverPier(12));

            addContourPath(-12, 2, 12, 2, pathBlock, stairBlock);
            addContourPath(0, 2, 0, 14, pathBlock, stairBlock);

            addVillageDetails(0, -4, { hasDryingRack: true, hasFirewood: true, hasWatchpost: true });
            break;
          }
        }
        break;
      }

      // =======================================================================
      // 5. TORAJA HIGHLANDS (South Sulawesi Highlands)
      // =======================================================================
      case 'toraja_highlands': {
        const pathBlock = BlockType.STONE_SLAB;
        const stairBlock = BlockType.STONE_STAIRS;

        switch (layoutVariant) {
          // Variant 0: Rante Kete Kesu Axis (Sacred North-South Axis)
          case 0: {
            addBuilding(-8, -10, NusantaraBuildingKit.generateTongkonanLeylineHall());
            addBuilding(8, -10, NusantaraBuildingKit.generateTongkonan());

            addBuilding(-8, 8, NusantaraBuildingKit.generateAlangSurap());
            addBuilding(0, 8, NusantaraBuildingKit.generateAlangSurap());
            addBuilding(8, 8, NusantaraBuildingKit.generateAlangSurap());

            // Simbuang Batu Megaliths
            const megaliths = [[-4, -1], [4, -1], [-4, 2], [4, 2]];
            for (const [mx, mz] of megaliths) {
              allBlocks.push({ dx: mx, dy: 0, dz: mz, block: BlockType.CARVED_ANDESITE_STONE });
              allBlocks.push({ dx: mx, dy: 1, dz: mz, block: BlockType.CARVED_ANDESITE_STONE });
              allBlocks.push({ dx: mx, dy: 2, dz: mz, block: BlockType.CARVED_ANDESITE_STONE });
              allBlocks.push({ dx: mx, dy: 3, dz: mz, block: BlockType.AETHER_LANTERN });
            }

            addContourPath(-10, 0, 10, 0, pathBlock, stairBlock);
            addContourPath(0, -8, 0, 8, pathBlock, stairBlock);

            addVillageDetails(0, 4, { hasFirewood: true, hasLivestock: true, hasWell: true });
            break;
          }

          // Variant 1: Tongkonan Puncak Tebing Karst (Karst Cliff Fortress)
          case 1: {
            addBuilding(0, -12, NusantaraBuildingKit.generateTongkonanLeylineHall());
            addBuilding(0, 2, NusantaraBuildingKit.generateCliffSanctuary());
            addBuilding(-12, -4, NusantaraBuildingKit.generateAlangSurap());
            addBuilding(12, -4, NusantaraBuildingKit.generateAlangSurap());

            addContourPath(-12, -4, 12, -4, pathBlock, stairBlock);
            addContourPath(0, -10, 0, 2, pathBlock, stairBlock);

            addVillageDetails(0, -2, { hasWatchpost: true, hasFirewood: true });
            break;
          }

          // Variant 2: Lembah Lumbung Berundak (Tiered Granary Valley)
          case 2: {
            addBuilding(-10, -12, NusantaraBuildingKit.generateTongkonan());
            addBuilding(10, -12, NusantaraBuildingKit.generateTongkonan());
            addBuilding(-12, 4, NusantaraBuildingKit.generateAlangSurap());
            addBuilding(-4, 4, NusantaraBuildingKit.generateAlangSurap());
            addBuilding(4, 4, NusantaraBuildingKit.generateAlangSurap());
            addBuilding(12, 4, NusantaraBuildingKit.generateAlangSurap());

            addContourPath(-12, -2, 12, -2, pathBlock, stairBlock);
            addContourPath(0, -10, 0, 4, pathBlock, stairBlock);

            addVillageDetails(0, 12, { hasLivestock: true, hasFirewood: true, hasWell: true });
            break;
          }

          // Variant 3: Perkampungan Megalit Adat (Ancestral Standing Stones Circle)
          case 3: {
            addBuilding(0, -12, NusantaraBuildingKit.generateTongkonanLeylineHall());
            addBuilding(-14, 0, NusantaraBuildingKit.generateTongkonan());
            addBuilding(14, 0, NusantaraBuildingKit.generateTongkonan());
            addBuilding(0, 12, NusantaraBuildingKit.generateAlangSurap());

            // Ring of 8 megalith stones
            for (let deg = 0; deg < 360; deg += 45) {
              const rad = 6;
              const mx = Math.round(Math.cos((deg * Math.PI) / 180) * rad);
              const mz = Math.round(Math.sin((deg * Math.PI) / 180) * rad);
              allBlocks.push({ dx: mx, dy: 0, dz: mz, block: BlockType.CARVED_ANDESITE_STONE });
              allBlocks.push({ dx: mx, dy: 1, dz: mz, block: BlockType.CARVED_ANDESITE_STONE });
              allBlocks.push({ dx: mx, dy: 2, dz: mz, block: BlockType.AETHER_LANTERN });
            }

            addContourPath(-14, 0, 14, 0, pathBlock, stairBlock);
            addContourPath(0, -10, 0, 12, pathBlock, stairBlock);

            addVillageDetails(0, 0, { hasFirewood: true, hasBench: true });
            break;
          }

          // Variant 4: Dusun Sa'dan Lembah Hijau (Riverside Toraja Hamlet)
          default: {
            addBuilding(0, -10, NusantaraBuildingKit.generateTongkonan());
            addBuilding(-12, 4, NusantaraBuildingKit.generateAlangSurap());
            addBuilding(12, 4, NusantaraBuildingKit.generateAlangSurap());
            addBuilding(0, 12, NusantaraBuildingKit.generateSubakTerracePlot(8, 6));

            addContourPath(-12, 0, 12, 0, pathBlock, stairBlock);
            addContourPath(0, -8, 0, 12, pathBlock, stairBlock);

            addVillageDetails(0, 0, { hasWell: true, hasDryingRack: true, hasFirewood: true });
            break;
          }
        }
        break;
      }

      // =======================================================================
      // 6. PAPUAN HIGHLANDS (Baliem Valley & Jayawijaya)
      // =======================================================================
      case 'papua_highlands': {
        const pathBlock = BlockType.DIRT;
        const stairBlock = BlockType.WOOD_SLAB;

        switch (layoutVariant) {
          // Variant 0: Silimo Melingkar Lembah Baliem (Classic Circular Silimo Compound)
          case 0: {
            // Central fire hearth
            allBlocks.push({ dx: 0, dy: 0, dz: 0, block: BlockType.COBBLESTONE });
            allBlocks.push({ dx: 0, dy: 1, dz: 0, block: BlockType.TORCH });

            // Circular ring of 4 Honai huts
            const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
            const rad = 10;
            for (const ang of angles) {
              const hx = Math.round(Math.cos(ang) * rad);
              const hz = Math.round(Math.sin(ang) * rad);
              addBuilding(hx, hz, NusantaraBuildingKit.generateHonai());
            }

            // Circular bamboo perimeter fence with 4 entrance gaps
            for (let deg = 0; deg < 360; deg += 15) {
              const radFence = 17;
              const fx = Math.round(Math.cos((deg * Math.PI) / 180) * radFence);
              const fz = Math.round(Math.sin((deg * Math.PI) / 180) * radFence);
              if (deg % 90 !== 0) {
                allBlocks.push({ dx: fx, dy: 1, dz: fz, block: BlockType.BAMBOO_FENCE });
              }
            }

            addVillageDetails(0, 0, { hasFirewood: true, hasDryingRack: true });
            break;
          }

          // Variant 1: Kampung Honai Lereng Berundak (Stepped Highland Slope)
          case 1: {
            addBuilding(0, -14, NusantaraBuildingKit.generateHonai());
            addBuilding(-12, -4, NusantaraBuildingKit.generateHonai());
            addBuilding(12, -4, NusantaraBuildingKit.generateHonai());
            addBuilding(0, 8, NusantaraBuildingKit.generateHonai());

            addContourPath(0, 16, 0, -12, pathBlock, stairBlock);
            addContourPath(-12, -4, 12, -4, pathBlock, stairBlock);

            addVillageDetails(0, 2, { hasFirewood: true, hasDryingRack: true, hasWatchpost: true });
            break;
          }

          // Variant 2: Silimo Perapian & Lumbung Wamai (Homestead with Animal Pen)
          case 2: {
            addBuilding(0, -10, NusantaraBuildingKit.generateHonai());
            addBuilding(-10, 2, NusantaraBuildingKit.generateEbeai());
            addBuilding(10, 2, NusantaraBuildingKit.generateEbeai());
            addBuilding(0, 12, NusantaraBuildingKit.generateLivestockShelter(6, 6));

            addContourPath(-10, 2, 10, 2, pathBlock, stairBlock);
            addContourPath(0, -8, 0, 10, pathBlock, stairBlock);

            addVillageDetails(0, 0, { hasFirewood: true, hasDryingRack: true });
            break;
          }

          // Variant 3: Pos Pantau Puncak Lembah (Highland Watchpost Sanctuary)
          case 3: {
            addBuilding(0, -12, NusantaraBuildingKit.generateVillageWatchpost());
            addBuilding(-10, 0, NusantaraBuildingKit.generateHonai());
            addBuilding(10, 0, NusantaraBuildingKit.generateHonai());
            addBuilding(0, 10, NusantaraBuildingKit.generateHonai());

            addContourPath(0, 14, 0, -10, pathBlock, stairBlock);
            addContourPath(-10, 0, 10, 0, pathBlock, stairBlock);

            addVillageDetails(0, 4, { hasFirewood: true });
            break;
          }

          // Variant 4: Silimo Lembah Hutan Lumut (Moss Forest Clan Cluster)
          default: {
            addBuilding(-8, -8, NusantaraBuildingKit.generateHonai());
            addBuilding(8, -8, NusantaraBuildingKit.generateHonai());
            addBuilding(0, 6, NusantaraBuildingKit.generateEbeai());

            allBlocks.push({ dx: 0, dy: 0, dz: -2, block: BlockType.COBBLESTONE });
            allBlocks.push({ dx: 0, dy: 1, dz: -2, block: BlockType.TORCH });

            addContourPath(-8, -8, 8, -8, pathBlock, stairBlock);
            addContourPath(0, -2, 0, 6, pathBlock, stairBlock);

            addVillageDetails(0, 2, { hasFirewood: true, hasDryingRack: true });
            break;
          }
        }
        break;
      }

      // =======================================================================
      // 7. EASTERN ISLES & SASAK (Lombok, Sumba, Flores, Maluku)
      // =======================================================================
      case 'eastern_isles':
      default: {
        const pathBlock = BlockType.SAND;
        const stairBlock = BlockType.WOOD_SLAB;

        switch (layoutVariant) {
          // Variant 0: Bale Tani Sade Savanna (Dispersed Savanna with Uma Kalada)
          case 0: {
            addBuilding(0, -8, NusantaraBuildingKit.generateUmaKalada());
            addBuilding(-12, 6, NusantaraBuildingKit.generateSasakLumbung());
            addBuilding(12, 6, NusantaraBuildingKit.generateSasakLumbung());
            addBuilding(0, 14, NusantaraBuildingKit.generatePendopo());

            addContourPath(0, -6, 0, 14, pathBlock, stairBlock);
            addContourPath(-12, 6, 12, 6, pathBlock, stairBlock);

            addVillageDetails(0, 0, { hasWell: true, hasDryingRack: true, hasFirewood: true });
            break;
          }

          // Variant 1: Kampung Nelayan Karang Pesisir (Coastal Fishing Village)
          case 1: {
            addBuilding(0, -8, NusantaraBuildingKit.generateSasakBaleTani());
            addBuilding(-12, 4, NusantaraBuildingKit.generateRiverPier(8));
            addBuilding(12, 4, NusantaraBuildingKit.generateRiverPier(8));
            addBuilding(0, 12, NusantaraBuildingKit.generateSasakLumbung());

            addContourPath(-12, 0, 12, 0, pathBlock, stairBlock);
            addContourPath(0, -6, 0, 12, pathBlock, stairBlock);

            addVillageDetails(0, 0, { hasDryingRack: true, hasFirewood: true });
            break;
          }

          // Variant 2: Dusun Lumbung Perbukitan Kering (Dry Hills Granary Cluster)
          case 2: {
            addBuilding(-12, -8, NusantaraBuildingKit.generateSasakLumbung());
            addBuilding(0, -8, NusantaraBuildingKit.generateSasakLumbung());
            addBuilding(12, -8, NusantaraBuildingKit.generateSasakLumbung());
            addBuilding(0, 8, NusantaraBuildingKit.generateSasakBaleTani());

            addContourPath(-12, 0, 12, 0, pathBlock, stairBlock);
            addContourPath(0, -8, 0, 8, pathBlock, stairBlock);

            addVillageDetails(0, 0, { hasWell: true, hasDryingRack: true, hasFirewood: true });
            break;
          }

          // Variant 3: Baileo Negeri Pusaka Adat (Ancestral Council Village)
          case 3: {
            addBuilding(0, -6, NusantaraBuildingKit.generatePendopo());
            addBuilding(-14, 4, NusantaraBuildingKit.generateUmaKalada());
            addBuilding(14, 4, NusantaraBuildingKit.generateUmaKalada());
            addBuilding(0, 14, NusantaraBuildingKit.generateSasakLumbung());

            addContourPath(-14, 4, 14, 4, pathBlock, stairBlock);
            addContourPath(0, -4, 0, 14, pathBlock, stairBlock);

            addVillageDetails(0, 4, { hasWell: true, hasFlowerPlanters: true, hasBench: true });
            break;
          }

          // Variant 4: Dusun Pengrajin Tenun & Kebun Palawija (Weaving & Farming Hamlet)
          default: {
            addBuilding(0, -8, NusantaraBuildingKit.generateSasakBaleTani());
            addBuilding(-12, 4, NusantaraBuildingKit.generateSasakBaleTani());
            addBuilding(12, 4, NusantaraBuildingKit.generateSasakLumbung());
            addBuilding(0, 14, NusantaraBuildingKit.generateSubakTerracePlot(8, 6));

            addContourPath(-12, 0, 12, 0, pathBlock, stairBlock);
            addContourPath(0, -6, 0, 14, pathBlock, stairBlock);

            addVillageDetails(0, 0, { hasWell: true, hasDryingRack: true, hasLivestock: true });
            break;
          }
        }
        break;
      }
    }

    return allBlocks;
  }
}
