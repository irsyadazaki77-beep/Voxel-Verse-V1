import React, { useState, useEffect, useRef } from 'react';
import { ItemStack, StatusEffect, BossCombatState } from '../types';
import { BLOCK_DEFS } from '../engine/world/BlockRegistry';
import { ITEM_DEFS } from '../engine/items/ItemRegistry';
import { RaycastHit } from '../engine/world/VoxelWorld';
import { SettingsManager, GameSettings } from '../engine/ui/SettingsManager';
import { NotificationManager, GameNotification } from '../engine/ui/NotificationManager';
import { SubtitleManager, SubtitleEntry } from '../engine/ui/SubtitleManager';
import { InputManager } from '../engine/input/InputManager';
import { BookOpen, Map as MapIcon, Skull, Sparkles, MessageSquare } from 'lucide-react';
import { TelemetryStore } from '../engine/ui/TelemetryStore';
import { GameEventBus } from '../engine/events/GameEventBus';

interface HUDProps {
  hotbar: (ItemStack | null)[];
  activeHotbarIndex: number;
  onSelectHotbar: (index: number) => void;
  targetHit: RaycastHit | null;
  onOpenInventory: () => void;
  onOpenCrafting: () => void;
  onToggleCamera: () => void;
  onOpenPause: () => void;
  onToggleDebugMap?: () => void;
  onOpenJournal?: () => void;
  onOpenContentDebug?: () => void;
  onOpenMultiplayerLobby?: () => void;
  activeBoss?: BossCombatState | null;
  objectiveText?: string;
}

const HUDTelemetryOverlay = () => {
  const posRef = useRef<HTMLDivElement>(null);
  const fpsRef = useRef<HTMLDivElement>(null);
  const armorRef = useRef<HTMLDivElement>(null);

  const frameTimeRef = useRef<HTMLSpanElement>(null);
  const simTimeRef = useRef<HTMLSpanElement>(null);
  const renderTimeRef = useRef<HTMLSpanElement>(null);
  const chunksRef = useRef<HTMLSpanElement>(null);
  const drawCallsRef = useRef<HTMLSpanElement>(null);
  const trisRef = useRef<HTMLSpanElement>(null);
  const memRef = useRef<HTMLSpanElement>(null);


  useEffect(() => {
    return TelemetryStore.subscribe((stats) => {
      if (posRef.current) posRef.current.innerHTML = `<span class="text-sky-300 font-bold">${Math.round(stats.playerPos[0])}</span>, <span class="text-sky-300 font-bold">${Math.round(stats.playerPos[1])}</span>, <span class="text-sky-300 font-bold">${Math.round(stats.playerPos[2])}</span>`;
      if (fpsRef.current) fpsRef.current.innerText = stats.fps.toString();

      if (frameTimeRef.current) frameTimeRef.current.innerText = stats.profilerMetrics.frameTimeMs.toFixed(1) + 'ms';
      if (simTimeRef.current) simTimeRef.current.innerText = stats.profilerMetrics.simTimeMs.toFixed(1) + 'ms';
      if (renderTimeRef.current) renderTimeRef.current.innerText = stats.profilerMetrics.renderTimeMs.toFixed(1) + 'ms';
      if (chunksRef.current) chunksRef.current.innerText = stats.profilerMetrics.activeChunks.toString();
      if (drawCallsRef.current) drawCallsRef.current.innerText = stats.profilerMetrics.drawCalls.toString();
      if (trisRef.current) trisRef.current.innerText = stats.profilerMetrics.triangles.toString();
      if (memRef.current) memRef.current.innerText = stats.profilerMetrics.memoryEst.toFixed(1) + 'MB';

      if (armorRef.current) armorRef.current.innerText = `🛡️ ${stats.defenseRating}`;
    });
  }, []);

  return (
    <div className="bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/10 shadow-lg flex items-center justify-between gap-4 text-xs font-mono pointer-events-auto">
      <div>
        <span className="text-[9px] uppercase tracking-wider text-white/50 font-bold block leading-none">Position</span>
        <div className="text-white/90 mt-0.5" ref={posRef}>
          <span className="text-sky-300 font-bold">0</span>, <span className="text-sky-300 font-bold">0</span>, <span className="text-sky-300 font-bold">0</span>
        </div>
      </div>

      <div className="border-l border-white/10 pl-3">
        <span className="text-[9px] uppercase tracking-wider text-white/50 font-bold block leading-none">Armor</span>
        <div className="text-sky-400 font-bold mt-0.5" ref={armorRef}>🛡️ 0</div>
      </div>

      <div className="border-l border-white/10 pl-3">
        <span className="text-[9px] uppercase tracking-wider text-white/50 font-bold block leading-none">FPS</span>
        <div className="text-emerald-400 font-bold mt-0.5" ref={fpsRef}>60</div>
      </div>
    </div>
  );
};

const HUDVitalsBars = () => {
  const healthRef = useRef<HTMLDivElement>(null);
  const healthTextRef = useRef<HTMLSpanElement>(null);
  const hungerRef = useRef<HTMLDivElement>(null);
  const hungerTextRef = useRef<HTMLSpanElement>(null);
  const staminaRef = useRef<HTMLDivElement>(null);
  const staminaTextRef = useRef<HTMLSpanElement>(null);
  const oxygenContainerRef = useRef<HTMLDivElement>(null);
  const oxygenRef = useRef<HTMLDivElement>(null);
  const oxygenTextRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    return TelemetryStore.subscribe((stats) => {
      if (healthRef.current) healthRef.current.style.width = `${(stats.health / stats.maxHealth) * 100}%`;
      if (healthTextRef.current) healthTextRef.current.innerText = Math.round(stats.health).toString();
      
      if (hungerRef.current) hungerRef.current.style.width = `${(stats.hunger / stats.maxHunger) * 100}%`;
      if (hungerTextRef.current) hungerTextRef.current.innerText = `${Math.round(stats.hunger)}%`;

      if (staminaRef.current) staminaRef.current.style.width = `${(stats.stamina / stats.maxStamina) * 100}%`;
      if (staminaTextRef.current) staminaTextRef.current.innerText = `${Math.round(stats.stamina)}%`;

      if (oxygenContainerRef.current) {
        if (stats.oxygen < stats.maxOxygen) {
          oxygenContainerRef.current.style.display = 'block';
          if (oxygenRef.current) oxygenRef.current.style.width = `${stats.oxygen}%`;
          if (oxygenTextRef.current) oxygenTextRef.current.innerText = `${Math.round(stats.oxygen)}%`;
        } else {
          oxygenContainerRef.current.style.display = 'none';
        }
      }
    });
  }, []);

  return (
    <div className="flex flex-col items-center gap-1.5 w-full max-w-md pointer-events-auto">
      <div className="grid grid-cols-3 gap-3 w-full px-1">
        <div className="space-y-0.5">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-rose-400 uppercase">Health</span>
            <span className="font-mono text-white/80" ref={healthTextRef}>100</span>
          </div>
          <div className="h-2 bg-black/60 rounded-full p-[1px] border border-white/10">
            <div className="h-full bg-rose-500 rounded-full transition-all duration-75" ref={healthRef} style={{ width: '100%' }}></div>
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-amber-400 uppercase">Hunger</span>
            <span className="font-mono text-white/80" ref={hungerTextRef}>100%</span>
          </div>
          <div className="h-2 bg-black/60 rounded-full p-[1px] border border-white/10">
            <div className="h-full bg-amber-500 rounded-full transition-all duration-75" ref={hungerRef} style={{ width: '100%' }}></div>
          </div>
        </div>
        <div className="space-y-0.5">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-sky-400 uppercase">Stamina</span>
            <span className="font-mono text-white/80" ref={staminaTextRef}>100%</span>
          </div>
          <div className="h-2 bg-black/60 rounded-full p-[1px] border border-white/10">
            <div className="h-full bg-sky-400 rounded-full transition-all duration-75" ref={staminaRef} style={{ width: '100%' }}></div>
          </div>
        </div>
      </div>
      <div className="w-full px-1 animate-pulse space-y-0.5 hidden" ref={oxygenContainerRef}>
        <div className="flex justify-between text-[9px] font-mono font-bold text-cyan-300">
          <span>OXYGEN</span>
          <span ref={oxygenTextRef}>100%</span>
        </div>
        <div className="h-1.5 bg-black/60 rounded-full border border-cyan-400/30 overflow-hidden">
          <div className="h-full bg-cyan-400 transition-all duration-75" ref={oxygenRef} style={{ width: '100%' }}></div>
        </div>
      </div>
    </div>
  );
};

export const HUD: React.FC<HUDProps> = ({
  hotbar,
  activeHotbarIndex,
  onSelectHotbar,
  targetHit,
  onOpenInventory,
  onOpenCrafting,
  onToggleCamera,
  onOpenPause,
  onToggleDebugMap,
  onOpenJournal,
  onOpenContentDebug,
  activeBoss,
  objectiveText,
}) => {
  const [settings, setSettings] = useState<GameSettings>(SettingsManager.get());
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [hitmarker, setHitmarker] = useState<'none' | 'hit' | 'crit' | 'blocked'>('none');
  const [damageFlash, setDamageFlash] = useState(false);

  useEffect(() => {
    const unsubHit = GameEventBus.on('COMBAT_HIT', (payload) => {
      setHitmarker(payload.hitType);
      setTimeout(() => setHitmarker('none'), 180);
    });

    const unsubDmg = GameEventBus.on('PLAYER_DAMAGED', () => {
      setDamageFlash(true);
      setTimeout(() => setDamageFlash(false), 240);
    });

    return () => {
      unsubHit();
      unsubDmg();
    };
  }, []);

  useEffect(() => {
    return TelemetryStore.subscribe((stats) => {
      const svg = document.getElementById('crosshair-break-svg');
      const circle = document.getElementById('crosshair-break-circle');
      if (svg && circle) {
        if (stats.breakProgress > 0) {
          svg.style.display = 'block';
          circle.style.strokeDashoffset = (75.4 * (1 - stats.breakProgress)).toString();
        } else {
          svg.style.display = 'none';
        }
      }

      const bowReticle = document.getElementById('hud-bow-reticle');
      const bowCircle = document.getElementById('hud-bow-circle');
      if (bowReticle && bowCircle) {
        if (stats.bowChargeRatio > 0) {
          bowReticle.style.display = 'flex';
          if (stats.bowChargeRatio >= 0.95) {
            bowCircle.className = 'w-10 h-10 rounded-full border border-dashed transition-all duration-75 flex items-center justify-center border-amber-400 scale-75 shadow-[0_0_12px_rgba(251,191,36,0.8)]';
          } else {
            bowCircle.className = 'w-10 h-10 rounded-full border border-dashed transition-all duration-75 flex items-center justify-center border-white/50 scale-125';
          }
        } else {
          bowReticle.style.display = 'none';
        }
      }
    });
  }, []);

  useEffect(() => {
    const unsubNotif = NotificationManager.subscribe(setNotifications);
    const unsubSub = SubtitleManager.subscribe(setSubtitles);
    const unsubSettings = SettingsManager.subscribe(setSettings);
    return () => {
      unsubNotif();
      unsubSub();
      unsubSettings();
    };
  }, []);

  const interactPrompt = 'E';
  let targetBlockDef = null;
  if (targetHit) {
    targetBlockDef = BLOCK_DEFS[targetHit.blockType];
  }

  return (
    <div id="game-hud" className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10 select-none">
      
      {/* Damage Flash Vignette */}
      {damageFlash && (
        <div className="absolute inset-0 pointer-events-none bg-radial from-transparent via-rose-900/30 to-rose-600/60 animate-pulse transition-opacity duration-75" />
      )}

      {/* Top Section */}
      <div className="flex justify-between items-start w-full">
        {/* Left: Telemetry */}
        <div className="flex flex-col gap-2">
          {settings.gameplay.showFps && <HUDTelemetryOverlay />}
          
          {/* Boss Bar */}
          {activeBoss && (
            <div className="w-80 mt-2 bg-black/60 backdrop-blur-md rounded-2xl border border-rose-500/30 p-3 shadow-[0_0_20px_rgba(225,29,72,0.2)] animate-fade-in pointer-events-auto">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-black uppercase tracking-wider text-rose-400 drop-shadow-md">
                  {activeBoss.name}
                </span>
                <span className="text-[10px] font-mono text-rose-200/80 font-bold">
                  {Math.ceil(activeBoss.health)} / {activeBoss.maxHealth}
                </span>
              </div>
              <div className="h-2.5 bg-black/80 rounded-full border border-rose-500/20 overflow-hidden relative">
                <div 
                  className="absolute inset-y-0 left-0 bg-rose-600 rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(100, (activeBoss.health / activeBoss.maxHealth) * 100))}%` }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent" />
              </div>
            </div>
          )}
        </div>

        {/* Right: Menu & Actions */}
        <div className="flex flex-col items-end gap-2 pointer-events-auto">
          <button 
            onClick={onOpenPause}
            className="px-4 py-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-2xl border border-white/10 text-xs font-bold shadow-lg transition-all cursor-pointer"
          >
            Menu
          </button>
        </div>
      </div>

      {/* Crosshair & Combat Reticles */}
      <div id="hud-crosshair-center" className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        
        {/* Bow Charge Focus Reticle */}
        <div id="hud-bow-reticle" style={{ display: 'none' }} className="relative flex items-center justify-center pointer-events-none mb-1">
          <div 
            id="hud-bow-circle"
            className="w-10 h-10 rounded-full border border-dashed transition-all duration-75 flex items-center justify-center border-white/50 scale-125"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white/90" />
          </div>
        </div>

        <div className={`w-5 h-5 relative flex items-center justify-center transition-all ${targetHit ? 'scale-125' : ''}`}>
          <div className={`absolute w-3.5 h-[2px] rounded-full shadow-[0_0_4px_rgba(0,0,0,0.8)] ${targetHit ? 'bg-sky-400' : 'bg-white/80'}`}></div>
          <div className={`absolute h-3.5 w-[2px] rounded-full shadow-[0_0_4px_rgba(0,0,0,0.8)] ${targetHit ? 'bg-sky-400' : 'bg-white/80'}`}></div>
          
          {/* Hitmarker Flash X */}
          {hitmarker !== 'none' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none scale-150 animate-ping">
              <div className={`w-4 h-0.5 transform rotate-45 ${
                hitmarker === 'crit' ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : hitmarker === 'blocked' ? 'bg-sky-400' : 'bg-white'
              }`} />
              <div className={`w-4 h-0.5 transform -rotate-45 ${
                hitmarker === 'crit' ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : hitmarker === 'blocked' ? 'bg-sky-400' : 'bg-white'
              }`} />
            </div>
          )}

          <svg className="absolute w-8 h-8 -top-1.5 -left-1.5 transform -rotate-90" style={{ display: 'none' }} id="crosshair-break-svg">
            <circle cx="16" cy="16" r="12" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" fill="none" />
            <circle
              id="crosshair-break-circle"
              cx="16"
              cy="16"
              r="12"
              stroke="#38bdf8"
              strokeWidth="2.5"
              fill="none"
              strokeDasharray="75.4"
              strokeDashoffset={75.4}
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Hovered Target */}
        {targetBlockDef && (
          <div className="mt-8 bg-[#0c0e14]/90 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/10 shadow-2xl text-center animate-fade-in flex items-center gap-2">
            <span className="text-xs font-bold text-white">{targetBlockDef.name}</span>
            <kbd className="px-2 py-0.5 rounded-lg bg-sky-500 text-white font-mono text-[10px] font-bold shadow-md">
              [{interactPrompt}] Interact
            </kbd>
          </div>
        )}
      </div>

      {/* Subtitles Overlay */}
      {subtitles.length > 0 && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none z-20">
          {subtitles.map((sub) => (
            <div key={sub.id} className="bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-2xl border border-white/15 text-xs font-mono text-amber-200 shadow-xl flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span><strong>[{sub.source}]</strong> {sub.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="absolute top-16 right-6 flex flex-col gap-2 pointer-events-none z-30 max-w-sm">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 animate-fade-in ${
                n.priority === 'CRITICAL'
                  ? 'bg-rose-950/90 border-rose-500/60 text-white'
                  : n.priority === 'HIGH'
                  ? 'bg-amber-950/90 border-amber-500/60 text-white'
                  : 'bg-[#0c0e14]/90 border-white/10 text-white'
              }`}
            >
              {n.icon && <span className="text-lg">{n.icon}</span>}
              <div>
                <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-300">{n.title}</h5>
                <p className="text-xs font-semibold leading-tight">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Dock */}
      <div id="hud-bottom-dock" className="flex flex-col items-center w-full gap-2">
        <HUDVitalsBars />

        {/* Hotbar */}
        <div className="flex items-center gap-1.5 p-2 bg-[#0c0e14]/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl pointer-events-auto">
          {hotbar.map((slot, idx) => {
            const isActive = idx === activeHotbarIndex;
            const itemDef = slot ? ITEM_DEFS[slot.itemId] : null;
            
            return (
              <button
                key={idx}
                onClick={() => onSelectHotbar(idx)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center relative transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white/20 border-2 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.3)] scale-105'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
              >
                {slot && itemDef ? (
                  <div className="flex flex-col items-center justify-center w-full h-full p-1">
                    <div className="w-6 h-6 rounded-sm flex items-center justify-center font-bold text-[9px]" style={{ backgroundColor: itemDef.iconColor }}>
                      {itemDef.name.substring(0, 2).toUpperCase()}
                    </div>
                    {slot.count > 1 && (
                      <span className="absolute bottom-1 right-1 text-[9px] font-mono font-bold text-white drop-shadow">
                        {slot.count}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10"></div>
                )}
                <span className="absolute top-0.5 left-1 text-[8px] font-mono text-white/40">{idx + 1}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
