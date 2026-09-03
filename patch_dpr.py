import re

with open('/src/engine/systems/RenderQualityManager.ts', 'r') as f:
    code = f.read()

old_calc = '''    let calculatedDpr = 1.0;
    if (useDirectPixels) {
      // desiredPixels / viewportPixels => effective scale
      const desiredPixels = desiredWidth * desiredHeight;
      calculatedDpr = Math.sqrt(desiredPixels / viewportPixels);
    } else {
      // Native or Auto: base on devicePixelRatio capped by preset
      calculatedDpr = deviceDpr;
    }'''

new_calc = '''    let calculatedDpr = 1.0;
    if (useDirectPixels) {
      const desiredPixels = desiredWidth * desiredHeight;
      calculatedDpr = Math.sqrt(desiredPixels / viewportPixels);
    } else if (resMode === 'native') {
      calculatedDpr = deviceDpr;
    } else {
      // Auto: pixel-budget based resolution
      let maxPixels = viewportPixels * deviceDpr * deviceDpr;
      let targetPixels = maxPixels;

      if (settings.preset === 'low') {
        targetPixels = Math.min(maxPixels, 1.2 * 1000000); // ~0.9 - 1.5 MP
      } else if (settings.preset === 'medium') {
        targetPixels = Math.min(maxPixels, 2.0 * 1000000); // ~2.0 MP
      } else if (settings.preset === 'high') {
        targetPixels = Math.min(maxPixels, 3.5 * 1000000); // ~2.1 - 3.7 MP
      } else if (settings.preset === 'ultra') {
        targetPixels = Math.min(maxPixels, 8.3 * 1000000); // up to 4K
      }

      calculatedDpr = Math.sqrt(targetPixels / viewportPixels);
    }'''

code = code.replace(old_calc, new_calc)

with open('/src/engine/systems/RenderQualityManager.ts', 'w') as f:
    f.write(code)
