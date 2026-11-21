// VoxelVerse v6.3.0: Zero-GC InstancedMesh Mining Debris & Gravity Falling Blocks
import * as THREE from 'three';
import { BlockType } from '../../types';
import { VoxelWorld } from './VoxelWorld';

interface DebrisInstance {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  rotSpeed: THREE.Vector3;
  color: THREE.Color;
  life: number;
  maxLife: number;
}

const GRAVITY_BLOCK_TYPES = new Set<BlockType>([
  BlockType.SAND,
  BlockType.GRAVEL,
]);

const MAX_DEBRIS_INSTANCES = 64;

export class VoxelPhysicsSystem {
  private static rootGroup: THREE.Group = new THREE.Group();
  private static isAttached = false;
  private static debrisList: DebrisInstance[] = [];
  private static instancedMesh: THREE.InstancedMesh | null = null;
  private static dummy = new THREE.Object3D();
  private static pendingGravityCoords: Array<[number, number, number]> = [];
  private static gravityTickAccum = 0;

  private static ensureInstancedMesh(): void {
    if (this.instancedMesh) return;
    const geo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.78,
      metalness: 0.1,
    });
    this.instancedMesh = new THREE.InstancedMesh(geo, mat, MAX_DEBRIS_INSTANCES);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.count = 0;
    this.instancedMesh.frustumCulled = false;
    this.rootGroup.add(this.instancedMesh);
  }

  public static attachToScene(scene: THREE.Scene): void {
    if (this.isAttached) return;
    this.rootGroup.name = 'VoxelPhysicsDebrisRootV6';
    this.ensureInstancedMesh();
    scene.add(this.rootGroup);
    this.isAttached = true;
  }

  public static reset(): void {
    this.debrisList = [];
    this.pendingGravityCoords = [];
    if (this.instancedMesh) {
      this.instancedMesh.count = 0;
    }
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
        if (fellDistance >= 16) break;
      } else {
        break;
      }
    }
    return fellDistance;
  }

  /**
   * Spawn 3D tumbling voxel mini-cubes using a single Zero-GC InstancedMesh (1 draw call)
   */
  public static spawnMiningDebris(
    worldPos: THREE.Vector3,
    colorHex = '#a8a29e',
    count = 6
  ): void {
    this.ensureInstancedMesh();
    const color = new THREE.Color(colorHex);
    const available = Math.max(0, MAX_DEBRIS_INSTANCES - this.debrisList.length);
    const spawnCount = Math.min(count, available);

    for (let i = 0; i < spawnCount; i++) {
      this.debrisList.push({
        position: new THREE.Vector3(
          worldPos.x + (Math.random() - 0.5) * 0.6,
          worldPos.y + (Math.random() - 0.5) * 0.6,
          worldPos.z + (Math.random() - 0.5) * 0.6
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 3.8,
          2.2 + Math.random() * 2.8,
          (Math.random() - 0.5) * 3.8
        ),
        rotation: new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3),
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        ),
        color,
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

    // Update InstancedMesh tumbling debris
    if (!this.instancedMesh) return;

    for (let i = this.debrisList.length - 1; i >= 0; i--) {
      const d = this.debrisList[i];
      d.life += clampedDt;
      if (d.life >= d.maxLife) {
        this.debrisList.splice(i, 1);
        continue;
      }
      d.velocity.y -= 14.5 * clampedDt;
      d.position.addScaledVector(d.velocity, clampedDt);
      d.rotation.x += d.rotSpeed.x * clampedDt;
      d.rotation.y += d.rotSpeed.y * clampedDt;
      d.rotation.z += d.rotSpeed.z * clampedDt;
    }

    const activeCount = Math.min(this.debrisList.length, MAX_DEBRIS_INSTANCES);
    this.instancedMesh.count = activeCount;
    for (let i = 0; i < activeCount; i++) {
      const d = this.debrisList[i];
      const scale = Math.max(0.05, 1.0 - d.life / d.maxLife);
      this.dummy.position.copy(d.position);
      this.dummy.rotation.copy(d.rotation);
      this.dummy.scale.setScalar(scale);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);
      this.instancedMesh.setColorAt(i, d.color);
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  public static getActiveDebrisCount(): number {
    return this.debrisList.length;
  }
}
