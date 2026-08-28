const fs = require('fs');
let content = fs.readFileSync('src/engine/storage/SaveManager.ts', 'utf-8');

content = content.replace("const data = await IndexedDBStorage.getItem(STORE_WORLDS, worldId);", "const data = await IndexedDBStorage.getItem(STORE_WORLDS, worldId) as any;");

fs.writeFileSync('src/engine/storage/SaveManager.ts', content);
