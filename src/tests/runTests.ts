// Automated System Unit & Integration Test Runner
import { InventoryManager } from '../engine/items/InventoryManager';
import { CRAFTING_RECIPES } from '../engine/items/CraftingSystem';
import { SaveManager, CURRENT_SAVE_VERSION } from '../engine/storage/SaveManager';
import { SimplexNoise } from '../engine/math/Noise';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, testName: string, failureMessage?: string) {
  if (condition) {
    results.push({ name: testName, passed: true });
    console.log(`  ✓ ${testName}`);
  } else {
    results.push({ name: testName, passed: false, error: failureMessage || 'Assertion failed' });
    console.error(`  ✕ ${testName}: ${failureMessage || 'Assertion failed'}`);
  }
}

console.log('====================================================');
console.log('VOXELVERSE AUTOMATED INTEGRATION & UNIT TEST SUITE');
console.log('====================================================\n');

// 1. Inventory Transactions & Stacking
console.log('[TEST GROUP] Inventory Manager');
try {
  const stackA = InventoryManager.createStack('dirt', 32);
  assert(stackA !== null && stackA.count === 32, 'Create valid item stack');

  const inv = new Array(36).fill(null);
  const result1 = InventoryManager.addItem(inv, 'dirt', 40);
  assert(result1.remainingCount === 0, 'Add 40 dirt to empty inventory');
  assert(inv[0]?.itemId === 'dirt' && inv[0]?.count === 40, 'Dirt stack amount correctly updated');

  const result2 = InventoryManager.addItem(inv, 'dirt', 30);
  assert(result2.remainingCount === 0, 'Add 30 dirt merges into first stack up to maxStack 64');
  assert(inv[0]?.count === 64, 'First stack reached maxStack 64');
  assert(inv[1]?.itemId === 'dirt' && inv[1]?.count === 6, 'Overflow 6 dirt placed in second slot');
} catch (e) {
  assert(false, 'Inventory Manager Exception', (e as Error).message);
}

// 2. Crafting Recipe Output Matching
console.log('\n[TEST GROUP] Crafting System');
try {
  const recipe = CRAFTING_RECIPES.find((r) => r.id === 'planks_from_oak');
  assert(recipe !== undefined, 'Wood log planks crafting recipe registered');
  assert(recipe?.output.itemId === 'wood_planks' && recipe.output.count === 4, '1 Oak Log yields 4 Timber Planks');
} catch (e) {
  assert(false, 'Crafting System Exception', (e as Error).message);
}

// 3. Save Migration & Schema Validation
console.log('\n[TEST GROUP] Save Manager & Schema Migration');
try {
  const legacyV1Save = {
    version: 1,
    id: 'test_world_legacy',
    name: 'Ancient World',
    seed: 12345,
    gameMode: 'survival',
    player: {
      position: [10, 65, 10],
      inventory: [{ itemId: 'stone', count: 16 }],
    },
  };

  const migrated = SaveManager.validateAndSanitizeSave(legacyV1Save, 'test_world_legacy', 12345);
  assert(migrated.version === CURRENT_SAVE_VERSION, `Migrated version upgraded to v${CURRENT_SAVE_VERSION}`);
  assert(migrated.id === 'test_world_legacy', 'World ID preserved');
  assert(Array.isArray(migrated.player.inventory) && migrated.player.inventory.length === 36, 'Inventory sanitized to 36 slots');
  assert(migrated.player.inventory[0]?.itemId === 'stone', 'Inventory items correctly mapped');
  assert(typeof migrated.discoveries === 'object', 'Phase 8 progression fields populated');
} catch (e) {
  assert(false, 'Save Migration Exception', (e as Error).message);
}

// 4. Seeded Deterministic Noise & Chunk Math
console.log('\n[TEST GROUP] Seeded Noise & Chunk Math');
try {
  const noise1 = new SimplexNoise(42819);
  const noise2 = new SimplexNoise(42819);

  const val1 = noise1.noise2D(12.34, 56.78);
  const val2 = noise2.noise2D(12.34, 56.78);
  assert(val1 === val2, 'Seeded noise produces 100% deterministic values');

  const noiseOther = new SimplexNoise(99999);
  const valOther = noiseOther.noise2D(12.34, 56.78);
  assert(val1 !== valOther, 'Different seed produces distinct noise values');
} catch (e) {
  assert(false, 'Seeded Noise Exception', (e as Error).message);
}

// Summary
console.log('\n====================================================');
const passedCount = results.filter((r) => r.passed).length;
const totalCount = results.length;
console.log(`TEST SUMMARY: ${passedCount}/${totalCount} PASSED`);
console.log('====================================================');

if (passedCount !== totalCount) {
  process.exit(1);
}
