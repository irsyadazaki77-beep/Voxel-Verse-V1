// Forgemaster Smithing Anvil Modal 2.0: Durability Repairs & Alloy Reinforcement
import React, { useState } from 'react';
import { ItemStack } from '../types';
import { ITEM_DEFS } from '../engine/items/ItemRegistry';
import { InventoryManager } from '../engine/items/InventoryManager';

interface AnvilModalProps {
  anvilPos: [number, number, number];
  playerInventory: (ItemStack | null)[];
  setPlayerInventory: React.Dispatch<React.SetStateAction<(ItemStack | null)[]>>;
  onClose: () => void;
}

export const AnvilModal: React.FC<AnvilModalProps> = ({
  playerInventory,
  setPlayerInventory,
  onClose,
}) => {
  const [targetItemSlot, setTargetItemSlot] = useState<number | null>(null);
  const [materialSlot, setMaterialSlot] = useState<number | null>(null);
  const [repairMessage, setRepairMessage] = useState<string>('');

  const targetItem = targetItemSlot !== null ? playerInventory[targetItemSlot] : null;
  const materialItem = materialSlot !== null ? playerInventory[materialSlot] : null;

  const targetDef = targetItem ? ITEM_DEFS[targetItem.itemId] : null;
  const reqRepairMat = targetDef?.repairMaterial ? ITEM_DEFS[targetDef.repairMaterial] : null;

  const handleRepair = () => {
    if (targetItemSlot === null || materialSlot === null || !targetItem || !materialItem) {
      setRepairMessage('Place a damaged tool/armor and matching repair material.');
      return;
    }

    const res = InventoryManager.repairItem(targetItem, materialItem);
    if (!res.success || !res.repairedItem) {
      setRepairMessage('Cannot repair: item is not damaged or material does not match.');
      return;
    }

    const newInv = [...playerInventory];
    newInv[targetItemSlot] = res.repairedItem;

    // Deduct material
    materialItem.count -= res.materialConsumed;
    if (materialItem.count <= 0) {
      newInv[materialSlot] = null;
      setMaterialSlot(null);
    }

    setPlayerInventory(newInv);
    setRepairMessage(`Repaired successfully! Consumed ${res.materialConsumed}x ${reqRepairMat?.name || 'material'}.`);
  };

  const handleSlotSelect = (idx: number) => {
    const item = playerInventory[idx];
    if (!item) return;

    const def = ITEM_DEFS[item.itemId];
    if (!def) return;

    if (def.durability !== undefined) {
      // It's a tool or armor
      setTargetItemSlot(idx);
      setRepairMessage('');
    } else {
      // It's a material
      setMaterialSlot(idx);
      setRepairMessage('');
    }
  };

  return (
    <div id="modal-anvil-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div
        id="modal-anvil-card"
        className="w-full max-w-2xl bg-[#0e1015]/95 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 shadow-2xl text-white relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/90">Forgemaster Smithing Anvil</h2>
          </div>
          <button
            id="btn-close-anvil"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-xs font-mono transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Forge Workspace */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Slot 1: Target Gear */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center gap-2">
            <span className="text-[10px] uppercase font-bold text-white/50">Damaged Item</span>
            <div
              className={`w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center relative ${
                targetItem ? 'border-sky-400 bg-white/10' : 'border-dashed border-white/20 bg-black/40'
              }`}
            >
              {targetItem && targetDef ? (
                <>
                  <div className="w-8 h-8 rounded-sm" style={{ backgroundColor: targetDef.iconColor }}></div>
                  <span className="text-[9px] font-mono text-white/90 mt-1 truncate max-w-[50px]">{targetDef.name}</span>
                </>
              ) : (
                <span className="text-[9px] text-white/30 font-mono">Tool / Armor</span>
              )}
            </div>
            {targetItem && (
              <span className="text-[10px] font-mono text-sky-300">
                Durability: {targetItem.durability || targetDef?.durability} / {targetItem.maxDurability || targetDef?.durability}
              </span>
            )}
          </div>

          {/* Slot 2: Repair Material */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center gap-2">
            <span className="text-[10px] uppercase font-bold text-white/50">Repair Material</span>
            <div
              className={`w-16 h-16 rounded-xl border-2 flex flex-col items-center justify-center relative ${
                materialItem ? 'border-amber-400 bg-white/10' : 'border-dashed border-white/20 bg-black/40'
              }`}
            >
              {materialItem ? (
                <>
                  <div className="w-8 h-8 rounded-sm" style={{ backgroundColor: ITEM_DEFS[materialItem.itemId]?.iconColor || '#fff' }}></div>
                  <span className="text-[9px] font-mono text-white/90 mt-1">{materialItem.count}x</span>
                </>
              ) : (
                <span className="text-[9px] text-white/30 font-mono">
                  {reqRepairMat ? reqRepairMat.name : 'Material'}
                </span>
              )}
            </div>
            {reqRepairMat && (
              <span className="text-[10px] font-mono text-amber-300">
                Requires: {reqRepairMat.name}
              </span>
            )}
          </div>

          {/* Slot 3: Action */}
          <div className="bg-white/5 p-4 rounded-xl border border-white/10 flex flex-col items-center justify-center gap-3">
            <span className="text-[10px] uppercase font-bold text-white/50">Hammer & Forge</span>
            <button
              onClick={handleRepair}
              disabled={!targetItem || !materialItem}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                targetItem && materialItem
                  ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-white/10 text-white/30 cursor-not-allowed'
              }`}
            >
              Hammer Repair
            </button>
            {repairMessage && (
              <span className="text-[10px] text-center text-emerald-400 font-medium">{repairMessage}</span>
            )}
          </div>
        </div>

        {/* Player Inventory Select */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-white/40 block">Select from Inventory</span>
          <div className="grid grid-cols-9 gap-1.5 p-3 bg-black/40 rounded-xl border border-white/10 max-h-48 overflow-y-auto">
            {playerInventory.map((slot, idx) => {
              const def = slot ? ITEM_DEFS[slot.itemId] : null;
              const isSelected = targetItemSlot === idx || materialSlot === idx;

              return (
                <button
                  key={`anvil-inv-${idx}`}
                  onClick={() => handleSlotSelect(idx)}
                  className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center relative border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-sky-400 bg-sky-500/20'
                      : slot
                      ? 'border-white/10 bg-white/5 hover:bg-white/15'
                      : 'border-white/5 bg-transparent'
                  }`}
                >
                  {slot && def && (
                    <>
                      <div className="w-5 h-5 rounded-xs" style={{ backgroundColor: def.iconColor }}></div>
                      {slot.count > 1 && (
                        <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-bold text-white drop-shadow">
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
