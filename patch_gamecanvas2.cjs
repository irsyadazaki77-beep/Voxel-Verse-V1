const fs = require('fs');
let content = fs.readFileSync('src/components/GameCanvas.tsx', 'utf-8');

// First remove the bad closing brace at line 373-375
content = content.replace(/    setLoadingStage\("Generating Chunks\.\.\."\);\n    setLoadingProgress\(90\);\n    setTimeout\(\(\) => \{\n      setIsWorldLoaded\(true\);\n      setLoadingProgress\(100\);\n    \}, 500\);\n  \};\n  loadWorldData\(\);/, '');

// The rest of the useEffect function should be wrapped by the async function.
// Let's find the end of useEffect:
//     return () => {
//       window.removeEventListener('resize', handleResize);
const endOfUseEffect = /    return \(\) => \{/;

content = content.replace(endOfUseEffect, `    
    setLoadingStage("Generating Chunks...");
    setLoadingProgress(90);
    setTimeout(() => {
      setIsWorldLoaded(true);
      setLoadingProgress(100);
    }, 500);
  }; // end loadWorldData
  
  loadWorldData();

  return () => {`);

// Now let's fix variable scopes. `reqId` is already declared as `let reqId: number;`
// We need to make sure `handleResize`, `handleContextMenu`, etc are accessible to cleanup,
// but cleanup is outside `loadWorldData`. 
// Actually, it's easier to NOT wrap the whole thing. Just wait for existingSave!

fs.writeFileSync('src/components/GameCanvas.tsx', content);
