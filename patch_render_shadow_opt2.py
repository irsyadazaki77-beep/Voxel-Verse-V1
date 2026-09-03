import re

with open('/src/engine/systems/RenderSystem.ts', 'r') as f:
    code = f.read()

old_shadow_logic = '''      const maxShadowDist = isUltra ? 160 : (renderScale < 0.9 ? 60 : 90);
      const maxShadowDistSq = maxShadowDist * maxShadowDist;'''

new_shadow_logic = '''      const degLevel = this.runtime.renderQualityManager?.adaptiveDegradationLevel || 0;
      let maxShadowDist = isUltra ? 160 : (renderScale < 0.9 ? 60 : 90);
      if (degLevel >= 2) maxShadowDist = Math.max(40, maxShadowDist - 30);
      const maxShadowDistSq = maxShadowDist * maxShadowDist;'''

code = code.replace(old_shadow_logic, new_shadow_logic)

with open('/src/engine/systems/RenderSystem.ts', 'w') as f:
    f.write(code)
