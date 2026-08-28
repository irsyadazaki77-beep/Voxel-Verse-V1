// Discovery System: Biome, Landmark, Structure, Artifact & Lore Tracking with Event Integration
import { DiscoveryRecord, DiscoveryType, WorldTierId } from '../../types';
import { GameEventBus } from '../events/GameEventBus';
import { WorldProgression } from './WorldProgression';

export interface DiscoveryToast {
  id: string;
  title: string;
  subtitle: string;
  type: DiscoveryType;
  xp: number;
  duration: number; // seconds left
}

export class DiscoverySystem {
  private static discoveries: Map<string, DiscoveryRecord> = new Map();
  private static activeToasts: DiscoveryToast[] = [];
  private static onToastCallbacks: ((toasts: DiscoveryToast[]) => void)[] = [];

  public static initialize(savedDiscoveries?: { [key: string]: number }): void {
    this.discoveries.clear();
    if (savedDiscoveries) {
      Object.entries(savedDiscoveries).forEach(([id, timestamp]) => {
        this.discoveries.set(id, {
          id,
          name: this.formatDiscoveryName(id),
          type: this.inferType(id),
          description: `Discovered location during world exploration.`,
          timestamp,
          xpReward: 15,
          tier: 'tier1_haven',
        });
      });
    }

    // Subscribe to events
    GameEventBus.on('BIOME_DISCOVERED', (data) => {
      this.recordDiscovery(data.biomeId, data.biomeName, 'biome', `Explored the ${data.biomeName} territory.`, 25, data.pos);
    });

    GameEventBus.on('STRUCTURE_DISCOVERED', (data) => {
      this.recordDiscovery(data.structureId, data.name, 'structure', `Uncovered ancient architectural site: ${data.name}.`, 40, data.pos);
    });

    GameEventBus.on('LANDMARK_DISCOVERED', (data) => {
      this.recordDiscovery(data.landmarkId, data.name, 'landmark', `Surveyed prominent regional landmark: ${data.name}.`, 30, data.pos);
    });

    GameEventBus.on('ARTIFACT_UNLOCKED', (data) => {
      this.recordDiscovery(data.artifactId, data.name, 'artifact', `Acquired powerful relic: ${data.name}.`, 100);
    });

    GameEventBus.on('LORE_FOUND', (data) => {
      this.recordDiscovery(data.loreId, data.title, 'lore', `Deciphered ancient text: ${data.title}.`, 35);
    });
  }

  public static recordDiscovery(
    id: string,
    name: string,
    type: DiscoveryType,
    description: string,
    xpReward: number = 25,
    worldPos?: [number, number, number]
  ): boolean {
    if (this.discoveries.has(id)) {
      return false; // Already discovered
    }

    const dist = worldPos ? Math.sqrt(worldPos[0] * worldPos[0] + worldPos[2] * worldPos[2]) : 0;
    const tierDef = WorldProgression.getTierByDistance(dist, worldPos ? worldPos[1] : 60);

    const record: DiscoveryRecord = {
      id,
      name,
      type,
      description,
      timestamp: Date.now(),
      worldPos,
      xpReward,
      tier: tierDef.id,
    };

    this.discoveries.set(id, record);

    // Push toast
    const toast: DiscoveryToast = {
      id: `toast_${Date.now()}_${id}`,
      title: name,
      subtitle: `${type.toUpperCase()} DISCOVERED • +${xpReward} XP`,
      type,
      xp: xpReward,
      duration: 4.5,
    };

    this.activeToasts.push(toast);
    this.notifyToasts();

    return true;
  }

  public static update(deltaTime: number): void {
    if (this.activeToasts.length === 0) return;

    let changed = false;
    for (let i = this.activeToasts.length - 1; i >= 0; i--) {
      this.activeToasts[i].duration -= deltaTime;
      if (this.activeToasts[i].duration <= 0) {
        this.activeToasts.splice(i, 1);
        changed = true;
      }
    }

    if (changed) {
      this.notifyToasts();
    }
  }

  public static getDiscoveries(): DiscoveryRecord[] {
    return Array.from(this.discoveries.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  public static serialize(): { [key: string]: number } {
    const obj: { [key: string]: number } = {};
    this.discoveries.forEach((rec, key) => {
      obj[key] = rec.timestamp;
    });
    return obj;
  }

  public static onToastsChange(cb: (toasts: DiscoveryToast[]) => void): () => void {
    this.onToastCallbacks.push(cb);
    cb([...this.activeToasts]);
    return () => {
      this.onToastCallbacks = this.onToastCallbacks.filter(c => c !== cb);
    };
  }

  private static notifyToasts(): void {
    this.onToastCallbacks.forEach(cb => cb([...this.activeToasts]));
  }

  private static formatDiscoveryName(id: string): string {
    return id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }

  private static inferType(id: string): DiscoveryType {
    if (id.startsWith('biome_')) return 'biome';
    if (id.startsWith('struct_')) return 'structure';
    if (id.startsWith('artifact_')) return 'artifact';
    if (id.startsWith('lore_')) return 'lore';
    return 'landmark';
  }
}
