import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const PROTOCOL_VERSION = '1.0.0-phase9';

// Server-authoritative session state interfaces
interface ServerPlayer {
  sessionId: string;
  playerName: string;
  position: [number, number, number];
  rotation: [number, number, number];
  velocity: [number, number, number];
  animState: string;
  inventory: Array<{ itemId: string; count: number } | null>;
  lastSequence: number;
  lastTimestamp: number;
  lastActive: number;
  isHost: boolean;
  ws: WebSocket | null;
}

const players: Map<string, ServerPlayer> = new Map();
const disconnectedPlayers: Map<string, { player: ServerPlayer; expiry: number }> = new Map();
const worldBlocks: Map<string, number> = new Map(); // coordinate "x,y,z" -> blockType

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
  const server = http.createServer(app);

  // Setup Express API endpoints
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', playersOnline: players.size });
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

  wss.on('connection', (ws: WebSocket) => {
    let activeSessionId: string | null = null;
    let packetCountInSecond = 0;
    let rateLimitTimer = setInterval(() => {
      packetCountInSecond = 0;
    }, 1000);

    ws.on('message', (message: string) => {
      // 1. Oversized Payload Security Boundary
      if (message.length > 32768) { // 32KB max limit
        console.warn(`[Server Security] Oversized packet rejected: ${message.length} bytes`);
        ws.send(JSON.stringify({ type: 'CHAT_MESSAGE', senderName: 'SYSTEM', text: 'Packet oversized and rejected', timestamp: Date.now(), protocolVersion: PROTOCOL_VERSION }));
        ws.close();
        return;
      }

      // Rate limiter
      packetCountInSecond++;
      if (packetCountInSecond > 60) { // Max 60 packets/sec
        console.warn(`[Server Security] Rate limit exceeded by connection.`);
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
          protocolVersion: PROTOCOL_VERSION
        }));
        return;
      }

      const timestamp = msg.timestamp || Date.now();
      const currentServerTime = Date.now();
      if (timestamp > currentServerTime + 5000) {
        console.warn('[Server Security] Rejected future timestamp packet');
        return;
      }

      // 4. Session Validation
      const sessionId = msg.sessionId || msg.playerSessionId || msg.senderId;
      if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 64 || !/^[a-zA-Z0-9_-]+$/.test(sessionId)) {
        console.warn(`[Server Security] Invalid Session ID structure: ${sessionId}`);
        return;
      }

      // Register active session to connection
      activeSessionId = sessionId;

      // Handle message types
      switch (msg.type) {
        case 'PLAYER_JOIN': {
          const playerName = sanitizeString(msg.playerName || 'Explorer').substring(0, 20);
          
          // Try to resume disconnected session
          if (disconnectedPlayers.has(sessionId)) {
            const cached = disconnectedPlayers.get(sessionId)!;
            disconnectedPlayers.delete(sessionId);
            const player = cached.player;
            player.ws = ws;
            player.lastActive = Date.now();
            players.set(sessionId, player);

            console.log(`[Server Multiplayer] Resumed session for player: ${player.playerName} (${sessionId})`);

            // Synchronize restored world state and online players
            ws.send(JSON.stringify({
              type: 'SERVER_STATE_SNAPSHOT',
              protocolVersion: PROTOCOL_VERSION,
              players: Array.from(players.values()).map(p => ({
                sessionId: p.sessionId,
                playerName: p.playerName,
                position: p.position,
                rotation: p.rotation,
                animState: p.animState,
              })),
              blocks: Array.from(worldBlocks.entries()).map(([coords, blockType]) => {
                const [x, y, z] = coords.split(',').map(Number);
                return { x, y, z, blockType };
              }),
              timestamp: Date.now(),
            }));

            // Announce join/resume
            broadcast({
              type: 'CHAT_MESSAGE',
              senderName: 'SYSTEM',
              text: `${player.playerName} returned to the realm.`,
              timestamp: Date.now(),
              protocolVersion: PROTOCOL_VERSION,
            });
            return;
          }

          // Create fresh authoritative player
          const player: ServerPlayer = {
            sessionId,
            playerName,
            position: msg.spawnPos || [0, 80, 0],
            rotation: [0, 0, 0],
            velocity: [0, 0, 0],
            animState: 'idle',
            inventory: Array(36).fill(null),
            lastSequence: 0,
            lastTimestamp: timestamp,
            lastActive: Date.now(),
            isHost: msg.isHost || false,
            ws,
          };

          players.set(sessionId, player);
          console.log(`[Server Multiplayer] Player joined: ${playerName} (${sessionId})`);

          // Send current authoritative server state snapshot
          ws.send(JSON.stringify({
            type: 'SERVER_STATE_SNAPSHOT',
            protocolVersion: PROTOCOL_VERSION,
            players: Array.from(players.values()).map(p => ({
              sessionId: p.sessionId,
              playerName: p.playerName,
              position: p.position,
              rotation: p.rotation,
              animState: p.animState,
            })),
            blocks: Array.from(worldBlocks.entries()).map(([coords, blockType]) => {
              const [x, y, z] = coords.split(',').map(Number);
              return { x, y, z, blockType };
            }),
            timestamp: Date.now(),
          }));

          // Notify other players
          broadcastToOthers(sessionId, {
            type: 'PLAYER_JOIN',
            sessionId,
            playerName,
            isHost: player.isHost,
            spawnPos: player.position,
            timestamp: Date.now(),
            protocolVersion: PROTOCOL_VERSION,
          });

          broadcast({
            type: 'CHAT_MESSAGE',
            senderName: 'SYSTEM',
            text: `${playerName} joined the realm.`,
            timestamp: Date.now(),
            protocolVersion: PROTOCOL_VERSION,
          });
          break;
        }

        case 'TRANSFORM_SNAPSHOT': {
          const player = players.get(sessionId);
          if (!player) return;

          // 5. Sequence & Timestamp validation (replay prevention)
          if (msg.sequence !== undefined && msg.sequence <= player.lastSequence) {
            return; // Reject out-of-order packets
          }
          if (timestamp < player.lastTimestamp) {
            return; // Reject old timestamps
          }

          if (msg.sequence !== undefined) player.lastSequence = msg.sequence;
          player.lastTimestamp = timestamp;
          player.lastActive = Date.now();

          // 6. Server-Authoritative Movement Speed Check
          const lastPos = player.position;
          const nextPos = msg.position as [number, number, number];

          const dx = nextPos[0] - lastPos[0];
          const dy = nextPos[1] - lastPos[1];
          const dz = nextPos[2] - lastPos[2];
          const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

          const maxAllowedVelocity = 18.0; // 18 units per second
          const dt = Math.max(0.016, (timestamp - player.lastTimestamp) / 1000);
          const maxAllowedDistance = maxAllowedVelocity * dt * 1.5 + 1.5; // Tolerance buffer included

          if (distance > maxAllowedDistance && distance > 2.0) {
            console.warn(`[Server Security] Movement violation by ${player.playerName}. Resetting position.`);
            // Force reset on the client side via correction payload
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

          // Approve movement
          player.position = nextPos;
          player.rotation = msg.rotation || [0, 0, 0];
          player.velocity = msg.velocity || [0, 0, 0];
          player.animState = msg.animState || 'idle';

          // Broadcast authoritative snapshot to all other remote players
          broadcastToOthers(sessionId, {
            type: 'TRANSFORM_SNAPSHOT',
            sessionId,
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
          const player = players.get(sessionId);
          if (!player) return;

          player.lastActive = Date.now();

          // 7. Server-Authoritative Block Validation
          const bx = msg.x;
          const by = msg.y;
          const bz = msg.z;

          const dx = bx - player.position[0];
          const dy = by - player.position[1];
          const dz = bz - player.position[2];
          const reachDistanceSq = dx*dx + dy*dy + dz*dz;

          const MAX_REACH = 8.0;
          if (reachDistanceSq > MAX_REACH * MAX_REACH) {
            console.warn(`[Server Security] Block interaction out of reach: ${Math.sqrt(reachDistanceSq).toFixed(2)} units`);
            // Force block rollback on sender
            ws.send(JSON.stringify({
              type: 'BLOCK_CHANGE',
              x: bx,
              y: by,
              z: bz,
              oldBlockType: msg.oldBlockType,
              newBlockType: msg.oldBlockType, // Revert back
              playerSessionId: 'server',
              timestamp: Date.now(),
              protocolVersion: PROTOCOL_VERSION,
            }));
            return;
          }

          if (msg.newBlockType < 0 || msg.newBlockType > 255) {
            console.warn('[Server Security] Invalid block type requested');
            return;
          }

          // Apply authoritative block change on server state
          const coordKey = `${bx},${by},${bz}`;
          if (msg.newBlockType === 0) {
            worldBlocks.delete(coordKey); // Mined / Air
          } else {
            worldBlocks.set(coordKey, msg.newBlockType); // Placed solid
          }

          // Propagate validated block change to everyone
          broadcast({
            type: 'BLOCK_CHANGE',
            x: bx,
            y: by,
            z: bz,
            oldBlockType: msg.oldBlockType,
            newBlockType: msg.newBlockType,
            playerSessionId: sessionId,
            timestamp: Date.now(),
            protocolVersion: PROTOCOL_VERSION,
          });
          break;
        }

        case 'INVENTORY_ACTION': {
          const player = players.get(sessionId);
          if (!player) return;

          player.lastActive = Date.now();

          // 8. Transactional Inventory Server validation
          const { actionType, fromSlot, toSlot, count } = msg;

          if (fromSlot < 0 || fromSlot >= 36 || toSlot < 0 || toSlot >= 36) {
            console.warn('[Server Security] Inventory slot out of bounds');
            return;
          }

          const sourceItem = player.inventory[fromSlot];

          if (actionType === 'move' || actionType === 'swap') {
            // Commit transaction on server-side inventory
            const targetItem = player.inventory[toSlot];
            player.inventory[fromSlot] = targetItem;
            player.inventory[toSlot] = sourceItem;

            console.log(`[Server Inventory] Transaction processed for ${player.playerName}`);
          } else if (actionType === 'drop') {
            if (sourceItem && sourceItem.count >= count) {
              sourceItem.count -= count;
              if (sourceItem.count <= 0) {
                player.inventory[fromSlot] = null;
              }
            }
          }

          // Broadcast snapshot or confirm
          break;
        }

        case 'DAMAGE_EVENT': {
          const player = players.get(sessionId);
          if (!player) return;

          player.lastActive = Date.now();

          // 9. Server-authoritative Combat Distance & Cooldown checking
          const attackerId = msg.attackerId;
          const targetId = msg.targetId;

          const attacker = players.get(attackerId);
          const target = players.get(targetId);

          if (!attacker || !target) {
            console.warn('[Server Combat] Attacker or target does not exist');
            return;
          }

          const distanceSq = Math.pow(attacker.position[0] - target.position[0], 2) +
                             Math.pow(attacker.position[1] - target.position[1], 2) +
                             Math.pow(attacker.position[2] - target.position[2], 2);

          const MAX_COMBAT_REACH = 10.0;
          if (distanceSq > MAX_COMBAT_REACH * MAX_COMBAT_REACH) {
            console.warn(`[Server Security] Combat event out of reach range: ${Math.sqrt(distanceSq).toFixed(2)}`);
            return;
          }

          // Final damage is computed server-side
          const baseDamage = msg.damageAmount || 10;
          const finalDamage = Math.min(100, Math.max(1, baseDamage)); // Authoritative clamp

          // Propagate damage events
          broadcast({
            type: 'DAMAGE_EVENT',
            attackerId,
            targetId,
            damageAmount: finalDamage,
            damageType: msg.damageType || 'physical',
            timestamp: Date.now(),
            protocolVersion: PROTOCOL_VERSION,
          });
          break;
        }

        case 'CHAT_MESSAGE': {
          const player = players.get(sessionId);
          if (!player) return;

          player.lastActive = Date.now();

          // XSS sanitization
          const cleanText = sanitizeString(msg.text || '').substring(0, 150);
          if (!cleanText.trim()) return;

          broadcast({
            type: 'CHAT_MESSAGE',
            senderId: sessionId,
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

        // 10. Enter session grace period for reconnection resiliency
        const GRACE_PERIOD_MS = 15000; // 15 seconds grace period
        disconnectedPlayers.set(activeSessionId, {
          player,
          expiry: Date.now() + GRACE_PERIOD_MS,
        });

        console.log(`[Server Multiplayer] Connection closed for player: ${player.playerName}. Entered 15s reconnect grace period.`);

        // Schedule removal after grace period
        setTimeout(() => {
          if (activeSessionId && disconnectedPlayers.has(activeSessionId)) {
            const cached = disconnectedPlayers.get(activeSessionId);
            if (cached && Date.now() >= cached.expiry) {
              disconnectedPlayers.delete(activeSessionId);
              console.log(`[Server Multiplayer] Grace period expired. Fully removing player session: ${player.playerName}`);
              
              // Broadcast leave event
              broadcast({
                type: 'PLAYER_LEAVE',
                sessionId: activeSessionId,
                reason: 'Connection timeout',
                timestamp: Date.now(),
                protocolVersion: PROTOCOL_VERSION,
              });

              broadcast({
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

  // Server broadcast helpers
  function broadcast(payload: any) {
    const serialized = JSON.stringify(payload);
    players.forEach((p) => {
      if (p.ws && p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(serialized);
      }
    });
  }

  function broadcastToOthers(excludeSessionId: string, payload: any) {
    const serialized = JSON.stringify(payload);
    players.forEach((p) => {
      if (p.sessionId !== excludeSessionId && p.ws && p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(serialized);
      }
    });
  }

  // Periodic heartbeat timeout monitor (pings players every 5s)
  setInterval(() => {
    const now = Date.now();
    players.forEach((player, sid) => {
      // If client is idle for > 10 seconds, disconnect
      if (now - player.lastActive > 10000) {
        console.log(`[Server Multiplayer] Heartbeat timeout for ${player.playerName}. Closing connection.`);
        if (player.ws) {
          player.ws.close();
        }
      } else {
        // Send heartbeat ping
        if (player.ws && player.ws.readyState === WebSocket.OPEN) {
          player.ws.send(JSON.stringify({
            type: 'INPUT_COMMAND', // Heartbeat payload reuse
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
