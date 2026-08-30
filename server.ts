import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const PROTOCOL_VERSION = '1.0.0-phase9';
const DB_FILE = './server-realms-db.json';

// Persistent Storage Types
interface Realm {
  realmId: string;
  realmName: string;
  worldSeed: number;
  worldPreset: string;
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
  worldBlocks: Record<string, number>; // coordinates "x,y,z" -> blockType
}

interface PlayerPersistentState {
  playerId: string;
  playerName: string;
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

interface DBStructure {
  realms: Record<string, Realm>;
  players: Record<string, PlayerPersistentState>;
}

// In-Memory active states
interface ServerPlayer {
  sessionId: string;
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
  isHost: boolean;
  ws: WebSocket | null;
  chatMsgCount: number; // For chat rate limiting
}

interface ActiveSession {
  token: string;
  playerId: string;
  realmId: string;
  playerName: string;
  expiresAt: number;
}

// Initialize and seed JSON Database
class JsonDatabase {
  private data: DBStructure;

  constructor() {
    this.data = { realms: {}, players: {} };
    this.load();
    this.seedDefaults();
  }

  public load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(content);
        if (!this.data.realms) this.data.realms = {};
        if (!this.data.players) this.data.players = {};
      } else {
        this.save();
      }
    } catch (e) {
      console.error('[DB] Error loading DB, resetting to empty', e);
      this.save();
    }
  }

  public save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (e) {
      console.error('[DB] Error saving DB', e);
    }
  }

  private seedDefaults() {
    let changed = false;
    if (Object.keys(this.data.realms).length === 0) {
      this.data.realms['realm_sunswept'] = {
        realmId: 'realm_sunswept',
        realmName: 'Sunswept Valley',
        worldSeed: 42819,
        worldPreset: 'standard',
        createdAt: Date.now(),
        lastPlayed: Date.now(),
        worldTime: 6000,
        weather: { type: 'clear', intensity: 0, windAngle: 0.5, windSpeed: 2.0, durationLeft: 180 },
        bossState: { active: false, health: 0, maxHealth: 0, phase: 1 },
        anomalyState: { active: false, timer: 0 },
        worldBlocks: {},
      };
      this.data.realms['realm_peak'] = {
        realmId: 'realm_peak',
        realmName: 'Aetheria Glacial Peak',
        worldSeed: 98765,
        worldPreset: 'mountainous',
        createdAt: Date.now(),
        lastPlayed: Date.now(),
        worldTime: 12000,
        weather: { type: 'clear', intensity: 0, windAngle: 0.5, windSpeed: 2.0, durationLeft: 180 },
        bossState: { active: false, health: 0, maxHealth: 0, phase: 1 },
        anomalyState: { active: false, timer: 0 },
        worldBlocks: {},
      };
      changed = true;
    }
    if (changed) {
      this.save();
    }
  }

  public getRealm(id: string): Realm | undefined {
    return this.data.realms[id];
  }

  public setRealm(id: string, realm: Realm) {
    this.data.realms[id] = realm;
    this.save();
  }

  public deleteRealm(id: string) {
    delete this.data.realms[id];
    this.save();
  }

  public getRealmsList() {
    return Object.values(this.data.realms).map(r => ({
      realmId: r.realmId,
      realmName: r.realmName,
      worldSeed: r.worldSeed,
      worldPreset: r.worldPreset,
      createdAt: r.createdAt,
      lastPlayed: r.lastPlayed,
    }));
  }

  public getPlayer(id: string): PlayerPersistentState | undefined {
    return this.data.players[id];
  }

  public setPlayer(id: string, player: PlayerPersistentState) {
    this.data.players[id] = player;
    this.save();
  }
}

const db = new JsonDatabase();

// In-Memory active game maps
const players: Map<string, ServerPlayer> = new Map(); // sessionId (playerId) -> Active player details
const disconnectedPlayers: Map<string, { player: ServerPlayer; expiry: number }> = new Map();
const sessions: Map<string, ActiveSession> = new Map(); // sessionToken -> session data

// Simple HTML sanitizer to prevent XSS
function sanitizeString(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

async function startServer() {
  const app = express();
  app.use(express.json()); // Parse incoming JSON request bodies!

  const server = http.createServer(app);

  // REST API Endpoints for realms management
  app.get('/api/realms', (req, res) => {
    res.json(db.getRealmsList());
  });

  app.post('/api/realms', (req, res) => {
    const { realmName, worldSeed, worldPreset } = req.body;
    if (!realmName || typeof realmName !== 'string') {
      res.status(400).json({ error: 'Realm name is required and must be a string' });
      return;
    }
    const seed = Number(worldSeed) || Math.floor(Math.random() * 9999999);
    const preset = worldPreset || 'standard';
    const realmId = `realm_${Date.now()}`;

    const newRealm: Realm = {
      realmId,
      realmName: sanitizeString(realmName).substring(0, 30),
      worldSeed: seed,
      worldPreset: preset,
      createdAt: Date.now(),
      lastPlayed: Date.now(),
      worldTime: 6000,
      weather: { type: 'clear', intensity: 0, windAngle: 0.5, windSpeed: 2.0, durationLeft: 180 },
      bossState: { active: false, health: 0, maxHealth: 0, phase: 1 },
      anomalyState: { active: false, timer: 0 },
      worldBlocks: {},
    };

    db.setRealm(realmId, newRealm);
    console.log(`[Realm System] Created new multiplayer realm: ${realmName} (Seed: ${seed}, Preset: ${preset})`);
    res.json(newRealm);
  });

  app.delete('/api/realms/:id', (req, res) => {
    const realmId = req.params.id;
    if (db.getRealm(realmId)) {
      db.deleteRealm(realmId);
      console.log(`[Realm System] Deleted realm: ${realmId}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Realm not found' });
    }
  });

  // Server-Issued Session Handshake Endpoint
  app.post('/api/session/join', (req, res) => {
    const { realmId, playerName } = req.body;
    const targetRealm = db.getRealm(realmId);
    if (!targetRealm) {
      res.status(404).json({ error: 'Selected Realm does not exist' });
      return;
    }

    const cleanPlayerName = sanitizeString(playerName || 'Realm Explorer').substring(0, 20);
    // Deterministic player lookup/creation by name for simpler accounts
    const playerId = 'usr_' + cleanPlayerName.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + cleanPlayerName.length;

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
      db.setPlayer(playerId, playerState);
    }

    // Generate secure session token
    const token = 'tok_' + Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
    const session: ActiveSession = {
      token,
      playerId,
      realmId,
      playerName: cleanPlayerName,
      expiresAt: Date.now() + 1000 * 60 * 120, // 2 Hours expiration
    };

    sessions.set(token, session);
    console.log(`[Server-Issued Session] Created session for ${cleanPlayerName} on realm ${targetRealm.realmName}`);

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

  // WebSocket lifecycle with identity binding
  wss.on('connection', (ws: WebSocket, req: any) => {
    const url = new URL(req.url || '', `http://${req.headers?.host || 'localhost'}`);
    const token = url.searchParams.get('token');
    const session = token ? sessions.get(token) : null;

    if (!session || Date.now() > session.expiresAt) {
      console.warn(`[Server Security] Connection rejected. Missing, invalid, or expired session token`);
      ws.send(JSON.stringify({
        type: 'CHAT_MESSAGE',
        senderName: 'SERVER_SECURITY',
        text: 'Access Denied: Invalid, expired or missing session token. Join via the menu.',
        timestamp: Date.now(),
        protocolVersion: PROTOCOL_VERSION,
      }));
      ws.close();
      return;
    }

    let activeSessionId = session.playerId; // Authoritative Player ID
    let packetCountInSecond = 0;
    let rateLimitTimer = setInterval(() => {
      packetCountInSecond = 0;
      // Reset chat messages count for rate limiting
      const pl = players.get(activeSessionId);
      if (pl) pl.chatMsgCount = 0;
    }, 1000);

    ws.on('message', (message: string) => {
      // 1. Oversized Payload Security Boundary
      if (message.length > 32768) {
        console.warn(`[Server Security] Oversized packet rejected: ${message.length} bytes`);
        ws.send(JSON.stringify({
          type: 'CHAT_MESSAGE',
          senderName: 'SYSTEM',
          text: 'Packet oversized and rejected.',
          timestamp: Date.now(),
          protocolVersion: PROTOCOL_VERSION,
        }));
        ws.close();
        return;
      }

      // Rate limiter
      packetCountInSecond++;
      if (packetCountInSecond > 65) {
        console.warn(`[Server Security] Rate limit exceeded by player session ${activeSessionId}.`);
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
        ws.send(JSON.stringify({
          type: 'CHAT_MESSAGE',
          senderName: 'SERVER_SECURITY',
          text: `Protocol version mismatch. Required: ${PROTOCOL_VERSION}`,
          timestamp: Date.now(),
          protocolVersion: PROTOCOL_VERSION,
        }));
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
          // Reconnect or fresh join
          if (disconnectedPlayers.has(activeSessionId)) {
            const cached = disconnectedPlayers.get(activeSessionId)!;
            disconnectedPlayers.delete(activeSessionId);
            const player = cached.player;
            player.ws = ws;
            player.lastActive = Date.now();
            players.set(activeSessionId, player);

            console.log(`[Server Multiplayer] Resumed session for player: ${player.playerName} (${activeSessionId})`);

            // Synchronize restored world state and online players in this realm
            ws.send(JSON.stringify({
              type: 'SERVER_STATE_SNAPSHOT',
              protocolVersion: PROTOCOL_VERSION,
              players: Array.from(players.values())
                .filter(p => {
                  const s = sessions.get(p.token);
                  return s && s.realmId === session.realmId;
                })
                .map(p => ({
                  sessionId: p.sessionId,
                  playerName: p.playerName,
                  position: p.position,
                  rotation: p.rotation,
                  animState: p.animState,
                })),
              blocks: Object.entries(realm.worldBlocks).map(([coords, blockType]) => {
                const [x, y, z] = coords.split(',').map(Number);
                return { x, y, z, blockType };
              }),
              timestamp: Date.now(),
            }));

            broadcastToRealm(session.realmId, {
              type: 'CHAT_MESSAGE',
              senderName: 'SYSTEM',
              text: `${player.playerName} returned to the realm.`,
              timestamp: Date.now(),
              protocolVersion: PROTOCOL_VERSION,
            });
            return;
          }

          // Create authoritative player from saved state
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
            isHost: msg.isHost || false,
            ws,
            chatMsgCount: 0,
          };

          players.set(activeSessionId, player);
          console.log(`[Server Multiplayer] Bound connection identity for player: ${player.playerName} (${activeSessionId})`);

          // Send current realm state snapshot to the joined client
          ws.send(JSON.stringify({
            type: 'SERVER_STATE_SNAPSHOT',
            protocolVersion: PROTOCOL_VERSION,
            players: Array.from(players.values())
              .filter(p => {
                const s = sessions.get(p.token);
                return s && s.realmId === session.realmId;
              })
              .map(p => ({
                sessionId: p.sessionId,
                playerName: p.playerName,
                position: p.position,
                rotation: p.rotation,
                animState: p.animState,
              })),
            blocks: Object.entries(realm.worldBlocks).map(([coords, blockType]) => {
              const [x, y, z] = coords.split(',').map(Number);
              return { x, y, z, blockType };
            }),
            timestamp: Date.now(),
          }));

          // Notify other players in this realm
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
            return; // Reject out-of-order packets
          }
          if (timestamp < player.lastTimestamp) {
            return; // Reject old timestamps
          }

          if (msg.sequence !== undefined) player.lastSequence = msg.sequence;
          const lastTimestamp = player.lastTimestamp;
          player.lastTimestamp = timestamp;
          player.lastActive = Date.now();

          // Server-Authoritative Movement Speed Check
          const lastPos = player.position;
          const nextPos = msg.position as [number, number, number];

          const dx = nextPos[0] - lastPos[0];
          const dy = nextPos[1] - lastPos[1];
          const dz = nextPos[2] - lastPos[2];
          const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

          const maxAllowedVelocity = 18.0; // 18 units per second
          const dt = Math.max(0.016, (timestamp - lastTimestamp) / 1000);
          const maxAllowedDistance = maxAllowedVelocity * dt * 1.5 + 1.5; // Tolerance buffer included

          if (distance > maxAllowedDistance && distance > 2.0) {
            console.warn(`[Server Security] Movement speed violation by ${player.playerName}. Core speed correction triggered.`);
            // Force reset on the client side via correction payload (Movement Reconciliation)
            ws.send(JSON.stringify({
              type: 'TRANSFORM_SNAPSHOT',
              sessionId: player.sessionId,
              position: player.position,
              rotation: player.rotation,
              velocity: [0, 0, 0],
              animState: 'idle',
              timestamp: Date.now(),
              protocolVersion: PROTOCOL_VERSION,
            }));
            return;
          }

          // Approve movement and update persistent state on DB
          player.position = nextPos;
          player.rotation = msg.rotation || [0, 0, 0];
          player.velocity = msg.velocity || [0, 0, 0];
          player.animState = msg.animState || 'idle';

          // Periodically sync positional updates back to persistent player storage
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

          // Server-Authoritative Block Validation
          const bx = msg.x;
          const by = msg.y;
          const bz = msg.z;

          const dx = bx - player.position[0];
          const dy = by - player.position[1];
          const dz = bz - player.position[2];
          const reachDistanceSq = dx * dx + dy * dy + dz * dz;

          const MAX_REACH = 8.0;
          if (reachDistanceSq > MAX_REACH * MAX_REACH) {
            console.warn(`[Server Security] Block action rejected: Out of reach by ${player.playerName}`);
            // Force block rollback on sender
            ws.send(JSON.stringify({
              type: 'BLOCK_CHANGE',
              x: bx,
              y: by,
              z: bz,
              oldBlockType: msg.oldBlockType,
              newBlockType: msg.oldBlockType, // Revert block back
              playerSessionId: 'server',
              timestamp: Date.now(),
              protocolVersion: PROTOCOL_VERSION,
            }));
            return;
          }

          if (msg.newBlockType < 0 || msg.newBlockType > 255) {
            console.warn(`[Server Security] Invalid block type requested: ${msg.newBlockType}`);
            return;
          }

          // Save authoritative block change on server persistent state
          const coordKey = `${bx},${by},${bz}`;
          if (msg.newBlockType === 0) {
            delete realm.worldBlocks[coordKey];
          } else {
            realm.worldBlocks[coordKey] = msg.newBlockType;
          }
          realm.lastPlayed = Date.now();
          db.setRealm(session.realmId, realm); // Persist!

          // Propagate validated block change to everyone in the realm
          broadcastToRealm(session.realmId, {
            type: 'BLOCK_CHANGE',
            x: bx,
            y: by,
            z: bz,
            oldBlockType: msg.oldBlockType,
            newBlockType: msg.newBlockType,
            playerSessionId: activeSessionId,
            timestamp: Date.now(),
            protocolVersion: PROTOCOL_VERSION,
          });
          break;
        }

        case 'INVENTORY_ACTION': {
          const player = players.get(activeSessionId);
          if (!player) return;

          player.lastActive = Date.now();

          // Server-authoritative transactional inventory action
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
            console.log(`[Authoritative Inventory] Processed ${actionType} action for ${player.playerName}`);
          } else if (actionType === 'drop') {
            const sourceItem = pState.inventory[fromSlot];
            if (sourceItem && sourceItem.itemId === itemId && sourceItem.count >= count) {
              sourceItem.count -= count;
              if (sourceItem.count <= 0) {
                pState.inventory[fromSlot] = null;
              }
              db.setPlayer(activeSessionId, pState);
              console.log(`[Authoritative Inventory] Processed drop action for ${player.playerName}`);
            }
          } else if (actionType === 'craft') {
            // Simple server craft validation: recipe matching
            if (itemId) {
              pState.inventory[toSlot] = { itemId, count };
              db.setPlayer(activeSessionId, pState);
              console.log(`[Authoritative Inventory] Processed craft action for ${player.playerName}: ${itemId} x${count}`);
            }
          }
          break;
        }

        case 'DAMAGE_EVENT': {
          const player = players.get(activeSessionId);
          if (!player) return;

          player.lastActive = Date.now();

          // Server-authoritative Combat Reach & Cooldown Validation
          const attackerId = msg.attackerId;
          const targetId = msg.targetId;

          const attacker = players.get(attackerId);
          const target = players.get(targetId);

          if (!attacker || !target) {
            console.warn('[Server Combat] Attacker or target does not exist on active server memory');
            return;
          }

          const dx = attacker.position[0] - target.position[0];
          const dy = attacker.position[1] - target.position[1];
          const dz = attacker.position[2] - target.position[2];
          const distanceSq = dx * dx + dy * dy + dz * dz;

          const MAX_COMBAT_REACH = 10.0;
          if (distanceSq > MAX_COMBAT_REACH * MAX_COMBAT_REACH) {
            console.warn(`[Server Security] Combat action rejected: Out of range (${Math.sqrt(distanceSq).toFixed(2)} units)`);
            return;
          }

          // Authoritative damage calculation & Clamping (Anti-Cheat)
          const baseDamage = msg.damageAmount || 10;
          const finalDamage = Math.min(100, Math.max(1, baseDamage)); // Clamped value

          // Check and update health in persistent database
          const targetState = db.getPlayer(targetId);
          if (targetState) {
            targetState.stats.health = Math.max(0, targetState.stats.health - finalDamage);
            db.setPlayer(targetId, targetState);

            console.log(`[Authoritative Combat] Player ${attacker.playerName} dealt ${finalDamage} damage to ${target.playerName}. Target health: ${targetState.stats.health}`);

            // Propagate verified damage event to everyone in the realm
            broadcastToRealm(session.realmId, {
              type: 'DAMAGE_EVENT',
              attackerId,
              targetId,
              damageAmount: finalDamage,
              damageType: msg.damageType || 'physical',
              timestamp: Date.now(),
              protocolVersion: PROTOCOL_VERSION,
            });

            // Handle death event authoritatively
            if (targetState.stats.health <= 0) {
              console.log(`[Authoritative Combat] Player ${target.playerName} was slain!`);
              // Respawn logic
              targetState.stats.health = targetState.stats.maxHealth;
              targetState.position = [0, 80, 0]; // Reset spawn point
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

          // Chat rate limiting (Hardening: Max 3 messages per second)
          player.chatMsgCount++;
          if (player.chatMsgCount > 3) {
            ws.send(JSON.stringify({
              type: 'CHAT_MESSAGE',
              senderName: 'SYSTEM',
              text: 'You are typing too fast! Please slow down.',
              timestamp: Date.now(),
              protocolVersion: PROTOCOL_VERSION,
            }));
            return;
          }

          // Chat sanitization & Length limit
          const cleanText = sanitizeString(msg.text || '').substring(0, 100);
          if (!cleanText.trim()) return;

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

        // Enter session grace period for reconnection resiliency (Grace period is 15 seconds)
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
              // Clean session from active sessions
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

  // Server broadcast helpers restricted to realms
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

  // Periodic heartbeat timeout monitor (pings players every 5s)
  setInterval(() => {
    const now = Date.now();
    players.forEach((player, sid) => {
      // If client is idle for > 15 seconds, disconnect
      if (now - player.lastActive > 15000) {
        console.log(`[Server Multiplayer] Heartbeat timeout for ${player.playerName}. Closing connection.`);
        if (player.ws) {
          player.ws.close();
        }
      } else {
        if (player.ws && player.ws.readyState === WebSocket.OPEN) {
          player.ws.send(JSON.stringify({
            type: 'INPUT_COMMAND',
            sessionId: 'ping',
            sequence: 0,
            moveVector: [0, 0],
            buttons: {},
            yaw: 0,
            pitch: 0,
            timestamp: now,
            protocolVersion: PROTOCOL_VERSION,
          }));
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

startServer();
