// Settlement Manager: Regional Hamlet Identities, NPC Roles, Conditional Dialogues, Barter Trading & Reputation Levels
import { SettlementDef, WorldTierId } from '../../types';
import { GameEventBus } from '../events/GameEventBus';
import { NotificationManager } from '../ui/NotificationManager';

export interface SettlementState {
  level: number; // 1 to 5
  reputation: number; // -100 to 100
}

export const SETTLEMENT_REGISTRY: Record<string, SettlementDef> = {
  haven_camp: {
    id: 'haven_camp',
    name: 'Haven Pioneer Camp',
    biomeId: 'plains',
    tier: 'tier1_haven',
    originPos: [8, 64, 8],
    npcIds: ['torvald_merchant'],
    services: ['trade', 'quest', 'craft', 'rest'],
  },
  suncrest_hamlet: {
    id: 'suncrest_hamlet',
    name: 'Suncrest Agricultural Hamlet',
    biomeId: 'forest',
    tier: 'tier2_frontier',
    originPos: [320, 68, 280],
    npcIds: ['elder_bryan', 'farmer_elena'],
    services: ['trade', 'quest', 'craft'],
  },
  ferrite_outpost: {
    id: 'ferrite_outpost',
    name: 'Ferrite Crags Mining Bastion',
    biomeId: 'taiga',
    tier: 'tier3_ancient',
    originPos: [650, 75, -500],
    npcIds: ['blacksmith_brom', 'warden_alistair'],
    services: ['trade', 'craft'],
  },
};

export interface UpgradeRequirement {
  itemId: string;
  count: number;
}

export class SettlementManager {
  private static states: Map<string, SettlementState> = new Map();

  public static initialize(savedProgress?: { [id: string]: SettlementState }): void {
    this.states.clear();
    Object.keys(SETTLEMENT_REGISTRY).forEach(id => {
      this.states.set(id, { level: 1, reputation: 0 });
    });

    if (savedProgress) {
      Object.entries(savedProgress).forEach(([id, state]) => {
        if (SETTLEMENT_REGISTRY[id]) {
          this.states.set(id, {
            level: state.level || 1,
            reputation: state.reputation !== undefined ? state.reputation : 0
          });
        }
      });
    }
  }

  public static getSettlementState(id: string): SettlementState {
    if (!this.states.has(id)) {
      this.states.set(id, { level: 1, reputation: 0 });
    }
    return this.states.get(id)!;
  }

  public static getReputationLevel(id: string): 'hostile' | 'neutral' | 'friendly' | 'trusted' | 'honored' {
    const rep = this.getSettlementState(id).reputation;
    if (rep < -30) return 'hostile';
    if (rep < 20) return 'neutral';
    if (rep < 50) return 'friendly';
    if (rep < 80) return 'trusted';
    return 'honored';
  }

  public static getReputationColor(repLevel: string): string {
    switch (repLevel) {
      case 'hostile': return 'text-red-400';
      case 'neutral': return 'text-zinc-400';
      case 'friendly': return 'text-emerald-400';
      case 'trusted': return 'text-sky-400';
      case 'honored': return 'text-amber-400';
      default: return 'text-zinc-400';
    }
  }

  public static getReputationName(repLevel: string): string {
    switch (repLevel) {
      case 'hostile': return 'Hostile';
      case 'neutral': return 'Neutral';
      case 'friendly': return 'Friendly';
      case 'trusted': return 'Trusted';
      case 'honored': return 'Honored';
      default: return 'Neutral';
    }
  }

  public static addReputation(id: string, amount: number): void {
    const state = this.getSettlementState(id);
    const oldLevel = this.getReputationLevel(id);
    state.reputation = Math.max(-100, Math.min(100, state.reputation + amount));
    const newLevel = this.getReputationLevel(id);

    NotificationManager.push({
      title: 'Reputation Changed',
      message: `${SETTLEMENT_REGISTRY[id]?.name || id}: ${amount > 0 ? '+' : ''}${amount} Reputation (${this.getReputationName(newLevel)})`,
      priority: 'MEDIUM',
      icon: amount > 0 ? '🤝' : '⚠️',
      durationMs: 5000,
    });

    if (oldLevel !== newLevel) {
      GameEventBus.emit('WORLD_EVENT_TRIGGERED', {
        eventType: 'reputation_level_up',
        eventName: `Reputation with ${SETTLEMENT_REGISTRY[id]?.name || id} is now ${this.getReputationName(newLevel)}!`
      });
    }
  }

  public static getUpgradeRequirements(id: string, currentLevel: number): UpgradeRequirement[] {
    if (currentLevel >= 5) return [];
    switch (currentLevel) {
      case 1: // Campfire -> Blacksmith
        return [
          { itemId: 'wood_planks', count: 16 },
          { itemId: 'copper_ingot', count: 8 }
        ];
      case 2: // Blacksmith -> Portal
        return [
          { itemId: 'iron_ingot', count: 12 },
          { itemId: 'coal', count: 16 }
        ];
      case 3: // Portal -> Defensive Wall
        return [
          { itemId: 'stone_bricks', count: 24 },
          { itemId: 'mythril_ingot', count: 8 }
        ];
      case 4: // Defensive Wall -> Grand Terminal
        return [
          { itemId: 'aether_crystal', count: 12 },
          { itemId: 'ancient_alloy', count: 2 }
        ];
      default:
        return [];
    }
  }

  public static upgradeSettlement(id: string): boolean {
    const state = this.getSettlementState(id);
    if (state.level >= 5) return false;

    state.level += 1;
    this.addReputation(id, 25); // Gain reputation for helping upgrade

    NotificationManager.push({
      title: 'Settlement Upgraded!',
      message: `${SETTLEMENT_REGISTRY[id]?.name || id} has reached Level ${state.level}! New features and trades unlocked.`,
      priority: 'HIGH',
      icon: '🏢',
      durationMs: 8000,
    });

    GameEventBus.emit('WORLD_EVENT_TRIGGERED', {
      eventType: 'settlement_upgraded',
      eventName: `${SETTLEMENT_REGISTRY[id]?.name || id} upgraded to Level ${state.level}`
    });

    return true;
  }

  public static getSettlementByPos(wx: number, wz: number): SettlementDef | null {
    for (const s of Object.values(SETTLEMENT_REGISTRY)) {
      const dx = s.originPos[0] - wx;
      const dz = s.originPos[2] - wz;
      if (dx * dx + dz * dz < 80 * 80) {
        return s;
      }
    }
    return null;
  }

  public static getNPCDialogue(
    npcId: string, 
    questCompleted: boolean = false, 
    settlementId?: string
  ): { name: string; role: string; lines: string[]; trades?: any[] } {
    const sId = settlementId || 'haven_camp';
    const state = this.getSettlementState(sId);
    const repLevel = this.getReputationLevel(sId);

    // Hostile NPCs won't trade and have hostile dialogs
    if (repLevel === 'hostile') {
      return {
        name: npcId.includes('torvald') ? 'Torvald the Nomadic Merchant' : npcId.includes('bryan') ? 'Elder Bryan' : npcId.includes('alistair') ? 'Warden Alistair' : 'Pioneer Settler',
        role: npcId.includes('torvald') ? 'merchant' : npcId.includes('bryan') ? 'elder' : npcId.includes('alistair') ? 'warden' : 'settler',
        lines: [
          'Away with you, outcast! Your actions have turned us against you.',
          'We do not trade with those who disrupt our peace.',
        ],
        trades: [],
      };
    }

    const discountMultiplier = repLevel === 'friendly' ? 0.9 : repLevel === 'trusted' ? 0.8 : repLevel === 'honored' ? 0.7 : 1.0;

    // Apply discount to trades
    const applyDiscount = (trades: any[]) => {
      return trades.map(t => {
        const discountedGiveCount = Math.max(1, Math.round(t.give.count * discountMultiplier));
        return {
          give: { itemId: t.give.itemId, count: discountedGiveCount },
          receive: t.receive
        };
      });
    };

    if (npcId.includes('torvald') || npcId === 'merchant' || npcId.includes('merchant')) {
      const baseTrades = [
        { give: { itemId: 'wood_planks', count: 16 }, receive: { itemId: 'bread', count: 8 } },
        { give: { itemId: 'copper_ingot', count: 4 }, receive: { itemId: 'seeds_wheat', count: 8 } },
        { give: { itemId: 'gold_ingot', count: 2 }, receive: { itemId: 'healing_potion', count: 2 } },
      ];

      // Unlock extra trades as settlement levels up
      if (state.level >= 2) {
        baseTrades.push({ give: { itemId: 'iron_ingot', count: 4 }, receive: { itemId: 'swiftness_potion', count: 2 } });
      }
      if (state.level >= 3) {
        baseTrades.push({ give: { itemId: 'mythril_ingot', count: 2 }, receive: { itemId: 'gold_block', count: 1 } });
      }
      if (state.level >= 5) {
        baseTrades.push({ give: { itemId: 'aether_crystal', count: 8 }, receive: { itemId: 'ancient_alloy', count: 1 } });
      }

      return {
        name: 'Torvald the Nomadic Merchant',
        role: 'merchant',
        lines: [
          `Greetings traveler! Safe haven is hard to come by beyond the plains.`,
          `This settlement is currently at Level ${state.level}. ${state.level < 5 ? 'Help us upgrade to unlock deeper wares!' : 'We have achieved our pinnacle growth!'}`,
          repLevel !== 'neutral' ? `Your standing here as a ${this.getReputationName(repLevel)} ally grants you a discount on barters!` : 'Bring me timber and copper ore, and I shall barter with you.',
        ],
        trades: applyDiscount(baseTrades),
      };
    }

    if (npcId.includes('bryan') || npcId.includes('elder')) {
      const baseTrades = [
        { give: { itemId: 'oak_log', count: 8 }, receive: { itemId: 'torch', count: 16 } },
        { give: { itemId: 'seeds_wheat', count: 12 }, receive: { itemId: 'bread', count: 6 } },
      ];

      if (state.level >= 2) {
        baseTrades.push({ give: { itemId: 'coal', count: 12 }, receive: { itemId: 'lantern', count: 3 } });
      }
      if (state.level >= 3) {
        baseTrades.push({ give: { itemId: 'iron_ingot', count: 6 }, receive: { itemId: 'cooked_meat', count: 10 } });
      }

      return {
        name: 'Elder Bryan of Suncrest',
        role: 'elder',
        lines: [
          'The harvest thrives this season, yet the nocturnal shadows creep closer each dusk.',
          `Help us build defenses and secure Suncrest Agricultural Hamlet (Level ${state.level}).`,
          'Our doors are always open to helpful souls of the realm.',
        ],
        trades: applyDiscount(baseTrades),
      };
    }

    if (npcId.includes('alistair') || npcId.includes('warden')) {
      const baseTrades = [
        { give: { itemId: 'iron_ingot', count: 6 }, receive: { itemId: 'iron_pickaxe', count: 1 } },
        { give: { itemId: 'aether_crystal', count: 4 }, receive: { itemId: 'swiftness_potion', count: 2 } },
      ];

      if (state.level >= 3) {
        baseTrades.push({ give: { itemId: 'mythril_ingot', count: 5 }, receive: { itemId: 'mythril_pickaxe', count: 1 } });
      }
      if (state.level >= 5) {
        baseTrades.push({ give: { itemId: 'ancient_alloy', count: 1 }, receive: { itemId: 'mythril_chestplate', count: 1 } });
      }

      return {
        name: 'Warden Alistair the Scout',
        role: 'warden',
        lines: [
          'Stand vigilant, explorer. The deep stratum holds riches of mythril, but slumbering sentinels guard the halls.',
          `Keep our Bastion Outpost (Level ${state.level}) fortified against the deep cavern horrors.`,
        ],
        trades: applyDiscount(baseTrades),
      };
    }

    return {
      name: 'Pioneer Settler',
      role: 'settler',
      lines: ['The frontier is vast and full of forgotten mysteries. Travel safely!'],
    };
  }

  public static serialize(): { [id: string]: SettlementState } {
    const data: { [id: string]: SettlementState } = {};
    this.states.forEach((val, key) => {
      data[key] = val;
    });
    return data;
  }
}
