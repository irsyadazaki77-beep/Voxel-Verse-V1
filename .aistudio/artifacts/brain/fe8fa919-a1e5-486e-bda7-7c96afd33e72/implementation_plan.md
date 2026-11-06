# VoxelVerse — Rencana Perbaikan Stabilitas, Penyatuan HUD & Penyempurnaan Sistem Terpadu

Rencana ini memfokuskan pemolesan menyeluruh, perbaikan bug, dan stabilitas 60 FPS pada seluruh sistem VoxelVerse yang telah ada tanpa menambah kompleksitas yang membebani layar. Pembaruan mencakup penyatuan HUD yang bersih dan bebas halangan visual, kehalusan fisika kendaraan (Kapal Phinisi, Kapal Selam, Kereta Uap, dan Garuda), ketajaman kombat Pencak Silat serta AI Boss, ekosistem rutinitas warga desa, keselarasan cuaca-audio Gamelan, serta ketahanan penuh penyimpanan (*save/load*) seluruh status dunia Nusantara.

### User Review & Critical Decisions

> [!IMPORTANT]
> Seluruh keputusan prioritas di bawah ini telah dikonfirmasi berdasarkan preferensi Anda pada tahap klarifikasi awal dan menjadi acuan utama eksekusi.

- **Confirmed Decision 1 — Cakupan 4 Pilar Utama Terpadu**: Menyempurnakan keempat pilar secara harmonis: (1) UI/HUD yang lebih bersih dan responsif, (2) Performa 60 FPS stabil dan optimasi render 3D, (3) Pendalaman kombat Silat, AI Boss, dan animasi senjata, serta (4) Ekosistem desa hidup, jadwal AI NPC, dan kelancaran quest Nusantara.
- **Confirmed Decision 2 — Fokus Stabilitas, Polesan & Perbaikan Bug**: Mengutamakan penyempurnaan fitur yang sudah ada, penghapusan bug/friksi interaksi, dan peningkatan koherensi antarsistem dibandingkan menambah fitur baru yang terpisah.
- **Confirmed Decision 3 — Empat Detail Sistem Spesifik**:
  1. Penyatuan HUD bawah/atas dan navigasi modal yang lebih ringkas tanpa menghalangi tengah kanvas 3D.
  2. Peningkatan kehalusan fisika dan kamera pada kendaraan bahari (Phinisi & Kapal Selam Nanggala), Lokomotif Uap Aether, serta terbang Garuda/Layang Naga.
  3. Penyempurnaan transisi visual cuaca ekstrem, pencahayaan atmosferik, dan sinkronisasi audio Gamelan adaptif.
  4. Validasi *save/load* menyeluruh agar status Silat, Subak, Wayang, Khodam, Gamelan, Jubah Batik, dan posisi struktur tersimpan serta dipulihkan 100% utuh.

---

### 1. Overview & Core Concept

- **What It Does**: Menghadirkan pengalaman dunia terbuka voxel bertema Nusantara yang solid, bebas *stutter*, memiliki tata letak antarmuka (HUD) yang terorganisir rapi dalam satu dok terpadu, pertarungan jarak dekat dan boss yang responsif, desa yang hidup mengikuti waktu matahari, serta sistem penyimpanan dunia yang tahan terhadap *reload* maupun pergantian sesi.
- **Target Audience / Persona**: Pemain petualang dan pembangun dunia 3D yang menginginkan kontrol presisi, tampilan visual sinematik tanpa tumpukan panel UI yang menutupi objek 3D, dan kepastian bahwa setiap progres bangunan, pusaka, maupun berkah budaya tersimpan dengan aman.
- **Key Value**: Menghilangkan tumpang-tindih kartu bantuan di atas hotbar, menghilangkan *jank* kamera saat berkendara atau bertarung, serta menutup celah hilangnya state sistem Nusantara saat permainan disimpan dan dimuat ulang.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Eksplorasi & HUD Terpadu (Zero Viewport Occlusion)**: Saat pemain mengganti slot hotbar atau mengaktifkan jurus Silat/Khodam, informasi kontekstual ditampilkan dalam satu baris status ringkas di atas hotbar tanpa menumpuk beberapa kartu terpisah. Tombol `H` (*Zen Mode*) dapat menyembunyikan seluruh panel pinggir secara mulus untuk menikmati pemandangan 3D penuh.
  2. **Kemudi Kendaraan Darat, Laut & Udara**: Saat menaiki Kapal Phinisi, menyelam dengan Kapal Selam Nanggala, mengendarai Lokomotif Uap Aether, atau menunggangi Garuda Kencana, kamera menggunakan *exponential damping* yang halus dengan indikator kecepatan, kedalaman sonar, atau ketinggian yang terintegrasi rapi di dok bawah.
  3. **Pertarungan Silat & Boss Multi-Fase**: Pergantian Kuda-Kuda (`V`), pelepasan Ajian Sakti (`G`), dan kombo Keris 3-tahap memberikan umpan balik visual dan audio seketika. Telegraf serangan Boss (Naga Baruklinting, Buto Ijo, Raja Kala Samudra) terlihat jelas di atas permukaan tanah tanpa *Z-fighting*.
  4. **Interaksi Desa Hidup & Siklus Penyimpanan**: Warga desa bergerak secara mulus menuju sawah/dermaga di pagi hari, berkumpul di Pendopo Gamelan/Wayang saat senja, dan penjaga melakukan ronda obor di malam hari. Saat pemain menyimpan dunia (`F5` atau *Auto-Save*) lalu memuatnya kembali, seluruh status Kuda-Kuda, Tenaga Dalam, Khodam aktif, Jubah Batik, dan bangunan kincir/panggung langsung pulih.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: **Matte Obsidian & Royal Majapahit Gold** — antarmuka taktis yang hening dan berwibawa untuk membingkai kekayaan warna dunia 3D Nusantara tanpa mencuri perhatian dari kanvas WebGL.
  - *Color Palette & Mood*:
    - `--background` / Permukaan HUD Utama: Matte Obsidian pekat (`rgba(9, 11, 17, 0.92)`) tanpa *backdrop-blur* berat di atas kanvas aktif demi menjaga 60 FPS.
    - `--primary` / Aksen Pusaka & Fokus: Emas Kencana (`#F59E0B`) untuk bingkai aktif, indikator Ajian siap, dan fase Boss.
    - `--accent` / Status Alam & Energi: Zamrud Khatulistiwa (`#10B981`) untuk kemakmuran Subak/kesehatan, serta Biru Samudra (`#38BDF8`) untuk stamina, oksigen, dan resonansi Aether.
  - *Typography & Hierarchy*:
    - *Display & Judul Wilayah/Boss*: `Cinzel` / `Plus Jakarta Sans` SemiBold-Bold dengan *letter-spacing* terukur dan `text-wrap: balance`.
    - *Body & Dialog Warga*: `Plus Jakarta Sans` Regular-Medium untuk keterbacaan tinggi pada jendela dialog dan jurnal.
    - *Data, Koordinat, Waktu & Cooldown*: Monospace dengan `tabular-nums` (`JetBrains Mono`) agar angka FPS, koordinat, timer berkah, dan persentase Tenaga Dalam tidak bergeser saat berubah tiap detik.
  - *Component Styling & Layout*:
    - Mengikuti prinsip **Zero-Pill Metadata Discipline** pada informasi statis: wilayah, bioma, jam dunia, koordinat, dan FPS ditampilkan dalam satu baris teks bersih dengan pemisah tipografis (`·`), bukan kumpulan kotak kapsul berwarna-warni.
    - Menghapus titik-titik berdenyut (*pulsing dots* dekoratif) pada label statis agar mata pemain tetap fokus pada aksi di dunia 3D.
    - Kontainer modal (Inventaris, Crafting, Paron, Jurnal, Mahakarya) memiliki hierarki satu tingkat (*single-elevation depth*) dengan *hairline border* `1px solid rgba(255,255,255,0.10)` dan transisi keluar/masuk yang seragam (`Escape` selalu menutup modal aktif dan mengembalikan fokus ke permainan).
  - *Interactive Feedback & Motion*:
    - Semua umpan balik tombol dan pergantian tab merespons dalam $\le 150\text{ms}$ hanya dengan properti kompositor (`transform`, `opacity`).
    - Indikator *Auto-Save* tampil tenang di pojok kanan atas tanpa menginterupsi bidikan atau pertarungan.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Konsolidasi Kartu Kontekstual Pusaka & Baris Status Silat di Atas Hotbar**
  - *Chosen Approach*: Menggabungkan petunjuk item aktif (*Contextual Pusaka Action Card*) dan baris status Kuda-Kuda/Tenaga Dalam/Berkah ke dalam satu pita kontrol terpadu yang ramping dan dapat diciutkan (`B` atau `H`).
  - *Why*: Sebelumnya, memegang item khusus sambil mengaktifkan Kuda-Kuda dan berkah memunculkan beberapa baris tumpukan elemen di atas hotbar yang menutupi area pandang tengah-bawah layar.
  - *Alternatives Considered*: Memindahkan status ke panel samping kiri/kanan — ditolak karena melanggar prinsip *Zero Viewport Occlusion* pada aplikasi 3D.

- **Decision 2: Penyeragaman Interpolasi Fisika & Kamera Kendaraan dengan Frame-Rate Independent Damping**
  - *Chosen Approach*: Menggunakan fungsi redaman eksponensial (`THREE.MathUtils.damp`) berbasis `deltaTime` pada kemudi Kapal Phinisi, Kapal Selam Nanggala, Lokomotif Uap Aether, dan terbang Garuda Kencana, disertai pemeriksaan batas tumbukan (*terrain/water clearance*) otomatis.
  - *Why*: Menjamin pergerakan dan rotasi kamera tetap sehalus sutra baik pada 30 FPS maupun 60+ FPS, serta mencegah kendaraan menembus dasar daratan atau tersangkut di tebing.
  - *Alternatives Considered*: Menggunakan *fixed step* kaku tanpa interpolasi kamera — menghasilkan getaran (*camera jitter*) saat kamera berputar cepat.

- **Decision 3: Serialisasi Penuh State Sistem Nusantara ke dalam Skema Penyimpanan Dunia**
  - *Chosen Approach*: Memperluas snapshot penyimpanan dunia agar menyertakan state Pencak Silat (Kuda-Kuda aktif, Ajian terpilih, Tenaga Dalam), durasi berkah Wayang & Gamelan, Khodam pendamping aktif, pilihan Jubah Batik, serta koordinat rakitan 3D (Kincir Subak, Panggung Wayang, Studio Gamelan, Mesin Bor Tambang) agar direkonstruksi otomatis saat dunia dimuat.
  - *Why*: Menjamin kontinuitas sesi bermain sehingga pemain tidak perlu membangun ulang atau mengaktifkan ulang kustomisasi karakter setelah me-*refresh* halaman.
  - *Alternatives Considered*: Menyimpan di memori sesi sementara — ditolak karena hilang saat tab ditutup.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        REACT UI & UNIFIED HUD LAYER                         │
│                                                                             │
│  ┌──────────────────────────┐   ┌────────────────────────────────────────┐  │
│  │ Top Telemetry & Quest    │   │ Unified Modal Manager (Esc / QuickKey) │  │
│  │ (Unboxed · Tabular Nums) │   │ Inventory│Craft│Anvil│Journal│Mahakarya│  │
│  └────────────┬─────────────┘   └───────────────────┬────────────────────┘  │
│               │                                     │                       │
│  ┌────────────▼─────────────────────────────────────▼────────────────────┐  │
│  │               BOTTOM COLLAPSIBLE CONTROL & HOTBAR DOCK                │  │
│  │  [ Contextual Pusaka & Silat Strip ] ──► [ Vitals ] ──► [ Hotbar 1-9 ]│  │
│  └────────────────────────────────────┬──────────────────────────────────┘  │
└───────────────────────────────────────┼─────────────────────────────────────┘
                                        │ Shallow-Diff Telemetry & Action Bus
┌───────────────────────────────────────▼─────────────────────────────────────┐
│                         CORE 3D ENGINE & SYSTEMS LOOP                       │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌───────────────────┐  │
│  │ Combat & Silat Engine│  │ Vehicle & Flight Rig │  │ Living Settlement │  │
│  │ • 3-Step Keris Combo │  │ • Phinisi & Submarine│  │ • 4-Phase Schedule│  │
│  │ • Stance & Ajian VFX │  │ • Steam Locomotive   │  │ • Pendopo Gather  │  │
│  │ • Boss Telegraph & AI│  │ • Garuda & Kite Glide│  │ • Night Torch Grd │  │
│  └──────────┬───────────┘  └──────────┬───────────┘  └─────────┬─────────┘  │
│             │                         │                        │            │
│  ┌──────────▼─────────────────────────▼────────────────────────▼─────────┐  │
│  │         ENVIRONMENT, LIGHTING, AUDIO & 60 FPS RENDER PIPELINE         │  │
│  │  • Sky/Weather Smooth Lerp  • Adaptive Gamelan  • Zero-GC Culling     │  │
│  └────────────────────────────────────┬──────────────────────────────────┘  │
└───────────────────────────────────────┼─────────────────────────────────────┘
                                        │ Atomic Snapshot & Schema Validation
┌───────────────────────────────────────▼─────────────────────────────────────┐
│                    MULTI-LAYER PERSISTENCE & SAVE MANAGER                   │
│  • Player + Voxel Delta + Nusantara State (Silat, Khodam, Subak, Wardrobe)  │
│  • IndexedDB Primary/Backups ◄──► LocalStorage Fallback ◄──► Crash Recovery │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - **Extended Nusantara Save State**: Objek serialisasi baru di dalam data penyimpanan dunia yang menyimpan:
    - `silatState`: `{ activeStance, activeAjian, tenagaDalam, activeLakon, lakonTimerRemaining, subakWheelPositions, wayangStagePositions }`
    - `mahakaryaState`: `{ activeKhodamId, activeWardrobeId, gamelanScale, gamelanBlessingTimer, gamelanStagePos, quarryPositions, oceanCandiPos }`
  - **Telemetry Store State**: Struktur data terpusat dengan *shallow-diffing* yang menyuplai metrik ke HUD tanpa memicu *re-render* React jika nilai yang ditampilkan tidak berubah.

- **Interactive Component & State Mapping**:
  - **Penyatuan Dock Bawah & Navigasi Modal**:
    - Menekan `1`–`9` atau *scroll* memilih slot hotbar dan memperbarui pita aksi kontekstual secara instan tanpa menggeser tinggi elemen vital.
    - Menekan `B` melipat/membuka petunjuk aksi pusaka; menekan `H` mengaktifkan *Zen Mode* yang menyembunyikan seluruh overlay sekunder.
    - Membuka satu modal otomatis menutup modal lain yang sedang terbuka dan melepaskan *Pointer Lock* dengan bersih; menutup modal mengembalikan fokus kanvas.
  - **Fisika Kendaraan & Kamera Damping**:
    - Saat pemain mengemudikan Kapal Phinisi, Kapal Selam Nanggala, Lokomotif Uap Aether, atau Garuda Kencana, input arah (`WASD`, `Space`, `Shift`) diinterpolasi dengan `THREE.MathUtils.damp` terhadap kecepatan dan sudut kemiringan (*pitch/roll*), serta mencegah posisi Y menembus batas aman medan voxel.
  - **Kombat Silat, Boss Telegraph & AI Warga**:
    - Cincin telegraf serangan Boss dan aura Kuda-Kuda menggunakan `polygonOffset` dan *offset* vertikal `+0.03` pada sumbu Y agar tidak pernah berkedip (*Z-fighting*) di atas balok lantai.
    - Warga desa mengevaluasi perubahan jadwal pada detak terjadwal, bergerak mulus menuju titik kumpul Pendopo saat senja, dan prajurit menyalakan lampu obor saat patroli malam.
  - **Siklus Save / Load & Pemulihan Otomatis**:
    - Saat permainan disimpan (`F5`, *dirty debounce*, atau *periodic autosave*), seluruh state sistem Nusantara dikemas ke dalam snapshot ber-checksum.
    - Saat dunia dimuat kembali, sistem merekonstruksi mesh 3D Kincir Air Subak, Panggung Wayang, Pendopo Gamelan, Mesin Bor Tambang, Jubah Batik pemain, dan Khodam pendamping pada koordinat tersimpan.
