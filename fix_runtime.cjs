const fs = require('fs');
let code = fs.readFileSync('src/engine/core/GameRuntime.ts', 'utf8');

const changeDimMethod = `
  public async changeDimension(dimensionId: string): Promise<void> {
    Logger.info('GameRuntime', \`Changing dimension to \${dimensionId}...\`);
    
    // Save current world state before changing dimension
    if (this.persistenceSystem) {
      await this.persistenceSystem.forceSave();
    }
    
    // Unload old world
    this.scene.remove(this.world.worldGroup);
    this.world.chunks.forEach(chunk => chunk.dispose());
    this.world.chunks.clear();
    this.world.scheduler.dirtyQueue.clear();
    this.world.scheduler.integrationQueue = [];
    
    // Setup new world
    this.world = new VoxelWorld(this.seed, this.world.preset, dimensionId);
    this.scene.add(this.world.worldGroup);
    
    // Set appropriate sky colors
    if (dimensionId === 'aether_expanse') {
       if (this.sky) this.sky.setCustomColors('#0f172a', '#1e1b4b', '#2dd4bf'); // Aether aesthetic
    } else {
       if (this.sky) this.sky.resetColors();
    }
    
    // Reset player position for now when changing dimensions
    this.player.position.set(0, 100, 0);
    this.player.velocity.set(0, 0, 0);
    
    Logger.info('GameRuntime', \`Dimension change complete.\`);
  }
`;

const insertIdx = code.indexOf('public update(');
code = code.substring(0, insertIdx) + changeDimMethod + "\n" + code.substring(insertIdx);
fs.writeFileSync('src/engine/core/GameRuntime.ts', code);
