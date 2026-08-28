// Player Vital Statistics 2.0: Metabolism, Saturation, Temperature, Diminishing Armor & Status System
import { Difficulty, PlayerEquipment, StatusEffect, StatusEffectType } from '../../types';
import { ITEM_DEFS } from '../items/ItemRegistry';

export class PlayerStats {
  // Core Vitals
  public health: number = 100;
  public maxHealth: number = 100;

  public stamina: number = 100;
  public maxStamina: number = 100;

  public hunger: number = 100;
  public maxHunger: number = 100;
  public saturation: number = 20; // Saturation buffer drains before hunger

  public oxygen: number = 100;
  public maxOxygen: number = 100;

  // Progression
  public xp: number = 0;
  public level: number = 1;

  // Survival Environment & Defense
  public temperature: number = 20; // in Celsius (-20 extreme blizzard to +45 blazing desert)
  public thermalInsulation: number = 0; // reduces temperature extremes
  public armorDefense: number = 0; // total armor points from equipment
  public damageReduction: number = 0; // calculated % reduction (0 to 0.85)

  public activeEffects: StatusEffect[] = [];
  public isDead: boolean = false;
  public difficulty: Difficulty = 'normal';

  // Update loop for Player Vitals
  public update(
    deltaTime: number,
    isSprinting: boolean,
    isSubmerged: boolean,
    isSwimming: boolean,
    isMining: boolean,
    ambientTemp: number = 20,
    hasHeatSource: boolean = false
  ): void {
    if (this.isDead) return;

    // 1. Oxygen (Submerged underwater)
    if (isSubmerged) {
      this.oxygen = Math.max(0, this.oxygen - deltaTime * 14);
      if (this.oxygen <= 0) {
        this.takeDamage(deltaTime * 10, 'drowning');
      }
    } else {
      this.oxygen = Math.min(this.maxOxygen, this.oxygen + deltaTime * 30);
    }

    // 2. Stamina Regeneration & Depletion
    let staminaDrain = 0;
    if (isSprinting) staminaDrain += 18;
    if (isSwimming) staminaDrain += 12;
    if (isMining) staminaDrain += 8;

    // Status effect modifiers on stamina
    const hasSlowness = this.hasEffect('slowness');
    const hasSwiftness = this.hasEffect('swiftness');
    const hasFreezing = this.hasEffect('freezing');

    if (staminaDrain > 0) {
      this.stamina = Math.max(0, this.stamina - deltaTime * staminaDrain);
      this.drainExertion(deltaTime * staminaDrain * 0.05);
    } else {
      let regenRate = 22;
      if (this.hunger < 30) regenRate *= 0.5;
      if (hasFreezing) regenRate *= 0.4;
      if (hasSwiftness) regenRate *= 1.35;
      this.stamina = Math.min(this.maxStamina, this.stamina + deltaTime * regenRate);
    }

    // 3. Environmental Temperature & Body Heat
    let targetTemp = ambientTemp;
    if (hasHeatSource) targetTemp = Math.max(targetTemp, 22);

    // Apply thermal insulation from clothes/armor
    const tempDiff = targetTemp - this.temperature;
    const tempAdaptSpeed = 0.08 / (1 + this.thermalInsulation * 0.05);
    this.temperature += tempDiff * deltaTime * tempAdaptSpeed;

    if (this.temperature < 0) {
      this.addEffect('freezing', 5, 1);
      if (this.temperature < -10) {
        this.takeDamage(deltaTime * 3.0, 'freezing');
      }
    } else if (this.temperature > 40) {
      this.addEffect('heat_exhaustion', 5, 1);
      this.drainExertion(deltaTime * 0.5); // Dehydration
    }

    // 4. Natural Hunger Drain & Healing
    if (this.difficulty !== 'peaceful') {
      const passiveDrain = 0.08; // Base resting metabolic drain
      this.drainExertion(deltaTime * passiveDrain);
    }

    // Natural Healing logic:
    // Fast regen when well-fed (saturation > 0 and hunger > 90)
    if (this.hunger >= 90 && this.saturation > 0 && this.health < this.maxHealth) {
      const healAmount = deltaTime * 6.0;
      this.health = Math.min(this.maxHealth, this.health + healAmount);
      this.saturation = Math.max(0, this.saturation - deltaTime * 3.0);
    }
    // Normal healing when hunger >= 75
    else if (this.hunger >= 75 && this.health < this.maxHealth) {
      const healAmount = deltaTime * 2.0;
      this.health = Math.min(this.maxHealth, this.health + healAmount);
      this.hunger = Math.max(0, this.hunger - deltaTime * 0.4);
    }
    // Peaceful mode constant regen
    else if (this.difficulty === 'peaceful' && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + deltaTime * 5.0);
    }

    // Starvation logic when hunger == 0
    if (this.hunger <= 0) {
      if (this.difficulty === 'hard') {
        this.takeDamage(deltaTime * 2.5, 'starvation');
      } else if (this.difficulty === 'normal') {
        if (this.health > 10) {
          this.takeDamage(deltaTime * 2.0, 'starvation');
        }
      } else if (this.difficulty === 'easy') {
        if (this.health > 50) {
          this.takeDamage(deltaTime * 1.5, 'starvation');
        }
      }
    }

    // 5. Update Status Effects Ticks
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i];
      effect.duration -= deltaTime;

      if (effect.id === 'poison') {
        this.takeDamage(deltaTime * (3 + effect.magnitude * 2), 'poison');
      } else if (effect.id === 'burning') {
        this.takeDamage(deltaTime * (4 + effect.magnitude * 2), 'fire');
      } else if (effect.id === 'regeneration') {
        this.heal(deltaTime * (4 + effect.magnitude * 3));
      }

      if (effect.duration <= 0) {
        this.activeEffects.splice(i, 1);
      }
    }
  }

  // Drain hunger through saturation first
  public drainExertion(amount: number): void {
    if (this.saturation > 0) {
      const satDrain = Math.min(this.saturation, amount);
      this.saturation -= satDrain;
      amount -= satDrain;
    }
    if (amount > 0) {
      this.hunger = Math.max(0, this.hunger - amount);
    }
  }

  // Take damage with diminishing returns formula
  public takeDamage(amount: number, source: string = 'generic'): number {
    if (this.isDead) return 0;

    // True damage sources bypass armor
    const isTrueDamage = source === 'drowning' || source === 'starvation' || source === 'void';
    let actualDamage = amount;

    if (!isTrueDamage) {
      // Diminishing returns formula: reduction = defense / (defense + 60)
      // 30 armor = 33% reduction, 60 armor = 50%, 120 armor = 66.7%, 240 armor = 80%, capped at 85%
      this.damageReduction = Math.min(0.85, this.armorDefense / (this.armorDefense + 60));
      actualDamage = Math.max(1, amount * (1 - this.damageReduction));
    }

    this.health = Math.max(0, this.health - actualDamage);
    if (this.health <= 0) {
      this.isDead = true;
    }
    return actualDamage;
  }

  // Heal player
  public heal(amount: number): void {
    if (this.isDead) return;
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  // Restore stamina
  public restoreStamina(amount: number): void {
    this.stamina = Math.min(this.maxStamina, this.stamina + amount);
  }

  // Eat food and replenish hunger + saturation
  public eatFood(foodAmount: number, saturationAmount: number): void {
    this.hunger = Math.min(this.maxHunger, this.hunger + foodAmount);
    this.saturation = Math.min(this.hunger, this.saturation + saturationAmount);
  }

  // Re-calculate armor rating and thermal insulation from equipment
  public updateEquipmentStats(equipment: PlayerEquipment): void {
    let totalDefense = 0;
    let totalInsulation = 0;

    const slots = [equipment.head, equipment.chest, equipment.legs, equipment.feet, equipment.accessory];
    for (const slot of slots) {
      if (slot && slot.itemId) {
        const def = ITEM_DEFS[slot.itemId];
        if (def) {
          if (def.armorValue) totalDefense += def.armorValue;
          if (slot.itemId.startsWith('leather_')) totalInsulation += 3;
          if (slot.modifiers?.defenseBonus) totalDefense += slot.modifiers.defenseBonus;
        }
      }
    }

    this.armorDefense = totalDefense;
    this.thermalInsulation = totalInsulation;
    this.damageReduction = Math.min(0.85, this.armorDefense / (this.armorDefense + 60));
  }

  // XP & Leveling
  public addXP(amount: number): boolean {
    this.xp += amount;
    const reqXP = this.level * 50;
    if (this.xp >= reqXP) {
      this.xp -= reqXP;
      this.level += 1;
      this.maxHealth = 100 + (this.level - 1) * 5;
      this.health = this.maxHealth;
      return true; // Leveled up!
    }
    return false;
  }

  // Status effect helper
  public addEffect(id: StatusEffectType, duration: number, magnitude: number = 1): void {
    const existing = this.activeEffects.find(e => e.id === id);
    if (existing) {
      existing.duration = Math.max(existing.duration, duration);
      existing.magnitude = Math.max(existing.magnitude, magnitude);
    } else {
      const meta = this.getEffectMeta(id);
      this.activeEffects.push({
        id,
        name: meta.name,
        duration,
        maxDuration: duration,
        magnitude,
        type: meta.type,
        color: meta.color,
      });
    }
  }

  public hasEffect(id: StatusEffectType): boolean {
    return this.activeEffects.some(e => e.id === id);
  }

  public removeEffect(id: StatusEffectType): void {
    this.activeEffects = this.activeEffects.filter(e => e.id !== id);
  }

  private getEffectMeta(id: StatusEffectType): { name: string; type: 'buff' | 'debuff'; color: string } {
    switch (id) {
      case 'regeneration':
        return { name: 'Regeneration', type: 'buff', color: '#10b981' };
      case 'swiftness':
        return { name: 'Swiftness', type: 'buff', color: '#38bdf8' };
      case 'strength':
        return { name: 'Empowered Force', type: 'buff', color: '#f59e0b' };
      case 'well_fed':
        return { name: 'Nourished', type: 'buff', color: '#eab308' };
      case 'poison':
        return { name: 'Toxin Venom', type: 'debuff', color: '#a855f7' };
      case 'burning':
        return { name: 'Blazing Fire', type: 'debuff', color: '#ef4444' };
      case 'freezing':
        return { name: 'Frost Hypothermia', type: 'debuff', color: '#06b6d4' };
      case 'slowness':
        return { name: 'Sluggish Mud', type: 'debuff', color: '#64748b' };
      case 'weakness':
        return { name: 'Enfeebled', type: 'debuff', color: '#78716c' };
      case 'heat_exhaustion':
        return { name: 'Heat Exhaustion', type: 'debuff', color: '#f97316' };
      default:
        return { name: 'Status Effect', type: 'buff', color: '#38bdf8' };
    }
  }

  // Respawn after death
  public respawn(spawnPos: [number, number, number]): [number, number, number] {
    this.health = this.maxHealth;
    this.stamina = this.maxStamina;
    this.hunger = 80;
    this.saturation = 15;
    this.oxygen = this.maxOxygen;
    this.temperature = 20;
    this.activeEffects = [];
    this.isDead = false;
    return [...spawnPos];
  }
}
