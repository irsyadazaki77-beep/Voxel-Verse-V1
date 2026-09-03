import re

with open('/src/engine/core/GameRuntime.ts', 'r') as f:
    code = f.read()

# Replace the entityAiMs logic
old_logic = '''
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

new_logic = '''
    const entityMetrics = this.entities.update(deltaTime, this.world, this.player.position, this.sky.isNight, (dmg: number, src: string) => {
      if (this.player.isDodging) {
        return;
      }
      this.stats.health -= dmg;
      if (this.stats.health < 0) this.stats.health = 0;
      this.audio.playDamage();
      this.handlePlayerDeath();
    });
    if (entityMetrics) {
      this.subsystemMetrics.entityAiMs = entityMetrics.aiMs;
      this.subsystemMetrics.entityPhysicsMs = entityMetrics.physicsMs;
    }
'''

code = code.replace(old_logic.strip(), new_logic.strip())

with open('/src/engine/core/GameRuntime.ts', 'w') as f:
    f.write(code)
