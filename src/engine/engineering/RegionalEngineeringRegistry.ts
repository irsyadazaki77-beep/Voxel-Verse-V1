// Regional Engineering Registry & Data-Driven Schematics
// Craftsmen recipes integrating Nusantara natural materials, traditional joinery, and ritualized Aether technology.

import { ItemStack } from '../../types';
import { AETHER_TRADITIONS, AetherTraditionId } from './AetherTraditions';
import { ResonanceNexusManager } from './ResonanceNexusManager';

export interface RegionalRecipe {
  id: string;
  name: string;
  traditionId: AetherTraditionId;
  category: 'irrigation' | 'resonance' | 'navigation' | 'guardian' | 'storage' | 'energy' | 'masterpiece';
  description: string;
  requiredMaterials: Array<{ itemId: string; count: number; name: string }>;
  outputItemId: string;
  outputCount: number;
  craftingTimeSeconds: number;
  powerOutput?: number; // AE/s
  powerDemand?: number;  // AE/s
  specialProperty: string;
}

export const REGIONAL_ENGINEERING_RECIPES: Record<string, RegionalRecipe> = {
  // --- TANAH JAWA (TIRTA & CANDI) ---
  subak_irrigation_gate: {
    id: 'subak_irrigation_gate',
    name: 'Pintu Air Subak Tirta Aether',
    traditionId: 'jawa_tirta',
    category: 'irrigation',
    description: 'Pintu air irigasi andesit bertatah kristal yang menyalurkan nutrisi leylines ke sawah bertingkat.',
    requiredMaterials: [
      { itemId: 'andesite_block', count: 8, name: 'Batu Andesit Kuno' },
      { itemId: 'aether_crystal', count: 4, name: 'Kristal Aether' },
      { itemId: 'copper_ingot', count: 4, name: 'Batang Tembaga' },
      { itemId: 'terrace_waterway', count: 2, name: 'Talang Air Irigasi' }
    ],
    outputItemId: 'subak_irrigation_gate',
    outputCount: 1,
    craftingTimeSeconds: 4,
    powerDemand: 5,
    specialProperty: '+30% Kecepatan Panen Padi dan menjaga tanah tetap gembur otomatis.'
  },
  candi_resonance_stupa: {
    id: 'candi_resonance_stupa',
    name: 'Stupa Resonansi Candi Majapahit',
    traditionId: 'jawa_tirta',
    category: 'resonance',
    description: 'Monolit andesit stupa penyerap frekuensi leylines yang menolak pengaruh cuaca buruk dan kabut kegelapan.',
    requiredMaterials: [
      { itemId: 'stone_bricks', count: 16, name: 'Bata Andesit Pahat' },
      { itemId: 'aether_altar_core', count: 1, name: 'Inti Altar Aether' },
      { itemId: 'kris_pusaka', count: 1, name: 'Keris Pamor Majapahit' },
      { itemId: 'gold_ingot', count: 4, name: 'Batang Emas' }
    ],
    outputItemId: 'candi_resonance_stupa',
    outputCount: 1,
    craftingTimeSeconds: 8,
    powerOutput: 25,
    specialProperty: 'Memancarkan pendaran cyan dan menambah +15 World Stability regional.'
  },

  // --- TANAH MINANG (GONJONG & LUHAK) ---
  rangkiang_aether_lantern: {
    id: 'rangkiang_aether_lantern',
    name: 'Lentera Gonjong Kristal Minangkabau',
    traditionId: 'minang_gonjong',
    category: 'storage',
    description: 'Lentera kristal berpelindung kuningan berukir Kaluak Paku yang mengawetkan hasil lumbung padi.',
    requiredMaterials: [
      { itemId: 'wood_planks', count: 6, name: 'Papan Kayu Surian' },
      { itemId: 'silver_filigree', count: 2, name: 'Filigree Perak Minang' },
      { itemId: 'aether_crystal', count: 3, name: 'Kristal Aether' },
      { itemId: 'ijuk_thatch', count: 4, name: 'Ijuk Atap Enau' }
    ],
    outputItemId: 'rangkiang_aether_lantern',
    outputCount: 1,
    craftingTimeSeconds: 3,
    powerDemand: 3,
    specialProperty: 'Menghalau hama lumbung dan melipatgandakan hasil benih hingga +20%.'
  },
  marapi_resonance_spire: {
    id: 'marapi_resonance_spire',
    name: 'Menara Gema Luhak Marapi',
    traditionId: 'minang_gonjong',
    category: 'resonance',
    description: 'Menara pengawas beratap gonjong bertanduk ganda penangkap leylines gunung berapi.',
    requiredMaterials: [
      { itemId: 'stone_bricks', count: 12, name: 'Batu Karang Ngarai' },
      { itemId: 'carved_beam', count: 4, name: 'Balok Ukir Minang' },
      { itemId: 'songket_emas', count: 1, name: 'Kain Songket Emas' },
      { itemId: 'aether_crystal', count: 6, name: 'Kristal Aether' }
    ],
    outputItemId: 'marapi_resonance_spire',
    outputCount: 1,
    craftingTimeSeconds: 6,
    powerOutput: 20,
    specialProperty: 'Mendeteksi pergerakan monster dan anomali leylines dari jarak 64 blok.'
  },

  // --- BORNEO RIVERLANDS (SUAR & BETANG) ---
  river_navigation_beacon: {
    id: 'river_navigation_beacon',
    name: 'Tugu Suar Sungai Ulin Batang Kapuas',
    traditionId: 'borneo_river',
    category: 'navigation',
    description: 'Mercusuar sungai dari kayu besi ulin tahan air bergetah damar hijau zamrud pemandu arah perahu.',
    requiredMaterials: [
      { itemId: 'ulin_timber_crate', count: 2, name: 'Kayu Ulin Membatu' },
      { itemId: 'damar_resin', count: 4, name: 'Getah Damar Rimba' },
      { itemId: 'aether_crystal', count: 4, name: 'Kristal Aether' },
      { itemId: 'copper_ingot', count: 4, name: 'Batang Tembaga' }
    ],
    outputItemId: 'river_navigation_beacon',
    outputCount: 1,
    craftingTimeSeconds: 5,
    powerDemand: 4,
    specialProperty: 'Membelah kabut sungai tebal dan meningkatkan laju perahu sebesar +35%.'
  },
  betang_power_network: {
    id: 'betang_power_network',
    name: 'Jaringan Daya Rumah Betang Ulin',
    traditionId: 'borneo_river',
    category: 'energy',
    description: 'Generator kincir air sungai bertenaga serat damar untuk menyuplai daya ke seluruh rumah panggung.',
    requiredMaterials: [
      { itemId: 'ulin_timber_crate', count: 3, name: 'Kayu Ulin Membatu' },
      { itemId: 'damar_resin', count: 6, name: 'Getah Damar Rimba' },
      { itemId: 'iron_ingot', count: 4, name: 'Batang Besi' },
      { itemId: 'aether_crystal', count: 6, name: 'Kristal Aether' }
    ],
    outputItemId: 'betang_power_network',
    outputCount: 1,
    craftingTimeSeconds: 7,
    powerOutput: 30,
    specialProperty: 'Menyuplai energi nirkabel 30 AE/s ke seluruh mesin di sepanjang dermaga dan rumah panggung.'
  },

  // --- BALI HIGHLANDS (TIRTA DHARMA & CANDI BENTAR) ---
  candi_bentar_aether_gate: {
    id: 'candi_bentar_aether_gate',
    name: 'Gapura Candi Bentar Aether Gateway',
    traditionId: 'bali_dharma',
    category: 'guardian',
    description: 'Gerbang terbelah simetris batu paras berukir Barong pemurni energi void.',
    requiredMaterials: [
      { itemId: 'split_gate_stone', count: 4, name: 'Batu Candi Bentar' },
      { itemId: 'paras_stone_carving', count: 4, name: 'Ukiran Paras Dewata' },
      { itemId: 'aether_crystal', count: 6, name: 'Kristal Aether' },
      { itemId: 'dupa_sesaji', count: 8, name: 'Dupa Sesaji Canang' }
    ],
    outputItemId: 'candi_bentar_aether_gate',
    outputCount: 1,
    craftingTimeSeconds: 6,
    powerDemand: 6,
    specialProperty: 'Memblokir masuknya makhluk kutukan void dan memurnikan racun korupsi.'
  },
  sacred_subak_aqueduct: {
    id: 'sacred_subak_aqueduct',
    name: 'Talang Tirta Amerta Subak',
    traditionId: 'bali_dharma',
    category: 'irrigation',
    description: 'Talang air bertingkat berukir patra punggel yang menyuburkan seluruh petak sawah berundak.',
    requiredMaterials: [
      { itemId: 'terrace_waterway', count: 6, name: 'Talang Irigasi Paras' },
      { itemId: 'aether_crystal', count: 4, name: 'Kristal Aether' },
      { itemId: 'gold_ingot', count: 2, name: 'Batang Emas' },
      { itemId: 'gaharu_incense', count: 4, name: 'Dupa Kayu Gaharu' }
    ],
    outputItemId: 'sacred_subak_aqueduct',
    outputCount: 1,
    craftingTimeSeconds: 5,
    powerOutput: 15,
    specialProperty: '+40% Kecepatan Panen Padi dan menghasilkan varietas Beras Suci Tirta.'
  },

  // --- TORAJA HIGHLANDS (SIMBUANG & TONGKONAN) ---
  simbuang_standing_stone: {
    id: 'simbuang_standing_stone',
    name: 'Megalit Simbuang Batu Ley Purba',
    traditionId: 'toraja_megalith',
    category: 'resonance',
    description: 'Monolit karst berdiri tegak pengikat leylines pegunungan dan pelindung ketahanan fisik.',
    requiredMaterials: [
      { itemId: 'stone_alang_pillar', count: 4, name: 'Pilar Batu Karst Toraja' },
      { itemId: 'tanduk_tedong_bonga', count: 2, name: 'Tanduk Kerbau Bonga' },
      { itemId: 'aether_crystal', count: 6, name: 'Kristal Aether' },
      { itemId: 'carved_beam', count: 4, name: 'Balok Ukir Pa\'tedong' }
    ],
    outputItemId: 'simbuang_standing_stone',
    outputCount: 1,
    craftingTimeSeconds: 8,
    powerOutput: 25,
    specialProperty: 'Meningkatkan poise pertahanan fisik sekutu sebesar +25% dalam radius 32 blok.'
  },
  alang_resonance_vault: {
    id: 'alang_resonance_vault',
    name: 'Lumbung Alang Resonansi Pusaka',
    traditionId: 'toraja_megalith',
    category: 'storage',
    description: 'Lumbung berukir di atas pilar bulat batu karst yang melipatgandakan penyimpanan mineral dan benih.',
    requiredMaterials: [
      { itemId: 'carved_beam', count: 6, name: 'Balok Ukir Pa\'tedong' },
      { itemId: 'stone_alang_pillar', count: 4, name: 'Pilar Batu Karst' },
      { itemId: 'aether_crystal', count: 4, name: 'Kristal Aether' },
      { itemId: 'iron_ingot', count: 4, name: 'Batang Besi' }
    ],
    outputItemId: 'alang_resonance_vault',
    outputCount: 1,
    craftingTimeSeconds: 5,
    powerDemand: 4,
    specialProperty: 'Penyimpanan anti-bakar dengan kapasitas 4x lipat peti biasa.'
  },

  // --- PAPUAN HIGHLANDS (HONAI & KANOPI) ---
  honai_hearth_core: {
    id: 'honai_hearth_core',
    name: 'Tungku Api Perapian Honai Aether',
    traditionId: 'papua_honai',
    category: 'energy',
    description: 'Perapian bundar bertatah kristal sukma ungu pemancar kehangatan abadi penakluk hawa dingin alpine.',
    requiredMaterials: [
      { itemId: 'pine_log', count: 8, name: 'Kayu Pinus Alpine' },
      { itemId: 'noken_woven', count: 2, name: 'Rajutan Serat Noken' },
      { itemId: 'aether_crystal', count: 4, name: 'Kristal Aether' },
      { itemId: 'coal', count: 12, name: 'Batu Bara Rimba' }
    ],
    outputItemId: 'honai_hearth_core',
    outputCount: 1,
    craftingTimeSeconds: 4,
    powerOutput: 20,
    specialProperty: 'Kekebalan dingin penuh dan memulihkan HP 3x lipat di sekitar perapian.'
  },
  asmat_canopy_sentinel: {
    id: 'asmat_canopy_sentinel',
    name: 'Suar Kanopi Pohon Korowai Asmat',
    traditionId: 'papua_honai',
    category: 'guardian',
    description: 'Menara bidik di puncak kanopi pohon yang menembakkan panah energi otomatis ke arah monster buas.',
    requiredMaterials: [
      { itemId: 'perisai_asmat_pusaka', count: 1, name: 'Perisai Asmat Pusaka' },
      { itemId: 'noken_woven', count: 3, name: 'Rajutan Serat Noken' },
      { itemId: 'aether_crystal', count: 6, name: 'Kristal Aether' },
      { itemId: 'wood_planks', count: 12, name: 'Papan Kayu Rimba' }
    ],
    outputItemId: 'asmat_canopy_sentinel',
    outputCount: 1,
    craftingTimeSeconds: 7,
    powerDemand: 5,
    specialProperty: 'Menembakkan panah energi penembus zirah hingga jarak 40 blok.'
  },

  // --- EASTERN ISLES (BADAI & REMPAH) ---
  storm_lightning_collector: {
    id: 'storm_lightning_collector',
    name: 'Penangkal Badai Kilat Ternate',
    traditionId: 'nusa_storm',
    category: 'energy',
    description: 'Tiang tembaga penangkap kilatan petir samudra yang menghasilkan lonjakan daya Aether masif.',
    requiredMaterials: [
      { itemId: 'copper_ingot', count: 12, name: 'Batang Tembaga Kapal' },
      { itemId: 'kristal_garam_samudra', count: 4, name: 'Kristal Garam Karang' },
      { itemId: 'aether_crystal', count: 6, name: 'Kristal Aether' },
      { itemId: 'coral_block', count: 4, name: 'Bongkahan Karang Laut' }
    ],
    outputItemId: 'storm_lightning_collector',
    outputCount: 1,
    craftingTimeSeconds: 8,
    powerOutput: 45,
    specialProperty: 'Menyerap 100% petir dan menghasilkan 45 AE/s saat cuaca badai.'
  },
  coral_navigation_beacon: {
    id: 'coral_navigation_beacon',
    name: 'Mercusuar Kristal Karang Samudra',
    traditionId: 'nusa_storm',
    category: 'navigation',
    description: 'Menara karang bercahaya pemandu armada kapal laut lepas menembus badai kabut tebal.',
    requiredMaterials: [
      { itemId: 'coral_block', count: 8, name: 'Batu Karang Putih' },
      { itemId: 'kristal_garam_samudra', count: 6, name: 'Kristal Garam Karang' },
      { itemId: 'aether_crystal', count: 4, name: 'Kristal Aether' },
      { itemId: 'songket_emas', count: 1, name: 'Kain Tenun Subahnale' }
    ],
    outputItemId: 'coral_navigation_beacon',
    outputCount: 1,
    craftingTimeSeconds: 5,
    powerDemand: 5,
    specialProperty: 'Menghilangkan kabut laut 48 blok dan memberi +40% kecepatan pelayaran laut.'
  },

  // --- MASTERPIECE (NEXUS CONVERGENCE) ---
  schematic_nusantara_convergence_altar: {
    id: 'schematic_nusantara_convergence_altar',
    name: 'Altar Mahakarya Konvergensi Nusantara',
    traditionId: 'jawa_tirta',
    category: 'masterpiece',
    description: 'Altar agung pemersatu 7 Tradisi Aether yang memancarkan aura kestabilan absolut ke seluruh penjuru semesta.',
    requiredMaterials: [
      { itemId: 'andesite_block', count: 32, name: 'Batu Andesit Kuno' },
      { itemId: 'ulin_timber_crate', count: 16, name: 'Kayu Ulin Membatu' },
      { itemId: 'paras_stone_carving', count: 16, name: 'Ukiran Paras Dewata' },
      { itemId: 'kristal_garam_samudra', count: 16, name: 'Kristal Garam Karang' },
      { itemId: 'aether_altar_core', count: 4, name: 'Inti Altar Aether' }
    ],
    outputItemId: 'nusantara_convergence_altar',
    outputCount: 1,
    craftingTimeSeconds: 20,
    powerOutput: 100,
    specialProperty: 'Menyalurkan 100 AE/s nirkabel global dan menaikkan World Stability ke level tertinggi.'
  }
};

export class RegionalEngineeringRegistry {
  public static getAllRecipes(): RegionalRecipe[] {
    return Object.values(REGIONAL_ENGINEERING_RECIPES);
  }

  public static getUnlockedRecipes(): RegionalRecipe[] {
    return Object.values(REGIONAL_ENGINEERING_RECIPES).filter(r => 
      ResonanceNexusManager.isSchematicUnlocked(r.id) ||
      ResonanceNexusManager.isSchematicUnlocked(`schematic_${r.id}`)
    );
  }

  public static getRecipesByTradition(traditionId: AetherTraditionId): RegionalRecipe[] {
    return Object.values(REGIONAL_ENGINEERING_RECIPES).filter(r => r.traditionId === traditionId);
  }

  public static canCraft(
    recipeId: string,
    playerInventory: { hasItem: (id: string, count?: number) => boolean }
  ): boolean {
    const recipe = REGIONAL_ENGINEERING_RECIPES[recipeId];
    if (!recipe) return false;

    // Must be unlocked
    if (!ResonanceNexusManager.isSchematicUnlocked(recipe.id) &&
        !ResonanceNexusManager.isSchematicUnlocked(`schematic_${recipe.id}`)) {
      return false;
    }

    return recipe.requiredMaterials.every(mat => playerInventory.hasItem(mat.itemId, mat.count));
  }
}
