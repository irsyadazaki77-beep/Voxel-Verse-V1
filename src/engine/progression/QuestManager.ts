// Modular Quest Engine: Event-Driven Objective Progression, Data-Driven Registry & Reward Distribution
import { QuestDef, QuestObjective, QuestState, ItemStack } from '../../types';
import { GameEventBus } from '../events/GameEventBus';
import { CraftingSystem } from '../items/CraftingSystem';
import { SETTLEMENT_REGISTRY, SettlementManager } from '../settlement/SettlementManager';
import { NotificationManager } from '../ui/NotificationManager';

export const QUEST_REGISTRY: Record<string, QuestDef> = {
  q_first_steps: {
    id: 'q_first_steps',
    title: 'Pioneering the Haven',
    giverName: 'Torvald (Saudagar Pengelana)',
    giverSettlement: 'Haven Camp',
    category: 'storyline',
    tier: 'tier1_haven',
    description: 'Tebang kayu rimba, buat perkakas dasar, dan temukan situs suci permukiman perintis.',
    objectives: [
      { type: 'craft', description: 'Craft a Wooden Pickaxe at a Crafting Bench', targetId: 'wooden_pickaxe', requiredCount: 1 },
      { type: 'collect', description: 'Kumpulkan 8 Batu Kali (River Cobblestone)', targetId: 'cobblestone', requiredCount: 8 },
      { type: 'discover', description: 'Temukan Bangunan Suci atau Pondok Pengelana', targetId: 'shrine', requiredCount: 1 },
    ],
    rewards: {
      xp: 50,
      items: [
        { itemId: 'copper_ingot', count: 4 },
        { itemId: 'bread', count: 6 },
      ],
      unlockedRecipe: 'copper_pickaxe',
      reputation: { settlementId: 'haven_camp', amount: 15 },
    },
  },
  q_hunting_stalkers: {
    id: 'q_hunting_stalkers',
    title: 'Bayang-Bayang Malam Suncrest',
    giverName: 'Elder Bryan of Suncrest',
    giverSettlement: 'Suncrest Hamlet',
    category: 'hunting',
    tier: 'tier2_frontier',
    description: 'Makhluk bayangan malam mengancam batas perimeter desa pertanian Suncrest. Halau mereka demi keamanan warga.',
    objectives: [
      { type: 'kill', description: 'Tumpas 3 Shadow Stalkers', targetId: 'stalker', requiredCount: 3 },
    ],
    rewards: {
      xp: 120,
      items: [
        { itemId: 'iron_ingot', count: 4 },
        { itemId: 'healing_potion', count: 2 },
      ],
      reputation: { settlementId: 'suncrest_hamlet', amount: 20 },
    },
    prerequisites: ['q_first_steps'],
  },
  
  // Nusantara Living Settlement Regional Quests
  q_repair_subak: {
    id: 'q_repair_subak',
    title: 'Restorasi Saluran Tirta Subak Bali',
    giverName: 'Pekaseh Wayan (Pengelola Subak)',
    giverSettlement: 'Banjar Tirta Subak',
    category: 'exploration',
    tier: 'tier3_ancient',
    description: 'Bantu Pekaseh Wayan merawat talang air berundak dan mengumpulkan benih beras suci untuk musim tanam pura.',
    objectives: [
      { type: 'collect', description: 'Kumpulkan 12 Beras Suci Teras Subak', targetId: 'subak_terrace_rice', requiredCount: 12 },
      { type: 'craft', description: 'Buat 4 Talang Air Irigasi Subak (Terrace Waterway)', targetId: 'terrace_waterway', requiredCount: 4 },
    ],
    rewards: {
      xp: 220,
      items: [
        { itemId: 'gaharu_incense', count: 6 },
        { itemId: 'paras_stone_carving', count: 4 },
      ],
      reputation: { settlementId: 'banjar_subak', amount: 30 },
      unlockedRecipe: 'cultural_aether_lantern',
    },
    prerequisites: ['q_first_steps'],
  },

  q_trade_jawa: {
    id: 'q_trade_jawa',
    title: 'Lumbung Pangan & Pamor Majapahit',
    giverName: 'Ki Lurah Tejo (Sesepuh Jawa)',
    giverSettlement: 'Dusun Wilwatikta',
    category: 'gathering',
    tier: 'tier2_frontier',
    description: 'Siapkan pasokan Beras Wangi dan Gerabah Merah untuk perbekalan lumbung desa Wilwatikta.',
    objectives: [
      { type: 'collect', description: 'Kumpulkan 16 Beras Wangi Organik', targetId: 'beras_wangi', requiredCount: 16 },
      { type: 'collect', description: 'Kumpulkan 4 Gerabah Tanah Liat Merah', targetId: 'terracotta_pottery', requiredCount: 4 },
    ],
    rewards: {
      xp: 200,
      items: [
        { itemId: 'kain_batik_tulis', count: 2 },
        { itemId: 'teak_woodcraft', count: 2 },
      ],
      reputation: { settlementId: 'desa_majapahit', amount: 30 },
    },
    prerequisites: ['q_first_steps'],
  },

  q_river_borneo: {
    id: 'q_river_borneo',
    title: 'Jalur Getah Damar & Kayu Ulin',
    giverName: 'Damang Batu (Tetua Huma Betang)',
    giverSettlement: 'Huma Betang Kahayan',
    category: 'gathering',
    tier: 'tier2_frontier',
    description: 'Bantu para penjelajah rimba mengumpulkan getah damar dan balok kayu ulin tahan air untuk perbaikan rumah panggung Betang.',
    objectives: [
      { type: 'collect', description: 'Kumpulkan 8 Getah Damar Rimba Murni', targetId: 'damar_resin', requiredCount: 8 },
      { type: 'collect', description: 'Kumpulkan 6 Peti Balok Kayu Ulin', targetId: 'ulin_timber_crate', requiredCount: 6 },
    ],
    rewards: {
      xp: 240,
      items: [
        { itemId: 'sumpit_blowpipe', count: 1 },
        { itemId: 'arowana_scales', count: 3 },
      ],
      reputation: { settlementId: 'kampung_dayak', amount: 30 },
    },
    prerequisites: ['q_first_steps'],
  },

  q_spices_minang: {
    id: 'q_spices_minang',
    title: 'Rempah Gunung Lembah Harau',
    giverName: 'Datuk Maruhum (Penghulu Minang)',
    giverSettlement: 'Nagari Lembah Harau',
    category: 'gathering',
    tier: 'tier2_frontier',
    description: 'Lembah Harau terkenal dengan rempah kayu manis dan seduhan daun kawa. Kumpulkan komoditas ini untuk memperluas pasar nagari.',
    objectives: [
      { type: 'collect', description: 'Kumpulkan 10 Kulit Manis Gunung Singgalang', targetId: 'kayu_manis_harau', requiredCount: 10 },
      { type: 'collect', description: 'Kumpulkan 8 Rempah Racik Lembah Harau', targetId: 'rendang_spices', requiredCount: 8 },
    ],
    rewards: {
      xp: 220,
      items: [
        { itemId: 'silver_filigree', count: 2 },
        { itemId: 'songket_emas', count: 1 },
      ],
      reputation: { settlementId: 'nagari_minang', amount: 30 },
    },
    prerequisites: ['q_first_steps'],
  },

  q_ancestral_toraja: {
    id: 'q_ancestral_toraja',
    title: 'Pusaka Ukir Tebing Karst Toraja',
    giverName: "Ne' Gandeng (Tetua Tongkonan)",
    giverSettlement: 'Rante Kete Kesu',
    category: 'exploration',
    tier: 'tier3_ancient',
    description: 'Petik biji kopi lereng Sesean dan tempa ukiran Pa\'ssura untuk melengkapi persemayaman leluhur di tebing batu karst.',
    objectives: [
      { type: 'collect', description: 'Kumpulkan 12 Kopi Arabika Lereng Sesean', targetId: 'toraja_arabica', requiredCount: 12 },
      { type: 'collect', description: 'Kumpulkan 3 Papan Ukir Pa\'ssura Toraja', targetId: 'passura_woodcraft', requiredCount: 3 },
    ],
    rewards: {
      xp: 260,
      items: [
        { itemId: 'tedong_horn_relic', count: 2 },
        { itemId: 'daging_sei_asap', count: 6 },
      ],
      reputation: { settlementId: 'desa_kete_kesu', amount: 30 },
    },
    prerequisites: ['q_first_steps'],
  },

  q_sago_papua: {
    id: 'q_sago_papua',
    title: 'Ketahanan Pangan Honai Lembah Baliem',
    giverName: 'Mama Yosina (Saudagar Noken)',
    giverSettlement: 'Kurulu Silimo',
    category: 'gathering',
    tier: 'tier3_ancient',
    description: 'Kumpulkan pati sagu rumbia dan ubi ungu untuk menghangatkan honai keluarga selama kabut dingin gletser.',
    objectives: [
      { type: 'collect', description: 'Kumpulkan 16 Tepung Sagu Pohon Rumbia', targetId: 'sago_flour', requiredCount: 16 },
      { type: 'collect', description: 'Kumpulkan 12 Ubi Ungu Lembah Baliem', targetId: 'valley_sweet_potato', requiredCount: 12 },
    ],
    rewards: {
      xp: 280,
      items: [
        { itemId: 'maro_bark_cloth', count: 2 },
        { itemId: 'aether_amber_resin', count: 2 },
      ],
      reputation: { settlementId: 'kampung_baliem', amount: 35 },
    },
    prerequisites: ['q_first_steps'],
  },

  q_salt_sasak: {
    id: 'q_salt_sasak',
    title: 'Garam Surya & Jagung Sabana Sade',
    giverName: 'Amaq Lokok (Tetua Bale Sasak)',
    giverSettlement: 'Bale Tani Sade',
    category: 'gathering',
    tier: 'tier2_frontier',
    description: 'Kumpulkan garam kristal tambak karang dan jagung kering ladang sabana untuk persiapan pelayaran antar-pulau.',
    objectives: [
      { type: 'collect', description: 'Kumpulkan 16 Garam Kristal Tambak Karang', targetId: 'solar_sea_salt', requiredCount: 16 },
      { type: 'collect', description: 'Kumpulkan 12 Jagung Pipil Sabana Kering', targetId: 'dryland_maize', requiredCount: 12 },
    ],
    rewards: {
      xp: 210,
      items: [
        { itemId: 'ikan_cakalang_asap', count: 4 },
        { itemId: 'coastal_pearl', count: 1 },
      ],
      reputation: { settlementId: 'desa_sasak', amount: 30 },
    },
    prerequisites: ['q_first_steps'],
  },

  q_delve_crypt: {
    id: 'q_delve_crypt',
    title: 'Gema Kuil Bawah Tanah & Sentinels',
    giverName: 'Warden Alistair the Scout',
    giverSettlement: 'Outpost Bastion',
    category: 'dungeon',
    tier: 'tier3_ancient',
    description: 'Masuki ruang bawah tanah kuno, lewati jebakan aether, dan taklukkan Ruin Sentinel penjaga pusaka.',
    objectives: [
      { type: 'discover', description: 'Temukan Pintu Masuk Subterranean Dungeon', targetId: 'dungeon', requiredCount: 1 },
      { type: 'kill', description: 'Kalahkan Ruin Sentinel Mini-Boss', targetId: 'ruin_sentinel', requiredCount: 1 },
    ],
    rewards: {
      xp: 350,
      items: [
        { itemId: 'mythril_ingot', count: 4 },
        { itemId: 'eye_of_aether', count: 1 },
      ],
      reputation: { settlementId: 'ferrite_outpost', amount: 35 },
      artifactHint: 'The Eye of Aether unlocks hidden vision and leyline insights.',
    },
    prerequisites: ['q_hunting_stalkers'],
  },

  q_slay_sovereign: {
    id: 'q_slay_sovereign',
    title: 'Confronting the Void Sovereign',
    giverName: 'Archivist Kenneth',
    category: 'boss',
    tier: 'tier5_void',
    description: 'Masuki retakan Void-Scarred Cataclysm dan segel Shadow Sovereign untuk kedamaian seluruh kepulauan Nusantara.',
    objectives: [
      { type: 'boss', description: 'Kalahkan the Shadow Sovereign', targetId: 'boss_void_sovereign', requiredCount: 1 },
    ],
    rewards: {
      xp: 1200,
      items: [
        { itemId: 'void_walker_ring', count: 1 },
        { itemId: 'aether_crystal', count: 12 },
      ],
    },
    prerequisites: ['q_delve_crypt'],
  },
};

export class QuestManager {
  private static questStates: Map<string, { state: QuestState; progress: number[] }> = new Map();
  private static claimedRewards: Set<string> = new Set();
  private static onQuestChangeCallbacks: (() => void)[] = [];
  private static eventUnsubscribes: (() => void)[] = [];

  public static initialize(
    savedQuests?: { [questId: string]: { state: QuestState; progress: { [idx: number]: number } } },
    savedClaimedRewards?: string[]
  ): void {
    this.dispose();

    if (savedClaimedRewards && Array.isArray(savedClaimedRewards)) {
      savedClaimedRewards.forEach(id => this.claimedRewards.add(id));
    }

    // Default quests initialization
    Object.keys(QUEST_REGISTRY).forEach((qId) => {
      const qDef = QUEST_REGISTRY[qId];
      const initialProgress = new Array(qDef.objectives.length).fill(0);
      const isStarter = !qDef.prerequisites || qDef.prerequisites.length === 0;

      this.questStates.set(qId, {
        state: isStarter ? 'active' : 'unavailable',
        progress: initialProgress,
      });
    });

    // Load saved states
    if (savedQuests) {
      Object.entries(savedQuests).forEach(([qId, data]) => {
        if (QUEST_REGISTRY[qId]) {
          const qDef = QUEST_REGISTRY[qId];
          const progArray = new Array(qDef.objectives.length).fill(0);
          if (data.progress) {
            Object.entries(data.progress).forEach(([idxStr, val]) => {
              const idx = parseInt(idxStr, 10);
              if (idx >= 0 && idx < progArray.length) {
                progArray[idx] = val;
              }
            });
          }
          this.questStates.set(qId, {
            state: data.state,
            progress: progArray,
          });
        }
      });
    }

    this.checkPrerequisites();
    this.setupEventListeners();
  }

  private static matchesTarget(objTarget: string, eventTarget: string): boolean {
    if (objTarget === eventTarget) return true;
    const ALIASES: Record<string, string[]> = {
      'cobblestone': ['cobblestone', '3', 'river_cobblestone'],
      'stalker': ['stalker', 'shadow_stalker'],
      'ruin_sentinel': ['ruin_sentinel', 'boss_ruin_sentinel'],
      'boss_void_sovereign': ['boss_void_sovereign', 'void_sovereign', 'boss_void_sovereign_1'],
      'shrine': ['shrine', 'ancient_shrine', 'explorer_cabin', 'pura_shrine', 'altar'],
      'dungeon': ['dungeon', 'dungeon_entrance', 'subterranean_dungeon']
    };
    const list = ALIASES[objTarget];
    return list ? list.includes(eventTarget) : false;
  }

  private static setupEventListeners(): void {
    this.dispose();

    this.eventUnsubscribes.push(
      GameEventBus.on('ENTITY_KILLED', (data) => {
        this.advanceObjective('kill', data.modelType, 1);
        if (data.isBoss) {
          this.advanceObjective('boss', data.entityId, 1);
          this.advanceObjective('boss', data.modelType, 1);
        }
      })
    );

    this.eventUnsubscribes.push(
      GameEventBus.on('BOSS_DEFEATED', (data) => {
        this.advanceObjective('boss', data.bossId, 1);
      })
    );

    this.eventUnsubscribes.push(
      GameEventBus.on('ITEM_CRAFTED', (data) => {
        this.advanceObjective('craft', data.itemId, data.count);
      })
    );

    this.eventUnsubscribes.push(
      GameEventBus.on('ITEM_COLLECTED', (data) => {
        this.advanceObjective('collect', data.itemId, data.count);
      })
    );

    this.eventUnsubscribes.push(
      GameEventBus.on('STRUCTURE_DISCOVERED', (data) => {
        this.advanceObjective('discover', data.structureId, 1);
        this.advanceObjective('discover', 'structure', 1);
      })
    );

    this.eventUnsubscribes.push(
      GameEventBus.on('LANDMARK_DISCOVERED', (data) => {
        this.advanceObjective('discover', data.landmarkId, 1);
      })
    );
  }

  public static advanceObjective(type: string, targetId: string, amount: number = 1): void {
    let changed = false;

    this.questStates.forEach((qState, qId) => {
      if (qState.state !== 'active') return;
      const qDef = QUEST_REGISTRY[qId];
      if (!qDef) return;

      qDef.objectives.forEach((obj, idx) => {
        if (obj.type === type && this.matchesTarget(obj.targetId, targetId)) {
          const current = qState.progress[idx] || 0;
          if (current < obj.requiredCount) {
            qState.progress[idx] = Math.min(obj.requiredCount, current + amount);
            changed = true;
          }
        }
      });

      // Check if all objectives completed
      const allComplete = qDef.objectives.every((obj, idx) => (qState.progress[idx] || 0) >= obj.requiredCount);
      if (allComplete) {
        qState.state = 'completed';
        changed = true;
        this.claimRewards(qId, qDef);
        this.checkPrerequisites();
      }
    });

    if (changed) {
      this.notifyListeners();
    }
  }

  public static claimRewards(qId: string, qDef: QuestDef): boolean {
    if (this.claimedRewards.has(qId)) return false;

    this.claimedRewards.add(qId);

    // Emit event with full reward specs
    GameEventBus.emit('QUEST_COMPLETED', {
      questId: qId,
      xpReward: qDef.rewards.xp,
      rewards: qDef.rewards,
    });

    // Handle recipe unlock
    if (qDef.rewards.unlockedRecipe) {
      CraftingSystem.unlockRecipe(qDef.rewards.unlockedRecipe);
    }

    // Handle reputation reward
    if (qDef.rewards.reputation) {
      SettlementManager.addReputation(qDef.rewards.reputation.settlementId, qDef.rewards.reputation.amount);
    } else if (qDef.giverSettlement) {
      const settlementKey = qDef.giverSettlement.toLowerCase().replace(/\s+/g, '_');
      if (SETTLEMENT_REGISTRY[settlementKey]) {
        SettlementManager.addReputation(settlementKey, 20);
      }
    }

    NotificationManager.push({
      title: 'Misi Selesai!',
      message: `${qDef.title}: +${qDef.rewards.xp} XP & Hadiah Berhasil Diraih!`,
      priority: 'HIGH',
      icon: '📜',
      durationMs: 7000,
    });

    return true;
  }

  public static isRewardClaimed(qId: string): boolean {
    return this.claimedRewards.has(qId);
  }

  public static getClaimedRewards(): string[] {
    return Array.from(this.claimedRewards);
  }

  public static checkPrerequisites(): void {
    this.questStates.forEach((qState, qId) => {
      if (qState.state !== 'unavailable') return;
      const qDef = QUEST_REGISTRY[qId];
      if (!qDef) return;

      if (qDef.prerequisites && qDef.prerequisites.length > 0) {
        const reqsMet = qDef.prerequisites.every((prereqId) => {
          const prereqState = this.questStates.get(prereqId);
          return prereqState && prereqState.state === 'completed';
        });

        if (reqsMet) {
          qState.state = 'active';
        }
      }
    });
  }

  public static getActiveQuests(): { def: QuestDef; progress: number[]; state: QuestState }[] {
    const list: { def: QuestDef; progress: number[]; state: QuestState }[] = [];
    this.questStates.forEach((qState, qId) => {
      const def = QUEST_REGISTRY[qId];
      if (def) {
        list.push({ def, progress: qState.progress, state: qState.state });
      }
    });
    return list;
  }

  public static serialize(): { [questId: string]: { state: QuestState; progress: { [idx: number]: number } } } {
    const obj: { [questId: string]: { state: QuestState; progress: { [idx: number]: number } } } = {};
    this.questStates.forEach((qState, qId) => {
      const progObj: { [idx: number]: number } = {};
      qState.progress.forEach((v, idx) => {
        progObj[idx] = v;
      });
      obj[qId] = { state: qState.state, progress: progObj };
    });
    return obj;
  }

  public static dispose(): void {
    this.eventUnsubscribes.forEach(un => un());
    this.eventUnsubscribes = [];
    this.questStates.clear();
    this.claimedRewards.clear();
    this.onQuestChangeCallbacks = [];
  }

  public static onQuestChange(cb: () => void): () => void {
    this.onQuestChangeCallbacks.push(cb);
    return () => {
      this.onQuestChangeCallbacks = this.onQuestChangeCallbacks.filter(c => c !== cb);
    };
  }

  private static notifyListeners(): void {
    this.onQuestChangeCallbacks.forEach(cb => cb());
  }
}
