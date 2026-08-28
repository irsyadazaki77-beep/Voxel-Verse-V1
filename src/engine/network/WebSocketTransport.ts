// Real WebSocket Transport Layer for Authoritative & Host Multiplayer (Phase 3)
import { NetworkTransport, TransportStats } from './NetworkTransport';
import { NetworkMessagePayload, NetworkSerializer, PROTOCOL_VERSION } from './NetworkProtocol';

export class WebSocketTransport implements NetworkTransport {
  private socket: WebSocket | null = null;
  private connected: boolean = false;
  private messageListeners: Set<(msg: NetworkMessagePayload) => void> = new Set();
  private pingIntervalTimer: any = null;
  private lastPingSent: number = 0;
  private serverUrl: string = '';

  private stats: TransportStats = {
    bytesSent: 0,
    bytesReceived: 0,
    packetsSent: 0,
    packetsReceived: 0,
    pingMs: 25,
    simulatedJitterMs: 0,
    simulatedPacketLossRate: 0,
  };

  public async connect(address: string = 'ws://localhost:3000/ws'): Promise<boolean> {
    this.serverUrl = address;
    return new Promise((resolve) => {
      try {
        // Support ws:// or wss:// depending on protocol
        const resolvedUrl = address.startsWith('ws')
          ? address
          : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`;

        this.socket = new WebSocket(resolvedUrl);

        this.socket.onopen = () => {
          console.log(`[WebSocketTransport] Connected successfully to ${resolvedUrl}`);
          this.connected = true;
          this.startHeartbeat();
          resolve(true);
        };

        this.socket.onmessage = (event: MessageEvent) => {
          if (typeof event.data === 'string') {
            this.stats.bytesReceived += event.data.length;
            this.stats.packetsReceived += 1;

            const msg = NetworkSerializer.deserialize(event.data);
            if (msg) {
              // Internal ping calculation
              if ((msg as any).type === 'HEARTBEAT_PONG') {
                this.stats.pingMs = Math.max(1, Date.now() - this.lastPingSent);
                return;
              }
              this.messageListeners.forEach((cb) => cb(msg));
            }
          }
        };

        this.socket.onerror = (err) => {
          console.warn('[WebSocketTransport] Connection warning / fallback to loopback mode:', err);
          this.connected = false;
          resolve(false);
        };

        this.socket.onclose = () => {
          console.log('[WebSocketTransport] Connection closed');
          this.connected = false;
          this.stopHeartbeat();
        };
      } catch (err) {
        console.error('[WebSocketTransport] Fatal connection exception:', err);
        this.connected = false;
        resolve(false);
      }
    });
  }

  public disconnect(): void {
    this.stopHeartbeat();
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.connected = false;
  }

  public send(message: NetworkMessagePayload): void {
    if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    const payload = NetworkSerializer.serialize(message);
    this.stats.bytesSent += payload.length;
    this.stats.packetsSent += 1;
    this.socket.send(payload);
  }

  public onMessage(callback: (msg: NetworkMessagePayload) => void): () => void {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback);
  }

  public isConnected(): boolean {
    return this.connected && this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  public getStats(): TransportStats {
    return { ...this.stats };
  }

  public setSimulationParams(latencyMs: number, jitterMs: number, packetLossRate: number): void {
    this.stats.pingMs = latencyMs;
    this.stats.simulatedJitterMs = jitterMs;
    this.stats.simulatedPacketLossRate = packetLossRate;
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.pingIntervalTimer = setInterval(() => {
      if (this.isConnected()) {
        this.lastPingSent = Date.now();
        this.send({
          protocolVersion: PROTOCOL_VERSION,
          type: 'INPUT_COMMAND',
          sessionId: 'ping',
          sequence: 0,
          moveVector: [0, 0],
          buttons: {},
          yaw: 0,
          pitch: 0,
          timestamp: this.lastPingSent,
        });
      }
    }, 2000);
  }

  private stopHeartbeat(): void {
    if (this.pingIntervalTimer) {
      clearInterval(this.pingIntervalTimer);
      this.pingIntervalTimer = null;
    }
  }
}
