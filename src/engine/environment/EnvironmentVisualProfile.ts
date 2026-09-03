// Dynamic Environment Visual Profiles & Atmospheric Color Engine
import * as THREE from 'three';

export interface VisualProfile {
  id: string;
  name: string;
  skyColorDay: [number, number, number];
  skyColorSunset: [number, number, number];
  skyColorNight: [number, number, number];
  fogColorDay: [number, number, number];
  fogColorSunset: [number, number, number];
  fogColorNight: [number, number, number];
  fogDensity: number;
  sunColor: number;
  sunIntensity: number;
  ambientColor: number;
  ambientIntensity: number;
  hemiColor: number;
  hemiGroundColor: number;
  waterColor: [number, number, number];
  waterOpacity: number;
  windSpeed: number;
  particleType?: 'leaves' | 'snow' | 'sand' | 'ash' | 'spores' | 'embers';
  particleDensity: number;
  emissiveBoost: number;
}

export const BIOME_VISUAL_PROFILES: Record<string, VisualProfile> = {
  plains: {
    id: 'plains',
    name: 'Sunswept Plains',
    skyColorDay: [0.45, 0.72, 0.98],
    skyColorSunset: [0.95, 0.58, 0.40],
    skyColorNight: [0.06, 0.09, 0.20],
    fogColorDay: [0.75, 0.88, 0.98],
    fogColorSunset: [0.92, 0.65, 0.55],
    fogColorNight: [0.09, 0.12, 0.24],
    fogDensity: 0.007,
    sunColor: 0xfff6dd,
    sunIntensity: 1.25,
    ambientColor: 0xddeeff,
    ambientIntensity: 0.40,
    hemiColor: 0x87ceeb,
    hemiGroundColor: 0x554433,
    waterColor: [0.18, 0.55, 0.88],
    waterOpacity: 0.72,
    windSpeed: 2.0,
    particleType: 'leaves',
    particleDensity: 0.15,
    emissiveBoost: 1.0,
  },
  forest: {
    id: 'forest',
    name: 'Verdant Forest',
    skyColorDay: [0.38, 0.68, 0.95],
    skyColorSunset: [0.90, 0.52, 0.35],
    skyColorNight: [0.05, 0.08, 0.18],
    fogColorDay: [0.65, 0.85, 0.82],
    fogColorSunset: [0.88, 0.60, 0.50],
    fogColorNight: [0.08, 0.12, 0.20],
    fogDensity: 0.0085,
    sunColor: 0xffeedd,
    sunIntensity: 1.20,
    ambientColor: 0xd0e8d0,
    ambientIntensity: 0.42,
    hemiColor: 0x66bb88,
    hemiGroundColor: 0x3d3022,
    waterColor: [0.15, 0.50, 0.82],
    waterOpacity: 0.75,
    windSpeed: 2.5,
    particleType: 'leaves',
    particleDensity: 0.4,
    emissiveBoost: 1.0,
  },
  snow_mountain: {
    id: 'snow_mountain',
    name: 'Glacial Peak',
    skyColorDay: [0.52, 0.74, 0.98],
    skyColorSunset: [0.88, 0.62, 0.70],
    skyColorNight: [0.09, 0.13, 0.28],
    fogColorDay: [0.82, 0.90, 0.98],
    fogColorSunset: [0.85, 0.70, 0.78],
    fogColorNight: [0.13, 0.17, 0.32],
    fogDensity: 0.010,
    sunColor: 0xf4f8ff,
    sunIntensity: 1.35,
    ambientColor: 0xe0efff,
    ambientIntensity: 0.45,
    hemiColor: 0x99ccff,
    hemiGroundColor: 0x445566,
    waterColor: [0.25, 0.65, 0.95],
    waterOpacity: 0.80,
    windSpeed: 4.0,
    particleType: 'snow',
    particleDensity: 0.6,
    emissiveBoost: 1.1,
  },
  desert: {
    id: 'desert',
    name: 'Arid Dunes',
    skyColorDay: [0.55, 0.76, 0.98],
    skyColorSunset: [0.98, 0.50, 0.25],
    skyColorNight: [0.07, 0.08, 0.19],
    fogColorDay: [0.92, 0.85, 0.72],
    fogColorSunset: [0.95, 0.60, 0.40],
    fogColorNight: [0.10, 0.11, 0.22],
    fogDensity: 0.0075,
    sunColor: 0xfffae0,
    sunIntensity: 1.45,
    ambientColor: 0xffeedd,
    ambientIntensity: 0.45,
    hemiColor: 0xffd999,
    hemiGroundColor: 0x664422,
    waterColor: [0.15, 0.58, 0.85],
    waterOpacity: 0.68,
    windSpeed: 2.8,
    particleType: 'sand',
    particleDensity: 0.3,
    emissiveBoost: 1.0,
  },
  crystal: {
    id: 'crystal',
    name: 'Luminescent Valley',
    skyColorDay: [0.25, 0.65, 0.90],
    skyColorSunset: [0.60, 0.35, 0.85],
    skyColorNight: [0.08, 0.12, 0.26],
    fogColorDay: [0.45, 0.80, 0.92],
    fogColorSunset: [0.65, 0.45, 0.85],
    fogColorNight: [0.12, 0.16, 0.34],
    fogDensity: 0.009,
    sunColor: 0xd5f0ff,
    sunIntensity: 1.15,
    ambientColor: 0x88e0ff,
    ambientIntensity: 0.50,
    hemiColor: 0x38bdf8,
    hemiGroundColor: 0x223355,
    waterColor: [0.10, 0.75, 0.95],
    waterOpacity: 0.65,
    windSpeed: 1.8,
    particleType: 'spores',
    particleDensity: 0.5,
    emissiveBoost: 1.5,
  },
  volcanic: {
    id: 'volcanic',
    name: 'Infernal Crags',
    skyColorDay: [0.40, 0.25, 0.25],
    skyColorSunset: [0.75, 0.20, 0.15],
    skyColorNight: [0.12, 0.06, 0.09],
    fogColorDay: [0.55, 0.30, 0.25],
    fogColorSunset: [0.70, 0.25, 0.18],
    fogColorNight: [0.18, 0.09, 0.10],
    fogDensity: 0.012,
    sunColor: 0xff8855,
    sunIntensity: 1.10,
    ambientColor: 0xff6644,
    ambientIntensity: 0.42,
    hemiColor: 0xee5533,
    hemiGroundColor: 0x2b1108,
    waterColor: [0.85, 0.25, 0.10],
    waterOpacity: 0.90,
    windSpeed: 3.2,
    particleType: 'ash',
    particleDensity: 0.7,
    emissiveBoost: 1.8,
  },
  corrupted: {
    id: 'corrupted',
    name: 'Void Anomaly',
    skyColorDay: [0.22, 0.15, 0.35],
    skyColorSunset: [0.45, 0.15, 0.50],
    skyColorNight: [0.08, 0.05, 0.15],
    fogColorDay: [0.38, 0.25, 0.48],
    fogColorSunset: [0.50, 0.22, 0.55],
    fogColorNight: [0.12, 0.07, 0.20],
    fogDensity: 0.011,
    sunColor: 0xcc88ff,
    sunIntensity: 1.05,
    ambientColor: 0xaa55ff,
    ambientIntensity: 0.40,
    hemiColor: 0x9944dd,
    hemiGroundColor: 0x1f0f30,
    waterColor: [0.45, 0.12, 0.65],
    waterOpacity: 0.85,
    windSpeed: 2.2,
    particleType: 'spores',
    particleDensity: 0.6,
    emissiveBoost: 1.6,
  },
};

export class EnvironmentAtmosphereEngine {
  public static getProfile(biomeId?: string): VisualProfile {
    if (!biomeId) return BIOME_VISUAL_PROFILES.plains;
    const normalized = biomeId.toLowerCase();
    if (normalized.includes('snow') || normalized.includes('peak') || normalized.includes('ice') || normalized.includes('tundra') || normalized.includes('taiga')) {
      return BIOME_VISUAL_PROFILES.snow_mountain;
    }
    if (normalized.includes('forest') || normalized.includes('grove') || normalized.includes('wood') || normalized.includes('canopy')) {
      return BIOME_VISUAL_PROFILES.forest;
    }
    if (normalized.includes('desert') || normalized.includes('dune') || normalized.includes('sand') || normalized.includes('mesa') || normalized.includes('badlands')) {
      return BIOME_VISUAL_PROFILES.desert;
    }
    if (normalized.includes('crystal') || normalized.includes('aether') || normalized.includes('luminescent') || normalized.includes('prism')) {
      return BIOME_VISUAL_PROFILES.crystal;
    }
    if (normalized.includes('volcan') || normalized.includes('lava') || normalized.includes('infernal') || normalized.includes('crag') || normalized.includes('magma')) {
      return BIOME_VISUAL_PROFILES.volcanic;
    }
    if (normalized.includes('corrupt') || normalized.includes('void') || normalized.includes('dark') || normalized.includes('abyss')) {
      return BIOME_VISUAL_PROFILES.corrupted;
    }
    return BIOME_VISUAL_PROFILES.plains;
  }
}
