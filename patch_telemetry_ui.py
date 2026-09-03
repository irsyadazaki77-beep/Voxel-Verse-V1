import re

with open('/src/engine/ui/TelemetryStore.ts', 'r') as f:
    code = f.read()

# Add to type definition
code = code.replace(
    'dynamicScale: number;',
    'dynamicScale: number;\n  cpuSimMs: number;\n  cpuRenderSubmissionMs: number;\n  gpuTimeMs: number;\n  totalFrameMs: number;'
)

code = code.replace(
    'dynamicScale: 1.0,',
    'dynamicScale: 1.0,\n  cpuSimMs: 0,\n  cpuRenderSubmissionMs: 0,\n  gpuTimeMs: 0,\n  totalFrameMs: 0,'
)

with open('/src/engine/ui/TelemetryStore.ts', 'w') as f:
    f.write(code)


with open('/src/components/HUD.tsx', 'r') as f:
    code = f.read()

old_metrics = '''          <div className="flex justify-between py-0.5">
            <span className="text-zinc-500">Draws:</span>
            <span className="text-zinc-300">{metrics.drawCalls}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-500">Triangles:</span>
            <span className="text-zinc-300">{(metrics.triangles / 1000).toFixed(0)}k</span>
          </div>
          <div className="flex justify-between py-0.5 mt-1 border-t border-white/5 pt-1">
            <span className="text-zinc-500">Status:</span>
            <span className={`font-bold ${metrics.bottleneck.includes('GPU') ? 'text-red-400' : (metrics.bottleneck.includes('CPU') ? 'text-orange-400' : 'text-emerald-400')}`}>
              {metrics.bottleneck}
            </span>
          </div>'''

new_metrics = '''          <div className="flex justify-between py-0.5">
            <span className="text-zinc-500">Total Frame:</span>
            <span className="text-zinc-300">{metrics.totalFrameMs.toFixed(1)} ms</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-500">CPU Sim:</span>
            <span className="text-zinc-300">{metrics.cpuSimMs.toFixed(1)} ms</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-500">CPU Render:</span>
            <span className="text-zinc-300">{metrics.cpuRenderSubmissionMs.toFixed(1)} ms</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-500">GPU Time:</span>
            <span className="text-amber-300 font-bold">{metrics.gpuTimeMs.toFixed(1)} ms</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-500">Draws:</span>
            <span className="text-zinc-300">{metrics.drawCalls}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-500">Triangles:</span>
            <span className="text-zinc-300">{(metrics.triangles / 1000).toFixed(0)}k</span>
          </div>
          <div className="flex justify-between py-0.5 mt-1 border-t border-white/5 pt-1">
            <span className="text-zinc-500">Status:</span>
            <span className={`font-bold ${metrics.bottleneck.includes('GPU') ? 'text-red-400' : (metrics.bottleneck.includes('CPU') ? 'text-orange-400' : 'text-emerald-400')}`}>
              {metrics.bottleneck}
            </span>
          </div>'''

code = code.replace(old_metrics, new_metrics)
with open('/src/components/HUD.tsx', 'w') as f:
    f.write(code)
