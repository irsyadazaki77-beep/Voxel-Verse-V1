// Creature Rig & Animation Architecture 3.0
import * as THREE from 'three';

export type CreatureLocomotionType =
  | 'quadruped'
  | 'biped'
  | 'flying'
  | 'aquatic'
  | 'aberration'
  | 'boss_golem'
  | 'boss_sovereign';

export type CreatureAnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'flee'
  | 'attack'
  | 'hit'
  | 'stagger'
  | 'death'
  | 'sleep'
  | 'graze'
  | 'fly'
  | 'swim';

export interface CreatureRig {
  modelType: string;
  locomotion: CreatureLocomotionType;
  root: THREE.Group;
  torso: THREE.Group;
  head?: THREE.Object3D;
  
  // Limbs
  legFL?: THREE.Object3D; // Front Left
  legFR?: THREE.Object3D; // Front Right
  legBL?: THREE.Object3D; // Back Left
  legBR?: THREE.Object3D; // Back Right
  
  // Biped Arms & Legs
  armL?: THREE.Object3D;
  armR?: THREE.Object3D;
  legL?: THREE.Object3D;
  legR?: THREE.Object3D;
  
  // Flying & Aquatic
  wingL?: THREE.Object3D;
  wingR?: THREE.Object3D;
  tail?: THREE.Object3D;
  
  // Aberration & Boss Attachments
  core?: THREE.Object3D;
  crown?: THREE.Object3D;
  runes?: THREE.Object3D[];
  shards?: THREE.Object3D[];

  // Grounding
  contactShadow?: THREE.Mesh;
  shadowBaseScale: number;

  // Animation & Dynamics State
  animPhase: number;
  variantIndex: number;
  grazeTimer?: number;
  isGrazing?: boolean;
  attackWindupProgress?: number; // 0..1
  flinchTimer?: number; // seconds
  staggerTimer?: number; // seconds
  hitFlashTimer?: number;
  hitFlashType?: 'none' | 'normal' | 'crit';

  // Cached initial transforms for clean relative offsets
  initialHeadPos?: THREE.Vector3;
  initialTorsoPos?: THREE.Vector3;

  // Mesh to original material mapping for zero-allocation hit flash
  originalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
}
