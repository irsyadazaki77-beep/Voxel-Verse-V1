import re

with open('/src/engine/systems/RenderSystem.ts', 'r') as f:
    code = f.read()

# Setup autoUpdate = false in GameRuntime? 
# Wait, RenderSystem has access to renderer. Let's do it in RenderSystem's update.
update_shadow = '''    const renderStart = performance.now();
    
    // Shadow Optimization
    if (this.runtime.sky && this.runtime.settings?.graphics?.shadows) {
      if (this.runtime.sky.isShadowDirty) {
        renderer.shadowMap.needsUpdate = true;
        this.runtime.sky.isShadowDirty = false;
      }
    }'''

code = code.replace('    const renderStart = performance.now();', update_shadow)

with open('/src/engine/systems/RenderSystem.ts', 'w') as f:
    f.write(code)

with open('/src/engine/core/GameRuntime.ts', 'r') as f:
    code = f.read()

code = code.replace(
    'this.renderer.shadowMap.enabled = settings.graphics.shadows;',
    'this.renderer.shadowMap.enabled = settings.graphics.shadows;\n    this.renderer.shadowMap.autoUpdate = false;'
)

with open('/src/engine/core/GameRuntime.ts', 'w') as f:
    f.write(code)
