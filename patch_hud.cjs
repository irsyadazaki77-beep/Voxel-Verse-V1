const fs = require('fs');
let content = fs.readFileSync('src/components/HUD.tsx', 'utf-8');

// I will add a new block at the bottom right corner for profiler metrics, shown when you press F3.
// But we don't have an F3 toggle in HUD. Let's just always show it for now in this debug phase, or add a toggle.
// Better: Add a telemetry debug panel always visible on the top right.

const metricsHtml = `
      {/* Telemetry (Top Right) */}
      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 shadow-lg flex flex-col gap-1 text-[10px] font-mono text-white/80 pointer-events-none min-w-[140px]">
        <div className="text-[9px] uppercase tracking-wider text-white/50 font-bold mb-1 border-b border-white/10 pb-1">Performance</div>
        <div className="flex justify-between"><span>FPS:</span> <span ref={fpsRef} className="font-bold text-sky-400">0</span></div>
        <div className="flex justify-between"><span>Frame:</span> <span ref={frameTimeRef} className="font-bold text-amber-400">0ms</span></div>
        <div className="flex justify-between"><span>Sim:</span> <span ref={simTimeRef} className="font-bold text-rose-400">0ms</span></div>
        <div className="flex justify-between"><span>Render:</span> <span ref={renderTimeRef} className="font-bold text-green-400">0ms</span></div>
        
        <div className="text-[9px] uppercase tracking-wider text-white/50 font-bold mt-1 mb-1 border-b border-white/10 pb-1">Engine</div>
        <div className="flex justify-between"><span>Chunks:</span> <span ref={chunksRef} className="font-bold text-white">0</span></div>
        <div className="flex justify-between"><span>DrawCalls:</span> <span ref={drawCallsRef} className="font-bold text-white">0</span></div>
        <div className="flex justify-between"><span>Tris:</span> <span ref={trisRef} className="font-bold text-white">0</span></div>
        <div className="flex justify-between"><span>Mem Est:</span> <span ref={memRef} className="font-bold text-white">0MB</span></div>
      </div>
`;

// wait, I need to add refs for these
const newRefs = `
  const frameTimeRef = useRef<HTMLSpanElement>(null);
  const simTimeRef = useRef<HTMLSpanElement>(null);
  const renderTimeRef = useRef<HTMLSpanElement>(null);
  const chunksRef = useRef<HTMLSpanElement>(null);
  const drawCallsRef = useRef<HTMLSpanElement>(null);
  const trisRef = useRef<HTMLSpanElement>(null);
  const memRef = useRef<HTMLSpanElement>(null);
`;

content = content.replace(
  "const healthTextRef = useRef<HTMLDivElement>(null);",
  "const healthTextRef = useRef<HTMLDivElement>(null);\n" + newRefs
);

const newUpdates = `
      if (frameTimeRef.current) frameTimeRef.current.innerText = stats.profilerMetrics.frameTimeMs.toFixed(1) + 'ms';
      if (simTimeRef.current) simTimeRef.current.innerText = stats.profilerMetrics.simTimeMs.toFixed(1) + 'ms';
      if (renderTimeRef.current) renderTimeRef.current.innerText = stats.profilerMetrics.renderTimeMs.toFixed(1) + 'ms';
      if (chunksRef.current) chunksRef.current.innerText = stats.profilerMetrics.activeChunks.toString();
      if (drawCallsRef.current) drawCallsRef.current.innerText = stats.profilerMetrics.drawCalls.toString();
      if (trisRef.current) trisRef.current.innerText = stats.profilerMetrics.triangles.toString();
      if (memRef.current) memRef.current.innerText = stats.profilerMetrics.memoryEst.toFixed(1) + 'MB';
`;

content = content.replace(
  "if (fpsRef.current) fpsRef.current.innerText = stats.fps.toString();",
  "if (fpsRef.current) fpsRef.current.innerText = stats.fps.toString();\n" + newUpdates
);

content = content.replace(
  "{/* Center Reticle */}",
  metricsHtml + "\n      {/* Center Reticle */}"
);

fs.writeFileSync('src/components/HUD.tsx', content);
