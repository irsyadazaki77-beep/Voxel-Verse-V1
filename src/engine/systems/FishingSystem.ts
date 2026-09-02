// Interactive Fishing System 2.0 for VoxelVerse Living World & Ecosystem
import { ITEM_DEFS } from '../items/ItemRegistry';

export type FishingState = 'IDLE' | 'CASTING' | 'WAITING' | 'BITE' | 'REELING' | 'SUCCESS' | 'FAILED';

export interface FishingCatchResult {
  itemId: string;
  itemName: string;
  quantity: number;
  xpEarned: number;
  isTreasure: boolean;
  rarity: string;
}

export class FishingSystem {
  public static state: FishingState = 'IDLE';
  public static timer: number = 0;
  public static biteWindowTimer: number = 0;
  public static bobberPos: [number, number, number] | null = null;
  public static currentRodType: 'normal' | 'aether' = 'normal';
  public static currentBaitId: string | null = null;
  public static tension: number = 0.5; // Reel tension (0.0 to 1.0)
  public static reelProgress: number = 0.0; // 0.0 to 1.0

  private static onCatchCallbacks: ((result: FishingCatchResult) => void)[] = [];

  public static onCatch(cb: (result: FishingCatchResult) => void): void {
    this.onCatchCallbacks.push(cb);
  }

  // Cast fishing line into water target
  public static castLine(
    playerPos: [number, number, number],
    direction: [number, number, number],
    isAetherRod: boolean = false,
    baitId: string | null = null
  ): boolean {
    if (this.state !== 'IDLE') return false;

    this.currentRodType = isAetherRod ? 'aether' : 'normal';
    this.currentBaitId = baitId;
    this.state = 'CASTING';
    
    // Position bobber 4-7 blocks ahead of player
    const castDist = 5.0;
    this.bobberPos = [
      playerPos[0] + direction[0] * castDist,
      playerPos[1] - 0.5,
      playerPos[2] + direction[2] * castDist,
    ];

    // Wait duration reduced if bait is used or aether rod is used
    let waitTime = 3.5 + Math.random() * 4.0;
    if (baitId === 'earth_worm') waitTime *= 0.65;
    if (baitId === 'aether_bait') waitTime *= 0.45;
    if (isAetherRod) waitTime *= 0.8;

    this.timer = waitTime;
    this.tension = 0.3;
    this.reelProgress = 0;

    return true;
  }

  // Frame update tick for fishing mechanics
  public static update(
    deltaTime: number,
    biomeCategory: string = 'forest',
    isRaining: boolean = false,
    timeOfDay: number = 0.5 // 0 to 1
  ): { event: 'none' | 'bite' | 'escape' | 'success'; catch?: FishingCatchResult } {
    if (this.state === 'CASTING') {
      this.state = 'WAITING';
      return { event: 'none' };
    }

    if (this.state === 'WAITING') {
      // Rain increases fish activity
      const rateMultiplier = isRaining ? 1.3 : 1.0;
      this.timer -= deltaTime * rateMultiplier;

      if (this.timer <= 0) {
        this.state = 'BITE';
        this.biteWindowTimer = 2.2; // 2.2 seconds to react and hook!
        return { event: 'bite' };
      }
      return { event: 'none' };
    }

    if (this.state === 'BITE') {
      this.biteWindowTimer -= deltaTime;
      if (this.biteWindowTimer <= 0) {
        this.state = 'FAILED';
        this.timer = 1.0;
        return { event: 'escape' };
      }
      return { event: 'bite' };
    }

    if (this.state === 'REELING') {
      // Tension simulation
      this.tension += (Math.random() - 0.48) * deltaTime * 1.2;
      this.tension = Math.max(0.1, Math.min(0.95, this.tension));

      // Automatic small progression over time during reel
      this.reelProgress += deltaTime * 0.25;

      if (this.reelProgress >= 1.0) {
        const catchRes = this.generateCatch(biomeCategory, isRaining, timeOfDay);
        this.state = 'SUCCESS';
        this.timer = 1.5;
        this.onCatchCallbacks.forEach(cb => cb(catchRes));
        return { event: 'success', catch: catchRes };
      }
      return { event: 'none' };
    }

    if (this.state === 'FAILED' || this.state === 'SUCCESS') {
      this.timer -= deltaTime;
      if (this.timer <= 0) {
        this.reset();
      }
    }

    return { event: 'none' };
  }

  // Player action when clicking during bite or reeling
  public static pullLine(
    biomeCategory: string = 'forest',
    isRaining: boolean = false,
    timeOfDay: number = 0.5
  ): { status: string; catch?: FishingCatchResult } {
    if (this.state === 'BITE') {
      // Successfully hooked! Transition to reeling minigame
      this.state = 'REELING';
      this.reelProgress = 0.2;
      this.tension = 0.4;
      return { status: 'HOOKED' };
    }

    if (this.state === 'REELING') {
      // Pulling line adds reel progress but increases tension
      this.reelProgress += 0.22;
      this.tension += 0.18;

      if (this.tension >= 1.0) {
        // Line snapped!
        this.state = 'FAILED';
        this.timer = 1.2;
        return { status: 'LINE_SNAPPED' };
      }

      if (this.reelProgress >= 1.0) {
        const catchRes = this.generateCatch(biomeCategory, isRaining, timeOfDay);
        this.state = 'SUCCESS';
        this.timer = 1.5;
        this.onCatchCallbacks.forEach(cb => cb(catchRes));
        return { status: 'SUCCESS', catch: catchRes };
      }

      return { status: 'REELING' };
    }

    return { status: 'INVALID' };
  }

  // Generate weighted catch reward
  public static generateCatch(
    biomeCategory: string,
    isRaining: boolean,
    timeOfDay: number
  ): FishingCatchResult {
    const isNight = timeOfDay < 0.25 || timeOfDay > 0.75;
    const isAetherRod = this.currentRodType === 'aether';
    const isAetherBait = this.currentBaitId === 'aether_bait';

    // Check for rare treasure roll (12% base chance, increased by Aether rod / bait)
    const treasureRoll = Math.random();
    const treasureThreshold = 0.12 + (isAetherRod ? 0.1 : 0) + (isAetherBait ? 0.08 : 0);

    if (treasureRoll < treasureThreshold) {
      const treasures = [
        { itemId: 'aether_crystal', name: 'Aether Crystal', xp: 25, rarity: 'rare' },
        { itemId: 'blueprint_sheet', name: 'Engineering Blueprint', xp: 30, rarity: 'uncommon' },
        { itemId: 'ancient_glyph', name: 'Ancient Glyph Relic', xp: 40, rarity: 'rare' },
        { itemId: 'aether_wax', name: 'Preserved Crystal Wax', xp: 20, rarity: 'uncommon' },
      ];
      const t = treasures[Math.floor(Math.random() * treasures.length)];
      return {
        itemId: t.itemId,
        itemName: t.name,
        quantity: 1,
        xpEarned: t.xp,
        isTreasure: true,
        rarity: t.rarity,
      };
    }

    // Fish species selection by biome and conditions
    if (biomeCategory === 'ocean') {
      if ((isNight || isAetherRod || isAetherBait) && Math.random() < 0.4) {
        return {
          itemId: 'aether_glowfin',
          itemName: 'Azure Glowfin',
          quantity: 1,
          xpEarned: 35,
          isTreasure: false,
          rarity: 'rare',
        };
      }
      if (Math.random() < 0.5) {
        return {
          itemId: 'silver_salmon',
          itemName: 'Silver Salmon',
          quantity: 1,
          xpEarned: 20,
          isTreasure: false,
          rarity: 'uncommon',
        };
      }
      return {
        itemId: 'sun_bass',
        itemName: 'Sunswept Bass',
        quantity: 1,
        xpEarned: 12,
        isTreasure: false,
        rarity: 'common',
      };
    }

    if (biomeCategory === 'exotic' || isAetherRod) {
      return {
        itemId: 'aether_glowfin',
        itemName: 'Azure Glowfin',
        quantity: 1,
        xpEarned: 35,
        isTreasure: false,
        rarity: 'rare',
      };
    }

    // Standard freshwater rivers / lakes
    if (Math.random() < 0.35 || isRaining) {
      return {
        itemId: 'silver_salmon',
        itemName: 'Silver Salmon',
        quantity: 1,
        xpEarned: 18,
        isTreasure: false,
        rarity: 'uncommon',
      };
    }

    return {
      itemId: 'river_trout',
      itemName: 'River Trout',
      quantity: 1,
      xpEarned: 10,
      isTreasure: false,
      rarity: 'common',
    };
  }

  // Reset system
  public static reset(): void {
    this.state = 'IDLE';
    this.timer = 0;
    this.biteWindowTimer = 0;
    this.bobberPos = null;
    this.tension = 0.5;
    this.reelProgress = 0;
  }
}
