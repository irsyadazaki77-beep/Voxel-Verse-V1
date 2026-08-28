const fs = require('fs');
let content = fs.readFileSync('src/engine/entities/EntityManager.ts', 'utf-8');

const regex = /    this\.spawnTimer \+= dt;/;
const replacement = `    this.spawnTimer += dt;
    
    if (Math.random() < 0.05) { // Roughly every second
        Pathfinder.cleanCache();
    }`;

content = content.replace(regex, replacement);

fs.writeFileSync('src/engine/entities/EntityManager.ts', content);
