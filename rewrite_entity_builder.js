import fs from 'fs';
const content = `// Procedural 3D Voxel Model Builder for Original Entities, Animals, Mobs & NPCs
// Refactored to eradicate Draw Calls using BufferGeometryUtils to merge static entity parts into a single mesh.

import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

interface EntityPart {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  pos?: [number, number, number];
  rot?: [number, number, number];
}

export class EntityModelBuilder {

  /**
   * Merges multiple geometry parts into a single THREE.Mesh to drastically reduce draw calls.
   * Maintains original multi-material support by using material indexing.
   */
  private static buildMergedMesh(parts: EntityPart[]): THREE.Group {
    const geometries: THREE.BufferGeometry[] = [];
    const materials: THREE.Material[] = [];

    for (const part of parts) {
      const geo = part.geo.clone();
      
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3(...(part.pos || [0, 0, 0]));
      const rotation = new THREE.Euler(...(part.rot || [0, 0, 0]));
      const quaternion = new THREE.Quaternion().setFromEuler(rotation);
      const scale = new THREE.Vector3(1, 1, 1);
      matrix.compose(position, quaternion, scale);
      geo.applyMatrix4(matrix);

      let matIndex = materials.indexOf(part.mat);
      if (matIndex === -1) {
        matIndex = materials.length;
        materials.push(part.mat);
      }

      geo.clearGroups();
      const indexCount = geo.index ? geo.index.count : geo.attributes.position.count;
      geo.addGroup(0, indexCount, matIndex);

      geometries.push(geo);
    }

    const mergedGeo = BufferGeometryUtils.mergeGeometries(geometries, true);
    const group = new THREE.Group();
    if (mergedGeo) {
      const mesh = new THREE.Mesh(mergedGeo, materials);
      // Cast shadows from the single unified mesh
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }
    return group;
  }

  // 1. Aurelion Crystal Stag (Herbivore Fauna)
  public static buildStag(): THREE.Group {
    const bodyGeo = new THREE.BoxGeometry(0.7, 0.6, 1.2);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x96613d });
    
    const neckGeo = new THREE.BoxGeometry(0.3, 0.5, 0.4);
    const headGeo = new THREE.BoxGeometry(0.35, 0.35, 0.45);
    
    const antlerGeo = new THREE.BoxGeometry(0.08, 0.45, 0.08);
    const antlerMat = new THREE.MeshLambertMaterial({ color: 0x4dd2ff, emissive: 0x114466 });
    
    const legGeo = new THREE.BoxGeometry(0.18, 0.6, 0.18);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x6e4325 });

    const parts: EntityPart[] = [
      { geo: bodyGeo, mat: bodyMat, pos: [0, 0.8, 0] },
      { geo: neckGeo, mat: bodyMat, pos: [0, 1.2, 0.5], rot: [-0.3, 0, 0] },
      { geo: headGeo, mat: bodyMat, pos: [0, 1.45, 0.7] },
      { geo: antlerGeo, mat: antlerMat, pos: [0.18, 1.75, 0.65], rot: [0, 0, -0.3] },
      { geo: antlerGeo, mat: antlerMat, pos: [-0.18, 1.75, 0.65], rot: [0, 0, 0.3] },
    ];

    const legPositions: [number, number, number][] = [
      [0.25, 0.3, 0.4],
      [-0.25, 0.3, 0.4],
      [0.25, 0.3, -0.4],
      [-0.25, 0.3, -0.4],
    ];

    legPositions.forEach(pos => {
      parts.push({ geo: legGeo, mat: legMat, pos });
    });

    return this.buildMergedMesh(parts);
  }

  // 2. Shadow Stalker (Nocturnal Hostile Predator)
  public static buildShadowStalker(): THREE.Group {
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.9, 0.3);
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x1a1528 });
    const headGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.05, 0.05);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1a40 });
    const armGeo = new THREE.BoxGeometry(0.14, 0.85, 0.14);
    const legGeo = new THREE.BoxGeometry(0.16, 0.7, 0.16);

    const parts: EntityPart[] = [
      { geo: bodyGeo, mat: bodyMat, pos: [0, 1.1, 0] },
      { geo: headGeo, mat: bodyMat, pos: [0, 1.75, 0] },
      { geo: eyeGeo, mat: eyeMat, pos: [0.1, 1.76, 0.2] },
      { geo: eyeGeo, mat: eyeMat, pos: [-0.1, 1.76, 0.2] },
      { geo: armGeo, mat: bodyMat, pos: [0.35, 1.1, 0.1] },
      { geo: armGeo, mat: bodyMat, pos: [-0.35, 1.1, 0.1] },
      { geo: legGeo, mat: bodyMat, pos: [0.15, 0.35, 0] },
      { geo: legGeo, mat: bodyMat, pos: [-0.15, 0.35, 0] },
    ];

    return this.buildMergedMesh(parts);
  }

  // 3. Void Spitter (Floating Levitating Aberration)
  public static buildVoidSpitter(): THREE.Group {
    const coreGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    const coreMat = new THREE.MeshLambertMaterial({ color: 0x8a2be2, emissive: 0x220044 });
    const shardGeo = new THREE.BoxGeometry(0.15, 0.35, 0.15);
    const shardMat = new THREE.MeshLambertMaterial({ color: 0x00ffff, emissive: 0x004466 });

    const parts: EntityPart[] = [
      { geo: coreGeo, mat: coreMat, pos: [0, 1.4, 0] }
    ];

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      parts.push({
        geo: shardGeo,
        mat: shardMat,
        pos: [Math.cos(angle) * 0.6, 1.4 + Math.sin(angle) * 0.2, Math.sin(angle) * 0.6],
        rot: [0, angle, 0]
      });
    }

    return this.buildMergedMesh(parts);
  }

  // 4. Nomadic Merchant / Settlement Elder NPC
  public static buildNPC(role: "merchant" | "elder"): THREE.Group {
    const robeColor = role === "merchant" ? 0x995c2b : 0x2b5f8f;
    const cloakColor = role === "merchant" ? 0xc49a45 : 0x5a3d8a;
    
    const bodyGeo = new THREE.BoxGeometry(0.5, 0.7, 0.3);
    const bodyMat = new THREE.MeshLambertMaterial({ color: robeColor });
    const headGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xe6b89c });
    const hoodGeo = new THREE.BoxGeometry(0.44, 0.2, 0.44);
    const hoodMat = new THREE.MeshLambertMaterial({ color: cloakColor });
    const legGeo = new THREE.BoxGeometry(0.2, 0.6, 0.2);
    const legMat = new THREE.MeshLambertMaterial({ color: 0x2d2b29 });

    const parts: EntityPart[] = [
      { geo: bodyGeo, mat: bodyMat, pos: [0, 0.95, 0] },
      { geo: headGeo, mat: headMat, pos: [0, 1.5, 0] },
      { geo: hoodGeo, mat: hoodMat, pos: [0, 1.65, 0] },
      { geo: legGeo, mat: legMat, pos: [0.13, 0.3, 0] },
      { geo: legGeo, mat: legMat, pos: [-0.13, 0.3, 0] },
    ];

    if (role === "merchant") {
      const packGeo = new THREE.BoxGeometry(0.45, 0.55, 0.35);
      const packMat = new THREE.MeshLambertMaterial({ color: 0x4a3728 });
      parts.push({ geo: packGeo, mat: packMat, pos: [0, 1.0, -0.3] });
    }

    return this.buildMergedMesh(parts);
  }

  // 5. Ruin Sentinel Mini-Boss (Ancient Heavy Golem)
  public static buildRuinSentinel(): THREE.Group {
    const torsoGeo = new THREE.BoxGeometry(1.2, 1.4, 0.8);
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x3f3f46 });
    const coreGeo = new THREE.BoxGeometry(0.4, 0.4, 0.2);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const armGeo = new THREE.BoxGeometry(0.45, 1.2, 0.45);
    const legGeo = new THREE.BoxGeometry(0.45, 0.9, 0.45);

    const parts: EntityPart[] = [
      { geo: torsoGeo, mat: stoneMat, pos: [0, 1.6, 0] },
      { geo: coreGeo, mat: coreMat, pos: [0, 1.6, 0.35] },
      { geo: armGeo, mat: stoneMat, pos: [0.9, 1.4, 0] },
      { geo: armGeo, mat: stoneMat, pos: [-0.9, 1.4, 0] },
      { geo: legGeo, mat: stoneMat, pos: [0.35, 0.45, 0] },
      { geo: legGeo, mat: stoneMat, pos: [-0.35, 0.45, 0] },
    ];

    return this.buildMergedMesh(parts);
  }

  // 6. Void Sovereign (Cataclysmic World Boss)
  public static buildVoidSovereign(): THREE.Group {
    const bodyGeo = new THREE.BoxGeometry(0.8, 1.6, 0.5);
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x0f0b1a });
    const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const crownGeo = new THREE.BoxGeometry(0.15, 0.5, 0.15);
    const crownMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    const wingGeo = new THREE.BoxGeometry(1.8, 1.2, 0.1);
    const wingMat = new THREE.MeshLambertMaterial({ color: 0x3b0764, transparent: true, opacity: 0.85 });
    const runeGeo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const runeMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });

    const parts: EntityPart[] = [
      { geo: bodyGeo, mat: darkMat, pos: [0, 1.8, 0] },
      { geo: headGeo, mat: darkMat, pos: [0, 2.7, 0] },
      { geo: crownGeo, mat: crownMat, pos: [0.25, 3.1, 0], rot: [0, 0, -0.3] },
      { geo: crownGeo, mat: crownMat, pos: [-0.25, 3.1, 0], rot: [0, 0, 0.3] },
      { geo: wingGeo, mat: wingMat, pos: [0, 2.0, -0.3] }
    ];

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      parts.push({
        geo: runeGeo,
        mat: runeMat,
        pos: [Math.cos(angle) * 1.2, 2.0 + Math.sin(angle) * 0.3, Math.sin(angle) * 1.2]
      });
    }

    return this.buildMergedMesh(parts);
  }
}
`;
fs.writeFileSync('src/engine/entities/EntityModelBuilder.ts', content);
