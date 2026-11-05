import * as THREE from 'three';
import { GameRuntime } from '../core/GameRuntime';
import { GraphicsSettings } from '../ui/SettingsManager';

export type DevicePerformanceProfile =
  | 'desktop_high'
  | 'laptop_balanced'
  | 'mobile_touch'
  | 'software_webgl';

export class RenderQualityManager {
  private runtime: GameRuntime;

  public currentResolution = { width: 0, height: 0 };
  public targetResolution = { width: 0, height: 0 };
  public currentDpr = 1.0;
  public dynamicScaleMultiplier = 1.0;

  // Multi-Stage Smart Quality Governor state
  public deviceProfile: DevicePerformanceProfile = 'desktop_high';
  public qualityStage: 0 | 1 | 2 | 3 = 0;
  public shadowCadence: number = 3;

  // Profiler state
  public isCpuBound = false;
  public isGpuBound = false;

  public get scale(): number {
    return this.dynamicScaleMultiplier;
  }

  public get state(): {
    bottleneck: 'CPU' | 'GPU' | 'BALANCED';
    qualityStage: number;
    deviceProfile: DevicePerformanceProfile;
  } {
    let bottleneck: 'CPU' | 'GPU' | 'BALANCED' = 'BALANCED';
    if (this.isGpuBound) bottleneck = 'GPU';
    else if (this.isCpuBound) bottleneck = 'CPU';
    return {
      bottleneck,
      qualityStage: this.qualityStage,
      deviceProfile: this.deviceProfile,
    };
  }

  // Zero-GC fixed-size Float32Array ring buffers for frame & render times
  private readonly frameTimeWindowSize = 30;
  private readonly frameTimesRing = new Float32Array(30);
  private readonly renderTimesRing = new Float32Array(30);
  private ringCursor = 0;
  private ringCount = 0;

  private lastScaleChangeTime = 0;
  private lastEvaluationTime = 0;
  private readonly evaluationIntervalMs = 600; // Evaluate every 600ms
  private readonly cooldownMs = 1800; // Wait 1.8s between dynamic quality transitions to prevent flickering

  // Hysteresis counters
  private consecutiveGpuStressCycles = 0;
  private consecutiveHeadroomCycles = 0;
  private readonly requiredGpuStressCycles = 2; // 2 consecutive checks (~1.2s) before stepping down stage
  private readonly requiredHeadroomCycles = 3;  // 3 consecutive checks (~1.8s) before recovering stage

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
    this.deviceProfile = this.detectDeviceProfile();
    this.shadowCadence = this.getBaseShadowCadence();
  }

  private detectDeviceProfile(): DevicePerformanceProfile {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return 'desktop_high';
    }
    if ((window as any).__voxelSoftwareRenderer) {
      return 'software_webgl';
    }
    const isTouchDevice =
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 1) ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
    if (isTouchDevice) {
      return 'mobile_touch';
    }
    const cores = navigator.hardwareConcurrency || 4;
    const deviceMem = (navigator as any).deviceMemory || 8;
    const dpr = window.devicePixelRatio || 1;
    if (cores <= 6 || deviceMem <= 4 || dpr >= 2.0) {
      return 'laptop_balanced';
    }
    return 'desktop_high';
  }

  private getBaseShadowCadence(): number {
    if (this.deviceProfile === 'software_webgl') return 6;
    if (this.deviceProfile === 'mobile_touch') return 4;
    if (this.deviceProfile === 'laptop_balanced') return 3;
    return 2;
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
      const desiredPixels = desiredWidth * desiredHeight;
      calculatedDpr = Math.sqrt(desiredPixels / viewportPixels);
    } else {
      calculatedDpr = deviceDpr;
    }

    // Device & Preset-aware DPR clamps
    let minDpr = 0.55;
    let maxDpr = 2.0;

    if (settings.preset === 'low') {
      minDpr = 0.5;
      maxDpr = 1.0;
    } else if (settings.preset === 'medium') {
      minDpr = 0.7;
      maxDpr = 1.25;
    } else if (settings.preset === 'high') {
      minDpr = 0.85;
      maxDpr = 1.75;
    } else if (settings.preset === 'ultra') {
      minDpr = 0.9;
      maxDpr = 2.0;
    }

    // Cap high-DPR mobile/Retina screens in auto mode so fill-rate never bottlenecks 60 FPS
    if (resMode === 'auto') {
      if (this.deviceProfile === 'mobile_touch') {
        maxDpr = Math.min(maxDpr, 1.25);
      } else if (this.deviceProfile === 'laptop_balanced') {
        maxDpr = Math.min(maxDpr, 1.5);
      }
    }

    const customScale = settings.renderScale || 1.0;
    const turboMultiplier = settings.turboFpsMode ? 0.92 : 1.0;
    const finalRawDpr = calculatedDpr * customScale * this.dynamicScaleMultiplier * turboMultiplier;
    const finalDpr = Math.max(minDpr, Math.min(maxDpr, finalRawDpr));

    return {
      width: Math.round(windowWidth),
      height: Math.round(windowHeight),
      dpr: Math.round(finalDpr * 100) / 100,
    };
  }

  public updateQualitySettings(settings: GraphicsSettings) {
    if (!this.runtime.renderer) return;

    if ((window as any).__voxelSoftwareRenderer) {
      this.deviceProfile = 'software_webgl';
    }

    const winW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 1080;

    const budget = this.calculatePixelBudget(settings, winW, winH);

    this.currentDpr = budget.dpr;
    this.targetResolution = { width: budget.width, height: budget.height };

    this.runtime.renderer?.setPixelRatio?.(budget.dpr);
    if (this.runtime.renderer) {
      this.runtime.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    // Sync adaptive shadow cadence with SkyEnvironment
    const effectiveCadence = settings.turboFpsMode
      ? Math.max(4, this.shadowCadence + 1)
      : this.shadowCadence;
    this.runtime.sky?.setShadowCadence(effectiveCadence);

    if (this.runtime.renderPipeline) {
      // Multi-stage Smart Quality Governor:
      // Stage 0: Full native quality
      // Stage 1: Throttled shadow cadence + reduced bloom buffer
      // Stage 2+: Sub-native DPR + boosted Contrast-Adaptive Sharpening (CAS) so edges remain razor-sharp
      const isScaledDown = this.dynamicScaleMultiplier < 0.98 || settings.turboFpsMode;
      const scaleDeficit = Math.max(0, 1.0 - this.dynamicScaleMultiplier);
      const effectiveSettings: GraphicsSettings = isScaledDown
        ? {
            ...settings,
            sharpening: true,
            sharpenStrength: Math.min(
              0.5,
              (settings.sharpenStrength ?? 0.26) +
                scaleDeficit * 0.48 +
                (settings.turboFpsMode ? 0.08 : 0)
            ),
          }
        : settings;
      this.runtime.renderPipeline.updateSettings(effectiveSettings, winW, winH);
    }
  }

  public trackFrameTime(totalFrameMs: number, renderMs: number, settings: GraphicsSettings): void {
    if (!settings.dynamicResolution) {
      if (this.dynamicScaleMultiplier !== 1.0 || this.qualityStage !== 0) {
        this.dynamicScaleMultiplier = 1.0;
        this.qualityStage = 0;
        this.shadowCadence = this.getBaseShadowCadence();
        this.updateQualitySettings(settings);
      }
      this.isCpuBound = false;
      this.isGpuBound = false;
      return;
    }

    this.frameTimesRing[this.ringCursor] = totalFrameMs;
    this.renderTimesRing[this.ringCursor] = renderMs;
    this.ringCursor = (this.ringCursor + 1) % this.frameTimeWindowSize;
    if (this.ringCount < this.frameTimeWindowSize) {
      this.ringCount++;
    }

    const now = performance.now();
    if (now - this.lastEvaluationTime < this.evaluationIntervalMs) return;
    this.lastEvaluationTime = now;

    if (this.ringCount < 15) return;

    let sumTotal = 0;
    let sumRender = 0;
    for (let i = 0; i < this.ringCount; i++) {
      sumTotal += this.frameTimesRing[i];
      sumRender += this.renderTimesRing[i];
    }
    const avgTotal = sumTotal / this.ringCount;
    const avgRender = sumRender / this.ringCount;
    const cpuSimMs = Math.max(0, avgTotal - avgRender);
    const targetFps = settings.targetFps || 60;
    const targetBudgetMs = 1000 / targetFps;

    // Accurate CPU vs GPU bottleneck categorization
    this.isCpuBound =
      avgTotal > targetBudgetMs * 1.08 &&
      (cpuSimMs > avgRender * 1.15 || cpuSimMs > targetBudgetMs * 0.45);
    this.isGpuBound = avgRender > targetBudgetMs * 0.68 && avgRender >= cpuSimMs;

    // Update hysteresis streak counters
    if (avgTotal > targetBudgetMs * 1.1 && (this.isGpuBound || avgTotal > targetBudgetMs * 1.25)) {
      this.consecutiveGpuStressCycles++;
      this.consecutiveHeadroomCycles = 0;
    } else if (
      avgTotal < targetBudgetMs * 0.82 &&
      avgRender < targetBudgetMs * 0.52 &&
      (this.dynamicScaleMultiplier < 1.0 || this.qualityStage > 0)
    ) {
      this.consecutiveHeadroomCycles++;
      this.consecutiveGpuStressCycles = 0;
    } else {
      this.consecutiveGpuStressCycles = Math.max(0, this.consecutiveGpuStressCycles - 1);
      this.consecutiveHeadroomCycles = Math.max(0, this.consecutiveHeadroomCycles - 1);
    }

    if (now - this.lastScaleChangeTime < this.cooldownMs) return;

    const baseCadence = this.getBaseShadowCadence();

    // Multi-stage step-down: first throttle shadow update cadence (Stage 1) before sacrificing pixel resolution (Stages 2-3)
    if (this.consecutiveGpuStressCycles >= this.requiredGpuStressCycles) {
      this.consecutiveGpuStressCycles = 0;

      if (this.qualityStage === 0) {
        this.qualityStage = 1;
        this.shadowCadence = Math.min(6, baseCadence + 2);
        this.lastScaleChangeTime = now;
        this.updateQualitySettings(settings);
        return;
      }

      this.qualityStage = Math.min(3, this.qualityStage + 1) as 0 | 1 | 2 | 3;
      this.shadowCadence = Math.min(6, baseCadence + this.qualityStage);

      let minScale = 0.65;
      if (settings.preset === 'ultra') minScale = 0.88;
      else if (settings.preset === 'high') minScale = 0.82;
      else if (settings.preset === 'medium') minScale = 0.74;
      else if (settings.preset === 'low') minScale = 0.62;

      const newScale = Math.max(minScale, this.dynamicScaleMultiplier - 0.05);
      if (Math.abs(newScale - this.dynamicScaleMultiplier) >= 0.015) {
        this.dynamicScaleMultiplier = newScale;
      }
      this.lastScaleChangeTime = now;
      this.updateQualitySettings(settings);
    } else if (this.consecutiveHeadroomCycles >= this.requiredHeadroomCycles) {
      this.consecutiveHeadroomCycles = 0;

      if (this.dynamicScaleMultiplier < 1.0) {
        const newScale = Math.min(1.0, this.dynamicScaleMultiplier + 0.025);
        this.dynamicScaleMultiplier = newScale;
        if (newScale >= 0.99) {
          this.dynamicScaleMultiplier = 1.0;
          this.qualityStage = 1;
        }
      } else if (this.qualityStage > 0) {
        this.qualityStage = Math.max(0, this.qualityStage - 1) as 0 | 1 | 2 | 3;
      }

      this.shadowCadence =
        this.qualityStage === 0 ? baseCadence : Math.min(6, baseCadence + this.qualityStage);
      this.lastScaleChangeTime = now;
      this.updateQualitySettings(settings);
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
