// Real-time 3D Floor Telegraph Visual Engine for Boss Battles & AOE Attacks
// Projects expanding red danger decal rings onto the floor with zero texture memory overhead

import * as THREE from 'three';
import { GameEventBus } from '../events/GameEventBus';

export interface TelegraphDef {
  id: string;
  sourceEntityId?: string;
  position: [number, number, number]; // Floor center [x, y, z]
  radius: number;
  duration: number; // In seconds (e.g. 1.2)
  elapsed: number;
  color?: number; // Default 0xef4444 (Crimson)
  type?: 'circle' | 'ring' | 'concentric';
  damage?: number;
  onComplete?: () => void;
}

interface ActiveTelegraphMesh {
  def: TelegraphDef;
  group: THREE.Group;
  outerRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  fillDisk: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  rippleRing?: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  fadeTimer: number; // After completion, fades out over 0.2s
  isCompleted: boolean;
}

export class TelegraphVisualEngine {
  private scene: THREE.Scene;
  private telegraphGroup: THREE.Group;
  private activeTelegraphs: Map<string, ActiveTelegraphMesh> = new Map();
  private nextId: number = 1;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.telegraphGroup = new THREE.Group();
    this.telegraphGroup.name = 'boss_telegraph_group';
    this.scene.add(this.telegraphGroup);
  }

  /**
   * Spawns an expanding floor telegraph warning ring
   */
  public spawnTelegraph(params: {
    id?: string;
    sourceEntityId?: string;
    position: [number, number, number];
    radius?: number;
    duration?: number;
    color?: number;
    type?: 'circle' | 'ring' | 'concentric';
    damage?: number;
    onComplete?: () => void;
  }): string {
    const id = params.id || `telegraph_${this.nextId++}_${Date.now()}`;
    const radius = params.radius ?? 5.0;
    const duration = params.duration ?? 1.2;
    const color = params.color ?? 0xef4444; // Warning red

    // Remove any existing telegraph with same id
    if (this.activeTelegraphs.has(id)) {
      this.removeTelegraph(id);
    }

    const group = new THREE.Group();
    // Float slightly above voxel surface to eliminate Z-fighting
    group.position.set(params.position[0], params.position[1] + 0.06, params.position[2]);
    group.rotation.x = -Math.PI / 2; // Flat on XZ plane

    // 1. Static Perimeter Ring (Outer Danger Boundary)
    const ringThickness = Math.max(0.12, radius * 0.04);
    const outerGeo = new THREE.RingGeometry(radius - ringThickness, radius, 48);
    const outerMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const outerRing = new THREE.Mesh(outerGeo, outerMat);
    group.add(outerRing);

    // 2. Expanding Inner Fill Disk (Progress Indicator)
    // Create with unit size and scale dynamically to prevent allocating new RingGeometries every frame!
    const fillGeo = new THREE.RingGeometry(0, radius - ringThickness, 48);
    const fillMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const fillDisk = new THREE.Mesh(fillGeo, fillMat);
    fillDisk.scale.set(0.01, 0.01, 1);
    group.add(fillDisk);

    // 3. Pulsing Concentric Ripple Wave Ring
    const rippleGeo = new THREE.RingGeometry(radius * 0.45, radius * 0.52, 48);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b, // Amber contrast ripple
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const rippleRing = new THREE.Mesh(rippleGeo, rippleMat);
    group.add(rippleRing);

    this.telegraphGroup.add(group);

    const activeMesh: ActiveTelegraphMesh = {
      def: {
        id,
        sourceEntityId: params.sourceEntityId,
        position: params.position,
        radius,
        duration,
        elapsed: 0,
        color,
        type: params.type || 'circle',
        damage: params.damage,
        onComplete: params.onComplete,
      },
      group,
      outerRing,
      fillDisk,
      rippleRing,
      fadeTimer: 0.22,
      isCompleted: false,
    };

    this.activeTelegraphs.set(id, activeMesh);

    GameEventBus.emit('TELEGRAPH_SPAWNED', {
      id,
      position: params.position,
      radius,
      duration,
    });

    return id;
  }

  /**
   * Updates all active telegraph indicators per frame
   */
  public update(dt: number): void {
    if (this.activeTelegraphs.size === 0) return;

    const toRemove: string[] = [];

    this.activeTelegraphs.forEach((entry, id) => {
      const { def } = entry;

      if (!entry.isCompleted) {
        def.elapsed += dt;
        const progress = Math.min(1.0, def.elapsed / def.duration);

        // Update fill disk scale smoothly to match progress (0 -> 1)
        const scaleVal = Math.max(0.01, progress);
        entry.fillDisk.scale.set(scaleVal, scaleVal, 1);

        // Flash and increase opacity as impact nears
        const urgencyPulse = 0.35 + Math.sin(def.elapsed * 16) * 0.15;
        entry.fillDisk.material.opacity = Math.min(0.85, 0.35 + progress * 0.45 + urgencyPulse * 0.2);
        
        // Animate concentric ripple wave
        if (entry.rippleRing) {
          const wavePhase = (def.elapsed * 2.2) % 1.0;
          const rippleScale = wavePhase * 1.8;
          entry.rippleRing.scale.set(rippleScale, rippleScale, 1);
          entry.rippleRing.material.opacity = (1.0 - wavePhase) * 0.6;
        }

        // Check if duration expired -> trigger impact!
        if (def.elapsed >= def.duration) {
          entry.isCompleted = true;
          // Flash white on impact moment
          entry.outerRing.material.color.setHex(0xffffff);
          entry.fillDisk.material.color.setHex(0xffffff);
          entry.fillDisk.material.opacity = 0.95;

          if (def.onComplete) {
            try {
              def.onComplete();
            } catch (err) {
              console.error('Telegraph completion error:', err);
            }
          }

          GameEventBus.emit('TELEGRAPH_TRIGGERED', {
            id: def.id,
            position: def.position,
            radius: def.radius,
            damage: def.damage,
          });
        }
      } else {
        // Fade out completed impact flash
        entry.fadeTimer -= dt;
        const fadeAlpha = Math.max(0, entry.fadeTimer / 0.22);
        entry.outerRing.material.opacity = fadeAlpha * 0.9;
        entry.fillDisk.material.opacity = fadeAlpha * 0.9;
        if (entry.rippleRing) entry.rippleRing.material.opacity = fadeAlpha * 0.5;

        if (entry.fadeTimer <= 0) {
          toRemove.push(id);
        }
      }
    });

    toRemove.forEach((id) => this.removeTelegraph(id));
  }

  /**
   * Removes a telegraph and disposes its geometries & materials
   */
  public removeTelegraph(id: string): void {
    const entry = this.activeTelegraphs.get(id);
    if (!entry) return;

    this.telegraphGroup.remove(entry.group);

    entry.outerRing.geometry.dispose();
    entry.outerRing.material.dispose();

    entry.fillDisk.geometry.dispose();
    entry.fillDisk.material.dispose();

    if (entry.rippleRing) {
      entry.rippleRing.geometry.dispose();
      entry.rippleRing.material.dispose();
    }

    this.activeTelegraphs.delete(id);
  }

  /**
   * Cleans up all telegraphs
   */
  public dispose(): void {
    const ids = Array.from(this.activeTelegraphs.keys());
    ids.forEach((id) => this.removeTelegraph(id));
    this.scene.remove(this.telegraphGroup);
  }
}
