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
    version: '4.0.0',
    date: '2026-10-17',
    title: '10 Saran Strategis Penyempurnaan VoxelVerse (Master Roadmap)',
    type: 'major',
    changes: [
      {
        category: '1. Optimasi Meshing & Streaming Dunia',
        items: [
          'Algoritma Greedy Meshing multi-threaded di Web Worker untuk mereduksi draw call hingga 70%.',
          'Occlusion Culling dan Frustum LOD dinamis guna menjamin 60 FPS stabil di mobile browser.'
        ]
      },
      {
        category: '2. Arsitektur Tradisional Nusantara',
        items: [
          'Penambahan balok vernakular: Kayu Jati Ukir, Bambu Anyam Gedek, Atap Ijuk Aren, dan Candi Andesit Basal.',
          'Sistem modular atap gonjong Rumah Gadang, lumbung Alang Tongkonan, dan pendopo Joglo.'
        ]
      },
      {
        category: '3. Pertanian Terpadu Subak & Irigasi',
        items: [
          'Sistem gravitasi irigasi Subak berundak untuk hidrasi sawah terasering.',
          'Siklus panen Padi Rojolele, Rempah Cengkeh, Kunyit, dan racikan masakan tumpeng penambah stamina.'
        ]
      },
      {
        category: '4. Combat Taktis & Skill Pusaka',
        items: [
          'Mekanik Posture/Poise break dan parry presisi untuk membuka serangan kritis riposte.',
          'Skill jurus pusaka: Pusaran Pamor Suci (Keris), Kilat Baruklinting (Tombak), dan Tebasan Badai (Mandau).'
        ]
      },
      {
        category: '5. Dungeon Sanctum & Boss Mitologi',
        items: [
          'Dungeon ruang bertingkat prosedural dengan jebakan kuno dan telegraf area bahaya melingkar.',
          'Pertarungan multi-fase melawan Colossus Batara Kala dan Naga Penjaga Lahar Baruklinting.'
        ]
      },
      {
        category: '6. Otomasi Rekayasa Jaringan Aether',
        items: [
          'Kabel resonansi, corong penyalur otomatis (Item Funnels), dan kincir air bertenaga arus sungai.',
          'Mesin pelebur otomatis Resonance Fabricator dan rel luncur cepat (Aether Rail).'
        ]
      },
      {
        category: '7. Questline Cerita "Tirta Amerta" & Jurnal',
        items: [
          'Alur kampanye utama restorasi 7 pulau Nusantara dari korupsi aether kabut gelap.',
          'Buku Jurnal Pengelana (tombol J) dengan sketsa botani, prasasti sejarah, dan ensiklopedia satwa.'
        ]
      },
      {
        category: '8. UI/HUD Responsif Lintas Platform & Mini-Radar',
        items: [
          'Mini-Radar top-down 2D real-time dengan jarum kompas dinamis dan pilar cahaya waypoint 3D.',
          'Tata letak layar sentuh mobile adaptif yang mencegah tombol virtual menutupi pandangan.'
        ]
      },
      {
        category: '9. Multiplayer Otoritatif Berlatensi Rendah',
        items: [
          'Client-side prediction dengan server reconciliation untuk penempatan balok instan tanpa desync.',
          'Kompresi binary bitmask delta WebSocket guna menghemat kuota transmisi data hingga 80%.'
        ]
      },
      {
        category: '10. Soundscape Tradisional Nusantara Adaptif',
        items: [
          'Sintesis Web Audio instrumen tradisional: Gamelan Slendro/Pelog, Angklung bambu, dan Seruling gunung.',
          'Sistem audio adaptif cuaca dan elevasi (angin kawah vulkanik dan deburan ombak pesisir).'
        ]
      }
    ]
  },
  {
    version: '3.5.0',
    date: '2026-10-14',
    title: 'Ekspansi Dungeon Kuno, Multi-Phase Boss & Relic Purba',
    type: 'major',
    changes: [
      {
        category: 'Boss & Combat Systems',
        items: [
          'Memperkenalkan Boss Colossus Batara Kala dengan 3 fase dinamis: Tebasan Purba, Perisai Aether Leyline, dan Amarah Kosmik (Berserk).',
          'Sistem Poise Break dan Stagger Riposte: Meruntuhkan poise pertahanan boss membuka peluang serangan riposte 100% kritis.',
          'HUD Boss Bar Cinematic: Dilengkapi status fase, dual-layer ghost damage bar, dan indikator poise interaktif.'
        ]
      },
      {
        category: 'Ancient Nusantara Relics',
        items: [
          'Mustika Naga Warisan Purba: +50% ketahanan poise dan gelombang gempa aether pada combo finisher ke-3.',
          'Cakra Surya Precursor: +25% attack speed, aura penerangan abadi, dan tebasan kobaran api surya.',
          'Pusaka Keris Kyai Sengkelat: Menembus pertahanan perisai energi dan garansi riposte kritis seketika.',
          'Modal Relic Discovery megah saat boss berhasil ditundukkan.'
        ]
      },
      {
        category: 'Performance & 60 FPS Meshing',
        items: [
          'Optimasi alokasi zero-garbage typed array buffer pada VoxelMesher.',
          'Peningkatan budget upload frame 16.6ms untuk mempertahankan stabilitas 60 FPS selama pertarungan intensif.'
        ]
      }
    ]
  },
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
