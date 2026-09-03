import re

with open('/src/engine/systems/TelemetrySystem.ts', 'r') as f:
    code = f.read()

# Add to type definition of TelemetryState if needed, but it's probably exported from ui/TelemetryStore.
# Let's check updateTelemetry
metrics_code = '''    const info = renderer.info;
    const isGpuBound = renderQualityManager?.isGpuBound ?? false;
    const isCpuBound = renderQualityManager?.isCpuBound ?? false;
    const dynamicScale = renderQualityManager?.dynamicScaleMultiplier ?? 1.0;
    const effectiveDpr = renderQualityManager?.currentDpr ?? 1.0;'''

new_metrics_code = '''    const info = renderer.info;
    const isGpuBound = renderQualityManager?.isGpuBound ?? false;
    const isCpuBound = renderQualityManager?.isCpuBound ?? false;
    const dynamicScale = renderQualityManager?.dynamicScaleMultiplier ?? 1.0;
    const effectiveDpr = renderQualityManager?.currentDpr ?? 1.0;
    
    // Calculate CPU Sim time (Total Frame ms - CPU Render Submission ms)
    const currentFrameTotalMs = this.frameTimesBuffer[this.frameTimesBuffer.length - 1] || 16.6;
    const cpuRenderSubmissionMs = (this as any).lastCpuRenderSubmissionMs || 0;
    const cpuSimMs = Math.max(0, currentFrameTotalMs - cpuRenderSubmissionMs);
    const gpuTimeMs = (this as any).lastGpuMs || 0;'''

code = code.replace(metrics_code, new_metrics_code)

# Then update the store update
old_update = '''      timeOfDay: sky?.timeOfDay || 12,
      weather: weather?.currentState || 'clear',
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      bottleneck: isGpuBound ? 'GPU Bound' : (isCpuBound ? 'CPU Bound' : 'Balanced'),
      dynamicScale,
      effectiveDpr,
      entities: entities?.getActiveEntityCount() || 0,'''

new_update = '''      timeOfDay: sky?.timeOfDay || 12,
      weather: weather?.currentState || 'clear',
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      bottleneck: isGpuBound ? 'GPU Bound' : (isCpuBound ? 'CPU Bound' : 'Balanced'),
      dynamicScale,
      effectiveDpr,
      cpuSimMs,
      cpuRenderSubmissionMs,
      gpuTimeMs,
      totalFrameMs: currentFrameTotalMs,
      entities: entities?.getActiveEntityCount() || 0,'''
code = code.replace(old_update, new_update)

with open('/src/engine/systems/TelemetrySystem.ts', 'w') as f:
    f.write(code)

