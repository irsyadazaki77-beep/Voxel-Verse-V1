// Decipherable Cartographic Treasure Map Engine for VoxelVerse 3.0
import * as THREE from 'three';
import { GameEventBus } from '../events/GameEventBus';

export interface TreasureMap {
  id: string;
  name: string;
  regionHint: string;
  landmarkClue: string;
  targetPos: [number, number, number];
  isDeciphered: boolean;
  isFound: boolean;
  rewards: {
    itemId: string;
    count: number;
  }[];
  xpReward: number;
}

export const TREASURE_MAPS: TreasureMap[] = [
  {
    id: 'map_sunken_grotto',
    name: 'Ancient Mariner’s Parchment',
    regionHint: 'Near the Azure Coastlines (X: 120, Z: -180)',
    landmarkClue: 'Buried beneath the shadow of three seaside boulders where coral meets the beach sand.',
    targetPos: [124, 62, -186],
    isDeciphered: true,
    isFound: false,
    rewards: [
      { itemId: 'tidal_pearl', count: 1 },
      { itemId: 'gold_ingot', count: 6 },
      { itemId: 'diamond', count: 3 },
    ],
    xpReward: 300,
  },
  {
    id: 'map_highland_ridge',
    name: 'Highland Surveyor’s Chart',
    regionHint: 'Verdant Highland Ridge (X: -240, Z: 190)',
    landmarkClue: 'Look for the lone ancient pine atop the windswept ridge overlooking the river fork.',
    targetPos: [-242, 88, 195],
    isDeciphered: true,
    isFound: false,
    rewards: [
      { itemId: 'chrono_core', count: 1 },
      { itemId: 'raw_iron', count: 16 },
      { itemId: 'ancient_glyph', count: 3 },
    ],
    xpReward: 350,
  },
  {
    id: 'map_volcanic_cache',
    name: 'Pyro-Warden’s Sealed Vault',
    regionHint: 'Volcanic Badlands (X: -420, Z: 510)',
    landmarkClue: 'Beneath the basalt archway near the bubbling magma pools.',
    targetPos: [-418, 72, 514],
    isDeciphered: false,
    isFound: false,
    rewards: [
      { itemId: 'solaris_aegis', count: 1 },
      { itemId: 'mythril_ingot', count: 8 },
      { itemId: 'obsidian_core', count: 2 },
    ],
    xpReward: 500,
  },
];

export class TreasureMapSystem {
  private static maps: TreasureMap[] = [...TREASURE_MAPS];
  private static listeners: (() => void)[] = [];

  public static getMaps(): TreasureMap[] {
    return [...this.maps];
  }

  public static decipherMap(mapId: string): boolean {
    const map = this.maps.find(m => m.id === mapId);
    if (map && !map.isDeciphered) {
      map.isDeciphered = true;
      this.notify();
      GameEventBus.emit('TREASURE_MAP_DECIPHERED', { map });
      return true;
    }
    return false;
  }

  public static checkCacheDig(playerPos: THREE.Vector3): TreasureMap | null {
    for (const map of this.maps) {
      if (map.isDeciphered && !map.isFound) {
        const dist = Math.hypot(playerPos.x - map.targetPos[0], playerPos.z - map.targetPos[2]);
        const yDiff = Math.abs(playerPos.y - map.targetPos[1]);
        if (dist <= 4.5 && yDiff <= 3.0) {
          map.isFound = true;
          this.notify();
          GameEventBus.emit('TREASURE_CACHE_DISCOVERED', { map });
          return map;
        }
      }
    }
    return null;
  }

  public static getProximityHint(playerPos: THREE.Vector3): { mapName: string; distance: number; bearing: string } | null {
    let closestMap: TreasureMap | null = null;
    let minDistance = 150; // Only show radar hint when within 150 blocks

    for (const map of this.maps) {
      if (map.isDeciphered && !map.isFound) {
        const dist = Math.hypot(playerPos.x - map.targetPos[0], playerPos.z - map.targetPos[2]);
        if (dist < minDistance) {
          minDistance = dist;
          closestMap = map;
        }
      }
    }

    if (closestMap) {
      const dx = closestMap.targetPos[0] - playerPos.x;
      const dz = closestMap.targetPos[2] - playerPos.z;
      const angle = Math.atan2(dx, dz) * (180 / Math.PI);
      const normalizedAngle = (angle + 360) % 360;

      let bearing = 'North';
      if (normalizedAngle >= 45 && normalizedAngle < 135) bearing = 'East';
      else if (normalizedAngle >= 135 && normalizedAngle < 225) bearing = 'South';
      else if (normalizedAngle >= 225 && normalizedAngle < 315) bearing = 'West';

      return {
        mapName: closestMap.name,
        distance: Math.round(minDistance),
        bearing,
      };
    }

    return null;
  }

  public static subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error(e);
      }
    }
  }

  public static loadState(savedMaps: TreasureMap[]): void {
    if (Array.isArray(savedMaps) && savedMaps.length > 0) {
      this.maps = savedMaps;
    }
    this.notify();
  }

  public static saveState(): TreasureMap[] {
    return [...this.maps];
  }
}
