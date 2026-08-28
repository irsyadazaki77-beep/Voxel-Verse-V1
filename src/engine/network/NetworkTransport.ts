// Abstract Network Transport Interface & Local Loopback Implementation
import { NetworkMessagePayload, NetworkSerializer } from './NetworkProtocol';

export interface TransportStats {
  bytesSent: number;
  bytesReceived: number;
  packetsSent: number;
  packetsReceived: number;
  pingMs: number;
  simulatedJitterMs: number;
  simulatedPacketLossRate: number;
}

export interface NetworkTransport {
  connect(address?: string): Promise<boolean>;
  disconnect(): void;
  send(message: NetworkMessagePayload): void;
  onMessage(callback: (msg: NetworkMessagePayload) => void): () => void;
  isConnected(): boolean;
  getStats(): TransportStats;
  setSimulationParams(latencyMs: number, jitterMs: number, packetLossRate: number): void;
}

export class LocalLoopbackTransport implements NetworkTransport {
  private connected = false;
  private messageListeners: Set<(msg: NetworkMessagePayload) => void> = new Set();
  private stats: TransportStats = {
    bytesSent: 0,
    bytesReceived: 0,
    packetsSent: 0,
    packetsReceived: 0,
    pingMs: 15,
    simulatedJitterMs: 5,
    simulatedPacketLossRate: 0,
  };

  public async connect(address = 'local://loopback'): Promise<boolean> {
    console.log(`[LocalLoopbackTransport] Connected to ${address}`);
    this.connected = true;
    return true;
  }

  public disconnect(): void {
    console.log('[LocalLoopbackTransport] Disconnected');
    this.connected = false;
  }

  public send(message: NetworkMessagePayload): void {
    if (!this.connected) return;

    // Simulate packet loss
    if (this.stats.simulatedPacketLossRate > 0 && Math.random() < this.stats.simulatedPacketLossRate) {
      return;
    }

    const json = NetworkSerializer.serialize(message);
    const size = json.length;

    this.stats.bytesSent += size;
    this.stats.packetsSent += 1;

    // Simulate latency + jitter
    const delay = this.stats.pingMs + (Math.random() * 2 - 1) * this.stats.simulatedJitterMs;

    setTimeout(() => {
      if (!this.connected) return;

      this.stats.bytesReceived += size;
      this.stats.packetsReceived += 1;

      const deserialized = NetworkSerializer.deserialize(json);
      if (deserialized) {
        this.messageListeners.forEach(cb => cb(deserialized));
      }
    }, Math.max(0, delay));
  }

  public onMessage(callback: (msg: NetworkMessagePayload) => void): () => void {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback);
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getStats(): TransportStats {
    return { ...this.stats };
  }

  public setSimulationParams(latencyMs: number, jitterMs: number, packetLossRate: number): void {
    this.stats.pingMs = Math.max(0, latencyMs);
    this.stats.simulatedJitterMs = Math.max(0, jitterMs);
    this.stats.simulatedPacketLossRate = Math.min(1, Math.max(0, packetLossRate));
  }
}
