// Storage Vault, Equipment & Character Stats Inspector Modal 2.0
import React, { useState } from 'react';
import { ItemStack, PlayerEquipment } from '../types';
import { ITEM_DEFS } from '../engine/items/ItemRegistry';
import { InventoryManager } from '../engine/items/InventoryManager';

interface InventoryModalProps {
  inventory: (ItemStack | null)[];
  setInventory: React.Dispatch<React.SetStateAction<(ItemStack | null)[]>>;
  equipment: PlayerEquipment;
  setEquipment: React.Dispatch<React.SetStateAction<PlayerEquipment>>;
  onClose: () => void;
  onDropItem?: (item: ItemStack) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  inventory,
  setInventory,
  equipment,
  setEquipment,
  onClose,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [hoveredItem, setHoveredItem] = useState<ItemStack | null>(null);

  // Calculate Character RPG Attributes
  let totalArmorDefense = 0;
  let totalThermalInsulation = 0;
  let totalMiningEfficiencyBonus = 0;

  const equipSlots: (keyof PlayerEquipment)[] = ['head', 'chest', 'legs', 'feet', 'accessory'];
  equipSlots.forEach(slotKey => {
    const item = equipment[slotKey];
    if (item) {
      const def = ITEM_DEFS[item.itemId];
      if (def) {
        if (def.armorValue) totalArmorDefense += def.armorValue;
        if (def.thermalInsulation) totalThermalInsulation += def.thermalInsulation;
      }
    }
  });

  const damageReductionPct = Math.round((totalArmorDefense / (totalArmorDefense + 60)) * 100);

  // Handle inventory slot click
  const handleSlotClick = (index: number, isRightClick: boolean = false) => {
    if (selectedSlot === null) {
      if (inventory[index]) {
        setSelectedSlot(index);
      }
    } else {
      if (selectedSlot === index) {
        setSelectedSlot(null);
        return;
      }

      const newInv = [...inventory];
      const source = newInv[selectedSlot];
      const target = newInv[index];

      if (isRightClick && source && !target) {
        // Split stack in half
        const splitCount = Math.ceil(source.count / 2);
        source.count -= splitCount;
        newInv[index] = { ...source, count: splitCount };
        if (source.count <= 0) newInv[selectedSlot] = null;
      } else {
        // Swap or merge
        const success = InventoryManager.moveSlot(newInv, selectedSlot, newInv, index);
        if (!success) {
          // Direct swap fallback
          newInv[selectedSlot] = target;
          newInv[index] = source;
        }
      }

      setInventory(newInv);
      setSelectedSlot(null);
    }
  };

  // Handle Armor & Accessory Equip/Unequip
  const handleEquipClick = (slotType: keyof PlayerEquipment) => {
    if (selectedSlot !== null) {
      const item = inventory[selectedSlot];
      if (item) {
        const def = ITEM_DEFS[item.itemId];
        if (def && (def.category === 'armor' || def.category === 'accessory') && def.armorSlot === slotType) {
          const oldEquip = equipment[slotType];
          const newInv = [...inventory];
          newInv[selectedSlot] = oldEquip;
          setInventory(newInv);
          setEquipment(prev => ({ ...prev, [slotType]: item }));
          setSelectedSlot(null);
        }
      }
    } else if (equipment[slotType]) {
      // Unequip to first empty slot
      const emptyIdx = inventory.findIndex(s => s === null);
      if (emptyIdx !== -1) {
        const newInv = [...inventory];
        newInv[emptyIdx] = equipment[slotType];
        setInventory(newInv);
        setEquipment(prev => ({ ...prev, [slotType]: null }));
      }
    }
  };

  return (
    <div id="modal-inventory-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div
        id="modal-inventory-card"
        className="w-full max-w-3xl bg-[#0e1015]/95 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 shadow-2xl text-white relative flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-sky-400"></div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/90">Storage & Equipment Vault</h2>
          </div>
          <button
            id="btn-close-inv"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-xs font-mono transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 overflow-y-auto">
          {/* Left Column: Equipment & Character Attributes */}
          <div className="space-y-4">
            {/* Armor & Trinket Slots */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
              <span className="text-[10px] uppercase font-bold text-white/40 block tracking-wider">Gear & Loadout</span>

              <div className="grid grid-cols-2 gap-2">
                {(['head', 'chest', 'legs', 'feet'] as const).map(slot => {
                  const item = equipment[slot];
                  const def = item ? ITEM_DEFS[item.itemId] : null;

                  return (
                    <button
                      key={slot}
                      id={`equip-slot-${slot}`}
                      onClick={() => handleEquipClick(slot)}
                      onMouseEnter={() => setHoveredItem(item)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className="h-14 bg-black/40 rounded-xl border border-white/10 hover:border-sky-400/50 flex flex-col items-center justify-center relative transition-all cursor-pointer"
                    >
                      <span className="text-[8px] uppercase text-white/30 font-bold mb-0.5">{slot}</span>
                      {item && def ? (
                        <>
                          <div className="w-5 h-5 rounded-xs" style={{ backgroundColor: def.iconColor }}></div>
                          <span className="text-[9px] font-mono text-white/90 truncate max-w-[70px]">{def.name}</span>
                        </>
                      ) : (
                        <span className="text-[9px] text-white/20 font-mono">Empty</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Accessory Slot */}
              <button
                id="equip-slot-accessory"
                onClick={() => handleEquipClick('accessory')}
                onMouseEnter={() => setHoveredItem(equipment.accessory || null)}
                onMouseLeave={() => setHoveredItem(null)}
                className="w-full h-11 bg-black/40 rounded-xl border border-white/10 hover:border-amber-400/50 flex items-center justify-between px-3 transition-all cursor-pointer"
              >
                <span className="text-[9px] uppercase text-amber-300 font-bold">💍 Charm / Trinket</span>
                {equipment.accessory && ITEM_DEFS[equipment.accessory.itemId] ? (
                  <span className="text-[10px] font-mono text-white/90">{ITEM_DEFS[equipment.accessory.itemId].name}</span>
                ) : (
                  <span className="text-[9px] text-white/20 font-mono">None</span>
                )}
              </button>
            </div>

            {/* Combat & Survival Metrics */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-2">
              <span className="text-[10px] uppercase font-bold text-white/40 block tracking-wider">Attributes</span>
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/60">Defense Rating</span>
                <span className="font-mono font-bold text-sky-400">{totalArmorDefense}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/60">Dmg Mitigation</span>
                <span className="font-mono font-bold text-emerald-400">{damageReductionPct}%</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/60">Thermal Insulation</span>
                <span className="font-mono font-bold text-amber-300">+{totalThermalInsulation}°C</span>
              </div>
            </div>
          </div>

          {/* Right Two Columns: 36-Slot Main Storage Backpack */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Backpack Storage (36 Slots)</span>
                <span className="text-[10px] text-white/40 font-mono">Tip: Left-Click move, Right-Click split</span>
              </div>

              {/* 36 Slot Grid */}
              <div className="grid grid-cols-9 gap-1.5 p-2 bg-black/40 rounded-xl border border-white/5">
                {inventory.map((slot, idx) => {
                  const isSelected = selectedSlot === idx;
                  const itemDef = slot ? ITEM_DEFS[slot.itemId] : null;

                  return (
                    <button
                      key={idx}
                      id={`inv-slot-${idx}`}
                      onClick={e => handleSlotClick(idx, e.type === 'contextmenu')}
                      onContextMenu={e => {
                        e.preventDefault();
                        handleSlotClick(idx, true);
                      }}
                      onMouseEnter={() => setHoveredItem(slot)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className={`w-11 h-11 rounded-lg flex flex-col items-center justify-center relative border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-sky-400 bg-sky-500/20 shadow-lg shadow-sky-500/20 scale-105'
                          : slot
                          ? 'border-white/10 bg-white/5 hover:bg-white/15'
                          : 'border-white/5 bg-black/20 hover:border-white/15'
                      }`}
                    >
                      {slot && itemDef && (
                        <>
                          <div className="w-5 h-5 rounded-xs" style={{ backgroundColor: itemDef.iconColor }}></div>
                          {slot.count > 1 && (
                            <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-bold text-white drop-shadow">
                              {slot.count}
                            </span>
                          )}
                          {slot.durability !== undefined && slot.maxDurability && (
                            <div className="absolute bottom-0.5 left-1 right-1 h-0.5 bg-black/80 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-400"
                                style={{ width: `${(slot.durability / slot.maxDurability) * 100}%` }}
                              ></div>
                            </div>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Item Inspector Tooltip / Card */}
            <div className="bg-white/5 p-3 rounded-xl border border-white/10 min-h-[70px] flex items-center justify-between">
              {hoveredItem && ITEM_DEFS[hoveredItem.itemId] ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">{ITEM_DEFS[hoveredItem.itemId].name}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/70 font-mono uppercase">
                      {ITEM_DEFS[hoveredItem.itemId].category}
                    </span>
                    {ITEM_DEFS[hoveredItem.itemId].tier !== undefined && ITEM_DEFS[hoveredItem.itemId].tier! > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono">
                        Tier {ITEM_DEFS[hoveredItem.itemId].tier}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-white/50">{ITEM_DEFS[hoveredItem.itemId].description}</p>
                </div>
              ) : (
                <span className="text-[10px] text-white/30 italic">Hover an item to inspect stats and details.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
