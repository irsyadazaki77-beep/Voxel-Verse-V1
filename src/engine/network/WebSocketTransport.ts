// Real WebSocket Transport Layer for Authoritative & Host Multiplayer (Phase 3)
import { NetworkTransport, TransportStats } from './NetworkTransport';
import { NetworkMessagePayload, NetworkSerializer, PROTOCOL_VERSION } from './NetworkProtocol';

export class WebSocketTransport implements NetworkTransport {
  private socket: WebSocket | null = null;
  private connected: boolean = false;
  private messageListeners: Set<(msg: NetworkMessagePayload) => void> = new Set();
  private closeListeners: Set<() => void> = new Set();
  private errorListeners: Set<(err: any) => void> = new Set();
  private pingIntervalTimer: any = null;
  private lastPingSent: number = 0;
  private serverUrl: string = '';

  private bandwidthTimer: any = null;
  private lastBytesSentSample = 0;
  private lastBytesRecvSample = 0;
  private lastPktsSentSample = 0;
  private lastPktsRecvSample = 0;
  private lastBandwidthSampleTime = Date.now();
  private pingsSentCount = 0;
  private pongsReceivedCount = 0;

  private stats: TransportStats = {
    bytesSent: 0,
    bytesReceived: 0,
    packetsSent: 0,
    packetsReceived: 0,
    pingMs: 20,
    simulatedJitterMs: 2,
    simulatedPacketLossRate: 0,
    bytesPerSecondSent: 0,
    bytesPerSecondReceived: 0,
    packetsPerSecondSent: 0,
    packetsPerSecondReceived: 0,
    packetLossPercent: 0,
  };

  public async connect(address: string = 'ws://localhost:3000/ws'): Promise<boolean> {
    this.serverUrl = address;
    return new Promise((resolve) => {
      let settled = false;
      let connectionTimeoutTimer: any = null;

      try {
        const resolvedUrl = address.startsWith('ws')
          ? address
          : `${typeof window !== 'undefined' && window.location?.protocol === 'https:' ? 'wss:' : 'ws:'}//${typeof window !== 'undefined' && window.location?.host ? window.location.host : 'localhost:3000'}/ws`;

        this.socket = new WebSocket(resolvedUrl);

        connectionTimeoutTimer = setTimeout(() => {
          if (!settled && !this.connected) {
            settled = true;
            console.warn(`[WebSocketTransport] Connection timeout (6000ms) to ${resolvedUrl}`);
            this.disconnect();
            this.errorListeners.forEach((cb) => cb(new Error('Connection timed out after 6000ms')));
            resolve(false);
          }
        }, 6000);

        this.socket.onopen = () => {
          if (settled) return;
          settled = true;
          if (connectionTimeoutTimer) clearTimeout(connectionTimeoutTimer);
          console.log(`[WebSocketTransport] Connected successfully to ${resolvedUrl}`);
          this.connected = true;
          this.startHeartbeat();
          this.startBandwidthSampler();
          resolve(true);
        };

        this.socket.onmessage = (event: MessageEvent) => {
          if (typeof event.data === 'string') {
            this.stats.bytesReceived += event.data.length;
            this.stats.packetsReceived += 1;

            const msg = NetworkSerializer.deserialize(event.data);
            if (msg) {
              if (msg.type === 'HEARTBEAT_PONG') {
                const now = Date.now();
                this.pongsReceivedCount++;
                const rtt = Math.max(1, now - (msg.clientTimestamp || this.lastPingSent));
                const currentPing = this.stats.pingMs || rtt;
                const jitter = Math.abs(rtt - currentPing);
                this.stats.pingMs = Math.round(currentPing * 0.7 + rtt * 0.3);
                this.stats.simulatedJitterMs = Math.round((this.stats.simulatedJitterMs || 0) * 0.7 + jitter * 0.3);
                
                if (this.pingsSentCount > 0) {
                  const loss = Math.max(0, 1 - (this.pongsReceivedCount / this.pingsSentCount));
                  this.stats.packetLossPercent = Math.min(100, Math.round(loss * 100));
                }
                return;
              }
              this.messageListeners.forEach((cb) => cb(msg));
            }
          }
        };

        this.socket.onerror = (err) => {
          console.warn('[WebSocketTransport] Connection warning / error:', err);
          this.errorListeners.forEach((cb) => cb(err));
          if (!this.connected && !settled) {
            settled = true;
            if (connectionTimeoutTimer) clearTimeout(connectionTimeoutTimer);
            resolve(false);
          }
        };

        this.socket.onclose = () => {
          console.log('[WebSocketTransport] Connection closed');
          this.connected = false;
          this.stopHeartbeat();
          this.stopBandwidthSampler();
          if (!settled) {
            settled = true;
            if (connectionTimeoutTimer) clearTimeout(connectionTimeoutTimer);
            resolve(false);
          }
          this.closeListeners.forEach((cb) => cb());
        };
      } catch (err) {
        console.error('[WebSocketTransport] Fatal connection exception:', err);
        this.connected = false;
        if (connectionTimeoutTimer) clearTimeout(connectionTimeoutTimer);
        if (!settled) {
          settled = true;
          resolve(false);
        }
      }
    });
  }

  public onClose(callback: () => void): () => void {
    this.closeListeners.add(callback);
    return () => this.closeListeners.delete(callback);
  }

  public onError(callback: (err: any) => void): () => void {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }

  public disconnect(): void {
    this.stopHeartbeat();
    this.stopBandwidthSampler();
    if (this.socket) {
      try {
        this.socket.close();
      } catch {}
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
    this.pingsSentCount = 0;
    this.pongsReceivedCount = 0;
    this.pingIntervalTimer = setInterval(() => {
      if (this.isConnected()) {
        this.lastPingSent = Date.now();
        this.pingsSentCount++;
        this.send({
          protocolVersion: PROTOCOL_VERSION,
          type: 'HEARTBEAT_PING',
          clientTimestamp: this.lastPingSent,
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

  private startBandwidthSampler(): void {
    this.stopBandwidthSampler();
    this.lastBytesSentSample = this.stats.bytesSent;
    this.lastBytesRecvSample = this.stats.bytesReceived;
    this.lastPktsSentSample = this.stats.packetsSent;
    this.lastPktsRecvSample = this.stats.packetsReceived;
    this.lastBandwidthSampleTime = Date.now();

    this.bandwidthTimer = setInterval(() => {
      const now = Date.now();
      const dt = Math.max(0.1, (now - this.lastBandwidthSampleTime) / 1000);
      this.lastBandwidthSampleTime = now;

      const deltaBytesSent = this.stats.bytesSent - this.lastBytesSentSample;
      const deltaBytesRecv = this.stats.bytesReceived - this.lastBytesRecvSample;
      const deltaPktsSent = this.stats.packetsSent - this.lastPktsSentSample;
      const deltaPktsRecv = this.stats.packetsReceived - this.lastPktsRecvSample;

      this.lastBytesSentSample = this.stats.bytesSent;
      this.lastBytesRecvSample = this.stats.bytesReceived;
      this.lastPktsSentSample = this.stats.packetsSent;
      this.lastPktsRecvSample = this.stats.packetsReceived;

      this.stats.bytesPerSecondSent = Math.round(deltaBytesSent / dt);
      this.stats.bytesPerSecondReceived = Math.round(deltaBytesRecv / dt);
      this.stats.packetsPerSecondSent = Math.round(deltaPktsSent / dt);
      this.stats.packetsPerSecondReceived = Math.round(deltaPktsRecv / dt);
    }, 1000);
  }

  private stopBandwidthSampler(): void {
    if (this.bandwidthTimer) {
      clearInterval(this.bandwidthTimer);
      this.bandwidthTimer = null;
    }
  }
}
