// Roguelike Dungeon Expeditions & Sigil Mutator Engine for VoxelVerse 3.0
import { GameEventBus } from '../events/GameEventBus';

export interface DungeonModifier {
  id: string;
  name: string;
  description: string;
  enemyHealthMultiplier: number;
  enemyDamageMultiplier: number;
  lootDropMultiplier: number;
  rareRelicChanceBonus: number;
  hazardEffect?: 'blazing_floors' | 'aether_storm' | 'void_fog' | 'armored_horde';
}

export const EXPEDITION_MODIFIERS: DungeonModifier[] = [
  {
    id: 'mod_aether_surge',
    name: 'Aether Ley Surge',
    description: 'Enemies move 30% faster, but drops provide +60% Aether Crystals and XP.',
    enemyHealthMultiplier: 1.2,
    enemyDamageMultiplier: 1.3,
    lootDropMultiplier: 1.6,
    rareRelicChanceBonus: 0.25,
    hazardEffect: 'aether_storm',
  },
  {
    id: 'mod_ironclad',
    name: 'Ironclad Colossus Vault',
    description: 'Enemies have 2x Poise and heavy armor, but treasure chests yield double Ferrite and Mythril.',
    enemyHealthMultiplier: 1.5,
    enemyDamageMultiplier: 1.2,
    lootDropMultiplier: 2.0,
    rareRelicChanceBonus: 0.35,
    hazardEffect: 'armored_horde',
  },
  {
    id: 'mod_void_corruption',
    name: 'Abyssal Void Cataclysm',
    description: 'Void fog covers the chambers. Defeating the boss guarantees an Ancient Relic.',
    enemyHealthMultiplier: 1.8,
    enemyDamageMultiplier: 1.6,
    lootDropMultiplier: 2.5,
    rareRelicChanceBonus: 0.75,
    hazardEffect: 'void_fog',
  },
];

export interface ExpeditionRunState {
  isActive: boolean;
  dungeonId: string;
  modifier: DungeonModifier | null;
  roomsCleared: number;
  totalRooms: number;
  lootCollectedCount: number;
  bossDefeated: boolean;
}

export class DungeonExpeditionManager {
  public static currentExpedition: ExpeditionRunState = {
    isActive: false,
    dungeonId: '',
    modifier: null,
    roomsCleared: 0,
    totalRooms: 5,
    lootCollectedCount: 0,
    bossDefeated: false,
  };

  private static listeners: (() => void)[] = [];

  public static initialize(savedExpedition?: ExpeditionRunState | null): void {
    this.dispose();
    if (savedExpedition) {
      this.loadState(savedExpedition);
    } else {
      this.currentExpedition = {
        isActive: false,
        dungeonId: '',
        modifier: null,
        roomsCleared: 0,
        totalRooms: 5,
        lootCollectedCount: 0,
        bossDefeated: false,
      };
    }
  }

  public static dispose(): void {
    this.listeners = [];
    this.currentExpedition = {
      isActive: false,
      dungeonId: '',
      modifier: null,
      roomsCleared: 0,
      totalRooms: 5,
      lootCollectedCount: 0,
      bossDefeated: false,
    };
  }

  public static loadState(state: ExpeditionRunState | null): void {
    if (state) {
      this.currentExpedition = JSON.parse(JSON.stringify(state));
    } else {
      this.currentExpedition = {
        isActive: false,
        dungeonId: '',
        modifier: null,
        roomsCleared: 0,
        totalRooms: 5,
        lootCollectedCount: 0,
        bossDefeated: false,
      };
    }
    this.notify();
  }

  public static getExpeditionState(): ExpeditionRunState {
    return this.currentExpedition;
  }

  public static saveState(): ExpeditionRunState | null {
    return this.currentExpedition.isActive ? JSON.parse(JSON.stringify(this.currentExpedition)) : null;
  }

  public static startExpedition(dungeonId: string, modifierId?: string): ExpeditionRunState {
    const mod = EXPEDITION_MODIFIERS.find(m => m.id === modifierId) || null;
    this.currentExpedition = {
      isActive: true,
      dungeonId,
      modifier: mod,
      roomsCleared: 0,
      totalRooms: 5,
      lootCollectedCount: 0,
      bossDefeated: false,
    };
    this.notify();
    GameEventBus.emit('EXPEDITION_STARTED', { expedition: this.currentExpedition });
    return this.currentExpedition;
  }

  public static clearRoom(): void {
    if (this.currentExpedition.isActive) {
      this.currentExpedition.roomsCleared += 1;
      if (this.currentExpedition.roomsCleared >= this.currentExpedition.totalRooms) {
        this.currentExpedition.bossDefeated = true;
        this.completeExpedition();
      }
      this.notify();
    }
  }

  public static getActiveModifier(): DungeonModifier | null {
    return this.currentExpedition.isActive ? this.currentExpedition.modifier : null;
  }

  public static completeExpedition(): void {
    if (this.currentExpedition.isActive) {
      this.currentExpedition.isActive = false;
      this.notify();
      GameEventBus.emit('DUNGEON_CLEARED', { expedition: this.currentExpedition });
    }
  }

  public static failExpedition(): void {
    if (this.currentExpedition.isActive) {
      const exp = { ...this.currentExpedition };
      this.currentExpedition.isActive = false;
      this.notify();
      GameEventBus.emit('EXPEDITION_FAILED', { expedition: exp });
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
}
