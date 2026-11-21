// VoxelVerse v6.0.0: Fisika Reruntuhan Blok Halus (Gravity Blocks) & Partikel Serpihan Tambang 3D (Mining Debris)
import * as THREE from 'three';
import { BlockType } from '../../types';
import { VoxelWorld } from './VoxelWorld';

interface DebrisCube {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  rotSpeed: THREE.Vector3;
  life: number;
  maxLife: number;
}

const GRAVITY_BLOCK_TYPES = new Set<BlockType>([
  BlockType.SAND,
  BlockType.GRAVEL,
]);

export class VoxelPhysicsSystem {
  private static rootGroup: THREE.Group = new THREE.Group();
  private static isAttached = false;
  private static debrisPool: DebrisCube[] = [];
  private static sharedCubeGeo: THREE.BoxGeometry | null = null;
  private static pendingGravityCoords: Array<[number, number, number]> = [];
  private static gravityTickAccum = 0;

  public static attachToScene(scene: THREE.Scene): void {
    if (this.isAttached) return;
    this.rootGroup.name = 'VoxelPhysicsDebrisRootV6';
    scene.add(this.rootGroup);
    this.isAttached = true;
  }

  public static reset(): void {
    for (const d of this.debrisPool) {
      this.rootGroup.remove(d.mesh);
    }
    this.debrisPool = [];
    this.pendingGravityCoords = [];
  }

  public static isGravityBlock(type: BlockType): boolean {
    return GRAVITY_BLOCK_TYPES.has(type);
  }

  /**
   * Call whenever a block at (x, y, z) is mined or placed so gravity blocks above it can settle naturally
   */
  public static notifyBlockChanged(x: number, y: number, z: number): void {
    for (let dy = 0; dy <= 4; dy++) {
      this.pendingGravityCoords.push([Math.floor(x), Math.floor(y) + dy, Math.floor(z)]);
    }
    if (this.pendingGravityCoords.length > 256) {
      this.pendingGravityCoords.splice(0, this.pendingGravityCoords.length - 256);
    }
  }

  /**
   * Immediately settle a single gravity column (deterministic & testable)
   */
  public static settleGravityColumn(world: VoxelWorld, x: number, y: number, z: number): number {
    const bx = Math.floor(x);
    let by = Math.floor(y);
    const bz = Math.floor(z);

    const blockType = world.getBlock(bx, by, bz);
    if (!this.isGravityBlock(blockType)) return 0;

    let fellDistance = 0;
    while (by > 1) {
      const below = world.getBlock(bx, by - 1, bz);
      if (below === BlockType.AIR || below === BlockType.WATER) {
        world.setBlock(bx, by, bz, BlockType.AIR);
        world.setBlock(bx, by - 1, bz, blockType);
        by--;
        fellDistance++;
        if (fellDistance >= 16) break; // Bound per tick
      } else {
        break;
      }
    }
    return fellDistance;
  }

  /**
   * Spawn 3D tumbling voxel mini-cubes when mining a block
   */
  public static spawnMiningDebris(
    worldPos: THREE.Vector3,
    colorHex = '#a8a29e',
    count = 6
  ): void {
    if (!this.isAttached) return;
    if (!this.sharedCubeGeo) {
      this.sharedCubeGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    }

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(colorHex),
      roughness: 0.8,
      metalness: 0.1,
    });

    const spawnCount = Math.min(count, Math.max(0, 48 - this.debrisPool.length));
    for (let i = 0; i < spawnCount; i++) {
      const mesh = new THREE.Mesh(this.sharedCubeGeo, mat);
      mesh.position.set(
        worldPos.x + (Math.random() - 0.5) * 0.6,
        worldPos.y + (Math.random() - 0.5) * 0.6,
        worldPos.z + (Math.random() - 0.5) * 0.6
      );
      this.rootGroup.add(mesh);

      this.debrisPool.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 3.8,
          2.2 + Math.random() * 2.8,
          (Math.random() - 0.5) * 3.8
        ),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        ),
        life: 0,
        maxLife: 0.65 + Math.random() * 0.45,
      });
    }
  }

  public static update(dt: number, world?: VoxelWorld): void {
    const clampedDt = Math.min(dt, 0.1);

    // Process pending gravity falling blocks
    if (world && this.pendingGravityCoords.length > 0) {
      this.gravityTickAccum += clampedDt;
      if (this.gravityTickAccum >= 0.08) {
        this.gravityTickAccum = 0;
        const batch = this.pendingGravityCoords.splice(0, 12);
        for (const [gx, gy, gz] of batch) {
          this.settleGravityColumn(world, gx, gy, gz);
        }
      }
    }

    // Animate tumbling 3D mining debris cubes
    for (let i = this.debrisPool.length - 1; i >= 0; i--) {
      const d = this.debrisPool[i];
      d.life += clampedDt;
      if (d.life >= d.maxLife) {
        this.rootGroup.remove(d.mesh);
        this.debrisPool.splice(i, 1);
        continue;
      }
      d.velocity.y -= 14.5 * clampedDt;
      d.mesh.position.addScaledVector(d.velocity, clampedDt);
      d.mesh.rotation.x += d.rotSpeed.x * clampedDt;
      d.mesh.rotation.y += d.rotSpeed.y * clampedDt;
      d.mesh.rotation.z += d.rotSpeed.z * clampedDt;

      const scale = Math.max(0.05, 1.0 - d.life / d.maxLife);
      d.mesh.scale.setScalar(scale);
    }
  }

  public static getActiveDebrisCount(): number {
    return this.debrisPool.length;
  }
}
