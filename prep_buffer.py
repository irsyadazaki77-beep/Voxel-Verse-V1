import re

with open('/src/engine/world/ChunkWorkerPool.ts', 'r') as f:
    code = f.read()

code = code.replace(
    'centerBuffer: ArrayBuffer;\n  neighborBuffers: Record<string, ArrayBuffer>;',
    'paddedBuffer: ArrayBuffer;'
)
with open('/src/engine/world/ChunkWorkerPool.ts', 'w') as f:
    f.write(code)
