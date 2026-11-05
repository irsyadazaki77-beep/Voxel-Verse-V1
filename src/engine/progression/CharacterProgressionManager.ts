// Character Progression Engine: 4 Core Attributes, 3-Branch Nusantara Skill Tree, 6-Archetype Weapon Mastery, Co-op Party & World Modding Rules
import { WeaponCategory } from '../combat/WeaponArchetypes';
import { GameEventBus } from '../events/GameEventBus';
import { NotificationManager } from '../ui/NotificationManager';

export type CoreAttributeId = 'raga' | 'daya' | 'lincah' | 'karsa';

export type SkillBranchId = 'jawara_silat' | 'empu_aether' | 'penjelajah_cakrawala';

export interface SkillNodeDef {
  id: string;
  branch: SkillBranchId;
  tier: 1 | 2 | 3 | 4;
  name: string;
  subtitle: string;
  description: string;
  maxRank: number;
  costPerRank: number;
  prerequisiteId?: string;
  effectSummary: string;
}

export interface WeaponMasteryEntry {
  category: WeaponCategory;
  name: string;
  nusantaraExamples: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  tier1Perk: string;
  tier2Perk: string;
  tier3Perk: string;
}

export interface CoopPartyMember {
  id: string;
  name: string;
  role: 'Jawara Silat' | 'Empu Aether' | 'Penjelajah Cakrawala';
  level: number;
  health: number;
  maxHealth: number;
  position: [number, number, number];
  isLeader?: boolean;
  isOnline: boolean;
}

export interface WorldModdingConfig {
  xpMultiplier: number;
  resourceYieldMultiplier: number;
  anomalyFrequencyMultiplier: number;
  siegeDifficultyMultiplier: number;
  instantBlueprintBuild: boolean;
}

export interface SerializedCharacterProgression {
  attributes: Record<CoreAttributeId, number>;
  availableAttributePoints: number;
  availableSkillPoints: number;
  unlockedSkills: Record<string, number>;
  weaponMastery: Record<string, { level: number; xp: number }>;
  partyState?: {
    partyName: string;
    guildTag: string;
    sharedQuestSync: boolean;
    members: CoopPartyMember[];
  };
  worldModConfig?: WorldModdingConfig;
  customBlueprints?: Array<{
    id: string;
    name: string;
    code: string;
    dimensions: [number, number, number];
    blockCount: number;
    createdAt: number;
  }>;
}

export const SKILL_TREE_REGISTRY: SkillNodeDef[] = [
  // ==========================================
  // CABANG 1: JAWARA SILAT (Combat & Pusaka)
  // ==========================================
  {
    id: 'silat_kuda_kokoh',
    branch: 'jawara_silat',
    tier: 1,
    name: 'Kuda-Kuda Baja Nusantara',
    subtitle: 'Fondasi Pertarungan Jarak Dekat',
    description: 'Memperkuat tumpuan kaki saat mengayunkan senjata, meningkatkan daya hancur Poise musuh dan memulihkan stamina ekstra setiap serangan mengenai sasaran.',
    maxRank: 3,
    costPerRank: 1,
    effectSummary: '+12% Poise Damage & +4 Stamina/Hit per tingkat',
  },
  {
    id: 'silat_tangkisan_kilat',
    branch: 'jawara_silat',
    tier: 2,
    name: 'Tangkisan Kilat Pamor',
    subtitle: 'Penguasaan Parry & Riposte',
    description: 'Memperluas jendela waktu tangkisan sempurna (Perfect Parry) dan memantulkan gelombang kejut Poise berlipat ganda ke arah Boss maupun penyerang.',
    maxRank: 2,
    costPerRank: 1,
    prerequisiteId: 'silat_kuda_kokoh',
    effectSummary: '+35% Pantulan Poise Parry & +15% Crit Riposte per tingkat',
  },
  {
    id: 'silat_aliran_pamor',
    branch: 'jawara_silat',
    tier: 3,
    name: 'Aliran Resonansi Pusaka',
    subtitle: 'Sinergi Serangan Beruntun',
    description: 'Setiap serangan kombo ke-3 atau serangan udara melepaskan percikan energi pusaka yang menembus pertahanan lawan dan meningkatkan pengisian Tenaga Dalam.',
    maxRank: 2,
    costPerRank: 2,
    prerequisiteId: 'silat_tangkisan_kilat',
    effectSummary: '+18% Kerusakan Kombo Akhir & +25% Pengisian Tenaga Dalam',
  },
  {
    id: 'silat_master_pusaka',
    branch: 'jawara_silat',
    tier: 4,
    name: 'Ajian Mahaguru Jawara',
    subtitle: 'Keystone Penguasa Medan Laga',
    description: 'Puncak ilmu kanuragan Nusantara. Memangkas waktu tunggu (cooldown) seluruh jurus senjata sebesar 25% dan memulihkan darah sebesar 12% dari kerusakan kritikal.',
    maxRank: 1,
    costPerRank: 3,
    prerequisiteId: 'silat_aliran_pamor',
    effectSummary: '-25% Cooldown Jurus Senjata & +12% Lifesteal Kritikal',
  },

  // ==========================================
  // CABANG 2: EMPU MEKANIKA AETHER (Engineering & Town)
  // ==========================================
  {
    id: 'empu_konduit_efisien',
    branch: 'empu_aether',
    tier: 1,
    name: 'Penempaan Inti Leyline',
    subtitle: 'Efisiensi Tambang & Jaringan Daya',
    description: 'Mengoptimalkan ekstraksi mineral dan aliran kristal Aether. Meningkatkan kecepatan menambang balok serta kapasitas penyimpanan jaringan Ley.',
    maxRank: 3,
    costPerRank: 1,
    effectSummary: '+15% Kecepatan Tambang & +20% Kapasitas Energi Aether',
  },
  {
    id: 'empu_resonansi_subak',
    branch: 'empu_aether',
    tier: 2,
    name: 'Hidrolika Subak & Otomasi',
    subtitle: 'Akselerasi Produksi Pangan & Bijih',
    description: 'Menyelaraskan Kincir Air Subak, Auto-Harvester, dan Tungku Peleburan sehingga menghasilkan panen ekstra serta mempercepat waktu produksi otomatis.',
    maxRank: 2,
    costPerRank: 1,
    prerequisiteId: 'empu_konduit_efisien',
    effectSummary: '+25% Hasil Panen/Tambang Otomatis & +20% Kecepatan Smelting',
  },
  {
    id: 'empu_kalibrasi_turret',
    branch: 'empu_aether',
    tier: 3,
    name: 'Benteng Menara Sentinel',
    subtitle: 'Pertahanan Pemukiman & Siege',
    description: 'Memperkuat Sentinel Turret dan struktur pertahanan desa adat dengan proyektil resonansi yang memberikan kerusakan lebih tinggi dan meningkatkan reputasi dagang desa.',
    maxRank: 2,
    costPerRank: 2,
    prerequisiteId: 'empu_resonansi_subak',
    effectSummary: '+30% Daya Gempur Turret & +15% Diskon Pasar Desa',
  },
  {
    id: 'empu_arsitek_agung',
    branch: 'empu_aether',
    tier: 4,
    name: 'Mahakarya Sang Empu Agung',
    subtitle: 'Keystone Insinyur & Arsitek Nusantara',
    description: 'Mengurangi kebutuhan material konstruksi Blueprint sebesar 20% dan membangkitkan Perisai Kristal Aether otomatis yang menyerap 50% kerusakan saat darah di bawah 35%.',
    maxRank: 1,
    costPerRank: 3,
    prerequisiteId: 'empu_kalibrasi_turret',
    effectSummary: '-20% Biaya Material Blueprint & Perisai Darurat Aether',
  },

  // ==========================================
  // CABANG 3: PENJELAJAH CAKRAWALA (Exploration & Dimensions)
  // ==========================================
  {
    id: 'cakrawala_langkah_angin',
    branch: 'penjelajah_cakrawala',
    tier: 1,
    name: 'Langkah Angin Khatulistiwa',
    subtitle: 'Mobilitas Lintas Medan',
    description: 'Meringankan langkah kaki saat menjelajah hutan, pegunungan, dan perairan. Meningkatkan kecepatan gerak dan memangkas pengurasan stamina saat berlari.',
    maxRank: 3,
    costPerRank: 1,
    effectSummary: '+6% Kecepatan Gerak & -12% Stamina Lari per tingkat',
  },
  {
    id: 'cakrawala_nakhoda_bahari',
    branch: 'penjelajah_cakrawala',
    tier: 2,
    name: 'Nakhoda Samudra & Angkasa',
    subtitle: 'Penguasaan Phinisi, Selam & Garuda',
    description: 'Memperbesar kapasitas oksigen saat menyelam ke Palung Samudra, mempercepat laju Kapal Phinisi serta wahana terbang, dan meningkatkan peluang harta pancing.',
    maxRank: 2,
    costPerRank: 1,
    prerequisiteId: 'cakrawala_langkah_angin',
    effectSummary: '+40 Maks Oksigen, +20% Laju Wahana & +25% Harta Pancing',
  },
  {
    id: 'cakrawala_mata_batin',
    branch: 'penjelajah_cakrawala',
    tier: 3,
    name: 'Kompas Bintang & Cartografi',
    subtitle: 'Penyingkap Rahasia Dunia',
    description: 'Memperluas jangkauan pembukaan Fog-of-War di Peta Dunia serta meningkatkan perolehan XP dari penemuan Bioma, Candi, Dungeon, dan Prasasti.',
    maxRank: 2,
    costPerRank: 2,
    prerequisiteId: 'cakrawala_nakhoda_bahari',
    effectSummary: '+35% XP Eksplorasi/Quest & Jangkauan Peta Lebih Luas',
  },
  {
    id: 'cakrawala_penguasa_dimensi',
    branch: 'penjelajah_cakrawala',
    tier: 4,
    name: 'Penjelajah Antar Dimensi',
    subtitle: 'Keystone Pengembara Cakrawala',
    description: 'Membuka kemampuan Fast Travel instan ke seluruh Monolit dan Pemukiman di Peta Dunia serta memberikan kekebalan terhadap suhu ekstrem (beku/panas).',
    maxRank: 1,
    costPerRank: 3,
    prerequisiteId: 'cakrawala_mata_batin',
    effectSummary: 'Fast Travel Peta Dunia Terbuka & Kebal Cuaca Ekstrem',
  },
];

export const WEAPON_MASTERY_METADATA: Record<
  WeaponCategory,
  { name: string; nusantaraExamples: string; tier1Perk: string; tier2Perk: string; tier3Perk: string }
> = {
  sword: {
    name: 'Bilah Cepat & Keris',
    nusantaraExamples: 'Keris Naga Baruklinting, Pedang Suduk, Kujang Pusaka',
    tier1Perk: 'Lv.3: +10% Kecepatan Ayunan & Kombo Lebih Rapat',
    tier2Perk: 'Lv.6: +15% Peluang Kritikal setelah Tangkisan/Dodge',
    tier3Perk: 'Lv.10: Tebasan Pamor — Serangan penuh memancarkan gelombang energi',
  },
  axe: {
    name: 'Tebasan Berat & Mandau',
    nusantaraExamples: 'Mandau Kalimantan, Kapak Perang, Golok Tebas',
    tier1Perk: 'Lv.3: +15% Kerusakan terhadap Perisai & Kayu',
    tier2Perk: 'Lv.6: +25% Daya Hancur Poise Musuh Berpelindung',
    tier3Perk: 'Lv.10: Belahan Rimba — Tebasan kritikal meremukkan pertahanan target',
  },
  spear: {
    name: 'Jangkauan & Tombak Trisula',
    nusantaraExamples: 'Tombak Kyai Plered, Trisula Samudra, Lembing Bambu',
    tier1Perk: 'Lv.3: +0.5m Jangkauan Tusukan & +10% Penetrasi Armor',
    tier2Perk: 'Lv.6: +25% Bonus Kerusakan Ujung Tombak (Sweet-Spot)',
    tier3Perk: 'Lv.10: Kilat Samudra — Tusukan melesat menembus barisan musuh',
  },
  hammer: {
    name: 'Hantaman & Gada Pusaka',
    nusantaraExamples: 'Gada Pusaka Buto Ijo, Palu Tempa Empu, Gada Besi',
    tier1Perk: 'Lv.3: +20% Poise Damage pada Hantaman Darat',
    tier2Perk: 'Lv.6: Hantaman Lompat menciptakan gelombang kejut radius 3.5m',
    tier3Perk: 'Lv.10: Lindu Bumi — Meruntuhkan keseimbangan Boss secara instan',
  },
  bow: {
    name: 'Busur Gendewa & Sumpit',
    nusantaraExamples: 'Busur Gendewa Aether, Sumpit Dayak, Busur Berburu',
    tier1Perk: 'Lv.3: +15% Kecepatan Tarikan Busur & Laju Proyektil',
    tier2Perk: 'Lv.6: Tembakan Penuh (Full Charge) menghemat 30% Stamina',
    tier3Perk: 'Lv.10: Panah Cakrawala — Proyektil kritikal memicu ledakan kristal',
  },
  staff: {
    name: 'Tongkat Fokus & Perisai',
    nusantaraExamples: 'Tongkat Kristal Ley, Perisai Aegis, Lontar Fokus',
    tier1Perk: 'Lv.3: +15% Efisiensi Energi Jurus & Reduksi Blokir',
    tier2Perk: 'Lv.6: Memantulkan kerusakan saat menahan serangan berat',
    tier3Perk: 'Lv.10: Resonansi Murni — Menggandakan aura pelindung di sekitar pemain',
  },
  shield: {
    name: 'Perisai Pertahanan Adat',
    nusantaraExamples: 'Tameng Talawang, Perisai Besi, Aegis Kuno',
    tier1Perk: 'Lv.3: -20% Konsumsi Stamina saat Menangkis',
    tier2Perk: 'Lv.6: +30% Poise Damage saat melakukan Parry Tepat Waktu',
    tier3Perk: 'Lv.10: Benteng Hidup — Kebal pentalan (knockback) saat bertahan',
  },
  unarmed: {
    name: 'Silat Tangan Kosong',
    nusantaraExamples: 'Pencak Silat Murni, Jurus Tenaga Dalam',
    tier1Perk: 'Lv.3: +25% Kerusakan Pukulan & Tendangan Silat',
    tier2Perk: 'Lv.6: Setiap pukulan ke-3 memulihkan +8 Stamina',
    tier3Perk: 'Lv.10: Tapak Brajamusti — Pukulan tangan kosong melontarkan gelombang kejut',
  },
};

export class CharacterProgressionManager {
  public static attributes: Record<CoreAttributeId, number> = {
    raga: 1,
    daya: 1,
    lincah: 1,
    karsa: 1,
  };

  public static availableAttributePoints: number = 3;
  public static availableSkillPoints: number = 2;
  public static unlockedSkills: Record<string, number> = {};

  private static masteryMap: Record<WeaponCategory, { level: number; xp: number }> = {
    sword: { level: 1, xp: 0 },
    axe: { level: 1, xp: 0 },
    spear: { level: 1, xp: 0 },
    hammer: { level: 1, xp: 0 },
    bow: { level: 1, xp: 0 },
    staff: { level: 1, xp: 0 },
    shield: { level: 1, xp: 0 },
    unarmed: { level: 1, xp: 0 },
  };

  public static partyState: {
    partyName: string;
    guildTag: string;
    sharedQuestSync: boolean;
    members: CoopPartyMember[];
  } = {
    partyName: 'Ekspedisi Garuda Nusantara',
    guildTag: 'NSNT',
    sharedQuestSync: true,
    members: [
      {
        id: 'companion_aria',
        name: 'Raden Wijaya (Vanguard)',
        role: 'Jawara Silat',
        level: 4,
        health: 145,
        maxHealth: 145,
        position: [14, 72, 12],
        isOnline: true,
      },
      {
        id: 'companion_kirana',
        name: 'Empu Kirana (Insinyur Ley)',
        role: 'Empu Aether',
        level: 3,
        health: 120,
        maxHealth: 120,
        position: [-12, 71, 18],
        isOnline: true,
      },
    ],
  };

  public static worldModConfig: WorldModdingConfig = {
    xpMultiplier: 1.0,
    resourceYieldMultiplier: 1.0,
    anomalyFrequencyMultiplier: 1.0,
    siegeDifficultyMultiplier: 1.0,
    instantBlueprintBuild: false,
  };

  public static customBlueprints: Array<{
    id: string;
    name: string;
    code: string;
    dimensions: [number, number, number];
    blockCount: number;
    createdAt: number;
  }> = [];

  private static listeners: Set<() => void> = new Set();

  public static initialize(saved?: SerializedCharacterProgression, playerLevel: number = 1): void {
    if (saved) {
      this.attributes = {
        raga: saved.attributes?.raga ?? 1,
        daya: saved.attributes?.daya ?? 1,
        lincah: saved.attributes?.lincah ?? 1,
        karsa: saved.attributes?.karsa ?? 1,
      };
      this.availableAttributePoints = saved.availableAttributePoints ?? Math.max(0, playerLevel * 2);
      this.availableSkillPoints = saved.availableSkillPoints ?? Math.max(1, playerLevel);
      this.unlockedSkills = { ...(saved.unlockedSkills || {}) };

      if (saved.weaponMastery) {
        (Object.keys(this.masteryMap) as WeaponCategory[]).forEach((cat) => {
          if (saved.weaponMastery[cat]) {
            this.masteryMap[cat] = {
              level: Math.max(1, Math.min(10, saved.weaponMastery[cat].level || 1)),
              xp: Math.max(0, saved.weaponMastery[cat].xp || 0),
            };
          }
        });
      }

      if (saved.partyState) {
        this.partyState = {
          partyName: saved.partyState.partyName || 'Ekspedisi Garuda Nusantara',
          guildTag: saved.partyState.guildTag || 'NSNT',
          sharedQuestSync: saved.partyState.sharedQuestSync ?? true,
          members: Array.isArray(saved.partyState.members) ? saved.partyState.members : this.partyState.members,
        };
      }

      if (saved.worldModConfig) {
        this.worldModConfig = {
          ...this.worldModConfig,
          ...saved.worldModConfig,
        };
      }

      if (Array.isArray(saved.customBlueprints)) {
        this.customBlueprints = [...saved.customBlueprints];
      }
    } else {
      this.attributes = { raga: 1, daya: 1, lincah: 1, karsa: 1 };
      this.availableAttributePoints = Math.max(3, playerLevel * 2);
      this.availableSkillPoints = Math.max(2, playerLevel);
      this.unlockedSkills = {};
      (Object.keys(this.masteryMap) as WeaponCategory[]).forEach((cat) => {
        this.masteryMap[cat] = { level: 1, xp: 0 };
      });
    }
    this.notify();
  }

  public static subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public static onChange(cb: () => void): () => void {
    return this.subscribe(cb);
  }

  private static notify(): void {
    this.listeners.forEach((cb) => cb());
  }

  public static onPlayerLevelUp(newLevel: number): void {
    this.availableAttributePoints += 2;
    this.availableSkillPoints += 1;
    NotificationManager.push({
      title: `Naik ke Level ${newLevel}!`,
      message: `Memperoleh +2 Poin Atribut & +1 Poin Bakat Skill Tree! Tekan [K] untuk mengalokasikan.`,
      priority: 'HIGH',
      colorTheme: 'amber',
      durationMs: 4500,
    });
    this.notify();
  }

  public static allocateAttribute(attr: CoreAttributeId): boolean {
    if (this.availableAttributePoints <= 0) return false;
    this.attributes[attr] = (this.attributes[attr] || 1) + 1;
    this.availableAttributePoints -= 1;
    this.notify();
    return true;
  }

  public static resetAttributes(): void {
    const totalInvested =
      (this.attributes.raga - 1) +
      (this.attributes.daya - 1) +
      (this.attributes.lincah - 1) +
      (this.attributes.karsa - 1);
    if (totalInvested <= 0) return;
    this.attributes = { raga: 1, daya: 1, lincah: 1, karsa: 1 };
    this.availableAttributePoints += totalInvested;
    this.notify();
  }

  public static getSkillRank(skillId: string): number {
    return this.unlockedSkills[skillId] || 0;
  }

  public static canUnlockSkill(skillId: string): { allowed: boolean; reason?: string } {
    const def = SKILL_TREE_REGISTRY.find((s) => s.id === skillId);
    if (!def) return { allowed: false, reason: 'Node keahlian tidak ditemukan.' };

    const currentRank = this.getSkillRank(skillId);
    if (currentRank >= def.maxRank) {
      return { allowed: false, reason: 'Tingkat keahlian sudah maksimal.' };
    }

    if (this.availableSkillPoints < def.costPerRank) {
      return { allowed: false, reason: `Membutuhkan ${def.costPerRank} Poin Bakat.` };
    }

    if (def.prerequisiteId) {
      const prereqRank = this.getSkillRank(def.prerequisiteId);
      if (prereqRank <= 0) {
        const prereqDef = SKILL_TREE_REGISTRY.find((s) => s.id === def.prerequisiteId);
        return {
          allowed: false,
          reason: `Buka "${prereqDef?.name || def.prerequisiteId}" terlebih dahulu.`,
        };
      }
    }

    return { allowed: true };
  }

  public static unlockSkill(skillId: string): boolean {
    const check = this.canUnlockSkill(skillId);
    if (!check.allowed) return false;

    const def = SKILL_TREE_REGISTRY.find((s) => s.id === skillId)!;
    this.availableSkillPoints -= def.costPerRank;
    this.unlockedSkills[skillId] = (this.unlockedSkills[skillId] || 0) + 1;

    NotificationManager.push({
      title: `Keahlian Terbuka: ${def.name}`,
      message: `${def.effectSummary} (Tingkat ${this.unlockedSkills[skillId]}/${def.maxRank})`,
      priority: 'NORMAL',
      colorTheme: 'amber',
      durationMs: 3200,
    });

    this.notify();
    return true;
  }

  public static resetSkills(): void {
    let refunded = 0;
    Object.entries(this.unlockedSkills).forEach(([id, rank]) => {
      const def = SKILL_TREE_REGISTRY.find((s) => s.id === id);
      if (def && rank > 0) {
        refunded += rank * def.costPerRank;
      }
    });
    if (refunded <= 0) return;
    this.unlockedSkills = {};
    this.availableSkillPoints += refunded;
    this.notify();
  }

  public static addWeaponMasteryXp(category: WeaponCategory, amount: number): void {
    const entry = this.masteryMap[category] || { level: 1, xp: 0 };
    if (entry.level >= 10) return;

    const scaledAmount = Math.max(1, Math.round(amount * this.worldModConfig.xpMultiplier));
    entry.xp += scaledAmount;
    const reqXp = entry.level * 60;

    if (entry.xp >= reqXp) {
      entry.xp -= reqXp;
      entry.level = Math.min(10, entry.level + 1);
      const meta = WEAPON_MASTERY_METADATA[category];
      NotificationManager.push({
        title: `Mastery ${meta.name} Lv.${entry.level}!`,
        message:
          entry.level === 3
            ? meta.tier1Perk
            : entry.level === 6
            ? meta.tier2Perk
            : entry.level === 10
            ? meta.tier3Perk
            : `Kerusakan & kelincahan ${meta.name} meningkat!`,
        priority: 'HIGH',
        colorTheme: 'emerald',
        durationMs: 3800,
      });
    }

    this.masteryMap[category] = entry;
    this.notify();
  }

  public static getWeaponMasteryList(): WeaponMasteryEntry[] {
    return (Object.keys(WEAPON_MASTERY_METADATA) as WeaponCategory[]).map((cat) => {
      const meta = WEAPON_MASTERY_METADATA[cat];
      const state = this.masteryMap[cat] || { level: 1, xp: 0 };
      return {
        category: cat,
        name: meta.name,
        nusantaraExamples: meta.nusantaraExamples,
        level: state.level,
        xp: state.xp,
        nextLevelXp: state.level * 60,
        tier1Perk: meta.tier1Perk,
        tier2Perk: meta.tier2Perk,
        tier3Perk: meta.tier3Perk,
      };
    });
  }

  public static getWeaponMasteryLevel(category: WeaponCategory): number {
    return this.masteryMap[category]?.level || 1;
  }

  public static getDominantArchetypeTitle(): string {
    const branchScores: Record<SkillBranchId, number> = {
      jawara_silat: 0,
      empu_aether: 0,
      penjelajah_cakrawala: 0,
    };
    Object.entries(this.unlockedSkills).forEach(([id, rank]) => {
      const def = SKILL_TREE_REGISTRY.find((s) => s.id === id);
      if (def) branchScores[def.branch] += rank;
    });

    const maxScore = Math.max(
      branchScores.jawara_silat,
      branchScores.empu_aether,
      branchScores.penjelajah_cakrawala
    );
    if (maxScore === 0) return 'Pengembara Muda Nusantara';
    if (branchScores.jawara_silat === maxScore && branchScores.empu_aether === maxScore) {
      return 'Kombatan Mekanik Pusaka';
    }
    if (branchScores.jawara_silat === maxScore) return 'Jawara Silat Pusaka';
    if (branchScores.empu_aether === maxScore) return 'Empu Mekanika Aether';
    return 'Penjelajah Cakrawala Nusantara';
  }

  // Computed Combat, Survival & Engineering Bonuses
  public static getComputedBonuses(activeWeaponCategory: WeaponCategory = 'unarmed') {
    const raga = this.attributes.raga || 1;
    const daya = this.attributes.daya || 1;
    const lincah = this.attributes.lincah || 1;
    const karsa = this.attributes.karsa || 1;

    const masteryLv = this.getWeaponMasteryLevel(activeWeaponCategory);

    const kudaRank = this.getSkillRank('silat_kuda_kokoh');
    const parryRank = this.getSkillRank('silat_tangkisan_kilat');
    const pamorRank = this.getSkillRank('silat_aliran_pamor');
    const masterSilatRank = this.getSkillRank('silat_master_pusaka');

    const konduitRank = this.getSkillRank('empu_konduit_efisien');
    const subakRank = this.getSkillRank('empu_resonansi_subak');
    const turretRank = this.getSkillRank('empu_kalibrasi_turret');
    const arsitekRank = this.getSkillRank('empu_arsitek_agung');

    const anginRank = this.getSkillRank('cakrawala_langkah_angin');
    const nakhodaRank = this.getSkillRank('cakrawala_nakhoda_bahari');
    const mataBatinRank = this.getSkillRank('cakrawala_mata_batin');
    const dimensiRank = this.getSkillRank('cakrawala_penguasa_dimensi');

    const maxHealthBonus = (raga - 1) * 12;
    const maxStaminaBonus = (lincah - 1) * 8;
    const maxOxygenBonus = nakhodaRank * 40;

    const meleeDamageMultiplier =
      1 + (daya - 1) * 0.035 + (masteryLv - 1) * 0.03 + pamorRank * 0.09;
    const poiseDamageMultiplier =
      1 + (daya - 1) * 0.04 + kudaRank * 0.12 + (masteryLv >= 3 ? 0.12 : 0);
    const critChanceBonus = (lincah - 1) * 0.015 + (masteryLv >= 6 ? 0.1 : 0);
    const skillDamageMultiplier = 1 + (karsa - 1) * 0.045 + pamorRank * 0.12;
    const skillCooldownMultiplier = Math.max(
      0.45,
      1 - (karsa - 1) * 0.015 - (masterSilatRank > 0 ? 0.25 : 0)
    );
    const critLifeLeechRatio = masterSilatRank > 0 ? 0.12 : 0;
    const staminaOnHitBonus = kudaRank * 4;
    const parryPoiseReflectBonus = parryRank * 0.35;

    const miningSpeedMultiplier =
      1 + (daya - 1) * 0.03 + konduitRank * 0.15;
    const moveSpeedMultiplier =
      1 + (lincah - 1) * 0.01 + anginRank * 0.06;
    const sprintStaminaDrainMultiplier = Math.max(0.4, 1 - anginRank * 0.12);
    const xpGainMultiplier =
      this.worldModConfig.xpMultiplier * (1 + mataBatinRank * 0.35);
    const autoHarvestYieldMultiplier =
      this.worldModConfig.resourceYieldMultiplier * (1 + subakRank * 0.25);

    return {
      maxHealthBonus,
      maxStaminaBonus,
      maxOxygenBonus,
      meleeDamageMultiplier,
      poiseDamageMultiplier,
      critChanceBonus,
      skillDamageMultiplier,
      skillCooldownMultiplier,
      critLifeLeechRatio,
      staminaOnHitBonus,
      parryPoiseReflectBonus,
      miningSpeedMultiplier,
      moveSpeedMultiplier,
      sprintStaminaDrainMultiplier,
      xpGainMultiplier,
      turretDamageMultiplier: 1 + turretRank * 0.3,
      villageDiscountRatio: turretRank * 0.15,
      autoHarvestYieldMultiplier,
      harvestYieldMultiplier: autoHarvestYieldMultiplier,
      blueprintMaterialDiscountRatio: arsitekRank > 0 ? 0.2 : 0,
      hasEmergencyAetherShield: arsitekRank > 0,
      hasFastTravelUnlocked: dimensiRank > 0,
      hasExtremeWeatherImmunity: dimensiRank > 0,
    };
  }

  public static updateWorldModConfig(patch: Partial<WorldModdingConfig>): void {
    this.worldModConfig = { ...this.worldModConfig, ...patch };
    this.notify();
  }

  public static updatePartyConfig(patch: Partial<typeof CharacterProgressionManager.partyState>): void {
    this.partyState = { ...this.partyState, ...patch };
    this.notify();
  }

  public static saveCustomBlueprint(entry: {
    id: string;
    name: string;
    code: string;
    dimensions: [number, number, number];
    blockCount: number;
  }): void {
    const existingIdx = this.customBlueprints.findIndex((b) => b.id === entry.id);
    const record = { ...entry, createdAt: Date.now() };
    if (existingIdx >= 0) {
      this.customBlueprints[existingIdx] = record;
    } else {
      this.customBlueprints.unshift(record);
    }
    this.notify();
  }

  public static removeCustomBlueprint(id: string): void {
    this.customBlueprints = this.customBlueprints.filter((b) => b.id !== id);
    this.notify();
  }

  public static serialize(): SerializedCharacterProgression {
    return {
      attributes: { ...this.attributes },
      availableAttributePoints: this.availableAttributePoints,
      availableSkillPoints: this.availableSkillPoints,
      unlockedSkills: { ...this.unlockedSkills },
      weaponMastery: { ...this.masteryMap },
      partyState: {
        ...this.partyState,
        members: this.partyState.members.map((m) => ({ ...m })),
      },
      worldModConfig: { ...this.worldModConfig },
      customBlueprints: [...this.customBlueprints],
    };
  }
}
