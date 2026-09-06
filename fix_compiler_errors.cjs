const fs = require('fs');
let code = fs.readFileSync('src/engine/world/WorldGeneratorCore.ts', 'utf8');

// Fix new StructureGenerator()
code = code.replace(/const structureGen = new StructureGenerator\(this\.seed\);/g, '');

// Fix applyStructureToChunkLocal calls
// Ensure the signature is correctly updated
const sigTarget = 'structure: Record<string, number> | { dx: number, dy: number, dz: number, block: number }[],';
if (!code.includes(sigTarget)) {
  code = code.replace('structure: Record<string, number>,', sigTarget);
}

// Fix tree gen calls
code = code.replace(/structureGen\.generateOakTree\([^)]+\)/g, 'StructureGenerator.generateOakTree(wx + wz)');
code = code.replace(/structureGen\.generatePineTree\([^)]+\)/g, 'StructureGenerator.generatePineTree(wx + wz)');

fs.writeFileSync('src/engine/world/WorldGeneratorCore.ts', code);
