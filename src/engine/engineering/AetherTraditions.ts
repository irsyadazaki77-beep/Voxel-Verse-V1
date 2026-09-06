// Aether Traditions & Cultural Regional Engineering Architecture 1.0
// Unifies Nusantara cultural world with ancient, crafted, ritualized, and functional Aether lore.

export type AetherTraditionId =
  | 'jawa_tirta'
  | 'minang_gonjong'
  | 'borneo_river'
  | 'bali_dharma'
  | 'toraja_megalith'
  | 'papua_honai'
  | 'nusa_storm';

export interface RegionalAetherSchematic {
  id: string;
  name: string;
  traditionId: AetherTraditionId;
  description: string;
  functionalCategory: 'irrigation' | 'resonance' | 'navigation' | 'guardian' | 'storage' | 'energy';
  unlockMethod: 'reputation' | 'quest' | 'dungeon' | 'landmark' | 'anomaly';
  unlockRequirement: string;
  materials: Array<{ itemId: string; count: number }>;
  outputItemId: string;
  basePowerOutput?: number; // AE/s
  basePowerDemand?: number;  // AE/s
  functionalEffect: string;
}

export interface AetherTraditionDef {
  id: AetherTraditionId;
  name: string;
  regionId: string;
  title: string;
  philosophy: string;
  materialAesthetics: {
    primaryMaterials: string[];
    metalAccents: string[];
    energyColor: string;
    lightCharacter: string;
    carvingStyle: string;
  };
  infrastructureArchetypes: {
    energyGatherer: string;
    conduitStyle: string;
    terminalNode: string;
    defenseNode: string;
  };
  regionalAnomaly: {
    id: string;
    name: string;
    description: string;
    atmosphericColor: [number, number, number];
    hazardEffect: string;
    stabilizationBonus: string;
  };
  landmarkAetherNodes: string[];
  schematics: RegionalAetherSchematic[];
  lorePassage: string;
}

export const AETHER_TRADITIONS: Record<AetherTraditionId, AetherTraditionDef> = {
  jawa_tirta: {
    id: 'jawa_tirta',
    name: 'Tradisi Tirta & Candi Wilwatikta',
    regionId: 'jawa',
    title: 'Harmoni Air Tanah & Resonansi Stupa Andesit',
    philosophy: 'Di Tanah Jawa, Aether tidak dipandang sebagai tenaga liar, melainkan aliran hidup yang meresap ke dalam tanah dan mata air (Tirta). Masyarakat Wilwatikta mengalirkan leylines melalui parit subak andesit dan memusatkan frekuensinya pada stupa candi bertakik kristal.',
    materialAesthetics: {
      primaryMaterials: ['Batu Andesit Kuno', 'Kayu Jati Berukir', 'Bata Terakota Merah'],
      metalAccents: ['Kuningan Tempa', 'Besi Pamor Keris'],
      energyColor: '#38bdf8', // Cyan Tirta
      lightCharacter: 'Pijaran lembut dan stabil menyerupai pantulan rembulan di atas telaga sawah.',
      carvingStyle: 'Motif lung-lungan sulur teratai dan relief mandala Majapahit.'
    },
    infrastructureArchetypes: {
      energyGatherer: 'Pintu Air Aether (Subak Sluice Siphon)',
      conduitStyle: 'Saluran Bawah Tanah Batu Andesit (Andesite Conduit)',
      terminalNode: 'Stupa Resonansi Candi (Resonance Stupa Hub)',
      defenseNode: 'Arca Penjaga Candi Bentar (Andesite Sentinel Turret)'
    },
    regionalAnomaly: {
      id: 'anomaly_volcanic_resonance',
      name: 'Volcanic Resonance (Resonansi Magma Merapi)',
      description: 'Leylines bawah tanah terbentur magma purba, memanaskan saluran andesit dan melepaskan uap kristal hangat yang mengguncang tanah.',
      atmosphericColor: [0.95, 0.45, 0.20],
      hazardEffect: 'Semburan uap panas dan magma fiends menyerang perimeter sawah.',
      stabilizationBonus: '+35% Kecepatan Panen Sawah Subak dan Daya Tahan Pondasi Desa.'
    },
    landmarkAetherNodes: ['candi_prambanan_spires', 'merapi_volcano_crater', 'alun_alun_beringin'],
    schematics: [
      {
        id: 'schematic_subak_sluice_gate',
        name: 'Prasasti Pintu Air Subak Aether',
        traditionId: 'jawa_tirta',
        description: 'Pintu air irigasi bertakik kristal ley yang melipatgandakan kesuburan sawah bertingkat dalam radius 24 blok.',
        functionalCategory: 'irrigation',
        unlockMethod: 'quest',
        unlockRequirement: 'Selesaikan Quest "Rahasia Tirta Jawa" dari Ki Lurah Tejo.',
        materials: [
          { itemId: 'andesite_block', count: 8 },
          { itemId: 'aether_crystal', count: 4 },
          { itemId: 'copper_ingot', count: 4 },
          { itemId: 'terrace_waterway', count: 2 }
        ],
        outputItemId: 'subak_irrigation_gate',
        basePowerDemand: 5,
        functionalEffect: '+30% Kecepatan tumbuh tanaman padi dan retensi air tanah permanen.'
      },
      {
        id: 'schematic_candi_resonance_stupa',
        name: 'Stupa Resonansi Candi Majapahit',
        traditionId: 'jawa_tirta',
        description: 'Monolit stupa batu andesit pemancar frekuensi leylines penstabil cuaca dan peredam kabut kegelapan.',
        functionalCategory: 'resonance',
        unlockMethod: 'dungeon',
        unlockRequirement: 'Taklukkan Candi Merapi Underground Vault.',
        materials: [
          { itemId: 'stone_bricks', count: 16 },
          { itemId: 'aether_altar_core', count: 1 },
          { itemId: 'kris_pusaka', count: 1 },
          { itemId: 'gold_ingot', count: 4 }
        ],
        outputItemId: 'candi_resonance_stupa',
        basePowerOutput: 25,
        functionalEffect: 'Menstabilkan World Stability lokal sebesar +15 poin dan menerangi malam berkabut.'
      }
    ],
    lorePassage: 'Batu andesit yang dipahat para empu bukan sekadar dinding pertahanan; batu itu menyerap getaran bumi dan menyalurkan leylines purba langsung ke akar padi rakyat.'
  },

  minang_gonjong: {
    id: 'minang_gonjong',
    name: 'Tradisi Lentera Gonjong & Menara Luhak',
    regionId: 'minang',
    title: 'Gema Angin Lembah Harau & Cahaya Kristal Gonjong',
    philosophy: 'Masyarakat Ranah Minang mengintegrasikan Aether ke atap Gonjong melengkung Rumah Gadang dan lumbung Rangkiang. Puncak tanduk gonjong menangkap leylines gunung Marapi dan Singgalang, membiaskannya melalui lentera kristal kuningan.',
    materialAesthetics: {
      primaryMaterials: ['Kayu Surian & Jati', 'Atap Ijuk Hitam Enau', 'Anyaman Bambu'],
      metalAccents: ['Kuningan Minang Kuno', 'Benang Perak Koto Gadang'],
      energyColor: '#f59e0b', // Amber Emas
      lightCharacter: 'Cahaya keemasan hangat bersudut tajam yang memendar dari celah kisi-kisi ukiran.',
      carvingStyle: 'Pahatan Kaluak Paku, Itiak Pulang Patang, dan Siriah Gadang.'
    },
    infrastructureArchetypes: {
      energyGatherer: 'Penangkap Angin Ley Gonjong (Gonjong Ley Collector)',
      conduitStyle: 'Kabel Filigree Perak Bertatah (Filigree Silver Conduit)',
      terminalNode: 'Lentera Rangkiang Emas (Rangkiang Storage Lantern)',
      defenseNode: 'Menara Sinyal Luhak (Marapi Mountain Spire)'
    },
    regionalAnomaly: {
      id: 'anomaly_highland_echo',
      name: 'Highland Mist Distortion (Distorsi Kabut Lembah Harau)',
      description: 'Kabut lembah ngarai beresonansi liar dengan puncak Marapi, menciptakan ilusi ruang dan gelombang suara sonik.',
      atmosphericColor: [0.65, 0.85, 0.90],
      hazardEffect: 'Gema sonik mengaburkan jarak pandang dan memicu serangan predator kabut Cindaku.',
      stabilizationBonus: '+25% Kecepatan Perdagangan Antar-Nagari dan Efisiensi Panen Rempah.'
    },
    landmarkAetherNodes: ['ngarai_sianok_canyon', 'bukit_bagonjong_summit', 'danau_singkarak_basin'],
    schematics: [
      {
        id: 'schematic_rangkiang_lantern',
        name: 'Lentera Gonjong Kristal Minangkabau',
        traditionId: 'minang_gonjong',
        description: 'Lentera kristal berpelindung kuningan berukir yang menerangi area luas dan menjaga lumbung padi dari pembusukan.',
        functionalCategory: 'storage',
        unlockMethod: 'reputation',
        unlockRequirement: 'Capai Reputasi "Dihormati (Honored)" di Nagari Lembah Harau.',
        materials: [
          { itemId: 'wood_planks', count: 6 },
          { itemId: 'silver_filigree', count: 2 },
          { itemId: 'aether_crystal', count: 3 },
          { itemId: 'ijuk_thatch', count: 4 }
        ],
        outputItemId: 'rangkiang_aether_lantern',
        basePowerDemand: 3,
        functionalEffect: 'Lumbung padi dalam radius 16 blok tidak pernah membusuk dan menghasilkan +20% benih ekstra.'
      },
      {
        id: 'schematic_marapi_resonance_spire',
        name: 'Menara Gema Luhak Marapi',
        traditionId: 'minang_gonjong',
        description: 'Menara pemancar frekuensi bukit barisan penolak badai dan pendeteksi anomali leylines.',
        functionalCategory: 'resonance',
        unlockMethod: 'landmark',
        unlockRequirement: 'Temukan dan aktifkan Altar Kuno Puncak Bukit Bagonjong.',
        materials: [
          { itemId: 'stone_bricks', count: 12 },
          { itemId: 'carved_beam', count: 4 },
          { itemId: 'songket_emas', count: 1 },
          { itemId: 'aether_crystal', count: 6 }
        ],
        outputItemId: 'marapi_resonance_spire',
        basePowerOutput: 20,
        functionalEffect: 'Memberikan deteksi anomali 10 menit lebih awal dan aura ketangkasan bagi penjelajah bukit.'
      }
    ],
    lorePassage: 'Gonjong rumah gadang melengkung ke angkasa bukan sekadar lambang tanduk kerbau; bentuk aerodinamisnya membelah angin lembah dan menangkap partikel leylines Marapi yang jatuh bersama embun fajar.'
  },

  borneo_river: {
    id: 'borneo_river',
    name: 'Tradisi Suar Sungai & Betang Ulin',
    regionId: 'borneo',
    title: 'Arus Batang Kapuas & Jaringan Serat Damar',
    philosophy: 'Di pedalaman hutan Kalimantan, Aether bergerak liar mengikuti aliran sungai besar. Suku Dayak membenamkan pilar ulin tahan lapuk yang diresapi getah damar kristal untuk menyalakan tugu suar navigasi dan menghubungkan seluruh Rumah Betang ke jaringan energi terapung.',
    materialAesthetics: {
      primaryMaterials: ['Kayu Besi Ulin Hitam', 'Serat Damar Rimba', 'Anyaman Rotan'],
      metalAccents: ['Tembaga Rawa Kuning', 'Batu Obsidian'],
      energyColor: '#10b981', // Emerald Sungai
      lightCharacter: 'Pendaran hijau zamrud berdenyut lembut mengikuti riak arus air sungai.',
      carvingStyle: 'Ukiran motif naga aso Dayak Kenyah dan sulur daun purba.'
    },
    infrastructureArchetypes: {
      energyGatherer: 'Kincir Arus Batang Sungai (River Flow Ley Turbine)',
      conduitStyle: 'Kabel Serat Kayu Ulin Kedap Air (Ironwood Ley Conduit)',
      terminalNode: 'Tugu Suar Sungai Ulin (River Navigation Beacon)',
      defenseNode: 'Pancang Ranjau Sumpit Aether (Swamp Trap Node)'
    },
    regionalAnomaly: {
      id: 'anomaly_river_surge',
      name: 'River Aether Surge (Gelombang Ley Sungai Purba)',
      description: 'Air sungai Batang Kapuas meluap dengan pendaran hijau leylines, mempercepat aliran arus hingga membentuk pusaran air berbahaya.',
      atmosphericColor: [0.20, 0.80, 0.65],
      hazardEffect: 'Pusaran air deras dan munculnya raksasa ulin bayangan yang menghantam dermaga.',
      stabilizationBonus: 'Perahu bergerak 50% lebih cepat di semua sungai dan kebal badai hujan.'
    },
    landmarkAetherNodes: ['batang_kapuas_confluence', 'pohon_ulin_raksasa', 'rawa_gambut_purba'],
    schematics: [
      {
        id: 'schematic_river_navigation_beacon',
        name: 'Tugu Suar Sungai Ulin Batang Kapuas',
        traditionId: 'borneo_river',
        description: 'Mercusuar sungai dari kayu ulin membatu yang memandu perahu menembus badai kabut dan memberi dorongan kecepatan arus.',
        functionalCategory: 'navigation',
        unlockMethod: 'quest',
        unlockRequirement: 'Selesaikan Quest "Urat Nadi Batang Kapuas" dari Damang Batu.',
        materials: [
          { itemId: 'ulin_timber_crate', count: 2 },
          { itemId: 'damar_resin', count: 4 },
          { itemId: 'aether_crystal', count: 4 },
          { itemId: 'copper_ingot', count: 4 }
        ],
        outputItemId: 'river_navigation_beacon',
        basePowerDemand: 4,
        functionalEffect: 'Menghilangkan kabut air dalam radius 32 blok dan memberi buff +35% kecepatan mendayung.'
      },
      {
        id: 'schematic_betang_ley_conduit',
        name: 'Jaringan Daya Rumah Betang Ulin',
        traditionId: 'borneo_river',
        description: 'Sistem distribusi leylines terpadu penopang seluruh perbengkelan dan lampu di sepanjang rumah panggung panjang.',
        functionalCategory: 'energy',
        unlockMethod: 'dungeon',
        unlockRequirement: 'Taklukkan Sarang Raksasa Ulin di Rawa Gambut Purba.',
        materials: [
          { itemId: 'ulin_timber_crate', count: 3 },
          { itemId: 'damar_resin', count: 6 },
          { itemId: 'iron_ingot', count: 4 },
          { itemId: 'aether_crystal', count: 6 }
        ],
        outputItemId: 'betang_power_network',
        basePowerOutput: 30,
        functionalEffect: 'Menyalurkan daya ke seluruh mesin dan pengrajin dalam rumah panggung secara nirkabel 24 blok.'
      }
    ],
    lorePassage: 'Kayu ulin tidak membusuk oleh air; saat dialiri energi Aether bersama getah damar, serat kayunya mengeras menyerupai baja dan menjadi konduktor alami terbaik di bumi kepulauan.'
  },

  bali_dharma: {
    id: 'bali_dharma',
    name: 'Tradisi Tirta Dharma & Candi Bentar',
    regionId: 'bali',
    title: 'Aliran Suci Subak & Portal Gapura Candi Bentar',
    philosophy: 'Di Pulau Dewata, pemanfaatan Aether berakar pada Tri Hita Karana dan keseimbangan Rwa Bhineda (Dharma & Adharma). Air suci Tirta Empul dialirkan melalui talang batu paras berukir, sementara Candi Bentar bertindak sebagai filter pemisah energi murni dari kekacauan void.',
    materialAesthetics: {
      primaryMaterials: ['Batu Paras Merah & Candi Bentar', 'Batu Andesit Hitam', 'Ijuk Meru'],
      metalAccents: ['Perunggu Suci Gamelan', 'Emas Bertatah Permata'],
      energyColor: '#38bdf8', // Cyan Dewata
      lightCharacter: 'Kilau suci beraroma dupa gaharu yang membentuk lingkaran mandala pelindung.',
      carvingStyle: 'Pahatan Keket Barong, Patra Punggel, dan ukiran sayap Garuda.'
    },
    infrastructureArchetypes: {
      energyGatherer: 'Pancuran Tirta Suci Subak (Sacred Spring Collector)',
      conduitStyle: 'Talang Air Paras Berpahat (Carved Paras Aqueduct)',
      terminalNode: 'Simpul Altar Meru (Pura Meru Resonance Node)',
      defenseNode: 'Candi Bentar Ley Gateway (Bentar Energy Filter Gate)'
    },
    regionalAnomaly: {
      id: 'anomaly_sacred_tide',
      name: 'Sacred Tide Distortion (Distorsi Tirta Dewata)',
      description: 'Fluktuasi pasang leylines samudra menggeser frekuensi Candi Bentar, memunculkan bayangan adharma Rangda dari celah dimensi.',
      atmosphericColor: [0.75, 0.35, 0.85],
      hazardEffect: 'Kekuatan void menodai sumber air dan melemahkan pertahanan desa.',
      stabilizationBonus: 'Desa mendapatkan aura perlindungan permanen dari serangan monster kegelapan.'
    },
    landmarkAetherNodes: ['pura_besakih_terrace', 'danau_bratan_water_temple', 'gunung_agung_cone'],
    schematics: [
      {
        id: 'schematic_candi_bentar_gateway',
        name: 'Gapura Candi Bentar Aether Gateway',
        traditionId: 'bali_dharma',
        description: 'Gerbang batu terbelah simetris yang memancarkan tirai energi pelindung dan memurnikan makhluk pembawa korupsi.',
        functionalCategory: 'guardian',
        unlockMethod: 'reputation',
        unlockRequirement: 'Capai Reputasi "Dihormati (Honored)" di Banjar Tirta Subak.',
        materials: [
          { itemId: 'split_gate_stone', count: 4 },
          { itemId: 'paras_stone_carving', count: 4 },
          { itemId: 'aether_crystal', count: 6 },
          { itemId: 'dupa_sesaji', count: 8 }
        ],
        outputItemId: 'candi_bentar_aether_gate',
        basePowerDemand: 6,
        functionalEffect: 'Mencegah semua monster void dan makhluk terkutuk melintasi batas pemukiman.'
      },
      {
        id: 'schematic_sacred_subak_aqueduct',
        name: 'Talang Tirta Amerta Subak',
        traditionId: 'bali_dharma',
        description: 'Sistem saluran air bertatah kristal yang mempercepat aliran irigasi dan melipatgandakan panen padi beras merah.',
        functionalCategory: 'irrigation',
        unlockMethod: 'quest',
        unlockRequirement: 'Selesaikan Quest "Restorasi Saluran Tirta Subak Bali" dari Pekaseh Wayan.',
        materials: [
          { itemId: 'terrace_waterway', count: 6 },
          { itemId: 'aether_crystal', count: 4 },
          { itemId: 'gold_ingot', count: 2 },
          { itemId: 'gaharu_incense', count: 4 }
        ],
        outputItemId: 'sacred_subak_aqueduct',
        basePowerOutput: 15,
        functionalEffect: '+40% Kecepatan Panen Padi dan menghasilkan bulir Beras Suci Tirta berkilau.'
      }
    ],
    lorePassage: 'Candi Bentar yang terbelah bukan sekadar gerbang; simetri geometrisnya menciptakan resonansi fase terbalik yang membatalkan getaran void sebelum sempat masuk ke pelataran suci.'
  },

  toraja_megalith: {
    id: 'toraja_megalith',
    name: 'Tradisi Megalit Simbuang & Tebing Kulkul',
    regionId: 'toraja',
    title: 'Batu Berdiri Simbuang & Gema Menara Tebing Karst',
    philosophy: 'Masyarakat Toraja menambatkan Aether ke batu monolit Simbuang yang ditancapkan tegak di rante pemakaman leluhur. Getaran Aether dipantulkan oleh tebing karst limestone dan dibunyikan melalui menara sinyal kulkul untuk menyatukan kekuatan desa di pegunungan tinggi.',
    materialAesthetics: {
      primaryMaterials: ['Batu Karst Limestone Putih', 'Kayu Uru & Nangka', 'Tanduk Kerbau Pa\'tedong'],
      metalAccents: ['Besi Meteorit Tua', 'Emas Toraja'],
      energyColor: '#facc15', // Amber Emas Leluhur
      lightCharacter: 'Pancaran cahaya tenang dan khidmat yang menembus celah makam tebing batu.',
      carvingStyle: 'Ukiran Pa\'tedong (kepala kerbau), Pa\'barre Allo (matahari), dan Pa\'manuk Londong.'
    },
    infrastructureArchetypes: {
      energyGatherer: 'Megalit Simbuang Ley (Ancestral Standing Stone)',
      conduitStyle: 'Jalur Pahat Tebing Karst (Carved Limestone Leyway)',
      terminalNode: 'Lumbung Alang Resonansi (Alang Resonance Granary)',
      defenseNode: 'Menara Sinyal Kulkul Tebing (Cliff Warning Spire)'
    },
    regionalAnomaly: {
      id: 'anomaly_highland_resonance',
      name: 'Highland Echo (Gema Leluhur Tebing Karst)',
      description: 'Getaran leylines pegunungan memantul di dinding tebing batu Londa, memicu resonansi sonik yang membangkitkan bayangan penjaga makam kuno.',
      atmosphericColor: [0.85, 0.70, 0.35],
      hazardEffect: 'Goncangan tebing karst dan serangan phantom penjaga purba berzirah tanduk.',
      stabilizationBonus: '+50% Poise ketahanan fisik dan kekebalan dari efek terhuyung saat bertarung.'
    },
    landmarkAetherNodes: ['londa_burial_cave', 'kete_kesu_complex', 'tebing_batu_bambapuang'],
    schematics: [
      {
        id: 'schematic_simbuang_megalith',
        name: 'Megalit Simbuang Batu Ley Purba',
        traditionId: 'toraja_megalith',
        description: 'Batu monolit tegak yang menyerap resonansi bumi dan memberikan aura ketahanan baja bagi seluruh warga desa.',
        functionalCategory: 'resonance',
        unlockMethod: 'landmark',
        unlockRequirement: 'Temukan dan sinkronkan Menhir Simbuang di Kompleks Kete Kesu.',
        materials: [
          { itemId: 'stone_alang_pillar', count: 4 },
          { itemId: 'tanduk_tedong_bonga', count: 2 },
          { itemId: 'aether_crystal', count: 6 },
          { itemId: 'carved_beam', count: 4 }
        ],
        outputItemId: 'simbuang_standing_stone',
        basePowerOutput: 25,
        functionalEffect: 'Meningkatkan pertahanan fisik seluruh entitas sekutu sebesar +25% dalam radius 32 blok.'
      },
      {
        id: 'schematic_alang_resonance_granary',
        name: 'Lumbung Alang Resonansi Pusaka',
        traditionId: 'toraja_megalith',
        description: 'Lumbung berukir di atas tiang bulat bertatah Aether yang melipatgandakan penyimpanan mineral dan benih langka.',
        functionalCategory: 'storage',
        unlockMethod: 'quest',
        unlockRequirement: 'Selesaikan Quest "Gema Megalit Toraja" dari Ne\' Gandeng.',
        materials: [
          { itemId: 'carved_beam', count: 6 },
          { itemId: 'stone_alang_pillar', count: 4 },
          { itemId: 'aether_crystal', count: 4 },
          { itemId: 'iron_ingot', count: 4 }
        ],
        outputItemId: 'alang_resonance_vault',
        basePowerDemand: 4,
        functionalEffect: 'Kapasitas penyimpanan 4x lipat peti biasa dan kebal dari pencurian maupun kebakaran.'
      }
    ],
    lorePassage: 'Batu Simbuang yang ditancapkan tegak di bumi adalah pasak leylines; batu itu menyerap hentakan gempa pegunungan dan mengubahnya menjadi perisai tak kasat mata bagi rumah Tongkonan.'
  },

  papua_honai: {
    id: 'papua_honai',
    name: 'Tradisi Akar Honai & Kanopi Asmat',
    regionId: 'papua',
    title: 'Jangkar Kristal Honai & Suar Kanopi Pohon Korowai',
    philosophy: 'Di belantara rimba dan pegunungan salju Papua, Aether dianggap sebagai sukma hijau yang menyatu dengan akar pohon purba dan lumut abadi. Suku di Lembah Baliem dan pesisir Asmat mengaitkan jangkar kristal ke tungku Honai melingkar dan menenun tas Noken bertatah kristal penuntun arah.',
    materialAesthetics: {
      primaryMaterials: ['Kayu Besi & Gaharu', 'Kulit Kayu Anggrek Noken', 'Rumput Ilalang Jerami'],
      metalAccents: ['Batu Obsidian Hitam', 'Biji Tembaga Alami'],
      energyColor: '#c084fc', // Violet Sukma
      lightCharacter: 'Pendaran bioluminesensi ungu magis bercampur kehangatan bara api perapian.',
      carvingStyle: 'Ukiran motif Mbis Asmat leluhur dan spiral burung Cenderawasih.'
    },
    infrastructureArchetypes: {
      energyGatherer: 'Jangkar Kristal Akar Honai (Living Root Ley Anchor)',
      conduitStyle: 'Anyaman Serat Kulit Noken (Woven Noken Fiber Line)',
      terminalNode: 'Tungku Api Honai Aether (Honai Central Hearth Node)',
      defenseNode: 'Suar Kanopi Korowai (Canopy Tree Watchpost)'
    },
    regionalAnomaly: {
      id: 'anomaly_crystal_forest',
      name: 'Crystal Forest Awakening (Kebangkitan Kristal Rimba Purba)',
      description: 'Spora kristal purba menyelimuti tajuk kanopi hutan hujan Papua, membungkus pepohonan dalam kilau bioluminesensi tebal.',
      atmosphericColor: [0.60, 0.20, 0.85],
      hazardEffect: 'Kabut spora leylines yang memicu mutasi instan pada predator rimba.',
      stabilizationBonus: 'Memberikan penglihatan tembus kabut dan +30% efisiensi stamina regenerasi.'
    },
    landmarkAetherNodes: ['lembah_baliem_abadi', 'danau_habema_alpine', 'puncak_jayawijaya_snow'],
    schematics: [
      {
        id: 'schematic_honai_hearth_core',
        name: 'Tungku Api Perapian Honai Aether',
        traditionId: 'papua_honai',
        description: 'Inti perapian bundar yang memancarkan kehangatan abadi, memulihkan stamina penjelajah dari hawa dingin ekstrem pegunungan.',
        functionalCategory: 'energy',
        unlockMethod: 'quest',
        unlockRequirement: 'Selesaikan Quest "Napas Rimba Papua" dari Kepala Suku Mabel.',
        materials: [
          { itemId: 'pine_log', count: 8 },
          { itemId: 'noken_woven', count: 2 },
          { itemId: 'aether_crystal', count: 4 },
          { itemId: 'coal', count: 12 }
        ],
        outputItemId: 'honai_hearth_core',
        basePowerOutput: 20,
        functionalEffect: 'Memberikan kekebalan dingin penuh dan regenerasi HP 3x lipat di dalam perimeter desa.'
      },
      {
        id: 'schematic_asmat_canopy_beacon',
        name: 'Suar Kanopi Pohon Korowai Asmat',
        traditionId: 'papua_honai',
        description: 'Pos pantau bertengger di tajuk pohon raksasa yang menembakkan panah energi leylines otomatis ke musuh dari kejauhan.',
        functionalCategory: 'guardian',
        unlockMethod: 'dungeon',
        unlockRequirement: 'Taklukkan Labirin Lembah Kabut Wamena.',
        materials: [
          { itemId: 'perisai_asmat_pusaka', count: 1 },
          { itemId: 'noken_woven', count: 3 },
          { itemId: 'aether_crystal', count: 6 },
          { itemId: 'wood_planks', count: 12 }
        ],
        outputItemId: 'asmat_canopy_sentinel',
        basePowerDemand: 5,
        functionalEffect: 'Menembakkan panah energi penembus zirah hingga jarak 40 blok ke arah monster buas.'
      }
    ],
    lorePassage: 'Noken bukan sekadar tas; saat dirajut dari serat pohon anggrek hutan yang telah ribuan tahun menyerap leylines bumi, rajutan itu menjadi wadah penyimpanan energi yang tidak pernah bocor.'
  },

  nusa_storm: {
    id: 'nusa_storm',
    name: 'Tradisi Penangkal Badai & Kristal Samudra',
    regionId: 'nusa',
    title: 'Kolektor Kilat Rempah & Mercusuar Karang Laut',
    philosophy: 'Di kepulauan rempah dan savana pesisir Nusa, angin muson dan badai petir samudra adalah sumber energi yang tak terbatas. Para pelaut dan penenun Sasak mendirikan tiang penangkal petir tembaga berkristal laut untuk menyerap energi badai dan memandu armada kapal.',
    materialAesthetics: {
      primaryMaterials: ['Batu Karang Putih', 'Bambu Petung', 'Jerami Ilalang Kering'],
      metalAccents: ['Tembaga Kapal Laut', 'Kuningan Ternate'],
      energyColor: '#38bdf8', // Biru Petir Samudra
      lightCharacter: 'Kilatan biru tajam berderak yang terpantul pada kristal garam terumbu karang.',
      carvingStyle: 'Motif Subahnale tenun Sasak dan ukiran perahu cadik Bugis-Makassar.'
    },
    infrastructureArchetypes: {
      energyGatherer: 'Penangkal Badai Kilat Rempah (Storm Lightning Siphon)',
      conduitStyle: 'Kabel Tembaga Salinitas Laut (Marine Copper Conduit)',
      terminalNode: 'Mercusuar Kristal Karang (Coral Reef Crystal Beacon)',
      defenseNode: 'Perangkap Angin Badai (Gale Vortex Trap)'
    },
    regionalAnomaly: {
      id: 'anomaly_storm_rift',
      name: 'Storm Rift (Pusaran Badai Samudra Rempah)',
      description: 'Pusaran badai petir samudra berputar di atas terumbu karang, menciptakan arus muatan listrik bertegangan tinggi di permukaan air.',
      atmosphericColor: [0.15, 0.40, 0.90],
      hazardEffect: 'Sambaran kilat acak dan badai ombak besar yang merusak perahu biasa.',
      stabilizationBonus: 'Kolektor energi terisi penuh secara instan dan kebal dari kerusakan petir.'
    },
    landmarkAetherNodes: ['bukit_merese_bluffs', 'tanjung_ringgit_cliffs', 'kepulauan_komodo_ridge'],
    schematics: [
      {
        id: 'schematic_storm_lightning_collector',
        name: 'Penangkal Badai Kilat Ternate',
        traditionId: 'nusa_storm',
        description: 'Kolektor tembaga penangkap energi petir badai yang mengubah kilatan petir menjadi cadangan energi Aether masif.',
        functionalCategory: 'energy',
        unlockMethod: 'anomaly',
        unlockRequirement: 'Stabilkan Anomali Storm Rift di Kepulauan Timur.',
        materials: [
          { itemId: 'copper_ingot', count: 12 },
          { itemId: 'kristal_garam_samudra', count: 4 },
          { itemId: 'aether_crystal', count: 6 },
          { itemId: 'coral_block', count: 4 }
        ],
        outputItemId: 'storm_lightning_collector',
        basePowerOutput: 45,
        functionalEffect: 'Menyerap 100% sambaran petir di area sekitar dan menghasilkan 45 AE/s saat cuaca hujan/badai.'
      },
      {
        id: 'schematic_coral_navigation_beacon',
        name: 'Mercusuar Kristal Karang Samudra',
        traditionId: 'nusa_storm',
        description: 'Menara karang bercahaya yang menembus badai laut lepas, memandu jalur pelayaran dan mempercepat kapal melintasi samudra.',
        functionalCategory: 'navigation',
        unlockMethod: 'quest',
        unlockRequirement: 'Selesaikan Quest "Penakluk Badai Samudra" dari Amaq Sasak.',
        materials: [
          { itemId: 'coral_block', count: 8 },
          { itemId: 'kristal_garam_samudra', count: 6 },
          { itemId: 'aether_crystal', count: 4 },
          { itemId: 'songket_emas', count: 1 }
        ],
        outputItemId: 'coral_navigation_beacon',
        basePowerDemand: 5,
        functionalEffect: 'Menghilangkan kabut laut 48 blok dan memberikan +40% kecepatan berlayar di laut dalam.'
      }
    ],
    lorePassage: 'Orang pesisir tidak pernah takut pada kilat; mereka menancapkan tiang tembaga di tanjung karang tertinggi, menyambut petir samudra sebagai kiriman berkah penggerak roda peradaban.'
  }
};
