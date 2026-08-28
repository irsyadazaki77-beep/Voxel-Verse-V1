const fs = require('fs');

let content = fs.readFileSync('src/components/GameCanvas.tsx', 'utf-8');

// Imports
content = content.replace("import { HUD } from './HUD';", "import { HUD } from './HUD';\nimport { LoadingScreen } from './LoadingScreen';\nimport { GameStatsManager } from '../engine/player/GameStatsManager';");

// State
content = content.replace(
  '  const targetHitRef = useRef<RaycastHit | null>(null);',
  '  const targetHitRef = useRef<RaycastHit | null>(null);\n  const gameStatsRef = useRef<GameStatsManager | null>(null);\n  const [isWorldLoaded, setIsWorldLoaded] = useState(false);\n  const [loadingStage, setLoadingStage] = useState("Initializing Engine...");\n  const [loadingProgress, setLoadingProgress] = useState(0);\n  const [worldData, setWorldData] = useState<WorldSaveData | null>(null);'
);

// Save logic update
const saveStatsRegex = /stats: \{\s*blocksMined: 0,\s*blocksPlaced: 0,\s*monstersDefeated: 0,\s*distanceTraveled: 0,\s*\}/;
content = content.replace(saveStatsRegex, 'stats: gameStatsRef.current?.getStats() || { blocksMined: 0, blocksPlaced: 0, monstersDefeated: 0, distanceTraveled: 0 }');


// Main useEffect patch
const mainEffectStart = /  \/\/ Main Three\.js Initialization \& Game Loop\n  useEffect\(\(\) => \{/g;
const newMainEffectStart = `
  // Async Data Loader
  useEffect(() => {
    const loadData = async () => {
      setLoadingStage("Loading Save Data...");
      setLoadingProgress(20);
      const existingSave = await SaveManager.loadWorldAsync(worldId);
      
      setLoadingProgress(60);
      setWorldData(existingSave);
      
      const statsManager = new GameStatsManager(existingSave?.stats);
      statsManager.initialize();
      gameStatsRef.current = statsManager;
      
      setLoadingStage("Generating Chunks...");
      setLoadingProgress(80);
      
      // Allow slight delay for rendering
      setTimeout(() => {
        setIsWorldLoaded(true);
        setLoadingProgress(100);
      }, 500);
    };
    loadData();
    
    return () => {
      gameStatsRef.current?.dispose();
    };
  }, [worldId]);

  // Main Three.js Initialization & Game Loop
  useEffect(() => {
    if (!isWorldLoaded || !containerRef.current) return;
`;
content = content.replace(mainEffectStart, newMainEffectStart);


// Replace `SaveManager.loadWorld(worldId)` with `worldData`
content = content.replace(/const existingSave = SaveManager\.loadWorld\(worldId\);/g, 'const existingSave = worldData;');

// Add early return
const returnRegex = /  return \(\n    <div ref=\{containerRef\} id="game-canvas"/;
const returnReplacement = `  if (!isWorldLoaded) {
    return (
      <LoadingScreen
        worldName={worldName}
        seed={seed}
        stageName={loadingStage}
        progressPercent={loadingProgress}
      />
    );
  }

  return (
    <div ref={containerRef} id="game-canvas"`;
content = content.replace(returnRegex, returnReplacement);

fs.writeFileSync('src/components/GameCanvas.tsx', content);
