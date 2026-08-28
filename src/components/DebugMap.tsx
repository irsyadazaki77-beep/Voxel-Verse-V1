// Development Debug Visualization Map Overlay
// Renders real-time 2D procedural biome grid, elevation contour, player position & structure regions
import React, { useMemo } from 'react';
import { VoxelWorld } from '../engine/world/VoxelWorld';

interface DebugMapProps {
  world: VoxelWorld;
  playerPos: [number, number, number];
  onClose: () => void;
}

export const DebugMap: React.FC<DebugMapProps> = ({ world, playerPos, onClose }) => {
  const mapRadius = 160; // 320x320 block view
  const step = 8;        // Resolution

  const mapData = useMemo(() => {
    return world.getDebugMapInfo(playerPos[0], playerPos[2], mapRadius, step);
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

  return (
    <div id="debug-map-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6 select-none animate-fade-in">
      <div className="w-full max-w-2xl bg-[#0e1015] rounded-3xl border border-white/20 p-6 shadow-2xl space-y-4 text-white flex flex-col">
        {/* Map Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.8)]"></div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">Procedural World Region Map</h3>
              <p className="text-[10px] font-mono text-white/50">Seed: {world.seed} • Preset: {world.preset.toUpperCase()}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all"
          >
            ✕ Close Map [M]
          </button>
        </div>

        {/* 2D Grid Canvas Render */}
        <div className="relative w-full aspect-square max-h-[420px] bg-black/60 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center">
          <div className="grid grid-cols-41 gap-0.5 p-2 w-full h-full">
            {mapData.map((pt, idx) => {
              const color = getBiomeColor(pt.biomeName, pt.isWater, pt.height);
              return (
                <div
                  key={idx}
                  style={{ backgroundColor: color }}
                  className="w-full h-full rounded-[1px] opacity-85 hover:opacity-100 transition-opacity"
                  title={`Pos: (${Math.floor(pt.x)}, ${Math.floor(pt.z)})\nBiome: ${pt.biomeName}\nElevation Y: ${pt.height}`}
                />
              );
            })}
          </div>

          {/* Player Position Marker Indicator */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-4 h-4 rounded-full bg-rose-500 border-2 border-white shadow-[0_0_12px_rgba(244,63,94,0.9)] animate-ping" />
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white shadow-md absolute" />
          </div>
        </div>

        {/* Map Legend */}
        <div className="grid grid-cols-4 gap-2 text-[10px] font-mono text-white/70 pt-1">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[#0284c7]" /> Ocean / Sea</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[#84cc16]" /> Plains / Meadow</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[#15803d]" /> Forest / Jungle</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[#fde047]" /> Desert Dunes</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[#0f766e]" /> Boreal Taiga</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[#f8fafc]" /> Alpine Peaks</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[#a855f7]" /> Crystal Realm</div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-[#451a03]" /> Volcanic Crags</div>
        </div>
      </div>
    </div>
  );
};
