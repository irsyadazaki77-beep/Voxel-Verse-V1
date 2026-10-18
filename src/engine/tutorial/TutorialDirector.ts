// Interactive Beginner Onboarding & Tutorial State Machine
import { GameEventBus } from '../events/GameEventBus';

export interface TutorialStep {
  id: string;
  title: string;
  instruction: string;
  keyboardHint: string;
  mobileHint: string;
  targetCount: number;
  currentCount: number;
  completed: boolean;
  rewardText: string;
}

const STORAGE_KEY = 'voxelverse_tutorial_state';

export class TutorialDirector {
  private static steps: TutorialStep[] = [
    {
      id: 'move',
      title: 'Langkah Awal Pengelana',
      instruction: 'Jelajahi daratan Nusantara. Bergerak dan lihat sekeliling.',
      keyboardHint: 'Gunakan [W, A, S, D] & Mouse',
      mobileHint: 'Gunakan Virtual Joystick Kiri & Usap Layar',
      targetCount: 1,
      currentCount: 0,
      completed: false,
      rewardText: '+50 XP Ketahanan',
    },
    {
      id: 'harvest',
      title: 'Menebang Bahan Pertama',
      instruction: 'Kumpulkan kayu jati atau bambu rimba untuk membuat perkakas.',
      keyboardHint: 'Tahan Klik Kiri pada Batang Kayu',
      mobileHint: 'Sentuh & Tahan Balok Kayu',
      targetCount: 3,
      currentCount: 0,
      completed: false,
      rewardText: '+1 Beliung Pemula',
    },
    {
      id: 'craft',
      title: 'Merakit di Meja Kerja',
      instruction: 'Buka inventaris untuk merakit papan dan perkakas bertahan hidup.',
      keyboardHint: 'Tekan [E] untuk Inventaris',
      mobileHint: 'Tekan Ikon Tas / Inventaris',
      targetCount: 1,
      currentCount: 0,
      completed: false,
      rewardText: '+16 Obor Penerang',
    },
    {
      id: 'skill',
      title: 'Kekuatan Pusaka Leluhur',
      instruction: 'Gunakan jurus pamor pusaka saat memegang senjata.',
      keyboardHint: 'Tekan [R] saat Membawa Keris / Tombak',
      mobileHint: 'Tekan Tombol Skill Api di Layar',
      targetCount: 1,
      currentCount: 0,
      completed: false,
      rewardText: '+20 Energi Aether',
    },
    {
      id: 'radar',
      title: 'Menavigasi Nusantara',
      instruction: 'Buka peta dunia atau pasang penanda waypoint di radar.',
      keyboardHint: 'Tekan [M] untuk Peta Dunia',
      mobileHint: 'Ketuk Radar di Kanan Atas',
      targetCount: 1,
      currentCount: 0,
      completed: false,
      rewardText: '+Peta Topografi Lengkap',
    },
  ];

  private static currentStepIndex: number = 0;
  private static isDismissed: boolean = false;
  private static listeners: Set<(state: { step: TutorialStep | null; isDismissed: boolean; isAllCompleted: boolean }) => void> = new Set();
  private static initialized: boolean = false;

  public static initialize(): void {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.currentStepIndex === 'number') {
          this.currentStepIndex = parsed.currentStepIndex;
        }
        if (typeof parsed.isDismissed === 'boolean') {
          this.isDismissed = parsed.isDismissed;
        }
      }
    } catch {
      // ignore
    }

    // Attach event listeners
    GameEventBus.on('BLOCK_MINED', () => {
      this.advanceProgress('harvest');
    });

    GameEventBus.on('INVENTORY_OPENED', () => {
      this.advanceProgress('craft');
    });

    GameEventBus.on('WEAPON_SKILL_USED', () => {
      this.advanceProgress('skill');
    });

    GameEventBus.on('MAP_OPENED', () => {
      this.advanceProgress('radar');
    });
  }

  public static getCurrentStep(): TutorialStep | null {
    if (this.currentStepIndex >= this.steps.length) return null;
    return this.steps[this.currentStepIndex];
  }

  public static advanceProgress(stepId: string): void {
    const current = this.getCurrentStep();
    if (!current || current.id !== stepId) return;

    current.currentCount += 1;
    if (current.currentCount >= current.targetCount) {
      current.completed = true;
      this.currentStepIndex += 1;
      this.save();

      GameEventBus.emit('NOTIFICATION_SHOW', {
        title: `✅ TUTORIAL SELESAI: ${current.title}`,
        message: current.rewardText,
        type: 'success',
      });
    }

    this.notify();
  }

  public static triggerMovementProgress(): void {
    this.advanceProgress('move');
  }

  public static dismissTutorial(): void {
    this.isDismissed = true;
    this.save();
    this.notify();
  }

  public static resetTutorial(): void {
    this.currentStepIndex = 0;
    this.isDismissed = false;
    this.steps.forEach(s => {
      s.completed = false;
      s.currentCount = 0;
    });
    this.save();
    this.notify();
  }

  public static subscribe(fn: (state: { step: TutorialStep | null; isDismissed: boolean; isAllCompleted: boolean }) => void): () => void {
    this.listeners.add(fn);
    fn(this.getState());
    return () => this.listeners.delete(fn);
  }

  private static getState() {
    return {
      step: this.getCurrentStep(),
      isDismissed: this.isDismissed,
      isAllCompleted: this.currentStepIndex >= this.steps.length,
    };
  }

  private static notify(): void {
    const state = this.getState();
    this.listeners.forEach(fn => fn(state));
  }

  private static save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentStepIndex: this.currentStepIndex,
        isDismissed: this.isDismissed,
      }));
    } catch {
      // ignore
    }
  }
}
