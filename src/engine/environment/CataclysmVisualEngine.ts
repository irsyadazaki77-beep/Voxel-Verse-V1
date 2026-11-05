// Mythic Cataclysm Visualizer: 3D Starfall Meteor Projectiles, Crater Ore Impacts, Blood Eclipse & Volcanic Ash Eruptions
import * as THREE from 'three';
import { BlockType, WorldEventType } from '../../types';
import { VoxelWorld } from '../world/VoxelWorld';
import { ParticleManager } from '../environment/ParticleManager';
import { SoundSynthesizer } from '../audio/SoundSynthesizer';
import { WorldEventManager } from '../events/WorldEventManager';
import { NotificationManager } from '../ui/NotificationManager';

interface ActiveMeteorProjectile {
  id: string;
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  currentPos: THREE.Vector3;
  progress: number;
  duration: number;
  mesh: THREE.Group;
  trailTimer: number;
}

export class CataclysmVisualEngine {
  private static rootGroup: THREE.Group | null = null;
  private static activeMeteors: ActiveMeteorProjectile[] = [];
  private static lastCraterCoords: [number, number, number] | null = null;
  private static ambientParticleTimer: number = 0;
  private static astrolabeCycleIndex: number = 0;

  public static getOrCreateRootGroup(): THREE.Group {
    if (!this.rootGroup) {
      this.rootGroup = new THREE.Group();
      this.rootGroup.name = 'CataclysmVisualRootGroup';
    }
    return this.rootGroup;
  }

  public static getLastCraterCoords(): [number, number, number] | null {
    return this.lastCraterCoords;
  }

  private static createMeteorMesh(): THREE.Group {
    const group = new THREE.Group();

    const coreGeo = new THREE.DodecahedronGeometry(1.35, 0);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    const auraGeo = new THREE.DodecahedronGeometry(2.1, 1);
    const auraMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
      wireframe: true,
    });
    const auraMesh = new THREE.Mesh(auraGeo, auraMat);
    group.add(auraMesh);

    const tailGeo = new THREE.ConeGeometry(1.2, 6.5, 8);
    tailGeo.rotateX(Math.PI / 2);
    const tailMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.65,
    });
    const tailMesh = new THREE.Mesh(tailGeo, tailMat);
    tailMesh.position.set(0, 0, -3.5);
    group.add(tailMesh);

    return group;
  }

  public static spawnMeteorStrike(
    world: VoxelWorld,
    playerPos: THREE.Vector3,
    forwardDir?: THREE.Vector3,
    audio?: SoundSynthesizer
  ): [number, number, number] {
    // Pick a dramatic landing spot ~26–38 blocks ahead of the player so they can watch it fall & mine the crater
    const angle = forwardDir
      ? Math.atan2(forwardDir.z, forwardDir.x) + (Math.random() - 0.5) * 0.45
      : Math.random() * Math.PI * 2;
    const dist = 26 + Math.random() * 14;
    const targetX = Math.round(playerPos.x + Math.cos(angle) * dist);
    const targetZ = Math.round(playerPos.z + Math.sin(angle) * dist);

    // Find ground surface height at targetX, targetZ
    let targetY = Math.round(playerPos.y);
    for (let y = 115; y >= 12; y--) {
      const b = world.getBlock(targetX, y, targetZ);
      if (b !== BlockType.AIR && b !== BlockType.OAK_LEAVES && b !== BlockType.PINE_LEAVES) {
        targetY = y;
        break;
      }
    }

    const startPos = new THREE.Vector3(
      targetX - Math.cos(angle) * 45,
      targetY + 85,
      targetZ - Math.sin(angle) * 45
    );
    const targetPos = new THREE.Vector3(targetX + 0.5, targetY + 0.5, targetZ + 0.5);

    const mesh = this.createMeteorMesh();
    mesh.position.copy(startPos);
    mesh.lookAt(targetPos);

    this.getOrCreateRootGroup().add(mesh);

    this.activeMeteors.push({
      id: `meteor_${Date.now()}_${Math.random()}`,
      startPos,
      targetPos,
      currentPos: startPos.clone(),
      progress: 0,
      duration: 2.35,
      mesh,
      trailTimer: 0,
    });

    if (audio) {
      audio.playWeaponSwing();
    }

    this.lastCraterCoords = [targetX, targetY, targetZ];
    return [targetX, targetY, targetZ];
  }

  private static carveMeteorCrater(
    world: VoxelWorld,
    impactPos: THREE.Vector3,
    particles?: ParticleManager,
    audio?: SoundSynthesizer,
    onScreenShake?: (intensity: number) => void
  ): void {
    const cx = Math.floor(impactPos.x);
    const cy = Math.floor(impactPos.y);
    const cz = Math.floor(impactPos.z);

    if (audio) {
      audio.playTitanRoar();
      audio.playAncientGong();
    }
    if (onScreenShake) {
      onScreenShake(0.85);
    }

    if (particles) {
      particles.spawnCombatSparks(new THREE.Vector3(cx + 0.5, cy + 1.2, cz + 0.5), true);
      particles.spawnBlockBreakParticles(
        new THREE.Vector3(cx + 0.5, cy + 0.8, cz + 0.5),
        BlockType.MAGMA_ROCK
      );
    }

    // Carve small scorched basin and deposit glowing Starfall Ore & Magma Rock
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const dSq = dx * dx + dz * dz;
        if (dSq > 5) continue;
        const bx = cx + dx;
        const bz = cz + dz;

        if (dSq <= 1) {
          world.setBlock(bx, cy + 1, bz, BlockType.AIR);
          world.setBlock(bx, cy, bz, BlockType.STARFALL_ORE);
        } else if (dSq <= 2) {
          world.setBlock(
            bx,
            cy,
            bz,
            (bx + bz) % 2 === 0 ? BlockType.STARFALL_ORE : BlockType.MAGMA_ROCK
          );
        } else {
          const existing = world.getBlock(bx, cy, bz);
          if (existing !== BlockType.AIR && existing !== BlockType.WATER) {
            world.setBlock(bx, cy, bz, BlockType.OBSIDIAN);
          }
        }
      }
    }

    NotificationManager.push({
      title: 'Tumbukan Meteorit Starfall!',
      message: `Kawah kristal terbentuk di [${cx}, ${cy}, ${cz}] — Tambang Bijih Starfall sekarang!`,
      priority: 'CRITICAL',
      colorTheme: 'amber',
      durationMs: 5500,
    });
  }

  public static triggerNextCataclysmViaAstrolabe(
    world: VoxelWorld,
    playerPos: THREE.Vector3,
    forwardDir: THREE.Vector3,
    audio?: SoundSynthesizer,
    sky?: { setTimeOfDay: (h: number) => void }
  ): WorldEventType {
    const cycle: WorldEventType[] = ['meteor', 'eclipse', 'gejolak_gunung_api'];
    const chosen = cycle[this.astrolabeCycleIndex % cycle.length];
    this.astrolabeCycleIndex++;

    if (chosen === 'eclipse' && sky) {
      sky.setTimeOfDay(21.5); // Shift to night to showcase Blood Red Moon & Crimson Sky Dome
    } else if (chosen === 'meteor' && sky) {
      sky.setTimeOfDay(20.5);
    }

    WorldEventManager.triggerEvent(chosen, [playerPos.x, playerPos.y, playerPos.z]);

    if (chosen === 'meteor') {
      this.spawnMeteorStrike(world, playerPos, forwardDir, audio);
    } else if (audio) {
      audio.playAncientGong();
    }

    return chosen;
  }

  public static update(
    deltaTime: number,
    world: VoxelWorld,
    playerPos: THREE.Vector3,
    particles?: ParticleManager,
    audio?: SoundSynthesizer,
    onScreenShake?: (intensity: number) => void
  ): void {
    const dt = Math.min(deltaTime, 0.05);

    // 1. Update Active Falling 3D Meteor Projectiles
    for (let i = this.activeMeteors.length - 1; i >= 0; i--) {
      const m = this.activeMeteors[i];
      m.progress += dt / m.duration;
      m.trailTimer += dt;

      if (m.progress >= 1.0) {
        this.getOrCreateRootGroup().remove(m.mesh);
        this.carveMeteorCrater(world, m.targetPos, particles, audio, onScreenShake);
        this.activeMeteors.splice(i, 1);
        continue;
      }

      m.currentPos.lerpVectors(m.startPos, m.targetPos, m.progress);
      m.mesh.position.copy(m.currentPos);
      m.mesh.rotation.z += dt * 6.0;

      if (m.trailTimer >= 0.04 && particles) {
        m.trailTimer = 0;
        particles.spawnCombatSparks(m.currentPos, true);
      }
    }

    // 2. Ambient Cataclysm Atmospheric Particles (Blood Eclipse Spores / Volcanic Embers)
    this.ambientParticleTimer += dt;
    if (this.ambientParticleTimer >= 0.14 && particles) {
      this.ambientParticleTimer = 0;
      const activeEvents = WorldEventManager.getActiveEvents();
      for (const evt of activeEvents) {
        if (evt.type === 'eclipse') {
          particles.spawnMagicSpores(playerPos, 0xef4444);
        } else if (evt.type === 'gejolak_gunung_api' || evt.type === 'kabut_mistis') {
          particles.spawnAmbientEmbers(playerPos, true);
          particles.spawnAmbientEmbers(playerPos, false);
        } else if (evt.type === 'meteor') {
          particles.spawnMagicSpores(playerPos, 0x38bdf8);
        }
      }
    }
  }

  public static reset(): void {
    if (this.rootGroup) {
      while (this.rootGroup.children.length > 0) {
        this.rootGroup.remove(this.rootGroup.children[0]);
      }
    }
    this.activeMeteors = [];
    this.lastCraterCoords = null;
  }
}
