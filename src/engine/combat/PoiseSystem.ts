// Poise, Stagger & Riposte Combat System for VoxelVerse 3.0
import { GameEventBus } from '../events/GameEventBus';

export interface EntityPoiseState {
  currentPoise: number;
  maxPoise: number;
  isStaggered: boolean;
  staggerDuration: number;
  staggerTimer: number;
  lastPoiseDamageTime: number;
  poiseRegenDelay: number;
  poiseRegenRate: number;
}

export class PoiseSystem {
  private static entityPoises: Map<string, EntityPoiseState> = new Map();
  private static playerPoise: EntityPoiseState = {
    currentPoise: 100,
    maxPoise: 100,
    isStaggered: false,
    staggerDuration: 1.5,
    staggerTimer: 0,
    lastPoiseDamageTime: 0,
    poiseRegenDelay: 2.5,
    poiseRegenRate: 35,
  };

  public static getOrCreatePoise(entityId: string, maxPoise: number = 60): EntityPoiseState {
    let entry = this.entityPoises.get(entityId);
    if (!entry) {
      entry = {
        currentPoise: maxPoise,
        maxPoise,
        isStaggered: false,
        staggerDuration: 1.8, // 1.8s vulnerable window
        staggerTimer: 0,
        lastPoiseDamageTime: 0,
        poiseRegenDelay: 3.0,
        poiseRegenRate: 25,
      };
      this.entityPoises.set(entityId, entry);
    }
    return entry;
  }

  public static applyPoiseDamage(
    entityId: string,
    poiseDamage: number,
    maxPoise: number = 60
  ): { staggered: boolean; remainingPoise: number } {
    const entry = this.getOrCreatePoise(entityId, maxPoise);
    entry.lastPoiseDamageTime = Date.now();

    if (entry.isStaggered) {
      return { staggered: true, remainingPoise: 0 };
    }

    entry.currentPoise = Math.max(0, entry.currentPoise - poiseDamage);

    if (entry.currentPoise <= 0) {
      entry.isStaggered = true;
      entry.staggerTimer = entry.staggerDuration;
      GameEventBus.emit('ENTITY_STAGGERED', { entityId, duration: entry.staggerDuration });
      return { staggered: true, remainingPoise: 0 };
    }

    return { staggered: false, remainingPoise: entry.currentPoise };
  }

  public static applyPlayerPoiseDamage(poiseDamage: number): { staggered: boolean; remainingPoise: number } {
    this.playerPoise.lastPoiseDamageTime = Date.now();
    if (this.playerPoise.isStaggered) {
      return { staggered: true, remainingPoise: 0 };
    }

    this.playerPoise.currentPoise = Math.max(0, this.playerPoise.currentPoise - poiseDamage);
    if (this.playerPoise.currentPoise <= 0) {
      this.playerPoise.isStaggered = true;
      this.playerPoise.staggerTimer = this.playerPoise.staggerDuration;
      GameEventBus.emit('PLAYER_STAGGERED', { duration: this.playerPoise.staggerDuration });
      return { staggered: true, remainingPoise: 0 };
    }

    return { staggered: false, remainingPoise: this.playerPoise.currentPoise };
  }

  public static isEntityStaggered(entityId: string): boolean {
    const entry = this.entityPoises.get(entityId);
    return entry ? entry.isStaggered : false;
  }

  public static isPlayerStaggered(): boolean {
    return this.playerPoise.isStaggered;
  }

  public static getPlayerPoise(): { current: number; max: number; isStaggered: boolean } {
    return {
      current: this.playerPoise.currentPoise,
      max: this.playerPoise.maxPoise,
      isStaggered: this.playerPoise.isStaggered,
    };
  }

  public static update(deltaTime: number): void {
    const now = Date.now();

    // Update Player Poise
    if (this.playerPoise.isStaggered) {
      this.playerPoise.staggerTimer -= deltaTime;
      if (this.playerPoise.staggerTimer <= 0) {
        this.playerPoise.isStaggered = false;
        this.playerPoise.currentPoise = this.playerPoise.maxPoise;
      }
    } else {
      if (now - this.playerPoise.lastPoiseDamageTime > this.playerPoise.poiseRegenDelay * 1000) {
        this.playerPoise.currentPoise = Math.min(
          this.playerPoise.maxPoise,
          this.playerPoise.currentPoise + this.playerPoise.poiseRegenRate * deltaTime
        );
      }
    }

    // Update Entities Poise
    for (const [entityId, entry] of this.entityPoises.entries()) {
      if (entry.isStaggered) {
        entry.staggerTimer -= deltaTime;
        if (entry.staggerTimer <= 0) {
          entry.isStaggered = false;
          entry.currentPoise = entry.maxPoise;
        }
      } else {
        if (now - entry.lastPoiseDamageTime > entry.poiseRegenDelay * 1000) {
          entry.currentPoise = Math.min(
            entry.maxPoise,
            entry.currentPoise + entry.poiseRegenRate * deltaTime
          );
        }
      }
    }
  }

  public static removeEntity(entityId: string): void {
    this.entityPoises.delete(entityId);
  }

  public static clear(): void {
    this.entityPoises.clear();
    this.playerPoise.currentPoise = this.playerPoise.maxPoise;
    this.playerPoise.isStaggered = false;
  }
}
