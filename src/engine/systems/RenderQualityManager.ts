import * as THREE from 'three';
import { GameRuntime } from '../core/GameRuntime';
import { GraphicsSettings } from '../ui/SettingsManager';

export class RenderQualityManager {
  private runtime: GameRuntime;

  public currentResolution = { width: 0, height: 0 };
  public targetResolution = { width: 0, height: 0 };
  public currentDpr = 1.0;
  public dynamicScaleMultiplier = 1.0;

  private lastFrameTimesMs: number[] = [];
  private readonly frameTimeWindowSize = 30;

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
  }

  public calculatePixelBudget(settings: GraphicsSettings, windowWidth: number, windowHeight: number): { width: number; height: number; dpr: number } {
    const deviceDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    let baseDpr = deviceDpr;

    // Cap DPR based on preset
    if (settings.preset === 'low') baseDpr = Math.min(deviceDpr, 1.0);
    else if (settings.preset === 'medium') baseDpr = Math.min(deviceDpr, 1.25);
    else if (settings.preset === 'high') baseDpr = Math.min(deviceDpr, 1.75);
    else if (settings.preset === 'ultra') baseDpr = Math.min(deviceDpr, 2.0);

    let targetW = windowWidth;
    let targetH = windowHeight;

    const resMode = settings.resolutionMode || 'auto';

    switch (resMode) {
      case 'native':
        baseDpr = deviceDpr;
        targetW = windowWidth;
        targetH = windowHeight;
        break;
      case '1080p':
        targetW = 1920;
        targetH = 1080;
        baseDpr = 1.0;
        break;
      case '1440p':
        targetW = 2560;
        targetH = 1440;
        baseDpr = 1.0;
        break;
      case '4k':
        targetW = 3840;
        targetH = 2160;
        baseDpr = 1.0;
        break;
      case 'custom':
        targetW = windowWidth;
        targetH = windowHeight;
        break;
      case 'auto':
      default:
        targetW = windowWidth;
        targetH = windowHeight;
        break;
    }

    const customScale = settings.renderScale || 1.0;
    const finalDpr = Math.max(0.5, Math.min(3.0, baseDpr * customScale * this.dynamicScaleMultiplier));

    return {
      width: targetW,
      height: targetH,
      dpr: finalDpr,
    };
  }

  public updateQualitySettings(settings: GraphicsSettings) {
    if (!this.runtime.renderer) return;

    const winW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 1080;

    const budget = this.calculatePixelBudget(settings, winW, winH);

    this.currentDpr = budget.dpr;
    this.targetResolution = { width: budget.width, height: budget.height };

    this.runtime.renderer.setPixelRatio(budget.dpr);
    this.runtime.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  public trackFrameTime(frameTimeMs: number, settings: GraphicsSettings): void {
    if (!settings.dynamicResolution) {
      if (this.dynamicScaleMultiplier !== 1.0) {
        this.dynamicScaleMultiplier = 1.0;
        this.updateQualitySettings(settings);
      }
      return;
    }

    this.lastFrameTimesMs.push(frameTimeMs);
    if (this.lastFrameTimesMs.length > this.frameTimeWindowSize) {
      this.lastFrameTimesMs.shift();
    }

    if (this.lastFrameTimesMs.length < 15) return;

    const avgFrameTime = this.lastFrameTimesMs.reduce((a, b) => a + b, 0) / this.lastFrameTimesMs.length;
    const targetFps = settings.targetFps || 60;
    const targetBudgetMs = 1000 / targetFps;

    let scaleDelta = 0;
    if (avgFrameTime > targetBudgetMs * 1.15) {
      // Underperforming: scale down smoothly
      scaleDelta = -0.05;
    } else if (avgFrameTime < targetBudgetMs * 0.75 && this.dynamicScaleMultiplier < 1.0) {
      // Smooth headroom: scale back up
      scaleDelta = +0.02;
    }

    if (scaleDelta !== 0) {
      const newScale = Math.max(0.6, Math.min(1.0, this.dynamicScaleMultiplier + scaleDelta));
      if (Math.abs(newScale - this.dynamicScaleMultiplier) > 0.01) {
        this.dynamicScaleMultiplier = newScale;
        this.updateQualitySettings(settings);
      }
    }
  }

  public resize(width: number, height: number) {
    this.currentResolution.width = width;
    this.currentResolution.height = height;
    if (this.runtime.renderer) {
      this.runtime.renderer.setSize(width, height);
      if (this.runtime.settings && this.runtime.settings.graphics) {
        this.updateQualitySettings(this.runtime.settings.graphics);
      }
    }
  }
}
