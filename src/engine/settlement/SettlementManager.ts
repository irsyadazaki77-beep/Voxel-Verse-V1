// Settlement Manager: Regional Hamlet Identities, NPC Roles, Conditional Dialogues, Barter Trading & Reputation Levels
import { SettlementDef, WorldTierId } from '../../types';
import { GameEventBus } from '../events/GameEventBus';
import { NotificationManager } from '../ui/NotificationManager';
import { NPCScheduleManager, NPCRoleType, SchedulePhase } from './NPCScheduleManager';
import { SettlementEconomy } from './SettlementEconomy';
import { StructureRecognitionEngine, RecognizedStructure } from './StructureRecognitionEngine';
import { VoxelWorld } from '../world/VoxelWorld';

export interface SettlementState {
  level: number; // 1 to 5
  reputation: number; // -100 to 100
  recognizedStructures?: RecognizedStructure[];
  isLeylinePowered?: boolean;
}

export const SETTLEMENT_REGISTRY: Record<string, SettlementDef> = {
  haven_camp: {
    id: 'haven_camp',
    name: 'Haven Pioneer Camp',
    biomeId: 'plains',
    tier: 'tier1_haven',
    originPos: [8, 64, 8],
    npcIds: ['torvald_merchant', 'farmer_haven', 'guard_haven'],
    services: ['trade', 'quest', 'craft', 'rest'],
  },
  suncrest_hamlet: {
    id: 'suncrest_hamlet',
    name: 'Suncrest Agricultural Hamlet',
    biomeId: 'forest',
    tier: 'tier2_frontier',
    originPos: [320, 68, 280],
    npcIds: ['elder_bryan', 'farmer_elena', 'craft_anton', 'engineer_milo'],
    services: ['trade', 'quest', 'craft'],
  },
  ferrite_outpost: {
    id: 'ferrite_outpost',
    name: 'Ferrite Crags Mining Bastion',
    biomeId: 'taiga',
    tier: 'tier3_ancient',
    originPos: [650, 75, -500],
    npcIds: ['blacksmith_brom', 'warden_alistair', 'engineer_koren'],
    services: ['trade', 'craft'],
  },
  // Nusantara Cultural Region Hamlets
  nagari_minang: {
    id: 'nagari_minang',
    name: 'Nagari Lembah Harau (Tanah Minang)',
    biomeId: 'highlands',
    tier: 'tier2_frontier',
    originPos: [-420, 72, -350],
    npcIds: ['datuk_maruhum_elder', 'mandeh_siti_merchant', 'udin_craftsperson', 'buyung_farmer', 'prajurit_bagindo_guard'],
    services: ['trade', 'quest', 'craft', 'rest'],
  },
  desa_majapahit: {
    id: 'desa_majapahit',
    name: 'Dusun Wilwatikta (Tanah Jawa)',
    biomeId: 'meadow',
    tier: 'tier2_frontier',
    originPos: [380, 64, 450],
    npcIds: ['ki_lurah_tejo_elder', 'empu_supa_engineer', 'mbok_sri_farmer', 'pande_wibowo_craftsperson', 'prajurit_gajah_guard', 'juragan_kartono_merchant'],
    services: ['trade', 'quest', 'craft', 'rest'],
  },
  banjar_subak: {
    id: 'banjar_subak',
    name: 'Banjar Tirta Subak (Bali Highlands)',
    biomeId: 'volcanic',
    tier: 'tier3_ancient',
    originPos: [520, 78, -480],
    npcIds: ['pekaseh_wayan_engineer', 'jero_mangku_elder', 'made_farmer', 'ketut_craftsperson', 'nyoman_guard'],
    services: ['trade', 'quest', 'craft'],
  },
  kampung_dayak: {
    id: 'kampung_dayak',
    name: 'Huma Betang Kahayan (Borneo Riverlands)',
    biomeId: 'swamp',
    tier: 'tier2_frontier',
    originPos: [-600, 62, 580],
    npcIds: ['damang_batu_elder', 'pemburu_nyaru_hunter', 'anang_fisher', 'juli_craftsperson', 'nahkoda_ujang_boat_trader'],
    services: ['trade', 'quest', 'craft'],
  },
  desa_kete_kesu: {
    id: 'desa_kete_kesu',
    name: 'Rante Kete Kesu (Toraja Highlands)',
    biomeId: 'highlands',
    tier: 'tier3_ancient',
    originPos: [720, 84, 180],
    npcIds: ['ne_gandeng_elder', 'pande_batu_craftsperson', 'pong_tiku_hunter', 'indo_toding_farmer', 'pasukan_tedong_guard'],
    services: ['trade', 'quest', 'craft'],
  },
  kampung_baliem: {
    id: 'kampung_baliem',
    name: 'Kurulu Silimo (Papuan Highlands)',
    biomeId: 'alpine',
    tier: 'tier3_ancient',
    originPos: [-800, 88, -750],
    npcIds: ['kepala_suku_mabel_elder', 'mama_yosina_merchant', 'karel_hunter', 'eli_farmer', 'titus_guard'],
    services: ['trade', 'quest', 'craft'],
  },
  desa_sasak: {
    id: 'desa_sasak',
    name: 'Bale Tani Sade (Eastern Isles)',
    biomeId: 'savanna',
    tier: 'tier2_frontier',
    originPos: [-280, 66, 850],
    npcIds: ['amaq_lokok_elder', 'inan_marni_merchant', 'papuq_tani_farmer', 'gili_fisher', 'saudagar_laut_boat_trader'],
    services: ['trade', 'quest', 'craft'],
  },
};

export interface UpgradeRequirement {
  itemId: string;
  count: number;
}

export class SettlementManager {
  private static states: Map<string, SettlementState> = new Map();

  public static initialize(savedProgress?: { [id: string]: SettlementState }): void {
    this.states.clear();
    Object.keys(SETTLEMENT_REGISTRY).forEach(id => {
      this.states.set(id, { level: 1, reputation: 0, recognizedStructures: [], isLeylinePowered: false });
    });

    if (savedProgress) {
      Object.entries(savedProgress).forEach(([id, state]) => {
        if (SETTLEMENT_REGISTRY[id]) {
          this.states.set(id, {
            level: state.level || 1,
            reputation: state.reputation !== undefined ? state.reputation : 0,
            recognizedStructures: state.recognizedStructures ? [...state.recognizedStructures] : [],
            isLeylinePowered: Boolean(state.isLeylinePowered)
          });
        }
      });
    }
  }

  public static getSettlementState(id: string): SettlementState {
    if (!this.states.has(id)) {
      this.states.set(id, { level: 1, reputation: 0, recognizedStructures: [], isLeylinePowered: false });
    }
    return this.states.get(id)!;
  }

  public static registerStructure(settlementId: string, structure: RecognizedStructure): void {
    const state = this.getSettlementState(settlementId);
    if (!state.recognizedStructures) {
      state.recognizedStructures = [];
    }
    const idx = state.recognizedStructures.findIndex(s => s.id === structure.id);
    if (idx >= 0) {
      state.recognizedStructures[idx] = structure;
    } else {
      state.recognizedStructures.push(structure);
    }
    StructureRecognitionEngine.registerStructure(structure);
    this.addReputation(settlementId, 10);

    NotificationManager.push({
      title: 'Struktur Bangunan Diakui Permukiman!',
      message: `${SETTLEMENT_REGISTRY[settlementId]?.name || settlementId} mengakui ${structure.name} (Kualitas: ${structure.qualityRating}/100)!`,
      priority: 'HIGH',
      icon: '🏗️',
      durationMs: 6000,
    });
  }

  public static evaluatePlayerStructure(
    world: VoxelWorld | null,
    pos: [number, number, number],
    settlementId?: string
  ): RecognizedStructure | null {
    const targetSettlement = settlementId || this.getSettlementByPos(pos[0], pos[2])?.id || 'haven_camp';
    const struct = StructureRecognitionEngine.scanStructureAt(world, pos, 8, targetSettlement);
    if (struct) {
      this.registerStructure(targetSettlement, struct);
    }
    return struct;
  }

  public static getRecognizedStructures(settlementId: string): RecognizedStructure[] {
    const state = this.getSettlementState(settlementId);
    return state.recognizedStructures || [];
  }

  public static isLeylinePowered(settlementId: string): boolean {
    return Boolean(this.getSettlementState(settlementId).isLeylinePowered);
  }

  public static setLeylinePowered(settlementId: string, powered: boolean): void {
    const state = this.getSettlementState(settlementId);
    if (state.isLeylinePowered !== powered) {
      state.isLeylinePowered = powered;
      if (powered) {
        NotificationManager.push({
          title: 'Otomatisasi Leyline Terhubung!',
          message: `${SETTLEMENT_REGISTRY[settlementId]?.name || settlementId} kini mendapat aliran energi Leyline terotomatisasi! (+20% Diskon Barter & Fasilitas Otomatis)`,
          priority: 'HIGH',
          icon: '⚡',
          durationMs: 7000,
        });
      }
    }
  }

  public static getSettlementBonus(settlementId: string): {
    housingCapacity: number;
    discountBonusPercent: number;
    productionMultiplier: number;
    defenseRating: number;
    isLeylinePowered: boolean;
  } {
    const state = this.getSettlementState(settlementId);
    const structs = state.recognizedStructures || [];

    let housing = 5 * state.level;
    let discount = 0;
    let production = 1.0 + (state.level - 1) * 0.1;
    let defense = 10 * state.level;

    structs.forEach(s => {
      if (s.category === 'house') housing += 4;
      if (s.category === 'workshop') { discount += 5; production += 0.2; }
      if (s.category === 'farm') { production += 0.15; }
      if (s.category === 'defense') { defense += 25; }
      if (s.category === 'leyline_hub') { discount += 10; production += 0.25; }
    });

    if (state.isLeylinePowered) {
      discount += 15;
      production += 0.3;
      defense += 20;
    }

    return {
      housingCapacity: housing,
      discountBonusPercent: discount,
      productionMultiplier: production,
      defenseRating: defense,
      isLeylinePowered: Boolean(state.isLeylinePowered),
    };
  }

  public static getReputationLevel(id: string): 'hostile' | 'neutral' | 'friendly' | 'trusted' | 'honored' {
    const rep = this.getSettlementState(id).reputation;
    if (rep < -30) return 'hostile';
    if (rep < 20) return 'neutral';
    if (rep < 50) return 'friendly';
    if (rep < 80) return 'trusted';
    return 'honored';
  }

  public static getReputationColor(repLevel: string): string {
    switch (repLevel) {
      case 'hostile': return 'text-red-400';
      case 'neutral': return 'text-zinc-400';
      case 'friendly': return 'text-emerald-400';
      case 'trusted': return 'text-sky-400';
      case 'honored': return 'text-amber-400';
      default: return 'text-zinc-400';
    }
  }

  public static getReputationName(repLevel: string): string {
    switch (repLevel) {
      case 'hostile': return 'Hostile (Ditolak)';
      case 'neutral': return 'Neutral (Netral)';
      case 'friendly': return 'Friendly (Sahabat Desa)';
      case 'trusted': return 'Trusted (Warga Kehormatan)';
      case 'honored': return 'Honored (Tetua & Ksatria Adat)';
      default: return 'Neutral';
    }
  }

  public static addReputation(id: string, amount: number): void {
    const state = this.getSettlementState(id);
    const oldLevel = this.getReputationLevel(id);
    state.reputation = Math.max(-100, Math.min(100, state.reputation + amount));
    const newLevel = this.getReputationLevel(id);

    NotificationManager.push({
      title: 'Reputasi Permukiman',
      message: `${SETTLEMENT_REGISTRY[id]?.name || id}: ${amount > 0 ? '+' : ''}${amount} Reputasi (${this.getReputationName(newLevel)})`,
      priority: 'MEDIUM',
      icon: amount > 0 ? '🤝' : '⚠️',
      durationMs: 5000,
    });

    if (oldLevel !== newLevel) {
      GameEventBus.emit('WORLD_EVENT_TRIGGERED', {
        eventType: 'reputation_level_up',
        eventName: `Reputasi di ${SETTLEMENT_REGISTRY[id]?.name || id} kini ${this.getReputationName(newLevel)}!`
      });
    }
  }

  public static getUpgradeRequirements(id: string, currentLevel: number): UpgradeRequirement[] {
    if (currentLevel >= 5) return [];
    
    // Regional building materials based on settlement origin
    const isMinang = id === 'nagari_minang';
    const isJawa = id === 'desa_majapahit';
    const isBali = id === 'banjar_subak';
    const isDayak = id === 'kampung_dayak';
    const isToraja = id === 'desa_kete_kesu';
    const isPapua = id === 'kampung_baliem';
    const isSasak = id === 'desa_sasak';

    switch (currentLevel) {
      case 1: // Level 1 -> 2 (Desa Binaan Adat)
        return isJawa ? [
          { itemId: 'wood_planks', count: 20 },
          { itemId: 'terracotta_tile', count: 12 },
          { itemId: 'beras_wangi', count: 8 }
        ] : isMinang ? [
          { itemId: 'wood_planks', count: 20 },
          { itemId: 'carved_beam', count: 6 },
          { itemId: 'rendang_spices', count: 6 }
        ] : isBali ? [
          { itemId: 'carved_andesite', count: 16 },
          { itemId: 'terrace_waterway', count: 8 },
          { itemId: 'subak_terrace_rice', count: 8 }
        ] : isDayak ? [
          { itemId: 'ulin_planks', count: 20 },
          { itemId: 'damar_resin', count: 6 },
          { itemId: 'river_catfish', count: 6 }
        ] : isToraja ? [
          { itemId: 'carved_beam', count: 12 },
          { itemId: 'ijuk_thatch', count: 16 },
          { itemId: 'toraja_arabica', count: 6 }
        ] : isPapua ? [
          { itemId: 'alang_thatch', count: 24 },
          { itemId: 'sago_flour', count: 12 },
          { itemId: 'valley_sweet_potato', count: 8 }
        ] : isSasak ? [
          { itemId: 'woven_bamboo', count: 20 },
          { itemId: 'alang_thatch', count: 16 },
          { itemId: 'solar_sea_salt', count: 8 }
        ] : [
          { itemId: 'wood_planks', count: 16 },
          { itemId: 'copper_ingot', count: 8 }
        ];

      case 2: // Level 2 -> 3 (Pusat Perniagaan & Lumbung Adat)
        return isJawa ? [
          { itemId: 'volcanic_brick', count: 24 },
          { itemId: 'teak_woodcraft', count: 6 },
          { itemId: 'iron_ingot', count: 12 }
        ] : isBali ? [
          { itemId: 'split_gate_stone', count: 12 },
          { itemId: 'paras_stone_carving', count: 6 },
          { itemId: 'gaharu_incense', count: 8 }
        ] : isMinang ? [
          { itemId: 'silver_filigree', count: 4 },
          { itemId: 'songket_emas', count: 2 },
          { itemId: 'iron_ingot', count: 10 }
        ] : isDayak ? [
          { itemId: 'ulin_log', count: 16 },
          { itemId: 'ulin_timber_crate', count: 4 },
          { itemId: 'arowana_scales', count: 4 }
        ] : [
          { itemId: 'iron_ingot', count: 12 },
          { itemId: 'coal', count: 16 }
        ];

      case 3: // Level 3 -> 4 (Kawasan Megalit & Benteng Perlindungan)
        return [
          { itemId: 'stone_bricks', count: 24 },
          { itemId: 'cultural_aether_lantern', count: 4 },
          { itemId: 'mythril_ingot', count: 8 }
        ];

      case 4: // Level 4 -> 5 (Sanctuary Agung & Gerbang Pusaka Aether)
        return [
          { itemId: 'aether_altar_core', count: 1 },
          { itemId: 'aether_conduit_floor', count: 12 },
          { itemId: 'aether_crystal', count: 16 }
        ];

      default:
        return [];
    }
  }

  public static upgradeSettlement(id: string): boolean {
    const state = this.getSettlementState(id);
    if (state.level >= 5) return false;

    state.level += 1;
    this.addReputation(id, 25); // Gain substantial reputation for building the community

    NotificationManager.push({
      title: 'Permukiman Naik Tingkat!',
      message: `${SETTLEMENT_REGISTRY[id]?.name || id} kini mencapai Tingkat (Level) ${state.level}! Perdagangan regional dan fasilitas baru terbuka.`,
      priority: 'HIGH',
      icon: '🏛️',
      durationMs: 8000,
    });

    GameEventBus.emit('WORLD_EVENT_TRIGGERED', {
      eventType: 'settlement_upgraded',
      eventName: `${SETTLEMENT_REGISTRY[id]?.name || id} berkembang ke Level ${state.level}`
    });

    return true;
  }

  public static getSettlementByPos(wx: number, wz: number): SettlementDef | null {
    for (const s of Object.values(SETTLEMENT_REGISTRY)) {
      const dx = s.originPos[0] - wx;
      const dz = s.originPos[2] - wz;
      if (dx * dx + dz * dz < 100 * 100) {
        return s;
      }
    }
    return null;
  }

  public static getNPCDialogue(
    npcId: string, 
    questCompleted: boolean = false, 
    settlementId?: string,
    timeOfDay: number = 12.0
  ): { 
    name: string; 
    role: string; 
    roleTitle: string;
    scheduleActivity: string;
    scheduleDescription: string;
    lines: string[]; 
    trades?: any[];
    reputationLevel: 'hostile' | 'neutral' | 'friendly' | 'trusted' | 'honored';
    discountPercent: number;
  } {
    const sId = settlementId || 'haven_camp';
    const state = this.getSettlementState(sId);
    const repLevel = this.getReputationLevel(sId);
    const discountMultiplier = repLevel === 'friendly' ? 0.9 : repLevel === 'trusted' ? 0.8 : repLevel === 'honored' ? 0.7 : 1.0;
    const discountPercent = repLevel === 'friendly' ? 10 : repLevel === 'trusted' ? 20 : repLevel === 'honored' ? 30 : 0;

    // Detect NPC role from ID
    let role: NPCRoleType = 'farmer';
    if (npcId.includes('merchant') || npcId.includes('juragan') || npcId.includes('torvald') || npcId.includes('mandeh')) role = 'merchant';
    else if (npcId.includes('boat_trader') || npcId.includes('nahkoda') || npcId.includes('saudagar_laut')) role = 'boat_trader';
    else if (npcId.includes('fisher') || npcId.includes('nelayan') || npcId.includes('anang') || npcId.includes('gili')) role = 'fisher';
    else if (npcId.includes('craft') || npcId.includes('pande') || npcId.includes('udin') || npcId.includes('ketut') || npcId.includes('juli')) role = 'craftsperson';
    else if (npcId.includes('guard') || npcId.includes('prajurit') || npcId.includes('warden') || npcId.includes('pasukan') || npcId.includes('titus')) role = 'guard';
    else if (npcId.includes('elder') || npcId.includes('datuk') || npcId.includes('lurah') || npcId.includes('jero') || npcId.includes('damang') || npcId.includes('gandeng') || npcId.includes('mabel') || npcId.includes('lokok') || npcId.includes('bryan')) role = 'elder';
    else if (npcId.includes('engineer') || npcId.includes('empu') || npcId.includes('pekaseh') || npcId.includes('milo') || npcId.includes('koren')) role = 'engineer';
    else if (npcId.includes('hunter') || npcId.includes('pemburu') || npcId.includes('nyaru') || npcId.includes('karel') || npcId.includes('pong')) role = 'hunter';

    const scheduleDef = NPCScheduleManager.getRoleDef(role);
    const activeSchedule = NPCScheduleManager.getActiveSchedule(role, timeOfDay);

    // Hostile NPCs refuse trade
    if (repLevel === 'hostile') {
      return {
        name: this.formatNPCName(npcId),
        role,
        roleTitle: scheduleDef.titleIndonesian,
        scheduleActivity: 'Menolak Berbicara',
        scheduleDescription: 'Warga bersikap waspada dan menolak interaksi karena reputasimu yang buruk.',
        lines: [
          'Pergilah, orang asing! Tindakanmu telah merusak ketentraman pemukiman kami.',
          'Kami tidak berdagang atau berbagi kidung dengan mereka yang melanggar hukum adat.',
        ],
        trades: [],
        reputationLevel: repLevel,
        discountPercent: 0,
      };
    }

    // Generate trade offers via SettlementEconomy
    const isBoatTrader = role === 'boat_trader';
    const isGeneralMerchant = role === 'merchant';
    let trades: any[] = [];

    if (isBoatTrader || isGeneralMerchant) {
      trades = SettlementEconomy.getRegionalTradeOffers(sId, repLevel, isBoatTrader);
    } else if (role === 'farmer') {
      trades = [
        { give: { itemId: 'seeds_wheat', count: Math.max(1, Math.round(16 * discountMultiplier)) }, receive: { itemId: 'bread', count: 8 } },
        { give: { itemId: 'wood_planks', count: Math.max(1, Math.round(12 * discountMultiplier)) }, receive: { itemId: 'beras_wangi', count: 6 } },
      ];
    } else if (role === 'fisher') {
      trades = [
        { give: { itemId: 'string_fiber', count: Math.max(1, Math.round(8 * discountMultiplier)) }, receive: { itemId: 'river_catfish', count: 4 } },
        { give: { itemId: 'copper_ingot', count: Math.max(1, Math.round(4 * discountMultiplier)) }, receive: { itemId: 'ikan_cakalang_asap', count: 3 } },
      ];
    } else if (role === 'craftsperson') {
      trades = [
        { give: { itemId: 'stone', count: Math.max(1, Math.round(24 * discountMultiplier)) }, receive: { itemId: 'terracotta_pottery', count: 2 } },
        { give: { itemId: 'oak_log', count: Math.max(1, Math.round(16 * discountMultiplier)) }, receive: { itemId: 'teak_woodcraft', count: 1 } },
      ];
    } else if (role === 'guard') {
      trades = [
        { give: { itemId: 'iron_ingot', count: Math.max(1, Math.round(6 * discountMultiplier)) }, receive: { itemId: 'iron_sword', count: 1 } },
        { give: { itemId: 'cooked_meat', count: Math.max(1, Math.round(8 * discountMultiplier)) }, receive: { itemId: 'healing_potion', count: 2 } },
      ];
    } else if (role === 'engineer') {
      trades = [
        { give: { itemId: 'copper_ingot', count: Math.max(1, Math.round(8 * discountMultiplier)) }, receive: { itemId: 'terrace_waterway', count: 4 } },
        { give: { itemId: 'aether_crystal', count: Math.max(1, Math.round(4 * discountMultiplier)) }, receive: { itemId: 'cultural_aether_lantern', count: 2 } },
      ];
    } else if (role === 'hunter') {
      trades = [
        { give: { itemId: 'arrow', count: Math.max(1, Math.round(16 * discountMultiplier)) }, receive: { itemId: 'daging_sei_asap', count: 4 } },
        { give: { itemId: 'torch', count: Math.max(1, Math.round(12 * discountMultiplier)) }, receive: { itemId: 'damar_resin', count: 4 } },
      ];
    } else if (role === 'elder') {
      trades = [
        { give: { itemId: 'gold_ingot', count: Math.max(1, Math.round(4 * discountMultiplier)) }, receive: { itemId: 'gaharu_incense', count: 4 } },
        { give: { itemId: 'aether_crystal', count: Math.max(1, Math.round(6 * discountMultiplier)) }, receive: { itemId: 'kris_pusaka', count: 1 } },
      ];
    }

    const lines = [...activeSchedule.dialoguePool];
    
    // Check player-built structures and Leyline power for dynamic dialogue
    const bonuses = this.getSettlementBonus(sId);
    const structs = this.getRecognizedStructures(sId);

    if (structs.some(s => s.category === 'house')) {
      lines.push('Bangunan hunian buatanmu memberikan tempat berlindung yang aman bagi warga!');
    }
    if (structs.some(s => s.category === 'workshop')) {
      lines.push('Bengkel kerja buatanmu mempercepat pembuatan perkakas desa!');
    }
    if (bonuses.isLeylinePowered) {
      lines.push('Jaringan energi Leyline mengaliri seluruh mesin dan penerangan permukiman ini!');
    }

    if (repLevel === 'trusted' || repLevel === 'honored') {
      lines.push(`Sebagai ${this.getReputationName(repLevel)}, kamu berhak atas total diskon barter sebesar ${discountPercent + bonuses.discountBonusPercent}%!`);
    }

    return {
      name: this.formatNPCName(npcId),
      role,
      roleTitle: scheduleDef.titleIndonesian,
      scheduleActivity: activeSchedule.activityName,
      scheduleDescription: activeSchedule.activityDescription,
      lines,
      trades,
      reputationLevel: repLevel,
      discountPercent: Math.min(50, discountPercent + bonuses.discountBonusPercent),
    };
  }

  private static formatNPCName(npcId: string): string {
    if (npcId.includes('torvald')) return 'Torvald (Saudagar Pengelana)';
    if (npcId.includes('maruhum')) return 'Datuk Maruhum (Penghulu Luhak Minang)';
    if (npcId.includes('mandeh')) return 'Mandeh Siti (Puti Nagari Minang)';
    if (npcId.includes('tejo')) return 'Ki Lurah Tejo (Sesepuh Desa Wilwatikta)';
    if (npcId.includes('supa')) return 'Empu Supa (Pande Besi Pusaka Jawa)';
    if (npcId.includes('wayan')) return 'Pekaseh Wayan (Empu Saluran Subak Bali)';
    if (npcId.includes('mangku')) return 'Jero Mangku (Pemangku Pura Suci Bali)';
    if (npcId.includes('damang')) return 'Damang Batu (Tetua Adat Huma Betang)';
    if (npcId.includes('nyaru')) return 'Pemburu Nyaru (Penjejak Rimba Borneo)';
    if (npcId.includes('gandeng')) return "Ne' Gandeng (Tetua Tongkonan Toraja)";
    if (npcId.includes('pande_batu')) return 'Pande Batu Karst (Pengrajin Pa\'ssura)';
    if (npcId.includes('mabel')) return 'Kepala Suku Mabel (Sesepuh Silimo Baliem)';
    if (npcId.includes('yosina')) return 'Mama Yosina (Saudagar Noken Papua)';
    if (npcId.includes('lokok')) return 'Amaq Lokok (Tetua Bale Sasak Sade)';
    if (npcId.includes('marni')) return 'Inan Marni (Saudagar Tenun Sasak)';
    if (npcId.includes('bryan')) return 'Elder Bryan (Tetua Suncrest)';
    if (npcId.includes('alistair')) return 'Warden Alistair (Penjaga Bastion)';
    if (npcId.includes('ujang')) return 'Nahkoda Ujang (Saudagar Perahu Sungai)';
    if (npcId.includes('saudagar_laut')) return 'Saudagar Samudra (Pedagang Pinisi)';
    
    // Default formatted title
    return npcId
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  public static serialize(): { [id: string]: SettlementState } {
    const data: { [id: string]: SettlementState } = {};
    this.states.forEach((val, key) => {
      data[key] = {
        level: val.level,
        reputation: val.reputation,
        recognizedStructures: val.recognizedStructures ? [...val.recognizedStructures] : [],
        isLeylinePowered: Boolean(val.isLeylinePowered)
      };
    });
    return data;
  }

  public static dispose(): void {
    this.states.clear();
  }
}
