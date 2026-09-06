const fs = require('fs');
let code = fs.readFileSync('src/engine/core/GameRuntime.ts', 'utf8');

code = code.replace(
  'public worldId: string;', 
  'public worldId: string;\n  public globalModifiedBlocks: Record<string, Record<string, number>> = {};'
);

const changeDimTarget = 'this.world = new VoxelWorld(this.seed, this.world.preset, dimensionId);';
const changeDimReplacement = `
    // Sync current world modifications to global state before clearing
    const currentSerialized = SaveManager.serializeModifiedBlocks(this.world);
    this.globalModifiedBlocks = { ...this.globalModifiedBlocks, ...currentSerialized };

    this.world = new VoxelWorld(this.seed, this.world.preset, dimensionId);
    
    // Hydrate the new world with its specific modified blocks from global state
    Object.entries(this.globalModifiedBlocks).forEach(([chunkKey, blocks]) => {
      if (chunkKey.startsWith(dimensionId + ':') || (dimensionId === 'overworld' && !chunkKey.includes(':'))) {
        const localMap = new Map<string, number>();
        Object.entries(blocks).forEach(([localKey, blockType]) => {
          localMap.set(localKey, blockType as number);
        });
        this.world.modifiedBlocks.set(chunkKey, localMap);
      }
    });
`;

code = code.replace(changeDimTarget, changeDimReplacement);
fs.writeFileSync('src/engine/core/GameRuntime.ts', code);
