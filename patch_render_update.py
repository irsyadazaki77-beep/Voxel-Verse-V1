import re

with open('/src/engine/rendering/RenderPipeline.ts', 'r') as f:
    code = f.read()

code = code.replace(
    'public updateSettings(settings: GraphicsSettings, width: number, height: number): void {',
    'public updateSettings(settings: GraphicsSettings, width: number, height: number, degradationLevel: number = 0): void {'
)

# Apply bloom reduction
bloom_str = '''      const bloomStrength = (settings as any).bloomStrength ?? 0.35;
      this.bloomPass.strength = bloomStrength;'''
new_bloom_str = '''      let bloomStrength = (settings as any).bloomStrength ?? 0.35;
      if (degradationLevel >= 3) bloomStrength *= 0.6; // reduce bloom by 40%
      this.bloomPass.strength = bloomStrength;'''
code = code.replace(bloom_str, new_bloom_str)

with open('/src/engine/rendering/RenderPipeline.ts', 'w') as f:
    f.write(code)

with open('/src/engine/systems/RenderQualityManager.ts', 'r') as f:
    code = f.read()

code = code.replace(
    'this.runtime.renderPipeline.updateSettings(settings, winW, winH);',
    'this.runtime.renderPipeline.updateSettings(settings, winW, winH, this.adaptiveDegradationLevel);'
)

with open('/src/engine/systems/RenderQualityManager.ts', 'w') as f:
    f.write(code)

with open('/src/engine/core/GameRuntime.ts', 'r') as f:
    code = f.read()

code = code.replace(
    'this.renderPipeline.updateSettings(newSettings.graphics, window.innerWidth, window.innerHeight);',
    'this.renderPipeline.updateSettings(newSettings.graphics, window.innerWidth, window.innerHeight, this.renderQualityManager.adaptiveDegradationLevel);'
)
code = code.replace(
    'this.renderPipeline.updateSettings(settings.graphics, window.innerWidth, window.innerHeight);',
    'this.renderPipeline.updateSettings(settings.graphics, window.innerWidth, window.innerHeight, this.renderQualityManager.adaptiveDegradationLevel);'
)

with open('/src/engine/core/GameRuntime.ts', 'w') as f:
    f.write(code)

