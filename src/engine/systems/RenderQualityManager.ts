import * as THREE from 'three';
import { GameRuntime } from '../core/GameRuntime';
import { SettingsManager, GraphicsSettings } from '../ui/SettingsManager';

export class RenderQualityManager {
  private runtime: GameRuntime;
  
  public currentResolution = { width: 0, height: 0 };
  public currentDpr = 1.0;
  
  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
  }

  public updateQualitySettings(settings: GraphicsSettings) {
    if (!this.runtime.renderer) return;
    
    // We determine base scaling from preset or custom renderScale if added to settings
    // For now we map presets to scales if renderScale doesn't exist.
    let renderScale = (settings as any).renderScale ?? 1.0;
    
    switch (settings.preset) {
      case 'low':
        renderScale = 0.75;
        break;
      case 'medium':
        renderScale = 0.90;
        break;
      case 'high':
        renderScale = 1.0;
        break;
      case 'ultra':
        renderScale = 1.0;
        break;
      default:
        break;
    }
    
    // override if explicitly provided
    if ((settings as any).renderScale) {
        renderScale = (settings as any).renderScale;
    }

    const deviceDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    // Smart cap DPR
    let safeDpr = deviceDpr;
    if (deviceDpr > 2) safeDpr = 2; // don't go absurdly high (like 3 on newer iphones/macs)
    
    if (settings.preset === 'low') safeDpr = Math.min(deviceDpr, 1.0);
    if (settings.preset === 'medium') safeDpr = Math.min(deviceDpr, 1.25);
    
    const finalDpr = safeDpr * renderScale;

    this.currentDpr = finalDpr;
    this.runtime.renderer.setPixelRatio(finalDpr);
    
    // Output color space for modern rendering
    this.runtime.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  public resize(width: number, height: number) {
    this.currentResolution.width = width;
    this.currentResolution.height = height;
    if (this.runtime.renderer) {
      this.runtime.renderer.setSize(width, height);
      // Re-apply in case DPR changed (e.g. moving across monitors)
      if (this.runtime.settings && this.runtime.settings.graphics) {
        this.updateQualitySettings(this.runtime.settings.graphics);
      }
    }
  }
}
