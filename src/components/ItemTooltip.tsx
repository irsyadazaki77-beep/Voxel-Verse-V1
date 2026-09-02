// Centralized Context-Aware Item Tooltip System
import React from 'react';
import { ITEM_DEFS } from '../engine/items/ItemRegistry';
import { ItemStack, ItemDef } from '../types';

interface ItemTooltipProps {
  stack: ItemStack | null;
  position?: { x: number; y: number };
}

export const ItemTooltip: React.FC<ItemTooltipProps> = ({ stack, position }) => {
  if (!stack) return null;

  const itemDef: ItemDef | undefined = ITEM_DEFS[stack.itemId];
  const name = itemDef?.name || stack.itemId.replace(/_/g, ' ');
  const category = itemDef?.category || 'material';
  const rarity = itemDef?.rarity || 'common';
  const maxDurability = stack.maxDurability || itemDef?.durability;
  const currentDurability = stack.durability !== undefined ? stack.durability : maxDurability;

  // Rarity styling
  const rarityStyles: Record<string, { label: string; text: string; bg: string; border: string }> = {
    common: { label: 'COMMON', text: 'text-[var(--vv-text-main)]', bg: 'bg-[var(--vv-surface)]', border: 'border-[var(--vv-border)]' },
    uncommon: { label: 'UNCOMMON', text: 'text-[var(--vv-success)]', bg: 'bg-[var(--vv-success)]/10', border: 'border-[var(--vv-success)]/30' },
    rare: { label: 'RARE', text: 'text-[var(--vv-primary)]', bg: 'bg-[var(--vv-primary)]/10', border: 'border-[var(--vv-primary)]/30' },
    epic: { label: 'EPIC', text: 'text-purple-400', bg: 'bg-purple-900/20', border: 'border-purple-500/30' },
    legendary: { label: 'LEGENDARY', text: 'text-[var(--vv-warning)]', bg: 'bg-[var(--vv-warning)]/10', border: 'border-[var(--vv-warning)]/30' },
    ancient: { label: 'ANCIENT', text: 'text-[var(--vv-danger)]', bg: 'bg-[var(--vv-danger)]/10', border: 'border-[var(--vv-danger)]/30' },
  };

  const style = rarityStyles[rarity] || rarityStyles.common;

  // Position offset to prevent mouse occlusion
  const posX = position ? Math.min(window.innerWidth - 240, position.x + 16) : 0;
  const posY = position ? Math.min(window.innerHeight - 280, position.y + 16) : 0;

  return (
    <div
      style={position ? { left: `${posX}px`, top: `${posY}px` } : undefined}
      className={`fixed z-50 w-64 p-4 rounded-xl bg-[var(--vv-bg)] backdrop-blur-xl border ${style.border} shadow-2xl space-y-3 pointer-events-none font-sans text-white text-xs animate-in fade-in zoom-in-95 duration-150`}
    >
      {/* Header Name & Rarity */}
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-[var(--vv-border-subtle)]">
        <div>
          <h4 className={`font-display font-bold text-[15px] leading-tight ${style.text} drop-shadow-sm`}>{name}</h4>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--vv-text-muted)]">{category}</span>
        </div>
        <span className={`px-2 py-1 rounded bg-black/40 text-[9px] font-bold tracking-wider ${style.text} border ${style.border} uppercase`}>
          {style.label}
        </span>
      </div>

      {/* Stats Breakdown */}
      <div className="space-y-1.5 text-xs font-semibold">
        {itemDef?.attackDamage !== undefined && (
          <div className="flex justify-between text-[var(--vv-danger)]">
            <span>Attack Damage</span>
            <span className="font-mono">+{itemDef.attackDamage} HP</span>
          </div>
        )}

        {itemDef?.miningEfficiency !== undefined && (
          <div className="flex justify-between text-[var(--vv-warning)]">
            <span>Mining Efficiency</span>
            <span className="font-mono">{itemDef.miningEfficiency}x</span>
          </div>
        )}

        {itemDef?.armorValue !== undefined && (
          <div className="flex justify-between text-[var(--vv-primary)]">
            <span>Armor Protection</span>
            <span className="font-mono">+{itemDef.armorValue} DEF</span>
          </div>
        )}

        {itemDef?.foodValue !== undefined && (
          <div className="flex justify-between text-[var(--color-hunger)]">
            <span>Nutrition</span>
            <span className="font-mono">+{itemDef.foodValue} HUNGER</span>
          </div>
        )}

        {currentDurability !== undefined && maxDurability !== undefined && (
          <div className="space-y-1 pt-2">
            <div className="flex justify-between text-[10px] text-[var(--vv-text-muted)] font-bold">
              <span>Durability</span>
              <span className="font-mono">{currentDurability} / {maxDurability}</span>
            </div>
            <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-[var(--vv-border)]">
              <div
                className={`h-full transition-all ${currentDurability / maxDurability < 0.3 ? 'bg-[var(--vv-danger)]' : 'bg-[var(--vv-success)]'}`}
                style={{ width: `${Math.max(0, Math.min(100, (currentDurability / maxDurability) * 100))}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Description / Lore */}
      {itemDef?.description && (
        <div className="pt-2 border-t border-[var(--vv-border-subtle)]">
          <p className="text-[11px] text-[var(--vv-text-muted)] italic leading-relaxed">
            "{itemDef.description}"
          </p>
        </div>
      )}

      {/* Action Prompts */}
      <div className="pt-2 mt-2 flex justify-between text-[9px] text-[var(--vv-text-muted)] font-bold uppercase tracking-wider border-t border-[var(--vv-border-subtle)]">
        <span>[L-Click] Select</span>
        <span>[Shift+Click] Quick Move</span>
      </div>
    </div>
  );
};
