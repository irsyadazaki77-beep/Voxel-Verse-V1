const fs = require('fs');

let content = fs.readFileSync('src/engine/storage/SaveManager.ts', 'utf-8');

// We will add `loadWorldAsync` to `SaveManager`
if (!content.includes('public static async loadWorldAsync')) {
  const replacement = `  // Load World Asynchronously, preferring IndexedDB
  public static async loadWorldAsync(worldId: string): Promise<WorldSaveData | null> {
    try {
      const data = await IndexedDBStorage.getItem(STORE_WORLDS, worldId);
      if (data && data.payload) {
        let parsed: any;
        try {
          parsed = JSON.parse(data.payload);
        } catch {
          Logger.warn('SaveManager', 'Failed to parse IndexedDB payload');
        }

        const dataObj = parsed?.data ? parsed.data : parsed;
        if (dataObj) {
          // Verify Checksum
          if (parsed?.checksum) {
            const calculatedChecksum = this.calculateChecksum(JSON.stringify(dataObj));
            if (calculatedChecksum !== parsed.checksum) {
              Logger.warn('SaveManager', 'IndexedDB save checksum mismatch, but proceeding with caution.');
            }
          }
          Logger.info('SaveManager', \`Loaded world '\${worldId}' from IndexedDB\`);
          return this.validateAndSanitizeSave(dataObj, worldId, 42819);
        }
      }
    } catch (e) {
      Logger.warn('SaveManager', 'Failed to load from IndexedDB, falling back to localStorage', { error: (e as Error).message });
    }

    // Fallback to synchronous loadWorld
    return this.loadWorld(worldId);
  }

  // Load World with Automatic Backup Fallback`;

  content = content.replace('  // Load World with Automatic Backup Fallback', replacement);
}

// In `saveWorld`, we need to skip saving `payload` to localStorage, just save metadata to localStorage, and save payload to IndexedDB.
const saveRegex = /const payload = JSON\.stringify\(\{ data, checksum \}\);\s*\/\/ Step 1: Write to temp save\s*localStorage\.setItem\(tempKey, payload\);[\s\S]*?localStorage\.setItem\(WORLDS_INDEX_KEY, JSON\.stringify\(worlds\)\);/;

const newSaveLogic = `const payload = JSON.stringify({ data, checksum });
      
      // Async sync to IndexedDB for high-capacity persistence
      IndexedDBStorage.setItem(STORE_WORLDS, { id: data.id, payload, updatedAt: Date.now() });

      // Save lightweight world index to localStorage
      const existingWorlds = this.getWorlds();
      const existingEntry = existingWorlds.find((w) => w.id === data.id);
      const createdAt = existingEntry ? existingEntry.createdAt : data.createdAt;

      const worlds = existingWorlds.filter((w) => w.id !== data.id);
      worlds.unshift({
        id: data.id,
        name: data.name,
        seed: data.seed,
        gameMode: data.gameMode,
        lastPlayed: data.lastPlayed,
        createdAt,
      });
      localStorage.setItem(WORLDS_INDEX_KEY, JSON.stringify(worlds));`;

content = content.replace(saveRegex, newSaveLogic);

fs.writeFileSync('src/engine/storage/SaveManager.ts', content);
