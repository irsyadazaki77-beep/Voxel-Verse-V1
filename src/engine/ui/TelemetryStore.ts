export interface TelemetryData {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  hunger: number;
  maxHunger: number;
  saturation: number;
  temperature: number;
  defenseRating: number;
  oxygen: number;
  maxOxygen: number;
  level: number;
  xp: number;
  biomeName: string;
  playerPos: [number, number, number];
  playerYaw: number;
  fps: number;
  loadedChunks: number;
  timeOfDay: number;
  weatherType: string;
  breakProgress: number;
  bowChargeRatio: number;
  profilerMetrics: { 
    activeChunks: number; 
    cachedChunks: number; 
    queuedTasks: number; 
    generatingTasks: number; 
    dirtyChunks: number; 
    meshUploadsPerFrame: number;
    frameTimeMs: number;
    simTimeMs: number;
    renderTimeMs: number;
    drawCalls: number;
    triangles: number;
    memoryEst: number;
    fpsLow1Pct?: number;
    dynamicScale?: number;
    bottleneck?: 'CPU' | 'GPU' | 'BALANCED';
    activeEntities?: number;
    activeParticles?: number;
  };
}

type Listener = (data: TelemetryData) => void;

export class TelemetryStore {
  private static listeners: Set<Listener> = new Set();
  public static state: TelemetryData = {
    health: 100, maxHealth: 100,
    stamina: 100, maxStamina: 100,
    hunger: 100, maxHunger: 100,
    saturation: 20, temperature: 20,
    defenseRating: 0,
    oxygen: 100, maxOxygen: 100,
    level: 1, xp: 0,
    biomeName: 'Emerald Highlands',
    playerPos: [0, 80, 0], playerYaw: 0,
    fps: 60, loadedChunks: 0,
    timeOfDay: 8.0, weatherType: 'clear',
    breakProgress: 0,
    bowChargeRatio: 0,
    profilerMetrics: { 
      activeChunks: 0, 
      cachedChunks: 0, 
      queuedTasks: 0, 
      generatingTasks: 0, 
      dirtyChunks: 0, 
      meshUploadsPerFrame: 0, 
      frameTimeMs: 0, 
      simTimeMs: 0, 
      renderTimeMs: 0, 
      drawCalls: 0, 
      triangles: 0, 
      memoryEst: 0,
      fpsLow1Pct: 60,
      dynamicScale: 1.0,
      bottleneck: 'BALANCED',
      activeEntities: 0,
      activeParticles: 0
    }
  };
  
  public static subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  public static update(data: TelemetryData): void {
    this.state = data;
    this.listeners.forEach(l => l(data));
  }
}
