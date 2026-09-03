import re

with open('/src/engine/systems/RenderQualityManager.ts', 'r') as f:
    code = f.read()

# Add lastGpuTimesMs
code = code.replace(
    'private lastRenderTimesMs: number[] = [];',
    'private lastRenderTimesMs: number[] = [];\n  private lastGpuTimesMs: number[] = [];'
)

# Add trackGpuTime
trackGpuTime = '''  public trackGpuTime(gpuMs: number): void {
    this.lastGpuTimesMs.push(gpuMs);
    if (this.lastGpuTimesMs.length > this.frameTimeWindowSize) {
      this.lastGpuTimesMs.shift();
    }
  }'''
code = code.replace('public trackFrameTime', trackGpuTime + '\n\n  public trackFrameTime')

# Update evaluation
old_eval = '''    const avgTotal = this.lastFrameTimesMs.reduce((a, b) => a + b, 0) / this.lastFrameTimesMs.length;
    const avgRender = this.lastRenderTimesMs.reduce((a, b) => a + b, 0) / this.lastRenderTimesMs.length;
    const cpuSimMs = Math.max(0, avgTotal - avgRender);
    const targetFps = settings.targetFps || 60;
    const targetBudgetMs = 1000 / targetFps;

    // Accurate CPU vs GPU bottleneck categorization
    // If CPU simulation dominates total time, reducing render scale does not fix FPS and harms visuals
    this.isCpuBound = avgTotal > targetBudgetMs * 1.08 && (cpuSimMs > avgRender * 1.15 || cpuSimMs > targetBudgetMs * 0.45);
    this.isGpuBound = avgRender > targetBudgetMs * 0.70 && avgRender >= cpuSimMs;'''

new_eval = '''    const avgTotal = this.lastFrameTimesMs.reduce((a, b) => a + b, 0) / this.lastFrameTimesMs.length;
    const avgRender = this.lastRenderTimesMs.reduce((a, b) => a + b, 0) / this.lastRenderTimesMs.length;
    const avgGpu = this.lastGpuTimesMs.length > 0 ? (this.lastGpuTimesMs.reduce((a, b) => a + b, 0) / this.lastGpuTimesMs.length) : avgRender;
    const cpuSimMs = Math.max(0, avgTotal - avgRender);
    const targetFps = settings.targetFps || 60;
    const targetBudgetMs = 1000 / targetFps;

    // Accurate CPU vs GPU bottleneck categorization
    this.isCpuBound = avgTotal > targetBudgetMs * 1.08 && (cpuSimMs > avgGpu * 1.15 || cpuSimMs > targetBudgetMs * 0.45);
    this.isGpuBound = avgGpu > targetBudgetMs * 0.70 && avgGpu >= cpuSimMs;'''
code = code.replace(old_eval, new_eval)

with open('/src/engine/systems/RenderQualityManager.ts', 'w') as f:
    f.write(code)
