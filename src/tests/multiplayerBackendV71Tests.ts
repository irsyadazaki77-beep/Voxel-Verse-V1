// VoxelVerse v7.1.0 Verification Suite:
// 1. Zlib Binary Chunk Delta Encoding / Decoding & Compression Efficiency
// 2. RealmSQLiteStore (WAL mode, round-trip persistence for Realms, Binary Chunks, Players, and Land Claims)
// 3. LandClaimManager (Wilayah Kerajaan claim/unclaim/trust/anti-grief block modification checks)
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  RealmSQLiteStore,
  encodeChunkDeltas,
  decodeChunkDeltas,
  ChunkBlockDelta,
} from '../engine/network/RealmSQLiteStore';
import { LandClaimManager } from '../engine/network/LandClaimManager';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`v7.1.0 Test Failed: ${message}`);
  }
  console.log(`  ✓ [PASS] ${message}`);
}

export function runMultiplayerBackendV71Tests(): void {
  console.log('\n====================================================');
  console.log(' VOXELVERSE v7.1.0: SQLITE CHUNKS, INTEREST & LAND CLAIMS');
  console.log('====================================================');

  // --- 1. BINARY CHUNK DELTA ENCODING & COMPRESSION ---
  console.log('\n▶ [1/3] Testing Zlib Binary Chunk Delta Encoding & Compression...');
  {
    const deltas: ChunkBlockDelta[] = [];
    const jsonBaselineObj: Record<string, number> = {};
    for (let i = 0; i < 200; i++) {
      const lx = i % 16;
      const ly = 40 + (i % 24);
      const lz = Math.floor(i / 16) % 16;
      deltas.push({ lx, ly, lz, blockType: 17, revision: i + 1 });
      jsonBaselineObj[`${lx},${ly},${lz}`] = 17;
    }

    const encoded = encodeChunkDeltas(deltas);
    const decoded = decodeChunkDeltas(encoded);
    const jsonBytes = Buffer.byteLength(JSON.stringify(jsonBaselineObj), 'utf8');

    assert(decoded.length === deltas.length, `Decoded ${decoded.length} binary chunk block deltas`);
    assert(
      decoded[0].lx === deltas[0].lx &&
        decoded[0].ly === deltas[0].ly &&
        decoded[0].lz === deltas[0].lz &&
        decoded[0].blockType === 17 &&
        decoded[199].revision === 200,
      'Binary chunk round-trip preserves exact coordinates, blockType, and revision'
    );
    assert(
      encoded.length < jsonBytes,
      `Zlib binary chunk blob (${encoded.length}B) is smaller than legacy JSON string map (${jsonBytes}B)`
    );
  }

  // --- 2. LAND CLAIM / WILAYAH KERAJAAN MANAGER ---
  console.log('\n▶ [2/3] Testing LandClaimManager Territory Protection...');
  {
    const claims = new LandClaimManager();
    const c1 = claims.claimChunk('realm_1', 2, -3, 'player_a', 'Raka', 'Kerajaan Majapahit');
    assert(c1.ok && !!c1.claim, 'Player A claimed chunk (2, -3) for Kerajaan Majapahit');

    const dup = claims.claimChunk('realm_1', 2, -3, 'player_b', 'Sinta', 'Kerajaan Sriwijaya');
    assert(!dup.ok && dup.reason === 'CHUNK_ALREADY_CLAIMED', 'Overlapping claim by Player B rejected');

    // World coords inside chunk (2, -3): x in [32..47], z in [-48..-33]
    const ownerPerm = claims.canModifyBlock('realm_1', 35, -40, 'player_a', false);
    assert(ownerPerm.allowed, 'Claim owner can modify blocks inside their territory');

    const intruderPerm = claims.canModifyBlock('realm_1', 35, -40, 'player_b', false);
    assert(
      !intruderPerm.allowed && intruderPerm.reason === 'TERRITORY_PROTECTED:Kerajaan Majapahit',
      'Unauthorized player blocked from griefing claimed territory'
    );

    const modPerm = claims.canModifyBlock('realm_1', 35, -40, 'admin_mod', true);
    assert(modPerm.allowed, 'Realm moderator can override territory protection');

    const trustRes = claims.trustPlayer('realm_1', 2, -3, 'player_a', 'player_b');
    assert(trustRes.ok, 'Owner can trust Player B on chunk (2, -3)');
    assert(
      claims.canModifyBlock('realm_1', 35, -40, 'player_b', false).allowed,
      'Trusted player can now build inside claimed territory'
    );

    claims.untrustPlayer('realm_1', 2, -3, 'player_a', 'player_b');
    assert(
      !claims.canModifyBlock('realm_1', 35, -40, 'player_b', false).allowed,
      'Revoking trust immediately restores territory protection'
    );
  }

  // --- 3. SQLITE STORE ROUND-TRIP PERSISTENCE ---
  console.log('\n▶ [3/3] Testing RealmSQLiteStore Round-Trip Persistence...');
  {
    const tmpDb = path.join(os.tmpdir(), `voxelverse-v71-test-${Date.now()}.sqlite`);
    const store = new RealmSQLiteStore(tmpDb);
    assert(store.isAvailable(), 'Node built-in SQLite (node:sqlite) initialized successfully');

    const claimMgr = new LandClaimManager();
    claimMgr.claimChunk('realm_nusantara', 0, 0, 'owner_1', 'GajahMada', 'Nusantara Raya');

    store.saveSnapshot({
      realms: {
        realm_nusantara: {
          realmId: 'realm_nusantara',
          realmName: 'Nusantara Raya',
          worldSeed: 77777,
          worldPreset: 'standard',
          ownerPlayerId: 'owner_1',
          moderators: [],
          createdAt: 1000,
          lastPlayed: 2000,
          worldTime: 6000,
          weather: { type: 'clear', intensity: 0 },
          bossState: { active: false },
          anomalyState: { active: false },
          globalRevision: 42,
          worldBlocks: {
            '5,64,5': 17,
            '-3,62,-10': 30,
          },
          worldBlockStates: {
            '-3,62,-10': { facing: 'north' },
          },
          worldBlockRevisions: {
            '5,64,5': 41,
            '-3,62,-10': 42,
          },
        },
      },
      players: {
        owner_1: { playerId: 'owner_1', playerName: 'GajahMada', lastPlayed: 2000 },
      },
      claims: claimMgr.getAllClaims(),
    });

    const stats = store.getStats();
    assert(stats.chunkRows === 2, `SQLite stored 2 distinct compressed chunk rows (got ${stats.chunkRows})`);
    assert(stats.claimRows === 1, `SQLite stored 1 land claim row (got ${stats.claimRows})`);

    store.close();

    // Reopen fresh instance from disk and verify exact round-trip
    const reopened = new RealmSQLiteStore(tmpDb);
    const loaded = reopened.loadAll();
    assert(loaded.realms['realm_nusantara']?.worldBlocks['5,64,5'] === 17, 'Positive chunk block persisted & decoded accurately');
    assert(loaded.realms['realm_nusantara']?.worldBlocks['-3,62,-10'] === 30, 'Negative chunk block persisted & decoded accurately');
    assert(loaded.realms['realm_nusantara']?.worldBlockStates?.['-3,62,-10']?.facing === 'north', 'BlockState JSON preserved in chunk row');
    assert(loaded.claims.length === 1 && loaded.claims[0].kingdomName === 'Nusantara Raya', 'Land claims persisted & hydrated cleanly');
    reopened.close();

    // Clean up temp sqlite + WAL files
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        if (fs.existsSync(tmpDb + suffix)) fs.unlinkSync(tmpDb + suffix);
      } catch {}
    }
  }

  console.log('\n====================================================');
  console.log(' ALL VOXELVERSE v7.1.0 TESTS PASSED!');
  console.log('====================================================\n');
}

if (typeof process !== 'undefined' && process.argv[1]?.includes('multiplayerBackendV71Tests')) {
  runMultiplayerBackendV71Tests();
}
