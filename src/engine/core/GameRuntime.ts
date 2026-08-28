import * as THREE from 'three';
import { VoxelWorld } from '../world/VoxelWorld';
import { PlayerController } from '../player/PlayerController';
import { InputManager } from '../player/InputManager';
import { PlayerStats } from '../player/PlayerStats';
import { EntityManager } from '../entities/EntityManager';
import { SkyEnvironment } from '../environment/SkyEnvironment';
import { WeatherSystem } from '../environment/WeatherSystem';
import { CloudSystem } from '../environment/CloudSystem';
import { ParticleManager } from '../environment/ParticleManager';
import { SoundSynthesizer } from '../audio/SoundSynthesizer';
import { SaveManager } from '../storage/SaveManager';
import { GameMode, GameSettings, WorldSaveData, ItemStack, BlockType } from '../../types';
import { DiscoverySystem } from '../progression/DiscoverySystem';
import { QuestManager } from '../progression/QuestManager';
import { WorldEventManager } from '../events/WorldEventManager';
import { MapManager } from '../map/MapManager';
import { InventoryManager } from '../items/InventoryManager';
import { GameEventBus } from '../events/GameEventBus';
import { ITEM_DEFS } from '../items/ItemRegistry';
import { MiningEngine } from '../world/MiningEngine';
import { FurnaceManager } from '../world/FurnaceManager';
import { FarmingManager } from '../world/FarmingManager';
import { GameStatsManager } from '../player/GameStatsManager';
import { WorldPreset } from '../world/WorldConfig';

export class GameRuntime {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  public world: VoxelWorld;
  public player: PlayerController;
  public inputManager: InputManager;
  public stats: PlayerStats;
  public entities: EntityManager;
  public sky: SkyEnvironment;
  public weather: WeatherSystem;
  public clouds: CloudSystem;
  public particles: ParticleManager;
  public audio: SoundSynthesizer;
  public gameStats: GameStatsManager;

  public settings: GameSettings;
  public gameMode: GameMode;
  public worldId: string;
  public seed: number;

  private reqId: number = 0;
  private lastTime: number = 0;
  private autoSaveInterval: any;
  public isPaused: boolean = false;

  constructor(
    container: HTMLElement,
    worldId: string,
    seed: number,
    gameMode: GameMode,
    settings: GameSettings,
    preset: WorldPreset,
    worldData: WorldSaveData | null
  ) {
    this.worldId = worldId;
    this.seed = seed;
    this.gameMode = gameMode;
    this.settings = settings;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7eb1eb);
    this.scene.fog = new THREE.FogExp2(0xaaccff, 0.012);

    this.camera = new THREE.PerspectiveCamera(settings.fov, window.innerWidth / window.innerHeight, 0.1, 400);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = settings.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    // 2. Systems
    this.inputManager = new InputManager();
    this.world = new VoxelWorld(seed, preset);
    this.scene.add(this.world.worldGroup);

    this.entities = new EntityManager();
    this.scene.add(this.entities.entityGroup);

    this.stats = new PlayerStats();
    this.audio = new SoundSynthesizer();
    this.gameStats = new GameStatsManager(worldData?.stats);
    this.gameStats.initialize();

    // Progression
    DiscoverySystem.initialize(worldData?.discoveries);
    QuestManager.initialize(worldData?.quests);
    WorldEventManager.initialize(worldData?.activeEvents);
    MapManager.initialize(worldData?.exploredMapTiles, worldData?.waypoints);

    let initialSpawn: [number, number, number] = [0, 80, 0];

    if (worldData) {
      SaveManager.applySaveToWorld(this.world, worldData);
      initialSpawn = worldData.player.position;
      this.stats.health = worldData.player.health;
      this.stats.hunger = worldData.player.hunger;
      this.stats.stamina = worldData.player.stamina;
      this.stats.saturation = worldData.player.saturation || 20;
      this.stats.temperature = worldData.player.temperature || 20;
      this.stats.level = worldData.player.level;
      this.stats.xp = worldData.player.xp;
      
      this.world.preloadSpawnChunks(initialSpawn[0], initialSpawn[2], 2);
    } else {
      initialSpawn = this.world.findSafeSpawn(seed);
    }

    this.player = new PlayerController(this.camera, initialSpawn);
    if (worldData?.player?.rotation) {
      this.player.pitch = worldData.player.rotation[0];
      this.player.yaw = worldData.player.rotation[1];
    }
    this.scene.add(this.player.playerGroup);

    this.entities.spawnInitialPopulation(this.world, this.player.position);

    this.sky = new SkyEnvironment(this.scene);
    if (worldData?.gameTime) this.sky.timeOfDay = (worldData.gameTime / 3600) % 24;
    
    this.weather = new WeatherSystem(this.scene);
    this.clouds = new CloudSystem(this.scene);
    this.particles = new ParticleManager(this.scene);

    const handGroup = new THREE.Group();
    handGroup.position.set(0.35, -0.3, -0.6);
    this.camera.add(handGroup);
    this.scene.add(this.camera);
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public start() {
    this.lastTime = performance.now();
    this.animate(this.lastTime);
    
    this.autoSaveInterval = setInterval(() => {
      // triggers autosave
    }, 60000);
  }

  public stop() {
    cancelAnimationFrame(this.reqId);
    clearInterval(this.autoSaveInterval);
    this.inputManager.dispose();
    this.world.dispose();
    this.sky.dispose();
    this.weather.dispose();
    this.clouds.dispose();
    this.particles.dispose();
    this.entities.dispose();
    this.gameStats.dispose();
    this.renderer.dispose();
  }

  private animate = (now: number) => {
    this.reqId = requestAnimationFrame(this.animate);

    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (!this.isPaused) {
      this.update(deltaTime);
    }

    this.renderer.render(this.scene, this.camera);
  };

  private update(deltaTime: number) {
    const biome = this.world.biomeManager.getBiome(this.player.position.x, this.player.position.z);
    
    this.world.update(deltaTime);
    this.sky.update(deltaTime, this.player.position, biome);
    this.weather.update(deltaTime, this.player.position, (biome?.temperature ?? 0) < 0);
    this.clouds.update(deltaTime, this.player.position, this.weather.weather);
    this.particles.update(deltaTime);
    
    this.entities.update(deltaTime, this.world, this.player.position, this.sky.isNight, (dmg: number, src: string) => {
        this.stats.takeDamage(dmg, src);
        this.player.applyDamageFeedback();
    });

    FurnaceManager.update(deltaTime);
    FarmingManager.update(deltaTime, this.world);
    DiscoverySystem.update(deltaTime);
    WorldEventManager.update(deltaTime, Math.floor((this.sky.timeOfDay || 8) / 24) + 1, this.sky.timeOfDay || 8, [this.player.position.x, this.player.position.y, this.player.position.z]);
    MapManager.visitChunk(Math.floor(this.player.position.x / 16), Math.floor(this.player.position.z / 16));

    // Player Physics & Vitials
    const isSubmerged = this.world.getBlock(Math.floor(this.player.position.x), Math.floor(this.player.getEyePosition().y), Math.floor(this.player.position.z)) === BlockType.WATER;
    if (isSubmerged && this.scene.fog) {
      this.scene.fog.color.setHex(0x0a3f6d);
      if (this.scene.fog instanceof THREE.FogExp2) this.scene.fog.density = 0.065;
    }

    this.stats.update(deltaTime, this.player.isSprinting, isSubmerged, this.player.isSwimming, false, biome.temperature || 20, false);
    
    if (this.inputManager.isPointerLocked) {
      this.player.handleMouseMove(
        this.inputManager.mouseDeltaX,
        this.inputManager.mouseDeltaY,
        this.settings.mouseSensitivity,
        this.settings.invertMouse
      );
    }
    this.player.syncInputs(this.inputManager, this.gameMode);
    this.player.update(deltaTime, this.world, this.gameMode, this.settings.viewBobbing, this.stats.stamina);
  }
}
