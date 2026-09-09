// Procedural 3D Voxel Model Builder for Creatures 3.0
// High-detail silhouettes, authentic voxel proportions, multi-part articulated rigs, and shared cached part geometries.

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { EntityModelCache, CachedModelData } from './EntityModelCache';
import { CreatureMaterialFactory, CreatureMaterialPalette } from './CreatureMaterialFactory';
import { CreatureRig, CreatureLocomotionType } from './CreatureRigTypes';

interface VoxelBoxDef {
  size: [number, number, number];
  pos?: [number, number, number];
  rot?: [number, number, number];
  matIndex?: number;
}

export class EntityModelBuilder {
  /**
   * Builds and merges voxel boxes for a logical animated part, preserving multi-material groups.
   */
  private static buildPartGeometry(boxes: VoxelBoxDef[]): THREE.BufferGeometry {
    const geometries: THREE.BufferGeometry[] = [];
    for (const b of boxes) {
      const geo = new THREE.BoxGeometry(...b.size);
      const matrix = new THREE.Matrix4();
      const pos = new THREE.Vector3(...(b.pos || [0, 0, 0]));
      const rot = new THREE.Euler(...(b.rot || [0, 0, 0]));
      matrix.compose(pos, new THREE.Quaternion().setFromEuler(rot), new THREE.Vector3(1, 1, 1));
      geo.applyMatrix4(matrix);

      geo.clearGroups();
      const count = geo.index ? geo.index.count : geo.attributes.position.count;
      geo.addGroup(0, count, b.matIndex ?? 0);
      geometries.push(geo);
    }
    const merged = BufferGeometryUtils.mergeGeometries(geometries, true);
    geometries.forEach((g) => g.dispose());
    return merged || new THREE.BufferGeometry();
  }

  /**
   * Helper to create a sub-mesh, configure shadows, and register with rig's original materials map.
   */
  private static createPartMesh(
    geo: THREE.BufferGeometry,
    materials: THREE.Material | THREE.Material[],
    rig: CreatureRig
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geo, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    rig.originalMaterials.set(mesh, materials);
    return mesh;
  }

  // =========================================================================
  // 1. AURELION CRYSTAL STAG (Herbivore Fauna)
  // =========================================================================
  public static buildStag(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('stag', variant);

    const rig: CreatureRig = {
      modelType: 'stag',
      locomotion: 'quadruped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      legFL: new THREE.Group(),
      legFR: new THREE.Group(),
      legBL: new THREE.Group(),
      legBR: new THREE.Group(),
      tail: new THREE.Group(),
      shadowBaseScale: 1.25,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    // Cached Geometries
    const torsoGeo = EntityModelCache.getPartGeometry('stag_torso', () =>
      this.buildPartGeometry([
        // Main contoured barrel body
        { size: [0.68, 0.58, 1.15], pos: [0, 0, 0], matIndex: 0 },
        // Muscular shoulder hump
        { size: [0.56, 0.26, 0.42], pos: [0, 0.22, 0.28], matIndex: 0 },
        // White fur bib / chest tuft
        { size: [0.44, 0.38, 0.32], pos: [0, -0.05, 0.52], matIndex: 1 },
        // Flank haunches
        { size: [0.72, 0.45, 0.45], pos: [0, 0.05, -0.35], matIndex: 0 },
        // Neck base
        { size: [0.32, 0.48, 0.35], pos: [0, 0.36, 0.48], rot: [-0.35, 0, 0], matIndex: 0 },
      ])
    );

    const headGeo = EntityModelCache.getPartGeometry('stag_head', () =>
      this.buildPartGeometry([
        // Cranium
        { size: [0.34, 0.34, 0.42], pos: [0, 0, 0], matIndex: 0 },
        // Muzzle / snout
        { size: [0.22, 0.20, 0.34], pos: [0, -0.07, 0.32], matIndex: 0 },
        // Dark nose tip
        { size: [0.12, 0.08, 0.08], pos: [0, -0.03, 0.49], matIndex: 2 },
        // Left Ear
        { size: [0.08, 0.24, 0.12], pos: [0.18, 0.22, -0.1], rot: [0, -0.2, -0.35], matIndex: 0 },
        // Right Ear
        { size: [0.08, 0.24, 0.12], pos: [-0.18, 0.22, -0.1], rot: [0, 0.2, 0.35], matIndex: 0 },
        // Left Eye (Socket + pupil)
        { size: [0.04, 0.06, 0.06], pos: [0.175, 0.05, 0.12], matIndex: 2 },
        { size: [0.045, 0.04, 0.04], pos: [0.178, 0.05, 0.13], matIndex: 3 }, // Glowing cyan iris
        // Right Eye
        { size: [0.04, 0.06, 0.06], pos: [-0.175, 0.05, 0.12], matIndex: 2 },
        { size: [0.045, 0.04, 0.04], pos: [-0.178, 0.05, 0.13], matIndex: 3 },
        // Aurelion Crystal Antlers (Branching Tines)
        // Left main beam
        { size: [0.07, 0.45, 0.07], pos: [0.14, 0.34, -0.05], rot: [-0.2, 0.1, -0.25], matIndex: 1 },
        { size: [0.06, 0.32, 0.06], pos: [0.24, 0.62, -0.12], rot: [-0.35, 0.15, -0.4], matIndex: 1 },
        // Left brow tine
        { size: [0.05, 0.22, 0.05], pos: [0.16, 0.42, 0.08], rot: [0.45, 0.1, -0.2], matIndex: 1 },
        // Right main beam
        { size: [0.07, 0.45, 0.07], pos: [-0.14, 0.34, -0.05], rot: [-0.2, -0.1, 0.25], matIndex: 1 },
        { size: [0.06, 0.32, 0.06], pos: [-0.24, 0.62, -0.12], rot: [-0.35, -0.15, 0.4], matIndex: 1 },
        // Right brow tine
        { size: [0.05, 0.22, 0.05], pos: [-0.16, 0.42, 0.08], rot: [0.45, -0.1, 0.2], matIndex: 1 },
      ])
    );

    const legFrontGeo = EntityModelCache.getPartGeometry('stag_leg_front', () =>
      this.buildPartGeometry([
        // Shoulder / upper leg
        { size: [0.16, 0.36, 0.16], pos: [0, -0.18, 0], matIndex: 0 },
        // Slender lower leg
        { size: [0.11, 0.36, 0.11], pos: [0, -0.52, -0.02], matIndex: 0 },
        // Cloven hoof
        { size: [0.13, 0.12, 0.15], pos: [0, -0.72, 0.01], matIndex: 1 },
      ])
    );

    const legBackGeo = EntityModelCache.getPartGeometry('stag_leg_back', () =>
      this.buildPartGeometry([
        // Muscular thigh
        { size: [0.18, 0.38, 0.22], pos: [0, -0.18, 0], matIndex: 0 },
        // Hock and slender lower leg
        { size: [0.11, 0.38, 0.11], pos: [0, -0.52, -0.02], matIndex: 0 },
        // Cloven hoof
        { size: [0.13, 0.12, 0.15], pos: [0, -0.72, 0.01], matIndex: 1 },
      ])
    );

    const tailGeo = EntityModelCache.getPartGeometry('stag_tail', () =>
      this.buildPartGeometry([
        { size: [0.12, 0.22, 0.1], pos: [0, -0.1, -0.06], rot: [-0.35, 0, 0], matIndex: 0 },
        { size: [0.14, 0.12, 0.08], pos: [0, -0.2, -0.1], matIndex: 1 }, // white tip
      ])
    );

    // Assemble Materials
    const torsoMats = [palette.body, palette.accent];
    const headMats = [palette.body, palette.horn!, palette.eye, palette.secondaryEye!];
    const legMats = [palette.limb!, palette.accent];
    const tailMats = [palette.body, palette.accent];

    // Build Hierarchy
    const torsoMesh = this.createPartMesh(torsoGeo, torsoMats, rig);
    rig.torso.add(torsoMesh);
    rig.torso.position.set(0, 0.85, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    const headMesh = this.createPartMesh(headGeo, headMats, rig);
    rig.head!.add(headMesh);
    rig.head!.position.set(0, 0.62, 0.72);
    rig.initialHeadPos = rig.head!.position.clone();
    rig.torso.add(rig.head!);

    const tailMesh = this.createPartMesh(tailGeo, tailMats, rig);
    rig.tail!.add(tailMesh);
    rig.tail!.position.set(0, 0.18, -0.58);
    rig.torso.add(rig.tail!);

    // Limbs pivoted at hip/shoulder joints
    rig.legFL!.add(this.createPartMesh(legFrontGeo, legMats, rig));
    rig.legFL!.position.set(0.26, 0.76, 0.42);

    rig.legFR!.add(this.createPartMesh(legFrontGeo, legMats, rig));
    rig.legFR!.position.set(-0.26, 0.76, 0.42);

    rig.legBL!.add(this.createPartMesh(legBackGeo, legMats, rig));
    rig.legBL!.position.set(0.26, 0.76, -0.38);

    rig.legBR!.add(this.createPartMesh(legBackGeo, legMats, rig));
    rig.legBR!.position.set(-0.26, 0.76, -0.38);

    root.add(rig.torso);
    root.add(rig.legFL!);
    root.add(rig.legFR!);
    root.add(rig.legBL!);
    root.add(rig.legBR!);

    // Contact shadow
    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 2. WOOLBEAST (Fluffy Livestock Quadruped)
  // =========================================================================
  public static buildWoolbeast(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('woolbeast', variant);

    const rig: CreatureRig = {
      modelType: 'woolbeast',
      locomotion: 'quadruped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      legFL: new THREE.Group(),
      legFR: new THREE.Group(),
      legBL: new THREE.Group(),
      legBR: new THREE.Group(),
      tail: new THREE.Group(),
      shadowBaseScale: 1.15,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    // Stepped layered fleece geometry for fluffy sheep volume
    const torsoGeo = EntityModelCache.getPartGeometry('woolbeast_torso', () =>
      this.buildPartGeometry([
        // Core fleece body
        { size: [0.82, 0.72, 1.1], pos: [0, 0, 0], matIndex: 0 },
        // Side wool bulges
        { size: [0.94, 0.62, 0.95], pos: [0, 0.02, 0], matIndex: 0 },
        // Top wool ridges
        { size: [0.76, 0.22, 1.02], pos: [0, 0.38, 0], matIndex: 0 },
        // Neck wool ruffle
        { size: [0.68, 0.58, 0.38], pos: [0, 0.18, 0.52], matIndex: 0 },
      ])
    );

    const headGeo = EntityModelCache.getPartGeometry('woolbeast_head', () =>
      this.buildPartGeometry([
        // Face / cranium
        { size: [0.38, 0.38, 0.42], pos: [0, 0, 0], matIndex: 1 },
        // Woolly forehead crown tuft
        { size: [0.42, 0.22, 0.38], pos: [0, 0.2, -0.05], matIndex: 0 },
        // Snout
        { size: [0.24, 0.2, 0.24], pos: [0, -0.08, 0.25], matIndex: 1 },
        // Nose
        { size: [0.12, 0.06, 0.06], pos: [0, -0.06, 0.37], matIndex: 2 },
        // Curled Horns
        { size: [0.1, 0.22, 0.12], pos: [0.22, 0.16, -0.08], rot: [0.2, 0, -0.45], matIndex: 2 },
        { size: [0.1, 0.22, 0.12], pos: [-0.22, 0.16, -0.08], rot: [0.2, 0, 0.45], matIndex: 2 },
        // Drooping cute ears
        { size: [0.18, 0.08, 0.1], pos: [0.24, 0.06, 0.02], rot: [0, 0, -0.3], matIndex: 1 },
        { size: [0.18, 0.08, 0.1], pos: [-0.24, 0.06, 0.02], rot: [0, 0, 0.3], matIndex: 1 },
        // Big expressive eyes
        { size: [0.04, 0.08, 0.08], pos: [0.192, 0.04, 0.12], matIndex: 2 },
        { size: [0.04, 0.08, 0.08], pos: [-0.192, 0.04, 0.12], matIndex: 2 },
      ])
    );

    const legGeo = EntityModelCache.getPartGeometry('woolbeast_leg', () =>
      this.buildPartGeometry([
        // Upper leg with wool puff
        { size: [0.22, 0.22, 0.22], pos: [0, -0.11, 0], matIndex: 0 },
        // Slender hooved lower leg
        { size: [0.15, 0.32, 0.15], pos: [0, -0.34, 0], matIndex: 1 },
        // Dark hoof
        { size: [0.17, 0.1, 0.18], pos: [0, -0.52, 0.01], matIndex: 2 },
      ])
    );

    const tailGeo = EntityModelCache.getPartGeometry('woolbeast_tail', () =>
      this.buildPartGeometry([
        { size: [0.18, 0.18, 0.18], pos: [0, 0, 0], matIndex: 0 }, // fluffy wool puff
      ])
    );

    const torsoMats = [palette.body];
    const headMats = [palette.body, palette.limb!, palette.accent];
    const legMats = [palette.body, palette.limb!, palette.accent];

    const torsoMesh = this.createPartMesh(torsoGeo, torsoMats, rig);
    rig.torso.add(torsoMesh);
    rig.torso.position.set(0, 0.65, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    const headMesh = this.createPartMesh(headGeo, headMats, rig);
    rig.head!.add(headMesh);
    rig.head!.position.set(0, 0.35, 0.65);
    rig.initialHeadPos = rig.head!.position.clone();
    rig.torso.add(rig.head!);

    const tailMesh = this.createPartMesh(tailGeo, [palette.body], rig);
    rig.tail!.add(tailMesh);
    rig.tail!.position.set(0, 0.15, -0.58);
    rig.torso.add(rig.tail!);

    // Limbs
    rig.legFL!.add(this.createPartMesh(legGeo, legMats, rig));
    rig.legFL!.position.set(0.3, 0.58, 0.36);

    rig.legFR!.add(this.createPartMesh(legGeo, legMats, rig));
    rig.legFR!.position.set(-0.3, 0.58, 0.36);

    rig.legBL!.add(this.createPartMesh(legGeo, legMats, rig));
    rig.legBL!.position.set(0.3, 0.58, -0.36);

    rig.legBR!.add(this.createPartMesh(legGeo, legMats, rig));
    rig.legBR!.position.set(-0.3, 0.58, -0.36);

    root.add(rig.torso);
    root.add(rig.legFL!);
    root.add(rig.legFR!);
    root.add(rig.legBL!);
    root.add(rig.legBR!);

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 3. IRONHIDE GRAZEBACK (Heavy Armored Bovine)
  // =========================================================================
  public static buildGrazeback(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('grazeback', variant);

    const rig: CreatureRig = {
      modelType: 'grazeback',
      locomotion: 'quadruped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      legFL: new THREE.Group(),
      legFR: new THREE.Group(),
      legBL: new THREE.Group(),
      legBR: new THREE.Group(),
      tail: new THREE.Group(),
      shadowBaseScale: 1.45,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('grazeback_torso', () =>
      this.buildPartGeometry([
        // Massive barrel body
        { size: [0.94, 0.82, 1.45], pos: [0, 0, 0], matIndex: 0 },
        // Dorsal stone carapace plate
        { size: [0.88, 0.22, 1.35], pos: [0, 0.44, -0.05], matIndex: 1 },
        // Armored spine scutes / ridges
        { size: [0.35, 0.18, 1.15], pos: [0, 0.58, -0.05], matIndex: 1 },
        // Heavy dewlap chest
        { size: [0.72, 0.45, 0.45], pos: [0, -0.15, 0.55], matIndex: 0 },
      ])
    );

    const headGeo = EntityModelCache.getPartGeometry('grazeback_head', () =>
      this.buildPartGeometry([
        // Broad armored bovine head
        { size: [0.48, 0.46, 0.52], pos: [0, 0, 0], matIndex: 0 },
        // Frontal brow armor plate
        { size: [0.52, 0.22, 0.35], pos: [0, 0.18, 0.08], matIndex: 1 },
        // Heavy snout & nostrils
        { size: [0.38, 0.28, 0.32], pos: [0, -0.12, 0.32], matIndex: 0 },
        // Curved brow horns
        { size: [0.14, 0.32, 0.14], pos: [0.32, 0.24, -0.05], rot: [0.2, 0, -0.65], matIndex: 2 },
        { size: [0.14, 0.32, 0.14], pos: [-0.32, 0.24, -0.05], rot: [0.2, 0, 0.65], matIndex: 2 },
        // Expressive eyes with amber pupil
        { size: [0.04, 0.08, 0.08], pos: [0.242, 0.06, 0.12], matIndex: 3 },
        { size: [0.045, 0.05, 0.05], pos: [0.245, 0.06, 0.13], matIndex: 4 },
        { size: [0.04, 0.08, 0.08], pos: [-0.242, 0.06, 0.12], matIndex: 3 },
        { size: [0.045, 0.05, 0.05], pos: [-0.245, 0.06, 0.13], matIndex: 4 },
      ])
    );

    const legGeo = EntityModelCache.getPartGeometry('grazeback_leg', () =>
      this.buildPartGeometry([
        // Massive pillar leg
        { size: [0.26, 0.35, 0.26], pos: [0, -0.17, 0], matIndex: 0 },
        { size: [0.22, 0.35, 0.22], pos: [0, -0.48, 0], matIndex: 0 },
        // Heavy stone hoof
        { size: [0.28, 0.12, 0.3], pos: [0, -0.68, 0.02], matIndex: 1 },
      ])
    );

    const tailGeo = EntityModelCache.getPartGeometry('grazeback_tail', () =>
      this.buildPartGeometry([
        { size: [0.1, 0.35, 0.1], pos: [0, -0.18, -0.05], rot: [-0.2, 0, 0], matIndex: 0 },
        { size: [0.18, 0.18, 0.18], pos: [0, -0.38, -0.08], matIndex: 1 }, // tuft
      ])
    );

    const torsoMats = [palette.body, palette.accent];
    const headMats = [palette.body, palette.accent, palette.horn!, palette.eye, palette.secondaryEye!];
    const legMats = [palette.limb!, palette.accent];

    const torsoMesh = this.createPartMesh(torsoGeo, torsoMats, rig);
    rig.torso.add(torsoMesh);
    rig.torso.position.set(0, 0.78, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    const headMesh = this.createPartMesh(headGeo, headMats, rig);
    rig.head!.add(headMesh);
    rig.head!.position.set(0, 0.2, 0.85);
    rig.initialHeadPos = rig.head!.position.clone();
    rig.torso.add(rig.head!);

    const tailMesh = this.createPartMesh(tailGeo, torsoMats, rig);
    rig.tail!.add(tailMesh);
    rig.tail!.position.set(0, 0.22, -0.72);
    rig.torso.add(rig.tail!);

    // Limbs
    rig.legFL!.add(this.createPartMesh(legGeo, legMats, rig));
    rig.legFL!.position.set(0.35, 0.72, 0.48);

    rig.legFR!.add(this.createPartMesh(legGeo, legMats, rig));
    rig.legFR!.position.set(-0.35, 0.72, 0.48);

    rig.legBL!.add(this.createPartMesh(legGeo, legMats, rig));
    rig.legBL!.position.set(0.35, 0.72, -0.48);

    rig.legBR!.add(this.createPartMesh(legGeo, legMats, rig));
    rig.legBR!.position.set(-0.35, 0.72, -0.48);

    root.add(rig.torso);
    root.add(rig.legFL!);
    root.add(rig.legFR!);
    root.add(rig.legBL!);
    root.add(rig.legBR!);

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 4. SHADOW WOLF (Predator Pack Hunter)
  // =========================================================================
  public static buildShadowWolf(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('wolf', variant);

    const rig: CreatureRig = {
      modelType: 'wolf',
      locomotion: 'quadruped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      legFL: new THREE.Group(),
      legFR: new THREE.Group(),
      legBL: new THREE.Group(),
      legBR: new THREE.Group(),
      tail: new THREE.Group(),
      shadowBaseScale: 1.1,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('wolf_torso', () =>
      this.buildPartGeometry([
        // Deep muscular chest
        { size: [0.52, 0.54, 0.65], pos: [0, 0.05, 0.25], matIndex: 0 },
        // Tapered lean flank & waist
        { size: [0.42, 0.44, 0.55], pos: [0, 0, -0.3], matIndex: 0 },
        // Dark dorsal mane/spine
        { size: [0.36, 0.18, 0.85], pos: [0, 0.28, 0.05], matIndex: 1 },
      ])
    );

    const headGeo = EntityModelCache.getPartGeometry('wolf_head', () =>
      this.buildPartGeometry([
        // Cranium
        { size: [0.35, 0.35, 0.38], pos: [0, 0, 0], matIndex: 0 },
        // Elongated predator snout
        { size: [0.22, 0.18, 0.35], pos: [0, -0.06, 0.3], matIndex: 1 },
        // Dark nose
        { size: [0.12, 0.08, 0.08], pos: [0, -0.02, 0.48], matIndex: 1 },
        // White voxel fangs
        { size: [0.04, 0.08, 0.04], pos: [0.08, -0.15, 0.35], matIndex: 2 },
        { size: [0.04, 0.08, 0.04], pos: [-0.08, -0.15, 0.35], matIndex: 2 },
        // Pointed triangular ears
        { size: [0.08, 0.22, 0.1], pos: [0.14, 0.24, -0.06], rot: [0, 0, -0.2], matIndex: 0 },
        { size: [0.08, 0.22, 0.1], pos: [-0.14, 0.24, -0.06], rot: [0, 0, 0.2], matIndex: 0 },
        // Glowing fierce hunter eyes
        { size: [0.04, 0.06, 0.06], pos: [0.176, 0.05, 0.12], matIndex: 3 },
        { size: [0.045, 0.04, 0.04], pos: [0.178, 0.05, 0.13], matIndex: 4 }, // Glowing red pupil
        { size: [0.04, 0.06, 0.06], pos: [-0.176, 0.05, 0.12], matIndex: 3 },
        { size: [0.045, 0.04, 0.04], pos: [-0.178, 0.05, 0.13], matIndex: 4 },
      ])
    );

    const legGeo = EntityModelCache.getPartGeometry('wolf_leg', () =>
      this.buildPartGeometry([
        { size: [0.14, 0.3, 0.14], pos: [0, -0.15, 0], matIndex: 0 },
        { size: [0.1, 0.3, 0.1], pos: [0, -0.42, 0], matIndex: 0 },
        // Paw
        { size: [0.13, 0.08, 0.16], pos: [0, -0.58, 0.02], matIndex: 1 },
      ])
    );

    const tailGeo = EntityModelCache.getPartGeometry('wolf_tail', () =>
      this.buildPartGeometry([
        { size: [0.14, 0.45, 0.14], pos: [0, -0.2, -0.1], rot: [-0.35, 0, 0], matIndex: 0 },
        { size: [0.12, 0.18, 0.12], pos: [0, -0.42, -0.2], matIndex: 1 },
      ])
    );

    const torsoMats = [palette.body, palette.accent];
    const headMats = [palette.body, palette.accent, palette.horn!, palette.eye, palette.secondaryEye!];
    const legMats = [palette.limb!, palette.accent];

    const torsoMesh = this.createPartMesh(torsoGeo, torsoMats, rig);
    rig.torso.add(torsoMesh);
    rig.torso.position.set(0, 0.65, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    const headMesh = this.createPartMesh(headGeo, headMats, rig);
    rig.head!.add(headMesh);
    rig.head!.position.set(0, 0.32, 0.58);
    rig.initialHeadPos = rig.head!.position.clone();
    rig.torso.add(rig.head!);

    const tailMesh = this.createPartMesh(tailGeo, torsoMats, rig);
    rig.tail!.add(tailMesh);
    rig.tail!.position.set(0, 0.12, -0.56);
    rig.torso.add(rig.tail!);

    // Limbs
    rig.legFL!.add(this.createPartMesh(legGeo, legMats, rig));
    rig.legFL!.position.set(0.19, 0.6, 0.38);

    rig.legFR!.add(this.createPartMesh(legGeo, legMats, rig));
    rig.legFR!.position.set(-0.19, 0.6, 0.38);

    rig.legBL!.add(this.createPartMesh(legGeo, legMats, rig));
    rig.legBL!.position.set(0.18, 0.6, -0.38);

    rig.legBR!.add(this.createPartMesh(legGeo, legMats, rig));
    rig.legBR!.position.set(-0.18, 0.6, -0.38);

    root.add(rig.torso);
    root.add(rig.legFL!);
    root.add(rig.legFR!);
    root.add(rig.legBL!);
    root.add(rig.legBR!);

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 5. LUMINESCENT GLOWHEN (Feathered Poultry)
  // =========================================================================
  public static buildGlowhen(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('glowhen', variant);

    const rig: CreatureRig = {
      modelType: 'glowhen',
      locomotion: 'biped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      legL: new THREE.Group(),
      legR: new THREE.Group(),
      wingL: new THREE.Group(),
      wingR: new THREE.Group(),
      tail: new THREE.Group(),
      shadowBaseScale: 0.6,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('glowhen_torso', () =>
      this.buildPartGeometry([
        // Plump body
        { size: [0.38, 0.36, 0.48], pos: [0, 0, 0], matIndex: 0 },
        // Breast
        { size: [0.32, 0.28, 0.22], pos: [0, 0.05, 0.24], matIndex: 0 },
      ])
    );

    const headGeo = EntityModelCache.getPartGeometry('glowhen_head', () =>
      this.buildPartGeometry([
        // Head
        { size: [0.22, 0.26, 0.22], pos: [0, 0, 0], matIndex: 0 },
        // Red comb
        { size: [0.06, 0.16, 0.2], pos: [0, 0.18, -0.02], matIndex: 1 },
        // Red wattle
        { size: [0.06, 0.12, 0.08], pos: [0, -0.14, 0.1], matIndex: 1 },
        // Orange beak
        { size: [0.1, 0.08, 0.14], pos: [0, -0.04, 0.16], matIndex: 2 },
        // Beaded eyes
        { size: [0.03, 0.05, 0.05], pos: [0.115, 0.04, 0.05], matIndex: 3 },
        { size: [0.03, 0.05, 0.05], pos: [-0.115, 0.04, 0.05], matIndex: 3 },
      ])
    );

    const wingGeo = EntityModelCache.getPartGeometry('glowhen_wing', () =>
      this.buildPartGeometry([
        { size: [0.06, 0.24, 0.35], pos: [0, -0.1, 0], rot: [0.1, 0, 0], matIndex: 0 },
      ])
    );

    const tailGeo = EntityModelCache.getPartGeometry('glowhen_tail', () =>
      this.buildPartGeometry([
        // Bioluminescent fan tail plumes
        { size: [0.22, 0.32, 0.12], pos: [0, 0.12, -0.08], rot: [-0.4, 0, 0], matIndex: 0 },
      ])
    );

    const legGeo = EntityModelCache.getPartGeometry('glowhen_leg', () =>
      this.buildPartGeometry([
        { size: [0.05, 0.24, 0.05], pos: [0, -0.12, 0], matIndex: 0 },
        // Claw foot
        { size: [0.1, 0.03, 0.12], pos: [0, -0.24, 0.02], matIndex: 0 },
      ])
    );

    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body], rig);
    rig.torso.add(torsoMesh);
    rig.torso.position.set(0, 0.36, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.horn!, palette.accent, palette.eye], rig);
    rig.head!.add(headMesh);
    rig.head!.position.set(0, 0.26, 0.2);
    rig.initialHeadPos = rig.head!.position.clone();
    rig.torso.add(rig.head!);

    const tailMesh = this.createPartMesh(tailGeo, [palette.secondaryEye!], rig);
    rig.tail!.add(tailMesh);
    rig.tail!.position.set(0, 0.14, -0.24);
    rig.torso.add(rig.tail!);

    // Side Wings
    rig.wingL!.add(this.createPartMesh(wingGeo, [palette.body], rig));
    rig.wingL!.position.set(0.2, 0.08, 0);
    rig.torso.add(rig.wingL!);

    rig.wingR!.add(this.createPartMesh(wingGeo, [palette.body], rig));
    rig.wingR!.position.set(-0.2, 0.08, 0);
    rig.torso.add(rig.wingR!);

    // Legs
    rig.legL!.add(this.createPartMesh(legGeo, [palette.accent], rig));
    rig.legL!.position.set(0.1, 0.25, 0.02);

    rig.legR!.add(this.createPartMesh(legGeo, [palette.accent], rig));
    rig.legR!.position.set(-0.1, 0.25, 0.02);

    root.add(rig.torso);
    root.add(rig.legL!);
    root.add(rig.legR!);

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 6. ASTRAL CRYSTAL BEE (Aether Insect)
  // =========================================================================
  public static buildCrystalBee(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('bee', variant);

    const rig: CreatureRig = {
      modelType: 'bee',
      locomotion: 'flying',
      root,
      torso: new THREE.Group(),
      wingL: new THREE.Group(),
      wingR: new THREE.Group(),
      shadowBaseScale: 0.5,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    const bodyGeo = EntityModelCache.getPartGeometry('bee_body', () =>
      this.buildPartGeometry([
        // Head with antennae
        { size: [0.22, 0.22, 0.2], pos: [0, 0, 0.22], matIndex: 0 },
        { size: [0.03, 0.14, 0.03], pos: [0.06, 0.14, 0.28], rot: [0.3, 0, 0.2], matIndex: 1 },
        { size: [0.03, 0.14, 0.03], pos: [-0.06, 0.14, 0.28], rot: [0.3, 0, -0.2], matIndex: 1 },
        // Faceted eyes
        { size: [0.05, 0.08, 0.08], pos: [0.11, 0.02, 0.24], matIndex: 2 },
        { size: [0.05, 0.08, 0.08], pos: [-0.11, 0.02, 0.24], matIndex: 2 },
        // Striped golden-amber abdomen
        { size: [0.28, 0.28, 0.35], pos: [0, 0, -0.05], matIndex: 0 },
        { size: [0.29, 0.29, 0.12], pos: [0, 0, -0.05], matIndex: 1 }, // dark band
        // Glowing cyan stinger
        { size: [0.05, 0.05, 0.14], pos: [0, -0.02, -0.28], matIndex: 3 },
      ])
    );

    const wingGeo = EntityModelCache.getPartGeometry('bee_wing', () =>
      this.buildPartGeometry([
        // Translucent crystal wing
        { size: [0.28, 0.02, 0.2], pos: [0.14, 0, 0], rot: [0, 0, 0.15], matIndex: 0 },
      ])
    );

    const bodyMesh = this.createPartMesh(bodyGeo, [palette.body, palette.accent, palette.eye, palette.horn!], rig);
    rig.torso.add(bodyMesh);
    rig.torso.position.set(0, 0.55, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    rig.wingL!.add(this.createPartMesh(wingGeo, [palette.secondaryEye!], rig));
    rig.wingL!.position.set(0.12, 0.12, 0);
    rig.torso.add(rig.wingL!);

    const wingRGeo = wingGeo.clone().scale(-1, 1, 1);
    rig.wingR!.add(this.createPartMesh(wingRGeo, [palette.secondaryEye!], rig));
    rig.wingR!.position.set(-0.12, 0.12, 0);
    rig.torso.add(rig.wingR!);

    root.add(rig.torso);

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 7. AZURE GLOWFIN (Aquatic Water Life)
  // =========================================================================
  public static buildGlowfin(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('glowfin', variant);

    const rig: CreatureRig = {
      modelType: 'glowfin',
      locomotion: 'aquatic',
      root,
      torso: new THREE.Group(),
      tail: new THREE.Group(),
      armL: new THREE.Group(), // pectoral fin L
      armR: new THREE.Group(), // pectoral fin R
      shadowBaseScale: 0.7,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    const bodyGeo = EntityModelCache.getPartGeometry('glowfin_body', () =>
      this.buildPartGeometry([
        // Sleek torpedo body
        { size: [0.2, 0.32, 0.55], pos: [0, 0, 0.1], matIndex: 0 },
        // Bioluminescent lateral streak
        { size: [0.22, 0.05, 0.45], pos: [0, 0, 0.1], matIndex: 1 },
        // Dorsal fin
        { size: [0.03, 0.22, 0.28], pos: [0, 0.22, 0], rot: [-0.3, 0, 0], matIndex: 2 },
        // Eyes
        { size: [0.04, 0.06, 0.06], pos: [0.105, 0.04, 0.26], matIndex: 3 },
        { size: [0.04, 0.06, 0.06], pos: [-0.105, 0.04, 0.26], matIndex: 3 },
      ])
    );

    const tailGeo = EntityModelCache.getPartGeometry('glowfin_tail', () =>
      this.buildPartGeometry([
        // Caudal peduncle
        { size: [0.12, 0.2, 0.3], pos: [0, 0, -0.15], matIndex: 0 },
        // Bifurcated caudal fin
        { size: [0.02, 0.38, 0.26], pos: [0, 0, -0.36], matIndex: 2 },
      ])
    );

    const finGeo = EntityModelCache.getPartGeometry('glowfin_fin', () =>
      this.buildPartGeometry([
        { size: [0.18, 0.02, 0.15], pos: [0.09, 0, 0], rot: [0, 0.2, 0.3], matIndex: 2 },
      ])
    );

    const bodyMats = [palette.body, palette.accent, palette.secondaryEye!, palette.eye];
    const bodyMesh = this.createPartMesh(bodyGeo, bodyMats, rig);
    rig.torso.add(bodyMesh);
    rig.torso.position.set(0, 0.4, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    const tailMesh = this.createPartMesh(tailGeo, [palette.body, palette.accent, palette.secondaryEye!], rig);
    rig.tail!.add(tailMesh);
    rig.tail!.position.set(0, 0, -0.15);
    rig.torso.add(rig.tail!);

    // Pectoral fins
    rig.armL!.add(this.createPartMesh(finGeo, [palette.secondaryEye!], rig));
    rig.armL!.position.set(0.1, -0.05, 0.15);
    rig.torso.add(rig.armL!);

    const finRGeo = finGeo.clone().scale(-1, 1, 1);
    rig.armR!.add(this.createPartMesh(finRGeo, [palette.secondaryEye!], rig));
    rig.armR!.position.set(-0.1, -0.05, 0.15);
    rig.torso.add(rig.armR!);

    root.add(rig.torso);

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 8. VOID LYNX (Rare Aether Predator)
  // =========================================================================
  public static buildVoidLynx(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('void_lynx', variant);

    const rig: CreatureRig = {
      modelType: 'void_lynx',
      locomotion: 'quadruped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      legFL: new THREE.Group(),
      legFR: new THREE.Group(),
      legBL: new THREE.Group(),
      legBR: new THREE.Group(),
      tail: new THREE.Group(),
      shadowBaseScale: 1.05,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('void_lynx_torso', () =>
      this.buildPartGeometry([
        // Sleek athletic feline torso
        { size: [0.46, 0.44, 0.95], pos: [0, 0, 0], matIndex: 0 },
        // High shoulder blades
        { size: [0.48, 0.2, 0.38], pos: [0, 0.18, 0.2], matIndex: 1 },
      ])
    );

    const headGeo = EntityModelCache.getPartGeometry('void_lynx_head', () =>
      this.buildPartGeometry([
        // Feline head
        { size: [0.34, 0.32, 0.36], pos: [0, 0, 0], matIndex: 0 },
        // Snout & whisker pads
        { size: [0.2, 0.15, 0.22], pos: [0, -0.06, 0.22], matIndex: 1 },
        // Tufted lynx ears
        { size: [0.08, 0.22, 0.08], pos: [0.14, 0.22, -0.04], rot: [0, 0, -0.2], matIndex: 0 },
        { size: [0.04, 0.12, 0.04], pos: [0.18, 0.35, -0.04], matIndex: 2 }, // purple ear tuft
        { size: [0.08, 0.22, 0.08], pos: [-0.14, 0.22, -0.04], rot: [0, 0, 0.2], matIndex: 0 },
        { size: [0.04, 0.12, 0.04], pos: [-0.18, 0.35, -0.04], matIndex: 2 },
        // Glowing violet eyes
        { size: [0.04, 0.06, 0.06], pos: [0.172, 0.05, 0.1], matIndex: 3 },
        { size: [0.045, 0.04, 0.04], pos: [0.175, 0.05, 0.11], matIndex: 4 },
        { size: [0.04, 0.06, 0.06], pos: [-0.172, 0.05, 0.1], matIndex: 3 },
        { size: [0.045, 0.04, 0.04], pos: [-0.175, 0.05, 0.11], matIndex: 4 },
      ])
    );

    const legGeo = EntityModelCache.getPartGeometry('void_lynx_leg', () =>
      this.buildPartGeometry([
        { size: [0.13, 0.28, 0.13], pos: [0, -0.14, 0], matIndex: 0 },
        { size: [0.1, 0.26, 0.1], pos: [0, -0.38, 0], matIndex: 0 },
        // Clawed paw with purple glowing claws
        { size: [0.14, 0.08, 0.16], pos: [0, -0.52, 0.02], matIndex: 1 },
      ])
    );

    const tailGeo = EntityModelCache.getPartGeometry('void_lynx_tail', () =>
      this.buildPartGeometry([
        { size: [0.1, 0.24, 0.1], pos: [0, -0.1, -0.06], rot: [-0.4, 0, 0], matIndex: 0 },
        { size: [0.12, 0.1, 0.12], pos: [0, -0.22, -0.12], matIndex: 2 },
      ])
    );

    const torsoMats = [palette.body, palette.accent];
    const headMats = [palette.body, palette.accent, palette.horn!, palette.eye, palette.secondaryEye!];
    const legMats = [palette.limb!, palette.horn!];

    const torsoMesh = this.createPartMesh(torsoGeo, torsoMats, rig);
    rig.torso.add(torsoMesh);
    rig.torso.position.set(0, 0.6, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    const headMesh = this.createPartMesh(headGeo, headMats, rig);
    rig.head!.add(headMesh);
    rig.head!.position.set(0, 0.28, 0.52);
    rig.initialHeadPos = rig.head!.position.clone();
    rig.torso.add(rig.head!);

    const tailMesh = this.createPartMesh(tailGeo, headMats, rig);
    rig.tail!.add(tailMesh);
    rig.tail!.position.set(0, 0.1, -0.48);
    rig.torso.add(rig.tail!);

    // Limbs
    rig.legFL!.add(this.createPartMesh(legGeo, legMats, rig));
    rig.legFL!.position.set(0.18, 0.55, 0.32);

    rig.legFR!.add(this.createPartMesh(legGeo, legMats, rig));
    rig.legFR!.position.set(-0.18, 0.55, 0.32);

    rig.legBL!.add(this.createPartMesh(legGeo, legMats, rig));
    rig.legBL!.position.set(0.18, 0.55, -0.32);

    rig.legBR!.add(this.createPartMesh(legGeo, legMats, rig));
    rig.legBR!.position.set(-0.18, 0.55, -0.32);

    root.add(rig.torso);
    root.add(rig.legFL!);
    root.add(rig.legFR!);
    root.add(rig.legBL!);
    root.add(rig.legBR!);

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 9. SHADOW STALKER (Nocturnal Hostile Predator Biped)
  // =========================================================================
  public static buildShadowStalker(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('stalker', variant);

    const rig: CreatureRig = {
      modelType: 'stalker',
      locomotion: 'biped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      armL: new THREE.Group(),
      armR: new THREE.Group(),
      legL: new THREE.Group(),
      legR: new THREE.Group(),
      shadowBaseScale: 1.15,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('stalker_torso', () =>
      this.buildPartGeometry([
        // Tall hunched torso
        { size: [0.52, 0.95, 0.34], pos: [0, 0, 0], matIndex: 0 },
        // Protruding obsidian vertebrae ridges
        { size: [0.14, 0.85, 0.16], pos: [0, 0.05, -0.2], matIndex: 1 },
        { size: [0.08, 0.14, 0.18], pos: [0, 0.35, -0.24], matIndex: 1 },
        { size: [0.08, 0.14, 0.18], pos: [0, 0.1, -0.24], matIndex: 1 },
      ])
    );

    const headGeo = EntityModelCache.getPartGeometry('stalker_head', () =>
      this.buildPartGeometry([
        // Elongated predator skull
        { size: [0.38, 0.42, 0.42], pos: [0, 0, 0], matIndex: 0 },
        // Sharp lower jaw
        { size: [0.26, 0.16, 0.32], pos: [0, -0.16, 0.14], matIndex: 1 },
        // Piercing crimson eyes with slit pupil
        { size: [0.08, 0.06, 0.06], pos: [0.12, 0.04, 0.21], matIndex: 2 },
        { size: [0.08, 0.06, 0.06], pos: [-0.12, 0.04, 0.21], matIndex: 2 },
      ])
    );

    const armGeo = EntityModelCache.getPartGeometry('stalker_arm', () =>
      this.buildPartGeometry([
        // Long lanky arm
        { size: [0.14, 0.48, 0.14], pos: [0, -0.24, 0], matIndex: 0 },
        { size: [0.11, 0.46, 0.11], pos: [0, -0.66, 0.02], matIndex: 0 },
        // Voxel claw talons
        { size: [0.14, 0.18, 0.16], pos: [0, -0.92, 0.06], matIndex: 1 },
      ])
    );

    const legGeo = EntityModelCache.getPartGeometry('stalker_leg', () =>
      this.buildPartGeometry([
        // Digitigrade leg
        { size: [0.18, 0.42, 0.18], pos: [0, -0.21, 0], matIndex: 0 },
        { size: [0.14, 0.42, 0.14], pos: [0, -0.58, -0.04], matIndex: 0 },
        { size: [0.16, 0.12, 0.24], pos: [0, -0.78, 0.04], matIndex: 1 },
      ])
    );

    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.accent], rig);
    rig.torso.add(torsoMesh);
    rig.torso.position.set(0, 1.15, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.accent, palette.secondaryEye!], rig);
    rig.head!.add(headMesh);
    rig.head!.position.set(0, 0.65, 0.08);
    rig.initialHeadPos = rig.head!.position.clone();
    rig.torso.add(rig.head!);

    // Arms pivoted at shoulders
    rig.armL!.add(this.createPartMesh(armGeo, [palette.body, palette.horn!], rig));
    rig.armL!.position.set(0.36, 0.42, 0);
    rig.torso.add(rig.armL!);

    rig.armR!.add(this.createPartMesh(armGeo, [palette.body, palette.horn!], rig));
    rig.armR!.position.set(-0.36, 0.42, 0);
    rig.torso.add(rig.armR!);

    // Legs
    rig.legL!.add(this.createPartMesh(legGeo, [palette.limb!, palette.accent], rig));
    rig.legL!.position.set(0.18, 0.8, 0);

    rig.legR!.add(this.createPartMesh(legGeo, [palette.limb!, palette.accent], rig));
    rig.legR!.position.set(-0.18, 0.8, 0);

    root.add(rig.torso);
    root.add(rig.legL!);
    root.add(rig.legR!);

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 10. VOID SPITTER (Levitating Aberration)
  // =========================================================================
  public static buildVoidSpitter(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('void_spitter', variant);

    const rig: CreatureRig = {
      modelType: 'void_spitter',
      locomotion: 'aberration',
      root,
      torso: new THREE.Group(),
      shards: [],
      shadowBaseScale: 1.0,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    const coreGeo = EntityModelCache.getPartGeometry('void_spitter_core', () =>
      this.buildPartGeometry([
        // Layered dark void diamond core
        { size: [0.65, 0.65, 0.65], pos: [0, 0, 0], matIndex: 0 },
        { size: [0.55, 0.55, 0.55], pos: [0, 0, 0], rot: [0.4, 0.4, 0], matIndex: 0 },
        // Glowing maw / center eye
        { size: [0.28, 0.28, 0.28], pos: [0, 0, 0.25], matIndex: 1 },
      ])
    );

    const shardGeo = EntityModelCache.getPartGeometry('void_spitter_shard', () =>
      this.buildPartGeometry([
        // Levitating crystal obelisk shard
        { size: [0.16, 0.45, 0.16], pos: [0, 0, 0], matIndex: 0 },
      ])
    );

    const coreMesh = this.createPartMesh(coreGeo, [palette.body, palette.eye], rig);
    rig.torso.add(coreMesh);
    rig.torso.position.set(0, 1.4, 0);
    rig.initialTorsoPos = rig.torso.position.clone();
    root.add(rig.torso);

    // 4 Orbiting crystal shards
    for (let i = 0; i < 4; i++) {
      const shardGroup = new THREE.Group();
      const shardMesh = this.createPartMesh(shardGeo, [palette.accent], rig);
      shardGroup.add(shardMesh);
      rig.shards!.push(shardGroup);
      root.add(shardGroup);
    }

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 11. RUIN SENTINEL MINI-BOSS (Ancient Heavy Golem)
  // =========================================================================
  public static buildRuinSentinel(): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('ruin_sentinel', 0);

    const rig: CreatureRig = {
      modelType: 'ruin_sentinel',
      locomotion: 'boss_golem',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      armL: new THREE.Group(),
      armR: new THREE.Group(),
      legL: new THREE.Group(),
      legR: new THREE.Group(),
      core: new THREE.Group(),
      shadowBaseScale: 2.2,
      animPhase: 0,
      variantIndex: 0,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('sentinel_torso', () =>
      this.buildPartGeometry([
        // Massive monolithic stone chassis
        { size: [1.4, 1.45, 0.95], pos: [0, 0, 0], matIndex: 0 },
        // Heavy pauldrons / shoulder mounts
        { size: [1.8, 0.35, 1.1], pos: [0, 0.6, 0], matIndex: 1 },
        // Heavy abdominal joint
        { size: [0.95, 0.35, 0.75], pos: [0, -0.65, 0], matIndex: 1 },
      ])
    );

    const coreGeo = EntityModelCache.getPartGeometry('sentinel_core', () =>
      this.buildPartGeometry([
        // Cyan glowing chest reactor
        { size: [0.45, 0.45, 0.25], pos: [0, 0.05, 0.42], matIndex: 0 },
      ])
    );

    const headGeo = EntityModelCache.getPartGeometry('sentinel_head', () =>
      this.buildPartGeometry([
        // Stone head
        { size: [0.55, 0.45, 0.55], pos: [0, 0, 0], matIndex: 0 },
        // Glowing horizontal visor slit
        { size: [0.45, 0.1, 0.12], pos: [0, 0, 0.26], matIndex: 1 },
      ])
    );

    const armGeo = EntityModelCache.getPartGeometry('sentinel_arm', () =>
      this.buildPartGeometry([
        // Upper arm with runic plating
        { size: [0.45, 0.6, 0.45], pos: [0, -0.3, 0], matIndex: 0 },
        // Massive crushing stone gauntlet & fist
        { size: [0.55, 0.7, 0.55], pos: [0, -0.85, 0.05], matIndex: 1 },
      ])
    );

    const legGeo = EntityModelCache.getPartGeometry('sentinel_leg', () =>
      this.buildPartGeometry([
        // Sturdy pillar stone leg
        { size: [0.5, 0.55, 0.5], pos: [0, -0.27, 0], matIndex: 0 },
        // Heavy reinforced footplate
        { size: [0.6, 0.45, 0.65], pos: [0, -0.72, 0.05], matIndex: 1 },
      ])
    );

    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.accent], rig);
    rig.torso.add(torsoMesh);
    rig.torso.position.set(0, 1.7, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    // Reactor Core
    const coreMesh = this.createPartMesh(coreGeo, [palette.horn!], rig);
    rig.core!.add(coreMesh);
    rig.torso.add(rig.core!);

    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.secondaryEye!], rig);
    rig.head!.add(headMesh);
    rig.head!.position.set(0, 0.85, 0.12);
    rig.initialHeadPos = rig.head!.position.clone();
    rig.torso.add(rig.head!);

    // Arms
    rig.armL!.add(this.createPartMesh(armGeo, [palette.body, palette.accent], rig));
    rig.armL!.position.set(1.05, 0.6, 0);
    rig.torso.add(rig.armL!);

    rig.armR!.add(this.createPartMesh(armGeo, [palette.body, palette.accent], rig));
    rig.armR!.position.set(-1.05, 0.6, 0);
    rig.torso.add(rig.armR!);

    // Legs
    rig.legL!.add(this.createPartMesh(legGeo, [palette.body, palette.accent], rig));
    rig.legL!.position.set(0.48, 0.95, 0);

    rig.legR!.add(this.createPartMesh(legGeo, [palette.body, palette.accent], rig));
    rig.legR!.position.set(-0.48, 0.95, 0);

    root.add(rig.torso);
    root.add(rig.legL!);
    root.add(rig.legR!);

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 12. VOID SOVEREIGN WORLD BOSS (Cataclysmic World Boss)
  // =========================================================================
  public static buildVoidSovereign(): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('void_sovereign', 0);

    const rig: CreatureRig = {
      modelType: 'void_sovereign',
      locomotion: 'boss_sovereign',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      crown: new THREE.Group(),
      wingL: new THREE.Group(),
      wingR: new THREE.Group(),
      core: new THREE.Group(),
      runes: [],
      shadowBaseScale: 2.8,
      animPhase: 0,
      variantIndex: 0,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('sovereign_torso', () =>
      this.buildPartGeometry([
        // Midnight void stone ribcage
        { size: [0.95, 1.8, 0.65], pos: [0, 0, 0], matIndex: 0 },
        // Pauldrons
        { size: [1.3, 0.35, 0.75], pos: [0, 0.78, 0], matIndex: 0 },
      ])
    );

    const heartGeo = EntityModelCache.getPartGeometry('sovereign_heart', () =>
      this.buildPartGeometry([
        // Pulsing dark purple singularity heart core
        { size: [0.45, 0.45, 0.45], pos: [0, 0.2, 0.28], matIndex: 0 },
      ])
    );

    const headGeo = EntityModelCache.getPartGeometry('sovereign_head', () =>
      this.buildPartGeometry([
        { size: [0.55, 0.6, 0.55], pos: [0, 0, 0], matIndex: 0 },
        // Void eyes
        { size: [0.12, 0.08, 0.08], pos: [0.18, 0.06, 0.26], matIndex: 1 },
        { size: [0.12, 0.08, 0.08], pos: [-0.18, 0.06, 0.26], matIndex: 1 },
      ])
    );

    const crownGeo = EntityModelCache.getPartGeometry('sovereign_crown', () =>
      this.buildPartGeometry([
        // Crown of 5 levitating jagged dark crystals
        { size: [0.12, 0.65, 0.12], pos: [0, 0.45, 0], matIndex: 0 },
        { size: [0.1, 0.5, 0.1], pos: [0.28, 0.35, 0], rot: [0, 0, -0.3], matIndex: 0 },
        { size: [0.1, 0.5, 0.1], pos: [-0.28, 0.35, 0], rot: [0, 0, 0.3], matIndex: 0 },
        { size: [0.08, 0.38, 0.08], pos: [0.45, 0.2, 0], rot: [0, 0, -0.5], matIndex: 0 },
        { size: [0.08, 0.38, 0.08], pos: [-0.45, 0.2, 0], rot: [0, 0, 0.5], matIndex: 0 },
      ])
    );

    const wingGeo = EntityModelCache.getPartGeometry('sovereign_wing', () =>
      this.buildPartGeometry([
        // Segmented void wing
        { size: [1.6, 0.35, 0.12], pos: [0.8, 0, 0], rot: [0, 0, 0.25], matIndex: 0 },
        { size: [1.4, 0.3, 0.1], pos: [1.3, -0.25, 0], rot: [0, 0, -0.15], matIndex: 0 },
        { size: [1.1, 0.25, 0.08], pos: [1.8, -0.5, 0], rot: [0, 0, -0.4], matIndex: 0 },
      ])
    );

    const runeGeo = EntityModelCache.getPartGeometry('sovereign_rune', () =>
      this.buildPartGeometry([
        { size: [0.22, 0.28, 0.08], pos: [0, 0, 0], matIndex: 0 },
      ])
    );

    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body], rig);
    rig.torso.add(torsoMesh);
    rig.torso.position.set(0, 2.2, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    // Singularity Core
    const heartMesh = this.createPartMesh(heartGeo, [palette.belly!], rig);
    rig.core!.add(heartMesh);
    rig.torso.add(rig.core!);

    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.secondaryEye!], rig);
    rig.head!.add(headMesh);
    rig.head!.position.set(0, 1.15, 0);
    rig.initialHeadPos = rig.head!.position.clone();
    rig.torso.add(rig.head!);

    // Crown
    const crownMesh = this.createPartMesh(crownGeo, [palette.accent], rig);
    rig.crown!.add(crownMesh);
    rig.crown!.position.set(0, 0.5, 0);
    rig.head!.add(rig.crown!);

    // Wings
    rig.wingL!.add(this.createPartMesh(wingGeo, [palette.limb!], rig));
    rig.wingL!.position.set(0.45, 0.4, -0.25);
    rig.torso.add(rig.wingL!);

    const wingRGeo = wingGeo.clone().scale(-1, 1, 1);
    rig.wingR!.add(this.createPartMesh(wingRGeo, [palette.limb!], rig));
    rig.wingR!.position.set(-0.45, 0.4, -0.25);
    rig.torso.add(rig.wingR!);

    root.add(rig.torso);

    // 6 Orbiting Rune Tablets
    for (let i = 0; i < 6; i++) {
      const runeGroup = new THREE.Group();
      const runeMesh = this.createPartMesh(runeGeo, [palette.accent], rig);
      runeGroup.add(runeMesh);
      rig.runes!.push(runeGroup);
      root.add(runeGroup);
    }

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 13. NOMADIC MERCHANT NPC
  // =========================================================================
  public static buildMerchant(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('merchant', variant);

    const rig: CreatureRig = {
      modelType: 'merchant',
      locomotion: 'biped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      armL: new THREE.Group(),
      armR: new THREE.Group(),
      legL: new THREE.Group(),
      legR: new THREE.Group(),
      shadowBaseScale: 0.95,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('merchant_torso', () =>
      this.buildPartGeometry([
        // Traveler robe
        { size: [0.54, 0.78, 0.36], pos: [0, 0, 0], matIndex: 0 },
        // Scarf / trim collar
        { size: [0.58, 0.18, 0.4], pos: [0, 0.35, 0], matIndex: 1 },
        // Detailed leather travel backpack
        { size: [0.48, 0.58, 0.38], pos: [0, 0.05, -0.32], matIndex: 2 },
        // Rolled bedroll on top of backpack
        { size: [0.52, 0.18, 0.22], pos: [0, 0.38, -0.32], rot: [0, 0, 1.57], matIndex: 1 },
        // Brass travel lantern hung on side
        { size: [0.12, 0.2, 0.12], pos: [0.3, 0, -0.32], matIndex: 3 },
      ])
    );

    const headGeo = EntityModelCache.getPartGeometry('merchant_head', () =>
      this.buildPartGeometry([
        // Head
        { size: [0.38, 0.38, 0.38], pos: [0, 0, 0], matIndex: 0 },
        // Woven desert hood/turban
        { size: [0.44, 0.24, 0.44], pos: [0, 0.14, 0], matIndex: 1 },
        // Expressive eyes & brows
        { size: [0.08, 0.05, 0.04], pos: [0.1, 0.04, 0.19], matIndex: 2 },
        { size: [0.08, 0.05, 0.04], pos: [-0.1, 0.04, 0.19], matIndex: 2 },
      ])
    );

    const armGeo = EntityModelCache.getPartGeometry('merchant_arm', () =>
      this.buildPartGeometry([
        { size: [0.14, 0.65, 0.14], pos: [0, -0.28, 0], matIndex: 0 },
      ])
    );

    const legGeo = EntityModelCache.getPartGeometry('merchant_leg', () =>
      this.buildPartGeometry([
        { size: [0.18, 0.65, 0.18], pos: [0, -0.28, 0], matIndex: 0 },
      ])
    );

    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.belly!, palette.accent, palette.horn!], rig);
    rig.torso.add(torsoMesh);
    rig.torso.position.set(0, 0.98, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    const headMesh = this.createPartMesh(headGeo, [palette.accent, palette.belly!, palette.eye], rig);
    rig.head!.add(headMesh);
    rig.head!.position.set(0, 0.54, 0);
    rig.initialHeadPos = rig.head!.position.clone();
    rig.torso.add(rig.head!);

    // Arms
    rig.armL!.add(this.createPartMesh(armGeo, [palette.body], rig));
    rig.armL!.position.set(0.34, 0.32, 0);
    rig.torso.add(rig.armL!);

    rig.armR!.add(this.createPartMesh(armGeo, [palette.body], rig));
    rig.armR!.position.set(-0.34, 0.32, 0);
    rig.torso.add(rig.armR!);

    // Legs
    rig.legL!.add(this.createPartMesh(legGeo, [palette.limb!], rig));
    rig.legL!.position.set(0.14, 0.62, 0);

    rig.legR!.add(this.createPartMesh(legGeo, [palette.limb!], rig));
    rig.legR!.position.set(-0.14, 0.62, 0);

    root.add(rig.torso);
    root.add(rig.legL!);
    root.add(rig.legR!);

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 14. SETTLEMENT ELDER NPC
  // =========================================================================
  public static buildElder(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('elder', variant);

    const rig: CreatureRig = {
      modelType: 'elder',
      locomotion: 'biped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      armL: new THREE.Group(),
      armR: new THREE.Group(),
      legL: new THREE.Group(),
      legR: new THREE.Group(),
      shadowBaseScale: 0.95,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('elder_torso', () =>
      this.buildPartGeometry([
        // Elder robe
        { size: [0.55, 0.82, 0.38], pos: [0, 0, 0], matIndex: 0 },
        // Mystic cowl / mantle
        { size: [0.62, 0.28, 0.44], pos: [0, 0.35, 0], matIndex: 1 },
        // Glowing runic amulet
        { size: [0.14, 0.18, 0.08], pos: [0, 0.22, 0.22], matIndex: 2 },
      ])
    );

    const headGeo = EntityModelCache.getPartGeometry('elder_head', () =>
      this.buildPartGeometry([
        // Head
        { size: [0.38, 0.38, 0.38], pos: [0, 0, 0], matIndex: 0 },
        // Venerable white beard
        { size: [0.32, 0.42, 0.2], pos: [0, -0.16, 0.18], matIndex: 1 },
        // Hood
        { size: [0.44, 0.28, 0.44], pos: [0, 0.16, 0], matIndex: 2 },
        // Eyes
        { size: [0.08, 0.05, 0.04], pos: [0.1, 0.04, 0.19], matIndex: 3 },
        { size: [0.08, 0.05, 0.04], pos: [-0.1, 0.04, 0.19], matIndex: 3 },
      ])
    );

    const armGeo = EntityModelCache.getPartGeometry('elder_arm', () =>
      this.buildPartGeometry([
        { size: [0.15, 0.65, 0.15], pos: [0, -0.28, 0], matIndex: 0 },
      ])
    );

    const legGeo = EntityModelCache.getPartGeometry('elder_leg', () =>
      this.buildPartGeometry([
        { size: [0.18, 0.65, 0.18], pos: [0, -0.28, 0], matIndex: 0 },
      ])
    );

    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.accent, palette.horn!], rig);
    rig.torso.add(torsoMesh);
    rig.torso.position.set(0, 0.98, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    const headMesh = this.createPartMesh(headGeo, [palette.accent, palette.belly!, palette.accent, palette.eye], rig);
    rig.head!.add(headMesh);
    rig.head!.position.set(0, 0.54, 0);
    rig.initialHeadPos = rig.head!.position.clone();
    rig.torso.add(rig.head!);

    // Arms
    rig.armL!.add(this.createPartMesh(armGeo, [palette.body], rig));
    rig.armL!.position.set(0.35, 0.32, 0);
    rig.torso.add(rig.armL!);

    rig.armR!.add(this.createPartMesh(armGeo, [palette.body], rig));
    rig.armR!.position.set(-0.35, 0.32, 0);
    rig.torso.add(rig.armR!);

    // Legs
    rig.legL!.add(this.createPartMesh(legGeo, [palette.limb!], rig));
    rig.legL!.position.set(0.14, 0.62, 0);

    rig.legR!.add(this.createPartMesh(legGeo, [palette.limb!], rig));
    rig.legR!.position.set(-0.14, 0.62, 0);

    root.add(rig.torso);
    root.add(rig.legL!);
    root.add(rig.legR!);

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 15. FARMER NPC (Petani Subak / Sawah / Ladang)
  // =========================================================================
  public static buildFarmer(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('farmer', variant);

    const rig: CreatureRig = {
      modelType: 'farmer',
      locomotion: 'biped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      armL: new THREE.Group(),
      armR: new THREE.Group(),
      legL: new THREE.Group(),
      legR: new THREE.Group(),
      shadowBaseScale: 0.95,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('farmer_torso', () =>
      this.buildPartGeometry([
        { size: [0.52, 0.72, 0.32], pos: [0, 0, 0], matIndex: 0 },
        { size: [0.54, 0.22, 0.34], pos: [0, -0.26, 0], matIndex: 1 }, // batik waistband / sarong
      ])
    );

    const headGeo = EntityModelCache.getPartGeometry('farmer_head', () =>
      this.buildPartGeometry([
        { size: [0.36, 0.36, 0.36], pos: [0, 0, 0], matIndex: 0 },
        // Conical Caping Hat
        { size: [0.68, 0.08, 0.68], pos: [0, 0.2, 0], matIndex: 1 },
        { size: [0.44, 0.14, 0.44], pos: [0, 0.28, 0], matIndex: 1 },
        { size: [0.2, 0.12, 0.2], pos: [0, 0.38, 0], matIndex: 1 },
        // Eyes
        { size: [0.06, 0.05, 0.04], pos: [0.09, 0.02, 0.18], matIndex: 2 },
        { size: [0.06, 0.05, 0.04], pos: [-0.09, 0.02, 0.18], matIndex: 2 },
      ])
    );

    const armGeo = EntityModelCache.getPartGeometry('farmer_arm', () =>
      this.buildPartGeometry([
        { size: [0.13, 0.62, 0.13], pos: [0, -0.26, 0], matIndex: 0 },
      ])
    );

    const armSickleGeo = EntityModelCache.getPartGeometry('farmer_arm_sickle', () =>
      this.buildPartGeometry([
        { size: [0.13, 0.62, 0.13], pos: [0, -0.26, 0], matIndex: 0 },
        // Curved sickle in right hand
        { size: [0.04, 0.28, 0.04], pos: [0, -0.55, 0.12], rot: [0.5, 0, 0], matIndex: 1 },
        { size: [0.04, 0.22, 0.16], pos: [0, -0.65, 0.22], matIndex: 2 },
      ])
    );

    const legGeo = EntityModelCache.getPartGeometry('farmer_leg', () =>
      this.buildPartGeometry([
        { size: [0.17, 0.62, 0.17], pos: [0, -0.26, 0], matIndex: 0 },
      ])
    );

    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.belly!], rig);
    rig.torso.add(torsoMesh);
    rig.torso.position.set(0, 0.95, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.accent, palette.eye], rig);
    rig.head!.add(headMesh);
    rig.head!.position.set(0, 0.5, 0);
    rig.initialHeadPos = rig.head!.position.clone();
    rig.torso.add(rig.head!);

    rig.armL!.add(this.createPartMesh(armGeo, [palette.body], rig));
    rig.armL!.position.set(0.32, 0.28, 0);
    rig.torso.add(rig.armL!);

    rig.armR!.add(this.createPartMesh(armSickleGeo, [palette.body, palette.belly!, palette.horn!], rig));
    rig.armR!.position.set(-0.32, 0.28, 0);
    rig.torso.add(rig.armR!);

    rig.legL!.add(this.createPartMesh(legGeo, [palette.limb!], rig));
    rig.legL!.position.set(0.13, 0.58, 0);

    rig.legR!.add(this.createPartMesh(legGeo, [palette.limb!], rig));
    rig.legR!.position.set(-0.13, 0.58, 0);

    root.add(rig.torso);
    root.add(rig.legL!);
    root.add(rig.legR!);

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 16. FISHER NPC (Nelayan Sungai & Pesisir)
  // =========================================================================
  public static buildFisher(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('fisher', variant);

    const rig: CreatureRig = {
      modelType: 'fisher',
      locomotion: 'biped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      armL: new THREE.Group(),
      armR: new THREE.Group(),
      legL: new THREE.Group(),
      legR: new THREE.Group(),
      shadowBaseScale: 0.95,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('fisher_torso', () =>
      this.buildPartGeometry([
        { size: [0.52, 0.72, 0.32], pos: [0, 0, 0], matIndex: 0 },
        // Fish trap basket on back (Bubu Anyaman Bambu)
        { size: [0.38, 0.48, 0.28], pos: [0, 0.05, -0.28], matIndex: 1 },
      ])
    );

    const headGeo = EntityModelCache.getPartGeometry('fisher_head', () =>
      this.buildPartGeometry([
        { size: [0.36, 0.36, 0.36], pos: [0, 0, 0], matIndex: 0 },
        // Destar headband
        { size: [0.42, 0.12, 0.42], pos: [0, 0.14, 0], matIndex: 1 },
        { size: [0.06, 0.05, 0.04], pos: [0.09, 0.02, 0.18], matIndex: 2 },
        { size: [0.06, 0.05, 0.04], pos: [-0.09, 0.02, 0.18], matIndex: 2 },
      ])
    );

    const armGeo = EntityModelCache.getPartGeometry('fisher_arm', () =>
      this.buildPartGeometry([
        { size: [0.13, 0.62, 0.13], pos: [0, -0.26, 0], matIndex: 0 },
      ])
    );

    const legGeo = EntityModelCache.getPartGeometry('fisher_leg', () =>
      this.buildPartGeometry([
        { size: [0.17, 0.62, 0.17], pos: [0, -0.26, 0], matIndex: 0 },
      ])
    );

    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.accent], rig);
    rig.torso.add(torsoMesh);
    rig.torso.position.set(0, 0.95, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.belly!, palette.eye], rig);
    rig.head!.add(headMesh);
    rig.head!.position.set(0, 0.5, 0);
    rig.initialHeadPos = rig.head!.position.clone();
    rig.torso.add(rig.head!);

    rig.armL!.add(this.createPartMesh(armGeo, [palette.body], rig));
    rig.armL!.position.set(0.32, 0.28, 0);
    rig.torso.add(rig.armL!);

    rig.armR!.add(this.createPartMesh(armGeo, [palette.body], rig));
    rig.armR!.position.set(-0.32, 0.28, 0);
    rig.torso.add(rig.armR!);

    rig.legL!.add(this.createPartMesh(legGeo, [palette.limb!], rig));
    rig.legL!.position.set(0.13, 0.58, 0);

    rig.legR!.add(this.createPartMesh(legGeo, [palette.limb!], rig));
    rig.legR!.position.set(-0.13, 0.58, 0);

    root.add(rig.torso);
    root.add(rig.legL!);
    root.add(rig.legR!);

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 17. CRAFTSPERSON NPC (Pengrajin / Empu Pande)
  // =========================================================================
  public static buildCraftsperson(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('craftsperson', variant);

    const rig: CreatureRig = {
      modelType: 'craftsperson',
      locomotion: 'biped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      armL: new THREE.Group(),
      armR: new THREE.Group(),
      legL: new THREE.Group(),
      legR: new THREE.Group(),
      shadowBaseScale: 0.95,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('craft_torso', () =>
      this.buildPartGeometry([
        { size: [0.54, 0.74, 0.34], pos: [0, 0, 0], matIndex: 0 },
        // Leather blacksmith apron
        { size: [0.46, 0.64, 0.08], pos: [0, -0.05, 0.18], matIndex: 1 },
      ])
    );

    const headGeo = EntityModelCache.getPartGeometry('craft_head', () =>
      this.buildPartGeometry([
        { size: [0.38, 0.38, 0.38], pos: [0, 0, 0], matIndex: 0 },
        { size: [0.44, 0.14, 0.44], pos: [0, 0.15, 0], matIndex: 1 }, // Blangkon/Tanjak headwear
        { size: [0.06, 0.05, 0.04], pos: [0.1, 0.02, 0.19], matIndex: 2 },
        { size: [0.06, 0.05, 0.04], pos: [-0.1, 0.02, 0.19], matIndex: 2 },
      ])
    );

    const armGeo = EntityModelCache.getPartGeometry('craft_arm', () =>
      this.buildPartGeometry([
        { size: [0.14, 0.62, 0.14], pos: [0, -0.26, 0], matIndex: 0 },
      ])
    );

    const armHammerGeo = EntityModelCache.getPartGeometry('craft_arm_hammer', () =>
      this.buildPartGeometry([
        { size: [0.14, 0.62, 0.14], pos: [0, -0.26, 0], matIndex: 0 },
        // Hammer in right hand
        { size: [0.06, 0.35, 0.06], pos: [0, -0.55, 0.12], matIndex: 1 },
        { size: [0.16, 0.12, 0.22], pos: [0, -0.68, 0.16], matIndex: 2 },
      ])
    );

    const legGeo = EntityModelCache.getPartGeometry('craft_leg', () =>
      this.buildPartGeometry([
        { size: [0.18, 0.62, 0.18], pos: [0, -0.26, 0], matIndex: 0 },
      ])
    );

    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.accent], rig);
    rig.torso.add(torsoMesh);
    rig.torso.position.set(0, 0.95, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.belly!, palette.eye], rig);
    rig.head!.add(headMesh);
    rig.head!.position.set(0, 0.52, 0);
    rig.initialHeadPos = rig.head!.position.clone();
    rig.torso.add(rig.head!);

    rig.armL!.add(this.createPartMesh(armGeo, [palette.body], rig));
    rig.armL!.position.set(0.34, 0.3, 0);
    rig.torso.add(rig.armL!);

    rig.armR!.add(this.createPartMesh(armHammerGeo, [palette.body, palette.belly!, palette.horn!], rig));
    rig.armR!.position.set(-0.34, 0.3, 0);
    rig.torso.add(rig.armR!);

    rig.legL!.add(this.createPartMesh(legGeo, [palette.limb!], rig));
    rig.legL!.position.set(0.14, 0.58, 0);

    rig.legR!.add(this.createPartMesh(legGeo, [palette.limb!], rig));
    rig.legR!.position.set(-0.14, 0.58, 0);

    root.add(rig.torso);
    root.add(rig.legL!);
    root.add(rig.legR!);

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 18. GUARD NPC (Prajurit Penjaga Benteng & Tapal Batas)
  // =========================================================================
  public static buildGuard(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('guard', variant);

    const rig: CreatureRig = {
      modelType: 'guard',
      locomotion: 'biped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      armL: new THREE.Group(),
      armR: new THREE.Group(),
      legL: new THREE.Group(),
      legR: new THREE.Group(),
      shadowBaseScale: 1.0,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('guard_torso', () =>
      this.buildPartGeometry([
        { size: [0.56, 0.78, 0.36], pos: [0, 0, 0], matIndex: 0 }, // armored cuirass
        { size: [0.66, 0.18, 0.42], pos: [0, 0.32, 0], matIndex: 1 }, // brass pauldrons
        // Sheathed Keris at back waistband
        { size: [0.08, 0.42, 0.08], pos: [0.15, -0.2, -0.22], rot: [0, 0, 0.4], matIndex: 2 },
      ])
    );

    const headGeo = EntityModelCache.getPartGeometry('guard_head', () =>
      this.buildPartGeometry([
        { size: [0.38, 0.38, 0.38], pos: [0, 0, 0], matIndex: 0 },
        // Brass guard helm / destar
        { size: [0.44, 0.22, 0.44], pos: [0, 0.16, 0], matIndex: 1 },
        { size: [0.06, 0.05, 0.04], pos: [0.1, 0.02, 0.19], matIndex: 2 },
        { size: [0.06, 0.05, 0.04], pos: [-0.1, 0.02, 0.19], matIndex: 2 },
      ])
    );

    const armShieldGeo = EntityModelCache.getPartGeometry('guard_arm_shield', () =>
      this.buildPartGeometry([
        { size: [0.14, 0.64, 0.14], pos: [0, -0.26, 0], matIndex: 0 },
        // Wooden round buckler / shield
        { size: [0.08, 0.48, 0.48], pos: [0.12, -0.32, 0.1], matIndex: 1 },
      ])
    );

    const armSpearGeo = EntityModelCache.getPartGeometry('guard_arm_spear', () =>
      this.buildPartGeometry([
        { size: [0.14, 0.64, 0.14], pos: [0, -0.26, 0], matIndex: 0 },
        // Tall spear (Tombak Prajurit)
        { size: [0.05, 1.8, 0.05], pos: [0, 0.2, 0.18], matIndex: 1 },
        { size: [0.08, 0.35, 0.08], pos: [0, 1.15, 0.18], matIndex: 2 },
      ])
    );

    const legGeo = EntityModelCache.getPartGeometry('guard_leg', () =>
      this.buildPartGeometry([
        { size: [0.18, 0.64, 0.18], pos: [0, -0.26, 0], matIndex: 0 },
      ])
    );

    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.accent, palette.horn!], rig);
    rig.torso.add(torsoMesh);
    rig.torso.position.set(0, 0.98, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    const headMesh = this.createPartMesh(headGeo, [palette.belly!, palette.accent, palette.eye], rig);
    rig.head!.add(headMesh);
    rig.head!.position.set(0, 0.54, 0);
    rig.initialHeadPos = rig.head!.position.clone();
    rig.torso.add(rig.head!);

    rig.armL!.add(this.createPartMesh(armShieldGeo, [palette.body, palette.accent], rig));
    rig.armL!.position.set(0.36, 0.32, 0);
    rig.torso.add(rig.armL!);

    rig.armR!.add(this.createPartMesh(armSpearGeo, [palette.body, palette.belly!, palette.horn!], rig));
    rig.armR!.position.set(-0.36, 0.32, 0);
    rig.torso.add(rig.armR!);

    rig.legL!.add(this.createPartMesh(legGeo, [palette.limb!], rig));
    rig.legL!.position.set(0.15, 0.6, 0);

    rig.legR!.add(this.createPartMesh(legGeo, [palette.limb!], rig));
    rig.legR!.position.set(-0.15, 0.6, 0);

    root.add(rig.torso);
    root.add(rig.legL!);
    root.add(rig.legR!);

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 19. ENGINEER NPC (Empu Irigasi & Mekanik Aether)
  // =========================================================================
  public static buildEngineer(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('engineer', variant);

    const rig: CreatureRig = {
      modelType: 'engineer',
      locomotion: 'biped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      armL: new THREE.Group(),
      armR: new THREE.Group(),
      legL: new THREE.Group(),
      legR: new THREE.Group(),
      shadowBaseScale: 0.95,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('engineer_torso', () =>
      this.buildPartGeometry([
        { size: [0.54, 0.76, 0.34], pos: [0, 0, 0], matIndex: 0 },
        // Tool harness with brass pressure gauge
        { size: [0.58, 0.22, 0.38], pos: [0, 0.1, 0], matIndex: 1 },
        { size: [0.12, 0.12, 0.08], pos: [0.18, 0.15, 0.2], matIndex: 2 },
      ])
    );

    const headGeo = EntityModelCache.getPartGeometry('engineer_head', () =>
      this.buildPartGeometry([
        { size: [0.38, 0.38, 0.38], pos: [0, 0, 0], matIndex: 0 },
        // Aether Monocle lens on left eye
        { size: [0.12, 0.12, 0.06], pos: [0.1, 0.04, 0.2], matIndex: 1 },
        { size: [0.06, 0.05, 0.04], pos: [-0.1, 0.04, 0.19], matIndex: 2 },
      ])
    );

    const armGeo = EntityModelCache.getPartGeometry('engineer_arm', () =>
      this.buildPartGeometry([
        { size: [0.14, 0.64, 0.14], pos: [0, -0.26, 0], matIndex: 0 },
      ])
    );

    const legGeo = EntityModelCache.getPartGeometry('engineer_leg', () =>
      this.buildPartGeometry([
        { size: [0.18, 0.64, 0.18], pos: [0, -0.26, 0], matIndex: 0 },
      ])
    );

    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.belly!, palette.accent], rig);
    rig.torso.add(torsoMesh);
    rig.torso.position.set(0, 0.98, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.horn!, palette.eye], rig);
    rig.head!.add(headMesh);
    rig.head!.position.set(0, 0.54, 0);
    rig.initialHeadPos = rig.head!.position.clone();
    rig.torso.add(rig.head!);

    rig.armL!.add(this.createPartMesh(armGeo, [palette.body], rig));
    rig.armL!.position.set(0.34, 0.32, 0);
    rig.torso.add(rig.armL!);

    rig.armR!.add(this.createPartMesh(armGeo, [palette.body], rig));
    rig.armR!.position.set(-0.34, 0.32, 0);
    rig.torso.add(rig.armR!);

    rig.legL!.add(this.createPartMesh(legGeo, [palette.limb!], rig));
    rig.legL!.position.set(0.14, 0.6, 0);

    rig.legR!.add(this.createPartMesh(legGeo, [palette.limb!], rig));
    rig.legR!.position.set(-0.14, 0.6, 0);

    root.add(rig.torso);
    root.add(rig.legL!);
    root.add(rig.legR!);

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 20. HUNTER NPC (Pemburu Rimba & Penjejak)
  // =========================================================================
  public static buildHunter(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('hunter', variant);

    const rig: CreatureRig = {
      modelType: 'hunter',
      locomotion: 'biped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      armL: new THREE.Group(),
      armR: new THREE.Group(),
      legL: new THREE.Group(),
      legR: new THREE.Group(),
      shadowBaseScale: 0.95,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('hunter_torso', () =>
      this.buildPartGeometry([
        { size: [0.52, 0.74, 0.32], pos: [0, 0, 0], matIndex: 0 },
        // Quiver on back with blowpipe dart feathers
        { size: [0.18, 0.58, 0.18], pos: [-0.14, 0.05, -0.24], rot: [0.2, 0, -0.3], matIndex: 1 },
      ])
    );

    const headGeo = EntityModelCache.getPartGeometry('hunter_head', () =>
      this.buildPartGeometry([
        { size: [0.36, 0.36, 0.36], pos: [0, 0, 0], matIndex: 0 },
        // Feather headband
        { size: [0.42, 0.1, 0.42], pos: [0, 0.14, 0], matIndex: 1 },
        { size: [0.06, 0.24, 0.04], pos: [-0.18, 0.28, -0.1], rot: [0, 0, -0.3], matIndex: 1 },
        { size: [0.06, 0.05, 0.04], pos: [0.09, 0.02, 0.18], matIndex: 2 },
        { size: [0.06, 0.05, 0.04], pos: [-0.09, 0.02, 0.18], matIndex: 2 },
      ])
    );

    const armSumpitGeo = EntityModelCache.getPartGeometry('hunter_arm_sumpit', () =>
      this.buildPartGeometry([
        { size: [0.13, 0.62, 0.13], pos: [0, -0.26, 0], matIndex: 0 },
        // Long Sumpit Blowpipe held in hand
        { size: [0.05, 1.4, 0.05], pos: [0, -0.1, 0.15], rot: [-0.2, 0, 0], matIndex: 1 },
      ])
    );

    const armGeo = EntityModelCache.getPartGeometry('hunter_arm', () =>
      this.buildPartGeometry([
        { size: [0.13, 0.62, 0.13], pos: [0, -0.26, 0], matIndex: 0 },
      ])
    );

    const legGeo = EntityModelCache.getPartGeometry('hunter_leg', () =>
      this.buildPartGeometry([
        { size: [0.17, 0.62, 0.17], pos: [0, -0.26, 0], matIndex: 0 },
      ])
    );

    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.accent], rig);
    rig.torso.add(torsoMesh);
    rig.torso.position.set(0, 0.95, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.belly!, palette.eye], rig);
    rig.head!.add(headMesh);
    rig.head!.position.set(0, 0.5, 0);
    rig.initialHeadPos = rig.head!.position.clone();
    rig.torso.add(rig.head!);

    rig.armL!.add(this.createPartMesh(armGeo, [palette.body], rig));
    rig.armL!.position.set(0.32, 0.28, 0);
    rig.torso.add(rig.armL!);

    rig.armR!.add(this.createPartMesh(armSumpitGeo, [palette.body, palette.horn!], rig));
    rig.armR!.position.set(-0.32, 0.28, 0);
    rig.torso.add(rig.armR!);

    rig.legL!.add(this.createPartMesh(legGeo, [palette.limb!], rig));
    rig.legL!.position.set(0.13, 0.58, 0);

    rig.legR!.add(this.createPartMesh(legGeo, [palette.limb!], rig));
    rig.legR!.position.set(-0.13, 0.58, 0);

    root.add(rig.torso);
    root.add(rig.legL!);
    root.add(rig.legR!);

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // =========================================================================
  // 21. BOAT TRADER NPC (Saudagar Perahu Pinisi / Sungai)
  // =========================================================================
  public static buildBoatTrader(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('boat_trader', variant);

    const rig: CreatureRig = {
      modelType: 'boat_trader',
      locomotion: 'biped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      armL: new THREE.Group(),
      armR: new THREE.Group(),
      legL: new THREE.Group(),
      legR: new THREE.Group(),
      shadowBaseScale: 0.95,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      grazeTimer: 0,
      isGrazing: false,
      attackWindupProgress: 0,
      flinchTimer: 0,
      staggerTimer: 0,
      hitFlashTimer: 0,
      hitFlashType: 'none',
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('boat_trader_torso', () =>
      this.buildPartGeometry([
        { size: [0.54, 0.76, 0.34], pos: [0, 0, 0], matIndex: 0 },
        // Oceanic sailor sash
        { size: [0.58, 0.2, 0.38], pos: [0, -0.15, 0], matIndex: 1 },
        // Leather cargo satchel on flank
        { size: [0.18, 0.32, 0.28], pos: [0.3, -0.15, 0], matIndex: 2 },
      ])
    );

    const headGeo = EntityModelCache.getPartGeometry('boat_trader_head', () =>
      this.buildPartGeometry([
        { size: [0.38, 0.38, 0.38], pos: [0, 0, 0], matIndex: 0 },
        // Sailor destar cap
        { size: [0.44, 0.16, 0.44], pos: [0, 0.15, 0], matIndex: 1 },
        { size: [0.06, 0.05, 0.04], pos: [0.1, 0.02, 0.19], matIndex: 2 },
        { size: [0.06, 0.05, 0.04], pos: [-0.1, 0.02, 0.19], matIndex: 2 },
      ])
    );

    const armGeo = EntityModelCache.getPartGeometry('boat_trader_arm', () =>
      this.buildPartGeometry([
        { size: [0.14, 0.64, 0.14], pos: [0, -0.26, 0], matIndex: 0 },
      ])
    );

    const legGeo = EntityModelCache.getPartGeometry('boat_trader_leg', () =>
      this.buildPartGeometry([
        { size: [0.18, 0.64, 0.18], pos: [0, -0.26, 0], matIndex: 0 },
      ])
    );

    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.belly!, palette.accent], rig);
    rig.torso.add(torsoMesh);
    rig.torso.position.set(0, 0.98, 0);
    rig.initialTorsoPos = rig.torso.position.clone();

    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.belly!, palette.eye], rig);
    rig.head!.add(headMesh);
    rig.head!.position.set(0, 0.54, 0);
    rig.initialHeadPos = rig.head!.position.clone();
    rig.torso.add(rig.head!);

    rig.armL!.add(this.createPartMesh(armGeo, [palette.body], rig));
    rig.armL!.position.set(0.34, 0.32, 0);
    rig.torso.add(rig.armL!);

    rig.armR!.add(this.createPartMesh(armGeo, [palette.body], rig));
    rig.armR!.position.set(-0.34, 0.32, 0);
    rig.torso.add(rig.armR!);

    rig.legL!.add(this.createPartMesh(legGeo, [palette.limb!], rig));
    rig.legL!.position.set(0.14, 0.6, 0);

    rig.legR!.add(this.createPartMesh(legGeo, [palette.limb!], rig));
    rig.legR!.position.set(-0.14, 0.6, 0);

    root.add(rig.torso);
    root.add(rig.legL!);
    root.add(rig.legR!);

    const shadow = CreatureMaterialFactory.getContactShadowMesh(rig.shadowBaseScale);
    rig.contactShadow = shadow;
    root.add(shadow);

    root.userData.rig = rig;
    return root;
  }

  // Unified factory by modelType key with alias resolution
  public static buildByModelType(modelType: string, variant: number = 0): THREE.Group {
    const key = (modelType || '').toLowerCase().trim();
    switch (key) {
      case 'stag':
      case 'aether_stag':
      case 'deer':
        return this.buildStag(variant);

      case 'woolbeast':
      case 'sheep':
        return this.buildWoolbeast(variant);

      case 'grazeback':
      case 'cow':
      case 'bovine':
        return this.buildGrazeback(variant);

      case 'wolf':
      case 'shadow_wolf':
        return this.buildShadowWolf(variant);

      case 'glowhen':
      case 'chicken':
      case 'hen':
        return this.buildGlowhen(variant);

      case 'bee':
      case 'crystal_bee':
        return this.buildCrystalBee(variant);

      case 'glowfin':
      case 'fish':
        return this.buildGlowfin(variant);

      case 'void_lynx':
      case 'lynx':
      case 'cat':
        return this.buildVoidLynx(variant);

      case 'stalker':
      case 'shadow_stalker':
        return this.buildShadowStalker(variant);

      case 'void_spitter':
      case 'spitter':
        return this.buildVoidSpitter(variant);

      case 'ruin_sentinel':
      case 'golem':
      case 'sentinel':
        return this.buildRuinSentinel();

      case 'void_sovereign':
      case 'boss_void_sovereign':
      case 'sovereign':
        return this.buildVoidSovereign();

      case 'merchant':
      case 'npc_merchant':
        return this.buildMerchant(variant);

      case 'elder':
      case 'npc_elder':
        return this.buildElder(variant);

      case 'farmer':
      case 'npc_farmer':
        return this.buildFarmer(variant);

      case 'fisher':
      case 'npc_fisher':
        return this.buildFisher(variant);

      case 'craftsperson':
      case 'npc_craftsperson':
        return this.buildCraftsperson(variant);

      case 'guard':
      case 'npc_guard':
        return this.buildGuard(variant);

      case 'engineer':
      case 'npc_engineer':
        return this.buildEngineer(variant);

      case 'hunter':
      case 'npc_hunter':
        return this.buildHunter(variant);

      case 'boat_trader':
      case 'npc_boat_trader':
        return this.buildBoatTrader(variant);

      // =========================================================================
      // VOXELVERSE — NUSANTARA MYTHIC CREATURE MODELS
      // =========================================================================
      case 'lembu_sekti':
        return this.buildLembuSekti(variant);

      case 'singa_marapi':
        return this.buildSingaMarapi(variant);

      case 'enggang_celestial':
        return this.buildEnggangCelestial(variant);

      case 'barong_aether':
        return this.buildBarongAether(variant);

      case 'tedong_bonga':
        return this.buildTedongBonga(variant);

      case 'cenderawasih_astral':
        return this.buildCenderawasihAstral(variant);

      case 'penyu_garam':
        return this.buildPenyuGaram(variant);

      case 'banaspati_fiend':
        return this.buildBanaspatiFiend(variant);

      case 'harimau_cindaku':
        return this.buildHarimauCindaku(variant);

      case 'buaya_puang':
        return this.buildBuayaPuang(variant);

      case 'rangda_corrupted':
        return this.buildRangdaCorrupted(variant);

      case 'poci_kelep':
        return this.buildPociKelep(variant);

      case 'asmat_war_phantom':
        return this.buildAsmatWarPhantom(variant);

      case 'rimba_pari':
        return this.buildRimbaPari(variant);

      case 'warak_ngendog':
        return this.buildWarakNgendog(variant);

      case 'candi_sentinel':
        return this.buildCandiSentinel();

      case 'raksasa_ulin':
        return this.buildRaksasaUlin();

      case 'hyang_batara_bhumi':
      case 'batara_bhumi':
      case 'boss_batara_bhumi':
        return this.buildBataraBhumi();

      default:
        return this.buildStag(variant);
    }
  }

  // =========================================================================
  // MYTHIC BUILDER IMPLEMENTATIONS
  // =========================================================================

  public static buildLembuSekti(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('lembu_sekti', variant);
    const rig: CreatureRig = {
      modelType: 'lembu_sekti',
      locomotion: 'quadruped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      legFL: new THREE.Group(),
      legFR: new THREE.Group(),
      legBL: new THREE.Group(),
      legBR: new THREE.Group(),
      tail: new THREE.Group(),
      shadowBaseScale: 1.6,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('lembu_torso', () =>
      this.buildPartGeometry([
        { size: [0.95, 0.85, 1.45], pos: [0, 0, 0], matIndex: 0 }, // main body
        { size: [0.85, 0.35, 0.75], pos: [0, 0.35, 0.1], matIndex: 1 }, // volcanic relief saddle
        { size: [0.75, 0.55, 0.55], pos: [0, 0.25, 0.55], matIndex: 0 }, // hump
      ])
    );
    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.accent], rig);
    rig.torso.add(torsoMesh);

    const headGeo = EntityModelCache.getPartGeometry('lembu_head', () =>
      this.buildPartGeometry([
        { size: [0.55, 0.52, 0.65], pos: [0, 0, 0.25], matIndex: 0 }, // head
        { size: [0.45, 0.32, 0.42], pos: [0, -0.12, 0.68], matIndex: 1 }, // snout
        { size: [0.18, 0.65, 0.18], pos: [0.38, 0.42, 0.22], rot: [0.3, 0, -0.4], matIndex: 2 }, // horn L
        { size: [0.18, 0.65, 0.18], pos: [-0.38, 0.42, 0.22], rot: [0.3, 0, 0.4], matIndex: 2 }, // horn R
      ])
    );
    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.accent, palette.horn!], rig);
    headMesh.position.set(0, 0.45, 0.75);
    rig.head = headMesh;
    rig.torso.add(rig.head);

    const legGeo = EntityModelCache.getPartGeometry('lembu_leg', () =>
      this.buildPartGeometry([{ size: [0.32, 0.75, 0.32], pos: [0, -0.37, 0], matIndex: 0 }])
    );

    const fL = this.createPartMesh(legGeo, palette.limb || palette.body, rig); fL.position.set(0.38, -0.25, 0.52); rig.legFL = fL; rig.torso.add(fL);
    const fR = this.createPartMesh(legGeo, palette.limb || palette.body, rig); fR.position.set(-0.38, -0.25, 0.52); rig.legFR = fR; rig.torso.add(fR);
    const bL = this.createPartMesh(legGeo, palette.limb || palette.body, rig); bL.position.set(0.38, -0.25, -0.52); rig.legBL = bL; rig.torso.add(bL);
    const bR = this.createPartMesh(legGeo, palette.limb || palette.body, rig); bR.position.set(-0.38, -0.25, -0.52); rig.legBR = bR; rig.torso.add(bR);

    rig.torso.position.y = 0.85;
    root.add(rig.torso);
    root.add(CreatureMaterialFactory.getContactShadowMesh(1.6));
    root.userData.rig = rig;
    return root;
  }

  public static buildSingaMarapi(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('singa_marapi', variant);
    const rig: CreatureRig = {
      modelType: 'singa_marapi',
      locomotion: 'quadruped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      legFL: new THREE.Group(),
      legFR: new THREE.Group(),
      legBL: new THREE.Group(),
      legBR: new THREE.Group(),
      tail: new THREE.Group(),
      shadowBaseScale: 1.5,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('singa_torso', () =>
      this.buildPartGeometry([
        { size: [0.82, 0.75, 1.35], pos: [0, 0, 0], matIndex: 0 },
        { size: [0.92, 0.82, 0.55], pos: [0, 0.12, 0.45], matIndex: 1 }, // silver mane
      ])
    );
    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.accent], rig);
    rig.torso.add(torsoMesh);

    const headGeo = EntityModelCache.getPartGeometry('singa_head', () =>
      this.buildPartGeometry([
        { size: [0.52, 0.48, 0.55], pos: [0, 0, 0.2], matIndex: 0 },
        { size: [0.22, 0.75, 0.22], pos: [0.35, 0.45, 0.1], rot: [0.1, -0.3, -0.5], matIndex: 1 }, // buffalo horn L
        { size: [0.22, 0.75, 0.22], pos: [-0.35, 0.45, 0.1], rot: [0.1, 0.3, 0.5], matIndex: 1 }, // buffalo horn R
      ])
    );
    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.horn!], rig);
    headMesh.position.set(0, 0.48, 0.65);
    rig.head = headMesh;
    rig.torso.add(rig.head);

    const legGeo = EntityModelCache.getPartGeometry('singa_leg', () =>
      this.buildPartGeometry([{ size: [0.28, 0.72, 0.28], pos: [0, -0.36, 0], matIndex: 0 }])
    );
    const fL = this.createPartMesh(legGeo, palette.limb || palette.body, rig); fL.position.set(0.35, -0.22, 0.48); rig.legFL = fL; rig.torso.add(fL);
    const fR = this.createPartMesh(legGeo, palette.limb || palette.body, rig); fR.position.set(-0.35, -0.22, 0.48); rig.legFR = fR; rig.torso.add(fR);
    const bL = this.createPartMesh(legGeo, palette.limb || palette.body, rig); bL.position.set(0.35, -0.22, -0.48); rig.legBL = bL; rig.torso.add(bL);
    const bR = this.createPartMesh(legGeo, palette.limb || palette.body, rig); bR.position.set(-0.35, -0.22, -0.48); rig.legBR = bR; rig.torso.add(bR);

    rig.torso.position.y = 0.8;
    root.add(rig.torso);
    root.add(CreatureMaterialFactory.getContactShadowMesh(1.5));
    root.userData.rig = rig;
    return root;
  }

  public static buildEnggangCelestial(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('enggang_celestial', variant);
    const rig: CreatureRig = {
      modelType: 'enggang_celestial',
      locomotion: 'flying',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      wingL: new THREE.Group(),
      wingR: new THREE.Group(),
      legFL: new THREE.Group(),
      legFR: new THREE.Group(),
      tail: new THREE.Group(),
      shadowBaseScale: 1.4,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('enggang_torso', () =>
      this.buildPartGeometry([
        { size: [0.55, 0.65, 0.85], pos: [0, 0, 0], matIndex: 0 },
        { size: [0.45, 0.45, 0.35], pos: [0, -0.08, 0.38], matIndex: 1 }, // white chest tuft
      ])
    );
    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.belly!], rig);
    rig.torso.add(torsoMesh);

    const headGeo = EntityModelCache.getPartGeometry('enggang_head', () =>
      this.buildPartGeometry([
        { size: [0.38, 0.38, 0.42], pos: [0, 0, 0.1], matIndex: 0 },
        { size: [0.22, 0.28, 0.65], pos: [0, -0.05, 0.52], matIndex: 1 }, // bill
        { size: [0.25, 0.32, 0.45], pos: [0, 0.28, 0.35], matIndex: 1 }, // casque horn
      ])
    );
    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.accent], rig);
    headMesh.position.set(0, 0.42, 0.35);
    rig.head = headMesh;
    rig.torso.add(rig.head);

    const wingGeo = EntityModelCache.getPartGeometry('enggang_wing', () =>
      this.buildPartGeometry([{ size: [0.12, 0.55, 1.15], pos: [0, 0, -0.2], matIndex: 0 }])
    );
    const wL = this.createPartMesh(wingGeo, palette.body, rig); wL.position.set(0.32, 0.15, 0); rig.wingL = wL; rig.torso.add(wL);
    const wR = this.createPartMesh(wingGeo, palette.body, rig); wR.position.set(-0.32, 0.15, 0); rig.wingR = wR; rig.torso.add(wR);

    rig.torso.position.y = 0.75;
    root.add(rig.torso);
    root.add(CreatureMaterialFactory.getContactShadowMesh(1.3));
    root.userData.rig = rig;
    return root;
  }

  public static buildBarongAether(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('barong_aether', variant);
    const rig: CreatureRig = {
      modelType: 'barong_aether',
      locomotion: 'quadruped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      legFL: new THREE.Group(),
      legFR: new THREE.Group(),
      legBL: new THREE.Group(),
      legBR: new THREE.Group(),
      tail: new THREE.Group(),
      shadowBaseScale: 1.8,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('barong_torso', () =>
      this.buildPartGeometry([
        { size: [0.92, 0.82, 1.55], pos: [0, 0, 0], matIndex: 0 }, // dragon feline body
        { size: [0.45, 0.45, 0.12], pos: [0, 0.05, 0.78], matIndex: 1 }, // mirror chest medallion
      ])
    );
    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.belly!], rig);
    rig.torso.add(torsoMesh);

    const headGeo = EntityModelCache.getPartGeometry('barong_head', () =>
      this.buildPartGeometry([
        { size: [0.85, 0.75, 0.55], pos: [0, 0, 0.25], matIndex: 0 }, // mask face
        { size: [1.15, 0.35, 0.22], pos: [0, 0.38, 0.15], matIndex: 1 }, // crown ears
        { size: [0.55, 0.25, 0.35], pos: [0, -0.28, 0.45], matIndex: 1 }, // jaw
      ])
    );
    const headMesh = this.createPartMesh(headGeo, [palette.accent, palette.horn!], rig);
    headMesh.position.set(0, 0.52, 0.78);
    rig.head = headMesh;
    rig.torso.add(rig.head);

    const legGeo = EntityModelCache.getPartGeometry('barong_leg', () =>
      this.buildPartGeometry([{ size: [0.35, 0.78, 0.35], pos: [0, -0.39, 0], matIndex: 0 }])
    );
    const fL = this.createPartMesh(legGeo, palette.limb || palette.body, rig); fL.position.set(0.42, -0.25, 0.55); rig.legFL = fL; rig.torso.add(fL);
    const fR = this.createPartMesh(legGeo, palette.limb || palette.body, rig); fR.position.set(-0.42, -0.25, 0.55); rig.legFR = fR; rig.torso.add(fR);
    const bL = this.createPartMesh(legGeo, palette.limb || palette.body, rig); bL.position.set(0.42, -0.25, -0.55); rig.legBL = bL; rig.torso.add(bL);
    const bR = this.createPartMesh(legGeo, palette.limb || palette.body, rig); bR.position.set(-0.42, -0.25, -0.55); rig.legBR = bR; rig.torso.add(bR);

    rig.torso.position.y = 0.88;
    root.add(rig.torso);
    root.add(CreatureMaterialFactory.getContactShadowMesh(1.8));
    root.userData.rig = rig;
    return root;
  }

  public static buildTedongBonga(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('tedong_bonga', variant);
    const rig: CreatureRig = {
      modelType: 'tedong_bonga',
      locomotion: 'quadruped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      legFL: new THREE.Group(),
      legFR: new THREE.Group(),
      legBL: new THREE.Group(),
      legBR: new THREE.Group(),
      tail: new THREE.Group(),
      shadowBaseScale: 1.6,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('tedong_torso', () =>
      this.buildPartGeometry([
        { size: [0.92, 0.88, 1.55], pos: [0, 0, 0], matIndex: 0 },
        { size: [0.65, 0.65, 0.65], pos: [0.15, 0.15, 0.2], matIndex: 1 }, // white piebald patch
      ])
    );
    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.accent], rig);
    rig.torso.add(torsoMesh);

    const headGeo = EntityModelCache.getPartGeometry('tedong_head', () =>
      this.buildPartGeometry([
        { size: [0.55, 0.52, 0.65], pos: [0, 0, 0.25], matIndex: 0 },
        { size: [0.22, 0.95, 0.22], pos: [0.48, 0.35, 0.1], rot: [0.1, -0.4, -0.6], matIndex: 1 }, // horn L
        { size: [0.22, 0.95, 0.22], pos: [-0.48, 0.35, 0.1], rot: [0.1, 0.4, 0.6], matIndex: 1 }, // horn R
      ])
    );
    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.horn!], rig);
    headMesh.position.set(0, 0.42, 0.75);
    rig.head = headMesh;
    rig.torso.add(rig.head);

    const legGeo = EntityModelCache.getPartGeometry('tedong_leg', () =>
      this.buildPartGeometry([{ size: [0.35, 0.75, 0.35], pos: [0, -0.37, 0], matIndex: 0 }])
    );
    const fL = this.createPartMesh(legGeo, palette.limb || palette.body, rig); fL.position.set(0.38, -0.28, 0.55); rig.legFL = fL; rig.torso.add(fL);
    const fR = this.createPartMesh(legGeo, palette.limb || palette.body, rig); fR.position.set(-0.38, -0.28, 0.55); rig.legFR = fR; rig.torso.add(fR);
    const bL = this.createPartMesh(legGeo, palette.limb || palette.body, rig); bL.position.set(0.38, -0.28, -0.55); rig.legBL = bL; rig.torso.add(bL);
    const bR = this.createPartMesh(legGeo, palette.limb || palette.body, rig); bR.position.set(-0.38, -0.28, -0.55); rig.legBR = bR; rig.torso.add(bR);

    rig.torso.position.y = 0.85;
    root.add(rig.torso);
    root.add(CreatureMaterialFactory.getContactShadowMesh(1.6));
    root.userData.rig = rig;
    return root;
  }

  public static buildCenderawasihAstral(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('cenderawasih_astral', variant);
    const rig: CreatureRig = {
      modelType: 'cenderawasih_astral',
      locomotion: 'flying',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      wingL: new THREE.Group(),
      wingR: new THREE.Group(),
      tail: new THREE.Group(),
      shadowBaseScale: 1.2,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('cenderawasih_torso', () =>
      this.buildPartGeometry([
        { size: [0.45, 0.52, 0.75], pos: [0, 0, 0], matIndex: 0 },
        { size: [0.15, 0.22, 1.45], pos: [0, 0.15, -0.85], matIndex: 1 }, // golden tail streamers
      ])
    );
    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.accent], rig);
    rig.torso.add(torsoMesh);

    const headGeo = EntityModelCache.getPartGeometry('cenderawasih_head', () =>
      this.buildPartGeometry([
        { size: [0.28, 0.28, 0.35], pos: [0, 0, 0.1], matIndex: 0 },
        { size: [0.12, 0.12, 0.35], pos: [0, -0.05, 0.38], matIndex: 1 },
      ])
    );
    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.horn!], rig);
    headMesh.position.set(0, 0.35, 0.32);
    rig.head = headMesh;
    rig.torso.add(rig.head);

    const wingGeo = EntityModelCache.getPartGeometry('cenderawasih_wing', () =>
      this.buildPartGeometry([{ size: [0.1, 0.45, 0.95], pos: [0, 0, -0.1], matIndex: 0 }])
    );
    const wL = this.createPartMesh(wingGeo, palette.body, rig); wL.position.set(0.25, 0.12, 0); rig.wingL = wL; rig.torso.add(wL);
    const wR = this.createPartMesh(wingGeo, palette.body, rig); wR.position.set(-0.25, 0.12, 0); rig.wingR = wR; rig.torso.add(wR);

    rig.torso.position.y = 0.8;
    root.add(rig.torso);
    root.add(CreatureMaterialFactory.getContactShadowMesh(1.2));
    root.userData.rig = rig;
    return root;
  }

  public static buildPenyuGaram(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('penyu_garam', variant);
    const rig: CreatureRig = {
      modelType: 'penyu_garam',
      locomotion: 'quadruped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      legFL: new THREE.Group(),
      legFR: new THREE.Group(),
      legBL: new THREE.Group(),
      legBR: new THREE.Group(),
      shadowBaseScale: 2.2,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('penyu_torso', () =>
      this.buildPartGeometry([
        { size: [1.65, 0.65, 2.15], pos: [0, 0, 0], matIndex: 0 }, // turtle shell
        { size: [0.75, 0.45, 0.75], pos: [0, 0.42, 0], matIndex: 1 }, // salt crystal cluster
      ])
    );
    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.accent], rig);
    rig.torso.add(torsoMesh);

    const headGeo = EntityModelCache.getPartGeometry('penyu_head', () =>
      this.buildPartGeometry([{ size: [0.55, 0.45, 0.65], pos: [0, 0, 0.3], matIndex: 0 }])
    );
    const headMesh = this.createPartMesh(headGeo, palette.body, rig);
    headMesh.position.set(0, -0.1, 1.15);
    rig.head = headMesh;
    rig.torso.add(rig.head);

    const flipperGeo = EntityModelCache.getPartGeometry('penyu_flipper', () =>
      this.buildPartGeometry([{ size: [0.75, 0.18, 0.45], pos: [0, 0, 0], matIndex: 0 }])
    );
    const fL = this.createPartMesh(flipperGeo, palette.limb || palette.body, rig); fL.position.set(0.95, -0.15, 0.75); rig.legFL = fL; rig.torso.add(fL);
    const fR = this.createPartMesh(flipperGeo, palette.limb || palette.body, rig); fR.position.set(-0.95, -0.15, 0.75); rig.legFR = fR; rig.torso.add(fR);
    const bL = this.createPartMesh(flipperGeo, palette.limb || palette.body, rig); bL.position.set(0.85, -0.15, -0.75); rig.legBL = bL; rig.torso.add(bL);
    const bR = this.createPartMesh(flipperGeo, palette.limb || palette.body, rig); bR.position.set(-0.85, -0.15, -0.75); rig.legBR = bR; rig.torso.add(bR);

    rig.torso.position.y = 0.55;
    root.add(rig.torso);
    root.add(CreatureMaterialFactory.getContactShadowMesh(2.2));
    root.userData.rig = rig;
    return root;
  }

  public static buildBanaspatiFiend(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('banaspati_fiend', variant);
    const rig: CreatureRig = {
      modelType: 'banaspati_fiend',
      locomotion: 'flying',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      shadowBaseScale: 1.4,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('banaspati_torso', () =>
      this.buildPartGeometry([
        { size: [0.85, 0.85, 0.85], pos: [0, 0, 0], matIndex: 0 }, // blazing magma core
        { size: [0.95, 0.45, 0.95], pos: [0, 0.48, 0], matIndex: 1 }, // volcanic flame crown
        { size: [0.75, 0.35, 0.55], pos: [0, -0.35, 0.2], matIndex: 2 }, // upside-down ash jaw
      ])
    );
    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.accent, palette.belly!], rig);
    rig.torso.add(torsoMesh);

    rig.torso.position.y = 1.35; // hovers off ground
    root.add(rig.torso);
    root.add(CreatureMaterialFactory.getContactShadowMesh(1.4));
    root.userData.rig = rig;
    return root;
  }

  public static buildHarimauCindaku(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('harimau_cindaku', variant);
    const rig: CreatureRig = {
      modelType: 'harimau_cindaku',
      locomotion: 'biped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      armL: new THREE.Group(),
      armR: new THREE.Group(),
      legFL: new THREE.Group(),
      legFR: new THREE.Group(),
      shadowBaseScale: 1.4,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('cindaku_torso', () =>
      this.buildPartGeometry([
        { size: [0.65, 0.95, 0.45], pos: [0, 0, 0], matIndex: 0 },
        { size: [0.72, 0.85, 0.12], pos: [0, 0, 0.22], matIndex: 1 }, // cyan mist stripes
      ])
    );
    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.accent], rig);
    rig.torso.add(torsoMesh);

    const headGeo = EntityModelCache.getPartGeometry('cindaku_head', () =>
      this.buildPartGeometry([
        { size: [0.45, 0.42, 0.48], pos: [0, 0, 0.1], matIndex: 0 },
        { size: [0.35, 0.22, 0.28], pos: [0, -0.08, 0.32], matIndex: 1 }, // muzzle
      ])
    );
    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.horn!], rig);
    headMesh.position.set(0, 0.58, 0.15);
    rig.head = headMesh;
    rig.torso.add(rig.head);

    const armGeo = EntityModelCache.getPartGeometry('cindaku_arm', () =>
      this.buildPartGeometry([{ size: [0.22, 0.75, 0.22], pos: [0, -0.37, 0], matIndex: 0 }])
    );
    const aL = this.createPartMesh(armGeo, palette.body, rig); aL.position.set(0.42, 0.32, 0); rig.armL = aL; rig.torso.add(aL);
    const aR = this.createPartMesh(armGeo, palette.body, rig); aR.position.set(-0.42, 0.32, 0); rig.armR = aR; rig.torso.add(aR);

    const legGeo = EntityModelCache.getPartGeometry('cindaku_leg', () =>
      this.buildPartGeometry([{ size: [0.25, 0.78, 0.25], pos: [0, -0.39, 0], matIndex: 0 }])
    );
    const lL = this.createPartMesh(legGeo, palette.limb || palette.body, rig); lL.position.set(0.22, -0.42, 0); rig.legFL = lL; rig.torso.add(lL);
    const lR = this.createPartMesh(legGeo, palette.limb || palette.body, rig); lR.position.set(-0.22, -0.42, 0); rig.legFR = lR; rig.torso.add(lR);

    rig.torso.position.y = 1.05;
    root.add(rig.torso);
    root.add(CreatureMaterialFactory.getContactShadowMesh(1.4));
    root.userData.rig = rig;
    return root;
  }

  public static buildBuayaPuang(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('buaya_puang', variant);
    const rig: CreatureRig = {
      modelType: 'buaya_puang',
      locomotion: 'quadruped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      legFL: new THREE.Group(),
      legFR: new THREE.Group(),
      legBL: new THREE.Group(),
      legBR: new THREE.Group(),
      shadowBaseScale: 2.0,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('buaya_torso', () =>
      this.buildPartGeometry([
        { size: [0.95, 0.55, 2.25], pos: [0, 0, 0], matIndex: 0 }, // ulin ironwood body
        { size: [0.75, 0.22, 1.95], pos: [0, 0.32, 0], matIndex: 1 }, // glowing swamp moss scutes
      ])
    );
    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.accent], rig);
    rig.torso.add(torsoMesh);

    const headGeo = EntityModelCache.getPartGeometry('buaya_head', () =>
      this.buildPartGeometry([
        { size: [0.65, 0.35, 1.15], pos: [0, 0, 0.6], matIndex: 0 },
        { size: [0.55, 0.18, 0.95], pos: [0, -0.15, 0.55], matIndex: 1 }, // lower jaw
      ])
    );
    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.horn!], rig);
    headMesh.position.set(0, 0.05, 1.15);
    rig.head = headMesh;
    rig.torso.add(rig.head);

    const legGeo = EntityModelCache.getPartGeometry('buaya_leg', () =>
      this.buildPartGeometry([{ size: [0.35, 0.45, 0.35], pos: [0, -0.22, 0], matIndex: 0 }])
    );
    const fL = this.createPartMesh(legGeo, palette.limb || palette.body, rig); fL.position.set(0.55, -0.15, 0.85); rig.legFL = fL; rig.torso.add(fL);
    const fR = this.createPartMesh(legGeo, palette.limb || palette.body, rig); fR.position.set(-0.55, -0.15, 0.85); rig.legFR = fR; rig.torso.add(fR);
    const bL = this.createPartMesh(legGeo, palette.limb || palette.body, rig); bL.position.set(0.55, -0.15, -0.85); rig.legBL = bL; rig.torso.add(bL);
    const bR = this.createPartMesh(legGeo, palette.limb || palette.body, rig); bR.position.set(-0.55, -0.15, -0.85); rig.legBR = bR; rig.torso.add(bR);

    rig.torso.position.y = 0.45;
    root.add(rig.torso);
    root.add(CreatureMaterialFactory.getContactShadowMesh(2.0));
    root.userData.rig = rig;
    return root;
  }

  public static buildRangdaCorrupted(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('rangda_corrupted', variant);
    const rig: CreatureRig = {
      modelType: 'rangda_corrupted',
      locomotion: 'flying',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      armL: new THREE.Group(),
      armR: new THREE.Group(),
      shadowBaseScale: 1.5,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('rangda_torso', () =>
      this.buildPartGeometry([
        { size: [0.65, 1.15, 0.45], pos: [0, 0, 0], matIndex: 0 }, // violet void robes
      ])
    );
    const torsoMesh = this.createPartMesh(torsoGeo, palette.body, rig);
    rig.torso.add(torsoMesh);

    const headGeo = EntityModelCache.getPartGeometry('rangda_head', () =>
      this.buildPartGeometry([
        { size: [0.75, 0.65, 0.45], pos: [0, 0, 0.1], matIndex: 0 }, // Leyak mask
        { size: [0.22, 0.85, 0.15], pos: [0, -0.45, 0.32], matIndex: 1 }, // red flame tongue
      ])
    );
    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.accent], rig);
    headMesh.position.set(0, 0.72, 0.1);
    rig.head = headMesh;
    rig.torso.add(rig.head);

    const armGeo = EntityModelCache.getPartGeometry('rangda_arm', () =>
      this.buildPartGeometry([{ size: [0.18, 0.85, 0.18], pos: [0, -0.42, 0], matIndex: 0 }])
    );
    const aL = this.createPartMesh(armGeo, palette.body, rig); aL.position.set(0.45, 0.35, 0); rig.armL = aL; rig.torso.add(aL);
    const aR = this.createPartMesh(armGeo, palette.body, rig); aR.position.set(-0.45, 0.35, 0); rig.armR = aR; rig.torso.add(aR);

    rig.torso.position.y = 1.25;
    root.add(rig.torso);
    root.add(CreatureMaterialFactory.getContactShadowMesh(1.5));
    root.userData.rig = rig;
    return root;
  }

  public static buildPociKelep(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('poci_kelep', variant);
    const rig: CreatureRig = {
      modelType: 'poci_kelep',
      locomotion: 'flying',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      wingL: new THREE.Group(),
      wingR: new THREE.Group(),
      shadowBaseScale: 1.3,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('poci_torso', () =>
      this.buildPartGeometry([
        { size: [0.65, 0.85, 0.55], pos: [0, 0, 0], matIndex: 0 },
      ])
    );
    const torsoMesh = this.createPartMesh(torsoGeo, palette.body, rig);
    rig.torso.add(torsoMesh);

    const headGeo = EntityModelCache.getPartGeometry('poci_head', () =>
      this.buildPartGeometry([{ size: [0.42, 0.42, 0.42], pos: [0, 0, 0], matIndex: 0 }])
    );
    const headMesh = this.createPartMesh(headGeo, palette.body, rig);
    headMesh.position.set(0, 0.52, 0.1);
    rig.head = headMesh;
    rig.torso.add(rig.head);

    const wingGeo = EntityModelCache.getPartGeometry('poci_wing', () =>
      this.buildPartGeometry([{ size: [0.12, 0.65, 0.75], pos: [0, 0, -0.1], matIndex: 0 }])
    );
    const wL = this.createPartMesh(wingGeo, palette.accent || palette.body, rig); wL.position.set(0.38, 0.25, -0.1); rig.wingL = wL; rig.torso.add(wL);
    const wR = this.createPartMesh(wingGeo, palette.accent || palette.body, rig); wR.position.set(-0.38, 0.25, -0.1); rig.wingR = wR; rig.torso.add(wR);

    rig.torso.position.y = 0.9;
    root.add(rig.torso);
    root.add(CreatureMaterialFactory.getContactShadowMesh(1.3));
    root.userData.rig = rig;
    return root;
  }

  public static buildAsmatWarPhantom(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('asmat_war_phantom', variant);
    const rig: CreatureRig = {
      modelType: 'asmat_war_phantom',
      locomotion: 'biped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      armL: new THREE.Group(),
      armR: new THREE.Group(),
      legFL: new THREE.Group(),
      legFR: new THREE.Group(),
      shadowBaseScale: 1.5,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('asmat_torso', () =>
      this.buildPartGeometry([{ size: [0.55, 0.95, 0.38], pos: [0, 0, 0], matIndex: 0 }])
    );
    const torsoMesh = this.createPartMesh(torsoGeo, palette.body, rig);
    rig.torso.add(torsoMesh);

    const headGeo = EntityModelCache.getPartGeometry('asmat_head', () =>
      this.buildPartGeometry([
        { size: [0.38, 0.38, 0.38], pos: [0, 0, 0], matIndex: 0 },
        { size: [0.42, 0.12, 0.42], pos: [0, 0.18, 0], matIndex: 1 }, // white war paint geometry
      ])
    );
    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.belly!], rig);
    headMesh.position.set(0, 0.58, 0);
    rig.head = headMesh;
    rig.torso.add(rig.head);

    // Left arm holding giant ancestral shield
    const shieldArmGeo = EntityModelCache.getPartGeometry('asmat_shield_arm', () =>
      this.buildPartGeometry([
        { size: [0.18, 0.75, 0.18], pos: [0, -0.37, 0], matIndex: 0 },
        { size: [0.18, 1.45, 0.85], pos: [0.15, -0.37, 0.35], matIndex: 1 }, // carved red ancestral shield
      ])
    );
    const aL = this.createPartMesh(shieldArmGeo, [palette.body, palette.accent], rig); aL.position.set(0.38, 0.35, 0); rig.armL = aL; rig.torso.add(aL);

    const armRGeo = EntityModelCache.getPartGeometry('asmat_arm_r', () =>
      this.buildPartGeometry([{ size: [0.18, 0.75, 0.18], pos: [0, -0.37, 0], matIndex: 0 }])
    );
    const aR = this.createPartMesh(armRGeo, palette.body, rig); aR.position.set(-0.38, 0.35, 0); rig.armR = aR; rig.torso.add(aR);

    rig.torso.position.y = 1.1;
    root.add(rig.torso);
    root.add(CreatureMaterialFactory.getContactShadowMesh(1.5));
    root.userData.rig = rig;
    return root;
  }

  public static buildRimbaPari(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('rimba_pari', variant);
    const rig: CreatureRig = {
      modelType: 'rimba_pari',
      locomotion: 'flying',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      shadowBaseScale: 1.3,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('pari_torso', () =>
      this.buildPartGeometry([
        { size: [0.45, 0.95, 0.35], pos: [0, 0, 0], matIndex: 0 }, // emerald dress
      ])
    );
    const torsoMesh = this.createPartMesh(torsoGeo, palette.body, rig);
    rig.torso.add(torsoMesh);

    const headGeo = EntityModelCache.getPartGeometry('pari_head', () =>
      this.buildPartGeometry([
        { size: [0.35, 0.35, 0.35], pos: [0, 0, 0], matIndex: 0 },
        { size: [0.55, 0.22, 0.55], pos: [0, 0.22, 0], matIndex: 1 }, // rafflesia crown
      ])
    );
    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.accent], rig);
    headMesh.position.set(0, 0.58, 0);
    rig.head = headMesh;
    rig.torso.add(rig.head);

    rig.torso.position.y = 1.2;
    root.add(rig.torso);
    root.add(CreatureMaterialFactory.getContactShadowMesh(1.3));
    root.userData.rig = rig;
    return root;
  }

  public static buildWarakNgendog(variant: number = 0): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('warak_ngendog', variant);
    const rig: CreatureRig = {
      modelType: 'warak_ngendog',
      locomotion: 'quadruped',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      legFL: new THREE.Group(),
      legFR: new THREE.Group(),
      legBL: new THREE.Group(),
      legBR: new THREE.Group(),
      shadowBaseScale: 1.6,
      animPhase: Math.random() * Math.PI * 2,
      variantIndex: variant,
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('warak_torso', () =>
      this.buildPartGeometry([
        { size: [0.85, 0.78, 1.45], pos: [0, 0, 0], matIndex: 0 }, // crimson bovid body
        { size: [0.92, 0.45, 1.15], pos: [0, -0.1, 0], matIndex: 1 }, // blue sea scale flanks
      ])
    );
    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.belly!], rig);
    rig.torso.add(torsoMesh);

    const headGeo = EntityModelCache.getPartGeometry('warak_head', () =>
      this.buildPartGeometry([
        { size: [0.55, 0.52, 0.65], pos: [0, 0, 0.25], matIndex: 0 }, // dragon head
        { size: [0.18, 0.55, 0.18], pos: [0.32, 0.38, 0.2], rot: [0.2, 0, -0.3], matIndex: 1 }, // golden horn L
        { size: [0.18, 0.55, 0.18], pos: [-0.32, 0.38, 0.2], rot: [0.2, 0, 0.3], matIndex: 1 }, // golden horn R
      ])
    );
    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.accent], rig);
    headMesh.position.set(0, 0.45, 0.75);
    rig.head = headMesh;
    rig.torso.add(rig.head);

    const legGeo = EntityModelCache.getPartGeometry('warak_leg', () =>
      this.buildPartGeometry([{ size: [0.32, 0.72, 0.32], pos: [0, -0.36, 0], matIndex: 0 }])
    );
    const fL = this.createPartMesh(legGeo, palette.limb || palette.body, rig); fL.position.set(0.38, -0.25, 0.52); rig.legFL = fL; rig.torso.add(fL);
    const fR = this.createPartMesh(legGeo, palette.limb || palette.body, rig); fR.position.set(-0.38, -0.25, 0.52); rig.legFR = fR; rig.torso.add(fR);
    const bL = this.createPartMesh(legGeo, palette.limb || palette.body, rig); bL.position.set(0.38, -0.25, -0.52); rig.legBL = bL; rig.torso.add(bL);
    const bR = this.createPartMesh(legGeo, palette.limb || palette.body, rig); bR.position.set(-0.38, -0.25, -0.52); rig.legBR = bR; rig.torso.add(bR);

    rig.torso.position.y = 0.82;
    root.add(rig.torso);
    root.add(CreatureMaterialFactory.getContactShadowMesh(1.6));
    root.userData.rig = rig;
    return root;
  }

  public static buildCandiSentinel(): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('candi_sentinel', 0);
    const rig: CreatureRig = {
      modelType: 'candi_sentinel',
      locomotion: 'boss_golem',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      armL: new THREE.Group(),
      armR: new THREE.Group(),
      legFL: new THREE.Group(),
      legFR: new THREE.Group(),
      shadowBaseScale: 2.2,
      animPhase: 0,
      variantIndex: 0,
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('candi_torso', () =>
      this.buildPartGeometry([
        { size: [1.45, 1.85, 0.95], pos: [0, 0, 0], matIndex: 0 }, // stone body
        { size: [0.55, 0.55, 0.25], pos: [0, 0.25, 0.42], matIndex: 1 }, // glowing cyan eye core
      ])
    );
    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.accent], rig);
    rig.torso.add(torsoMesh);

    const headGeo = EntityModelCache.getPartGeometry('candi_head', () =>
      this.buildPartGeometry([{ size: [0.85, 0.85, 0.85], pos: [0, 0, 0], matIndex: 0 }])
    );
    const headMesh = this.createPartMesh(headGeo, palette.body, rig);
    headMesh.position.set(0, 1.25, 0);
    rig.head = headMesh;
    rig.torso.add(rig.head);

    const armGeo = EntityModelCache.getPartGeometry('candi_arm', () =>
      this.buildPartGeometry([{ size: [0.55, 1.45, 0.55], pos: [0, -0.72, 0], matIndex: 0 }])
    );
    const aL = this.createPartMesh(armGeo, palette.body, rig); aL.position.set(0.95, 0.65, 0); rig.armL = aL; rig.torso.add(aL);
    const aR = this.createPartMesh(armGeo, palette.body, rig); aR.position.set(-0.95, 0.65, 0); rig.armR = aR; rig.torso.add(aR);

    rig.torso.position.y = 1.8;
    root.add(rig.torso);
    root.add(CreatureMaterialFactory.getContactShadowMesh(2.2));
    root.userData.rig = rig;
    return root;
  }

  public static buildRaksasaUlin(): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('raksasa_ulin', 0);
    const rig: CreatureRig = {
      modelType: 'raksasa_ulin',
      locomotion: 'boss_golem',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      armL: new THREE.Group(),
      armR: new THREE.Group(),
      shadowBaseScale: 2.4,
      animPhase: 0,
      variantIndex: 0,
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('raksasa_torso', () =>
      this.buildPartGeometry([
        { size: [1.65, 2.15, 1.15], pos: [0, 0, 0], matIndex: 0 }, // petrified ulin trunk
        { size: [1.75, 0.85, 1.25], pos: [0, -0.45, 0], matIndex: 1 }, // glowing moss roots
      ])
    );
    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.accent], rig);
    rig.torso.add(torsoMesh);

    const headGeo = EntityModelCache.getPartGeometry('raksasa_head', () =>
      this.buildPartGeometry([{ size: [0.95, 0.95, 0.95], pos: [0, 0, 0], matIndex: 0 }])
    );
    const headMesh = this.createPartMesh(headGeo, palette.body, rig);
    headMesh.position.set(0, 1.45, 0);
    rig.head = headMesh;
    rig.torso.add(rig.head);

    rig.torso.position.y = 2.0;
    root.add(rig.torso);
    root.add(CreatureMaterialFactory.getContactShadowMesh(2.4));
    root.userData.rig = rig;
    return root;
  }

  public static buildBataraBhumi(): THREE.Group {
    const root = new THREE.Group();
    const palette = CreatureMaterialFactory.getPalette('hyang_batara_bhumi', 0);
    const rig: CreatureRig = {
      modelType: 'hyang_batara_bhumi',
      locomotion: 'boss_sovereign',
      root,
      torso: new THREE.Group(),
      head: new THREE.Group(),
      armL: new THREE.Group(),
      armR: new THREE.Group(),
      legFL: new THREE.Group(),
      legFR: new THREE.Group(),
      shadowBaseScale: 3.5,
      animPhase: 0,
      variantIndex: 0,
      originalMaterials: new Map(),
    };

    const torsoGeo = EntityModelCache.getPartGeometry('batara_torso', () =>
      this.buildPartGeometry([
        { size: [2.85, 3.45, 1.85], pos: [0, 0, 0], matIndex: 0 }, // basalt rock titan body
        { size: [1.25, 1.25, 0.55], pos: [0, 0.45, 0.85], matIndex: 1 }, // Aether crystal chest core
        { size: [2.25, 0.65, 0.45], pos: [0, -0.55, 0.88], matIndex: 2 }, // lava veins
      ])
    );
    const torsoMesh = this.createPartMesh(torsoGeo, [palette.body, palette.accent, palette.belly!], rig);
    rig.torso.add(torsoMesh);

    const headGeo = EntityModelCache.getPartGeometry('batara_head', () =>
      this.buildPartGeometry([
        { size: [1.45, 1.45, 1.45], pos: [0, 0, 0], matIndex: 0 },
        { size: [1.65, 0.85, 1.65], pos: [0, 0.95, 0], matIndex: 1 }, // golden volcanic crown spires
      ])
    );
    const headMesh = this.createPartMesh(headGeo, [palette.body, palette.horn!], rig);
    headMesh.position.set(0, 2.25, 0);
    rig.head = headMesh;
    rig.torso.add(rig.head);

    const armGeo = EntityModelCache.getPartGeometry('batara_arm', () =>
      this.buildPartGeometry([{ size: [0.95, 2.45, 0.95], pos: [0, -1.22, 0], matIndex: 0 }])
    );
    const aL = this.createPartMesh(armGeo, palette.body, rig); aL.position.set(1.85, 1.15, 0); rig.armL = aL; rig.torso.add(aL);
    const aR = this.createPartMesh(armGeo, palette.body, rig); aR.position.set(-1.85, 1.15, 0); rig.armR = aR; rig.torso.add(aR);

    rig.torso.position.y = 3.2;
    root.add(rig.torso);
    root.add(CreatureMaterialFactory.getContactShadowMesh(3.5));
    root.userData.rig = rig;
    return root;
  }

  // Backwards compatibility helper for tests or callers expecting buildNPC
  public static buildNPC(role: 'merchant' | 'elder', variant: number = 0): THREE.Group {
    return role === 'elder' ? this.buildElder(variant) : this.buildMerchant(variant);
  }
}
