const fs = require('fs');

let content = fs.readFileSync('src/components/GameCanvas.tsx', 'utf-8');

if (!content.includes('import { LoadingScreen }')) {
  content = content.replace("import { HUD } from './HUD';", "import { HUD } from './HUD';\nimport { LoadingScreen } from './LoadingScreen';");
}

if (!content.includes('const [isWorldLoaded, setIsWorldLoaded] = useState(false);')) {
  content = content.replace(
    '  const [showDebugMap, setShowDebugMap] = useState(false);',
    '  const [showDebugMap, setShowDebugMap] = useState(false);\n  const [isWorldLoaded, setIsWorldLoaded] = useState(false);\n  const [loadingStage, setLoadingStage] = useState("Initializing Engine...");\n  const [loadingProgress, setLoadingProgress] = useState(0);'
  );
}

// In the useEffect for initialization
const initRegex = /\/\/ Load any existing saved world data[\s\S]*?const existingSave = SaveManager.loadWorld\(worldId\);/;

if (content.match(initRegex)) {
  const replacement = `// Load any existing saved world data
    const loadWorldData = async () => {
      setLoadingStage("Loading Save Data...");
      setLoadingProgress(30);
      const existingSave = await SaveManager.loadWorldAsync(worldId);
      setLoadingProgress(50);
`;
  
  content = content.replace(initRegex, replacement);
  
  // Close the async function inside useEffect
  // Find where Sky, Weather, Clouds, Particles are initialized
  const endOfInit = /const particles = new ParticleManager\(scene\);\s+particlesRef.current = particles;/;
  
  const endReplacement = `const particles = new ParticleManager(scene);
    particlesRef.current = particles;
    
    setLoadingStage("Generating Chunks...");
    setLoadingProgress(90);
    setTimeout(() => {
      setIsWorldLoaded(true);
      setLoadingProgress(100);
    }, 500);
  };
  loadWorldData();`;
  
  content = content.replace(endOfInit, endReplacement);
}

// Add early return for LoadingScreen
const returnRegex = /return \(\n\s*<div ref=\{containerRef\} id="game-canvas"/;
const returnReplacement = `if (!isWorldLoaded) {
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
