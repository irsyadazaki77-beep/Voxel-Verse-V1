import re

with open('/src/engine/world/ChunkScheduler.ts', 'r') as f:
    code = f.read()

# Fix inner loop break
old_discovery = '''    for (let dx = -loadRadius; dx <= loadRadius; dx++) {
      for (let dz = -loadRadius; dz <= loadRadius; dz++) {
        // Enforce frame budget check during chunk discovery
        if (performance.now() - startTime >= frameBudgetMs) {
          break;
        }'''
new_discovery = '''    discoveryLoop:
    for (let dx = -loadRadius; dx <= loadRadius; dx++) {
      for (let dz = -loadRadius; dz <= loadRadius; dz++) {
        // Enforce frame budget check during chunk discovery
        if (performance.now() - startTime >= frameBudgetMs) {
          break discoveryLoop;
        }'''
code = code.replace(old_discovery, new_discovery)

# Apply similar to unload loop
old_unload = '''    // 2. Unload Chunks outside Unload Radius (with Hysteresis) - Zero string split
    for (const [key, chunk] of this.world.chunks.entries()) {
      const dx = chunk.cx - playerCX;
      const dz = chunk.cz - playerCZ;

      if (dx * dx + dz * dz > unloadRadiusSq) {
        this.world.worldGroup.remove(chunk.group);
        this.world.chunks.delete(key);
        this.dirtyQueue.delete(key);

        // Place into Warm Cache for 10 seconds before full disposal
        this.warmCache.set(key, { chunk, unloadTime: Date.now() });
      }
    }'''

new_unload = '''    // 2. Unload Chunks outside Unload Radius (with Hysteresis) - Zero string split
    for (const [key, chunk] of this.world.chunks.entries()) {
      if (performance.now() - startTime >= frameBudgetMs) {
        break;
      }
      const dx = chunk.cx - playerCX;
      const dz = chunk.cz - playerCZ;

      if (dx * dx + dz * dz > unloadRadiusSq) {
        this.world.worldGroup.remove(chunk.group);
        this.world.chunks.delete(key);
        this.dirtyQueue.delete(key);

        // Place into Warm Cache for 10 seconds before full disposal
        this.warmCache.set(key, { chunk, unloadTime: Date.now() });
      }
    }'''
code = code.replace(old_unload, new_unload)

# Let's check meshUploadQueue processing, it has break
# We also have dirtyQueue loop
old_dirty = '''    // 3. Process Remesh / Dirty Queue to Worker (Stepwise & Budget-capped)
    let meshingTasksEnqueued = 0;
    const maxMeshTasksPerCall = 3;

    for (const key of this.dirtyQueue) {
      if (meshingTasksEnqueued >= maxMeshTasksPerCall || (performance.now() - startTime >= frameBudgetMs)) {
        break;
      }'''
new_dirty = '''    // 3. Process Remesh / Dirty Queue to Worker (Stepwise & Budget-capped)
    let meshingTasksEnqueued = 0;
    const maxMeshTasksPerCall = 3;

    for (const key of this.dirtyQueue) {
      if (meshingTasksEnqueued >= maxMeshTasksPerCall || (performance.now() - startTime >= frameBudgetMs)) {
        break;
      }'''
# Wait, this one already has break which breaks out of the single loop over Set.

with open('/src/engine/world/ChunkScheduler.ts', 'w') as f:
    f.write(code)
