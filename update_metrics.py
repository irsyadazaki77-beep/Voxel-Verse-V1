import re

with open('/src/engine/world/ChunkScheduler.ts', 'r') as f:
    code = f.read()

# Add to metrics object
code = code.replace(
    'meshUploadsPerFrame: 0,',
    'meshUploadsPerFrame: 0,\n    bufferPreparationMs: 0,\n    bytesTransferred: 0,\n    workerQueueDepth: 0,'
)

old_meshing = '''        // Prepare a 18x128x18 padded buffer'''
new_meshing = '''        const _tp0 = performance.now();
        // Prepare a 18x128x18 padded buffer'''
code = code.replace(old_meshing, new_meshing)

old_meshing_end = '''        chunk.state = ChunkState.MESHING;'''
new_meshing_end = '''        this.metrics.bufferPreparationMs += performance.now() - _tp0;
        this.metrics.bytesTransferred += paddedBuffer.byteLength;
        chunk.state = ChunkState.MESHING;'''
code = code.replace(old_meshing_end, new_meshing_end)

code = code.replace(
    'queuedTasks: poolStats.queuedTasks,',
    'queuedTasks: poolStats.queuedTasks,\n      workerQueueDepth: this.workerPool.queueDepth,\n      bufferPreparationMs: this.metrics.bufferPreparationMs,\n      bytesTransferred: this.metrics.bytesTransferred,'
)

# Need to reset per frame if we want them per frame, or we can just leave it to accumulate?
# The prompt says "buffer preparation ms, bytes transferred". Usually this is per frame or total. Let's make it per frame, so we reset at start of update.
reset_code = '''    const loadRadius = renderDistance;'''
new_reset = '''    this.metrics.bufferPreparationMs = 0;
    this.metrics.bytesTransferred = 0;
    const loadRadius = renderDistance;'''
code = code.replace(reset_code, new_reset)

with open('/src/engine/world/ChunkScheduler.ts', 'w') as f:
    f.write(code)
