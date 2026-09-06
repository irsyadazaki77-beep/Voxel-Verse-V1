const fs = require('fs');
let code = fs.readFileSync('src/engine/systems/PersistenceSystem.ts', 'utf8');

const replacement = `
      stats: gameStats ? gameStats.getStats() : { blocksMined: 0, blocksPlaced: 0, monstersDefeated: 0, distanceTraveled: 0 },
      modifiedBlocks: {
        ...(this.runtime.globalModifiedBlocks || {}),
        ...SaveManager.serializeModifiedBlocks(world)
      },
`;
code = code.replace(/stats: gameStats[^,]+,[^]+?modifiedBlocks:[^,]+,/, replacement.trim());
fs.writeFileSync('src/engine/systems/PersistenceSystem.ts', code);
