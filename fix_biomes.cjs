const fs = require('fs');
let code = fs.readFileSync('src/engine/world/BiomeManager.ts', 'utf8');

const newBiomes = `
  aether_expanse: {
    id: 'aether_expanse',
    name: 'Aether Expanse',
    category: 'exotic',
    temperature: 0.2,
    humidity: 0.5,
    heightOffset: 60,
    heightScale: 20,
    surfaceBlock: BlockType.AETHER_GRASS,
    subSurfaceBlock: BlockType.AETHER_DIRT,
    deepStoneBlock: BlockType.AETHER_STONE,
    foliageDensity: 0.1,
    treeChance: 0.15,
    treeType: 'skyroot',
    skyColor: [0.1, 0.4, 0.6],
    fogColor: [0.2, 0.6, 0.7],
    waterColor: [0.1, 0.8, 0.9],
  },
`;

code = code.replace('export const BIOMES_2: Record<string, ExtendedBiomeDef> = {', 'export const BIOMES_2: Record<string, ExtendedBiomeDef> = {\n' + newBiomes);

code = code.replace('private seed: number;', 'private seed: number;\n  public dimensionId: string;');

code = code.replace('constructor(seed: number) {', 'constructor(seed: number, dimensionId: string = "overworld") {\n    this.dimensionId = dimensionId;');

const getBiomeStart = code.indexOf('public getBiome(wx: number, wz: number): ExtendedBiomeDef {');
const getBiomeLogic = `
  public getBiome(wx: number, wz: number): ExtendedBiomeDef {
    if (this.dimensionId === 'aether_expanse') {
       return BIOMES_2.aether_expanse;
    }
`;

code = code.replace('public getBiome(wx: number, wz: number): ExtendedBiomeDef {', getBiomeLogic);

fs.writeFileSync('src/engine/world/BiomeManager.ts', code);
