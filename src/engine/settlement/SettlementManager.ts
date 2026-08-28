// Settlement Manager: Regional Hamlet Identities, NPC Roles, Conditional Dialogues & Trade Bartering
import { SettlementDef, WorldTierId } from '../../types';

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

export class SettlementManager {
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

  // Get dynamic dialogue options based on player quest progress and reputation
  public static getNPCDialogue(npcId: string, questCompleted: boolean = false): { name: string; lines: string[]; trades?: any[] } {
    if (npcId.includes('torvald') || npcId === 'merchant') {
      return {
        name: 'Torvald the Nomadic Merchant',
        lines: [
          'Ah, greetings traveler! Safe haven is hard to come by beyond the plains.',
          'Bring me cured timber and copper ore, and I shall provide fresh rations and forged tools.',
          'Beware the ancient crypts to the east—the stone sentinels do not welcome wanderers.',
        ],
        trades: [
          { give: { itemId: 'wood_planks', count: 16 }, receive: { itemId: 'bread', count: 8 } },
          { give: { itemId: 'copper_ingot', count: 4 }, receive: { itemId: 'seeds_wheat', count: 8 } },
          { give: { itemId: 'gold_ingot', count: 2 }, receive: { itemId: 'potion_healing', count: 2 } },
        ],
      };
    }

    if (npcId.includes('bryan') || npcId.includes('elder')) {
      return {
        name: 'Elder Bryan of Suncrest',
        lines: [
          'The harvest thrives this season, yet the nocturnal shadows creep closer each dusk.',
          'If you help thin the Stalkers prowling our boundary fences, our granaries are open to you.',
        ],
        trades: [
          { give: { itemId: 'oak_log', count: 8 }, receive: { itemId: 'torch', count: 16 } },
          { give: { itemId: 'seeds_wheat', count: 12 }, receive: { itemId: 'bread', count: 6 } },
        ],
      };
    }

    if (npcId.includes('alistair') || npcId.includes('warden')) {
      return {
        name: 'Warden Alistair the Scout',
        lines: [
          'Stand vigilant, explorer. The deep stratum holds riches of mythril, but slumbering sentinels guard the halls.',
          'Ensure your pickaxe is reinforced before delving into the crystalline vaults.',
        ],
        trades: [
          { give: { itemId: 'iron_ingot', count: 6 }, receive: { itemId: 'iron_pickaxe', count: 1 } },
          { give: { itemId: 'aether_crystal', count: 4 }, receive: { itemId: 'potion_strength', count: 1 } },
        ],
      };
    }

    return {
      name: 'Pioneer Settler',
      lines: ['The frontier is vast and full of forgotten mysteries. Travel safely!'],
    };
  }
}
