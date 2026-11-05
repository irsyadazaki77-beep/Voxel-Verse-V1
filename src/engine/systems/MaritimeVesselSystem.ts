// Maritime Vessel System: Procedural 3D Perahu Cadik & Kapal Phinisi Samudra
// Handles 3D Composite Ship Models, Buoyancy & Wave Roll Kinematics, Bow Wake Particles, Trench Sonar & Diving Anchor
import * as THREE from 'three';
import { BlockType } from '../../types';
import { VoxelWorld } from '../world/VoxelWorld';
import { ParticleManager } from '../environment/ParticleManager';
import { SoundSynthesizer } from '../audio/SoundSynthesizer';
import { NotificationManager } from '../ui/NotificationManager';

export type VesselType = 'perahu_cadik' | 'kapal_phinisi';

export interface MaritimeVesselInstance {
  id: string;
  vesselType: VesselType;
  name: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  pitch: number;
  roll: number;
  currentSpeed: number; // m/s
  maxSpeed: number;
  turnSpeed: number;
  sailDeployed: boolean;
  anchored: boolean;
  sonarCooldown: number;
  sonarPulseTimer: number;
  nearestAnomalyPos: [number, number, number] | null;
  oceanDepth: number;
  mesh: THREE.Group;
  sailGroup: THREE.Group;
  rudderMesh: THREE.Object3D | null;
  sonarRingMesh: THREE.Mesh | null;
}

export interface MaritimeHUDTelemetry {
  isSailing: boolean;
  vesselId: string | null;
  vesselName: string;
  vesselType: VesselType | null;
  speedKnots: number;
  headingDeg: number;
  headingCardinal: string;
  oceanDepth: number;
  sailDeployed: boolean;
  anchored: boolean;
  sonarActive: boolean;
  nearestTrenchHint: string | null;
}

export class MaritimeVesselSystem {
  public static vessels: Map<string, MaritimeVesselInstance> = new Map();
  public static activeVesselId: string | null = null;
  private static vesselRootGroup: THREE.Group | null = null;
  private static waveClock: number = 0;
  private static wakeSpawnTimer: number = 0;
  private static depthCheckTimer: number = 0;

  // Reusable vectors for zero-GC per-frame updates
  private static readonly _tempForward = new THREE.Vector3();
  private static readonly _tempRight = new THREE.Vector3();
  private static readonly _tempWakePos = new THREE.Vector3();
  private static readonly _rayBox = new THREE.Box3();
  private static readonly _rayHitPoint = new THREE.Vector3();

  public static getOrCreateRootGroup(): THREE.Group {
    if (!this.vesselRootGroup) {
      this.vesselRootGroup = new THREE.Group();
      this.vesselRootGroup.name = 'MaritimeVesselRootGroup';
    }
    return this.vesselRootGroup;
  }

  public static buildProceduralVesselMesh(vesselType: VesselType): {
    root: THREE.Group;
    sailGroup: THREE.Group;
    rudderMesh: THREE.Object3D;
    sonarRingMesh: THREE.Mesh;
  } {
    const root = new THREE.Group();
    const sailGroup = new THREE.Group();

    const teakDarkMat = new THREE.MeshStandardMaterial({
      color: 0x5c3a1e,
      roughness: 0.72,
      metalness: 0.08,
    });
    const teakWarmMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.64,
      metalness: 0.1,
    });
    const bambooMat = new THREE.MeshStandardMaterial({
      color: 0xd4b459,
      roughness: 0.55,
      metalness: 0.05,
    });
    const sailClothMat = new THREE.MeshStandardMaterial({
      color: vesselType === 'kapal_phinisi' ? 0xfaf5e8 : 0xf1e9d2,
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    const sailCrimsonAccentMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.78,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const goldBrassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.28,
      metalness: 0.85,
    });
    const lanternGlowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
    });

    if (vesselType === 'perahu_cadik') {
      // 1. Primary Silhouette: Carved Dugout Hull (Lambung Perahu)
      const hullBase = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.45, 3.8), teakDarkMat);
      hullBase.position.set(0, 0.22, 0);
      hullBase.castShadow = true;
      hullBase.receiveShadow = true;
      root.add(hullBase);

      // Raised Prow & Stern Tips (Linggi Haluan & Buritan)
      const prowTip = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 0.75), teakWarmMat);
      prowTip.position.set(0, 0.48, -1.95);
      prowTip.rotation.x = 0.35;
      root.add(prowTip);

      const sternTip = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.58, 0.65), teakWarmMat);
      sternTip.position.set(0, 0.44, 1.9);
      sternTip.rotation.x = -0.3;
      root.add(sternTip);

      // Gunwales & Seat Benches
      const leftGunwale = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.25, 3.5), teakWarmMat);
      leftGunwale.position.set(-0.55, 0.52, 0);
      root.add(leftGunwale);

      const rightGunwale = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.25, 3.5), teakWarmMat);
      rightGunwale.position.set(0.55, 0.52, 0);
      root.add(rightGunwale);

      const bench = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.12, 0.5), teakWarmMat);
      bench.position.set(0, 0.48, 0.55);
      root.add(bench);

      // 2. Secondary Read: Twin Bamboo Outriggers (Cadik Kembar Nusantara)
      const crossBeamFront = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 0.14), bambooMat);
      crossBeamFront.position.set(0, 0.52, -0.75);
      root.add(crossBeamFront);

      const crossBeamBack = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.12, 0.14), bambooMat);
      crossBeamBack.position.set(0, 0.52, 0.75);
      root.add(crossBeamBack);

      const leftFloat = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 3.3), bambooMat);
      leftFloat.position.set(-1.85, 0.18, 0);
      root.add(leftFloat);

      const rightFloat = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 3.3), bambooMat);
      rightFloat.position.set(1.85, 0.18, 0);
      root.add(rightFloat);

      // 3. Mast & Crab-Claw Nusantara Sail (Layar Tanjak / Capit Kepiting)
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8), teakWarmMat);
      mast.position.set(0, 2.0, -0.4);
      root.add(mast);

      const mainSail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.2, 1.95), sailClothMat);
      mainSail.position.set(0, 2.25, -0.2);
      mainSail.rotation.y = 0.18;
      sailGroup.add(mainSail);

      const sailStripe = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 1.96), sailCrimsonAccentMat);
      sailStripe.position.set(0, 2.25, -0.2);
      sailStripe.rotation.y = 0.18;
      sailGroup.add(sailStripe);
      root.add(sailGroup);

      // Bow Lantern & Rudder
      const bowLantern = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.26, 0.22), lanternGlowMat);
      bowLantern.position.set(0, 0.85, -2.15);
      root.add(bowLantern);

      const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.55, 0.45), teakDarkMat);
      rudder.position.set(0, 0.25, 2.15);
      root.add(rudder);

      const sonarGeo = new THREE.RingGeometry(0.8, 1.15, 24);
      sonarGeo.rotateX(-Math.PI / 2);
      const sonarMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
      });
      const sonarRing = new THREE.Mesh(sonarGeo, sonarMat);
      sonarRing.position.set(0, 0.15, 0);
      root.add(sonarRing);

      return { root, sailGroup, rudderMesh: rudder, sonarRingMesh: sonarRing };
    }

    // =========================================================================
    // KAPAL PHINISI SAMUDRA (Majestic Twin-Masted Nusantara Schooner)
    // =========================================================================
    // 1. Primary Silhouette: Deep Carvel-Built Teak Hull & Raised Quarterdeck
    const lowerHull = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.68, 5.8), teakDarkMat);
    lowerHull.position.set(0, 0.32, 0);
    lowerHull.castShadow = true;
    lowerHull.receiveShadow = true;
    root.add(lowerHull);

    const mainDeck = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.24, 5.4), teakWarmMat);
    mainDeck.position.set(0, 0.72, 0.1);
    root.add(mainDeck);

    // Raised Aft Quarterdeck Cabin (Anjungan Kemudi Buritan)
    const aftCabin = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.75, 1.85), teakWarmMat);
    aftCabin.position.set(0, 1.15, 1.85);
    root.add(aftCabin);

    const cabinTrim = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.14, 1.95), goldBrassMat);
    cabinTrim.position.set(0, 1.54, 1.85);
    root.add(cabinTrim);

    // Iconic Long Bowsprit (Cucur Haluan Phinisi)
    const bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.12, 2.4, 8), teakWarmMat);
    bowsprit.rotation.x = Math.PI / 2 - 0.28;
    bowsprit.position.set(0, 1.05, -3.55);
    root.add(bowsprit);

    // Gold Naga Figurehead Accent at Bow
    const figurehead = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 0.55), goldBrassMat);
    figurehead.position.set(0, 0.88, -2.95);
    root.add(figurehead);

    // 2. Secondary Read: Twin Tripod Masts (Tiang Agung Sombala & Tanpasere)
    const foreMast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 4.8, 8), teakDarkMat);
    foreMast.position.set(0, 3.0, -1.05);
    root.add(foreMast);

    const mainMast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 4.5, 8), teakDarkMat);
    mainMast.position.set(0, 2.85, 0.85);
    root.add(mainMast);

    // 3. Phinisi Schooner Sails (Layar Agung, Layar Topang & Jib Haluan)
    const foreSail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.8, 1.85), sailClothMat);
    foreSail.position.set(0, 3.15, -0.95);
    foreSail.rotation.y = 0.12;
    sailGroup.add(foreSail);

    const foreGoldBand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 1.86), sailCrimsonAccentMat);
    foreGoldBand.position.set(0, 3.15, -0.95);
    foreGoldBand.rotation.y = 0.12;
    sailGroup.add(foreGoldBand);

    const aftSail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.5, 1.75), sailClothMat);
    aftSail.position.set(0, 2.95, 0.95);
    aftSail.rotation.y = 0.12;
    sailGroup.add(aftSail);

    const jibSail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.85, 1.35), sailClothMat);
    jibSail.position.set(0, 2.15, -2.55);
    jibSail.rotation.x = 0.25;
    sailGroup.add(jibSail);

    root.add(sailGroup);

    // Twin Aether Stern Lanterns & Brass Helm Wheel
    const leftLantern = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.26), lanternGlowMat);
    leftLantern.position.set(-0.92, 1.72, 2.65);
    root.add(leftLantern);

    const rightLantern = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.34, 0.26), lanternGlowMat);
    rightLantern.position.set(0.92, 1.72, 2.65);
    root.add(rightLantern);

    const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.75, 0.55), teakDarkMat);
    rudder.position.set(0, 0.35, 2.95);
    root.add(rudder);

    // Trench Sonar Pulse Ring
    const sonarGeo = new THREE.RingGeometry(1.2, 1.65, 32);
    sonarGeo.rotateX(-Math.PI / 2);
    const sonarMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    });
    const sonarRing = new THREE.Mesh(sonarGeo, sonarMat);
    sonarRing.position.set(0, 0.16, 0);
    root.add(sonarRing);

    return { root, sailGroup, rudderMesh: rudder, sonarRingMesh: sonarRing };
  }

  public static spawnVessel(
    vesselType: VesselType,
    pos: [number, number, number],
    yaw: number = 0
  ): MaritimeVesselInstance {
    const id = `vessel_${vesselType}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const built = this.buildProceduralVesselMesh(vesselType);
    built.root.position.set(pos[0], pos[1], pos[2]);
    built.root.rotation.y = yaw;

    const instance: MaritimeVesselInstance = {
      id,
      vesselType,
      name: vesselType === 'kapal_phinisi' ? 'Kapal Phinisi Samudra' : 'Perahu Cadik Nusantara',
      position: new THREE.Vector3(pos[0], pos[1], pos[2]),
      velocity: new THREE.Vector3(0, 0, 0),
      yaw,
      pitch: 0,
      roll: 0,
      currentSpeed: 0,
      maxSpeed: vesselType === 'kapal_phinisi' ? 13.5 : 9.2,
      turnSpeed: vesselType === 'kapal_phinisi' ? 1.65 : 2.35,
      sailDeployed: true,
      anchored: false,
      sonarCooldown: 0,
      sonarPulseTimer: 0,
      nearestAnomalyPos: null,
      oceanDepth: 4,
      mesh: built.root,
      sailGroup: built.sailGroup,
      rudderMesh: built.rudderMesh,
      sonarRingMesh: built.sonarRingMesh,
    };

    this.vessels.set(id, instance);
    this.getOrCreateRootGroup().add(built.root);
    return instance;
  }

  public static getRaycastVesselHit(
    eyePos: THREE.Vector3,
    forwardDir: THREE.Vector3,
    maxDist: number = 6.5
  ): MaritimeVesselInstance | null {
    const ray = new THREE.Ray(eyePos, forwardDir);
    let closest: MaritimeVesselInstance | null = null;
    let closestDist = maxDist;

    this.vessels.forEach((vessel) => {
      const halfW = vessel.vesselType === 'kapal_phinisi' ? 1.4 : 1.1;
      const halfL = vessel.vesselType === 'kapal_phinisi' ? 2.8 : 1.9;
      this._rayBox.min.set(
        vessel.position.x - halfW,
        vessel.position.y - 0.3,
        vessel.position.z - halfL
      );
      this._rayBox.max.set(
        vessel.position.x + halfW,
        vessel.position.y + 2.4,
        vessel.position.z + halfL
      );

      const hitPt = ray.intersectBox(this._rayBox, this._rayHitPoint);
      if (hitPt) {
        const dist = eyePos.distanceTo(hitPt);
        if (dist < closestDist) {
          closestDist = dist;
          closest = vessel;
        }
      }
    });

    return closest;
  }

  public static boardVessel(vesselId: string): MaritimeVesselInstance | null {
    const vessel = this.vessels.get(vesselId);
    if (!vessel) return null;
    this.activeVesselId = vesselId;
    vessel.anchored = false;
    vessel.sailDeployed = true;
    return vessel;
  }

  public static dismountActiveVessel(): MaritimeVesselInstance | null {
    if (!this.activeVesselId) return null;
    const vessel = this.vessels.get(this.activeVesselId) || null;
    if (vessel) {
      vessel.currentSpeed = 0;
      vessel.velocity.set(0, 0, 0);
      vessel.anchored = true;
    }
    this.activeVesselId = null;
    return vessel;
  }

  public static toggleAnchor(): boolean {
    if (!this.activeVesselId) return false;
    const vessel = this.vessels.get(this.activeVesselId);
    if (!vessel) return false;
    vessel.anchored = !vessel.anchored;
    if (vessel.anchored) {
      vessel.currentSpeed = 0;
      vessel.velocity.set(0, 0, 0);
    }
    return vessel.anchored;
  }

  public static triggerTrenchSonar(
    world: VoxelWorld,
    audio?: SoundSynthesizer,
    particles?: ParticleManager
  ): { found: boolean; targetPos: [number, number, number] | null; depth: number; message: string } {
    const vessel = this.activeVesselId ? this.vessels.get(this.activeVesselId) : null;
    if (!vessel) {
      return { found: false, targetPos: null, depth: 0, message: 'Tidak sedang berada di atas kapal.' };
    }

    vessel.sonarPulseTimer = 2.6;
    if (audio) {
      audio.playGamelanSaron(4);
    }

    const vx = Math.floor(vessel.position.x);
    const vy = Math.floor(vessel.position.y);
    const vz = Math.floor(vessel.position.z);

    if (particles) {
      particles.spawnMagicSpores(
        new THREE.Vector3(vessel.position.x, vessel.position.y + 0.5, vessel.position.z),
        0x06b6d4
      );
    }

    // Scan seabed in 24-block radius for Pearl Clams, Bioluminescent Coral, or Deep Trenches
    let bestTarget: [number, number, number] | null = null;
    let bestScore = 0;
    let maxDepthFound = vessel.oceanDepth;

    for (let dx = -20; dx <= 20; dx += 2) {
      for (let dz = -20; dz <= 20; dz += 2) {
        const sx = vx + dx;
        const sz = vz + dz;
        for (let y = vy - 1; y >= Math.max(4, vy - 45); y--) {
          const b = world.getBlock(sx, y, sz);
          if (b !== BlockType.WATER && b !== BlockType.AIR) {
            const depthHere = Math.max(0, vy - y);
            if (depthHere > maxDepthFound) maxDepthFound = depthHere;

            if (b === BlockType.PEARL_CLAM_BLOCK && bestScore < 3) {
              bestScore = 3;
              bestTarget = [sx, y, sz];
            } else if (b === BlockType.BIOLUMINESCENT_CORAL && bestScore < 2) {
              bestScore = 2;
              bestTarget = [sx, y, sz];
            } else if (depthHere >= 12 && bestScore < 1) {
              bestScore = 1;
              bestTarget = [sx, y, sz];
            }
            break;
          }
        }
      }
    }

    vessel.nearestAnomalyPos = bestTarget;
    const msg =
      bestScore === 3
        ? `Sonar mendeteksi Kerang Mutiara Samudra di kedalaman ${maxDepthFound}m! (${bestTarget![0]}, ${bestTarget![1]}, ${bestTarget![2]})`
        : bestScore === 2
        ? `Sonar mendeteksi Terumbu Karang Bercahaya di kedalaman ${maxDepthFound}m!`
        : `Kedalaman dasar laut terukur ${maxDepthFound}m di bawah lunas kapal.`;

    NotificationManager.push({
      title: 'Lentera Sonar Bahari',
      message: msg,
      priority: 'NORMAL',
      colorTheme: 'sky',
      durationMs: 3600,
    });

    return {
      found: bestScore > 0,
      targetPos: bestTarget,
      depth: maxDepthFound,
      message: msg,
    };
  }

  private static computeWaterDepthAt(world: VoxelWorld, x: number, startY: number, z: number): number {
    const bx = Math.floor(x);
    const bz = Math.floor(z);
    const sy = Math.floor(startY);
    let depth = 0;
    for (let y = sy; y >= Math.max(2, sy - 50); y--) {
      const b = world.getBlock(bx, y, bz);
      if (b === BlockType.WATER || b === BlockType.TERRACE_WATERWAY) {
        depth++;
      } else if (b !== BlockType.AIR) {
        break;
      }
    }
    return depth;
  }

  public static update(
    deltaTime: number,
    world: VoxelWorld,
    playerPos: THREE.Vector3,
    playerKeys: { forward: boolean; backward: boolean; left: boolean; right: boolean; sprint: boolean; crouch: boolean },
    particles?: ParticleManager,
    audio?: SoundSynthesizer
  ): void {
    const dt = Math.min(deltaTime, 0.05);
    this.waveClock += dt;
    this.wakeSpawnTimer += dt;
    this.depthCheckTimer += dt;

    this.vessels.forEach((vessel) => {
      const isPiloted = this.activeVesselId === vessel.id;

      // 1. Resolve Water Surface Buoyancy
      const bx = Math.floor(vessel.position.x);
      const bz = Math.floor(vessel.position.z);
      const curY = Math.floor(vessel.position.y);

      let waterTopY = vessel.position.y;
      for (let checkY = curY + 3; checkY >= curY - 4; checkY--) {
        const b = world.getBlock(bx, checkY, bz);
        if (b === BlockType.WATER || b === BlockType.TERRACE_WATERWAY) {
          waterTopY = checkY + 0.86;
          break;
        }
      }

      // Wave bobbing oscillation
      const waveOffset = Math.sin(this.waveClock * 2.2 + vessel.position.x * 0.35 + vessel.position.z * 0.35) * 0.06;
      vessel.position.y = THREE.MathUtils.lerp(vessel.position.y, waterTopY + waveOffset, Math.min(1, dt * 8));

      // 2. Piloted Sailing Controls (Helm Steering & Sail Thrust)
      let turnInput = 0;
      if (isPiloted && !vessel.anchored) {
        if (playerKeys.left) turnInput += 1;
        if (playerKeys.right) turnInput -= 1;

        if (turnInput !== 0) {
          vessel.yaw += turnInput * vessel.turnSpeed * dt;
        }

        let targetSpeed = 0;
        if (playerKeys.forward) {
          targetSpeed = playerKeys.sprint ? vessel.maxSpeed * 1.25 : vessel.maxSpeed;
          vessel.sailDeployed = true;
        } else if (playerKeys.backward) {
          targetSpeed = -vessel.maxSpeed * 0.35;
        }

        const accel = playerKeys.forward || playerKeys.backward ? 3.8 : 2.2;
        vessel.currentSpeed = THREE.MathUtils.lerp(vessel.currentSpeed, targetSpeed, Math.min(1, dt * accel));

        // Forward direction along -Z in Three.js player coordinate convention
        this._tempForward.set(-Math.sin(vessel.yaw), 0, -Math.cos(vessel.yaw));
        const nextX = vessel.position.x + this._tempForward.x * vessel.currentSpeed * dt;
        const nextZ = vessel.position.z + this._tempForward.z * vessel.currentSpeed * dt;

        // Check shoreline / solid block ahead at waterline before moving
        const probeX = Math.floor(nextX + this._tempForward.x * 1.3);
        const probeZ = Math.floor(nextZ + this._tempForward.z * 1.3);
        const blockAtWaterline = world.getBlock(probeX, Math.floor(waterTopY), probeZ);
        const blockAboveWaterline = world.getBlock(probeX, Math.floor(waterTopY + 1), probeZ);

        const isBlockedByLand =
          (blockAtWaterline !== BlockType.WATER &&
            blockAtWaterline !== BlockType.TERRACE_WATERWAY &&
            blockAtWaterline !== BlockType.AIR) ||
          (blockAboveWaterline !== BlockType.AIR && blockAboveWaterline !== BlockType.WATER);

        if (!isBlockedByLand) {
          vessel.position.x = nextX;
          vessel.position.z = nextZ;
        } else {
          vessel.currentSpeed *= 0.25;
        }

        // Bow Wake & Sea Foam Particles when moving fast
        if (Math.abs(vessel.currentSpeed) > 2.2 && this.wakeSpawnTimer >= 0.09 && particles) {
          this.wakeSpawnTimer = 0;
          const bowOffset = vessel.vesselType === 'kapal_phinisi' ? 2.6 : 1.8;
          this._tempWakePos.set(
            vessel.position.x + this._tempForward.x * bowOffset,
            vessel.position.y + 0.08,
            vessel.position.z + this._tempForward.z * bowOffset
          );
          particles.spawnWaterSplash(this._tempWakePos);
          if (Math.random() < 0.25 && audio) {
            audio.playFootstep('water');
          }
        }
      } else {
        vessel.currentSpeed = THREE.MathUtils.lerp(vessel.currentSpeed, 0, Math.min(1, dt * 4));
      }

      // 3. Measure Ocean Trench Depth Periodically
      if (isPiloted && this.depthCheckTimer >= 0.4) {
        this.depthCheckTimer = 0;
        vessel.oceanDepth = this.computeWaterDepthAt(
          world,
          vessel.position.x,
          vessel.position.y,
          vessel.position.z
        );
      }

      // 4. Procedural Roll, Pitch & Sail Billow Animation
      const targetRoll =
        turnInput * -0.14 * Math.min(1, Math.abs(vessel.currentSpeed) / 5) +
        Math.cos(this.waveClock * 1.7 + vessel.position.z * 0.2) * 0.035;
      const targetPitch =
        Math.min(0.09, Math.max(-0.05, vessel.currentSpeed * 0.008)) +
        Math.sin(this.waveClock * 2.1 + vessel.position.x * 0.2) * 0.025;

      vessel.roll = THREE.MathUtils.lerp(vessel.roll, targetRoll, Math.min(1, dt * 6));
      vessel.pitch = THREE.MathUtils.lerp(vessel.pitch, targetPitch, Math.min(1, dt * 6));

      vessel.mesh.position.copy(vessel.position);
      vessel.mesh.rotation.set(vessel.pitch, vessel.yaw, vessel.roll, 'YXZ');

      // Billow sails based on speed
      const sailScaleZ = vessel.sailDeployed
        ? 0.92 + Math.min(0.35, Math.abs(vessel.currentSpeed) * 0.025)
        : 0.25;
      vessel.sailGroup.scale.z = THREE.MathUtils.lerp(vessel.sailGroup.scale.z, sailScaleZ, Math.min(1, dt * 5));

      if (vessel.rudderMesh) {
        vessel.rudderMesh.rotation.y = THREE.MathUtils.lerp(
          vessel.rudderMesh.rotation.y,
          -turnInput * 0.45,
          Math.min(1, dt * 10)
        );
      }

      // 5. Trench Sonar Expanding Ring Animation
      if (vessel.sonarRingMesh) {
        const mat = vessel.sonarRingMesh.material as THREE.MeshBasicMaterial;
        if (vessel.sonarPulseTimer > 0) {
          vessel.sonarPulseTimer = Math.max(0, vessel.sonarPulseTimer - dt);
          const progress = 1.0 - vessel.sonarPulseTimer / 2.6;
          const ringScale = 1.0 + progress * 14.0;
          vessel.sonarRingMesh.scale.set(ringScale, ringScale, ringScale);
          mat.opacity = (1.0 - progress) * 0.75;
        } else {
          mat.opacity = 0;
        }
      }
    });
  }

  public static getActiveHUDTelemetry(): MaritimeHUDTelemetry {
    const vessel = this.activeVesselId ? this.vessels.get(this.activeVesselId) : null;
    if (!vessel) {
      return {
        isSailing: false,
        vesselId: null,
        vesselName: '',
        vesselType: null,
        speedKnots: 0,
        headingDeg: 0,
        headingCardinal: 'U',
        oceanDepth: 0,
        sailDeployed: false,
        anchored: false,
        sonarActive: false,
        nearestTrenchHint: null,
      };
    }

    const deg = ((vessel.yaw * 180) / Math.PI + 360) % 360;
    let cardinal = 'UTARA';
    if (deg >= 45 && deg < 135) cardinal = 'BARAT';
    else if (deg >= 135 && deg < 225) cardinal = 'SELATAN';
    else if (deg >= 225 && deg < 315) cardinal = 'TIMUR';

    return {
      isSailing: true,
      vesselId: vessel.id,
      vesselName: vessel.name,
      vesselType: vessel.vesselType,
      speedKnots: Math.round(Math.abs(vessel.currentSpeed) * 1.94 * 10) / 10,
      headingDeg: Math.round(deg),
      headingCardinal: cardinal,
      oceanDepth: vessel.oceanDepth,
      sailDeployed: vessel.sailDeployed,
      anchored: vessel.anchored,
      sonarActive: vessel.sonarPulseTimer > 0,
      nearestTrenchHint: vessel.nearestAnomalyPos
        ? `Anomali Laut [${vessel.nearestAnomalyPos[0]}, ${vessel.nearestAnomalyPos[1]}, ${vessel.nearestAnomalyPos[2]}]`
        : null,
    };
  }

  public static getPilotedVesselTelemetry(_player?: any): {
    id: string;
    name: string;
    type: 'perahu_cadik' | 'kapal_phinisi';
    speedKnots: number;
    maxSpeedKnots: number;
    throttleRatio: number;
    headingDeg: number;
    seaFloorDepth: number;
    trenchNearby: boolean;
    health: number;
    maxHealth: number;
    isDivingAnchored: boolean;
  } | null {
    const vessel = this.activeVesselId ? this.vessels.get(this.activeVesselId) : null;
    if (!vessel) return null;

    const deg = Math.round(((vessel.yaw * 180) / Math.PI + 360) % 360);
    const speedKnots = Math.round(Math.abs(vessel.currentSpeed) * 1.94 * 10) / 10;
    const maxSpeedKnots = Math.round(vessel.maxSpeed * 1.94 * 10) / 10;
    const throttleRatio = vessel.maxSpeed > 0 ? Math.min(1, Math.abs(vessel.currentSpeed) / vessel.maxSpeed) : 0;

    return {
      id: vessel.id,
      name: vessel.name,
      type: vessel.vesselType,
      speedKnots,
      maxSpeedKnots,
      throttleRatio,
      headingDeg: deg,
      seaFloorDepth: vessel.oceanDepth,
      trenchNearby: !!vessel.nearestAnomalyPos || vessel.oceanDepth >= 10,
      health: 100,
      maxHealth: 100,
      isDivingAnchored: vessel.anchored,
    };
  }

  public static engageDivingAnchor(player: any, stats?: any, _world?: VoxelWorld): void {
    const dismounted = this.dismountActiveVessel();
    if (!dismounted || !player) return;

    // Position player right in the water beside the anchored vessel and grant diving breath buff
    player.position.set(
      dismounted.position.x + 1.4,
      dismounted.position.y - 0.8,
      dismounted.position.z
    );
    if (stats && typeof stats.applyEffect === 'function') {
      stats.applyEffect('water_breathing', 180, 2);
    }
    NotificationManager.push({
      title: '⚓ Jangkar Selam Diterjunkan!',
      message: `${dismounted.name} berlabuh. Efek Napas Samudra aktif selama 180 detik untuk menyelami palung!`,
      priority: 'HIGH',
      colorTheme: 'sky',
      durationMs: 3600,
    });
  }

  public static reset(): void {
    if (this.vesselRootGroup) {
      while (this.vesselRootGroup.children.length > 0) {
        this.vesselRootGroup.remove(this.vesselRootGroup.children[0]);
      }
    }
    this.vessels.clear();
    this.activeVesselId = null;
  }
}
