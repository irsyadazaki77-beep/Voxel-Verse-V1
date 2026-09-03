import React, { useState, useEffect, useRef } from 'react';
import { ItemStack, BossCombatState } from '../types';
import { BLOCK_DEFS } from '../engine/world/BlockRegistry';
import { ITEM_DEFS } from '../engine/items/ItemRegistry';
import { RaycastHit } from '../engine/world/VoxelWorld';
import { SettingsManager, GameSettings } from '../engine/ui/SettingsManager';
import { VoxelVerseLogo } from './VoxelVerseLogo';
import { QuestManager } from '../engine/progression/QuestManager';
import { NotificationManager, GameNotification } from '../engine/ui/NotificationManager';
import { SubtitleManager, SubtitleEntry } from '../engine/ui/SubtitleManager';
import { 
  Heart, 
  Utensils, 
  Zap, 
  Shield, 
  Wind, 
  Thermometer, 
  Compass, 
  Layers, 
  Sparkles, 
  MessageSquare,
  Crosshair as CrosshairIcon,
  Flame,
  Volume2,
  Activity
} from 'lucide-react';
import { TelemetryStore } from '../engine/ui/TelemetryStore';
import { GameEventBus } from '../engine/events/GameEventBus';
import { AetherAnomalyManager } from '../engine/anomaly/AetherAnomalyManager';

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
  const biomeRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const compassRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    return TelemetryStore.subscribe((stats) => {
      if (posRef.current) {
        posRef.current.innerHTML = `<span class="text-sky-400 font-bold">${Math.round(stats.playerPos[0])}</span>, <span class="text-sky-400 font-bold">${Math.round(stats.playerPos[1])}</span>, <span class="text-sky-400 font-bold">${Math.round(stats.playerPos[2])}</span>`;
      }
      if (fpsRef.current) {
        fpsRef.current.innerText = `${stats.fps} FPS`;
      }
      if (armorRef.current) {
        armorRef.current.innerText = stats.defenseRating.toString();
      }
      if (biomeRef.current) {
        biomeRef.current.innerText = stats.biomeName || 'Aetheria Realm';
      }
      if (timeRef.current) {
        const hours = Math.floor(stats.timeOfDay);
        const mins = Math.floor((stats.timeOfDay % 1) * 60);
        const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
        timeRef.current.innerText = timeStr;
      }
      if (compassRef.current) {
        const deg = ((stats.playerYaw * 180) / Math.PI + 360) % 360;
        let heading = 'N';
        if (deg >= 45 && deg < 135) heading = 'E';
        else if (deg >= 135 && deg < 225) heading = 'S';
        else if (deg >= 225 && deg < 315) heading = 'W';
        compassRef.current.innerText = `${heading} (${Math.round(deg)}°)`;
      }
    });
  }, []);

  return (
    <div className="voxel-panel-subtle px-3.5 py-2 shadow-xl flex items-center gap-3.5 text-xs font-mono pointer-events-auto border border-white/10">
      <div className="flex items-center gap-2">
        <Compass className="w-3.5 h-3.5 text-sky-400" />
        <span className="text-zinc-300 font-bold" ref={biomeRef}>Highlands</span>
      </div>

      <div className="h-3 w-[1px] bg-white/15" />

      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
        <span>Pos:</span>
        <div ref={posRef}>0, 80, 0</div>
      </div>

      <div className="h-3 w-[1px] bg-white/15" />

      <div className="flex items-center gap-1 text-[11px] text-amber-300">
        <span ref={timeRef}>12:00</span>
      </div>

      <div className="h-3 w-[1px] bg-white/15" />

      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold" ref={fpsRef}>
        60 FPS
      </div>
    </div>
  );
};

const HUDProfilerOverlay = ({ onClose }: { onClose: () => void }) => {
  const [metrics, setMetrics] = useState(TelemetryStore.state.profilerMetrics);
  const [fps, setFps] = useState(TelemetryStore.state.fps);

  useEffect(() => {
    return TelemetryStore.subscribe((stats) => {
      setMetrics(stats.profilerMetrics);
      setFps(stats.fps);
    });
  }, []);

  const bottleneck = metrics.bottleneck || 'BALANCED';
  const bottleneckColor = bottleneck === 'GPU' ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' :
                          bottleneck === 'CPU' ? 'text-rose-400 border-rose-500/40 bg-rose-500/10' :
                          'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';

  return (
    <div className="absolute top-16 left-4 z-40 w-[420px] max-w-[90vw] bg-black/85 backdrop-blur-md border border-white/20 shadow-2xl rounded-lg p-3 font-mono text-[11px] text-zinc-200 pointer-events-auto select-none animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 mb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-bold text-white tracking-wider text-xs">VOXEL ENGINE PROFILER</span>
          <span className="text-[10px] text-zinc-400 bg-white/10 px-1 py-0.5 rounded">F3</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${bottleneckColor}`}>
            {bottleneck}
          </span>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white px-1 py-0.5 text-xs rounded hover:bg-white/10 cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Primary Metrics Strip */}
      <div className="grid grid-cols-3 gap-2 mb-2 bg-white/5 p-2 rounded border border-white/5">
        <div>
          <div className="text-[10px] text-zinc-400">FPS / 1% Low</div>
          <div className="text-sm font-bold text-white flex items-baseline gap-1">
            <span className={fps >= 55 ? 'text-emerald-400' : fps >= 30 ? 'text-amber-400' : 'text-rose-400'}>
              {fps}
            </span>
            <span className="text-[10px] text-zinc-400">({metrics.fpsLow1Pct ?? fps} low)</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-zinc-400">Frame Time</div>
          <div className="text-sm font-bold text-white">
            {(metrics.frameTimeMs || 16.6).toFixed(1)} <span className="text-[10px] text-zinc-400">ms</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] text-zinc-400">Dynamic Scale</div>
          <div className="text-sm font-bold text-sky-400">
            {Math.round((metrics.dynamicScale ?? 1.0) * 100)}%
          </div>
        </div>
      </div>

      {/* Detailed Diagnostics Grid */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        {/* Timing Budget */}
        <div className="bg-black/40 border border-white/5 p-2 rounded">
          <div className="text-zinc-400 font-bold border-b border-white/5 pb-1 mb-1">FRAME TIMING</div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-400">CPU Sim:</span>
            <span className="font-bold text-zinc-200">{(metrics.simTimeMs || 0).toFixed(1)} ms</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-400">GPU Render:</span>
            <span className="font-bold text-zinc-200">{(metrics.renderTimeMs || 0).toFixed(1)} ms</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-400">Target (60fps):</span>
            <span className="text-zinc-400">16.6 ms</span>
          </div>
        </div>

        {/* GPU & Geometry */}
        <div className="bg-black/40 border border-white/5 p-2 rounded">
          <div className="text-zinc-400 font-bold border-b border-white/5 pb-1 mb-1">RASTER & GEOMETRY</div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-400">Draw Calls:</span>
            <span className="font-bold text-zinc-200">{metrics.drawCalls || 0}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-400">Triangles:</span>
            <span className="font-bold text-zinc-200">{(metrics.triangles || 0).toLocaleString()}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-400">Memory:</span>
            <span className="font-bold text-zinc-200">{metrics.memoryEst ? Math.round(metrics.memoryEst) + ' MB' : 'N/A'}</span>
          </div>
        </div>

        {/* World Streaming */}
        <div className="bg-black/40 border border-white/5 p-2 rounded">
          <div className="text-zinc-400 font-bold border-b border-white/5 pb-1 mb-1">CHUNK STREAMING</div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-400">Active / Cache:</span>
            <span className="font-bold text-zinc-200">{metrics.activeChunks} / {metrics.cachedChunks}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-400">Dirty Chunks:</span>
            <span className="font-bold text-zinc-200">{metrics.dirtyChunks}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-400">Uploads/Frame:</span>
            <span className="font-bold text-zinc-200">{metrics.meshUploadsPerFrame || 0}</span>
          </div>
        </div>

        {/* Entities & Particles */}
        <div className="bg-black/40 border border-white/5 p-2 rounded">
          <div className="text-zinc-400 font-bold border-b border-white/5 pb-1 mb-1">SIMULATION & THREADS</div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-400">Active Entities:</span>
            <span className="font-bold text-zinc-200">{metrics.activeEntities || 0}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-400">Active Particles:</span>
            <span className="font-bold text-zinc-200">{metrics.activeParticles || 0}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-400">Worker Tasks:</span>
            <span className="font-bold text-zinc-200">{metrics.queuedTasks || 0}</span>
          </div>
        </div>

        {/* Lighting Metrics (New Diagnostic Box) */}
        <div className="bg-black/40 border border-white/5 p-2 rounded col-span-2">
          <div className="text-zinc-400 font-bold border-b border-white/5 pb-1 mb-1">LIGHTING & EXPOSURE (HDR)</div>
          <div className="grid grid-cols-2 gap-x-4">
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Sun Intensity:</span>
              <span className="font-bold text-amber-400">{(metrics as any).sunIntensity?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Exposure:</span>
              <span className="font-bold text-sky-300">{(metrics as any).exposure?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Ambient / Hemi:</span>
              <span className="font-bold text-zinc-200">
                {(metrics as any).ambientIntensity?.toFixed(2)} / {(metrics as any).hemiIntensity?.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Combined Energy:</span>
              <span className={`font-bold ${((metrics as any).sunIntensity + (metrics as any).ambientIntensity) > 4.5 ? 'text-rose-400' : 'text-zinc-300'}`}>
                {((metrics as any).sunIntensity + (metrics as any).ambientIntensity + (metrics as any).hemiIntensity || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Time & Lighting Debug Controls */}
      <div className="mt-2 pt-2 border-t border-white/10">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-zinc-400 font-bold text-[10px] tracking-wider">TIME OF DAY & MOONLIGHT TEST (F6)</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => {
              const rt = (window as any).__voxelRuntime;
              if (rt?.sky) rt.sky.setTimeOfDay(12.0);
            }}
            className="px-2 py-1 bg-white/10 hover:bg-white/20 text-amber-300 rounded text-[10px] font-bold cursor-pointer transition-colors"
          >
            ☀️ Noon (12:00)
          </button>
          <button
            onClick={() => {
              const rt = (window as any).__voxelRuntime;
              if (rt?.sky) rt.sky.setTimeOfDay(18.5);
            }}
            className="px-2 py-1 bg-white/10 hover:bg-white/20 text-orange-400 rounded text-[10px] font-bold cursor-pointer transition-colors"
          >
            🌅 Sunset (18:30)
          </button>
          <button
            onClick={() => {
              const rt = (window as any).__voxelRuntime;
              if (rt?.sky) rt.sky.setTimeOfDay(21.5);
            }}
            className="px-2 py-1 bg-white/10 hover:bg-white/20 text-indigo-300 rounded text-[10px] font-bold cursor-pointer transition-colors"
          >
            🌙 Night (21:30)
          </button>
          <button
            onClick={() => {
              const rt = (window as any).__voxelRuntime;
              if (rt?.sky) rt.sky.setTimeOfDay(0.0);
            }}
            className="px-2 py-1 bg-white/10 hover:bg-white/20 text-sky-300 rounded text-[10px] font-bold cursor-pointer transition-colors"
          >
            🌌 Midnight (00:00)
          </button>
        </div>
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
  const xpRef = useRef<HTMLDivElement>(null);
  const levelTextRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    return TelemetryStore.subscribe((stats) => {
      // Health
      const healthRatio = stats.health / stats.maxHealth;
      if (healthRef.current) healthRef.current.style.width = `${Math.max(0, Math.min(100, healthRatio * 100))}%`;
      if (healthTextRef.current) healthTextRef.current.innerText = `${Math.round(stats.health)}/${stats.maxHealth}`;
      const healthParent = healthRef.current?.closest('.voxel-panel-subtle') as HTMLElement;
      if (healthParent) {
        healthParent.style.opacity = healthRatio >= 1 ? '0.75' : '1';
      }
      
      // Hunger
      const hungerRatio = stats.hunger / stats.maxHunger;
      if (hungerRef.current) hungerRef.current.style.width = `${Math.max(0, Math.min(100, hungerRatio * 100))}%`;
      if (hungerTextRef.current) hungerTextRef.current.innerText = `${Math.round(stats.hunger)}%`;
      const hungerParent = hungerRef.current?.closest('.voxel-panel-subtle') as HTMLElement;
      if (hungerParent) {
        hungerParent.style.opacity = hungerRatio >= 0.9 ? '0.6' : '1';
      }

      // Stamina
      const staminaRatio = stats.stamina / stats.maxStamina;
      if (staminaRef.current) staminaRef.current.style.width = `${Math.max(0, Math.min(100, staminaRatio * 100))}%`;
      if (staminaTextRef.current) staminaTextRef.current.innerText = `${Math.round(stats.stamina)}%`;
      const staminaParent = staminaRef.current?.closest('.voxel-panel-subtle') as HTMLElement;
      if (staminaParent) {
        staminaParent.style.opacity = staminaRatio >= 1 ? '0.4' : '1';
      }

      if (xpRef.current) {
        const nextXp = stats.level * 100;
        const xpRatio = Math.max(0, Math.min(100, (stats.xp % 100) / (nextXp / stats.level) * 100));
        xpRef.current.style.width = `${xpRatio}%`;
      }
      if (levelTextRef.current) levelTextRef.current.innerText = `Lv. ${stats.level}`;

      if (oxygenContainerRef.current) {
        if (stats.oxygen < stats.maxOxygen) {
          oxygenContainerRef.current.style.display = 'flex';
          if (oxygenRef.current) oxygenRef.current.style.width = `${(stats.oxygen / stats.maxOxygen) * 100}%`;
          if (oxygenTextRef.current) oxygenTextRef.current.innerText = `${Math.round(stats.oxygen)}%`;
        } else {
          oxygenContainerRef.current.style.display = 'none';
        }
      }
    });
  }, []);

  return (
    <div className="flex flex-col items-center gap-1.5 w-full max-w-lg pointer-events-auto">
      {/* Vitals Row (Health, Hunger, Stamina) */}
      <div className="grid grid-cols-3 gap-2.5 w-full">
        {/* Health */}
        <div className="voxel-panel-subtle p-2 space-y-1 transition-opacity duration-500">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <div className="flex items-center gap-1 text-[var(--color-health)]">
              <Heart className="w-3 h-3 fill-current" />
              <span>HEALTH</span>
            </div>
            <span className="font-mono text-[var(--vv-text-main)] text-[10px]" ref={healthTextRef}>100/100</span>
          </div>
          <div className="h-2 bg-black/60 rounded-full p-[1px] border border-[var(--vv-border)] overflow-hidden">
            <div
              className="h-full bg-[var(--color-health)] rounded-full transition-all duration-150 shadow-[0_0_8px_var(--color-health)]"
              ref={healthRef}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Hunger */}
        <div className="voxel-panel-subtle p-2 space-y-1 transition-opacity duration-500">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <div className="flex items-center gap-1 text-[var(--color-hunger)]">
              <Utensils className="w-3 h-3" />
              <span>HUNGER</span>
            </div>
            <span className="font-mono text-[var(--vv-text-main)] text-[10px]" ref={hungerTextRef}>100%</span>
          </div>
          <div className="h-2 bg-black/60 rounded-full p-[1px] border border-[var(--vv-border)] overflow-hidden">
            <div
              className="h-full bg-[var(--color-hunger)] rounded-full transition-all duration-150 shadow-[0_0_8px_var(--color-hunger)]"
              ref={hungerRef}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Stamina */}
        <div className="voxel-panel-subtle p-2 space-y-1 transition-opacity duration-500">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <div className="flex items-center gap-1 text-[var(--color-stamina)]">
              <Zap className="w-3 h-3 fill-current text-[var(--color-stamina)]" />
              <span>STAMINA</span>
            </div>
            <span className="font-mono text-[var(--vv-text-main)] text-[10px]" ref={staminaTextRef}>100%</span>
          </div>
          <div className="h-2 bg-black/60 rounded-full p-[1px] border border-[var(--vv-border)] overflow-hidden">
            <div
              className="h-full bg-[var(--color-stamina)] rounded-full transition-all duration-150 shadow-[0_0_8px_var(--color-stamina)]"
              ref={staminaRef}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Oxygen Bar (when underwater) */}
      <div
        className="w-full voxel-panel-subtle px-3 py-1 items-center justify-between gap-2 hidden animate-pulse border-[var(--color-temp)]/40"
        ref={oxygenContainerRef}
      >
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--color-temp)]">
          <Wind className="w-3 h-3" />
          <span>OXYGEN</span>
        </div>
        <div className="flex-1 h-2 bg-black/60 rounded-full border border-[var(--color-temp)]/30 overflow-hidden">
          <div className="h-full bg-[var(--color-temp)] rounded-full transition-all" ref={oxygenRef} style={{ width: '100%' }} />
        </div>
        <span className="text-[10px] font-mono text-[var(--color-temp)]" ref={oxygenTextRef}>100%</span>
      </div>

      {/* XP Bar */}
      <div className="w-full flex items-center gap-2 px-1">
        <span className="text-[9px] font-mono font-bold text-[var(--color-xp)]" ref={levelTextRef}>Lv. 1</span>
        <div className="flex-1 h-1.5 bg-black/60 rounded-full border border-[var(--vv-border)] overflow-hidden">
          <div
            className="h-full bg-[var(--color-xp)] rounded-full transition-all duration-200"
            ref={xpRef}
            style={{ width: '0%' }}
          />
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
  onOpenMultiplayerLobby,
  activeBoss,
  objectiveText,
}) => {
  const [settings, setSettings] = useState<GameSettings>(SettingsManager.get());
  const [notifications, setNotifications] = useState<GameNotification[]>([]);
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [hitmarker, setHitmarker] = useState<'none' | 'hit' | 'crit' | 'blocked'>('none');
  const [damageFlash, setDamageFlash] = useState(false);
  const [activeItemBanner, setActiveItemBanner] = useState<string | null>(null);
  const [activeQuests, setActiveQuests] = useState<{ def: any; progress: number[]; state: string }[]>([]);
  const [anomalyStatus, setAnomalyStatus] = useState<'dormant' | 'warning' | 'active' | 'climax' | 'resolved'>('dormant');
  const [anomalyIntensity, setAnomalyIntensity] = useState(0);
  const [showProfiler, setShowProfiler] = useState(false);

  // F3: Profiling Overlay, F6: Cycle Time of Day for lighting testing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'F3') {
        e.preventDefault();
        setShowProfiler(prev => !prev);
      } else if (e.code === 'F6') {
        e.preventDefault();
        const rt = (window as any).__voxelRuntime;
        if (rt && rt.sky) {
          const nextTime = rt.sky.cycleTime();
          const hours = Math.floor(nextTime);
          const mins = Math.floor((nextTime % 1) * 60);
          const timeLabel = (hours >= 19 || hours < 5) ? 'Night' : (hours >= 5 && hours < 8) ? 'Dawn' : (hours >= 8 && hours < 17) ? 'Day' : 'Sunset';
          setNotifications(prev => [
            ...prev,
            {
              id: 'time_cycle_' + Date.now(),
              title: `Time of Day: ${timeLabel}`,
              message: `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`,
              type: 'info',
              duration: 2500,
            } as any
          ]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setAnomalyStatus(AetherAnomalyManager.status);
    setAnomalyIntensity(AetherAnomalyManager.activeIntensity);
    
    return AetherAnomalyManager.onAnomalyStateChange(() => {
      setAnomalyStatus(AetherAnomalyManager.status);
      setAnomalyIntensity(AetherAnomalyManager.activeIntensity);
    });
  }, []);

  useEffect(() => {
    setActiveQuests(QuestManager.getActiveQuests().filter(q => q.state === 'active'));
    return QuestManager.onQuestChange(() => {
      setActiveQuests(QuestManager.getActiveQuests().filter(q => q.state === 'active'));
    });
  }, []);

  // Subscribe to Combat Events
  useEffect(() => {
    const unsubHit = GameEventBus.on('COMBAT_HIT', (payload) => {
      setHitmarker(payload.hitType);
      setTimeout(() => setHitmarker('none'), 200);
    });

    const unsubDmg = GameEventBus.on('PLAYER_DAMAGED', () => {
      setDamageFlash(true);
      setTimeout(() => setDamageFlash(false), 260);
    });

    return () => {
      unsubHit();
      unsubDmg();
    };
  }, []);

  // Display Item Name Banner upon Hotbar Switch
  useEffect(() => {
    const currentItem = hotbar[activeHotbarIndex];
    if (currentItem) {
      const def = ITEM_DEFS[currentItem.itemId];
      setActiveItemBanner(def?.name || currentItem.itemId);
      const timer = setTimeout(() => setActiveItemBanner(null), 1800);
      return () => clearTimeout(timer);
    } else {
      setActiveItemBanner(null);
    }
  }, [activeHotbarIndex, hotbar]);

  // Subscribe to Telemetry for Mining & Bow Reticle
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
            bowCircle.className = 'w-10 h-10 rounded-full border-2 border-dashed transition-all duration-75 flex items-center justify-center border-amber-400 scale-75 shadow-[0_0_15px_rgba(251,191,36,0.9)]';
          } else {
            bowCircle.className = 'w-10 h-10 rounded-full border border-dashed transition-all duration-75 flex items-center justify-center border-white/60 scale-125';
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

  // Determine Target Block Interaction Text
  let targetBlockDef = null;
  let interactionAction = 'Mine Block';
  if (targetHit) {
    targetBlockDef = BLOCK_DEFS[targetHit.blockType];
    if (targetHit.blockType === 11 || targetBlockDef?.name?.toLowerCase().includes('chest')) {
      interactionAction = 'Open Storage Vault';
    } else if (targetHit.blockType === 10 || targetBlockDef?.name?.toLowerCase().includes('furnace') || targetBlockDef?.name?.toLowerCase().includes('smelter')) {
      interactionAction = 'Open Smelter';
    } else if (targetHit.blockType === 13 || targetBlockDef?.name?.toLowerCase().includes('anvil')) {
      interactionAction = 'Forge & Repair';
    } else if (targetBlockDef?.category === 'farming' || targetBlockDef?.name?.toLowerCase().includes('wheat')) {
      interactionAction = 'Harvest Crop';
    } else if (targetBlockDef?.name?.toLowerCase().includes('door')) {
      interactionAction = 'Toggle Door';
    }
  }

  return (
    <div 
      id="game-hud" 
      className="absolute inset-0 pointer-events-none flex flex-col justify-between z-10 select-none font-sans hud-scaled"
      style={{ padding: 'var(--safe-area-padding)' }}
    >
      
      {/* Damage Flash Vignette Overlay */}
      {damageFlash && (
        <div className="absolute inset-0 pointer-events-none bg-radial from-transparent via-rose-900/30 to-rose-600/60 animate-damage-shake animate-hit-flash z-30" />
      )}

      {/* Top Bar (Telemetry on Left, Objective in Center, Menu Actions on Right) */}
      <div className="flex justify-between items-start w-full relative z-20">
        {/* Left: Telemetry & Quest Objective */}
        <div className="flex flex-col gap-3">
          {settings.gameplay.showFps && <HUDTelemetryOverlay />}
          
          {/* Active Quests HUD Panel - Progressive Disclosure */}
          {activeQuests.length > 0 ? (
            <div className="flex flex-col gap-2 max-w-xs pointer-events-auto">
              {activeQuests.slice(0, 3).map((q, qIndex) => {
                const priority = qIndex === 0 ? 'PRIMARY' : qIndex === 1 ? 'SECONDARY' : 'EVENT';
                return (
                  <div key={q.def.id} className="voxel-panel-subtle px-3 py-2 border-l-2 border-l-[var(--vv-warning)] bg-[var(--vv-bg)]/60 backdrop-blur-md">
                    <div className="text-[9px] font-bold text-[var(--vv-warning)] tracking-wider mb-1">{priority}</div>
                    <div className="font-semibold text-[13px] text-white leading-tight mb-1.5 drop-shadow-md">
                      {q.def.title}
                    </div>
                    <div className="space-y-1">
                      {q.def.objectives.map((obj: any, idx: number) => {
                        const count = q.progress[idx] || 0;
                        const isDone = count >= obj.requiredCount;
                        if (isDone) return null; // Hide completed in compact view
                        return (
                          <div 
                            key={`hud-quest-obj-${q.def.id}-${idx}`} 
                            className="flex items-start gap-1.5 text-[11px] leading-relaxed text-[var(--vv-text-main)] drop-shadow-sm"
                          >
                            <span className="text-[var(--vv-warning)] shrink-0 mt-[2px] opacity-80">
                              •
                            </span>
                            <span>
                              {obj.description} <span className="opacity-70">({count}/{obj.requiredCount})</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {activeQuests.length > 3 && (
                <div className="text-[10px] text-[var(--vv-text-muted)] font-bold italic ml-2">
                  + {activeQuests.length - 3} more objectives
                </div>
              )}
            </div>
          ) : objectiveText ? (
            <div className="voxel-panel-subtle px-3 py-1.5 max-w-xs border-l-2 border-l-[var(--vv-warning)] flex items-center gap-2 animate-fade-in pointer-events-auto bg-[var(--vv-bg)]/60">
              <Sparkles className="w-3.5 h-3.5 text-[var(--vv-warning)] shrink-0" />
              <div className="text-[12px] text-white truncate drop-shadow-md">
                {objectiveText}
              </div>
            </div>
          ) : null}

          {/* Boss Encounter Health Bar */}
          {activeBoss && (
            <div className="w-84 mt-2 voxel-panel p-3 border-[var(--vv-danger)]/40 shadow-[0_0_25px_rgba(239,68,68,0.3)] animate-fade-in pointer-events-auto">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-sm font-black uppercase tracking-wider text-[var(--vv-danger)] drop-shadow-md">
                  {activeBoss.name}
                </span>
                <span className="text-[10px] font-mono text-rose-200 font-bold">
                  {Math.ceil(activeBoss.health)} / {activeBoss.maxHealth}
                </span>
              </div>
              <div className="h-3 bg-black/80 rounded-full border border-rose-500/30 overflow-hidden relative p-[1px]">
                <div 
                  className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-[var(--vv-warning)] rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(239,68,68,0.8)]"
                  style={{ width: `${Math.max(0, Math.min(100, (activeBoss.health / activeBoss.maxHealth) * 100))}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Center: Aether Anomaly & Environmental Warning Panel */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-10 top-4">
          {anomalyStatus !== 'dormant' && (
            <div className={`voxel-panel p-2.5 px-4 w-80 shadow-[0_0_20px_rgba(147,51,234,0.4)] animate-pulse border-purple-500/50 bg-purple-950/40 backdrop-blur-md text-center pointer-events-auto flex flex-col gap-1`}>
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-purple-300">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                <span>Aether Anomaly: {anomalyStatus.toUpperCase()}</span>
              </div>
              <div className="text-xs font-semibold text-purple-100">
                {anomalyStatus === 'warning' && 'Leylines rupturing... Storm warning!'}
                {anomalyStatus === 'active' && 'Aether Storm active! Wildlife mutated.'}
                {anomalyStatus === 'climax' && 'PORTAL ACTIVE • Elite Anomaly Sentinel mutated!'}
                {anomalyStatus === 'resolved' && 'Leylines stabilized. Pure energy dispersing...'}
              </div>
              <div className="h-1 bg-black/60 rounded-full border border-purple-500/20 overflow-hidden mt-1 p-[0.5px]">
                <div 
                  className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-pink-500 rounded-full transition-all duration-300"
                  style={{ width: `${anomalyIntensity * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick Action Tray */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {onOpenJournal && (
            <button
              onClick={onOpenJournal}
              title="Journal & Codex [J]"
              className="px-3 py-1.5 voxel-panel-subtle hover:border-white/30 text-xs font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="text-amber-400">📖</span>
              <span className="hidden sm:inline">Journal</span>
              <kbd className="text-[9px] font-mono text-zinc-400 bg-white/5 px-1 rounded">J</kbd>
            </button>
          )}

          {onToggleDebugMap && (
            <button
              onClick={onToggleDebugMap}
              title="World Map [M]"
              className="px-3 py-1.5 voxel-panel-subtle hover:border-white/30 text-xs font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span className="text-cyan-400">🗺️</span>
              <span className="hidden sm:inline">Map</span>
              <kbd className="text-[9px] font-mono text-zinc-400 bg-white/5 px-1 rounded">M</kbd>
            </button>
          )}

          <button
            onClick={() => setShowProfiler(prev => !prev)}
            title="Toggle Engine Telemetry & Profiler [F3]"
            className={`px-3 py-1.5 voxel-panel-subtle hover:border-white/30 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${showProfiler ? 'border-sky-400 text-sky-300 bg-sky-500/10' : 'text-zinc-200 hover:text-white'}`}
          >
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Stats</span>
            <kbd className="text-[9px] font-mono text-zinc-400 bg-white/5 px-1 rounded">F3</kbd>
          </button>

          <button 
            onClick={onOpenPause}
            className="px-3.5 py-1.5 voxel-panel hover:border-sky-400/50 text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-lg"
          >
            <span>Menu</span>
            <kbd className="text-[9px] font-mono text-zinc-400 bg-white/10 px-1 rounded">ESC</kbd>
          </button>
        </div>
      </div>

      {/* Engine Profiler Overlay [F3] */}
      {showProfiler && <HUDProfilerOverlay onClose={() => setShowProfiler(false)} />}

      {/* Center Crosshair & Combat Hitmarkers */}
      <div id="hud-crosshair-center" className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
        
        {/* Bow Draw Reticle */}
        <div id="hud-bow-reticle" style={{ display: 'none' }} className="relative flex items-center justify-center pointer-events-none mb-1">
          <div 
            id="hud-bow-circle"
            className="w-10 h-10 rounded-full border border-dashed transition-all duration-75 flex items-center justify-center border-white/60 scale-125"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-white/90" />
          </div>
        </div>

        {/* Dynamic Interactive Crosshair */}
        <div className={`w-6 h-6 relative flex items-center justify-center transition-transform duration-100 ${targetHit ? 'scale-110' : ''}`}>
          {/* Crosshair Center Dot */}
          <div className="w-1.5 h-1.5 rounded-full bg-white/90 shadow-[0_0_4px_rgba(0,0,0,0.9)]" />

          {/* Crosshair Ticks */}
          <div className={`absolute w-3 h-[1.5px] -left-3 rounded-full transition-colors ${targetHit ? 'bg-sky-400 shadow-[0_0_6px_#38bdf8]' : 'bg-white/70'}`} />
          <div className={`absolute w-3 h-[1.5px] -right-3 rounded-full transition-colors ${targetHit ? 'bg-sky-400 shadow-[0_0_6px_#38bdf8]' : 'bg-white/70'}`} />
          <div className={`absolute h-3 w-[1.5px] -top-3 rounded-full transition-colors ${targetHit ? 'bg-sky-400 shadow-[0_0_6px_#38bdf8]' : 'bg-white/70'}`} />
          <div className={`absolute h-3 w-[1.5px] -bottom-3 rounded-full transition-colors ${targetHit ? 'bg-sky-400 shadow-[0_0_6px_#38bdf8]' : 'bg-white/70'}`} />
          
          {/* Hitmarker Flash */}
          {hitmarker !== 'none' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none scale-150 animate-ping">
              <div className={`w-4 h-0.5 transform rotate-45 ${
                hitmarker === 'crit' ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]' : hitmarker === 'blocked' ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]' : 'bg-white'
              }`} />
              <div className={`w-4 h-0.5 transform -rotate-45 ${
                hitmarker === 'crit' ? 'bg-amber-400 shadow-[0_0_10px_#fbbf24]' : hitmarker === 'blocked' ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]' : 'bg-white'
              }`} />
            </div>
          )}

          {/* Circular Mining Progress Arc */}
          <svg className="absolute w-8 h-8 -top-1 -left-1 transform -rotate-90" style={{ display: 'none' }} id="crosshair-break-svg">
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

        {/* Contextual Interaction Prompt Box */}
        {targetBlockDef && (
          <div className="mt-8 voxel-panel px-3.5 py-1.5 flex items-center gap-2.5 animate-fade-in shadow-2xl">
            <span className="text-xs font-bold text-white tracking-wide">{targetBlockDef.name}</span>
            <div className="h-3 w-[1px] bg-white/20" />
            <div className="flex items-center gap-1.5 text-[11px] text-sky-300 font-semibold">
              <kbd className="px-1.5 py-0.5 rounded bg-sky-500 text-white font-mono text-[10px] font-bold shadow-sm">
                E
              </kbd>
              <span>{interactionAction}</span>
            </div>
          </div>
        )}
      </div>

      {/* Subtitles Overlay */}
      {subtitles.length > 0 && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none z-20">
          {subtitles.map((sub) => (
            <div key={sub.id} className="voxel-panel-subtle px-4 py-1.5 text-xs font-mono text-amber-200 shadow-xl flex items-center gap-2 border-amber-500/30 animate-fade-in">
              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
              <span><strong>[{sub.source}]</strong> {sub.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Notifications Toast Tray */}
      {notifications.length > 0 && (
        <div className="absolute top-16 right-6 flex flex-col gap-2 pointer-events-none z-30 max-w-sm">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-3 voxel-panel shadow-2xl flex items-center gap-3 animate-fade-in ${
                n.priority === 'CRITICAL'
                  ? 'border-rose-500/60 text-white bg-rose-950/90'
                  : n.priority === 'HIGH'
                  ? 'border-amber-500/60 text-white bg-amber-950/90'
                  : 'text-white'
              }`}
            >
              {n.icon && <span className="text-lg">{n.icon}</span>}
              <div>
                <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-300">{n.title}</h5>
                <p className="text-xs font-semibold leading-tight text-zinc-100">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Section: Item Banner, Vitals, and Hotbar */}
      <div id="hud-bottom-dock" className="flex flex-col items-center w-full gap-2 relative z-20">
        
        {/* Selected Item Banner (Fades out automatically) */}
        {activeItemBanner && (
          <div className="text-xs font-bold text-sky-300 bg-black/60 px-3 py-1 rounded-full border border-sky-400/30 backdrop-blur-md animate-fade-in font-mono shadow-lg">
            {activeItemBanner}
          </div>
        )}

        <HUDVitalsBars />

        {/* Hotbar (1-9) */}
        <div className="flex items-center gap-1.5 p-2 voxel-panel shadow-2xl pointer-events-auto border-white/15">
          {hotbar.map((slot, idx) => {
            const isActive = idx === activeHotbarIndex;
            const itemDef = slot ? ITEM_DEFS[slot.itemId] : null;
            const maxDura = slot?.maxDurability || itemDef?.durability;
            const curDura = slot?.durability !== undefined ? slot.durability : maxDura;
            const hasDurability = curDura !== undefined && maxDura !== undefined && curDura < maxDura;
            const duraPercent = hasDurability ? Math.max(0, Math.min(100, (curDura / maxDura) * 100)) : 100;
            
            return (
              <button
                key={`hotbar-slot-${idx}`}
                id={`hotbar_slot_${idx}`}
                onClick={() => onSelectHotbar(idx)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center relative transition-all duration-100 cursor-pointer ${
                  isActive
                    ? 'bg-sky-500/20 border-2 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.4)] scale-105'
                    : slot
                    ? 'bg-white/10 hover:bg-white/15 border border-white/15'
                    : 'bg-black/40 hover:bg-white/5 border border-white/5'
                }`}
              >
                {slot && itemDef ? (
                  <div className="flex flex-col items-center justify-center w-full h-full p-1 relative">
                    {/* Item Icon Box */}
                    <div 
                      className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] shadow-sm text-white" 
                      style={{ backgroundColor: itemDef.iconColor }}
                    >
                      {itemDef.name.substring(0, 2).toUpperCase()}
                    </div>

                    {/* Quantity Badge */}
                    {slot.count > 1 && (
                      <span className="absolute bottom-1 right-1 text-[9px] font-mono font-black text-white drop-shadow bg-black/60 px-1 rounded">
                        {slot.count}
                      </span>
                    )}

                    {/* Durability Bar (if damaged) */}
                    {hasDurability && (
                      <div className="absolute bottom-0.5 left-1 right-1 h-1 bg-black/80 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            duraPercent < 25 ? 'bg-rose-500' : duraPercent < 50 ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${duraPercent}%` }}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/15" />
                )}
                <span className="absolute top-0.5 left-1 text-[8px] font-mono text-zinc-400">{idx + 1}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
