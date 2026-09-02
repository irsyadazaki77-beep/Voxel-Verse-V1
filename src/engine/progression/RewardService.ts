// Centralized Progression & Reward Distribution Service for VoxelVerse
// Enforces atomic reward transactions, idempotency, canonical IDs, and audio/notification feedback.
import type { GameRuntime } from '../core/GameRuntime';
import { GameEventBus } from '../events/GameEventBus';
import { NotificationManager } from '../ui/NotificationManager';
import { SettlementManager, SETTLEMENT_REGISTRY } from '../settlement/SettlementManager';
import { ArtifactSynergyManager } from '../artifacts/ArtifactSynergyManager';
import { ARTIFACT_REGISTRY } from './ArtifactRegistry';
import { CraftingSystem } from '../items/CraftingSystem';
import { ITEM_DEFS } from '../items/ItemRegistry';
import { BountyContractManager } from '../exploration/BountyContractManager';
import { TreasureMapSystem } from '../exploration/TreasureMapSystem';
import { QUEST_REGISTRY, QuestManager } from './QuestManager';

export class RewardService {
  private static claimedTransactions: Set<string> = new Set();
  private static runtimeRef: GameRuntime | null = null;

  public static setRuntime(runtime: GameRuntime | null): void {
    this.runtimeRef = runtime;
  }

  public static initialize(savedClaimedTransactions?: string[]): void {
    this.claimedTransactions.clear();
    if (Array.isArray(savedClaimedTransactions)) {
      savedClaimedTransactions.forEach(tx => this.claimedTransactions.add(tx));
    }
  }

  public static dispose(): void {
    this.claimedTransactions.clear();
    this.runtimeRef = null;
  }

  public static isClaimed(txId: string): boolean {
    return this.claimedTransactions.has(txId);
  }

  public static serialize(): string[] {
    return Array.from(this.claimedTransactions);
  }

  /**
   * General atomic reward transaction with idempotency check
   */
  public static grantReward(
    runtime: GameRuntime | null,
    reward: {
      transactionId: string;
      xp?: number;
      items?: { itemId: string; count: number }[];
      reputation?: { settlementId: string; amount: number };
      unlockedRecipe?: string;
      artifactId?: string;
    }
  ): boolean {
    if (!reward || !reward.transactionId) return false;
    if (this.claimedTransactions.has(reward.transactionId)) {
      return false; // Idempotency check prevents duplicate grant
    }

    const rt = runtime || this.runtimeRef;
    this.claimedTransactions.add(reward.transactionId);

    if (reward.xp && reward.xp > 0) {
      this.grantXP(rt, reward.xp, `Reward: ${reward.transactionId}`);
    }

    if (reward.items && reward.items.length > 0) {
      this.grantItems(rt, reward.items, `Reward: ${reward.transactionId}`);
    }

    if (reward.reputation && reward.reputation.amount > 0) {
      this.grantReputation(reward.reputation.settlementId, reward.reputation.amount, `Reward: ${reward.transactionId}`);
    }

    if (reward.unlockedRecipe) {
      CraftingSystem.unlockRecipe(reward.unlockedRecipe);
    }

    if (reward.artifactId) {
      this.acquireArtifact(reward.artifactId, `Reward: ${reward.transactionId}`, rt);
    }

    return true;
  }

  /**
   * Atomic XP distribution with level up notifications and SFX
   */
  public static grantXP(runtime: GameRuntime | null, amount: number, reason: string): boolean {
    const rt = runtime || this.runtimeRef;
    if (!rt || !rt.stats || amount <= 0) return false;

    const leveledUp = rt.stats.addXP(amount);
    if (leveledUp) {
      if (rt.audio) {
        rt.audio.playTone(440, 0.15);
        setTimeout(() => rt.audio.playTone(880, 0.25), 150);
      }
      NotificationManager.push({
        title: 'LEVEL UP!',
        message: `You reached Level ${rt.stats.level}!`,
        priority: 'HIGH',
        icon: '👑',
        durationMs: 6000,
      });
    }
    return true;
  }

  /**
   * Atomic item grant with canonical ID verification
   */
  public static grantItems(
    runtime: GameRuntime | null,
    items: { itemId: string; count: number }[],
    reason: string
  ): boolean {
    const rt = runtime || this.runtimeRef;
    if (!rt || !items || items.length === 0) return false;

    for (const item of items) {
      if (!ITEM_DEFS[item.itemId]) {
        console.warn(`[RewardService] Invalid item ID '${item.itemId}' ignored during reward grant.`);
        continue;
      }
      rt.addItemToInventory(item.itemId, item.count);
    }
    return true;
  }

  /**
   * Atomic settlement reputation grant
   */
  public static grantReputation(settlementId: string, amount: number, reason: string): void {
    if (!settlementId || amount === 0) return;
    if (SETTLEMENT_REGISTRY[settlementId]) {
      SettlementManager.addReputation(settlementId, amount);
    } else {
      console.warn(`[RewardService] Invalid settlement ID '${settlementId}' for reputation grant.`);
    }
  }

  /**
   * Canonical Artifact acquisition flow
   */
  public static acquireArtifact(artifactId: string, source: string, runtime?: GameRuntime | null): boolean {
    if (!ARTIFACT_REGISTRY[artifactId]) {
      console.warn(`[RewardService] Invalid artifact ID '${artifactId}'.`);
      return false;
    }

    const artifactDef = ARTIFACT_REGISTRY[artifactId];
    const unlocked = ArtifactSynergyManager.unlockArtifact(artifactId);

    const rt = runtime || this.runtimeRef;
    if (rt && ITEM_DEFS[artifactId]) {
      rt.addItemToInventory(artifactId, 1);
    }

    // Unlock recipes attached to artifact
    if (artifactDef.unlockedRecipes) {
      for (const recipeId of artifactDef.unlockedRecipes) {
        CraftingSystem.unlockRecipe(recipeId);
      }
    }

    GameEventBus.emit('ARTIFACT_ACQUIRED', {
      artifactId,
      name: artifactDef.name,
      source,
    });

    GameEventBus.emit('ARTIFACT_UNLOCKED', {
      artifactId,
      name: artifactDef.name,
    });

    NotificationManager.push({
      title: 'ANCIENT ARTIFACT ACQUIRED!',
      message: `${artifactDef.name} — ${artifactDef.passiveAbility}`,
      priority: 'CRITICAL',
      icon: '✨',
      durationMs: 9000,
    });

    return unlocked;
  }

  /**
   * Atomic Quest Reward Claim
   */
  public static claimQuestReward(runtime: GameRuntime | null, questId: string): boolean {
    const txId = `quest_${questId}`;
    if (this.claimedTransactions.has(txId)) {
      return false; // Idempotent check
    }

    const qDef = QUEST_REGISTRY[questId];
    if (!qDef) return false;

    const rt = runtime || this.runtimeRef;
    if (!rt) return false;

    this.claimedTransactions.add(txId);

    // 1. Award XP
    if (qDef.rewards.xp > 0) {
      this.grantXP(rt, qDef.rewards.xp, `Quest: ${qDef.title}`);
    }

    // 2. Award Items
    if (qDef.rewards.items && qDef.rewards.items.length > 0) {
      this.grantItems(rt, qDef.rewards.items, `Quest: ${qDef.title}`);
    }

    // 3. Award Recipe Unlocks
    if (qDef.rewards.unlockedRecipe) {
      CraftingSystem.unlockRecipe(qDef.rewards.unlockedRecipe);
    }

    // 4. Award Reputation
    if (qDef.rewards.reputation) {
      this.grantReputation(qDef.rewards.reputation.settlementId, qDef.rewards.reputation.amount, `Quest: ${qDef.title}`);
    } else if (qDef.giverSettlement) {
      const settlementKey = qDef.giverSettlement.toLowerCase().replace(/\s+/g, '_');
      if (SETTLEMENT_REGISTRY[settlementKey]) {
        this.grantReputation(settlementKey, 25, `Quest: ${qDef.title}`);
      }
    }

    return true;
  }

  /**
   * Atomic Bounty Contract Claim
   */
  public static claimBountyContract(runtime: GameRuntime | null, contractId: string): boolean {
    const txId = `bounty_${contractId}`;
    if (this.claimedTransactions.has(txId)) {
      return false;
    }

    const contract = BountyContractManager.getContracts().find(c => c.id === contractId);
    if (!contract || contract.status !== 'completed') {
      return false;
    }

    const rt = runtime || this.runtimeRef;
    if (!rt) return false;

    this.claimedTransactions.add(txId);
    BountyContractManager.claimContractReward(contractId);

    // 1. Award XP
    if (contract.rewards.xp > 0) {
      this.grantXP(rt, contract.rewards.xp, `Bounty: ${contract.title}`);
    }

    // 2. Award Item Reward
    if (contract.rewards.itemReward) {
      this.grantItems(rt, [contract.rewards.itemReward], `Bounty: ${contract.title}`);
    }

    // 3. Award Settlement Reputation
    if (contract.issuerSettlementId && contract.rewards.reputation > 0) {
      this.grantReputation(contract.issuerSettlementId, contract.rewards.reputation, `Bounty: ${contract.title}`);
    }

    NotificationManager.push({
      title: 'Bounty Reward Claimed!',
      message: `${contract.title}: +${contract.rewards.xp} XP & rewards awarded!`,
      priority: 'HIGH',
      icon: '📜',
      durationMs: 6000,
    });

    return true;
  }

  /**
   * Atomic Treasure Cache Discovery & Reward Claim
   */
  public static claimTreasureCache(runtime: GameRuntime | null, mapId: string): boolean {
    const txId = `treasure_${mapId}`;
    if (this.claimedTransactions.has(txId)) {
      return false;
    }

    const map = TreasureMapSystem.getMaps().find(m => m.id === mapId);
    if (!map || !map.isDeciphered || map.isFound) {
      return false;
    }

    const rt = runtime || this.runtimeRef;
    if (!rt) return false;

    this.claimedTransactions.add(txId);
    map.isFound = true;

    // 1. Award XP
    if (map.xpReward > 0) {
      this.grantXP(rt, map.xpReward, `Treasure: ${map.name}`);
    }

    // 2. Award Items
    if (map.rewards && map.rewards.length > 0) {
      this.grantItems(rt, map.rewards, `Treasure: ${map.name}`);

      // Check if any reward item is an artifact
      for (const reward of map.rewards) {
        if (ARTIFACT_REGISTRY[reward.itemId]) {
          this.acquireArtifact(reward.itemId, `Treasure Cache: ${map.name}`, rt);
        }
      }
    }

    if (rt.audio) {
      rt.audio.playTone(523, 0.15);
      setTimeout(() => rt.audio.playTone(659, 0.15), 120);
      setTimeout(() => rt.audio.playTone(784, 0.3), 240);
    }

    NotificationManager.push({
      title: 'TREASURE CACHE UNEARTHED!',
      message: `${map.name}: +${map.xpReward} XP and rare loot discovered!`,
      priority: 'CRITICAL',
      icon: '💎',
      durationMs: 8000,
    });

    GameEventBus.emit('TREASURE_CACHE_DISCOVERED', { map });
    return true;
  }
}
