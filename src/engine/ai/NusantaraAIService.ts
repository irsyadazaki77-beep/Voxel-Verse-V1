// VoxelVerse v6.0.0–v7.2.0: Suara Sang Pujangga — Server-Side Gemini API Client, NPC Episodic Memory & Offline Nusantara Folklore Fallback
import { NPCMemoryAndQuestEngine } from './NPCMemoryAndQuestEngine';

export interface AIDialogueRequest {
  npcId?: string;
  npcName: string;
  npcRole: string;
  settlementId?: string;
  settlementName?: string;
  reputation?: number;
  weather?: string;
  timeOfDay?: number;
  playerMessage: string;
  memoryContext?: string;
  history?: Array<{ role: 'player' | 'npc'; text: string }>;
}

export interface AIDialogueResponse {
  reply: string;
  source: 'gemini' | 'fallback';
  suggestedTopic?: string;
}

export interface PrasastiDecipherResult {
  title: string;
  kawiScript: string;
  translation: string;
  riddle: string;
  targetCoord: [number, number, number];
  rewardHint: string;
  source: 'gemini' | 'fallback';
}

export interface KidungVerseResult {
  id: string;
  title: string;
  pupuhStyle: string;
  stanzas: string[];
  createdAt: number;
  source: 'gemini' | 'fallback';
}

const KIDUNG_STORAGE_KEY = 'voxelverse_kidung_chronicles_v6';

export class NusantaraAIService {
  public static savedKidungList: KidungVerseResult[] = NusantaraAIService.loadSavedKidung();
  public static readonly memoryEngine: NPCMemoryAndQuestEngine = new NPCMemoryAndQuestEngine();

  private static loadSavedKidung(): KidungVerseResult[] {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    try {
      const raw = window.localStorage.getItem(KIDUNG_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private static persistKidung(): void {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      window.localStorage.setItem(
        KIDUNG_STORAGE_KEY,
        JSON.stringify(this.savedKidungList.slice(0, 20))
      );
    } catch {
      // Ignore storage quota errors
    }
  }

  public static async askNPCDialogue(req: AIDialogueRequest): Promise<AIDialogueResponse> {
    const autoMemory =
      req.memoryContext ||
      (req.npcId ? this.memoryEngine.buildDialogueMemoryPrompt(req.npcId, req.settlementId) : '');
    const enrichedReq: AIDialogueRequest = autoMemory ? { ...req, memoryContext: autoMemory } : req;

    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/ai/npc-dialogue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(enrichedReq),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.reply === 'string') {
            return {
              reply: data.reply,
              source: data.source === 'gemini' ? 'gemini' : 'fallback',
              suggestedTopic: data.suggestedTopic,
            };
          }
        }
      }
    } catch {
      // Fallback to local Nusantara folklore engine
    }

    return this.buildOfflineDialogueFallback(enrichedReq);
  }

  public static async decipherPrasasti(params: {
    biome: string;
    playerPos: [number, number, number];
    playerLevel?: number;
    seed?: number;
  }): Promise<PrasastiDecipherResult> {
    const offsetX = Math.round(((params.seed || 77) % 90) + 35) * (Math.random() > 0.5 ? 1 : -1);
    const offsetZ = Math.round((((params.seed || 77) * 3) % 90) + 35) * (Math.random() > 0.5 ? 1 : -1);
    const targetCoord: [number, number, number] = [
      Math.round(params.playerPos[0] + offsetX),
      Math.max(58, Math.round(params.playerPos[1])),
      Math.round(params.playerPos[2] + offsetZ),
    ];

    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/ai/decipher-prasasti', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...params, targetCoord }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && typeof data.translation === 'string') {
            return {
              title: data.title || 'Prasasti Watu Kencana',
              kawiScript: data.kawiScript || 'ᬲ᭄ᬯᬲ᭄ᬢᬶ ᬤᬶᬭ᭄ᬖᬬᬸ ᬦᬸᬲᬦ᭄ᬢᬭ',
              translation: data.translation,
              riddle: data.riddle || `Ikuti arah angin menuju [${targetCoord[0]}, ${targetCoord[2]}].`,
              targetCoord: Array.isArray(data.targetCoord) ? data.targetCoord : targetCoord,
              rewardHint: data.rewardHint || 'Peti Pusaka & Kristal Aether',
              source: data.source === 'gemini' ? 'gemini' : 'fallback',
            };
          }
        }
      }
    } catch {
      // Offline fallback
    }

    return {
      title: `Prasasti Purba ${params.biome.toUpperCase()}`,
      kawiScript: 'Swasti Śaka Warsatita · Aether Tirta Bhumi Nusantara',
      translation:
        'Di bawah naungan kabut fajar dan gema gamelan para leluhur, tersimpan pusaka luhur bagi pendekar yang menjaga keseimbangan alam.',
      riddle: `Langkahkan kakimu menuju koordinat [${targetCoord[0]}, Y:${targetCoord[1]}, ${targetCoord[2]}]. Di sanalah batu tua menyimpan rahasia terpendam.`,
      targetCoord,
      rewardHint: 'Mutiara Samudra, Serpihan Aether & Pusaka Leluhur',
      source: 'fallback',
    };
  }

  public static async composeKidung(params: {
    playerName: string;
    level: number;
    defeatedBosses: number;
    structuresBuilt: number;
    activeKhodam?: string | null;
  }): Promise<KidungVerseResult> {
    try {
      if (typeof fetch !== 'undefined') {
        const res = await fetch('/api/ai/compose-kidung', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.stanzas) && data.stanzas.length > 0) {
            const entry: KidungVerseResult = {
              id: `kidung_${Date.now()}`,
              title: data.title || `Kidung Kejayaan ${params.playerName}`,
              pupuhStyle: data.pupuhStyle || 'Tembang Macapat Sinom',
              stanzas: data.stanzas,
              createdAt: Date.now(),
              source: data.source === 'gemini' ? 'gemini' : 'fallback',
            };
            this.savedKidungList.unshift(entry);
            this.persistKidung();
            return entry;
          }
        }
      }
    } catch {
      // Fallback
    }

    const khodamLine = params.activeKhodam
      ? `Didampingi sang ${params.activeKhodam} penjaga sukma,`
      : 'Berbekal tekad baja dan jurus silat pusaka,';
    const entry: KidungVerseResult = {
      id: `kidung_${Date.now()}`,
      title: `Kidung Pengembara ${params.playerName || 'Satria Nusantara'}`,
      pupuhStyle: 'Tembang Macapat Asmarandana',
      stanzas: [
        `Dengarlah wahai semesta, kisah sang ${params.playerName || 'Satria'} tingkat ${params.level},`,
        khodamLine,
        `${params.structuresBuilt} mahakarya berdiri megah memeluk cakrawala,`,
        `${params.defeatedBosses} angkara murka telah tunduk di bawah sinar kencana.`,
      ],
      createdAt: Date.now(),
      source: 'fallback',
    };
    this.savedKidungList.unshift(entry);
    this.persistKidung();
    return entry;
  }

  public static buildOfflineDialogueFallback(req: AIDialogueRequest): AIDialogueResponse {
    const q = req.playerMessage.toLowerCase();
    const loc = req.settlementName || 'Tanah Nusantara';
    const isNight = (req.timeOfDay ?? 12) >= 18 || (req.timeOfDay ?? 12) < 5;

    if (q.includes('silat') || q.includes('jurus') || q.includes('ajian') || q.includes('keris')) {
      return {
        reply: `${req.npcName}: "Ilmu silat bukan sekadar tajamnya Keris Luk-5, nak. Kuasai tiga Kuda-Kuda—Harimau untuk kecepatan, Bangau untuk tangkisan parry, dan Naga untuk meremukkan keseimbangan musuh."`,
        source: 'fallback',
        suggestedTopic: 'Tanya soal Subak & Irigasi',
      };
    }
    if (q.includes('subak') || q.includes('sawah') || q.includes('air') || q.includes('bambu')) {
      return {
        reply: `${req.npcName}: "Air adalah nafas kehidupan di ${loc}. Alirkan mata air pegunungan melalui Talang Bambu dan buka Pintu Air Jati agar terasering sawah dan Lesung Padi bekerja serentak dalam harmoni Tri Hita Karana."`,
        source: 'fallback',
        suggestedTopic: 'Tanya soal Gua Karst & Prasasti',
      };
    }
    if (q.includes('batik') || q.includes('kain') || q.includes('canting')) {
      return {
        reply: `${req.npcName}: "Setiap goresan malam dari canting menyimpan doa. Buka Studio Batik Tulis untuk melukis motif Parang atau Megamendung—hasil karyamu bisa langsung menghiasi jubah maupun layar kapal Phinisi!"`,
        source: 'fallback',
        suggestedTopic: 'Tanya soal Kapal & Samudra',
      };
    }
    if (q.includes('gua') || q.includes('karst') || q.includes('prasasti') || q.includes('harta')) {
      return {
        reply: `${req.npcName}: "Jauh di bawah tebing kapur terbentang Gua Karst purba dengan lukisan cap tangan bercahaya. Bawa obor dan gunakan Dekripsi Prasasti untuk membaca petunjuk para leluhur."`,
        source: 'fallback',
        suggestedTopic: 'Tanya soal Gelanggang Duel',
      };
    }

    const timeGreeting = isNight
      ? 'Malam ini kunang-kunang menari tenang di atas pendopo.'
      : 'Sinar surya menerangi ladang dan menara kayu kita.';
    const memoryClause = req.memoryContext ? ` (${req.memoryContext})` : '';
    return {
      reply: `${req.npcName} (${req.npcRole}): "Rahayu, pengembara. ${timeGreeting} Di ${loc}, reputasimu (${req.reputation ?? 0}) dikenang warga.${memoryClause} Tanyakan padaku tentang silat, irigasi Subak, batik tulis, atau rahasia prasasti kuno."`,
      source: 'fallback',
      suggestedTopic: 'Tanya soal Jurus Silat & Keris',
    };
  }
}
