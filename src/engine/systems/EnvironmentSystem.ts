import * as THREE from 'three';
import { GameSystem } from './GameSystem';
import type { GameRuntime } from '../core/GameRuntime';

export class EnvironmentSystem implements GameSystem {
  public readonly name = 'EnvironmentSystem';
  private runtime: GameRuntime;
  private darknessTimer: number = 0;
  private eyeAdaptation: number = 0;

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
  }

  public update(deltaTime: number): void {
    const { sky, weather, clouds, particles, player, world, camera, settings } = this.runtime;
    if (!sky || !player || !world) return;

    // 1. World visual update loop (water wave animation, vegetation wind displacement uTime & frustum culling)
    world.update(deltaTime, camera);

    const biome = world.biomeManager.getBiome(player.position.x, player.position.z);
    // 2. Sync environmental states (Lightning, Biome, Weather)
    sky.update(deltaTime, player.position, biome, player.isEyesInWater, weather ? weather.weather : null);

    // Dynamic Weather updates
    if (weather) {
      weather.update(deltaTime, player.position, (biome?.temperature ?? 0) < 0);
      
      // Lightning strike temporary high-intensity illumination
      sky.lightningFlashActive = weather.isLightningFlash;
      if (weather.isLightningFlash) {
        sky.sunLight.color.setHex(0xebf3ff);
      }
    } else {
      sky.lightningFlashActive = false;
    }

    // Dynamic Tone Mapping Exposure & Lightweight Eye Adaptation
    if (this.runtime.renderer) {
      let targetExposure = 1.0;
      const isDay = sky.timeOfDay >= 7.5 && sky.timeOfDay < 16.5;
      const isSunset = sky.timeOfDay >= 16.5 && sky.timeOfDay < 19.0;
      const isNight = sky.timeOfDay < 5.0 || sky.timeOfDay >= 19.0;

      if (isDay) {
        targetExposure = 1.0; // Standard day
      } else if (isSunset) {
        targetExposure = 1.02; // Golden hour (warm bloom)
      } else if (isNight) {
        // Balanced night exposure split by weather condition
        const weatherType = weather?.weather?.type ?? 'clear';
        const weatherInt = weather?.weather?.intensity ?? 0;
        
        if (weatherType === 'storm') {
          targetExposure = 0.85 + (1.0 - weatherInt) * 0.05; // Storm night
        } else if (weatherType === 'rain' || weatherType === 'snow') {
          targetExposure = 0.90; // Overcast
        } else {
          targetExposure = 0.98; // Clear starry night
        }

        // Apply player night brightness setting (default: 1.0, range 0.8 .. 1.2)
        const userNightScale = (settings?.graphics as any)?.nightBrightness ?? 1.0;
        targetExposure *= userNightScale;
      }

      // Underground Deep Cave Exposure (controlled separately)
      if (player.position.y < 32) {
        const caveDepth = Math.min(1.0, (32 - player.position.y) / 16.0);
        targetExposure = THREE.MathUtils.lerp(targetExposure, 1.22, caveDepth);
      }

      // Eye Adaptation Engine:
      // In dark environments (night or deep canopy), human pupils dilate over 1.5-2s (+0.08 to +0.10 max)
      // Transitioning to bright environments contracts pupils quickly
      const inDarkness = isNight || player.position.y < 36;
      if (inDarkness) {
        this.darknessTimer += deltaTime;
        if (this.darknessTimer > 1.2) {
          this.eyeAdaptation = Math.min(0.09, this.eyeAdaptation + deltaTime * 0.04);
        }
      } else {
        this.darknessTimer = 0;
        this.eyeAdaptation = Math.max(0.0, this.eyeAdaptation - deltaTime * 0.12);
      }

      targetExposure += this.eyeAdaptation;

      // Flash exposure boost during lightning strikes (bounded transient)
      if (weather?.isLightningFlash) {
        targetExposure += 0.22;
      }

      // Smooth lerp exposure to target
      const curExposure = this.runtime.renderer.toneMappingExposure;
      const lerpSpeed = weather?.isLightningFlash ? 14.0 : 2.0;
      this.runtime.renderer.toneMappingExposure += (targetExposure - curExposure) * Math.min(1.0, deltaTime * lerpSpeed);
    }

    if (clouds) {
      clouds.update(deltaTime, player.position, weather ? weather.weather : { type: 'clear', intensity: 0, windAngle: 0.5, windSpeed: 2.0, durationLeft: 0 }, sky.timeOfDay);
    }
    if (particles) {
      if (player.isEyesInWater) {
        particles.spawnUnderwaterBubbles(player.position);
      }
      particles.update(deltaTime, player.position);
    }
  }

  public dispose(): void {
    // cleanups
  }
}
