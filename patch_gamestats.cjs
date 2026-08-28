const fs = require('fs');

let content = fs.readFileSync('src/components/GameCanvas.tsx', 'utf-8');

if (!content.includes('import { GameStatsManager }')) {
  content = content.replace("import { PlayerStats } from '../engine/player/PlayerStats';", "import { PlayerStats } from '../engine/player/PlayerStats';\nimport { GameStatsManager } from '../engine/player/GameStatsManager';");
}

if (!content.includes('const gameStatsRef = useRef<GameStatsManager | null>(null);')) {
  content = content.replace(
    '  const targetHitRef = useRef<RaycastHit | null>(null);',
    '  const targetHitRef = useRef<RaycastHit | null>(null);\n  const gameStatsRef = useRef<GameStatsManager | null>(null);'
  );
}

// Inside `loadWorldData`, initialize `GameStatsManager`
const loadWorldDataRegex = /const existingSave = await SaveManager\.loadWorldAsync\(worldId\);\s*setLoadingProgress\(50\);/;

if (content.match(loadWorldDataRegex)) {
  const replacement = `const existingSave = await SaveManager.loadWorldAsync(worldId);
      setLoadingProgress(50);
      
      const statsManager = new GameStatsManager(existingSave?.stats);
      statsManager.initialize();
      gameStatsRef.current = statsManager;
`;
  content = content.replace(loadWorldDataRegex, replacement);
}

// In `saveGame`, use `gameStatsRef.current?.getStats()`
const saveStatsRegex = /stats: \{\s*blocksMined: 0,\s*blocksPlaced: 0,\s*monstersDefeated: 0,\s*distanceTraveled: 0,\s*\}/;

if (content.match(saveStatsRegex)) {
  content = content.replace(saveStatsRegex, 'stats: gameStatsRef.current?.getStats() || { blocksMined: 0, blocksPlaced: 0, monstersDefeated: 0, distanceTraveled: 0 }');
}

// In `dispose` section of useEffect
const cleanupRegex = /if \(worldRef\.current\) worldRef\.current\.dispose\(\);/;

if (content.match(cleanupRegex) && !content.includes('gameStatsRef.current?.dispose()')) {
  content = content.replace(cleanupRegex, 'if (worldRef.current) worldRef.current.dispose();\n      gameStatsRef.current?.dispose();');
}

fs.writeFileSync('src/components/GameCanvas.tsx', content);
