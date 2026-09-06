const fs = require('fs');
let code = fs.readFileSync('src/engine/entities/CreatureMaterialFactory.ts', 'utf8');

const target1 = `      case 'storm_ray': {
        const mat = CreatureMaterialFactory.createBaseMaterial(0x22d3ee);
        mat.emissive.setHex(0x06b6d4);
        mat.emissiveIntensity = 0.5;
        return mat;
      }`;
      
const replace1 = `      case 'storm_ray': {
        const mat = new THREE.MeshStandardMaterial({ color: 0x22d3ee });
        mat.emissive.setHex(0x06b6d4);
        mat.emissiveIntensity = 0.5;
        return {
          body: mat,
          accent: mat,
          eye: new THREE.MeshBasicMaterial({ color: 0xffffff })
        };
      }`;

const target2 = `      case 'crystal_golem': {
        const mat = CreatureMaterialFactory.createBaseMaterial(0xc084fc);
        mat.transparent = true;
        mat.opacity = 0.8;
        mat.emissive.setHex(0xa855f7);
        mat.emissiveIntensity = 0.3;
        mat.roughness = 0.1;
        mat.metalness = 0.8;
        return mat;
      }`;

const replace2 = `      case 'crystal_golem': {
        const mat = new THREE.MeshStandardMaterial({ color: 0xc084fc });
        mat.transparent = true;
        mat.opacity = 0.8;
        mat.emissive.setHex(0xa855f7);
        mat.emissiveIntensity = 0.3;
        mat.roughness = 0.1;
        mat.metalness = 0.8;
        return {
          body: mat,
          accent: mat,
          eye: new THREE.MeshBasicMaterial({ color: 0xffffff })
        };
      }`;

code = code.replace(target1, replace1);
code = code.replace(target2, replace2);

fs.writeFileSync('src/engine/entities/CreatureMaterialFactory.ts', code);
