// Content & Exploration Debug Panel: Event Triggers, Boss Spawning, Tier Teleportation & Progression Testing
import React from 'react';
import { WorldEventManager } from '../engine/events/WorldEventManager';
import { WorldEventType, WorldTierId } from '../types';
import { WORLD_TIERS } from '../engine/progression/WorldProgression';
import { DiscoverySystem } from '../engine/progression/DiscoverySystem';
import { QuestManager } from '../engine/progression/QuestManager';
import { 
  X, 
  Flame, 
  Moon, 
  Users, 
  Skull, 
  Sparkles, 
  Compass, 
  ShieldAlert,
  Zap
} from 'lucide-react';

interface ContentDebugModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerPos: [number, number, number];
  onTeleport: (x: number, y: number, z: number) => void;
  onSpawnBoss: (type: 'ruin_sentinel' | 'boss_void_sovereign') => void;
}

export const ContentDebugModal: React.FC<ContentDebugModalProps> = ({
  isOpen,
  onClose,
  playerPos,
  onTeleport,
  onSpawnBoss,
}) => {
  if (!isOpen) return null;

  const handleTriggerEvent = (type: WorldEventType) => {
    WorldEventManager.triggerEvent(type, playerPos);
  };

  const handleTeleportToTier = (tierId: WorldTierId) => {
    const tier = WORLD_TIERS[tierId];
    if (tier) {
      onTeleport(tier.minDistance, 80, tier.minDistance);
    }
  };

  return (
    <div id="content_debug_modal_overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none animate-in fade-in duration-200">
      <div id="content_debug_modal_container" className="bg-zinc-900 border border-purple-900/50 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wide text-zinc-100">
                Phase 8 Content & Exploration Debug Console
              </h2>
              <p className="text-xs text-zinc-400">Test world events, boss encounters, tier gating & discovery triggers</p>
            </div>
          </div>

          <button
            id="btn_close_debug"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* 1. World Event Triggers */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Trigger Dynamic World Events</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                id="btn_trigger_meteor"
                onClick={() => handleTriggerEvent('meteor')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/40 hover:bg-amber-900/40 text-amber-300 text-xs font-semibold transition-colors text-left"
              >
                <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div>Meteor Impact</div>
                  <div className="text-[10px] text-amber-500/80 font-normal">Starfall crater & ore</div>
                </div>
              </button>

              <button
                id="btn_trigger_eclipse"
                onClick={() => handleTriggerEvent('eclipse')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/30 border border-rose-800/40 hover:bg-rose-900/40 text-rose-300 text-xs font-semibold transition-colors text-left"
              >
                <Moon className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <div>Blood Eclipse</div>
                  <div className="text-[10px] text-rose-500/80 font-normal">Crimson sky aggression</div>
                </div>
              </button>

              <button
                id="btn_trigger_caravan"
                onClick={() => handleTriggerEvent('caravan')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-800/40 hover:bg-cyan-900/40 text-cyan-300 text-xs font-semibold transition-colors text-left"
              >
                <Users className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <div>Nomadic Caravan</div>
                  <div className="text-[10px] text-cyan-500/80 font-normal">Exotic master trader</div>
                </div>
              </button>

              <button
                id="btn_trigger_invasion"
                onClick={() => handleTriggerEvent('invasion')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-950/30 border border-purple-800/40 hover:bg-purple-900/40 text-purple-300 text-xs font-semibold transition-colors text-left"
              >
                <Skull className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <div>Void Invasion</div>
                  <div className="text-[10px] text-purple-500/80 font-normal">Outpost defense wave</div>
                </div>
              </button>

              <button
                id="btn_trigger_aurora"
                onClick={() => handleTriggerEvent('aurora')}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-800/40 hover:bg-emerald-900/40 text-emerald-300 text-xs font-semibold transition-colors text-left"
              >
                <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div>Aether Aurora</div>
                  <div className="text-[10px] text-emerald-500/80 font-normal">Crop & mana boost</div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Boss Encounters */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Spawn Boss Encounters</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn_spawn_sentinel"
                onClick={() => onSpawnBoss('ruin_sentinel')}
                className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/60 border border-zinc-700 hover:border-zinc-500 text-left transition-colors"
              >
                <div className="p-2 rounded-lg bg-zinc-700 text-zinc-300">
                  <Skull className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-zinc-100">Ruin Sentinel (Mini-Boss)</div>
                  <div className="text-[11px] text-zinc-400">High poise stone golem (Tier 3)</div>
                </div>
              </button>

              <button
                id="btn_spawn_sovereign"
                onClick={() => onSpawnBoss('boss_void_sovereign')}
                className="flex items-center gap-3 p-3 rounded-xl bg-purple-950/40 border border-purple-700 hover:border-purple-500 text-left transition-colors"
              >
                <div className="p-2 rounded-lg bg-purple-900 text-purple-300">
                  <Skull className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-purple-200">Shadow Sovereign (World Boss)</div>
                  <div className="text-[11px] text-purple-400">Void teleportation & dark bolts (Tier 5)</div>
                </div>
              </button>
            </div>
          </div>

          {/* 3. Fast Teleport to World Tiers */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Teleport to Exploration Tiers</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.values(WORLD_TIERS).map(tier => (
                <button
                  key={tier.id}
                  onClick={() => handleTeleportToTier(tier.id)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-800/40 border border-zinc-700/60 hover:bg-zinc-800 text-left transition-colors"
                >
                  <div>
                    <div className="font-bold text-xs text-zinc-200">{tier.name}</div>
                    <div className="text-[10px] text-zinc-500">Min Dist: {tier.minDistance}m • Danger ★ {tier.dangerLevel}</div>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400 font-bold">Warp</span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
