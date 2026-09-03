import re

with open('/src/engine/entities/EntityManager.ts', 'r') as f:
    code = f.read()

# Add the return right before attackEntity
code = code.replace('  // Attack entity with weapon/tool and return damage dealt', 'return {aiMs, physicsMs};\n  }\n\n  // Attack entity with weapon/tool and return damage dealt')

with open('/src/engine/entities/EntityManager.ts', 'w') as f:
    f.write(code)
