// Biome System 2.0 & Multidimensional Climate Engine
// Evaluates Continentalness, Erosion, Temperature, Humidity & Elevation for natural biome distributions
import { BiomeDef, BlockType } from '../../types';
import { SimplexNoise } from '../math/Noise';
import { SEA_LEVEL } from './WorldConfig';

export interface ExtendedBiomeDef extends BiomeDef {
  surfaceDepth?: number; // Thickness of surface block layer
  category: 'ocean' | 'coastal' | 'flat' | 'forest' | 'cold' | 'hot' | 'mountain' | 'swamp' | 'exotic';
  skyColor: [number, number, number];
  fogColor: [number, number, number];
  waterColor: [number, number, number];
  microBiome?: string;
}

export const BIOMES_2: Record<string, ExtendedBiomeDef> = {
  deep_ocean: {
    id: 'deep_ocean',
    name: 'Abyssal Ocean',
    category: 'ocean',
    temperature: -0.1,
    humidity: 1.0,
    heightOffset: 10,
    heightScale: 4,
    surfaceBlock: BlockType.GRAVEL,
    subSurfaceBlock: BlockType.STONE,
    deepStoneBlock: BlockType.STONE,
    foliageDensity: 0.02,
    treeChance: 0.0,
    treeType: 'none',
    skyColor: [0.40, 0.65, 0.95],
    fogColor: [0.55, 0.75, 0.92],
    waterColor: [0.08, 0.30, 0.75],
  },
  ocean: {
    id: 'ocean',
    name: 'Azure Coast Sea',
    category: 'ocean',
    temperature: 0.1,
    humidity: 0.9,
    heightOffset: 16,
    heightScale: 6,
    surfaceBlock: BlockType.SAND,
    subSurfaceBlock: BlockType.SAND,
    deepStoneBlock: BlockType.STONE,
    foliageDensity: 0.05,
    treeChance: 0.0,
    treeType: 'none',
    skyColor: [0.45, 0.72, 0.98],
    fogColor: [0.65, 0.85, 0.95],
    waterColor: [0.12, 0.45, 0.88],
  },
  beach: {
    id: 'beach',
    name: 'Golden Coast Beach',
    category: 'coastal',
    temperature: 0.4,
    humidity: 0.5,
    heightOffset: SEA_LEVEL - 1,
    heightScale: 3,
    surfaceBlock: BlockType.SAND,
    subSurfaceBlock: BlockType.SAND,
    deepStoneBlock: BlockType.STONE,
    foliageDensity: 0.02,
    treeChance: 0.005,
    treeType: 'palm',
    skyColor: [0.48, 0.75, 0.98],
    fogColor: [0.72, 0.88, 0.98],
    waterColor: [0.20, 0.60, 0.90],
  },
  plains: {
    id: 'plains',
    name: 'Sunswept Plains',
    category: 'flat',
    temperature: 0.2,
    humidity: 0.4,
    heightOffset: 30,
    heightScale: 8,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    deepStoneBlock: BlockType.STONE,
    foliageDensity: 0.15,
    treeChance: 0.005,
    treeType: 'oak',
    skyColor: [0.45, 0.72, 0.98],
    fogColor: [0.75, 0.88, 0.98],
    waterColor: [0.18, 0.55, 0.88],
  },
  meadow: {
    id: 'meadow',
    name: 'Prismatic Meadow',
    category: 'flat',
    temperature: 0.25,
    humidity: 0.65,
    heightOffset: 32,
    heightScale: 10,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    deepStoneBlock: BlockType.STONE,
    foliageDensity: 0.35,
    treeChance: 0.015,
    treeType: 'birch',
    skyColor: [0.42, 0.74, 0.98],
    fogColor: [0.70, 0.88, 0.96],
    waterColor: [0.18, 0.58, 0.90],
  },
  forest: {
    id: 'forest',
    name: 'Verdant Forest',
    category: 'forest',
    temperature: 0.1,
    humidity: 0.75,
    heightOffset: 34,
    heightScale: 14,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    deepStoneBlock: BlockType.STONE,
    foliageDensity: 0.22,
    treeChance: 0.075,
    treeType: 'oak',
    skyColor: [0.38, 0.68, 0.95],
    fogColor: [0.65, 0.85, 0.82],
    waterColor: [0.15, 0.50, 0.82],
  },
  dense_forest: {
    id: 'dense_forest',
    name: 'Deep Ancient Canopy',
    category: 'forest',
    temperature: 0.15,
    humidity: 0.88,
    heightOffset: 36,
    heightScale: 18,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    deepStoneBlock: BlockType.STONE,
    foliageDensity: 0.30,
    treeChance: 0.14,
    treeType: 'giant',
    skyColor: [0.32, 0.62, 0.90],
    fogColor: [0.55, 0.78, 0.72],
    waterColor: [0.12, 0.45, 0.78],
  },
  jungle: {
    id: 'jungle',
    name: 'Tropical Rainforest',
    category: 'forest',
    temperature: 0.8,
    humidity: 0.95,
    heightOffset: 34,
    heightScale: 20,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    deepStoneBlock: BlockType.STONE,
    foliageDensity: 0.45,
    treeChance: 0.16,
    treeType: 'jungle',
    skyColor: [0.35, 0.75, 0.92],
    fogColor: [0.58, 0.85, 0.78],
    waterColor: [0.10, 0.60, 0.80],
  },
  swamp: {
    id: 'swamp',
    name: 'Misty Wetlands',
    category: 'swamp',
    temperature: 0.4,
    humidity: 0.9,
    heightOffset: SEA_LEVEL,
    heightScale: 3,
    surfaceBlock: BlockType.MOSS_STONE,
    subSurfaceBlock: BlockType.CLAY,
    deepStoneBlock: BlockType.STONE,
    foliageDensity: 0.28,
    treeChance: 0.05,
    treeType: 'oak',
    skyColor: [0.45, 0.60, 0.75],
    fogColor: [0.50, 0.65, 0.60],
    waterColor: [0.20, 0.40, 0.45],
  },
  taiga: {
    id: 'taiga',
    name: 'Pine Boreal Taiga',
    category: 'cold',
    temperature: -0.4,
    humidity: 0.5,
    heightOffset: 38,
    heightScale: 20,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    deepStoneBlock: BlockType.STONE,
    foliageDensity: 0.12,
    treeChance: 0.08,
    treeType: 'pine',
    skyColor: [0.55, 0.72, 0.92],
    fogColor: [0.75, 0.85, 0.92],
    waterColor: [0.25, 0.58, 0.88],
  },
  snow_forest: {
    id: 'snow_forest',
    name: 'Frosted Timberlands',
    category: 'cold',
    temperature: -0.7,
    humidity: 0.6,
    heightOffset: 42,
    heightScale: 22,
    surfaceBlock: BlockType.SNOW,
    subSurfaceBlock: BlockType.DIRT,
    deepStoneBlock: BlockType.STONE,
    foliageDensity: 0.08,
    treeChance: 0.06,
    treeType: 'pine',
    skyColor: [0.65, 0.78, 0.95],
    fogColor: [0.85, 0.90, 0.98],
    waterColor: [0.35, 0.65, 0.92],
  },
  tundra: {
    id: 'tundra',
    name: 'Frozen Glacial Tundra',
    category: 'cold',
    temperature: -0.9,
    humidity: 0.2,
    heightOffset: 36,
    heightScale: 12,
    surfaceBlock: BlockType.SNOW,
    subSurfaceBlock: BlockType.ICE,
    deepStoneBlock: BlockType.STONE,
    foliageDensity: 0.02,
    treeChance: 0.002,
    treeType: 'dead',
    skyColor: [0.70, 0.80, 0.98],
    fogColor: [0.90, 0.94, 1.00],
    waterColor: [0.40, 0.70, 0.95],
  },
  desert: {
    id: 'desert',
    name: 'Sunken Dune Expanse',
    category: 'hot',
    temperature: 0.95,
    humidity: 0.05,
    heightOffset: 32,
    heightScale: 16,
    surfaceBlock: BlockType.SAND,
    subSurfaceBlock: BlockType.SAND,
    deepStoneBlock: BlockType.STONE,
    foliageDensity: 0.01,
    treeChance: 0.001,
    treeType: 'none',
    skyColor: [0.58, 0.78, 0.98],
    fogColor: [0.92, 0.82, 0.65],
    waterColor: [0.20, 0.70, 0.88],
  },
  savanna: {
    id: 'savanna',
    name: 'Arid Savanna Plateau',
    category: 'hot',
    temperature: 0.7,
    humidity: 0.25,
    heightOffset: 36,
    heightScale: 14,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    deepStoneBlock: BlockType.STONE,
    foliageDensity: 0.08,
    treeChance: 0.02,
    treeType: 'oak',
    skyColor: [0.55, 0.76, 0.95],
    fogColor: [0.85, 0.82, 0.72],
    waterColor: [0.22, 0.62, 0.85],
  },
  badlands: {
    id: 'badlands',
    name: 'Terracotta Canyon Badlands',
    category: 'hot',
    temperature: 0.85,
    humidity: 0.1,
    heightOffset: 45,
    heightScale: 30,
    surfaceBlock: BlockType.CLAY,
    subSurfaceBlock: BlockType.COPPER_BLOCK,
    deepStoneBlock: BlockType.BASALT,
    foliageDensity: 0.01,
    treeChance: 0.0,
    treeType: 'dead',
    skyColor: [0.60, 0.72, 0.90],
    fogColor: [0.85, 0.65, 0.50],
    waterColor: [0.30, 0.55, 0.70],
  },
  highlands: {
    id: 'highlands',
    name: 'Rolling Windswept Highlands',
    category: 'mountain',
    temperature: -0.1,
    humidity: 0.4,
    heightOffset: 52,
    heightScale: 28,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.STONE,
    deepStoneBlock: BlockType.STONE,
    foliageDensity: 0.06,
    treeChance: 0.01,
    treeType: 'pine',
    skyColor: [0.45, 0.72, 0.98],
    fogColor: [0.72, 0.85, 0.95],
    waterColor: [0.20, 0.55, 0.90],
  },
  alpine: {
    id: 'alpine',
    name: 'Majestic Alpine Peaks',
    category: 'mountain',
    temperature: -0.8,
    humidity: 0.3,
    heightOffset: 72,
    heightScale: 48,
    surfaceBlock: BlockType.SNOW,
    subSurfaceBlock: BlockType.STONE,
    deepStoneBlock: BlockType.STONE,
    foliageDensity: 0.01,
    treeChance: 0.002,
    treeType: 'pine',
    skyColor: [0.50, 0.75, 1.00],
    fogColor: [0.82, 0.90, 0.98],
    waterColor: [0.30, 0.65, 0.95],
  },
  volcanic: {
    id: 'volcanic',
    name: 'Pyroclast Obsidian Crags',
    category: 'exotic',
    temperature: 1.0,
    humidity: 0.0,
    heightOffset: 58,
    heightScale: 36,
    surfaceBlock: BlockType.BASALT,
    subSurfaceBlock: BlockType.MAGMA_ROCK,
    deepStoneBlock: BlockType.OBSIDIAN,
    foliageDensity: 0.0,
    treeChance: 0.0,
    treeType: 'none',
    skyColor: [0.42, 0.32, 0.32],
    fogColor: [0.65, 0.35, 0.25],
    waterColor: [0.85, 0.22, 0.10],
  },
  fungal: {
    id: 'fungal',
    name: 'Luminescent Fungal Sporelands',
    category: 'exotic',
    temperature: 0.3,
    humidity: 0.85,
    heightOffset: 32,
    heightScale: 12,
    surfaceBlock: BlockType.MOSS_STONE,
    subSurfaceBlock: BlockType.DIRT,
    deepStoneBlock: BlockType.STONE,
    foliageDensity: 0.40,
    treeChance: 0.04,
    treeType: 'crystal',
    skyColor: [0.40, 0.55, 0.70],
    fogColor: [0.60, 0.50, 0.75],
    waterColor: [0.40, 0.20, 0.70],
  },
  corrupted: {
    id: 'corrupted',
    name: 'Aetherial Crystal Realm',
    category: 'exotic',
    temperature: 0.2,
    humidity: 0.7,
    heightOffset: 40,
    heightScale: 22,
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    deepStoneBlock: BlockType.STONE,
    foliageDensity: 0.25,
    treeChance: 0.06,
    treeType: 'crystal',
    skyColor: [0.55, 0.42, 0.88],
    fogColor: [0.72, 0.58, 0.92],
    waterColor: [0.25, 0.75, 0.95],
  },
};

export class BiomeManager {
  private tempNoise: SimplexNoise;
  private humidNoise: SimplexNoise;
  private continentalNoise: SimplexNoise;
  private erosionNoise: SimplexNoise;
  private peaksNoise: SimplexNoise;

  constructor(seed: number) {
    this.tempNoise = new SimplexNoise(seed + 101);
    this.humidNoise = new SimplexNoise(seed + 202);
    this.continentalNoise = new SimplexNoise(seed + 303);
    this.erosionNoise = new SimplexNoise(seed + 404);
    this.peaksNoise = new SimplexNoise(seed + 505);
  }

  // Multidimensional climate evaluation
  public getBiome(wx: number, wz: number): ExtendedBiomeDef {
    const scale = 0.0012; // Macro continent / climate scale
    const temp = this.tempNoise.fbm2D(wx * scale, wz * scale, 3, 0.5);
    const humid = (this.humidNoise.fbm2D(wx * scale + 1200, wz * scale + 1200, 3, 0.5) + 1) * 0.5;
    const continental = this.continentalNoise.fbm2D(wx * 0.0006, wz * 0.0006, 4, 0.45);
    const erosion = this.erosionNoise.fbm2D(wx * 0.002, wz * 0.002, 3, 0.5);
    const peaks = Math.abs(this.peaksNoise.fbm2D(wx * 0.004, wz * 0.004, 3, 0.5));

    // 1. Continental Ocean Shelf
    if (continental < -0.35) {
      return continental < -0.55 ? BIOMES_2.deep_ocean : BIOMES_2.ocean;
    }

    // Coastal Beach Transition
    if (continental >= -0.35 && continental < -0.22) {
      return BIOMES_2.beach;
    }

    // 2. High Mountains & Alpine
    if (peaks > 0.58 && erosion > 0.1) {
      if (temp < -0.2) return BIOMES_2.alpine;
      if (temp > 0.65) return BIOMES_2.volcanic;
      return BIOMES_2.highlands;
    }

    // 3. Exotic Biomes (Rare)
    if (humid > 0.82 && temp > 0.25 && temp < 0.6) {
      return BIOMES_2.corrupted;
    }
    if (humid > 0.85 && temp < 0.1) {
      return BIOMES_2.fungal;
    }

    // 4. Hot Climate
    if (temp > 0.5) {
      if (humid < 0.18) return BIOMES_2.desert;
      if (humid < 0.35) return BIOMES_2.badlands;
      if (humid < 0.65) return BIOMES_2.savanna;
      return BIOMES_2.jungle;
    }

    // 5. Cold Climate
    if (temp < -0.3) {
      if (temp < -0.65) return BIOMES_2.tundra;
      if (humid > 0.45) return BIOMES_2.snow_forest;
      return BIOMES_2.taiga;
    }

    // 6. Temperate Climate
    if (humid > 0.72) return BIOMES_2.dense_forest;
    if (humid > 0.50) return BIOMES_2.forest;
    if (humid > 0.35) return BIOMES_2.meadow;
    if (humid > 0.20 && erosion < -0.2) return BIOMES_2.swamp;

    return BIOMES_2.plains;
  }

  // Biome Blending for smooth environmental transitions (e.g., Sky & Fog colors)
  public getBlendedEnvironment(wx: number, wz: number): {
    skyColor: [number, number, number];
    fogColor: [number, number, number];
    waterColor: [number, number, number];
  } {
    const sampleRadius = 16;
    let rSky = 0, gSky = 0, bSky = 0;
    let rFog = 0, gFog = 0, bFog = 0;
    let rWat = 0, gWat = 0, bWat = 0;
    let total = 0;

    for (let dx = -sampleRadius; dx <= sampleRadius; dx += sampleRadius) {
      for (let dz = -sampleRadius; dz <= sampleRadius; dz += sampleRadius) {
        const bio = this.getBiome(wx + dx, wz + dz);
        rSky += bio.skyColor[0]; gSky += bio.skyColor[1]; bSky += bio.skyColor[2];
        rFog += bio.fogColor[0]; gFog += bio.fogColor[1]; bFog += bio.fogColor[2];
        rWat += bio.waterColor[0]; gWat += bio.waterColor[1]; bWat += bio.waterColor[2];
        total++;
      }
    }

    return {
      skyColor: [rSky / total, gSky / total, bSky / total],
      fogColor: [rFog / total, gFog / total, bFog / total],
      waterColor: [rWat / total, gWat / total, bWat / total],
    };
  }
}
