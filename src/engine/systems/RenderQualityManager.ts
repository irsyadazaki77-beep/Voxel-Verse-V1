import * as THREE from 'three';
import { GameRuntime } from '../core/GameRuntime';
import { GraphicsSettings } from '../ui/SettingsManager';

export class RenderQualityManager {
  private runtime: GameRuntime;

  public currentResolution = { width: 0, height: 0 };
  public targetResolution = { width: 0, height: 0 };
  public currentDpr = 1.0;
  public dynamicScaleMultiplier = 1.0;

  // Profiler state
  public isCpuBound = false;
  public isGpuBound = false;

  public get scale(): number {
    return this.dynamicScaleMultiplier;
  }

  public get state(): { bottleneck: 'CPU' | 'GPU' | 'BALANCED' } {
    let bottleneck: 'CPU' | 'GPU' | 'BALANCED' = 'BALANCED';
    if (this.isGpuBound) bottleneck = 'GPU';
    else if (this.isCpuBound) bottleneck = 'CPU';
    return { bottleneck };
  }

  private lastFrameTimesMs: number[] = [];
  private lastRenderTimesMs: number[] = [];
  private readonly frameTimeWindowSize = 30;

  private lastScaleChangeTime = 0;
  private lastEvaluationTime = 0;
  private readonly evaluationIntervalMs = 600; // Evaluate every 600ms
  private readonly cooldownMs = 2000; // Wait 2.0s between dynamic resolution changes to prevent flickering

  // Hysteresis counters
  private consecutiveGpuStressCycles = 0;
  private consecutiveHeadroomCycles = 0;
  private readonly requiredGpuStressCycles = 3; // Must be GPU-bound for 3 consecutive checks (1.8s) before dropping resolution
  private readonly requiredHeadroomCycles = 3;   // Must have clean headroom for 3 consecutive checks before scaling back up

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
  }

  public calculatePixelBudget(
    settings: GraphicsSettings,
    windowWidth: number,
    windowHeight: number
  ): { width: number; height: number; dpr: number } {
    const deviceDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const viewportPixels = Math.max(1, windowWidth * windowHeight);

    let desiredWidth = windowWidth;
    let desiredHeight = windowHeight;
    let useDirectPixels = false;

    const resMode = settings.resolutionMode || 'auto';

    switch (resMode) {
      case '1080p':
        desiredWidth = 1920;
        desiredHeight = 1080;
        useDirectPixels = true;
        break;
      case '2k':
      case '1440p':
        desiredWidth = 2560;
        desiredHeight = 1440;
        useDirectPixels = true;
        break;
      case '4k':
        desiredWidth = 3840;
        desiredHeight = 2160;
        useDirectPixels = true;
        break;
      case 'native':
        desiredWidth = windowWidth;
        desiredHeight = windowHeight;
        break;
      case 'auto':
      default:
        desiredWidth = windowWidth;
        desiredHeight = windowHeight;
        break;
    }

    let calculatedDpr = 1.0;

    if (useDirectPixels) {
      // desiredPixels / viewportPixels => effective scale
      const desiredPixels = desiredWidth * desiredHeight;
      calculatedDpr = Math.sqrt(desiredPixels / viewportPixels);
    } else {
      // Native or Auto: base on devicePixelRatio capped by preset
      calculatedDpr = deviceDpr;
    }

    // DPR clamps per preset
    let minDpr = 0.5;
    let maxDpr = 2.0;

    if (settings.preset === 'low') {
      minDpr = 0.5;
      maxDpr = 1.0;
    } else if (settings.preset === 'medium') {
      minDpr = 0.75;
      maxDpr = 1.25;
    } else if (settings.preset === 'high') {
      minDpr = 0.9;
      maxDpr = 2.0;
    } else if (settings.preset === 'ultra') {
      minDpr = 1.0;
      maxDpr = 2.0;
    }

    const customScale = settings.renderScale || 1.0;
    const finalRawDpr = calculatedDpr * customScale * this.dynamicScaleMultiplier;
    const finalDpr = Math.max(minDpr, Math.min(maxDpr, finalRawDpr));

    return {
      width: Math.round(windowWidth),
      height: Math.round(windowHeight),
      dpr: Math.round(finalDpr * 100) / 100,
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

    if (this.runtime.renderPipeline) {
      this.runtime.renderPipeline.updateSettings(settings, winW, winH);
    }
  }

  public trackFrameTime(totalFrameMs: number, renderMs: number, settings: GraphicsSettings): void {
    if (!settings.dynamicResolution) {
      if (this.dynamicScaleMultiplier !== 1.0) {
        this.dynamicScaleMultiplier = 1.0;
        this.updateQualitySettings(settings);
      }
      this.isCpuBound = false;
      this.isGpuBound = false;
      return;
    }

    this.lastFrameTimesMs.push(totalFrameMs);
    this.lastRenderTimesMs.push(renderMs);
    if (this.lastFrameTimesMs.length > this.frameTimeWindowSize) {
      this.lastFrameTimesMs.shift();
      this.lastRenderTimesMs.shift();
    }

    const now = performance.now();
    if (now - this.lastEvaluationTime < this.evaluationIntervalMs) return;
    this.lastEvaluationTime = now;

    if (this.lastFrameTimesMs.length < 15) return;

    const avgTotal = this.lastFrameTimesMs.reduce((a, b) => a + b, 0) / this.lastFrameTimesMs.length;
    const avgRender = this.lastRenderTimesMs.reduce((a, b) => a + b, 0) / this.lastRenderTimesMs.length;
    const cpuSimMs = Math.max(0, avgTotal - avgRender);
    const targetFps = settings.targetFps || 60;
    const targetBudgetMs = 1000 / targetFps;

    // Accurate CPU vs GPU bottleneck categorization
    // If CPU simulation dominates total time, reducing render scale does not fix FPS and harms visuals
    this.isCpuBound = avgTotal > targetBudgetMs * 1.08 && (cpuSimMs > avgRender * 1.15 || cpuSimMs > targetBudgetMs * 0.45);
    this.isGpuBound = avgRender > targetBudgetMs * 0.70 && avgRender >= cpuSimMs;

    // Update hysteresis streak counters
    if (avgTotal > targetBudgetMs * 1.12 && this.isGpuBound && !this.isCpuBound) {
      this.consecutiveGpuStressCycles++;
      this.consecutiveHeadroomCycles = 0;
    } else if (avgTotal < targetBudgetMs * 0.82 && avgRender < targetBudgetMs * 0.52 && this.dynamicScaleMultiplier < 1.0) {
      this.consecutiveHeadroomCycles++;
      this.consecutiveGpuStressCycles = 0;
    } else {
      this.consecutiveGpuStressCycles = Math.max(0, this.consecutiveGpuStressCycles - 1);
      this.consecutiveHeadroomCycles = Math.max(0, this.consecutiveHeadroomCycles - 1);
    }

    // Cooldown check to prevent rapid flickering / oscillation
    if (now - this.lastScaleChangeTime < this.cooldownMs) return;

    let scaleDelta = 0;

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
