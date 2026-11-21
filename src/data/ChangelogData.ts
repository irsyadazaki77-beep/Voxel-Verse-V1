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
    version: '7.4.0',
    date: '2026-11-21',
    title: 'Visual Polish & Rendering Overhaul: Unclipped 600m+ Distant Horizons, Zero Chunk-Border Light Seams, Smooth 5-Tap RGB Lighting, Analytic LOD Normals, Tangent PBR Micro-Normals & Crisp God Rays',
    type: 'major',
    changes: [
      {
        category: '1. Horizon Visibility, SkyDome Occlusion & Shadow Frustum (GameRuntime.ts & SkyEnvironment.ts)',
        items: [
          'Menaikkan camera.far ke 1200m dan radius SkyDome ke 950m (depthWrite: false, renderOrder: -1000) agar Distant Horizons LOD hingga 600m+ tidak lagi terpotong atau tertutup langit.',
          'Memperluas shadow frustum matahari (hingga ±80m di Ultra) dan menyeimbangkan aerial perspective FogExp2.'
        ]
      },
      {
        category: '2. Chunk-Border Seam Fix & Smooth 5-Tap RGB Lighting (VoxelMesher.ts & DistantLODSystem.ts)',
        items: [
          'Memperbaiki garis gelap vertikal di perbatasan antar-chunk serta menambahkan 5-tap smooth neighbor RGB light blending untuk gradien cahaya obor, lava, dan kristal Aether yang halus.',
          'Meng-upgrade DistantLODSystem ke MeshStandardMaterial dengan analytic heightfield normals di seluruh tepi tile sehingga sambungan antar-tile 64m/128m bebas garis gelap.'
        ]
      },
      {
        category: '3. Tangent-Projected PBR Micro-Normals, Anti-Moiré & God Rays Guard (VoxelWorld.ts & RenderPipeline.ts)',
        items: [
          'Memproyeksikan PBR micro-normal secara tangensial terhadap vWorldNormal dan menambahkan distance fade (detailFade & borderFade) untuk menghilangkan moiré shimmering di kejauhan.',
          'Menambahkan skyElevationWeight pada God Rays di CinematicPostShader agar pasir pantai dan salju terang tidak ikut berkabut kuning.'
        ]
      }
    ]
  },
  {
    version: '7.3.0',
    date: '2026-11-21',
    title: 'Ekosistem Modding & Desktop Native: Pusat Karya Nusantara (Workshop UGC 1-Klik) dan Tauri Native Filesystem Save Bridge',
    type: 'major',
    changes: [
      {
        category: '1. Pusat Karya Nusantara — Community UGC Workshop (WorkshopUGCManager.ts)',
        items: [
          'Menghadirkan katalog & installer 1-klik untuk Behavior Pack JSON, Blueprint Candi/Rumah Adat, dan Pola Batik 16×16 lengkap dengan fitur publish, export/import JSON, serta endpoint server /api/workshop/catalog dan /api/workshop/publish.'
        ]
      },
      {
        category: '2. Tauri Native Desktop Save Bridge (TauriNativeBridge.ts & src-tauri/src/main.rs)',
        items: [
          'Menambahkan bridge TypeScript ↔ Rust Tauri (save_world_native, load_world_native, list_native_worlds, delete_world_native) dengan sanitasi path & atomic temp-rename agar save dunia desktop tersimpan langsung ke filesystem lokal tanpa batas kuota IndexedDB.'
        ]
      }
    ]
  },
  {
    version: '7.2.0',
    date: '2026-11-21',
    title: 'Kerajaan Hidup (Living Nusantara World): Ekspansi Desa Otonom, Karavan Dagang & Phinisi, Multi-Phase Destructive World Bosses, serta Memori Episodik NPC & Quest AI Dinamis',
    type: 'major',
    changes: [
      {
        category: '1. Simulasi Kerajaan Hidup & Karavan Dagang (LivingKingdomManager.ts)',
        items: [
          'Menambahkan sistem pengiriman Karavan Rempah & Kapal Phinisi antar-pemukiman Nusantara lengkap dengan interaksi pengawalan (escort) & perampokan (raid).',
          'Pemukiman yang makmur dari arus dagang kini berkembang secara otonom membangun Lumbung Padi, Pasar Rempah, Dermaga Phinisi, Menara Pengawas, hingga Pendopo Agung.'
        ]
      },
      {
        category: '2. Multi-Phase Mythic World Bosses dengan Arena Destruktif (WorldBossRaidManager.ts)',
        items: [
          'Menghadirkan 3 World Boss mitologi Nusantara (Garuda Sura, Naga Besukih, Raksasa Karst Maros) dengan transisi 3 fase, telegraph serangan, ledakan kawah voxel destruktif yang menghormati Bedrock/Obsidian, dan distribusi loot raid.'
        ]
      },
      {
        category: '3. Memori Episodik NPC & Generator Quest Kontekstual AI (NPCMemoryAndQuestEngine.ts)',
        items: [
          'Menambahkan sistem memori episodik NPC yang terhubung otomatis ke NusantaraAIService (Gemini AI + fallback offline) serta generator misi dinamis berdasarkan ancaman bos, karavan aktif, dan pertumbuhan desa sekitar.'
        ]
      }
    ]
  },
  {
    version: '7.1.0',
    date: '2026-11-21',
    title: 'Multiplayer Backend Overhaul: SQLite Binary Chunk Storage (Zlib), Spatial Interest Filtering untuk Block Sync, dan Sistem Land Claim (Wilayah Kerajaan)',
    type: 'major',
    changes: [
      {
        category: '1. Migrasi Penyimpanan ke SQLite + Binary Chunk Blobs (RealmSQLiteStore.ts)',
        items: [
          'Mengganti penyimpanan JSON datar (server-realms-db.json) dengan SQLite WAL mode (node:sqlite) dan kompresi Zlib binary chunk delta (9 byte/blok) dengan auto-migrasi dari database lama.'
        ]
      },
      {
        category: '2. Wilayah Kerajaan / Land Claim Territory Protection (LandClaimManager.ts)',
        items: [
          'Menambahkan sistem klaim chunk per pemain (maks 16 chunk/realm) lengkap dengan daftar pemain terpercaya (trust/untrust), proteksi anti-grief di handler BLOCK_CHANGE, serta event WebSocket CLAIM_CHUNK / UNCLAIM_CHUNK / TRUST_CLAIM_PLAYER dan REST API /api/realms/:realmId/claims.'
        ]
      },
      {
        category: '3. Spatial Interest Filtering untuk Real-Time Block Sync (server.ts)',
        items: [
          'Mengoptimalkan broadcast BLOCK_CHANGE agar hanya dikirim ke pemain dalam radius 192 blok (12 chunk) dari lokasi perubahan, mengurangi bandwidth server secara signifikan di realm ramai.'
        ]
      }
    ]
  },
  {
    version: '7.0.0',
    date: '2026-11-21',
    title: 'Distant Horizons & Sensory Overhaul: Hierarchical Chunk LOD (600m+ Vista), True 3D RGB Colored Voxel Lighting, dan 3D Spatial Audio & Dynamic Cavern Acoustics',
    type: 'major',
    changes: [
      {
        category: '1. Distant Horizons Hierarchical Chunk LOD (DistantLODSystem.ts)',
        items: [
          'Menambahkan sistem LOD 2-cincin (64m & 128m macro-tiles) di luar render distance aktif yang merender siluet pegunungan vulkanik, tebing karst, sawah terasering, dan laut Nusantara hingga jarak pandang ~600m+ dengan alokasi budget CPU time-sliced.',
          'Menambahkan toggle Distant Horizons LOD (600m+ Vista) langsung di Settings → Graphics.'
        ]
      },
      {
        category: '2. True 3D RGB Colored Voxel Lighting (LightingEngine.ts & VoxelMesher.ts)',
        items: [
          'Meng-upgrade LightingEngine ke propagasi cahaya BFS 3-kanal RGB (16-bit packed per voxel) untuk cahaya obor/api hangat, lava vulkanik merah-oranye, kristal Aether biru-cyan, dan jamur bioluminescent hijau zamrud di gua.',
          'Mengintegrasikan pewarnaan cahaya RGB langsung ke vertex color buffer greedy mesher di VoxelMesher (berjalan otomatis di Web Worker tanpa buffer GPU tambahan).'
        ]
      },
      {
        category: '3. 3D Spatial Audio (HRTF) & Dynamic Environmental Acoustics (SoundSynthesizer.ts)',
        items: [
          'Menambahkan bus akustik Web Audio dengan ConvolverNode cavern reverb prosedural, BiquadFilterNode low-pass bawah air, sinkronisasi AudioListener 3D kamera, serta emitter playSpatialSound() berbasis PannerNode HRTF.'
        ]
      }
    ]
  },
  {
    version: '6.4.0',
    date: '2026-11-21',
    title: 'Deep Performance Upgrade: On-Demand Lazy Modals, GPU Shader ALU Bypass Sync, dan Entity Distance AI & Visibility Culling',
    type: 'major',
    changes: [
      {
        category: '1. On-Demand React.lazy Modal Code-Splitting',
        items: [
          'Mengubah 13 modal utama di GameCanvas.tsx menjadi React.lazy() on-demand chunks sehingga bundle startup awal tidak mem-parse ratusan KB kode UI sebelum modal dibuka.'
        ]
      },
      {
        category: '2. GPU Shader ALU Bypass & Entity Distance Culling',
        items: [
          'Menghubungkan Settings.graphics.shaderRealism secara langsung ke uniform uShaderRealism pada VoxelWorld (mode Stylized kini melewati kalkulasi micro-normal, rain puddle, dan SSS di GPU).',
          'Menambahkan EntityManager distance throttling (>48m tick 1/4 frekuensi) dan mesh visibility culling (>105m) untuk menghemat CPU & draw calls di area padat.'
        ]
      }
    ]
  },
  {
    version: '6.3.0',
    date: '2026-11-21',
    title: 'Visual & Performance Refinement: Zero-GC InstancedMesh Debris, Half-Resolution SSAO, Dynamic Shader Governor, Shader Realism UI & Vite Bundle Splitting',
    type: 'major',
    changes: [
      {
        category: '1. Optimasi GPU Fillrate & Zero-GC Draw Calls',
        items: [
          'Mengubah serpihan tambang 3D (VoxelPhysicsSystem) menjadi satu THREE.InstancedMesh berkapasitas 64 kubus (1 draw call total, nol alokasi material baru).',
          'Menjalankan SSAOPass pada setengah resolusi (0.5x) untuk menghemat beban GPU fillrate hingga ~70% di resolusi tinggi serta menghubungkan RenderQualityManager ke setDynamicShaderScale().'
        ]
      },
      {
        category: '2. Kontrol UI Shader Realism & Pemecahan Bundle Vite',
        items: [
          'Menambahkan pemilih Shader Realism (Stylized, Realistic, Ultra) langsung di Settings → Graphics.',
          'Memecah bundle produksi Vite menjadi manual chunks (engine-world & ui-modals) untuk mempercepat waktu muat awal.'
        ]
      }
    ]
  },
  {
    version: '6.2.0',
    date: '2026-11-21',
    title: 'Photorealistic World Shader Overhaul: Procedural PBR Micro-Normals, Rain Puddles, Foliage Subsurface Scattering, Mie/Rayleigh Sky & Cirrus Wisps, dan Sun-Tracked God Rays',
    type: 'major',
    changes: [
      {
        category: '1. Terrain & Foliage Realism (VoxelWorld.ts)',
        items: [
          'Menambahkan Procedural Micro-Normal Perturbation untuk material batu, kayu, tanah/rumput, dan logam sehingga menangkap kilau cahaya matahari secara realistis tanpa tekstur tambahan.',
          'Menambahkan simulasi genangan air hujan reflektif (Rain Puddles) pada permukaan datar saat cuaca hujan serta Backlit Subsurface Scattering (SSS) pada daun dan rumput.'
        ]
      },
      {
        category: '2. Air Tropis, Langit Rayleigh/Mie & God Rays Dinamis',
        items: [
          'Memperkaya riak air laut dengan gelombang multi-oktaf serta menambahkan Rayleigh/Mie Solar Scattering + awan Cirrus prosedural pada kubah langit (SkyEnvironment.ts).',
          'Menghubungkan proyeksi layar matahari secara real-time dari RenderSystem ke CinematicPostShader agar God Rays mengikuti posisi matahari dan menambahkan Filmic Vignette.'
        ]
      }
    ]
  },
  {
    version: '6.1.0',
    date: '2026-11-21',
    title: 'Bedrock & Java Parity Engine: Simulasi Fluida Air/Lava + Obsidian, Sistem Enchantment & Status Effect, Konsol Perintah Slash (/), dan Behavior Pack Modding API',
    type: 'major',
    changes: [
      {
        category: '1. Simulasi Fluida Cellular Automata (Air, Lava & Reaksi Obsidian/Cobblestone)',
        items: [
          'Menambahkan FluidSimulationSystem dengan prioritas aliran gravitasi, penyebaran bertingkat (Air 7 blok, Lava 3 blok), dan reaksi otomatis Air + Lava menjadi Obsidian/Cobblestone.'
        ]
      },
      {
        category: '2. Sistem Enchantment & Status Effects (Jamu/Potion)',
        items: [
          'Menambahkan 8 Enchantment (Sharpness, Efficiency, Unbreaking, Fortune, Fire Aspect, Silk Touch, Protection, Feather Falling) serta 7 Status Effect aktif (Speed, Strength, Regeneration, Night Vision, Fire Resistance, Water Breathing, Haste).'
        ]
      },
      {
        category: '3. Konsol Perintah Slash (/) & Behavior Pack Modding JSON',
        items: [
          'Menghadirkan CommandConsoleSystem & CommandConsoleOverlay (tekan / di game) untuk /tp, /time set, /weather, /gamemode, /give, /effect, /fill, /seed, dan /locate.',
          'Menambahkan BehaviorPackManager agar komunitas dapat memuat pack JSON kustom untuk resep crafting, loot multiplier, dan gamerule (keepInventory, mobGriefing, daylightCycle).'
        ]
      }
    ]
  },
  {
    version: '6.0.0',
    date: '2026-11-21',
    title: 'Era Keemasan Nusantara: Suara Sang Pujangga (Gemini AI), Subak 2.0 & Studio Batik 16×16, Gua Karst Maros, Multi-Crew Phinisi & Gelanggang Duel, Caustics/God Rays, Gamepad Rumble & Blueprint UGC',
    type: 'major',
    changes: [
      {
        category: '1. Integrasi Penuh Google Gemini API (Suara Sang Pujangga)',
        items: [
          'Menambahkan endpoint server-side /api/ai/npc-dialogue, /api/ai/decipher-prasasti, dan /api/ai/compose-kidung menggunakan @google/genai (Gemini 2.5 Flash) lengkap dengan fallback Pustaka Adat offline.',
          'Menghadirkan kolom tanya-jawab bebas langsung di DialogueModal NPC serta Dekripsi Prasasti Kuno & Gubahan Kidung Pujangga di Panel Era Keemasan.'
        ]
      },
      {
        category: '2. Ekologi & Rekayasa Tradisional Nusantara 2.0 (Subak, Batik & Gua Karst)',
        items: [
          'Menambahkan Talang Bambu, Pintu Air Kayu Jati, aliran air terasering automata terbatas, dan Lesung Penumbuk Padi Otomatis 3D beranimasi.',
          'Menghadirkan Studio Batik Tulis & Canting 16×16 interaktif (Parang Rusak, Megamendung, Kawung, Truntum) dengan THREE.CanvasTexture live yang dapat dikibarkan sebagai Panji Batik 3D di dunia.',
          'Menambahkan Ekspedisi Gua Karst Maros-Pangkep dengan stalaktit Tirta Marta dan lukisan cadas prasejarah bercahaya.'
        ]
      },
      {
        category: '3. Multiplayer Multi-Crew, Gelanggang Duel 1v1 & Voice Spasial 3D',
        items: [
          'Menambahkan protokol WebSocket & sistem Multi-Crew Phinisi/Nanggala (Nahkoda, Penembak Meriam Cetbang Majapahit, Operator Sonar) serta saluran signaling WebRTC untuk Proximity Spatial Voice Chat dengan filter gua & bawah air.',
          'Menghadirkan Gelanggang Tanding Pendekar 1v1 (sistem 3 ronde, gong wasit, taruhan reputasi & slow-mo finishing).'
        ]
      },
      {
        category: '4. Grafis Caustics/God Rays, Fisika Blok Jatuh, Gamepad Rumble & Blueprint UGC',
        items: [
          'Meningkatkan CinematicPostShader dengan efek Underwater Caustics tropis dan Volumetric Sun Rays (God Rays) ringan serta menambahkan VoxelPhysicsSystem untuk gravitasi pasir/kerikil dan serpihan tambang 3D.',
          'Menambahkan dukungan Gamepad Haptic Rumble di InputManager serta Ekspor/Impor Blueprint Arsitektur Komunitas (VVBP1:...) di VernacularHologramSystem.'
        ]
      }
    ]
  },
  {
    version: '5.1.0',
    date: '2026-11-05',
    title: 'Penyempurnaan Stabilitas, Penyatuan Dock Taktis HUD, Fisika Kendaraan Presisi & Ketahanan Save/Load Nusantara',
    type: 'major',
    changes: [
      {
        category: '1. Penyatuan Dock Taktis Bawah & Navigasi Modal Lebih Ringkas',
        items: [
          'Menyatukan Kartu Aksi Pusaka Kontekstual dengan Baris Status Silat, Tenaga Dalam, Khodam, dan Berkah Gamelan/Wayang ke dalam satu Dock Taktis terpadu di atas bar Vitals yang dapat dilipat dengan tombol [B].',
          'Menyempurnakan hirarki penutupan popover HUD dengan tombol [Escape] serta memastikan seluruh angka metrik dinamis menggunakan format tabular-nums bebas lompatan tata letak.'
        ]
      },
      {
        category: '2. Validasi Save/Load Menyeluruh untuk Sistem Nusantara & RPG',
        items: [
          'Menambahkan serialisasi dan rekonstruksi otomatis 3D pada SaveManager & PersistenceSystem untuk Kincir Air Subak, Panggung Wayang Kulit, Pendopo Gamelan, Lokomotif Uap Aether, Mesin Bor Tambang, Khodam Pendamping, serta Busana Jubah Batik.',
          'Memastikan status Kuda-Kuda Silat, Tenaga Dalam, Ajian Sakti, serta Character Progression tersimpan utuh lintas sesi di IndexedDB dan LocalStorage.'
        ]
      },
      {
        category: '3. Peningkatan Fisika Kendaraan Bahari, Kapal Selam, Kereta Uap & Garuda',
        items: [
          'Menerapkan redaman eksponensial independen frame-rate (THREE.MathUtils.damp) pada kemudi Kapal Phinisi, Perahu Cadik, Kapal Selam Nanggala Kencana, dan terbang Garuda Kencana.',
          'Menambahkan proteksi batas dasar laut (seabed floor clamping) pada Kapal Selam serta batas aman tukikan daratan pada terbang Garuda/Layang Naga.'
        ]
      },
      {
        category: '4. Polesan Visual Anti Z-Fighting, Pencahayaan Cuaca Ekstrem & Audio Gamelan',
        items: [
          'Mengaktifkan polygonOffset pada seluruh cincin aura Silat, gelombang kejut Ajian, sonar kapal, dan marka serangan Boss di lantai agar bebas kedipan Z-fighting.',
          'Menyelaraskan eksposur adaptif dan musik Gamelan prosedural secara otomatis saat cuaca Erupsi Merapi maupun Badai Petir Khatulistiwa berlangsung.'
        ]
      }
    ]
  },
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
