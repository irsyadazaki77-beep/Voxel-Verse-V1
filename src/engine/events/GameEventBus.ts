// Central Decoupled Event Dispatcher for Zero-Cost Reactive Progression & Quest Subscriptions
export type GameEventType =
  | 'BLOCK_MINED'
  | 'BLOCK_PLACED'
  | 'ENTITY_KILLED'
  | 'BIOME_DISCOVERED'
  | 'STRUCTURE_DISCOVERED'
  | 'LANDMARK_DISCOVERED'
  | 'ITEM_CRAFTED'
  | 'ITEM_COLLECTED'
  | 'BOSS_SPAWNED'
  | 'BOSS_DEFEATED'
  | 'ARTIFACT_UNLOCKED'
  | 'ARTIFACT_DISCOVERED'
  | 'LORE_FOUND'
  | 'QUEST_ACCEPTED'
  | 'QUEST_COMPLETED'
  | 'DUNGEON_CLEARED'
  | 'EXPEDITION_STARTED'
  | 'WORLD_EVENT_TRIGGERED'
  | 'SETTLEMENT_VISITED'
  | 'COMBAT_HIT'
  | 'PLAYER_DAMAGED'
  | 'ENTITY_STAGGERED'
  | 'PLAYER_STAGGERED'
  | 'CONTRACT_ACCEPTED'
  | 'CONTRACT_CLAIMED'
  | 'CONTRACT_COMPLETED'
  | 'TREASURE_MAP_DECIPHERED'
  | 'TREASURE_CACHE_DISCOVERED'
  | 'ANOMALY_RESOLVED'
  | 'STABILITY_CHANGED'
  | 'MONOLITH_ACTIVATED';

export interface GameEventPayloads {
  BLOCK_MINED: { blockType: number; pos: [number, number, number]; toolUsed?: string };
  BLOCK_PLACED: { blockType: number; pos: [number, number, number] };
  ENTITY_KILLED: { entityId: string; modelType: string; isBoss: boolean; pos: [number, number, number] };
  BIOME_DISCOVERED: { biomeId: string; biomeName: string; pos: [number, number, number] };
  STRUCTURE_DISCOVERED: { structureId: string; name: string; pos: [number, number, number] };
  LANDMARK_DISCOVERED: { landmarkId: string; name: string; pos: [number, number, number] };
  ITEM_CRAFTED: { itemId: string; count: number; station: string };
  ITEM_COLLECTED: { itemId: string; count: number };
  BOSS_SPAWNED: { bossId: string; type: string; pos: [number, number, number] };
  BOSS_DEFEATED: { bossId: string; bossName: string; pos: [number, number, number] };
  ARTIFACT_UNLOCKED: { artifactId: string; name: string };
  ARTIFACT_DISCOVERED: { artifactId: string };
  LORE_FOUND: { loreId: string; title: string };
  QUEST_ACCEPTED: { questId: string };
  QUEST_COMPLETED: { questId: string; xpReward: number; rewards?: any };
  DUNGEON_CLEARED: { dungeonId?: string; theme?: string; expedition?: any };
  EXPEDITION_STARTED: { dungeonId?: string; theme?: string; expedition?: any };
  WORLD_EVENT_TRIGGERED: { eventType: string; eventName: string; pos?: [number, number, number] };
  SETTLEMENT_VISITED: { settlementId: string; name: string; pos: [number, number, number] };
  COMBAT_HIT: { hitType: 'hit' | 'crit' | 'blocked'; damage: number; targetPos?: [number, number, number] };
  PLAYER_DAMAGED: { amount: number; source: string };
  ENTITY_STAGGERED: { entityId: string; duration: number };
  PLAYER_STAGGERED: { duration: number };
  CONTRACT_ACCEPTED: { contractId?: string; contract?: any };
  CONTRACT_CLAIMED: { contractId?: string; rewards?: any; contract?: any };
  CONTRACT_COMPLETED: { contractId?: string; contract?: any };
  TREASURE_MAP_DECIPHERED: { mapId?: string; targetPos?: [number, number, number]; map?: any };
  TREASURE_CACHE_DISCOVERED: { mapId?: string; loot?: any[]; map?: any };
  ANOMALY_RESOLVED: { anomalyId?: string };
  STABILITY_CHANGED: { stability: number; delta?: number; reason?: string };
  MONOLITH_ACTIVATED: { monolithId?: string; blessing?: string; monolith?: any };
}

type EventCallback<T extends GameEventType> = (payload: GameEventPayloads[T]) => void;

export class GameEventBus {
  private static listeners: Map<GameEventType, Set<EventCallback<any>>> = new Map();

  public static on<T extends GameEventType>(event: T, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const set = this.listeners.get(event);
      if (set) {
        set.delete(callback);
      }
    };
  }

  public static emit<T extends GameEventType>(event: T, payload: GameEventPayloads[T]): void {
    const set = this.listeners.get(event);
    if (set && set.size > 0) {
      set.forEach(cb => {
        try {
          cb(payload);
        } catch (e) {
          console.error(`Error in GameEventBus handler for ${event}:`, e);
        }
      });
    }
  }

  public static clear(): void {
    this.listeners.clear();
  }
}
