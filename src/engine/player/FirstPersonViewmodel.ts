// First Person Procedural Viewmodel & Weapon Physics
// Dynamic idle breathing sway, walk bobbing, sprint lean, mining swing, attack slash & block punch
import * as THREE from 'three';
import { ItemStack } from '../../types';
import { ITEM_DEFS } from '../items/ItemRegistry';
import { TextureAtlas } from '../world/TextureAtlas';

export class FirstPersonViewmodel {
  public rootGroup: THREE.Group;
  public armMesh: THREE.Mesh;
  public itemHolder: THREE.Group;
  private currentItemMesh: THREE.Object3D | null = null;
  private activeItemId: string | null = null;

  // Animation Timers & Physical Springs
  private breathTimer: number = 0;
  private walkBobTimer: number = 0;
  private swingProgress: number = 0;
  private isSwinging: boolean = false;
  private swingType: 'mine' | 'slash' | 'place' | 'eat' = 'mine';

  // Smooth Interpolation Offsets
  private currentOffset = new THREE.Vector3(0.32, -0.28, -0.55);
  private targetOffset = new THREE.Vector3(0.32, -0.28, -0.55);
  private currentRotation = new THREE.Euler(0, 0, 0);
  private targetRotation = new THREE.Euler(0, 0, 0);

  constructor() {
    this.rootGroup = new THREE.Group();
    this.rootGroup.position.copy(this.currentOffset);

    // 1. Stylized Voxel Explorer Arm
    const armGeo = new THREE.BoxGeometry(0.14, 0.42, 0.14);
    const armMat = new THREE.MeshLambertMaterial({ color: 0x4a7c59 });
    this.armMesh = new THREE.Mesh(armGeo, armMat);
    this.armMesh.position.set(0, -0.15, 0);
    this.armMesh.castShadow = false;
    this.armMesh.receiveShadow = false;
    this.rootGroup.add(this.armMesh);

    // 2. Held Item Socket
    this.itemHolder = new THREE.Group();
    this.itemHolder.position.set(0, -0.30, -0.08);
    this.rootGroup.add(this.itemHolder);
  }

  public setHeldItem(item: ItemStack | null): void {
    const itemId = item ? item.itemId : null;
    if (this.activeItemId === itemId) return;
    this.activeItemId = itemId;

    // Clear previous item mesh
    if (this.currentItemMesh) {
      this.itemHolder.remove(this.currentItemMesh);
      this.currentItemMesh = null;
    }

    if (!item) return;

    const itemDef = ITEM_DEFS[item.itemId];
    if (!itemDef) return;

    // Build stylized 3D representation based on category
    if (itemDef.category === 'tool' || itemDef.category === 'weapon') {
      const toolGroup = new THREE.Group();
      // Handle
      const handleGeo = new THREE.BoxGeometry(0.04, 0.35, 0.04);
      const handleMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
      const handle = new THREE.Mesh(handleGeo, handleMat);
      handle.position.set(0, 0.1, 0);
      toolGroup.add(handle);

      // Head
      let headColor = 0x888888;
      if (item.itemId.includes('copper')) headColor = 0xc87d55;
      if (item.itemId.includes('iron')) headColor = 0xdcdcdc;
      if (item.itemId.includes('gold')) headColor = 0xfacc15;
      if (item.itemId.includes('mythril')) headColor = 0x38bdf8;
      if (item.itemId.includes('aether')) headColor = 0xc084fc;

      const isSword = itemDef.category === 'weapon' || item.itemId.includes('sword');
      const headGeo = isSword 
        ? new THREE.BoxGeometry(0.06, 0.40, 0.03) 
        : new THREE.BoxGeometry(0.22, 0.08, 0.08);
      const headMat = new THREE.MeshLambertMaterial({ color: headColor });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.set(0, 0.30, 0);
      toolGroup.add(head);

      toolGroup.rotation.set(0.3, -0.4, -0.2);
      this.currentItemMesh = toolGroup;
      this.itemHolder.add(toolGroup);
    } else if (itemDef.blockType !== undefined) {
      // Miniature 3D Voxel Block
      const blockGeo = new THREE.BoxGeometry(0.22, 0.22, 0.22);
      const blockMat = new THREE.MeshStandardMaterial({
        map: TextureAtlas.getAtlasTexture(),
        roughness: 0.8,
        metalness: 0.1,
      });
      const blockMesh = new THREE.Mesh(blockGeo, blockMat);
      blockMesh.position.set(0, 0.12, 0);
      blockMesh.rotation.set(0.2, 0.4, 0);
      this.currentItemMesh = blockMesh;
      this.itemHolder.add(blockMesh);
    } else {
      // General Consumable / Material
      const genericGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
      const genericMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });
      const mesh = new THREE.Mesh(genericGeo, genericMat);
      mesh.position.set(0, 0.08, 0);
      this.currentItemMesh = mesh;
      this.itemHolder.add(mesh);
    }
  }

  public triggerSwing(type: 'mine' | 'slash' | 'place' | 'eat' = 'mine'): void {
    if (this.isSwinging && this.swingType === type && type === 'mine') {
      return;
    }
    this.isSwinging = true;
    this.swingType = type;
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

    // 1. Idle Breathing Sway
    this.breathTimer += dt * 2.0;
    const breathY = Math.sin(this.breathTimer) * 0.008;
    const breathX = Math.cos(this.breathTimer * 0.5) * 0.004;

    // 2. Walking & Sprinting Sway
    if (isMoving && isGrounded) {
      this.walkBobTimer += dt * (isSprinting ? 14 : 9);
    } else {
      this.walkBobTimer += (0 - this.walkBobTimer) * 8.0 * dt;
    }
    const bobX = Math.cos(this.walkBobTimer * 0.5) * (isSprinting ? 0.025 : 0.015);
    const bobY = Math.abs(Math.sin(this.walkBobTimer)) * (isSprinting ? 0.03 : 0.018);

    // 3. Compute Target Position & Rotation
    let basePosX = 0.32 + breathX + bobX;
    let basePosY = -0.28 + breathY - bobY;
    let basePosZ = -0.55;

    let rotX = 0;
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

    // 4. Action Animations (Mining, Slashing, Placing)
    if (this.isSwinging) {
      const speed = this.swingType === 'slash' ? 8.5 : this.swingType === 'place' ? 9.0 : 6.5;
      this.swingProgress += dt * speed;

      if (this.swingProgress >= 1.0) {
        this.swingProgress = 0;
        this.isSwinging = false;
      }

      const t = this.swingProgress;
      if (this.swingType === 'slash') {
        const slashAngle = Math.sin(t * Math.PI);
        rotX -= slashAngle * 1.4;
        rotY += slashAngle * 0.8;
        rotZ -= slashAngle * 0.4;
        basePosX -= slashAngle * 0.08;
        basePosZ -= slashAngle * 0.12;
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

    // 2. Helper function to recursively dispose meshes and their geometries/materials
    const disposeNode = (node: THREE.Object3D) => {
      if (node instanceof THREE.Mesh) {
        if (node.geometry) node.geometry.dispose();
        if (Array.isArray(node.material)) {
          node.material.forEach(mat => mat.dispose());
        } else if (node.material) {
          node.material.dispose();
        }
      }
      node.children.forEach(disposeNode);
    };

    // 3. Dispose held item mesh resources recursively
    if (this.currentItemMesh) {
      disposeNode(this.currentItemMesh);
    }

    // 4. Clear references
    this.currentItemMesh = null;
    this.rootGroup.clear();
  }
}
