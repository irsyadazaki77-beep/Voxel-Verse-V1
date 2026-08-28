// Centralized Configuration Engine for World Generation 2.0
// Config-driven parameters for vertical bounds, layered noise, biomes, structures, ores & presets

export const WORLD_MIN_Y = 0;
export const WORLD_MAX_Y = 128; // Configurable height: 128 blocks vertical chunk
export const CHUNK_SIZE_Y = 128;
export const SEA_LEVEL = 28; // Configurable global sea level

export type WorldPreset = 'standard' | 'continental' | 'archipelago' | 'mountainous' | 'flattish';

export interface WorldGenParameters {
  preset: WorldPreset;
  continentalnessScale: number; // Low frequency scale for macro continents
  erosionScale: number; // Scale for terrain smoothness / ruggedness
  peaksScale: number; // Scale for mountain ridges & valleys
  riverFrequency: number;
  caveDensity: number;
  structureDensity: number;
  oreAbundance: number;
  seaLevel: number;
  mountainHeightScale: number;
}

export const WORLD_PRESETS: Record<WorldPreset, WorldGenParameters> = {
  standard: {
    preset: 'standard',
    continentalnessScale: 0.001,
    erosionScale: 0.004,
    peaksScale: 0.008,
    riverFrequency: 0.006,
    caveDensity: 0.035,
    structureDensity: 0.08,
    oreAbundance: 1.0,
    seaLevel: 28,
    mountainHeightScale: 38,
  },
  continental: {
    preset: 'continental',
    continentalnessScale: 0.0006, // Huge landmasses & ocean basins
    erosionScale: 0.003,
    peaksScale: 0.006,
    riverFrequency: 0.005,
    caveDensity: 0.035,
    structureDensity: 0.09,
    oreAbundance: 1.1,
    seaLevel: 28,
    mountainHeightScale: 42,
  },
  archipelago: {
    preset: 'archipelago',
    continentalnessScale: 0.003, // Frequent ocean transitions
    erosionScale: 0.005,
    peaksScale: 0.010,
    riverFrequency: 0.008,
    caveDensity: 0.040,
    structureDensity: 0.07,
    oreAbundance: 1.0,
    seaLevel: 32, // Higher water level
    mountainHeightScale: 28,
  },
  mountainous: {
    preset: 'mountainous',
    continentalnessScale: 0.0012,
    erosionScale: 0.008,
    peaksScale: 0.012,
    riverFrequency: 0.007,
    caveDensity: 0.045,
    structureDensity: 0.08,
    oreAbundance: 1.25,
    seaLevel: 24,
    mountainHeightScale: 62, // Dramatic alpine ridges
  },
  flattish: {
    preset: 'flattish',
    continentalnessScale: 0.0008,
    erosionScale: 0.002,
    peaksScale: 0.003,
    riverFrequency: 0.004,
    caveDensity: 0.025,
    structureDensity: 0.12,
    oreAbundance: 1.0,
    seaLevel: 26,
    mountainHeightScale: 12,
  },
};

// Geological Strata Boundaries (Depth from surface or absolute Y)
export interface GeologicalStrataDef {
  minY: number;
  maxY: number;
  stoneType: number; // BlockType enum value
  name: string;
}

// Structure Region Grid Size (in Chunks) for multi-chunk deterministic placement
export const STRUCTURE_REGION_SIZE = 16; // 1 region = 16x16 chunks (256x256 blocks)
