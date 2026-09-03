import re

with open('/src/engine/systems/RenderQualityManager.ts', 'r') as f:
    code = f.read()

update_settings_new = '''  public updateQualitySettings(settings: GraphicsSettings) {
    if (!this.runtime.renderer) return;

    const winW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 1080;
    const budget = this.calculatePixelBudget(settings, winW, winH);

    this.currentDpr = budget.dpr;
    this.targetResolution = { width: budget.width, height: budget.height };

    this.runtime.renderer.setPixelRatio(budget.dpr);
    this.runtime.renderer.outputColorSpace = THREE.SRGBColorSpace;

    if (this.runtime.renderPipeline) {
      this.runtime.renderPipeline.setPixelRatio(budget.dpr);
      this.runtime.renderPipeline.updateSettings(settings, winW, winH);
    }
  }'''

old_update_settings = re.search(r'public updateQualitySettings\(settings: GraphicsSettings\) \{.*?\n  \}', code, re.DOTALL)
if old_update_settings:
    code = code.replace(old_update_settings.group(0), update_settings_new)

with open('/src/engine/systems/RenderQualityManager.ts', 'w') as f:
    f.write(code)
