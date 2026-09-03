import * as THREE from 'three';

export interface CachedModelData {
  geometry: THREE.BufferGeometry;
  materials: THREE.Material[];
}

export class EntityModelCache {
  private static cache: Map<string, CachedModelData> = new Map();

  public static has(key: string): boolean {
    return this.cache.has(key);
  }

  public static get(key: string): CachedModelData | undefined {
    return this.cache.get(key);
  }

  public static set(key: string, data: CachedModelData): void {
    this.cache.set(key, data);
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
  }
}
