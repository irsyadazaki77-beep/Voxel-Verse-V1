// Nusantara Regional Settlement Economy 1.0
// Realistic, Geography-Rooted Production Loops, Trade Commodities, Regional Price Margins & Arbitrage

export interface RegionalCommodityDef {
  id: string;
  name: string;
  regionId: string;
  category: 'crop' | 'timber' | 'mineral' | 'craft' | 'livestock' | 'aromatic' | 'seafood';
  basePrice: number; // Base credit value in home region
  description: string;
  iconColor: string;
}

export interface RegionEconomyDef {
  regionId: string;
  name: string;
  culturalName: string;
  biomeIds: string[];
  primaryExports: string[]; // Surplus goods (cheap locally, high value elsewhere)
  primaryImports: string[]; // High demand goods (expensive locally, profitable to sell here)
  economicDescription: string;
  specialtyBonus: string;
}

export const REGIONAL_COMMODITIES: Record<string, RegionalCommodityDef> = {
  // 1. Tanah Jawa
  beras_wangi: {
    id: 'beras_wangi',
    name: 'Beras Wangi Organik',
    regionId: 'tanah_jawa',
    category: 'crop',
    basePrice: 6,
    description: 'Beras bulir panjang beraroma wangi dari sawah subur tanah Wilwatikta.',
    iconColor: '#f7eed7',
  },
  teak_woodcraft: {
    id: 'teak_woodcraft',
    name: 'Ukiran Kayu Jati Alus',
    regionId: 'tanah_jawa',
    category: 'craft',
    basePrice: 24,
    description: 'Pahatan relief kayu jati berpola sulur klasik karya empu pengrajin.',
    iconColor: '#8a5229',
  },
  terracotta_pottery: {
    id: 'terracotta_pottery',
    name: 'Gerabah Tanah Liat Merah',
    regionId: 'tanah_jawa',
    category: 'craft',
    basePrice: 14,
    description: 'Kendi dan tempayan tembikar tanah liat merah matang pembakaran tungku.',
    iconColor: '#b85433',
  },
  kris_pusaka: {
    id: 'kris_pusaka',
    name: 'Keris Pamor Majapahit',
    regionId: 'tanah_jawa',
    category: 'craft',
    basePrice: 65,
    description: 'Bilah keris lekuk berluk pamor besi meteorit tempaan pande besi istana.',
    iconColor: '#d6c485',
  },
  kain_batik_tulis: {
    id: 'kain_batik_tulis',
    name: 'Kain Batik Tulis Adat',
    regionId: 'tanah_jawa',
    category: 'craft',
    basePrice: 32,
    description: 'Lembaran kain mori bermotif canting malam alami lambang keselarasan.',
    iconColor: '#523824',
  },

  // 2. Tanah Minang
  rendang_spices: {
    id: 'rendang_spices',
    name: 'Rempah Racik Lembah Harau',
    regionId: 'nagari_minang',
    category: 'crop',
    basePrice: 18,
    description: 'Racikan kayu manis, pala, cengkeh, kapulaga, dan cabai lereng bukit vulkanik.',
    iconColor: '#b33c1b',
  },
  kawa_daun_tea: {
    id: 'kawa_daun_tea',
    name: 'Seduhan Daun Kopi Kawa',
    regionId: 'nagari_minang',
    category: 'crop',
    basePrice: 10,
    description: 'Daun kopi kering panggang beraroma asap harum penambah stamina tubuh.',
    iconColor: '#5e432d',
  },
  silver_filigree: {
    id: 'silver_filigree',
    name: 'Kerajinan Perak Koto Gadang',
    regionId: 'nagari_minang',
    category: 'craft',
    basePrice: 48,
    description: 'Perhiasan anyaman benang perak halus motif flora khas Luhak Agam.',
    iconColor: '#d1d5db',
  },
  songket_emas: {
    id: 'songket_emas',
    name: 'Tenun Songket Benang Emas',
    regionId: 'nagari_minang',
    category: 'craft',
    basePrice: 55,
    description: 'Kain tenun pakan sutra bersulam benang emas berkilau indah.',
    iconColor: '#f59e0b',
  },
  kayu_manis_harau: {
    id: 'kayu_manis_harau',
    name: 'Kulit Manis Gunung Singgalang',
    regionId: 'nagari_minang',
    category: 'aromatic',
    basePrice: 16,
    description: 'Kulit kayu manis kering tebal dengan keharuman minyak atsiri tinggi.',
    iconColor: '#92400e',
  },

  // 3. Borneo Riverlands
  ulin_timber_crate: {
    id: 'ulin_timber_crate',
    name: 'Peti Balok Kayu Ulin',
    regionId: 'borneo_riverlands',
    category: 'timber',
    basePrice: 28,
    description: 'Balok kayu besi ulin Kalimantan yang kedap air dan tidak lapuk ratusan tahun.',
    iconColor: '#422006',
  },
  damar_resin: {
    id: 'damar_resin',
    name: 'Getah Damar Rimba Murni',
    regionId: 'borneo_riverlands',
    category: 'mineral',
    basePrice: 20,
    description: 'Resin kristal getah pohon damar hutan untuk perekat perahu dan dupa alami.',
    iconColor: '#fef08a',
  },
  river_catfish: {
    id: 'river_catfish',
    name: 'Ikan Baung Sungai Kahayan',
    regionId: 'borneo_riverlands',
    category: 'seafood',
    basePrice: 12,
    description: 'Ikan air tawar daging gurih tangkapan nelayan sungai pedalaman Borneo.',
    iconColor: '#475569',
  },
  arowana_scales: {
    id: 'arowana_scales',
    name: 'Sisik Kemilau Siluk Merah',
    regionId: 'borneo_riverlands',
    category: 'mineral',
    basePrice: 60,
    description: 'Sisik ikan siluk arowana merah alami dengan pantulan cahaya aether.',
    iconColor: '#ef4444',
  },
  sumpit_blowpipe: {
    id: 'sumpit_blowpipe',
    name: 'Sumpit & Damak Racun Alami',
    regionId: 'borneo_riverlands',
    category: 'craft',
    basePrice: 30,
    description: 'Pipa tiup kayu ulin lurus dengan anak panah getah ipuh pemburu rimba.',
    iconColor: '#365314',
  },

  // 4. Bali Highlands (Subak)
  subak_terrace_rice: {
    id: 'subak_terrace_rice',
    name: 'Beras Suci Teras Subak',
    regionId: 'bali_highlands',
    category: 'crop',
    basePrice: 8,
    description: 'Beras bulir murni hasil sistem irigasi Subak yang diatur secara demokratis.',
    iconColor: '#f1f5f9',
  },
  paras_stone_carving: {
    id: 'paras_stone_carving',
    name: 'Pahatan Batu Paras Candi',
    regionId: 'bali_highlands',
    category: 'craft',
    basePrice: 26,
    description: 'Relief ukir batu paras abu-abu keemasan bergaya ornamen pura Bali.',
    iconColor: '#94a3b8',
  },
  gaharu_incense: {
    id: 'gaharu_incense',
    name: 'Dupa Wangi Kayu Gaharu',
    regionId: 'bali_highlands',
    category: 'aromatic',
    basePrice: 22,
    description: 'Dupa linting serbuk gaharu suci untuk upacara yadnya dan ketenangan batin.',
    iconColor: '#78350f',
  },
  cempaka_floral_oil: {
    id: 'cempaka_floral_oil',
    name: 'Minyak Wangi Bunga Cempaka',
    regionId: 'bali_highlands',
    category: 'aromatic',
    basePrice: 35,
    description: 'Minyak atsiri sulingan kelopak cempaka kuning dan kamboja harum.',
    iconColor: '#fde047',
  },
  garam_amed: {
    id: 'garam_amed',
    name: 'Garam Laut Hitam Amed',
    regionId: 'bali_highlands',
    category: 'mineral',
    basePrice: 15,
    description: 'Garam laut kristal murni hasil penjemuran pada batang pohon kelapa di pesisir pasir hitam.',
    iconColor: '#e2e8f0',
  },

  // 5. Toraja Highlands
  toraja_arabica: {
    id: 'toraja_arabica',
    name: 'Kopi Arabika Lereng Sesean',
    regionId: 'toraja_highlands',
    category: 'crop',
    basePrice: 20,
    description: 'Biji kopi arabika dataran tinggi beraroma rempah herbal dan cokelat pekat.',
    iconColor: '#3b2010',
  },
  black_mountain_rice: {
    id: 'black_mountain_rice',
    name: 'Beras Hitam Toraja',
    regionId: 'toraja_highlands',
    category: 'crop',
    basePrice: 12,
    description: 'Beras hitam kaya antioksidan panen dari lereng terasering pegunungan karst.',
    iconColor: '#1e1b4b',
  },
  passura_woodcraft: {
    id: 'passura_woodcraft',
    name: 'Papan Ukir Pa\'ssura Toraja',
    regionId: 'toraja_highlands',
    category: 'craft',
    basePrice: 38,
    description: 'Ukiran kayu geometric bermotif Pa\'tedong dan Pa\'barre Allo berwarna pigmen tanah liat alami.',
    iconColor: '#b91c1c',
  },
  tedong_horn_relic: {
    id: 'tedong_horn_relic',
    name: 'Artefak Tanduk Kerbau Belang',
    regionId: 'toraja_highlands',
    category: 'livestock',
    basePrice: 58,
    description: 'Pahatan tanduk Tedong Bonga lambang kehormatan dan kemakmuran keluarga besar.',
    iconColor: '#f8fafc',
  },
  daging_sei_asap: {
    id: 'daging_sei_asap',
    name: 'Daging Se\'i Asap Kayu Kusambi',
    regionId: 'toraja_highlands',
    category: 'livestock',
    basePrice: 24,
    description: 'Daging iris diasap perlahan di atas bara daun kosambi beraroma harum.',
    iconColor: '#991b1b',
  },

  // 6. Papua Highlands & Rain Canopy
  sago_flour: {
    id: 'sago_flour',
    name: 'Tepung Sagu Pohon Rumbia',
    regionId: 'papua_highlands',
    category: 'crop',
    basePrice: 8,
    description: 'Tepung pati batang sagu alami sumber energi pangan utama masyarakat rimba.',
    iconColor: '#f8fafc',
  },
  valley_sweet_potato: {
    id: 'valley_sweet_potato',
    name: 'Ubi Ungu Lembah Baliem',
    regionId: 'papua_highlands',
    category: 'crop',
    basePrice: 10,
    description: 'Ubi jalar ungu manis bernutrisi tinggi hasil budidaya kebun berpagar batu.',
    iconColor: '#701a75',
  },
  maro_bark_cloth: {
    id: 'maro_bark_cloth',
    name: 'Lukisan Kulit Kayu Maro',
    regionId: 'papua_highlands',
    category: 'craft',
    basePrice: 42,
    description: 'Lembaran kulit kayu pohon kombouw yang dilukis dengan pewarna jelaga dan tanah oker.',
    iconColor: '#c2410c',
  },
  aether_amber_resin: {
    id: 'aether_amber_resin',
    name: 'Batu Getah Amber Aether',
    regionId: 'papua_highlands',
    category: 'mineral',
    basePrice: 68,
    description: 'Resin purba membatu berusia jutaan tahun yang menyimpan kilau energi ley murni.',
    iconColor: '#d97706',
  },
  shed_paradise_feather: {
    id: 'shed_paradise_feather',
    name: 'Bulu Cenderawasih Gugur Alami',
    regionId: 'papua_highlands',
    category: 'aromatic',
    basePrice: 50,
    description: 'Bulu sayap kemilau burung surga yang gugur di dasar hutan tanpa disakiti.',
    iconColor: '#eab308',
  },

  // 7. Eastern Isles & Spice Islands
  dryland_maize: {
    id: 'dryland_maize',
    name: 'Jagung Pipil Sabana Kering',
    regionId: 'eastern_isles',
    category: 'crop',
    basePrice: 7,
    description: 'Jagung kering tahan simpan hasil ladang tadah hujan iklim savana kepulauan.',
    iconColor: '#ca8a04',
  },
  solar_sea_salt: {
    id: 'solar_sea_salt',
    name: 'Garam Kristal Tambak Karang',
    regionId: 'eastern_isles',
    category: 'mineral',
    basePrice: 12,
    description: 'Kristal garam laut putih bersih hasil penguapan surya di atas petak terumbu karang.',
    iconColor: '#ffffff',
  },
  ikan_cakalang_asap: {
    id: 'ikan_cakalang_asap',
    name: 'Ikan Cakalang Fufu Asap',
    regionId: 'eastern_isles',
    category: 'seafood',
    basePrice: 22,
    description: 'Ikan cakalang laut dijepit bambu dan diasap matang tahan simpan lama untuk pelayaran.',
    iconColor: '#dc2626',
  },
  coastal_pearl: {
    id: 'coastal_pearl',
    name: 'Mutiara Laut Pesisir Timur',
    regionId: 'eastern_isles',
    category: 'mineral',
    basePrice: 75,
    description: 'Mutiara bulat kemilau lembut hasil budidaya tiram mutiara laut dalam jernih.',
    iconColor: '#f1f5f9',
  },
  sandalwood_oil: {
    id: 'sandalwood_oil',
    name: 'Minyak Kayu Cendana Harum',
    regionId: 'eastern_isles',
    category: 'aromatic',
    basePrice: 62,
    description: 'Minyak esensial kayu cendana wangi bernilai tinggi warisan jalur rempah.',
    iconColor: '#b45309',
  },
};

export const REGIONAL_ECONOMIES: Record<string, RegionEconomyDef> = {
  tanah_jawa: {
    regionId: 'tanah_jawa',
    name: 'Tanah Jawa (Wilwatikta)',
    culturalName: 'Dusun Wilwatikta & Lemah Sawah',
    biomeIds: ['meadow', 'plains', 'forest'],
    primaryExports: ['beras_wangi', 'teak_woodcraft', 'terracotta_pottery', 'kris_pusaka', 'kain_batik_tulis'],
    primaryImports: ['rendang_spices', 'ulin_timber_crate', 'toraja_arabica', 'solar_sea_salt', 'sandalwood_oil'],
    economicDescription: 'Pusat lumbung padi dan pengrajin tembikar-kayu jati. Membutuhkan rempah gunung, kayu besi sungai, dan garam laut.',
    specialtyBonus: 'Diskon 25% pembelian beras & tembikar; bonus +60% harga jual rempah & damar.',
  },
  nagari_minang: {
    regionId: 'nagari_minang',
    name: 'Tanah Minang (Luhak Nan Tigo)',
    culturalName: 'Nagari Lembah Harau & Bukit Tinggi',
    biomeIds: ['highlands', 'mountain'],
    primaryExports: ['rendang_spices', 'kawa_daun_tea', 'silver_filigree', 'songket_emas', 'kayu_manis_harau'],
    primaryImports: ['river_catfish', 'solar_sea_salt', 'dryland_maize', 'terracotta_pottery', 'coastal_pearl'],
    economicDescription: 'Penghasil rempah racik lereng bukit dan perak filigree halus. Sangat mengimpor ikan laut/sungai dan garam.',
    specialtyBonus: 'Diskon 25% rempah & perak; bonus +65% harga jual ikan asin & mutiara.',
  },
  borneo_riverlands: {
    regionId: 'borneo_riverlands',
    name: 'Borneo Riverlands (Betang Kahayan)',
    culturalName: 'Huma Betang & Jalur Sungai Rimba',
    biomeIds: ['swamp', 'dense_forest', 'river'],
    primaryExports: ['ulin_timber_crate', 'damar_resin', 'river_catfish', 'arowana_scales', 'sumpit_blowpipe'],
    primaryImports: ['beras_wangi', 'gaharu_incense', 'terracotta_pottery', 'kris_pusaka', 'paras_stone_carving'],
    economicDescription: 'Jantung kayu ulin dan perikanan air tawar. Membutuhkan batu paras ukir, keramik wadah, dan beras padi sawah.',
    specialtyBonus: 'Diskon 25% kayu ulin & resin; bonus +70% harga jual keramik & dupa.',
  },
  bali_highlands: {
    regionId: 'bali_highlands',
    name: 'Bali Highlands (Banjar Subak)',
    culturalName: 'Banjar Tirta Subak & Lembah Batur',
    biomeIds: ['volcanic', 'highlands', 'meadow'],
    primaryExports: ['subak_terrace_rice', 'paras_stone_carving', 'gaharu_incense', 'cempaka_floral_oil', 'garam_amed'],
    primaryImports: ['ulin_timber_crate', 'silver_filigree', 'toraja_arabica', 'sago_flour', 'maro_bark_cloth'],
    economicDescription: 'Pusat harmoni irigasi Subak, ukiran batu paras, dan minyak wangi dupa. Membutuhkan kayu ulin kokoh dan kain tenun.',
    specialtyBonus: 'Diskon 25% batu candi & dupa; bonus +60% harga jual ulin & kain adat.',
  },
  toraja_highlands: {
    regionId: 'toraja_highlands',
    name: 'Toraja Highlands (Rante Kete Kesu)',
    culturalName: 'Rante Kete Kesu & Tebing Pa\'ssura',
    biomeIds: ['highlands', 'mountain', 'alpine'],
    primaryExports: ['toraja_arabica', 'black_mountain_rice', 'passura_woodcraft', 'tedong_horn_relic', 'daging_sei_asap'],
    primaryImports: ['solar_sea_salt', 'ikan_cakalang_asap', 'kain_batik_tulis', 'cempaka_floral_oil', 'river_catfish'],
    economicDescription: 'Dataran tinggi kopi arabika, beras hitam, dan ternak lereng karst. Sangat membutuhkan garam laut dan ikan asap.',
    specialtyBonus: 'Diskon 25% kopi arabika & ukiran; bonus +65% harga jual ikan asap & garam laut.',
  },
  papua_highlands: {
    regionId: 'papua_highlands',
    name: 'Papuan Highlands (Kurulu Silimo)',
    culturalName: 'Kurulu Silimo & Rimba Lembah Baliem',
    biomeIds: ['alpine', 'dense_forest', 'mountain'],
    primaryExports: ['sago_flour', 'valley_sweet_potato', 'maro_bark_cloth', 'aether_amber_resin', 'shed_paradise_feather'],
    primaryImports: ['kris_pusaka', 'terracotta_pottery', 'beras_wangi', 'rendang_spices', 'silver_filigree'],
    economicDescription: 'Kawasan sagu rumbia, ubi manis, kulit kayu maro, dan getah amber purba. Membutuhkan tempaan logam dan gerabah.',
    specialtyBonus: 'Diskon 25% sagu & amber; bonus +75% harga jual perkakas logam & rempah.',
  },
  eastern_isles: {
    regionId: 'eastern_isles',
    name: 'Eastern Isles (Bale Tani Sade)',
    culturalName: 'Bale Tani Sade & Pesisir Sabana Rempah',
    biomeIds: ['savanna', 'beach', 'plains'],
    primaryExports: ['dryland_maize', 'solar_sea_salt', 'ikan_cakalang_asap', 'coastal_pearl', 'sandalwood_oil'],
    primaryImports: ['beras_wangi', 'teak_woodcraft', 'valley_sweet_potato', 'rendang_spices', 'passura_woodcraft'],
    economicDescription: 'Penghasil garam kristal surya, mutiara laut, ikan cakalang asap, dan cendana. Mengimpor beras padi dan kayu jati.',
    specialtyBonus: 'Diskon 25% garam & mutiara; bonus +65% harga jual beras wangi & kayu ukir.',
  },
};

export class SettlementEconomy {
  /**
   * Calculates dynamic buying/selling price of an item in a specific cultural region.
   * Encourages cross-region trade voyages with authentic supply/demand price margins.
   */
  public static getItemPrice(
    commodityId: string,
    currentRegionId: string,
    reputationLevel: 'hostile' | 'neutral' | 'friendly' | 'trusted' | 'honored' = 'neutral'
  ): { buyPrice: number; sellPrice: number; isExport: boolean; isImport: boolean } {
    const item = REGIONAL_COMMODITIES[commodityId];
    const region = REGIONAL_ECONOMIES[currentRegionId] || REGIONAL_ECONOMIES.tanah_jawa;

    if (!item) {
      return { buyPrice: 10, sellPrice: 5, isExport: false, isImport: false };
    }

    let multiplier = 1.0;
    const isExport = region.primaryExports.includes(commodityId);
    const isImport = region.primaryImports.includes(commodityId);

    if (isExport) {
      // Local abundance -> Cheap to buy, modest to sell
      multiplier = 0.75;
    } else if (isImport) {
      // High demand from other regions -> Expensive to buy, very lucrative to sell
      multiplier = 1.65;
    } else {
      multiplier = 1.15;
    }

    // Reputation perk discounts
    const repDiscount = reputationLevel === 'friendly' ? 0.9 : reputationLevel === 'trusted' ? 0.8 : reputationLevel === 'honored' ? 0.7 : 1.0;
    const repSellBonus = reputationLevel === 'friendly' ? 1.05 : reputationLevel === 'trusted' ? 1.15 : reputationLevel === 'honored' ? 1.25 : 1.0;

    const base = item.basePrice;
    const buyPrice = Math.max(1, Math.round(base * multiplier * repDiscount));
    const sellPrice = Math.max(1, Math.round(base * multiplier * 0.7 * repSellBonus));

    return { buyPrice, sellPrice, isExport, isImport };
  }

  /**
   * Maps settlement ID to its cultural region ID.
   */
  public static getRegionBySettlementId(settlementId: string): RegionEconomyDef {
    switch (settlementId) {
      case 'desa_majapahit':
        return REGIONAL_ECONOMIES.tanah_jawa;
      case 'nagari_minang':
        return REGIONAL_ECONOMIES.nagari_minang;
      case 'kampung_dayak':
        return REGIONAL_ECONOMIES.borneo_riverlands;
      case 'banjar_subak':
        return REGIONAL_ECONOMIES.bali_highlands;
      case 'desa_kete_kesu':
        return REGIONAL_ECONOMIES.toraja_highlands;
      case 'kampung_baliem':
        return REGIONAL_ECONOMIES.papua_highlands;
      case 'desa_sasak':
        return REGIONAL_ECONOMIES.eastern_isles;
      default:
        return REGIONAL_ECONOMIES.tanah_jawa;
    }
  }

  /**
   * Get complete regional trade inventory offers for a merchant or boat trader.
   */
  public static getRegionalTradeOffers(
    settlementId: string,
    reputationLevel: 'hostile' | 'neutral' | 'friendly' | 'trusted' | 'honored' = 'neutral',
    isBoatTrader: boolean = false
  ): Array<{ give: { itemId: string; count: number }; receive: { itemId: string; count: number } }> {
    const region = this.getRegionBySettlementId(settlementId);
    const trades: Array<{ give: { itemId: string; count: number }; receive: { itemId: string; count: number } }> = [];

    // 1. Offer local exports for universal commodities or raw materials
    region.primaryExports.forEach((exportId) => {
      const { buyPrice } = this.getItemPrice(exportId, region.regionId, reputationLevel);
      trades.push({
        give: { itemId: 'copper_ingot', count: Math.max(1, Math.round(buyPrice / 4)) },
        receive: { itemId: exportId, count: 2 },
      });
    });

    // 2. Buy local import demands from player with generous coin/ore returns
    region.primaryImports.forEach((importId) => {
      const { sellPrice } = this.getItemPrice(importId, region.regionId, reputationLevel);
      trades.push({
        give: { itemId: importId, count: 2 },
        receive: { itemId: 'iron_ingot', count: Math.max(1, Math.round(sellPrice / 6)) },
      });
    });

    // 3. Boat traders bring exotic rotating goods from neighboring regions
    if (isBoatTrader) {
      const allRegions = Object.values(REGIONAL_ECONOMIES).filter(r => r.regionId !== region.regionId);
      allRegions.forEach((otherRegion) => {
        const exoticGood = otherRegion.primaryExports[0];
        if (exoticGood) {
          trades.push({
            give: { itemId: 'gold_ingot', count: 2 },
            receive: { itemId: exoticGood, count: 3 },
          });
        }
      });
    }

    return trades;
  }
}
