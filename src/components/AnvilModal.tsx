// Paron Empu Nusantara 3.0 (Forgemaster Smithing Anvil): Perbaikan, Tempa Pamor Pusaka & Soket Batu Mustika
import React, { useState } from 'react';
import { ItemStack, PamorElement } from '../types';
import { ITEM_DEFS } from '../engine/items/ItemRegistry';
import { InventoryManager } from '../engine/items/InventoryManager';
import { NotificationManager } from '../engine/ui/NotificationManager';

interface AnvilModalProps {
  anvilPos: [number, number, number];
  playerInventory: (ItemStack | null)[];
  setPlayerInventory: React.Dispatch<React.SetStateAction<(ItemStack | null)[]>>;
  onClose: () => void;
}

type AnvilTab = 'repair' | 'pamor' | 'mustika';

const PAMOR_OPTIONS: {
  id: PamorElement;
  title: string;
  subtitle: string;
  color: string;
  statsText: string;
}[] = [
  {
    id: 'surya_api',
    title: 'Pamor Surya Merapi',
    subtitle: 'Elemen Api Kawah Vulkanik',
    color: '#f97316',
    statsText: '+16 DMG / Tingkat · +10% Crit · Efek Bakar Lahar',
  },
  {
    id: 'bajra_petir',
    title: 'Pamor Bajra Kilat',
    subtitle: 'Elemen Petir Samudra Berantai',
    color: '#38bdf8',
    statsText: '+12 DMG / Tingkat · +18% Crit · +20 Poise Break',
  },
  {
    id: 'tirta_beku',
    title: 'Pamor Tirta Puncak Jaya',
    subtitle: 'Elemen Es Pelumpuh Pertahanan',
    color: '#2dd4bf',
    statsText: '+10 DMG / Tingkat · +40 Poise Break · +180 Durabilitas',
  },
];

export const AnvilModal: React.FC<AnvilModalProps> = ({
  playerInventory,
  setPlayerInventory,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<AnvilTab>('pamor');
  const [targetItemSlot, setTargetItemSlot] = useState<number | null>(() => {
    const firstWeaponIdx = playerInventory.findIndex(
      (s) => s && (ITEM_DEFS[s.itemId]?.category === 'weapon' || ITEM_DEFS[s.itemId]?.category === 'tool')
    );
    return firstWeaponIdx >= 0 ? firstWeaponIdx : null;
  });
  const [materialSlot, setMaterialSlot] = useState<number | null>(null);
  const [selectedPamor, setSelectedPamor] = useState<PamorElement>('surya_api');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const targetItem = targetItemSlot !== null ? playerInventory[targetItemSlot] : null;
  const materialItem = materialSlot !== null ? playerInventory[materialSlot] : null;

  const targetDef = targetItem ? ITEM_DEFS[targetItem.itemId] : null;
  const reqRepairMat = targetDef?.repairMaterial ? ITEM_DEFS[targetDef.repairMaterial] : null;

  const playForgeSound = () => {
    const rt = (window as any).__voxelRuntime;
    rt?.audio?.playGamelanSaron?.(4);
    rt?.audio?.playBlockHit?.('metal');
  };

  const handleRepair = () => {
    if (targetItemSlot === null || materialSlot === null || !targetItem || !materialItem) {
      setStatusMessage('Pilih peralatan yang rusak serta material perbaikan yang sesuai.');
      return;
    }

    const res = InventoryManager.repairItem(targetItem, materialItem);
    if (!res.success || !res.repairedItem) {
      setStatusMessage('Perbaikan gagal: peralatan belum rusak atau material tidak cocok.');
      return;
    }

    const newInv = [...playerInventory];
    newInv[targetItemSlot] = res.repairedItem;

    materialItem.count -= res.materialConsumed;
    if (materialItem.count <= 0) {
      newInv[materialSlot] = null;
      setMaterialSlot(null);
    }

    setPlayerInventory(newInv);
    playForgeSound();
    setStatusMessage(`Berhasil diperbaiki! Menggunakan ${res.materialConsumed}x ${reqRepairMat?.name || 'material'}.`);
  };

  const handleForgePamor = () => {
    if (targetItemSlot === null || !targetItem) {
      setStatusMessage('Pilih senjata atau alat dari inventaris di bawah terlebih dahulu.');
      return;
    }

    const res = InventoryManager.forgeWeaponPamor(targetItem, selectedPamor, materialItem);
    if (!res.success || !res.forgedItem) {
      setStatusMessage(res.message);
      return;
    }

    const newInv = [...playerInventory];
    newInv[targetItemSlot] = res.forgedItem;

    if (materialSlot !== null && materialItem && res.catalystConsumed > 0) {
      const updatedMat = { ...materialItem, count: materialItem.count - res.catalystConsumed };
      newInv[materialSlot] = updatedMat.count > 0 ? updatedMat : null;
      if (updatedMat.count <= 0) setMaterialSlot(null);
    }

    setPlayerInventory(newInv);
    playForgeSound();
    setStatusMessage(res.message);
    NotificationManager.push({
      title: '🔥 Tempa Pamor Pusaka Berhasil!',
      message: res.message,
      priority: 'HIGH',
      colorTheme: 'amber',
      durationMs: 3500,
    });
  };

  const handleSocketMustika = () => {
    if (targetItemSlot === null || !targetItem) {
      setStatusMessage('Pilih senjata atau zirah dari inventaris terlebih dahulu.');
      return;
    }

    const res = InventoryManager.socketMustikaGem(targetItem, materialItem);
    if (!res.success || !res.socketedItem) {
      setStatusMessage(res.message);
      return;
    }

    const newInv = [...playerInventory];
    newInv[targetItemSlot] = res.socketedItem;

    if (materialSlot !== null && materialItem && res.gemConsumed > 0) {
      const updatedMat = { ...materialItem, count: materialItem.count - res.gemConsumed };
      newInv[materialSlot] = updatedMat.count > 0 ? updatedMat : null;
      if (updatedMat.count <= 0) setMaterialSlot(null);
    }

    setPlayerInventory(newInv);
    playForgeSound();
    setStatusMessage(res.message);
    NotificationManager.push({
      title: '💎 Batu Mustika Disematkan!',
      message: res.message,
      priority: 'HIGH',
      colorTheme: 'sky',
      durationMs: 3500,
    });
  };

  const handleSlotSelect = (idx: number) => {
    const item = playerInventory[idx];
    if (!item) return;

    const def = ITEM_DEFS[item.itemId];
    if (!def) return;

    if (def.category === 'weapon' || def.category === 'tool' || def.category === 'armor') {
      setTargetItemSlot(idx);
      setStatusMessage('');
    } else {
      setMaterialSlot(idx);
      setStatusMessage('');
    }
  };

  const currentMods = targetItem?.modifiers;

  return (
    <div
      id="modal-anvil-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-fade-in font-sans"
    >
      <div
        id="modal-anvil-card"
        className="w-full max-w-3xl bg-[#0e1015]/95 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 shadow-2xl text-white relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div>
            <h2 className="text-base font-bold tracking-wide text-white">
              Paron Empu Pusaka Nusantara
            </h2>
            <p className="text-xs text-zinc-400">
              Tempa Pamor Elemen · Sematkan Batu Mustika · Perbaiki Peralatan & Zirah
            </p>
          </div>
          <button
            id="btn-close-anvil"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-xs font-mono transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Interactive Mode Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-black/50 rounded-xl border border-white/10 mb-5">
          <button
            onClick={() => {
              setActiveTab('pamor');
              setStatusMessage('');
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'pamor'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }`}
          >
            🔥 Tempa Pamor Elemen
          </button>
          <button
            onClick={() => {
              setActiveTab('mustika');
              setStatusMessage('');
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'mustika'
                ? 'bg-sky-500 text-slate-950 shadow-sm'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }`}
          >
            💎 Soket Batu Mustika
          </button>
          <button
            onClick={() => {
              setActiveTab('repair');
              setStatusMessage('');
            }}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'repair'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-zinc-300 hover:text-white hover:bg-white/5'
            }`}
          >
            🔨 Perbaiki Durabilitas
          </button>
        </div>

        {/* Forge Workspace */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          {/* Slot 1: Selected Weapon / Armor */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col justify-between gap-2">
            <span className="text-[11px] font-semibold text-zinc-400">Senjata / Zirah Sasaran</span>
            <div className="flex items-center gap-3 my-1">
              <div
                className={`w-14 h-14 rounded-xl border flex items-center justify-center shrink-0 ${
                  targetItem ? 'border-amber-400/70 bg-white/10' : 'border-dashed border-white/20 bg-black/40'
                }`}
              >
                {targetItem && targetDef ? (
                  <div className="w-8 h-8 rounded" style={{ backgroundColor: targetDef.iconColor }} />
                ) : (
                  <span className="text-[10px] text-white/30 font-mono">Kosong</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {targetDef ? targetDef.name : 'Pilih Senjata/Zirah'}
                </div>
                {targetDef && (
                  <div className="text-[11px] text-zinc-400 font-mono tabular-nums mt-0.5">
                    DMG: {(targetDef.attackDamage || 0) + (currentMods?.damageBonus || 0)} · DUR:{' '}
                    {targetItem?.durability ?? targetDef.durability ?? 0}/
                    {targetItem?.maxDurability ?? targetDef.durability ?? 0}
                  </div>
                )}
                {currentMods?.pamorName && (
                  <div className="text-[10px] text-amber-300 font-medium truncate mt-0.5">
                    {currentMods.pamorName} (Tier {currentMods.pamorTier || 1})
                  </div>
                )}
                {currentMods?.mustikaName && (
                  <div className="text-[10px] text-sky-300 font-medium truncate">
                    Soket: {currentMods.mustikaName}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Slot 2: Pamor Selector OR Catalyst / Mustika Gem */}
          {activeTab === 'pamor' ? (
            <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-zinc-400">Pilih Motif Pamor Pusaka</span>
              {PAMOR_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPamor(p.id)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                    selectedPamor === p.id
                      ? 'bg-amber-500/20 border-amber-400 text-white'
                      : 'bg-black/30 border-white/10 text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: p.color }}>
                      {p.title}
                    </span>
                    <span className="text-[10px] text-zinc-400">{p.subtitle}</span>
                  </div>
                  <div className="text-[10px] text-zinc-300 font-mono tabular-nums">{p.statsText}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center gap-2">
              <span className="text-[11px] font-semibold text-zinc-400">
                {activeTab === 'mustika' ? 'Batu Mustika / Kristal' : 'Material Perbaikan'}
              </span>
              <div
                className={`w-14 h-14 rounded-xl border flex flex-col items-center justify-center ${
                  materialItem ? 'border-sky-400 bg-white/10' : 'border-dashed border-white/20 bg-black/40'
                }`}
              >
                {materialItem ? (
                  <>
                    <div
                      className="w-7 h-7 rounded"
                      style={{ backgroundColor: ITEM_DEFS[materialItem.itemId]?.iconColor || '#38bdf8' }}
                    />
                    <span className="text-[9px] font-mono tabular-nums text-white/90 mt-0.5">
                      {materialItem.count}x
                    </span>
                  </>
                ) : (
                  <span className="text-[9px] text-white/40 font-mono text-center px-1">
                    {activeTab === 'mustika' ? 'Mustika Delima / Zamrud' : reqRepairMat?.name || 'Material'}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-zinc-400 text-center">
                {activeTab === 'mustika'
                  ? materialItem
                    ? ITEM_DEFS[materialItem.itemId]?.name
                    : 'Bisa langsung sematkan Mustika Pusaka'
                  : reqRepairMat
                  ? `Butuh: ${reqRepairMat.name}`
                  : 'Pilih logam/material'}
              </span>
            </div>
          )}

          {/* Slot 3: Forge Execution Button */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center gap-3">
            <span className="text-[11px] font-semibold text-zinc-400">Eksekusi Paron Empu</span>
            {activeTab === 'pamor' && (
              <button
                onClick={handleForgePamor}
                disabled={!targetItem}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  targetItem
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                Tempa Pamor Sekarang
              </button>
            )}
            {activeTab === 'mustika' && (
              <button
                onClick={handleSocketMustika}
                disabled={!targetItem}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  targetItem
                    ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                Sematkan Batu Mustika
              </button>
            )}
            {activeTab === 'repair' && (
              <button
                onClick={handleRepair}
                disabled={!targetItem || !materialItem}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  targetItem && materialItem
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg'
                    : 'bg-white/10 text-white/30 cursor-not-allowed'
                }`}
              >
                Perbaiki Peralatan
              </button>
            )}
            {statusMessage && (
              <span className="text-[11px] text-center text-emerald-400 font-medium leading-snug">
                {statusMessage}
              </span>
            )}
          </div>
        </div>

        {/* Player Inventory Select */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>Pilih Senjata, Zirah, atau Batu Mustika dari Tas</span>
            <span className="font-mono tabular-nums">
              Klik Senjata untuk Sasaran · Klik Mustika/Logam untuk Bahan
            </span>
          </div>
          <div className="grid grid-cols-9 gap-1.5 p-3 bg-black/40 rounded-xl border border-white/10 max-h-48 overflow-y-auto">
            {playerInventory.map((slot, idx) => {
              const def = slot ? ITEM_DEFS[slot.itemId] : null;
              const isTarget = targetItemSlot === idx;
              const isMaterial = materialSlot === idx;

              return (
                <button
                  key={`anvil-inv-${idx}`}
                  onClick={() => handleSlotSelect(idx)}
                  title={def ? def.name : 'Slot Kosong'}
                  className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center relative border transition-all cursor-pointer ${
                    isTarget
                      ? 'border-amber-400 bg-amber-500/20'
                      : isMaterial
                      ? 'border-sky-400 bg-sky-500/20'
                      : slot
                      ? 'border-white/10 bg-white/5 hover:bg-white/15'
                      : 'border-white/5 bg-transparent'
                  }`}
                >
                  {slot && def && (
                    <>
                      <div className="w-5 h-5 rounded" style={{ backgroundColor: def.iconColor }} />
                      {slot.modifiers?.pamorElement && (
                        <span className="absolute top-0.5 left-1 text-[8px] font-bold text-amber-300">★</span>
                      )}
                      {slot.count > 1 && (
                        <span className="absolute bottom-0.5 right-1 text-[8px] font-mono tabular-nums font-bold text-white drop-shadow">
                          {slot.count}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
