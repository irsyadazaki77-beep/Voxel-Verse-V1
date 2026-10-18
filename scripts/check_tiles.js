const fs = require('fs');
const path = require('path');
const atlasPath = path.resolve(__dirname, '../src/engine/world/TextureAtlas.ts');
const content = fs.readFileSync(atlasPath, 'utf-8');
const coordsMatch = content.match(/TILE_COORDS.*?\{([\s\S]*?)\}/);
const coords = coordsMatch ? coordsMatch[1].split('\n').filter(l => l.includes(': [')) : [];
let missing = [];
for (const line of coords) {
  const match = line.match(/\[(\d+),\s*(\d+)\]/);
  if (match) {
    const col = match[1];
    const row = match[2];
    const search = `drawTile(${col}, ${row}`;
    if (!content.includes(search)) {
      missing.push(line.trim());
    }
  }
}
console.log(missing.join('\n'));
