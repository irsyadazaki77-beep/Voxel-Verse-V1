// Automated Comprehensive Registry Validator
// Production Hardening & Regression Validation Engine
import { ITEM_DEFS } from '../items/ItemRegistry';
import { CRAFTING_RECIPES } from '../items/CraftingSystem';
import { QUEST_REGISTRY } from '../progression/QuestManager';
import { SETTLEMENT_REGISTRY, SettlementManager } from '../settlement/SettlementManager';
import { ARTIFACT_REGISTRY } from '../progression/ArtifactRegistry';
import { ARTIFACT_SYNERGIES } from '../artifacts/ArtifactSynergyManager';
import { TreasureMapSystem } from '../exploration/TreasureMapSystem';
import { INITIAL_BOUNTY_CONTRACTS } from '../exploration/BountyContractManager';
import { BLOCK_DEFS } from '../world/BlockRegistry';

export interface ValidationSubResult {
  category: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  itemCount: number;
}

export interface ValidationReport {
  valid: boolean;
  timestamp: string;
  totalErrors: number;
  totalWarnings: number;
  results: Record<string, ValidationSubResult>;
}

export class RegistryValidator {
  /**
   * Run full system validation across all registries and data sources
   */
  public static validateAll(): ValidationReport {
    const results: Record<string, ValidationSubResult> = {
      items: this.validateItemRegistry(),
      crafting: this.validateCraftingRecipes(),
      quests: this.validateQuests(),
      settlements: this.validateSettlements(),
      artifacts: this.validateArtifactsAndSynergies(),
      treasureMaps: this.validateTreasureMaps(),
      bounties: this.validateBounties(),
      blocks: this.validateBlocks(),
    };

    let totalErrors = 0;
    let totalWarnings = 0;

    Object.values(results).forEach((r) => {
      totalErrors += r.errors.length;
      totalWarnings += r.warnings.length;
    });

    return {
      valid: totalErrors === 0,
      timestamp: new Date().toISOString(),
      totalErrors,
      totalWarnings,
      results,
    };
  }

  /**
   * 1. Validate ITEM_DEFS
   */
  public static validateItemRegistry(): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const keys = Object.keys(ITEM_DEFS);

    const validCategories = new Set([
      'block',
      'tool',
      'weapon',
      'armor',
      'accessory',
      'food',
      'consumable',
      'material',
      'seed',
    ]);

    const validRarities = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary', 'ancient']);

    keys.forEach((key) => {
      const def = ITEM_DEFS[key];
      if (!def) {
        errors.push(`Item '${key}' is undefined or null.`);
        return;
      }

      if (def.id !== key) {
        errors.push(`Item key '${key}' does not match definition id '${def.id}'.`);
      }

      if (!def.name || def.name.trim().length === 0) {
        errors.push(`Item '${key}' has missing or empty name.`);
      }

      if (!def.category || !validCategories.has(def.category)) {
        errors.push(`Item '${key}' has invalid category '${def.category}'.`);
      }

      if (!def.rarity || !validRarities.has(def.rarity)) {
        errors.push(`Item '${key}' has invalid rarity '${def.rarity}'.`);
      }

      if (typeof def.maxStack !== 'number' || def.maxStack < 1) {
        errors.push(`Item '${key}' has invalid maxStack: ${def.maxStack}. Must be >= 1.`);
      }

      if (def.repairMaterial && !ITEM_DEFS[def.repairMaterial]) {
        errors.push(`Item '${key}' references non-existent repairMaterial '${def.repairMaterial}'.`);
      }

      if (def.fuelBurnTime !== undefined && (typeof def.fuelBurnTime !== 'number' || def.fuelBurnTime <= 0)) {
        errors.push(`Item '${key}' has invalid fuelBurnTime: ${def.fuelBurnTime}. Must be > 0.`);
      }

      if (def.baseValue !== undefined && (typeof def.baseValue !== 'number' || def.baseValue < 0)) {
        errors.push(`Item '${key}' has invalid baseValue: ${def.baseValue}. Must be >= 0.`);
      }
    });

    return {
      category: 'Item Registry',
      valid: errors.length === 0,
      errors,
      warnings,
      itemCount: keys.length,
    };
  }

  /**
   * 2. Validate CRAFTING_RECIPES
   */
  public static validateCraftingRecipes(): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const seenIds = new Set<string>();

    const validStations = new Set(['hand', 'player_inventory', 'crafting_bench', 'furnace', 'anvil']);

    CRAFTING_RECIPES.forEach((recipe, idx) => {
      if (!recipe.id || recipe.id.trim().length === 0) {
        errors.push(`Recipe at index ${idx} is missing an ID.`);
      } else {
        if (seenIds.has(recipe.id)) {
          errors.push(`Duplicate recipe ID '${recipe.id}' found at index ${idx}.`);
        }
        seenIds.add(recipe.id);
      }

      if (!recipe.name || recipe.name.trim().length === 0) {
        errors.push(`Recipe '${recipe.id || idx}' has missing name.`);
      }

      if (!recipe.station || !validStations.has(recipe.station)) {
        errors.push(`Recipe '${recipe.id}' has invalid station '${recipe.station}'.`);
      }

      if (!recipe.inputs || recipe.inputs.length === 0) {
        errors.push(`Recipe '${recipe.id}' has no inputs.`);
      } else {
        recipe.inputs.forEach((input, inputIdx) => {
          if (!input.itemId || !ITEM_DEFS[input.itemId]) {
            errors.push(`Recipe '${recipe.id}' references non-existent input itemId '${input.itemId}' (input #${inputIdx}).`);
          }
          if (typeof input.count !== 'number' || input.count < 1) {
            errors.push(`Recipe '${recipe.id}' input '${input.itemId}' has invalid count ${input.count}.`);
          }
        });
      }

      if (!recipe.output || !recipe.output.itemId) {
        errors.push(`Recipe '${recipe.id}' has missing output.`);
      } else {
        if (!ITEM_DEFS[recipe.output.itemId]) {
          errors.push(`Recipe '${recipe.id}' references non-existent output itemId '${recipe.output.itemId}'.`);
        }
        if (typeof recipe.output.count !== 'number' || recipe.output.count < 1) {
          errors.push(`Recipe '${recipe.id}' has invalid output count ${recipe.output.count}.`);
        }
      }

      if (recipe.unlockRequiresItem && !ITEM_DEFS[recipe.unlockRequiresItem]) {
        errors.push(`Recipe '${recipe.id}' references non-existent unlockRequiresItem '${recipe.unlockRequiresItem}'.`);
      }
    });

    return {
      category: 'Crafting Recipes',
      valid: errors.length === 0,
      errors,
      warnings,
      itemCount: CRAFTING_RECIPES.length,
    };
  }

  /**
   * 3. Validate QUEST_REGISTRY
   */
  public static validateQuests(): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const questKeys = Object.keys(QUEST_REGISTRY);

    const recipeIds = new Set(CRAFTING_RECIPES.map((r) => r.id));

    questKeys.forEach((key) => {
      const q = QUEST_REGISTRY[key];
      if (!q) {
        errors.push(`Quest '${key}' is undefined or null.`);
        return;
      }

      if (q.id !== key) {
        errors.push(`Quest key '${key}' does not match quest id '${q.id}'.`);
      }

      if (!q.title || q.title.trim().length === 0) {
        errors.push(`Quest '${key}' has missing title.`);
      }

      if (!q.objectives || q.objectives.length === 0) {
        errors.push(`Quest '${key}' has no objectives.`);
      } else {
        q.objectives.forEach((obj, objIdx) => {
          if (!obj.type) {
            errors.push(`Quest '${key}' objective #${objIdx} has missing type.`);
          }
          if (typeof obj.requiredCount !== 'number' || obj.requiredCount < 1) {
            errors.push(`Quest '${key}' objective #${objIdx} has invalid requiredCount ${obj.requiredCount}.`);
          }
          if (obj.type === 'craft' || obj.type === 'collect') {
            if (!ITEM_DEFS[obj.targetId]) {
              errors.push(`Quest '${key}' objective #${objIdx} references non-existent targetId item '${obj.targetId}'.`);
            }
          }
        });
      }

      if (q.rewards) {
        if (q.rewards.items) {
          q.rewards.items.forEach((rew, rIdx) => {
            if (!rew.itemId || !ITEM_DEFS[rew.itemId]) {
              errors.push(`Quest '${key}' reward item #${rIdx} references non-existent itemId '${rew.itemId}'.`);
            }
            if (typeof rew.count !== 'number' || rew.count < 1) {
              errors.push(`Quest '${key}' reward item #${rIdx} has invalid count ${rew.count}.`);
            }
          });
        }

        if (q.rewards.unlockedRecipe) {
          const matchingRecipe = recipeIds.has(q.rewards.unlockedRecipe) ||
            CRAFTING_RECIPES.some((r) => r.output.itemId === q.rewards?.unlockedRecipe);
          if (!matchingRecipe) {
            warnings.push(`Quest '${key}' references unlockedRecipe '${q.rewards.unlockedRecipe}' which is not in CRAFTING_RECIPES.`);
          }
        }
      }

      if (q.prerequisites) {
        q.prerequisites.forEach((prereqId) => {
          if (!QUEST_REGISTRY[prereqId]) {
            errors.push(`Quest '${key}' has non-existent prerequisite quest '${prereqId}'.`);
          }
        });
      }
    });

    return {
      category: 'Quest Registry',
      valid: errors.length === 0,
      errors,
      warnings,
      itemCount: questKeys.length,
    };
  }

  /**
   * 4. Validate SETTLEMENT_REGISTRY and Trades
   */
  public static validateSettlements(): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const keys = Object.keys(SETTLEMENT_REGISTRY);

    keys.forEach((sId) => {
      const s = SETTLEMENT_REGISTRY[sId];
      if (!s) {
        errors.push(`Settlement '${sId}' is undefined or null.`);
        return;
      }

      if (s.id !== sId) {
        errors.push(`Settlement key '${sId}' does not match settlement id '${s.id}'.`);
      }

      if (!s.name || s.name.trim().length === 0) {
        errors.push(`Settlement '${sId}' has missing name.`);
      }

      if (!s.originPos || s.originPos.length !== 3) {
        errors.push(`Settlement '${sId}' has invalid originPos.`);
      }

      // Check upgrades for levels 1-4
      for (let level = 1; level <= 4; level++) {
        const reqs = SettlementManager.getUpgradeRequirements(sId, level);
        reqs.forEach((req, idx) => {
          if (!req.itemId || !ITEM_DEFS[req.itemId]) {
            errors.push(`Settlement '${sId}' level ${level} upgrade requirement #${idx} references non-existent itemId '${req.itemId}'.`);
          }
          if (typeof req.count !== 'number' || req.count < 1) {
            errors.push(`Settlement '${sId}' level ${level} upgrade requirement #${idx} has invalid count ${req.count}.`);
          }
        });
      }

      // Check NPC trades
      if (s.npcIds) {
        s.npcIds.forEach((npcId) => {
          const diag = SettlementManager.getNPCDialogue(npcId, false, sId);
          if (diag.trades) {
            diag.trades.forEach((trade, tIdx) => {
              if (!trade.give || !trade.give.itemId || !ITEM_DEFS[trade.give.itemId]) {
                errors.push(`Settlement '${sId}' NPC '${npcId}' trade #${tIdx} give references invalid itemId '${trade.give?.itemId}'.`);
              }
              if (!trade.receive || !trade.receive.itemId || !ITEM_DEFS[trade.receive.itemId]) {
                errors.push(`Settlement '${sId}' NPC '${npcId}' trade #${tIdx} receive references invalid itemId '${trade.receive?.itemId}'.`);
              }
            });
          }
        });
      }
    });

    return {
      category: 'Settlement Registry',
      valid: errors.length === 0,
      errors,
      warnings,
      itemCount: keys.length,
    };
  }

  /**
   * 5. Validate ARTIFACT_REGISTRY and ARTIFACT_SYNERGIES
   */
  public static validateArtifactsAndSynergies(): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const artKeys = Object.keys(ARTIFACT_REGISTRY);

    artKeys.forEach((key) => {
      const art = ARTIFACT_REGISTRY[key];
      if (!art) {
        errors.push(`Artifact '${key}' is undefined or null.`);
        return;
      }

      if (art.id !== key) {
        errors.push(`Artifact key '${key}' does not match artifact id '${art.id}'.`);
      }

      if (!ITEM_DEFS[art.id]) {
        errors.push(`Artifact '${key}' does not have a matching definition in ITEM_DEFS.`);
      }

      if (!art.tags || !Array.isArray(art.tags) || art.tags.length === 0) {
        errors.push(`Artifact '${key}' must have at least 1 tag in tags array.`);
      }

      if (art.unlockedRecipes) {
        art.unlockedRecipes.forEach((recId) => {
          const exists = CRAFTING_RECIPES.some((r) => r.id === recId || r.output.itemId === recId);
          if (!exists) {
            warnings.push(`Artifact '${key}' unlocks recipe '${recId}' which does not exist in CRAFTING_RECIPES.`);
          }
        });
      }
    });

    // Validate Synergies
    const seenSynergyIds = new Set<string>();
    ARTIFACT_SYNERGIES.forEach((syn, idx) => {
      if (!syn.id || syn.id.trim().length === 0) {
        errors.push(`Synergy at index ${idx} is missing an ID.`);
      } else {
        if (seenSynergyIds.has(syn.id)) {
          errors.push(`Duplicate synergy ID '${syn.id}' found.`);
        }
        seenSynergyIds.add(syn.id);
      }

      if (!syn.name || syn.name.trim().length === 0) {
        errors.push(`Synergy '${syn.id}' has missing name.`);
      }

      if (!syn.requiredTags || syn.requiredTags.length === 0) {
        errors.push(`Synergy '${syn.id}' has empty requiredTags array.`);
      }

      if (syn.requiredArtifacts) {
        syn.requiredArtifacts.forEach((artId) => {
          if (!ARTIFACT_REGISTRY[artId] && !ITEM_DEFS[artId]) {
            errors.push(`Synergy '${syn.id}' references non-existent requiredArtifact '${artId}'.`);
          }
        });
      }

      if (syn.bonus) {
        if (syn.bonus.moveSpeedBonus !== undefined && syn.bonus.moveSpeedBonus > 1.5) {
          errors.push(`Synergy '${syn.id}' moveSpeedBonus (${syn.bonus.moveSpeedBonus}) exceeds maximum cap 1.5.`);
        }
        if (syn.bonus.critChanceBonus !== undefined && syn.bonus.critChanceBonus > 0.5) {
          errors.push(`Synergy '${syn.id}' critChanceBonus (${syn.bonus.critChanceBonus}) exceeds maximum cap 0.5.`);
        }
        if (syn.bonus.damageMultiplier !== undefined && syn.bonus.damageMultiplier > 2.5) {
          errors.push(`Synergy '${syn.id}' damageMultiplier (${syn.bonus.damageMultiplier}) exceeds maximum cap 2.5.`);
        }
      }
    });

    return {
      category: 'Artifact & Synergy Registry',
      valid: errors.length === 0,
      errors,
      warnings,
      itemCount: artKeys.length + ARTIFACT_SYNERGIES.length,
    };
  }

  /**
   * 6. Validate Treasure Maps and Caches
   */
  public static validateTreasureMaps(): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const maps = TreasureMapSystem.generateMaps(42819);

    if (!maps || maps.length === 0) {
      errors.push('TreasureMapSystem produced 0 maps.');
      return {
        category: 'Treasure Map Loot',
        valid: false,
        errors,
        warnings,
        itemCount: 0,
      };
    }

    maps.forEach((map, idx) => {
      if (!map.id || map.id.trim().length === 0) {
        errors.push(`Treasure map #${idx} has missing id.`);
      }

      if (!map.targetPos || map.targetPos.length !== 3) {
        errors.push(`Treasure map '${map.id}' has invalid targetPos.`);
      }

      if (!map.rewards || map.rewards.length === 0) {
        errors.push(`Treasure map '${map.id}' has no rewards.`);
      } else {
        map.rewards.forEach((rew, rIdx) => {
          if (!rew.itemId || !ITEM_DEFS[rew.itemId]) {
            errors.push(`Treasure map '${map.id}' reward #${rIdx} references non-existent itemId '${rew.itemId}'.`);
          }
          if (typeof rew.count !== 'number' || rew.count < 1) {
            errors.push(`Treasure map '${map.id}' reward #${rIdx} has invalid count ${rew.count}.`);
          }
        });
      }
    });

    return {
      category: 'Treasure Map Loot',
      valid: errors.length === 0,
      errors,
      warnings,
      itemCount: maps.length,
    };
  }

  /**
   * 7. Validate INITIAL_BOUNTY_CONTRACTS
   */
  public static validateBounties(): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    INITIAL_BOUNTY_CONTRACTS.forEach((contract, idx) => {
      if (!contract.id || contract.id.trim().length === 0) {
        errors.push(`Bounty contract #${idx} has missing id.`);
      }

      if (!contract.targetType || contract.targetType.trim().length === 0) {
        errors.push(`Bounty contract '${contract.id}' has missing targetType.`);
      }

      if (typeof contract.targetCount !== 'number' || contract.targetCount < 1) {
        errors.push(`Bounty contract '${contract.id}' has invalid targetCount ${contract.targetCount}.`);
      }

      if (contract.rewards?.itemReward) {
        const item = contract.rewards.itemReward;
        if (!item.itemId || !ITEM_DEFS[item.itemId]) {
          errors.push(`Bounty contract '${contract.id}' references non-existent itemReward '${item.itemId}'.`);
        }
        if (typeof item.count !== 'number' || item.count < 1) {
          errors.push(`Bounty contract '${contract.id}' itemReward has invalid count ${item.count}.`);
        }
      }
    });

    return {
      category: 'Bounty Contracts',
      valid: errors.length === 0,
      errors,
      warnings,
      itemCount: INITIAL_BOUNTY_CONTRACTS.length,
    };
  }

  /**
   * 8. Validate BLOCK_DEFS dropItems
   */
  public static validateBlocks(): ValidationSubResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const blockKeys = Object.keys(BLOCK_DEFS);

    blockKeys.forEach((bKey) => {
      const bDef = BLOCK_DEFS[Number(bKey)];
      if (!bDef) return;

      if (bDef.dropItem) {
        if (!ITEM_DEFS[bDef.dropItem]) {
          errors.push(`Block '${bDef.name}' (id ${bDef.id}) references non-existent dropItem '${bDef.dropItem}'.`);
        }
      }
    });

    return {
      category: 'Block Registry',
      valid: errors.length === 0,
      errors,
      warnings,
      itemCount: blockKeys.length,
    };
  }
}
