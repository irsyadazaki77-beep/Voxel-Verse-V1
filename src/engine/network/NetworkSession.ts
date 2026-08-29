// Unified Network Session & Replication Manager (Phase 3 Authoritative)
import * as THREE from 'three';
import { LocalLoopbackTransport, NetworkTransport, TransportStats } from './NetworkTransport';
import { WebSocketTransport } from './WebSocketTransport';
import {
  PROTOCOL_VERSION,
  NetworkMessagePayload,
  TransformSnapshotMessage,
  BlockChangeMessage,
  ChatMessageMessage,
  DamageEventMessage,
} from './NetworkProtocol';
import { RemotePlayer } from './RemotePlayer';

type ChatListener = (msg: { senderName: string; text: string; timestamp: number }) => void;
type BlockChangeListener = (event: { x: number; y: number; z: number; oldBlock: number; newBlock: number }) => void;

export class NetworkSession {
  private static instance: NetworkSession | null = null;

  public localSessionId: string;
  public localPlayerName = 'Realm Explorer';
  public isHost = true;
  public isMultiplayerActive = false;

  private transport: NetworkTransport;
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private sceneRef: THREE.Scene | null = null;

  private chatListeners: Set<ChatListener> = new Set();
  private blockChangeListeners: Set<BlockChangeListener> = new Set();

  private lastTransformBroadcast = 0;
  private networkTickInterval = 1000 / 20; // 20 Hz Network Tick Rate
  private currentSequence = 0;

  // Callback for player position corrections from authoritative server
  private onPlayerCorrectedCallback: ((pos: [number, number, number], vel: [number, number, number]) => void) | null = null;

  constructor() {
    this.localSessionId = `player_${Math.random().toString(36).substring(2, 8)}`;
    this.transport = new LocalLoopbackTransport();
  }

  public static getInstance(): NetworkSession {
    if (!NetworkSession.instance) {
      NetworkSession.instance = new NetworkSession();
    }
    return NetworkSession.instance;
  }

  public setTransportMode(mode: 'loopback' | 'websocket', address?: string): void {
    if (this.transport) {
      this.transport.disconnect();
    }
    if (mode === 'websocket') {
      this.transport = new WebSocketTransport();
    } else {
      this.transport = new LocalLoopbackTransport();
    }
  }

  public onPlayerCorrected(cb: (pos: [number, number, number], vel: [number, number, number]) => void): void {
    this.onPlayerCorrectedCallback = cb;
  }

  public isConnected(): boolean {
    return this.transport.isConnected();
  }

  public async startSession(
    scene: THREE.Scene,
    isMultiplayer = false,
    playerName = 'Realm Explorer',
    useWebSocket = false,
    serverAddress?: string
  ): Promise<boolean> {
    this.sceneRef = scene;
    this.isMultiplayerActive = isMultiplayer;
    this.localPlayerName = playerName;

    if (useWebSocket) {
      this.setTransportMode('websocket', serverAddress);
    } else {
      this.setTransportMode('loopback');
    }

    const connected = await this.transport.connect(serverAddress);
    if (!connected && useWebSocket) {
      console.error('[NetworkSession] WebSocket server connection failed. Denying automatic loopback fallback.');
      this.isMultiplayerActive = false;
      return false; // Return failure so the UI can notify the user!
    }

    this.transport.onMessage((msg) => this.handleIncomingMessage(msg));

    // Announce join
    this.transport.send({
      protocolVersion: PROTOCOL_VERSION,
      type: 'PLAYER_JOIN',
      sessionId: this.localSessionId,
      playerName: this.localPlayerName,
      isHost: this.isHost,
      spawnPos: [0, 80, 0],
      timestamp: Date.now(),
    });

    return true;
  }

  public update(deltaTime: number, localPlayerPos: THREE.Vector3, localPlayerYaw: number, localPlayerVelocity?: THREE.Vector3): void {
    // Update remote player interpolation
    this.remotePlayers.forEach((rp) => rp.update(deltaTime));

    if (!this.isMultiplayerActive) return;

    // Broadcast local player transform at 20 Hz
    const now = performance.now();
    if (now - this.lastTransformBroadcast >= this.networkTickInterval) {
      this.lastTransformBroadcast = now;
      this.currentSequence++;

      const velArr: [number, number, number] = localPlayerVelocity 
        ? [localPlayerVelocity.x, localPlayerVelocity.y, localPlayerVelocity.z]
        : [0, 0, 0];

      const msg: TransformSnapshotMessage = {
        protocolVersion: PROTOCOL_VERSION,
        type: 'TRANSFORM_SNAPSHOT',
        sessionId: this.localSessionId,
        position: [localPlayerPos.x, localPlayerPos.y, localPlayerPos.z],
        rotation: [0, localPlayerYaw, 0],
        velocity: velArr,
        animState: 'idle',
        timestamp: Date.now(),
      } as any;

      // Add sequencing fields
      (msg as any).sequence = this.currentSequence;

      this.transport.send(msg);
    }
  }

  public sendBlockChange(x: number, y: number, z: number, oldBlock: number, newBlock: number): void {
    if (!this.isMultiplayerActive) return;

    const msg: BlockChangeMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'BLOCK_CHANGE',
      x,
      y,
      z,
      oldBlockType: oldBlock,
      newBlockType: newBlock,
      playerSessionId: this.localSessionId,
      timestamp: Date.now(),
    };

    // Client-side validation is just a UX speed optimization; final authority is server-side
    this.transport.send(msg);
  }

  public sendChat(text: string): void {
    if (!this.isMultiplayerActive) return;

    const msg: ChatMessageMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'CHAT_MESSAGE',
      senderId: this.localSessionId,
      senderName: this.localPlayerName,
      text,
      timestamp: Date.now(),
    };
    this.transport.send(msg);
  }

  public onChat(cb: ChatListener): () => void {
    this.chatListeners.add(cb);
    return () => this.chatListeners.delete(cb);
  }

  public onBlockChange(cb: BlockChangeListener): () => void {
    this.blockChangeListeners.add(cb);
    return () => this.blockChangeListeners.delete(cb);
  }

  public getStats(): TransportStats {
    return this.transport.getStats();
  }

  public setSimulationParams(latencyMs: number, jitterMs: number, lossRate: number): void {
    this.transport.setSimulationParams(latencyMs, jitterMs, lossRate);
  }

  private handleIncomingMessage(msg: NetworkMessagePayload): void {
    if (msg.type === 'PLAYER_JOIN' && msg.sessionId !== this.localSessionId) {
      if (!this.remotePlayers.has(msg.sessionId) && this.sceneRef) {
        const rp = new RemotePlayer(msg.sessionId, msg.playerName);
        this.remotePlayers.set(msg.sessionId, rp);
        this.sceneRef.add(rp.group);
      }
    } else if (msg.type === 'TRANSFORM_SNAPSHOT') {
      if (msg.sessionId === this.localSessionId) {
        // Authoritative Server Corrective Position (Anti-Cheat / Sync correction)
        if (this.onPlayerCorrectedCallback) {
          this.onPlayerCorrectedCallback(msg.position, msg.velocity || [0, 0, 0]);
        }
      } else {
        // Remote Player movement update
        let rp = this.remotePlayers.get(msg.sessionId);
        if (!rp && this.sceneRef) {
          rp = new RemotePlayer(msg.sessionId, `Player_${msg.sessionId.substring(0, 4)}`);
          this.remotePlayers.set(msg.sessionId, rp);
          this.sceneRef.add(rp.group);
        }
        if (rp) {
          rp.pushTransformSnapshot(msg.position, msg.rotation, msg.timestamp);
        }
      }
    } else if (msg.type === 'BLOCK_CHANGE') {
      this.blockChangeListeners.forEach(cb =>
        cb({ x: msg.x, y: msg.y, z: msg.z, oldBlock: msg.oldBlockType, newBlock: msg.newBlockType })
      );
    } else if (msg.type === 'CHAT_MESSAGE') {
      this.chatListeners.forEach(cb =>
        cb({ senderName: msg.senderName, text: msg.text, timestamp: msg.timestamp })
      );
    } else if (msg.type === 'PLAYER_LEAVE') {
      const rp = this.remotePlayers.get(msg.sessionId);
      if (rp && this.sceneRef) {
        this.sceneRef.remove(rp.group);
        rp.dispose();
        this.remotePlayers.delete(msg.sessionId);
      }
    } else if ((msg as any).type === 'SERVER_STATE_SNAPSHOT') {
      // Synchronize entire world-state & online players on initial connection
      const snap = msg as any;
      if (snap.players) {
        snap.players.forEach((p: any) => {
          if (p.sessionId !== this.localSessionId && !this.remotePlayers.has(p.sessionId) && this.sceneRef) {
            const rp = new RemotePlayer(p.sessionId, p.playerName);
            this.remotePlayers.set(p.sessionId, rp);
            this.sceneRef.add(rp.group);
          }
        });
      }
      if (snap.blocks) {
        snap.blocks.forEach((b: any) => {
          this.blockChangeListeners.forEach(cb =>
            cb({ x: b.x, y: b.y, z: b.z, oldBlock: 0, newBlock: b.blockType })
          );
        });
      }
    }
  }

  public dispose(): void {
    this.remotePlayers.forEach((rp) => {
      if (this.sceneRef) this.sceneRef.remove(rp.group);
      rp.dispose();
    });
    this.remotePlayers.clear();
    this.transport.disconnect();
  }
}
