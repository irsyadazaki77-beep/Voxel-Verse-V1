import re

with open('/src/engine/engineering/AetherNetworkManager.ts', 'r') as f:
    code = f.read()

# 1. Add activeMachines
code = code.replace(
    'public nodeMap: Map<string, AetherNode> = new Map();',
    'public nodeMap: Map<string, AetherNode> = new Map();\n  public activeMachines: Set<string> = new Set();'
)

# 2. Add to activeMachines in onBlockPlaced
add_active = '''
    const machineTypes = ['sensor', 'funnel', 'fabricator', 'harvester', 'turret', 'actuator'];
    if (machineTypes.includes(nodeType)) {
      this.activeMachines.add(posKey);
    }
    this.markDirty(posKey);
'''
code = re.sub(r'this\.nodeMap\.set\(posKey, newNode\);\s*this\.markDirty\(posKey\);', 'this.nodeMap.set(posKey, newNode);\n' + add_active, code)

# 3. Remove from activeMachines in onBlockRemoved
rm_active = '''
    this.activeMachines.delete(posKey);
'''
code = code.replace('this.nodeMap.delete(posKey);', 'this.nodeMap.delete(posKey);\n' + rm_active)


# 4. Modify update(deltaTime) to stagger ticks and check radius
new_update = '''
  private timeAccumulators: Record<string, number> = {
    sensor: 0,
    funnel: 0,
    fabricator: 0,
    harvester: 0,
    turret: 0,
    actuator: 0
  };

  public update(deltaTime: number, playerPos?: [number, number, number]): void {
    if (!this.world) return;

    if (this.dirtyNodes.size > 0) {
      this.processSignalPropagation();
    }

    // Accumulate time for different tick rates
    this.timeAccumulators.sensor += deltaTime;
    this.timeAccumulators.funnel += deltaTime;
    this.timeAccumulators.fabricator += deltaTime;
    this.timeAccumulators.harvester += deltaTime;
    this.timeAccumulators.turret += deltaTime;
    this.timeAccumulators.actuator += deltaTime;

    const tickThresholds: Record<string, number> = {
      sensor: 1/10, // ~10 Hz
      funnel: 1/5,  // ~5 Hz
      fabricator: 1/5, // ~5 Hz
      harvester: 1/2, // ~2 Hz
      turret: 1/5, // ~5 Hz
      actuator: 1/10 // ~10 Hz
    };

    const simRadiusSq = 64 * 64; // 64 blocks simulation radius

    for (const posKey of this.activeMachines) {
      const node = this.nodeMap.get(posKey);
      if (!node) continue;

      if (playerPos) {
        const dx = node.pos[0] - playerPos[0];
        const dy = node.pos[1] - playerPos[1];
        const dz = node.pos[2] - playerPos[2];
        if (dx*dx + dy*dy + dz*dz > simRadiusSq) {
          continue; // Sleep outside radius
        }
      }

      const net = this.networks.get(node.networkId);
      if (net && net.isOverloaded) {
        continue;
      }
      
      const threshold = tickThresholds[node.nodeType];
      if (threshold && this.timeAccumulators[node.nodeType] >= threshold) {
        if (node.nodeType === 'turret' && !node.signalState) {
          // turrets active only when powered
          continue;
        }
        if (this.onMachineTickHandler) {
          this.onMachineTickHandler(node, this.timeAccumulators[node.nodeType], this.world);
        }
      }
    }

    // Reset accumulators that exceeded threshold
    for (const type of Object.keys(tickThresholds)) {
      if (this.timeAccumulators[type] >= tickThresholds[type]) {
        this.timeAccumulators[type] = 0;
      }
    }
  }
'''

code = re.sub(r'public update\(deltaTime: number\): void \{.*?(?=\n  // Propagate signal state)', new_update, code, flags=re.DOTALL)

with open('/src/engine/engineering/AetherNetworkManager.ts', 'w') as f:
    f.write(code)
