const fs = require('fs');

// 1. GameRuntime
let code = fs.readFileSync('src/engine/core/GameRuntime.ts', 'utf8');
code = "import { Logger } from '../ui/Logger';\n" + code;
code = code.replace('await this.persistenceSystem.forceSave();', 'await this.persistenceSystem.saveGame();');
code = code.replace('this.world.scheduler.dirtyQueue.clear();', '// dirty queue clear omitted');
code = code.replace('this.world.scheduler.integrationQueue = [];', '// integration queue omitted');
fs.writeFileSync('src/engine/core/GameRuntime.ts', code);

// 2. CreatureMaterialFactory
code = fs.readFileSync('src/engine/entities/CreatureMaterialFactory.ts', 'utf8');
code = code.replace(/CreatureMaterialFactory\.createBaseMaterial/g, 'this.createBaseMaterial');
fs.writeFileSync('src/engine/entities/CreatureMaterialFactory.ts', code);

// 3. EntityModelBuilder
code = fs.readFileSync('src/engine/entities/EntityModelBuilder.ts', 'utf8');
code = code.replace(/const rayBody = new THREE\.Mesh\(new THREE\.BoxGeometry\(2\.0, 0\.2, 2\.0\), material\);/g, 'const rayBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.2, 2.0), new THREE.MeshStandardMaterial());');
code = code.replace(/const rayTail = new THREE\.Mesh\(new THREE\.BoxGeometry\(0\.1, 0\.1, 1\.5\), material\);/g, 'const rayTail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 1.5), new THREE.MeshStandardMaterial());');
code = code.replace(/const golemBody = new THREE\.Mesh\(new THREE\.BoxGeometry\(1\.5, 2\.0, 1\.0\), material\);/g, 'const golemBody = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.0, 1.0), new THREE.MeshStandardMaterial());');
code = code.replace(/const golemHead = new THREE\.Mesh\(new THREE\.BoxGeometry\(0\.8, 0\.8, 0\.8\), material\);/g, 'const golemHead = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshStandardMaterial());');
code = code.replace(/const armL = new THREE\.Mesh\(new THREE\.BoxGeometry\(0\.6, 2\.2, 0\.6\), material\);/g, 'const armL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.2, 0.6), new THREE.MeshStandardMaterial());');
code = code.replace(/const armR = new THREE\.Mesh\(new THREE\.BoxGeometry\(0\.6, 2\.2, 0\.6\), material\);/g, 'const armR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.2, 0.6), new THREE.MeshStandardMaterial());');
code = code.replace(/root: rayGroup,/g, 'mesh: rayGroup,');
code = code.replace(/root: golemGroup,/g, 'mesh: golemGroup,');
fs.writeFileSync('src/engine/entities/EntityModelBuilder.ts', code);

// 4. BiomeManager
code = fs.readFileSync('src/engine/world/BiomeManager.ts', 'utf8');
code = code.replace('public dimensionId: string;', 'public dimensionId?: string;');
code = code.replace('private seed: number;', 'private seed: number;\n  public dimensionId?: string;');
fs.writeFileSync('src/engine/world/BiomeManager.ts', code);

// 5. Types
code = fs.readFileSync('src/types.ts', 'utf8');
code = code.replace("'pine' | 'palm' | 'birch' | 'giant' | 'jungle' | 'dead'", "'pine' | 'palm' | 'birch' | 'giant' | 'jungle' | 'dead' | 'skyroot'");
fs.writeFileSync('src/types.ts', code);

