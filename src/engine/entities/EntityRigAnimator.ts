// Entity Rig Animator 3.0
// High-performance procedural hierarchical animation with LOD, gait physics, attack wind-up telegraphs, and per-instance hit feedback
import * as THREE from 'three';
import { CreatureAnimationEngine } from './CreatureAnimationEngine';
import { CreatureRig, CreatureLocomotionType, CreatureAnimState } from './CreatureRigTypes';
import { EntityState } from '../../types';

export {
  CreatureAnimationEngine,
  type CreatureRig,
  type CreatureLocomotionType,
  type CreatureAnimState
};

export class EntityRigAnimator extends CreatureAnimationEngine {
  /**
   * Alias for CreatureAnimationEngine.update
   */
  public static animateRig(
    dt: number,
    rig: CreatureRig,
    entityState: EntityState,
    distToPlayerSq: number = 0,
    frameCount: number = 0
  ): void {
    CreatureAnimationEngine.update(dt, rig, entityState, distToPlayerSq, frameCount);
  }
}

export default EntityRigAnimator;
