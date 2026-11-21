// Living Kingdom Simulation: Autonomous Settlement Growth & Inter-Settlement Trade Caravans (v7.2.0)
import { SETTLEMENT_REGISTRY } from './SettlementManager';
import { REGIONAL_COMMODITIES } from './SettlementEconomy';
import { GameEventBus } from '../events/GameEventBus';

export type CaravanMode = 'land_caravan' | 'phinisi_vessel';
export type CaravanStatus = 'en_route' | 'under_attack' | 'arrived' | 'raided';

export interface TradeCaravan {
  id: string;
  originSettlementId: string;
  destinationSettlementId: string;
  mode: CaravanMode;
  cargoCommodityId: string;
  cargoQuantity: number;
  cargoValue: number;
  progress: number; // 0..1
  speedPerSec: number;
  currentPos: [number, number, number];
  status: CaravanStatus;
  escortedByPlayerId: string | null;
  startedAt: number;
}

export interface ExpansionPlot {
  id: string;
  structureType: 'lumbung_padi' | 'pasar_rempah' | 'dermaga_phinisi' | 'menara_pengawas' | 'pendopo_agung';
  offset: [number, number, number];
  builtAt: number;
}

export interface SettlementGrowthState {
  settlementId: string;
  prosperity: number; // 0..100
  treasury: number;
  tierLevel: number; // 1..5
  completedCaravans: number;
  expansions: ExpansionPlot[];
}

const EXPANSION_SEQUENCE: Array<ExpansionPlot['structureType']> = [
  'lumbung_padi',
  'pasar_rempah',
  'dermaga_phinisi',
  'menara_pengawas',
  'pendopo_agung',
];

export class LivingKingdomManager {
  private settlements: Map<string, SettlementGrowthState> = new Map();
  private caravans: Map<string, TradeCaravan> = new Map();
  private dispatchTimer: number = 0;
  private caravanCounter: number = 0;

  constructor() {
    this.initializeSettlements();
  }

  private initializeSettlements(): void {
    for (const def of Object.values(SETTLEMENT_REGISTRY)) {
      this.settlements.set(def.id, {
        settlementId: def.id,
        prosperity: 25,
        treasury: 100,
        tierLevel: 1,
        completedCaravans: 0,
        expansions: [],
      });
    }
  }

  public getSettlementGrowth(settlementId: string): SettlementGrowthState | null {
    return this.settlements.get(settlementId) || null;
  }

  public getAllSettlementGrowth(): SettlementGrowthState[] {
    return Array.from(this.settlements.values());
  }

  public getActiveCaravans(): TradeCaravan[] {
    return Array.from(this.caravans.values()).filter((c) => c.status === 'en_route' || c.status === 'under_attack');
  }

  public getCaravan(id: string): TradeCaravan | null {
    return this.caravans.get(id) || null;
  }

  /**
   * Dispatches a trade caravan or Phinisi ship carrying regional Nusantara commodities between two settlements.
   */
  public dispatchCaravan(
    originId: string,
    destinationId: string,
    commodityId?: string,
    quantity: number = 12
  ): TradeCaravan | null {
    const origin = SETTLEMENT_REGISTRY[originId];
    const dest = SETTLEMENT_REGISTRY[destinationId];
    if (!origin || !dest || originId === destinationId) return null;

    const commodityKeys = Object.keys(REGIONAL_COMMODITIES);
    const chosenId = commodityId && REGIONAL_COMMODITIES[commodityId]
      ? commodityId
      : commodityKeys[this.caravanCounter % commodityKeys.length] || 'beras_wangi';
    const commodity = REGIONAL_COMMODITIES[chosenId];

    const dx = dest.originPos[0] - origin.originPos[0];
    const dz = dest.originPos[2] - origin.originPos[2];
    const dist = Math.max(80, Math.hypot(dx, dz));
    const isMaritime = dist > 550 || originId === 'kampung_dayak' || destinationId === 'kampung_dayak';

    const id = `caravan_${++this.caravanCounter}_${Date.now()}`;
    const caravan: TradeCaravan = {
      id,
      originSettlementId: originId,
      destinationSettlementId: destinationId,
      mode: isMaritime ? 'phinisi_vessel' : 'land_caravan',
      cargoCommodityId: chosenId,
      cargoQuantity: quantity,
      cargoValue: (commodity?.basePrice || 15) * quantity,
      progress: 0,
      speedPerSec: (isMaritime ? 24 : 16) / dist,
      currentPos: [...origin.originPos],
      status: 'en_route',
      escortedByPlayerId: null,
      startedAt: Date.now(),
    };

    this.caravans.set(id, caravan);
    GameEventBus.emit('CARAVAN_DISPATCHED', { caravan });
    return caravan;
  }

  public escortCaravan(caravanId: string, playerId: string): boolean {
    const c = this.caravans.get(caravanId);
    if (!c || (c.status !== 'en_route' && c.status !== 'under_attack')) return false;
    c.escortedByPlayerId = playerId;
    if (c.status === 'under_attack') {
      c.status = 'en_route';
    }
    return true;
  }

  public raidCaravan(caravanId: string, raiderPlayerId: string): { ok: boolean; lootValue: number; commodityId?: string } {
    const c = this.caravans.get(caravanId);
    if (!c || (c.status !== 'en_route' && c.status !== 'under_attack')) {
      return { ok: false, lootValue: 0 };
    }
    c.status = 'raided';

    // Raiding hurts origin & destination prosperity
    const originState = this.settlements.get(c.originSettlementId);
    const destState = this.settlements.get(c.destinationSettlementId);
    if (originState) originState.prosperity = Math.max(0, originState.prosperity - 12);
    if (destState) destState.prosperity = Math.max(0, destState.prosperity - 8);

    GameEventBus.emit('CARAVAN_RAIDED', { caravanId, raiderPlayerId, commodityId: c.cargoCommodityId, lootValue: c.cargoValue });
    return { ok: true, lootValue: c.cargoValue, commodityId: c.cargoCommodityId };
  }

  /**
   * Adds prosperity/treasury directly (e.g. from player barter trades or caravan arrivals)
   * and triggers autonomous village expansion when thresholds are met.
   */
  public recordEconomicBoost(settlementId: string, treasuryDelta: number, prosperityDelta: number): ExpansionPlot | null {
    const state = this.settlements.get(settlementId);
    if (!state) return null;

    state.treasury = Math.max(0, state.treasury + treasuryDelta);
    state.prosperity = Math.min(100, Math.max(0, state.prosperity + prosperityDelta));

    // Check autonomous expansion threshold
    const nextPlotIdx = state.expansions.length;
    const requiredTreasury = (nextPlotIdx + 1) * 220;
    const requiredProsperity = Math.min(90, 35 + nextPlotIdx * 15);

    if (
      nextPlotIdx < EXPANSION_SEQUENCE.length &&
      state.treasury >= requiredTreasury &&
      state.prosperity >= requiredProsperity
    ) {
      state.treasury -= Math.floor(requiredTreasury * 0.6);
      state.tierLevel = Math.min(5, state.tierLevel + 1);

      const angle = (nextPlotIdx / EXPANSION_SEQUENCE.length) * Math.PI * 2;
      const radius = 18 + nextPlotIdx * 5;
      const plot: ExpansionPlot = {
        id: `exp_${settlementId}_${nextPlotIdx + 1}`,
        structureType: EXPANSION_SEQUENCE[nextPlotIdx],
        offset: [Math.round(Math.cos(angle) * radius), 0, Math.round(Math.sin(angle) * radius)],
        builtAt: Date.now(),
      };
      state.expansions.push(plot);

      GameEventBus.emit('SETTLEMENT_AUTONOMOUS_EXPANSION', {
        settlementId,
        tierLevel: state.tierLevel,
        plot,
      });
      return plot;
    }

    return null;
  }

  /**
   * Simulation tick for moving caravans and periodically dispatching new regional trade routes.
   */
  public update(deltaTime: number): void {
    const dt = Math.min(deltaTime, 1.0);

    // 1. Advance active caravans
    for (const c of this.caravans.values()) {
      if (c.status !== 'en_route') continue;

      const origin = SETTLEMENT_REGISTRY[c.originSettlementId];
      const dest = SETTLEMENT_REGISTRY[c.destinationSettlementId];
      if (!origin || !dest) continue;

      const speedMult = c.escortedByPlayerId ? 1.25 : 1.0;
      c.progress = Math.min(1.0, c.progress + c.speedPerSec * speedMult * dt);

      c.currentPos[0] = origin.originPos[0] + (dest.originPos[0] - origin.originPos[0]) * c.progress;
      c.currentPos[1] = origin.originPos[1] + (dest.originPos[1] - origin.originPos[1]) * c.progress;
      c.currentPos[2] = origin.originPos[2] + (dest.originPos[2] - origin.originPos[2]) * c.progress;

      if (c.progress >= 1.0) {
        c.status = 'arrived';
        const escortBonus = c.escortedByPlayerId ? 1.5 : 1.0;
        const profit = Math.round(c.cargoValue * escortBonus);

        const origState = this.settlements.get(c.originSettlementId);
        const destState = this.settlements.get(c.destinationSettlementId);
        if (origState) origState.completedCaravans++;
        if (destState) destState.completedCaravans++;

        this.recordEconomicBoost(c.originSettlementId, Math.round(profit * 0.5), 10);
        this.recordEconomicBoost(c.destinationSettlementId, profit, 14);

        GameEventBus.emit('CARAVAN_ARRIVED', {
          caravanId: c.id,
          originSettlementId: c.originSettlementId,
          destinationSettlementId: c.destinationSettlementId,
          escortedByPlayerId: c.escortedByPlayerId,
          profit,
        });
      }
    }

    // 2. Periodically dispatch ambient Nusantara trade routes if fewer than 3 active
    this.dispatchTimer += dt;
    if (this.dispatchTimer >= 45.0) {
      this.dispatchTimer = 0;
      if (this.getActiveCaravans().length < 3) {
        const ids = Object.keys(SETTLEMENT_REGISTRY);
        if (ids.length >= 2) {
          const i1 = this.caravanCounter % ids.length;
          const i2 = (i1 + 2) % ids.length;
          if (i1 !== i2) {
            this.dispatchCaravan(ids[i1], ids[i2]);
          }
        }
      }
    }
  }
}
