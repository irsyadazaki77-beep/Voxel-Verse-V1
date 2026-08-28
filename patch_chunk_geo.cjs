const fs = require('fs');
let content = fs.readFileSync('src/engine/world/Chunk.ts', 'utf-8');

// Add TransferableMeshData import
content = content.replace("import { VoxelMesher }", "import { VoxelMesher, TransferableMeshData }");

const helperFunc = `
function createGeometryFromTransferable(data: TransferableMeshData): { solidMesh: THREE.BufferGeometry; transMesh: THREE.BufferGeometry; waterMesh: THREE.BufferGeometry } {
  const createGeo = (pos: Float32Array, norm: Float32Array, col: Float32Array, uv: Float32Array, ind: Uint32Array) => {
    const geo = new THREE.BufferGeometry();
    if (pos.length > 0) {
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setIndex(new THREE.BufferAttribute(ind, 1));
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
    }
    return geo;
  };

  return {
    solidMesh: createGeo(data.solidPositions, data.solidNormals, data.solidColors, data.solidUvs, data.solidIndices),
    transMesh: createGeo(data.transPositions, data.transNormals, data.transColors, data.transUvs, data.transIndices),
    waterMesh: createGeo(data.waterPositions, data.waterNormals, data.waterColors, data.waterUvs, data.waterIndices),
  };
}
`;

content = content.replace("export class Chunk {", helperFunc + "\nexport class Chunk {");

content = content.replace("VoxelMesher.createGeometryFromTransferable(meshData)", "createGeometryFromTransferable(meshData)");

fs.writeFileSync('src/engine/world/Chunk.ts', content);
