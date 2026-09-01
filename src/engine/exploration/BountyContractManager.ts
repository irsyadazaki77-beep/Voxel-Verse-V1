// Dynamic Bounty & Hunting Contract System for VoxelVerse 3.0
import { GameEventBus } from '../events/GameEventBus';

export type ContractCategory = 'monster_hunt' | 'expedition' | 'foraging' | 'crafting' | 'relic_retrieval';
export type ContractStatus = 'available' | 'active' | 'completed' | 'claimed';

export interface BountyContract {
  id: string;
  title: string;
  category: ContractCategory;
  issuerSettlement: string;
  description: string;
  targetType: string;
  targetCount: number;
  currentCount: number;
  status: ContractStatus;
  rewards: {
    xp: number;
    credits: number;
    reputation: number;
    itemReward?: { itemId: string; count: number };
  };
  timeLimitSeconds?: number;
  dangerStars: number;
}

export const INITIAL_BOUNTY_CONTRACTS: BountyContract[] = [
  {
    id: 'bounty_stalker_pack',
    title: 'Purge the Shadow Prowlers',
    category: 'monster_hunt',
    issuerSettlement: 'Oakhaven Village',
    description: 'A pack of predatory Shadow Stalkers have been ambushing timber loggers on the edge of the groves.',
    targetType: 'stalker',
    targetCount: 4,
    currentCount: 0,
    status: 'available',
    rewards: {
      xp: 150,
      credits: 60,
      reputation: 25,
      itemReward: { itemId: 'raw_iron', count: 8 },
    },
    dangerStars: 2,
  },
  {
    id: 'bounty_aether_harvest',
    title: 'Crystalline Ley Harvest',
    category: 'foraging',
    issuerSettlement: 'Aetheria Outpost',
    description: 'The outpost astromancers require luminescent flora to stabilize their celestial scrying lens.',
    targetType: 'sun_orchid',
    targetCount: 6,
    currentCount: 0,
    status: 'available',
    rewards: {
      xp: 120,
      credits: 45,
      reputation: 20,
      itemReward: { itemId: 'aether_crystal', count: 4 },
    },
    dangerStars: 1,
  },
  {
    id: 'bounty_sentinel_core',
    title: 'Hunt the Ancient Colossus',
    category: 'monster_hunt',
    issuerSettlement: 'Sunken Mechanum',
    description: 'A rogue Precursor Ruin Sentinel is patrolling the basalt ruins. Slay it and retrieve its mechanical core.',
    targetType: 'ruin_sentinel',
    targetCount: 1,
    currentCount: 0,
    status: 'available',
    rewards: {
      xp: 450,
      credits: 200,
      reputation: 60,
      itemReward: { itemId: 'heart_of_colossus', count: 1 },
    },
    dangerStars: 4,
  },
  {
    id: 'bounty_deep_mythril',
    title: 'Deep Vein Excavation',
    category: 'expedition',
    issuerSettlement: 'Ironforge Stronghold',
    description: 'Mine precious Mythril ore from deep subterranean caverns beneath Y=30.',
    targetType: 'mythril_ore',
    targetCount: 5,
    currentCount: 0,
    status: 'available',
    rewards: {
      xp: 220,
      credits: 110,
      reputation: 35,
      itemReward: { itemId: 'diamond', count: 2 },
    },
    dangerStars: 3,
  },
];

export class BountyContractManager {
  private static contracts: BountyContract[] = [...INITIAL_BOUNTY_CONTRACTS];
  private static listeners: (() => void)[] = [];

  public static initialize(): void {
    // Listen for monster kills
    GameEventBus.on('ENTITY_KILLED', (e: { modelType?: string }) => {
      if (e.modelType) {
        this.progressContracts('monster_hunt', e.modelType, 1);
      }
    });

    // Listen for block mining
    GameEventBus.on('BLOCK_MINED', (e: { itemId?: string; blockType?: any }) => {
      if (e.itemId) {
        this.progressContracts('expedition', e.itemId, 1);
        this.progressContracts('foraging', e.itemId, 1);
      }
    });

    // Listen for item collections
    GameEventBus.on('ITEM_COLLECTED', (e: { itemId: string; count: number }) => {
      this.progressContracts('foraging', e.itemId, e.count);
    });
  }

  public static getContracts(): BountyContract[] {
    return [...this.contracts];
  }

  public static acceptContract(contractId: string): boolean {
    const contract = this.contracts.find(c => c.id === contractId);
    if (contract && contract.status === 'available') {
      contract.status = 'active';
      this.notify();
      GameEventBus.emit('CONTRACT_ACCEPTED', { contract });
      return true;
    }
    return false;
  }

  public static claimContractReward(contractId: string): BountyContract | null {
    const contract = this.contracts.find(c => c.id === contractId);
    if (contract && contract.status === 'completed') {
      contract.status = 'claimed';
      this.notify();
      GameEventBus.emit('CONTRACT_CLAIMED', { contract });
      return contract;
    }
    return null;
  }

  public static progressContracts(category: ContractCategory, targetType: string, count: number): void {
    let updated = false;
    for (const contract of this.contracts) {
      if (contract.status === 'active' && contract.category === category) {
        if (contract.targetType === targetType || targetType.includes(contract.targetType)) {
          contract.currentCount = Math.min(contract.targetCount, contract.currentCount + count);
          if (contract.currentCount >= contract.targetCount) {
            contract.status = 'completed';
            GameEventBus.emit('CONTRACT_COMPLETED', { contract });
          }
          updated = true;
        }
      }
    }
    if (updated) {
      this.notify();
    }
  }

  public static subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        console.error(e);
      }
    }
  }

  public static loadState(savedContracts: BountyContract[]): void {
    if (Array.isArray(savedContracts) && savedContracts.length > 0) {
      this.contracts = savedContracts;
    }
    this.notify();
  }

  public static saveState(): BountyContract[] {
    return [...this.contracts];
  }
}
