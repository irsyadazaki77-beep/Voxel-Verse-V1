// Interactive Fishing System 2.0 for VoxelVerse Living World & Ecosystem
// Includes 3D Procedural Bobber Mesh & Curved Quadratic Bezier Fishing Line
import * as THREE from 'three';

export type FishingState = 'IDLE' | 'CASTING' | 'WAITING' | 'BITE' | 'REELING' | 'SUCCESS' | 'FAILED';

export interface FishingCatchResult {
  itemId: string;
  itemName: string;
  quantity: number;
  xpEarned: number;
  isTreasure: boolean;
  rarity: string;
}

export class FishingSystem {
  public static state: FishingState = 'IDLE';
  public static timer: number = 0;
  public static biteWindowTimer: number = 0;
  public static bobberPos: [number, number, number] | null = null;
  public static currentRodType: 'normal' | 'aether' = 'normal';
  public static currentBaitId: string | null = null;
  public static tension: number = 0.5; // Reel tension (0.0 to 1.0)
  public static reelProgress: number = 0.0; // 0.0 to 1.0
  public static lastCatchResult: FishingCatchResult | null = null;

  private static onCatchCallbacks: ((result: FishingCatchResult) => void)[] = [];

  // 3D Bobber & Bezier Fishing Line Visuals
  private static visualGroup: THREE.Group | null = null;
  private static bobberMeshGroup: THREE.Group | null = null;
  private static fishingLine: THREE.Line | null = null;
  private static linePositions: Float32Array | null = null;
  private static readonly LINE_SEGMENTS = 16;
  private static animTime: number = 0;

  public static onCatch(cb: (result: FishingCatchResult) => void): void {
    this.onCatchCallbacks.push(cb);
  }

  public static getOrCreateVisualGroup(): THREE.Group {
    if (this.visualGroup) return this.visualGroup;

    this.visualGroup = new THREE.Group();
    this.visualGroup.visible = false;

    // 1. Composite 4-Part 3D Bobber Float
    const bobber = new THREE.Group();

    // Top crimson float cap
    const topGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.14, 12);
    const topMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.35,
      metalness: 0.1,
    });
    const topMesh = new THREE.Mesh(topGeo, topMat);
    topMesh.position.y = 0.08;
    bobber.add(topMesh);

    // Bottom pearl-white float body
    const botGeo = new THREE.CylinderGeometry(0.11, 0.05, 0.14, 12);
    const botMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.55,
      metalness: 0.05,
    });
    const botMesh = new THREE.Mesh(botGeo, botMat);
    botMesh.position.y = -0.06;
    bobber.add(botMesh);

    // Brass top eyelet & antenna stem
    const stemGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.12, 8);
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.85,
    });
    const stemMesh = new THREE.Mesh(stemGeo, brassMat);
    stemMesh.position.y = 0.19;
    bobber.add(stemMesh);

    // Subtle water ripple ring around the bobber
    const ringGeo = new THREE.RingGeometry(0.14, 0.22, 16);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.01;
    ringMesh.name = 'bobber_ripple_ring';
    bobber.add(ringMesh);

    this.bobberMeshGroup = bobber;
    this.visualGroup.add(bobber);

    // 2. Dynamic Quadratic Bezier Fishing Line
    this.linePositions = new Float32Array((this.LINE_SEGMENTS + 1) * 3);
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.85,
    });
    this.fishingLine = new THREE.Line(lineGeo, lineMat);
    this.fishingLine.frustumCulled = false;
    this.visualGroup.add(this.fishingLine);

    return this.visualGroup;
  }

  public static updateVisuals(
    deltaTime: number,
    playerHandWorldPos: THREE.Vector3
  ): void {
    const group = this.getOrCreateVisualGroup();
    if (
      this.state === 'IDLE' ||
      !this.bobberPos ||
      !this.bobberMeshGroup ||
      !this.fishingLine ||
      !this.linePositions
    ) {
      group.visible = false;
      return;
    }

    group.visible = true;
    this.animTime += deltaTime;

    const [bx, by, bz] = this.bobberPos;
    let verticalBob = Math.sin(this.animTime * 3.5) * 0.04;
    let tiltZ = Math.sin(this.animTime * 2.2) * 0.08;

    if (this.state === 'BITE') {
      // Dramatic dive underwater on fish bite
      verticalBob = -0.18 + Math.sin(this.animTime * 22.0) * 0.08;
      tiltZ = Math.sin(this.animTime * 18.0) * 0.25;
    } else if (this.state === 'REELING') {
      // Pulling toward player as reelProgress increases
      verticalBob = -0.05 + Math.sin(this.animTime * 14.0) * 0.05;
      tiltZ = 0.32;
    }

    // Interpolate bobber closer to player during REELING
    const pullFactor = this.state === 'REELING' ? this.reelProgress * 0.55 : 0;
    const curBx = bx + (playerHandWorldPos.x - bx) * pullFactor;
    const curBy = by + verticalBob;
    const curBz = bz + (playerHandWorldPos.z - bz) * pullFactor;

    this.bobberMeshGroup.position.set(curBx, curBy, curBz);
    this.bobberMeshGroup.rotation.z = tiltZ;

    // Pulse water ripple ring
    const ring = this.bobberMeshGroup.getObjectByName('bobber_ripple_ring') as THREE.Mesh | undefined;
    if (ring) {
      const pulse = 1.0 + ((this.animTime * (this.state === 'BITE' ? 3.5 : 1.2)) % 1.0) * 0.9;
      ring.scale.set(pulse, pulse, 1);
    }

    // Update Quadratic Bezier Line from player's rod tip to bobber eyelet
    const startX = playerHandWorldPos.x;
    const startY = playerHandWorldPos.y;
    const startZ = playerHandWorldPos.z;

    const endX = curBx;
    const endY = curBy + 0.19;
    const endZ = curBz;

    // Midpoint sag decreases as line tension increases
    const sag = this.state === 'REELING' ? Math.max(0.05, (1.0 - this.tension) * 0.45) : 0.42;
    const midX = (startX + endX) * 0.5;
    const midY = (startY + endY) * 0.5 - sag;
    const midZ = (startZ + endZ) * 0.5;

    for (let i = 0; i <= this.LINE_SEGMENTS; i++) {
      const t = i / this.LINE_SEGMENTS;
      const invT = 1 - t;
      const idx = i * 3;
      this.linePositions[idx] = invT * invT * startX + 2 * invT * t * midX + t * t * endX;
      this.linePositions[idx + 1] = invT * invT * startY + 2 * invT * t * midY + t * t * endY;
      this.linePositions[idx + 2] = invT * invT * startZ + 2 * invT * t * midZ + t * t * endZ;
    }

    const posAttr = this.fishingLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;

    const lineMat = this.fishingLine.material as THREE.LineBasicMaterial;
    if (this.state === 'REELING' && this.tension > 0.78) {
      lineMat.color.setHex(0xf43f5e); // Crimson warning on high tension
    } else if (this.state === 'BITE') {
      lineMat.color.setHex(0xfbbf24); // Golden flash on bite
    } else {
      lineMat.color.setHex(this.currentRodType === 'aether' ? 0x38bdf8 : 0xe2e8f0);
    }
  }

  // Cast fishing line into water target
  public static castLine(
    playerPos: [number, number, number],
    direction: [number, number, number],
    isAetherRod: boolean = false,
    baitId: string | null = null,
    waterSurfacePos?: [number, number, number]
  ): boolean {
    if (this.state !== 'IDLE') return false;

    this.currentRodType = isAetherRod ? 'aether' : 'normal';
    this.currentBaitId = baitId;
    this.state = 'CASTING';
    this.lastCatchResult = null;
    
    if (waterSurfacePos) {
      this.bobberPos = [waterSurfacePos[0], waterSurfacePos[1], waterSurfacePos[2]];
    } else {
      const castDist = 5.0;
      this.bobberPos = [
        playerPos[0] + direction[0] * castDist,
        playerPos[1] - 0.5,
        playerPos[2] + direction[2] * castDist,
      ];
    }

    // Wait duration reduced if bait is used or aether rod is used
    let waitTime = 2.8 + Math.random() * 3.0;
    if (baitId === 'earth_worm') waitTime *= 0.65;
    if (baitId === 'aether_bait') waitTime *= 0.45;
    if (isAetherRod) waitTime *= 0.75;

    this.timer = waitTime;
    this.tension = 0.3;
    this.reelProgress = 0;

    return true;
  }

  // Frame update tick for fishing mechanics
  public static update(
    deltaTime: number,
    biomeCategory: string = 'forest',
    isRaining: boolean = false,
    timeOfDay: number = 0.5 // 0 to 1
  ): { event: 'none' | 'bite' | 'escape' | 'success'; catch?: FishingCatchResult } {
    if (this.state === 'CASTING') {
      this.state = 'WAITING';
      return { event: 'none' };
    }

    if (this.state === 'WAITING') {
      const rateMultiplier = isRaining ? 1.35 : 1.0;
      this.timer -= deltaTime * rateMultiplier;

      if (this.timer <= 0) {
        this.state = 'BITE';
        this.biteWindowTimer = 2.6; // 2.6 seconds to react and hook!
        return { event: 'bite' };
      }
      return { event: 'none' };
    }

    if (this.state === 'BITE') {
      this.biteWindowTimer -= deltaTime;
      if (this.biteWindowTimer <= 0) {
        this.state = 'FAILED';
        this.timer = 1.0;
        return { event: 'escape' };
      }
      return { event: 'bite' };
    }

    if (this.state === 'REELING') {
      // Tension simulation: fish struggles occasionally, tension relaxes slightly when player isn't pulling
      const struggle = Math.sin(this.animTime * 5.0) * 0.15;
      this.tension += (struggle - 0.22) * deltaTime;
      this.tension = Math.max(0.08, Math.min(0.96, this.tension));

      // Steady baseline reel progression when tension is in safe green/amber zone
      if (this.tension < 0.85) {
        this.reelProgress += deltaTime * 0.22;
      }

      if (this.reelProgress >= 1.0) {
        const catchRes = this.generateCatch(biomeCategory, isRaining, timeOfDay);
        this.lastCatchResult = catchRes;
        this.state = 'SUCCESS';
        this.timer = 1.2;
        this.onCatchCallbacks.forEach(cb => cb(catchRes));
        return { event: 'success', catch: catchRes };
      }
      return { event: 'none' };
    }

    if (this.state === 'FAILED' || this.state === 'SUCCESS') {
      this.timer -= deltaTime;
      if (this.timer <= 0) {
        this.reset();
      }
    }

    return { event: 'none' };
  }

  // Player action when clicking during bite or reeling
  public static pullLine(
    biomeCategory: string = 'forest',
    isRaining: boolean = false,
    timeOfDay: number = 0.5
  ): { status: string; catch?: FishingCatchResult } {
    if (this.state === 'BITE') {
      // Successfully hooked! Transition to reeling minigame
      this.state = 'REELING';
      this.reelProgress = 0.25;
      this.tension = 0.38;
      return { status: 'HOOKED' };
    }

    if (this.state === 'REELING') {
      // Pulling line adds reel progress and increases tension
      this.reelProgress += 0.22;
      this.tension += 0.18;

      if (this.tension >= 1.0) {
        // Line snapped!
        this.state = 'FAILED';
        this.timer = 1.0;
        return { status: 'LINE_SNAPPED' };
      }

      if (this.reelProgress >= 1.0) {
        const catchRes = this.generateCatch(biomeCategory, isRaining, timeOfDay);
        this.lastCatchResult = catchRes;
        this.state = 'SUCCESS';
        this.timer = 1.2;
        this.onCatchCallbacks.forEach(cb => cb(catchRes));
        return { status: 'SUCCESS', catch: catchRes };
      }

      return { status: 'REELING' };
    }

    return { status: 'INVALID' };
  }

  // Generate weighted catch reward
  public static generateCatch(
    biomeCategory: string,
    isRaining: boolean,
    timeOfDay: number
  ): FishingCatchResult {
    const isNight = timeOfDay < 0.25 || timeOfDay > 0.75;
    const isAetherRod = this.currentRodType === 'aether';
    const isAetherBait = this.currentBaitId === 'aether_bait';

    // Check for rare treasure roll (12% base chance, increased by Aether rod / bait)
    const treasureRoll = Math.random();
    const treasureThreshold = 0.12 + (isAetherRod ? 0.1 : 0) + (isAetherBait ? 0.08 : 0);

    if (treasureRoll < treasureThreshold) {
      const treasures = [
        { itemId: 'aether_crystal', name: 'Aether Crystal', xp: 25, rarity: 'rare' },
        { itemId: 'blueprint_sheet', name: 'Engineering Blueprint', xp: 30, rarity: 'uncommon' },
        { itemId: 'ancient_glyph', name: 'Ancient Glyph Relic', xp: 40, rarity: 'rare' },
        { itemId: 'aether_wax', name: 'Preserved Crystal Wax', xp: 20, rarity: 'uncommon' },
      ];
      const t = treasures[Math.floor(Math.random() * treasures.length)];
      return {
        itemId: t.itemId,
        itemName: t.name,
        quantity: 1,
        xpEarned: t.xp,
        isTreasure: true,
        rarity: t.rarity,
      };
    }

    // Fish species selection by biome and conditions
    if (biomeCategory === 'ocean') {
      if ((isNight || isAetherRod || isAetherBait) && Math.random() < 0.4) {
        return {
          itemId: 'aether_glowfin',
          itemName: 'Azure Glowfin',
          quantity: 1,
          xpEarned: 35,
          isTreasure: false,
          rarity: 'rare',
        };
      }
      if (Math.random() < 0.5) {
        return {
          itemId: 'silver_salmon',
          itemName: 'Silver Salmon',
          quantity: 1,
          xpEarned: 20,
          isTreasure: false,
          rarity: 'uncommon',
        };
      }
      return {
        itemId: 'sun_bass',
        itemName: 'Sunswept Bass',
        quantity: 1,
        xpEarned: 12,
        isTreasure: false,
        rarity: 'common',
      };
    }

    if (biomeCategory === 'exotic' || isAetherRod) {
      return {
        itemId: 'aether_glowfin',
        itemName: 'Azure Glowfin',
        quantity: 1,
        xpEarned: 35,
        isTreasure: false,
        rarity: 'rare',
      };
    }

    // Standard freshwater rivers / lakes
    if (Math.random() < 0.35 || isRaining) {
      return {
        itemId: 'silver_salmon',
        itemName: 'Silver Salmon',
        quantity: 1,
        xpEarned: 18,
        isTreasure: false,
        rarity: 'uncommon',
      };
    }

    return {
      itemId: 'river_trout',
      itemName: 'River Trout',
      quantity: 1,
      xpEarned: 10,
      isTreasure: false,
      rarity: 'common',
    };
  }

  // Reset system
  public static reset(): void {
    this.state = 'IDLE';
    this.timer = 0;
    this.biteWindowTimer = 0;
    this.bobberPos = null;
    this.tension = 0.5;
    this.reelProgress = 0;
    if (this.visualGroup) {
      this.visualGroup.visible = false;
    }
  }
}

