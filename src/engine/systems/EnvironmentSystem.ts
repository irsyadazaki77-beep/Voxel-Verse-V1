import * as THREE from 'three';
import { GameSystem } from './GameSystem';
import type { GameRuntime } from '../core/GameRuntime';
import { WorldEventManager } from '../events/WorldEventManager';
import { MaritimeVesselSystem } from './MaritimeVesselSystem';
import { MahakaryaNusantaraSystem } from './MahakaryaNusantaraSystem';

export class EnvironmentSystem implements GameSystem {
  public readonly name = 'EnvironmentSystem';
  private runtime: GameRuntime;
  private darknessTimer: number = 0;
  private eyeAdaptation: number = 0;
  private ambientMoteTimer: number = 0;
  private static readonly _tmpAtmosVec = new THREE.Vector3();

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
  }

  public update(deltaTime: number): void {
    const { sky, weather, clouds, particles, player, world, camera, settings } = this.runtime;
    if (!sky || !player || !world) return;

    const biome = world.biomeManager.getBiome(player.position.x, player.position.z);
    const region = world.biomeManager.getRegionManager ? world.biomeManager.getRegionManager().getDominantRegion(player.position.x, player.position.z) : null;
    // 2. Sync environmental states (Lightning, Biome, Weather, Cultural Region)
    sky.update(deltaTime, player.position, biome, player.isEyesInWater, weather ? weather.weather : null, region?.id);

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

    // 1. World visual update loop with Environment 4.0 Telemetry
    const wQuality = (settings?.graphics?.waterQuality === 'ultra') ? 3
      : (settings?.graphics?.waterQuality === 'high') ? 2
      : (settings?.graphics?.waterQuality === 'low') ? 0
      : 1;

    world.update(deltaTime, camera, {
      waterBaseColor: sky.currentWaterBaseColor,
      waterDeepColor: sky.currentWaterDeepColor,
      skyZenithColor: sky.currentSkyZenithColor,
      skyHorizonColor: sky.currentSkyHorizonColor,
      sunDirection: sky.currentSunDirection,
      sunColor: sky.currentSunColor,
      moonDirection: sky.currentMoonDirection,
      moonColor: sky.currentMoonColor,
      rainIntensity: weather ? weather.weather.intensity : 0,
      waterQuality: wQuality,
      cloudDrift: clouds ? clouds.cloudDrift : 0,
    });

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

      // Extreme Weather Event atmospheric exposure tuning
      if (MahakaryaNusantaraSystem.weatherEventId === 'VOLCANIC_ERUPTION') {
        targetExposure += 0.06;
      } else if (MahakaryaNusantaraSystem.weatherEventId === 'EQUATORIAL_THUNDERSTORM') {
        targetExposure -= 0.05;
      }

      // Smooth damp exposure to target
      const curExposure = this.runtime.renderer.toneMappingExposure;
      const dampLambda = weather?.isLightningFlash ? 14.0 : 2.5;
      this.runtime.renderer.toneMappingExposure = THREE.MathUtils.damp(curExposure, targetExposure, dampLambda, deltaTime);
    }

    if (clouds) {
      clouds.update(
        deltaTime,
        player.position,
        weather ? weather.weather : { type: 'clear', intensity: 0, windAngle: 0.5, windSpeed: 2.0, durationLeft: 0 },
        sky.timeOfDay,
        sky.currentSunDirection
      );
    }
    if (particles) {
      if (player.isEyesInWater) {
        particles.spawnUnderwaterBubbles(player.position);
      }

      // Maritime Vessel & Swimming Water Foam Spray
      if (MaritimeVesselSystem.activeVesselId && Math.random() < deltaTime * 6.0) {
        particles.spawnWaterFoamSpray(player.position);
      }

      // VoxelVerse v5.0.0: Contextual Nature Particles (Kunang-Kunang Malam, Debu Cahaya Fajar/Senja & Serpihan Daun Bioma)
      this.ambientMoteTimer += deltaTime;
      if (this.ambientMoteTimer >= 0.36 && !player.isEyesInWater && (this.runtime.currentFps || 60) >= 42) {
        this.ambientMoteTimer = 0;
        const tod = sky.timeOfDay;
        const isNightFireflyHours = tod >= 19.0 || tod <= 5.0;
        const isGoldenHour = (tod >= 5.2 && tod <= 8.0) || (tod >= 16.0 && tod <= 19.0);
        const weatherClear = !weather || weather.weather.type === 'clear' || weather.weather.type === 'rimba_mist';

        if (weatherClear && (isNightFireflyHours || isGoldenHour)) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 3.0 + Math.random() * 10.5;
          EnvironmentSystem._tmpAtmosVec.set(
            player.position.x + Math.cos(angle) * dist,
            player.position.y + 0.5 + Math.random() * 2.8,
            player.position.z + Math.sin(angle) * dist
          );
          particles.spawnFireflyOrSunMote(EnvironmentSystem._tmpAtmosVec, isNightFireflyHours);
        }

        // Biome-specific drifting foliage, volcanic ash, or sacred Subak spores
        const biomeId = (biome?.id || '').toLowerCase();
        const regionId = (region?.id || '').toLowerCase();
        if (biomeId.includes('volcan') || biomeId.includes('lava')) {
          particles.spawnBiomeFoliageDrift(player.position, 'embers', 3.0);
        } else if (regionId === 'bali' || biomeId.includes('crystal')) {
          particles.spawnBiomeFoliageDrift(player.position, 'spores', 2.0);
        } else if (biomeId.includes('forest') || regionId === 'jawa' || regionId === 'minang' || regionId === 'borneo') {
          particles.spawnBiomeFoliageDrift(player.position, 'leaves', 2.2);
        } else if (biomeId.includes('desert') || regionId === 'nusa') {
          particles.spawnBiomeFoliageDrift(player.position, 'sand', 3.2);
        }
      }

      particles.update(deltaTime, player.position);
    }

    // Adaptive Gamelan Nusantara Music Director
    if (this.runtime.audio) {
      this.runtime.audio.updateAmbientGamelan(deltaTime, {
        biomeName: biome?.name || 'Emerald Highlands',
        timeOfDay: sky.timeOfDay,
        isCombatOrCataclysm:
          !!WorldEventManager.activeEvent ||
          !!this.runtime.activeBoss ||
          MahakaryaNusantaraSystem.weatherEventId === 'VOLCANIC_ERUPTION' ||
          MahakaryaNusantaraSystem.arenaActive,
        isUnderwater: player.isEyesInWater,
        isSailing: !!MaritimeVesselSystem.activeVesselId,
      });
    }
  }

  public dispose(): void {
    // cleanups
  }
}
