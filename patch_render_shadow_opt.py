import re

with open('/src/engine/systems/RenderSystem.ts', 'r') as f:
    code = f.read()

# Fix entity iteration
code = code.replace('for (const entity of this.runtime.entities.getEntities()) {', 'for (const entity of this.runtime.entities.entities.values()) {')
# Also group positions are usually absolute, but let's make sure. The chunk meshes are children of chunk.group.
# Wait, group.position in chunk is usually x, 0, z of the chunk.
# Let's check Chunk.ts for group.position.

with open('/src/engine/systems/RenderSystem.ts', 'w') as f:
    f.write(code)
