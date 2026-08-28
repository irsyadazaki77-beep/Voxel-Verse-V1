const fs = require('fs');
let content = fs.readFileSync('src/engine/ai/Pathfinder.ts', 'utf-8');

const regex = /    \/\/ Don't pathfind if too far/;
const replacement = `    const cacheKey = this.getCacheKey(startX, startY, startZ, goalX, goalY, goalZ);
    const cached = this.pathCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 2000) {
      return cached.path;
    }

    // Don't pathfind if too far`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/engine/ai/Pathfinder.ts', content);
