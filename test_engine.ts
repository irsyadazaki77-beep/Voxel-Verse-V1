import * as THREE from 'three';
import { VoxelWorld } from './src/engine/world/VoxelWorld';
import { WorldGeneratorCore } from './src/engine/world/WorldGeneratorCore';
import { VoxelMesher } from './src/engine/world/VoxelMesher';
import { Chunk, CHUNK_SIZE_X, CHUNK_SIZE_Y, CHUNK_SIZE_Z } from './src/engine/world/Chunk';

const seed = 42819;
const world = new VoxelWorld(seed, 'standard');
const spawn = world.findSafeSpawn(seed);
console.log('Spawn calculated:', spawn);

const cx = Math.floor(spawn[0] / 16);
const cz = Math.floor(spawn[2] / 16);
console.log('Spawn chunk:', cx, cz);

const chunk = world.getChunk(cx, cz);
console.log('Chunk exists?', !!chunk);
if (chunk) {
  console.log('Solid mesh exists?', !!chunk.solidMesh);
  if (chunk.solidMesh) {
    console.log('Solid positions count:', chunk.solidMesh.geometry.attributes.position.count);
    console.log('Solid mesh bounding box:', chunk.solidMesh.geometry.boundingBox);
  }
  console.log('Trans mesh exists?', !!chunk.transMesh);
  console.log('Water mesh exists?', !!chunk.waterMesh);
}

// Let's test generating 9 chunks around spawn and meshing them
let totalSolidVertices = 0;
for (let dx = -1; dx <= 1; dx++) {
  for (let dz = -1; dz <= 1; dz++) {
    const c = world.getChunk(cx + dx, cz + dz);
    if (c && c.solidMesh) {
      totalSolidVertices += c.solidMesh.geometry.attributes.position.count;
    }
  }
}
console.log('Total solid vertices around spawn:', totalSolidVertices);

// Check block at spawn
const blockBelow = world.getBlock(Math.floor(spawn[0]), Math.floor(spawn[1] - 1), Math.floor(spawn[2]));
const blockAtFeet = world.getBlock(Math.floor(spawn[0]), Math.floor(spawn[1]), Math.floor(spawn[2]));
console.log('Block below feet:', blockBelow, 'Block at feet:', blockAtFeet);
