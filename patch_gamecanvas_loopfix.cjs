const fs = require('fs');
let content = fs.readFileSync('src/components/GameCanvas.tsx', 'utf-8');

const regex = /      \/\/ Throttled HUD Telemetry update/;
content = content.replace(regex, `      
        accumulator -= dt;
      } // End while loop (Simulation Tick)
      
      let simEnd = performance.now();
      lastSimTimeMs = simEnd - simStart;
      let renderStart = performance.now();
      
      // Throttled HUD Telemetry update`);

fs.writeFileSync('src/components/GameCanvas.tsx', content);
