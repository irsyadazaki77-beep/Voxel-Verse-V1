const fs = require('fs');
let content = fs.readFileSync('src/engine/world/VoxelMesher.ts', 'utf-8');

// Add TransferableMeshData
const transDef = `
export interface TransferableMeshData {
  solidPositions: Float32Array;
  solidNormals: Float32Array;
  solidColors: Float32Array;
  solidUvs: Float32Array;
  solidIndices: Uint32Array;
  transPositions: Float32Array;
  transNormals: Float32Array;
  transColors: Float32Array;
  transUvs: Float32Array;
  transIndices: Uint32Array;
  waterPositions: Float32Array;
  waterNormals: Float32Array;
  waterColors: Float32Array;
  waterUvs: Float32Array;
  waterIndices: Uint32Array;
}
`;

content = content.replace("export interface ChunkMeshData {", transDef + "export interface ChunkMeshData {");

// Change buildChunkMesh to buildChunkMeshData
content = content.replace(
  "public static buildChunkMesh(", 
  "public static buildChunkMeshData("
);
content = content.replace(
  "  ): { solidMesh: THREE.BufferGeometry; transMesh: THREE.BufferGeometry; waterMesh: THREE.BufferGeometry } {",
  "  ): TransferableMeshData {"
);

// End of function changes
const endFuncRegex = /\/\/ 3\. CONVERT ARRAYS TO THREE\.js BUFFER GEOMETRIES[\s\S]*return \{\s*solidMesh: createGeo\([\s\S]*\}\s*\}/;

const newEndFunc = `    // 3. CONVERT ARRAYS TO TYPED ARRAYS FOR WORKER TRANSFER
    return {
      solidPositions: new Float32Array(data.solidPositions),
      solidNormals: new Float32Array(data.solidNormals),
      solidColors: new Float32Array(data.solidColors),
      solidUvs: new Float32Array(data.solidUvs),
      solidIndices: new Uint32Array(data.solidIndices),
      transPositions: new Float32Array(data.transPositions),
      transNormals: new Float32Array(data.transNormals),
      transColors: new Float32Array(data.transColors),
      transUvs: new Float32Array(data.transUvs),
      transIndices: new Uint32Array(data.transIndices),
      waterPositions: new Float32Array(data.waterPositions),
      waterNormals: new Float32Array(data.waterNormals),
      waterColors: new Float32Array(data.waterColors),
      waterUvs: new Float32Array(data.waterUvs),
      waterIndices: new Uint32Array(data.waterIndices),
    };
  }

  public static createGeometryFromTransferable(data: TransferableMeshData): { solidMesh: THREE.BufferGeometry; transMesh: THREE.BufferGeometry; waterMesh: THREE.BufferGeometry } {
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
  }`;

content = content.replace(endFuncRegex, newEndFunc);

fs.writeFileSync('src/engine/world/VoxelMesher.ts', content);
