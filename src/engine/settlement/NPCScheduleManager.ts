// Nusantara Living Settlements 1.0 — Lightweight NPC Scheduling Engine
// 9 Authentic Roles with Time-of-Day Routines, Landmark Targets, and Dynamic Cultural Behaviors

import { SettlementManager } from './SettlementManager';

export type NPCRoleType =
  | 'farmer'
  | 'fisher'
  | 'craftsperson'
  | 'merchant'
  | 'guard'
  | 'elder'
  | 'engineer'
  | 'hunter'
  | 'boat_trader';

export type SchedulePhase = 'morning' | 'day' | 'evening' | 'night';

export interface ScheduleActivity {
  phase: SchedulePhase;
  activityName: string;
  activityDescription: string;
  targetLandmark: 'farm' | 'docks' | 'workshop' | 'market' | 'gate' | 'pendopo' | 'shrine' | 'engineering' | 'house';
  dialoguePool: string[];
  animationState: 'work' | 'trade' | 'gather' | 'rest' | 'patrol';
}

export interface NPCScheduleDef {
  role: NPCRoleType;
  titleIndonesian: string;
  clothingStyle: string;
  headwear: string;
  heldTool: string;
  schedules: Record<SchedulePhase, ScheduleActivity>;
}

export const NPC_ROLE_SCHEDULES: Record<NPCRoleType, NPCScheduleDef> = {
  // 1. Farmer (Petani)
  farmer: {
    role: 'farmer',
    titleIndonesian: 'Petani Sawah & Ladang',
    clothingStyle: 'Celana kombor & rompi lurik cokelat',
    headwear: 'Topi caping anyam bambu',
    heldTool: 'Cangkul tempa / Sabit padi',
    schedules: {
      morning: {
        phase: 'morning',
        activityName: 'Mengolah Pematang & Menanam',
        activityDescription: 'Memeriksa aliran air sawah dan menyemai benih tanaman unggul.',
        targetLandmark: 'farm',
        dialoguePool: [
          'Embun pagi masih segar di pucuk padi. Hari yang baik untuk menyiangi pematang.',
          'Tanah vulkanik ini berkah leluhur, tanaman padi tumbuh subur tanpa keluh kesah.',
          'Jika butuh bibit beras wangi atau benih jagung, lumbung kami selalu siap bertukar.',
        ],
        animationState: 'work',
      },
      day: {
        phase: 'day',
        activityName: 'Menyiangi Gulma & Merawat Tanaman',
        activityDescription: 'Membersihkan gulma dan memeriksa kesuburan tanah terasering.',
        targetLandmark: 'farm',
        dialoguePool: [
          'Matahari sedang terik, padi menyerap sinar emas untuk mematangkan bulirnya.',
          'Burung pipit mulai datang, untung ada kincir angin dan orang-orangan sawah.',
          'Hasil panen musim ini melimpah! Apakah kamu membawa pupuk atau damar dari rimba?',
        ],
        animationState: 'work',
      },
      evening: {
        phase: 'evening',
        activityName: 'Menjemur Gabah & Berkumpul di Lumbung',
        activityDescription: 'Mengumpulkan hasil panen ke lumbung padi dan berbincang santai.',
        targetLandmark: 'pendopo',
        dialoguePool: [
          'Angin sore bertiup sejuk. Gabah kering siap ditumbuk di lesung desa.',
          'Mari beristirahat sejenak di pendopo, melepas lelah setelah seharian mencangkul.',
          'Syukuran panen berikutnya akan sangat meriah jika saluran irigasi tetap lancar.',
        ],
        animationState: 'gather',
      },
      night: {
        phase: 'night',
        activityName: 'Istirahat di Rumah Panggung',
        activityDescription: 'Tidur nyenyak memulihkan tenaga di rumah hunian kayu.',
        targetLandmark: 'house',
        dialoguePool: [
          'Malam telah larut, suara jangkrik mulai terdengar. Selamat malam, pengembara.',
          'Pintu lumbung sudah terkunci rapat. Besok subuh kita mulai bekerja lagi.',
        ],
        animationState: 'rest',
      },
    },
  },

  // 2. Fisher (Nelayan)
  fisher: {
    role: 'fisher',
    titleIndonesian: 'Nelayan Pesisir & Sungai',
    clothingStyle: 'Baju lengan pendek kain katun & celana gulung',
    headwear: 'Ikat kepala kain mori biru laut',
    heldTool: 'Jala lempar / Tongkat pancing bambu',
    schedules: {
      morning: {
        phase: 'morning',
        activityName: 'Menebar Jala di Dermaga',
        activityDescription: 'Menebar jala dan memeriksa perangkap bubu ikan di tepian air.',
        targetLandmark: 'docks',
        dialoguePool: [
          'Air sungai sedang tenang, ikan baung dan gabus sedang aktif mencari makan.',
          'Pasang surut air laut pagi ini sangat ideal untuk menebar jala lempar.',
          'Saya punya ikan segar dan garam kristal jika kamu ingin memasak perbekalan.',
        ],
        animationState: 'work',
      },
      day: {
        phase: 'day',
        activityName: 'Memilah & Mengeringkan Ikan',
        activityDescription: 'Mengasinkan hasil tangkapan di atas para-para penjemuran bambu.',
        targetLandmark: 'docks',
        dialoguePool: [
          'Ikan cakalang dan baung ini diasap perlahan agar awet untuk ekspedisi jauh.',
          'Kadang jala kami tersangkut kerang mutiara berkilau dari palung laut.',
          'Perahu nelayan kami dibuat dari kayu ulin agar tahan air garam bertahun-tahun.',
        ],
        animationState: 'trade',
      },
      evening: {
        phase: 'evening',
        activityName: 'Merajut Jala & Mengikat Perahu',
        activityDescription: 'Memperbaiki anyaman jala yang robek dan menambatkan perahu.',
        targetLandmark: 'pendopo',
        dialoguePool: [
          'Matahari terbenam di ufuk barat, air memantulkan kilau jingga keemasan.',
          'Merajut jala butuh kesabaran, sama seperti menanti ikan besar menyambar umpan.',
        ],
        animationState: 'gather',
      },
      night: {
        phase: 'night',
        activityName: 'Istirahat & Memeriksa Lentera Dermaga',
        activityDescription: 'Memastikan lentera penuntun perahu menyala sebelum beristirahat.',
        targetLandmark: 'house',
        dialoguePool: [
          'Ombak malam terdengar tenang. Besok saat fajar kita melaut kembali.',
        ],
        animationState: 'rest',
      },
    },
  },

  // 3. Craftsperson (Pengrajin / Tukang Ukir / Pande Batu)
  craftsperson: {
    role: 'craftsperson',
    titleIndonesian: 'Pengrajin Seni & Pahat Kayu',
    clothingStyle: 'Celemek kulit samak & baju ikat tenun',
    headwear: 'Ikat kepala udeng batik khas perajin',
    heldTool: 'Pahat baja & Palu kayu jati',
    schedules: {
      morning: {
        phase: 'morning',
        activityName: 'Menyiapkan Kayu & Batu Cadas',
        activityDescription: 'Memilih balok kayu jati, ulin, atau batu paras berkualitas tinggi.',
        targetLandmark: 'workshop',
        dialoguePool: [
          'Setiap serat kayu jati memiliki alur alami yang membimbing mata pahat.',
          'Pahat baja yang tajam dan ketenangan hati adalah kunci ukiran yang hidup.',
          'Saya menerima pesanan balok ukir Pa\'ssura, relief candi, dan gerabah pembakaran.',
        ],
        animationState: 'work',
      },
      day: {
        phase: 'day',
        activityName: 'Memahat Ornamen & Membakar Gerabah',
        activityDescription: 'Menempa relief tradisi, perhiasan perak, dan kendi tanah liat.',
        targetLandmark: 'workshop',
        dialoguePool: [
          'Tungku gerabah sudah mencapai suhu ideal. Warna merah terakota akan merekah sempurna.',
          'Perak filigree Koto Gadang ini ditenun dari kawat perak sehalus rambut.',
          'Kain songket dan ukiran ini kami buat dengan motif ragam hias warisan leluhur.',
        ],
        animationState: 'work',
      },
      evening: {
        phase: 'evening',
        activityName: 'Memoles Hasil Karya & Memamerkan di Bale',
        activityDescription: 'Memberi lapisan minyak damar alami pada kayu agar mengilap awet.',
        targetLandmark: 'pendopo',
        dialoguePool: [
          'Minyak damar pohon rimba membuat ukiran kayu tahan cuaca dan beraroma harum.',
          'Lihatlah kendi ini, air yang disimpan di dalamnya akan tetap dingin sepanjang hari.',
        ],
        animationState: 'trade',
      },
      night: {
        phase: 'night',
        activityName: 'Menyimpan Perkakas & Beristirahat',
        activityDescription: 'Menyimpan pahat dan batu asah di lemari bengkel kerja.',
        targetLandmark: 'house',
        dialoguePool: [
          'Malam hari saatnya mengistirahatkan jemari agar besok bisa memahat dengan presisi.',
        ],
        animationState: 'rest',
      },
    },
  },

  // 4. Merchant (Pedagang Pasar Desa)
  merchant: {
    role: 'merchant',
    titleIndonesian: 'Saudagar Pasar Tradisional',
    clothingStyle: 'Kain batik saudagar & selempang songket sutra',
    headwear: 'Blangkon atau songkok sulam benang emas',
    heldTool: 'Timbangan kuningan & Kantong koin rajut',
    schedules: {
      morning: {
        phase: 'morning',
        activityName: 'Membuka Kios & Menata Komoditas',
        activityDescription: 'Menata rempah, beras, kain tenun, dan barang kerajinan di los pasar.',
        targetLandmark: 'market',
        dialoguePool: [
          'Selamat pagi! Kios pasar baru dibuka, rempah dan komoditas masih lengkap.',
          'Harga barter di pasar kami jujur dan mengikuti kesepakatan adat.',
          'Membawa komoditas langka dari kepulauan seberang? Saya siap membelinya dengan harga pantas.',
        ],
        animationState: 'trade',
      },
      day: {
        phase: 'day',
        activityName: 'Aktivitas Barter & Perdagangan Antar-Wilayah',
        activityDescription: 'Melayani pertukaran barang kebutuhan warga dan pengembara.',
        targetLandmark: 'market',
        dialoguePool: [
          'Pasar sedang ramai! Pedagang dari lembah seberang baru saja tiba membawa cengkeh.',
          'Reputasimu di desa ini sangat baik. Nikmati potongan harga khusus warga kehormatan!',
          'Kopi arabika pegunungan dan garam laut kristal adalah barang paling dicari hari ini.',
        ],
        animationState: 'trade',
      },
      evening: {
        phase: 'evening',
        activityName: 'Menghitung Neraca Perdagangan di Bale',
        activityDescription: 'Mencatat sisa stok lumbung dan mempersiapkan pesanan esok hari.',
        targetLandmark: 'pendopo',
        dialoguePool: [
          'Perdagangan hari ini sangat berkah. Warga desa mendapatkan pasokan yang cukup.',
          'Pasar malam akan segera dimulai, lampu-lampu minyak mulai dinyalakan.',
        ],
        animationState: 'gather',
      },
      night: {
        phase: 'night',
        activityName: 'Menutup Peti Dagangan & Beristirahat',
        activityDescription: 'Mengunci peti perniagaan di rumah penyimpanan aman.',
        targetLandmark: 'house',
        dialoguePool: [
          'Pasar sudah tutup untuk malam ini. Sampai jumpa besok pagi saat kentongan berbunyi.',
        ],
        animationState: 'rest',
      },
    },
  },

  // 5. Guard (Penjaga Gerbang & Wilayah Desa)
  guard: {
    role: 'guard',
    titleIndonesian: 'Prajurit Penjaga Benteng Adat',
    clothingStyle: 'Baju zirah kulit bersulam tembaga & celana tempur',
    headwear: 'Ikat kepala prajurit bertanduk / Helm tembaga',
    heldTool: 'Tombak berpamor & Perisai rotan anyam',
    schedules: {
      morning: {
        phase: 'morning',
        activityName: 'Patroli Batas Luar Permukiman',
        activityDescription: 'Memeriksa jejak binatang buas dan memastikan pagar batas aman.',
        targetLandmark: 'gate',
        dialoguePool: [
          'Semua pos gerbang aman. Jalur setapak menuju hutan terpantau tenang.',
          'Tetap waspada saat menjelajahi gua-gua karst dan lereng gunung berkabut.',
          'Jika melihat pergerakan shadow stalker di malam hari, segera beri tahu kami.',
        ],
        animationState: 'patrol',
      },
      day: {
        phase: 'day',
        activityName: 'Berjaga di Gapura Candi Bentar',
        activityDescription: 'Memeriksa kedatangan kafilah niaga dan pengembara baru.',
        targetLandmark: 'gate',
        dialoguePool: [
          'Selamat datang di pemukiman. Hormati aturan adat dan jaga perdamaian desa.',
          'Tombak berpamor ini ditempa empu untuk menembus kulit tebal pemangsa rimba.',
          'Desa kami aman berkat kekompakan warga dan penjagaan di tapal batas.',
        ],
        animationState: 'patrol',
      },
      evening: {
        phase: 'evening',
        activityName: 'Menyalakan Obor & Perapian Batas',
        activityDescription: 'Menyalakan lentera dinding dan api unggun penangkal predator.',
        targetLandmark: 'gate',
        dialoguePool: [
          'Matahari mulai tenggelam. Api unggun dan obor perbatasan telah kami nyalakan.',
          'Pastikan kamu berada di dalam lingkar pemukiman sebelum malam semakin pekat.',
        ],
        animationState: 'work',
      },
      night: {
        phase: 'night',
        activityName: 'Ronda Malam & Pengawasan Menara',
        activityDescription: 'Berjaga di atas menara pandang menjaga ketenangan warga yang tidur.',
        targetLandmark: 'gate',
        dialoguePool: [
          'Ronda malam sedang berlangsung. Tidurlah dengan tenang, kami menjaga batas desa.',
          'Bunyi kentongan dua ketukan menandakan situasi pemukiman aman terkendali.',
        ],
        animationState: 'patrol',
      },
    },
  },

  // 6. Elder (Tetua Adat / Sesepuh Kampung)
  elder: {
    role: 'elder',
    titleIndonesian: 'Tetua Adat & Penjaga Tradisi',
    clothingStyle: 'Jubah tenun pusaka putih gading & selendang emas',
    headwear: 'Destar mahkota kain tenun kehormatan',
    heldTool: 'Tongkat kayu cendana berkepala naga',
    schedules: {
      morning: {
        phase: 'morning',
        activityName: 'Doa Pagi di Sanggar Pamujan / Altar Leluhur',
        activityDescription: 'Mempersembahkan dupa wangi gaharu dan bunga cempaka di altar suci.',
        targetLandmark: 'shrine',
        dialoguePool: [
          'Semoga keseimbangan alam semesta (Tri Hita Karana) senantiasa menaungi kita.',
          'Leluhur mengajarkan bahwa tanah, air, dan manusia adalah satu napas kehidupan.',
          'Tingkatkan reputasimu dengan membantu warga, dan rahasia kuno akan terbuka bagimu.',
        ],
        animationState: 'work',
      },
      day: {
        phase: 'day',
        activityName: 'Musyawarah Adat di Pendopo Utama',
        activityDescription: 'Memberikan nasihat, menyelesaikan sengketa, dan memimpin upacara.',
        targetLandmark: 'pendopo',
        dialoguePool: [
          'Selamat datang, pengembara berbudi. Ceritakan apa yang kamu saksikan di belahan dunia lain.',
          'Desa ini berkembang berkat gotong royong. Saat lumbung penuh, seluruh warga bersukacita.',
          'Bawakan kami material pusaka jika kamu berniat meningkatkan tingkatan (tier) permukiman ini.',
        ],
        animationState: 'gather',
      },
      evening: {
        phase: 'evening',
        activityName: 'Mewariskan Kisah Kuno & Kidung Adat',
        activityDescription: 'Bercerita kepada generasi muda di pelataran balai desa.',
        targetLandmark: 'pendopo',
        dialoguePool: [
          'Dengarkan alunan gamelan dan desir angin senja... itu kidung penjaga gunung api.',
          'Pusaka sejati bukanlah emas, melainkan keselarasan antara budi pekerti dan alam.',
        ],
        animationState: 'gather',
      },
      night: {
        phase: 'night',
        activityName: 'Merenung & Meditasi Malam di Bilik Pusaka',
        activityDescription: 'Bermeditasi menjaga ketenteraman spiritual permukiman.',
        targetLandmark: 'house',
        dialoguePool: [
          'Bintang-bintang di langit memandu arah perjalananmu. Istirahatlah dengan damai.',
        ],
        animationState: 'rest',
      },
    },
  },

  // 7. Engineer (Empu Pengairan / Teknisi Aether)
  engineer: {
    role: 'engineer',
    titleIndonesian: 'Empu Saluran Subak & Mesin Aether',
    clothingStyle: 'Rompi kanvas bertonggak kantong perkakas & sarung tangan kulit',
    headwear: 'Kacamata lensa kristal & ikat kepala kerja',
    heldTool: 'Kunci pas perunggu & Tabung pengukur tekanan aether',
    schedules: {
      morning: {
        phase: 'morning',
        activityName: 'Kalibrasi Pintu Air & Talang Subak',
        activityDescription: 'Mengukur debit air irigasi dan menyesuaikan pembagi aliran kayu.',
        targetLandmark: 'engineering',
        dialoguePool: [
          'Sistem Subak mendistribusikan air secara adil ke tiap petak sawah bertingkat.',
          'Aliran aether di bawah tanah sangat stabil pagi ini, pompa mekanis bekerja prima.',
          'Saya punya skema cetak biru konduit aether dan talang air jika kamu ingin membangun.',
        ],
        animationState: 'work',
      },
      day: {
        phase: 'day',
        activityName: 'Menguji Mesin Tenaga Uap & Resonansi Kristal',
        activityDescription: 'Memperbaiki roda turbin air dan transmisi roda gigi perunggu.',
        targetLandmark: 'engineering',
        dialoguePool: [
          'Teknologi leluhur menggabungkan gravitasi hidrolik dengan resonansi kristal biru.',
          'Jika kamu memiliki tembaga atau roda gigi perunggu, kita bisa merakit mesin otomatis.',
          'Pipa bambu tahan lama jika dialiri air secara konsisten tanpa rongga udara.',
        ],
        animationState: 'work',
      },
      evening: {
        phase: 'evening',
        activityName: 'Mencatat Diagram & Skematik di Balai Kerja',
        activityDescription: 'Menggambar rancangan mesin mekanik baru pada gulungan lontar.',
        targetLandmark: 'pendopo',
        dialoguePool: [
          'Diagram kincir angin pemompa air ini sudah selesai. Efisiensinya meningkat dua kali lipat.',
          'Harmoni antara teknik dan alam membuat mesin kita ramah lingkungan.',
        ],
        animationState: 'gather',
      },
      night: {
        phase: 'night',
        activityName: 'Memeriksa Katup Pengaman & Beristirahat',
        activityDescription: 'Memastikan seluruh katup uap dan pemutus arus terkunci aman.',
        targetLandmark: 'house',
        dialoguePool: [
          'Seluruh turbin bekerja pada mode siaga malam. Selamat beristirahat.',
        ],
        animationState: 'rest',
      },
    },
  },

  // 8. Hunter (Pemburu Rimba & Penjejak)
  hunter: {
    role: 'hunter',
    titleIndonesian: 'Pemburu Rimba & Penjejak Alam',
    clothingStyle: 'Pakaian kulit rusa samak & selempang bulu penyamaran',
    headwear: 'Topi kulit berhias bulu merak / Mahkota rumbia',
    heldTool: 'Busur panah kayu komposit / Sumpit tiup damak',
    schedules: {
      morning: {
        phase: 'morning',
        activityName: 'Menjejaki Jalur Satwa Liar di Tepi Hutan',
        activityDescription: 'Mengamati jejak kaki dan tanda sarang hewan di kanopi rimba.',
        targetLandmark: 'gate',
        dialoguePool: [
          'Angin berembus dari utara. Menyamarkan aroma tubuh sangat penting saat berburu.',
          'Rusa kristal dan babi hutan sering minum di sungai dangkal dekat air terjun.',
          'Saya punya daging asap gurih, bulu cenderawasih gugur, dan getah perekat alami.',
        ],
        animationState: 'patrol',
      },
      day: {
        phase: 'day',
        activityName: 'Mengumpulkan Getah Hutan & Tanaman Obat',
        activityDescription: 'Menyadap getah damar bening dan memetik herba liar penyembuh.',
        targetLandmark: 'workshop',
        dialoguePool: [
          'Getah damar hutan ini sangat wangi dan bisa dijadikan bahan obat luka.',
          'Busur kayu komposit yang saya buat memanfaatkan kelenturan kayu ulin dan tanduk.',
          'Hormati satwa rimba, jangan pernah memburu melebihi apa yang dibutuhkan desa.',
        ],
        animationState: 'work',
      },
      evening: {
        phase: 'evening',
        activityName: 'Mengasap Daging & Berbagi Hasil di Pendopo',
        activityDescription: 'Membagikan hasil buruan dan ramuan rempah kepada para tetua.',
        targetLandmark: 'pendopo',
        dialoguePool: [
          'Daging se\'i asap kayu kosambi ini siap dinikmati bersama di perapian bale.',
          'Malam ini saya mendengar raungan serigala bayangan di punggung bukit karst.',
        ],
        animationState: 'gather',
      },
      night: {
        phase: 'night',
        activityName: 'Mengasah Mata Panah di Pondok Rimba',
        activityDescription: 'Menyiapkan anak panah dan jebakan tali untuk esok pagi.',
        targetLandmark: 'house',
        dialoguePool: [
          'Mata panah obsidian sudah diasah tajam. Besok kita berburu sebelum fajar menyingsing.',
        ],
        animationState: 'rest',
      },
    },
  },

  // 9. Boat Trader (Saudagar Perahu Sungai & Pesisir)
  boat_trader: {
    role: 'boat_trader',
    titleIndonesian: 'Saudagar Perahu Lintas Samudra',
    clothingStyle: 'Jubah katun pelaut bergaris maritim & selempang kain tenun ikat',
    headwear: 'Topi jerami pelaut bertali dagu / Ikat kepala maritim',
    heldTool: 'Dayung kayu ulin berukir & Kompas jarum magnetik',
    schedules: {
      morning: {
        phase: 'morning',
        activityName: 'Menambatkan Perahu Pinisi di Dermaga',
        activityDescription: 'Membongkar peti muatan rempah dan sutra dari kepulauan rempah.',
        targetLandmark: 'docks',
        dialoguePool: [
          'Jangkar sudah diturunkan! Kami baru saja berlayar menembus selat berombak besar.',
          'Perahu kami membawa komoditas eksotis dari Papua, Toraja, Minang, hingga Bali.',
          'Stok dagangan kami berganti setiap hari tergantung pulau mana yang kami singgahi.',
        ],
        animationState: 'trade',
      },
      day: {
        phase: 'day',
        activityName: 'Lelang Komoditas Langka di Dermaga',
        activityDescription: 'Menjual mutiara laut, rempah langka, dan biji kopi arabika gunung.',
        targetLandmark: 'docks',
        dialoguePool: [
          'Lihatlah mutiara laut timur dan kayu cendana harum ini, kualitas terbaik di samudra!',
          'Saya siap membeli kayu besi ulin dan beras wangi dalam jumlah besar untuk diekspor.',
          'Pelaut sejati membaca rasi bintang di langit untuk menemukan pulau-pulau rahasia.',
        ],
        animationState: 'trade',
      },
      evening: {
        phase: 'evening',
        activityName: 'Bercerita Petualangan Samudra di Kedai Dermaga',
        activityDescription: 'Menceritakan legenda monster palung laut dan pulau terbang aether.',
        targetLandmark: 'pendopo',
        dialoguePool: [
          'Di laut selatan, konon terdapat pusaran air raksasa yang memancarkan cahaya biru terang.',
          'Angin darat mulai bertiup. Esok sore perahu kami akan kembali mengarungi samudra.',
        ],
        animationState: 'gather',
      },
      night: {
        phase: 'night',
        activityName: 'Tidur di Kabin Geladak Perahu Pinisi',
        activityDescription: 'Beristirahat di buaian ayunan geladak perahu di dermaga.',
        targetLandmark: 'house',
        dialoguePool: [
          'Suara deburan ombak di lambung perahu adalah nyanyian tidur paling menenangkan.',
        ],
        animationState: 'rest',
      },
    },
  },
};

export class NPCScheduleManager {
  /**
   * Determines current schedule phase based on world timeOfDay (0.0 to 24.0 hours).
   * 06:00 - 11:00 => morning
   * 11:00 - 16:00 => day
   * 16:00 - 20:00 => evening
   * 20:00 - 06:00 => night
   */
  public static getSchedulePhase(timeOfDay: number): SchedulePhase {
    const t = ((timeOfDay % 24) + 24) % 24;
    if (t >= 6.0 && t < 11.0) return 'morning';
    if (t >= 11.0 && t < 16.0) return 'day';
    if (t >= 16.0 && t < 20.0) return 'evening';
    return 'night';
  }

  /**
   * Get active schedule details for a specific role and time.
   */
  public static getActiveSchedule(role: NPCRoleType, timeOfDay: number): ScheduleActivity {
    const phase = this.getSchedulePhase(timeOfDay);
    const def = NPC_ROLE_SCHEDULES[role] || NPC_ROLE_SCHEDULES.farmer;
    return def.schedules[phase];
  }

  /**
   * Get localized role title and metadata.
   */
  public static getRoleDef(role: NPCRoleType): NPCScheduleDef {
    return NPC_ROLE_SCHEDULES[role] || NPC_ROLE_SCHEDULES.farmer;
  }

  /**
   * Resolve spatial target landmark position, utilizing player-built structures when available.
   */
  public static getTargetLandmarkPosition(
    role: NPCRoleType,
    timeOfDay: number,
    settlementOrigin: [number, number, number],
    settlementId?: string
  ): [number, number, number] {
    const active = this.getActiveSchedule(role, timeOfDay);
    if (settlementId) {
      const structs = SettlementManager.getRecognizedStructures(settlementId);
      if (structs.length > 0) {
        if (active.targetLandmark === 'house') {
          const house = structs.find(s => s.category === 'house' || s.hasBed || s.hasDoor);
          if (house) return house.originPos;
        } else if (active.targetLandmark === 'workshop' || active.targetLandmark === 'engineering') {
          const workshop = structs.find(s => s.category === 'workshop' || s.category === 'leyline_hub' || s.hasWorkstation);
          if (workshop) return workshop.originPos;
        } else if (active.targetLandmark === 'farm') {
          const farm = structs.find(s => s.category === 'farm');
          if (farm) return farm.originPos;
        }
      }
    }
    return settlementOrigin;
  }
}
