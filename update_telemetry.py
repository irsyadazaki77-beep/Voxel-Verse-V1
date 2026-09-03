import re

with open('/src/engine/ui/TelemetryStore.ts', 'r') as f:
    code = f.read()

code = code.replace(
    'meshUploadsPerFrame: number;',
    'meshUploadsPerFrame: number;\n     bufferPreparationMs: number;\n     bytesTransferred: number;\n     workerQueueDepth: number;'
)
code = code.replace(
    'meshUploadsPerFrame: 0,',
    'meshUploadsPerFrame: 0,\n       bufferPreparationMs: 0,\n       bytesTransferred: 0,\n       workerQueueDepth: 0,'
)

with open('/src/engine/ui/TelemetryStore.ts', 'w') as f:
    f.write(code)


with open('/src/engine/systems/TelemetrySystem.ts', 'r') as f:
    code = f.read()

# Make sure bufferPreparationMs, etc are passed
code = code.replace(
    '...world.scheduler.metrics,',
    '...world.scheduler.metrics,'
)
with open('/src/engine/systems/TelemetrySystem.ts', 'w') as f:
    f.write(code)

with open('/src/components/HUD.tsx', 'r') as f:
    code = f.read()

old_metrics = '''        <div className="bg-black/40 border border-white/5 p-2 rounded">
          <div className="text-zinc-400 font-bold border-b border-white/5 pb-1 mb-1">CHUNK ENGINE</div>'''

new_metrics = '''        <div className="bg-black/40 border border-white/5 p-2 rounded">
          <div className="text-zinc-400 font-bold border-b border-white/5 pb-1 mb-1">CHUNK ENGINE</div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-500">Buffer Prep:</span>
            <span className="text-zinc-300">{(metrics.bufferPreparationMs || 0).toFixed(1)} ms</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-500">Transferred:</span>
            <span className="text-zinc-300">{((metrics.bytesTransferred || 0) / 1024).toFixed(1)} KB</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-500">Worker Q Depth:</span>
            <span className="text-zinc-300">{metrics.workerQueueDepth || 0}</span>
          </div>'''

code = code.replace(old_metrics, new_metrics)
with open('/src/components/HUD.tsx', 'w') as f:
    f.write(code)
