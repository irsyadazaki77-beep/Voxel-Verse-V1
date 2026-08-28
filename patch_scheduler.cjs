const fs = require('fs');

let content = fs.readFileSync('src/engine/world/ChunkScheduler.ts', 'utf-8');

// We want to add cancellation of queued tasks outside the render radius
// the method `cancelTasksOutofRange` is available on workerPool
if (!content.includes('this.workerPool.cancelTasksOutofRange')) {
  const replacement = `    // Cancel queued tasks for chunks that are now out of range
    this.workerPool.cancelTasksOutofRange(playerCX, playerCZ, unloadRadius);

    // 2. Unload Chunks outside Unload Radius (with Hysteresis)
`;
  content = content.replace('    // 2. Unload Chunks outside Unload Radius (with Hysteresis)\n', replacement);
}

// We should also ensure chunks are not duplicated.
// Wait, the chunk generation is safe from duplication if we use `if (!this.world.chunks.has(key)) {` which it does.
// However, the worker pool enqueue task ensures there are no duplicate tasks in queue.
fs.writeFileSync('src/engine/world/ChunkScheduler.ts', content);
