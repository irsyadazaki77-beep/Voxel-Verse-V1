// Unified Network Session & Replication Manager (Authoritative Phase 2 Overhaul)
import * as THREE from 'three';
import { LocalLoopbackTransport, NetworkTransport, TransportStats } from './NetworkTransport';
import { WebSocketTransport } from './WebSocketTransport';
import {
  PROTOCOL_VERSION,
  ConnectionState,
  NetworkMessagePayload,
  TransformSnapshotMessage,
  BlockChangeMessage,
  ChatMessageMessage,
  DamageEventMessage,
  InventorySnapshotMessage,
  PlayerBootstrapMessage,
  CraftRequestMessage,
  InventoryActionMessage,
  AttackIntentMessage,
  ReconnectRequestMessage,
} from './NetworkProtocol';
import { RemotePlayer } from './RemotePlayer';

type ChatListener = (msg: { senderName: string; text: string; timestamp: number }) => void;
type BlockChangeListener = (event: { x: number; y: number; z: number; oldBlock: number; newBlock: number; state?: any; revision?: number }) => void;
type InventoryListener = (inv: Array<{ itemId: string; count: number; instanceId?: string } | null>, equipment: Record<string, string | null>) => void;
type ConnectionStateListener = (state: ConnectionState, reason?: string) => void;
type BootstrapListener = (bootstrap: PlayerBootstrapMessage) => void;
type DamageListener = (event: { attackerId: string; targetId: string; damageAmount: number; damageType: string; isFatal?: boolean }) => void;

export class NetworkSession {
  private static instance: NetworkSession | null = null;

  public localSessionId: string;
  public localPlayerName = 'Realm Explorer';
  public isHost = true;
  public isMultiplayerActive = false;
  public sessionToken: string | null = null;
  public connectionState: ConnectionState = 'DISCONNECTED';

  private transport: NetworkTransport;
  private remotePlayers: Map<string, RemotePlayer> = new Map();
  private sceneRef: THREE.Scene | null = null;

  private chatListeners: Set<ChatListener> = new Set();
  private blockChangeListeners: Set<BlockChangeListener> = new Set();
  private inventoryListeners: Set<InventoryListener> = new Set();
  private connectionStateListeners: Set<ConnectionStateListener> = new Set();
  private bootstrapListeners: Set<BootstrapListener> = new Set();
  private damageListeners: Set<DamageListener> = new Set();

  private lastTransformBroadcast = 0;
  private networkTickInterval = 1000 / 20; // 20 Hz Network Tick Rate
  private currentSequence = 0;
  private lastKnownBlockRevision = 0;

  // Reconnection & backoff tracking
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: any = null;
  private isReconnecting = false;
  private serverUrl: string = '';
  private isDisposed = false;

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

  public setConnectionState(state: ConnectionState, reason?: string): void {
    if (this.connectionState === state) return;
    this.connectionState = state;
    console.log(`[NetworkSession] State Transition: ${state}${reason ? ` (${reason})` : ''}`);
    this.connectionStateListeners.forEach(cb => cb(state, reason));
  }

  public onConnectionStateChange(cb: ConnectionStateListener): () => void {
    this.connectionStateListeners.add(cb);
    cb(this.connectionState);
    return () => this.connectionStateListeners.delete(cb);
  }

  public setTransportMode(mode: 'loopback' | 'websocket', address?: string): void {
    if (this.transport) {
      this.transport.disconnect();
    }
    if (mode === 'websocket') {
      const wsTransport = new WebSocketTransport();
      wsTransport.onClose(() => this.handleTransportClosed());
      wsTransport.onError((err) => this.handleTransportError(err));
      this.transport = wsTransport;
    } else {
      const loopTransport = new LocalLoopbackTransport();
      if (loopTransport.onClose) loopTransport.onClose(() => this.handleTransportClosed());
      this.transport = loopTransport;
    }
  }

  public onPlayerCorrected(cb: (pos: [number, number, number], vel: [number, number, number]) => void): () => void {
    this.onPlayerCorrectedCallback = cb;
    return () => {
      if (this.onPlayerCorrectedCallback === cb) {
        this.onPlayerCorrectedCallback = null;
      }
    };
  }

  public onBootstrap(cb: BootstrapListener): () => void {
    this.bootstrapListeners.add(cb);
    return () => this.bootstrapListeners.delete(cb);
  }

  public onInventory(cb: InventoryListener): () => void {
    this.inventoryListeners.add(cb);
    return () => this.inventoryListeners.delete(cb);
  }

  public onInventorySync(cb: InventoryListener): () => void {
    return this.onInventory(cb);
  }

  public setScene(scene: THREE.Scene | null): void {
    this.sceneRef = scene;
  }

  public getLocalSessionId(): string {
    return this.localSessionId;
  }

  public onDamage(cb: DamageListener): () => void {
    this.damageListeners.add(cb);
    return () => this.damageListeners.delete(cb);
  }

  public isConnected(): boolean {
    return this.transport.isConnected();
  }

  public isReady(): boolean {
    return this.connectionState === 'READY';
  }

  public async startSession(
    scene: THREE.Scene,
    isMultiplayer = false,
    playerName = 'Realm Explorer',
    useWebSocket = false,
    serverAddress?: string
  ): Promise<boolean> {
    this.isDisposed = false;
    this.sceneRef = scene;
    this.isMultiplayerActive = isMultiplayer;
    this.localPlayerName = playerName;
    this.serverUrl = serverAddress || '';
    this.reconnectAttempts = 0;

    if (!isMultiplayer) {
      this.setTransportMode('loopback');
      await this.transport.connect();
      this.setConnectionState('READY', 'Singleplayer Loopback Active');
      return true;
    }

    this.setConnectionState('CONNECTING');

    let finalAddress = serverAddress;
    if (useWebSocket && this.sessionToken && serverAddress) {
      const joiner = serverAddress.includes('?') ? '&' : '?';
      finalAddress = `${serverAddress}${joiner}token=${encodeURIComponent(this.sessionToken)}`;
    }

    if (useWebSocket) {
      this.setTransportMode('websocket', finalAddress);
    } else {
      this.setTransportMode('loopback');
    }

    // Register incoming message handler BEFORE sending join or bootstrap
    this.transport.onMessage((msg) => this.handleIncomingMessage(msg));

    const connected = await this.transport.connect(finalAddress);
    if (!connected && useWebSocket) {
      console.error('[NetworkSession] WebSocket server connection failed. Denying automatic loopback fallback.');
      this.setConnectionState('FAILED', 'Initial Connection Failed');
      return false;
    }

    this.setConnectionState('AUTHENTICATING');

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

    this.setConnectionState('SYNCHRONIZING', 'Awaiting Authoritative Bootstrap');

    // Await bootstrap synchronization with 8s timeout to guarantee readiness before allowing gameplay
    const bootstrapReceived = await new Promise<boolean>((resolve) => {
      let resolved = false;
      const timeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsub();
          resolve(false);
        }
      }, 8000);

      const unsub = this.onBootstrap(() => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          unsub();
          resolve(true);
        }
      });
    });

    if (bootstrapReceived) {
      this.setConnectionState('READY', 'Authoritative Bootstrap Applied');
      return true;
    } else {
      console.warn('[NetworkSession] Bootstrap synchronization timed out');
      this.setConnectionState('FAILED', 'Bootstrap Timeout');
      return false;
    }
  }

  private handleTransportClosed(): void {
    if (this.isDisposed || !this.isMultiplayerActive) {
      this.setConnectionState('DISCONNECTED');
      return;
    }

    console.warn('[NetworkSession] Transport closed unexpectedly. Triggering reconnect recovery...');
    this.attemptReconnect();
  }

  private handleTransportError(err: any): void {
    console.warn('[NetworkSession] Transport error detected:', err);
  }

  public async attemptReconnect(): Promise<boolean> {
    if (this.isReconnecting || this.isDisposed) return false;
    this.isReconnecting = true;
    this.setConnectionState('RECONNECTING');

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[NetworkSession] Maximum reconnection attempts exceeded.');
      this.setConnectionState('FAILED', 'Max Reconnection Retries Exceeded');
      this.isReconnecting = false;
      return false;
    }

    this.reconnectAttempts++;
    // Exponential backoff with jitter: backoff = min(10000, 1000 * 2^(attempt-1) + jitter)
    const baseBackoff = Math.min(10000, 1000 * Math.pow(2, this.reconnectAttempts - 1));
    const jitter = Math.floor(Math.random() * 500);
    const delay = baseBackoff + jitter;

    console.log(`[NetworkSession] Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);

    await new Promise(r => setTimeout(r, delay));

    if (this.isDisposed) {
      this.isReconnecting = false;
      return false;
    }

    let finalAddress = this.serverUrl;
    if (this.sessionToken && this.serverUrl) {
      const joiner = this.serverUrl.includes('?') ? '&' : '?';
      finalAddress = `${this.serverUrl}${joiner}token=${encodeURIComponent(this.sessionToken)}`;
    }

    this.setTransportMode('websocket', finalAddress);
    this.transport.onMessage((msg) => this.handleIncomingMessage(msg));

    const connected = await this.transport.connect(finalAddress);
    if (!connected) {
      this.isReconnecting = false;
      return this.attemptReconnect();
    }

    console.log('[NetworkSession] Socket re-established. Sending RECONNECT_REQUEST...');
    this.setConnectionState('SYNCHRONIZING', 'Recovering Session State');

    // Send Reconnect request with last known block revision
    this.transport.send({
      protocolVersion: PROTOCOL_VERSION,
      type: 'RECONNECT_REQUEST',
      sessionId: this.localSessionId,
      sessionToken: this.sessionToken || '',
      lastKnownBlockRevision: this.lastKnownBlockRevision,
      clientSequence: this.currentSequence,
      timestamp: Date.now(),
    } as ReconnectRequestMessage);

    // Announce join for re-binding
    this.transport.send({
      protocolVersion: PROTOCOL_VERSION,
      type: 'PLAYER_JOIN',
      sessionId: this.localSessionId,
      playerName: this.localPlayerName,
      isHost: this.isHost,
      spawnPos: [0, 80, 0],
      timestamp: Date.now(),
    });

    this.reconnectAttempts = 0;
    this.isReconnecting = false;
    this.setConnectionState('READY', 'Session Recovery Complete');
    return true;
  }

  public update(deltaTime: number, localPlayerPos: THREE.Vector3, localPlayerYaw: number, localPlayerVelocity?: THREE.Vector3): void {
    // Update remote player interpolation
    this.remotePlayers.forEach((rp) => rp.update(deltaTime));

    if (!this.isMultiplayerActive || this.connectionState !== 'READY') return;

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
        sequence: this.currentSequence,
        position: [localPlayerPos.x, localPlayerPos.y, localPlayerPos.z],
        rotation: [0, localPlayerYaw, 0],
        velocity: velArr,
        animState: 'idle',
        timestamp: Date.now(),
      };

      this.transport.send(msg);
    }
  }

  public sendBlockChange(x: number, y: number, z: number, oldBlock: number, newBlock: number, state?: any, consumedMaterial?: string): void {
    if (!this.isMultiplayerActive && !(this as any).ws) return;

    const transactionId = `tx_blk_${this.localSessionId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const msg: BlockChangeMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'BLOCK_CHANGE',
      x,
      y,
      z,
      oldBlockType: oldBlock,
      newBlockType: newBlock,
      state,
      playerSessionId: this.localSessionId,
      transactionId,
      consumedMaterial,
      revision: this.lastKnownBlockRevision,
      timestamp: Date.now(),
    };

    this.transport.send(msg);
    if ((this as any).ws && typeof (this as any).ws.send === 'function') {
      (this as any).ws.send(JSON.stringify(msg));
    }
  }

  public sendCraftRequest(recipeId: string, quantity = 1, stationContext?: string): void {
    if (!this.isMultiplayerActive) return;

    const transactionId = `tx_craft_${this.localSessionId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const msg: CraftRequestMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'CRAFT_REQUEST',
      recipeId,
      quantity,
      stationContext,
      transactionId,
      timestamp: Date.now(),
    };

    this.transport.send(msg);
  }

  public sendInventoryAction(actionType: 'move' | 'swap' | 'drop' | 'consume', fromSlot: number, toSlot: number, itemId?: string, count = 1): void {
    if (!this.isMultiplayerActive) return;

    const transactionId = `tx_inv_${this.localSessionId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const msg: InventoryActionMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'INVENTORY_ACTION',
      sessionId: this.localSessionId,
      actionType,
      fromSlot,
      toSlot,
      itemId,
      count,
      transactionId,
      timestamp: Date.now(),
    };

    this.transport.send(msg);
  }

  public sendAttackIntent(targetId: string, weaponSlot?: number): void {
    if (!this.isMultiplayerActive) return;

    const transactionId = `tx_atk_${this.localSessionId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const msg: AttackIntentMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'ATTACK_INTENT',
      targetId,
      weaponSlot,
      transactionId,
      timestamp: Date.now(),
    };

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

  public getRemotePlayers(): Map<string, RemotePlayer> {
    return this.remotePlayers;
  }

  private handleIncomingMessage(msg: NetworkMessagePayload): void {
    if (msg.protocolVersion !== PROTOCOL_VERSION) {
      console.warn(`[NetworkSession] Mismatched protocol: msg=${msg.protocolVersion}, local=${PROTOCOL_VERSION}`);
    }

    switch (msg.type) {
      case 'PLAYER_BOOTSTRAP': {
        const bootstrap = msg as PlayerBootstrapMessage;
        console.log(`[NetworkSession] Received PLAYER_BOOTSTRAP for ${bootstrap.playerName} (${bootstrap.playerId})`);

        // Bind local player session identity to server assigned ID
        if (bootstrap.playerId) {
          this.localSessionId = bootstrap.playerId;
        }

        // Apply authoritative block modifications from bootstrap
        if (Array.isArray(bootstrap.blocks)) {
          bootstrap.blocks.forEach((b) => {
            if (b.revision && b.revision > this.lastKnownBlockRevision) {
              this.lastKnownBlockRevision = b.revision;
            }
            this.blockChangeListeners.forEach(cb =>
              cb({ x: b.x, y: b.y, z: b.z, oldBlock: 0, newBlock: b.blockType, revision: b.revision })
            );
          });
        }

        // Synchronize inventory
        if (bootstrap.inventory) {
          this.inventoryListeners.forEach(cb => cb(bootstrap.inventory, bootstrap.equipment || {}));
        }

        // Synchronize position
        if (bootstrap.position && this.onPlayerCorrectedCallback) {
          this.onPlayerCorrectedCallback(bootstrap.position, [0, 0, 0]);
        }

        // Populate online players eliminating duplicate entities
        if (Array.isArray(bootstrap.onlinePlayers)) {
          const currentRemoteIds = new Set(bootstrap.onlinePlayers.map(p => p.sessionId));

          // Remove stale remote players not present in bootstrap
          for (const [id, rp] of this.remotePlayers.entries()) {
            if (!currentRemoteIds.has(id)) {
              if (this.sceneRef) this.sceneRef.remove(rp.group);
              rp.dispose();
              this.remotePlayers.delete(id);
            }
          }

          // Add or update active remote players
          bootstrap.onlinePlayers.forEach((p) => {
            if (p.sessionId !== this.localSessionId) {
              let rp = this.remotePlayers.get(p.sessionId);
              if (!rp && this.sceneRef) {
                rp = new RemotePlayer(p.sessionId, p.playerName);
                this.remotePlayers.set(p.sessionId, rp);
                this.sceneRef.add(rp.group);
              }
              if (rp && p.position) {
                rp.pushTransformSnapshot(p.position, p.rotation || [0, 0, 0], Date.now());
              }
            }
          });
        }

        // Trigger bootstrap callbacks
        this.bootstrapListeners.forEach(cb => cb(bootstrap));
        this.setConnectionState('READY', 'Bootstrap Applied Successfully');
        break;
      }

      case 'BLOCK_CHUNK_DELTA': {
        const delta = msg as any;
        if (Array.isArray(delta.blocks)) {
          delta.blocks.forEach((b: any) => {
            if (b.revision && b.revision > this.lastKnownBlockRevision) {
              this.lastKnownBlockRevision = b.revision;
            }
            this.blockChangeListeners.forEach(cb =>
              cb({ x: b.x, y: b.y, z: b.z, oldBlock: 0, newBlock: b.blockType, revision: b.revision })
            );
          });
        }
        break;
      }

      case 'INVENTORY_SNAPSHOT': {
        const snap = msg as InventorySnapshotMessage;
        this.inventoryListeners.forEach(cb => cb(snap.inventory, snap.equipment || {}));
        break;
      }

      case 'PLAYER_JOIN': {
        if (msg.sessionId !== this.localSessionId) {
          if (!this.remotePlayers.has(msg.sessionId) && this.sceneRef) {
            const rp = new RemotePlayer(msg.sessionId, msg.playerName);
            this.remotePlayers.set(msg.sessionId, rp);
            this.sceneRef.add(rp.group);
          }
        }
        break;
      }

      case 'TRANSFORM_SNAPSHOT': {
        if (msg.sessionId === this.localSessionId) {
          // Authoritative Server Corrective Position
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
        break;
      }

      case 'BLOCK_CHANGE': {
        if (msg.revision && msg.revision > this.lastKnownBlockRevision) {
          this.lastKnownBlockRevision = msg.revision;
        }
        this.blockChangeListeners.forEach(cb =>
          cb({ x: msg.x, y: msg.y, z: msg.z, oldBlock: msg.oldBlockType, newBlock: msg.newBlockType, state: (msg as any).state, revision: msg.revision })
        );
        break;
      }

      case 'DAMAGE_EVENT': {
        const dmg = msg as DamageEventMessage;
        this.damageListeners.forEach(cb =>
          cb({
            attackerId: dmg.attackerId,
            targetId: dmg.targetId,
            damageAmount: dmg.damageAmount,
            damageType: dmg.damageType,
            isFatal: dmg.isFatal,
          })
        );
        break;
      }

      case 'CHAT_MESSAGE': {
        this.chatListeners.forEach(cb =>
          cb({ senderName: msg.senderName, text: msg.text, timestamp: msg.timestamp })
        );
        break;
      }

      case 'PLAYER_LEAVE': {
        const rp = this.remotePlayers.get(msg.sessionId);
        if (rp && this.sceneRef) {
          this.sceneRef.remove(rp.group);
          rp.dispose();
          this.remotePlayers.delete(msg.sessionId);
        }
        break;
      }

      case 'SERVER_STATE_SNAPSHOT': {
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
        break;
      }
    }
  }

  public dispose(): void {
    this.isDisposed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.remotePlayers.forEach((rp) => {
      if (this.sceneRef) this.sceneRef.remove(rp.group);
      rp.dispose();
    });
    this.remotePlayers.clear();
    this.chatListeners.clear();
    this.blockChangeListeners.clear();
    this.inventoryListeners.clear();
    this.connectionStateListeners.clear();
    this.bootstrapListeners.clear();
    this.damageListeners.clear();
    this.onPlayerCorrectedCallback = null;
    this.sceneRef = null;
    this.isMultiplayerActive = false;
    this.setConnectionState('DISCONNECTED');
    this.transport.disconnect();
  }
}
