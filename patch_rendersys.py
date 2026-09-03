import re

with open('/src/engine/systems/RenderSystem.ts', 'r') as f:
    code = f.read()

import_timer = "import { GPUTimer } from '../rendering/GPUTimer';\n"
code = import_timer + code

code = code.replace(
    'private runtime: GameRuntime;',
    'private runtime: GameRuntime;\n  private gpuTimer: GPUTimer | null = null;'
)

init_timer = '''    if (!renderer || !scene || !camera || !player) return;

    if (!this.gpuTimer) {
      this.gpuTimer = new GPUTimer(renderer.getContext());
    }'''

code = code.replace('if (!renderer || !scene || !camera || !player) return;', init_timer)

render_block = '''    const renderStart = performance.now();
    
    if (this.gpuTimer) this.gpuTimer.begin();
        
    const isEyesInWater = player.isEyesInWater || false;
    const exposure = renderer.toneMappingExposure || 1.0;
    if (this.runtime.renderPipeline) {
      this.runtime.renderPipeline.render(deltaTime, isEyesInWater, exposure);
    } else {
      renderer.render(scene, camera);
    }
        
    if (this.gpuTimer) this.gpuTimer.end();
    
    const renderTime = performance.now() - renderStart;
    this.runtime.lastRenderTimeMs = renderTime;
    
    const gpuTime = (this.gpuTimer && this.gpuTimer.isSupported) ? this.gpuTimer.lastGpuMs : renderTime;
    
    if (this.runtime.renderQualityManager && this.runtime.settings?.graphics) {
      const totalFrameMs = Math.max(renderTime, deltaTime * 1000);
      this.runtime.renderQualityManager.trackFrameTime(totalFrameMs, renderTime, this.runtime.settings.graphics);
      
      // We can also pass GPU time if we want to change signature, but for now we expose it to telemetry
      if ((this.runtime.renderQualityManager as any).trackGpuTime) {
         (this.runtime.renderQualityManager as any).trackGpuTime(gpuTime);
      }
    }
    
    // Inject into telemetry
    if (this.runtime.telemetrySystem) {
       (this.runtime.telemetrySystem as any).lastGpuMs = gpuTime;
       (this.runtime.telemetrySystem as any).lastCpuRenderSubmissionMs = renderTime;
    }'''

old_render_block = re.search(r'const renderStart = performance.now();.*?this\.runtime\.settings\.graphics\);\n    \}', code, re.DOTALL)
if old_render_block:
    code = code.replace(old_render_block.group(0), render_block)

with open('/src/engine/systems/RenderSystem.ts', 'w') as f:
    f.write(code)
