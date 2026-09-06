const fs = require('fs');
let code = fs.readFileSync('src/engine/dungeon/DungeonGenerator.ts', 'utf8');

const replacement = `
    } else if (theme === 'volcanic') {
      wallBlock = BlockType.BASALT;
      floorBlock = BlockType.MAGMA_ROCK;
      pillarBlock = BlockType.OBSIDIAN;
      accentBlock = BlockType.BASALT;
      lightBlock = BlockType.LAVA;
    } else if (theme === 'aether_temple') {
      wallBlock = BlockType.CRYSTAL_BRICK;
      floorBlock = BlockType.VOIDGLASS;
      pillarBlock = BlockType.AETHER_STONE;
      accentBlock = BlockType.MECHANUM_PLATE;
      lightBlock = BlockType.AETHER_LAMP;
    }
`;

code = code.replace(/} else if \(theme === 'volcanic'\) \{[\s\S]*?lightBlock = BlockType\.LAVA;\n    \}/, replacement.trim());
fs.writeFileSync('src/engine/dungeon/DungeonGenerator.ts', code);
