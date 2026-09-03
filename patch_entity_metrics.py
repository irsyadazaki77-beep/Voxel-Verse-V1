import re

with open('/src/engine/entities/EntityManager.ts', 'r') as f:
    code = f.read()

# Change return type of update from void to {aiMs: number, physicsMs: number}
code = code.replace(
    'public update(deltaTime: number, world: VoxelWorld, playerPos: THREE.Vector3, isNight: boolean, damagePlayer?: (dmg: number, src: string) => void): void {',
    'public update(deltaTime: number, world: VoxelWorld, playerPos: THREE.Vector3, isNight: boolean, damagePlayer?: (dmg: number, src: string) => void): {aiMs: number, physicsMs: number} {'
)
code = code.replace(
    'const dt = Math.min(deltaTime, 0.1);',
    'const dt = Math.min(deltaTime, 0.1);\n    let aiMs = 0;\n    let physicsMs = 0;\n    const _t0 = performance.now();'
)

# AI section
ai_search = r'(this\.updateEntityAI\(state, EntityManager\._tempVecA, playerPos, distToPlayer, world, isNight\);\s*\})'
ai_replace = r'const _ta = performance.now(); \1 aiMs += performance.now() - _ta;'
code = re.sub(ai_search, ai_replace, code)

# Physics section
# Just before physics starts: `// Basic Physics`
phys_start = r'// Basic Physics'
phys_start_replace = r'const _tp = performance.now(); // Basic Physics'
code = code.replace(phys_start, phys_start_replace)

# End of update loop for entities
phys_end = r'(this\.spatialGrid\.get\(`\$\{cx\},\$\{cz\}`\)\!\.add\(id\);\s*\})'
phys_end_replace = r'\1 physicsMs += performance.now() - _tp;'
code = re.sub(phys_end, phys_end_replace, code)

# Return
code = re.sub(r'public dispose\(\): void \{', r'return {aiMs, physicsMs};\n  }\n\n  public dispose(): void {', code)

with open('/src/engine/entities/EntityManager.ts', 'w') as f:
    f.write(code)
