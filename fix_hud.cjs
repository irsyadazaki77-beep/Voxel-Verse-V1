const fs = require('fs');
let code = fs.readFileSync('src/components/HUD.tsx', 'utf8');

const target = `{/* Chunk Debug Overlay (New Diagnostic Box) */}
        <div className="bg-black/40 border border-white/5 p-2 rounded col-span-2">`;

const replace = `{/* Cultural Region Diagnostics */}
        <div className="bg-black/40 border border-amber-500/30 p-2 rounded col-span-2 mb-2">
          <div className="text-amber-400 font-bold border-b border-amber-500/30 pb-1 mb-1 text-[10px]">CULTURAL REGION (NUSANTARA)</div>
          <div className="grid grid-cols-1 gap-x-4">
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400 text-[10px]">Region:</span>
              <span className="font-bold text-amber-300 text-[10px]">{telemetryData?.culturalRegionName || 'None'}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-400 text-[10px]">Biome:</span>
              <span className="font-bold text-sky-300 text-[10px]">{telemetryData?.biomeName || 'Unknown'}</span>
            </div>
          </div>
        </div>
        
        {/* Chunk Debug Overlay (New Diagnostic Box) */}
        <div className="bg-black/40 border border-white/5 p-2 rounded col-span-2">`;

if (code.includes('CHUNK GEOMETRY DIAGNOSTICS')) {
  // We need telemetryData in scope. Is it available in HUD?
  // Let's check if telemetryData exists. Wait, in HUD, `stats` is used inside useEffect to update DOM refs!
  // It doesn't trigger re-renders for every frame to save performance.
}
