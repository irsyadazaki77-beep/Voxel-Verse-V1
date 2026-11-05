import { GameSystem } from './GameSystem';
import type { GameRuntime } from '../core/GameRuntime';
import { TelemetryStore, TelemetryData } from '../ui/TelemetryStore';
import { ITEM_DEFS } from '../items/ItemRegistry';
import { ItemStack, EntityState } from '../../types';
import { FishingSystem } from './FishingSystem';
import { LivestockSystem } from './LivestockSystem';
import { MaritimeVesselSystem } from './MaritimeVesselSystem';
import { VernacularHologramSystem } from './VernacularHologramSystem';
import { TreasureMapSystem } from '../exploration/TreasureMapSystem';
import { WorldEventManager } from '../events/WorldEventManager';
import { AerialFlightAndSiegeSystem } from './AerialFlightAndSiegeSystem';
import { NusantaraSanctumSilatSubakSystem } from './NusantaraSanctumSilatSubakSystem';
import { MahakaryaNusantaraSystem } from './MahakaryaNusantaraSystem';

export class TelemetrySystem implements GameSystem {
  public readonly name = 'TelemetrySystem';
  private runtime: GameRuntime;
  private telemetryTimer: number = 0;
  private readonly telemetryInterval: number = 0.08; // 80ms responsive telemetry for fishing & combat HUD
  private readonly maxFrameSamples: number = 60;
  private readonly frameTimesRing = new Float32Array(60);
  private frameRingCursor: number = 0;
  private frameRingCount: number = 0;

  constructor(runtime: GameRuntime) {
    this.runtime = runtime;
  }

  public update(deltaTime: number): void {
    const frameMs = Math.max(1, deltaTime * 1000);
    this.frameTimesRing[this.frameRingCursor] = frameMs;
    this.frameRingCursor = (this.frameRingCursor + 1) % this.maxFrameSamples;
    if (this.frameRingCount < this.maxFrameSamples) {
      this.frameRingCount++;
    }

    this.telemetryTimer += deltaTime;
    if (this.telemetryTimer >= this.telemetryInterval) {
      this.updateTelemetry(deltaTime);
      this.telemetryTimer = 0;
    }
  }

  private calculate1PctLowFps(): number {
    if (this.frameRingCount < 5) return this.runtime.currentFps || 60;
    // Zero-allocation O(N) scan for worst and second-worst frame times (p98/p99 over 60 samples)
    let worstMs = 0;
    let secondWorstMs = 0;
    for (let i = 0; i < this.frameRingCount; i++) {
      const ms = this.frameTimesRing[i];
      if (ms >= worstMs) {
        secondWorstMs = worstMs;
        worstMs = ms;
      } else if (ms > secondWorstMs) {
        secondWorstMs = ms;
      }
    }
    const p99FrameMs = this.frameRingCount >= 40 ? secondWorstMs : worstMs;
    return p99FrameMs > 0 ? Math.round(1000 / p99FrameMs) : 60;
  }

  private resolveTrackedCreature(): TelemetryData['targetedCreature'] {
    const { interactionSystem, entities, player } = this.runtime;
    if (!entities || !player) return null;

    let targetEnt: EntityState | null = interactionSystem?.currentTargetedEntity || null;

    // If not directly aiming at an entity, check if player is mounted or within 5m of a tamed companion
    if (!targetEnt && player.mountedEntityId) {
      targetEnt = entities.entities.get(player.mountedEntityId)?.state || null;
    }
    if (!targetEnt) {
      let nearestDistSq = 5.5 * 5.5;
      entities.entities.forEach((entry) => {
        if (entry.state.isTamed && entry.state.health > 0) {
          const dx = entry.state.position[0] - player.position.x;
          const dy = entry.state.position[1] - player.position.y;
          const dz = entry.state.position[2] - player.position.z;
          const dSq = dx * dx + dy * dy + dz * dz;
          if (dSq < nearestDistSq) {
            nearestDistSq = dSq;
            targetEnt = entry.state;
          }
        }
      });
    }

    if (!targetEnt || targetEnt.type === 'npc' || targetEnt.type === 'boss' || targetEnt.isBoss) {
      return null;
    }

    const cDef = LivestockSystem.resolveCreatureDef(targetEnt);
    if (!cDef) return null;

    return {
      id: targetEnt.id,
      name: targetEnt.name || cDef.name,
      health: Math.max(0, Math.round(targetEnt.health)),
      maxHealth: Math.max(1, Math.round(targetEnt.maxHealth)),
      trustMeter: Math.round(targetEnt.trustMeter ?? (targetEnt.isTamed ? 100 : 0)),
      isTamed: !!targetEnt.isTamed,
      command: targetEnt.command || 'FOLLOW',
      canMount: LivestockSystem.canMount(targetEnt),
      isMounted: player.mountedEntityId === targetEnt.id,
      preferredFoodHint:
        cDef.diet === 'CARNIVORE' || cDef.diet === 'AETHER_FEEDER'
          ? 'Daging Panggang / Kristal Aether'
          : 'Gandum / Wortel / Beras Wangi',
    };
  }

  private updateTelemetry(deltaTime: number): void {
    const { world, player, stats, sky, weather, equipment, activeHotbarIndex, inventory, combatSystem, interactionSystem, renderer, renderQualityManager, entities, particles } = this.runtime;
    if (!world || !player || !stats || !renderer) return;

    const currentBiome = world.biomeManager.getBiome(player.position.x, player.position.z);
    const armorDefense = (Object.values(equipment) as (ItemStack | null)[]).reduce((sum, item) => {
      if (!item) return sum;
      const def = ITEM_DEFS[item.itemId];
      return sum + (def?.armorValue || 0) + (item.modifiers?.defenseBonus || 0);
    }, 0);

    const activeItem = inventory[activeHotbarIndex];
    const bowChargeRatio = activeItem?.itemId === 'hunting_bow' ? combatSystem?.combatMachine?.bowDrawProgress ?? 0 : 0;
    const breakProgress = interactionSystem?.miningState?.progress ?? 0;

    const fpsLow1Pct = this.calculate1PctLowFps();
    const dynamicScale = renderQualityManager ? Math.round(renderQualityManager.scale * 100) / 100 : 1.0;
    const bottleneck = renderQualityManager ? renderQualityManager.state.bottleneck : 'BALANCED';
    const activeEntities = entities ? entities.getActiveEntityCount() : 0;
    const activeParticles = particles ? particles.getActiveParticleCount() : 0;

    TelemetryStore.update({
      health: Math.round(stats.health * 10) / 10,
      maxHealth: stats.maxHealth,
      stamina: Math.round(stats.stamina),
      maxStamina: stats.maxStamina,
      hunger: Math.round(stats.hunger * 10) / 10,
      maxHunger: stats.maxHunger,
      saturation: Math.round(stats.saturation * 10) / 10,
      temperature: Math.round(stats.temperature * 10) / 10,
      defenseRating: armorDefense,
      oxygen: Math.round(stats.oxygen),
      maxOxygen: stats.maxOxygen,
      level: stats.level,
      xp: stats.xp,
      biomeName: currentBiome.name,
      culturalRegionName: world.regionManager ? world.regionManager.getDominantRegion(player.position.x, player.position.z)?.displayName : 'Unknown',
      playerPos: [
        Math.round(player.position.x * 10) / 10,
        Math.round(player.position.y * 10) / 10,
        Math.round(player.position.z * 10) / 10,
      ],
      playerYaw: Math.round(player.yaw * 100) / 100,
      fps: this.runtime.currentFps || 60,
      loadedChunks: world.chunks.size,
      profilerMetrics: {
        ...world.scheduler.metrics,
        frameTimeMs: Math.round(deltaTime * 10000) / 10,
        simTimeMs: Math.round((this.runtime.lastSimTimeMs || 0) * 10) / 10,
        renderTimeMs: Math.round((this.runtime.lastRenderTimeMs || 0) * 10) / 10,
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        memoryEst: (performance as any).memory ? Math.round((performance as any).memory.usedJSHeapSize / 104857.6) / 10 : 0,
        fpsLow1Pct,
        dynamicScale,
        bottleneck,
        activeEntities,
        activeParticles,
        sunIntensity: sky?.sunLight.intensity || 0,
        ambientIntensity: sky?.ambientLight.intensity || 0,
        hemiIntensity: sky?.hemiLight.intensity || 0,
        exposure: renderer.toneMappingExposure,
      },
      timeOfDay: sky ? Math.round(sky.timeOfDay * 100) / 100 : 8.0,
      weatherType: weather ? weather.weather.type : 'clear',
      breakProgress: Math.round(breakProgress * 100) / 100,
      bowChargeRatio: Math.round(bowChargeRatio * 100) / 100,
      fishingState: FishingSystem.state,
      fishingTension: Math.round(FishingSystem.tension * 100),
      fishingProgress: Math.round(FishingSystem.reelProgress * 100),
      mountedCreatureName: player.mountedCreatureName,
      targetedCreature: this.resolveTrackedCreature(),
      activeVessel: MaritimeVesselSystem.getPilotedVesselTelemetry(player),
      activeCataclysm: WorldEventManager.activeEvent
        ? {
            type: WorldEventManager.activeEvent.type,
            name: WorldEventManager.getEventDisplayName(WorldEventManager.activeEvent.type),
            remainingSeconds: Math.max(
              0,
              Math.ceil(WorldEventManager.activeEvent.duration - WorldEventManager.activeEvent.elapsed)
            ),
            durationSeconds: Math.max(1, Math.round(WorldEventManager.activeEvent.duration)),
            intensity: WorldEventManager.activeEvent.intensity,
          }
        : null,
      activeHologram:
        activeItem?.itemId === 'lontar_arsitek_nusantara'
          ? (() => {
              const tpl = VernacularHologramSystem.getActiveTemplate();
              return {
                id: tpl.id,
                name: tpl.name,
                region: tpl.region,
                dimensions: tpl.dimensions,
                rotationDeg: (VernacularHologramSystem.rotationSteps * 90) % 360,
                blockCount: tpl.blocks.length,
              };
            })()
          : null,
      activeTreasureHint:
        activeItem?.itemId === 'prasasti_harta_nusantara'
          ? (() => {
              const maps = TreasureMapSystem.getMaps();
              for (const m of maps) {
                if (!m.isDeciphered) {
                  TreasureMapSystem.decipherMap(m.id);
                  break;
                }
              }
              return TreasureMapSystem.getProximityHint(player.position);
            })()
          : null,
      activeAerialFlight:
        AerialFlightAndSiegeSystem.mode !== 'none'
          ? {
              mode: AerialFlightAndSiegeSystem.mode,
              altitude: AerialFlightAndSiegeSystem.altitude,
              inThermalUpdraft: AerialFlightAndSiegeSystem.inThermalUpdraft,
              speed: Math.round(Math.hypot(player.velocity.x, player.velocity.z) * 10) / 10,
            }
          : null,
      activeVillageSiege:
        AerialFlightAndSiegeSystem.siege.active || AerialFlightAndSiegeSystem.siege.festivalActive
          ? {
              active: AerialFlightAndSiegeSystem.siege.active,
              festivalActive: AerialFlightAndSiegeSystem.siege.festivalActive,
              settlementName: AerialFlightAndSiegeSystem.siege.settlementName,
              wave: AerialFlightAndSiegeSystem.siege.wave,
              maxWaves: AerialFlightAndSiegeSystem.siege.maxWaves,
              villageIntegrity: Math.round(AerialFlightAndSiegeSystem.siege.villageIntegrity),
              invadersRemaining: AerialFlightAndSiegeSystem.siege.spawnedEnemyIds.size,
              festivalTimer: Math.ceil(AerialFlightAndSiegeSystem.siege.festivalTimer),
            }
          : null,
      nusantaraV46: NusantaraSanctumSilatSubakSystem.getTelemetry(entities),
      mahakaryaV48: MahakaryaNusantaraSystem.getTelemetry(player.position),
    });
  }

  public dispose(): void {
    // cleanups
  }
}
