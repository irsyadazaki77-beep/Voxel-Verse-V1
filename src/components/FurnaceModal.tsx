// Kiln Smelter & Furnace Modal 2.0: Persistent Combustion, Real-Time Smelting & Inventory Transaction Layer
import React, { useState, useEffect } from 'react';
import { ItemStack } from '../types';
import { ITEM_DEFS } from '../engine/items/ItemRegistry';
import { FurnaceManager, FurnaceState } from '../engine/world/FurnaceManager';
import { InventoryManager } from '../engine/items/InventoryManager';

interface FurnaceModalProps {
  furnacePos: [number, number, number];
  playerInventory: (ItemStack | null)[];
  setPlayerInventory: React.Dispatch<React.SetStateAction<(ItemStack | null)[]>>;
  onClose: () => void;
}

export const FurnaceModal: React.FC<FurnaceModalProps> = ({
  furnacePos,
  playerInventory,
  setPlayerInventory,
  onClose,
}) => {
  const [furnaceState, setFurnaceState] = useState<FurnaceState>(() => {
    return FurnaceManager.getFurnace(furnacePos);
  });

  // Keep modal synced with real-time FurnaceManager ticking
  useEffect(() => {
    const interval = setInterval(() => {
      const current = FurnaceManager.getFurnace(furnacePos);
      setFurnaceState({ ...current });
    }, 100);

    return () => clearInterval(interval);
  }, [furnacePos]);

  const handleTakeOutput = () => {
    if (!furnaceState.outputSlot) return;

    const stack = furnaceState.outputSlot;
    const res = InventoryManager.addItem(playerInventory, stack.itemId, stack.count);

    if (res.addedCount > 0) {
      setPlayerInventory([...playerInventory]);
      const remaining = stack.count - res.addedCount;
      const nextOutput = remaining > 0 ? { ...stack, count: remaining } : null;

      furnaceState.outputSlot = nextOutput;
      FurnaceManager.setFurnace(furnacePos, furnaceState);
      setFurnaceState({ ...furnaceState });
    }
  };

  const handleInventorySlotClick = (index: number) => {
    const item = playerInventory[index];
    if (!item) return;

    const itemDef = ITEM_DEFS[item.itemId];
    if (!itemDef) return;

    const newInv = [...playerInventory];

    // Priority 1: If item is fuel and fuel slot is empty or compatible
    const isFuel = ((itemDef.fuelBurnTime || itemDef.burnTime || 0) > 0);
    if (isFuel && (!furnaceState.fuelSlot || furnaceState.fuelSlot.itemId === item.itemId)) {
      const maxStack = itemDef.maxStack || 64;
      const currentFuel = furnaceState.fuelSlot;
      const space = currentFuel ? maxStack - currentFuel.count : maxStack;
      const transfer = Math.min(space, item.count);

      if (transfer > 0) {
        if (!currentFuel) {
          furnaceState.fuelSlot = { ...item, count: transfer };
        } else {
          currentFuel.count += transfer;
        }

        item.count -= transfer;
        if (item.count <= 0) newInv[index] = null;
        setPlayerInventory(newInv);
        FurnaceManager.setFurnace(furnacePos, furnaceState);
        setFurnaceState({ ...furnaceState });
        return;
      }
    }

    // Priority 2: If item is smeltable input
    if (!furnaceState.inputSlot || furnaceState.inputSlot.itemId === item.itemId) {
      const maxStack = itemDef.maxStack || 64;
      const currentInput = furnaceState.inputSlot;
      const space = currentInput ? maxStack - currentInput.count : maxStack;
      const transfer = Math.min(space, item.count);

      if (transfer > 0) {
        if (!currentInput) {
          furnaceState.inputSlot = { ...item, count: transfer };
        } else {
          currentInput.count += transfer;
        }

        item.count -= transfer;
        if (item.count <= 0) newInv[index] = null;
        setPlayerInventory(newInv);
        FurnaceManager.setFurnace(furnacePos, furnaceState);
        setFurnaceState({ ...furnaceState });
        return;
      }
    }
  };

  const handleClearSlot = (slotType: 'input' | 'fuel') => {
    const slot = slotType === 'input' ? furnaceState.inputSlot : furnaceState.fuelSlot;
    if (!slot) return;

    const res = InventoryManager.addItem(playerInventory, slot.itemId, slot.count);
    if (res.addedCount > 0) {
      setPlayerInventory([...playerInventory]);
      const remaining = slot.count - res.addedCount;

      if (slotType === 'input') {
        furnaceState.inputSlot = remaining > 0 ? { ...slot, count: remaining } : null;
      } else {
        furnaceState.fuelSlot = remaining > 0 ? { ...slot, count: remaining } : null;
      }

      FurnaceManager.setFurnace(furnacePos, furnaceState);
      setFurnaceState({ ...furnaceState });
    }
  };

  const isBurning = furnaceState.burnTimeRemaining > 0;
  const burnPercent = furnaceState.maxBurnTime > 0 ? (furnaceState.burnTimeRemaining / furnaceState.maxBurnTime) * 100 : 0;
  const maxCook = furnaceState.maxCookProgress || furnaceState.maxCookTime || 8;
  const cookPercent = maxCook > 0 ? (furnaceState.cookProgress / maxCook) * 100 : 0;

  const inputDef = furnaceState.inputSlot ? ITEM_DEFS[furnaceState.inputSlot.itemId] : null;
  const fuelDef = furnaceState.fuelSlot ? ITEM_DEFS[furnaceState.fuelSlot.itemId] : null;
  const outputDef = furnaceState.outputSlot ? ITEM_DEFS[furnaceState.outputSlot.itemId] : null;

  return (
    <div id="modal-furnace-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div
        id="modal-furnace-card"
        className="w-full max-w-2xl bg-[#0e1015]/95 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 shadow-2xl text-white relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${isBurning ? 'bg-amber-400 animate-pulse' : 'bg-white/30'}`}></div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/90">Smelter & Blast Furnace</h2>
          </div>
          <button
            id="btn-close-furnace"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-xs font-mono transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Smelting Chamber View */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {/* Left Column: Input & Fuel */}
          <div className="flex flex-col items-center justify-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
            {/* Input Slot */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-white/40 mb-1">Ore / Ingot / Food</span>
              <button
                onClick={() => handleClearSlot('input')}
                title="Click to withdraw input item"
                className={`w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                  furnaceState.inputSlot ? 'border-sky-400 bg-white/10' : 'border-dashed border-white/20 bg-black/40'
                }`}
              >
                {furnaceState.inputSlot && inputDef ? (
                  <>
                    <div className="w-7 h-7 rounded-sm" style={{ backgroundColor: inputDef.iconColor }}></div>
                    <span className="absolute bottom-1 right-1.5 text-[9px] font-mono font-bold text-white drop-shadow">
                      {furnaceState.inputSlot.count}
                    </span>
                  </>
                ) : (
                  <span className="text-[9px] text-white/30 font-mono">Input</span>
                )}
              </button>
            </div>

            {/* Fire Combustion Flame */}
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 flex items-center justify-center relative">
                <span className={`text-lg transition-transform ${isBurning ? 'scale-125 animate-bounce' : 'opacity-20 grayscale'}`}>
                  🔥
                </span>
              </div>
              {isBurning && (
                <div className="w-12 h-1 bg-black/50 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-200"
                    style={{ width: `${burnPercent}%` }}
                  ></div>
                </div>
              )}
            </div>

            {/* Fuel Slot */}
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-white/40 mb-1">Coal / Timber Fuel</span>
              <button
                onClick={() => handleClearSlot('fuel')}
                title="Click to withdraw fuel item"
                className={`w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                  furnaceState.fuelSlot ? 'border-amber-400 bg-white/10' : 'border-dashed border-white/20 bg-black/40'
                }`}
              >
                {furnaceState.fuelSlot && fuelDef ? (
                  <>
                    <div className="w-7 h-7 rounded-sm" style={{ backgroundColor: fuelDef.iconColor }}></div>
                    <span className="absolute bottom-1 right-1.5 text-[9px] font-mono font-bold text-white drop-shadow">
                      {furnaceState.fuelSlot.count}
                    </span>
                  </>
                ) : (
                  <span className="text-[9px] text-white/30 font-mono">Fuel</span>
                )}
              </button>
            </div>
          </div>

          {/* Middle Column: Progress Arrow */}
          <div className="flex flex-col items-center justify-center bg-white/5 p-4 rounded-xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-white/40 mb-2">Smelting Reaction</span>
            <div className="w-full max-w-[120px] h-3 bg-black/50 rounded-full overflow-hidden border border-white/10 p-[1px]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-sky-400 transition-all duration-100"
                style={{ width: `${cookPercent}%` }}
              ></div>
            </div>
            <span className="text-[10px] font-mono text-white/60 mt-2">
              {Math.round(cookPercent)}%
            </span>
          </div>

          {/* Right Column: Output Slot */}
          <div className="flex flex-col items-center justify-center bg-white/5 p-4 rounded-xl border border-white/10">
            <span className="text-[10px] uppercase font-bold text-white/40 mb-2">Smelted Yield</span>
            <button
              onClick={handleTakeOutput}
              disabled={!furnaceState.outputSlot}
              title="Click to collect smelted output"
              className={`w-18 h-18 rounded-2xl border-2 flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                furnaceState.outputSlot
                  ? 'border-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/20 hover:scale-105'
                  : 'border-dashed border-white/20 bg-black/40 cursor-not-allowed'
              }`}
            >
              {furnaceState.outputSlot && outputDef ? (
                <>
                  <div className="w-9 h-9 rounded-md" style={{ backgroundColor: outputDef.iconColor }}></div>
                  <span className="text-[10px] font-bold text-white mt-1">{outputDef.name}</span>
                  <span className="absolute bottom-1 right-2 text-[10px] font-mono font-black text-emerald-300 drop-shadow">
                    {furnaceState.outputSlot.count}
                  </span>
                </>
              ) : (
                <span className="text-[10px] text-white/30 font-mono">Output</span>
              )}
            </button>
          </div>
        </div>

        {/* Quick Insert from Inventory */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-white/40 block">Quick Insert from Inventory</span>
          <div className="grid grid-cols-9 gap-1.5 p-3 bg-black/40 rounded-xl border border-white/10 max-h-44 overflow-y-auto">
            {playerInventory.map((slot, idx) => {
              const def = slot ? ITEM_DEFS[slot.itemId] : null;

              return (
                <button
                  key={`furnace-inv-${idx}`}
                  onClick={() => handleInventorySlotClick(idx)}
                  className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center relative border transition-all cursor-pointer ${
                    slot
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
