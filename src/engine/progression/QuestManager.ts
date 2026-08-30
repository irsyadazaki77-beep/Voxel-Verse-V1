// Modular Quest Engine: Event-Driven Objective Progression, Data-Driven Registry & Reward Distribution
import { QuestDef, QuestObjective, QuestState, ItemStack } from '../../types';
import { GameEventBus } from '../events/GameEventBus';
import { CraftingSystem } from '../items/CraftingSystem';

export const QUEST_REGISTRY: Record<string, QuestDef> = {
  q_first_steps: {
    id: 'q_first_steps',
    title: 'Pioneering the Haven',
    giverName: 'Torvald the Nomadic Merchant',
    giverSettlement: 'Haven Camp',
    category: 'storyline',
    tier: 'tier1_haven',
    description: 'Fell ancient timber, fashion basic wooden implements, and discover the surrounding wilderness.',
    objectives: [
      { type: 'craft', description: 'Craft a Wooden Pickaxe at a Crafting Bench', targetId: 'wooden_pickaxe', requiredCount: 1 },
      { type: 'collect', description: 'Gather 8 River Cobblestone', targetId: 'cobblestone', requiredCount: 8 },
      { type: 'discover', description: 'Discover an Ancient Shrine or Explorer Cabin', targetId: 'shrine', requiredCount: 1 },
    ],
    rewards: {
      xp: 50,
      items: [
        { itemId: 'copper_ingot', count: 4 },
        { itemId: 'bread', count: 6 },
      ],
      unlockedRecipe: 'copper_pickaxe',
    },
  },
  q_hunting_stalkers: {
    id: 'q_hunting_stalkers',
    title: 'Shadows in the Mist',
    giverName: 'Elder Bryan of Suncrest',
    giverSettlement: 'Suncrest Hamlet',
    category: 'hunting',
    tier: 'tier2_frontier',
    description: 'Nocturnal Shadow Stalkers menace the perimeter during dark hours. Hunt them down to safeguard the settlement.',
    objectives: [
      { type: 'kill', description: 'Slay 3 Shadow Stalkers', targetId: 'stalker', requiredCount: 3 },
    ],
    rewards: {
      xp: 120,
      items: [
        { itemId: 'iron_ingot', count: 4 },
        { itemId: 'potion_healing', count: 2 },
      ],
    },
    prerequisites: ['q_first_steps'],
  },
  q_delve_crypt: {
    id: 'q_delve_crypt',
    title: 'Echoes of the Sunken Crypt',
    giverName: 'Warden Alistair the Scout',
    giverSettlement: 'Outpost Bastion',
    category: 'dungeon',
    tier: 'tier3_ancient',
    description: 'Descend into a subterranean crypt or abandoned mine, disarm the ancient traps, and plunder the inner treasure vault.',
    objectives: [
      { type: 'discover', description: 'Locate a Subterranean Dungeon entrance', targetId: 'dungeon', requiredCount: 1 },
      { type: 'kill', description: 'Defeat a Ruin Sentinel mini-boss', targetId: 'ruin_sentinel', requiredCount: 1 },
    ],
    rewards: {
      xp: 250,
      items: [
        { itemId: 'mythril_ingot', count: 3 },
        { itemId: 'eye_of_aether', count: 1 },
      ],
      artifactHint: 'The Eye of Aether unlocks hidden vision and leyline insights.',
    },
    prerequisites: ['q_hunting_stalkers'],
  },
  q_slay_sovereign: {
    id: 'q_slay_sovereign',
    title: 'Confronting the Void Sovereign',
    giverName: 'Archivist Kenneth',
    category: 'boss',
    tier: 'tier5_void',
    description: 'Venture into the Void-Scarred Cataclysm and purge the Shadow Sovereign from the realm.',
    objectives: [
      { type: 'boss', description: 'Defeat the Shadow Sovereign', targetId: 'boss_void_sovereign', requiredCount: 1 },
    ],
    rewards: {
      xp: 1000,
      items: [
        { itemId: 'void_walker_ring', count: 1 },
        { itemId: 'aether_crystal', count: 8 },
      ],
    },
    prerequisites: ['q_delve_crypt'],
  },
};

export class QuestManager {
  private static questStates: Map<string, { state: QuestState; progress: number[] }> = new Map();
  private static onQuestChangeCallbacks: (() => void)[] = [];
  private static eventUnsubscribes: (() => void)[] = [];

  public static initialize(savedQuests?: { [questId: string]: { state: QuestState; progress: { [idx: number]: number } } }): void {
    this.questStates.clear();

    // Default quests initialization
    Object.keys(QUEST_REGISTRY).forEach((qId) => {
      const qDef = QUEST_REGISTRY[qId];
      const initialProgress = new Array(qDef.objectives.length).fill(0);
      const isStarter = !qDef.prerequisites || qDef.prerequisites.length === 0;

      this.questStates.set(qId, {
        state: isStarter ? 'active' : 'unavailable',
        progress: initialProgress,
      });
    });

    // Load saved states
    if (savedQuests) {
      Object.entries(savedQuests).forEach(([qId, data]) => {
        if (QUEST_REGISTRY[qId]) {
          const qDef = QUEST_REGISTRY[qId];
          const progArray = new Array(qDef.objectives.length).fill(0);
          if (data.progress) {
            Object.entries(data.progress).forEach(([idxStr, val]) => {
              const idx = parseInt(idxStr, 10);
              if (idx >= 0 && idx < progArray.length) {
                progArray[idx] = val;
              }
            });
          }
          this.questStates.set(qId, {
            state: data.state,
            progress: progArray,
          });
        }
      });
    }

    this.checkPrerequisites();
    this.setupEventListeners();
  }

  private static setupEventListeners(): void {
    // Unsubscribe from any previous listeners to avoid duplicates
    this.dispose();

    this.eventUnsubscribes.push(
      GameEventBus.on('ENTITY_KILLED', (data) => {
        this.advanceObjective('kill', data.modelType, 1);
        if (data.isBoss) {
          this.advanceObjective('boss', data.entityId, 1);
          this.advanceObjective('boss', data.modelType, 1);
        }
      })
    );

    this.eventUnsubscribes.push(
      GameEventBus.on('BOSS_DEFEATED', (data) => {
        this.advanceObjective('boss', data.bossId, 1);
      })
    );

    this.eventUnsubscribes.push(
      GameEventBus.on('ITEM_CRAFTED', (data) => {
        this.advanceObjective('craft', data.itemId, data.count);
      })
    );

    this.eventUnsubscribes.push(
      GameEventBus.on('ITEM_COLLECTED', (data) => {
        this.advanceObjective('collect', data.itemId, data.count);
      })
    );

    this.eventUnsubscribes.push(
      GameEventBus.on('STRUCTURE_DISCOVERED', (data) => {
        this.advanceObjective('discover', data.structureId, 1);
        this.advanceObjective('discover', 'structure', 1);
      })
    );

    this.eventUnsubscribes.push(
      GameEventBus.on('LANDMARK_DISCOVERED', (data) => {
        this.advanceObjective('discover', data.landmarkId, 1);
      })
    );
  }

  public static dispose(): void {
    this.eventUnsubscribes.forEach((unsub) => unsub());
    this.eventUnsubscribes = [];
  }

  public static advanceObjective(type: string, targetId: string, amount: number = 1): void {
    let changed = false;

    this.questStates.forEach((qState, qId) => {
      if (qState.state !== 'active') return;
      const qDef = QUEST_REGISTRY[qId];
      if (!qDef) return;

      qDef.objectives.forEach((obj, idx) => {
        if (obj.type === type && (obj.targetId === targetId || targetId.includes(obj.targetId))) {
          const current = qState.progress[idx] || 0;
          if (current < obj.requiredCount) {
            qState.progress[idx] = Math.min(obj.requiredCount, current + amount);
            changed = true;
          }
        }
      });

      // Check if all objectives completed
      const allComplete = qDef.objectives.every((obj, idx) => (qState.progress[idx] || 0) >= obj.requiredCount);
      if (allComplete) {
        qState.state = 'completed';
        changed = true;
        GameEventBus.emit('QUEST_COMPLETED', { questId: qId, xpReward: qDef.rewards.xp });
        this.checkPrerequisites();
      }
    });

    if (changed) {
      this.notifyListeners();
    }
  }

  public static checkPrerequisites(): void {
    this.questStates.forEach((qState, qId) => {
      if (qState.state !== 'unavailable') return;
      const qDef = QUEST_REGISTRY[qId];
      if (!qDef) return;

      if (qDef.prerequisites && qDef.prerequisites.length > 0) {
        const reqsMet = qDef.prerequisites.every((prereqId) => {
          const prereqState = this.questStates.get(prereqId);
          return prereqState && prereqState.state === 'completed';
        });

        if (reqsMet) {
          qState.state = 'active';
        }
      }
    });
  }

  public static getActiveQuests(): { def: QuestDef; progress: number[]; state: QuestState }[] {
    const list: { def: QuestDef; progress: number[]; state: QuestState }[] = [];
    this.questStates.forEach((qState, qId) => {
      const def = QUEST_REGISTRY[qId];
      if (def) {
        list.push({ def, progress: qState.progress, state: qState.state });
      }
    });
    return list;
  }

  public static serialize(): { [questId: string]: { state: QuestState; progress: { [idx: number]: number } } } {
    const obj: { [questId: string]: { state: QuestState; progress: { [idx: number]: number } } } = {};
    this.questStates.forEach((qState, qId) => {
      const progObj: { [idx: number]: number } = {};
      qState.progress.forEach((v, idx) => {
        progObj[idx] = v;
      });
      obj[qId] = { state: qState.state, progress: progObj };
    });
    return obj;
  }

  public static onQuestChange(cb: () => void): () => void {
    this.onQuestChangeCallbacks.push(cb);
    return () => {
      this.onQuestChangeCallbacks = this.onQuestChangeCallbacks.filter(c => c !== cb);
    };
  }

  private static notifyListeners(): void {
    this.onQuestChangeCallbacks.forEach(cb => cb());
  }
}
