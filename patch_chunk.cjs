const fs = require('fs');
let content = fs.readFileSync('src/engine/world/Chunk.ts', 'utf-8');

// Replace buildChunkMesh with buildChunkMeshData and createGeometryFromTransferable
content = content.replace(
  "const { solidMesh: sGeo, transMesh: tGeo, waterMesh: wGeo } = VoxelMesher.buildChunkMesh(",
  "const meshData = VoxelMesher.buildChunkMeshData("
);

// find where buildChunkMesh ends and geometry creation starts
const geoCreateRegex = /CHUNK_SIZE_Z\n    \);\n\n    if \(sGeo\.attributes\.position/g;
content = content.replace(geoCreateRegex, "CHUNK_SIZE_Z\n    );\n    const { solidMesh: sGeo, transMesh: tGeo, waterMesh: wGeo } = VoxelMesher.createGeometryFromTransferable(meshData);\n\n    if (sGeo.attributes.position");

fs.writeFileSync('src/engine/world/Chunk.ts', content);
