// SQLite Realm Persistence Store with Zlib Binary Chunk Blobs (v7.1.0)
// Uses Node.js built-in `node:sqlite` (DatabaseSync) with WAL mode and compact 9-byte/block binary chunk deltas.
import fs from 'fs';
import zlib from 'zlib';
import { createRequire } from 'module';
import { CHUNK_SIZE_X, CHUNK_SIZE_Z } from '../world/WorldConfig';
import type { LandClaim } from './LandClaimManager';

export interface ChunkBlockDelta {
  lx: number; // 0..15
  ly: number; // 0..255
  lz: number; // 0..15
  blockType: number; // uint16
  revision: number; // uint32
}

export interface PersistedRealmRecord {
  realmId: string;
  realmName: string;
  worldSeed: number;
  worldPreset: string;
  ownerPlayerId: string;
  moderators: string[];
  createdAt: number;
  lastPlayed: number;
  worldTime: number;
  weather: any;
  bossState: any;
  anomalyState: any;
  globalRevision?: number;
  worldBlocks: Record<string, number>;
  worldBlockStates?: Record<string, any>;
  worldBlockRevisions: Record<string, number>;
}

export interface PersistedDBSnapshot {
  realms: Record<string, PersistedRealmRecord>;
  players: Record<string, any>;
  claims: LandClaim[];
}

const BYTES_PER_RECORD = 9; // lx(1) + ly(1) + lz(1) + blockType(2) + revision(4)

/**
 * Encodes a chunk's modified block deltas into a zlib-compressed binary Buffer.
 */
export function encodeChunkDeltas(deltas: ChunkBlockDelta[]): Buffer {
  const raw = Buffer.allocUnsafe(deltas.length * BYTES_PER_RECORD);
  let offset = 0;
  for (let i = 0; i < deltas.length; i++) {
    const d = deltas[i];
    raw.writeUInt8(d.lx & 0xff, offset);
    raw.writeUInt8(d.ly & 0xff, offset + 1);
    raw.writeUInt8(d.lz & 0xff, offset + 2);
    raw.writeUInt16LE(d.blockType & 0xffff, offset + 3);
    raw.writeUInt32LE(d.revision >>> 0, offset + 5);
    offset += BYTES_PER_RECORD;
  }
  return zlib.deflateSync(raw, { level: 6 });
}

/**
 * Decodes a zlib-compressed binary chunk delta Buffer back into ChunkBlockDelta[].
 */
export function decodeChunkDeltas(blob: Uint8Array | Buffer): ChunkBlockDelta[] {
  if (!blob || blob.length === 0) return [];
  const raw = zlib.inflateSync(Buffer.from(blob));
  const count = Math.floor(raw.length / BYTES_PER_RECORD);
  const out: ChunkBlockDelta[] = new Array(count);
  let offset = 0;
  for (let i = 0; i < count; i++) {
    out[i] = {
      lx: raw.readUInt8(offset),
      ly: raw.readUInt8(offset + 1),
      lz: raw.readUInt8(offset + 2),
      blockType: raw.readUInt16LE(offset + 3),
      revision: raw.readUInt32LE(offset + 5),
    };
    offset += BYTES_PER_RECORD;
  }
  return out;
}

export class RealmSQLiteStore {
  private dbPath: string;
  private sqlite: any = null;
  private isReady: boolean = false;

  constructor(dbPath: string = './server-realms.sqlite') {
    this.dbPath = dbPath;
    this.init();
  }

  public isAvailable(): boolean {
    return this.isReady && this.sqlite !== null;
  }

  private init(): void {
    try {
      const req = createRequire(import.meta.url);
      const { DatabaseSync } = req('node:sqlite');
      this.sqlite = new DatabaseSync(this.dbPath);
      this.sqlite.exec('PRAGMA journal_mode = WAL;');
      this.sqlite.exec('PRAGMA synchronous = NORMAL;');
      this.sqlite.exec(`
        CREATE TABLE IF NOT EXISTS realms (
          realm_id TEXT PRIMARY KEY,
          metadata_json TEXT NOT NULL,
          global_revision INTEGER NOT NULL DEFAULT 1,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS realm_chunks (
          realm_id TEXT NOT NULL,
          cx INTEGER NOT NULL,
          cz INTEGER NOT NULL,
          block_blob BLOB NOT NULL,
          states_json TEXT,
          revision INTEGER NOT NULL DEFAULT 1,
          PRIMARY KEY (realm_id, cx, cz)
        );

        CREATE TABLE IF NOT EXISTS players (
          player_id TEXT PRIMARY KEY,
          data_json TEXT NOT NULL,
          last_played INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS land_claims (
          claim_id TEXT PRIMARY KEY,
          realm_id TEXT NOT NULL,
          cx INTEGER NOT NULL,
          cz INTEGER NOT NULL,
          owner_id TEXT NOT NULL,
          owner_name TEXT NOT NULL,
          kingdom_name TEXT NOT NULL,
          trusted_json TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          UNIQUE(realm_id, cx, cz)
        );
      `);
      this.isReady = true;
    } catch (err) {
      console.warn('[SQLite] node:sqlite unavailable, falling back to JSON store:', (err as Error)?.message);
      this.sqlite = null;
      this.isReady = false;
    }
  }

  public hasAnyData(): boolean {
    if (!this.isAvailable()) return false;
    const r = this.sqlite.prepare('SELECT COUNT(*) as cnt FROM realms').get();
    const p = this.sqlite.prepare('SELECT COUNT(*) as cnt FROM players').get();
    return ((r?.cnt || 0) + (p?.cnt || 0)) > 0;
  }

  /**
   * Loads the entire database snapshot from SQLite, decoding binary chunk blobs back into in-memory realm maps.
   */
  public loadAll(): PersistedDBSnapshot {
    const result: PersistedDBSnapshot = { realms: {}, players: {}, claims: [] };
    if (!this.isAvailable()) return result;

    const realmRows = this.sqlite.prepare('SELECT realm_id, metadata_json, global_revision FROM realms').all();
    for (const row of realmRows) {
      try {
        const meta = JSON.parse(row.metadata_json);
        result.realms[row.realm_id] = {
          ...meta,
          realmId: row.realm_id,
          globalRevision: row.global_revision || meta.globalRevision || 1,
          worldBlocks: {},
          worldBlockStates: {},
          worldBlockRevisions: {},
        };
      } catch {}
    }

    const chunkRows = this.sqlite.prepare('SELECT realm_id, cx, cz, block_blob, states_json FROM realm_chunks').all();
    for (const row of chunkRows) {
      const realm = result.realms[row.realm_id];
      if (!realm) continue;
      const baseX = row.cx * CHUNK_SIZE_X;
      const baseZ = row.cz * CHUNK_SIZE_Z;
      const deltas = decodeChunkDeltas(row.block_blob);
      for (let i = 0; i < deltas.length; i++) {
        const d = deltas[i];
        const key = `${baseX + d.lx},${d.ly},${baseZ + d.lz}`;
        realm.worldBlocks[key] = d.blockType;
        realm.worldBlockRevisions[key] = d.revision;
      }
      if (row.states_json) {
        try {
          const statesObj = JSON.parse(row.states_json);
          if (statesObj && typeof statesObj === 'object') {
            Object.assign(realm.worldBlockStates!, statesObj);
          }
        } catch {}
      }
    }

    const playerRows = this.sqlite.prepare('SELECT player_id, data_json FROM players').all();
    for (const row of playerRows) {
      try {
        result.players[row.player_id] = JSON.parse(row.data_json);
      } catch {}
    }

    const claimRows = this.sqlite.prepare('SELECT * FROM land_claims').all();
    for (const row of claimRows) {
      let trusted: string[] = [];
      try {
        trusted = JSON.parse(row.trusted_json || '[]');
      } catch {}
      result.claims.push({
        claimId: row.claim_id,
        realmId: row.realm_id,
        cx: row.cx,
        cz: row.cz,
        ownerId: row.owner_id,
        ownerName: row.owner_name,
        kingdomName: row.kingdom_name,
        trustedPlayerIds: Array.isArray(trusted) ? trusted : [],
        createdAt: row.created_at,
      });
    }

    return result;
  }

  /**
   * Persists a single chunk's binary delta blob incrementally (O(chunk) instead of O(entire world)).
   */
  public upsertChunk(
    realmId: string,
    cx: number,
    cz: number,
    deltas: ChunkBlockDelta[],
    statesMap: Record<string, any> | null,
    revision: number
  ): void {
    if (!this.isAvailable()) return;
    const blob = encodeChunkDeltas(deltas);
    const statesJson = statesMap && Object.keys(statesMap).length > 0 ? JSON.stringify(statesMap) : null;
    this.sqlite
      .prepare(
        `INSERT INTO realm_chunks (realm_id, cx, cz, block_blob, states_json, revision)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(realm_id, cx, cz) DO UPDATE SET
           block_blob = excluded.block_blob,
           states_json = excluded.states_json,
           revision = excluded.revision`
      )
      .run(realmId, cx, cz, blob, statesJson, revision);
  }

  /**
   * Saves full realm, player, and land claim state inside a single atomic SQLite transaction.
   */
  public saveSnapshot(snapshot: PersistedDBSnapshot): void {
    if (!this.isAvailable()) return;

    const upsertRealm = this.sqlite.prepare(
      `INSERT INTO realms (realm_id, metadata_json, global_revision, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(realm_id) DO UPDATE SET
         metadata_json = excluded.metadata_json,
         global_revision = excluded.global_revision,
         updated_at = excluded.updated_at`
    );
    const upsertChunk = this.sqlite.prepare(
      `INSERT INTO realm_chunks (realm_id, cx, cz, block_blob, states_json, revision)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(realm_id, cx, cz) DO UPDATE SET
         block_blob = excluded.block_blob,
         states_json = excluded.states_json,
         revision = excluded.revision`
    );
    const upsertPlayer = this.sqlite.prepare(
      `INSERT INTO players (player_id, data_json, last_played)
       VALUES (?, ?, ?)
       ON CONFLICT(player_id) DO UPDATE SET
         data_json = excluded.data_json,
         last_played = excluded.last_played`
    );
    const clearClaims = this.sqlite.prepare('DELETE FROM land_claims');
    const insertClaim = this.sqlite.prepare(
      `INSERT INTO land_claims (claim_id, realm_id, cx, cz, owner_id, owner_name, kingdom_name, trusted_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const now = Date.now();
    this.sqlite.exec('BEGIN IMMEDIATE');
    try {
      for (const [realmId, realm] of Object.entries(snapshot.realms)) {
        const { worldBlocks, worldBlockStates, worldBlockRevisions, ...metaOnly } = realm;
        upsertRealm.run(realmId, JSON.stringify(metaOnly), realm.globalRevision || 1, now);

        // Group worldBlocks by chunk (cx, cz) and compress each chunk into a binary blob
        const chunkGroups = new Map<string, { cx: number; cz: number; deltas: ChunkBlockDelta[]; states: Record<string, any>; maxRev: number }>();
        for (const [coordKey, blockType] of Object.entries(worldBlocks || {})) {
          const parts = coordKey.split(',');
          if (parts.length !== 3) continue;
          const wx = Number(parts[0]);
          const wy = Number(parts[1]);
          const wz = Number(parts[2]);
          const cx = Math.floor(wx / CHUNK_SIZE_X);
          const cz = Math.floor(wz / CHUNK_SIZE_Z);
          const lx = ((wx % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X;
          const lz = ((wz % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z;
          const rev = worldBlockRevisions?.[coordKey] || 1;
          const cKey = `${cx},${cz}`;

          let grp = chunkGroups.get(cKey);
          if (!grp) {
            grp = { cx, cz, deltas: [], states: {}, maxRev: rev };
            chunkGroups.set(cKey, grp);
          }
          grp.deltas.push({ lx, ly: wy, lz, blockType, revision: rev });
          if (rev > grp.maxRev) grp.maxRev = rev;
          if (worldBlockStates && worldBlockStates[coordKey] !== undefined) {
            grp.states[coordKey] = worldBlockStates[coordKey];
          }
        }

        for (const grp of chunkGroups.values()) {
          const blob = encodeChunkDeltas(grp.deltas);
          const statesJson = Object.keys(grp.states).length > 0 ? JSON.stringify(grp.states) : null;
          upsertChunk.run(realmId, grp.cx, grp.cz, blob, statesJson, grp.maxRev);
        }
      }

      for (const [playerId, player] of Object.entries(snapshot.players)) {
        upsertPlayer.run(playerId, JSON.stringify(player), player.lastPlayed || now);
      }

      clearClaims.run();
      for (const c of snapshot.claims || []) {
        insertClaim.run(
          c.claimId,
          c.realmId,
          c.cx,
          c.cz,
          c.ownerId,
          c.ownerName,
          c.kingdomName,
          JSON.stringify(c.trustedPlayerIds || []),
          c.createdAt || now
        );
      }

      this.sqlite.exec('COMMIT');
    } catch (err) {
      this.sqlite.exec('ROLLBACK');
      throw err;
    }
  }

  public getStats(): { sqliteAvailable: boolean; dbPath: string; dbSizeBytes: number; chunkRows: number; claimRows: number } {
    let dbSizeBytes = 0;
    try {
      if (fs.existsSync(this.dbPath)) {
        dbSizeBytes = fs.statSync(this.dbPath).size;
      }
    } catch {}
    let chunkRows = 0;
    let claimRows = 0;
    if (this.isAvailable()) {
      chunkRows = this.sqlite.prepare('SELECT COUNT(*) as cnt FROM realm_chunks').get()?.cnt || 0;
      claimRows = this.sqlite.prepare('SELECT COUNT(*) as cnt FROM land_claims').get()?.cnt || 0;
    }
    return {
      sqliteAvailable: this.isAvailable(),
      dbPath: this.dbPath,
      dbSizeBytes,
      chunkRows,
      claimRows,
    };
  }

  public close(): void {
    if (this.sqlite) {
      try {
        this.sqlite.close();
      } catch {}
      this.sqlite = null;
      this.isReady = false;
    }
  }
}
