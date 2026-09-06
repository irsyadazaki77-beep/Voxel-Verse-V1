const fs = require('fs');
let code = fs.readFileSync('src/engine/items/ItemRegistry.ts', 'utf8');

const newItems = `
  item_aether_core: {
    id: 'item_aether_core',
    name: 'Aether Core',
    type: 'material',
    maxStack: 64,
    description: 'A pulsating core of pure aether energy.',
    icon: 'sparkles',
    rarity: 'epic',
  },
  item_mechanum_scrap: {
    id: 'item_mechanum_scrap',
    name: 'Mechanum Scrap',
    type: 'material',
    maxStack: 64,
    description: 'Scrap metal from an ancient automaton.',
    icon: 'cog',
    rarity: 'uncommon',
  },
  item_aether_crystal: {
    id: 'item_aether_crystal',
    name: 'Aether Crystal',
    type: 'material',
    maxStack: 64,
    description: 'A glowing crystal resonating with wind magic.',
    icon: 'gem',
    rarity: 'rare',
  },
  item_aether_scale: {
    id: 'item_aether_scale',
    name: 'Aether Scale',
    type: 'material',
    maxStack: 64,
    description: 'A lightweight scale from a sky creature.',
    icon: 'feather',
    rarity: 'uncommon',
  },
`;

code = code.replace('export const ITEM_REGISTRY: Record<string, ItemDefinition> = {', 'export const ITEM_REGISTRY: Record<string, ItemDefinition> = {\n' + newItems);
fs.writeFileSync('src/engine/items/ItemRegistry.ts', code);
