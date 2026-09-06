const fs = require('fs');
let code = fs.readFileSync('src/engine/entities/EntityModelBuilder.ts', 'utf8');

const newModels = `
      case 'storm_ray':
        const rayGroup = new THREE.Group();
        const rayBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 2.0), material);
        rayBody.position.y = 0.5;
        const rayTail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.5), material);
        rayTail.position.set(0, 0.5, 1.5);
        rayGroup.add(rayBody, rayTail);
        return {
           root: rayGroup,
           animator: {
              update: (dt, speed, isMoving) => {
                 rayBody.rotation.z = Math.sin(Date.now() * 0.003) * 0.2; // wing flap
                 rayGroup.position.y = Math.sin(Date.now() * 0.002) * 0.5 + 2.0; // float
              }
           }
        };

      case 'crystal_golem':
        const golemGroup = new THREE.Group();
        const golemBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.0, 1.0), material);
        golemBody.position.y = 1.0;
        const golemHead = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), material);
        golemHead.position.y = 2.4;
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.2, 0.6), material);
        armL.position.set(-1.1, 1.0, 0);
        const armR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.2, 0.6), material);
        armR.position.set(1.1, 1.0, 0);
        golemGroup.add(golemBody, golemHead, armL, armR);
        return {
           root: golemGroup,
           animator: {
              update: (dt, speed, isMoving) => {
                 if (isMoving) {
                    armL.rotation.x = Math.sin(Date.now() * 0.005) * 0.5;
                    armR.rotation.x = -Math.sin(Date.now() * 0.005) * 0.5;
                 } else {
                    armL.rotation.x = 0;
                    armR.rotation.x = 0;
                 }
              }
           }
        };
`;

code = code.replace("case 'aether_stag':", newModels + "\n      case 'aether_stag':");
fs.writeFileSync('src/engine/entities/EntityModelBuilder.ts', code);

let matCode = fs.readFileSync('src/engine/entities/CreatureMaterialFactory.ts', 'utf8');
const newMats = `
      case 'storm_ray': {
        const mat = CreatureMaterialFactory.createBaseMaterial(0x22d3ee);
        mat.emissive.setHex(0x06b6d4);
        mat.emissiveIntensity = 0.5;
        return mat;
      }
      case 'crystal_golem': {
        const mat = CreatureMaterialFactory.createBaseMaterial(0xc084fc);
        mat.transparent = true;
        mat.opacity = 0.8;
        mat.emissive.setHex(0xa855f7);
        mat.emissiveIntensity = 0.3;
        mat.roughness = 0.1;
        mat.metalness = 0.8;
        return mat;
      }
`;
matCode = matCode.replace("case 'aether_stag':", newMats + "\n      case 'aether_stag':");
fs.writeFileSync('src/engine/entities/CreatureMaterialFactory.ts', matCode);
