import re

with open('/src/engine/systems/RenderQualityManager.ts', 'r') as f:
    code = f.read()

quality_logic = '''    if (this.runtime.renderPipeline) {
      this.runtime.renderPipeline.setPixelRatio(budget.dpr);
      this.runtime.renderPipeline.updateSettings(settings, winW, winH, this.adaptiveDegradationLevel);
    }
    
    // Apply adaptive degradations
    if (this.runtime.particles) {
       let pq = settings.particleQuality || 'medium';
       if (this.adaptiveDegradationLevel >= 1) pq = 'low';
       this.runtime.particles.setQuality(pq);
    }
    
    if (this.runtime.clouds) {
       let cq = (settings.preset === 'high' || settings.preset === 'ultra') ? 'high' : 'medium';
       if (this.adaptiveDegradationLevel >= 2) cq = 'low';
       this.runtime.clouds.setQuality(cq as any);
    }'''

code = code.replace(
'''    if (this.runtime.renderPipeline) {
      this.runtime.renderPipeline.setPixelRatio(budget.dpr);
      this.runtime.renderPipeline.updateSettings(settings, winW, winH, this.adaptiveDegradationLevel);
    }''', quality_logic)

with open('/src/engine/systems/RenderQualityManager.ts', 'w') as f:
    f.write(code)
