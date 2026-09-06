const fs = require('fs');
let code = fs.readFileSync('src/components/HUD.tsx', 'utf8');

const targetState = `const [metrics, setMetrics] = useState(TelemetryStore.state.profilerMetrics);
  const [fps, setFps] = useState(TelemetryStore.state.fps);`;

const replaceState = `const [metrics, setMetrics] = useState(TelemetryStore.state.profilerMetrics);
  const [fps, setFps] = useState(TelemetryStore.state.fps);
  const [regionName, setRegionName] = useState(TelemetryStore.state.culturalRegionName);
  const [biomeName, setBiomeName] = useState(TelemetryStore.state.biomeName);`;

const targetSub = `setMetrics(stats.profilerMetrics);
      setFps(stats.fps);`;
      
const replaceSub = `setMetrics(stats.profilerMetrics);
      setFps(stats.fps);
      setRegionName(stats.culturalRegionName);
      setBiomeName(stats.biomeName);`;

const targetUI = `{/* Chunk Debug Overlay (New Diagnostic Box) */}`;
const replaceUI = `{/* Nusantara Cultural Region Profile */}
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

        {/* Chunk Debug Overlay (New Diagnostic Box) */}`;

code = code.replace(targetState, replaceState);
code = code.replace(targetSub, replaceSub);
code = code.replace(targetUI, replaceUI);

fs.writeFileSync('src/components/HUD.tsx', code);
