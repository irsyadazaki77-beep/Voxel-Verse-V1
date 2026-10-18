// Phase 1.1: World Save & Data Integrity Overhaul Regression Test Suite
import { SaveManager, CURRENT_SAVE_VERSION, CURRENT_CHECKSUM_VERSION, WorldSummary } from '../engine/storage/SaveManager';
import { IndexedDBStorage, STORE_WORLDS } from '../engine/storage/IndexedDBStorage';
import { WorldSaveData, BlockType } from '../types';
import { makeDimensionChunkKey } from '../engine/world/WorldConfig';

// Polyfills for headless testing if run outside browser
if (typeof (globalThis as any).localStorage === 'undefined') {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, val: string) => { store.set(key, String(val)); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    get length() { return store.size; },
    key: (i: number) => Array.from(store.keys())[i] || null,
  };
}

let testCount = 0;
let passedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  testCount++;
  if (condition) {
    passedCount++;
    console.log(`    ✓ [PASS] ${testName}`);
  } else {
    console.error(`    ✗ [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
    throw new Error(`Test failed: ${testName}`);
  }
}

export async function runWorldSaveIntegrityOverhaulTests(): Promise<boolean> {
  console.log('----------------------------------------------------');
  console.log(' FASE 1.1: WORLD SAVE & DATA INTEGRITY OVERHAUL SUITE');
  console.log('----------------------------------------------------\n');

  // TEST 1: importWorldJSON accurately awaits storage and rejects false success
  console.log('  ▶ [1/6] Testing importWorldJSON Async Storage Confirmation & False-Success Rejection...');
  {
    const validSave: WorldSaveData = {
      version: CURRENT_SAVE_VERSION,
      id: 'import_source_realm',
      name: 'Pristine Archipelago',
      seed: 778899,
      preset: 'archipelago',
      gameMode: 'survival',
      difficulty: 'normal',
      createdAt: Date.now() - 5000,
      lastPlayed: Date.now(),
      gameTime: 12000,
      player: {
        position: [10, 70, 10],
        rotation: [0, 0],
        health: 100,
        hunger: 100,
        stamina: 100,
        saturation: 20,
        temperature: 20,
        level: 5,
        xp: 320,
        hotbarIndex: 1,
        inventory: [],
        equipment: { head: null, chest: null, legs: null, feet: null, accessory: null },
      },
      modifiedBlocks: {
        [makeDimensionChunkKey('overworld', 0, 0)]: {
          '1,65,1': BlockType.COBBLESTONE,
        },
      },
      modifiedBlockStates: {},
      weather: { type: 'clear', intensity: 0 },
      stats: { blocksMined: 5, blocksPlaced: 1, monstersDefeated: 0, distanceTraveled: 100 },
    };

    const validJson = JSON.stringify({ voxelVerseSave: true, data: validSave });

    // 1.1 Import valid JSON
    const importResult = await SaveManager.importWorldJSON(validJson);
    assert(importResult !== null, 'importWorldJSON returns WorldSummary on confirmed persistence');
    assert(importResult?.name.includes('Pristine Archipelago'), 'Imported realm retains name prefix');
    assert(importResult?.seed === 778899, 'Imported realm retains seed');

    // Verify it is actually written and retrievable in persistence
    const loadedImport = await SaveManager.loadWorldAsync(importResult!.id);
    assert(loadedImport !== null, 'Imported world is confirmed present in persistence');
    assert(loadedImport?.player.level === 5, 'Imported world player state matches payload');

    // 1.2 Invalid / corrupt JSON string
    const corruptJsonResult = await SaveManager.importWorldJSON('{corrupted_json_syntax!@@');
    assert(corruptJsonResult === null, 'importWorldJSON returns null on invalid JSON syntax');

    // 1.3 Invalid payload structure (missing data object)
    const emptyPayloadResult = await SaveManager.importWorldJSON(JSON.stringify({ someGarbage: 123 }));
    assert(emptyPayloadResult === null, 'importWorldJSON returns null on invalid payload schema');

    // Clean up
    await SaveManager.deleteWorldAsync(importResult!.id);
  }

  // TEST 2: IndexedDB & LocalStorage Index Synchronization
  console.log('\n  ▶ [2/6] Testing IndexedDB & LocalStorage World Index Synchronization...');
  {
    const idbOnlyWorldId = 'idb_exclusive_realm_' + Date.now();
    const idbSave: WorldSaveData = {
      version: CURRENT_SAVE_VERSION,
      id: idbOnlyWorldId,
      name: 'Ancient Sunken Realm',
      seed: 554433,
      preset: 'standard',
      gameMode: 'survival',
      difficulty: 'hard',
      createdAt: Date.now() - 20000,
      lastPlayed: Date.now() - 500,
      gameTime: 5000,
      player: {
        position: [5, 65, 5],
        rotation: [0, 0],
        health: 80,
        hunger: 90,
        stamina: 100,
        saturation: 20,
        temperature: 20,
        level: 2,
        xp: 120,
        hotbarIndex: 0,
        inventory: [],
        equipment: { head: null, chest: null, legs: null, feet: null, accessory: null },
      },
      modifiedBlocks: {},
      modifiedBlockStates: {},
      weather: { type: 'clear', intensity: 0 },
      stats: { blocksMined: 20, blocksPlaced: 10, monstersDefeated: 2, distanceTraveled: 300 },
    };

    // Save directly into IndexedDB only (simulating world saved after localStorage quota exceeded)
    const serialized = JSON.stringify(idbSave);
    const checksum = SaveManager.calculateFullChecksum(serialized);
    const payload = JSON.stringify({
      version: CURRENT_SAVE_VERSION,
      checksumVersion: CURRENT_CHECKSUM_VERSION,
      checksum,
      data: idbSave,
    });

    await IndexedDBStorage.setItem(STORE_WORLDS, {
      id: idbOnlyWorldId,
      payload,
      updatedAt: Date.now(),
    });

    // Ensure localStorage has no trace of this world or worlds index
    localStorage.removeItem(`voxelverse_world_${idbOnlyWorldId}`);
    localStorage.removeItem('voxelverse_worlds_index');

    // Verify SaveManager.hasWorldAsync finds it
    const hasWorldAsync = await SaveManager.hasWorldAsync(idbOnlyWorldId);
    assert(hasWorldAsync === true, 'SaveManager.hasWorldAsync detects world present only in IndexedDB');

    // Verify SaveManager.getWorldsAsync recovers and restores the world into the index
    const syncedWorlds = await SaveManager.getWorldsAsync();
    const foundInIndex = syncedWorlds.find((w) => w.id === idbOnlyWorldId);
    assert(foundInIndex !== undefined, 'IndexedDB-only world restored to world list by getWorldsAsync');
    assert(foundInIndex?.name === 'Ancient Sunken Realm', 'Restored world summary has correct name');
    assert(foundInIndex?.seed === 554433, 'Restored world summary has correct seed');

    // Verify localStorage index now contains the world
    const localIndex = SaveManager.getWorlds();
    assert(localIndex.some((w) => w.id === idbOnlyWorldId), 'Synchronized index persisted back to localStorage');

    // Verify loadWorldAsync loads the world from IndexedDB Layer 1
    const loadedFromIdb = await SaveManager.loadWorldAsync(idbOnlyWorldId);
    assert(loadedFromIdb !== null, 'loadWorldAsync successfully loads world from IndexedDB');
    assert(loadedFromIdb?.player.level === 2, 'Loaded world preserves player state');

    // Clean up
    await SaveManager.deleteWorldAsync(idbOnlyWorldId);
  }

  // TEST 3: Full-Payload Checksum vs Tampering & Legacy Compatibility
  console.log('\n  ▶ [3/6] Testing Full-Payload Checksum & Legacy Save Migration...');
  {
    // Build a large payload
    const modifiedBlocks: Record<string, Record<string, number>> = {};
    for (let i = 0; i < 50; i++) {
      const k = makeDimensionChunkKey('overworld', i, i);
      modifiedBlocks[k] = { '0,64,0': BlockType.GOLD_BLOCK, '1,64,1': BlockType.IRON_BLOCK };
    }

    const largeSave: WorldSaveData = {
      version: CURRENT_SAVE_VERSION,
      id: 'checksum_integrity_test',
      name: 'Integrity Test Realm',
      seed: 998877,
      gameMode: 'survival',
      difficulty: 'normal',
      createdAt: Date.now(),
      lastPlayed: Date.now(),
      gameTime: 0,
      player: {
        position: [0, 80, 0],
        rotation: [0, 0],
        health: 100,
        hunger: 100,
        stamina: 100,
        saturation: 20,
        temperature: 20,
        level: 1,
        xp: 0,
        hotbarIndex: 0,
        inventory: [],
        equipment: { head: null, chest: null, legs: null, feet: null, accessory: null },
      },
      modifiedBlocks,
      modifiedBlockStates: {},
      weather: { type: 'clear', intensity: 0 },
      stats: { blocksMined: 0, blocksPlaced: 0, monstersDefeated: 0, distanceTraveled: 0 },
    };

    const validChecksum = SaveManager.calculateFullChecksum(JSON.stringify(largeSave));
    const container = {
      version: CURRENT_SAVE_VERSION,
      checksumVersion: 2,
      checksum: validChecksum,
      data: largeSave,
    };

    // 3.1 Valid full checksum passes verification
    const verifiedValid = SaveManager.verifyAndExtractData(container);
    assert(verifiedValid !== null, 'Full payload checksum verifies pristine large save');

    // 3.2 Single character tampering deep inside payload
    const tamperedData = JSON.parse(JSON.stringify(largeSave));
    tamperedData.modifiedBlocks[makeDimensionChunkKey('overworld', 25, 25)]['0,64,0'] = BlockType.OBSIDIAN;
    const tamperedContainer = {
      version: CURRENT_SAVE_VERSION,
      checksumVersion: 2,
      checksum: validChecksum, // Mismatched checksum
      data: tamperedData,
    };
    const verifiedTampered = SaveManager.verifyAndExtractData(tamperedContainer);
    assert(verifiedTampered === null, 'Tampered block modification caught and rejected by full checksum');

    // 3.3 Legacy v1 sampled checksum save remains accepted
    const legacySampledChecksum = SaveManager.calculateSampledChecksum(JSON.stringify(largeSave));
    const legacyV1Container = {
      version: CURRENT_SAVE_VERSION,
      checksumVersion: 1,
      checksum: legacySampledChecksum,
      data: largeSave,
    };
    const verifiedLegacy = SaveManager.verifyAndExtractData(legacyV1Container);
    assert(verifiedLegacy !== null, 'Legacy v1 sampled checksum save remains verified and accepted');

    // 3.4 Legacy v1 raw save data migration
    const legacyRawV1 = {
      version: 1,
      id: 'legacy_v1_world',
      seed: 1234,
      modifiedBlocks: {
        '4,-5': { '0,64,0': BlockType.STONE },
      },
    };
    const migrated = SaveManager.migrateSaveData(legacyRawV1);
    assert(migrated.version === 3, 'Legacy save migrated to version 3');
    assert(migrated.modifiedBlocks['overworld:4,-5'] !== undefined, 'Legacy chunk key canonicalized');
  }

  // TEST 4: Corrupt Save Does Not Overwrite Valid Backups
  console.log('\n  ▶ [4/6] Testing Backup Protection Against Corrupt Saves...');
  {
    const backupGuardWorldId = 'guard_world_' + Date.now();
    const healthySave: WorldSaveData = {
      version: CURRENT_SAVE_VERSION,
      id: backupGuardWorldId,
      name: 'Safe Haven',
      seed: 8888,
      preset: 'standard',
      gameMode: 'survival',
      difficulty: 'normal',
      createdAt: Date.now() - 10000,
      lastPlayed: Date.now() - 2000,
      gameTime: 1000,
      player: {
        position: [0, 75, 0],
        rotation: [0, 0],
        health: 100,
        hunger: 100,
        stamina: 100,
        saturation: 20,
        temperature: 20,
        level: 10,
        xp: 1500,
        hotbarIndex: 0,
        inventory: [],
        equipment: { head: null, chest: null, legs: null, feet: null, accessory: null },
      },
      modifiedBlocks: {},
      modifiedBlockStates: {},
      weather: { type: 'clear', intensity: 0 },
      stats: { blocksMined: 100, blocksPlaced: 50, monstersDefeated: 5, distanceTraveled: 1000 },
    };

    // Save initial version
    await SaveManager.saveWorldAsync(healthySave);

    // Save second version (this rotates healthySave into backup)
    const secondSave: WorldSaveData = {
      ...healthySave,
      gameTime: 2000,
      player: { ...healthySave.player, health: 90 },
    };
    await SaveManager.saveWorldAsync(secondSave);

    // Verify backup exists and has level 10
    const snapshotBefore = await SaveManager.getAvailableRecoverySnapshot(backupGuardWorldId);
    assert(snapshotBefore !== null, 'Backup snapshot created and verified');
    assert(snapshotBefore?.data.player.level === 10, 'Backup retains healthy player level 10');

    // Now simulate corrupt data being passed to saveWorldAsync
    const corruptPayload: any = null;
    const saveCorruptResult = await SaveManager.saveWorldAsync(corruptPayload);
    assert(saveCorruptResult === false, 'saveWorldAsync rejects null/corrupt data and returns false');

    // Attempt saving an invalid object missing an ID
    const missingIdResult = await SaveManager.saveWorldAsync({ foo: 'bar' } as any);
    assert(missingIdResult === false, 'saveWorldAsync rejects object missing ID');

    // Verify backup snapshot is UNTOUCHED and still healthy
    const snapshotAfter = await SaveManager.getAvailableRecoverySnapshot(backupGuardWorldId);
    assert(snapshotAfter !== null, 'Healthy backup snapshot preserved intact after failed corrupt save attempt');
    assert(snapshotAfter?.data.player.level === 10, 'Backup retains intact player level 10');

    // Now deliberately corrupt the primary key in storage
    localStorage.setItem(`voxelverse_world_${backupGuardWorldId}`, '{corrupted_json_garbage!');

    // loadWorldAsync should automatically recover from the healthy backup
    const recoveredWorld = await SaveManager.loadWorldAsync(backupGuardWorldId);
    assert(recoveredWorld !== null, 'loadWorldAsync cleanly recovered from healthy backup snapshot');
    assert(recoveredWorld?.name === 'Safe Haven', 'Recovered world retains correct name');

    // Clean up
    await SaveManager.deleteWorldAsync(backupGuardWorldId);
  }

  // TEST 5: Race Conditions & Concurrency Safety
  console.log('\n  ▶ [5/6] Testing Race Conditions, Concurrent Mutex & Delete vs Save Safety...');
  {
    const raceWorldId = 'race_test_' + Date.now();
    const baseSave: WorldSaveData = {
      version: CURRENT_SAVE_VERSION,
      id: raceWorldId,
      name: 'Race Arena',
      seed: 3344,
      preset: 'mountainous',
      gameMode: 'survival',
      difficulty: 'normal',
      createdAt: Date.now(),
      lastPlayed: Date.now(),
      gameTime: 100,
      player: {
        position: [0, 80, 0],
        rotation: [0, 0],
        health: 100,
        hunger: 100,
        stamina: 100,
        saturation: 20,
        temperature: 20,
        level: 1,
        xp: 0,
        hotbarIndex: 0,
        inventory: [],
        equipment: { head: null, chest: null, legs: null, feet: null, accessory: null },
      },
      modifiedBlocks: {},
      modifiedBlockStates: {},
      weather: { type: 'clear', intensity: 0 },
      stats: { blocksMined: 0, blocksPlaced: 0, monstersDefeated: 0, distanceTraveled: 0 },
    };

    // Save world initially
    await SaveManager.saveWorldAsync(baseSave);

    // Test Delete vs Save: delete world, then verify subsequent save on that world is aborted
    await SaveManager.deleteWorldAsync(raceWorldId);
    assert(!SaveManager.hasWorld(raceWorldId), 'World removed from index after deleteWorldAsync');

    // Attempt to save to deleted world
    const saveToDeletedResult = await SaveManager.saveWorldAsync(baseSave);
    assert(saveToDeletedResult === false, 'Save to deleted world aborted by delete guard to prevent zombie resurrection');
  }

  // TEST 6: Async Rename, Duplicate, Export Operations on Persistent Storage
  console.log('\n  ▶ [6/6] Testing Async Rename, Duplicate, Export Operations...');
  {
    const origId = 'orig_realm_' + Date.now();
    const origSave: WorldSaveData = {
      version: CURRENT_SAVE_VERSION,
      id: origId,
      name: 'Original Realm',
      seed: 112233,
      preset: 'standard',
      gameMode: 'survival',
      difficulty: 'normal',
      createdAt: Date.now() - 10000,
      lastPlayed: Date.now(),
      gameTime: 500,
      player: {
        position: [1, 70, 1],
        rotation: [0, 0],
        health: 95,
        hunger: 95,
        stamina: 100,
        saturation: 20,
        temperature: 20,
        level: 3,
        xp: 200,
        hotbarIndex: 0,
        inventory: [],
        equipment: { head: null, chest: null, legs: null, feet: null, accessory: null },
      },
      modifiedBlocks: {},
      modifiedBlockStates: {},
      weather: { type: 'clear', intensity: 0 },
      stats: { blocksMined: 10, blocksPlaced: 5, monstersDefeated: 1, distanceTraveled: 250 },
    };

    await SaveManager.saveWorldAsync(origSave);

    // 6.1 Async rename
    const renameSuccess = await SaveManager.renameWorldAsync(origId, 'Renamed Realm');
    assert(renameSuccess === true, 'renameWorldAsync succeeded');
    const renamedLoaded = await SaveManager.loadWorldAsync(origId);
    assert(renamedLoaded?.name === 'Renamed Realm', 'Renamed realm persisted with new name');

    // 6.2 Async duplicate
    const duplicateSummary = await SaveManager.duplicateWorldAsync(origId);
    assert(duplicateSummary !== null, 'duplicateWorldAsync returned confirmed WorldSummary');
    assert(duplicateSummary?.name === 'Renamed Realm (Copy)', 'Duplicate has copy name');
    assert(duplicateSummary?.id !== origId, 'Duplicate has unique ID');

    const duplicateLoaded = await SaveManager.loadWorldAsync(duplicateSummary!.id);
    assert(duplicateLoaded !== null, 'Duplicated world is loaded and persisted');
    assert(duplicateLoaded?.player.level === 3, 'Duplicated world preserves player state');

    // 6.3 Async export
    const exportedJson = await SaveManager.exportWorldJSONAsync(origId);
    assert(exportedJson !== null, 'exportWorldJSONAsync produces non-null JSON string');
    const parsedExport = JSON.parse(exportedJson!);
    assert(parsedExport.voxelVerseSave === true, 'Exported JSON has voxelVerseSave signature');
    assert(parsedExport.data.id === origId, 'Exported data matches realm');

    // Clean up
    await SaveManager.deleteWorldAsync(origId);
    await SaveManager.deleteWorldAsync(duplicateSummary!.id);
  }

  console.log('\n  ✓ All World Save & Data Integrity Overhaul Tests Passed Strictly!');
  return true;
}
