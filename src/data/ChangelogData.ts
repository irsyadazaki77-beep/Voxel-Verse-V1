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
    version: '5.0.0',
    date: '2026-11-01',
    title: 'Penyempurnaan Agung Nusantara: Dock Pintasan Terpadu, Kombo Keris 3-Tahap & Hit-Stop, Atmosfer Kunang-Kunang 3D, Rutinitas Desa & Optimasi 60 FPS',
    type: 'major',
    changes: [
      {
        category: '1. Dock Pintasan Terpadu, Indikator Auto-Save Pintar & Tooltip Pusaka Kontekstual',
        items: [
          'Merapikan navigasi kanan atas menjadi Dock Pintasan Terpadu yang ringkas tanpa memenuhi layar, dilengkapi indikator Auto-Save Pintar non-intrusif dan chip status Berkah Gamelan/Wayang/Khodam.',
          'Memperkaya ItemTooltip dengan Panduan Pusaka kontekstual, pintasan tombol, bonus atribut pasif, serta permukaan Matte Obsidian bebas beban backdrop-blur di atas kanvas WebGL.'
        ]
      },
      {
        category: '2. Rangkaian Kombo Keris 3-Tahap, Bilah Keris Luk-5 3D & Efek Micro Hit-Stop',
        items: [
          'Menghadirkan koreografi serangan jarak dekat 3-tahap (Sabetan I, Sabetan Silang II, dan Tusukan Pamungkas III 1.45x DMG) lengkap dengan partikel busur tebasan 3D, bilah Keris berlekuk di sudut pandang orang pertama, dan efek Micro Hit-Stop (~48ms).'
        ]
      },
      {
        category: '3. Partikel Alam Kunang-Kunang Malam, Cahaya Senja & Audio Langkah Kaki Spesifik Blok',
        items: [
          'Menambahkan partikel Kunang-Kunang bercahaya zamrud-emas saat malam hari dan debu cahaya keemasan saat fajar/senja.',
          'Menyempurnakan efek suara langkah kaki prosedural berdasarkan material blok pijakan (Rumput/Sawah, Batu Candi, Papan Kayu Pendopo, Pasir Pantai, Air Dangkal, serta Rel Logam Aether).'
        ]
      },
      {
        category: '4. AI Rutinitas Budaya Warga Desa, Resep Crafting Pusaka & Distance Culling 60 FPS',
        items: [
          'Warga desa kini berkumpul menikmati Harmoni Pendopo Gamelan & Wayang Kulit pada sore hari, dilengkapi resep crafting baru untuk seluruh pusaka Mahakarya serta Quest Utama Sumpah Harmoni Nusantara.',
          'Menerapkan Distance Culling otomatis (110m) dan daur ulang vektor Zero-GC pada rakitan 3D untuk menjaga performa stabil 60 FPS.'
        ]
      }
    ]
  },
  {
    version: '4.8.0',
    date: '2026-11-01',
    title: 'Ekspansi Mahakarya Nusantara: Kapal Selam & Candi Samudra 3D, Lokomotif Uap Aether, Studio Gamelan 3D, Khodam & Mode Foto Free-Cam',
    type: 'major',
    changes: [
      {
        category: '1. Kapal Selam Nanggala Kencana 3D & Ekspedisi Candi Samudra Bawah Laut',
        items: [
          'Kemudikan Kapal Selam Nanggala Kencana 3D berkubah kaca bertekanan dengan baling-baling kuningan berputar, lampu sorot bawah laut, sonar aktif, dan perlindungan oksigen 100%.',
          'Buka ruang suci Candi Samudra Selatan di dasar laut lengkap dengan Mutiara Agung Candi Samudra dan pertarungan Bos Raja Kala Samudra.'
        ]
      },
      {
        category: '2. Lokomotif Uap Aether 3D, Jaringan Rel & Otomasi Mesin Bor Tambang',
        items: [
          'Gelar jalur rel melingkar beserta Lokomotif Uap Aether Majapahit 3D yang dapat dinaiki lengkap dengan peluit uap dan roda penggerak.',
          'Dirikan Mesin Bor Tambang Aether 3D yang berputar secara fisik dan menambang bijih besi, emas, batu bara, serta Starfall secara otomatis.'
        ]
      },
      {
        category: '3. Studio Alat Musik Gamelan & Angklung 3D Interaktif Berkah',
        items: [
          'Bangun Pendopo Gamelan & Angklung 3D di dunia dan mainkan bilah Saron, Bonang, Angklung Bambu, serta Gong Ageng dalam laras Pelog maupun Slendro.',
          'Putar Gending Sriwijaya otomatis untuk mengaktifkan Berkah Harmoni Gamelan yang memulihkan HP dan Stamina.'
        ]
      },
      {
        category: '4. Companion Khodam 3D, Turnamen Arena Pendekar & Erupsi Vulkanik Merapi',
        items: [
          'Panggil 3 Companion Khodam 3D (Macan Putih Siliwangi, Garuda Api Merapi, Naga Tirta Samudra) yang mengorbit pemain dan menyerang musuh secara otomatis, serta ikuti Turnamen Arena Pendekar 3 Babak.',
          'Rasakan cuaca ekstrem Erupsi Vulkanik Merapi dengan hujan Kristal Lahar Pijar, Badai Petir Khatulistiwa, Kustomisasi Jubah Batik 3D, Fast Travel Prasasti di Peta Dunia, serta Mode Foto Sinematik Free-Cam 3D [P].'
        ]
      }
    ]
  },
  {
    version: '4.7.0',
    date: '2026-10-25',
    title: 'Optimasi Performa Menyeluruh, Adaptive 60 FPS, Mode Turbo FPS [F4] & Zero-GC HUD',
    type: 'major',
    changes: [
      {
        category: '1. Pembekuan Matriks Chunk Statis & Camera-Delta Frustum Culling',
        items: [
          'Membekukan kalkulasi ulang matriks dunia (matrixAutoUpdate = false) pada ribuan grup mesh chunk voxel statis serta melewati sapuan Frustum Culling saat kamera diam.',
          'Memperketat anggaran unggah geometri GPU per frame (1.65ms micro-slicing) agar streaming dunia baru bebas dari frame-drop.'
        ]
      },
      {
        category: '2. Penjadwalan 3-Tier LOD AI Entitas, Animasi Rig 3D & Spatial Grid',
        items: [
          'Pencarian target pengawal NPC kini menggunakan Spatial Grid O(1) per sel chunk tanpa memindai seluruh daftar entitas global.',
          'Sistem 3-Tier Distance LOD menjalankan animasi artikulasi sendi 60Hz di jarak dekat (<22m), 30Hz di jarak menengah (22–42m), dan 15Hz di jarak jauh (>42m).'
        ]
      },
      {
        category: '3. Throttling IBL Cubemap, Shadow Map Cadence & Ketajaman CAS Jarak Dekat',
        items: [
          'Menghilangkan pembuatan ulang tekstur IBL PMREM 60x/detik dan mengatur pembaruan Shadow Map matahari secara terukur untuk memangkas beban GPU hingga 50%.',
          'Saat Dynamic Resolution aktif menjaga 60 FPS, shader Contrast-Adaptive Sharpening (CAS) otomatis meningkatkan ketajaman visual di dekat pemain.'
        ]
      },
      {
        category: '4. Zero-GC React HUD Shallow Diffing, Mode Turbo FPS [F4] & Auto-Tuner',
        items: [
          'Menghapus re-render berulang 12.5Hz pada komponen utama HUD melalui perbandingan state dangkal (shallow diffing) dan React.memo.',
          'Menambahkan tombol cepat Mode Turbo FPS [F4] di HUD serta fitur Kalibrasi Otomatis 60 FPS di menu Pengaturan Grafis.'
        ]
      }
    ]
  },
  {
    version: '4.6.0',
    date: '2026-10-25',
    title: 'Ekspedisi Candi Bawah Tanah & Bos Buto Ijo 3D, Silat 3 Aliran & Ajian Sakti, Kincir Air Subak 3D & Wayang Kulit Berkah',
    type: 'major',
    changes: [
      {
        category: '1. Ekspedisi Candi Bawah Tanah & Bos Raksasa Buto Ijo 3D',
        items: [
          'Gunakan Kompas Ekspedisi Candi Bawah Tanah untuk membuka ruang suci Candi Purba di bawah tanah lengkap dengan perangkap Bilah Ayun Kala 3D yang berayun ritmis, obor suar, dan peti pusaka.',
          'Pertarungan Boss 3 Fase melawan Raksasa Buto Ijo 3D bersenjatakan Gada Gempa berduri emas yang memicu gelombang kejut tanah dan menjatuhkan Gada Pusaka Buto Ijo.'
        ]
      },
      {
        category: '2. Sistem Kuda-Kuda Silat 3 Aliran & Serangan Ajian Sakti Pusaka',
        items: [
          'Ganti Kuda-Kuda Silat secara real-time [Tombol V / Kitab Silat]: Aliran Harimau Tanah (+25% Crit & +20% Kecepatan Tebas), Aliran Bangau Putih (Efisiensi Stamina & Pemulihan Parry), dan Aliran Naga Samudra (+40% Poise Break & Pertahanan).',
          'Kumpulkan Tenaga Dalam (0–100%) dari pertarungan dan tangkisan sempurna untuk melepaskan 3 Ajian Pamungkas 3D: Ajian Brajamusti, Ajian Seribu Bayangan, dan Ajian Rawa Rontek Pancasona.'
        ]
      },
      {
        category: '3. Kincir Air Subak 3D & Otomasi Panen Sawah Terasering',
        items: [
          'Bangun Kincir Air Subak Bambu 3D yang berputar secara fisik lengkap dengan talang air bambu untuk mengairi petak sawah 5x5 dan memanen Beras Wangi serta Gandum secara otomatis ke inventaris.'
        ]
      },
      {
        category: '4. Panggung Wayang Kulit Berkah 3D & Pasar Malam Desa',
        items: [
          'Dirikan Panggung Kelir Wayang Kulit 3D bercahaya lampu Blencong hangat dengan siluet Gunungan, Gatotkaca, dan Buto Cakil yang bergerak hidup.',
          'Pilih 3 Lakon Wayang Berkah Dunia: Lakon Gatotkaca Krida (+25% Damage & Poise), Lakon Sri Sedana (2x Hasil Panen Subak), dan Lakon Dewa Ruci (Regenerasi HP & Pengisian Tenaga Dalam).'
        ]
      }
    ]
  },
  {
    version: '4.5.0',
    date: '2026-10-20',
    title: 'Ekspedisi Dirgantara Garuda 3D, Glider Layang Naga, Tempa Pamor Pusaka & Pertahanan Desa',
    type: 'major',
    changes: [
      {
        category: '1. Tunggangan Udara Garuda Kencana 3D & Glider Layang-Layang Naga Batik',
        items: [
          'Panggil dan tunggangi Garuda Kencana 3D bermahkota emas prada dengan kepakan sayap artikulasi real-time, hembusan partikel bulu cahaya, dan manuver terbang bebas melintasi kepulauan.',
          'Bentangkan Layang-Layang Naga Batik 3D saat melompat dari puncak tebing atau candi, lengkap dengan sistem Arus Termal Kawah & Aether yang mengangkat glider ke angkasa.'
        ]
      },
      {
        category: '2. Tempa Pamor Elemen Pusaka, Soket Batu Mustika & Zirah Prajurit Nusantara',
        items: [
          'Paron Empu Nusantara 3.0 kini mendukung Tempa Pamor Surya Merapi (Api), Pamor Bajra Kilat (Petir), dan Pamor Tirta Samudra (Es) dengan percikan partikel elemen 3D pada setiap tebasan.',
          'Tatahkan Batu Mustika Merah Delima, Mustika Zamrud Khatulistiwa, dan Mustika Bintang Jatuh ke senjata atau Zirah Prajurit Majapahit untuk bonus Damage, Critical, dan Poise Break.'
        ]
      },
      {
        category: '3. Pertahanan Desa Malam Bulan Darah, Festival Lampion 3D & Satwa Endemik',
        items: [
          'Bunyikan Kentongan Siaga Desa untuk mempertahankan Balai Desa dari 3 gelombang invasi Malam Bulan Darah bersama pengawal NPC dan menara suar.',
          'Rayakan kemenangan desa dengan menerbangkan Lampion Kertas 3D bercahaya hangat ke langit malam yang memberikan berkah Regenerasi & Ketahanan Poise, serta jinakkan Harimau Sumatera, Komodo Purba, dan Cenderawasih Emas.'
        ]
      }
    ]
  },
  {
    version: '4.4.0',
    date: '2026-10-20',
    title: 'Boss Naga Baruklinting 3D, Hologram Cetak Biru Arsitektur, Desa Hidup & Jamu Nusantara',
    type: 'major',
    changes: [
      {
        category: '1. Boss Mitologi Naga Lahar Baruklinting 3D & Keris Pusaka',
        items: [
          'Pertarungan Boss 3 Fase melawan Naga Lahar Baruklinting 3D: Fase I Terkaman Sisik Darat (Parry & Poise Break), Fase II Melayang Udara & Semburan Geyser Magma, serta Fase III Hujan Meteorit Kawah Berapi.',
          'Menjatuhkan senjata mitos Keris Pusaka Naga Baruklinting dengan efek tebasan vulkanik dan penghancur Poise.'
        ]
      },
      {
        category: '2. Lontar Cetak Biru Arsitektur & Proyeksi Hologram 3D Real-Time',
        items: [
          'Proyeksi hologram 3D transparan di depan pemain untuk merancang dan membangun Pendopo Joglo Agung, Lumbung Alang Tongkonan, Gapura Candi Bentar, dan Menara Suar Phinisi secara instan.',
          'Dilengkapi kontrol HUD interaktif untuk mengganti desain cetak biru, memutar orientasi 90 derajat, dan membangun dalam satu klik.'
        ]
      },
      {
        category: '3. Rekrutmen Pengawal NPC, Racikan Jamu Tradisional & Prasasti Harta',
        items: [
          'Rekrut warga atau prajurit desa melalui jendela dialog untuk mengawal perjalanan Anda dan otomatis menyerang monster/boss di sekitar.',
          'Racikan Jamu Kunyit Asam, Jamu Beras Kencur, dan Rendang Daging Minang pemberi buff Regenerasi, Swiftness, dan Strength, ditambah Kompas Prasasti Harta Karun.'
        ]
      }
    ]
  },
  {
    version: '4.3.0',
    date: '2026-10-20',
    title: 'Optimasi Performa, Audio Langkah Tiap Balok, Musik Gamelan Adaptif & Kamera Imersif',
    type: 'major',
    changes: [
      {
        category: '1. Audio Langkah Kaki Dinamis per Material Balok & Zero-GC Buffer',
        items: [
          'Deteksi permukaan balok real-time (Rumput/Sawah, Batu Candi/Andesit, Kayu Jati/Bambu, Pasir Pantai, Air, dan Salju) dengan sintesis audio dua lapis (transient + noise terfilter).',
          'Kalkulator jarak langkah ritmis yang otomatis menyesuaikan tempo langkah saat jalan santai, mengendap, berlari cepat, maupun mendarat dari ketinggian.'
        ]
      },
      {
        category: '2. Sutradara Musik Gamelan Nusantara Adaptif (Slendro & Pelog)',
        items: [
          'Orkestrasi generatif Saron, Suling Bambu, Angklung, dan Gong Ageng yang beradaptasi secara cerdas terhadap waktu siang/malam, pelayaran kapal Phinisi, penyelaman palung laut, serta pertarungan/bencana kosmik.'
        ]
      },
      {
        category: '3. Dinamika Kamera Imersif & Kenyamanan Inventaris Pintar',
        items: [
          'Sistem trauma screen-shake harmonik non-linear dan ayunan gelombang laut (vessel wave sway) saat mengemudikan Perahu Cadik atau Kapal Phinisi.',
          'Fitur satu klik "Rapikan Tas" (Auto-Sort & Stack Consolidation) di Inventaris serta "Quick-Stack" & "Rapikan Peti" pada Storage Vault.'
        ]
      }
    ]
  },
  {
    version: '4.2.0',
    date: '2026-10-20',
    title: 'Ekspedisi Bahari Nusantara, Kapal Phinisi 3D & Fenomena Alam Mitologis',
    type: 'major',
    changes: [
      {
        category: '1. Armada Bahari 3D: Perahu Cadik & Kapal Phinisi Samudra',
        items: [
          'Rakit dan luncurkan Perahu Cadik Nusantara maupun Kapal Phinisi Samudra 3D bertiang ganda langsung di perairan.',
          'Fisika apung gelombang (wave pitch/roll), kemudi layar dinamis dengan buih ombak haluan, serta HUD Nautical Helm berkecepatan Knots.'
        ]
      },
      {
        category: '2. Eksplorasi Palung Bawah Laut & Terumbu Karang Bercahaya',
        items: [
          'Generasi prosedural Terumbu Karang Bercahaya (Bioluminescent Coral) dan Kima Raksasa Mutiara di dasar samudra.',
          'Fitur Sonar Palung Laut & Jangkar Selam (Diving Bell Anchor) dengan berkat napas air Tirta Selam Samudra.'
        ]
      },
      {
        category: '3. Fenomena Alam Mitologis Dinamis & Bijih Bintang Jatuh',
        items: [
          'Hujan Meteor Aether (Starfall) dengan meteor 3D jatuh secara real-time yang membentuk kawah dan Bijih Bintang Jatuh (Starfall Ore).',
          'Gerhana Bulan Darah Batara Kala, Erupsi Abu Vulkanik Dinamis, serta pusaka Astrolabe Bintang Kuno untuk memanggil fenomena kosmik.'
        ]
      }
    ]
  },
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
