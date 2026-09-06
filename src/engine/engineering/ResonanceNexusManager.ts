// Nusantara Resonance Nexus - Late-Game Cultural Mega-Project
// Unites the 7 Regional Aether Traditions to restore global realm equilibrium.

import { GameEventBus } from '../events/GameEventBus';
import { WorldStabilitySystem } from '../exploration/WorldStabilitySystem';
import { NotificationManager } from '../ui/NotificationManager';
import { SubtitleManager } from '../ui/SubtitleManager';

export type NexusPillarId = 'jawa' | 'minang' | 'borneo' | 'bali' | 'toraja' | 'papua' | 'nusa';

export interface NexusPillarDef {
  traditionId: string;
  name: string;
  regionDisplayName: string;
  requiredArtifactId: string;
  requiredArtifactName: string;
  requiredMaterialId: string;
  requiredMaterialName: string;
  requiredMaterialCount: number;
  requiredSchematicId: string;
  requiredSchematicName: string;
  requiredSettlementId: string;
  requiredSettlementName: string;
  requiredAnomalyId: string;
  requiredAnomalyName: string;
  colorHex: string;
  description: string;
  loreQuote: string;
}

export const NEXUS_PILLARS: Record<string, NexusPillarDef> = {
  jawa: {
    traditionId: 'jawa_tirta',
    name: 'Pilar Tirta Wilwatikta',
    regionDisplayName: 'Tanah Jawa',
    requiredArtifactId: 'mustika_tirta_subak',
    requiredArtifactName: 'Mustika Tirta Subak',
    requiredMaterialId: 'andesite_block',
    requiredMaterialName: 'Batu Andesit Kuno',
    requiredMaterialCount: 16,
    requiredSchematicId: 'schematic_subak_sluice_gate',
    requiredSchematicName: 'Prasasti Pintu Air Subak',
    requiredSettlementId: 'desa_majapahit',
    requiredSettlementName: 'Dusun Wilwatikta',
    requiredAnomalyId: 'anomaly_volcanic_resonance',
    requiredAnomalyName: 'Volcanic Resonance (Merapi)',
    colorHex: '#38bdf8',
    description: 'Menyalurkan keseimbangan air irigasi tanah dan getaran stupa andesit Jawa ke dalam sumbu pusat dunia.',
    loreQuote: '"Bumi Pertiwi mengalirkan berkah hidup melalui parit-parit air suci."'
  },
  minang: {
    traditionId: 'minang_gonjong',
    name: 'Pilar Gonjong Harau',
    regionDisplayName: 'Tanah Minang',
    requiredArtifactId: 'batu_guntur_marapi',
    requiredArtifactName: 'Batu Guntur Marapi',
    requiredMaterialId: 'silver_filigree',
    requiredMaterialName: 'Filigree Perak Minang',
    requiredMaterialCount: 6,
    requiredSchematicId: 'schematic_rangkiang_lantern',
    requiredSchematicName: 'Lentera Gonjong Kristal',
    requiredSettlementId: 'nagari_minang',
    requiredSettlementName: 'Nagari Lembah Harau',
    requiredAnomalyId: 'anomaly_highland_echo',
    requiredAnomalyName: 'Highland Mist Distortion (Harau)',
    colorHex: '#f59e0b',
    description: 'Menghubungkan sudut gonjong lumbung Rangkiang untuk membiaskan leylines keemasan ke seluruh penjuru.',
    loreQuote: '"Tanduk gonjong membelah kabut, menampung doa para tetua nagari."'
  },
  borneo: {
    traditionId: 'borneo_river',
    name: 'Pilar Suar Kahayan',
    regionDisplayName: 'Borneo Riverlands',
    requiredArtifactId: 'suar_rimba_borneo',
    requiredArtifactName: 'Suar Rimba Ulin Purba',
    requiredMaterialId: 'ulin_timber_crate',
    requiredMaterialName: 'Peti Kayu Besi Ulin',
    requiredMaterialCount: 4,
    requiredSchematicId: 'schematic_river_navigation_beacon',
    requiredSchematicName: 'Tugu Suar Sungai Ulin',
    requiredSettlementId: 'kampung_dayak',
    requiredSettlementName: 'Huma Betang Kahayan',
    requiredAnomalyId: 'anomaly_river_surge',
    requiredAnomalyName: 'River Aether Surge (Kapuas)',
    colorHex: '#10b981',
    description: 'Mengalirkan daya tahan kayu ulin abadi dan getah damar zamrud penenang arus sungai besar.',
    loreQuote: '"Kayu besi ulin tak lekang oleh zaman, menambat leylines di dasar rawa gambut."'
  },
  bali: {
    traditionId: 'bali_dharma',
    name: 'Pilar Dharma Besakih',
    regionDisplayName: 'Bali Highlands',
    requiredArtifactId: 'patung_candi_bentar',
    requiredArtifactName: 'Patung Candi Bentar Purba',
    requiredMaterialId: 'paras_stone_carving',
    requiredMaterialName: 'Ukiran Batu Paras Dewata',
    requiredMaterialCount: 8,
    requiredSchematicId: 'schematic_candi_bentar_gateway',
    requiredSchematicName: 'Gapura Candi Bentar Aether',
    requiredSettlementId: 'banjar_subak',
    requiredSettlementName: 'Banjar Tirta Subak',
    requiredAnomalyId: 'anomaly_sacred_tide',
    requiredAnomalyName: 'Sacred Tide Distortion',
    colorHex: '#38bdf8',
    description: 'Menegakkan gerbang keseimbangan Dharma penangkal kehancuran void di seluruh kepulauan.',
    loreQuote: '"Tri Hita Karana menyatukan manusia, alam, dan dewata dalam satu napas."'
  },
  toraja: {
    traditionId: 'toraja_megalith',
    name: 'Pilar Megalit Kete Kesu',
    regionDisplayName: 'Toraja Highlands',
    requiredArtifactId: 'tanduk_pa_tedong',
    requiredArtifactName: 'Tanduk Pa\'tedong Pusaka',
    requiredMaterialId: 'stone_alang_pillar',
    requiredMaterialName: 'Pilar Batu Alang Toraja',
    requiredMaterialCount: 6,
    requiredSchematicId: 'schematic_simbuang_megalith',
    requiredSchematicName: 'Megalit Simbuang Batu Ley',
    requiredSettlementId: 'desa_kete_kesu',
    requiredSettlementName: 'Rante Kete Kesu',
    requiredAnomalyId: 'anomaly_highland_resonance',
    requiredAnomalyName: 'Highland Echo (Londa)',
    colorHex: '#facc15',
    description: 'Menancapkan pasak monolit Simbuang pengunci getaran tektonik dan pemberi ketahanan baja.',
    loreQuote: '"Batu Simbuang adalah jangkar bumi; tak tergoyahkan oleh deru angin zaman."'
  },
  papua: {
    traditionId: 'papua_honai',
    name: 'Pilar Kanopi Baliem',
    regionDisplayName: 'Papuan Highlands',
    requiredArtifactId: 'perisai_asmat_pusaka',
    requiredArtifactName: 'Perisai Asmat Berukir Pusaka',
    requiredMaterialId: 'noken_woven',
    requiredMaterialName: 'Rajutan Serat Noken Anggrek',
    requiredMaterialCount: 4,
    requiredSchematicId: 'schematic_honai_hearth_core',
    requiredSchematicName: 'Tungku Api Honai Aether',
    requiredSettlementId: 'kampung_baliem',
    requiredSettlementName: 'Kurulu Silimo',
    requiredAnomalyId: 'anomaly_crystal_forest',
    requiredAnomalyName: 'Crystal Forest Awakening',
    colorHex: '#c084fc',
    description: 'Menjalin anyaman serat noken dan kehangatan tungku api Honai untuk menyelimuti dunia dengan vitalitas rimba.',
    loreQuote: '"Dari puncak salju hingga dasar lembah, sukma hijau rimba tak pernah padam."'
  },
  nusa: {
    traditionId: 'nusa_storm',
    name: 'Pilar Samudra Banda',
    regionDisplayName: 'Eastern Isles',
    requiredArtifactId: 'penangkal_badai_ternate',
    requiredArtifactName: 'Penangkal Badai Ternate',
    requiredMaterialId: 'kristal_garam_samudra',
    requiredMaterialName: 'Kristal Garam Karang Laut',
    requiredMaterialCount: 8,
    requiredSchematicId: 'schematic_storm_lightning_collector',
    requiredSchematicName: 'Penangkal Badai Kilat Ternate',
    requiredSettlementId: 'desa_sasak',
    requiredSettlementName: 'Bale Tani Sade',
    requiredAnomalyId: 'anomaly_storm_rift',
    requiredAnomalyName: 'Storm Rift Samudra Rempah',
    colorHex: '#38bdf8',
    description: 'Menjaring energi petir samudra timur dan cahaya terumbu karang laut lepas ke dalam konvergensi abadi.',
    loreQuote: '"Angin muson memandu kami; badai samudra adalah kawan penempa jiwa bahari."'
  }
};

export class ResonanceNexusManager {
  private static activePillars: Set<string> = new Set();
  private static completed: boolean = false;
  private static stabilizedAnomalies: Set<string> = new Set();
  private static unlockedSchematics: Set<string> = new Set();
  private static listeners: (() => void)[] = [];

  public static initialize(savedData?: {
    activePillars?: string[];
    completed?: boolean;
    stabilizedAnomalies?: string[];
    unlockedSchematics?: string[];
  }): void {
    this.activePillars.clear();
    this.stabilizedAnomalies.clear();
    this.unlockedSchematics.clear();
    this.completed = false;

    if (savedData) {
      if (savedData.activePillars) savedData.activePillars.forEach(p => this.activePillars.add(p));
      if (savedData.stabilizedAnomalies) savedData.stabilizedAnomalies.forEach(a => this.stabilizedAnomalies.add(a));
      if (savedData.unlockedSchematics) savedData.unlockedSchematics.forEach(s => this.unlockedSchematics.add(s));
      this.completed = !!savedData.completed;
    }

    GameEventBus.on('ANOMALY_RESOLVED', (data: any) => {
      if (data?.anomalyId) {
        this.registerStabilizedAnomaly(data.anomalyId);
      }
    });
  }

  public static registerStabilizedAnomaly(anomalyId: string): void {
    this.stabilizedAnomalies.add(anomalyId);
    this.notify();
  }

  public static unlockSchematic(schematicId: string): void {
    if (!this.unlockedSchematics.has(schematicId)) {
      this.unlockedSchematics.add(schematicId);
      NotificationManager.push({
        title: 'SCHEMATIC NUSANTARA TERBUKA',
        message: `Membuka cetak biru rekayasa: ${schematicId.replace(/_/g, ' ').toUpperCase()}`,
        priority: 'HIGH',
        icon: '📜',
        durationMs: 7000
      });
      this.notify();
    }
  }

  public static isSchematicUnlocked(schematicId: string): boolean {
    return this.unlockedSchematics.has(schematicId);
  }

  public static isAnomalyStabilized(anomalyId: string): boolean {
    return this.stabilizedAnomalies.has(anomalyId);
  }

  public static isPillarActive(pillarId: string): boolean {
    return this.activePillars.has(pillarId);
  }

  public static getActivePillarsCount(): number {
    return this.activePillars.size;
  }

  public static isNexusCompleted(): boolean {
    return this.completed || this.activePillars.size === Object.keys(NEXUS_PILLARS).length;
  }

  public static isConvergenceAchieved(): boolean {
    return this.isNexusCompleted();
  }

  public static getPillarStates(): Array<NexusPillarDef & {
    id: string;
    activated: boolean;
    canActivate: boolean;
    reputationMet: boolean;
    anomalyResolved: boolean;
    requiredArtifact: string;
    requiredReputation: number;
    landmarkLocation: string;
  }> {
    return Object.entries(NEXUS_PILLARS).map(([id, def]) => {
      const activated = this.activePillars.has(id);
      const anomalyResolved = this.stabilizedAnomalies.has(def.requiredAnomalyId);
      const schematicUnlocked = this.unlockedSchematics.has(def.requiredSchematicId);
      const reputationMet = true; // default met for regional milestone check
      const canActivate = !activated;

      return {
        ...def,
        id,
        activated,
        canActivate,
        reputationMet,
        anomalyResolved,
        requiredArtifact: def.requiredArtifactId,
        requiredReputation: 30,
        landmarkLocation: def.requiredSettlementName
      };
    });
  }

  public static canActivatePillar(
    pillarId: string,
    playerInventory?: { hasItem: (id: string, count?: number) => boolean },
    settlementReputation: number = 30
  ): { canActivate: boolean; reasons: string[] } {
    const def = NEXUS_PILLARS[pillarId];
    if (!def) return { canActivate: false, reasons: ['Pilar tidak dikenal'] };
    if (this.activePillars.has(pillarId)) return { canActivate: false, reasons: ['Pilar sudah aktif'] };

    const reasons: string[] = [];

    // Check artifact if inventory provided
    if (playerInventory && !playerInventory.hasItem(def.requiredArtifactId, 1)) {
      reasons.push(`Membutuhkan Artefak Pusaka: ${def.requiredArtifactName}`);
    }

    // Check material if inventory provided
    if (playerInventory && !playerInventory.hasItem(def.requiredMaterialId, def.requiredMaterialCount)) {
      reasons.push(`Membutuhkan Material: ${def.requiredMaterialCount}x ${def.requiredMaterialName}`);
    }

    // Check reputation (Honored >= 30)
    if (settlementReputation < 30) {
      reasons.push(`Membutuhkan Reputasi Terhormat (≥30) di ${def.requiredSettlementName}`);
    }

    return {
      canActivate: reasons.length === 0,
      reasons
    };
  }

  public static activatePillar(
    pillarId: string,
    playerInventory?: { consumeItem: (id: string, count: number) => boolean }
  ): boolean {
    const def = NEXUS_PILLARS[pillarId];
    if (!def || this.activePillars.has(pillarId)) return false;

    // Consume materials if inventory provided
    if (playerInventory) {
      playerInventory.consumeItem(def.requiredMaterialId, def.requiredMaterialCount);
    }

    this.activePillars.add(pillarId);
    WorldStabilitySystem.increaseStability(15);

    NotificationManager.push({
      title: 'PILAR RESONANSI DIAKTIFKAN',
      message: `${def.name} menyala! Leylines ${def.regionDisplayName} tersambung ke sumbu dunia.`,
      priority: 'CRITICAL',
      icon: '✨',
      durationMs: 9000
    });
    SubtitleManager.push('NEXUS RESONANSI', def.loreQuote, 'event', 6000);

    GameEventBus.emit('NEXUS_PILLAR_ACTIVATED', { pillarId, totalActive: this.activePillars.size });

    // Check completion
    if (this.activePillars.size === Object.keys(NEXUS_PILLARS).length && !this.completed) {
      this.triggerNexusCompletion();
    }

    this.notify();
    return true;
  }

  private static triggerNexusCompletion(): void {
    this.completed = true;
    WorldStabilitySystem.increaseStability(30);

    // Unlock master schematics
    this.unlockSchematic('schematic_nusantara_convergence_altar');
    this.unlockSchematic('schematic_mahakarya_ley_matrix');

    NotificationManager.push({
      title: 'MAHAKARYA: NUSANTARA RESONANCE NEXUS SELESAI',
      message: 'Ketujuh Tradisi Aether Nusantara bersatu! Keseimbangan abadi tercapai di seluruh kepulauan.',
      priority: 'CRITICAL',
      icon: '👑',
      durationMs: 15000
    });
    SubtitleManager.push('HARMONI SEMESTA', 'Keseimbangan agung terpancar dari sabang sampai merauke. Leylines kini menyatu tanpa sekat.', 'environment', 8000);

    GameEventBus.emit('NEXUS_COMPLETED', { timestamp: Date.now() });
  }

  public static subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notify(): void {
    this.listeners.forEach(l => {
      try {
        l();
      } catch (e) {
        console.error(e);
      }
    });
  }

  public static saveState(): any {
    return {
      activePillars: Array.from(this.activePillars),
      completed: this.completed,
      stabilizedAnomalies: Array.from(this.stabilizedAnomalies),
      unlockedSchematics: Array.from(this.unlockedSchematics)
    };
  }
}
