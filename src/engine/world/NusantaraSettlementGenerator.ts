// Nusantara Settlement Grammar Generator 1.0
// Procedural placement of modular buildings, path networks, farming terraces, market squares, and Aether conduits
import { BlockType } from '../../types';
import { VoxelBlockPlacement } from './StructureGenerator';
import { NusantaraBuildingKit } from './NusantaraBuildingKit';
import { NUSANTARA_SETTLEMENT_STYLES } from './NusantaraArchitectureStyles';

export interface SettlementBuildingPlacement {
  type: string;
  worldX: number;
  worldY: number;
  worldZ: number;
  blocks: VoxelBlockPlacement[];
}

export class NusantaraSettlementGenerator {

  /**
   * Generates a complete cultural settlement layout for a given region at a center position
   */
  public static generateSettlement(
    regionId: string,
    centerX: number,
    baseY: number,
    centerZ: number,
    seed: number = 42
  ): VoxelBlockPlacement[] {
    const style = NUSANTARA_SETTLEMENT_STYLES[regionId] || NUSANTARA_SETTLEMENT_STYLES['tanah_jawa'];
    const allBlocks: VoxelBlockPlacement[] = [];

    const addBuilding = (bx: number, by: number, bz: number, pieces: VoxelBlockPlacement[]) => {
      for (const p of pieces) {
        allBlocks.push({
          dx: (bx - centerX) + p.dx,
          dy: (by - baseY) + p.dy,
          dz: (bz - centerZ) + p.dz,
          block: p.block,
        });
      }
    };

    const addPath = (x1: number, z1: number, x2: number, z2: number, pathBlock: BlockType) => {
      const steps = Math.max(Math.abs(x2 - x1), Math.abs(z2 - z1));
      if (steps === 0) return;
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = Math.round(x1 + (x2 - x1) * t);
        const pz = Math.round(z1 + (z2 - z1) * t);
        allBlocks.push({
          dx: px - centerX,
          dy: 0,
          dz: pz - centerZ,
          block: pathBlock,
        });
      }
    };

    switch (regionId) {
      // 1. TANAH MINANG: Linear Mountain Village Layout along slope
      case 'tanah_minang': {
        // Central Balairung / Grand Rumah Gadang
        addBuilding(centerX, baseY, centerZ - 10, NusantaraBuildingKit.generateRumahGadang(true));

        // Two standard Rumah Gadang on terrace sides
        addBuilding(centerX - 16, baseY + 1, centerZ + 5, NusantaraBuildingKit.generateRumahGadang(false));
        addBuilding(centerX + 16, baseY + 1, centerZ + 5, NusantaraBuildingKit.generateRumahGadang(false));

        // Two Rangkiang granaries in the courtyard
        addBuilding(centerX - 6, baseY, centerZ + 12, NusantaraBuildingKit.generateRangkiang('si_bayau_bayau'));
        addBuilding(centerX + 6, baseY, centerZ + 12, NusantaraBuildingKit.generateRangkiang('sitinjau_lauik'));

        // Surau on slightly elevated eastern terrace
        addBuilding(centerX + 18, baseY + 2, centerZ - 12, NusantaraBuildingKit.generateSurau());

        // Flagstone paths connecting buildings
        addPath(centerX, centerZ + 15, centerX, centerZ - 8, BlockType.COBBLESTONE);
        addPath(centerX - 15, centerZ + 5, centerX, centerZ + 5, BlockType.COBBLESTONE);
        addPath(centerX + 15, centerZ + 5, centerX, centerZ + 5, BlockType.COBBLESTONE);
        addPath(centerX, centerZ - 8, centerX + 18, centerZ - 10, BlockType.COBBLESTONE);

        // Subak-inspired mountain sawah rice terraces nearby
        for (let tx = -12; tx <= 12; tx += 4) {
          allBlocks.push({ dx: tx, dy: 0, dz: 22, block: BlockType.TERRACE_WATERWAY });
          allBlocks.push({ dx: tx, dy: 0, dz: 23, block: BlockType.FARMLAND });
          allBlocks.push({ dx: tx, dy: 1, dz: 23, block: BlockType.CROP_WHEAT_3 });
        }
        break;
      }

      // 2. TANAH JAWA: Alun-Alun Central Grid with Pendopo, Pasar & Joglo
      case 'tanah_jawa': {
        // Center: Grand Pendopo & Alun-Alun
        addBuilding(centerX, baseY, centerZ, NusantaraBuildingKit.generatePendopo());

        // North: Master Joglo
        addBuilding(centerX, baseY, centerZ - 18, NusantaraBuildingKit.generateJoglo());

        // East & West: Limasan houses
        addBuilding(centerX - 18, baseY, centerZ - 8, NusantaraBuildingKit.generateLimasan());
        addBuilding(centerX + 18, baseY, centerZ - 8, NusantaraBuildingKit.generateLimasan());

        // South: Traditional Market (Pasar)
        addBuilding(centerX - 10, baseY, centerZ + 14, NusantaraBuildingKit.generatePasarTradisional());

        // Entrance: Gapura Majapahit gates
        addBuilding(centerX, baseY, centerZ + 24, NusantaraBuildingKit.generateGapuraMajapahit());

        // Village Cobble/Gravel Lanes
        addPath(centerX, centerZ + 24, centerX, centerZ - 18, BlockType.GRAVEL);
        addPath(centerX - 18, centerZ - 8, centerX + 18, centerZ - 8, BlockType.GRAVEL);
        addPath(centerX - 18, centerZ + 14, centerX + 18, centerZ + 14, BlockType.GRAVEL);
        break;
      }

      // 3. BALI HIGHLANDS: Sanga Mandala Axis with Candi Bentar, Meru & Subak
      case 'bali_highlands': {
        // Main split gate entrance
        addBuilding(centerX, baseY, centerZ + 20, NusantaraBuildingKit.generateCandiBentar());

        // Bale Banjar community hall in the lower courtyard
        addBuilding(centerX - 12, baseY, centerZ + 6, NusantaraBuildingKit.generatePendopo());

        // Central sacred court with Aether conduits
        for (let x = -4; x <= 4; x++) {
          allBlocks.push({ dx: x, dy: 0, dz: 0, block: BlockType.AETHER_CONDUIT_FLOOR });
        }
        for (let z = -4; z <= 4; z++) {
          allBlocks.push({ dx: 0, dy: 0, dz: z, block: BlockType.AETHER_CONDUIT_FLOOR });
        }

        // Sacred Inner Sanctuary: High Meru Towers (3-tier and 5-tier)
        addBuilding(centerX, baseY + 1, centerZ - 14, NusantaraBuildingKit.generateMeruTower(5));
        addBuilding(centerX - 8, baseY + 1, centerZ - 12, NusantaraBuildingKit.generateMeruTower(3));
        addBuilding(centerX + 8, baseY + 1, centerZ - 12, NusantaraBuildingKit.generateMeruTower(3));

        // Subak water flumes feeding rice paddies
        addBuilding(centerX + 16, baseY, centerZ + 6, NusantaraBuildingKit.generateSubakWaterDivision());

        // Andesite stone paved court
        addPath(centerX, centerZ + 20, centerX, centerZ - 12, BlockType.CARVED_ANDESITE_STONE);
        break;
      }

      // 4. BORNEO RIVERLANDS: Riverine Linear Settlement along Ulin Boardwalks
      case 'borneo_riverlands': {
        // Gigantic Huma Betang longhouse
        addBuilding(centerX, baseY, centerZ, NusantaraBuildingKit.generateRumahBetang(28));

        // River boardwalk piers extending out towards water
        addBuilding(centerX, baseY, centerZ + 10, NusantaraBuildingKit.generateRiverPier(10));
        addBuilding(centerX - 12, baseY, centerZ + 10, NusantaraBuildingKit.generateRiverPier(8));
        addBuilding(centerX + 12, baseY, centerZ + 10, NusantaraBuildingKit.generateRiverPier(8));

        // Catwalk linking piers along the riverfront
        addPath(centerX - 16, centerZ + 10, centerX + 16, centerZ + 10, BlockType.ULIN_IRONWOOD_PLANKS);
        break;
      }

      // 5. TORAJA HIGHLANDS: North-South Sacred Axis, Tongkonan facing Alang Granaries
      case 'toraja_highlands': {
        // Northern row: 2 Great Tongkonan
        addBuilding(centerX - 8, baseY, centerZ - 10, NusantaraBuildingKit.generateTongkonan());
        addBuilding(centerX + 8, baseY, centerZ - 10, NusantaraBuildingKit.generateTongkonan());

        // Southern row: 3 Alang granaries facing Tongkonan
        addBuilding(centerX - 8, baseY, centerZ + 8, NusantaraBuildingKit.generateAlangSurap());
        addBuilding(centerX, baseY, centerZ + 8, NusantaraBuildingKit.generateAlangSurap());
        addBuilding(centerX + 8, baseY, centerZ + 8, NusantaraBuildingKit.generateAlangSurap());

        // Central grassy Rante courtyard with megalithic standing stones (Simbuang Batu)
        const megaliths = [[-4, -1], [4, -1], [-4, 2], [4, 2]];
        for (const [mx, mz] of megaliths) {
          allBlocks.push({ dx: mx, dy: 0, dz: mz, block: BlockType.CARVED_ANDESITE_STONE });
          allBlocks.push({ dx: mx, dy: 1, dz: mz, block: BlockType.CARVED_ANDESITE_STONE });
          allBlocks.push({ dx: mx, dy: 2, dz: mz, block: BlockType.CARVED_ANDESITE_STONE });
          allBlocks.push({ dx: mx, dy: 3, dz: mz, block: BlockType.AETHER_LANTERN });
        }

        // Stone slab path connecting the courtyard
        addPath(centerX - 10, centerZ, centerX + 10, centerZ, BlockType.STONE_SLAB);
        break;
      }

      // 6. PAPUAN HIGHLANDS: Circular Silimo Compound with Honai & Ebeai
      case 'papua_highlands': {
        // Central sacred fire hearth
        allBlocks.push({ dx: 0, dy: 0, dz: 0, block: BlockType.COBBLESTONE });
        allBlocks.push({ dx: 0, dy: 1, dz: 0, block: BlockType.TORCH });

        // Circular ring of Honai huts
        const angles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
        const rad = 10;
        for (const ang of angles) {
          const hx = Math.round(centerX + Math.cos(ang) * rad);
          const hz = Math.round(centerZ + Math.sin(ang) * rad);
          addBuilding(hx, baseY, hz, NusantaraBuildingKit.generateHonai());
        }

        // Circular bamboo fence perimeter
        for (let deg = 0; deg < 360; deg += 15) {
          const radFence = 17;
          const fx = Math.round(Math.cos((deg * Math.PI) / 180) * radFence);
          const fz = Math.round(Math.sin((deg * Math.PI) / 180) * radFence);
          if (deg % 90 !== 0) { // Keep 4 gateway gaps
            allBlocks.push({ dx: fx, dy: 1, dz: fz, block: BlockType.BAMBOO_FENCE });
          }
        }
        break;
      }

      // 7. EASTERN ISLES: Dispersed Savanna with Uma Kalada & Sasak Lumbung
      case 'eastern_isles':
      default: {
        // Central Uma Kalada ancestral tower house
        addBuilding(centerX, baseY, centerZ - 6, NusantaraBuildingKit.generateUmaKalada());

        // Two Sasak lumbungs
        addBuilding(centerX - 10, baseY, centerZ + 8, NusantaraBuildingKit.generateSasakLumbung());
        addBuilding(centerX + 10, baseY, centerZ + 8, NusantaraBuildingKit.generateSasakLumbung());

        // Baileo open council pavilion
        addBuilding(centerX, baseY, centerZ + 14, NusantaraBuildingKit.generatePendopo());

        // Sand paths
        addPath(centerX, centerZ - 6, centerX, centerZ + 14, BlockType.SAND);
        addPath(centerX - 10, centerZ + 8, centerX + 10, centerZ + 8, BlockType.SAND);
        break;
      }
    }

    return allBlocks;
  }
}
