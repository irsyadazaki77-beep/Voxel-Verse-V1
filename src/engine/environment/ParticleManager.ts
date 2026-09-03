// Centralized Pooled Particle System Manager
// Handles block destruction debris, footsteps, water splashes, torch embers, magic spores, combat hit sparks & weather drops
import * as THREE from 'three';
import { BlockType } from '../../types';
import { BLOCK_DEFS } from '../world/BlockRegistry';
import { SettingsManager } from '../ui/SettingsManager';

interface ActiveParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  gravity: number;
  type: 'debris' | 'footstep' | 'splash' | 'ember' | 'ash' | 'spore' | 'spark' | 'slash';
}

export class ParticleManager {
  private scene: THREE.Scene;
  private particleMesh: THREE.InstancedMesh;
  private dummy = new THREE.Object3D();
  private maxParticles = 900;
  private particles: ActiveParticle[] = [];
  
  // Object pooling & preallocated buffers to avoid GC spikes
  private particlePool: ActiveParticle[] = [];
  private colorBuffer = new Float32Array(this.maxParticles * 3);
  private colorAttribute: THREE.InstancedBufferAttribute;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
    });

    this.particleMesh = new THREE.InstancedMesh(geo, mat, this.maxParticles);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.count = 0;
    
    // Attach the preallocated color attribute
    this.colorAttribute = new THREE.InstancedBufferAttribute(this.colorBuffer, 3);
    this.colorAttribute.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.geometry.setAttribute('color', this.colorAttribute);

    this.scene.add(this.particleMesh);
  }

  private qualityMultiplier: number = 1.0;

  public setQuality(quality: 'low' | 'medium' | 'high'): void {
    if (quality === 'low') this.qualityMultiplier = 0.3;
    else if (quality === 'medium') this.qualityMultiplier = 0.7;
    else this.qualityMultiplier = 1.0;
  }

  private getMaxActiveLimit(): number {
    try {
      const g = SettingsManager.get().graphics;
      if (!g.particles) return 0;
      if (g.preset === 'low' || g.particleQuality === 'low') return 120;
      if (g.preset === 'medium' || g.particleQuality === 'medium') return 350;
    } catch {
      // fallback
    }
    return this.maxParticles;
  }

  private getQualityMultiplier(): number {
    try {
      const g = SettingsManager.get().graphics;
      if (!g.particles) return 0;
      if (g.preset === 'low' || g.particleQuality === 'low') return 0.25;
      if (g.preset === 'medium' || g.particleQuality === 'medium') return 0.65;
      if (g.preset === 'high') return 1.0;
      if (g.preset === 'ultra') return 1.4;
    } catch {
      // fallback
    }
    return this.qualityMultiplier;
  }

  private evictOldestParticle(): void {
    if (this.particles.length === 0) return;
    const oldest = this.particles[0];
    const last = this.particles.pop()!;
    if (this.particles.length > 0) {
      this.particles[0] = last;
    }
    this.particlePool.push(oldest);
  }

  private getPooledParticle(): ActiveParticle {
    const p = this.particlePool.pop();
    if (p) {
      return p;
    }
    return {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      color: new THREE.Color(),
      size: 0,
      life: 0,
      maxLife: 0,
      gravity: 0,
      type: 'debris',
    };
  }

  public spawnBlockBreakParticles(pos: THREE.Vector3, blockType: BlockType): void {
    const mult = this.getQualityMultiplier();
    if (mult <= 0) return;
    const def = BLOCK_DEFS[blockType];
    const baseColor = def ? def.color : [0.5, 0.5, 0.5];
    const maxCap = this.getMaxActiveLimit();
    const count = Math.max(2, Math.round(16 * mult));

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= maxCap) {
        this.evictOldestParticle();
      }

      const p = this.getPooledParticle();
      p.position.set(
        pos.x + (Math.random() - 0.5) * 0.7,
        pos.y + Math.random() * 0.7,
        pos.z + (Math.random() - 0.5) * 0.7
      );
      p.velocity.set(
        (Math.random() - 0.5) * 4.8,
        2.6 + Math.random() * 3.8,
        (Math.random() - 0.5) * 4.8
      );
      p.color.setRGB(
        Math.max(0, Math.min(1, baseColor[0] + (Math.random() - 0.5) * 0.18)),
        Math.max(0, Math.min(1, baseColor[1] + (Math.random() - 0.5) * 0.18)),
        Math.max(0, Math.min(1, baseColor[2] + (Math.random() - 0.5) * 0.18))
      );
      p.size = 0.75 + Math.random() * 0.65;
      p.life = 0;
      p.maxLife = 0.55 + Math.random() * 0.45;
      p.gravity = 11.5;
      p.type = 'debris';

      this.particles.push(p);
    }
  }

  // Spawn Combat Hit Sparks (e.g. Weapon strike / Critical Hit)
  public spawnCombatSparks(pos: THREE.Vector3, isCritical: boolean = false): void {
    const mult = this.getQualityMultiplier();
    if (mult <= 0) return;
    const maxCap = this.getMaxActiveLimit();
    const count = isCritical ? Math.max(3, Math.round(22 * mult)) : Math.max(2, Math.round(10 * mult));

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= maxCap) {
        this.evictOldestParticle();
      }

      const speed = isCritical ? 6.5 : 4.0;
      
      const p = this.getPooledParticle();
      p.position.set(
        pos.x + (Math.random() - 0.5) * 0.4,
        pos.y + (Math.random() - 0.5) * 0.4,
        pos.z + (Math.random() - 0.5) * 0.4
      );
      p.velocity.set(
        (Math.random() - 0.5) * speed,
        1.5 + Math.random() * speed,
        (Math.random() - 0.5) * speed
      );
      
      if (isCritical) {
        const t = Math.random();
        p.color.setRGB(1.0, 0.74 - t * 0.47, 0.14 + t * 0.13);
      } else {
        const t = Math.random() * 0.5;
        p.color.setRGB(1.0 - t * 0.78, 1.0 - t * 0.26, 1.0 - t * 0.03);
      }

      p.size = isCritical ? 1.2 : 0.8;
      p.life = 0;
      p.maxLife = 0.35 + Math.random() * 0.25;
      p.gravity = 8.0;
      p.type = 'spark';

      this.particles.push(p);
    }
  }

  // Spawn Footstep Dust/Snow/Sand Particles
  public spawnFootstepParticle(pos: THREE.Vector3, blockType: BlockType): void {
    const mult = this.getQualityMultiplier();
    if (mult <= 0 || (mult < 0.5 && Math.random() > 0.4)) return;
    const maxCap = this.getMaxActiveLimit();
    if (this.particles.length >= maxCap) {
      this.evictOldestParticle();
    }

    const def = BLOCK_DEFS[blockType];
    const col = def ? def.color : [0.6, 0.6, 0.6];

    const p = this.getPooledParticle();
    p.position.set(pos.x + (Math.random() - 0.5) * 0.3, pos.y + 0.05, pos.z + (Math.random() - 0.5) * 0.3);
    p.velocity.set((Math.random() - 0.5) * 0.8, 0.8 + Math.random() * 0.6, (Math.random() - 0.5) * 0.8);
    p.color.setRGB(col[0], col[1], col[2]);
    p.size = 0.6;
    p.life = 0;
    p.maxLife = 0.4;
    p.gravity = 2.0;
    p.type = 'footstep';

    this.particles.push(p);
  }

  // Spawn Water Splash Particles
  public spawnWaterSplash(pos: THREE.Vector3): void {
    const mult = this.getQualityMultiplier();
    if (mult <= 0) return;
    const maxCap = this.getMaxActiveLimit();
    const count = Math.max(2, Math.round(12 * mult));
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= maxCap) {
        this.evictOldestParticle();
      }

      const p = this.getPooledParticle();
      p.position.set(pos.x + (Math.random() - 0.5) * 0.5, pos.y + 0.1, pos.z + (Math.random() - 0.5) * 0.5);
      p.velocity.set((Math.random() - 0.5) * 3.2, 3.2 + Math.random() * 2.8, (Math.random() - 0.5) * 3.2);
      p.color.setRGB(0.4, 0.78, 0.98);
      p.size = 0.75;
      p.life = 0;
      p.maxLife = 0.5;
      p.gravity = 12.0;
      p.type = 'splash';

      this.particles.push(p);
    }
  }

  // Spawn Underwater Air Bubbles
  public spawnUnderwaterBubbles(pos: THREE.Vector3): void {
    const mult = this.getQualityMultiplier();
    if (mult <= 0 || (mult < 0.5 && Math.random() > 0.15)) return;
    if (Math.random() > 0.4) return;
    const maxCap = this.getMaxActiveLimit();
    if (this.particles.length >= maxCap) {
      this.evictOldestParticle();
    }

    const p = this.getPooledParticle();
    p.position.set(pos.x + (Math.random() - 0.5) * 4, pos.y + (Math.random() - 0.5) * 2, pos.z + (Math.random() - 0.5) * 4);
    p.velocity.set((Math.random() - 0.5) * 0.3, 0.8 + Math.random() * 0.8, (Math.random() - 0.5) * 0.3);
    p.color.setRGB(0.48, 0.82, 0.98);
    p.size = 0.4;
    p.life = 0;
    p.maxLife = 1.2 + Math.random() * 0.8;
    p.gravity = -0.5; // Drifts upward cleanly
    p.type = 'splash';

    this.particles.push(p);
  }

  // Spawn Ambient Torch Embers & Volcanic Ash
  public spawnAmbientEmbers(pos: THREE.Vector3, isVolcanic: boolean = false): void {
    const mult = this.getQualityMultiplier();
    if (mult <= 0 || mult < 0.4) return; // Skip ambient torch emitters on Low graphics
    if (Math.random() > 0.3) return;
    const maxCap = this.getMaxActiveLimit();
    if (this.particles.length >= maxCap) {
      this.evictOldestParticle();
    }

    const isAsh = isVolcanic;
    const p = this.getPooledParticle();
    p.position.set(pos.x + (Math.random() - 0.5) * 12, pos.y + Math.random() * 6, pos.z + (Math.random() - 0.5) * 12);
    p.velocity.set((Math.random() - 0.5) * 0.5, 0.5 + Math.random() * 0.8, (Math.random() - 0.5) * 0.5);
    if (isAsh) {
      p.color.setRGB(0.25, 0.22, 0.22);
    } else {
      p.color.setRGB(0.98, 0.65, 0.20);
    }
    p.size = 0.5;
    p.life = 0;
    p.maxLife = 1.5 + Math.random() * 1.0;
    p.gravity = -0.2; // Drifts upward
    p.type = isAsh ? 'ash' : 'ember';

    this.particles.push(p);
  }

  // Spawn Luminescent / Magic Spores in Crystal Biomes
  public spawnMagicSpores(pos: THREE.Vector3, colorHex: number = 0x38bdf8): void {
    const mult = this.getQualityMultiplier();
    if (mult <= 0 || mult < 0.4) return; // Skip ambient spores on Low graphics
    if (Math.random() > 0.4) return;
    const maxCap = this.getMaxActiveLimit();
    if (this.particles.length >= maxCap) {
      this.evictOldestParticle();
    }

    const p = this.getPooledParticle();
    p.position.set(pos.x + (Math.random() - 0.5) * 16, pos.y + Math.random() * 8, pos.z + (Math.random() - 0.5) * 16);
    p.velocity.set((Math.random() - 0.5) * 0.4, 0.3 + Math.random() * 0.5, (Math.random() - 0.5) * 0.4);
    p.color.setHex(colorHex);
    p.size = 0.6;
    p.life = 0;
    p.maxLife = 2.0 + Math.random() * 1.2;
    p.gravity = -0.1;
    p.type = 'spore';

    this.particles.push(p);
  }

  public getActiveParticleCount(): number {
    return this.particles.length;
  }

  public update(deltaTime: number, playerPos?: THREE.Vector3): void {
    if (this.particles.length === 0) {
      if (this.particleMesh.count !== 0) {
        this.particleMesh.count = 0;
        this.particleMesh.instanceMatrix.needsUpdate = true;
      }
      return;
    }

    const dt = Math.min(deltaTime, 0.1);
    const maxCap = this.getMaxActiveLimit();
    while (this.particles.length > maxCap) {
      this.evictOldestParticle();
    }

    // 1. Recycle dead particles using O(1) swap-and-pop
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      // Distance culling: accelerated decay if too far from player
      if (playerPos) {
        const dx = p.position.x - playerPos.x;
        const dz = p.position.z - playerPos.z;
        if (dx * dx + dz * dz > 50 * 50) {
          p.life += dt * 3.0; // Decay 4x faster when out of view
        }
      }

      if (p.life >= p.maxLife) {
        const last = this.particles.pop()!;
        if (i < this.particles.length) {
          this.particles[i] = last;
        }
        this.particlePool.push(p);
      }
    }

    // 2. Synchronously write matrices and colors for all active particles
    const activeCount = this.particles.length;
    for (let i = 0; i < activeCount; i++) {
      const p = this.particles[i];

      // Physics update
      p.velocity.y -= p.gravity * dt;
      p.position.addScaledVector(p.velocity, dt);

      // Scale & Opacity decay
      const progress = p.life / p.maxLife;
      const scale = p.size * (1.0 - progress * 0.55);

      this.dummy.position.copy(p.position);
      this.dummy.scale.set(scale, scale, scale);
      this.dummy.updateMatrix();

      this.particleMesh.setMatrixAt(i, this.dummy.matrix);

      // Write directly to preallocated colorBuffer at index i * 3
      const colorIdx = i * 3;
      this.colorBuffer[colorIdx] = p.color.r;
      this.colorBuffer[colorIdx + 1] = p.color.g;
      this.colorBuffer[colorIdx + 2] = p.color.b;
    }

    this.particleMesh.count = activeCount;
    this.particleMesh.instanceMatrix.needsUpdate = true;

    if (activeCount > 0) {
      this.colorAttribute.needsUpdate = true;
    }
  }

  public setVisible(visible: boolean): void {
    this.particleMesh.visible = visible;
  }

  public dispose(): void {
    this.scene.remove(this.particleMesh);
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.particles = [];
    this.particlePool = [];
  }
}
