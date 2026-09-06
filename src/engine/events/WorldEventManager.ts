// Dynamic World Event Manager: Meteor Falls, Blood Eclipses, Nusantara Regional Festivals & Settlement Happenings
import { WorldEventInstance, WorldEventType } from '../../types';
import { GameEventBus } from './GameEventBus';
import { NotificationManager } from '../ui/NotificationManager';

export class WorldEventManager {
  private static activeEvents: Map<string, WorldEventInstance> = new Map();
  private static eventTimer: number = 0;
  private static onEventChangeCallbacks: ((events: WorldEventInstance[]) => void)[] = [];

  public static initialize(savedEvents?: WorldEventInstance[]): void {
    this.activeEvents.clear();
    if (savedEvents && Array.isArray(savedEvents)) {
      savedEvents.forEach(evt => {
        if (evt && evt.duration > 0) {
          this.activeEvents.set(evt.id, evt);
        }
      });
    }
  }

  public static update(deltaTime: number, worldDay: number, worldHour: number, playerPos: [number, number, number]): void {
    // 1. Update Active Event Timers
    let changed = false;
    this.activeEvents.forEach((evt, id) => {
      evt.duration -= deltaTime;
      if (evt.duration <= 0) {
        this.activeEvents.delete(id);
        changed = true;
      }
    });

    // 2. Periodic Event Trigger Check (Every 180 seconds or scheduled world events)
    this.eventTimer += deltaTime;
    if (this.eventTimer > 200) {
      this.eventTimer = 0;
      // 40% chance to roll an event if under max limit
      if (Math.random() < 0.40 && this.activeEvents.size < 3) {
        this.rollRandomEvent(playerPos);
        changed = true;
      }
    }

    if (changed) {
      this.notifyListeners();
    }
  }

  public static triggerEvent(type: WorldEventType, playerPos: [number, number, number]): WorldEventInstance {
    let name = 'Peristiwa Alam Nusantara';
    let duration = 360; // 6 minutes
    let data: any = {};
    let pos: [number, number, number] = [...playerPos];

    switch (type) {
      case 'meteor':
        name = 'Jatuhan Meteorit Starfall';
        duration = 600;
        const angle = Math.random() * Math.PI * 2;
        pos = [playerPos[0] + Math.cos(angle) * 80, 50, playerPos[2] + Math.sin(angle) * 80];
        data = { craterPos: pos, mineralYield: 'starfall_ore' };
        break;

      case 'eclipse':
        name = 'Gerhana Darah Merah (Blood Eclipse)';
        duration = 240;
        data = { spawnRateMultiplier: 2.5, ambientColor: '#991b1b' };
        break;

      case 'caravan':
        name = 'Kafilah Saudagar Pengelana';
        duration = 450;
        pos = [playerPos[0] + 15, playerPos[1], playerPos[2] + 15];
        data = { specialStock: ['astral_pickaxe_blueprint', 'rare_herb_seeds'] };
        break;

      case 'invasion':
        name = 'Gelombang Makhluk Bayangan (Shadow Surge)';
        duration = 180;
        data = { enemyCount: 8, waveTarget: playerPos };
        break;

      case 'aurora':
        name = 'Cahaya Aurora Ley Aether';
        duration = 360;
        data = { cropGrowthMultiplier: 3.0, staminaRegenMultiplier: 1.5 };
        break;

      case 'panen_raya':
      case 'panen_subak':
        name = 'Upacara Wiwit & Panen Raya Subak';
        duration = 480;
        data = {
          cropGrowthMultiplier: 4.0,
          soilFertilityBonus: 2.0,
          harvestYieldBonus: 2,
          blessing: 'Dewi Sri & Tirta Subak melipatgandakan hasil panen sawah berundak.',
        };
        break;

      case 'pasar_malam':
      case 'pasar_nagari':
        name = 'Pasar Malam Adat & Pekan Barter Nusantara';
        duration = 500;
        pos = [playerPos[0] + 10, playerPos[1], playerPos[2] + 10];
        data = {
          tradeDiscountMultiplier: 0.70,
          specialStock: ['kain_batik_tulis', 'songket_emas', 'silver_filigree', 'kris_pusaka'],
          blessing: 'Pedagang luar daerah menggelar lapak komoditas langka dengan potongan harga 30%.',
        };
        break;

      case 'kedatangan_saudagar':
        name = 'Kedatangan Saudagar Perahu Pinisi';
        duration = 450;
        pos = [playerPos[0] + 20, playerPos[1], playerPos[2] + 20];
        data = {
          specialStock: ['coastal_pearl', 'sandalwood_oil', 'arowana_scales', 'aether_amber_resin'],
          blessing: 'Kapal saudagar berlabuh membawa komoditas eksotis dari penjuru kepulauan.',
        };
        break;

      case 'musim_ikan':
        name = 'Musim Ruah Ikan Sungai & Pesisir';
        duration = 420;
        data = {
          fishingYieldMultiplier: 3.0,
          rareFishChance: 0.45,
          blessing: 'Arus air berlimpah dengan gerombolan ikan baung, cakalang, dan siluk.',
        };
        break;

      case 'peringatan_muson':
        name = 'Angin Muson Tropis & Hujan Lebat';
        duration = 360;
        data = {
          rainIntensity: 1.0,
          windSpeed: 4.5,
          waterFillRate: 2.5,
          blessing: 'Hujan deras mengisi seluruh waduk irigasi dan talang air Subak secara instan.',
        };
        break;

      case 'pertahanan_desa':
        name = 'Siaga Pertahanan Tapal Batas Desa';
        duration = 300;
        data = {
          patrolBonus: true,
          reputationRewardOnClear: 30,
          blessing: 'Bantu para prajurit desa menghalau predator rimba untuk meraih reputasi tinggi.',
        };
        break;

      case 'upacara_adat':
        name = 'Gamelan & Syukuran Upacara Adat';
        duration = 480;
        data = {
          staminaRegenMultiplier: 2.0,
          villageHarmony: true,
          blessing: 'Kidung gamelan dan dupa cendana menenangkan jiwa, memulihkan stamina 2x lipat.',
        };
        break;

      case 'berkah_aether':
        name = 'Resonansi Pusaka & Berkah Ley Aether';
        duration = 400;
        data = {
          aetherMachineSpeedMultiplier: 2.5,
          energyEfficiency: 2.0,
          blessing: 'Pusaka ley kuno berpendar cerah, seluruh konduit dan mesin energi melesat 2.5x kecepatan.',
        };
        break;

      case 'migrasi_kristal':
        name = 'Migrasi Satwa Rusa Kristal Rimba';
        duration = 380;
        data = {
          crystalFaunaSpawnRate: 3.0,
          blessing: 'Kawanan rusa bertanduk kristal aether melintasi padang rumput dekat permukiman.',
        };
        break;

      case 'gejolak_gunung_api':
      case 'kabut_mistis':
        name = 'Gejolak Vulkanik & Abu Kesuburan Tanah';
        duration = 420;
        data = {
          soilFertilityBonus: 3.0,
          oreDropMultiplier: 2.0,
          ambientColor: '#451a03',
          blessing: 'Abu vulkanik menyuburkan ladang dan menyingkap urat bijih besi di tebing karst.',
        };
        break;
    }

    const eventInstance: WorldEventInstance = {
      id: `evt_${type}_${Date.now()}`,
      type,
      name,
      startTime: Date.now(),
      duration,
      worldPos: pos,
      data,
      intensity: 1.0
    };

    this.activeEvents.set(eventInstance.id, eventInstance);
    
    NotificationManager.push({
      title: 'Peristiwa Alam',
      message: `${name}: ${data.blessing || 'Peristiwa lingkungan sedang berlangsung di wilayah ini.'}`,
      priority: 'HIGH',
      icon: '✨',
      durationMs: 7000,
    });

    GameEventBus.emit('WORLD_EVENT_TRIGGERED', {
      eventType: type,
      eventName: name,
      pos
    });

    this.notifyListeners();
    return eventInstance;
  }

  private static rollRandomEvent(playerPos: [number, number, number]): void {
    const types: WorldEventType[] = [
      'panen_raya',
      'pasar_malam',
      'kedatangan_saudagar',
      'musim_ikan',
      'upacara_adat',
      'berkah_aether',
      'migrasi_kristal',
      'gejolak_gunung_api',
      'peringatan_muson',
      'pertahanan_desa',
      'aurora',
    ];
    const selected = types[Math.floor(Math.random() * types.length)];
    this.triggerEvent(selected, playerPos);
  }

  public static getActiveEvents(): WorldEventInstance[] {
    return Array.from(this.activeEvents.values());
  }

  public static isEclipseActive(): boolean {
    return Array.from(this.activeEvents.values()).some(e => e.type === 'eclipse');
  }

  public static isAuroraActive(): boolean {
    return Array.from(this.activeEvents.values()).some(e => e.type === 'aurora');
  }

  public static isHarvestFestivalActive(): boolean {
    return Array.from(this.activeEvents.values()).some(e => e.type === 'panen_raya' || e.type === 'panen_subak');
  }

  public static isNightMarketActive(): boolean {
    return Array.from(this.activeEvents.values()).some(e => e.type === 'pasar_malam' || e.type === 'pasar_nagari');
  }

  public static serialize(): WorldEventInstance[] {
    return Array.from(this.activeEvents.values());
  }

  public static onEventsChange(cb: (events: WorldEventInstance[]) => void): () => void {
    this.onEventChangeCallbacks.push(cb);
    cb(this.getActiveEvents());
    return () => {
      this.onEventChangeCallbacks = this.onEventChangeCallbacks.filter(c => c !== cb);
    };
  }

  private static notifyListeners(): void {
    const list = this.getActiveEvents();
    this.onEventChangeCallbacks.forEach(cb => cb(list));
  }
}
