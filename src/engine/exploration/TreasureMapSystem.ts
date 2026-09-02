// Decipherable Cartographic Treasure Map Engine for VoxelVerse 3.0
// Procedural deterministic map generation, step-by-step deciphering, multi-tier proximity hints, and excavation cache discovery.
import * as THREE from 'three';
import { GameEventBus } from '../events/GameEventBus';
import { TreasureMap } from '../../types';

export type { TreasureMap };

export class TreasureMapSystem {
  private static maps: TreasureMap[] = [];
  private static listeners: (() => void)[] = [];

  /**
   * Deterministic procedural treasure map coordinate generation based on world seed
   */
  public static generateMaps(seed: number = 1337): TreasureMap[] {
    const pseudoRandom = (offset: number) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    const templates = [
      {
        id: 'map_sunken_grotto',
        name: 'Ancient Mariner’s Parchment',
        baseX: 130,
        baseZ: -190,
        regionName: 'Azure Coastlines',
        landmarkClue: 'Buried beneath the shadow of seaside boulders where turquoise shallows meet the shore sand.',
        rewards: [
          { itemId: 'tidal_pearl', count: 1 },
          { itemId: 'gold_ingot', count: 6 },
          { itemId: 'ancient_alloy', count: 2 },
        ],
        xpReward: 300,
        isDeciphered: true,
      },
      {
        id: 'map_highland_ridge',
        name: 'Highland Surveyor’s Chart',
        baseX: -240,
        baseZ: 190,
        regionName: 'Verdant Highland Ridge',
        landmarkClue: 'Look for the windswept rocky knoll overlooking the river bend.',
        rewards: [
          { itemId: 'chrono_core', count: 1 },
          { itemId: 'raw_iron', count: 16 },
          { itemId: 'ancient_tome', count: 1 },
        ],
        xpReward: 350,
        isDeciphered: true,
      },
      {
        id: 'map_volcanic_cache',
        name: 'Pyro-Warden’s Sealed Vault',
        baseX: -420,
        baseZ: 510,
        regionName: 'Volcanic Badlands',
        landmarkClue: 'Beneath the basalt archway near the cooling magma pools.',
        rewards: [
          { itemId: 'solaris_aegis', count: 1 },
          { itemId: 'mythril_ingot', count: 8 },
          { itemId: 'ancient_alloy', count: 4 },
        ],
        xpReward: 500,
        isDeciphered: false,
      },
      {
        id: 'map_celestial_cache',
        name: 'Astromancer’s Buried Casket',
        baseX: 380,
        baseZ: 310,
        regionName: 'Crystal Ley Grove',
        landmarkClue: 'Resting in the crystalline glade under a towering cyan geode cluster.',
        rewards: [
          { itemId: 'solar_compass', count: 1 },
          { itemId: 'aether_crystal', count: 10 },
          { itemId: 'diamond', count: 3 },
        ],
        xpReward: 600,
        isDeciphered: false,
      },
    ];

    return templates.map((tmpl, idx) => {
      const offsetX = Math.floor(pseudoRandom(idx * 43) * 60) - 30;
      const offsetZ = Math.floor(pseudoRandom(idx * 67) * 60) - 30;
      const x = tmpl.baseX + offsetX;
      const z = tmpl.baseZ + offsetZ;
      const y = 64 + Math.floor(pseudoRandom(idx * 19) * 20);

      return {
        id: tmpl.id,
        name: tmpl.name,
        regionHint: `${tmpl.regionName} (~X: ${Math.round(x / 10) * 10}, ~Z: ${Math.round(z / 10) * 10})`,
        landmarkClue: tmpl.landmarkClue,
        targetPos: [x, y, z] as [number, number, number],
        isDeciphered: tmpl.isDeciphered,
        isFound: false,
        rewards: tmpl.rewards,
        xpReward: tmpl.xpReward,
      };
    });
  }

  public static initialize(savedMaps?: TreasureMap[], seed: number = 1337): void {
    this.dispose();

    if (Array.isArray(savedMaps) && savedMaps.length > 0) {
      this.maps = JSON.parse(JSON.stringify(savedMaps));
    } else {
      this.maps = this.generateMaps(seed);
    }
  }

  public static dispose(): void {
    this.listeners = [];
    this.maps = [];
  }

  public static getMaps(): TreasureMap[] {
    return this.maps;
  }

  public static decipherMap(mapId: string): boolean {
    const map = this.maps.find((m) => m.id === mapId);
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
        if (dist <= 4.5 && yDiff <= 4.0) {
          map.isFound = true;
          this.notify();
          GameEventBus.emit('TREASURE_CACHE_DISCOVERED', { map });
          return map;
        }
      }
    }
    return null;
  }

  public static getProximityHint(
    playerPos: THREE.Vector3
  ): { mapName: string; distance: number; bearing: string; heat: 'HOT' | 'WARM' | 'COLD' } | null {
    let closestMap: TreasureMap | null = null;
    let minDistance = 160; // Proximity detection threshold

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

      let heat: 'HOT' | 'WARM' | 'COLD' = 'COLD';
      if (minDistance <= 25) heat = 'HOT';
      else if (minDistance <= 70) heat = 'WARM';

      return {
        mapName: closestMap.name,
        distance: Math.round(minDistance),
        bearing,
        heat,
      };
    }

    return null;
  }

  public static subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
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
      this.maps = JSON.parse(JSON.stringify(savedMaps));
    }
    this.notify();
  }

  public static saveState(): TreasureMap[] {
    return JSON.parse(JSON.stringify(this.maps));
  }
}
