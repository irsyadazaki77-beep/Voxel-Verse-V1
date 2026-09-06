const fs = require('fs');
let code = fs.readFileSync('src/engine/entities/EntityModelBuilder.ts', 'utf8');

const target1 = `return {
           root: rayGroup,
           animator: {
              update: (dt, speed, isMoving) => {
                 rayBody.rotation.z = Math.sin(Date.now() * 0.003) * 0.2; // wing flap
                 rayGroup.position.y = Math.sin(Date.now() * 0.002) * 0.5 + 2.0; // float
              }
           }
        };`;
        
const replace1 = `return rayGroup;`;

const target2 = `return {
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
        };`;
        
const replace2 = `return golemGroup;`;

code = code.replace(target1, replace1);
code = code.replace(target2, replace2);

fs.writeFileSync('src/engine/entities/EntityModelBuilder.ts', code);
