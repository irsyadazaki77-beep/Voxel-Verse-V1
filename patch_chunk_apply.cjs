const fs = require('fs');
let content = fs.readFileSync('src/engine/world/Chunk.ts', 'utf-8');

// Replace rebuildMesh with applyTransferableMesh
// Wait, we can keep rebuildMesh just in case, and ADD applyTransferableMesh

const newMethod = `
  public applyTransferableMesh(
    meshData: TransferableMeshData,
    solidMaterial: THREE.Material,
    transMaterial: THREE.Material,
    waterMaterial: THREE.Material
  ): void {
    if (this.solidMesh) {
      this.group.remove(this.solidMesh);
      this.solidMesh.geometry.dispose();
      this.solidMesh = undefined;
    }
    if (this.transMesh) {
      this.group.remove(this.transMesh);
      this.transMesh.geometry.dispose();
      this.transMesh = undefined;
    }
    if (this.waterMesh) {
      this.group.remove(this.waterMesh);
      this.waterMesh.geometry.dispose();
      this.waterMesh = undefined;
    }

    const { solidMesh: sGeo, transMesh: tGeo, waterMesh: wGeo } = createGeometryFromTransferable(meshData);

    if (sGeo.attributes.position && sGeo.attributes.position.count > 0) {
      this.solidMesh = new THREE.Mesh(sGeo, solidMaterial);
      this.solidMesh.castShadow = true;
      this.solidMesh.receiveShadow = true;
      this.group.add(this.solidMesh);
    }
    if (tGeo.attributes.position && tGeo.attributes.position.count > 0) {
      this.transMesh = new THREE.Mesh(tGeo, transMaterial);
      this.group.add(this.transMesh);
    }
    if (wGeo.attributes.position && wGeo.attributes.position.count > 0) {
      this.waterMesh = new THREE.Mesh(wGeo, waterMaterial);
      this.group.add(this.waterMesh);
    }

    this.isDirty = false;
  }
`;

content = content.replace("export class Chunk {", "export class Chunk {" + newMethod);

fs.writeFileSync('src/engine/world/Chunk.ts', content);
