// Aether Anomaly Manager: Lifecycle, Weather Shifts, Entity Mutation & Spatial Stabilization
import { GameRuntime } from '../core/GameRuntime';
import { GameEventBus } from '../events/GameEventBus';
import { NotificationManager } from '../ui/NotificationManager';
import { SubtitleManager } from '../ui/SubtitleManager';
import { BossCombatState } from '../../types';

export class AetherAnomalyManager {
  public static status: 'dormant' | 'warning' | 'active' | 'climax' | 'resolved' = 'dormant';
  public static timer: number = 300; // Countdown between anomalies (seconds)
  public static activeIntensity: number = 0; // 0 (none) to 1 (full anomaly shift)
  public static climaxBossId: string | null = null;
  public static anomalyCoords: [number, number, number] | null = null;
  
  private static onAnomalyStateChangeCallbacks: (() => void)[] = [];

  public static initialize(): void {
    this.status = 'dormant';
    this.timer = 180; // First anomaly in 3 minutes of playtime!
    this.activeIntensity = 0;
    this.climaxBossId = null;
    this.anomalyCoords = null;
  }

  public static update(deltaTime: number, runtime: GameRuntime): void {
    if (this.status === 'dormant') {
      this.timer -= deltaTime;
      if (this.timer <= 0) {
        this.transitionTo('warning', runtime);
      }
    } else if (this.status === 'warning') {
      this.timer -= deltaTime;
      // Pulse sky color slightly (intensity climbs from 0 to 0.45)
      this.activeIntensity = Math.min(0.45, this.activeIntensity + deltaTime * 0.05);
      
      // Play a low creepy hum
      if (Math.random() < 0.02) {
        runtime.audio.playTone(80 + Math.sin(Date.now() * 0.005) * 10, 0.4);
      }

      if (this.timer <= 0) {
        this.transitionTo('active', runtime);
      }
    } else if (this.status === 'active') {
      this.timer -= deltaTime;
      // Interpolate intensity to 1.0!
      this.activeIntensity = Math.min(1.0, this.activeIntensity + deltaTime * 0.1);

      // Procedural sound cues
      if (Math.random() < 0.05) {
        runtime.audio.playTone(150 + Math.random() * 300, 0.15);
      }

      if (this.timer <= 0) {
        this.transitionTo('climax', runtime);
      }
    } else if (this.status === 'climax') {
      // Climax is active until the rift boss/sentinel is destroyed!
      this.activeIntensity = 1.0;
      
      if (this.climaxBossId) {
        // Check if the boss is dead
        const bossState = runtime.entities.entities.get(this.climaxBossId)?.state;
        if (!bossState || bossState.health <= 0) {
          this.transitionTo('resolved', runtime);
        } else {
          // Keep sync with HUD healthbar
          runtime.emitBossUpdated({
            id: this.climaxBossId,
            name: 'Aether Rift Sentinel',
            modelType: 'ruin_sentinel',
            health: bossState.health,
            maxHealth: bossState.maxHealth,
            phase: 1,
            maxPhases: 1,
            enraged: false,
            position: bossState.position
          });
        }
      } else {
        // Fallback if boss id was somehow lost/invalidated
        this.transitionTo('resolved', runtime);
      }
    } else if (this.status === 'resolved') {
      // Revert intensity back to 0
      this.activeIntensity = Math.max(0, this.activeIntensity - deltaTime * 0.2);
      if (this.activeIntensity <= 0) {
        this.status = 'dormant';
        this.timer = 400 + Math.random() * 300; // Recurrence delay
        this.notifyListeners();
      }
    }
  }

  public static transitionTo(newStatus: typeof AetherAnomalyManager.status, runtime: GameRuntime): void {
    this.status = newStatus;
    this.notifyListeners();

    if (newStatus === 'warning') {
      this.timer = 25; // 25s warning
      NotificationManager.push({
        title: 'AETHER DISTURBANCE DETECTED',
        message: 'The local leylines are vibrating violently. A portal is opening...',
        priority: 'HIGH',
        icon: '🔮',
        durationMs: 8000
      });
      SubtitleManager.push('Eldritch Voice', 'Eldritch ley whispers amplify in the wind', 'environment', 4000);
      runtime.audio.playTone(110, 0.8);
      setTimeout(() => runtime.audio.playTone(90, 0.8), 500);

    } else if (newStatus === 'active') {
      this.timer = 60; // 60s of standard active invasion
      NotificationManager.push({
        title: 'AETHER ANOMALY UNLEASHED',
        message: 'Spatial rifts tear open! Wildlife has mutated.',
        priority: 'CRITICAL',
        icon: '⚡',
        durationMs: 10000
      });
      SubtitleManager.push('SYSTEM', 'The space-time barrier fractures!', 'environment', 5000);
      
      // Mutate nearby mobs! Increase their health or speed
      Array.from(runtime.entities.entities.values()).map(e => e.state).forEach(ent => {
        if (ent.type === 'hostile' || ent.type === 'passive') {
          ent.maxHealth = Math.round(ent.maxHealth * 1.5);
          ent.health = ent.maxHealth;
          ent.damage = Math.round(ent.damage * 1.3);
          ent.name = `Mutated ${ent.name}`;
        }
      });

    } else if (newStatus === 'climax') {
      // Spawn Climax Rift Sentinel close to the player
      const pPos = runtime.player.position;
      const angle = Math.random() * Math.PI * 2;
      const rx = pPos.x + Math.cos(angle) * 16;
      const rz = pPos.z + Math.sin(angle) * 16;
      const ry = runtime.world.getSpawnHeight(rx, rz);

      this.anomalyCoords = [rx, ry, rz];

      NotificationManager.push({
        title: 'RIFT SENTINEL EMERGES',
        message: 'The Leyline Anomaly has coalesced into an Ancient Sentinel! Purge it!',
        priority: 'CRITICAL',
        icon: '👹',
        durationMs: 10000
      });
      SubtitleManager.push('SYSTEM', 'Destroy the Sentinel to stabilize the realm!', 'environment', 5000);

      // Spawn the boss!
      this.climaxBossId = runtime.entities.spawnBoss('ruin_sentinel', [rx, ry, rz], runtime.world);
      
      // Emit Boss Spawn event to register on HUD healthbar
      const bossState = runtime.entities.entities.get(this.climaxBossId!)?.state;
      if (bossState) {
        runtime.emitBossUpdated({
          id: this.climaxBossId!,
          name: 'Aether Rift Sentinel',
          modelType: 'ruin_sentinel',
          health: bossState.health,
          maxHealth: bossState.maxHealth,
          phase: 1,
          maxPhases: 1,
          enraged: false,
          position: bossState.position
        });
      }

    } else if (newStatus === 'resolved') {
      NotificationManager.push({
        title: 'AETHER ANOMALY PURGED',
        message: 'The local space-time region has stabilized. Acquired rare crystals!',
        priority: 'HIGH',
        icon: '🏆',
        durationMs: 8000
      });
      SubtitleManager.push('SYSTEM', 'The rifts close as ley energy subsides.', 'environment', 4000);

      // Reward the player!
      runtime.addItemToInventory('aether_crystal', 8);
      runtime.stats.addXP(400);

      // Small chance to reward an epic artifact if the player is lucky!
      if (Math.random() < 0.5) {
        const artifacts = ['chrono_core', 'tidal_pearl', 'solaris_aegis'];
        const chosen = artifacts[Math.floor(Math.random() * artifacts.length)];
        runtime.addItemToInventory(chosen, 1);
        GameEventBus.emit('ARTIFACT_UNLOCKED', { artifactId: chosen, name: chosen.replace('_', ' ').toUpperCase() });
      }

      // Hide Boss health HUD
      runtime.emitBossUpdated(null);
      this.climaxBossId = null;
      this.anomalyCoords = null;
    }
  }

  public static onAnomalyStateChange(cb: () => void): () => void {
    this.onAnomalyStateChangeCallbacks.push(cb);
    return () => {
      this.onAnomalyStateChangeCallbacks = this.onAnomalyStateChangeCallbacks.filter(c => c !== cb);
    };
  }

  private static notifyListeners(): void {
    this.onAnomalyStateChangeCallbacks.forEach(cb => cb());
  }
}
