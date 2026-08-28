const fs = require('fs');
let content = fs.readFileSync('src/components/GameCanvas.tsx', 'utf-8');

// The block to extract starts at "      // Check if player died" (493) and ends before "// 6. Hand Item Transform & Animation" (695 or so)
// Let's do string replacement carefully.

const targetRegex = /      \/\/ Check if player died[\s\S]*?\/\/ 6\. Hand Item Transform \& Animation/;

let extractedBlock = content.match(targetRegex)[0];
// replace `deltaTime` with `dt` inside the extracted block
extractedBlock = extractedBlock.replace(/deltaTime/g, 'dt');

const newLoopLogic = `
      // Fixed Timestep Simulation
      const dt = 1/60;
      while (accumulator >= dt) {
${extractedBlock.replace('// 6. Hand Item Transform & Animation', '')}
        accumulator -= dt;
      }

      // 6. Hand Item Transform & Animation`;

const oldLoopRegex = /      const currentTime = now;\n      const deltaTime = Math\.min\(\(currentTime - lastTime\) \/ 1000, 0\.1\);\n      lastTime = currentTime;[\s\S]*?\/\/ 6\. Hand Item Transform \& Animation/;

const fullReplacement = `      const currentTime = now;
      let frameTime = (currentTime - lastTime) / 1000;
      if (frameTime > 0.25) frameTime = 0.25; // prevent spiral of death
      lastTime = currentTime;
      accumulator += frameTime;

      // FPS Counter
      frameCount++;
      if (currentTime - lastFpsTime >= 1000) {
        currentFps = frameCount;
        frameCount = 0;
        lastFpsTime = currentTime;
      }
${newLoopLogic}`;

content = content.replace(oldLoopRegex, fullReplacement);

// We need to declare `let accumulator = 0;` before `const animate = (now: number) => {`
content = content.replace(
  "    let lastTargetPosKey = '';",
  "    let lastTargetPosKey = '';\n    let accumulator = 0;"
);

// We also need to fix `setActiveBossState(nearbyBoss);` which calls a React setState in the simulation loop.
// Setting state in a tight loop is bad. We should check if it changed.
content = content.replace(
  "setActiveBossState(nearbyBoss);",
  "if (nearbyBoss?.id !== activeBossState?.id) setActiveBossState(nearbyBoss);"
);

// Same for `setInventoryState([...inventoryRef.current]);` inside `if (collected.length > 0)`
// That's fine since it only happens when picking up an item.

fs.writeFileSync('src/components/GameCanvas.tsx', content);
