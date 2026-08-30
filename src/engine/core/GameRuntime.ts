import * as THREE from 'three';
import { VoxelWorld, RaycastHit } from '../world/VoxelWorld';
import { PlayerController } from '../player/PlayerController';
import { InputManager, InputAction } from '../player/InputManager';
import { PlayerStats } from '../player/PlayerStats';
import { EntityManager } from '../entities/EntityManager';
import { SkyEnvironment } from '../environment/SkyEnvironment';
import { WeatherSystem } from '../environment/WeatherSystem';
import { CloudSystem } from '../environment/CloudSystem';
import { ParticleManager } from '../environment/ParticleManager';
import { SoundSynthesizer } from '../audio/SoundSynthesizer';
import { SaveManager } from '../storage/SaveManager';
import { GameMode, GameSettings, WorldSaveData, ItemStack, BlockType, PlayerEquipment, BossCombatState } from '../../types';
import { DiscoverySystem } from '../progression/DiscoverySystem';
import { QuestManager } from '../progression/QuestManager';
import { WorldEventManager } from '../events/WorldEventManager';
import { MapManager } from '../map/MapManager';
import { InventoryManager } from '../items/InventoryManager';
import { GameEventBus } from '../events/GameEventBus';
import { FurnaceManager } from '../world/FurnaceManager';
import { FarmingManager } from '../world/FarmingManager';
import { GameStatsManager } from '../player/GameStatsManager';
import { WorldPreset } from '../world/WorldConfig';
import { FirstPersonViewmodel } from '../player/FirstPersonViewmodel';
import { CameraMotionSystem } from '../player/CameraMotionSystem';

// Import Systems
import { SimulationSystem } from '../systems/SimulationSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { InteractionSystem } from '../systems/InteractionSystem';
import { WorldStreamingSystem } from '../systems/WorldStreamingSystem';
import { EnvironmentSystem } from '../systems/EnvironmentSystem';
import { PersistenceSystem } from '../systems/PersistenceSystem';
import { TelemetrySystem } from '../systems/TelemetrySystem';
import { RenderSystem } from '../systems/RenderSystem';

import { NetworkSession } from '../network/NetworkSession';

export interface GameRuntimeCallbacks {
  onBossUpdated?: (boss: BossCombatState | null) => void;
  onTargetHitChanged?: (hit: RaycastHit | null) => void;
  onInventoryUpdated?: (inventory: (ItemStack | null)[]) => void;
  onEquipmentUpdated?: (equipment: PlayerEquipment) => void;
  onActiveHotbarIndexChanged?: (index: number) => void;
  onOpenModal?: (modal: any, data?: any) => void;
  onPlayerDeath?: () => void;
  onPointerLockChange?: (locked: boolean) => void;
}

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
  public cameraMotion: CameraMotionSystem;
  public viewmodel: FirstPersonViewmodel;

  public settings: GameSettings;
  public gameMode: GameMode;
  public worldId: string;
  public worldName: string;
  public seed: number;

  public inventory: (ItemStack | null)[] = [];
  public equipment: PlayerEquipment;
  public activeHotbarIndex: number = 0;

  // Systems
  public simulationSystem!: SimulationSystem;
  public combatSystem!: CombatSystem;
  public interactionSystem!: InteractionSystem;
  public worldStreamingSystem!: WorldStreamingSystem;
  public environmentSystem!: EnvironmentSystem;
  public persistenceSystem!: PersistenceSystem;
  public telemetrySystem!: TelemetrySystem;
  public renderSystem!: RenderSystem;

  private reqId: number = 0;
  private lastTime: number = 0;
  public isPaused: boolean = false;

  // Profiler & HUD Helpers
  public currentFps: number = 60;
  public lastSimTimeMs: number = 0;
  public lastRenderTimeMs: number = 0;
  private frameCount: number = 0;
  private lastFpsTime: number = 0;

  private callbacks: GameRuntimeCallbacks = {};

  constructor(
    container: HTMLElement,
    worldId: string,
    worldName: string,
    seed: number,
    gameMode: GameMode,
    settings: GameSettings,
    preset: WorldPreset,
    worldData: WorldSaveData | null
  ) {
    this.worldId = worldId;
    this.worldName = worldName;
    this.seed = seed;
    this.gameMode = gameMode;
    this.settings = settings;

    // 1. Scene & Camera Setup
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

    // 2. Setup Centralized Input Manager
    this.inputManager = new InputManager();
    this.inputManager.onPointerLockChange((locked) => {
      if (this.callbacks.onPointerLockChange) {
        this.callbacks.onPointerLockChange(locked);
      }
    });

    // Register Input Actions for Modals & Quick Controls
    this.inputManager.onAction('Inventory', () => {
      // 1. Check if aiming at an NPC
      const eyePos = this.player.getCameraPosition();
      const forwardDir = this.player.getForwardVector();
      const targetedEntityId = this.entities.getEntityRaycastHit(eyePos, forwardDir, 4.5);
      if (targetedEntityId) {
        const targetEntity = this.entities.entities.get(targetedEntityId);
        if (targetEntity && targetEntity.state.type === 'npc' && targetEntity.state.dialogue && targetEntity.state.dialogue.length > 0) {
          this.openModal('dialogue', targetEntity.state);
          return;
        }
      }

      // 2. Check if aiming at an interactive workstation block
      const hit = this.interactionSystem.currentHit;
      if (hit) {
        const hitBlock = hit.blockType;
        if (hitBlock === BlockType.CHEST) {
          this.openModal('chest', hit.blockPos);
          return;
        }
        if (hitBlock === BlockType.FURNACE) {
          this.openModal('furnace', hit.blockPos);
          return;
        }
        if (hitBlock === BlockType.ANVIL_SMITHING) {
          this.openModal('anvil', hit.blockPos);
          return;
        }
        if (hitBlock === BlockType.CRAFTING_BENCH) {
          this.openModal('crafting');
          return;
        }
      }

      // 3. Fallback: Open personal inventory
      this.openModal('inventory');
    });
    this.inputManager.onAction('Crafting', () => {
      this.openModal('crafting');
    });
    this.inputManager.onAction('Journal', () => {
      this.openModal('journal');
    });
    this.inputManager.onAction('Map', () => {
      this.openModal('map');
    });
    this.inputManager.onAction('ContentDebug', () => {
      this.openModal('contentDebug');
    });
    this.inputManager.onAction('Pause', () => {
      this.openModal('pause');
    });
    this.inputManager.onAction('Perspective', () => {
      this.player.togglePerspective();
    });

    // Drop active item
    this.inputManager.onAction('Drop', () => {
      const active = this.getActiveHotbarItem();
      if (active && active.count > 0) {
        if (active.count === 1) {
          this.setHotbarItem(this.activeHotbarIndex, null);
        } else {
          this.setHotbarItem(this.activeHotbarIndex, { ...active, count: active.count - 1 });
        }
        this.audio.playItemCollect();
      }
    });

    // Hotbar Direct Number Slot Select (1 - 9)
    for (let i = 1; i <= 9; i++) {
      const actionName = `Hotbar${i}` as InputAction;
      this.inputManager.onAction(actionName, () => {
        this.activeHotbarIndex = i - 1;
        if (this.callbacks.onActiveHotbarIndexChanged) {
          this.callbacks.onActiveHotbarIndexChanged(this.activeHotbarIndex);
        }
      });
    }

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
      this.inventory = worldData.player.inventory;
      this.equipment = worldData.player.equipment;
      this.activeHotbarIndex = worldData.player.hotbarIndex || 0;
      
      this.world.preloadSpawnChunks(initialSpawn[0], initialSpawn[2], 2);
    } else {
      initialSpawn = this.world.findSafeSpawn(seed);

      const starterInv: (ItemStack | null)[] = new Array(36).fill(null);
      starterInv[0] = InventoryManager.createStack('wooden_pickaxe', 1);
      starterInv[1] = InventoryManager.createStack('wooden_axe', 1);
      starterInv[2] = InventoryManager.createStack('torch', 16);
      starterInv[3] = InventoryManager.createStack('bread', 8);
      starterInv[4] = InventoryManager.createStack('seeds_wheat', 4);
      this.inventory = starterInv;
      this.equipment = { head: null, chest: null, legs: null, feet: null, accessory: null };
      this.activeHotbarIndex = 0;
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
    this.cameraMotion = new CameraMotionSystem();
    this.viewmodel = new FirstPersonViewmodel();

    this.camera.add(this.viewmodel.rootGroup);
    this.scene.add(this.camera);

    // 3. Instantiate Systems in strict ordering
    this.simulationSystem = new SimulationSystem(this);
    this.interactionSystem = new InteractionSystem(this);
    this.combatSystem = new CombatSystem(this);
    this.worldStreamingSystem = new WorldStreamingSystem(this);
    this.environmentSystem = new EnvironmentSystem(this);
    this.persistenceSystem = new PersistenceSystem(this);
    this.telemetrySystem = new TelemetrySystem(this);
    this.renderSystem = new RenderSystem(this);

    this.combatSystem.initialize();

    // Register player position correction callback from authoritative server
    NetworkSession.getInstance().onPlayerCorrected((pos, vel) => {
      this.player.position.set(pos[0], pos[1], pos[2]);
      this.player.velocity.set(vel[0], vel[1], vel[2]);
    });
  }

  public registerCallbacks(callbacks: GameRuntimeCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };

    // Emit initial inventory, equipment & active item index state to react immediately after callback registration
    if (this.callbacks.onInventoryUpdated) {
      this.callbacks.onInventoryUpdated([...this.inventory]);
    }
    if (this.callbacks.onEquipmentUpdated) {
      this.callbacks.onEquipmentUpdated({ ...this.equipment });
    }
    if (this.callbacks.onActiveHotbarIndexChanged) {
      this.callbacks.onActiveHotbarIndexChanged(this.activeHotbarIndex);
    }
  }

  // Active Hotbar / Equipment / Inventory API
  public getActiveHotbarItem(): ItemStack | null {
    return this.inventory[this.activeHotbarIndex];
  }

  public setHotbarItem(index: number, item: ItemStack | null): void {
    this.inventory[index] = item;
    this.emitInventoryUpdated();
  }

  public addItemToInventory(itemId: string, count: number): void {
    InventoryManager.addItem(this.inventory, itemId, count);
    this.emitInventoryUpdated();
  }

  public consumeItemFromInventory(itemId: string, count: number): void {
    InventoryManager.removeItem(this.inventory, itemId, count);
    this.emitInventoryUpdated();
  }

  public emitInventoryUpdated(): void {
    if (this.callbacks.onInventoryUpdated) {
      this.callbacks.onInventoryUpdated([...this.inventory]);
    }
  }

  public emitTargetHitChanged(hit: RaycastHit | null): void {
    if (this.callbacks.onTargetHitChanged) {
      this.callbacks.onTargetHitChanged(hit);
    }
  }

  public emitBossUpdated(boss: BossCombatState | null): void {
    if (this.callbacks.onBossUpdated) {
      this.callbacks.onBossUpdated(boss);
    }
  }

  public openModal(modalType: any, data?: any): void {
    if (this.callbacks.onOpenModal) {
      this.callbacks.onOpenModal(modalType, data);
    }
  }

  public handlePlayerDeath(): void {
    if (this.callbacks.onPlayerDeath) {
      this.callbacks.onPlayerDeath();
    }
  }

  public resize(width: number, height: number): void {
    this.renderSystem.resize(width, height);
  }

  public start(): void {
    this.lastTime = performance.now();
    this.lastFpsTime = performance.now();
    this.animate(this.lastTime);
  }

  public stop(): void {
    cancelAnimationFrame(this.reqId);
    this.inputManager.dispose();
    this.world.dispose();
    this.sky.dispose();
    this.weather.dispose();
    this.clouds.dispose();
    this.particles.dispose();
    this.entities.dispose();
    this.gameStats.dispose();
    this.renderer.dispose();

    this.simulationSystem.dispose();
    this.interactionSystem.dispose();
    this.combatSystem.dispose();
    this.worldStreamingSystem.dispose();
    this.environmentSystem.dispose();
    this.persistenceSystem.dispose();
    this.telemetrySystem.dispose();
    this.renderSystem.dispose();
  }

  private animate = (now: number): void => {
    this.reqId = requestAnimationFrame(this.animate);

    const deltaTime = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // FPS Calculation
    this.frameCount++;
    if (now - this.lastFpsTime >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    if (!this.isPaused) {
      this.update(deltaTime);
    }
  };

  private update(deltaTime: number): void {
    const biome = this.world.biomeManager.getBiome(this.player.position.x, this.player.position.z);
    
    // Core Engine Sub-Ticks outside systems if any (like Furnaces/Farming plots/Map visit etc)
    FurnaceManager.update(deltaTime);
    FarmingManager.update(deltaTime, this.world);
    DiscoverySystem.update(deltaTime);
    WorldEventManager.update(
      deltaTime,
      Math.floor((this.sky.timeOfDay || 8) / 24) + 1,
      this.sky.timeOfDay || 8,
      [this.player.position.x, this.player.position.y, this.player.position.z]
    );
    MapManager.visitChunk(Math.floor(this.player.position.x / 16), Math.floor(this.player.position.z / 16));

    const simStart = performance.now();

    // 1. Simulation System (Physics, Survival)
    this.simulationSystem.update(deltaTime);
    this.lastSimTimeMs = performance.now() - simStart;

    // 2. Environment System (Sky, Clouds, Weather, Particles)
    this.environmentSystem.update(deltaTime);

    // 3. Entity System Update (Old-style Entity update maintained here or in system)
    this.entities.update(deltaTime, this.world, this.player.position, this.sky.isNight, (dmg: number, src: string) => {
      this.stats.takeDamage(dmg, src);
      this.player.applyDamageFeedback();
    });

    // 4. Input Mouse Pitch/Yaw Sync & Hotbar Wheel Cycling
    if (this.inputManager.isPointerLocked) {
      this.player.handleMouseMove(
        this.inputManager.mouseDeltaX,
        this.inputManager.mouseDeltaY,
        this.settings.mouseSensitivity,
        this.settings.invertMouse
      );

      if (this.inputManager.mouseWheelDelta !== 0) {
        const delta = Math.sign(this.inputManager.mouseWheelDelta);
        this.activeHotbarIndex = (this.activeHotbarIndex + delta + 9) % 9;
        if (this.callbacks.onActiveHotbarIndexChanged) {
          this.callbacks.onActiveHotbarIndexChanged(this.activeHotbarIndex);
        }
      }
    }
    this.player.syncInputs(this.inputManager, this.gameMode);

    // 5. Interaction System (Block break/place, Crops)
    this.interactionSystem.update(deltaTime);

    // 6. Combat System (Bow, projectile spawning)
    this.combatSystem.update(deltaTime);

    // 7. World Streaming (Chunk loading/unloading)
    this.worldStreamingSystem.update(deltaTime);

    // 8. Persistence System (Autosave ticks)
    this.persistenceSystem.update(deltaTime);

    // 9. Update Multiplayer Network Sessions
    NetworkSession.getInstance().update(deltaTime, this.player.position, this.player.yaw, this.player.velocity);

    // 10. Telemetry HUD System
    this.telemetrySystem.update(deltaTime);

    // 11. Render & Highlight Highlight System
    this.renderSystem.update(deltaTime);

    // Post-update input clear
    this.inputManager.postUpdate();
  }
}
