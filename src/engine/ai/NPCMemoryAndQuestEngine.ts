// NPC Episodic Memory & Dynamic Contextual AI Quest Engine (v7.2.0)
// Gives Nusantara NPCs short/long-term memory of player deeds and generates context-aware quests tied to live world state.
import { SETTLEMENT_REGISTRY } from '../settlement/SettlementManager';
import type { TradeCaravan } from '../settlement/LivingKingdomManager';
import type { WorldBossInstance } from '../combat/WorldBossRaidManager';

export type NPCMemoryKind =
  | 'trade'
  | 'escort_caravan'
  | 'raid_caravan'
  | 'boss_assist'
  | 'gift'
  | 'village_expansion'
  | 'crime';

export interface NPCMemoryEntry {
  id: string;
  npcId: string;
  settlementId: string;
  kind: NPCMemoryKind;
  summary: string;
  sentimentDelta: number; // -30 .. +30
  timestamp: number;
}

export interface DynamicContextualQuest {
  id: string;
  title: string;
  giverNpcId: string;
  settlementId: string;
  objectiveType: 'escort_caravan' | 'vanquish_boss' | 'deliver_commodity' | 'aid_expansion';
  description: string;
  targetId: string;
  targetCoord: [number, number, number];
  rewardCredits: number;
  rewardReputation: number;
  createdAt: number;
}

export class NPCMemoryAndQuestEngine {
  private memoriesByNpc: Map<string, NPCMemoryEntry[]> = new Map();
  private memoriesBySettlement: Map<string, NPCMemoryEntry[]> = new Map();
  private maxMemoriesPerNpc: number = 12;
  private questSeq: number = 0;

  public recordMemory(
    npcId: string,
    settlementId: string,
    kind: NPCMemoryKind,
    summary: string,
    sentimentDelta: number
  ): NPCMemoryEntry {
    const entry: NPCMemoryEntry = {
      id: `mem_${npcId}_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      npcId,
      settlementId,
      kind,
      summary,
      sentimentDelta,
      timestamp: Date.now(),
    };

    const npcList = this.memoriesByNpc.get(npcId) || [];
    npcList.unshift(entry);
    if (npcList.length > this.maxMemoriesPerNpc) npcList.length = this.maxMemoriesPerNpc;
    this.memoriesByNpc.set(npcId, npcList);

    const setList = this.memoriesBySettlement.get(settlementId) || [];
    setList.unshift(entry);
    if (setList.length > 24) setList.length = 24;
    this.memoriesBySettlement.set(settlementId, setList);

    return entry;
  }

  public getNPCMemories(npcId: string, limit: number = 5): NPCMemoryEntry[] {
    return (this.memoriesByNpc.get(npcId) || []).slice(0, limit);
  }

  public getSentimentScore(npcId: string): number {
    const list = this.memoriesByNpc.get(npcId) || [];
    let total = 0;
    for (const m of list) total += m.sentimentDelta;
    return Math.max(-100, Math.min(100, total));
  }

  /**
   * Builds a concise memory context string injected into Gemini AI NPC Dialogue prompts & offline folklore fallback.
   */
  public buildDialogueMemoryPrompt(npcId: string, settlementId?: string): string {
    const npcMems = this.getNPCMemories(npcId, 3);
    const setMems = settlementId ? (this.memoriesBySettlement.get(settlementId) || []).slice(0, 2) : [];

    const combined: NPCMemoryEntry[] = [...npcMems];
    for (const sm of setMems) {
      if (!combined.some((m) => m.id === sm.id)) combined.push(sm);
    }

    if (combined.length === 0) return '';
    const sentiment = this.getSentimentScore(npcId);
    const attitude = sentiment >= 20 ? 'sangat menghormati' : sentiment <= -15 ? 'curiga terhadap' : 'mengenal';
    const bullets = combined.slice(0, 4).map((m) => m.summary).join('; ');
    return `Memori NPC (${attitude} pemain, skor ${sentiment}): ${bullets}.`;
  }

  /**
   * Generates a contextual, playable Nusantara quest grounded in real nearby world state
   * (active World Bosses, active Trade Caravans, or settlement expansion needs).
   */
  public generateContextualQuest(params: {
    giverNpcId: string;
    settlementId: string;
    activeBoss?: WorldBossInstance | null;
    activeCaravans?: TradeCaravan[];
  }): DynamicContextualQuest {
    const settlement = SETTLEMENT_REGISTRY[params.settlementId] || Object.values(SETTLEMENT_REGISTRY)[0];
    const sentiment = this.getSentimentScore(params.giverNpcId);
    const repBonus = sentiment >= 20 ? 1.25 : 1.0;

    // Priority 1: Active Mythic World Boss Threat
    if (params.activeBoss && params.activeBoss.active && !params.activeBoss.defeated) {
      return {
        id: `dyn_quest_${++this.questSeq}_${Date.now()}`,
        title: `Seruan Darurat: Taklukkan ${params.activeBoss.displayName}`,
        giverNpcId: params.giverNpcId,
        settlementId: settlement.id,
        objectiveType: 'vanquish_boss',
        description: `Warga ${settlement.name} merasakan getaran hebat! Bantu pendekar menaklukkan ${params.activeBoss.displayName} sebelum arena desa hancur.`,
        targetId: params.activeBoss.id,
        targetCoord: [...params.activeBoss.position],
        rewardCredits: Math.round(450 * repBonus),
        rewardReputation: 35,
        createdAt: Date.now(),
      };
    }

    // Priority 2: Active Trade Caravan needing escort
    const caravan = params.activeCaravans?.find(
      (c) => c.status === 'en_route' && (c.originSettlementId === settlement.id || c.destinationSettlementId === settlement.id)
    ) || params.activeCaravans?.[0];

    if (caravan) {
      const dest = SETTLEMENT_REGISTRY[caravan.destinationSettlementId];
      const vesselLabel = caravan.mode === 'phinisi_vessel' ? 'Kapal Phinisi' : 'Karavan Rempah';
      return {
        id: `dyn_quest_${++this.questSeq}_${Date.now()}`,
        title: `Kawal ${vesselLabel} Menuju ${dest?.name || caravan.destinationSettlementId}`,
        giverNpcId: params.giverNpcId,
        settlementId: settlement.id,
        objectiveType: 'escort_caravan',
        description: `${vesselLabel} bermuatan ${caravan.cargoQuantity}x ${caravan.cargoCommodityId} sedang melintasi jalur dagang. Pastikan tiba dengan selamat untuk memakmurkan ${settlement.name}.`,
        targetId: caravan.id,
        targetCoord: [...caravan.currentPos],
        rewardCredits: Math.round(220 * repBonus),
        rewardReputation: 20,
        createdAt: Date.now(),
      };
    }

    // Priority 3: Aid Autonomous Settlement Expansion
    return {
      id: `dyn_quest_${++this.questSeq}_${Date.now()}`,
      title: `Gotong Royong Pembangunan ${settlement.name}`,
      giverNpcId: params.giverNpcId,
      settlementId: settlement.id,
      objectiveType: 'aid_expansion',
      description: `Berdagang atau setor komoditas unggulan di ${settlement.name} untuk mempercepat pembangunan infrastruktur adat desa.`,
      targetId: settlement.id,
      targetCoord: [...settlement.originPos],
      rewardCredits: Math.round(160 * repBonus),
      rewardReputation: 15,
      createdAt: Date.now(),
    };
  }
}
