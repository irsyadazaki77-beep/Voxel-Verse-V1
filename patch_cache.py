import re

with open('/src/engine/world/ChunkScheduler.ts', 'r') as f:
    code = f.read()

# Update cache cleaning logic
old_cache_clean = '''    // Clean warm cache items older than 10s (Throttled check every 1500ms)
    const now = Date.now();
    if (now - this.lastCacheCleanTime > 1500) {
      this.lastCacheCleanTime = now;
      for (const [key, cached] of this.warmCache.entries()) {
        if (now - cached.unloadTime > 10000) {
          cached.chunk.dispose();
          this.warmCache.delete(key);
        }
      }
    }'''

new_cache_clean = '''    // Clean warm cache items older than 10s or if we exceed memory budget (max 150 chunks)
    const now = Date.now();
    const MAX_CACHE_CHUNKS = 150;
    
    // Always enforce max budget first (LRU-ish by insertion order)
    if (this.warmCache.size > MAX_CACHE_CHUNKS) {
       let toRemove = this.warmCache.size - MAX_CACHE_CHUNKS;
       for (const key of this.warmCache.keys()) {
          const cached = this.warmCache.get(key)!;
          cached.chunk.dispose();
          this.warmCache.delete(key);
          toRemove--;
          if (toRemove <= 0) break;
       }
    }

    if (now - this.lastCacheCleanTime > 1500) {
      this.lastCacheCleanTime = now;
      for (const [key, cached] of this.warmCache.entries()) {
        if (now - cached.unloadTime > 10000) {
          cached.chunk.dispose();
          this.warmCache.delete(key);
        }
      }
    }'''

code = code.replace(old_cache_clean, new_cache_clean)

with open('/src/engine/world/ChunkScheduler.ts', 'w') as f:
    f.write(code)
