const fs = require('fs');
const content = fs.readFileSync('src/engine/world/TextureAtlas.ts', 'utf-8');
const coordsMatch = content.match(/TILE_COORDS[\s\S]*?\{([\s\S]*?)\};/);
const coords = coordsMatch[1].split('\n').filter(l => l.includes(': ['));
let missing = [];
for (const line of coords) {
  const match = line.match(/\[\s*(\d+)\s*,\s*(\d+)\s*\]/);
  if (match) {
    const col = match[1];
    const row = match[2];
    const search = `drawTile(${col}, ${row}`;
    if (!content.includes(search)) {
      missing.push(line.trim());
    }
  }
}
console.log("MISSING TILES:");
console.log(missing.join('\n'));
