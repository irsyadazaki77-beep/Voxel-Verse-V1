const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(
  "treeType: 'none' | 'crystal' | 'oak' | 'pine' | 'palm' | 'birch' | 'giant' | 'jungle' | 'dead';",
  "treeType: 'none' | 'crystal' | 'oak' | 'pine' | 'palm' | 'birch' | 'giant' | 'jungle' | 'dead' | 'skyroot';"
);

fs.writeFileSync('src/types.ts', code);
