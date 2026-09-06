// Interactive NPC Dialogue, Reputation-Based Barter, and Nusantara Settlement Upgrade Interface
import React, { useState } from 'react';
import { EntityState, ItemStack } from '../types';
import { CraftingSystem } from '../engine/items/CraftingSystem';
import { ITEM_DEFS } from '../engine/items/ItemRegistry';
import { SettlementManager } from '../engine/settlement/SettlementManager';
import { NPCScheduleManager, NPCRoleType } from '../engine/settlement/NPCScheduleManager';

interface DialogueModalProps {
  entity: EntityState;
  inventory: (ItemStack | null)[];
  setInventory: React.Dispatch<React.SetStateAction<(ItemStack | null)[]>>;
  onClose: () => void;
}

export const DialogueModal: React.FC<DialogueModalProps> = ({
  entity,
  inventory,
  setInventory,
  onClose,
}) => {
  const [dialogueIndex, setDialogueIndex] = useState(0);

  // Identify if NPC belongs to a settlement
  const settlement = SettlementManager.getSettlementByPos(entity.position[0], entity.position[2]);
  
  // Load dynamic dialogues and trades from SettlementManager if in a settlement
  let dialogueLines = entity.dialogue || ['Salam sejahtera, pengembara!'];
  let trades = entity.tradeOffers || [];
  let npcName = entity.name || 'Warga Desa';
  let npcRole = (entity.modelType || 'farmer') as NPCRoleType;
  let roleTitle = 'Petani & Perajin';
  let scheduleActivity = 'Aktivitas Keseharian';
  let scheduleDescription = 'Bekerja bersama warga desa.';
  let discountPercent = 0;

  if (settlement) {
    const npcData = SettlementManager.getNPCDialogue(entity.modelType || entity.id, false, settlement.id);
    dialogueLines = npcData.lines;
    trades = npcData.trades || [];
    npcName = npcData.name;
    npcRole = (npcData.role as NPCRoleType) || 'farmer';
    roleTitle = npcData.roleTitle;
    scheduleActivity = npcData.scheduleActivity;
    scheduleDescription = npcData.scheduleDescription;
    discountPercent = npcData.discountPercent;
  } else {
    const roleDef = NPCScheduleManager.getRoleDef(npcRole);
    roleTitle = roleDef.titleIndonesian;
    const sched = NPCScheduleManager.getActiveSchedule(npcRole, 12);
    scheduleActivity = sched.activityName;
    scheduleDescription = sched.activityDescription;
  }

  const handleTrade = (trade: { give: { itemId: string; count: number }; receive: { itemId: string; count: number } }) => {
    // Check if player has required give item
    const userCount = inventory.reduce(
      (acc, s) => (s && s.itemId === trade.give.itemId ? acc + s.count : acc),
      0
    );
    if (userCount < trade.give.count) return;

    // Deduct give item
    const newInv = [...inventory];
    let rem = trade.give.count;
    for (let i = 0; i < newInv.length; i++) {
      const slot = newInv[i];
      if (slot && slot.itemId === trade.give.itemId) {
        const deduct = Math.min(slot.count, rem);
        slot.count -= deduct;
        rem -= deduct;
        if (slot.count <= 0) newInv[i] = null;
        if (rem <= 0) break;
      }
    }

    // Add receive item
    CraftingSystem.addItem(newInv, trade.receive.itemId, trade.receive.count);
    setInventory(newInv);
  };

  const handleUpgrade = (reqs: any[]) => {
    if (!settlement) return;

    // Deduct items from inventory
    const newInv = [...inventory];
    for (const req of reqs) {
      let rem = req.count;
      for (let i = 0; i < newInv.length; i++) {
        const slot = newInv[i];
        if (slot && slot.itemId === req.itemId) {
          const deduct = Math.min(slot.count, rem);
          slot.count -= deduct;
          rem -= deduct;
          if (slot.count <= 0) newInv[i] = null;
          if (rem <= 0) break;
        }
      }
    }
    setInventory(newInv);
    SettlementManager.upgradeSettlement(settlement.id);
  };

  const canAffordUpgrade = (reqs: any[]) => {
    return reqs.every(req => {
      const userCount = inventory.reduce(
        (acc, s) => (s && s.itemId === req.itemId ? acc + s.count : acc),
        0
      );
      return userCount >= req.count;
    });
  };

  // Grab settlement parameters if active
  const sState = settlement ? SettlementManager.getSettlementState(settlement.id) : null;
  const repLevel = settlement ? SettlementManager.getReputationLevel(settlement.id) : 'neutral';
  const repColor = settlement ? SettlementManager.getReputationColor(repLevel) : '';
  const repName = settlement ? SettlementManager.getReputationName(repLevel) : 'Netral';
  const upgradeReqs = sState ? SettlementManager.getUpgradeRequirements(settlement!.id, sState.level) : [];

  // Regional Badge and Cultural Focus
  const getRegionInfo = () => {
    if (!settlement) return { title: 'Nusantara Pengelana', icon: '🧭', loop: 'Pertukaran Bebas' };
    const name = settlement.name.toLowerCase();
    if (name.includes('wilwatikta') || name.includes('jawa')) {
      return { title: 'Kerajaan Tanah Jawa', icon: '🌾', loop: 'Padi, Kayu Jati, Kerajinan Pasar' };
    }
    if (name.includes('minang') || name.includes('luhak')) {
      return { title: 'Dataran Tinggi Minang', icon: '⛰️', loop: 'Rempah Cengkeh, Kopi Gunung, Tenun Silungkang' };
    }
    if (name.includes('borneo') || name.includes('betang')) {
      return { title: 'Rimba Raya Dayak Borneo', icon: '🌿', loop: 'Kayu Besi Ulin, Damar, Jalur Sungai' };
    }
    if (name.includes('bali') || name.includes('subak')) {
      return { title: 'Desa Subak & Puri Bali', icon: '🌺', loop: 'Irigasi Subak, Ukiran Paras, Dupa Pusaka' };
    }
    if (name.includes('toraja') || name.includes('tongkonan')) {
      return { title: 'Tanah Leluhur Toraja', icon: '🏛️', loop: 'Kopi Arabika, Pahat Pa\'ssura, Batu Karst' };
    }
    if (name.includes('papua') || name.includes('silimo')) {
      return { title: 'Lembah Baliem & Pesisir Papua', icon: '🦅', loop: 'Anyaman Noken, Gaharu, Hasil Rimba' };
    }
    return { title: 'Kepulauan Rempah & Maritim', icon: '⛵', loop: 'Perikanan, Garam Laut, Pelayaran Samudra' };
  };

  const regInfo = getRegionInfo();

  return (
    <div id="modal-dialogue-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="w-full max-w-xl bg-[#0e1015]/95 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 shadow-2xl text-white relative flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg">
              {regInfo.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white/95">{npcName}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                  {roleTitle}
                </span>
              </div>
              <span className="text-[11px] text-white/50 tracking-wide">
                {regInfo.title} {settlement ? `• ${settlement.name}` : ''}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-xs font-mono transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Schedule & Routine Status Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-white/5 rounded-xl border border-white/5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-mono">⚡</span>
            <div>
              <span className="font-semibold text-white/90">{scheduleActivity}</span>
              <p className="text-[10px] text-white/50 leading-none mt-0.5">{scheduleDescription}</p>
            </div>
          </div>
          {discountPercent > 0 && (
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
              Diskon Adat -{discountPercent}%
            </span>
          )}
        </div>

        {/* Settlement HUD */}
        {settlement && sState && (
          <div className="flex flex-col gap-2 p-3 bg-black/40 rounded-xl border border-white/5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-white/70">Fokus Ekonomi Wilayah:</span>
              <span className="font-mono text-amber-300 text-[11px]">{regInfo.loop}</span>
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-white/70">Tingkatan Desa:</span>
                <span className="font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
                  Tier {sState.level} / 5
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/70">Reputasi Adat:</span>
                <span className={`font-mono font-bold ${repColor}`}>
                  {repName} ({sState.reputation >= 0 ? '+' : ''}{sState.reputation})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Dialogue Box */}
        <div className="bg-black/50 p-4 rounded-xl border border-white/10 space-y-2">
          <p className="text-sm text-white/90 italic leading-relaxed">"{dialogueLines[dialogueIndex] || 'Salam sejahtera!'}"</p>
          {dialogueLines.length > 1 && (
            <div className="flex justify-end">
              <button
                onClick={() => setDialogueIndex((dialogueIndex + 1) % dialogueLines.length)}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold cursor-pointer transition-colors"
              >
                Lanjut Berbincang →
              </button>
            </div>
          )}
        </div>

        {/* Trade Offers Section */}
        {repLevel !== 'hostile' && trades.length > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Tawaran Barter Komoditas Lokal</span>
              <span className="text-[10px] text-white/40 font-mono">Transaksi Sah Adat</span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {trades.map((trade, idx) => {
                const giveDef = ITEM_DEFS[trade.give.itemId];
                const recDef = ITEM_DEFS[trade.receive.itemId];
                const userCount = inventory.reduce(
                  (acc, s) => (s && s.itemId === trade.give.itemId ? acc + s.count : acc),
                  0
                );
                const canAfford = userCount >= trade.give.count;

                return (
                  <div
                    key={`trade-${idx}-${trade.give.itemId}`}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-mono text-rose-300">
                        {trade.give.count}x {giveDef?.name || trade.give.itemId}
                      </span>
                      <span className="text-white/40">➔</span>
                      <span className="font-mono text-emerald-300 font-bold">
                        {trade.receive.count}x {recDef?.name || trade.receive.itemId}
                      </span>
                    </div>

                    <button
                      disabled={!canAfford}
                      onClick={() => handleTrade(trade)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-white shadow cursor-pointer'
                          : 'bg-white/10 text-white/30 cursor-not-allowed'
                      }`}
                    >
                      Barter ({userCount}/{trade.give.count})
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Settlement Upgrade Progression Block */}
        {settlement && sState && sState.level < 5 && upgradeReqs.length > 0 && (
          <div className="p-4 bg-amber-500/5 rounded-xl border border-amber-500/15 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                Tingkatkan Kemakmuran Permukiman (Tier {sState.level} ➔ {sState.level + 1})
              </span>
              <span className="text-[10px] text-white/50 font-mono">Bonus Reputasi: +25</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {upgradeReqs.map((req, idx) => {
                const itemDef = ITEM_DEFS[req.itemId];
                const userQty = inventory.reduce(
                  (acc, s) => (s && s.itemId === req.itemId ? acc + s.count : acc),
                  0
                );
                const isMet = userQty >= req.count;
                return (
                  <div key={`upgrade-req-${idx}-${req.itemId}`} className="flex justify-between items-center text-xs p-2 rounded bg-black/40 border border-white/5">
                    <span className="text-white/70">{itemDef?.name || req.itemId}</span>
                    <span className={`font-mono font-bold ${isMet ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {userQty}/{req.count}
                    </span>
                  </div>
                );
              })}
            </div>

            <button
              disabled={!canAffordUpgrade(upgradeReqs)}
              onClick={() => handleUpgrade(upgradeReqs)}
              className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${
                canAffordUpgrade(upgradeReqs)
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 hover:brightness-110 text-white cursor-pointer font-bold'
                  : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
              }`}
            >
              Donasikan Material Pembangunan Adat
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            Tutup Percakapan
          </button>
        </div>
      </div>
    </div>
  );
};

