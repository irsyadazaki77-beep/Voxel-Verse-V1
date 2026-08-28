import { GameEventBus } from '../events/GameEventBus';

export class GameStatsManager {
  private stats: {
    blocksMined: number;
    blocksPlaced: number;
    monstersDefeated: number;
    distanceTraveled: number;
  };

  private unsubscribeFunctions: (() => void)[] = [];

  constructor(initialStats?: { blocksMined: number; blocksPlaced: number; monstersDefeated: number; distanceTraveled: number }) {
    this.stats = initialStats || {
      blocksMined: 0,
      blocksPlaced: 0,
      monstersDefeated: 0,
      distanceTraveled: 0,
    };
  }

  public initialize() {
    this.unsubscribeFunctions.push(GameEventBus.on('BLOCK_MINED', () => {
      this.stats.blocksMined += 1;
    }));

    this.unsubscribeFunctions.push(GameEventBus.on('BLOCK_PLACED', () => {
      this.stats.blocksPlaced += 1;
    }));

    this.unsubscribeFunctions.push(GameEventBus.on('ENTITY_KILLED', () => {
      this.stats.monstersDefeated += 1;
    }));
  }

  public addDistance(dist: number) {
    this.stats.distanceTraveled += dist;
  }

  public getStats() {
    return { ...this.stats };
  }

  public dispose() {
    this.unsubscribeFunctions.forEach(unsub => unsub());
    this.unsubscribeFunctions = [];
  }
}
