const fs = require('fs');
let code = fs.readFileSync('src/engine/ui/TelemetryStore.ts', 'utf8');

code = code.replace(
  'biomeName: string;',
  'biomeName: string;\n  culturalRegionName?: string;'
);

code = code.replace(
  "biomeName: 'Sunswept Plains',",
  "biomeName: 'Sunswept Plains',\n    culturalRegionName: 'Uncharted', "
);

fs.writeFileSync('src/engine/ui/TelemetryStore.ts', code);
