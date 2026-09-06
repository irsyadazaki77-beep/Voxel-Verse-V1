// Nusantara Architecture & Settlement Grammar Styles
// Defines cultural building grammar, roof profiles, foundations, path networks, and regional styles
import { BlockType, RoofProfileType, FoundationType, RoadPathStyle, CourtyardPattern, StructureStyleDef, SettlementStyleDef } from '../../types';

// ==========================================
// 1. REGIONAL STRUCTURE STYLE DEFINITIONS
// ==========================================

export const MINANG_STRUCTURE_STYLE: StructureStyleDef = {
  styleId: 'minang_architecture',
  name: 'Arsitektur Bagonjong Minangkabau',
  regionId: 'tanah_minang',
  roofProfile: 'gonjong',
  foundationType: 'earthen_terrace',
  buildingHeight: { min: 7, max: 12 },
  materials: {
    foundation: BlockType.COBBLESTONE,
    walls: BlockType.TEAK_WOOD_PLANKS,
    roof: BlockType.IJUK_THATCH_ROOF,
    accents: BlockType.CARVED_WOOD_BEAM,
    flooring: BlockType.TEAK_WOOD_PLANKS,
    pillars: BlockType.TEAK_WOOD_LOG,
    fences: BlockType.BAMBOO_FENCE,
    lighting: BlockType.AETHER_LANTERN,
  },
  hasVeranda: true,
  stiltsHeight: 2,
  roofOverhang: 2,
};

export const JAWA_STRUCTURE_STYLE: StructureStyleDef = {
  styleId: 'jawa_architecture',
  name: 'Arsitektur Joglo & Limasan Jawa',
  regionId: 'tanah_jawa',
  roofProfile: 'joglo_pyramid',
  foundationType: 'stone_plinth',
  buildingHeight: { min: 6, max: 11 },
  materials: {
    foundation: BlockType.CARVED_ANDESITE_STONE,
    walls: BlockType.WOVEN_BAMBOO_GEDEK,
    roof: BlockType.TERRACOTTA_ROOF_TILE,
    accents: BlockType.VOLCANIC_BRICK,
    flooring: BlockType.CARVED_ANDESITE_STONE,
    pillars: BlockType.TEAK_WOOD_LOG,
    fences: BlockType.BAMBOO_FENCE,
    lighting: BlockType.LANTERN,
  },
  hasVeranda: true,
  stiltsHeight: 0,
  roofOverhang: 2,
};

export const BALI_STRUCTURE_STYLE: StructureStyleDef = {
  styleId: 'bali_architecture',
  name: 'Arsitektur Kori & Meru Bali',
  regionId: 'bali_highlands',
  roofProfile: 'meru_pagoda',
  foundationType: 'volcanic_base',
  buildingHeight: { min: 6, max: 15 },
  materials: {
    foundation: BlockType.CARVED_ANDESITE_STONE,
    walls: BlockType.VOLCANIC_BRICK,
    roof: BlockType.IJUK_THATCH_ROOF,
    accents: BlockType.SPLIT_GATE_STONE,
    flooring: BlockType.CARVED_ANDESITE_STONE,
    pillars: BlockType.TEAK_WOOD_LOG,
    fences: BlockType.VOLCANIC_BRICK,
    lighting: BlockType.AETHER_LANTERN,
  },
  hasVeranda: true,
  stiltsHeight: 1,
  roofOverhang: 1,
};

export const BORNEO_STRUCTURE_STYLE: StructureStyleDef = {
  styleId: 'borneo_architecture',
  name: 'Arsitektur Huma Betang Dayak',
  regionId: 'borneo_riverlands',
  roofProfile: 'river_gabled',
  foundationType: 'high_stilts',
  buildingHeight: { min: 8, max: 14 },
  materials: {
    foundation: BlockType.ULIN_IRONWOOD_LOG,
    walls: BlockType.ULIN_IRONWOOD_PLANKS,
    roof: BlockType.ALANG_ALANG_THATCH,
    accents: BlockType.CARVED_WOOD_BEAM,
    flooring: BlockType.ULIN_IRONWOOD_PLANKS,
    pillars: BlockType.ULIN_IRONWOOD_LOG,
    fences: BlockType.WOODEN_SHUTTER,
    lighting: BlockType.AETHER_LANTERN,
  },
  hasVeranda: true,
  stiltsHeight: 3,
  roofOverhang: 3,
};

export const TORAJA_STRUCTURE_STYLE: StructureStyleDef = {
  styleId: 'toraja_architecture',
  name: 'Arsitektur Tongkonan Sa\'dan',
  regionId: 'toraja_highlands',
  roofProfile: 'saddle_boat',
  foundationType: 'karst_stilts',
  buildingHeight: { min: 9, max: 16 },
  materials: {
    foundation: BlockType.STONE_PILLAR,
    walls: BlockType.TEAK_WOOD_PLANKS,
    roof: BlockType.IJUK_THATCH_ROOF,
    accents: BlockType.CARVED_WOOD_BEAM,
    flooring: BlockType.TEAK_WOOD_PLANKS,
    pillars: BlockType.TEAK_WOOD_LOG,
    fences: BlockType.BAMBOO_FENCE,
    lighting: BlockType.AETHER_LANTERN,
  },
  hasVeranda: true,
  stiltsHeight: 2,
  roofOverhang: 4,
};

export const PAPUA_STRUCTURE_STYLE: StructureStyleDef = {
  styleId: 'papua_architecture',
  name: 'Arsitektur Honai & Silimo Papua',
  regionId: 'papua_highlands',
  roofProfile: 'conical_dome',
  foundationType: 'earthen_circle',
  buildingHeight: { min: 5, max: 8 },
  materials: {
    foundation: BlockType.DIRT,
    walls: BlockType.WOOD_PLANKS,
    roof: BlockType.ALANG_ALANG_THATCH,
    accents: BlockType.OAK_LOG,
    flooring: BlockType.WOOD_PLANKS,
    pillars: BlockType.OAK_LOG,
    fences: BlockType.FENCE_WOOD,
    lighting: BlockType.TORCH,
  },
  hasVeranda: false,
  stiltsHeight: 0,
  roofOverhang: 1,
};

export const SASAK_STRUCTURE_STYLE: StructureStyleDef = {
  styleId: 'sasak_architecture',
  name: 'Arsitektur Bale Tani & Lumbung Sasak',
  regionId: 'eastern_isles',
  roofProfile: 'bonnet_arch',
  foundationType: 'disc_guarded_stilts',
  buildingHeight: { min: 6, max: 11 },
  materials: {
    foundation: BlockType.STONE_ALANG_PILLAR,
    walls: BlockType.WOVEN_BAMBOO_GEDEK,
    roof: BlockType.ALANG_ALANG_THATCH,
    accents: BlockType.BAMBOO_STALK_BLOCK,
    flooring: BlockType.WOOD_PLANKS,
    pillars: BlockType.STONE_ALANG_PILLAR,
    fences: BlockType.BAMBOO_FENCE,
    lighting: BlockType.LANTERN,
  },
  hasVeranda: true,
  stiltsHeight: 2,
  roofOverhang: 2,
};

// ==========================================
// 2. REGIONAL SETTLEMENT GRAMMAR STYLES
// ==========================================

export const NUSANTARA_SETTLEMENT_STYLES: Record<string, SettlementStyleDef> = {
  tanah_minang: {
    styleId: 'settlement_minang',
    name: 'Grammar Nagari Minang',
    regionId: 'tanah_minang',
    roadPathStyle: 'flagstone_steps',
    courtyardPattern: 'mountain_linear',
    buildingDensity: 'medium',
    pathBlock: BlockType.COBBLESTONE,
    primaryBuildingStyle: MINANG_STRUCTURE_STYLE,
    secondaryBuildingStyles: {
      surau: {
        ...MINANG_STRUCTURE_STYLE,
        styleId: 'minang_surau',
        name: 'Surau Nagari',
        roofProfile: 'joglo_pyramid',
        buildingHeight: { min: 8, max: 12 },
      },
      rangkiang: {
        ...MINANG_STRUCTURE_STYLE,
        styleId: 'minang_rangkiang',
        name: 'Rangkiang Lumbung',
        roofProfile: 'gonjong',
        foundationType: 'disc_guarded_stilts',
        buildingHeight: { min: 6, max: 9 },
      },
    },
    landmarkRules: {
      primaryMonument: 'balairung_adat',
      requiresRidgeOrSlope: true,
      requiresSacredAxis: true,
      aetherConduitStyle: 'underground_stone',
    },
  },

  tanah_jawa: {
    styleId: 'settlement_jawa',
    name: 'Grammar Desa Wilwatikta Jawa',
    regionId: 'tanah_jawa',
    roadPathStyle: 'cobble_lanes',
    courtyardPattern: 'alun_alun_central',
    buildingDensity: 'high',
    pathBlock: BlockType.GRAVEL,
    primaryBuildingStyle: JAWA_STRUCTURE_STYLE,
    secondaryBuildingStyles: {
      limasan: {
        ...JAWA_STRUCTURE_STYLE,
        styleId: 'jawa_limasan',
        name: 'Rumah Limasan',
        buildingHeight: { min: 5, max: 8 },
      },
      pendopo: {
        ...JAWA_STRUCTURE_STYLE,
        styleId: 'jawa_pendopo',
        name: 'Pendopo Kelurahan',
        buildingHeight: { min: 7, max: 11 },
      },
      pasar: {
        ...JAWA_STRUCTURE_STYLE,
        styleId: 'jawa_pasar',
        name: 'Pasar Desa',
        buildingHeight: { min: 4, max: 6 },
      },
    },
    landmarkRules: {
      primaryMonument: 'candi_gapura',
      requiresWaterOrRiver: false,
      requiresSacredAxis: true,
      aetherConduitStyle: 'underground_stone',
    },
  },

  bali_highlands: {
    styleId: 'settlement_bali',
    name: 'Grammar Banjar Tirta Subak Bali',
    regionId: 'bali_highlands',
    roadPathStyle: 'stone_paved_courtyard',
    courtyardPattern: 'sanga_mandala_axis',
    buildingDensity: 'high',
    pathBlock: BlockType.CARVED_ANDESITE_STONE,
    primaryBuildingStyle: BALI_STRUCTURE_STYLE,
    secondaryBuildingStyles: {
      meru: {
        ...BALI_STRUCTURE_STYLE,
        styleId: 'bali_meru',
        name: 'Pelinggih Meru Tumpang',
        buildingHeight: { min: 9, max: 16 },
      },
      bale_banjar: {
        ...BALI_STRUCTURE_STYLE,
        styleId: 'bali_bale_banjar',
        name: 'Bale Banjar Kulkul',
        buildingHeight: { min: 6, max: 9 },
      },
      subak_shrine: {
        ...BALI_STRUCTURE_STYLE,
        styleId: 'bali_subak',
        name: 'Pura Ulun Subak',
        buildingHeight: { min: 5, max: 8 },
      },
    },
    landmarkRules: {
      primaryMonument: 'candi_bentar_pura',
      requiresWaterOrRiver: true,
      requiresRidgeOrSlope: true,
      requiresSacredAxis: true,
      aetherConduitStyle: 'aerial_beam',
    },
  },

  borneo_riverlands: {
    styleId: 'settlement_borneo',
    name: 'Grammar Huma Betang Sungai Kahayan',
    regionId: 'borneo_riverlands',
    roadPathStyle: 'wooden_catwalk',
    courtyardPattern: 'riverine_linear',
    buildingDensity: 'medium',
    pathBlock: BlockType.ULIN_IRONWOOD_PLANKS,
    primaryBuildingStyle: BORNEO_STRUCTURE_STYLE,
    secondaryBuildingStyles: {
      river_stilt: {
        ...BORNEO_STRUCTURE_STYLE,
        styleId: 'borneo_stilt',
        name: 'Rumah Rakit & Panggung',
        buildingHeight: { min: 6, max: 9 },
      },
      river_warehouse: {
        ...BORNEO_STRUCTURE_STYLE,
        styleId: 'borneo_warehouse',
        name: 'Gudang Dermaga Sungai',
        buildingHeight: { min: 6, max: 8 },
      },
      floating_market: {
        ...BORNEO_STRUCTURE_STYLE,
        styleId: 'borneo_floating_market',
        name: 'Pasar Terapung Kahayan',
        buildingHeight: { min: 4, max: 6 },
      },
    },
    landmarkRules: {
      primaryMonument: 'grand_betang_totem',
      requiresWaterOrRiver: true,
      requiresSacredAxis: false,
      aetherConduitStyle: 'crystal_pillar',
    },
  },

  toraja_highlands: {
    styleId: 'settlement_toraja',
    name: 'Grammar Rante Kete Kesu Toraja',
    regionId: 'toraja_highlands',
    roadPathStyle: 'karst_ridge_steps',
    courtyardPattern: 'north_south_sacred_axis',
    buildingDensity: 'medium',
    pathBlock: BlockType.STONE_SLAB,
    primaryBuildingStyle: TORAJA_STRUCTURE_STYLE,
    secondaryBuildingStyles: {
      alang: {
        ...TORAJA_STRUCTURE_STYLE,
        styleId: 'toraja_alang',
        name: 'Alang Lumbung Padi',
        foundationType: 'disc_guarded_stilts',
        buildingHeight: { min: 6, max: 9 },
      },
      rante_court: {
        ...TORAJA_STRUCTURE_STYLE,
        styleId: 'toraja_rante',
        name: 'Rante Megalit Simbuang',
        buildingHeight: { min: 4, max: 7 },
      },
      cliff_vault: {
        ...TORAJA_STRUCTURE_STYLE,
        styleId: 'toraja_cliff_vault',
        name: 'Makam Tebing Liang',
        buildingHeight: { min: 5, max: 9 },
      },
    },
    landmarkRules: {
      primaryMonument: 'rante_megalith_circle',
      requiresRidgeOrSlope: true,
      requiresSacredAxis: true,
      aetherConduitStyle: 'underground_stone',
    },
  },

  papua_highlands: {
    styleId: 'settlement_papua',
    name: 'Grammar Kurulu Silimo Baliem',
    regionId: 'papua_highlands',
    roadPathStyle: 'beaten_dirt_paths',
    courtyardPattern: 'circular_silimo',
    buildingDensity: 'high',
    pathBlock: BlockType.DIRT,
    primaryBuildingStyle: PAPUA_STRUCTURE_STYLE,
    secondaryBuildingStyles: {
      ebeai: {
        ...PAPUA_STRUCTURE_STYLE,
        styleId: 'papua_ebeai',
        name: 'Ebeai Rumah Keluarga',
        buildingHeight: { min: 5, max: 7 },
      },
      wamai: {
        ...PAPUA_STRUCTURE_STYLE,
        styleId: 'papua_wamai',
        name: 'Kandang & Lumbung Silimo',
        buildingHeight: { min: 4, max: 6 },
      },
    },
    landmarkRules: {
      primaryMonument: 'central_fire_hearth',
      requiresRidgeOrSlope: false,
      requiresSacredAxis: false,
      aetherConduitStyle: 'crystal_pillar',
    },
  },

  eastern_isles: {
    styleId: 'settlement_eastern',
    name: 'Grammar Bale Tani Sade & Sumba',
    regionId: 'eastern_isles',
    roadPathStyle: 'coral_sand_lanes',
    courtyardPattern: 'dispersed_savanna',
    buildingDensity: 'low',
    pathBlock: BlockType.SAND,
    primaryBuildingStyle: SASAK_STRUCTURE_STYLE,
    secondaryBuildingStyles: {
      baileo: {
        ...SASAK_STRUCTURE_STYLE,
        styleId: 'eastern_baileo',
        name: 'Baileo Negeri Adat',
        roofProfile: 'pointed_thatch',
        buildingHeight: { min: 7, max: 12 },
      },
      sasak_lumbung: {
        ...SASAK_STRUCTURE_STYLE,
        styleId: 'eastern_lumbung',
        name: 'Lumbung Sasak Khas',
        roofProfile: 'bonnet_arch',
        buildingHeight: { min: 6, max: 9 },
      },
      coastal_stilt: {
        ...SASAK_STRUCTURE_STYLE,
        styleId: 'eastern_stilt',
        name: 'Rumah Pesisir Panggung',
        buildingHeight: { min: 5, max: 8 },
      },
    },
    landmarkRules: {
      primaryMonument: 'baileo_council_circle',
      requiresWaterOrRiver: false,
      requiresSacredAxis: false,
      aetherConduitStyle: 'aerial_beam',
    },
  },
};

export class NusantaraArchitectureStyles {
  public static getStyleForRegion(regionId: string): SettlementStyleDef {
    return NUSANTARA_SETTLEMENT_STYLES[regionId] || NUSANTARA_SETTLEMENT_STYLES['tanah_jawa'];
  }
}
