const fs = require('fs');
let code = fs.readFileSync('src/engine/entities/CreatureRegistry.ts', 'utf8');

const newMobs = `
  storm_ray: {
    id: 'storm_ray',
    name: 'Storm Ray',
    type: 'hostile',
    modelType: 'storm_ray',
    health: 40,
    speed: 0.12,
    damage: 6,
    drops: [
      { id: 'item_aether_scale', chance: 1.0, min: 1, max: 2 },
    ],
    width: 2.0,
    height: 0.5,
    attackRange: 2.5,
    hostilityRadius: 24,
    fleeHealthThreshold: 0,
    ambientSound: 'ambient_wind',
    habitat: ['aether_expanse'],
    flying: true,
  },
  aether_sentinel: {
    id: 'aether_sentinel',
    name: 'Aether Sentinel',
    type: 'hostile',
    modelType: 'ruin_sentinel',
    health: 120,
    speed: 0.04,
    damage: 12,
    drops: [
      { id: 'item_aether_core', chance: 1.0, min: 1, max: 1 },
      { id: 'item_mechanum_scrap', chance: 0.8, min: 2, max: 4 },
    ],
    width: 1.5,
    height: 2.8,
    attackRange: 4.0,
    hostilityRadius: 20,
    fleeHealthThreshold: 0,
    ambientSound: 'ambient_machine',
    habitat: ['aether_expanse'],
  },
  crystal_golem: {
    id: 'crystal_golem',
    name: 'Crystal Golem',
    type: 'neutral',
    modelType: 'crystal_golem',
    health: 200,
    speed: 0.02,
    damage: 18,
    drops: [
      { id: 'item_aether_crystal', chance: 1.0, min: 3, max: 6 },
    ],
    width: 2.5,
    height: 3.5,
    attackRange: 3.0,
    hostilityRadius: 8,
    fleeHealthThreshold: 0,
    ambientSound: 'ambient_crystal',
    habitat: ['aether_expanse'],
  },
`;

code = code.replace('export const CREATURE_REGISTRY: Record<string, CreatureDefinition> = {', 'export const CREATURE_REGISTRY: Record<string, CreatureDefinition> = {\n' + newMobs);
fs.writeFileSync('src/engine/entities/CreatureRegistry.ts', code);
