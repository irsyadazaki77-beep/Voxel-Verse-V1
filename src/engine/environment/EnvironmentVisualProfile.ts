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
    skyColorDay: [0.42, 0.68, 0.95],
    skyColorSunset: [0.95, 0.55, 0.38],
    skyColorNight: [0.06, 0.08, 0.18],
    fogColorDay: [0.68, 0.82, 0.92],
    fogColorSunset: [0.85, 0.60, 0.50],
    fogColorNight: [0.08, 0.10, 0.22],
    fogDensity: 0.0065,
    sunColor: 0xfff6dd,
    sunIntensity: 1.25,
    ambientColor: 0xddeeff,
    ambientIntensity: 0.38,
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
    skyColorDay: [0.35, 0.65, 0.92],
    skyColorSunset: [0.88, 0.50, 0.32],
    skyColorNight: [0.05, 0.07, 0.16],
    fogColorDay: [0.60, 0.78, 0.75],
    fogColorSunset: [0.82, 0.55, 0.45],
    fogColorNight: [0.07, 0.10, 0.18],
    fogDensity: 0.008,
    sunColor: 0xffeedd,
    sunIntensity: 1.20,
    ambientColor: 0xd0e8d0,
    ambientIntensity: 0.40,
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
    skyColorDay: [0.48, 0.70, 0.95],
    skyColorSunset: [0.85, 0.58, 0.65],
    skyColorNight: [0.08, 0.12, 0.25],
    fogColorDay: [0.75, 0.82, 0.90],
    fogColorSunset: [0.80, 0.65, 0.72],
    fogColorNight: [0.12, 0.15, 0.30],
    fogDensity: 0.0095,
    sunColor: 0xf4f8ff,
    sunIntensity: 1.30,
    ambientColor: 0xe0efff,
    ambientIntensity: 0.42,
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
    skyColorDay: [0.52, 0.72, 0.95],
    skyColorSunset: [0.95, 0.48, 0.22],
    skyColorNight: [0.07, 0.08, 0.18],
    fogColorDay: [0.85, 0.78, 0.65],
    fogColorSunset: [0.90, 0.55, 0.35],
    fogColorNight: [0.09, 0.10, 0.20],
    fogDensity: 0.007,
    sunColor: 0xfffae0,
    sunIntensity: 1.40,
    ambientColor: 0xffeedd,
    ambientIntensity: 0.42,
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
    skyColorDay: [0.22, 0.62, 0.88],
    skyColorSunset: [0.58, 0.32, 0.82],
    skyColorNight: [0.08, 0.11, 0.24],
    fogColorDay: [0.40, 0.75, 0.88],
    fogColorSunset: [0.62, 0.42, 0.82],
    fogColorNight: [0.11, 0.15, 0.32],
    fogDensity: 0.0085,
    sunColor: 0xd5f0ff,
    sunIntensity: 1.15,
    ambientColor: 0x88e0ff,
    ambientIntensity: 0.48,
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
    skyColorDay: [0.38, 0.22, 0.22],
    skyColorSunset: [0.72, 0.18, 0.12],
    skyColorNight: [0.11, 0.05, 0.08],
    fogColorDay: [0.50, 0.28, 0.22],
    fogColorSunset: [0.65, 0.22, 0.16],
    fogColorNight: [0.16, 0.08, 0.09],
    fogDensity: 0.011,
    sunColor: 0xff8855,
    sunIntensity: 1.10,
    ambientColor: 0xff6644,
    ambientIntensity: 0.40,
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
    skyColorDay: [0.20, 0.12, 0.32],
    skyColorSunset: [0.42, 0.12, 0.48],
    skyColorNight: [0.07, 0.04, 0.14],
    fogColorDay: [0.35, 0.22, 0.45],
    fogColorSunset: [0.48, 0.20, 0.52],
    fogColorNight: [0.11, 0.06, 0.18],
    fogDensity: 0.010,
    sunColor: 0xcc88ff,
    sunIntensity: 1.05,
    ambientColor: 0xaa55ff,
    ambientIntensity: 0.38,
    hemiColor: 0x9944dd,
    hemiGroundColor: 0x1f0f30,
    waterColor: [0.45, 0.12, 0.65],
    waterOpacity: 0.85,
    windSpeed: 2.2,
    particleType: 'spores',
    particleDensity: 0.6,
    emissiveBoost: 1.6,
  },
  ocean: {
    id: 'ocean',
    name: 'Deep Abyssal Ocean',
    skyColorDay: [0.38, 0.62, 0.92],
    skyColorSunset: [0.85, 0.52, 0.35],
    skyColorNight: [0.04, 0.06, 0.15],
    fogColorDay: [0.52, 0.72, 0.88],
    fogColorSunset: [0.78, 0.58, 0.48],
    fogColorNight: [0.06, 0.09, 0.18],
    fogDensity: 0.0075,
    sunColor: 0xfff8ee,
    sunIntensity: 1.20,
    ambientColor: 0xccddff,
    ambientIntensity: 0.35,
    hemiColor: 0x4488ff,
    hemiGroundColor: 0x112233,
    waterColor: [0.05, 0.25, 0.65],
    waterOpacity: 0.95,
    windSpeed: 3.5,
    particleType: 'spores',
    particleDensity: 0.2,
    emissiveBoost: 1.0,
  },
  aether_expanse: {
    id: 'aether_expanse',
    name: 'Aether Expanse',
    skyColorDay: [0.1, 0.4, 0.6],       // Deep rich cyan/teal
    skyColorSunset: [0.3, 0.2, 0.5],    // Violet sunset
    skyColorNight: [0.05, 0.05, 0.15],  // Void dark
    fogColorDay: [0.2, 0.6, 0.7],
    fogColorSunset: [0.4, 0.25, 0.6],
    fogColorNight: [0.02, 0.05, 0.1],
    fogDensity: 0.0007,
    sunColor: 0xd4f0ff,
    sunIntensity: 1.5,
    ambientColor: 0x3b82f6,
    ambientIntensity: 0.4,
    hemiColor: 0x0ea5e9,
    hemiGroundColor: 0x1e1b4b,
    waterColor: [0.1, 0.8, 0.9],
    waterOpacity: 0.8,
    windSpeed: 2.0,
    particleType: 'spores',
    particleDensity: 0.5,
    emissiveBoost: 1.5,
  },
  // Nusantara Cultural Region Visual Profiles
  minang: {
    id: 'minang',
    name: 'Tanah Minang (Lembah Harau)',
    skyColorDay: [0.38, 0.65, 0.88],
    skyColorSunset: [0.92, 0.48, 0.32],
    skyColorNight: [0.06, 0.08, 0.16],
    fogColorDay: [0.65, 0.78, 0.82],
    fogColorSunset: [0.82, 0.54, 0.44],
    fogColorNight: [0.08, 0.10, 0.18],
    fogDensity: 0.012, // Thin mountain mist
    sunColor: 0xfff4db,
    sunIntensity: 1.22,
    ambientColor: 0xd4eedb, // Lush emerald
    ambientIntensity: 0.42,
    hemiColor: 0x55aa77,
    hemiGroundColor: 0x3d3222,
    waterColor: [0.12, 0.62, 0.78],
    waterOpacity: 0.72,
    windSpeed: 2.2,
    particleType: 'leaves',
    particleDensity: 0.3,
    emissiveBoost: 1.0,
  },
  jawa: {
    id: 'jawa',
    name: 'Tanah Jawa (Dataran Subur)',
    skyColorDay: [0.42, 0.68, 0.94],
    skyColorSunset: [0.96, 0.58, 0.32],
    skyColorNight: [0.07, 0.08, 0.18],
    fogColorDay: [0.72, 0.82, 0.90],
    fogColorSunset: [0.88, 0.62, 0.48],
    fogColorNight: [0.09, 0.11, 0.22],
    fogDensity: 0.007,
    sunColor: 0xfff3cf,
    sunIntensity: 1.28,
    ambientColor: 0xe6edd8,
    ambientIntensity: 0.40,
    hemiColor: 0x82c474,
    hemiGroundColor: 0x483a2a,
    waterColor: [0.18, 0.58, 0.85],
    waterOpacity: 0.74,
    windSpeed: 2.0,
    particleType: 'leaves',
    particleDensity: 0.2,
    emissiveBoost: 1.0,
  },
  bali: {
    id: 'bali',
    name: 'Bali Highlands (Subak Sacred)',
    skyColorDay: [0.40, 0.70, 0.95],
    skyColorSunset: [0.98, 0.50, 0.28], // Vivid golden-orange sunset
    skyColorNight: [0.08, 0.09, 0.20],
    fogColorDay: [0.68, 0.82, 0.88],
    fogColorSunset: [0.90, 0.56, 0.42],
    fogColorNight: [0.10, 0.12, 0.24],
    fogDensity: 0.009,
    sunColor: 0xffeed0,
    sunIntensity: 1.30,
    ambientColor: 0xf2edd4, // Warm sacred temple glow
    ambientIntensity: 0.44,
    hemiColor: 0x76c988,
    hemiGroundColor: 0x4f3d2a,
    waterColor: [0.15, 0.65, 0.82],
    waterOpacity: 0.70,
    windSpeed: 2.3,
    particleType: 'spores',
    particleDensity: 0.35,
    emissiveBoost: 1.1,
  },
  borneo: {
    id: 'borneo',
    name: 'Borneo Riverlands (Hutan Hujan Tropis)',
    skyColorDay: [0.32, 0.60, 0.82],
    skyColorSunset: [0.86, 0.46, 0.28],
    skyColorNight: [0.04, 0.06, 0.14],
    fogColorDay: [0.55, 0.75, 0.70], // Dense humid canopy mist
    fogColorSunset: [0.78, 0.50, 0.40],
    fogColorNight: [0.06, 0.09, 0.15],
    fogDensity: 0.015, // Dense tropical haze
    sunColor: 0xffebcc,
    sunIntensity: 1.18,
    ambientColor: 0xb8e6b8,
    ambientIntensity: 0.45,
    hemiColor: 0x449966,
    hemiGroundColor: 0x2c261c,
    waterColor: [0.10, 0.45, 0.55], // River peat/clay water
    waterOpacity: 0.85,
    windSpeed: 1.6,
    particleType: 'spores',
    particleDensity: 0.6,
    emissiveBoost: 1.0,
  },
  toraja: {
    id: 'toraja',
    name: 'Toraja Highlands (Pegunungan Karst)',
    skyColorDay: [0.35, 0.58, 0.85],
    skyColorSunset: [0.82, 0.44, 0.36],
    skyColorNight: [0.05, 0.07, 0.17],
    fogColorDay: [0.60, 0.72, 0.80], // Highland valley mist
    fogColorSunset: [0.75, 0.52, 0.48],
    fogColorNight: [0.08, 0.11, 0.20],
    fogDensity: 0.014,
    sunColor: 0xfff0e2,
    sunIntensity: 1.20,
    ambientColor: 0xc8d8e0,
    ambientIntensity: 0.38,
    hemiColor: 0x6a8a9a,
    hemiGroundColor: 0x333333,
    waterColor: [0.15, 0.55, 0.75],
    waterOpacity: 0.75,
    windSpeed: 3.2,
    particleType: 'spores',
    particleDensity: 0.25,
    emissiveBoost: 1.0,
  },
  papua: {
    id: 'papua',
    name: 'Papuan Highlands (Lembah Baliem & Puncak)',
    skyColorDay: [0.45, 0.68, 0.95], // Crisp thin mountain air
    skyColorSunset: [0.90, 0.52, 0.50],
    skyColorNight: [0.07, 0.10, 0.24],
    fogColorDay: [0.70, 0.80, 0.92],
    fogColorSunset: [0.82, 0.60, 0.65],
    fogColorNight: [0.10, 0.14, 0.28],
    fogDensity: 0.008,
    sunColor: 0xf6f8ff,
    sunIntensity: 1.32,
    ambientColor: 0xd8e8f8,
    ambientIntensity: 0.42,
    hemiColor: 0x88bbee,
    hemiGroundColor: 0x3a4450,
    waterColor: [0.20, 0.70, 0.90],
    waterOpacity: 0.78,
    windSpeed: 4.2,
    particleType: 'snow',
    particleDensity: 0.3,
    emissiveBoost: 1.1,
  },
  nusa: {
    id: 'nusa',
    name: 'Eastern Isles (Kepulauan Karang & Savana)',
    skyColorDay: [0.44, 0.72, 0.98],
    skyColorSunset: [0.98, 0.60, 0.30], // Blazing tropical sunset
    skyColorNight: [0.07, 0.09, 0.22],
    fogColorDay: [0.72, 0.85, 0.95],
    fogColorSunset: [0.90, 0.65, 0.45],
    fogColorNight: [0.08, 0.12, 0.25],
    fogDensity: 0.0055, // Crystal clear coastal horizon
    sunColor: 0xfffae8,
    sunIntensity: 1.35,
    ambientColor: 0xfbf4db,
    ambientIntensity: 0.46,
    hemiColor: 0x38bdf8,
    hemiGroundColor: 0x5a4832,
    waterColor: [0.05, 0.78, 0.88], // Luminous turquoise coral shallows
    waterOpacity: 0.65,
    windSpeed: 3.8,
    particleType: 'sand',
    particleDensity: 0.25,
    emissiveBoost: 1.05,
  },
};

export class EnvironmentAtmosphereEngine {
  public static getProfile(biomeId?: string, regionId?: string): VisualProfile {
    if (regionId && BIOME_VISUAL_PROFILES[regionId]) {
      return BIOME_VISUAL_PROFILES[regionId];
    }
    if (!biomeId) return BIOME_VISUAL_PROFILES.plains;
    const normalized = biomeId.toLowerCase();
    
    if (BIOME_VISUAL_PROFILES[normalized]) {
      return BIOME_VISUAL_PROFILES[normalized];
    }
    if (normalized.includes('ocean') || normalized.includes('abyss') || normalized.includes('deep')) {
      return BIOME_VISUAL_PROFILES.ocean;
    }
    if (normalized.includes('snow') || normalized.includes('peak') || normalized.includes('ice') || normalized.includes('tundra') || normalized.includes('taiga') || normalized.includes('alpine') || normalized.includes('glacial')) {
      return BIOME_VISUAL_PROFILES.snow_mountain;
    }
    if (normalized.includes('forest') || normalized.includes('grove') || normalized.includes('wood') || normalized.includes('canopy') || normalized.includes('jungle') || normalized.includes('swamp') || normalized.includes('meadow')) {
      return BIOME_VISUAL_PROFILES.forest;
    }
    if (normalized.includes('desert') || normalized.includes('dune') || normalized.includes('sand') || normalized.includes('mesa') || normalized.includes('badlands') || normalized.includes('savanna')) {
      return BIOME_VISUAL_PROFILES.desert;
    }
    if (normalized.includes('crystal') || normalized.includes('aether') || normalized.includes('luminescent') || normalized.includes('prism') || normalized.includes('fungal')) {
      return BIOME_VISUAL_PROFILES.crystal;
    }
    if (normalized.includes('volcan') || normalized.includes('lava') || normalized.includes('infernal') || normalized.includes('crag') || normalized.includes('magma')) {
      return BIOME_VISUAL_PROFILES.volcanic;
    }
    if (normalized.includes('corrupt') || normalized.includes('void') || normalized.includes('dark')) {
      return BIOME_VISUAL_PROFILES.corrupted;
    }
    return BIOME_VISUAL_PROFILES.plains;
  }
}
