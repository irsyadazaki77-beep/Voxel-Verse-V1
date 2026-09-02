// Dynamic Bounty & Hunting Contract System for VoxelVerse 3.0
import { GameEventBus } from '../events/GameEventBus';
import { BountyContract, ContractCategory, ContractStatus } from '../../types';
import { SETTLEMENT_REGISTRY } from '../settlement/SettlementManager';

export type { ContractCategory, ContractStatus, BountyContract };

export const INITIAL_BOUNTY_CONTRACTS: BountyContract[] = [
  {
    id: 'bounty_stalker_pack',
    title: 'Purge the Shadow Prowlers',
    category: 'monster_hunt',
    issuerSettlementId: 'suncrest_hamlet',
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
    issuerSettlementId: 'ferrite_outpost',
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
    issuerSettlementId: 'ferrite_outpost',
    description: 'A rogue Precursor Ruin Sentinel is patrolling the basalt ruins. Slay it and retrieve its mechanical core.',
    targetType: 'ruin_sentinel',
    targetCount: 1,
    currentCount: 0,
    status: 'available',
    rewards: {
      xp: 450,
      credits: 200,
      reputation: 60,
      itemReward: { itemId: 'ancient_alloy', count: 2 },
    },
    dangerStars: 4,
  },
  {
    id: 'bounty_deep_mythril',
    title: 'Deep Vein Excavation',
    category: 'expedition',
    issuerSettlementId: 'ferrite_outpost',
    description: 'Mine precious Mythril ore from deep subterranean caverns beneath Y=30.',
    targetType: 'mythril_ore',
    targetCount: 5,
    currentCount: 0,
    status: 'available',
    rewards: {
      xp: 220,
      credits: 110,
      reputation: 35,
      itemReward: { itemId: 'gold_ingot', count: 4 },
    },
    dangerStars: 3,
  },
];

export class BountyContractManager {
  private static contracts: BountyContract[] = JSON.parse(JSON.stringify(INITIAL_BOUNTY_CONTRACTS));
  private static listeners: (() => void)[] = [];
  private static unsubscribers: (() => void)[] = [];

  public static initialize(savedContracts?: BountyContract[]): void {
    this.dispose();

    if (Array.isArray(savedContracts) && savedContracts.length > 0) {
      this.contracts = JSON.parse(JSON.stringify(savedContracts));
    } else {
      this.contracts = JSON.parse(JSON.stringify(INITIAL_BOUNTY_CONTRACTS));
    }

    // Listen for monster kills
    const unEntity = GameEventBus.on('ENTITY_KILLED', (e) => {
      if (e?.modelType) {
        this.progressContracts('monster_hunt', e.modelType, 1);
      }
    });
    this.unsubscribers.push(unEntity);

    // Listen for block mining
    const unBlock = GameEventBus.on('BLOCK_MINED', (e: any) => {
      if (e?.toolUsed || e?.blockType) {
        this.progressContracts('expedition', String(e.blockType || ''), 1);
      }
    });
    this.unsubscribers.push(unBlock);

    // Listen for item collections
    const unItem = GameEventBus.on('ITEM_COLLECTED', (e) => {
      if (e?.itemId) {
        this.progressContracts('foraging', e.itemId, e.count || 1);
        this.progressContracts('expedition', e.itemId, e.count || 1);
      }
    });
    this.unsubscribers.push(unItem);
  }

  public static dispose(): void {
    this.unsubscribers.forEach(un => un());
    this.unsubscribers = [];
    this.listeners = [];
    this.contracts = [];
  }

  public static getContracts(): BountyContract[] {
    return this.contracts;
  }

  public static getSettlementName(settlementId: string): string {
    return SETTLEMENT_REGISTRY[settlementId]?.name || settlementId;
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
      if (contract.issuerSettlementId && contract.rewards?.reputation) {
        GameEventBus.emit('REPUTATION_GAINED', {
          settlementId: contract.issuerSettlementId,
          amount: contract.rewards.reputation,
        });
      }
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
      this.contracts = JSON.parse(JSON.stringify(savedContracts));
    }
    this.notify();
  }

  public static saveState(): BountyContract[] {
    return JSON.parse(JSON.stringify(this.contracts));
  }
}
