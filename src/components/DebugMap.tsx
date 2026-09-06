// Development Debug Visualization Map Overlay
// Renders real-time 2D procedural biome grid, elevation contour, Nusantara Cultural Regions, player position & structure regions
import React, { useMemo, useState } from 'react';
import { VoxelWorld } from '../engine/world/VoxelWorld';

interface DebugMapProps {
  world: VoxelWorld;
  playerPos: [number, number, number];
  onClose: () => void;
}

export const DebugMap: React.FC<DebugMapProps> = ({ world, playerPos, onClose }) => {
  const mapRadius = 180; // 360x360 block view
  const step = 8;        // Resolution
  const [viewMode, setViewMode] = useState<'regions' | 'biomes'>('regions');
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  const mapData = useMemo(() => {
    return world.getDebugMapInfo(playerPos[0], playerPos[2], mapRadius, step);
  }, [world, playerPos[0], playerPos[2]]);

  const currentRegion = useMemo(() => {
    return world.regionManager ? world.regionManager.getDominantRegion(playerPos[0], playerPos[2]) : null;
  }, [world, playerPos[0], playerPos[2]]);

  const currentBlend = useMemo(() => {
    return world.regionManager ? world.regionManager.getRegionBlend(playerPos[0], playerPos[2]) : [];
  }, [world, playerPos[0], playerPos[2]]);

  const getBiomeColor = (biomeName: string, isWater: boolean, height: number): string => {
    if (isWater) return '#0284c7'; // Sea water
    if (biomeName.includes('Alpine') || height > 75) return '#f8fafc'; // Snow
    if (biomeName.includes('Volcanic') || biomeName.includes('Pyroclast')) return '#451a03'; // Basalt/Volcanic
    if (biomeName.includes('Desert') || biomeName.includes('Dune')) return '#fde047'; // Sand
    if (biomeName.includes('Badlands')) return '#ea580c'; // Clay
    if (biomeName.includes('Forest') || biomeName.includes('Canopy')) return '#15803d'; // Forest
    if (biomeName.includes('Swamp') || biomeName.includes('Wetlands')) return '#14532d'; // Swamp
    if (biomeName.includes('Taiga') || biomeName.includes('Timberlands')) return '#0f766e'; // Taiga
    if (biomeName.includes('Crystal') || biomeName.includes('Aetherial')) return '#a855f7'; // Crystal
    return '#84cc16'; // Meadow/Plains
  };

  const culturalRegionsList = [
    { id: 'minang', name: 'Tanah Minang', color: '#10b981', desc: 'Pegunungan, Sawah Bertingkat, Rumah Gadang' },
    { id: 'jawa', name: 'Tanah Jawa', color: '#eab308', desc: 'Dataran Subur, Hutan Jati, Candi Batu & Joglo' },
    { id: 'bali', name: 'Bali Highlands', color: '#f97316', desc: 'Volcanic Terraces, Saluran Subak, Pura & Gapura' },
    { id: 'borneo', name: 'Borneo Riverlands', color: '#059669', desc: 'Hutan Tropis Kuno, Meander Sungai, Rumah Betang' },
    { id: 'toraja', name: 'Toraja Highlands', color: '#8b5cf6', desc: 'Tebing Karst Curam, Lembah Mistis, Tongkonan' },
    { id: 'papua', name: 'Papuan Highlands', color: '#06b6d4', desc: 'Puncak Bersalju, Lembah Kabut Dingin, Desa Honai' },
    { id: 'nusa', name: 'Eastern Archipelago', color: '#14b8a6', desc: 'Savana Bukit Bergelombang, Pantai Karang, Bale Tani' },
  ];

  return (
    <div id="debug-map-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none animate-fade-in">
      <div className="w-full max-w-4xl bg-[#0d1117] rounded-3xl border border-white/20 p-6 shadow-2xl space-y-4 text-white flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Map Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse"></div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Nusantara Cultural World Map</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                  v1.0 Cultural Regions
                </span>
              </div>
              <p className="text-[10px] font-mono text-white/50">
                Seed: {world.seed} • Pos: ({Math.round(playerPos[0])}, {Math.round(playerPos[1])}, {Math.round(playerPos[2])})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switch */}
            <div className="flex rounded-xl bg-white/10 p-0.5 border border-white/10 text-xs font-mono">
              <button
                onClick={() => setViewMode('regions')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  viewMode === 'regions' ? 'bg-emerald-500 text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Cultural Regions
              </button>
              <button
                onClick={() => setViewMode('biomes')}
                className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                  viewMode === 'biomes' ? 'bg-sky-500 text-black shadow' : 'text-zinc-400 hover:text-white'
                }`}
              >
                Biome Terrain
              </button>
            </div>

            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all"
            >
              ✕ Close [M]
            </button>
          </div>
        </div>

        {/* Current Location Cultural Banner */}
        {currentRegion && (
          <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/20 border border-emerald-500/30 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-10 rounded-md shadow-md"
                style={{ backgroundColor: currentRegion.colorHex || '#10b981' }}
              />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-emerald-400 font-bold font-mono">
                  Current Territory
                </div>
                <div className="text-base font-bold text-white flex items-center gap-2">
                  <span>{currentRegion.displayName}</span>
                  <span className="text-xs font-normal text-zinc-400">({currentRegion.id})</span>
                </div>
                <div className="text-[11px] text-zinc-300">
                  {currentRegion.description}
                </div>
              </div>
            </div>

            {/* Region Blend Status */}
            <div className="text-right font-mono text-[11px] hidden sm:block">
              <div className="text-zinc-400">Dominance Blend:</div>
              <div className="text-emerald-300 font-bold">
                {currentBlend.map((b) => `${b.region.displayName}: ${Math.round(b.weight * 100)}%`).join(' | ')}
              </div>
            </div>
          </div>
        )}

        {/* 2D Grid Canvas Render */}
        <div className="relative w-full aspect-[4/3] max-h-[460px] bg-black/70 rounded-2xl border border-white/15 overflow-hidden flex items-center justify-center">
          <div className="grid grid-cols-46 gap-[1px] p-2 w-full h-full">
            {mapData.map((pt, idx) => {
              const color = viewMode === 'regions' 
                ? (pt.isWater ? '#0369a1' : pt.regionColor)
                : getBiomeColor(pt.biomeName, pt.isWater, pt.height);

              return (
                <div
                  key={`map-pt-${pt.x}-${pt.z}-${idx}`}
                  style={{ backgroundColor: color }}
                  onMouseEnter={() => setHoveredPoint(pt)}
                  className="w-full h-full rounded-[1px] opacity-90 hover:opacity-100 hover:scale-125 transition-transform cursor-crosshair"
                />
              );
            })}
          </div>

          {/* Player Position Marker Indicator */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-5 h-5 rounded-full bg-rose-500 border-2 border-white shadow-[0_0_15px_rgba(244,63,94,1)] animate-ping" />
            <div className="w-3 h-3 rounded-full bg-rose-500 border-2 border-white shadow-md absolute" />
          </div>

          {/* Hover Inspector Tooltip */}
          {hoveredPoint && (
            <div className="absolute bottom-3 left-3 bg-black/90 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2 text-[11px] font-mono text-zinc-200 pointer-events-none shadow-xl flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: hoveredPoint.regionColor }} />
              <div>
                <span className="text-white font-bold">{hoveredPoint.regionName}</span> • Biome: <span className="text-sky-300">{hoveredPoint.biomeName}</span> • Elev: <span className="text-amber-300 font-bold">{hoveredPoint.height}m</span> • ({Math.round(hoveredPoint.x)}, {Math.round(hoveredPoint.z)})
              </div>
            </div>
          )}
        </div>

        {/* Cultural Region Cards / Legend */}
        {viewMode === 'regions' ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-[10px] font-mono pt-1">
            {culturalRegionsList.map((cr) => (
              <div
                key={cr.id}
                className="bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col justify-between hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cr.color }} />
                  <span className="font-bold text-white truncate">{cr.name}</span>
                </div>
                <div className="text-[9px] text-zinc-400 line-clamp-2">
                  {cr.desc}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-[10px] font-mono text-white/70 pt-1">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[#0284c7]" /> Ocean / Sea</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[#84cc16]" /> Plains / Meadow</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[#15803d]" /> Forest / Jungle</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[#fde047]" /> Desert Dunes</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[#0f766e]" /> Boreal Taiga</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[#f8fafc]" /> Alpine Peaks</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[#a855f7]" /> Crystal Realm</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[#451a03]" /> Volcanic Crags</div>
          </div>
        )}
      </div>
    </div>
  );
};
