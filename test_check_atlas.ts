// Test script to instantiate TextureAtlas and check for any browser vs node issues
import { TextureAtlas } from './src/engine/world/TextureAtlas';
import { VoxelMesher } from './src/engine/world/VoxelMesher';
import { BLOCK_DEFS } from './src/engine/world/BlockRegistry';
import { ITEM_DEFS } from './src/engine/items/ItemRegistry';

console.log('Testing Block Defs count:', Object.keys(BLOCK_DEFS).length);
console.log('Testing Item Defs count:', Object.keys(ITEM_DEFS).length);

// Check if any block def has missing texture coordinates
let missingTiles = 0;
for (const [id, def] of Object.entries(BLOCK_DEFS)) {
  const topTile = TextureAtlas.getTileForBlock(Number(id), 'top');
  const sideTile = TextureAtlas.getTileForBlock(Number(id), 'side');
  const botTile = TextureAtlas.getTileForBlock(Number(id), 'bottom');
  
  if (!TextureAtlas.TILE_COORDS[topTile]) {
    console.warn(`Block ${id} (${def.name}) top tile missing in TILE_COORDS: ${topTile}`);
    missingTiles++;
  }
  if (!TextureAtlas.TILE_COORDS[sideTile]) {
    console.warn(`Block ${id} (${def.name}) side tile missing in TILE_COORDS: ${sideTile}`);
    missingTiles++;
  }
  if (!TextureAtlas.TILE_COORDS[botTile]) {
    console.warn(`Block ${id} (${def.name}) bot tile missing in TILE_COORDS: ${botTile}`);
    missingTiles++;
  }
}
console.log('Missing tile coords in TextureAtlas:', missingTiles);
