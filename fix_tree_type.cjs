const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(
  "treeType: 'oak' | 'pine' | 'crystal' | 'palm' | 'birch' | 'giant' | 'jungle' | 'dead' | 'none';",
  "treeType: 'oak' | 'pine' | 'crystal' | 'palm' | 'birch' | 'giant' | 'jungle' | 'dead' | 'none' | 'skyroot';"
);

fs.writeFileSync('src/types.ts', code);
