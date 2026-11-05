import React, { useState, useEffect, useRef } from 'react';
import { TelemetryStore } from '../engine/ui/TelemetryStore';
import { WaypointManager, WaypointMarker } from '../engine/navigation/WaypointManager';
import { Plus } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface MiniRadarProps {
  onOpenMap?: () => void;
}

export const MiniRadar: React.FC<MiniRadarProps> = ({ onOpenMap }) => {
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 80, 0]);
  const [playerYaw, setPlayerYaw] = useState<number>(0);
  const [waypoints, setWaypoints] = useState<WaypointMarker[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    WaypointManager.initialize();
    const unsubWaypoints = WaypointManager.subscribe(setWaypoints);

    const unsubTelemetry = TelemetryStore.subscribe((stats) => {
      setPlayerPos(stats.playerPos);
      setPlayerYaw(stats.playerYaw);
    });

    return () => {
      unsubWaypoints();
      unsubTelemetry();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const radius = width / 2 - 2;
    const cx = width / 2;
    const cy = height / 2;

    ctx.clearRect(0, 0, width, height);

    // Minimalist dark obsidian circular disc
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(9, 13, 22, 0.84)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.stroke();

    // Single subtle inner ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.52, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.stroke();

    // Subtle cross axes
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius + 12);
    ctx.lineTo(cx, cy + radius - 12);
    ctx.moveTo(cx - radius + 12, cy);
    ctx.lineTo(cx + radius - 12, cy);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.stroke();

    // Rotating Cardinal letters based on Player Yaw
    const cardinals = [
      { text: 'N', angle: -Math.PI / 2 },
      { text: 'E', angle: 0 },
      { text: 'S', angle: Math.PI / 2 },
      { text: 'W', angle: Math.PI },
    ];

    ctx.font = '600 8px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    cardinals.forEach(({ text, angle }) => {
      const relAngle = angle - playerYaw - Math.PI / 2;
      const tx = cx + Math.cos(relAngle) * (radius - 7);
      const ty = cy + Math.sin(relAngle) * (radius - 7);

      ctx.fillStyle = text === 'N' ? '#38bdf8' : 'rgba(148, 163, 184, 0.65)';
      ctx.fillText(text, tx, ty);
    });

    const radarRange = 180;

    // Draw Waypoints
    waypoints.forEach((wp) => {
      const dx = wp.pos[0] - playerPos[0];
      const dz = wp.pos[2] - playerPos[2];
      const dist = Math.hypot(dx, dz);

      const worldAngle = Math.atan2(dz, dx);
      const relAngle = worldAngle - playerYaw - Math.PI / 2;

      const clampedDist = Math.min(dist, radarRange);
      const r = (clampedDist / radarRange) * (radius - 13);

      const px = cx + Math.cos(relAngle) * r;
      const py = cy + Math.sin(relAngle) * r;

      ctx.beginPath();
      ctx.arc(px, py, dist > radarRange ? 2.2 : 3, 0, Math.PI * 2);
      ctx.fillStyle = wp.color || '#38bdf8';
      ctx.fill();
    });

    // Center Player Pointer (Minimalist crisp arrow)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, -4.5);
    ctx.lineTo(3.2, 3.8);
    ctx.lineTo(0, 2);
    ctx.lineTo(-3.2, 3.8);
    ctx.closePath();
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
    ctx.restore();
  }, [playerPos, playerYaw, waypoints]);

  const handleQuickAddWaypoint = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('impact');
    const label = `Tanda ${Math.round(playerPos[0])}, ${Math.round(playerPos[2])}`;
    WaypointManager.addWaypoint({
      id: `custom_${Date.now()}`,
      label,
      pos: [Math.round(playerPos[0]), Math.round(playerPos[1]), Math.round(playerPos[2])],
      color: '#38bdf8',
      icon: '📍',
      type: 'custom',
      createdAt: Date.now(),
    });
  };

  let nearestWp: { wp: WaypointMarker; dist: number } | null = null;
  waypoints.forEach((wp) => {
    const dist = Math.hypot(wp.pos[0] - playerPos[0], wp.pos[2] - playerPos[2]);
    if (!nearestWp || dist < nearestWp.dist) {
      nearestWp = { wp, dist };
    }
  });

  return (
    <div className="relative flex flex-col items-end pointer-events-auto select-none">
      <div
        onClick={onOpenMap}
        title="Peta Dunia [M]"
        className="p-1 cursor-pointer transition-colors flex flex-col items-center gap-1 bg-slate-950/75 border border-white/10 hover:border-white/25 rounded-full relative group shadow-lg"
      >
        <div className="relative w-[76px] h-[76px] flex items-center justify-center">
          <canvas ref={canvasRef} width={76} height={76} className="w-[76px] h-[76px] rounded-full" />
          <button
            onClick={handleQuickAddWaypoint}
            title="Tandai lokasi saat ini"
            className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-slate-900 hover:bg-sky-500 text-zinc-300 hover:text-white flex items-center justify-center shadow cursor-pointer transition-colors border border-white/15"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
      {nearestWp && (
        <div className="mt-1 px-2 py-0.5 rounded-full bg-slate-950/75 border border-white/10 flex items-center gap-1.5 text-[10px] font-mono tabular-nums text-zinc-400">
          <span className="truncate max-w-[68px]">{nearestWp.wp.label}</span>
          <span className="text-zinc-600">·</span>
          <span className="text-sky-400 font-medium">{Math.round(nearestWp.dist)}m</span>
        </div>
      )}
    </div>
  );
};
