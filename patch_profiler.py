import re

with open('/src/engine/core/GameRuntime.ts', 'r') as f:
    code = f.read()

# Add metrics to GameRuntime
metrics_decl = '''
  public subsystemMetrics = {
    entityAiMs: 0,
    entityPhysicsMs: 0,
    farmingMs: 0,
    engineeringMs: 0,
    furnaceMs: 0,
    interactionMs: 0
  };
'''
code = code.replace('public isPaused: boolean = false;', 'public isPaused: boolean = false;\n' + metrics_decl)

update_method = '''
    const cpuSimStart = performance.now();
    const biome = this.world.biomeManager.getBiome(this.player.position.x, this.player.position.z);
    
    BalanceTelemetry.update(deltaTime);

    let t0 = performance.now();
    FurnaceManager.update(deltaTime);
    this.subsystemMetrics.furnaceMs = performance.now() - t0;

    t0 = performance.now();
    FarmingManager.update(deltaTime, this.world);
    this.subsystemMetrics.farmingMs = performance.now() - t0;

    DiscoverySystem.update(deltaTime);
    AetherAnomalyManager.update(deltaTime, this);
    WorldEventManager.update(
      deltaTime,
      Math.floor((this.sky.timeOfDay || 8) / 24) + 1,
      this.sky.timeOfDay || 8,
      [this.player.position.x, this.player.position.y, this.player.position.z]
    );
    MapManager.visitChunk(Math.floor(this.player.position.x / 16), Math.floor(this.player.position.z / 16));

    this.simulationSystem.update(deltaTime);

    this.environmentSystem.update(deltaTime);

    t0 = performance.now();
    this.entities.update(deltaTime, this.world, this.player.position, this.sky.isNight, (dmg: number, src: string) => {
      if (this.player.isDodging) {
        return;
      }
      this.stats.health -= dmg;
      if (this.stats.health < 0) this.stats.health = 0;
      this.audio.playDamage();
      this.handlePlayerDeath();
    });
    // For now we'll put all entity update in entityAiMs unless we can split it.
    // Wait, the prompt says "Entity AI ms, Entity physics ms".
    // I can just assign entityAiMs to this, and split inside EntityManager if needed, or pass the metrics object!
    this.subsystemMetrics.entityAiMs = performance.now() - t0;
'''

# We will just pass `subsystemMetrics` to `this.entities.update` or set it inside `SimulationSystem`.
# Let's fix `SimulationSystem.ts` for EngineeringMs.
