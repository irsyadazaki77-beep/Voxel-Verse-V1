// Visual Coherence & Entity Rig Overhaul Integration Test Suite
import * as THREE from 'three';
import { EntityModelBuilder } from '../engine/entities/EntityModelBuilder';
import { CreatureAnimationEngine } from '../engine/entities/CreatureAnimationEngine';
import { EntityRigAnimator } from '../engine/entities/EntityRigAnimator';
import { CreatureMaterialFactory } from '../engine/entities/CreatureMaterialFactory';
import { CreatureRig } from '../engine/entities/CreatureRigTypes';
import { EntityState } from '../types';

let testCount = 0;
let passedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  testCount++;
  if (condition) {
    passedCount++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

function createMockEntity(overrides: Partial<EntityState> = {}): EntityState {
  return {
    id: 'test_entity_' + Math.random().toString(36).substring(2, 7),
    type: 'passive',
    modelType: 'stag',
    name: 'Test Entity',
    position: [0, 64, 0],
    velocity: [0, 0, 0],
    rotation: 0,
    health: 40,
    maxHealth: 40,
    damage: 0,
    speed: 1.0,
    aiState: 'idle',
    drops: [],
    ...overrides,
  };
}

export async function runVisualCoherenceOverhaulTests(): Promise<boolean> {
  console.log('====================================================');
  console.log(' VISUAL COHERENCE & ENTITY RIG OVERHAUL TEST SUITE ');
  console.log('====================================================\n');

  // 1. Model Registry & Rig Instantiation Coverage
  console.log('▶ [1/6] Testing Entity Model Builder & Rig Instantiation...');
  const modelTypesToTest = [
    'stag',
    'woolbeast',
    'grazeback',
    'shadow_wolf',
    'glowhen',
    'crystal_bee',
    'glowfin',
    'void_lynx',
    'shadow_stalker',
    'void_spitter',
    'ruin_sentinel',
    'void_sovereign',
    'merchant',
    'elder',
    'farmer',
    'fisher',
    'craftsperson',
    'guard',
    'engineer',
    'hunter',
    'boat_trader',
    'lembu_sekti',
    'singa_marapi',
    'barong_aether',
    'harimau_cindaku',
    'candi_sentinel',
    'batara_bhumi'
  ];

  for (const mType of modelTypesToTest) {
    const group = EntityModelBuilder.buildByModelType(mType, 0);
    assert(group instanceof THREE.Group, `Model ${mType} builds valid THREE.Group`);
    const rig = group.userData.rig as CreatureRig;
    assert(rig !== undefined, `Model ${mType} attaches rig to userData`);
    assert(rig.torso instanceof THREE.Group, `Model ${mType} has valid torso root`);
    assert(rig.originalMaterials instanceof Map && rig.originalMaterials.size > 0, `Model ${mType} has cached original materials`);
  }

  // 2. Locomotion & Gait Dynamic Animation Checks
  console.log('\n▶ [2/6] Testing Rig Animation & Locomotion Archetypes...');
  {
    const stag = EntityModelBuilder.buildStag(0);
    const rig = stag.userData.rig as CreatureRig;
    const movingState = createMockEntity({
      health: 40,
      maxHealth: 40,
      aiState: 'wander',
      velocity: [1.5, 0, 1.5],
    });

    const prevLegRot = rig.legFL?.rotation.x || 0;
    CreatureAnimationEngine.update(0.05, rig, movingState, 10, 1);
    const newLegRot = rig.legFL?.rotation.x || 0;
    assert(newLegRot !== prevLegRot || rig.torso.position.y !== 0, 'Quadruped gait updates limb/torso transforms');

    // Test EntityRigAnimator wrapper alias
    EntityRigAnimator.animateRig(0.05, rig, movingState, 10, 2);
    assert(rig !== null, 'EntityRigAnimator.animateRig executes cleanly without errors');
  }

  // 3. Hit Feedback, Material Swaps & Stagger Physics
  console.log('\n▶ [3/6] Testing Hit Feedback, Critical Flash & Recovery...');
  {
    const wolf = EntityModelBuilder.buildShadowWolf(0);
    const wolfRig = wolf.userData.rig as CreatureRig;
    
    // Trigger critical hit
    EntityRigAnimator.triggerHit(wolfRig, true, true);
    assert(wolfRig.hitFlashTimer > 0, 'Critical hit sets flash timer');
    assert(wolfRig.hitFlashType === 'crit', 'Flash type set to crit');
    assert(wolfRig.staggerTimer > 0, 'Stagger timer set on staggered hit');

    // Simulate recovery
    const mockState = createMockEntity({
      health: 20,
      maxHealth: 30,
      aiState: 'idle',
      velocity: [0, 0, 0],
    });

    EntityRigAnimator.update(0.3, wolfRig, mockState, 5, 10);
    assert(wolfRig.hitFlashTimer === 0, 'Hit flash recovers back to 0 after timer expiry');
    assert(wolfRig.hitFlashType === 'none', 'Hit flash type restored to none');
  }

  // 4. Boss Telegraph & Attack Dynamics
  console.log('\n▶ [4/6] Testing Boss Rig Telegraph & Special Abilities...');
  {
    const sovereign = EntityModelBuilder.buildVoidSovereign();
    const sovRig = sovereign.userData.rig as CreatureRig;
    assert(sovRig.locomotion === 'boss_sovereign', 'Void Sovereign assigns boss_sovereign locomotion');
    assert(Array.isArray(sovRig.runes) && sovRig.runes.length === 6, 'Void Sovereign spawns 6 orbit runes');

    const attackState = createMockEntity({
      health: 500,
      maxHealth: 500,
      aiState: 'attack',
      velocity: [0, 0, 0],
    });

    EntityRigAnimator.update(0.1, sovRig, attackState, 15, 20);
    assert(sovRig.attackWindupProgress !== undefined && sovRig.attackWindupProgress > 0, 'Boss attack state increments attack windup progress');
  }

  // 5. Distance LOD Execution
  console.log('\n▶ [5/6] Testing Distance LOD Animation Skipping...');
  {
    const biped = EntityModelBuilder.buildMerchant(0);
    const bipedRig = biped.userData.rig as CreatureRig;
    const idleState = createMockEntity({
      health: 100,
      maxHealth: 100,
      aiState: 'idle',
      velocity: [0, 0, 0],
    });

    // Far distance > 42m (distSq = 2000)
    // Frame not matching phase modulo will return early
    EntityRigAnimator.update(0.016, bipedRig, idleState, 2000, 3);
    assert(bipedRig.contactShadow?.visible === false || bipedRig.contactShadow === undefined, 'Far LOD disables contact shadow for performance');
  }

  // 6. Color Palette & Material Factory Determinism
  console.log('\n▶ [6/6] Testing Material Factory Palette Coherence...');
  {
    const p1 = CreatureMaterialFactory.getPalette('stag', 0);
    const p2 = CreatureMaterialFactory.getPalette('stag', 0);
    assert(p1.body === p2.body, 'Same creature & variant returns cached palette reference');

    const pAlt = CreatureMaterialFactory.getPalette('stag', 1);
    assert(pAlt.body !== undefined && pAlt.body !== p1.body, 'Alternative variant returns valid distinct palette');
  }

  console.log('\n====================================================');
  console.log(` VISUAL COHERENCE TESTS PASSED (${passedCount}/${testCount} assertions) `);
  console.log('====================================================\n');
  return true;
}

if (process.argv[1] && process.argv[1].includes('visualCoherenceOverhaulTest')) {
  runVisualCoherenceOverhaulTests().then(() => {
    process.exit(0);
  }).catch((e) => {
    console.error('Test error:', e);
    process.exit(1);
  });
}
