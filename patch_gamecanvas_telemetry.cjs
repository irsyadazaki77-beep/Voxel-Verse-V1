const fs = require('fs');
let content = fs.readFileSync('src/components/GameCanvas.tsx', 'utf-8');

// Inside `animate`, track simTime and renderTime
const oldLoopStart = /      const dt = 1\/60;\n      while \(accumulator >= dt\) \{/;
const newLoopStart = `
      let simStart = performance.now();
      const dt = 1/60;
      while (accumulator >= dt) {`;

content = content.replace(oldLoopStart, newLoopStart);

const oldLoopEnd = /      \} \/\/ End while loop \(Simulation Tick\)\n\n      \/\/ Update TelemetryStore \(Throttle to 5 Hz\)/;
const newLoopEnd = `      } // End while loop (Simulation Tick)
      let simEnd = performance.now();
      let simTimeMs = simEnd - simStart;

      let renderStart = performance.now();
      // Wait, render is at the end of the animate function. We will collect metrics there.

      // Update TelemetryStore (Throttle to 5 Hz)`;
content = content.replace(oldLoopEnd, newLoopEnd);

// Before `renderer.render(scene, camera);`
const oldRender = /      \/\/ Render Scene\n      renderer\.render\(scene, camera\);/;
const newRender = `      // Render Scene
      renderer.render(scene, camera);
      let renderTimeMs = performance.now() - renderStart;`;
content = content.replace(oldRender, newRender);

// Wait, the telemetry update is before the render, so we'll use the previous frame's render time.
// Let's define `lastRenderTimeMs`, `lastSimTimeMs` at the top of the variables.
content = content.replace(
  "    let accumulator = 0;",
  "    let accumulator = 0;\n    let lastSimTimeMs = 0;\n    let lastRenderTimeMs = 0;"
);

content = content.replace(
  "let simTimeMs = simEnd - simStart;",
  "lastSimTimeMs = simEnd - simStart;"
);

content = content.replace(
  "let renderTimeMs = performance.now() - renderStart;",
  "lastRenderTimeMs = performance.now() - renderStart;"
);

// We need to inject the extra metrics into the payload.
// Let's find `profilerMetrics: world.scheduler.metrics,`
const profilerRegex = /profilerMetrics: world\.scheduler\.metrics,/;
const newProfiler = `profilerMetrics: {
            ...world.scheduler.metrics,
            frameTimeMs: frameTime * 1000,
            simTimeMs: lastSimTimeMs,
            renderTimeMs: lastRenderTimeMs,
            drawCalls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            memoryEst: (performance as any).memory ? (performance as any).memory.usedJSHeapSize / 1048576 : 0,
          },`;
content = content.replace(profilerRegex, newProfiler);

fs.writeFileSync('src/components/GameCanvas.tsx', content);
