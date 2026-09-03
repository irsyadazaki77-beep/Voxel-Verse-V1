import re

with open('/src/engine/core/GameRuntime.ts', 'r') as f:
    code = f.read()

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

update_search = r'// Core Engine Sub-Ticks outside systems if any.*?BalanceTelemetry\.update\(deltaTime\);\s*FurnaceManager\.update\(deltaTime\);\s*FarmingManager\.update\(deltaTime, this\.world\);'

update_replace = '''// Core Engine Sub-Ticks outside systems if any
    BalanceTelemetry.update(deltaTime);

    let t0 = performance.now();
    FurnaceManager.update(deltaTime);
    this.subsystemMetrics.furnaceMs = performance.now() - t0;

    t0 = performance.now();
    FarmingManager.update(deltaTime, this.world);
    this.subsystemMetrics.farmingMs = performance.now() - t0;
'''
code = re.sub(update_search, update_replace, code, flags=re.DOTALL)

with open('/src/engine/core/GameRuntime.ts', 'w') as f:
    f.write(code)


with open('/src/engine/systems/SimulationSystem.ts', 'r') as f:
    code = f.read()

# Add engineeringMs tracking
eng_search = r'// 5\. Update Aether Engineering Network\s*AetherNetworkManager\.getInstance\(\)\.update\(dt, \[player\.position\.x, player\.position\.y, player\.position\.z\]\);'
eng_replace = '''// 5. Update Aether Engineering Network
    let t0 = performance.now();
    AetherNetworkManager.getInstance().update(dt, [player.position.x, player.position.y, player.position.z]);
    this.runtime.subsystemMetrics.engineeringMs = performance.now() - t0;
'''
code = re.sub(eng_search, eng_replace, code)
with open('/src/engine/systems/SimulationSystem.ts', 'w') as f:
    f.write(code)

