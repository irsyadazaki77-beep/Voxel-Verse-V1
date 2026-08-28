const fs = require('fs');
let content = fs.readFileSync('src/engine/world/VoxelMesher.ts', 'utf-8');

const regex = /  public static createGeometryFromTransferable[\s\S]*\}\n\}\n?\}/;
content = content.replace(regex, "}");

// Wait, I might have messed up the braces, let me do it carefully.
content = content.split("  public static createGeometryFromTransferable")[0];
content += "}\n";

fs.writeFileSync('src/engine/world/VoxelMesher.ts', content);
