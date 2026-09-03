export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  type: 'major' | 'minor' | 'patch';
  changes: {
    category: string;
    items: string[];
  }[];
}

export const GAME_CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.9.1',
    date: '2026-09-03',
    title: 'Water Visual Polish & Optimization',
    type: 'minor',
    changes: [
      {
        category: 'Visual Polish',
        items: [
          'Added depth-based color blending for shallow and deep water.',
          'Implemented normal perturbation (micro ripples) to break up specular highlights and prevent blinding sun reflections.',
          'Added subtle shoreline foam and transparency fading near coasts.',
          'Adjusted water roughness and metalness for more natural, shimmering reflections.'
        ]
      },
      {
        category: 'Performance',
        items: [
          'Optimized shoreline detection with short-circuit boolean evaluation.',
          'Removed diagonal line seams caused by excessive vertex displacement.'
        ]
      }
    ]
  },
  {
    version: '0.9.0-RC1',
    date: '2026-08-15',
    title: 'Multiplayer Harness & Telemetry',
    type: 'major',
    changes: [
      {
        category: 'Multiplayer',
        items: [
          'Initial implementation of WebSocket-based multiplayer synchronization.',
          'Added remote player entities and movement interpolation.'
        ]
      },
      {
        category: 'World Generation',
        items: [
          'Improved chunk generation worker pool scheduling.',
          'Added new geological strata definition system.'
        ]
      }
    ]
  },
  {
    version: '0.8.5',
    date: '2026-07-22',
    title: 'Cinematic Post-Processing',
    type: 'minor',
    changes: [
      {
        category: 'Graphics',
        items: [
          'Introduced Cinematic Post Shader with sharpening and color grading.',
          'Improved ambient occlusion (AO) balancing in voxel mesher.',
          'Enhanced particle system and sky environment lighting.'
        ]
      }
    ]
  }
];
