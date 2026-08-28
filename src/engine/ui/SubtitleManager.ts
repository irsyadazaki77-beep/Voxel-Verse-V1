// Subtitle System for Audio Accessibility
import { SettingsManager } from './SettingsManager';

export interface SubtitleEntry {
  id: string;
  source: string;
  text: string;
  category: 'npc' | 'creature' | 'event' | 'environment';
  durationMs: number;
  timestamp: number;
}

type SubtitleListener = (subtitles: SubtitleEntry[]) => void;

export class SubtitleManager {
  private static entries: SubtitleEntry[] = [];
  private static listeners: Set<SubtitleListener> = new Set();

  public static push(source: string, text: string, category: 'npc' | 'creature' | 'event' | 'environment', durationMs = 3500): void {
    const settings = SettingsManager.get();
    if (!settings.accessibility.subtitles) return;

    const entry: SubtitleEntry = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      source,
      text,
      category,
      durationMs,
      timestamp: Date.now(),
    };

    this.entries = [entry, ...this.entries.slice(0, 2)];
    this.notify();

    setTimeout(() => {
      this.entries = this.entries.filter(e => e.id !== entry.id);
      this.notify();
    }, durationMs);
  }

  public static subscribe(cb: SubtitleListener): () => void {
    this.listeners.add(cb);
    cb(this.entries);
    return () => this.listeners.delete(cb);
  }

  private static notify(): void {
    this.listeners.forEach(cb => cb([...this.entries]));
  }
}
