const fs = require('fs');
let code = fs.readFileSync('src/engine/world/WorldGeneratorCore.ts', 'utf8');
console.log(code.match(/generateOakTree\(.*\)/)[0]);
