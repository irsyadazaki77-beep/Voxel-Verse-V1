import re

with open('/src/engine/systems/RenderQualityManager.ts', 'r') as f:
    code = f.read()

# Add adaptiveDegradationLevel
code = code.replace(
    'public dynamicScaleMultiplier = 1.0;',
    'public dynamicScaleMultiplier = 1.0;\n  public adaptiveDegradationLevel = 0;'
)

# Update scaling logic
old_logic = '''    let scaleDelta = 0;

    // Only scale down if verified GPU stress persists over multiple evaluation cycles (hysteresis)
    if (this.consecutiveGpuStressCycles >= this.requiredGpuStressCycles) {
      scaleDelta = -0.05;
      this.consecutiveGpuStressCycles = 0;
    } else if (this.consecutiveHeadroomCycles >= this.requiredHeadroomCycles) {
      scaleDelta = +0.02; // Smooth gradual recovery
      this.consecutiveHeadroomCycles = 0;
    }

    if (scaleDelta !== 0) {
      // Preset-aware floor for minimum scale to preserve High visual fidelity
      let minScale = 0.60;
      if (settings.preset === 'high') minScale = 0.85;
      else if (settings.preset === 'ultra') minScale = 0.90;
      else if (settings.preset === 'medium') minScale = 0.75;
      else if (settings.preset === 'low') minScale = 0.60;

      const newScale = Math.max(minScale, Math.min(1.0, this.dynamicScaleMultiplier + scaleDelta));
      if (Math.abs(newScale - this.dynamicScaleMultiplier) >= 0.015) {
        this.dynamicScaleMultiplier = newScale;
        this.lastScaleChangeTime = now;
        this.updateQualitySettings(settings);
      }
    }'''

new_logic = '''    // Only scale down if verified GPU stress persists over multiple evaluation cycles (hysteresis)
    if (this.consecutiveGpuStressCycles >= this.requiredGpuStressCycles) {
      this.consecutiveGpuStressCycles = 0;
      if (this.adaptiveDegradationLevel < 4) {
        this.adaptiveDegradationLevel++;
        this.lastScaleChangeTime = now;
      } else {
        let scaleDelta = -0.05;
        let minScale = 0.60;
        if (settings.preset === 'high') minScale = 0.85;
        else if (settings.preset === 'ultra') minScale = 0.90;
        else if (settings.preset === 'medium') minScale = 0.75;
        else if (settings.preset === 'low') minScale = 0.60;

        const newScale = Math.max(minScale, Math.min(1.0, this.dynamicScaleMultiplier + scaleDelta));
        if (Math.abs(newScale - this.dynamicScaleMultiplier) >= 0.015) {
          this.dynamicScaleMultiplier = newScale;
          this.lastScaleChangeTime = now;
          this.updateQualitySettings(settings);
        }
      }
    } else if (this.consecutiveHeadroomCycles >= this.requiredHeadroomCycles) {
      this.consecutiveHeadroomCycles = 0;
      if (this.dynamicScaleMultiplier < 1.0) {
        const newScale = Math.min(1.0, this.dynamicScaleMultiplier + 0.02);
        this.dynamicScaleMultiplier = newScale;
        this.lastScaleChangeTime = now;
        this.updateQualitySettings(settings);
      } else if (this.adaptiveDegradationLevel > 0) {
        this.adaptiveDegradationLevel--;
        this.lastScaleChangeTime = now;
      }
    }'''
code = code.replace(old_logic, new_logic)

with open('/src/engine/systems/RenderQualityManager.ts', 'w') as f:
    f.write(code)
