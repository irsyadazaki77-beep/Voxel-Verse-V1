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
  culturalRegionName?: string;
  playerPos: [number, number, number];
  playerYaw: number;
  fps: number;
  loadedChunks: number;
  timeOfDay: number;
  weatherType: string;
  breakProgress: number;
  bowChargeRatio: number;
  fishingState?: 'IDLE' | 'CASTING' | 'WAITING' | 'BITE' | 'REELING' | 'SUCCESS' | 'FAILED';
  fishingTension?: number;
  fishingProgress?: number;
  mountedCreatureName?: string | null;
  targetedCreature?: {
    id: string;
    name: string;
    health: number;
    maxHealth: number;
    trustMeter: number;
    isTamed: boolean;
    command: string;
    canMount: boolean;
    isMounted: boolean;
    preferredFoodHint: string;
  } | null;
  activeVessel?: {
    id: string;
    name: string;
    type: 'perahu_cadik' | 'kapal_phinisi';
    speedKnots: number;
    maxSpeedKnots: number;
    throttleRatio: number;
    headingDeg: number;
    seaFloorDepth: number;
    trenchNearby: boolean;
    health: number;
    maxHealth: number;
    isDivingAnchored: boolean;
  } | null;
  activeCataclysm?: {
    type: string;
    name: string;
    remainingSeconds: number;
    durationSeconds: number;
    intensity: number;
  } | null;
  activeHologram?: {
    id: string;
    name: string;
    region: string;
    dimensions: [number, number, number];
    rotationDeg: number;
    blockCount: number;
  } | null;
  activeTreasureHint?: {
    mapName: string;
    distance: number;
    bearing: string;
    heat: 'COLD' | 'WARM' | 'HOT';
    targetPos: [number, number, number];
  } | null;
  activeAerialFlight?: {
    mode: 'garuda' | 'glider';
    altitude: number;
    inThermalUpdraft: boolean;
    speed: number;
  } | null;
  activeVillageSiege?: {
    active: boolean;
    festivalActive: boolean;
    settlementName: string;
    wave: number;
    maxWaves: number;
    villageIntegrity: number;
    invadersRemaining: number;
    festivalTimer: number;
  } | null;
  nusantaraV46?: {
    stanceId: 'HARIMAU' | 'BANGAU' | 'NAGA';
    stanceName: string;
    stanceSubtitle: string;
    stanceIcon: string;
    stanceColor: string;
    stanceBonusText: string;
    tenagaDalam: number;
    ajianId: 'AJIAN_BRAJAMUSTI' | 'AJIAN_SERIBU_BAYANGAN' | 'AJIAN_PANCASONA';
    ajianName: string;
    ajianIcon: string;
    ajianReady: boolean;
    subakWheelCount: number;
    subakTotalHarvested: number;
    wayangActive: boolean;
    wayangLakonId: 'LAKON_GATOTKACA' | 'LAKON_SRI_SEDANA' | 'LAKON_DEWA_RUCI';
    wayangLakonName: string;
    wayangLakonIcon: string;
    wayangLakonTimer: number;
    sanctumActive: boolean;
    sanctumCenter: [number, number, number] | null;
    sanctumBossAlive: boolean;
  } | null;
  mahakaryaV48?: {
    submarineActive: boolean;
    submarineDepth: number;
    submarineSonarDist: number;
    oceanCandiBuilt: boolean;
    oceanCandiPos: [number, number, number] | null;
    locomotiveActive: boolean;
    locomotiveRiding: boolean;
    locomotiveSpeed: number;
    quarryCount: number;
    quarryTotalMined: number;
    gamelanStageBuilt: boolean;
    gamelanScale: 'PELOG' | 'SLENDRO';
    gamelanAutoSong: string | null;
    gamelanBlessingTimer: number;
    activeKhodamId: 'MACAN_PUTIH' | 'GARUDA_API' | 'NAGA_TIRTA' | null;
    activeKhodamName: string | null;
    arenaActive: boolean;
    arenaWave: number;
    arenaMaxWaves: number;
    weatherEventId: 'CLEAR' | 'VOLCANIC_ERUPTION' | 'EQUATORIAL_THUNDERSTORM' | 'MYSTIC_CALDERA_MIST';
    weatherEventName: string;
    weatherEventTimer: number;
    activeWardrobeId: 'BATIK_PARANG_KENCANA' | 'ZIRAH_SENOPATI_MAJAPAHIT' | 'JUBAH_PENDEKAR_SILIWANGI' | 'BUSANA_RAJA_SAMUDRA';
    activeWardrobeName: string;
    photoModeActive: boolean;
    photoFov: number;
    photoFrame: 'NONE' | 'UKIRAN_MAJAPAHIT' | 'WAYANG_KLASIK' | 'SINEMA_21_9';
  } | null;
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
    sunIntensity?: number;
    ambientIntensity?: number;
    hemiIntensity?: number;
    exposure?: number;
    loadedChunks?: number;
    generatedChunks?: number;
    meshedChunks?: number;
    visibleChunks?: number;
    pendingGeneration?: number;
    pendingMeshing?: number;
    pendingUpload?: number;
    culledChunks?: number;
    worldGroupChildren?: number;
    solidMeshCount?: number;
    waterMeshCount?: number;
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
    fishingState: 'IDLE',
    fishingTension: 0,
    fishingProgress: 0,
    mountedCreatureName: null,
    targetedCreature: null,
    activeVessel: null,
    activeCataclysm: null,
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
      activeParticles: 0,
      loadedChunks: 0,
      generatedChunks: 0,
      meshedChunks: 0,
      visibleChunks: 0,
      pendingGeneration: 0,
      pendingMeshing: 0,
      pendingUpload: 0,
      culledChunks: 0,
      worldGroupChildren: 0,
      solidMeshCount: 0,
      waterMeshCount: 0
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
