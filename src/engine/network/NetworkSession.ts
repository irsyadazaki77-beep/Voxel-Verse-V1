// Unified Network Session & Replication Manager
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
import { ServerAuthority } from './ServerAuthority';

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
    }

    const connected = await this.transport.connect(serverAddress);
    if (!connected && useWebSocket) {
      console.warn('[NetworkSession] WebSocket failed, falling back to Local Loopback');
      this.setTransportMode('loopback');
      await this.transport.connect();
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

  public update(deltaTime: number, localPlayerPos: THREE.Vector3, localPlayerYaw: number): void {
    // Update remote player interpolation
    this.remotePlayers.forEach((rp) => rp.update(deltaTime));

    // Broadcast local player transform at 20 Hz
    const now = performance.now();
    if (now - this.lastTransformBroadcast >= this.networkTickInterval) {
      this.lastTransformBroadcast = now;

      const msg: TransformSnapshotMessage = {
        protocolVersion: PROTOCOL_VERSION,
        type: 'TRANSFORM_SNAPSHOT',
        sessionId: this.localSessionId,
        position: [localPlayerPos.x, localPlayerPos.y, localPlayerPos.z],
        rotation: [0, localPlayerYaw, 0],
        velocity: [0, 0, 0],
        animState: 'idle',
        timestamp: Date.now(),
      };
      this.transport.send(msg);
    }
  }

  public sendBlockChange(x: number, y: number, z: number, oldBlock: number, newBlock: number): void {
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

    // Validate with ServerAuthority
    const val = ServerAuthority.validateBlockChange(msg, [x, y, z]);
    if (val.valid) {
      this.transport.send(msg);
    } else {
      console.warn('[NetworkSession] Block change rejected by Authority:', val.reason);
    }
  }

  public sendChat(text: string): void {
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
    } else if (msg.type === 'TRANSFORM_SNAPSHOT' && msg.sessionId !== this.localSessionId) {
      let rp = this.remotePlayers.get(msg.sessionId);
      if (!rp && this.sceneRef) {
        rp = new RemotePlayer(msg.sessionId, `Player_${msg.sessionId.substring(0, 4)}`);
        this.remotePlayers.set(msg.sessionId, rp);
        this.sceneRef.add(rp.group);
      }
      if (rp) {
        rp.pushTransformSnapshot(msg.position, msg.rotation, msg.timestamp);
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
