// Aether Anomaly Manager: Lifecycle, Weather Shifts, Entity Mutation & Spatial Stabilization
import { GameRuntime } from '../core/GameRuntime';
import { GameEventBus } from '../events/GameEventBus';
import { NotificationManager } from '../ui/NotificationManager';
import { SubtitleManager } from '../ui/SubtitleManager';
import { BossCombatState } from '../../types';
import { AETHER_TRADITIONS, AetherTraditionId } from '../engineering/AetherTraditions';
import { ResonanceNexusManager } from '../engineering/ResonanceNexusManager';

export interface RegionalAnomalyInfo {
  id: string;
  name: string;
  description: string;
  regionId: string;
  atmosphericColor: [number, number, number];
  hazardSubtitle: string;
  stabilizeSubtitle: string;
  rewardArtifact: string;
}

export const REGIONAL_ANOMALIES: Record<string, RegionalAnomalyInfo> = {
  jawa: {
    id: 'anomaly_volcanic_resonance',
    name: 'Volcanic Resonance (Resonansi Magma Merapi)',
    description: 'Leylines bawah tanah terbentur magma purba, memanaskan saluran andesit dan melepaskan getaran tektonik.',
    regionId: 'jawa',
    atmosphericColor: [0.95, 0.45, 0.20],
    hazardSubtitle: 'Gemuruh magma Merapi mengguncang tanah; leylines andesit memijar merah!',
    stabilizeSubtitle: 'Uap magma mendingin; berkah kesuburan tanah Wilwatikta telah pulih.',
    rewardArtifact: 'mustika_tirta_subak'
  },
  minang: {
    id: 'anomaly_highland_echo',
    name: 'Highland Mist Distortion (Distorsi Kabut Lembah Harau)',
    description: 'Kabut ngarai beresonansi liar dengan puncak Marapi, menciptakan ilusi ruang dan gelombang suara sonik.',
    regionId: 'minang',
    atmosphericColor: [0.65, 0.85, 0.90],
    hazardSubtitle: 'Gema sonik Marapi mengaburkan pandangan; kabut tebal menyelimuti nagari!',
    stabilizeSubtitle: 'Gema lembah tenang kembali; kemurnian angin bukit barisan telah tegak.',
    rewardArtifact: 'batu_guntur_marapi'
  },
  borneo: {
    id: 'anomaly_river_surge',
    name: 'River Aether Surge (Gelombang Ley Sungai Purba)',
    description: 'Air Batang Kapuas meluap dengan pendaran hijau zamrud, memicu pusaran air liar di sepanjang dermaga.',
    regionId: 'borneo',
    atmosphericColor: [0.20, 0.80, 0.65],
    hazardSubtitle: 'Arus Batang Kapuas meluap liar; gelombang leylines hijau menghantam tepian!',
    stabilizeSubtitle: 'Arus sungai kembali tenang mengalir; berkah kayu besi ulin melindungi betang.',
    rewardArtifact: 'suar_rimba_borneo'
  },
  bali: {
    id: 'anomaly_sacred_tide',
    name: 'Sacred Tide Distortion (Distorsi Tirta Dewata)',
    description: 'Pasang samudra menggeser frekuensi Candi Bentar, membuka celah bayangan adharma.',
    regionId: 'bali',
    atmosphericColor: [0.75, 0.35, 0.85],
    hazardSubtitle: 'Gelombang adharma mengaburkan kesucian pura; kabut ungu merembes ke celah candi bentar!',
    stabilizeSubtitle: 'Air suci Tirta Empul kembali murni; Tri Hita Karana terjaga sempurna.',
    rewardArtifact: 'patung_candi_bentar'
  },
  toraja: {
    id: 'anomaly_highland_resonance',
    name: 'Highland Echo (Gema Leluhur Tebing Karst)',
    description: 'Getaran leylines memantul di tebing karst Londa, membangkitkan bayangan penjaga makam purba.',
    regionId: 'toraja',
    atmosphericColor: [0.85, 0.70, 0.35],
    hazardSubtitle: 'Tebing karst Londa berdengung keras; arwah penjaga purba bangkit melindungi tebing!',
    stabilizeSubtitle: 'Monolit Simbuang meredam guncangan bumi; ketenangan leluhur Toraja terpulihkan.',
    rewardArtifact: 'tanduk_pa_tedong'
  },
  papua: {
    id: 'anomaly_crystal_forest',
    name: 'Crystal Forest Awakening (Kebangkitan Kristal Rimba Purba)',
    description: 'Spora kristal purba menyelimuti tajuk kanopi hutan hujan Papua dalam kilau ungu magis.',
    regionId: 'papua',
    atmosphericColor: [0.60, 0.20, 0.85],
    hazardSubtitle: 'Spora kristal ungu membakar tajuk pohon; rimba purba Baliem bergetar liar!',
    stabilizeSubtitle: 'Spora kristal mengendap menjadi pupuk sukma; kehangatan honai kembali menyala.',
    rewardArtifact: 'perisai_asmat_pusaka'
  },
  nusa: {
    id: 'anomaly_storm_rift',
    name: 'Storm Rift (Pusaran Badai Samudra Rempah)',
    description: 'Pusaran badai petir samudra berputar di atas terumbu karang, menciptakan lonjakan medan muatan listrik.',
    regionId: 'nusa',
    atmosphericColor: [0.15, 0.40, 0.90],
    hazardSubtitle: 'Pusaran badai petir membelah langit samudra; sambaran kilat membakar laut lepas!',
    stabilizeSubtitle: 'Badai mereda menjadi angin muson sejuk; mercusuar karang laut bersinar terang.',
    rewardArtifact: 'penangkal_badai_ternate'
  }
};

export class AetherAnomalyManager {
  public static status: 'dormant' | 'warning' | 'active' | 'climax' | 'resolved' = 'dormant';
  public static timer: number = 300; // Countdown between anomalies (seconds)
  public static activeIntensity: number = 0; // 0 (none) to 1 (full anomaly shift)
  public static climaxBossId: string | null = null;
  public static anomalyCoords: [number, number, number] | null = null;
  public static rewardClaimed: boolean = false;
  public static currentRegionalAnomaly: RegionalAnomalyInfo = REGIONAL_ANOMALIES.jawa;
  
  private static onAnomalyStateChangeCallbacks: (() => void)[] = [];

  public static initialize(savedData?: any): void {
    if (savedData) {
      this.deserialize(savedData);
    } else {
      this.status = 'dormant';
      this.timer = 1500 + Math.random() * 300; // Natural 25-30 mins cycle
      this.activeIntensity = 0;
      this.climaxBossId = null;
      this.anomalyCoords = null;
      this.rewardClaimed = false;
      this.currentRegionalAnomaly = REGIONAL_ANOMALIES.jawa;
    }
  }

  public static serialize(): any {
    return {
      status: this.status,
      timer: this.timer,
      activeIntensity: this.activeIntensity,
      climaxBossId: this.climaxBossId,
      anomalyCoords: this.anomalyCoords,
      rewardClaimed: this.rewardClaimed,
      currentAnomalyId: this.currentRegionalAnomaly.id,
    };
  }

  public static deserialize(data: any): void {
    if (!data) return;
    this.status = data.status || 'dormant';
    this.timer = data.timer !== undefined ? data.timer : 180;
    this.activeIntensity = data.activeIntensity || 0;
    this.climaxBossId = data.climaxBossId || null;
    this.anomalyCoords = data.anomalyCoords || null;
    this.rewardClaimed = !!data.rewardClaimed;
    if (data.currentAnomalyId) {
      const found = Object.values(REGIONAL_ANOMALIES).find(a => a.id === data.currentAnomalyId);
      if (found) this.currentRegionalAnomaly = found;
    }
  }

  public static update(deltaTime: number, runtime: GameRuntime): void {
    if (this.status === 'dormant') {
      this.timer -= deltaTime;
      if (this.timer <= 0) {
        this.transitionTo('warning', runtime);
      }
    } else if (this.status === 'warning') {
      this.timer -= deltaTime;
      this.activeIntensity = Math.min(0.45, this.activeIntensity + deltaTime * 0.05);
      
      if (Math.random() < 0.02) {
        runtime.audio.playTone(80 + Math.sin(Date.now() * 0.005) * 10, 0.4);
      }

      if (this.timer <= 0) {
        this.transitionTo('active', runtime);
      }
    } else if (this.status === 'active') {
      this.timer -= deltaTime;
      this.activeIntensity = Math.min(1.0, this.activeIntensity + deltaTime * 0.1);

      if (Math.random() < 0.05) {
        runtime.audio.playTone(150 + Math.random() * 300, 0.15);
      }

      if (this.timer <= 0) {
        this.transitionTo('climax', runtime);
      }
    } else if (this.status === 'climax') {
      this.activeIntensity = 1.0;
      
      if (this.climaxBossId) {
        const bossState = runtime.entities.entities.get(this.climaxBossId)?.state;
        if (!bossState || bossState.health <= 0) {
          this.transitionTo('resolved', runtime);
        } else {
          runtime.emitBossUpdated({
            id: this.climaxBossId,
            name: `${this.currentRegionalAnomaly.name} Sentinel`,
            modelType: 'ruin_sentinel',
            health: bossState.health,
            maxHealth: bossState.maxHealth,
            phase: 1,
            maxPhases: 1,
            enraged: false,
            position: bossState.position
          });
        }
      } else {
        this.transitionTo('resolved', runtime);
      }
    } else if (this.status === 'resolved') {
      this.activeIntensity = Math.max(0, this.activeIntensity - deltaTime * 0.2);
      if (this.activeIntensity <= 0) {
        this.status = 'dormant';
        this.timer = 1500 + Math.random() * 600;
        this.rewardClaimed = false;
        this.notifyListeners();
      }
    }
  }

  public static transitionTo(newStatus: typeof AetherAnomalyManager.status, runtime: GameRuntime): void {
    this.status = newStatus;

    // Detect cultural region dynamically at player's location
    if (runtime?.world?.regionManager && runtime?.player?.position) {
      const pos = runtime.player.position;
      const dominant = runtime.world.regionManager.getDominantRegion(pos.x, pos.z);
      if (dominant && REGIONAL_ANOMALIES[dominant.id]) {
        this.currentRegionalAnomaly = REGIONAL_ANOMALIES[dominant.id];
      }
    }

    const anomaly = this.currentRegionalAnomaly;
    this.notifyListeners();

    if (newStatus === 'warning') {
      this.timer = 30; // 30s atmospheric buildup warning
      NotificationManager.push({
        title: `DISTORSI LEYLINES DETEKSI: ${anomaly.name.toUpperCase()}`,
        message: anomaly.description,
        priority: 'HIGH',
        icon: '🔮',
        durationMs: 8000
      });
      SubtitleManager.push('Gema Alam', anomaly.hazardSubtitle, 'environment', 5000);
      runtime.audio.playTone(110, 0.8);
      setTimeout(() => runtime.audio.playTone(90, 0.8), 500);

    } else if (newStatus === 'active') {
      this.timer = 60; // 60s active invasion
      this.rewardClaimed = false;
      NotificationManager.push({
        title: `ANOMALI AETHER AKTIF: ${anomaly.name}`,
        message: 'Celah dimensi terbuka lebar! Makhluk liar bermutasi oleh energi leylines.',
        priority: 'CRITICAL',
        icon: '⚡',
        durationMs: 10000
      });
      SubtitleManager.push('SISTEM', anomaly.hazardSubtitle, 'environment', 5000);
      
      // Idempotent entity mutation
      Array.from(runtime.entities.entities.values()).map(e => e.state).forEach(ent => {
        if (ent.type === 'hostile' || ent.type === 'passive') {
          const eAny = ent as any;
          if (eAny.baseMaxHealth === undefined) {
            eAny.baseMaxHealth = ent.maxHealth;
            eAny.baseDamage = ent.damage;
            eAny.baseName = ent.name;
          }
          if (!eAny.anomalyBuff) {
            eAny.anomalyBuff = true;
            ent.maxHealth = Math.round(eAny.baseMaxHealth * 1.5);
            ent.health = ent.maxHealth;
            ent.damage = Math.round(eAny.baseDamage * 1.3);
            ent.name = `Mutated ${eAny.baseName}`;
          }
        }
      });

    } else if (newStatus === 'climax') {
      const pPos = runtime.player.position;
      const angle = Math.random() * Math.PI * 2;
      const rx = pPos.x + Math.cos(angle) * 16;
      const rz = pPos.z + Math.sin(angle) * 16;
      const ry = runtime.world.getSpawnHeight(rx, rz);

      this.anomalyCoords = [rx, ry, rz];

      NotificationManager.push({
        title: `SENTINEL ANOMALI MUNCUL: ${anomaly.name}`,
        message: 'Inti anomali mewujud menjadi Sentinel Purba! Tumpas untuk memulihkan keseimbangan alam!',
        priority: 'CRITICAL',
        icon: '👹',
        durationMs: 10000
      });
      SubtitleManager.push('SISTEM', 'Hancurkan Sentinel untuk menstabilkan kawasan!', 'environment', 5000);

      this.climaxBossId = runtime.entities.spawnBoss('ruin_sentinel', [rx, ry, rz], runtime.world);
      
      const bossState = runtime.entities.entities.get(this.climaxBossId!)?.state;
      if (bossState) {
        runtime.emitBossUpdated({
          id: this.climaxBossId!,
          name: `${anomaly.name} Sentinel`,
          modelType: 'ruin_sentinel',
          health: bossState.health,
          maxHealth: bossState.maxHealth,
          phase: 1,
          maxPhases: 1,
          enraged: false,
          position: bossState.position
        });
      }

    } else if (newStatus === 'resolved') {
      NotificationManager.push({
        title: `ANOMALI DIPULIHKAN: ${anomaly.name}`,
        message: 'Kawasan leylines telah kembali stabil. Memperoleh pusaka langka!',
        priority: 'HIGH',
        icon: '🏆',
        durationMs: 8000
      });
      SubtitleManager.push('SISTEM', anomaly.stabilizeSubtitle, 'environment', 5000);

      // Revert mutated entity stats back to base
      Array.from(runtime.entities.entities.values()).map(e => e.state).forEach(ent => {
        const eAny = ent as any;
        if (eAny.anomalyBuff) {
          eAny.anomalyBuff = false;
          if (eAny.baseMaxHealth !== undefined) ent.maxHealth = eAny.baseMaxHealth;
          if (eAny.baseDamage !== undefined) ent.damage = eAny.baseDamage;
          if (eAny.baseName !== undefined) ent.name = eAny.baseName;
          ent.health = Math.min(ent.health, ent.maxHealth);
        }
      });

      // Reward the player and register to ResonanceNexusManager
      if (!this.rewardClaimed) {
        this.rewardClaimed = true;
        runtime.addItemToInventory('aether_crystal', 10);
        runtime.stats.addXP(500);

        // Guaranteed or high-chance regional artifact drop
        runtime.addItemToInventory(anomaly.rewardArtifact, 1);
        GameEventBus.emit('ARTIFACT_UNLOCKED', {
          artifactId: anomaly.rewardArtifact,
          name: anomaly.rewardArtifact.replace(/_/g, ' ').toUpperCase()
        });

        ResonanceNexusManager.registerStabilizedAnomaly(anomaly.id);
        GameEventBus.emit('ANOMALY_RESOLVED', { anomalyId: anomaly.id, regionId: anomaly.regionId });
      }

      runtime.emitBossUpdated(null);
      this.climaxBossId = null;
      this.anomalyCoords = null;
    }
  }

  public static dispose(): void {
    this.onAnomalyStateChangeCallbacks = [];
    this.status = 'dormant';
    this.timer = 300;
    this.activeIntensity = 0;
    this.climaxBossId = null;
    this.anomalyCoords = null;
    this.rewardClaimed = false;
  }

  public static onAnomalyStateChange(cb: () => void): () => void {
    this.onAnomalyStateChangeCallbacks.push(cb);
    return () => {
      this.onAnomalyStateChangeCallbacks = this.onAnomalyStateChangeCallbacks.filter(c => c !== cb);
    };
  }

  private static notifyListeners(): void {
    this.onAnomalyStateChangeCallbacks.forEach(cb => cb());
  }
}

