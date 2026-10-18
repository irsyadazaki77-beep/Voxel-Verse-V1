// Waypoint & Custom Navigation Marker Manager
import { GameEventBus } from '../events/GameEventBus';

export interface WaypointMarker {
  id: string;
  label: string;
  pos: [number, number, number];
  color: string;
  icon?: string;
  type: 'custom' | 'settlement' | 'boss' | 'death' | 'dungeon' | 'subak';
  createdAt: number;
}

const STORAGE_KEY = 'voxelverse_waypoints';

export class WaypointManager {
  private static waypoints: Map<string, WaypointMarker> = new Map();
  private static listeners: Set<(waypoints: WaypointMarker[]) => void> = new Set();
  private static initialized: boolean = false;

  public static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Load saved custom waypoints
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: WaypointMarker[] = JSON.parse(saved);
        parsed.forEach(wp => this.waypoints.set(wp.id, wp));
      }
    } catch {
      // ignore
    }

    // Default landmark waypoints
    this.ensureDefaultWaypoints();

    // Listen for player death to set death marker
    GameEventBus.on('PLAYER_DIED', (payload: { pos?: [number, number, number]; source?: string }) => {
      if (payload?.pos) {
        this.setDeathMarker(payload.pos);
      }
    });

    // Listen for boss spawn
    GameEventBus.on('BOSS_SPAWNED', (payload: { bossId: string; type: string; pos: [number, number, number] }) => {
      this.addWaypoint({
        id: `boss_${payload.bossId}`,
        label: 'Batara Kala Colossus',
        pos: payload.pos,
        color: '#ef4444',
        icon: '👹',
        type: 'boss',
        createdAt: Date.now(),
      });
    });

    GameEventBus.on('BOSS_DEFEATED', () => {
      for (const [id, wp] of this.waypoints.entries()) {
        if (wp.type === 'boss') {
          this.waypoints.delete(id);
        }
      }
      this.notify();
    });
  }

  private static ensureDefaultWaypoints(): void {
    // Add default initial settlement marker if empty
    if (this.waypoints.size === 0) {
      this.waypoints.set('haven_camp', {
        id: 'haven_camp',
        label: 'Haven Camp (Perintis)',
        pos: [0, 68, 0],
        color: '#10b981',
        icon: '🏕️',
        type: 'settlement',
        createdAt: Date.now(),
      });
      this.waypoints.set('candi_bentar_ruin', {
        id: 'candi_bentar_ruin',
        label: 'Reruntuhan Candi Bentar',
        pos: [120, 64, -80],
        color: '#f59e0b',
        icon: '🏛️',
        type: 'dungeon',
        createdAt: Date.now(),
      });
    }
  }

  public static getWaypoints(): WaypointMarker[] {
    return Array.from(this.waypoints.values());
  }

  public static addWaypoint(wp: WaypointMarker): void {
    this.waypoints.set(wp.id, wp);
    this.save();
    this.notify();
  }

  public static removeWaypoint(id: string): void {
    this.waypoints.delete(id);
    this.save();
    this.notify();
  }

  public static setDeathMarker(pos: [number, number, number]): void {
    this.waypoints.set('player_death', {
      id: 'player_death',
      label: 'Titik Terakhir Gugur',
      pos,
      color: '#e11d48',
      icon: '💀',
      type: 'death',
      createdAt: Date.now(),
    });
    this.save();
    this.notify();
  }

  public static subscribe(fn: (waypoints: WaypointMarker[]) => void): () => void {
    this.listeners.add(fn);
    fn(this.getWaypoints());
    return () => this.listeners.delete(fn);
  }

  private static notify(): void {
    const list = this.getWaypoints();
    this.listeners.forEach(fn => fn(list));
  }

  private static save(): void {
    try {
      const list = Array.from(this.waypoints.values()).filter(wp => wp.type === 'custom' || wp.type === 'death');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore
    }
  }
}
