# Rencana Implementasi: VoxelVerse v5.0.0 — Fase 4: Kecerdasan AI Warga Desa, Rutinitas Pendopo & Ronda Malam

## 1. Gambaran Umum & Tujuan Fase 4
Fase 4 berfokus pada **penyempurnaan kecerdasan AI warga desa (NPC), dinamika kehidupan sosial permukiman Nusantara, dan alur quest terpadu**:
- **Rutinitas Waktu-Hari Nyata (Living Village Schedule)**: Warga tidak lagi berdiri statis di satu tempat, melainkan menjalani rutinitas harian yang hidup (Pagi: bekerja di sawah/bengkel/dermaga; Sore: berkumpul santai di Pendopo Gamelan & Panggung Wayang; Malam: penjaga desa berpatroli dengan obor ronda malam sementara warga beristirahat).
- **Dialog Kontekstual & Morale Desa**: Percakapan warga menyesuaikan waktu dan kondisi desa. Kehadiran fasilitas kebudayaan (Gamelan, Wayang, Kincir Subak) meningkatkan *Morale* dan kemakmuran desa secara bertahap.
- **Validasi Rangkaian Quest Utama ("Sumpah Harmoni Nusantara")**: Memastikan setiap tahapan eksplorasi, penempaan pusaka, panen Subak, dan pertempuran boss memberikan hadiah XP, gelar pendekar, dan reputasi desa secara mulus.

---

## 2. Rincian Modifikasi Teknis

### A. Penyempurnaan Rutinitas AI Warga (`NPCScheduleManager.ts` & `SettlementManager.ts`)
1. **Jadwal 4 Fase Harian Terpadu**:
   - **Pagi (06:00 – 11:30)**: Petani menuju sawah Subak, Nelayan menuju dermaga perahu, Empu memanaskan perapian paron, Penjaga berganti giliran jaga gerbang.
   - **Siang (11:30 – 16:00)**: Aktivitas pasar dan barter perdagangan aktif di alun-alun desa, sesepuh memantau lumbung padi.
   - **Sore / Senja (16:00 – 20:30)**: Warga berkumpul di **Pendopo Gamelan 3D** atau menonton **Panggung Wayang Kulit**, menyalakan lampu minyak, dan menambah bonus kemakmuran desa (+15% Morale).
   - **Malam Larut & Siaga (20:30 – 05:30)**:
     - Warga sipil beristirahat di rumah panggung kayu.
     - **Prajurit / Guard** menyalakan obor ronda dan berpatroli mengelilingi batas desa serta gerbang utama, siap siaga menghadapi ancaman bayangan malam (*Shadow Stalkers*).
2. **Koleksi Dialog Kontekstual 4 Waktu**:
   - Menghubungkan pemilihan dialog NPC secara langsung dengan waktu matahari (`sky.timeOfDay`) dan level reputasi pemain di desa tersebut.

### B. Integrasi Pergerakan & Perilaku AI NPC 3D (`EntityManager.ts`)
1. **Patroli Penjaga & Obor Ronda**:
   - Penjaga desa (`guard`) saat malam hari secara dinamis memegang model obor bercahaya dan bergerak menyusuri titik-titik pos ronda (*waypoint patrol*) di sekeliling permukiman.
2. **Pergerakan Menuju Pendopo Saat Senja**:
   - Ketika waktu memasuki senja (`timeOfDay >= 16.5`), NPC dengan peran *farmer*, *craftsperson*, dan *elder* berpindah posisi mendekati area pusat Pendopo/Wayang untuk berbincang santai.

### C. Alur Quest "Sumpah Harmoni Nusantara" (`QuestManager.ts`)
1. **Verifikasi & Integrasi Event Bus**:
   - Menghubungkan seluruh penanda event (`BOSS_DEFEATED`, `BLOCK_MINED`, `ITEM_CRAFTED`, `WAYANG_LAKON_STARTED`, `GAMELAN_PLAYED`) agar langsung memperbarui objektif quest utama tanpa hambatan.
2. **Hadiah Gelar & Keseimbangan Ekonomi**:
   - Memberikan gelar kehormatan *Pendekar Harmoni Agung*, peningkatan reputasi seluruh nagari/desa Nusantara, dan material langka *Mustika Zamrud Khatulistiwa*.

---

## 3. File yang Dimodifikasi
1. **`/src/engine/settlement/NPCScheduleManager.ts`**
   - Menambahkan logika pemilihan target lokasi dinamis (`getScheduleForTimeOfDay`), dialog kontekstual waktu, dan perhitungan bonus kemakmuran berkumpul di Pendopo.
2. **`/src/engine/entities/EntityManager.ts`**
   - Menambahkan rutinitas patroli obor malam untuk penjaga dan penyesuaian posisi kumpul warga desa saat senja/malam.
3. **`/src/engine/progression/QuestManager.ts`**
   - Menguji dan menyempurnakan alur pelacakan objektif quest "Sumpah Harmoni Nusantara" dan dialog penyerahan quest.
4. **`/src/engine/settlement/SettlementManager.ts`**
   - Menghubungkan status kemakmuran harian desa dengan partisipasi warga dalam rutinitas ronda dan kebudayaan.

---

## 4. Rencana Verifikasi
1. **Verifikasi Kompilasi**: Menjalankan `compile_applet` untuk memastikan seluruh tipe data TypeScript, sistem entitas, dan quest terkompilasi bersih.
2. **Verifikasi AI & Dialog Waktu**: Memastikan dialog warga berubah secara tepat saat pagi, siang, senja (kumpul pendopo), dan malam hari.
3. **Verifikasi Ronda Penjaga**: Memastikan prajurit desa berpatroli dengan obor saat malam hari dan menjaga gerbang permukiman.
4. **Verifikasi Quest Progression**: Memastikan penyelesaian objektif quest memberikan notifikasi yang jelas dan hadiah diterima dengan baik di inventori pemain.
