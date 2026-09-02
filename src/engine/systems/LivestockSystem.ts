// Taming, Livestock, Breeding & Mount System 2.0 for VoxelVerse Living World & Ecosystem
import { EntityState, ItemStack } from '../../types';
import { CREATURE_REGISTRY, CreatureDef } from '../entities/CreatureRegistry';
import { ITEM_DEFS } from '../items/ItemRegistry';

export type TamedCommand = 'FOLLOW' | 'STAY' | 'ROAM' | 'GUARD';

export interface LivestockProductionResult {
  entityId: string;
  itemId: string;
  count: number;
}

export class LivestockSystem {
  // Attempt to feed creature to increase trust or tame
  public static feedCreature(
    entityState: EntityState,
    foodItemId: string
  ): { success: boolean; tamed: boolean; message: string } {
    const def = CREATURE_REGISTRY[entityState.type];
    if (!def) {
      return { success: false, tamed: false, message: 'Wild creature cannot be fed.' };
    }

    // Check if food is preferred/acceptable
    const isPreferred = def.preferredFood?.includes(foodItemId) || def.breedingFood?.includes(foodItemId);
    if (!isPreferred && foodItemId !== 'animal_feed') {
      return { success: false, tamed: false, message: `${def.name} rejects this food.` };
    }

    // Increase trust meter
    const currentTrust = entityState.trustMeter || 0;
    const addedTrust = isPreferred ? 35 : 15;
    const newTrust = Math.min(100, currentTrust + addedTrust);
    entityState.trustMeter = newTrust;
    entityState.lastFedTime = Date.now();

    // Check if fully tamed
    if (newTrust >= 100 && !entityState.isTamed) {
      entityState.isTamed = true;
      entityState.command = 'FOLLOW';
      entityState.trustMeter = 100;
      return {
        success: true,
        tamed: true,
        message: `You have successfully tamed the ${def.name}!`,
      };
    }

    return {
      success: true,
      tamed: !!entityState.isTamed,
      message: `Fed ${def.name}. Trust level: ${newTrust}%`,
    };
  }

  // Set command for a tamed creature
  public static setCommand(entityState: EntityState, command: TamedCommand): void {
    if (!entityState.isTamed) return;
    entityState.command = command;
  }

  // Mount logic: check if entity is rideable
  public static canMount(entityState: EntityState): boolean {
    if (!entityState.isTamed) return false;
    const def = CREATURE_REGISTRY[entityState.type];
    return !!(def && def.mountCapable);
  }

  // Get mount bonuses for player
  public static getMountBonuses(entityType: string): { speedBonus: number; jumpBonus: number } {
    const def = CREATURE_REGISTRY[entityType];
    if (!def || !def.mountCapable) return { speedBonus: 1.0, jumpBonus: 1.0 };
    return {
      speedBonus: def.mountSpeedBonus || 1.4,
      jumpBonus: def.mountJumpBonus || 1.5,
    };
  }

  // Check and process livestock item production (fiber, milk, eggs, wax)
  public static processLivestockProduction(
    entities: EntityState[],
    nowSeconds: number
  ): LivestockProductionResult[] {
    const results: LivestockProductionResult[] = [];

    for (const entity of entities) {
      if (!entity.isTamed && entity.type !== 'crystal_bee') continue;
      const def = CREATURE_REGISTRY[entity.type];
      if (!def || !def.productOutput) continue;

      const outputDef = def.productOutput;
      const lastProd = entity.lastProductionTime || 0;
      
      if (nowSeconds - lastProd >= outputDef.intervalSeconds) {
        // Requires food check if specified
        const fedRecently = !outputDef.requiresFood || (Date.now() - (entity.lastFedTime || 0) < 600000); // 10 minutes
        if (fedRecently) {
          entity.lastProductionTime = nowSeconds;
          results.push({
            entityId: entity.id,
            itemId: outputDef.itemId,
            count: outputDef.count,
          });
        }
      }
    }

    return results;
  }

  // Check if 2 creatures can breed
  public static canBreed(
    entityA: EntityState,
    entityB: EntityState,
    foodItemId: string,
    currentAreaPopulation: number,
    maxAreaCap: number = 10
  ): boolean {
    if (entityA.type !== entityB.type) return false;
    if (currentAreaPopulation >= maxAreaCap) return false;

    const def = CREATURE_REGISTRY[entityA.type];
    if (!def || !def.breedable) return false;

    const isBreedingFood = def.breedingFood?.includes(foodItemId) || foodItemId === 'animal_feed';
    if (!isBreedingFood) return false;

    const now = Date.now();
    const cooldownA = (entityA.lastBreedingTime || 0) + 120000; // 2 min cooldown
    const cooldownB = (entityB.lastBreedingTime || 0) + 120000;

    return now >= cooldownA && now >= cooldownB;
  }

  // Execute breeding between 2 creatures -> returns parameters for baby entity creation
  public static breed(
    entityA: EntityState,
    entityB: EntityState,
    position: [number, number, number]
  ): Partial<EntityState> {
    const now = Date.now();
    entityA.lastBreedingTime = now;
    entityB.lastBreedingTime = now;

    return {
      type: entityA.type,
      position: [position[0] + 0.5, position[1], position[2] + 0.5],
      health: 15,
      maxHealth: 15,
      isTamed: entityA.isTamed || entityB.isTamed,
      isBaby: true,
      scale: 0.5,
      birthTime: now,
    };
  }

  // Check Crystal Bee crop pollination aura (returns speed multiplier for farmland within range)
  public static getPollinationMultiplier(
    cropPos: [number, number, number],
    bees: EntityState[],
    pollinationRadius: number = 12.0
  ): number {
    for (const bee of bees) {
      if (bee.type !== 'crystal_bee') continue;
      const dx = bee.position[0] - cropPos[0];
      const dy = bee.position[1] - cropPos[1];
      const dz = bee.position[2] - cropPos[2];
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq <= pollinationRadius * pollinationRadius) {
        return 1.25; // +25% growth speed bonus!
      }
    }
    return 1.0;
  }
}
