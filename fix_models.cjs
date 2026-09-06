const fs = require('fs');

// CreatureMaterialFactory
let code = fs.readFileSync('src/engine/entities/CreatureMaterialFactory.ts', 'utf8');
code = code.replace(/this\.createBaseMaterial/g, 'CreatureMaterialFactory.createBaseMaterial');
fs.writeFileSync('src/engine/entities/CreatureMaterialFactory.ts', code);

// EntityModelBuilder
code = fs.readFileSync('src/engine/entities/EntityModelBuilder.ts', 'utf8');
code = code.replace(/mesh: rayGroup,/g, 'root: rayGroup,');
code = code.replace(/mesh: golemGroup,/g, 'root: golemGroup,');
fs.writeFileSync('src/engine/entities/EntityModelBuilder.ts', code);

