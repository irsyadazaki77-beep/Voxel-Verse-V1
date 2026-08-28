// Map, Fog of War, Landmark Markers & Waypoint Manager 2.0
import { Waypoint } from '../../types';
import { GameEventBus } from '../events/GameEventBus';

export class MapManager {
  private static exploredChunks: Set<string> = new Set();
  private static waypoints: Map<string, Waypoint> = new Map();
  private static landmarkMarkers: Map<string, { id: string; name: string; pos: [number, number, number]; icon: string }> = new Map();
  private static onMapUpdateCallbacks: (() => void)[] = [];

  public static initialize(savedExplored?: string[], savedWaypoints?: Waypoint[]): void {
    this.exploredChunks.clear();
    this.waypoints.clear();
    this.landmarkMarkers.clear();

    if (savedExplored && Array.isArray(savedExplored)) {
      savedExplored.forEach(cKey => this.exploredChunks.add(cKey));
    }

    if (savedWaypoints && Array.isArray(savedWaypoints)) {
      savedWaypoints.forEach(wp => {
        if (wp && wp.id) this.waypoints.set(wp.id, wp);
      });
    }

    // Default Starting Home Waypoint if empty
    if (this.waypoints.size === 0) {
      this.addWaypoint('Spawn Shelter', [0, 80, 0], '#38bdf8', 'home');
    }

    // Register event listeners
    GameEventBus.on('STRUCTURE_DISCOVERED', (data) => {
      this.addLandmarkMarker(data.structureId, data.name, data.pos, 'structure');
    });

    GameEventBus.on('LANDMARK_DISCOVERED', (data) => {
      this.addLandmarkMarker(data.landmarkId, data.name, data.pos, 'landmark');
    });

    GameEventBus.on('SETTLEMENT_VISITED', (data) => {
      this.addLandmarkMarker(data.settlementId, data.name, data.pos, 'settlement');
    });
  }

  public static visitChunk(cx: number, cz: number): void {
    const key = `${cx},${cz}`;
    if (!this.exploredChunks.has(key)) {
      this.exploredChunks.add(key);
      this.notifyListeners();
    }
  }

  public static isChunkExplored(cx: number, cz: number): boolean {
    return this.exploredChunks.has(`${cx},${cz}`);
  }

  public static addWaypoint(name: string, pos: [number, number, number], color: string = '#f59e0b', icon: string = 'pin'): Waypoint {
    const id = `wp_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const wp: Waypoint = { id, name, pos, color, icon };
    this.waypoints.set(id, wp);
    this.notifyListeners();
    return wp;
  }

  public static removeWaypoint(id: string): void {
    if (this.waypoints.has(id)) {
      this.waypoints.delete(id);
      this.notifyListeners();
    }
  }

  public static addLandmarkMarker(id: string, name: string, pos: [number, number, number], icon: string = 'landmark'): void {
    this.landmarkMarkers.set(id, { id, name, pos, icon });
    this.notifyListeners();
  }

  public static getWaypoints(): Waypoint[] {
    return Array.from(this.waypoints.values());
  }

  public static getLandmarks(): { id: string; name: string; pos: [number, number, number]; icon: string }[] {
    return Array.from(this.landmarkMarkers.values());
  }

  // Calculate compass markers relative to player orientation (yaw)
  public static getCompassTargets(playerPos: [number, number, number], playerYaw: number) {
    const targets: { name: string; color: string; angleDelta: number; distance: number; isCardinal?: boolean }[] = [];

    // Cardinal directions
    const cardinals = [
      { name: 'N', angle: 0 },
      { name: 'E', angle: Math.PI / 2 },
      { name: 'S', angle: Math.PI },
      { name: 'W', angle: -Math.PI / 2 }
    ];

    cardinals.forEach(c => {
      let diff = c.angle - playerYaw;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      targets.push({ name: c.name, color: '#ffffff', angleDelta: diff, distance: 0, isCardinal: true });
    });

    // Custom Waypoints
    this.waypoints.forEach(wp => {
      const dx = wp.pos[0] - playerPos[0];
      const dz = wp.pos[2] - playerPos[2];
      const dist = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);
      let diff = angle - playerYaw;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      targets.push({
        name: wp.name,
        color: wp.color,
        angleDelta: diff,
        distance: Math.round(dist),
        isCardinal: false
      });
    });

    return targets;
  }

  public static serializeExplored(): string[] {
    return Array.from(this.exploredChunks);
  }

  public static serializeWaypoints(): Waypoint[] {
    return Array.from(this.waypoints.values());
  }

  public static onMapUpdate(cb: () => void): () => void {
    this.onMapUpdateCallbacks.push(cb);
    return () => {
      this.onMapUpdateCallbacks = this.onMapUpdateCallbacks.filter(c => c !== cb);
    };
  }

  private static notifyListeners(): void {
    this.onMapUpdateCallbacks.forEach(cb => cb());
  }
}
