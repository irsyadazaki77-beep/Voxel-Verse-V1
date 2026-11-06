import React, { useState, useEffect, useRef } from 'react';
import { ItemStack, BossCombatState, ArtifactDef } from '../types';
import { BLOCK_DEFS } from '../engine/world/BlockRegistry';
import { ITEM_DEFS } from '../engine/items/ItemRegistry';
import { ARTIFACT_REGISTRY } from '../engine/progression/ArtifactRegistry';
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
import { TelemetryStore, TelemetryData } from '../engine/ui/TelemetryStore';
import { GameEventBus } from '../engine/events/GameEventBus';
import { AetherAnomalyManager } from '../engine/anomaly/AetherAnomalyManager';
import { triggerHaptic } from '../utils/haptics';
import { MiniRadar } from './MiniRadar';
import { TutorialDirector, TutorialStep } from '../engine/tutorial/TutorialDirector';
import { WeaponSkillManager, WeaponSkillDef } from '../engine/combat/WeaponSkillManager';
import { NetworkSession } from '../engine/network/NetworkSession';
import { CharacterProgressionManager } from '../engine/progression/CharacterProgressionManager';
import { MahakaryaNusantaraModal } from './MahakaryaNusantaraModal';
import { MahakaryaNusantaraSystem } from '../engine/systems/MahakaryaNusantaraSystem';
import { NusantaraSanctumSilatSubakSystem } from '../engine/systems/NusantaraSanctumSilatSubakSystem';
import { MaritimeVesselSystem } from '../engine/systems/MaritimeVesselSystem';
import { VernacularHologramSystem } from '../engine/systems/VernacularHologramSystem';
import { AerialFlightAndSiegeSystem } from '../engine/systems/AerialFlightAndSiegeSystem';

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
  onOpenCharacter?: () => void;
  onOpenContentDebug?: () => void;
  onOpenMultiplayerLobby?: () => void;
  activeBoss?: BossCombatState | null;
  objectiveText?: string;
}

function shallowEqualRecord(a: any, b: any): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const k = keysA[i];
    const va = a[k];
    const vb = b[k];
    if (Array.isArray(va) && Array.isArray(vb)) {
      if (va.length !== vb.length) return false;
      for (let j = 0; j < va.length; j++) {
        if (va[j] !== vb[j]) return false;
      }
    } else if (va !== vb) {
      return false;
    }
  }
  return true;
}

const HUDTelemetryOverlay = React.memo(({ onOpenMultiplayerLobby }: { onOpenMultiplayerLobby?: () => void }) => {
  const posRef = useRef<HTMLDivElement>(null);
  const fpsRef = useRef<HTMLDivElement>(null);
  const armorRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLSpanElement>(null);
  const biomeRef = useRef<HTMLSpanElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const compassRef = useRef<HTMLSpanElement>(null);

  const [netState, setNetState] = useState(NetworkSession.getInstance().connectionState);
  const [netPing, setNetPing] = useState(NetworkSession.getInstance().getStats().pingMs);
  const [isMpActive, setIsMpActive] = useState(NetworkSession.getInstance().isMultiplayerActive);

  useEffect(() => {
    const unsubNet = NetworkSession.getInstance().onConnectionStateChange((state) => {
      setNetState(state);
      setIsMpActive(NetworkSession.getInstance().isMultiplayerActive);
    });

    const pingTimer = setInterval(() => {
      if (NetworkSession.getInstance().isMultiplayerActive) {
        setNetPing(NetworkSession.getInstance().getStats().pingMs);
      }
    }, 1000);

    return () => {
      unsubNet();
      clearInterval(pingTimer);
    };
  }, []);

  useEffect(() => {
    return TelemetryStore.subscribe((stats) => {
      if (posRef.current) {
        posRef.current.innerText = `${Math.round(stats.playerPos[0])}, ${Math.round(stats.playerPos[1])}, ${Math.round(stats.playerPos[2])}`;
      }
      if (fpsRef.current) {
        fpsRef.current.innerText = `${stats.fps} FPS`;
      }
      if (armorRef.current) {
        armorRef.current.innerText = stats.defenseRating.toString();
      }
      if (regionRef.current) {
        regionRef.current.innerText = stats.culturalRegionName || 'Tanah Minang';
      }
      if (biomeRef.current) {
        biomeRef.current.innerText = stats.biomeName || 'Highlands';
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
        compassRef.current.innerText = `${heading} ${Math.round(deg)}°`;
      }
    });
  }, []);

  return (
    <div className="px-3.5 py-1.5 rounded-full bg-slate-950/75 border border-white/10 shadow-lg flex items-center gap-2.5 text-[11px] font-mono tabular-nums pointer-events-auto text-zinc-300">
      <span className="text-zinc-100 font-semibold whitespace-nowrap" ref={regionRef}>Tanah Minang</span>
      <span className="text-zinc-600" aria-hidden="true">·</span>
      <span className="text-zinc-400 hidden sm:inline whitespace-nowrap" ref={biomeRef}>Highlands</span>
      <span className="text-zinc-600 hidden sm:inline" aria-hidden="true">·</span>
      <span className="text-amber-300/90 font-medium whitespace-nowrap" ref={timeRef}>12:00</span>
      <span className="text-zinc-600" aria-hidden="true">·</span>
      <span className="text-zinc-400 whitespace-nowrap" ref={posRef}>0, 80, 0</span>
      <span className="text-zinc-600" aria-hidden="true">·</span>
      <span className="text-emerald-400 font-semibold whitespace-nowrap" ref={fpsRef}>60 FPS</span>

      {isMpActive && (
        <>
          <span className="text-zinc-600" aria-hidden="true">·</span>
          <button
            onClick={() => onOpenMultiplayerLobby?.()}
            className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-sky-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
            title="Multiplayer Realm Connection Status"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              netState === 'READY' ? 'bg-emerald-400' :
              netState === 'RECONNECTING' || netState === 'SYNCHRONIZING' ? 'bg-amber-400' :
              'bg-rose-500'
            }`} />
            <span>{netState === 'READY' ? `${netPing}ms` : netState}</span>
          </button>
        </>
      )}
    </div>
  );
});

const HUDProfilerOverlay = ({ onClose }: { onClose: () => void }) => {
  const [metrics, setMetrics] = useState(TelemetryStore.state.profilerMetrics);
  const [fps, setFps] = useState(TelemetryStore.state.fps);
  const [regionName, setRegionName] = useState(TelemetryStore.state.culturalRegionName);
  const [biomeName, setBiomeName] = useState(TelemetryStore.state.biomeName);

  useEffect(() => {
    return TelemetryStore.subscribe((stats) => {
      setMetrics(stats.profilerMetrics);
      setFps(stats.fps);
      setRegionName(stats.culturalRegionName);
      setBiomeName(stats.biomeName);
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
              <span className="font-bold text-amber-400">{((metrics as any).sunIntensity ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Exposure:</span>
              <span className="font-bold text-sky-300">{((metrics as any).exposure ?? 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Ambient / Hemi:</span>
              <span className="font-bold text-zinc-200">
                {((metrics as any).ambientIntensity ?? 0).toFixed(2)} / {((metrics as any).hemiIntensity ?? 0).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Combined Energy:</span>
              <span className={`font-bold ${(((metrics as any).sunIntensity ?? 0) + ((metrics as any).ambientIntensity ?? 0)) > 4.5 ? 'text-rose-400' : 'text-zinc-300'}`}>
                {(((metrics as any).sunIntensity ?? 0) + ((metrics as any).ambientIntensity ?? 0) + ((metrics as any).hemiIntensity ?? 0)).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Nusantara Cultural Region Profile */}
        <div className="bg-black/40 border border-amber-500/30 p-2 rounded col-span-2">
          <div className="text-amber-400 font-bold border-b border-amber-500/30 pb-1 mb-1 flex items-center justify-between">
             <span>CULTURAL REGION (NUSANTARA)</span>
             <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded border border-amber-500/40">GEN 1.0</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4">
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Region:</span>
              <span className="font-bold text-amber-300">{regionName || 'Uncharted'}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Biome:</span>
              <span className="font-bold text-sky-300">{biomeName || 'Unknown'}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Terrain:</span>
              <span className="font-bold text-emerald-300">{regionName === 'Tanah Minang' ? 'Mountain Valley' : regionName === 'Tanah Jawa' ? 'Plains & Hills' : regionName === 'Bali Highlands' ? 'Volcanic Slopes' : regionName === 'Borneo Riverlands' ? 'River Basin' : regionName === 'Toraja Highlands' ? 'Steep Cliffs' : regionName === 'Papuan Highlands' ? 'Mountain Range' : regionName === 'Eastern Isles' ? 'Archipelago' : 'Standard'}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Structure:</span>
              <span className="font-bold text-purple-300">{regionName === 'Tanah Minang' ? 'Rumah Gadang' : regionName === 'Tanah Jawa' ? 'Joglo/Candi' : regionName === 'Bali Highlands' ? 'Pura/Subak' : regionName === 'Borneo Riverlands' ? 'Betang' : regionName === 'Toraja Highlands' ? 'Tongkonan' : regionName === 'Papuan Highlands' ? 'Honai' : 'Default'}</span>
            </div>
          </div>
        </div>

        {/* Chunk Debug Overlay (New Diagnostic Box) */}
        <div className="bg-black/40 border border-white/5 p-2 rounded col-span-2">
          <div className="text-zinc-400 font-bold border-b border-white/5 pb-1 mb-1">CHUNK GEOMETRY DIAGNOSTICS</div>
          <div className="grid grid-cols-2 gap-x-4">
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Loaded Chunks:</span>
              <span className="font-bold text-sky-400">{metrics.loadedChunks ?? 0}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Generated:</span>
              <span className="font-bold text-sky-300">{metrics.generatedChunks ?? 0}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Meshed Chunks:</span>
              <span className="font-bold text-emerald-400">{metrics.meshedChunks ?? 0}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Visible Chunks:</span>
              <span className="font-bold text-amber-400">{metrics.visibleChunks ?? 0}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Culled Chunks:</span>
              <span className="font-bold text-zinc-400">{metrics.culledChunks ?? 0}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">worldGroup Child:</span>
              <span className="font-bold text-pink-400">{metrics.worldGroupChildren ?? 0}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Solid Meshes:</span>
              <span className="font-bold text-orange-400">{metrics.solidMeshCount ?? 0}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Water Meshes:</span>
              <span className="font-bold text-blue-400">{metrics.waterMeshCount ?? 0}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Pending Gen:</span>
              <span className="font-bold text-purple-400">{metrics.pendingGeneration ?? 0}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400">Pending Mesh:</span>
              <span className="font-bold text-rose-400">{metrics.pendingMeshing ?? 0}</span>
            </div>
            <div className="flex justify-between py-0.5 col-span-2 border-t border-white/5 mt-1 pt-1">
              <span className="text-zinc-400">Pending Upload/Meshing:</span>
              <span className="font-bold text-yellow-400">{metrics.pendingUpload ?? 0}</span>
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
        <div className="grid grid-cols-4 gap-1.5 mt-1.5">
          <button
            onClick={() => {
              const rt = (window as any).__voxelRuntime;
              if (rt?.weather) rt.weather.setWeather('rimba_mist', 0.7);
            }}
            className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded text-[10px] font-bold cursor-pointer transition-colors"
          >
            🌫️ Kabut Rimba
          </button>
          <button
            onClick={() => {
              const rt = (window as any).__voxelRuntime;
              if (rt?.weather) rt.weather.setWeather('monsoon_rain', 0.85);
            }}
            className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded text-[10px] font-bold cursor-pointer transition-colors"
          >
            🌧️ Hujan Monsun
          </button>
          <button
            onClick={() => {
              const rt = (window as any).__voxelRuntime;
              if (rt?.weather) rt.weather.setWeather('aether_aurora', 0.85);
            }}
            className="px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded text-[10px] font-bold cursor-pointer transition-colors"
          >
            ✨ Aurora Ley
          </button>
          <button
            onClick={() => {
              const rt = (window as any).__voxelRuntime;
              if (rt?.entities && rt?.player && rt?.world) {
                const p = rt.player.position;
                rt.entities.spawnBoss('naga_antaboga', [p.x + 8, p.y, p.z + 8], rt.world);
              }
            }}
            className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded text-[10px] font-bold cursor-pointer transition-colors"
          >
            🐉 Naga Antaboga
          </button>
        </div>
      </div>
    </div>
  );
};

const HUDVitalsBars = React.memo(() => {
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
    <div className="flex flex-col items-center gap-1 w-full max-w-md pointer-events-auto">
      {/* Oxygen Bar (only when underwater) */}
      <div
        className="w-full px-3 py-1 rounded-full bg-slate-950/80 border border-sky-400/30 items-center justify-between gap-2 hidden"
        ref={oxygenContainerRef}
      >
        <div className="flex items-center gap-1 text-[10px] font-semibold text-sky-300">
          <Wind className="w-3 h-3" />
          <span>Oksigen</span>
        </div>
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-sky-400 rounded-full transition-all" ref={oxygenRef} style={{ width: '100%' }} />
        </div>
        <span className="text-[10px] font-mono tabular-nums text-sky-300" ref={oxygenTextRef}>100%</span>
      </div>

      {/* Unified Minimalist Vitals Pill (Health · Hunger · Stamina) */}
      <div className="grid grid-cols-3 gap-3 w-full px-3.5 py-1.5 rounded-full bg-slate-950/75 border border-white/10 shadow-lg">
        {/* Health */}
        <div className="voxel-panel-subtle !bg-transparent !border-0 !shadow-none flex items-center gap-1.5 transition-opacity duration-500">
          <Heart className="w-3 h-3 text-rose-400 fill-rose-400 shrink-0" />
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-rose-500 rounded-full transition-all duration-150"
              ref={healthRef}
              style={{ width: '100%' }}
            />
          </div>
          <span className="font-mono tabular-nums text-zinc-300 text-[10px] shrink-0" ref={healthTextRef}>100</span>
        </div>

        {/* Hunger */}
        <div className="voxel-panel-subtle !bg-transparent !border-0 !shadow-none flex items-center gap-1.5 transition-opacity duration-500">
          <Utensils className="w-3 h-3 text-amber-400 shrink-0" />
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all duration-150"
              ref={hungerRef}
              style={{ width: '100%' }}
            />
          </div>
          <span className="font-mono tabular-nums text-zinc-300 text-[10px] shrink-0" ref={hungerTextRef}>100%</span>
        </div>

        {/* Stamina */}
        <div className="voxel-panel-subtle !bg-transparent !border-0 !shadow-none flex items-center gap-1.5 transition-opacity duration-500">
          <Zap className="w-3 h-3 text-sky-400 fill-sky-400 shrink-0" />
          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-400 rounded-full transition-all duration-150"
              ref={staminaRef}
              style={{ width: '100%' }}
            />
          </div>
          <span className="font-mono tabular-nums text-zinc-300 text-[10px] shrink-0" ref={staminaTextRef}>100%</span>
        </div>
      </div>

      {/* Hairline XP Bar */}
      <div className="w-full flex items-center gap-2 px-3">
        <span className="text-[9px] font-mono tabular-nums font-semibold text-emerald-400 shrink-0" ref={levelTextRef}>Lv. 1</span>
        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-200"
            ref={xpRef}
            style={{ width: '0%' }}
          />
        </div>
      </div>
    </div>
  );
});

const HUDMultiPhaseBossBar: React.FC<{ activeBoss: BossCombatState }> = ({ activeBoss }) => {
  const [ghostHp, setGhostHp] = useState(activeBoss.health);

  useEffect(() => {
    const timer = setTimeout(() => {
      setGhostHp(activeBoss.health);
    }, 450);
    return () => clearTimeout(timer);
  }, [activeBoss.health]);

  const hpPercent = Math.max(0, Math.min(100, (activeBoss.health / activeBoss.maxHealth) * 100));
  const ghostPercent = Math.max(0, Math.min(100, (ghostHp / activeBoss.maxHealth) * 100));
  const currentPoise = activeBoss.poise ?? 100;
  const maxPoise = activeBoss.maxPoise ?? 240;
  const poisePercent = Math.max(0, Math.min(100, (currentPoise / maxPoise) * 100));
  const isStaggered = currentPoise <= 0;

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-30 w-[94vw] max-w-[620px] pointer-events-auto select-none transition-all duration-300 animate-fade-in ${
      activeBoss.enraged ? 'animate-pulse' : ''
    }`}>
      <div className={`p-3.5 rounded-xl border backdrop-blur-md shadow-2xl relative overflow-hidden transition-all duration-300 ${
        activeBoss.enraged 
          ? 'bg-rose-950/90 border-rose-500 shadow-[0_0_35px_rgba(244,63,94,0.45)]' 
          : activeBoss.isShielded 
            ? 'bg-cyan-950/90 border-cyan-500/80 shadow-[0_0_30px_rgba(6,182,212,0.35)]' 
            : 'bg-zinc-950/90 border-amber-600/50 shadow-[0_0_25px_rgba(217,119,6,0.25)]'
      }`}>
        {/* Top Header: Boss Name & Phase Badge */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-black tracking-wider uppercase text-white drop-shadow-md">
              {activeBoss.name}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-widest font-mono border ${
              activeBoss.enraged 
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : activeBoss.isShielded 
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}>
              {activeBoss.phaseSubtitle || `FASE ${activeBoss.phase}`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Phase Progress Indicator Nodes */}
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((pNum) => (
                <div
                  key={`boss-node-${pNum}`}
                  className={`w-2.5 h-2.5 rounded-full border transition-all ${
                    activeBoss.phase >= pNum 
                      ? activeBoss.enraged ? 'bg-rose-500 border-rose-300 shadow-[0_0_8px_#f43f5e]' : 'bg-amber-400 border-amber-200 shadow-[0_0_6px_#fbbf24]' 
                      : 'bg-zinc-800 border-zinc-700'
                  }`}
                />
              ))}
            </div>
            <span className="font-mono text-xs font-bold text-zinc-300 ml-1">
              {Math.ceil(activeBoss.health)} / {activeBoss.maxHealth}
            </span>
          </div>
        </div>

        {/* Shield Alert Banner if Shielded */}
        {activeBoss.isShielded && !isStaggered && (
          <div className="mb-2 px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between text-[11px] text-cyan-200">
            <div className="flex items-center gap-1.5 font-semibold">
              <Shield className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>PERISAI AETHER AKTIF (-55% Damage)</span>
            </div>
            <span className="text-[10px] text-cyan-300/80 font-mono">Pecahkan Poise untuk meruntuhkan</span>
          </div>
        )}

        {/* Stagger Warning Banner */}
        {isStaggered && (
          <div className="mb-2 px-2.5 py-1 rounded bg-amber-500/20 border border-amber-400 flex items-center justify-between text-[11px] text-amber-200 animate-bounce">
            <div className="flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
              <span>POISE PECAH! BOSS TERTUNDUK!</span>
            </div>
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest font-mono">
              [ 100% RIPOSTE KRITIS ]
            </span>
          </div>
        )}

        {/* Dual-Layer HP Bar with Ghost Bar */}
        <div className="relative h-4 bg-black/80 rounded-md border border-white/10 overflow-hidden p-[1px] mb-1.5">
          {/* Ghost Bar */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-amber-500/60 rounded-md transition-all duration-700 ease-out"
            style={{ width: `${ghostPercent}%` }}
          />
          {/* Active HP Bar */}
          <div
            className={`h-full rounded-md transition-all duration-150 relative ${
              activeBoss.enraged 
                ? 'bg-gradient-to-r from-rose-700 via-rose-500 to-amber-500 shadow-[0_0_15px_#f43f5e]'
                : activeBoss.isShielded 
                  ? 'bg-gradient-to-r from-cyan-600 via-sky-500 to-indigo-500 shadow-[0_0_15px_#06b6d4]'
                  : 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]'
            }`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>

        {/* Poise / Stagger Meter Bar */}
        <div className="flex items-center gap-2 pt-0.5 text-[10px]">
          <span className="font-mono text-zinc-400 font-bold shrink-0">POISE STAGGER</span>
          <div className="flex-1 h-1.5 bg-black/70 rounded-full border border-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-150 ${
                isStaggered 
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-sky-400 shadow-[0_0_8px_#38bdf8]'
              }`}
              style={{ width: `${poisePercent}%` }}
            />
          </div>
          <span className="font-mono text-zinc-400 text-[9px] shrink-0">
            {Math.round(currentPoise)}/{maxPoise}
          </span>
        </div>
      </div>
    </div>
  );
};

const HUDRelicDiscoveryModal: React.FC<{
  discovery: { relic: ArtifactDef; bossName: string };
  onClose: () => void;
}> = ({ discovery, onClose }) => {
  const { relic, bossName } = discovery;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 pointer-events-auto select-none animate-fade-in">
      <div className="bg-[#121118] border-2 border-amber-500/80 rounded-2xl p-6 max-w-md w-full shadow-[0_0_50px_rgba(245,158,11,0.35)] text-center relative overflow-hidden">
        {/* Top gold embellishment */}
        <div className="w-20 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto mb-3" />
        
        <div className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold mb-1">
          ✦ PUSAKA PURBA NUSANTARA TERUNGKAP ✦
        </div>
        <p className="text-xs text-zinc-400 mb-4">
          Dihasilkan dari reruntuhan <strong className="text-zinc-200">{bossName}</strong>
        </p>

        {/* Relic Icon Box */}
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border-2 border-amber-400/60 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(245,158,11,0.4)] mb-4 animate-bounce">
          🏆
        </div>

        <h3 className="text-xl font-black text-amber-300 uppercase tracking-wide mb-2 drop-shadow-md">
          {relic.name}
        </h3>

        <div className="p-3 rounded-xl bg-black/50 border border-white/10 text-left mb-4 space-y-2">
          <div className="text-[11px] text-zinc-300 italic leading-relaxed border-b border-white/5 pb-2">
            "{relic.lore}"
          </div>
          <div className="text-xs font-semibold text-emerald-300 flex items-start gap-1.5 pt-0.5">
            <span className="text-emerald-400 shrink-0 font-bold">★ Kemampuan:</span>
            <span>{relic.passiveAbility}</span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 text-zinc-950 font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer transition-all active:scale-[0.98]"
        >
          Klaim & Simpan ke Inventaris
        </button>
      </div>
    </div>
  );
};

const HUDTutorialCard: React.FC = () => {
  const [tutState, setTutState] = useState<{ step: TutorialStep | null; isDismissed: boolean; isAllCompleted: boolean }>({
    step: TutorialDirector.getCurrentStep(),
    isDismissed: false,
    isAllCompleted: false,
  });

  useEffect(() => {
    TutorialDirector.initialize();
    return TutorialDirector.subscribe(setTutState);
  }, []);

  if (tutState.isDismissed || tutState.isAllCompleted || !tutState.step) {
    return null;
  }

  const { step } = tutState;

  return (
    <div className="px-3.5 py-2.5 rounded-2xl max-w-[270px] bg-slate-950/75 border border-white/10 pointer-events-auto animate-fade-in shadow-lg">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[11px] font-semibold text-sky-300 truncate">{step.title}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          {step.targetCount > 1 && (
            <span className="text-[10px] font-mono tabular-nums text-zinc-400">
              {step.currentCount}/{step.targetCount}
            </span>
          )}
          <button
            onClick={() => TutorialDirector.dismissTutorial()}
            className="text-zinc-500 hover:text-white text-[11px] cursor-pointer px-1 rounded transition-colors"
            title="Sembunyikan Panduan"
          >
            ✕
          </button>
        </div>
      </div>

      <p className="text-[11px] text-zinc-300 leading-snug mb-1.5">{step.instruction}</p>

      <div className="text-[10px] font-mono text-zinc-400 truncate">
        {step.keyboardHint}
      </div>
    </div>
  );
};

const HUDWeaponSkillWidget: React.FC = () => {
  const [skillState, setSkillState] = useState<{
    skill: WeaponSkillDef | null;
    cooldownRatio: number;
    cooldownSeconds: number;
  }>({
    skill: WeaponSkillManager.getSkillForWeapon(null),
    cooldownRatio: 0,
    cooldownSeconds: 0,
  });

  useEffect(() => {
    return WeaponSkillManager.subscribe(setSkillState);
  }, []);

  const handleTrigger = () => {
    const rt = (window as any).__voxelRuntime;
    if (rt) {
      triggerHaptic('impact');
      rt.triggerWeaponSkill();
    }
  };

  const skill = skillState.skill;
  const isCooldown = skillState.cooldownSeconds > 0;

  return (
    <div className="flex items-center pointer-events-auto shrink-0">
      <button
        onClick={handleTrigger}
        title={skill ? `${skill.name} [R]` : 'Jurus Pusaka [R]'}
        className={`relative w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
          isCooldown
            ? 'bg-slate-950/80 border-white/10 opacity-65'
            : 'bg-slate-900/90 hover:bg-slate-800 border-amber-400/40 text-amber-300 active:scale-95'
        }`}
      >
        {isCooldown && (
          <div className="absolute inset-0 bg-black/80 rounded-xl flex items-center justify-center text-[10px] font-mono tabular-nums font-bold text-amber-300 z-20">
            {skillState.cooldownSeconds}s
          </div>
        )}

        <span className="text-sm sm:text-base relative z-10">{skill?.icon || '⚡'}</span>
        <span className="absolute bottom-0.5 right-1 text-[7px] font-mono font-semibold text-zinc-400 z-10">
          R
        </span>
      </button>
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
  onOpenCharacter,
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
  const [showQuickTools, setShowQuickTools] = useState(false);
  const [zenHudMode, setZenHudMode] = useState(false);
  const [showMahakaryaModal, setShowMahakaryaModal] = useState(false);
  const [mahakaryaInitialTab, setMahakaryaInitialTab] = useState<'SAMUDRA_KERETA' | 'GAMELAN_STUDIO' | 'KHODAM_ARENA' | 'BUSANA_FOTO'>('SAMUDRA_KERETA');
  const [pusakaCardMinimized, setPusakaCardMinimized] = useState(false);
  const [autoSaveState, setAutoSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [comboBanner, setComboBanner] = useState<{ step: number; label: string; isCrit: boolean } | null>(null);
  const [unspentProgPoints, setUnspentProgPoints] = useState(
    CharacterProgressionManager.availableSkillPoints + CharacterProgressionManager.availableAttributePoints
  );

  useEffect(() => {
    setUnspentProgPoints(
      CharacterProgressionManager.availableSkillPoints + CharacterProgressionManager.availableAttributePoints
    );
    return CharacterProgressionManager.subscribe(() => {
      setUnspentProgPoints(
        CharacterProgressionManager.availableSkillPoints + CharacterProgressionManager.availableAttributePoints
      );
    });
  }, []);

  // F3: Profiling Overlay, F4: Toggle Turbo 60 FPS Mode, F6: Cycle Time of Day, H: Toggle Zen Minimal HUD
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'F3') {
        e.preventDefault();
        setShowProfiler(prev => !prev);
      } else if (e.code === 'KeyH' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setZenHudMode(prev => !prev);
      } else if (e.code === 'F4') {
        e.preventDefault();
        const enabled = SettingsManager.toggleTurboFpsMode();
        NotificationManager.push({
          title: enabled ? 'Mode Turbo 60 FPS Aktif' : 'Mode Visual Standar Aktif',
          message: enabled
            ? 'Shadow terukur, CAS Sharpening jarak dekat, & Dynamic Resolution menjaga 60 FPS.'
            : 'Kualitas bayangan & jarak pandang dikembalikan ke pengaturan standar.',
          priority: 'HIGH',
          colorTheme: enabled ? 'emerald' : 'sky',
          durationMs: 3200,
        });
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
      } else if (e.code === 'KeyV' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const rt = (window as any).__voxelRuntime;
        if (rt) {
          NusantaraSanctumSilatSubakSystem.cycleSilatStance(rt.audio);
        }
      } else if (e.code === 'KeyG' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const rt = (window as any).__voxelRuntime;
        if (rt && rt.player && rt.stats) {
          if (NusantaraSanctumSilatSubakSystem.tenagaDalam >= 100) {
            NusantaraSanctumSilatSubakSystem.unleashAjianUltimate(
              rt.entities,
              rt.player,
              rt.stats,
              rt.audio,
              rt.particles
            );
          } else {
            NusantaraSanctumSilatSubakSystem.cycleAjianUltimate(rt.audio);
          }
        }
      } else if (e.code === 'KeyN' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setMahakaryaInitialTab('SAMUDRA_KERETA');
        setShowMahakaryaModal(prev => !prev);
      } else if (e.code === 'KeyP' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const rt = (window as any).__voxelRuntime;
        if (rt && rt.player && rt.camera) {
          const active = MahakaryaNusantaraSystem.togglePhotoMode(rt.player, rt.camera, rt.audio);
          setMahakaryaInitialTab('BUSANA_FOTO');
          setShowMahakaryaModal(active);
        }
      } else if (e.code === 'KeyB' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setPusakaCardMinimized(prev => !prev);
      } else if (e.code === 'Escape') {
        if (showMahakaryaModal) {
          setShowMahakaryaModal(false);
        } else if (showQuickTools) {
          setShowQuickTools(false);
        } else if (showProfiler) {
          setShowProfiler(false);
        }
      } else if (e.code === 'F5') {
        e.preventDefault();
        const rt = (window as any).__voxelRuntime;
        if (rt?.persistenceSystem) {
          rt.persistenceSystem.saveGame();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showMahakaryaModal, showQuickTools, showProfiler]);

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

  // Subscribe to Combat & Smart Auto-Save Events
  useEffect(() => {
    const unsubHit = GameEventBus.on('COMBAT_HIT', (payload) => {
      setHitmarker(payload.hitType);
      setTimeout(() => setHitmarker('none'), 200);

      const rt = (window as any).__voxelRuntime;
      const step = rt?.combatSystem?.combatMachine?.comboStep ?? 0;
      const labels = ['SABETAN I', 'SABETAN SILANG II', 'TUSUKAN PAMUNGKAS III (1.45x)'];
      setComboBanner({
        step,
        label: labels[step % 3] || 'SABETAN I',
        isCrit: payload.hitType === 'crit',
      });
      setTimeout(() => setComboBanner(null), 950);
    });

    const unsubDmg = GameEventBus.on('PLAYER_DAMAGED', () => {
      setDamageFlash(true);
      setTimeout(() => setDamageFlash(false), 260);
    });

    const unsubSave = GameEventBus.on('AUTOSAVE_STATUS', (payload: { saving?: boolean; saved?: boolean }) => {
      if (payload.saving) {
        setAutoSaveState('saving');
      } else if (payload.saved) {
        setAutoSaveState('saved');
        setTimeout(() => setAutoSaveState('idle'), 2400);
      }
    });

    return () => {
      unsubHit();
      unsubDmg();
      unsubSave();
    };
  }, []);

  const [activeRelicDiscovery, setActiveRelicDiscovery] = useState<{ relic: ArtifactDef; bossName: string } | null>(null);

  useEffect(() => {
    const unsubRelic = GameEventBus.on('RELIC_DISCOVERED', (payload: { relicId: string; bossName: string }) => {
      const def = ARTIFACT_REGISTRY[payload.relicId];
      if (def) {
        setActiveRelicDiscovery({
          relic: def,
          bossName: payload.bossName || 'Batara Kala Underchamber Colossus',
        });
      }
    });

    return () => unsubRelic();
  }, []);

  const [isLockOnActive, setIsLockOnActive] = useState(false);

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

  const [fishingHud, setFishingHud] = useState<{
    state: string;
    tension: number;
    progress: number;
  }>({ state: 'IDLE', tension: 0, progress: 0 });

  const [targetedCreature, setTargetedCreature] = useState<TelemetryData['targetedCreature']>(null);
  const [activeVessel, setActiveVessel] = useState<TelemetryData['activeVessel']>(null);
  const [activeCataclysm, setActiveCataclysm] = useState<TelemetryData['activeCataclysm']>(null);
  const [activeHologram, setActiveHologram] = useState<TelemetryData['activeHologram']>(null);
  const [activeTreasureHint, setActiveTreasureHint] = useState<TelemetryData['activeTreasureHint']>(null);
  const [activeAerialFlight, setActiveAerialFlight] = useState<TelemetryData['activeAerialFlight']>(null);
  const [activeVillageSiege, setActiveVillageSiege] = useState<TelemetryData['activeVillageSiege']>(null);
  const [nusantaraV46, setNusantaraV46] = useState<TelemetryData['nusantaraV46']>(null);
  const [mahakaryaV48, setMahakaryaV48] = useState<TelemetryData['mahakaryaV48']>(null);

  // Subscribe to Telemetry with Shallow Diffing (Zero unnecessary React re-renders!)
  useEffect(() => {
    return TelemetryStore.subscribe((stats) => {
      const rt = (window as any).__voxelRuntime;
      if (rt && rt.player) {
        const nextLock = !!rt.player.isLockOnActive;
        setIsLockOnActive((prev) => (prev === nextLock ? prev : nextLock));
      }

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

      setFishingHud((prev) => {
        const nextState = stats.fishingState || 'IDLE';
        const nextTension = stats.fishingTension ?? 0;
        const nextProgress = stats.fishingProgress ?? 0;
        if (
          prev.state === nextState &&
          prev.tension === nextTension &&
          prev.progress === nextProgress
        ) {
          return prev;
        }
        return { state: nextState, tension: nextTension, progress: nextProgress };
      });

      const nextCreature = stats.targetedCreature || null;
      setTargetedCreature((prev) => (shallowEqualRecord(prev, nextCreature) ? prev : nextCreature));

      const nextVessel = stats.activeVessel || null;
      setActiveVessel((prev) => (shallowEqualRecord(prev, nextVessel) ? prev : nextVessel));

      const nextCataclysm = stats.activeCataclysm || null;
      setActiveCataclysm((prev) => (shallowEqualRecord(prev, nextCataclysm) ? prev : nextCataclysm));

      const nextHologram = stats.activeHologram || null;
      setActiveHologram((prev) => (shallowEqualRecord(prev, nextHologram) ? prev : nextHologram));

      const nextTreasure = stats.activeTreasureHint || null;
      setActiveTreasureHint((prev) => (shallowEqualRecord(prev, nextTreasure) ? prev : nextTreasure));

      const nextFlight = stats.activeAerialFlight || null;
      setActiveAerialFlight((prev) => (shallowEqualRecord(prev, nextFlight) ? prev : nextFlight));

      const nextSiege = stats.activeVillageSiege || null;
      setActiveVillageSiege((prev) => (shallowEqualRecord(prev, nextSiege) ? prev : nextSiege));

      const nextV46 = stats.nusantaraV46 || null;
      setNusantaraV46((prev) => (shallowEqualRecord(prev, nextV46) ? prev : nextV46));

      const nextV48 = stats.mahakaryaV48 || null;
      setMahakaryaV48((prev) => (shallowEqualRecord(prev, nextV48) ? prev : nextV48));
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
    } else if (targetBlockDef?.category === 'farming' || targetBlockDef?.name?.toLowerCase().includes('wheat') || targetBlockDef?.name?.toLowerCase().includes('padi')) {
      interactionAction = 'Panen Tanaman [Klik Kanan]';
    } else if (targetBlockDef?.name?.toLowerCase().includes('door')) {
      interactionAction = 'Toggle Door';
    } else if (targetHit.blockType === 131 || targetBlockDef?.name?.toLowerCase().includes('altar')) {
      interactionAction = 'Bangkitkan Ritual Altar Purba';
    } else if (targetHit.blockType === 134 || targetBlockDef?.name?.toLowerCase().includes('kima')) {
      interactionAction = 'Panen Mutiara Samudra [Klik Kanan]';
    } else if (
      targetBlockDef?.name?.toLowerCase().includes('fabricator') ||
      targetBlockDef?.name?.toLowerCase().includes('harvester') ||
      targetBlockDef?.name?.toLowerCase().includes('turret') ||
      targetBlockDef?.name?.toLowerCase().includes('ley')
    ) {
      interactionAction = 'Buka Panel Aether Engineering';
    }
  }

  return (
    <div 
      id="game-hud" 
      className="absolute inset-0 pointer-events-none flex flex-col justify-between z-10 select-none font-sans hud-scaled"
      style={{
        paddingTop: 'max(8px, env(safe-area-inset-top))',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(14px, env(safe-area-inset-left))',
        paddingRight: 'max(14px, env(safe-area-inset-right))',
      }}
    >
      
      {/* Damage Flash Vignette Overlay */}
      {damageFlash && (
        <div className="absolute inset-0 pointer-events-none bg-radial from-transparent via-rose-900/30 to-rose-600/60 animate-damage-shake animate-hit-flash z-30" />
      )}

      {/* Cinematic Multi-Phase Boss Bar */}
      {activeBoss && <HUDMultiPhaseBossBar activeBoss={activeBoss} />}

      {/* Ancient Relic Discovery Banner Modal */}
      {activeRelicDiscovery && (
        <HUDRelicDiscoveryModal
          discovery={activeRelicDiscovery}
          onClose={() => setActiveRelicDiscovery(null)}
        />
      )}

      {/* Top Bar (Telemetry on Left, Objective in Center, Minimalist Actions on Right) */}
      <div className="flex justify-between items-start w-full relative z-20">
        {/* Left: Telemetry & Compact Objective */}
        {!zenHudMode ? (
          <div className="flex flex-col gap-2">
            {settings.gameplay.showFps && <HUDTelemetryOverlay onOpenMultiplayerLobby={onOpenMultiplayerLobby} />}
            
            {/* Active Quest Pill - Single Compact Objective */}
            {activeQuests.length > 0 ? (
              <div className="flex flex-col gap-1.5 max-w-[270px] pointer-events-auto">
                {activeQuests.slice(0, 1).map((q) => {
                  const activeObj = q.def.objectives.find(
                    (obj: any, idx: number) => (q.progress[idx] || 0) < obj.requiredCount
                  );
                  const activeIdx = activeObj ? q.def.objectives.indexOf(activeObj) : 0;
                  const count = q.progress[activeIdx] || 0;
                  return (
                    <div
                      key={q.def.id}
                      className="rounded-xl px-3 py-2 bg-slate-950/92 border border-white/10 shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className="text-[11px] font-semibold text-white truncate">
                          {q.def.title}
                        </span>
                        {activeQuests.length > 1 && (
                          <span className="text-[9px] font-mono text-zinc-400 shrink-0">
                            +{activeQuests.length - 1}
                          </span>
                        )}
                      </div>
                      {activeObj && (
                        <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-300">
                          <span className="truncate">{activeObj.description}</span>
                          <span className="font-mono text-amber-300/90 tabular-nums shrink-0">
                            {count}/{activeObj.requiredCount}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : objectiveText ? (
              <div className="rounded-xl px-3 py-1.5 max-w-[270px] border border-white/10 flex items-center gap-2 pointer-events-auto bg-slate-950/92 shadow-lg">
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                <div className="text-[11px] text-zinc-200 truncate">
                  {objectiveText}
                </div>
              </div>
            ) : null}

            {/* Interactive Beginner Tutorial Card */}
            <HUDTutorialCard />
          </div>
        ) : (
          <button
            onClick={() => setZenHudMode(false)}
            title="Tampilkan Kembali HUD [H]"
            className="pointer-events-auto px-2.5 py-1 rounded-full bg-slate-950/85 hover:bg-slate-950/95 border border-white/10 text-[10px] font-mono text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Zen HUD · [H]
          </button>
        )}

        {/* Center: Aether Anomaly & Mythic Cataclysm Environmental Banner */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none z-10 top-1">
          {activeCataclysm && (
            <div
              className={`rounded-2xl py-2 px-4 w-76 shadow-xl text-center pointer-events-auto flex flex-col gap-1 border ${
                activeCataclysm.type === 'blood_moon'
                  ? 'border-rose-500/40 bg-slate-950/92'
                  : activeCataclysm.type === 'aether_storm'
                  ? 'border-cyan-400/40 bg-slate-950/92'
                  : 'border-amber-500/40 bg-slate-950/92'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider">
                <span className="text-amber-300 truncate">{activeCataclysm.name}</span>
                <span className="text-zinc-300 tabular-nums">
                  {activeCataclysm.remainingSeconds}s
                </span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    activeCataclysm.type === 'blood_moon'
                      ? 'bg-rose-500'
                      : activeCataclysm.type === 'aether_storm'
                      ? 'bg-cyan-400'
                      : 'bg-amber-400'
                  }`}
                  style={{
                    width: `${Math.max(
                      4,
                      Math.min(100, (activeCataclysm.remainingSeconds / activeCataclysm.durationSeconds) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          {anomalyStatus !== 'dormant' && (
            <div className="rounded-2xl py-2 px-4 w-72 border border-purple-400/35 bg-slate-950/92 text-center pointer-events-auto flex flex-col gap-1 shadow-xl">
              <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-purple-300">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>Anomaly: {anomalyStatus}</span>
                </span>
                <span className="tabular-nums">{Math.round(anomalyIntensity * 100)}%</span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-400 rounded-full transition-all duration-300"
                  style={{ width: `${anomalyIntensity * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Unified Shortcut Dock (Dock Pintasan Terpadu) & Compass Radar */}
        {!zenHudMode && (
          <div className="flex flex-col items-end gap-2 pointer-events-auto relative">
            <div className="flex items-center gap-1 p-1 rounded-full bg-slate-950/92 border border-white/10 shadow-lg">
              {autoSaveState !== 'idle' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-mono text-emerald-300 tabular-nums">
                  {autoSaveState === 'saving' ? 'Menyimpan...' : 'Tersimpan ✓'}
                </span>
              )}

              {onOpenCharacter && (
                <button
                  onClick={onOpenCharacter}
                  title="Progresi Karakter, Skill Tree, Mastery & Blueprint [K]"
                  className="px-2.5 py-1 rounded-full hover:bg-amber-500/15 text-[11px] font-medium text-amber-200 hover:text-amber-100 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>Karakter</span>
                  <kbd className="text-[9px] font-mono text-amber-400">K</kbd>
                  {unspentProgPoints > 0 && (
                    <span className="ml-0.5 px-1 py-0.2 rounded bg-amber-400 text-slate-950 text-[9px] font-mono font-bold tabular-nums">
                      +{unspentProgPoints}
                    </span>
                  )}
                </button>
              )}

              {onToggleDebugMap && (
                <button
                  onClick={onToggleDebugMap}
                  title="Peta Dunia & Fast Travel Prasasti [M]"
                  className="px-2.5 py-1 rounded-full hover:bg-white/10 text-[11px] font-medium text-zinc-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
                >
                  <span>Peta</span>
                  <kbd className="text-[9px] font-mono text-zinc-400">M</kbd>
                </button>
              )}

              <button
                onClick={() => {
                  setMahakaryaInitialTab('SAMUDRA_KERETA');
                  setShowMahakaryaModal(prev => !prev);
                }}
                title="Pusat Mahakarya Nusantara: Kapal Selam, Kereta Uap, Studio Gamelan, Khodam & Busana [N]"
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                  showMahakaryaModal
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40'
                    : 'hover:bg-amber-500/15 text-amber-200 hover:text-amber-100'
                }`}
              >
                <span>Mahakarya</span>
                <kbd className="text-[9px] font-mono text-amber-400">N</kbd>
              </button>

              {/* Unified Quick Dock Drawer Toggle */}
              <button
                onClick={() => setShowQuickTools(prev => !prev)}
                title="Dock Pintasan Terpadu: Jurnal [J], Mode Foto 3D [P], Mode Zen [H], Performa & Uji Boss"
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  showQuickTools || isLockOnActive || settings.graphics.turboFpsMode || showProfiler || mahakaryaV48?.photoModeActive
                    ? 'bg-sky-500/20 text-sky-300'
                    : 'hover:bg-white/10 text-zinc-300 hover:text-white'
                }`}
              >
                <span>Pintasan</span>
                <span className="text-[9px] opacity-75">{showQuickTools ? '▴' : '▾'}</span>
              </button>

              <button 
                onClick={onOpenPause}
                title="Menu Utama [ESC]"
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-white transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Menu</span>
              </button>
            </div>

            {/* Collapsible Unified Quick Dock Popover */}
            {showQuickTools && (
              <div className="w-64 rounded-2xl bg-slate-950/96 border border-white/15 shadow-2xl p-2 flex flex-col gap-1 text-[11px] z-30">
                <div className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-amber-300">
                  Pintasan Utama & Imersi
                </div>

                {onOpenJournal && (
                  <button
                    onClick={() => {
                      onOpenJournal();
                      setShowQuickTools(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-zinc-200 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <span>Jurnal, Quest & Lore</span>
                    <kbd className="text-[9px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded">J</kbd>
                  </button>
                )}

                <button
                  onClick={() => {
                    const rt = (window as any).__voxelRuntime;
                    if (rt && rt.player && rt.camera) {
                      const active = MahakaryaNusantaraSystem.togglePhotoMode(
                        rt.player,
                        rt.camera,
                        rt.audio
                      );
                      setMahakaryaInitialTab('BUSANA_FOTO');
                      setShowMahakaryaModal(active);
                    }
                    setShowQuickTools(false);
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    mahakaryaV48?.photoModeActive
                      ? 'bg-sky-500/20 text-sky-200 border border-sky-400/30'
                      : 'hover:bg-white/10 text-sky-300'
                  }`}
                >
                  <span>Mode Foto Sinematik 3D</span>
                  <kbd className="text-[9px] font-mono text-sky-300 bg-white/5 px-1.5 py-0.5 rounded">P</kbd>
                </button>

                <button
                  onClick={() => {
                    setZenHudMode(true);
                    setShowQuickTools(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl hover:bg-white/10 text-zinc-200 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Mode Layar Bersih (Zen HUD)</span>
                  <kbd className="text-[9px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded">H</kbd>
                </button>

                <button
                  onClick={() => {
                    const rt = (window as any).__voxelRuntime;
                    if (rt?.persistenceSystem) {
                      rt.persistenceSystem.saveGame();
                    }
                    setShowQuickTools(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl hover:bg-emerald-500/15 text-emerald-300 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Simpan Dunia Cepat (Auto-Save)</span>
                  <kbd className="text-[9px] font-mono text-emerald-300 bg-white/5 px-1.5 py-0.5 rounded">F5</kbd>
                </button>

                <div className="h-px bg-white/10 my-1" />
                <div className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-zinc-400">
                  Kamera & Optimasi 60 FPS
                </div>
                <button
                  onClick={() => {
                    const rt = (window as any).__voxelRuntime;
                    if (rt) rt.toggleTargetLockOn();
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    isLockOnActive
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-400/30'
                      : 'hover:bg-white/5 text-zinc-200'
                  }`}
                >
                  <span>Target Lock-On</span>
                  <kbd className="text-[9px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded">Q</kbd>
                </button>

                <button
                  onClick={() => {
                    const enabled = SettingsManager.toggleTurboFpsMode();
                    NotificationManager.push({
                      title: enabled ? 'Mode Turbo 60 FPS Aktif' : 'Mode Visual Standar Aktif',
                      message: enabled
                        ? 'CAS Sharpening +36% & Dynamic Resolution menjaga 60 FPS.'
                        : 'Kualitas bayangan & jarak pandang standar aktif.',
                      priority: 'HIGH',
                      colorTheme: enabled ? 'emerald' : 'sky',
                      durationMs: 2800,
                    });
                  }}
                  className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    settings.graphics.turboFpsMode
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                      : 'hover:bg-white/5 text-zinc-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Turbo 60 FPS</span>
                  </span>
                  <kbd className="text-[9px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded">F4</kbd>
                </button>

                <button
                  onClick={() => setShowProfiler(prev => !prev)}
                  className={`w-full px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                    showProfiler
                      ? 'bg-sky-500/20 text-sky-200 border border-sky-400/30'
                      : 'hover:bg-white/5 text-zinc-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-sky-400" />
                    <span>Statistik Mesin</span>
                  </span>
                  <kbd className="text-[9px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded">F3</kbd>
                </button>

                <div className="h-px bg-white/10 my-1" />
                <div className="px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider text-zinc-400">
                  Eksplorasi & Uji Boss
                </div>

                <button
                  onClick={() => {
                    const rt = (window as any).__voxelRuntime;
                    if (rt && rt.world && rt.entities && rt.player) {
                      NusantaraSanctumSilatSubakSystem.excavateUndergroundCandiSanctum(
                        rt.world,
                        rt.entities,
                        rt.player,
                        rt.audio,
                        rt.particles,
                        rt.stats,
                        (itemId, count) => rt.addItemToInventory(itemId, count)
                      );
                    }
                    setShowQuickTools(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl hover:bg-emerald-500/15 text-emerald-300 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Candi & Buto Ijo 3D</span>
                  <span className="text-[9px] font-mono opacity-75">Spawn</span>
                </button>

                <button
                  onClick={() => {
                    const rt = (window as any).__voxelRuntime;
                    if (rt) {
                      rt.entities.spawnBoss(
                        'batara_kala_colossus',
                        [rt.player.position.x + 8, rt.player.position.y, rt.player.position.z + 8],
                        rt.world
                      );
                    }
                    setShowQuickTools(false);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-xl hover:bg-amber-500/15 text-amber-300 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span>Boss Batara Kala</span>
                  <span className="text-[9px] font-mono opacity-75">Colossus</span>
                </button>
              </div>
            )}

            {/* Mini-Radar Widget with Compass & Waypoint Tracker */}
            <MiniRadar onOpenMap={onToggleDebugMap} />
          </div>
        )}
      </div>

      {/* Engine Profiler Overlay [F3] */}
      {showProfiler && <HUDProfilerOverlay onClose={() => setShowProfiler(false)} />}

      {/* Center Crosshair & Combat Hitmarkers */}
      <div id="hud-crosshair-center" className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
        
        {/* Bow Draw Reticle */}
        <div id="hud-bow-reticle" style={{ display: 'none' }} className="relative flex items-center justify-center pointer-events-none mb-1">
          <div 
            id="hud-bow-circle"
            className="w-9 h-9 rounded-full border border-white/60 transition-all duration-75 flex items-center justify-center scale-110"
          >
            <div className="w-1 h-1 rounded-full bg-white/90" />
          </div>
        </div>

        {/* Target Lock-On Aiming Reticle Brackets */}
        {isLockOnActive && (
          <div className="absolute w-14 h-14 pointer-events-none flex items-center justify-center">
            <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-amber-400/90" />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t border-r border-amber-400/90" />
            <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b border-l border-amber-400/90" />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-amber-400/90" />
          </div>
        )}

        {/* Minimalist Precision Crosshair */}
        <div className={`w-5 h-5 relative flex items-center justify-center transition-transform duration-100 ${targetHit ? 'scale-110' : ''}`}>
          <div className={`w-1.5 h-1.5 rounded-full transition-colors shadow-[0_0_4px_rgba(0,0,0,0.85)] ${targetHit ? 'bg-sky-400' : 'bg-white/90'}`} />
          <div className={`absolute w-2 h-[1px] -left-2.5 rounded-full transition-colors ${targetHit ? 'bg-sky-400' : 'bg-white/55'}`} />
          <div className={`absolute w-2 h-[1px] -right-2.5 rounded-full transition-colors ${targetHit ? 'bg-sky-400' : 'bg-white/55'}`} />
          <div className={`absolute h-2 w-[1px] -top-2.5 rounded-full transition-colors ${targetHit ? 'bg-sky-400' : 'bg-white/55'}`} />
          <div className={`absolute h-2 w-[1px] -bottom-2.5 rounded-full transition-colors ${targetHit ? 'bg-sky-400' : 'bg-white/55'}`} />
          
          {/* Hitmarker Flash */}
          {hitmarker !== 'none' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none scale-125">
              <div className={`w-3.5 h-[1.5px] transform rotate-45 ${
                hitmarker === 'crit' ? 'bg-amber-400' : hitmarker === 'blocked' ? 'bg-sky-400' : 'bg-white'
              }`} />
              <div className={`w-3.5 h-[1.5px] transform -rotate-45 ${
                hitmarker === 'crit' ? 'bg-amber-400' : hitmarker === 'blocked' ? 'bg-sky-400' : 'bg-white'
              }`} />
            </div>
          )}

          {/* Circular Mining Progress Arc */}
          <svg className="absolute w-7 h-7 -top-1 -left-1 transform -rotate-90" style={{ display: 'none' }} id="crosshair-break-svg">
            <circle cx="14" cy="14" r="10" stroke="rgba(255,255,255,0.18)" strokeWidth="2" fill="none" />
            <circle
              id="crosshair-break-circle"
              cx="14"
              cy="14"
              r="10"
              stroke="#38bdf8"
              strokeWidth="2"
              fill="none"
              strokeDasharray="62.8"
              strokeDashoffset={62.8}
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* 3-Stage Keris & Melee Combo Chain Indicator */}
        {comboBanner && (
          <div
            className={`mt-4 px-2.5 py-0.5 rounded-full border font-mono text-[10px] font-bold tracking-wider uppercase shadow-md ${
              comboBanner.step === 2 || comboBanner.isCrit
                ? 'bg-amber-500/25 border-amber-400/70 text-amber-200'
                : comboBanner.step === 1
                ? 'bg-sky-500/20 border-sky-400/60 text-sky-200'
                : 'bg-slate-950/85 border-white/20 text-zinc-200'
            }`}
          >
            ⚔️ {comboBanner.label} {comboBanner.isCrit ? '· KRITIKAL!' : ''}
          </div>
        )}

        {/* Interactive Fishing Tension & Reel Progress HUD */}
        {fishingHud.state !== 'IDLE' && (
          <div className="mt-8 voxel-panel px-4 py-2.5 w-72 flex flex-col gap-2 animate-fade-in shadow-2xl border border-sky-400/50 bg-slate-950/90">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🎣</span>
                <span
                  className={`text-[11px] font-mono font-extrabold uppercase tracking-wider ${
                    fishingHud.state === 'BITE'
                      ? 'text-amber-300 animate-pulse'
                      : fishingHud.state === 'REELING'
                      ? 'text-emerald-300'
                      : 'text-sky-300'
                  }`}
                >
                  {fishingHud.state === 'BITE'
                    ? 'IKAN MENYAMBAR! KLIK KANAN!'
                    : fishingHud.state === 'REELING'
                    ? 'TARIK SENAR SECARA BERIRAMA'
                    : 'MENUNGGU SAMBARAN IKAN...'}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-zinc-300">
                {fishingHud.progress}%
              </span>
            </div>

            {/* Reel Progress Track */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                <span>TARIKAN TANGKAPAN</span>
                <span className="text-emerald-300 font-bold">{fishingHud.progress}%</span>
              </div>
              <div className="w-full h-2 bg-black/80 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 transition-all duration-75"
                  style={{ width: `${Math.min(100, fishingHud.progress)}%` }}
                />
              </div>
            </div>

            {/* Line Tension Meter */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[9px] font-mono text-zinc-400">
                <span>KETEGANGAN SENAR</span>
                <span
                  className={
                    fishingHud.tension >= 78
                      ? 'text-rose-400 font-extrabold animate-pulse'
                      : fishingHud.tension >= 55
                      ? 'text-amber-300 font-bold'
                      : 'text-sky-300'
                  }
                >
                  {fishingHud.tension}%
                </span>
              </div>
              <div className="w-full h-2 bg-black/80 rounded-full overflow-hidden border border-white/10">
                <div
                  className={`h-full transition-all duration-75 ${
                    fishingHud.tension >= 78
                      ? 'bg-gradient-to-r from-amber-500 to-rose-500 animate-pulse'
                      : fishingHud.tension >= 55
                      ? 'bg-gradient-to-r from-emerald-400 to-amber-400'
                      : 'bg-gradient-to-r from-sky-500 to-emerald-400'
                  }`}
                  style={{ width: `${Math.min(100, fishingHud.tension)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Targeted / Companion Creature Status HUD Indicator */}
        {targetedCreature && fishingHud.state === 'IDLE' && (
          <div className="mt-7 voxel-panel px-3.5 py-2.5 w-72 flex flex-col gap-1.5 animate-fade-in shadow-2xl border border-emerald-500/40 bg-slate-950/88">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-white tracking-wide">
                  {targetedCreature.name}
                </span>
                <span
                  className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                    targetedCreature.isTamed
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  {targetedCreature.isMounted
                    ? 'TUNGGANGAN'
                    : targetedCreature.isTamed
                    ? `JINAK · ${targetedCreature.command}`
                    : 'SATWA LIAR'}
                </span>
              </div>
              <span className="text-[10px] font-mono text-rose-300 font-bold">
                ♥ {targetedCreature.health}/{targetedCreature.maxHealth}
              </span>
            </div>

            {/* Trust / Loyalty Progress Bar */}
            <div className="flex items-center gap-2 text-[9px] font-mono">
              <span className="text-zinc-400 shrink-0">KEPERCAYAAN</span>
              <div className="flex-1 h-1.5 bg-black/80 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-150"
                  style={{ width: `${Math.min(100, targetedCreature.trustMeter)}%` }}
                />
              </div>
              <span className="text-emerald-300 font-bold shrink-0">
                {targetedCreature.trustMeter}%
              </span>
            </div>

            {/* Contextual Action Hint */}
            <div className="text-[10px] text-sky-300 font-semibold flex items-center justify-between pt-0.5 border-t border-white/10">
              {targetedCreature.isMounted ? (
                <span>Tekan [Shift / Jongkok] untuk turun</span>
              ) : targetedCreature.isTamed ? (
                <span>
                  {targetedCreature.canMount
                    ? '[Klik Kanan] Tunggangi · [Shift+Klik Kanan] Perintah'
                    : '[Klik Kanan] Ubah Perintah (Follow/Stay/Guard)'}
                </span>
              ) : (
                <span>[Klik Kanan] Beri Pakan ({targetedCreature.preferredFoodHint})</span>
              )}
            </div>
          </div>
        )}

        {/* Contextual Interaction Prompt Box (Center Crosshair stays 100% clean) */}
        {targetBlockDef && !targetedCreature && fishingHud.state === 'IDLE' && (
          <div className="mt-6 voxel-panel px-3.5 py-1.5 flex items-center gap-2.5 animate-fade-in shadow-2xl">
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

      {/* Bottom Section: Unified Collapsible Contextual Pusaka Card, Item Banner, Vitals, and Hotbar */}
      <div id="hud-bottom-dock" className="flex flex-col items-center w-full gap-1.5 relative z-20">
        
        {/* Selected Item Banner (Fades out automatically) */}
        {activeItemBanner && (
          <div className="text-[11px] font-medium text-zinc-200 bg-slate-950/92 px-3 py-0.5 rounded-full border border-white/10 animate-fade-in">
            {activeItemBanner}
          </div>
        )}

        {/* Unified Tactical Dock: Single Collapsible Contextual Pusaka, Vehicle & Silat Strip (Docked above Vitals) */}
        {!zenHudMode &&
          (() => {
            const heldId = hotbar[activeHotbarIndex]?.itemId;
            const heldDef = heldId ? ITEM_DEFS[heldId] : null;
            const hasSpecialContext =
              !!activeVessel ||
              !!activeHologram ||
              !!activeTreasureHint ||
              !!activeAerialFlight ||
              !!activeVillageSiege ||
              heldId === 'peluit_garuda_kencana' ||
              heldId === 'layang_naga_batik' ||
              heldId === 'kentongan_siaga_desa' ||
              heldId === 'lampion_terbang_nusantara' ||
              heldId === 'kompas_candi_bawah_tanah' ||
              heldId === 'kitab_silat_nusantara' ||
              heldId === 'kincir_air_subak' ||
              heldId === 'panggung_wayang_kulit' ||
              heldId === 'kapal_selam_nanggala' ||
              heldId === 'lokomotif_uap_aether' ||
              heldId === 'gamelan_angklung_pusaka' ||
              heldId === 'mustika_khodam_pendamping' ||
              heldId === 'lontar_erupsi_vulkanik' ||
              heldId === 'kamera_sinematik_nusantara';

            const showSilatStrip =
              !!nusantaraV46 &&
              (nusantaraV46.subakWheelCount > 0 ||
                nusantaraV46.wayangActive ||
                heldDef?.category === 'weapon' ||
                heldId === 'kitab_silat_nusantara' ||
                (!!mahakaryaV48 &&
                  (mahakaryaV48.gamelanBlessingTimer > 0 ||
                    mahakaryaV48.submarineActive ||
                    mahakaryaV48.locomotiveRiding ||
                    !!mahakaryaV48.activeKhodamName)));

            if (!hasSpecialContext && !showSilatStrip) return null;

            return (
              <div className="flex flex-col items-center gap-1.5 w-full max-w-[480px] pointer-events-auto">
                {/* 1. Expandable Contextual Pusaka & Vehicle Action Row */}
                {hasSpecialContext && !pusakaCardMinimized && (
                  <div className="w-full rounded-xl bg-slate-950/95 border border-amber-400/35 px-3 py-2 shadow-xl flex flex-col gap-1.5">
                    <div className="flex items-center justify-between border-b border-white/10 pb-1">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300">
                        ✦ Aksi Pusaka & Kendaraan Kontekstual
                      </span>
                      <button
                        onClick={() => setPusakaCardMinimized(true)}
                        title="Lipat Panel Pusaka [B]"
                        className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[9px] font-mono text-zinc-300 cursor-pointer"
                      >
                        ▾ Lipat [B]
                      </button>
                    </div>

                    {/* Maritime Vessel Helm */}
                    {activeVessel && (
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <div className="flex flex-col">
                          <span className="font-bold text-cyan-300 tabular-nums">
                            {activeVessel.name} ({activeVessel.speedKnots.toFixed(1)} Knots)
                          </span>
                          <span className="font-mono text-[9px] text-zinc-400 tabular-nums">
                            Haluan {activeVessel.headingDeg}° · Kedalaman {activeVessel.seaFloorDepth}m
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            const rt = (window as any).__voxelRuntime;
                            if (rt && rt.player) {
                              MaritimeVesselSystem.engageDivingAnchor(rt.player, rt.stats, rt.world);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500 text-slate-950 font-mono font-bold text-[10px] cursor-pointer"
                        >
                          ⚓ Selam Palung
                        </button>
                      </div>
                    )}

                    {/* Vernacular Hologram Architect */}
                    {activeHologram && !activeVessel && (
                      <div className="flex items-center justify-between gap-1.5 text-[10px]">
                        <div className="flex flex-col">
                          <span className="font-bold text-sky-300">{activeHologram.name}</span>
                          <span className="font-mono text-[9px] text-zinc-400 tabular-nums">
                            {activeHologram.region} · Rotasi {activeHologram.rotationDeg}°
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const rt = (window as any).__voxelRuntime;
                              VernacularHologramSystem.cycleTemplate(rt?.audio);
                            }}
                            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-mono text-[10px] cursor-pointer"
                          >
                            Desain
                          </button>
                          <button
                            onClick={() => {
                              const rt = (window as any).__voxelRuntime;
                              VernacularHologramSystem.rotateHologram(rt?.audio);
                            }}
                            className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-sky-200 font-mono text-[10px] cursor-pointer"
                          >
                            90°
                          </button>
                          <button
                            onClick={() => {
                              const rt = (window as any).__voxelRuntime;
                              if (rt && rt.world) {
                                VernacularHologramSystem.constructActiveHologram(rt.world, rt.audio, rt.particles);
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-mono font-bold text-[10px] cursor-pointer"
                          >
                            Bangun
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Treasure Compass */}
                    {activeTreasureHint && !activeVessel && !activeHologram && (
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <div className="flex flex-col">
                          <span className="font-bold text-amber-300">{activeTreasureHint.mapName}</span>
                          <span className="font-mono text-[9px] text-zinc-300 tabular-nums">
                            Arah {activeTreasureHint.bearing} · Jarak {Math.round(activeTreasureHint.distance)}m
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              const rt = (window as any).__voxelRuntime;
                              if (rt && rt.world && rt.player) {
                                const fwd = rt.player.getForwardVector();
                                const dx = Math.floor(rt.player.position.x + fwd.x * 3.0);
                                const dz = Math.floor(rt.player.position.z + fwd.z * 3.0);
                                const dy = rt.world.getSpawnHeight(dx, dz);
                                rt.world.setBlock(dx, dy, dz, 11);
                                rt.addItemToInventory('coastal_pearl', 2);
                                rt.addItemToInventory('starfall_ore', 3);
                                rt.audio?.playAncientGong();
                              }
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-mono font-bold text-[10px] cursor-pointer"
                          >
                            ⛏️ Gali Harta
                          </button>
                          <button
                            onClick={() => {
                              const rt = (window as any).__voxelRuntime;
                              if (rt && rt.entities && rt.player && rt.world) {
                                const fwd = rt.player.getForwardVector();
                                const sx = Math.floor(rt.player.position.x + fwd.x * 10);
                                const sz = Math.floor(rt.player.position.z + fwd.z * 10);
                                const sy = rt.world.getSpawnHeight(sx, sz);
                                rt.entities.spawnBoss('naga_antaboga', [sx, sy, sz], rt.world);
                              }
                            }}
                            className="px-2 py-1 rounded-lg bg-rose-500/25 border border-rose-400/50 text-rose-200 font-mono font-bold text-[10px] cursor-pointer"
                          >
                            Boss Naga
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Aerial Flight (Garuda / Dragon Kite Glider) */}
                    {(activeAerialFlight || heldId === 'peluit_garuda_kencana' || heldId === 'layang_naga_batik') && (
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <div className="flex flex-col">
                          <span className="font-bold text-amber-300">
                            {activeAerialFlight?.mode === 'garuda'
                              ? 'Garuda Kencana Dirgantara 3D'
                              : activeAerialFlight?.mode === 'glider'
                              ? 'Layang-Layang Naga Batik 3D'
                              : heldId === 'layang_naga_batik'
                              ? 'Layang Naga Batik 3D'
                              : 'Garuda Kencana 3D'}
                          </span>
                          <span className="font-mono text-[9px] text-sky-300 tabular-nums">
                            {activeAerialFlight
                              ? `Ketinggian ${activeAerialFlight.altitude}m · Kecepatan ${activeAerialFlight.speed} m/s`
                              : 'Klik tombol di kanan atau Klik Kanan untuk mengudara'}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            const rt = (window as any).__voxelRuntime;
                            if (!rt || !rt.player) return;
                            if (AerialFlightAndSiegeSystem.mode !== 'none') {
                              AerialFlightAndSiegeSystem.dismount(rt.audio);
                            } else if (heldId === 'layang_naga_batik') {
                              AerialFlightAndSiegeSystem.deployDragonKiteGlider(
                                rt.player.position,
                                rt.player.yaw,
                                rt.audio,
                                rt.particles
                              );
                            } else {
                              AerialFlightAndSiegeSystem.summonAndMountGaruda(
                                rt.player.position,
                                rt.player.yaw,
                                rt.audio,
                                rt.particles
                              );
                            }
                          }}
                          className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-mono font-bold text-[10px] cursor-pointer shrink-0"
                        >
                          {activeAerialFlight ? '⏬ Mendarat' : '🦅 Terbang'}
                        </button>
                      </div>
                    )}

                    {/* Village Siege & Sky Lanterns */}
                    {(activeVillageSiege || heldId === 'kentongan_siaga_desa' || heldId === 'lampion_terbang_nusantara') && (
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <div className="flex flex-col">
                          <span className="font-bold text-white tabular-nums">
                            {activeVillageSiege?.festivalActive
                              ? `Festival Lampion (${activeVillageSiege.festivalTimer}d)`
                              : activeVillageSiege?.active
                              ? `Pertahanan Desa Gelombang ${activeVillageSiege.wave}/${activeVillageSiege.maxWaves}`
                              : 'Kentongan Siaga & Festival Lampion'}
                          </span>
                          <span className="font-mono text-[9px] text-amber-300 tabular-nums">
                            {activeVillageSiege?.active
                              ? `Integritas Balai Desa: ${activeVillageSiege.villageIntegrity}%`
                              : 'Pertahankan Balai Desa atau lepaskan 6 Lampion Terbang 3D'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              const rt = (window as any).__voxelRuntime;
                              if (!rt || !rt.player || !rt.world || !rt.entities) return;
                              AerialFlightAndSiegeSystem.triggerVillageSiege(
                                rt.world,
                                rt.entities,
                                rt.player.position,
                                rt.audio,
                                rt.particles,
                                (itemId, count) => rt.addItemToInventory(itemId, count),
                                (xp) => rt.stats?.addXP(xp)
                              );
                            }}
                            disabled={!!activeVillageSiege?.active}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 text-white font-mono font-bold text-[10px] disabled:opacity-40 cursor-pointer"
                          >
                            🥁 Siaga
                          </button>
                          <button
                            onClick={() => {
                              const rt = (window as any).__voxelRuntime;
                              if (!rt || !rt.player) return;
                              AerialFlightAndSiegeSystem.releaseSkyLanterns(
                                rt.player.position,
                                6,
                                rt.audio,
                                rt.particles,
                                rt.stats
                              );
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/25 border border-amber-400/50 text-amber-200 font-mono font-bold text-[10px] cursor-pointer"
                          >
                            🏮 Lampion
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Candi Bawah Tanah / Silat / Subak / Wayang (v4.6) */}
                    {nusantaraV46 && heldId === 'kompas_candi_bawah_tanah' && (
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-emerald-300 font-bold">
                          Ekspedisi Candi Bawah Tanah & Boss Buto Ijo 3D
                        </span>
                        <button
                          onClick={() => {
                            const rt = (window as any).__voxelRuntime;
                            if (!rt || !rt.world || !rt.entities || !rt.player) return;
                            NusantaraSanctumSilatSubakSystem.excavateUndergroundCandiSanctum(
                              rt.world,
                              rt.entities,
                              rt.player,
                              rt.audio,
                              rt.particles,
                              rt.stats,
                              (itemId, count) => rt.addItemToInventory(itemId, count)
                            );
                          }}
                          className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-mono font-bold text-[10px] cursor-pointer"
                        >
                          🏛️ Buka Candi 3D
                        </button>
                      </div>
                    )}

                    {nusantaraV46 && heldId === 'kincir_air_subak' && (
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-emerald-300 font-bold tabular-nums">
                          Kincir Subak Aktif: {nusantaraV46.subakWheelCount} · Panen: {nusantaraV46.subakTotalHarvested}
                        </span>
                        <button
                          onClick={() => {
                            const rt = (window as any).__voxelRuntime;
                            if (!rt || !rt.world || !rt.player) return;
                            NusantaraSanctumSilatSubakSystem.deploySubakWaterwheel(
                              rt.world,
                              rt.player,
                              rt.audio,
                              rt.particles
                            );
                          }}
                          className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-mono font-bold text-[10px] cursor-pointer"
                        >
                          🌾 Bangun Subak 3D
                        </button>
                      </div>
                    )}

                    {nusantaraV46 && heldId === 'panggung_wayang_kulit' && (
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-amber-300 font-bold tabular-nums">
                          {nusantaraV46.wayangActive
                            ? `${nusantaraV46.wayangLakonName} (${nusantaraV46.wayangLakonTimer}d)`
                            : 'Panggung Wayang Kulit 3D'}
                        </span>
                        <button
                          onClick={() => {
                            const rt = (window as any).__voxelRuntime;
                            if (!rt || !rt.world || !rt.player) return;
                            NusantaraSanctumSilatSubakSystem.deployWayangStageAndNightMarket(
                              rt.world,
                              rt.player,
                              rt.audio,
                              rt.particles,
                              rt.stats
                            );
                          }}
                          className="px-3 py-1 rounded-lg bg-amber-500 text-slate-950 font-mono font-bold text-[10px] cursor-pointer"
                        >
                          🎪 Dirikan Wayang 3D
                        </button>
                      </div>
                    )}

                    {/* Mahakarya Nusantara Items (Submarine, Steam Train, Gamelan, Khodam, Volcano, Photo Mode) */}
                    {(heldId === 'kapal_selam_nanggala' ||
                      heldId === 'lokomotif_uap_aether' ||
                      heldId === 'gamelan_angklung_pusaka' ||
                      heldId === 'mustika_khodam_pendamping' ||
                      heldId === 'lontar_erupsi_vulkanik' ||
                      heldId === 'kamera_sinematik_nusantara') && (
                      <div className="flex items-center justify-between gap-2 text-[10px]">
                        <span className="text-amber-200 font-bold truncate">
                          {ITEM_DEFS[heldId]?.name || heldId} — Klik Kanan untuk aktifkan di 3D
                        </span>
                        <button
                          onClick={() => {
                            if (heldId === 'gamelan_angklung_pusaka') setMahakaryaInitialTab('GAMELAN_STUDIO');
                            else if (heldId === 'mustika_khodam_pendamping' || heldId === 'lontar_erupsi_vulkanik')
                              setMahakaryaInitialTab('KHODAM_ARENA');
                            else if (heldId === 'kamera_sinematik_nusantara') setMahakaryaInitialTab('BUSANA_FOTO');
                            else setMahakaryaInitialTab('SAMUDRA_KERETA');
                            setShowMahakaryaModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-mono font-bold text-[10px] cursor-pointer shrink-0"
                        >
                          Buka Panel [N]
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Unified Compact Tactical Strip (Silat Stance, Tenaga Dalam, Blessings & Pusaka Toggle [B]) */}
                {nusantaraV46 && (
                  <div className="flex flex-wrap items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/92 border border-white/10 shadow-md text-[10px] font-mono">
                    {hasSpecialContext && pusakaCardMinimized && (
                      <button
                        onClick={() => setPusakaCardMinimized(false)}
                        title="Buka Aksi Pusaka Kontekstual [B]"
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 cursor-pointer"
                      >
                        <span>▴ Pusaka</span>
                        <kbd className="text-[8px] text-amber-300">B</kbd>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        const rt = (window as any).__voxelRuntime;
                        NusantaraSanctumSilatSubakSystem.cycleSilatStance(rt?.audio);
                      }}
                      title={`${nusantaraV46.stanceBonusText} — Klik atau tekan [V] untuk ganti Kuda-Kuda`}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-200 font-medium cursor-pointer transition-colors"
                    >
                      <span>{nusantaraV46.stanceName}</span>
                      <kbd className="text-[8px] text-zinc-400">V</kbd>
                    </button>

                    <div className="flex items-center gap-1.5">
                      <div className="w-14 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-150 ${
                            nusantaraV46.ajianReady ? 'bg-amber-400' : 'bg-sky-400'
                          }`}
                          style={{ width: `${Math.min(100, nusantaraV46.tenagaDalam)}%` }}
                        />
                      </div>
                      <span className="text-zinc-300 tabular-nums">{nusantaraV46.tenagaDalam}%</span>
                    </div>

                    <button
                      onClick={() => {
                        const rt = (window as any).__voxelRuntime;
                        if (!rt || !rt.player || !rt.stats) return;
                        if (NusantaraSanctumSilatSubakSystem.tenagaDalam >= 100) {
                          NusantaraSanctumSilatSubakSystem.unleashAjianUltimate(
                            rt.entities,
                            rt.player,
                            rt.stats,
                            rt.audio,
                            rt.particles
                          );
                        } else {
                          NusantaraSanctumSilatSubakSystem.cycleAjianUltimate(rt.audio);
                        }
                      }}
                      title="Klik atau tekan [G] untuk pilih / lepaskan Ajian Sakti Pusaka"
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-medium cursor-pointer transition-colors ${
                        nusantaraV46.ajianReady
                          ? 'bg-amber-500/25 text-amber-200 border border-amber-400/40'
                          : 'bg-white/5 hover:bg-white/10 text-zinc-300'
                      }`}
                    >
                      <span>{nusantaraV46.ajianName}</span>
                      <kbd className="text-[8px] text-zinc-400">G</kbd>
                    </button>

                    {nusantaraV46.subakWheelCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 tabular-nums">
                        Subak {nusantaraV46.subakWheelCount}x
                      </span>
                    )}

                    {nusantaraV46.wayangActive && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200 tabular-nums">
                        {nusantaraV46.wayangLakonName} ({nusantaraV46.wayangLakonTimer}d)
                      </span>
                    )}

                    {mahakaryaV48 && mahakaryaV48.gamelanBlessingTimer > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-200 tabular-nums">
                        Harmoni Gamelan ({mahakaryaV48.gamelanBlessingTimer}d)
                      </span>
                    )}

                    {mahakaryaV48 && (
                      <>
                        <span className="text-zinc-600" aria-hidden="true">·</span>
                        <button
                          onClick={() => {
                            setMahakaryaInitialTab('KHODAM_ARENA');
                            setShowMahakaryaModal(true);
                          }}
                          className="text-emerald-300 hover:text-emerald-200 cursor-pointer whitespace-nowrap tabular-nums"
                          title="Klik untuk membuka Panel Khodam, Kapal Selam, Kereta Uap & Gamelan [N]"
                        >
                          {mahakaryaV48.submarineActive
                            ? `Kapal Selam (${mahakaryaV48.submarineDepth}m)`
                            : mahakaryaV48.locomotiveRiding
                            ? 'Lokomotif Uap Aether'
                            : mahakaryaV48.activeKhodamName || 'Mahakarya [N]'}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

        {/* VoxelVerse v4.8.0: Collapsible Bottom Dock Modal for Submarine, Steam Train, 3D Gamelan, Khodam, Wardrobe & 3D Photo Mode */}
        <MahakaryaNusantaraModal
          isOpen={showMahakaryaModal}
          initialTab={mahakaryaInitialTab}
          onClose={() => setShowMahakaryaModal(false)}
        />

        <HUDVitalsBars />

        {/* Weapon Skill Widget & Hotbar (1-9) Row */}
        <div className="flex items-center gap-2 max-w-[98vw]">
          <HUDWeaponSkillWidget />

          {/* Minimalist Hotbar (1-9) — Solid Matte Obsidian for 60 FPS GPU Compositing */}
          <div className="flex items-center gap-1 p-1.5 rounded-2xl bg-slate-950/92 border border-white/10 shadow-xl pointer-events-auto overflow-x-auto">
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
                onClick={() => {
                  triggerHaptic('selection');
                  onSelectHotbar(idx);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  triggerHaptic('selection');
                  onSelectHotbar(idx);
                }}
                className={`w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl flex items-center justify-center relative transition-all duration-100 cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-sky-500/20 border border-sky-400/80 shadow-[0_0_10px_rgba(56,189,248,0.25)]'
                    : slot
                    ? 'bg-white/5 hover:bg-white/10 border border-white/10'
                    : 'bg-black/30 hover:bg-white/5 border border-white/5'
                }`}
              >
                {slot && itemDef ? (
                  <div className="flex flex-col items-center justify-center w-full h-full p-0.5 relative">
                    <div 
                      className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-md flex items-center justify-center font-bold text-[9px] text-white" 
                      style={{ backgroundColor: itemDef.iconColor }}
                    >
                      {itemDef.name.substring(0, 2).toUpperCase()}
                    </div>

                    {slot.count > 1 && (
                      <span className="absolute bottom-0.5 right-1 text-[8px] font-mono font-bold text-zinc-100 tabular-nums">
                        {slot.count}
                      </span>
                    )}

                    {hasDurability && (
                      <div className="absolute bottom-0.5 left-1 right-1 h-0.5 bg-black/80 rounded-full overflow-hidden">
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
                  <div className="w-1 h-1 rounded-full bg-white/10" />
                )}
                <span className="absolute top-0.5 left-1 text-[7px] font-mono text-zinc-500">{idx + 1}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  </div>
);
};
