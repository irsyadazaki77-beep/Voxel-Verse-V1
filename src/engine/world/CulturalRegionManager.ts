import { SimplexNoise } from '../math/Noise';

export interface RegionTerrainProfile {
  heightOffset: number;       // Base elevation offset from sea level
  mountainScale: number;      // Mountain height amplitude multiplier
  roughness: number;          // High-frequency detail noise multiplier
  terraceStep?: number;       // Step height for agricultural terracing (sawah bertingkat / subak)
  terraceStrength?: number;   // How strongly slopes are quantized into flat terrace tiers (0.0 - 1.0)
  valleyDepth?: number;       // Deep river / rift valley deepening factor
  cliffStrength?: number;     // Vertical cliff / karst limestone sheer face factor
  riverWidthMult?: number;    // River width scale (e.g. wide riverbeds in Borneo)
}

export interface RegionClimateBias {
  temp: number;               // Temperature bias (-1.0 cold alpine to +1.0 tropical hot)
  humid: number;              // Humidity bias (-1.0 arid to +1.0 saturated rainforest)
  continentalBias?: number;   // Ocean/island chain vs continental landmass
}

export interface RegionVegetationProfile {
  treeChance: number;
  primaryTrees: ('oak' | 'pine' | 'jungle' | 'teak' | 'palm' | 'bamboo' | 'giant' | 'subak_crop')[];
  foliageDensity: number;
  hasRiceTerraces?: boolean;
  canopyDensity?: number;
}

export interface RegionSettlementStyle {
  styleId: string;
  name: string;
  architecturalIdentity: string; // e.g. 'Rumah Gadang Bagonjong', 'Joglo Limasan', 'Pura Bale Kulkul', 'Rumah Betang Panjang', 'Tongkonan Aluk', 'Honai Lembah', 'Bale Sasak'
  layoutPattern: 'linear_river' | 'cluster_ridge' | 'terraced_slope' | 'sacred_axis' | 'dispersed_savanna' | 'dense_hamlet' | 'isolated_valley';
  materials: {
    foundation: number;
    walls: number;
    roof: number;
    accents: number;
  };
  npcCultureHooks: {
    titles: string[];
    greetings: string[];
    specialtyTrades: { giveItemId: string; receiveItemId: string; countGive: number; countReceive: number }[];
    folkloreLoreId: string;
  };
}

export interface RegionAmbientProfile {
  skyColorDay: [number, number, number];
  skyColorSunset: [number, number, number];
  skyColorNight: [number, number, number];
  fogColorDay: [number, number, number];
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  ambientColor: number;
  mistThinLayer?: boolean; // Morning / valley mist
  particleType?: 'leaves' | 'spores' | 'ash' | 'sand' | 'snow';
  ambientSoundTheme: string;
}

export interface RegionLocalEventDef {
  id: string;
  name: string;
  description: string;
  triggerType: 'dusk' | 'dawn' | 'fog' | 'river' | 'summit';
  buffOrEffect: string;
}

export interface RegionResourceModifiers {
  oreMultipliers: {
    copper?: number;
    iron?: number;
    gold?: number;
    mythril?: number;
    coal?: number;
  };
  specialtyFlora: number[];
  fertileSoilBonus: number;
}

export interface CulturalRegionDef {
  id: string;
  displayName: string;
  description: string;
  colorHex?: string;
  terrainProfile: RegionTerrainProfile;
  climateBias: RegionClimateBias;
  biomeWeights: Record<string, number>;
  structurePool: string[];
  landmarkPool: string[];
  vegetationProfile: RegionVegetationProfile;
  settlementStyle: RegionSettlementStyle;
  ambientProfile: RegionAmbientProfile;
  eventPool: RegionLocalEventDef[];
  resourceModifiers: RegionResourceModifiers;
}

// Complete Data-Driven Definitions for 7 Nusantara Cultural Regions
export const CULTURAL_REGIONS: Record<string, CulturalRegionDef> = {
  minang: {
    id: 'minang',
    displayName: 'Tanah Minang',
    description: 'Pegunungan Bukit Barisan dengan lembah ngarai hijau, sawah bertingkat berundak, dan kabut tipis fajar.',
    terrainProfile: {
      heightOffset: 16,
      mountainScale: 1.6,
      roughness: 1.15,
      terraceStep: 4,
      terraceStrength: 0.65,
      valleyDepth: 14,
      cliffStrength: 0.35,
      riverWidthMult: 1.2
    },
    climateBias: { temp: 0.15, humid: 0.45, continentalBias: 0.2 },
    biomeWeights: {
      forest: 0.45,
      meadow: 0.30,
      highlands: 0.25
    },
    structurePool: ['rumah_gadang', 'rangkiang', 'sawah_gazebo'],
    landmarkPool: ['ngarai_sianok_canyon', 'bukit_bagonjong_summit', 'danau_singkarak_basin'],
    vegetationProfile: {
      treeChance: 0.08,
      primaryTrees: ['oak', 'jungle', 'bamboo'],
      foliageDensity: 0.32,
      hasRiceTerraces: true,
      canopyDensity: 0.6
    },
    settlementStyle: {
      styleId: 'minang_nagari',
      name: 'Nagari Adat Minangkabau',
      architecturalIdentity: 'Rumah Gadang Bagonjong bertanduk runcing dengan lumbung Rangkiang',
      layoutPattern: 'terraced_slope',
      materials: {
        foundation: 20, // STONE_PILLAR
        walls: 14,       // WOOD_PLANKS
        roof: 10,        // PINE_LOG/dark thatch
        accents: 52      // GOLD_BLOCK or lantern
      },
      npcCultureHooks: {
        titles: ['Datuak Pangulu', 'Rangkayo Merchant', 'Urang Tuo Adat', 'Pandai Besi Minang'],
        greetings: [
          'Marhaban, sanak musafir! Selamat datang di Ranah Minang yang beradat.',
          'Adat basandi syarak, syarak basandi Kitabullah. Beristirahatlah di rumah bagonjong kami.',
          'Lembah sawah kami subur karena air gunung yang jernih dan doa para tetua.'
        ],
        specialtyTrades: [
          { giveItemId: 'wood_planks', receiveItemId: 'bread', countGive: 12, countReceive: 8 },
          { giveItemId: 'copper_ingot', receiveItemId: 'seeds_wheat', countGive: 2, countReceive: 16 },
          { giveItemId: 'gold_ingot', receiveItemId: 'healing_potion', countGive: 1, countReceive: 3 }
        ],
        folkloreLoreId: 'lore_minang_bagonjong'
      }
    },
    ambientProfile: {
      skyColorDay: [0.38, 0.66, 0.94],
      skyColorSunset: [0.92, 0.52, 0.34],
      skyColorNight: [0.05, 0.07, 0.16],
      fogColorDay: [0.62, 0.80, 0.84],
      fogDensity: 0.009,
      sunColor: 0xfff5e0,
      sunIntensity: 1.25,
      ambientColor: 0xd8ebd8,
      mistThinLayer: true,
      particleType: 'leaves',
      ambientSoundTheme: 'bamboo_valley_flute'
    },
    eventPool: [
      { id: 'minang_kabut_fajar', name: 'Kabut Tipis Ngarai', description: 'Kabut fajar menyelimuti sawah bertingkat, menyejukkan tanah dan menyuburkan tanaman.', triggerType: 'dawn', buffOrEffect: 'crop_growth_boost' },
      { id: 'minang_angin_bukit', name: 'Deru Angin Barisan', description: 'Angin sejuk berhembus menuruni bukit, memulihkan stamina penjelajah.', triggerType: 'summit', buffOrEffect: 'stamina_regen' }
    ],
    resourceModifiers: {
      oreMultipliers: { copper: 1.3, iron: 1.1, coal: 1.2 },
      specialtyFlora: [59, 63], // FARMLAND, CROP_WHEAT_3
      fertileSoilBonus: 1.5
    }
  },

  jawa: {
    id: 'jawa',
    displayName: 'Tanah Jawa',
    description: 'Dataran subur berhias sawah luas, hutan kayu jati, siluet gunung berapi megah, dan candi batu andesit kuno.',
    terrainProfile: {
      heightOffset: 2,
      mountainScale: 1.1,
      roughness: 0.55,
      terraceStep: 3,
      terraceStrength: 0.40,
      valleyDepth: 6,
      cliffStrength: 0.2,
      riverWidthMult: 1.3
    },
    climateBias: { temp: 0.30, humid: 0.25, continentalBias: 0.4 },
    biomeWeights: {
      plains: 0.45,
      forest: 0.30,
      volcanic: 0.25
    },
    structurePool: ['joglo', 'candi', 'ancient_ruins', 'gapura_bata'],
    landmarkPool: ['candi_prambanan_spires', 'merapi_volcano_crater', 'alun_alun_beringin'],
    vegetationProfile: {
      treeChance: 0.05,
      primaryTrees: ['teak', 'oak'],
      foliageDensity: 0.24,
      hasRiceTerraces: true,
      canopyDensity: 0.45
    },
    settlementStyle: {
      styleId: 'jawa_mataram',
      name: 'Desa Praja Kejawaan',
      architecturalIdentity: 'Rumah Joglo beratap tajug limasan, soko guru jati kokoh, dan candi stupa andesit',
      layoutPattern: 'dense_hamlet',
      materials: {
        foundation: 17, // STONE_BRICKS
        walls: 14,       // WOOD_PLANKS (teak)
        roof: 7,         // CLAY / Terracotta tile
        accents: 31      // LANTERN
      },
      npcCultureHooks: {
        titles: ['Ki Lurah Desa', 'Empu Keris Wesi', 'Mbok Bakul Beras', 'Abdi Dalem'],
        greetings: [
          'Sugeng rawuh, kisanak! Selamat tiba di pelataran desa kami yang ayem tentrem.',
          'Bumi Mataram gemah ripah loh jinawi. Sawah dan ladang kami siap berbagi bekal.',
          'Pusaka keris dan candi tua menjaga tanah ini dari marabahaya masa silam.'
        ],
        specialtyTrades: [
          { giveItemId: 'iron_ingot', receiveItemId: 'iron_pickaxe', countGive: 4, countReceive: 1 },
          { giveItemId: 'seeds_wheat', receiveItemId: 'bread', countGive: 10, countReceive: 6 },
          { giveItemId: 'copper_ingot', receiveItemId: 'lantern', countGive: 3, countReceive: 2 }
        ],
        folkloreLoreId: 'lore_jawa_kerajaan'
      }
    },
    ambientProfile: {
      skyColorDay: [0.44, 0.70, 0.96],
      skyColorSunset: [0.96, 0.58, 0.32],
      skyColorNight: [0.06, 0.08, 0.17],
      fogColorDay: [0.72, 0.82, 0.90],
      fogDensity: 0.0065,
      sunColor: 0xfffae5,
      sunIntensity: 1.35,
      ambientColor: 0xeae6d4,
      particleType: 'leaves',
      ambientSoundTheme: 'gamelan_gentle_breeze'
    },
    eventPool: [
      { id: 'jawa_ruwat_bumi', name: 'Upacara Ruwat Bumi', description: 'Rasa syukur atas kesuburan tanah, panen berlipat ganda di hamparan persawahan.', triggerType: 'dawn', buffOrEffect: 'farming_double_yield' },
      { id: 'jawa_asap_merapi', name: 'Hembusan Asap Gunung Suci', description: 'Abu vulkanik halus menyuburkan bebatuan dan mineral sekitar lereng.', triggerType: 'fog', buffOrEffect: 'mineral_fertility' }
    ],
    resourceModifiers: {
      oreMultipliers: { iron: 1.35, coal: 1.25, copper: 1.15 },
      specialtyFlora: [59, 63, 64],
      fertileSoilBonus: 1.7
    }
  },

  bali: {
    id: 'bali',
    displayName: 'Bali Highlands',
    description: 'Lereng vulkanik bertingkat dengan irigasi subak mengalir, gerbang candi bentar terbelah, pura meru bertingkat, dan hutan tropis dewata.',
    terrainProfile: {
      heightOffset: 14,
      mountainScale: 1.85,
      roughness: 0.95,
      terraceStep: 3,
      terraceStrength: 0.78, // Very strong dramatic subak cascades
      valleyDepth: 10,
      cliffStrength: 0.4,
      riverWidthMult: 1.1
    },
    climateBias: { temp: 0.25, humid: 0.40, continentalBias: -0.1 },
    biomeWeights: {
      meadow: 0.40,
      forest: 0.35,
      volcanic: 0.25
    },
    structurePool: ['pura', 'subak_gate', 'meru_tower', 'bale_kulkul'],
    landmarkPool: ['pura_besakih_terrace', 'danau_bratan_water_temple', 'gunung_agung_cone'],
    vegetationProfile: {
      treeChance: 0.07,
      primaryTrees: ['palm', 'oak', 'bamboo'],
      foliageDensity: 0.38,
      hasRiceTerraces: true,
      canopyDensity: 0.55
    },
    settlementStyle: {
      styleId: 'bali_banjar',
      name: 'Banjar Tirta Subak',
      architecturalIdentity: 'Gapura Candi Bentar terbelah, Balai Kulkul kayu, dan menara Pura Meru bertingkat',
      layoutPattern: 'sacred_axis',
      materials: {
        foundation: 17, // STONE_BRICKS / andesite
        walls: 7,        // Red brick / CLAY
        roof: 11,        // Dark ijuk thatch (PINE_LEAVES/LOG)
        accents: 32      // GLOWSTONE_CRYSTAL / offerings
      },
      npcCultureHooks: {
        titles: ['Jero Mangku Pura', 'Pekasih Pengatur Subak', 'Undagi Pengukir Batu', 'Penenun Endek'],
        greetings: [
          'Om Swastyastu, pengelana budiman! Selamat melangkah di tanah dewata nan asri.',
          'Tri Hita Karana menuntun kami hidup selaras dengan alam, sesama, dan sang pencipta.',
          'Aliran air suci subak ini menghidupi sawah bertingkat dari pucuk gunung hingga lembah.'
        ],
        specialtyTrades: [
          { giveItemId: 'gold_ingot', receiveItemId: 'glowstone_crystal', countGive: 2, countReceive: 4 },
          { giveItemId: 'seeds_wheat', receiveItemId: 'bread', countGive: 8, countReceive: 8 },
          { giveItemId: 'iron_ingot', receiveItemId: 'swiftness_potion', countGive: 2, countReceive: 2 }
        ],
        folkloreLoreId: 'lore_bali_subak'
      }
    },
    ambientProfile: {
      skyColorDay: [0.36, 0.68, 0.96],
      skyColorSunset: [0.98, 0.48, 0.24],
      skyColorNight: [0.08, 0.08, 0.20],
      fogColorDay: [0.65, 0.82, 0.88],
      fogDensity: 0.007,
      sunColor: 0xfff0d0,
      sunIntensity: 1.30,
      ambientColor: 0xdff0e2,
      mistThinLayer: true,
      particleType: 'spores',
      ambientSoundTheme: 'sacred_temple_bells'
    },
    eventPool: [
      { id: 'bali_upacara_subak', name: 'Tirta Amerta Subak', description: 'Air suci mengalir serentak di bendungan subak, mempercepat laju pertumbuhan padi dewata.', triggerType: 'dawn', buffOrEffect: 'water_flow_blessing' },
      { id: 'bali_purnama_kasa', name: 'Bulan Purnama Kedewatan', description: 'Cahaya bulan purnama menerangi meru pura, meningkatkan aura proteksi pengelana.', triggerType: 'dusk', buffOrEffect: 'lunar_poise_buff' }
    ],
    resourceModifiers: {
      oreMultipliers: { gold: 1.5, copper: 1.2, mythril: 1.1 },
      specialtyFlora: [59, 63, 36], // FARMLAND, CROP, SUN_ORCHID
      fertileSoilBonus: 1.6
    }
  },

  borneo: {
    id: 'borneo',
    displayName: 'Borneo Riverlands',
    description: 'Hutan hujan tropis purba berkanopi raksasa, sungai-sungai megah berkelok lebar, rawa gambut, dan rumah panggung Betang Dayak memanjang.',
    terrainProfile: {
      heightOffset: -4,
      mountainScale: 0.35,
      roughness: 0.45,
      terraceStrength: 0.0,
      valleyDepth: 8,
      cliffStrength: 0.1,
      riverWidthMult: 2.4 // Vast wide meandering river corridors
    },
    climateBias: { temp: 0.35, humid: 0.85, continentalBias: 0.5 },
    biomeWeights: {
      jungle: 0.55,
      swamp: 0.30,
      forest: 0.15
    },
    structurePool: ['betang', 'river_pier', 'stilt_fishery'],
    landmarkPool: ['batang_kapuas_confluence', 'pohon_ulin_raksasa', 'rawa_gambut_purba'],
    vegetationProfile: {
      treeChance: 0.14,
      primaryTrees: ['jungle', 'giant'],
      foliageDensity: 0.45,
      hasRiceTerraces: false,
      canopyDensity: 0.85
    },
    settlementStyle: {
      styleId: 'borneo_dayak',
      name: 'Desa Batang Kapuas',
      architecturalIdentity: 'Rumah Betang panggung ulin memanjang di tepi sungai besar dengan dermaga perahu titian',
      layoutPattern: 'linear_river',
      materials: {
        foundation: 8,  // OAK_LOG / Ironwood stilts
        walls: 14,      // WOOD_PLANKS
        roof: 14,       // Wood shingles
        accents: 30     // TORCH / fire pit
      },
      npcCultureHooks: {
        titles: ['Pambelum Dayak', 'Nahkoda Perahu Kelotok', 'Tetua Damar Rimba', 'Penyumpit Rimba'],
        greetings: [
          'Adil Ka\' Talino, Bacuramin Ka\' Saruga, Basengat Ka\' Jubata! Selamat berlabuh di Betang kami.',
          'Sungai adalah urat nadi kehidupan kami. Jangan ragu menyusuri riak air dengan perahu.',
          'Kanopi hutan purba ini menyimpan kayu besi ulin dan obat-obatan rahasia para leluhur.'
        ],
        specialtyTrades: [
          { giveItemId: 'oak_log', receiveItemId: 'torch', countGive: 6, countReceive: 24 },
          { giveItemId: 'iron_ingot', receiveItemId: 'swiftness_potion', countGive: 2, countReceive: 3 },
          { giveItemId: 'coal', receiveItemId: 'cooked_meat', countGive: 8, countReceive: 8 }
        ],
        folkloreLoreId: 'lore_borneo_betang'
      }
    },
    ambientProfile: {
      skyColorDay: [0.32, 0.62, 0.88],
      skyColorSunset: [0.82, 0.46, 0.28],
      skyColorNight: [0.04, 0.06, 0.14],
      fogColorDay: [0.55, 0.76, 0.70],
      fogDensity: 0.012, // Dense rainforest humidity
      sunColor: 0xffeed0,
      sunIntensity: 1.18,
      ambientColor: 0xc8e8c8,
      mistThinLayer: true,
      particleType: 'spores',
      ambientSoundTheme: 'rainforest_canopy_chorus'
    },
    eventPool: [
      { id: 'borneo_arus_pasang', name: 'Arus Pasang Sungai Besar', description: 'Air sungai meluap tenang, memberi daya dorong ekstra bagi perahu dan perenang.', triggerType: 'river', buffOrEffect: 'river_speed_boost' },
      { id: 'borneo_kabut_kanopi', name: 'Kabut Kanopi Purba', description: 'Uap air hangat hutan hujan melindungi penjelajah dari dehidrasi dan terik matahari.', triggerType: 'fog', buffOrEffect: 'heat_immunity' }
    ],
    resourceModifiers: {
      oreMultipliers: { copper: 1.1, gold: 1.4, coal: 1.4 },
      specialtyFlora: [37, 33], // LUMINESCENT_MUSHROOM, TALL_GRASS
      fertileSoilBonus: 1.3
    }
  },

  toraja: {
    id: 'toraja',
    displayName: 'Toraja Highlands',
    description: 'Punggung pegunungan karst menjulang terjal, tebing batu kapur curam dengan makam gua gantung, dan klaster Tongkonan beratap perahu megah.',
    terrainProfile: {
      heightOffset: 24,
      mountainScale: 2.3,
      roughness: 1.55,
      terraceStep: 5,
      terraceStrength: 0.35,
      valleyDepth: 18,
      cliffStrength: 0.80, // Massive dramatic sheer rock cliffs
      riverWidthMult: 0.9
    },
    climateBias: { temp: -0.10, humid: 0.50, continentalBias: 0.3 },
    biomeWeights: {
      highlands: 0.55,
      forest: 0.25,
      alpine: 0.20
    },
    structurePool: ['tongkonan', 'cliff_vault', 'alang_granary'],
    landmarkPool: ['londa_burial_cave', 'kete_kesu_complex', 'tebing_batu_bambapuang'],
    vegetationProfile: {
      treeChance: 0.06,
      primaryTrees: ['pine', 'oak'],
      foliageDensity: 0.28,
      hasRiceTerraces: true,
      canopyDensity: 0.5
    },
    settlementStyle: {
      styleId: 'toraja_aluk',
      name: 'Kete Kesu Tongkonan',
      architecturalIdentity: 'Rumah Tongkonan beratap lengkung perahu menghadap utara dengan lumbung Alang berukir',
      layoutPattern: 'cluster_ridge',
      materials: {
        foundation: 8,  // OAK_LOG
        walls: 14,      // WOOD_PLANKS with geometric carvings
        roof: 10,       // PINE_LOG curved roof
        accents: 43     // ANCIENT_RUNE_STONE / ancestral horns
      },
      npcCultureHooks: {
        titles: ['Ambe\' Toraja', 'Penenun Sa\'dan', 'Pahat Batu Tebing', 'Pandai Besi Kuno'],
        greetings: [
          'Kurre sumanga\'! Selamat menjejakkan kaki di punggung tebing batu Toraja.',
          'Tongkonan kami dibangun menghadap utara, asal muasal leluhur dan arah tiupan berkah.',
          'Tebing-tebing kapur ini adalah saksi abadi perjalanan jiwa para leluhur kami.'
        ],
        specialtyTrades: [
          { giveItemId: 'stone_bricks', receiveItemId: 'iron_ingot', countGive: 16, countReceive: 4 },
          { giveItemId: 'gold_ingot', receiveItemId: 'ancient_alloy', countGive: 3, countReceive: 1 },
          { giveItemId: 'seeds_wheat', receiveItemId: 'cooked_meat', countGive: 12, countReceive: 6 }
        ],
        folkloreLoreId: 'lore_toraja_tongkonan'
      }
    },
    ambientProfile: {
      skyColorDay: [0.35, 0.64, 0.94],
      skyColorSunset: [0.90, 0.44, 0.30],
      skyColorNight: [0.06, 0.07, 0.18],
      fogColorDay: [0.68, 0.78, 0.88],
      fogDensity: 0.0085,
      sunColor: 0xfff2dc,
      sunIntensity: 1.28,
      ambientColor: 0xd4e2f0,
      mistThinLayer: true,
      particleType: 'leaves',
      ambientSoundTheme: 'mountain_cliff_echoes'
    },
    eventPool: [
      { id: 'toraja_gema_lembah', name: 'Gema Lembah Karst', description: 'Suara angin memantul di tebing karst purba, menajamkan indera dan insting pertarungan.', triggerType: 'summit', buffOrEffect: 'poise_defensive_buff' },
      { id: 'toraja_kabut_tebing', name: 'Kabut Tebing Luhur', description: 'Kabut dingin menyelimuti puncak tebing makam kuno, melipatgandakan daya tahan fisik.', triggerType: 'fog', buffOrEffect: 'cold_resilience' }
    ],
    resourceModifiers: {
      oreMultipliers: { mythril: 1.35, iron: 1.3, gold: 1.25 },
      specialtyFlora: [54, 33], // MOSS_STONE, TALL_GRASS
      fertileSoilBonus: 1.2
    }
  },

  papua: {
    id: 'papua',
    displayName: 'Papuan Highlands',
    description: 'Lembah pegunungan tinggi berhawa dingin sejuk, hutan lumut rapat, jurang alpine berkabut abadi, dan permukiman pondok Honai bundar.',
    terrainProfile: {
      heightOffset: 28,
      mountainScale: 2.65,
      roughness: 1.75,
      terraceStrength: 0.15,
      valleyDepth: 22,
      cliffStrength: 0.75, // Immense highland ravines
      riverWidthMult: 0.8
    },
    climateBias: { temp: -0.35, humid: 0.70, continentalBias: 0.4 },
    biomeWeights: {
      alpine: 0.50,
      forest: 0.30,
      taiga: 0.20
    },
    structurePool: ['honai', 'pilamo', 'highland_watchpost'],
    landmarkPool: ['lembah_baliem_abadi', 'danau_habema_alpine', 'puncak_jayawijaya_snow'],
    vegetationProfile: {
      treeChance: 0.06,
      primaryTrees: ['pine', 'giant'],
      foliageDensity: 0.25,
      hasRiceTerraces: false,
      canopyDensity: 0.6
    },
    settlementStyle: {
      styleId: 'papua_baliem',
      name: 'Lembah Wamena Honai',
      architecturalIdentity: 'Pondok Honai bundar beratap jerami tebal berbentuk kubah melingkar dan balai Pilamo',
      layoutPattern: 'isolated_valley',
      materials: {
        foundation: 1,  // DIRT/RICH SOIL
        walls: 14,      // WOOD_PLANKS
        roof: 33,       // TALL_GRASS / dense dried thatch
        accents: 30     // TORCH / central hearth
      },
      npcCultureHooks: {
        titles: ['Ondofolo Papua', 'Pemburu Lembah Baliem', 'Tetua Honai Api', 'Perajin Noken'],
        greetings: [
          'Kinaonak, kawan dari tanah jauh! Hangatkan tubuhmu di perapian Honai kami.',
          'Di lembah tinggi ini, dinginnya malam dikalahkan oleh kehangatan api dan persaudaraan.',
          'Hutan lumut dan pegunungan salju menjaga permukiman kami tetap damai sejak zaman purba.'
        ],
        specialtyTrades: [
          { giveItemId: 'pine_log', receiveItemId: 'coal', countGive: 8, countReceive: 16 },
          { giveItemId: 'iron_ingot', receiveItemId: 'mythril_ingot', countGive: 6, countReceive: 2 },
          { giveItemId: 'bread', receiveItemId: 'healing_potion', countGive: 8, countReceive: 2 }
        ],
        folkloreLoreId: 'lore_papua_honai'
      }
    },
    ambientProfile: {
      skyColorDay: [0.30, 0.58, 0.90],
      skyColorSunset: [0.78, 0.40, 0.55],
      skyColorNight: [0.07, 0.09, 0.24],
      fogColorDay: [0.70, 0.80, 0.92],
      fogDensity: 0.0095,
      sunColor: 0xf0f6ff,
      sunIntensity: 1.25,
      ambientColor: 0xd8e6fc,
      mistThinLayer: true,
      particleType: 'snow',
      ambientSoundTheme: 'highland_alpine_wind'
    },
    eventPool: [
      { id: 'papua_embun_es', name: 'Embun Es Puncak Salju', description: 'Hawa dingin puncak meresap ke lembah, mengeraskan pertahanan dan menambah resistansi fisik.', triggerType: 'dawn', buffOrEffect: 'frost_armor_buff' },
      { id: 'papua_api_honai', name: 'Kehangatan Perapian Honai', description: 'Asap kayu manis dari perapian honai memulihkan vitalitas tubuh pengelana dengan cepat.', triggerType: 'dusk', buffOrEffect: 'health_regen_burst' }
    ],
    resourceModifiers: {
      oreMultipliers: { mythril: 1.6, iron: 1.3, gold: 1.35, coal: 1.4 },
      specialtyFlora: [38, 54], // SNOW, MOSS_STONE
      fertileSoilBonus: 1.1
    }
  },

  nusa: {
    id: 'nusa',
    displayName: 'Eastern Isles',
    description: 'Rantai kepulauan berbukit savana kering berhias tebing kapur putih di atas laut biru toska, kampung nelayan panggung, dan lumbung Sasak.',
    terrainProfile: {
      heightOffset: -1,
      mountainScale: 0.68,
      roughness: 0.85,
      terraceStrength: 0.10,
      valleyDepth: 5,
      cliffStrength: 0.65, // Limestone coastal bluffs & sea cliffs
      riverWidthMult: 0.7
    },
    climateBias: { temp: 0.60, humid: -0.40, continentalBias: -0.4 }, // Dry savanna & archipelago
    biomeWeights: {
      savanna: 0.45,
      beach: 0.35,
      ocean: 0.20
    },
    structurePool: ['sasak_lumbung', 'coastal_stilt', 'limestone_shrine'],
    landmarkPool: ['bukit_merese_bluffs', 'tanjung_ringgit_cliffs', 'kepulauan_komodo_ridge'],
    vegetationProfile: {
      treeChance: 0.03,
      primaryTrees: ['palm', 'oak'],
      foliageDensity: 0.16,
      hasRiceTerraces: false,
      canopyDensity: 0.25
    },
    settlementStyle: {
      styleId: 'sasak_isles',
      name: 'Desa Karang Sasak',
      architecturalIdentity: 'Lumbung Sasak bertiang bulat tinggi beratap lengkung jerami dan perkampungan pesisir karang',
      layoutPattern: 'dispersed_savanna',
      materials: {
        foundation: 5,   // SAND / WHITE STONE
        walls: 14,       // WOOD_PLANKS / bamboo weave
        roof: 33,        // TALL_GRASS / dried thatch
        accents: 55      // CORAL_BLOCK / limestone shell
      },
      npcCultureHooks: {
        titles: ['Amaq Sasak', 'Nelayan Karang Laut', 'Penenun Songket Sasak', 'Penjelajah Selat'],
        greetings: [
          'Tampi asih, kisanak! Selamat menginjakkan kaki di pulau karang dan savana kami.',
          'Angin muson timur bertiup segar dari samudra, memandu kapal nelayan pulang berlabuh.',
          'Lumbung padi kami dibangun di atas pilar bulat agar panen tetap aman dan kering.'
        ],
        specialtyTrades: [
          { giveItemId: 'sand', receiveItemId: 'glass', countGive: 16, countReceive: 8 },
          { giveItemId: 'copper_ingot', receiveItemId: 'gold_ingot', countGive: 6, countReceive: 2 },
          { giveItemId: 'coal', receiveItemId: 'torch', countGive: 4, countReceive: 16 }
        ],
        folkloreLoreId: 'lore_sasak_isles'
      }
    },
    ambientProfile: {
      skyColorDay: [0.46, 0.72, 0.98],
      skyColorSunset: [0.98, 0.54, 0.22],
      skyColorNight: [0.06, 0.08, 0.18],
      fogColorDay: [0.78, 0.86, 0.96],
      fogDensity: 0.0055, // Clear bright coastal horizon
      sunColor: 0xfffae0,
      sunIntensity: 1.42,
      ambientColor: 0xf5eedc,
      particleType: 'sand',
      ambientSoundTheme: 'coastal_ocean_breeze'
    },
    eventPool: [
      { id: 'nusa_angin_muson', name: 'Hembusan Muson Samudra', description: 'Angin laut kencang dan bersih meningkatkan kelincahan gerak dan kecepatan berlayar.', triggerType: 'dawn', buffOrEffect: 'ocean_swiftness' },
      { id: 'nusa_kemilau_karang', name: 'Kemilau Karang Senja', description: 'Buih ombak memantulkan cahaya emas senja di tebing kapur, mempercepat pemulihan stamina.', triggerType: 'dusk', buffOrEffect: 'coastal_stamina_regen' }
    ],
    resourceModifiers: {
      oreMultipliers: { copper: 1.4, gold: 1.35, iron: 1.1 },
      specialtyFlora: [5, 55], // SAND, CORAL_BLOCK
      fertileSoilBonus: 1.1
    }
  }
};

export class CulturalRegionManager {
  private regionNoise: SimplexNoise;
  private tempNoise: SimplexNoise;
  private humidNoise: SimplexNoise;
  private continentalNoise: SimplexNoise;

  private blendCache: Map<string, { region: CulturalRegionDef; weight: number }[]> = new Map();
  private profileCache: Map<string, RegionTerrainProfile> = new Map();
  private resourceCache: Map<string, RegionResourceModifiers> = new Map();
  private static readonly MAX_CACHE_SIZE = 8192;

  constructor(seed: number) {
    this.regionNoise = new SimplexNoise(seed + 9999);
    this.tempNoise = new SimplexNoise(seed + 101);
    this.humidNoise = new SimplexNoise(seed + 202);
    this.continentalNoise = new SimplexNoise(seed + 303);
  }

  public clearCache(): void {
    this.blendCache.clear();
    this.profileCache.clear();
    this.resourceCache.clear();
  }

  /**
   * Evaluates the smooth, continuous cultural region blend at world coordinates (wx, wz).
   * Guaranteed deterministic, continuous across space with no hard box borders or seams.
   */
  public getRegionBlend(wx: number, wz: number): { region: CulturalRegionDef; weight: number }[] {
    const cacheKey = `${wx}_${wz}`;
    const cached = this.blendCache.get(cacheKey);
    if (cached) return cached;

    // Macro scale: Regions span 1200 - 2500 blocks for natural geographic pacing
    const macroScale = 0.00045;
    const temp = this.tempNoise.fbm2D(wx * 0.0012, wz * 0.0012, 3, 0.5);
    const humid = (this.humidNoise.fbm2D(wx * 0.0012 + 1200, wz * 0.0012 + 1200, 3, 0.5) + 1) * 0.5;
    const continental = this.continentalNoise.fbm2D(wx * 0.0006, wz * 0.0006, 4, 0.45);

    // Continuous Voronoi-like cellular warping noise
    const warpX = this.regionNoise.noise2D(wx * macroScale, wz * macroScale);
    const warpZ = this.regionNoise.noise2D(wx * macroScale + 4321, wz * macroScale + 4321);

    const scores: { region: CulturalRegionDef; score: number }[] = [];

    for (const key in CULTURAL_REGIONS) {
      const reg = CULTURAL_REGIONS[key];
      const dt = (temp - reg.climateBias.temp) * 1.6;
      const dh = (humid - reg.climateBias.humid) * 1.8;
      const dc = reg.climateBias.continentalBias !== undefined ? (continental - reg.climateBias.continentalBias) * 1.4 : 0;

      // Deterministic spatial centroid offset for each region in noise coordinate space
      let hash = 0;
      for (let i = 0; i < key.length; i++) {
        hash = Math.imul(31, hash) + key.charCodeAt(i) | 0;
      }
      const cx = ((hash % 1000) / 1000 - 0.5) * 1.8;
      const cz = (((Math.abs(hash * 17)) % 1000) / 1000 - 0.5) * 1.8;

      const spatialDistSq = (warpX - cx) * (warpX - cx) + (warpZ - cz) * (warpZ - cz);
      const climateDistSq = dt * dt + dh * dh + dc * dc;

      // Smooth distance metric combining climate affinity + spatial cell position
      const totalDist = Math.sqrt(spatialDistSq * 1.5 + climateDistSq * 2.2);
      
      // Exponential falloff for natural smooth transitions
      const score = Math.exp(-totalDist * 2.2);
      scores.push({ region: reg, score: score });
    }

    scores.sort((a, b) => b.score - a.score);

    // Take the top 3 dominant regions for seamless triangular blending
    const top1 = scores[0];
    const top2 = scores[1];
    const top3 = scores[2];
    const totalScore = top1.score + top2.score + top3.score;

    if (totalScore <= 0.0001) {
      return [{ region: top1.region, weight: 1.0 }];
    }

    const w1 = top1.score / totalScore;
    const w2 = top2.score / totalScore;
    const w3 = top3.score / totalScore;

    const result = [
      { region: top1.region, weight: w1 },
      { region: top2.region, weight: w2 }
    ];

    if (w3 > 0.08) {
      result.push({ region: top3.region, weight: w3 });
    }

    if (this.blendCache.size >= CulturalRegionManager.MAX_CACHE_SIZE) {
      this.blendCache.clear();
    }
    this.blendCache.set(cacheKey, result);

    return result;
  }

  /**
   * Returns the single dominant cultural region for coordinates (wx, wz).
   */
  public getDominantRegion(wx: number, wz: number): CulturalRegionDef {
    return this.getRegionBlend(wx, wz)[0].region;
  }

  /**
   * Calculates mathematically smooth, blended terrain parameters.
   * Continuous across chunk borders with no hard seams or sudden elevation drops.
   */
  public getBlendedTerrainProfile(wx: number, wz: number): RegionTerrainProfile {
    const blend = this.getRegionBlend(wx, wz);
    let heightOffset = 0;
    let mountainScale = 0;
    let roughness = 0;
    let terraceStrength = 0;
    let terraceStep = 3;
    let valleyDepth = 0;
    let cliffStrength = 0;
    let riverWidthMult = 0;

    let dominantWeight = -1;

    for (const b of blend) {
      const tp = b.region.terrainProfile;
      heightOffset += tp.heightOffset * b.weight;
      mountainScale += tp.mountainScale * b.weight;
      roughness += tp.roughness * b.weight;
      terraceStrength += (tp.terraceStrength || 0) * b.weight;
      valleyDepth += (tp.valleyDepth || 0) * b.weight;
      cliffStrength += (tp.cliffStrength || 0) * b.weight;
      riverWidthMult += (tp.riverWidthMult || 1.0) * b.weight;

      if (b.weight > dominantWeight) {
        dominantWeight = b.weight;
        terraceStep = tp.terraceStep || 3;
      }
    }

    return {
      heightOffset,
      mountainScale,
      roughness,
      terraceStep,
      terraceStrength,
      valleyDepth,
      cliffStrength,
      riverWidthMult
    };
  }

  /**
   * Returns blended ambient parameters (sky, fog, sunlight) for smooth visual transitions.
   */
  public getBlendedAmbientProfile(wx: number, wz: number): {
    skyColorDay: [number, number, number];
    skyColorSunset: [number, number, number];
    skyColorNight: [number, number, number];
    fogColorDay: [number, number, number];
    fogDensity: number;
    sunColor: number;
    sunIntensity: number;
    ambientColor: number;
    ambientSoundTheme: string;
  } {
    const blend = this.getRegionBlend(wx, wz);
    let rSky = 0, gSky = 0, bSky = 0;
    let rSunSet = 0, gSunSet = 0, bSunSet = 0;
    let rNight = 0, gNight = 0, bNight = 0;
    let rFog = 0, gFog = 0, bFog = 0;
    let fogDensity = 0;
    let sunIntensity = 0;

    for (const b of blend) {
      const amb = b.region.ambientProfile;
      rSky += amb.skyColorDay[0] * b.weight;
      gSky += amb.skyColorDay[1] * b.weight;
      bSky += amb.skyColorDay[2] * b.weight;

      rSunSet += amb.skyColorSunset[0] * b.weight;
      gSunSet += amb.skyColorSunset[1] * b.weight;
      bSunSet += amb.skyColorSunset[2] * b.weight;

      rNight += amb.skyColorNight[0] * b.weight;
      gNight += amb.skyColorNight[1] * b.weight;
      bNight += amb.skyColorNight[2] * b.weight;

      rFog += amb.fogColorDay[0] * b.weight;
      gFog += amb.fogColorDay[1] * b.weight;
      bFog += amb.fogColorDay[2] * b.weight;

      fogDensity += amb.fogDensity * b.weight;
      sunIntensity += amb.sunIntensity * b.weight;
    }

    const dominant = blend[0].region.ambientProfile;

    return {
      skyColorDay: [rSky, gSky, bSky],
      skyColorSunset: [rSunSet, gSunSet, bSunSet],
      skyColorNight: [rNight, gNight, bNight],
      fogColorDay: [rFog, gFog, bFog],
      fogDensity,
      sunColor: dominant.sunColor,
      sunIntensity,
      ambientColor: dominant.ambientColor,
      ambientSoundTheme: dominant.ambientSoundTheme
    };
  }

  /**
   * Returns resource modifiers for ore generation and agricultural fertility.
   */
  public getBlendedResourceModifiers(wx: number, wz: number): RegionResourceModifiers {
    const blend = this.getRegionBlend(wx, wz);
    let copperMult = 0;
    let ironMult = 0;
    let goldMult = 0;
    let mythrilMult = 0;
    let coalMult = 0;
    let fertileSoilBonus = 0;

    for (const b of blend) {
      const rm = b.region.resourceModifiers;
      copperMult += (rm.oreMultipliers.copper || 1.0) * b.weight;
      ironMult += (rm.oreMultipliers.iron || 1.0) * b.weight;
      goldMult += (rm.oreMultipliers.gold || 1.0) * b.weight;
      mythrilMult += (rm.oreMultipliers.mythril || 1.0) * b.weight;
      coalMult += (rm.oreMultipliers.coal || 1.0) * b.weight;
      fertileSoilBonus += rm.fertileSoilBonus * b.weight;
    }

    return {
      oreMultipliers: {
        copper: copperMult,
        iron: ironMult,
        gold: goldMult,
        mythril: mythrilMult,
        coal: coalMult
      },
      specialtyFlora: blend[0].region.resourceModifiers.specialtyFlora,
      fertileSoilBonus
    };
  }
}
