// Dynamic World Event Manager: Meteor Falls, Blood Eclipses, Merchant Caravans, Void Invasions & Auroras
import { WorldEventInstance, WorldEventType } from '../../types';
import { GameEventBus } from './GameEventBus';

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
    if (this.eventTimer > 240) {
      this.eventTimer = 0;
      // 25% chance to roll a random event if no conflicting event is active
      if (Math.random() < 0.35 && this.activeEvents.size < 2) {
        this.rollRandomEvent(playerPos);
        changed = true;
      }
    }

    if (changed) {
      this.notifyListeners();
    }
  }

  public static triggerEvent(type: WorldEventType, playerPos: [number, number, number]): WorldEventInstance {
    let name = 'Unusual Phenomenon';
    let duration = 300; // 5 minutes
    let data: any = {};
    let pos: [number, number, number] = [...playerPos];

    if (type === 'meteor') {
      name = 'Starfall Meteor Impact';
      duration = 600; // 10 minutes crater presence
      // Crash ~80 blocks away
      const angle = Math.random() * Math.PI * 2;
      pos = [playerPos[0] + Math.cos(angle) * 80, 50, playerPos[2] + Math.sin(angle) * 80];
      data = { craterPos: pos, mineralYield: 'starfall_ore' };
    } else if (type === 'eclipse') {
      name = 'Crimson Blood Eclipse';
      duration = 240;
      data = { spawnRateMultiplier: 2.5, ambientColor: '#991b1b' };
    } else if (type === 'caravan') {
      name = 'Nomadic Master Trader Caravan';
      duration = 450;
      pos = [playerPos[0] + 15, playerPos[1], playerPos[2] + 15];
      data = { specialStock: ['astral_pickaxe_blueprint', 'rare_herb_seeds'] };
    } else if (type === 'invasion') {
      name = 'Void Surge Outbreak';
      duration = 180;
      data = { enemyCount: 8, waveTarget: playerPos };
    } else if (type === 'aurora') {
      name = 'Aetherial Celestial Aurora';
      duration = 360;
      data = { cropGrowthMultiplier: 3.0, staminaRegenMultiplier: 1.5 };
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
    GameEventBus.emit('WORLD_EVENT_TRIGGERED', {
      eventType: type,
      eventName: name,
      pos
    });

    this.notifyListeners();
    return eventInstance;
  }

  private static rollRandomEvent(playerPos: [number, number, number]): void {
    const types: WorldEventType[] = ['meteor', 'aurora', 'caravan', 'eclipse', 'invasion'];
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
