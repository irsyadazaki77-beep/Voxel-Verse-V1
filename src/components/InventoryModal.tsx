// Storage Vault, Equipment & Character Stats Inspector Modal 3.0
import React, { useState, useEffect } from 'react';
import { ItemStack, PlayerEquipment } from '../types';
import { ITEM_DEFS } from '../engine/items/ItemRegistry';
import { InventoryManager } from '../engine/items/InventoryManager';
import { X, Shield, Droplets, Zap, Activity, Info, ChevronRight, Package, ArrowRightLeft } from 'lucide-react';

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
  const [hoveredItem, setHoveredItem] = useState<{ item: ItemStack | null, isEquipped: boolean, slotId?: number | string }>({ item: null, isEquipped: false });

  // Handle outside click to clear selection
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.inventory-slot') === null) {
        setSelectedSlot(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculate Character RPG Attributes
  let totalArmorDefense = 0;
  let totalThermalInsulation = 0;

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

  // Quick Move Support (Shift+Click)
  const handleSlotClick = (e: React.MouseEvent, index: number, isRightClick: boolean = false) => {
    e.stopPropagation();
    
    // Quick Move logic (Shift + Left Click)
    if (e.shiftKey && !isRightClick && inventory[index]) {
      const item = inventory[index]!;
      const def = ITEM_DEFS[item.itemId];
      if (def && (def.category === 'armor' || def.category === 'accessory') && def.armorSlot) {
        const slotType = def.armorSlot as keyof PlayerEquipment;
        const oldEquip = equipment[slotType];
        
        const newInv = [...inventory];
        newInv[index] = oldEquip || null;
        setInventory(newInv);
        setEquipment(prev => ({ ...prev, [slotType]: item }));
        setSelectedSlot(null);
      }
      return;
    }

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

  const handleEquipClick = (e: React.MouseEvent, slotType: keyof PlayerEquipment) => {
    e.stopPropagation();
    
    // Quick Move logic (Shift + Click to unequip)
    if (e.shiftKey && equipment[slotType]) {
      const emptyIdx = inventory.findIndex(s => s === null);
      if (emptyIdx !== -1) {
        const newInv = [...inventory];
        newInv[emptyIdx] = equipment[slotType];
        setInventory(newInv);
        setEquipment(prev => ({ ...prev, [slotType]: null }));
      }
      return;
    }

    if (selectedSlot !== null) {
      const item = inventory[selectedSlot];
      if (item) {
        const def = ITEM_DEFS[item.itemId];
        if (def && (def.category === 'armor' || def.category === 'accessory') && def.armorSlot === slotType) {
          const oldEquip = equipment[slotType];
          const newInv = [...inventory];
          newInv[selectedSlot] = oldEquip || null;
          setInventory(newInv);
          setEquipment(prev => ({ ...prev, [slotType]: item }));
          setSelectedSlot(null);
        }
      }
    } else if (equipment[slotType]) {
      // Regular unequip to first empty slot
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-8 select-none animate-in fade-in duration-200 ui-scaled">
      <div className="w-full max-w-5xl bg-[var(--vv-bg)] border border-[var(--vv-border)] rounded-2xl flex flex-col shadow-2xl h-[85vh] sm:h-[80vh] overflow-hidden text-[var(--vv-text-main)] font-sans">
        
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between px-6 py-4 border-b border-[var(--vv-border)] bg-[var(--vv-surface)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--vv-primary)]/10 border border-[var(--vv-primary)]/30 text-[var(--vv-primary)]">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wide text-white flex items-center gap-2">
                Inventory & Equipment
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[var(--vv-elevated)] hover:bg-[var(--vv-border)] text-[var(--vv-text-muted)] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* LEFT PANEL: Equipment & Stats */}
          <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-[var(--vv-border-subtle)] bg-[var(--vv-surface)] p-6 overflow-y-auto flex flex-col gap-8">
            
            {/* Equipment Grid */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[var(--vv-text-muted)] uppercase tracking-widest flex items-center gap-2">
                <Shield className="w-3.5 h-3.5" /> Equipped Gear
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                {(['head', 'chest', 'legs', 'feet', 'accessory'] as const).map(slot => {
                  const item = equipment[slot];
                  const def = item ? ITEM_DEFS[item.itemId] : null;

                  return (
                    <button
                      key={slot}
                      onClick={(e) => handleEquipClick(e, slot)}
                      onMouseEnter={() => setHoveredItem({ item, isEquipped: true, slotId: slot })}
                      onMouseLeave={() => setHoveredItem({ item: null, isEquipped: false })}
                      className={`inventory-slot h-16 rounded-xl border flex flex-col items-center justify-center relative transition-colors ${
                        item ? 'bg-black/40 border-[var(--vv-primary)]/40 hover:border-[var(--vv-primary)]' : 'bg-black/20 border-[var(--vv-border-subtle)] border-dashed hover:border-[var(--vv-border)]'
                      }`}
                    >
                      {item && def ? (
                        <>
                          <div className="text-xl font-mono">{def.name.charAt(0) || '📦'}</div>
                          <div className="absolute -bottom-2 -right-1 text-[9px] font-bold bg-[var(--vv-surface)] px-1.5 py-0.5 rounded border border-[var(--vv-border)] capitalize text-[var(--vv-text-muted)]">
                            {slot}
                          </div>
                        </>
                      ) : (
                        <span className="text-[10px] text-[var(--vv-text-muted)] uppercase font-semibold">{slot}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="text-[10px] text-[var(--vv-text-muted)] italic text-center mt-2 flex items-center justify-center gap-1">
                <Info className="w-3 h-3" /> Shift-click to quick equip/unequip
              </div>
            </div>

            {/* Character Stats Panel */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[var(--vv-text-muted)] uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" /> Attributes
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-lg border border-[var(--vv-border-subtle)]">
                  <div className="flex items-center gap-2 text-sm text-[var(--vv-text-muted)]">
                    <Shield className="w-4 h-4 text-[var(--vv-primary)]" />
                    <span>Armor Defense</span>
                  </div>
                  <span className="font-mono text-white font-bold">{totalArmorDefense}</span>
                </div>
                <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-lg border border-[var(--vv-border-subtle)]">
                  <div className="flex items-center gap-2 text-sm text-[var(--vv-text-muted)]">
                    <Zap className="w-4 h-4 text-[var(--vv-warning)]" />
                    <span>Damage Resist</span>
                  </div>
                  <span className="font-mono text-white font-bold">{damageReductionPct}%</span>
                </div>
                <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-lg border border-[var(--vv-border-subtle)]">
                  <div className="flex items-center gap-2 text-sm text-[var(--vv-text-muted)]">
                    <Droplets className="w-4 h-4 text-sky-400" />
                    <span>Thermal Insulation</span>
                  </div>
                  <span className="font-mono text-white font-bold">{totalThermalInsulation}</span>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: Inventory Grid & Inspector */}
          <div className="flex-1 flex flex-col h-full bg-[var(--vv-bg)] relative">
            
            {/* Inspector Tooltip (Inline at top of inventory area) */}
            <div className="h-32 border-b border-[var(--vv-border-subtle)] bg-[var(--vv-elevated)] p-4 sm:p-6 shrink-0 flex items-center">
              {hoveredItem.item && ITEM_DEFS[hoveredItem.item.itemId] ? (
                <div className="flex items-start gap-4 w-full animate-fade-in">
                  <div className="w-16 h-16 rounded-xl bg-black/40 border border-[var(--vv-border)] flex items-center justify-center text-3xl shrink-0 shadow-inner">
                    {ITEM_DEFS[hoveredItem.item.itemId].name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-lg font-bold text-white leading-tight">
                          {ITEM_DEFS[hoveredItem.item.itemId].name}
                        </h4>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--vv-primary)] mt-0.5">
                          {ITEM_DEFS[hoveredItem.item.itemId].category}
                        </div>
                      </div>
                      <div className="text-right">
                        {ITEM_DEFS[hoveredItem.item.itemId].armorValue !== undefined && (
                          <div className="text-xs font-mono font-bold text-[var(--vv-primary)] bg-[var(--vv-primary)]/10 px-2 py-1 rounded border border-[var(--vv-primary)]/20">
                            +{ITEM_DEFS[hoveredItem.item.itemId].armorValue} Armor
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-[var(--vv-text-muted)] mt-2 max-w-lg leading-relaxed">
                      {ITEM_DEFS[hoveredItem.item.itemId].description}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center w-full h-full text-[var(--vv-text-muted)] text-sm italic opacity-50">
                  Hover over an item to inspect details.
                </div>
              )}
            </div>

            {/* Inventory Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 sm:gap-3">
                {inventory.map((item, index) => {
                  const def = item ? ITEM_DEFS[item.itemId] : null;
                  const isSelected = selectedSlot === index;
                  
                  return (
                    <button
                      key={index}
                      onContextMenu={(e) => { e.preventDefault(); handleSlotClick(e, index, true); }}
                      onClick={(e) => handleSlotClick(e, index)}
                      onMouseEnter={() => setHoveredItem({ item, isEquipped: false, slotId: index })}
                      onMouseLeave={() => setHoveredItem({ item: null, isEquipped: false })}
                      className={`inventory-slot aspect-square rounded-xl border flex items-center justify-center relative transition-all ${
                        isSelected 
                          ? 'bg-[var(--vv-primary)]/20 border-[var(--vv-primary)] shadow-[0_0_15px_rgba(56,189,248,0.3)] ring-2 ring-[var(--vv-primary)] ring-offset-2 ring-offset-[var(--vv-bg)] scale-105 z-10' 
                          : item 
                            ? 'bg-[var(--vv-surface)] border-[var(--vv-border)] hover:bg-[var(--vv-elevated)] hover:border-[var(--vv-text-muted)]' 
                            : 'bg-black/20 border-[var(--vv-border-subtle)] hover:border-[var(--vv-border)]'
                      }`}
                    >
                      {item && def ? (
                        <>
                          <div className="text-2xl sm:text-3xl filter drop-shadow-md transition-transform group-hover:scale-110">
                            {def.name.charAt(0)}
                          </div>
                          {item.count > 1 && (
                            <div className="absolute bottom-1 right-1.5 text-[10px] font-mono font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] bg-black/50 px-1 rounded">
                              {item.count}
                            </div>
                          )}
                          {def.durability !== undefined && item.durability !== undefined && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60 rounded-b-xl overflow-hidden">
                              <div 
                                className={`h-full ${item.durability / def.durability < 0.3 ? 'bg-[var(--vv-danger)]' : 'bg-[var(--vv-success)]'}`} 
                                style={{ width: `${(item.durability / def.durability) * 100}%` }}
                              />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-[10px] text-[var(--vv-border)]">{index + 1}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            
          </div>

        </div>
      </div>
    </div>
  );
};
