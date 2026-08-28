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
    common: { label: 'COMMON', text: 'text-slate-300', bg: 'bg-slate-800/80', border: 'border-slate-600/50' },
    uncommon: { label: 'UNCOMMON', text: 'text-emerald-300', bg: 'bg-emerald-950/80', border: 'border-emerald-500/50' },
    rare: { label: 'RARE', text: 'text-sky-300', bg: 'bg-sky-950/80', border: 'border-sky-500/50' },
    epic: { label: 'EPIC', text: 'text-purple-300', bg: 'bg-purple-950/80', border: 'border-purple-500/50' },
    legendary: { label: 'LEGENDARY', text: 'text-amber-300', bg: 'bg-amber-950/80', border: 'border-amber-500/50' },
    ancient: { label: 'ANCIENT', text: 'text-rose-300', bg: 'bg-rose-950/80', border: 'border-rose-500/50' },
  };

  const style = rarityStyles[rarity] || rarityStyles.common;

  // Position offset to prevent mouse occlusion
  const posX = position ? Math.min(window.innerWidth - 240, position.x + 16) : 0;
  const posY = position ? Math.min(window.innerHeight - 280, position.y + 16) : 0;

  return (
    <div
      style={position ? { left: `${posX}px`, top: `${posY}px` } : undefined}
      className={`fixed z-50 w-60 p-3 rounded-2xl bg-[#0c0e14]/95 backdrop-blur-xl border ${style.border} shadow-2xl space-y-2 pointer-events-none font-sans text-white text-xs animate-fade-in`}
    >
      {/* Header Name & Rarity */}
      <div className="flex items-start justify-between gap-2 pb-1 border-b border-white/10">
        <div>
          <h4 className={`font-black tracking-tight text-sm ${style.text}`}>{name}</h4>
          <span className="text-[9px] uppercase font-mono tracking-widest text-white/50">{category}</span>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[8px] font-mono font-bold tracking-wider ${style.bg} ${style.text} border ${style.border}`}>
          {style.label}
        </span>
      </div>

      {/* Stats Breakdown */}
      <div className="space-y-1 text-[11px] font-mono">
        {itemDef?.attackDamage !== undefined && (
          <div className="flex justify-between text-rose-300">
            <span>Attack Damage:</span>
            <span className="font-bold">+{itemDef.attackDamage} HP</span>
          </div>
        )}

        {itemDef?.miningEfficiency !== undefined && (
          <div className="flex justify-between text-amber-300">
            <span>Mining Efficiency:</span>
            <span className="font-bold">{itemDef.miningEfficiency}x</span>
          </div>
        )}

        {itemDef?.armorValue !== undefined && (
          <div className="flex justify-between text-sky-300">
            <span>Armor Protection:</span>
            <span className="font-bold">+{itemDef.armorValue} Defense</span>
          </div>
        )}

        {itemDef?.foodValue !== undefined && (
          <div className="flex justify-between text-emerald-300">
            <span>Nutrition:</span>
            <span className="font-bold">+{itemDef.foodValue} Hunger</span>
          </div>
        )}

        {currentDurability !== undefined && maxDurability !== undefined && (
          <div className="space-y-0.5 pt-1">
            <div className="flex justify-between text-[10px] text-white/60">
              <span>Durability</span>
              <span>{currentDurability} / {maxDurability}</span>
            </div>
            <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-sky-400 rounded-full transition-all"
                style={{ width: `${Math.max(0, Math.min(100, (currentDurability / maxDurability) * 100))}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {/* Description / Lore */}
      {itemDef?.description && (
        <p className="text-[10px] text-white/70 italic leading-snug pt-1 border-t border-white/5">
          "{itemDef.description}"
        </p>
      )}

      {/* Action Prompts */}
      <div className="pt-1 flex justify-between text-[9px] text-white/40 font-mono border-t border-white/5">
        <span>[L-Click] Select</span>
        <span>[Shift+Click] Transfer</span>
      </div>
    </div>
  );
};
