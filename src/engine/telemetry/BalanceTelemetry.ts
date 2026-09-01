// Balance & Retention Telemetry Engine for VoxelVerse Production
import { GameEventBus } from '../events/GameEventBus';

export interface CombatTelemetry {
  totalAttacks: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  criticalHits: number;
  combosCompleted: number;
  parryAttempts: number;
  parrySuccesses: number;
  staggersInflicted: number;
  ripostesExecuted: number;
  dodgeCount: number;
  killsByMob: Record<string, number>;
  bossKills: Record<string, number>;
}

export interface PacingMilestones {
  timeToFirstToolSec: number | null;
  timeToFirstWeaponSec: number | null;
  timeToFirstFurnaceSec: number | null;
  timeToFirstIngotSec: number | null;
  timeToFirstArmorSec: number | null;
  timeToFirstDungeonSec: number | null;
  timeToFirstBossKillSec: number | null;
  timeToFirstSettlementUpgradeSec: number | null;
}

export interface SurvivalTelemetry {
  totalDeaths: number;
  deathsByCause: Record<string, number>;
  hungerDepletions: number;
  foodConsumedCount: number;
  potionsConsumedCount: number;
  freezingEvents: number;
  drowningEvents: number;
}

export interface EconomyTelemetry {
  blocksMinedTotal: number;
  blocksMinedByTier: Record<string, number>;
  itemsCraftedCount: number;
  tradesCompleted: number;
  bountiesCompleted: number;
  treasureCachesFound: number;
  anomaliesResolved: number;
  dungeonsCleared: number;
}

export interface BalanceTelemetryData {
  sessionId: string;
  totalPlaytimeSeconds: number;
  milestones: PacingMilestones;
  combat: CombatTelemetry;
  survival: SurvivalTelemetry;
  economy: EconomyTelemetry;
}

export class BalanceTelemetry {
  private static data: BalanceTelemetryData = {
    sessionId: `session_${Date.now()}`,
    totalPlaytimeSeconds: 0,
    milestones: {
      timeToFirstToolSec: null,
      timeToFirstWeaponSec: null,
      timeToFirstFurnaceSec: null,
      timeToFirstIngotSec: null,
      timeToFirstArmorSec: null,
      timeToFirstDungeonSec: null,
      timeToFirstBossKillSec: null,
      timeToFirstSettlementUpgradeSec: null,
    },
    combat: {
      totalAttacks: 0,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      criticalHits: 0,
      combosCompleted: 0,
      parryAttempts: 0,
      parrySuccesses: 0,
      staggersInflicted: 0,
      ripostesExecuted: 0,
      dodgeCount: 0,
      killsByMob: {},
      bossKills: {},
    },
    survival: {
      totalDeaths: 0,
      deathsByCause: {},
      hungerDepletions: 0,
      foodConsumedCount: 0,
      potionsConsumedCount: 0,
      freezingEvents: 0,
      drowningEvents: 0,
    },
    economy: {
      blocksMinedTotal: 0,
      blocksMinedByTier: {},
      itemsCraftedCount: 0,
      tradesCompleted: 0,
      bountiesCompleted: 0,
      treasureCachesFound: 0,
      anomaliesResolved: 0,
      dungeonsCleared: 0,
    },
  };

  private static isInitialized: boolean = false;
  private static listeners: (() => void)[] = [];

  public static initialize(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Listen to GameEventBus events for automated passive tracking
    GameEventBus.on('ENTITY_KILLED', (payload) => {
      if (payload && payload.modelType) {
        this.data.combat.killsByMob[payload.modelType] = (this.data.combat.killsByMob[payload.modelType] || 0) + 1;
      }
    });

    GameEventBus.on('BOSS_DEFEATED', (payload) => {
      const bossName = payload?.bossName || 'Unknown Boss';
      this.data.combat.bossKills[bossName] = (this.data.combat.bossKills[bossName] || 0) + 1;
      if (this.data.milestones.timeToFirstBossKillSec === null) {
        this.data.milestones.timeToFirstBossKillSec = Math.round(this.data.totalPlaytimeSeconds);
      }
    });

    GameEventBus.on('DUNGEON_CLEARED', () => {
      this.data.economy.dungeonsCleared += 1;
      if (this.data.milestones.timeToFirstDungeonSec === null) {
        this.data.milestones.timeToFirstDungeonSec = Math.round(this.data.totalPlaytimeSeconds);
      }
    });

    GameEventBus.on('ANOMALY_RESOLVED', () => {
      this.data.economy.anomaliesResolved += 1;
    });

    GameEventBus.on('TREASURE_CACHE_DISCOVERED', () => {
      this.data.economy.treasureCachesFound += 1;
    });

    GameEventBus.on('CONTRACT_COMPLETED', () => {
      this.data.economy.bountiesCompleted += 1;
    });
  }

  public static update(deltaTime: number): void {
    this.data.totalPlaytimeSeconds += deltaTime;
  }

  public static recordAttack(damage: number, isCritical: boolean, comboIndex: number, isRiposte: boolean): void {
    this.data.combat.totalAttacks += 1;
    this.data.combat.totalDamageDealt += damage;
    if (isCritical) this.data.combat.criticalHits += 1;
    if (comboIndex >= 2) this.data.combat.combosCompleted += 1;
    if (isRiposte) this.data.combat.ripostesExecuted += 1;
    this.notify();
  }

  public static recordDamageTaken(amount: number, source: string): void {
    this.data.combat.totalDamageTaken += amount;
    this.notify();
  }

  public static recordParry(success: boolean): void {
    this.data.combat.parryAttempts += 1;
    if (success) this.data.combat.parrySuccesses += 1;
    this.notify();
  }

  public static recordStagger(): void {
    this.data.combat.staggersInflicted += 1;
    this.notify();
  }

  public static recordDodge(): void {
    this.data.combat.dodgeCount += 1;
  }

  public static recordDeath(cause: string): void {
    this.data.survival.totalDeaths += 1;
    this.data.survival.deathsByCause[cause] = (this.data.survival.deathsByCause[cause] || 0) + 1;
    this.notify();
  }

  public static recordCraft(itemId: string): void {
    this.data.economy.itemsCraftedCount += 1;
    const now = Math.round(this.data.totalPlaytimeSeconds);

    if (itemId.includes('pickaxe') || itemId.includes('axe') || itemId.includes('shovel')) {
      if (this.data.milestones.timeToFirstToolSec === null) {
        this.data.milestones.timeToFirstToolSec = now;
      }
    }
    if (itemId.includes('sword') || itemId.includes('blade') || itemId.includes('bow')) {
      if (this.data.milestones.timeToFirstWeaponSec === null) {
        this.data.milestones.timeToFirstWeaponSec = now;
      }
    }
    if (itemId === 'furnace') {
      if (this.data.milestones.timeToFirstFurnaceSec === null) {
        this.data.milestones.timeToFirstFurnaceSec = now;
      }
    }
    if (itemId.includes('helmet') || itemId.includes('tunic') || itemId.includes('pants') || itemId.includes('boots') || itemId.includes('chestplate')) {
      if (this.data.milestones.timeToFirstArmorSec === null) {
        this.data.milestones.timeToFirstArmorSec = now;
      }
    }
    this.notify();
  }

  public static recordSmelt(itemId: string): void {
    if (itemId.includes('ingot')) {
      if (this.data.milestones.timeToFirstIngotSec === null) {
        this.data.milestones.timeToFirstIngotSec = Math.round(this.data.totalPlaytimeSeconds);
      }
    }
    this.notify();
  }

  public static recordMineBlock(blockCategory: string): void {
    this.data.economy.blocksMinedTotal += 1;
    this.data.economy.blocksMinedByTier[blockCategory] = (this.data.economy.blocksMinedByTier[blockCategory] || 0) + 1;
  }

  public static recordTrade(): void {
    this.data.economy.tradesCompleted += 1;
    this.notify();
  }

  public static recordSettlementUpgrade(): void {
    if (this.data.milestones.timeToFirstSettlementUpgradeSec === null) {
      this.data.milestones.timeToFirstSettlementUpgradeSec = Math.round(this.data.totalPlaytimeSeconds);
    }
    this.notify();
  }

  public static recordFoodConsumed(isPotion: boolean = false): void {
    if (isPotion) {
      this.data.survival.potionsConsumedCount += 1;
    } else {
      this.data.survival.foodConsumedCount += 1;
    }
  }

  public static getData(): BalanceTelemetryData {
    return JSON.parse(JSON.stringify(this.data));
  }

  public static getReportSummary(): {
    playtimeFormatted: string;
    parryRateFormatted: string;
    combatSummary: string;
    pacingSummary: string;
    survivalHealthRatio: number;
  } {
    const d = this.data;
    const mins = Math.floor(d.totalPlaytimeSeconds / 60);
    const secs = Math.floor(d.totalPlaytimeSeconds % 60);
    const playtimeFormatted = `${mins}m ${secs}s`;

    const parryRate = d.combat.parryAttempts > 0 ? (d.combat.parrySuccesses / d.combat.parryAttempts) * 100 : 0;
    const parryRateFormatted = `${parryRate.toFixed(1)}% (${d.combat.parrySuccesses}/${d.combat.parryAttempts})`;

    const combatSummary = `${d.combat.totalAttacks} attacks, ${Math.round(d.combat.totalDamageDealt)} dmg dealt, ${d.combat.criticalHits} crits, ${d.combat.staggersInflicted} staggers`;
    
    const p1 = d.milestones.timeToFirstToolSec !== null ? `${d.milestones.timeToFirstToolSec}s` : 'Pending';
    const p2 = d.milestones.timeToFirstIngotSec !== null ? `${d.milestones.timeToFirstIngotSec}s` : 'Pending';
    const p3 = d.milestones.timeToFirstDungeonSec !== null ? `${d.milestones.timeToFirstDungeonSec}s` : 'Pending';
    const pacingSummary = `Tool: ${p1} | Ingot: ${p2} | Dungeon: ${p3}`;

    const survivalHealthRatio = d.combat.totalDamageTaken > 0 ? Math.min(5, d.combat.totalDamageDealt / d.combat.totalDamageTaken) : 1.0;

    return {
      playtimeFormatted,
      parryRateFormatted,
      combatSummary,
      pacingSummary,
      survivalHealthRatio,
    };
  }

  public static subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private static notify(): void {
    this.listeners.forEach(cb => cb());
  }
}
