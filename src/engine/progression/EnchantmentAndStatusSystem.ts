// VoxelVerse v6.1.0: Enchantment System & Status Effects / Jamu Alchemy Engine (Minecraft Java & Bedrock Parity)
import { ItemStack } from '../../types';
import { PlayerStats } from '../player/PlayerStats';
import { NotificationManager } from '../ui/NotificationManager';

export type EnchantmentId =
  | 'SHARPNESS'
  | 'EFFICIENCY'
  | 'UNBREAKING'
  | 'FORTUNE'
  | 'FIRE_ASPECT'
  | 'SILK_TOUCH'
  | 'PROTECTION'
  | 'FEATHER_FALLING';

export interface EnchantmentDef {
  id: EnchantmentId;
  name: string;
  indonesianName: string;
  maxLevel: number;
  xpCostPerLevel: number;
  description: string;
}

export const ENCHANTMENT_REGISTRY: Record<EnchantmentId, EnchantmentDef> = {
  SHARPNESS: {
    id: 'SHARPNESS',
    name: 'Sharpness',
    indonesianName: 'Ketajaman Pamor',
    maxLevel: 5,
    xpCostPerLevel: 3,
    description: '+18% damage senjata jarak dekat per tingkat.',
  },
  EFFICIENCY: {
    id: 'EFFICIENCY',
    name: 'Efficiency',
    indonesianName: 'Kecepatan Tambang',
    maxLevel: 5,
    xpCostPerLevel: 2,
    description: '+25% kecepatan menambang blok per tingkat.',
  },
  UNBREAKING: {
    id: 'UNBREAKING',
    name: 'Unbreaking',
    indonesianName: 'Ketahanan Abadi',
    maxLevel: 3,
    xpCostPerLevel: 3,
    description: 'Mengurangi konsumsi durability hingga 60%.',
  },
  FORTUNE: {
    id: 'FORTUNE',
    name: 'Fortune',
    indonesianName: 'Berkah Kemakmuran',
    maxLevel: 3,
    xpCostPerLevel: 4,
    description: 'Peluang hasil tambang bijih & panen berlipat ganda.',
  },
  FIRE_ASPECT: {
    id: 'FIRE_ASPECT',
    name: 'Fire Aspect',
    indonesianName: 'Bara Merapi',
    maxLevel: 2,
    xpCostPerLevel: 4,
    description: 'Membakar musuh saat serangan masuk.',
  },
  SILK_TOUCH: {
    id: 'SILK_TOUCH',
    name: 'Silk Touch',
    indonesianName: 'Sentuhan Sutra',
    maxLevel: 1,
    xpCostPerLevel: 6,
    description: 'Menambang blok utuh tanpa memecahnya menjadi bijih mentah.',
  },
  PROTECTION: {
    id: 'PROTECTION',
    name: 'Protection',
    indonesianName: 'Perisai Kencana',
    maxLevel: 4,
    xpCostPerLevel: 3,
    description: 'Mengurangi semua jenis kerusakan sebesar 8% per tingkat.',
  },
  FEATHER_FALLING: {
    id: 'FEATHER_FALLING',
    name: 'Feather Falling',
    indonesianName: 'Ringan Garuda',
    maxLevel: 4,
    xpCostPerLevel: 2,
    description: 'Mengurangi kerusakan jatuh dari ketinggian hingga 80%.',
  },
};

export type StatusEffectId =
  | 'SPEED'
  | 'STRENGTH'
  | 'REGENERATION'
  | 'NIGHT_VISION'
  | 'FIRE_RESISTANCE'
  | 'WATER_BREATHING'
  | 'HASTE';

export interface ActiveStatusEffect {
  id: StatusEffectId;
  name: string;
  amplifier: number; // 1 = I, 2 = II, 3 = III
  remainingSeconds: number;
  maxSeconds: number;
  colorHex: string;
}

const EFFECT_META: Record<StatusEffectId, { name: string; colorHex: string }> = {
  SPEED: { name: 'Lari Kilat (Speed)', colorHex: '#38bdf8' },
  STRENGTH: { name: 'Tenaga Perkasa (Strength)', colorHex: '#ef4444' },
  REGENERATION: { name: 'Regenerasi Jamu', colorHex: '#ec4899' },
  NIGHT_VISION: { name: 'Mata Elang Malam', colorHex: '#818cf8' },
  FIRE_RESISTANCE: { name: 'Kebal Bara Merapi', colorHex: '#f97316' },
  WATER_BREATHING: { name: 'Nafas Samudra', colorHex: '#06b6d4' },
  HASTE: { name: 'Tangan Cekatan (Haste)', colorHex: '#eab308' },
};

export class EnchantmentAndStatusSystem {
  public static activeEffects: Map<StatusEffectId, ActiveStatusEffect> = new Map();
  private static regenAccumulator = 0;

  public static reset(): void {
    this.activeEffects.clear();
    this.regenAccumulator = 0;
  }

  // ==================== ENCHANTING ====================

  public static enchantItem(
    item: ItemStack,
    enchantId: EnchantmentId,
    level = 1
  ): { success: boolean; item: ItemStack; message: string } {
    const def = ENCHANTMENT_REGISTRY[enchantId];
    if (!def) {
      return { success: false, item, message: 'Enchantment tidak dikenal.' };
    }
    const clampedLevel = Math.max(1, Math.min(def.maxLevel, Math.floor(level)));
    const nextItem: ItemStack = {
      ...item,
      modifiers: {
        ...(item.modifiers || {}),
        enchantments: {
          ...((item.modifiers as any)?.enchantments || {}),
          [enchantId]: clampedLevel,
        },
      } as any,
    };

    NotificationManager.push({
      title: `✨ Pusaka Ditempa: ${def.indonesianName} ${clampedLevel}`,
      message: `${item.itemId} kini memiliki mantra ${def.name} Lv.${clampedLevel}.`,
      priority: 'HIGH',
      colorTheme: 'purple',
      durationMs: 3200,
    });

    return {
      success: true,
      item: nextItem,
      message: `Berhasil menerapkan ${def.name} ${clampedLevel} pada ${item.itemId}.`,
    };
  }

  public static getEnchantLevel(item: ItemStack | null | undefined, enchantId: EnchantmentId): number {
    if (!item || !item.modifiers) return 0;
    const ench = (item.modifiers as any).enchantments;
    return ench && typeof ench[enchantId] === 'number' ? ench[enchantId] : 0;
  }

  public static getDamageMultiplier(item: ItemStack | null | undefined): number {
    const sharpLv = this.getEnchantLevel(item, 'SHARPNESS');
    const strengthEff = this.activeEffects.get('STRENGTH');
    const enchMult = 1.0 + sharpLv * 0.18;
    const effMult = strengthEff ? 1.0 + strengthEff.amplifier * 0.2 : 1.0;
    return enchMult * effMult;
  }

  public static getMiningSpeedMultiplier(item: ItemStack | null | undefined): number {
    const effLv = this.getEnchantLevel(item, 'EFFICIENCY');
    const hasteEff = this.activeEffects.get('HASTE');
    const enchMult = 1.0 + effLv * 0.25;
    const effMult = hasteEff ? 1.0 + hasteEff.amplifier * 0.2 : 1.0;
    return enchMult * effMult;
  }

  public static getSpeedMultiplier(): number {
    const speedEff = this.activeEffects.get('SPEED');
    return speedEff ? 1.0 + speedEff.amplifier * 0.2 : 1.0;
  }

  // ==================== STATUS EFFECTS ====================

  public static applyEffect(
    id: StatusEffectId,
    durationSeconds = 60,
    amplifier = 1
  ): ActiveStatusEffect {
    const meta = EFFECT_META[id];
    const effect: ActiveStatusEffect = {
      id,
      name: meta.name,
      amplifier: Math.max(1, Math.min(5, Math.floor(amplifier))),
      remainingSeconds: Math.max(1, durationSeconds),
      maxSeconds: Math.max(1, durationSeconds),
      colorHex: meta.colorHex,
    };
    this.activeEffects.set(id, effect);

    NotificationManager.push({
      title: `🧪 Efek Aktif: ${meta.name} ${effect.amplifier}`,
      message: `Berlangsung selama ${Math.round(effect.remainingSeconds)} detik.`,
      priority: 'NORMAL',
      colorTheme: 'cyan',
      durationMs: 2400,
    });

    return effect;
  }

  public static hasEffect(id: StatusEffectId): boolean {
    return this.activeEffects.has(id);
  }

  public static getActiveEffectsList(): ActiveStatusEffect[] {
    return Array.from(this.activeEffects.values());
  }

  public static update(dt: number, stats?: PlayerStats): void {
    const clampedDt = Math.min(dt, 0.1);
    if (this.activeEffects.size === 0) return;

    for (const [id, eff] of this.activeEffects.entries()) {
      eff.remainingSeconds -= clampedDt;
      if (eff.remainingSeconds <= 0) {
        this.activeEffects.delete(id);
      }
    }

    // Apply passive Regeneration tick
    const regen = this.activeEffects.get('REGENERATION');
    if (regen && stats) {
      this.regenAccumulator += clampedDt;
      if (this.regenAccumulator >= 1.0) {
        this.regenAccumulator = 0;
        stats.heal(2 * regen.amplifier);
      }
    }
  }
}
