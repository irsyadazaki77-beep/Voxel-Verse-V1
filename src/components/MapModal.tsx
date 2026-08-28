// Interactive World Map Modal with Fog of War, Landmark Markers & Waypoints
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { MapManager } from '../engine/map/MapManager';
import { VoxelWorld } from '../engine/world/VoxelWorld';
import { Waypoint } from '../types';
import { 
  X, 
  Plus, 
  Trash2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  MapPin, 
  Compass, 
  Eye, 
  Navigation
} from 'lucide-react';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  world: VoxelWorld | null;
  playerPos: [number, number, number];
  playerYaw: number;
}

export const MapModal: React.FC<MapModalProps> = ({
  isOpen,
  onClose,
  world,
  playerPos,
  playerYaw,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [showAddWpModal, setShowAddWpModal] = useState<boolean>(false);
  const [newWpName, setNewWpName] = useState<string>('');
  const [newWpColor, setNewWpColor] = useState<string>('#38bdf8');

  // Load waypoints and subscribe to updates
  useEffect(() => {
    if (!isOpen) return;
    setWaypoints(MapManager.getWaypoints());
    const unsub = MapManager.onMapUpdate(() => {
      setWaypoints(MapManager.getWaypoints());
    });
    return () => unsub();
  }, [isOpen]);

  // Center on player
  const centerOnPlayer = useCallback(() => {
    setPanOffset({ x: 0, y: 0 });
    setZoom(1.0);
  }, []);

  // Render Map Canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current || !world) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear background (unexplored void)
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width / 2 + panOffset.x, height / 2 + panOffset.y);
    ctx.scale(zoom, zoom);

    const step = 8;
    const radius = 240;
    const pX = Math.round(playerPos[0]);
    const pZ = Math.round(playerPos[2]);

    // Render terrain grid
    for (let x = pX - radius; x <= pX + radius; x += step) {
      for (let z = pZ - radius; z <= pZ + radius; z += step) {
        const cx = Math.floor(x / 16);
        const cz = Math.floor(z / 16);
        const isExplored = MapManager.isChunkExplored(cx, cz);

        if (isExplored) {
          const biome = world.biomeManager.getBiome(x, z);
          const elev = world.getSpawnHeight(x, z);

          // Biome color
          let color = '#22c55e'; // default grass
          if (biome.id === 'snow_peaks') color = '#e2e8f0';
          else if (biome.id === 'desert') color = '#fbbf24';
          else if (biome.id === 'taiga') color = '#15803d';
          else if (biome.id === 'swamp') color = '#4d7c0f';
          else if (biome.id === 'crystal_grove') color = '#38bdf8';
          else if (biome.id === 'corrupted_void') color = '#7e22ce';

          // Water tint
          if (elev <= 30) {
            color = '#0284c7';
          }

          ctx.fillStyle = color;
          ctx.fillRect((x - pX) * 2, (z - pZ) * 2, step * 2, step * 2);
        } else {
          // Fog of War dark grid tile
          ctx.fillStyle = '#18181b';
          ctx.fillRect((x - pX) * 2, (z - pZ) * 2, step * 2, step * 2);
        }
      }
    }

    // Render Landmarks
    const landmarks = MapManager.getLandmarks();
    landmarks.forEach(lm => {
      const lx = (lm.pos[0] - pX) * 2;
      const lz = (lm.pos[2] - pZ) * 2;

      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(lx, lz, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(lm.name, lx, lz - 8);
    });

    // Render Custom Waypoints
    waypoints.forEach(wp => {
      const wx = (wp.pos[0] - pX) * 2;
      const wz = (wp.pos[2] - pZ) * 2;

      ctx.fillStyle = wp.color;
      ctx.beginPath();
      ctx.arc(wx, wz, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.font = 'bold 9px sans-serif';
      ctx.fillStyle = wp.color;
      ctx.textAlign = 'center';
      ctx.fillText(wp.name, wx, wz + 12);
    });

    // Render Player Icon & Heading Cone
    ctx.save();
    ctx.translate(0, 0);
    ctx.rotate(playerYaw);

    // Heading cone
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 24, -Math.PI / 4, Math.PI / 4);
    ctx.fill();

    // Player marker arrow
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(-5, -6);
    ctx.lineTo(0, -3);
    ctx.lineTo(5, -6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();

    ctx.restore();
  }, [isOpen, world, playerPos, playerYaw, zoom, panOffset, waypoints]);

  if (!isOpen) return null;

  return (
    <div id="map_modal_overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none animate-in fade-in duration-200">
      <div id="map_modal_container" className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Navigation className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-wide text-zinc-100 flex items-center gap-2">
                Cartographic World Map & Waypoints
              </h2>
              <p className="text-xs text-zinc-400">Real-time fog-of-war, landmark coordinates & custom beacons</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn_add_waypoint"
              onClick={() => setShowAddWpModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Waypoint</span>
            </button>
            <button
              id="btn_close_map"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Map Canvas Stage */}
        <div className="relative flex-1 bg-zinc-950 overflow-hidden flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={720}
            height={520}
            onMouseDown={(e) => {
              setIsDragging(true);
              setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
            }}
            onMouseMove={(e) => {
              if (isDragging) {
                setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
              }
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            className="w-full h-full cursor-grab active:cursor-grabbing"
          />

          {/* Floating Map Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2 bg-zinc-900/90 border border-zinc-800 p-1.5 rounded-xl shadow-lg">
            <button
              onClick={() => setZoom(prev => Math.min(2.5, prev + 0.25))}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={centerOnPlayer}
              className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white"
              title="Center on Player"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Coordinates HUD Tag */}
          <div className="absolute bottom-4 left-4 bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-lg text-xs font-mono text-zinc-300">
            Player Pos: <span className="text-cyan-400 font-bold">[{Math.round(playerPos[0])}, {Math.round(playerPos[1])}, {Math.round(playerPos[2])}]</span>
          </div>
        </div>

        {/* Waypoint Tray Footer */}
        <div className="border-t border-zinc-800 bg-zinc-950/80 px-6 py-3 flex items-center justify-between overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active Beacons:</span>
            {waypoints.map(wp => (
              <div
                key={wp.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-xs"
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: wp.color }} />
                <span className="text-zinc-200">{wp.name}</span>
                <span className="font-mono text-zinc-500 text-[10px]">({Math.round(wp.pos[0])},{Math.round(wp.pos[2])})</span>
                {wp.id !== 'wp_0' && (
                  <button
                    onClick={() => MapManager.removeWaypoint(wp.id)}
                    className="text-zinc-500 hover:text-rose-400 ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Create Waypoint Modal Popup */}
        {showAddWpModal && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-700 p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-4">
              <h3 className="font-bold text-sm text-zinc-100">Create New Waypoint Beacon</h3>
              
              <div>
                <label className="text-xs text-zinc-400">Waypoint Name</label>
                <input
                  type="text"
                  value={newWpName}
                  onChange={(e) => setNewWpName(e.target.value)}
                  placeholder="e.g. Iron Mine Base"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400">Beacon Color</label>
                <div className="flex gap-2 mt-1">
                  {['#38bdf8', '#f59e0b', '#10b981', '#ec4899', '#a855f7', '#f43f5e'].map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setNewWpColor(col)}
                      className={`w-6 h-6 rounded-full border-2 ${newWpColor === col ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddWpModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (newWpName.trim()) {
                      MapManager.addWaypoint(newWpName.trim(), [playerPos[0], playerPos[1], playerPos[2]], newWpColor);
                      setNewWpName('');
                      setShowAddWpModal(false);
                    }
                  }}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white"
                >
                  Place Beacon
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
