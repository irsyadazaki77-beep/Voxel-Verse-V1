import re

with open('/src/engine/world/ChunkScheduler.ts', 'r') as f:
    code = f.read()

# I am looking for the method name targetChunk.applyTransferableMesh(
match = re.search(r'applyTransferableMesh', code)
if match:
    print("Found applyTransferableMesh in ChunkScheduler!")
else:
    print("Not found applyTransferableMesh in ChunkScheduler!")
