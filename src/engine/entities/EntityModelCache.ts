import * as THREE from 'three';
import { CreatureMaterialFactory } from './CreatureMaterialFactory';

export interface CachedModelData {
  geometry: THREE.BufferGeometry;
  materials: THREE.Material[];
}

export class EntityModelCache {
  private static cache: Map<string, CachedModelData> = new Map();
  private static partGeometryCache: Map<string, THREE.BufferGeometry> = new Map();

  public static has(key: string): boolean {
    return this.cache.has(key);
  }

  public static get(key: string): CachedModelData | undefined {
    return this.cache.get(key);
  }

  public static set(key: string, data: CachedModelData): void {
    this.cache.set(key, data);
  }

  /**
   * Retrieves or builds a reusable part geometry to eliminate duplicate memory & draw calls.
   */
  public static getPartGeometry(key: string, builderFn: () => THREE.BufferGeometry): THREE.BufferGeometry {
    let geo = this.partGeometryCache.get(key);
    if (!geo) {
      geo = builderFn();
      this.partGeometryCache.set(key, geo);
    }
    return geo;
  }

  public static instantiate(key: string, builderFn: () => CachedModelData): THREE.Group {
    let cached = this.cache.get(key);
    if (!cached) {
      cached = builderFn();
      this.cache.set(key, cached);
    }

    const group = new THREE.Group();
    const mesh = new THREE.Mesh(cached.geometry, cached.materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return group;
  }

  public static clear(): void {
    this.cache.forEach((data) => {
      data.geometry.dispose();
      data.materials.forEach((mat) => mat.dispose());
    });
    this.cache.clear();

    this.partGeometryCache.forEach((geo) => {
      geo.dispose();
    });
    this.partGeometryCache.clear();

    CreatureMaterialFactory.dispose();
  }

  public static getPartCacheStats(): { totalParts: number } {
    return {
      totalParts: this.partGeometryCache.size,
    };
  }
}

