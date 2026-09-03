import re

with open('/src/components/HUD.tsx', 'r') as f:
    code = f.read()

timing_metrics = '''          <div className="flex justify-between py-0.5">
            <span className="text-zinc-400">GPU Render:</span>
            <span className="font-bold text-zinc-200">{(metrics.renderTimeMs || 0).toFixed(1)} ms</span>
          </div>'''

new_timing = timing_metrics + '''
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-500">→ Ent AI:</span>
            <span className="text-zinc-300">{(metrics.entityAiMs || 0).toFixed(1)} ms</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-500">→ Ent Phys:</span>
            <span className="text-zinc-300">{(metrics.entityPhysicsMs || 0).toFixed(1)} ms</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-500">→ Farm:</span>
            <span className="text-zinc-300">{(metrics.farmingMs || 0).toFixed(1)} ms</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-500">→ Eng:</span>
            <span className="text-zinc-300">{(metrics.engineeringMs || 0).toFixed(1)} ms</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-500">→ Furn:</span>
            <span className="text-zinc-300">{(metrics.furnaceMs || 0).toFixed(1)} ms</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span className="text-zinc-500">→ Raycast:</span>
            <span className="text-zinc-300">{(metrics.interactionMs || 0).toFixed(1)} ms</span>
          </div>
'''
code = code.replace(timing_metrics, new_timing)

with open('/src/components/HUD.tsx', 'w') as f:
    f.write(code)
