import React, { useState, useEffect } from 'react';
import { Settings, Cpu, Shield, Zap, Filter, Hammer, X } from 'lucide-react';
import { AetherNetworkManager } from '../engine/engineering/AetherNetworkManager';
import { AetherNode, AetherNodeConfig } from '../engine/engineering/AetherNetworkTypes';
import { CRAFTING_RECIPES } from '../engine/items/CraftingSystem';

interface EngineeringModalProps {
  pos: [number, number, number];
  onClose: () => void;
}

export const EngineeringModal: React.FC<EngineeringModalProps> = ({ pos, onClose }) => {
  const manager = AetherNetworkManager.getInstance();
  const nodeKey = `${pos[0]},${pos[1]},${pos[2]}`;
  const [node, setNode] = useState<AetherNode | undefined>(manager.getNode(pos));
  const [config, setConfig] = useState<AetherNodeConfig>(
    node?.config || { logicOp: 'AND', delayTicks: 4, mode: 'whitelist' }
  );

  useEffect(() => {
    const currentNode = manager.getNode(pos);
    if (currentNode) {
      setNode(currentNode);
      setConfig(currentNode.config);
    }
  }, [pos]);

  if (!node) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 text-center max-w-sm w-full shadow-2xl">
          <p className="text-slate-300 mb-4">No active Aether Network component detected at position [{pos.join(', ')}].</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleSaveConfig = () => {
    manager.updateNodeConfig(pos, config);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900/95 border border-cyan-500/30 rounded-2xl max-w-md w-full p-6 text-slate-100 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-6 border-b border-cyan-500/20 pb-4">
          <div className="p-2.5 bg-cyan-950/80 rounded-xl border border-cyan-500/40 text-cyan-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-cyan-300 capitalize tracking-wide">
              {node.nodeType.replace('_', ' ')} Node
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Pos: [{pos[0]}, {pos[1]}, {pos[2]}] | Network ID: {node.networkId || 'Standalone'}
            </p>
          </div>
        </div>

        {/* Dynamic Node Parameters */}
        <div className="space-y-5 text-sm">
          {/* Logic Rune Config */}
          {node.nodeType === 'logic_rune' && (
            <div>
              <label className="block text-xs font-medium text-cyan-400 uppercase tracking-wider mb-2">
                Boolean Logic Gate Operation
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['AND', 'OR', 'NOT', 'XOR'] as const).map((op) => (
                  <button
                    key={op}
                    onClick={() => setConfig({ ...config, logicOp: op })}
                    className={`py-2 rounded-lg font-mono font-bold text-xs transition border ${
                      config.logicOp === op
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-sm shadow-cyan-500/20'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {op}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Delay Rune Config */}
          {node.nodeType === 'delay_rune' && (
            <div>
              <label className="block text-xs font-medium text-cyan-400 uppercase tracking-wider mb-2">
                Signal Delay Duration ({config.delayTicks || 4} ticks / {((config.delayTicks || 4) * 0.05).toFixed(2)}s)
              </label>
              <input
                type="range"
                min="1"
                max="40"
                value={config.delayTicks || 4}
                onChange={(e) => setConfig({ ...config, delayTicks: parseInt(e.target.value) })}
                className="w-full accent-cyan-400 bg-slate-800 h-2 rounded-lg cursor-pointer"
              />
            </div>
          )}

          {/* Resonance Fabricator Config */}
          {node.nodeType === 'fabricator' && (
            <div>
              <label className="block text-xs font-medium text-cyan-400 uppercase tracking-wider mb-2">
                Automated Crafting Target
              </label>
              <select
                value={config.recipeId || ''}
                onChange={(e) => setConfig({ ...config, recipeId: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200 text-xs focus:border-cyan-400 outline-none"
              >
                <option value="">Select Recipe...</option>
                {CRAFTING_RECIPES.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sentinel Turret Config */}
          {node.nodeType === 'turret' && (
            <div>
              <label className="block text-xs font-medium text-cyan-400 uppercase tracking-wider mb-2">
                Targeting Priority Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['hostiles', 'bosses', 'all'] as const).map((target) => (
                  <button
                    key={target}
                    onClick={() => setConfig({ ...config, mode: target })}
                    className={`py-2 rounded-lg font-mono text-xs capitalize transition border ${
                      config.mode === target
                        ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {target}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Network Power Diagnostics */}
          <div className="bg-slate-950/80 border border-cyan-500/20 rounded-xl p-3.5 space-y-2 font-mono text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Energy Capacity:</span>
              <span className="text-cyan-300">{node.energyCapacity} AE</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Current Stored:</span>
              <span className="text-emerald-400">{node.energyStored} AE</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Signal Output:</span>
              <span className={node.signalState ? 'text-cyan-300 font-bold' : 'text-slate-500'}>
                {node.signalState ? `HIGH (${node.signalPower})` : 'LOW (0)'}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-cyan-500/20">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveConfig}
            className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold shadow-md shadow-cyan-600/30 transition"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};
