// Storage Vault (Chest) Modal with 27-Slot Storage and Quick Transfer
import React, { useState } from 'react';
import { ItemStack } from '../types';
import { ITEM_DEFS } from '../engine/items/ItemRegistry';
import { BlockPlacementEngine } from '../engine/world/BlockPlacementEngine';

interface ChestModalProps {
  chestPos: [number, number, number];
  playerInventory: (ItemStack | null)[];
  setPlayerInventory: React.Dispatch<React.SetStateAction<(ItemStack | null)[]>>;
  onClose: () => void;
}

export const ChestModal: React.FC<ChestModalProps> = ({
  chestPos,
  playerInventory,
  setPlayerInventory,
  onClose,
}) => {
  const [chestSlots, setChestSlots] = useState<(ItemStack | null)[]>(() => {
    return BlockPlacementEngine.getContainer(chestPos);
  });

  const [selectedSlot, setSelectedSlot] = useState<{ source: 'chest' | 'inventory'; index: number } | null>(null);

  // Sync chest state back to BlockPlacementEngine
  const updateChestSlots = (newSlots: (ItemStack | null)[]) => {
    setChestSlots(newSlots);
    BlockPlacementEngine.setContainer(chestPos, newSlots);
  };

  const handleSlotClick = (source: 'chest' | 'inventory', index: number, isShiftKey: boolean) => {
    const isChest = source === 'chest';
    const currentList = isChest ? [...chestSlots] : [...playerInventory];
    const targetList = isChest ? [...playerInventory] : [...chestSlots];
    const item = currentList[index];

    // Quick Shift-Click transfer to other inventory
    if (isShiftKey && item) {
      const def = ITEM_DEFS[item.itemId];
      const maxStack = def?.maxStack || 64;
      let remaining = item.count;

      // 1. Try stacking into existing matching slots
      for (let i = 0; i < targetList.length; i++) {
        const t = targetList[i];
        if (t && t.itemId === item.itemId && t.count < maxStack) {
          const space = maxStack - t.count;
          const toAdd = Math.min(space, remaining);
          t.count += toAdd;
          remaining -= toAdd;
          if (remaining <= 0) break;
        }
      }

      // 2. Try placing into first empty slot
      if (remaining > 0) {
        for (let i = 0; i < targetList.length; i++) {
          if (targetList[i] === null) {
            targetList[i] = { ...item, count: remaining };
            remaining = 0;
            break;
          }
        }
      }

      if (remaining === 0) {
        currentList[index] = null;
      } else {
        currentList[index] = { ...item, count: remaining };
      }

      if (isChest) {
        updateChestSlots(currentList);
        setPlayerInventory(targetList);
      } else {
        setPlayerInventory(currentList);
        updateChestSlots(targetList);
      }
      setSelectedSlot(null);
      return;
    }

    // Normal Click to select and swap/merge
    if (!selectedSlot) {
      if (item) {
        setSelectedSlot({ source, index });
      }
    } else {
      if (selectedSlot.source === source && selectedSlot.index === index) {
        setSelectedSlot(null);
        return;
      }

      const selIsChest = selectedSlot.source === 'chest';
      const selList = selIsChest ? [...chestSlots] : [...playerInventory];
      const selItem = selList[selectedSlot.index];

      if (!selItem) {
        setSelectedSlot(null);
        return;
      }

      if (selectedSlot.source === source) {
        // Moving within same inventory
        if (item && item.itemId === selItem.itemId) {
          const def = ITEM_DEFS[item.itemId];
          const maxStack = def?.maxStack || 64;
          const space = maxStack - item.count;
          const toAdd = Math.min(space, selItem.count);
          item.count += toAdd;
          selItem.count -= toAdd;
          if (selItem.count <= 0) {
            selList[selectedSlot.index] = null;
          }
        } else {
          // Swap
          selList[selectedSlot.index] = item;
          selList[index] = selItem;
        }

        if (source === 'chest') updateChestSlots(selList);
        else setPlayerInventory(selList);
      } else {
        // Moving across inventories
        const destList = isChest ? [...chestSlots] : [...playerInventory];
        const targetItem = destList[index];

        if (targetItem && targetItem.itemId === selItem.itemId) {
          const def = ITEM_DEFS[targetItem.itemId];
          const maxStack = def?.maxStack || 64;
          const space = maxStack - targetItem.count;
          const toAdd = Math.min(space, selItem.count);
          targetItem.count += toAdd;
          selItem.count -= toAdd;
          if (selItem.count <= 0) {
            selList[selectedSlot.index] = null;
          }
        } else {
          // Swap
          selList[selectedSlot.index] = targetItem;
          destList[index] = selItem;
        }

        if (selIsChest) updateChestSlots(selList);
        else setPlayerInventory(selList);

        if (isChest) updateChestSlots(destList);
        else setPlayerInventory(destList);
      }

      setSelectedSlot(null);
    }
  };

  const renderSlot = (item: ItemStack | null, index: number, source: 'chest' | 'inventory') => {
    const isSelected = selectedSlot?.source === source && selectedSlot?.index === index;
    const def = item ? ITEM_DEFS[item.itemId] : null;

    return (
      <button
        key={`${source}-${index}`}
        id={`slot-${source}-${index}`}
        onClick={(e) => handleSlotClick(source, index, e.shiftKey)}
        className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center relative transition-all border cursor-pointer select-none ${
          isSelected
            ? 'bg-amber-500/30 border-amber-400 ring-2 ring-amber-400/50 scale-105 shadow-lg'
            : item
            ? 'bg-white/10 hover:bg-white/20 border-white/15'
            : 'bg-black/30 hover:bg-white/5 border-white/5'
        }`}
      >
        {item && def ? (
          <>
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shadow-sm"
              style={{ backgroundColor: def.iconColor, color: '#fff' }}
            >
              {def.name.slice(0, 2).toUpperCase()}
            </div>
            {item.count > 1 && (
              <span className="absolute bottom-1 right-1.5 text-[10px] font-mono font-bold text-white bg-black/60 px-1 rounded">
                {item.count}
              </span>
            )}
          </>
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
        )}
      </button>
    );
  };

  return (
    <div id="modal-chest-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div
        id="modal-chest-card"
        className="w-full max-w-2xl bg-[#0e1015]/95 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 shadow-2xl text-white relative flex flex-col gap-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-md bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">Storage Vault</h2>
              <p className="text-[11px] text-white/50 font-mono">Position: [{chestPos.join(', ')}]</p>
            </div>
          </div>

          <button
            id="btn-close-chest"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-xs font-mono transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Chest Vault Grid (27 slots: 3x9) */}
        <div>
          <div className="text-xs font-bold text-amber-400 mb-2 uppercase tracking-wide flex items-center justify-between">
            <span>Vault Capacity (27 Slots)</span>
            <span className="text-[10px] text-white/40 font-normal">Shift+Click to quick transfer</span>
          </div>
          <div className="grid grid-cols-9 gap-2 p-3 bg-black/40 rounded-xl border border-white/10">
            {chestSlots.map((item, idx) => renderSlot(item, idx, 'chest'))}
          </div>
        </div>

        {/* Player Inventory Grid (36 slots: 27 main + 9 hotbar) */}
        <div>
          <div className="text-xs font-bold text-sky-400 mb-2 uppercase tracking-wide">
            Player Inventory & Hotbar
          </div>
          <div className="space-y-2">
            {/* Main Inventory (27 slots) */}
            <div className="grid grid-cols-9 gap-2 p-3 bg-black/40 rounded-xl border border-white/10">
              {playerInventory.slice(9, 36).map((item, idx) => renderSlot(item, idx + 9, 'inventory'))}
            </div>

            {/* Hotbar (9 slots) */}
            <div className="grid grid-cols-9 gap-2 p-3 bg-sky-950/30 rounded-xl border border-sky-500/20">
              {playerInventory.slice(0, 9).map((item, idx) => renderSlot(item, idx, 'inventory'))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
