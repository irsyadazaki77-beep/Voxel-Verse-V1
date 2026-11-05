// Taming, Livestock, Breeding & Mount System 2.0 for VoxelVerse Living World & Ecosystem
import { EntityState } from '../../types';
import { CREATURE_REGISTRY, CreatureDef } from '../entities/CreatureRegistry';

export type TamedCommand = 'FOLLOW' | 'STAY' | 'ROAM' | 'GUARD';

export interface LivestockProductionResult {
  entityId: string;
  itemId: string;
  count: number;
}

const FOOD_ALIASES: Record<string, string[]> = {
  wheat: ['wheat', 'crop_wheat', 'seeds_wheat', 'beras_wangi'],
  crop_wheat: ['wheat', 'crop_wheat', 'seeds_wheat', 'beras_wangi'],
  seeds_wheat: ['seeds', 'seeds_wheat', 'wheat', 'crop_wheat'],
  carrot: ['carrot', 'wild_carrot', 'potato', 'crop_herb'],
  wild_carrot: ['carrot', 'wild_carrot', 'potato', 'crop_herb'],
  aether_crystal: ['aether_crystal', 'golden_fruit', 'crop_wheat', 'wild_carrot'],
  raw_meat: ['raw_meat', 'cooked_meat', 'river_trout', 'silver_salmon'],
  cooked_meat: ['raw_meat', 'cooked_meat', 'river_trout', 'silver_salmon'],
};

export class LivestockSystem {
  public static resolveCreatureDef(entityState: EntityState): CreatureDef | undefined {
    if (!entityState) return undefined;
    if (CREATURE_REGISTRY[entityState.type]) return CREATURE_REGISTRY[entityState.type];
    if (entityState.modelType && CREATURE_REGISTRY[entityState.modelType]) {
      return CREATURE_REGISTRY[entityState.modelType];
    }
    if (entityState.modelType === 'stag') {
      return CREATURE_REGISTRY['aether_stag'];
    }
    if (entityState.modelType === 'wolf') {
      return CREATURE_REGISTRY['shadow_wolf'];
    }

    const byMatch = Object.values(CREATURE_REGISTRY).find(
      (c) =>
        c.modelType === entityState.modelType ||
        c.name.toLowerCase() === (entityState.name || '').toLowerCase() ||
        entityState.id.startsWith(c.id)
    );
    if (byMatch) return byMatch;

    // Fallback for generic passive wildlife so all passive animals are interactive
    if (entityState.type === 'passive') {
      return CREATURE_REGISTRY['aether_stag'];
    }
    return undefined;
  }

  public static isAcceptableFood(def: CreatureDef, foodItemId: string): boolean {
    if (foodItemId === 'animal_feed' || foodItemId === 'beras_wangi') return true;
    const allPreferred = [...(def.preferredFood || []), ...(def.breedingFood || [])];
    if (allPreferred.includes(foodItemId)) return true;

    for (const pref of allPreferred) {
      const aliases = FOOD_ALIASES[pref];
      if (aliases && aliases.includes(foodItemId)) return true;
    }

    // Herbivore/Omnivore general acceptance for common farmed crops
    if (
      (def.diet === 'HERBIVORE' || def.diet === 'OMNIVORE' || def.diet === 'AETHER_FEEDER') &&
      ['crop_wheat', 'wheat', 'seeds_wheat', 'wild_carrot', 'crop_herb', 'potato', 'aether_crystal'].includes(foodItemId)
    ) {
      return true;
    }

    return false;
  }

  // Attempt to feed creature to increase trust or tame
  public static feedCreature(
    entityState: EntityState,
    foodItemId: string
  ): { success: boolean; tamed: boolean; message: string } {
    const def = this.resolveCreatureDef(entityState);
    if (!def || !def.tameable) {
      return { success: false, tamed: false, message: 'Satwa liar ini tidak dapat dijinakkan.' };
    }

    const isPreferred = this.isAcceptableFood(def, foodItemId);
    if (!isPreferred) {
      return { success: false, tamed: false, message: `${entityState.name || def.name} menolak pakan ini.` };
    }

    // Heal creature slightly when fed
    entityState.health = Math.min(entityState.maxHealth, entityState.health + 8);

    // Increase trust meter
    const currentTrust = entityState.trustMeter || 0;
    const addedTrust = foodItemId === 'aether_crystal' || foodItemId === 'beras_wangi' ? 50 : 35;
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
        message: `${entityState.name || def.name} kini jinak dan setia mengikuti Anda!`,
      };
    }

    return {
      success: true,
      tamed: !!entityState.isTamed,
      message: `Memberi makan ${entityState.name || def.name} · Kepercayaan: ${newTrust}%`,
    };
  }

  // Cycle or set command for a tamed creature
  public static setCommand(entityState: EntityState, command: TamedCommand): void {
    if (!entityState.isTamed) return;
    entityState.command = command;
  }

  public static cycleCommand(entityState: EntityState): TamedCommand {
    const order: TamedCommand[] = ['FOLLOW', 'STAY', 'GUARD'];
    const current = (entityState.command as TamedCommand) || 'FOLLOW';
    const next = order[(order.indexOf(current) + 1) % order.length];
    entityState.command = next;
    return next;
  }

  // Mount logic: check if entity is rideable
  public static canMount(entityState: EntityState): boolean {
    if (!entityState.isTamed) return false;
    const def = this.resolveCreatureDef(entityState);
    return !!(def && (def.mountCapable || entityState.modelType === 'stag' || entityState.modelType === 'grazeback'));
  }

  // Get mount bonuses for player
  public static getMountBonuses(entityOrType: EntityState | string): { speedBonus: number; jumpBonus: number } {
    const def =
      typeof entityOrType === 'string'
        ? CREATURE_REGISTRY[entityOrType] || (entityOrType === 'stag' ? CREATURE_REGISTRY['aether_stag'] : undefined)
        : this.resolveCreatureDef(entityOrType);
    if (!def) return { speedBonus: 1.4, jumpBonus: 1.45 };
    return {
      speedBonus: def.mountSpeedBonus || 1.45,
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
      const def = this.resolveCreatureDef(entity);
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
