// Priority-Driven Centralized Game Notification Engine
import { GameEventBus, GameEventType, GameEventPayloads } from '../events/GameEventBus';

export type NotificationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface GameNotification {
  id: string;
  title: string;
  message: string;
  priority: NotificationPriority;
  icon?: string;
  timestamp: number;
  durationMs: number;
  colorTheme?: string;
}

type NotificationListener = (activeNotifications: GameNotification[]) => void;

// Trivial item IDs to suppress pickup spam
const SUPPRESSED_PICKUP_ITEMS = new Set([
  'dirt',
  'dirt_grass',
  'cobblestone',
  'stone',
  'sand',
  'gravel',
  'oak_wood',
  'leaves',
]);

export class NotificationManager {
  private static notifications: GameNotification[] = [];
  private static listeners: Set<NotificationListener> = new Set();
  private static initialized = false;

  public static init(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Subscribe to GameEventBus events
    GameEventBus.on('BIOME_DISCOVERED', (p) => {
      this.push({
        title: 'BIOME DISCOVERED',
        message: p.biomeName,
        priority: 'HIGH',
        icon: '🧭',
        colorTheme: 'sky',
        durationMs: 4000,
      });
    });

    GameEventBus.on('LANDMARK_DISCOVERED', (p) => {
      this.push({
        title: 'LANDMARK LOCATED',
        message: p.name,
        priority: 'HIGH',
        icon: '🏛️',
        colorTheme: 'amber',
        durationMs: 4500,
      });
    });

    GameEventBus.on('QUEST_COMPLETED', (p) => {
      this.push({
        title: 'QUEST COMPLETED',
        message: `Awarded +${p.xpReward} XP`,
        priority: 'HIGH',
        icon: '🏆',
        colorTheme: 'emerald',
        durationMs: 5000,
      });
    });

    GameEventBus.on('BOSS_SPAWNED', (p) => {
      this.push({
        title: 'ANCIENT THREAT AWAKENED',
        message: `${p.type.toUpperCase()} HAS ENTERED THE REALM!`,
        priority: 'CRITICAL',
        icon: '💀',
        colorTheme: 'rose',
        durationMs: 6000,
      });
    });

    GameEventBus.on('BOSS_DEFEATED', (p) => {
      this.push({
        title: 'BOSS DEFEATED',
        message: `${p.bossName} vanquished!`,
        priority: 'CRITICAL',
        icon: '⚔️',
        colorTheme: 'amber',
        durationMs: 6000,
      });
    });

    GameEventBus.on('ARTIFACT_UNLOCKED', (p) => {
      this.push({
        title: 'LEGENDARY ARTIFACT UNLOCKED',
        message: p.name,
        priority: 'HIGH',
        icon: '✨',
        colorTheme: 'purple',
        durationMs: 5000,
      });
    });

    GameEventBus.on('WORLD_EVENT_TRIGGERED', (p) => {
      this.push({
        title: 'WORLD EVENT ACTIVE',
        message: p.eventName,
        priority: 'HIGH',
        icon: '🌌',
        colorTheme: 'indigo',
        durationMs: 5000,
      });
    });

    GameEventBus.on('ITEM_COLLECTED', (p) => {
      if (SUPPRESSED_PICKUP_ITEMS.has(p.itemId)) {
        return; // Suppress spamming picking up dirt or cobblestone!
      }
      this.push({
        title: 'ITEM ACQUIRED',
        message: `+${p.count} ${p.itemId.replace(/_/g, ' ')}`,
        priority: 'LOW',
        icon: '📦',
        colorTheme: 'slate',
        durationMs: 2500,
      });
    });

    GameEventBus.on('DUNGEON_CLEARED', (p) => {
      this.push({
        title: 'DUNGEON CLEARED',
        message: `${p.theme.toUpperCase()} VAULT PURIFIED!`,
        priority: 'HIGH',
        icon: '🏰',
        colorTheme: 'indigo',
        durationMs: 5000,
      });
    });

    // Cleanup loop every 500ms
    setInterval(() => this.cleanup(), 500);
  }

  public static push(notif: Omit<GameNotification, 'id' | 'timestamp'>): void {
    const newNotif: GameNotification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
    };

    // Keep max 5 notifications on screen, prioritizing CRITICAL & HIGH
    this.notifications.unshift(newNotif);
    if (this.notifications.length > 5) {
      this.notifications.sort((a, b) => {
        const pOrder: Record<NotificationPriority, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        return pOrder[b.priority] - pOrder[a.priority];
      });
      this.notifications = this.notifications.slice(0, 5);
    }

    this.notify();
  }

  public static subscribe(cb: NotificationListener): () => void {
    this.listeners.add(cb);
    cb(this.notifications);
    return () => this.listeners.delete(cb);
  }

  private static cleanup(): void {
    const now = Date.now();
    const originalLength = this.notifications.length;
    this.notifications = this.notifications.filter(n => now - n.timestamp < n.durationMs);
    if (this.notifications.length !== originalLength) {
      this.notify();
    }
  }

  private static notify(): void {
    this.listeners.forEach(cb => cb([...this.notifications]));
  }
}
