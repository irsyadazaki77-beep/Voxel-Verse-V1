// Artisan Crafting & Assembly Modal 2.0: Multi-Crafting, Category Filters & Transaction Safety
import React, { useState } from 'react';
import { CraftingRecipe, ItemStack } from '../types';
import { CRAFTING_RECIPES, CraftingSystem } from '../engine/items/CraftingSystem';
import { ITEM_DEFS } from '../engine/items/ItemRegistry';
import { ItemTooltip } from './ItemTooltip';

interface CraftingModalProps {
  inventory: (ItemStack | null)[];
  setInventory: React.Dispatch<React.SetStateAction<(ItemStack | null)[]>>;
  station?: 'hand' | 'crafting_bench' | 'anvil';
  onClose: () => void;
  onCraftSuccess?: (recipe: CraftingRecipe) => void;
}

export const CraftingModal: React.FC<CraftingModalProps> = ({
  inventory,
  setInventory,
  station = 'crafting_bench',
  onClose,
  onCraftSuccess,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeStation, setActiveStation] = useState<'hand' | 'crafting_bench' | 'anvil'>(station);
  const [searchQuery, setSearchQuery] = useState('');
  const [craftQuantity, setCraftQuantity] = useState<number>(1);
  const [hoveredStack, setHoveredStack] = useState<{ stack: ItemStack; pos: { x: number; y: number } } | null>(null);

  // Filter recipes according to station, category & search
  const filteredRecipes = CRAFTING_RECIPES.filter(recipe => {
    if (recipe.station === 'furnace') return false; // Furnaces use separate smelting UI
    if (activeStation === 'hand' && recipe.station !== 'hand') return false;
    if (activeStation === 'anvil' && recipe.station !== 'anvil') return false;
    if (activeStation === 'crafting_bench' && recipe.station === 'anvil') return false;

    if (selectedCategory !== 'all' && recipe.category !== selectedCategory) return false;
    if (searchQuery.trim() && !recipe.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleCraft = (recipe: CraftingRecipe) => {
    const newInv = [...inventory];
    const success = CraftingSystem.craft(recipe, newInv, craftQuantity);
    if (success) {
      setInventory(newInv);
      if (onCraftSuccess) onCraftSuccess(recipe);
    }
  };

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'basics', label: 'Basics' },
    { id: 'tools', label: 'Tools' },
    { id: 'weapons', label: 'Weapons' },
    { id: 'armor', label: 'Armor' },
    { id: 'building', label: 'Building' },
    { id: 'functional', label: 'Workstations' },
    { id: 'farming', label: 'Agriculture' },
  ];

  return (
    <div id="modal-crafting-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in font-sans">
      <div
        id="modal-crafting-card"
        className="w-full max-w-3xl bg-[#0e1015]/95 backdrop-blur-2xl rounded-2xl border border-white/10 p-6 shadow-2xl text-white relative flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white/90">
              {activeStation === 'crafting_bench'
                ? 'Artisan Workbench Assembly'
                : activeStation === 'anvil'
                ? 'Forgemaster Anvil Smithing'
                : 'Field Manual Crafting'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Station Switcher */}
            <div className="bg-black/40 p-1 rounded-xl border border-white/10 flex gap-1 text-xs">
              <button
                onClick={() => setActiveStation('hand')}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  activeStation === 'hand' ? 'bg-sky-500 text-white font-bold' : 'text-white/60 hover:text-white'
                }`}
              >
                Field (2x2)
              </button>
              <button
                onClick={() => setActiveStation('crafting_bench')}
                className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  activeStation === 'crafting_bench' ? 'bg-sky-500 text-white font-bold' : 'text-white/60 hover:text-white'
                }`}
              >
                Workbench (3x3)
              </button>
            </div>

            <button
              id="btn-close-craft"
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-xs font-mono transition-all cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Category Filter Tabs & Search Bar */}
        <div className="flex items-center justify-between gap-3 py-3 border-b border-white/5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-white/15 text-white border border-white/20'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Batch Craft multiplier */}
          <div className="flex items-center gap-1 bg-black/40 px-2 py-1 rounded-lg border border-white/10">
            <span className="text-[10px] text-white/50 font-bold">Qty:</span>
            {[1, 5, 10].map(qty => (
              <button
                key={qty}
                onClick={() => setCraftQuantity(qty)}
                className={`px-1.5 py-0.5 text-[10px] rounded-md font-mono transition-all cursor-pointer ${
                  craftQuantity === qty ? 'bg-sky-500 text-white font-bold' : 'text-white/60 hover:text-white'
                }`}
              >
                {qty}x
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search recipes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-black/40 px-3 py-1 rounded-lg border border-white/10 text-xs text-white placeholder-white/40 focus:outline-none focus:border-sky-400 w-36"
          />
        </div>

        {/* Recipe List (Scrollable) */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2 pr-1">
          {filteredRecipes.length === 0 ? (
            <div className="text-center py-12 text-white/40 text-xs">No matching recipes found for this station.</div>
          ) : (
            filteredRecipes.map(recipe => {
              const maxPossible = CraftingSystem.getMaxCraftable(recipe, inventory);
              const canCraft = maxPossible >= craftQuantity;
              const outputDef = ITEM_DEFS[recipe.output.itemId];
              const recipeInputs = recipe.inputs || recipe.ingredients || [];

              return (
                <div
                  key={recipe.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    canCraft
                      ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-sky-400/40'
                      : 'bg-black/20 border-white/5 opacity-60'
                  }`}
                >
                  {/* Left: Item Visual & Name */}
                  <div
                    className="flex items-center gap-3 cursor-pointer"
                    onMouseEnter={(e) =>
                      setHoveredStack({
                        stack: { itemId: recipe.output.itemId, count: recipe.output.count },
                        pos: { x: e.clientX, y: e.clientY },
                      })
                    }
                    onMouseLeave={() => setHoveredStack(null)}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md relative"
                      style={{ backgroundColor: outputDef?.iconColor || '#444' }}
                    >
                      <span className="text-[10px] font-bold text-white/90 drop-shadow">
                        {recipe.output.count * craftQuantity}
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white/90">{recipe.name}</span>
                        {outputDef?.tier !== undefined && outputDef.tier > 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-mono">
                            Tier {outputDef.tier}
                          </span>
                        )}
                        {maxPossible > 0 && (
                          <span className="text-[9px] text-emerald-400 font-mono">
                            (Can craft: {maxPossible})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-white/50">{recipe.description || outputDef?.description || ''}</span>
                    </div>
                  </div>

                  {/* Right: Ingredient Requirements & Craft Button */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      {recipeInputs.map((ing, idx) => {
                        const ingDef = ITEM_DEFS[ing.itemId];
                        const available = CraftingSystem.getItemCount(inventory, ing.itemId);
                        const required = ing.count * craftQuantity;
                        const hasEnough = available >= required;

                        return (
                          <div
                            key={idx}
                            title={`${ingDef?.name || ing.itemId}: ${available}/${required}`}
                            className={`px-2 py-1 rounded-lg border text-[10px] font-mono flex items-center gap-1 ${
                              hasEnough
                                ? 'bg-white/5 border-white/10 text-white/90'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                            }`}
                          >
                            <span className="truncate max-w-[70px]">{ingDef?.name || ing.itemId}</span>
                            <span className={hasEnough ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                              {available}/{required}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handleCraft(recipe)}
                      disabled={!canCraft}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        canCraft
                          ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/25 hover:scale-105 active:scale-95'
                          : 'bg-white/5 text-white/30 cursor-not-allowed'
                      }`}
                    >
                      Assemble
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Central Tooltip Render */}
        {hoveredStack && <ItemTooltip stack={hoveredStack.stack} position={hoveredStack.pos} />}
      </div>
    </div>
  );
};
