// Sentinel Turret Engine - Base Defense & Hostile Mob Targeting System
import { EntityManager } from '../entities/EntityManager';
import { AetherNode } from './AetherNetworkTypes';

export class SentinelTurretEngine {
  public static readonly TURRET_RANGE = 16; // blocks
  public static readonly ATTACK_COOLDOWN = 1.0; // seconds per shot
  public static readonly SHOT_DAMAGE = 25; // base damage

  public static tick(node: AetherNode, dt: number, entities: EntityManager): boolean {
    if (node.nodeType !== 'turret') return false;

    node.internalState.cooldown = Math.max(0, (node.internalState.cooldown || 0) - dt);
    if (node.internalState.cooldown > 0) return false;

    const [tx, ty, tz] = node.pos;

    // Find nearest hostile mob
    let nearestEntity: any = null;
    let minDistSq = this.TURRET_RANGE * this.TURRET_RANGE;

    entities.entities.forEach((entity) => {
      if (!entity || entity.state.health <= 0) return;

      const isHostile = entity.state.type === 'hostile' || entity.state.type === 'boss';
      if (!isHostile) return;

      const pos = entity.state.position || [0, 0, 0];
      const dx = pos[0] - tx;
      const dy = pos[1] - ty;
      const dz = pos[2] - tz;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq <= minDistSq) {
        minDistSq = distSq;
        nearestEntity = entity;
      }
    });

    if (!nearestEntity) return false;

    // Apply damage to targeted mob (dampen boss damage by 50% for balance)
    const isBoss = Boolean(nearestEntity.state.isBoss);
    const damageAmount = isBoss ? this.SHOT_DAMAGE * 0.5 : this.SHOT_DAMAGE;

    nearestEntity.takeDamage(damageAmount);
    node.internalState.cooldown = this.ATTACK_COOLDOWN;

    return true;
  }
}
