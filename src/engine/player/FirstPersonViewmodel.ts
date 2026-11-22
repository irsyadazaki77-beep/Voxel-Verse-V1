// First Person Procedural Viewmodel 2.0, HD Textured Blocks, Detailed 3D Tools & Dynamic Handheld Torch Light
import * as THREE from 'three';
import { BlockType, ItemStack } from '../../types';
import { ITEM_DEFS } from '../items/ItemRegistry';
import { BLOCK_DEFS } from '../world/BlockRegistry';
import { TextureAtlas } from '../world/TextureAtlas';
import { SettingsManager } from '../ui/SettingsManager';

export class FirstPersonViewmodel {
  public rootGroup: THREE.Group;
  public armMesh: THREE.Mesh;
  public armDetailGroup: THREE.Group;
  public itemHolder: THREE.Group;
  public handheldLight: THREE.PointLight;
  private currentItemMesh: THREE.Object3D | null = null;
  private activeItemId: string | null = null;
  private lightBaseIntensity: number = 0;
  private lightBaseColor = new THREE.Color(0xffa94d);
  private lightIsFlame: boolean = false;

  // Bounded Resource Cache for Held Item Meshes
  private itemCache = new Map<string, THREE.Object3D>();
  private maxCacheSize = 24;
  private static sharedBlockGeo: THREE.BoxGeometry | null = null;
  private static sharedBlockMat: THREE.MeshStandardMaterial | null = null;

  // Animation Timers & Physical Springs
  private breathTimer: number = 0;
  private walkBobTimer: number = 0;
  private swingProgress: number = 0;
  private equipProgress: number = 1.0;
  private isSwinging: boolean = false;
  private swingType: 'mine' | 'slash' | 'place' | 'eat' = 'mine';
  private slashComboStep: number = 0;

  // Smooth Interpolation Offsets
  private currentOffset = new THREE.Vector3(0.34, -0.30, -0.54);
  private targetOffset = new THREE.Vector3(0.34, -0.30, -0.54);
  private currentRotation = new THREE.Euler(0, 0, 0);
  private targetRotation = new THREE.Euler(0, 0, 0);

  constructor() {
    this.rootGroup = new THREE.Group();
    this.rootGroup.position.copy(this.currentOffset);

    // 1. Detailed Stylized Voxel Explorer Forearm (Sapphire Tunic Sleeve + Cobalt Bracer + Skin Hand)
    const armGeo = new THREE.BoxGeometry(0.115, 0.34, 0.115);
    const armMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a5f,
      roughness: 0.78,
      metalness: 0.08,
    });
    this.armMesh = new THREE.Mesh(armGeo, armMat);
    this.armMesh.position.set(0.02, -0.18, 0.04);
    this.armMesh.rotation.set(-0.55, -0.18, -0.12);
    this.armMesh.castShadow = false;
    this.armMesh.receiveShadow = false;
    this.rootGroup.add(this.armMesh);

    this.armDetailGroup = new THREE.Group();
    this.armDetailGroup.position.copy(this.armMesh.position);
    this.armDetailGroup.rotation.copy(this.armMesh.rotation);

    // Sapphire Wrist Bracer
    const bracerMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.42,
      metalness: 0.35,
    });
    const bracer = new THREE.Mesh(new THREE.BoxGeometry(0.124, 0.08, 0.124), bracerMat);
    bracer.position.set(0, 0.09, 0);
    this.armDetailGroup.add(bracer);

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.25,
      metalness: 0.65,
      emissive: new THREE.Color(0x0284c7),
      emissiveIntensity: 0.25,
    });
    const trim = new THREE.Mesh(new THREE.BoxGeometry(0.128, 0.018, 0.128), trimMat);
    trim.position.set(0, 0.125, 0);
    this.armDetailGroup.add(trim);

    // Explorer Hand / Fist Cuff
    const handMat = new THREE.MeshStandardMaterial({
      color: 0xe2a97e,
      roughness: 0.75,
      metalness: 0.02,
    });
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.108, 0.11, 0.108), handMat);
    hand.position.set(0, 0.185, 0);
    this.armDetailGroup.add(hand);
    this.rootGroup.add(this.armDetailGroup);

    // 2. Held Item Socket (positioned right in the explorer's hand)
    this.itemHolder = new THREE.Group();
    this.itemHolder.position.set(-0.02, -0.08, -0.10);
    this.rootGroup.add(this.itemHolder);

    // 3. v9.0.0 Dynamic Handheld Light (illuminates caves & night in real time when holding torches/lanterns/aether items)
    this.handheldLight = new THREE.PointLight(0xffa94d, 0, 15, 1.5);
    this.handheldLight.position.set(0.15, 0.08, -0.45);
    this.handheldLight.castShadow = false;
    this.rootGroup.add(this.handheldLight);
  }

  /**
   * Builds a 3D BoxGeometry whose 6 faces map directly to the block's top, bottom, and side tiles in the 64x64 HD TextureAtlas.
   */
  private buildTexturedBlockGeometry(blockType: BlockType, size: number = 0.19): THREE.BoxGeometry {
    const geo = new THREE.BoxGeometry(size, size, size);
    const uvAttr = geo.getAttribute('uv') as THREE.BufferAttribute;
    if (!uvAttr) return geo;

    const topTile = TextureAtlas.getTileForBlock(blockType, 'top');
    const bottomTile = TextureAtlas.getTileForBlock(blockType, 'bottom');
    const sideTile = TextureAtlas.getTileForBlock(blockType, 'side');

    const topUV = TextureAtlas.getUVs(topTile);
    const bottomUV = TextureAtlas.getUVs(bottomTile);
    const sideUV = TextureAtlas.getUVs(sideTile);

    // Three.js BoxGeometry face order: 0:+X(side), 1:-X(side), 2:+Y(top), 3:-Y(bottom), 4:+Z(side), 5:-Z(side)
    const faceUVs = [sideUV, sideUV, topUV, bottomUV, sideUV, sideUV];
    for (let face = 0; face < 6; face++) {
      const [uMin, vMin, uMax, vMax] = faceUVs[face];
      const base = face * 4;
      uvAttr.setXY(base + 0, uMin, vMax);
      uvAttr.setXY(base + 1, uMax, vMax);
      uvAttr.setXY(base + 2, uMin, vMin);
      uvAttr.setXY(base + 3, uMax, vMin);
    }
    uvAttr.needsUpdate = true;
    return geo;
  }

  private updateHandheldLightProfile(itemId: string | null): void {
    if (!itemId) {
      this.lightBaseIntensity = 0;
      this.handheldLight.intensity = 0;
      return;
    }

    const id = itemId.toLowerCase();
    const itemDef = ITEM_DEFS[itemId];
    const blockDef = itemDef?.blockType !== undefined ? BLOCK_DEFS[itemDef.blockType] : undefined;

    if (id.includes('aether_lantern') || id.includes('aether_lamp') || id.includes('aether_core') || id.includes('starfall')) {
      this.lightBaseColor.setHex(0x38bdf8);
      this.lightBaseIntensity = 2.4;
      this.handheldLight.distance = 16;
      this.lightIsFlame = false;
    } else if (id.includes('torch') || id.includes('lantern') || id.includes('obor') || id.includes('lentera') || id.includes('lampion')) {
      this.lightBaseColor.setHex(0xffa347);
      this.lightBaseIntensity = 2.35;
      this.handheldLight.distance = 15;
      this.lightIsFlame = true;
    } else if (id.includes('glowstone') || id.includes('crystal') || id.includes('mustika') || (blockDef?.lightEmission && blockDef.lightEmission >= 8)) {
      this.lightBaseColor.setHex(0x60a5fa);
      this.lightBaseIntensity = 1.65;
      this.handheldLight.distance = 12;
      this.lightIsFlame = false;
    } else if (id.includes('sengkelat') || id.includes('baruklinting') || id.includes('aether')) {
      this.lightBaseColor.setHex(0x38bdf8);
      this.lightBaseIntensity = 0.85;
      this.handheldLight.distance = 8;
      this.lightIsFlame = false;
    } else {
      this.lightBaseIntensity = 0;
      this.handheldLight.intensity = 0;
    }

    this.handheldLight.color.copy(this.lightBaseColor);
  }

  private disposeNode(node: THREE.Object3D): void {
    const dispose = (n: THREE.Object3D) => {
      if (n instanceof THREE.Mesh) {
        if (n.geometry && n.geometry !== FirstPersonViewmodel.sharedBlockGeo) {
          n.geometry.dispose();
        }
        if (Array.isArray(n.material)) {
          n.material.forEach((mat) => {
            if (mat !== FirstPersonViewmodel.sharedBlockMat) mat.dispose();
          });
        } else if (n.material && n.material !== FirstPersonViewmodel.sharedBlockMat) {
          n.material.dispose();
        }
      }
      n.children.forEach(dispose);
    };
    dispose(node);
  }

  public setHeldItem(item: ItemStack | null): void {
    const itemId = item ? item.itemId : null;
    if (this.activeItemId === itemId) return;
    this.activeItemId = itemId;
    this.equipProgress = 0.0;
    this.updateHandheldLightProfile(itemId);

    // Clear current active item from holder
    if (this.currentItemMesh) {
      this.itemHolder.remove(this.currentItemMesh);
      this.currentItemMesh = null;
    }

    if (!item) return;

    // Check bounded cache
    const cached = this.itemCache.get(item.itemId);
    if (cached) {
      this.currentItemMesh = cached;
      this.itemHolder.add(cached);
      return;
    }

    const itemDef = ITEM_DEFS[item.itemId];
    if (!itemDef) return;

    let newMesh: THREE.Object3D;
    const idLower = item.itemId.toLowerCase();

    // 1. Handheld Torch / Lantern / Aether Lantern (3D Flame & Glowing Core)
    if (idLower.includes('torch') || idLower.includes('lantern') || idLower.includes('obor') || idLower.includes('lentera')) {
      const torchGroup = new THREE.Group();
      const isAether = idLower.includes('aether');
      const isLantern = idLower.includes('lantern') || idLower.includes('lentera');

      if (isLantern) {
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.35, metalness: 0.82 });
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.025, 0.13), frameMat);
        base.position.set(0, 0.04, 0);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.14), frameMat);
        cap.position.set(0, 0.21, 0);
        const coreMat = new THREE.MeshStandardMaterial({
          color: isAether ? 0x38bdf8 : 0xfbbf24,
          emissive: new THREE.Color(isAether ? 0x0ea5e9 : 0xf97316),
          emissiveIntensity: 1.8,
          roughness: 0.15,
        });
        const core = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.09), coreMat);
        core.position.set(0, 0.125, 0);
        core.name = 'flameCore';
        torchGroup.add(base, cap, core);
      } else {
        const stickMat = new THREE.MeshStandardMaterial({ color: 0x7c4d25, roughness: 0.85 });
        const stick = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.26, 0.042), stickMat);
        stick.position.set(0, 0.08, 0);
        const coalBand = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.035, 0.05),
          new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
        );
        coalBand.position.set(0, 0.21, 0);
        const flameMat = new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: new THREE.Color(0xf97316),
          emissiveIntensity: 2.1,
          roughness: 0.1,
        });
        const flame = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.068, 0.056), flameMat);
        flame.position.set(0, 0.255, 0);
        flame.name = 'flameCore';
        torchGroup.add(stick, coalBand, flame);
      }
      torchGroup.rotation.set(0.18, -0.25, -0.08);
      newMesh = torchGroup;
    } else if (idLower.includes('rod') || itemDef.toolType === 'fishing_rod') {
      const rodGroup = new THREE.Group();
      const isAether = idLower.includes('aether');
      const shaftGeo = new THREE.CylinderGeometry(0.008, 0.022, 0.62, 8);
      const shaftMat = new THREE.MeshStandardMaterial({
        color: isAether ? 0x38bdf8 : 0x925f2b,
        roughness: isAether ? 0.3 : 0.75,
        metalness: isAether ? 0.6 : 0.1,
        emissive: new THREE.Color(isAether ? 0x0284c7 : 0x000000),
        emissiveIntensity: isAether ? 0.35 : 0,
      });
      const shaft = new THREE.Mesh(shaftGeo, shaftMat);
      shaft.position.set(0, 0.24, -0.06);
      shaft.rotation.x = -0.35;
      rodGroup.add(shaft);

      const reelGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.028, 10);
      reelGeo.rotateZ(Math.PI / 2);
      const reelMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.25,
        metalness: 0.85,
      });
      const reel = new THREE.Mesh(reelGeo, reelMat);
      reel.position.set(0.022, 0.08, 0.02);
      rodGroup.add(reel);

      rodGroup.rotation.set(0.25, -0.3, -0.1);
      newMesh = rodGroup;
    } else if (idLower.includes('shield') || idLower.includes('aegis') || idLower.includes('perisai')) {
      const shieldGroup = new THREE.Group();
      const plateMat = new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.45, metalness: 0.55 });
      const rimMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.25, metalness: 0.85 });
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.032), plateMat);
      const boss = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.05), rimMat);
      shieldGroup.add(plate, boss);
      shieldGroup.position.set(-0.04, 0.12, -0.04);
      shieldGroup.rotation.set(0.1, 0.35, 0);
      newMesh = shieldGroup;
    } else if (itemDef.category === 'tool' || itemDef.category === 'weapon') {
      const toolGroup = new THREE.Group();

      // Ergonomic Wooden Shaft with Grip Wrap & Pommel
      const handleMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.82 });
      const gripMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65 });
      const isSpear = idLower.includes('spear') || idLower.includes('tombak') || idLower.includes('trisula');
      const handleLen = isSpear ? 0.56 : 0.34;
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.034, handleLen, 0.034), handleMat);
      handle.position.set(0, 0.12, 0);
      toolGroup.add(handle);

      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.11, 0.038), gripMat);
      grip.position.set(0, 0.04, 0);
      toolGroup.add(grip);

      // Material tier palette
      let headColor = 0x94a3b8;
      let roughness = 0.42;
      let metalness = 0.65;
      let emissive = 0x000000;
      let emissiveIntensity = 0.0;

      if (idLower.includes('wood') || idLower.includes('timber')) {
        headColor = 0x9a6b3e;
        roughness = 0.78;
        metalness = 0.08;
      } else if (idLower.includes('stone')) {
        headColor = 0x8b95a5;
        roughness = 0.72;
        metalness = 0.15;
      } else if (idLower.includes('copper')) {
        headColor = 0xd97745;
        roughness = 0.35;
        metalness = 0.75;
      } else if (idLower.includes('iron') || idLower.includes('steel')) {
        headColor = 0xe2e8f0;
        roughness = 0.28;
        metalness = 0.85;
      } else if (idLower.includes('gold') || idLower.includes('surya')) {
        headColor = 0xfacc15;
        roughness = 0.22;
        metalness = 0.90;
      } else if (idLower.includes('mythril') || idLower.includes('diamond')) {
        headColor = 0x38bdf8;
        roughness = 0.18;
        metalness = 0.92;
        emissive = 0x0284c7;
        emissiveIntensity = 0.28;
      } else if (idLower.includes('aether') || idLower.includes('sengkelat') || idLower.includes('baruklinting')) {
        headColor = 0x60a5fa;
        roughness = 0.20;
        metalness = 0.88;
        emissive = 0x2563eb;
        emissiveIntensity = 0.55;
      }

      const headMat = new THREE.MeshStandardMaterial({
        color: headColor,
        roughness,
        metalness,
        emissive: new THREE.Color(emissive),
        emissiveIntensity,
      });

      const isKeris = idLower.includes('keris') || idLower.includes('dagger');
      const isPickaxe = itemDef.toolType === 'pickaxe' || idLower.includes('pickaxe') || idLower.includes('beliung');
      const isAxe = itemDef.toolType === 'axe' || (idLower.includes('axe') && !isPickaxe) || idLower.includes('kapak');
      const isShovel = itemDef.toolType === 'shovel' || idLower.includes('shovel') || idLower.includes('sekop');
      const isSword = itemDef.category === 'weapon' || idLower.includes('sword') || idLower.includes('blade') || isKeris;

      if (isKeris) {
        const ganja = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.045), headMat);
        ganja.position.set(0, 0.18, 0);
        toolGroup.add(ganja);

        for (let luk = 0; luk < 5; luk++) {
          const seg = new THREE.Mesh(
            new THREE.BoxGeometry(0.044 - luk * 0.005, 0.068, 0.022),
            headMat
          );
          seg.position.set((luk % 2 === 0 ? 1 : -1) * 0.013, 0.22 + luk * 0.056, 0);
          seg.rotation.z = (luk % 2 === 0 ? 1 : -1) * 0.18;
          toolGroup.add(seg);
        }
      } else if (isPickaxe) {
        // Detailed Curved Dual-Tine Voxel Pickaxe Head + Collar
        const collar = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 0.055), gripMat);
        collar.position.set(0, 0.27, 0);
        const centerHead = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.046, 0.048), headMat);
        centerHead.position.set(0, 0.28, 0);
        const leftTine = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.038, 0.042), headMat);
        leftTine.position.set(-0.095, 0.262, 0);
        leftTine.rotation.z = 0.28;
        const rightTine = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.038, 0.042), headMat);
        rightTine.position.set(0.095, 0.262, 0);
        rightTine.rotation.z = -0.28;
        toolGroup.add(collar, centerHead, leftTine, rightTine);
      } else if (isAxe) {
        // Detailed Beveled Broad-Axe Blade & Poll
        const collar = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.07, 0.052), gripMat);
        collar.position.set(0, 0.25, 0);
        const bladeMain = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.13, 0.034), headMat);
        bladeMain.position.set(0.06, 0.25, 0);
        const bladeEdge = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.16, 0.022), headMat);
        bladeEdge.position.set(0.115, 0.245, 0);
        const poll = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.065, 0.042), headMat);
        poll.position.set(-0.035, 0.255, 0);
        toolGroup.add(collar, bladeMain, bladeEdge, poll);
      } else if (isShovel) {
        const spade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.024), headMat);
        spade.position.set(0, 0.32, 0);
        toolGroup.add(spade);
      } else if (isSpear) {
        const tipBase = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.08, 0.026), headMat);
        tipBase.position.set(0, 0.42, 0);
        const tipPoint = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.09, 0.020), headMat);
        tipPoint.position.set(0, 0.49, 0);
        toolGroup.add(tipBase, tipPoint);
      } else if (isSword) {
        // Broadsword with Crossguard, Fuller & Tapered Tip
        const guard = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.028, 0.048), gripMat);
        guard.position.set(0, 0.17, 0);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.34, 0.024), headMat);
        blade.position.set(0, 0.35, 0);
        const tip = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.06, 0.020), headMat);
        tip.position.set(0, 0.54, 0);
        toolGroup.add(guard, blade, tip);
      } else {
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.065, 0.065), headMat);
        head.position.set(0, 0.28, 0);
        toolGroup.add(head);
      }

      toolGroup.rotation.set(0.32, -0.42, -0.18);
      newMesh = toolGroup;
    } else if (itemDef.blockType !== undefined) {
      // v9.0.0: True Per-Block 64x64 HD Atlas UV-Mapped 3D Block in Hand!
      if (!FirstPersonViewmodel.sharedBlockMat) {
        FirstPersonViewmodel.sharedBlockMat = new THREE.MeshStandardMaterial({
          map: TextureAtlas.getAtlasTexture(),
          roughness: 0.78,
          metalness: 0.08,
        });
      }

      const blockGeo = this.buildTexturedBlockGeometry(itemDef.blockType, 0.195);
      const blockMesh = new THREE.Mesh(blockGeo, FirstPersonViewmodel.sharedBlockMat);
      blockMesh.position.set(-0.01, 0.11, -0.02);
      blockMesh.rotation.set(0.22, 0.52, -0.08);
      newMesh = blockMesh;
    } else {
      // Stylized Crystal / Potion / Food Item with Item Color
      const itemGroup = new THREE.Group();
      const baseColor = itemDef.iconColor || '#38bdf8';
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(baseColor),
        roughness: 0.35,
        metalness: 0.25,
      });
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.08), mat);
      core.position.set(0, 0.10, 0);
      itemGroup.add(core);
      itemGroup.rotation.set(0.2, -0.35, -0.1);
      newMesh = itemGroup;
    }

    // Bounded cache eviction (LRU style)
    if (this.itemCache.size >= this.maxCacheSize) {
      const oldestKey = this.itemCache.keys().next().value;
      if (oldestKey) {
        const oldestMesh = this.itemCache.get(oldestKey);
        this.itemCache.delete(oldestKey);
        if (oldestMesh) {
          this.disposeNode(oldestMesh);
        }
      }
    }

    this.itemCache.set(item.itemId, newMesh);
    this.currentItemMesh = newMesh;
    this.itemHolder.add(newMesh);
  }

  private hitStopRemaining: number = 0;

  public triggerHitStop(durationSec: number = 0.048): void {
    this.hitStopRemaining = Math.max(this.hitStopRemaining, durationSec);
  }

  public triggerSwing(type: 'mine' | 'slash' | 'place' | 'eat' = 'mine', comboStep: number = 0): void {
    if (this.isSwinging && this.swingType === type && type === 'mine') {
      return;
    }
    this.isSwinging = true;
    this.swingType = type;
    this.slashComboStep = comboStep % 3;
    this.swingProgress = 0;
  }

  public update(
    deltaTime: number,
    isMoving: boolean,
    isGrounded: boolean,
    isSprinting: boolean,
    isBlocking: boolean = false,
    bowDrawRatio: number = 0
  ): void {
    const dt = Math.min(deltaTime, 0.05);

    // 1. Idle Breathing Sway & Motion Reduction Scaling
    const accSettings = SettingsManager.get().accessibility;
    const swayScale = accSettings.motionReduction ? 0.1 : accSettings.headBobIntensity;

    this.breathTimer += dt * 2.0;
    const breathY = Math.sin(this.breathTimer) * 0.008 * swayScale;
    const breathX = Math.cos(this.breathTimer * 0.5) * 0.004 * swayScale;

    // 2. Walking & Sprinting Sway
    if (isMoving && isGrounded) {
      this.walkBobTimer += dt * (isSprinting ? 14 : 9);
    } else {
      this.walkBobTimer += (0 - this.walkBobTimer) * 8.0 * dt;
    }
    const bobX = Math.cos(this.walkBobTimer * 0.5) * (isSprinting ? 0.025 : 0.015) * swayScale;
    const bobY = Math.abs(Math.sin(this.walkBobTimer)) * (isSprinting ? 0.03 : 0.018) * swayScale;

    // 3. Compute Target Position & Rotation (with smooth equip raise animation)
    if (this.equipProgress < 1.0) {
      this.equipProgress = Math.min(1.0, this.equipProgress + dt * 6.5);
    }
    const equipDrop = (1.0 - Math.sin(this.equipProgress * Math.PI * 0.5)) * 0.18;

    // Update dynamic handheld torch/lantern light flicker
    if (this.lightBaseIntensity > 0) {
      if (this.lightIsFlame) {
        const flicker = Math.sin(this.breathTimer * 7.5) * 0.14 + Math.cos(this.breathTimer * 13.3) * 0.09;
        this.handheldLight.intensity = Math.max(0.5, this.lightBaseIntensity + flicker);
        if (this.currentItemMesh) {
          const flameNode = this.currentItemMesh.getObjectByName('flameCore');
          if (flameNode) {
            const s = 1.0 + flicker * 0.25;
            flameNode.scale.set(s, 1.0 + flicker * 0.35, s);
          }
        }
      } else {
        const pulse = Math.sin(this.breathTimer * 2.2) * 0.12;
        this.handheldLight.intensity = this.lightBaseIntensity + pulse;
      }
    }

    let basePosX = 0.34 + breathX + bobX;
    let basePosY = -0.30 + breathY - bobY - equipDrop;
    let basePosZ = -0.54;

    let rotX = -equipDrop * 1.2;
    let rotY = 0;
    let rotZ = 0;

    if (isSprinting) {
      basePosX += 0.04;
      basePosY -= 0.06;
      basePosZ += 0.08;
      rotX += 0.35;
      rotY -= 0.25;
    }

    if (isBlocking) {
      basePosX -= 0.15;
      basePosY += 0.08;
      basePosZ += 0.12;
      rotX -= 0.6;
      rotY += 0.5;
      rotZ -= 0.3;
    } else if (bowDrawRatio > 0) {
      basePosX -= 0.12 * bowDrawRatio;
      basePosZ += 0.15 * bowDrawRatio;
      rotX -= 0.4 * bowDrawRatio;
      rotY -= 0.3 * bowDrawRatio;
    }

    // 4. Action Animations (Mining, Slashing, Placing) with Micro Hit-Stop Support
    if (this.hitStopRemaining > 0) {
      this.hitStopRemaining -= dt;
      // Freeze frame: preserve current weapon strike pose during hit-stop
    } else if (this.isSwinging) {
      const speed =
        this.swingType === 'slash'
          ? (this.slashComboStep === 1 ? 9.8 : this.slashComboStep === 2 ? 8.0 : 8.8)
          : this.swingType === 'place'
          ? 9.0
          : 6.5;
      this.swingProgress += dt * speed;

      if (this.swingProgress >= 1.0) {
        this.swingProgress = 0;
        this.isSwinging = false;
      }
    }

    if (this.isSwinging) {
      const t = this.swingProgress;
      if (this.swingType === 'slash') {
        const slashAngle = Math.sin(t * Math.PI);
        if (this.slashComboStep === 0) {
          // Tahap 1: Sabetan Cepat Kiri-Kanan (Horizontal Slash with Blade Tilt)
          rotX -= slashAngle * 1.45;
          rotY += slashAngle * 1.15;
          rotZ -= slashAngle * 0.55;
          basePosX -= slashAngle * 0.14;
          basePosZ -= slashAngle * 0.12;
        } else if (this.slashComboStep === 1) {
          // Tahap 2: Sabetan Silang Bawah-Atas (Ascending Cross-Slash with Speed Boost)
          rotX -= slashAngle * 1.25;
          rotY -= slashAngle * 1.25;
          rotZ += slashAngle * 0.85;
          basePosX += slashAngle * 0.12;
          basePosY += slashAngle * 0.12;
          basePosZ -= slashAngle * 0.16;
        } else {
          // Tahap 3: Tusukan Pamungkas Keris (Finisher Thrust with Forward Reach & Spiral Rotation)
          rotX -= slashAngle * 1.85;
          rotY += Math.sin(t * Math.PI * 2) * 0.75;
          rotZ -= slashAngle * 1.05;
          basePosX -= slashAngle * 0.08;
          basePosY += slashAngle * 0.08;
          basePosZ -= slashAngle * 0.32; // Deep forward weapon lunge
        }
      } else if (this.swingType === 'place') {
        const punch = Math.sin(t * Math.PI);
        basePosZ -= punch * 0.14;
        basePosY += punch * 0.04;
        rotX += punch * 0.2;
      } else {
        // Mining continuous rhythm
        const mineAngle = Math.sin(t * Math.PI);
        rotX -= mineAngle * 1.1;
        rotY -= mineAngle * 0.3;
        rotZ += mineAngle * 0.2;
        basePosZ -= mineAngle * 0.06;
      }
    }

    // 5. Spring Dampening to Smooth Out Motion
    this.targetOffset.set(basePosX, basePosY, basePosZ);
    this.currentOffset.lerp(this.targetOffset, dt * 18.0);
    this.rootGroup.position.copy(this.currentOffset);

    this.targetRotation.set(rotX, rotY, rotZ);
    this.rootGroup.rotation.x += (this.targetRotation.x - this.rootGroup.rotation.x) * dt * 18.0;
    this.rootGroup.rotation.y += (this.targetRotation.y - this.rootGroup.rotation.y) * dt * 18.0;
    this.rootGroup.rotation.z += (this.targetRotation.z - this.rootGroup.rotation.z) * dt * 18.0;
  }

  public dispose(): void {
    // 1. Dispose arm geometry and material
    if (this.armMesh) {
      if (this.armMesh.geometry) this.armMesh.geometry.dispose();
      if (Array.isArray(this.armMesh.material)) {
        this.armMesh.material.forEach(mat => mat.dispose());
      } else if (this.armMesh.material) {
        this.armMesh.material.dispose();
      }
    }

    // 2. Dispose all cached item meshes
    for (const mesh of this.itemCache.values()) {
      this.disposeNode(mesh);
    }
    this.itemCache.clear();

    // 3. Dispose shared static block resources if any
    if (FirstPersonViewmodel.sharedBlockGeo) {
      FirstPersonViewmodel.sharedBlockGeo.dispose();
      FirstPersonViewmodel.sharedBlockGeo = null;
    }
    if (FirstPersonViewmodel.sharedBlockMat) {
      FirstPersonViewmodel.sharedBlockMat.dispose();
      FirstPersonViewmodel.sharedBlockMat = null;
    }

    // 4. Clear references
    this.currentItemMesh = null;
    this.rootGroup.clear();
  }
}
