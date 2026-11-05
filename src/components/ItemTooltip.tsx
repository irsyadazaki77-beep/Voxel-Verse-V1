// Centralized Context-Aware Item Tooltip System
import React from 'react';
import { ITEM_DEFS } from '../engine/items/ItemRegistry';
import { ItemStack, ItemDef } from '../types';

interface ItemTooltipProps {
  stack: ItemStack | null;
  position?: { x: number; y: number };
}

const PUSAKA_USAGE_GUIDES: Record<string, { action: string; hotkey?: string; bonus: string }> = {
  kapal_selam_nanggala: {
    action: 'Klik Kanan untuk memanggil / mengemudikan Kapal Selam Nanggala 3D & membuka Candi Samudra',
    hotkey: 'N',
    bonus: 'Oksigen 100% Tak Terbatas + Lampu Sorot Palung + Sonar Mutiara',
  },
  lokomotif_uap_aether: {
    action: 'Klik Kanan untuk membangun Jalur Rel Lingkar, Lokomotif Uap 3D & Mesin Bor Tambang Otomatis',
    hotkey: 'N',
    bonus: 'Ekstraksi Otomatis Bijih Besi, Emas, Batu Bara & Starfall Ore setiap 9d',
  },
  gamelan_angklung_pusaka: {
    action: 'Klik Kanan untuk mendirikan Pendopo Gamelan & Angklung 3D Interaktif',
    hotkey: 'N',
    bonus: 'Berkah Harmoni Gamelan (+25% Kecepatan Gerak & Regenerasi HP/Stamina)',
  },
  mustika_khodam_pendamping: {
    action: 'Klik Kanan untuk memanggil Khodam Pendamping 3D (Macan Putih / Garuda Api / Naga Tirta)',
    hotkey: 'N',
    bonus: 'Serangan Roh Otomatis ke Musuh dalam Radius 14m + Akses Turnamen Arena',
  },
  lontar_erupsi_vulkanik: {
    action: 'Klik Kanan untuk mengganti Cuaca Ekstrem (Erupsi Merapi / Badai Petir / Aurora Kaldera)',
    hotkey: 'N',
    bonus: 'Meteor Lahar Merapi menjatuhkan Kristal Lahar Merapi Langka',
  },
  kamera_sinematik_nusantara: {
    action: 'Klik Kanan atau tekan [P] untuk membuka Mode Foto Sinematik 3D (Free-Cam)',
    hotkey: 'P',
    bonus: 'Kamera Terbang Bebas + Pengaturan FOV + Bingkai Ukiran & Unduh PNG',
  },
  kitab_silat_nusantara: {
    action: 'Tekan [V] ganti Kuda-Kuda Silat · Tekan [G] lepaskan Ajian Sakti Pusaka',
    hotkey: 'V / G',
    bonus: 'Kombo Keris 3-Tahap + Pemulihan Stamina & Pengisian Tenaga Dalam',
  },
  kincir_air_subak: {
    action: 'Klik Kanan untuk membangun Kincir Air Subak 3D & Petak Sawah 5x5',
    bonus: 'Panen Padi & Beras Wangi Otomatis Berkelanjutan',
  },
  panggung_wayang_kulit: {
    action: 'Klik Kanan untuk mendirikan Panggung Kelir Wayang Kulit 3D',
    bonus: 'Berkah Lakon Gatotkaca (+25% DMG), Sri Sedana (Panen), atau Dewa Ruci (Nafas Air)',
  },
  kompas_candi_bawah_tanah: {
    action: 'Klik Kanan untuk menggali Candi Bawah Tanah & membangkitkan Boss Buto Ijo 3D',
    bonus: 'Peti Pusaka Keris & Mustika Bintang Jatuh',
  },
  peluit_garuda_kencana: {
    action: 'Klik Kanan untuk memanggil dan menunggangi Garuda Kencana 3D di angkasa',
    bonus: 'Terbang Bebas Kepulauan Nusantara + Arus Termal',
  },
  layang_naga_batik: {
    action: 'Klik Kanan di udara untuk membentangkan Layang-Layang Naga Batik 3D',
    bonus: 'Melayang Halus Tanpa Fall Damage',
  },
};

export const ItemTooltip: React.FC<ItemTooltipProps> = ({ stack, position }) => {
  if (!stack) return null;

  const itemDef: ItemDef | undefined = ITEM_DEFS[stack.itemId];
  const name = itemDef?.name || stack.itemId.replace(/_/g, ' ');
  const category = itemDef?.category || 'material';
  const rarity = itemDef?.rarity || 'common';
  const maxDurability = stack.maxDurability || itemDef?.durability;
  const currentDurability = stack.durability !== undefined ? stack.durability : maxDurability;
  const pusakaGuide = PUSAKA_USAGE_GUIDES[stack.itemId];

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
  const posX = position ? Math.min(window.innerWidth - 270, position.x + 16) : 0;
  const posY = position ? Math.min(window.innerHeight - 310, position.y + 16) : 0;

  return (
    <div
      style={position ? { left: `${posX}px`, top: `${posY}px` } : undefined}
      className={`fixed z-50 w-68 p-3.5 rounded-xl bg-slate-950/96 border ${style.border} shadow-2xl space-y-2.5 pointer-events-none font-sans text-white text-xs animate-in fade-in zoom-in-95 duration-150`}
    >
      {/* Header Name & Rarity */}
      <div className="flex items-start justify-between gap-2 pb-2 border-b border-[var(--vv-border-subtle)]">
        <div>
          <h4 className={`font-display font-bold text-[14px] leading-tight ${style.text} drop-shadow-sm`}>{name}</h4>
          <span className="text-[10px] uppercase font-bold tracking-widest text-[var(--vv-text-muted)]">{category}</span>
        </div>
        <span className={`px-2 py-0.5 rounded bg-black/50 text-[9px] font-bold tracking-wider ${style.text} border ${style.border} uppercase`}>
          {style.label}
        </span>
      </div>

      {/* Stats Breakdown */}
      <div className="space-y-1.5 text-xs font-semibold">
        {itemDef?.attackDamage !== undefined && (
          <div className="flex justify-between text-[var(--vv-danger)]">
            <span>Attack Damage</span>
            <span className="font-mono tabular-nums">
              +{itemDef.attackDamage + (stack.modifiers?.damageBonus || 0)} HP
              {stack.modifiers?.damageBonus ? ` (+${stack.modifiers.damageBonus})` : ''}
            </span>
          </div>
        )}

        {itemDef?.category === 'weapon' && (
          <div className="flex justify-between text-amber-300 text-[11px]">
            <span>Rangkaian Kombo</span>
            <span className="font-mono tabular-nums">3-Tahap (Finisher 1.45x DMG)</span>
          </div>
        )}

        {stack.modifiers?.pamorName && (
          <div className="flex justify-between text-amber-300">
            <span>Pamor Tempa</span>
            <span className="font-mono tabular-nums text-[10px]">
              {stack.modifiers.pamorName} (T{stack.modifiers.pamorTier || 1})
            </span>
          </div>
        )}

        {stack.modifiers?.mustikaName && (
          <div className="flex justify-between text-sky-300">
            <span>Soket Mustika</span>
            <span className="font-mono tabular-nums text-[10px]">{stack.modifiers.mustikaName}</span>
          </div>
        )}

        {stack.modifiers?.poiseDamageBonus !== undefined && stack.modifiers.poiseDamageBonus > 0 && (
          <div className="flex justify-between text-emerald-300">
            <span>Poise Break Bonus</span>
            <span className="font-mono tabular-nums">+{stack.modifiers.poiseDamageBonus}</span>
          </div>
        )}

        {itemDef?.miningEfficiency !== undefined && (
          <div className="flex justify-between text-[var(--vv-warning)]">
            <span>Mining Efficiency</span>
            <span className="font-mono tabular-nums">{itemDef.miningEfficiency}x</span>
          </div>
        )}

        {itemDef?.armorValue !== undefined && (
          <div className="flex justify-between text-[var(--vv-primary)]">
            <span>Armor Protection</span>
            <span className="font-mono tabular-nums">
              +{itemDef.armorValue + (stack.modifiers?.defenseBonus || 0)} DEF
            </span>
          </div>
        )}

        {itemDef?.foodValue !== undefined && (
          <div className="flex justify-between text-[var(--color-hunger)]">
            <span>Nutrition</span>
            <span className="font-mono tabular-nums">+{itemDef.foodValue} HUNGER</span>
          </div>
        )}

        {currentDurability !== undefined && maxDurability !== undefined && (
          <div className="space-y-1 pt-1.5">
            <div className="flex justify-between text-[10px] text-[var(--vv-text-muted)] font-bold">
              <span>Durability</span>
              <span className="font-mono tabular-nums">{currentDurability} / {maxDurability}</span>
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

      {/* Contextual Pusaka Guide */}
      {pusakaGuide && (
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-400/25 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-amber-300">
            <span>PANDUAN PUSAKA</span>
            {pusakaGuide.hotkey && (
              <kbd className="px-1.5 py-0.2 rounded bg-amber-400/20 border border-amber-400/40 text-amber-200">
                [{pusakaGuide.hotkey}]
              </kbd>
            )}
          </div>
          <p className="text-[11px] text-zinc-100 leading-snug">{pusakaGuide.action}</p>
          <p className="text-[10px] font-mono text-emerald-300 leading-snug">✦ {pusakaGuide.bonus}</p>
        </div>
      )}

      {/* Description / Lore */}
      {itemDef?.description && (
        <div className="pt-1.5 border-t border-[var(--vv-border-subtle)]">
          <p className="text-[11px] text-[var(--vv-text-muted)] italic leading-relaxed">
            "{itemDef.description}"
          </p>
        </div>
      )}

      {/* Action Prompts */}
      <div className="pt-1.5 flex justify-between text-[9px] text-[var(--vv-text-muted)] font-bold uppercase tracking-wider border-t border-[var(--vv-border-subtle)]">
        <span>[Klik Kiri] Pilih</span>
        <span>[Klik Kanan] Gunakan Pusaka</span>
      </div>
    </div>
  );
};

