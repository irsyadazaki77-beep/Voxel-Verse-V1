import re

with open('/src/engine/entities/EntityManager.ts', 'r') as f:
    code = f.read()

# Fix projectile geometry disposal
code = code.replace(
    'if (this.projectilePool.length < 30) {\n      this.projectilePool.push(mesh);\n    } else {\n      mesh.geometry?.dispose();\n    }',
    'if (this.projectilePool.length < 30) {\n      this.projectilePool.push(mesh);\n    }'
)

# And wait, the prompt also says:
# "Jangan dispose shared projectile geometry ketika projectile pool penuh." - fixed.
# "Jangan mutate shared material untuk hit-flash; gunakan particle/overlay/per-object mechanism." - I just removed it completely, which is fine because particles are used in CombatSystem. Let me check if I actually removed it!

with open('/src/engine/entities/EntityManager.ts', 'w') as f:
    f.write(code)
