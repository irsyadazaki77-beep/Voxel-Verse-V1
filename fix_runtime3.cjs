const fs = require('fs');
let code = fs.readFileSync('src/engine/core/GameRuntime.ts', 'utf8');

let methodCount = 0;
while (code.includes('public async changeDimension(')) {
  const methodStart = code.indexOf('public async changeDimension(');
  const methodEnd = code.indexOf('Logger.info(\'GameRuntime\', \`Dimension change complete.\`);\n  }') + 62;
  code = code.substring(0, methodStart) + code.substring(methodEnd);
  methodCount++;
}

const methodBody = `
  public async changeDimension(dimensionId: string): Promise<void> {
    Logger.info('GameRuntime', \`Changing dimension to \${dimensionId}...\`);
    
    if (this.persistenceSystem) {
      await this.persistenceSystem.forceSave();
    }
    
    this.scene.remove(this.world.worldGroup);
    this.world.chunks.forEach(chunk => chunk.dispose());
    this.world.chunks.clear();
    this.world.scheduler.dirtyQueue.clear();
    this.world.scheduler.integrationQueue = [];
    
    this.world = new VoxelWorld(this.seed, this.world.preset, dimensionId);
    this.scene.add(this.world.worldGroup);
    
    if (dimensionId === 'aether_expanse') {
       // Using the profile directly instead of custom colors if we implement it that way
       // The environment system should automatically pick it up via BiomeManager!
       // So we just need to reset player position to island height!
    }
    
    this.player.position.set(0, 100, 0);
    this.player.velocity.set(0, 0, 0);
    
    Logger.info('GameRuntime', \`Dimension change complete.\`);
  }
`;

const updateMatch = code.indexOf('private update(');
code = code.substring(0, updateMatch) + methodBody + "\n\n  " + code.substring(updateMatch);

fs.writeFileSync('src/engine/core/GameRuntime.ts', code);
