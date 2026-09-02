// Ecosystem Manager 2.0: Dynamic Living World, Ecosystem Equilibrium & Wildlife Simulation
import { EntityState } from '../../types';
import { CREATURE_REGISTRY, CreatureDef } from './CreatureRegistry';
import { LivestockSystem } from '../systems/LivestockSystem';

export interface EcosystemRegionState {
  biomeCategory: string;
  currentPopulation: number;
  targetPopulation: number;
  maxCap: number;
  lastSpawnTime: number;
}

export type EcosystemEventType = 'NONE' | 'GREAT_MIGRATION' | 'PREDATOR_SURGE' | 'CRYSTAL_SWARM' | 'FISH_RUN';

export class EcosystemManager {
  public static tickTimer: number = 0;
  public static readonly TICK_INTERVAL: number = 2.0; // 2.0 seconds low-frequency tick
  public static activeEvent: EcosystemEventType = 'NONE';
  public static eventTimer: number = 0;
  public static totalWildPopulation: number = 0;
  public static totalTamedPopulation: number = 0;

  private static regionMap: Map<string, EcosystemRegionState> = new Map();

  // Low-frequency ecosystem tick
  public static update(
    deltaTime: number,
    entities: Map<string, { state: EntityState; mesh: any }>,
    playerPos: [number, number, number],
    timeOfDay: number, // 0 to 1
    isRaining: boolean,
    anomalyActive: boolean,
    spawnCallback: (type: string, pos: [number, number, number], isBaby?: boolean) => void,
    despawnCallback: (id: string) => void
  ): void {
    this.tickTimer += deltaTime;

    // Handle event timers
    if (this.activeEvent !== 'NONE') {
      this.eventTimer -= deltaTime;
      if (this.eventTimer <= 0) {
        this.activeEvent = 'NONE';
      }
    } else {
      // Small chance to trigger ecosystem event every 5 minutes
      if (Math.random() < 0.001) {
        this.triggerRandomEvent();
      }
    }

    // Only process ecosystem logic on tick intervals
    if (this.tickTimer < this.TICK_INTERVAL) return;
    this.tickTimer = 0;

    // 1. Calculate populations & partition by distance
    let wildCount = 0;
    let tamedCount = 0;
    const wildEntities: EntityState[] = [];
    const tamedEntities: EntityState[] = [];

    entities.forEach(({ state, mesh }, id) => {
      if (state.isTamed) {
        tamedCount++;
        tamedEntities.push(state);
      } else {
        wildCount++;
        wildEntities.push(state);

        // Distance throttling & despawning for far wild entities (> 72 blocks)
        const dx = state.position[0] - playerPos[0];
        const dz = state.position[2] - playerPos[2];
        const distSq = dx * dx + dz * dz;

        if (distSq > 72 * 72 && !state.isBoss && !state.isTamed) {
          despawnCallback(id);
        }
      }
    });

    this.totalWildPopulation = wildCount;
    this.totalTamedPopulation = tamedCount;

    // 2. Process Predator/Prey Spatial AI Logic
    this.processPredatorPreyDynamics(wildEntities, timeOfDay, anomalyActive);

    // 3. Process Herd Cohesion & Pack Behaviors
    this.processGroupCohesion(wildEntities);

    // 4. Process Weather & Time Activity Adjustments
    this.processWeatherAndTimeBehavior(wildEntities, timeOfDay, isRaining);

    // 5. Dynamic Ecosystem Spawning (Maintain biome caps, min distance >= 24 blocks)
    if (wildCount < 20) {
      this.attemptNaturalSpawning(playerPos, timeOfDay, isRaining, anomalyActive, spawnCallback);
    }

    // 6. Livestock Item Production
    const nowSec = Math.floor(Date.now() / 1000);
    const prodResults = LivestockSystem.processLivestockProduction(tamedEntities, nowSec);
    // (Outputs can be collected by player or item funnels)
  }

  // Spatial predator/prey targeting and fleeing
  private static processPredatorPreyDynamics(
    wildEntities: EntityState[],
    timeOfDay: number,
    anomalyActive: boolean
  ): void {
    const isNight = timeOfDay < 0.25 || timeOfDay > 0.75;

    for (let i = 0; i < wildEntities.length; i++) {
      const eA = wildEntities[i];
      const defA = CREATURE_REGISTRY[eA.type];
      if (!defA) continue;

      // Predators search for prey
      if (defA.role === 'PREDATOR') {
        // Nocturnal predators are more aggressive at night
        if (defA.activity === 'nocturnal' && !isNight && !anomalyActive) continue;

        for (let j = 0; j < wildEntities.length; j++) {
          if (i === j) continue;
          const eB = wildEntities[j];
          if (defA.predatorTargets?.includes(eB.type)) {
            const dx = eB.position[0] - eA.position[0];
            const dz = eB.position[2] - eA.position[2];
            const distSq = dx * dx + dz * dz;

            if (distSq < 16 * 16) {
              // Predator targets prey!
              eA.aiState = 'chase';
              eA.targetEntityId = eB.id;

              // Prey flees!
              const defB = CREATURE_REGISTRY[eB.type];
              if (defB && (distSq < (defB.fearRadius || 10) * (defB.fearRadius || 10))) {
                eB.aiState = 'flee';
              }
              break;
            }
          }
        }
      }
    }
  }

  // Group cohesion for herds and packs
  private static processGroupCohesion(wildEntities: EntityState[]): void {
    const groups: Map<string, EntityState[]> = new Map();

    for (const e of wildEntities) {
      if (!groups.has(e.type)) groups.set(e.type, []);
      groups.get(e.type)!.push(e);
    }

    groups.forEach((members, type) => {
      if (members.length < 2) return;

      // Calculate group center of mass
      let cx = 0, cz = 0;
      members.forEach(m => {
        cx += m.position[0];
        cz += m.position[2];
      });
      cx /= members.length;
      cz /= members.length;

      // Guide group members towards center if straying
      members.forEach(m => {
        if (m.aiState === 'idle' || m.aiState === 'wander') {
          const dx = cx - m.position[0];
          const dz = cz - m.position[2];
          if (dx * dx + dz * dz > 20 * 20) {
            m.aiState = 'wander';
          }
        }
      });
    });
  }

  // Weather & Time schedule adaptations
  private static processWeatherAndTimeBehavior(
    wildEntities: EntityState[],
    timeOfDay: number,
    isRaining: boolean
  ): void {
    const isNight = timeOfDay < 0.2 || timeOfDay > 0.8;

    for (const e of wildEntities) {
      const def = CREATURE_REGISTRY[e.type];
      if (!def) continue;

      if (def.activity === 'diurnal' && isNight) {
        // Sleep during night
        e.aiState = 'sleep';
      } else if (def.activity === 'nocturnal' && !isNight) {
        // Sleep or hide during day
        e.aiState = 'sleep';
      } else if (isRaining && def.role === 'DOMESTIC') {
        // Seek cover / slow down in rain
        if (e.aiState === 'idle' || e.aiState === 'wander') {
          e.aiState = 'idle';
        }
      } else if (e.aiState === 'sleep') {
        e.aiState = 'idle';
      }
    }
  }

  // Attempt natural spawning around player at valid distance (24 to 52 blocks)
  private static attemptNaturalSpawning(
    playerPos: [number, number, number],
    timeOfDay: number,
    isRaining: boolean,
    anomalyActive: boolean,
    spawnCallback: (type: string, pos: [number, number, number]) => void
  ): void {
    const angle = Math.random() * Math.PI * 2;
    const distance = 24.0 + Math.random() * 28.0; // Never directly in front of player
    const spawnX = Math.floor(playerPos[0] + Math.cos(angle) * distance);
    const spawnZ = Math.floor(playerPos[2] + Math.sin(angle) * distance);
    const spawnY = playerPos[1]; // Height adjusted by ground collision

    // Select candidate creature based on time & anomaly
    const keys = Object.keys(CREATURE_REGISTRY);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    const def = CREATURE_REGISTRY[randomKey];

    if (!def) return;

    if (anomalyActive && Math.random() < 0.5) {
      spawnCallback('void_lynx', [spawnX, spawnY, spawnZ]);
      return;
    }

    if (this.activeEvent === 'PREDATOR_SURGE' && Math.random() < 0.7) {
      spawnCallback('shadow_wolf', [spawnX, spawnY, spawnZ]);
      return;
    }

    if (this.activeEvent === 'CRYSTAL_SWARM' && Math.random() < 0.8) {
      spawnCallback('crystal_bee', [spawnX, spawnY, spawnZ]);
      return;
    }

    spawnCallback(def.id, [spawnX, spawnY, spawnZ]);
  }

  // Trigger world ecosystem events
  public static triggerRandomEvent(): void {
    const events: EcosystemEventType[] = ['GREAT_MIGRATION', 'PREDATOR_SURGE', 'CRYSTAL_SWARM', 'FISH_RUN'];
    this.activeEvent = events[Math.floor(Math.random() * events.length)];
    this.eventTimer = 180.0; // 3 minutes event duration
  }
}
