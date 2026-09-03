import re

with open('/src/engine/core/GameRuntime.ts', 'r') as f:
    code = f.read()

pattern = r't0 = performance\.now\(\);\s*this\.entities\.update.*?this\.subsystemMetrics\.entityAiMs = performance\.now\(\) - t0;'
new_logic = '''
    const entityMetrics = this.entities.update(deltaTime, this.world, this.player.position, this.sky.isNight, (dmg: number, src: string) => {
      if (this.player.isDodging) {
        // Invulnerable dodge iframe!
        return;
      }
      this.stats.health -= dmg;
      if (this.stats.health < 0) this.stats.health = 0;
      this.audio.playDamage();
      if (this.stats.health <= 0 && !this.stats.isDead) {
        this.stats.isDead = true;
        this.handlePlayerDeath();
      }
    });
    if (entityMetrics) {
      this.subsystemMetrics.entityAiMs = entityMetrics.aiMs;
      this.subsystemMetrics.entityPhysicsMs = entityMetrics.physicsMs;
    }
'''

code = re.sub(pattern, new_logic.strip(), code, flags=re.DOTALL)

with open('/src/engine/core/GameRuntime.ts', 'w') as f:
    f.write(code)
