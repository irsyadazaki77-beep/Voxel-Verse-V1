import React, { useState, useEffect, useRef } from 'react';
import { TelemetryStore } from '../engine/ui/TelemetryStore';
import { WaypointManager, WaypointMarker } from '../engine/navigation/WaypointManager';
import { Compass, Plus, Navigation } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface MiniRadarProps {
  onOpenMap?: () => void;
}

export const MiniRadar: React.FC<MiniRadarProps> = ({ onOpenMap }) => {
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 80, 0]);
  const [playerYaw, setPlayerYaw] = useState<number>(0);
  const [waypoints, setWaypoints] = useState<WaypointMarker[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Subscribe to Telemetry for player coordinates and rotation
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

  // Render radar canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const radius = width / 2 - 4;
    const cx = width / 2;
    const cy = height / 2;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Outer radar background circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.stroke();

    // Concentric range rings
    const ringRadii = [radius * 0.33, radius * 0.66, radius * 0.95];
    ctx.lineWidth = 1;
    ringRadii.forEach((r, idx) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = idx === 2 ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.08)';
      ctx.stroke();
    });

    // Cross grid axes
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.stroke();

    // Radar scan sweep effect
    const scanAngle = (Date.now() / 1500) % (Math.PI * 2);
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
    grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, scanAngle, scanAngle + 0.6);
    ctx.closePath();
    ctx.fill();

    // Rotating Cardinal letters based on Player Yaw
    // playerYaw is radians clockwise
    const cardinals = [
      { text: 'N', angle: -Math.PI / 2 },
      { text: 'E', angle: 0 },
      { text: 'S', angle: Math.PI / 2 },
      { text: 'W', angle: Math.PI },
    ];

    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    cardinals.forEach(({ text, angle }) => {
      // Relative angle to player yaw
      const relAngle = angle - playerYaw - Math.PI / 2;
      const tx = cx + Math.cos(relAngle) * (radius - 8);
      const ty = cy + Math.sin(relAngle) * (radius - 8);

      ctx.fillStyle = text === 'N' ? '#ef4444' : '#94a3b8';
      ctx.fillText(text, tx, ty);
    });

    // Max radar sensing radius in meters
    const radarRange = 180;

    // Draw Waypoints
    waypoints.forEach((wp) => {
      const dx = wp.pos[0] - playerPos[0];
      const dz = wp.pos[2] - playerPos[2];
      const dist = Math.hypot(dx, dz);

      // Angle from player in world space
      const worldAngle = Math.atan2(dz, dx);
      // Relative angle accounting for player forward heading
      const relAngle = worldAngle - playerYaw - Math.PI / 2;

      // Distance normalized to canvas radius
      const clampedDist = Math.min(dist, radarRange);
      const r = (clampedDist / radarRange) * (radius - 12);

      const px = cx + Math.cos(relAngle) * r;
      const py = cy + Math.sin(relAngle) * r;

      // Draw blip
      ctx.beginPath();
      ctx.arc(px, py, dist > radarRange ? 3 : 4, 0, Math.PI * 2);
      ctx.fillStyle = wp.color || '#38bdf8';
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Outer glow for boss or death
      if (wp.type === 'boss' || wp.type === 'death') {
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.strokeStyle = wp.color;
        ctx.stroke();
      }
    });

    // Center Player Icon (Arrow pointing up)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(0, 3);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
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

  // Find nearest waypoint for distance readout
  let nearestWp: { wp: WaypointMarker; dist: number } | null = null;
  waypoints.forEach((wp) => {
    const dist = Math.hypot(wp.pos[0] - playerPos[0], wp.pos[2] - playerPos[2]);
    if (!nearestWp || dist < nearestWp.dist) {
      nearestWp = { wp, dist };
    }
  });

  return (
    <div 
      className="relative flex flex-col items-end pointer-events-auto select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        onClick={onOpenMap}
        title="Klik untuk membuka peta dunia lengkap [M]"
        className="voxel-panel-subtle p-1.5 shadow-2xl cursor-pointer hover:border-sky-400/50 transition-all flex flex-col items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl group"
      >
        <div className="relative w-28 h-28 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            width={112}
            height={112}
            className="w-28 h-28 rounded-full"
          />
          {/* Quick Add Waypoint Button in bottom-right corner of radar */}
          <button
            onClick={handleQuickAddWaypoint}
            title="Tandai posisi saat ini"
            className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-sky-500 hover:bg-sky-400 active:scale-95 text-white flex items-center justify-center shadow-lg cursor-pointer transition-transform border border-white/40"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Nearest landmark tracker strip */}
        {nearestWp && (
          <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-300 w-full px-1 justify-between">
            <span className="truncate max-w-[70px] text-zinc-400">{nearestWp.wp.label}</span>
            <span className="font-bold text-sky-400">{Math.round(nearestWp.dist)}m</span>
          </div>
        )}
      </div>
    </div>
  );
};
