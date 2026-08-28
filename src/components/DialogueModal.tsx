// Minimal Utility NPC Dialogue & Barter Trading Modal
import React, { useState } from 'react';
import { EntityState, ItemStack } from '../types';
import { CraftingSystem } from '../engine/items/CraftingSystem';
import { ITEM_DEFS } from '../engine/items/ItemRegistry';

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

  const dialogueLines = entity.dialogue || ['Greetings, traveler!'];
  const trades = entity.tradeOffers || [];

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

  return (
    <div id="modal-dialogue-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div className="w-full max-w-xl bg-[#0e1015]/95 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 shadow-2xl text-white relative space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-sky-400"></div>
            <div>
              <h2 className="text-sm font-bold text-white/95">{entity.name}</h2>
              <span className="text-[10px] text-white/50 uppercase tracking-wider font-mono">Encounter NPC</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-xs font-mono transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Dialogue Box */}
        <div className="bg-black/40 p-4 rounded-xl border border-white/10 space-y-2">
          <p className="text-sm text-white/90 italic leading-relaxed">"{dialogueLines[dialogueIndex]}"</p>
          {dialogueLines.length > 1 && (
            <div className="flex justify-end">
              <button
                onClick={() => setDialogueIndex((dialogueIndex + 1) % dialogueLines.length)}
                className="text-xs text-sky-400 hover:text-sky-300 font-bold"
              >
                Next Dialogue →
              </button>
            </div>
          )}
        </div>

        {/* Trade Offers Section */}
        {trades.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Barter Trade Offers</span>
            <div className="space-y-1.5">
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
                    key={idx}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10"
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
                          ? 'bg-sky-500 hover:bg-sky-400 text-white shadow cursor-pointer'
                          : 'bg-white/10 text-white/30 cursor-not-allowed'
                      }`}
                    >
                      Trade ({userCount}/{trade.give.count})
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold"
          >
            Leave Conversation
          </button>
        </div>
      </div>
    </div>
  );
};
