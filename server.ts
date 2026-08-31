import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { CRAFTING_RECIPES } from './src/engine/items/CraftingSystem';

const PORT = 3000;
const PROTOCOL_VERSION = '1.0.0-phase9';
const DB_FILE = './server-realms-db.json';

// Persistent Storage Types
export interface Realm {
  realmId: string;
  realmName: string;
  worldSeed: number;
  worldPreset: string;
  ownerPlayerId: string; // Opaque UUID of creator
  moderators: string[];
  createdAt: number;
  lastPlayed: number;
  worldTime: number;
  weather: {
    type: string;
    intensity: number;
    windAngle: number;
    windSpeed: number;
    durationLeft: number;
  };
  bossState: {
    active: boolean;
    health: number;
    maxHealth: number;
    phase: number;
  };
  anomalyState: {
    active: boolean;
    timer: number;
  };
  worldBlocks: Record<string, number>; // coordinates "x,y,z" -> blockType (0 = tombstone AIR)
  worldBlockRevisions: Record<string, number>; // coordinates "x,y,z" -> revision number
}

export interface PlayerPersistentState {
  playerId: string; // Opaque UUID
  playerName: string; // Mutable display name
  inventory: Array<{ itemId: string; count: number } | null>;
  equipment: Record<string, string | null>;
  position: [number, number, number];
  stats: {
    health: number;
    maxHealth: number;
    level: number;
    exp: number;
  };
  questProgress: Record<string, any>;
  reputation: Record<string, number>;
  lastPlayed: number;
}

export interface DBStructure {
  realms: Record<string, Realm>;
  players: Record<string, PlayerPersistentState>;
}

// In-Memory active states
export interface ServerPlayer {
  sessionId: string; // session.playerId
  token: string;
  playerId: string;
  playerName: string;
  position: [number, number, number];
  rotation: [number, number, number];
  velocity: [number, number, number];
  animState: string;
  lastSequence: number;
  lastTimestamp: number;
  lastActive: number;
  lastAttackTime: number; // Server-side combat cooldown tracking
  isHost: boolean;
  ws: WebSocket | null;
  chatMsgCount: number; // For chat rate limiting
}

export interface ActiveSession {
  token: string;
  playerId: string;
  realmId: string;
  playerName: string;
  expiresAt: number;
}

// Initialize and seed JSON Database with Dirty-Flag & Asynchronous Persistence Architecture
export class JsonDatabase {
  private data: DBStructure;
  private isDirty = false;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.data = { realms: {}, players: {} };
    this.load();
    this.seedDefaults();

    // Asynchronous Periodic Persistence Loop (Flush dirty state every 2 seconds without blocking loop)
    this.flushTimer = setInterval(() => {
      this.flushAsync();
    }, 2000);
  }

  public load(): void {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(content);
        if (!this.data.realms) this.data.realms = {};
        if (!this.data.players) this.data.players = {};
      } else {
        this.flushSync();
      }
    } catch (e) {
      console.error('[DB] Error loading DB, resetting to empty defaults', e);
      this.flushSync();
    }
  }

  public markDirty(): void {
    this.isDirty = true;
  }

  public async flushAsync(): Promise<void> {
    if (!this.isDirty) return;
    this.isDirty = false;
    try {
      const tempFile = `${DB_FILE}.tmp`;
      const jsonStr = JSON.stringify(this.data, null, 2);
      await fs.promises.writeFile(tempFile, jsonStr, 'utf8');
      await fs.promises.rename(tempFile, DB_FILE);
    } catch (e) {
      console.error('[DB] Asynchronous persistence flush failed:', e);
      this.isDirty = true; // Retry on next frame
    }
  }

  public flushSync(): void {
    if (!this.isDirty && fs.existsSync(DB_FILE)) return;
    this.isDirty = false;
    try {
      const tempFile = `${DB_FILE}.tmp`;
      const jsonStr = JSON.stringify(this.data, null, 2);
      fs.writeFileSync(tempFile, jsonStr, 'utf8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (e) {
      console.error('[DB] Synchronous persistence flush failed:', e);
    }
  }

  private seedDefaults(): void {
    let changed = false;
    if (Object.keys(this.data.realms).length === 0) {
      const defaultOwner = 'system_admin_00000000-0000-0000-0000-000000000000';
      this.data.realms['realm_sunswept'] = {
        realmId: 'realm_sunswept',
        realmName: 'Sunswept Valley',
        worldSeed: 42819,
        worldPreset: 'standard',
        ownerPlayerId: defaultOwner,
        moderators: [],
        createdAt: Date.now(),
        lastPlayed: Date.now(),
        worldTime: 6000,
        weather: { type: 'clear', intensity: 0, windAngle: 0.5, windSpeed: 2.0, durationLeft: 180 },
        bossState: { active: false, health: 0, maxHealth: 0, phase: 1 },
        anomalyState: { active: false, timer: 0 },
        worldBlocks: {},
        worldBlockRevisions: {},
      };
      this.data.realms['realm_peak'] = {
        realmId: 'realm_peak',
        realmName: 'Aetheria Glacial Peak',
        worldSeed: 98765,
        worldPreset: 'mountainous',
        ownerPlayerId: defaultOwner,
        moderators: [],
        createdAt: Date.now(),
        lastPlayed: Date.now(),
        worldTime: 12000,
        weather: { type: 'clear', intensity: 0, windAngle: 0.5, windSpeed: 2.0, durationLeft: 180 },
        bossState: { active: false, health: 0, maxHealth: 0, phase: 1 },
        anomalyState: { active: false, timer: 0 },
        worldBlocks: {},
        worldBlockRevisions: {},
      };
      changed = true;
    }
    if (changed) {
      this.flushSync();
    }
  }

  public getRealm(id: string): Realm | undefined {
    return this.data.realms[id];
  }

  public setRealm(id: string, realm: Realm): void {
    this.data.realms[id] = realm;
    this.markDirty();
  }

  public deleteRealm(id: string): void {
    delete this.data.realms[id];
    this.markDirty();
    this.flushSync();
  }

  public getRealmsList(): Array<Partial<Realm>> {
    return Object.values(this.data.realms).map((r) => ({
      realmId: r.realmId,
      realmName: r.realmName,
      worldSeed: r.worldSeed,
      worldPreset: r.worldPreset,
      ownerPlayerId: r.ownerPlayerId,
      createdAt: r.createdAt,
      lastPlayed: r.lastPlayed,
    }));
  }

  public getPlayer(id: string): PlayerPersistentState | undefined {
    return this.data.players[id];
  }

  public setPlayer(id: string, player: PlayerPersistentState): void {
    this.data.players[id] = player;
    this.markDirty();
  }

  public destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushSync();
  }
}

export const db = new JsonDatabase();

// Process teardown listeners to flush dirty storage atomically
process.on('SIGINT', () => {
  console.log('[DB] SIGINT received. Flushing database state...');
  db.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[DB] SIGTERM received. Flushing database state...');
  db.destroy();
  process.exit(0);
});

process.on('exit', () => {
  db.flushSync();
});

// In-Memory active game maps
export const players: Map<string, ServerPlayer> = new Map(); // activeSessionId (playerId) -> ServerPlayer
export const disconnectedPlayers: Map<string, { player: ServerPlayer; expiry: number }> = new Map();
export const sessions: Map<string, ActiveSession> = new Map(); // sessionToken -> ActiveSession

// Simple HTML sanitizer to prevent XSS
export function sanitizeString(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// REST Endpoint Authorization Helper
export function getAuthenticatedSession(req: express.Request): ActiveSession | null {
  const authHeader = req.headers.authorization;
  let token = '';
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token && typeof req.query.token === 'string') {
    token = req.query.token;
  } else if (req.body && req.body.sessionToken && typeof req.body.sessionToken === 'string') {
    token = req.body.sessionToken;
  }
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || Date.now() > session.expiresAt) return null;
  return session;
}

// Rate Limiter middleware for REST Endpoints
const rateLimitMap: Map<string, { count: number; resetAt: number }> = new Map();
function restRateLimiter(maxRequests: number, windowMs: number) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const now = Date.now();
    let record = rateLimitMap.get(ip);
    if (!record || now > record.resetAt) {
      record = { count: 1, resetAt: now + windowMs };
      rateLimitMap.set(ip, record);
    } else {
      record.count++;
    }

    if (record.count > maxRequests) {
      res.status(429).json({ error: 'Too many requests. Please slow down.' });
      return;
    }
    next();
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);

  // REST API Endpoints for realms management
  app.get('/api/realms', (req, res) => {
    res.json(db.getRealmsList());
  });

  // Authenticated Realm Creation
  app.post('/api/realms', restRateLimiter(15, 10000), (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized: Valid session token required to create a realm' });
      return;
    }

    const { realmName, worldSeed, worldPreset } = req.body;
    if (!realmName || typeof realmName !== 'string' || realmName.trim().length === 0) {
      res.status(400).json({ error: 'Realm name is required and must be a non-empty string' });
      return;
    }
    if (realmName.length > 30) {
      res.status(400).json({ error: 'Realm name must not exceed 30 characters' });
      return;
    }

    const validPresets = ['standard', 'flat', 'mountainous', 'islands'];
    const preset = validPresets.includes(worldPreset) ? worldPreset : 'standard';
    const seed = Number.isFinite(Number(worldSeed)) ? Math.floor(Number(worldSeed)) : Math.floor(Math.random() * 9999999);
    const realmId = `realm_${crypto.randomUUID().substring(0, 8)}`;

    const newRealm: Realm = {
      realmId,
      realmName: sanitizeString(realmName).substring(0, 30),
      worldSeed: seed,
      worldPreset: preset,
      ownerPlayerId: session.playerId, // Authoritative creator binding
      moderators: [],
      createdAt: Date.now(),
      lastPlayed: Date.now(),
      worldTime: 6000,
      weather: { type: 'clear', intensity: 0, windAngle: 0.5, windSpeed: 2.0, durationLeft: 180 },
      bossState: { active: false, health: 0, maxHealth: 0, phase: 1 },
      anomalyState: { active: false, timer: 0 },
      worldBlocks: {},
      worldBlockRevisions: {},
    };

    db.setRealm(realmId, newRealm);
    console.log(`[Realm System] Created new multiplayer realm: ${realmName} (Owner: ${session.playerId})`);
    res.json(newRealm);
  });

  // Authenticated Realm Deletion
  app.delete('/api/realms/:id', restRateLimiter(15, 10000), (req, res) => {
    const session = getAuthenticatedSession(req);
    if (!session) {
      res.status(401).json({ error: 'Unauthorized: Valid session token required' });
      return;
    }

    const realmId = req.params.id;
    const realm = db.getRealm(realmId);
    if (!realm) {
      res.status(404).json({ error: 'Realm not found' });
      return;
    }

    // Authoritative Ownership Check: Only owner or admin can delete
    if (realm.ownerPlayerId && realm.ownerPlayerId !== session.playerId && session.playerId !== 'system_admin') {
      res.status(403).json({ error: 'Forbidden: Only the realm owner can delete this realm' });
      return;
    }

    db.deleteRealm(realmId);
    console.log(`[Realm System] Deleted realm: ${realmId} by owner ${session.playerId}`);
    res.json({ success: true });
  });

  // Cryptographically Secure Session Handshake Endpoint
  app.post('/api/session/join', restRateLimiter(30, 10000), (req, res) => {
    const { realmId, playerName, clientPlayerId } = req.body;
    if (!realmId || typeof realmId !== 'string') {
      res.status(400).json({ error: 'Realm ID is required' });
      return;
    }

    const targetRealm = db.getRealm(realmId);
    if (!targetRealm) {
      res.status(404).json({ error: 'Selected Realm does not exist' });
      return;
    }

    const cleanPlayerName = sanitizeString(playerName || 'Realm Explorer').trim().substring(0, 20) || 'Realm Explorer';

    // Opaque Persistent Player Identity validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let playerId: string;

    if (clientPlayerId && typeof clientPlayerId === 'string' && uuidRegex.test(clientPlayerId)) {
      playerId = clientPlayerId;
    } else {
      playerId = crypto.randomUUID(); // Fresh cryptographically random UUID
    }

    // Load or create player state
    let playerState = db.getPlayer(playerId);
    if (!playerState) {
      playerState = {
        playerId,
        playerName: cleanPlayerName,
        inventory: Array(36).fill(null),
        equipment: { head: null, chest: null, legs: null, mainHand: null },
        position: [0, 80, 0],
        stats: { health: 100, maxHealth: 100, level: 1, exp: 0 },
        questProgress: {},
        reputation: {},
        lastPlayed: Date.now(),
      };
      // Starter equipment & items in persistent storage
      playerState.inventory[0] = { itemId: 'wooden_pickaxe', count: 1 };
      playerState.inventory[1] = { itemId: 'wood_planks', count: 16 };
      playerState.inventory[2] = { itemId: 'torch', count: 8 };
      db.setPlayer(playerId, playerState);
    } else {
      // Update mutable display name without changing persistent identity
      playerState.playerName = cleanPlayerName;
      db.setPlayer(playerId, playerState);
    }

    // Generate cryptographically secure unguessable session token
    const token = 'tok_' + crypto.randomBytes(32).toString('hex');
    const session: ActiveSession = {
      token,
      playerId,
      realmId,
      playerName: cleanPlayerName,
      expiresAt: Date.now() + 1000 * 60 * 120, // 2 Hours expiration
    };

    sessions.set(token, session);
    console.log(`[Server-Issued Session] Created session for ${cleanPlayerName} (${playerId}) on realm ${targetRealm.realmName}`);

    res.json({
      sessionToken: token,
      playerId,
      realmId,
      realmName: targetRealm.realmName,
      worldSeed: targetRealm.worldSeed,
      worldPreset: targetRealm.worldPreset,
      playerState,
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', playersOnline: players.size, activeSessions: sessions.size });
  });

  // Attach WebSocket server on /ws path
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
    if (pathname === '/ws') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  // WebSocket lifecycle with strict session binding
  wss.on('connection', (ws: WebSocket, req: any) => {
    const url = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
    const token = url.searchParams.get('token');
    const session = token ? sessions.get(token) : null;

    if (!session || Date.now() > session.expiresAt) {
      console.warn(`[Server Security] Connection rejected. Missing, invalid, or expired session token.`);
      ws.send(
        JSON.stringify({
          type: 'CHAT_MESSAGE',
          senderName: 'SERVER_SECURITY',
          text: 'Access Denied: Invalid, expired or missing session token.',
          timestamp: Date.now(),
          protocolVersion: PROTOCOL_VERSION,
        })
      );
      ws.close();
      return;
    }

    const activeSessionId = session.playerId; // Authoritative Player ID strictly derived from socket token
    let packetCountInSecond = 0;
    const rateLimitTimer = setInterval(() => {
      packetCountInSecond = 0;
      const pl = players.get(activeSessionId);
      if (pl) pl.chatMsgCount = 0;
    }, 1000);

    ws.on('message', (message: string) => {
      // 1. Oversized Payload Security Boundary
      if (message.length > 32768) {
        console.warn(`[Server Security] Oversized packet rejected: ${message.length} bytes`);
        ws.send(
          JSON.stringify({
            type: 'CHAT_MESSAGE',
            senderName: 'SYSTEM',
            text: 'Packet oversized and rejected.',
            timestamp: Date.now(),
            protocolVersion: PROTOCOL_VERSION,
          })
        );
        ws.close();
        return;
      }

      // Packet Rate limiter
      packetCountInSecond++;
      if (packetCountInSecond > 65) {
        console.warn(`[Server Security] Packet rate limit exceeded by player session ${activeSessionId}.`);
        return;
      }

      // 2. Safe JSON Parsing
      let msg: any;
      try {
        msg = JSON.parse(message);
      } catch (err) {
        console.warn('[Server Security] Malformed JSON rejected');
        return;
      }

      // 3. Protocol Version verification
      if (!msg || msg.protocolVersion !== PROTOCOL_VERSION) {
        console.warn(`[Server Security] Invalid protocol version: ${msg?.protocolVersion}`);
        ws.send(
          JSON.stringify({
            type: 'CHAT_MESSAGE',
            senderName: 'SERVER_SECURITY',
            text: `Protocol version mismatch. Required: ${PROTOCOL_VERSION}`,
            timestamp: Date.now(),
            protocolVersion: PROTOCOL_VERSION,
          })
        );
        return;
      }

      const timestamp = msg.timestamp || Date.now();
      const currentServerTime = Date.now();
      if (timestamp > currentServerTime + 5000) {
        console.warn('[Server Security] Rejected future timestamp packet');
        return;
      }

      const realm = db.getRealm(session.realmId);
      if (!realm) {
        console.warn('[Server Security] Realm associated with session no longer exists');
        ws.close();
        return;
      }

      // Handle message types
      switch (msg.type) {
        case 'PLAYER_JOIN': {
          // Reconnect or fresh join logic
          if (disconnectedPlayers.has(activeSessionId)) {
            const cached = disconnectedPlayers.get(activeSessionId)!;
            disconnectedPlayers.delete(activeSessionId);
            const player = cached.player;
            player.ws = ws;
            player.lastActive = Date.now();
            players.set(activeSessionId, player);

            console.log(`[Server Multiplayer] Resumed session for player: ${player.playerName} (${activeSessionId})`);

            // Send full Authoritative Bootstrap State to reconnected player
            const savedPlayer = db.getPlayer(activeSessionId)!;
            ws.send(
              JSON.stringify({
                type: 'PLAYER_BOOTSTRAP',
                protocolVersion: PROTOCOL_VERSION,
                playerId: activeSessionId,
                playerName: session.playerName,
                position: player.position,
                inventory: savedPlayer.inventory,
                equipment: savedPlayer.equipment,
                stats: savedPlayer.stats,
                questProgress: savedPlayer.questProgress,
                reputation: savedPlayer.reputation,
                worldSeed: realm.worldSeed,
                worldPreset: realm.worldPreset,
                blocks: Object.entries(realm.worldBlocks).map(([coords, blockType]) => {
                  const [x, y, z] = coords.split(',').map(Number);
                  const revision = realm.worldBlockRevisions?.[coords] || 1;
                  return { x, y, z, blockType, revision };
                }),
                onlinePlayers: Array.from(players.values())
                  .filter((p) => sessions.get(p.token)?.realmId === session.realmId)
                  .map((p) => ({
                    sessionId: p.sessionId,
                    playerName: p.playerName,
                    position: p.position,
                    rotation: p.rotation,
                    animState: p.animState,
                  })),
                timestamp: Date.now(),
              })
            );

            broadcastToRealm(session.realmId, {
              type: 'CHAT_MESSAGE',
              senderName: 'SYSTEM',
              text: `${player.playerName} returned to the realm.`,
              timestamp: Date.now(),
              protocolVersion: PROTOCOL_VERSION,
            });
            return;
          }

          // Create authoritative player from persistent state
          const savedPlayer = db.getPlayer(activeSessionId)!;
          const player: ServerPlayer = {
            sessionId: activeSessionId,
            token: token,
            playerId: activeSessionId,
            playerName: session.playerName,
            position: savedPlayer.position || msg.spawnPos || [0, 80, 0],
            rotation: [0, 0, 0],
            velocity: [0, 0, 0],
            animState: 'idle',
            lastSequence: 0,
            lastTimestamp: timestamp,
            lastActive: Date.now(),
            lastAttackTime: 0,
            isHost: msg.isHost || false,
            ws,
            chatMsgCount: 0,
          };

          players.set(activeSessionId, player);
          console.log(`[Server Multiplayer] Bound connection identity for player: ${player.playerName} (${activeSessionId})`);

          // Send Authoritative Bootstrap State to joined client
          ws.send(
            JSON.stringify({
              type: 'PLAYER_BOOTSTRAP',
              protocolVersion: PROTOCOL_VERSION,
              playerId: activeSessionId,
              playerName: session.playerName,
              position: player.position,
              inventory: savedPlayer.inventory,
              equipment: savedPlayer.equipment,
              stats: savedPlayer.stats,
              questProgress: savedPlayer.questProgress,
              reputation: savedPlayer.reputation,
              worldSeed: realm.worldSeed,
              worldPreset: realm.worldPreset,
              blocks: Object.entries(realm.worldBlocks).map(([coords, blockType]) => {
                const [x, y, z] = coords.split(',').map(Number);
                const revision = realm.worldBlockRevisions?.[coords] || 1;
                return { x, y, z, blockType, revision };
              }),
              onlinePlayers: Array.from(players.values())
                .filter((p) => sessions.get(p.token)?.realmId === session.realmId)
                .map((p) => ({
                  sessionId: p.sessionId,
                  playerName: p.playerName,
                  position: p.position,
                  rotation: p.rotation,
                  animState: p.animState,
                })),
              timestamp: Date.now(),
            })
          );

          // Notify other players in this realm ONLY
          broadcastToOthersInRealm(activeSessionId, session.realmId, {
            type: 'PLAYER_JOIN',
            sessionId: activeSessionId,
            playerName: player.playerName,
            isHost: player.isHost,
            spawnPos: player.position,
            timestamp: Date.now(),
            protocolVersion: PROTOCOL_VERSION,
          });

          broadcastToRealm(session.realmId, {
            type: 'CHAT_MESSAGE',
            senderName: 'SYSTEM',
            text: `${player.playerName} joined the realm.`,
            timestamp: Date.now(),
            protocolVersion: PROTOCOL_VERSION,
          });
          break;
        }

        case 'TRANSFORM_SNAPSHOT': {
          const player = players.get(activeSessionId);
          if (!player) return;

          // Sequence & Timestamp validation (replay prevention)
          if (msg.sequence !== undefined && msg.sequence <= player.lastSequence) {
            return;
          }
          if (timestamp < player.lastTimestamp) {
            return;
          }

          if (msg.sequence !== undefined) player.lastSequence = msg.sequence;
          const lastTimestamp = player.lastTimestamp;
          player.lastTimestamp = timestamp;
          player.lastActive = Date.now();

          // Server-Authoritative Movement Speed & Coordinate Bounds Check
          const lastPos = player.position;
          const nextPos = msg.position as [number, number, number];

          if (!Array.isArray(nextPos) || nextPos.length !== 3 || nextPos.some((n) => !Number.isFinite(n))) {
            console.warn(`[Server Security] Invalid movement coordinates from ${player.playerName}`);
            return;
          }

          const dx = nextPos[0] - lastPos[0];
          const dy = nextPos[1] - lastPos[1];
          const dz = nextPos[2] - lastPos[2];
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

          const maxAllowedVelocity = 18.0; // 18 units per second
          const dt = Math.max(0.016, (timestamp - lastTimestamp) / 1000);
          const maxAllowedDistance = maxAllowedVelocity * dt * 1.5 + 2.0;

          if (distance > maxAllowedDistance && distance > 2.5) {
            console.warn(`[Server Security] Movement speed violation by ${player.playerName}. Teleport correction issued.`);
            ws.send(
              JSON.stringify({
                type: 'TRANSFORM_SNAPSHOT',
                sessionId: player.sessionId,
                position: player.position,
                rotation: player.rotation,
                velocity: [0, 0, 0],
                animState: 'idle',
                timestamp: Date.now(),
                protocolVersion: PROTOCOL_VERSION,
              })
            );
            return;
          }

          // Approve movement state
          player.position = nextPos;
          player.rotation = msg.rotation || [0, 0, 0];
          player.velocity = msg.velocity || [0, 0, 0];
          player.animState = msg.animState || 'idle';

          // Update player position in dirty persistence store (No synchronous file writing!)
          const pState = db.getPlayer(activeSessionId);
          if (pState) {
            pState.position = player.position;
            pState.lastPlayed = Date.now();
            db.setPlayer(activeSessionId, pState);
          }

          // Broadcast authoritative snapshot to all other players in this realm
          broadcastToOthersInRealm(activeSessionId, session.realmId, {
            type: 'TRANSFORM_SNAPSHOT',
            sessionId: activeSessionId,
            position: player.position,
            rotation: player.rotation,
            velocity: player.velocity,
            animState: player.animState,
            timestamp: Date.now(),
            protocolVersion: PROTOCOL_VERSION,
          });
          break;
        }

        case 'BLOCK_CHANGE': {
          const player = players.get(activeSessionId);
          if (!player) return;

          player.lastActive = Date.now();

          const bx = Number(msg.x);
          const by = Number(msg.y);
          const bz = Number(msg.z);

          if (!Number.isFinite(bx) || !Number.isFinite(by) || !Number.isFinite(bz)) return;
          if (by < 0 || by > 256) return; // World bounds check

          // Server-Authoritative Reach Validation
          const dx = bx - player.position[0];
          const dy = by - player.position[1];
          const dz = bz - player.position[2];
          const reachDistanceSq = dx * dx + dy * dy + dz * dz;

          const MAX_REACH = 8.0;
          if (reachDistanceSq > MAX_REACH * MAX_REACH) {
            console.warn(`[Server Security] Block action rejected: Out of reach by ${player.playerName}`);
            ws.send(
              JSON.stringify({
                type: 'BLOCK_CHANGE',
                x: bx,
                y: by,
                z: bz,
                oldBlockType: msg.oldBlockType,
                newBlockType: msg.oldBlockType, // Revert block back
                playerSessionId: activeSessionId,
                timestamp: Date.now(),
                protocolVersion: PROTOCOL_VERSION,
              })
            );
            return;
          }

          if (typeof msg.newBlockType !== 'number' || msg.newBlockType < 0 || msg.newBlockType > 255) {
            console.warn(`[Server Security] Invalid block type requested: ${msg.newBlockType}`);
            return;
          }

          // Solid block placement collision check (prevent trapping player inside block)
          if (msg.newBlockType !== 0) {
            const px = player.position[0];
            const py = player.position[1];
            const pz = player.position[2];
            const playerBoxMinX = px - 0.4;
            const playerBoxMaxX = px + 0.4;
            const playerBoxMinY = py;
            const playerBoxMaxY = py + 1.8;
            const playerBoxMinZ = pz - 0.4;
            const playerBoxMaxZ = pz + 0.4;

            if (
              bx + 1 > playerBoxMinX &&
              bx < playerBoxMaxX &&
              by + 1 > playerBoxMinY &&
              by < playerBoxMaxY &&
              bz + 1 > playerBoxMinZ &&
              bz < playerBoxMaxZ
            ) {
              console.warn(`[Server Security] Block placement inside player bounding box denied.`);
              return;
            }
          }

          // Block Revisioning & AIR Tombstone persistence
          const coordKey = `${bx},${by},${bz}`;
          if (!realm.worldBlockRevisions) realm.worldBlockRevisions = {};

          const currentRev = realm.worldBlockRevisions[coordKey] || 0;
          if (msg.revision !== undefined && typeof msg.revision === 'number' && msg.revision < currentRev) {
            console.warn(`[Server Security] Stale block update rejected (Client rev: ${msg.revision}, Server rev: ${currentRev})`);
            return;
          }

          const nextRev = currentRev + 1;
          realm.worldBlockRevisions[coordKey] = nextRev;

          // AIR Tombstone Fix: explicitly set 0 instead of deleting from map
          realm.worldBlocks[coordKey] = msg.newBlockType;
          realm.lastPlayed = Date.now();
          db.setRealm(session.realmId, realm); // Marks DB dirty

          // Propagate validated block change to everyone in the realm with revision tag
          broadcastToRealm(session.realmId, {
            type: 'BLOCK_CHANGE',
            x: bx,
            y: by,
            z: bz,
            oldBlockType: msg.oldBlockType,
            newBlockType: msg.newBlockType,
            playerSessionId: activeSessionId,
            revision: nextRev,
            timestamp: Date.now(),
            protocolVersion: PROTOCOL_VERSION,
          });
          break;
        }

        case 'CRAFT_REQUEST': {
          const player = players.get(activeSessionId);
          if (!player) return;

          player.lastActive = Date.now();

          const recipeId = msg.recipeId;
          const recipe = CRAFTING_RECIPES.find((r) => r.id === recipeId);
          if (!recipe) {
            console.warn(`[Server Security] Crafting request for non-existent recipe: ${recipeId}`);
            return;
          }

          const pState = db.getPlayer(activeSessionId);
          if (!pState) return;

          // Verify player inventory has all required input ingredients
          let canCraft = true;
          for (const input of recipe.inputs) {
            let totalFound = 0;
            pState.inventory.forEach((slot) => {
              if (slot && slot.itemId === input.itemId) {
                totalFound += slot.count;
              }
            });
            if (totalFound < input.count) {
              canCraft = false;
              break;
            }
          }

          if (!canCraft) {
            console.warn(`[Server Security] Crafting rejected: Insufficient ingredients for recipe ${recipeId}`);
            ws.send(
              JSON.stringify({
                type: 'INVENTORY_SNAPSHOT',
                inventory: pState.inventory,
                equipment: pState.equipment,
                timestamp: Date.now(),
                protocolVersion: PROTOCOL_VERSION,
              })
            );
            return;
          }

          // Consume input ingredients atomically
          for (const input of recipe.inputs) {
            let remaining = input.count;
            for (let i = 0; i < pState.inventory.length; i++) {
              const slot = pState.inventory[i];
              if (slot && slot.itemId === input.itemId) {
                if (slot.count > remaining) {
                  slot.count -= remaining;
                  remaining = 0;
                  break;
                } else {
                  remaining -= slot.count;
                  pState.inventory[i] = null;
                }
              }
              if (remaining <= 0) break;
            }
          }

          // Add crafted output stack to inventory
          const out = recipe.output;
          let added = false;
          // Try stacking into existing item slot first
          for (let i = 0; i < pState.inventory.length; i++) {
            const slot = pState.inventory[i];
            if (slot && slot.itemId === out.itemId) {
              slot.count += out.count;
              added = true;
              break;
            }
          }
          if (!added) {
            // Place into first empty slot
            for (let i = 0; i < pState.inventory.length; i++) {
              if (pState.inventory[i] === null) {
                pState.inventory[i] = { itemId: out.itemId, count: out.count };
                added = true;
                break;
              }
            }
          }

          db.setPlayer(activeSessionId, pState);
          console.log(`[Authoritative Crafting] ${player.playerName} crafted ${out.itemId} x${out.count}`);

          // Broadcast authoritative inventory snapshot to client
          ws.send(
            JSON.stringify({
              type: 'INVENTORY_SNAPSHOT',
              inventory: pState.inventory,
              equipment: pState.equipment,
              timestamp: Date.now(),
              protocolVersion: PROTOCOL_VERSION,
            })
          );
          break;
        }

        case 'INVENTORY_ACTION': {
          const player = players.get(activeSessionId);
          if (!player) return;

          player.lastActive = Date.now();

          const { actionType, fromSlot, toSlot, itemId, count } = msg;
          const pState = db.getPlayer(activeSessionId);
          if (!pState) return;

          if (fromSlot < 0 || fromSlot >= 36 || toSlot < 0 || toSlot >= 36) {
            console.warn('[Server Security] Inventory slot out of bounds');
            return;
          }

          if (actionType === 'move' || actionType === 'swap') {
            const itemFrom = pState.inventory[fromSlot];
            const itemTo = pState.inventory[toSlot];

            pState.inventory[fromSlot] = itemTo;
            pState.inventory[toSlot] = itemFrom;
            db.setPlayer(activeSessionId, pState);
          } else if (actionType === 'drop') {
            const sourceItem = pState.inventory[fromSlot];
            if (sourceItem && sourceItem.itemId === itemId && sourceItem.count >= count && count > 0) {
              sourceItem.count -= count;
              if (sourceItem.count <= 0) {
                pState.inventory[fromSlot] = null;
              }
              db.setPlayer(activeSessionId, pState);
            }
          }

          // Return authoritative inventory snapshot
          ws.send(
            JSON.stringify({
              type: 'INVENTORY_SNAPSHOT',
              inventory: pState.inventory,
              equipment: pState.equipment,
              timestamp: Date.now(),
              protocolVersion: PROTOCOL_VERSION,
            })
          );
          break;
        }

        case 'ATTACK_INTENT':
        case 'DAMAGE_EVENT': {
          const player = players.get(activeSessionId);
          if (!player) return;

          player.lastActive = Date.now();

          // Authoritative Attacker Identity & Target verification
          const attackerId = activeSessionId; // Ignore client-spoofed attackerId!
          const targetId = msg.targetId;

          const attacker = players.get(attackerId);
          const target = players.get(targetId);

          if (!attacker || !target) {
            console.warn('[Server Combat] Target does not exist on active server memory');
            return;
          }

          // Realm Isolation Check for Combat: Cannot attack players in another realm!
          const attackerSession = sessions.get(attacker.token);
          const targetSession = sessions.get(target.token);
          if (!attackerSession || !targetSession || attackerSession.realmId !== targetSession.realmId) {
            console.warn(`[Server Security] Cross-realm combat attempt rejected!`);
            return;
          }

          // Combat Cooldown Authority
          const now = Date.now();
          if (now - attacker.lastAttackTime < 400) {
            console.warn(`[Server Security] Attack rate limit / cooldown violation by ${attacker.playerName}`);
            return;
          }
          attacker.lastAttackTime = now;

          // Combat Reach Check
          const dx = attacker.position[0] - target.position[0];
          const dy = attacker.position[1] - target.position[1];
          const dz = attacker.position[2] - target.position[2];
          const distanceSq = dx * dx + dy * dy + dz * dz;

          const MAX_COMBAT_REACH = 10.0;
          if (distanceSq > MAX_COMBAT_REACH * MAX_COMBAT_REACH) {
            console.warn(`[Server Security] Combat action rejected: Out of range (${Math.sqrt(distanceSq).toFixed(2)} units)`);
            return;
          }

          // Authoritative Server Damage Calculation (Ignore client damageAmount!)
          const pState = db.getPlayer(attackerId);
          const equippedWeapon = pState?.equipment?.mainHand;
          let calculatedDamage = 12; // Base bare-hand damage
          if (equippedWeapon === 'diamond_sword') calculatedDamage = 35;
          else if (equippedWeapon === 'iron_sword') calculatedDamage = 24;
          else if (equippedWeapon === 'wooden_pickaxe') calculatedDamage = 16;

          // Check and update health in persistent database
          const targetState = db.getPlayer(targetId);
          if (targetState) {
            targetState.stats.health = Math.max(0, targetState.stats.health - calculatedDamage);
            db.setPlayer(targetId, targetState);

            console.log(
              `[Authoritative Combat] Player ${attacker.playerName} dealt ${calculatedDamage} damage to ${target.playerName}. Target health: ${targetState.stats.health}`
            );

            // Propagate verified damage event to everyone in the SAME realm
            broadcastToRealm(session.realmId, {
              type: 'DAMAGE_EVENT',
              attackerId,
              targetId,
              damageAmount: calculatedDamage,
              damageType: msg.damageType || 'physical',
              timestamp: Date.now(),
              protocolVersion: PROTOCOL_VERSION,
            });

            // Handle death event authoritatively
            if (targetState.stats.health <= 0) {
              console.log(`[Authoritative Combat] Player ${target.playerName} was slain!`);
              targetState.stats.health = targetState.stats.maxHealth;
              targetState.position = [0, 80, 0];
              db.setPlayer(targetId, targetState);

              broadcastToRealm(session.realmId, {
                type: 'CHAT_MESSAGE',
                senderName: 'SYSTEM',
                text: `${target.playerName} was slain by ${attacker.playerName}.`,
                timestamp: Date.now(),
                protocolVersion: PROTOCOL_VERSION,
              });
            }
          }
          break;
        }

        case 'CHAT_MESSAGE': {
          const player = players.get(activeSessionId);
          if (!player) return;

          player.lastActive = Date.now();

          // Chat rate limiting (Max 3 messages per second)
          player.chatMsgCount++;
          if (player.chatMsgCount > 3) {
            ws.send(
              JSON.stringify({
                type: 'CHAT_MESSAGE',
                senderName: 'SYSTEM',
                text: 'You are typing too fast! Please slow down.',
                timestamp: Date.now(),
                protocolVersion: PROTOCOL_VERSION,
              })
            );
            return;
          }

          // Chat sanitization & Length limit
          const cleanText = sanitizeString(msg.text || '').trim().substring(0, 100);
          if (!cleanText) return;

          // Realm Isolation for Chat: Broadcast strictly to active session realm!
          broadcastToRealm(session.realmId, {
            type: 'CHAT_MESSAGE',
            senderId: activeSessionId,
            senderName: player.playerName,
            text: cleanText,
            timestamp: Date.now(),
            protocolVersion: PROTOCOL_VERSION,
          });
          break;
        }
      }
    });

    ws.on('close', () => {
      clearInterval(rateLimitTimer);
      if (activeSessionId && players.has(activeSessionId)) {
        const player = players.get(activeSessionId)!;
        players.delete(activeSessionId);

        // Enter session grace period for reconnection resiliency (15 seconds)
        const GRACE_PERIOD_MS = 15000;
        disconnectedPlayers.set(activeSessionId, {
          player,
          expiry: Date.now() + GRACE_PERIOD_MS,
        });

        console.log(`[Server Multiplayer] Connection closed for player: ${player.playerName}. Entered 15s reconnect grace period.`);

        setTimeout(() => {
          if (disconnectedPlayers.has(activeSessionId)) {
            const cached = disconnectedPlayers.get(activeSessionId)!;
            if (Date.now() >= cached.expiry) {
              disconnectedPlayers.delete(activeSessionId);
              sessions.delete(player.token);

              console.log(`[Server Multiplayer] Grace period expired. Cleaned up player session: ${player.playerName}`);

              broadcastToRealm(session.realmId, {
                type: 'PLAYER_LEAVE',
                sessionId: activeSessionId,
                reason: 'Connection timeout',
                timestamp: Date.now(),
                protocolVersion: PROTOCOL_VERSION,
              });

              broadcastToRealm(session.realmId, {
                type: 'CHAT_MESSAGE',
                senderName: 'SYSTEM',
                text: `${player.playerName} has left the realm.`,
                timestamp: Date.now(),
                protocolVersion: PROTOCOL_VERSION,
              });
            }
          }
        }, GRACE_PERIOD_MS);
      }
    });
  });

  // Server broadcast helpers strictly restricted to active realm ID
  function broadcastToRealm(realmId: string, payload: any) {
    const serialized = JSON.stringify(payload);
    players.forEach((p) => {
      const pSession = sessions.get(p.token);
      if (pSession && pSession.realmId === realmId && p.ws && p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(serialized);
      }
    });
  }

  function broadcastToOthersInRealm(excludeSessionId: string, realmId: string, payload: any) {
    const serialized = JSON.stringify(payload);
    players.forEach((p) => {
      const pSession = sessions.get(p.token);
      if (p.sessionId !== excludeSessionId && pSession && pSession.realmId === realmId && p.ws && p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(serialized);
      }
    });
  }

  // Heartbeat monitor (pings active connections every 5s)
  setInterval(() => {
    const now = Date.now();
    players.forEach((player) => {
      if (now - player.lastActive > 15000) {
        console.log(`[Server Multiplayer] Heartbeat timeout for ${player.playerName}. Closing connection.`);
        if (player.ws) {
          player.ws.close();
        }
      } else {
        if (player.ws && player.ws.readyState === WebSocket.OPEN) {
          player.ws.send(
            JSON.stringify({
              type: 'INPUT_COMMAND',
              sessionId: 'ping',
              sequence: 0,
              moveVector: [0, 0],
              buttons: {},
              yaw: 0,
              pitch: 0,
              timestamp: now,
              protocolVersion: PROTOCOL_VERSION,
            })
          );
        }
      }
    });
  }, 5000);

  // Setup Vite development middleware OR static fallback for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server Launch] Server running authoritative sessions on http://localhost:${PORT}`);
  });
}

if (process.argv[1] && process.argv[1].endsWith('server.ts')) {
  startServer();
}
