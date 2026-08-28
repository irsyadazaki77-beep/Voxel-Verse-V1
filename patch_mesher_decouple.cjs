const fs = require('fs');
let content = fs.readFileSync('src/engine/world/VoxelMesher.ts', 'utf-8');

// Remove import * as THREE
content = content.replace("import * as THREE from 'three';\n", "");

// Remove createGeometryFromTransferable from VoxelMesher
const createGeoRegex = /  public static createGeometryFromTransferable[\s\S]*\}\n\}/;
content = content.replace(createGeoRegex, "}");

fs.writeFileSync('src/engine/world/VoxelMesher.ts', content);
