const fs = require('fs');
let content = fs.readFileSync('src/components/GameCanvas.tsx', 'utf-8');

// Find the start of the `animate` function
const oldStart = `    const animate = (now: number) => {
      reqId = requestAnimationFrame(animate);

      const currentTime = now;
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // FPS Counter
      frameCount++;
      if (currentTime - lastFpsTime >= 1000) {
        currentFps = frameCount;
        frameCount = 0;
        lastFpsTime = currentTime;
      }`;

const newStart = `    const animate = (now: number) => {
      reqId = requestAnimationFrame(animate);

      const currentTime = now;
      let frameTime = (currentTime - lastTime) / 1000;
      if (frameTime > 0.25) frameTime = 0.25;
      lastTime = currentTime;
      accumulator += frameTime;

      // FPS Counter
      frameCount++;
      if (currentTime - lastFpsTime >= 1000) {
        currentFps = frameCount;
        frameCount = 0;
        lastFpsTime = currentTime;
      }
      
      const dt = 1/60;
      while (accumulator >= dt) {
        // We redefine deltaTime as dt so we don't have to rename all variables inside the loop
        const deltaTime = dt;
`;

content = content.replace(oldStart, newStart);

const oldEnd = `      // Update TelemetryStore (Throttle to 5 Hz)
      if (currentTime - lastTelemetryTime >= 200) {`;

const newEnd = `      } // End while loop (Simulation Tick)

      // Update TelemetryStore (Throttle to 5 Hz)
      if (currentTime - lastTelemetryTime >= 200) {`;

content = content.replace(oldEnd, newEnd);

// Also define accumulator before animate
content = content.replace(
  "    let lastTargetPosKey = '';",
  "    let lastTargetPosKey = '';\n    let accumulator = 0;"
);

// We should fix setState calls inside the while loop so they don't fire multiple times per frame if nothing changed!
content = content.replace(
  "setActiveBossState(nearbyBoss);",
  "if (nearbyBoss?.id !== activeBossState?.id) setActiveBossState(nearbyBoss);"
);

fs.writeFileSync('src/components/GameCanvas.tsx', content);
