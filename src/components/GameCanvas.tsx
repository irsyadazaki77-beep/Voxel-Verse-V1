// Master 3D Voxel Game Canvas with Three.js, Voxel Engine, Physics 2.0, Interaction Pipeline, Survival Loops & Audio
import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { BlockType, ItemStack, WorldSaveData, EntityState, GameMode, PlayerEquipment, GameSettings } from '../types';
import { VoxelWorld, RaycastHit } from '../engine/world/VoxelWorld';
import { PlayerController } from '../engine/player/PlayerController';
import { InputManager } from '../engine/player/InputManager';
import { PlayerStats } from '../engine/player/PlayerStats';
import { MiningEngine } from '../engine/world/MiningEngine';
import { BlockPlacementEngine } from '../engine/world/BlockPlacementEngine';
import { FurnaceManager } from '../engine/world/FurnaceManager';
import { FarmingManager } from '../engine/world/FarmingManager';
import { InventoryManager } from '../engine/items/InventoryManager';
import { EntityManager } from '../engine/entities/EntityManager';
import { SkyEnvironment } from '../engine/environment/SkyEnvironment';
import { WeatherSystem } from '../engine/environment/WeatherSystem';
import { CloudSystem } from '../engine/environment/CloudSystem';
import { ParticleManager } from '../engine/environment/ParticleManager';
import { SoundSynthesizer } from '../engine/audio/SoundSynthesizer';
import { SaveManager, CURRENT_SAVE_VERSION } from '../engine/storage/SaveManager';
import { BLOCK_DEFS } from '../engine/world/BlockRegistry';
import { ITEM_DEFS } from '../engine/items/ItemRegistry';
import { CraftingSystem } from '../engine/items/CraftingSystem';
import { HUD } from './HUD';
import { LoadingScreen } from './LoadingScreen';
import { GameStatsManager } from '../engine/player/GameStatsManager';
import { TelemetryStore } from '../engine/ui/TelemetryStore';
import { GameEventBus } from '../engine/events/GameEventBus';
import { InventoryModal } from './InventoryModal';
import { CraftingModal } from './CraftingModal';
import { FurnaceModal } from './FurnaceModal';
import { ChestModal } from './ChestModal';
import { AnvilModal } from './AnvilModal';
import { DeathModal } from './DeathModal';
import { DialogueModal } from './DialogueModal';
import { PauseMenu } from './PauseMenu';
import { MobileControls } from './MobileControls';
import { DebugMap } from './DebugMap';
import { JournalModal } from './JournalModal';
import { MapModal } from './MapModal';
import { ContentDebugModal } from './ContentDebugModal';
import { WorldPreset } from '../engine/world/WorldConfig';
import { QuestManager } from '../engine/progression/QuestManager';
import { DiscoverySystem } from '../engine/progression/DiscoverySystem';
import { WorldEventManager } from '../engine/events/WorldEventManager';
import { MapManager } from '../engine/map/MapManager';
import { WorldProgression } from '../engine/progression/WorldProgression';
import { BossCombatState } from '../types';
import { CombatStateMachine } from '../engine/combat/CombatStateMachine';

interface GameCanvasProps {
  worldId: string;
  seed: number;
  gameMode: GameMode;
  worldName: string;
  preset?: WorldPreset;
  onExitToMenu: () => void;
}

export type ModalType = 'none' | 'inventory' | 'crafting' | 'furnace' | 'chest' | 'anvil' | 'dialogue' | 'pause' | 'death' | 'journal' | 'map' | 'contentDebug';

export const GameCanvas: React.FC<GameCanvasProps> = ({
  worldId,
  seed,
  gameMode,
  worldName,
  preset,
  onExitToMenu,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Engine instance references (persisted across React renders)
  const worldRef = useRef<VoxelWorld | null>(null);
  const playerRef = useRef<PlayerController | null>(null);
  const inputRef = useRef<InputManager | null>(null);
  const statsRef = useRef<PlayerStats>(new PlayerStats());
  const entitiesRef = useRef<EntityManager | null>(null);
  const skyRef = useRef<SkyEnvironment | null>(null);
  const weatherRef = useRef<WeatherSystem | null>(null);
  const cloudsRef = useRef<CloudSystem | null>(null);
  const particlesRef = useRef<ParticleManager | null>(null);
  const audioRef = useRef<SoundSynthesizer>(new SoundSynthesizer());
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);

  // Hand item 3D mesh
  const handMeshRef = useRef<THREE.Group | null>(null);

  // Settings Ref
  const settingsRef = useRef<GameSettings>({
    fov: 75,
    mouseSensitivity: 0.002,
    renderDistance: 4,
    masterVolume: 0.8,
    musicVolume: 0.6,
    sfxVolume: 0.8,
    ambientVolume: 0.6,
    invertMouse: false,
    shadows: true,
    shadowQuality: 'medium',
    waterQuality: 'medium',
    particleQuality: 'medium',
    graphicsPreset: 'medium',
    ambientOcclusion: true,
    bloom: true,
    windEffect: true,
    clouds: true,
    cloudQuality: 'medium',
    particles: true,
    viewBobbing: true,
    showFps: true,
    cameraMode: 'first_person',
  });

  // Mutable Engine State Refs
  const inventoryRef = useRef<(ItemStack | null)[]>([]);
  const equipmentRef = useRef<PlayerEquipment>({ head: null, chest: null, legs: null, feet: null, accessory: null });
  const activeHotbarIndexRef = useRef<number>(0);
  const activeModalRef = useRef<ModalType>('none');
  const targetHitRef = useRef<RaycastHit | null>(null);
  const gameStatsRef = useRef<GameStatsManager | null>(null);
  const [isWorldLoaded, setIsWorldLoaded] = useState(false);
  const [loadingStage, setLoadingStage] = useState("Initializing Engine...");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [worldData, setWorldData] = useState<WorldSaveData | null>(null);
  const isPointerLockedRef = useRef<boolean>(false);

  // Active interaction positions
  const [activeChestPos, setActiveChestPos] = useState<[number, number, number] | null>(null);
  const [activeFurnacePos, setActiveFurnacePos] = useState<[number, number, number] | null>(null);
  const [activeAnvilPos, setActiveAnvilPos] = useState<[number, number, number] | null>(null);

  // UI State for React rendering
  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [activeDialogueEntity, setActiveDialogueEntity] = useState<EntityState | null>(null);
  const [inventoryState, setInventoryState] = useState<(ItemStack | null)[]>([]);
  const [equipmentState, setEquipmentState] = useState<PlayerEquipment>({ head: null, chest: null, legs: null, feet: null, accessory: null });
  const [activeHotbarIndex, setActiveHotbarIndex] = useState(0);
  const [activeBossState, setActiveBossState] = useState<BossCombatState | null>(null);
  const activeBossStateRef = useRef<BossCombatState | null>(null);

  // Throttled Telemetry state for HUD
  const hudStatsRef = useRef({
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    hunger: 100,
    maxHunger: 100,
    saturation: 20,
    temperature: 20,
    defenseRating: 0,
    oxygen: 100,
    maxOxygen: 100,
    level: 1,
    xp: 0,
    biomeName: 'Emerald Highlands',
    playerPos: [0, 80, 0] as [number, number, number],
    playerYaw: 0,
    fps: 60,
    loadedChunks: 0,
    timeOfDay: 8.0,
    weatherType: 'clear',
    breakProgress: 0,
    profilerMetrics: { activeChunks: 0, cachedChunks: 0, queuedTasks: 0, generatingTasks: 0, dirtyChunks: 0, meshUploadsPerFrame: 0 },
  });

  const [targetHitState, setTargetHitState] = useState<RaycastHit | null>(null);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [bowChargeRatio, setBowChargeRatio] = useState<number>(0);

  // Combat State Machine & Mining progressive state
  const combatMachineRef = useRef<CombatStateMachine>(new CombatStateMachine());
  const combatStateRef = useRef<{
    lastAttackTime: number;
    rangedCharge: number;
  }>({ lastAttackTime: 0, rangedCharge: 0 });

  const miningStateRef = useRef<{
    active: boolean;
    targetPosKey: string;
    progress: number;
    breakTime: number;
  }>({ active: false, targetPosKey: '', progress: 0, breakTime: 1.0 });

  const [showDebugMap, setShowDebugMap] = useState(false);

  // Sync state helpers
  const updateInventory = useCallback((newInv: (ItemStack | null)[]) => {
    inventoryRef.current = newInv;
    setInventoryState([...newInv]);
  }, []);

  const setModal = useCallback((modal: ModalType) => {
    activeModalRef.current = modal;
    setActiveModal(modal);
    if (modal !== 'none' && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, []);

  // Save game helper
  const saveGame = useCallback(() => {
    if (!worldRef.current || !playerRef.current) return;
    const pPos = playerRef.current.position;
    const saveData: WorldSaveData = {
      version: CURRENT_SAVE_VERSION,
      id: worldId,
      name: worldName,
      seed,
      gameMode,
      difficulty: 'normal',
      lastPlayed: Date.now(),
      createdAt: Date.now(),
      gameTime: skyRef.current ? skyRef.current.timeOfDay * 3600 : 28800,
      player: {
        position: [pPos.x, pPos.y, pPos.z],
        rotation: [playerRef.current.pitch, playerRef.current.yaw],
        health: statsRef.current.health,
        hunger: statsRef.current.hunger,
        stamina: statsRef.current.stamina,
        saturation: statsRef.current.saturation,
        temperature: statsRef.current.temperature,
        level: statsRef.current.level,
        xp: statsRef.current.xp,
        inventory: inventoryRef.current,
        hotbarIndex: activeHotbarIndexRef.current,
        equipment: equipmentRef.current,
      },
      weather: {
        type: weatherRef.current ? weatherRef.current.weather.type : 'clear',
        intensity: weatherRef.current ? weatherRef.current.weather.intensity : 0,
      },
      stats: gameStatsRef.current?.getStats() || { blocksMined: 0, blocksPlaced: 0, monstersDefeated: 0, distanceTraveled: 0 },
      modifiedBlocks: SaveManager.serializeModifiedBlocks(worldRef.current),
      containers: BlockPlacementEngine.serializeContainers(),
      furnaces: FurnaceManager.serialize(),
      farmingPlots: FarmingManager.serialize(),
      discoveries: DiscoverySystem.serialize(),
      quests: QuestManager.serialize(),
      activeEvents: WorldEventManager.serialize(),
      waypoints: MapManager.serializeWaypoints(),
      exploredMapTiles: MapManager.serializeExplored(),
    };
    SaveManager.saveWorld(saveData);
  }, [worldId, worldName, seed, gameMode]);


  // Async Data Loader
  useEffect(() => {
    const loadData = async () => {
      setLoadingStage("Loading Save Data...");
      setLoadingProgress(20);
      const existingSave = await SaveManager.loadWorldAsync(worldId);
      
      setLoadingProgress(60);
      setWorldData(existingSave);
      
      const statsManager = new GameStatsManager(existingSave?.stats);
      statsManager.initialize();
      gameStatsRef.current = statsManager;
      
      setLoadingStage("Generating Chunks...");
      setLoadingProgress(80);
      
      // Allow slight delay for rendering
      setTimeout(() => {
        setIsWorldLoaded(true);
        setLoadingProgress(100);
      }, 500);
    };
    loadData();
    
    return () => {
      gameStatsRef.current?.dispose();
    };
  }, [worldId]);

  // Main Three.js Initialization & Game Loop
  useEffect(() => {
    if (!isWorldLoaded || !containerRef.current) return;

    if (!containerRef.current) return;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x7eb1eb);
    scene.fog = new THREE.FogExp2(0xaaccff, 0.012);

    const camera = new THREE.PerspectiveCamera(settingsRef.current.fov, window.innerWidth / window.innerHeight, 0.1, 400);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // 2. Centralized Input Manager
    const inputManager = new InputManager();
    inputRef.current = inputManager;

    inputManager.onPointerLockChange((locked) => {
      isPointerLockedRef.current = locked;
      setIsPointerLocked(locked);
    });

    // 3. Voxel World
    const world = new VoxelWorld(seed, preset || 'standard');
    worldRef.current = world;
    scene.add(world.worldGroup);

    // 4. Entities & Fauna
    const entities = new EntityManager();
    scene.add(entities.entityGroup);
    entitiesRef.current = entities;

    // Load any existing saved world data
    const existingSave = worldData;
    let initialSpawn: [number, number, number] = [0, 80, 0];

    // Phase 8 Progression & Exploration systems initialization
    DiscoverySystem.initialize(existingSave?.discoveries);
    QuestManager.initialize(existingSave?.quests);
    WorldEventManager.initialize(existingSave?.activeEvents);
    MapManager.initialize(existingSave?.exploredMapTiles, existingSave?.waypoints);

    if (existingSave) {
      SaveManager.applySaveToWorld(world, existingSave);
      initialSpawn = existingSave.player.position;
      statsRef.current.health = existingSave.player.health;
      statsRef.current.hunger = existingSave.player.hunger;
      statsRef.current.stamina = existingSave.player.stamina;
      statsRef.current.saturation = existingSave.player.saturation || 20;
      statsRef.current.temperature = existingSave.player.temperature || 20;
      statsRef.current.level = existingSave.player.level;
      statsRef.current.xp = existingSave.player.xp;
      inventoryRef.current = existingSave.player.inventory;
      equipmentRef.current = existingSave.player.equipment;
      activeHotbarIndexRef.current = existingSave.player.hotbarIndex || 0;

      world.preloadSpawnChunks(initialSpawn[0], initialSpawn[2], 2);
    } else {
      initialSpawn = world.findSafeSpawn(seed);

      const starterInv: (ItemStack | null)[] = new Array(36).fill(null);
      starterInv[0] = InventoryManager.createStack('wooden_pickaxe', 1);
      starterInv[1] = InventoryManager.createStack('wooden_axe', 1);
      starterInv[2] = InventoryManager.createStack('torch', 16);
      starterInv[3] = InventoryManager.createStack('bread', 8);
      starterInv[4] = InventoryManager.createStack('seeds_wheat', 4);
      inventoryRef.current = starterInv;
      equipmentRef.current = { head: null, chest: null, legs: null, feet: null, accessory: null };
      activeHotbarIndexRef.current = 0;
    }

    setInventoryState([...inventoryRef.current]);
    setEquipmentState({ ...equipmentRef.current });
    setActiveHotbarIndex(activeHotbarIndexRef.current);

    // 5. Player Controller 2.0
    const player = new PlayerController(camera, initialSpawn);
    if (existingSave?.player?.rotation) {
      player.pitch = existingSave.player.rotation[0];
      player.yaw = existingSave.player.rotation[1];
    }
    playerRef.current = player;
    scene.add(player.playerGroup);

    // Spawn initial entities around spawn
    entities.spawnInitialPopulation(world, player.position);

    // 6. Sky, Weather, Clouds & Particles
    const sky = new SkyEnvironment(scene);
    if (existingSave?.gameTime) sky.timeOfDay = (existingSave.gameTime / 3600) % 24;
    skyRef.current = sky;

    const weather = new WeatherSystem(scene);
    weatherRef.current = weather;

    const clouds = new CloudSystem(scene);
    cloudsRef.current = clouds;

    const particles = new ParticleManager(scene);
    particlesRef.current = particles;

    // 7. First-Person Hand Item Pivot
    const handGroup = new THREE.Group();
    handGroup.position.set(0.35, -0.3, -0.6);
    camera.add(handGroup);
    scene.add(camera);
    handMeshRef.current = handGroup;

    // Keybind listeners
    inputManager.onAction('Pause', () => {
      if (activeModalRef.current === 'none') {
        setModal('pause');
      } else {
        setModal('none');
        containerRef.current?.requestPointerLock();
      }
    });

    inputManager.onAction('Inventory', () => {
      if (activeModalRef.current === 'none') {
        setModal('inventory');
      } else if (activeModalRef.current === 'inventory') {
        setModal('none');
        containerRef.current?.requestPointerLock();
      }
    });

    inputManager.onAction('Crafting', () => {
      if (activeModalRef.current === 'none') {
        setModal('crafting');
      } else if (activeModalRef.current === 'crafting') {
        setModal('none');
        containerRef.current?.requestPointerLock();
      }
    });

    inputManager.onAction('Journal', () => {
      if (activeModalRef.current === 'none') {
        setModal('journal');
      } else if (activeModalRef.current === 'journal') {
        setModal('none');
        containerRef.current?.requestPointerLock();
      }
    });

    inputManager.onAction('Map', () => {
      if (activeModalRef.current === 'none') {
        setModal('map');
      } else if (activeModalRef.current === 'map') {
        setModal('none');
        containerRef.current?.requestPointerLock();
      }
    });

    inputManager.onAction('ContentDebug', () => {
      if (activeModalRef.current === 'none') {
        setModal('contentDebug');
      } else if (activeModalRef.current === 'contentDebug') {
        setModal('none');
        containerRef.current?.requestPointerLock();
      }
    });

    inputManager.onAction('DebugMap', () => {
      setShowDebugMap(prev => !prev);
    });

    // Window resize
    const handleResize = () => {
      if (!cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    window.addEventListener('contextmenu', handleContextMenu);

    // Main Simulation Tick & Animation Loop
    let lastTime = performance.now();
    let reqId: number;
    let frameCount = 0;
    let lastFpsTime = performance.now();
    let currentFps = 60;
    let lastTelemetryTime = performance.now();
    let lastTargetPosKey = '';
    let accumulator = 0;
    let lastSimTimeMs = 0;
    let lastRenderTimeMs = 0;

    const animate = (now: number) => {
      reqId = requestAnimationFrame(animate);

      const currentTime = now;
      let frameTime = (currentTime - lastTime) / 1000;
      if (frameTime > 0.25) frameTime = 0.25;
      lastTime = currentTime;
      accumulator += frameTime;

      // FPS Counter
      frameCount++;
      if (currentTime - lastFpsTime >= 1000) {
        currentFps = frameCount;
        frameCount = 0;
        lastFpsTime = currentTime;
      }
      

      let simStart = performance.now();
      const dt = 1/60;
      while (accumulator >= dt) {
        // We redefine deltaTime as dt so we don't have to rename all variables inside the loop
        const deltaTime = dt;


      // Check if player died
      if (statsRef.current.isDead && activeModalRef.current !== 'death') {
        audioRef.current.playDamage();
        setModal('death');
      }

      // Environmental ticking
      const biome = world.biomeManager.getBiome(player.position.x, player.position.z);
      world.update(deltaTime);
      sky.update(deltaTime, player.position, biome);
      weather.update(deltaTime, player.position, (biome?.temperature ?? 0) < 0);
      clouds.update(deltaTime, player.position, weather.weather);
      particles.update(deltaTime);
      
      entities.update(deltaTime, world, player.position, sky.isNight, (dmg: number, src: string) => {
          statsRef.current.takeDamage(dmg, src);
          player.applyDamageFeedback();
      });

      // Phase 6 Core Loop: Furnaces & Farming Simulation
      FurnaceManager.update(deltaTime);
      FarmingManager.update(deltaTime, world);

      // Phase 8 Progression & Exploration Updates
      DiscoverySystem.update(deltaTime);
      WorldEventManager.update(deltaTime, Math.floor((sky.timeOfDay || 8) / 24) + 1, sky.timeOfDay || 8, [player.position.x, player.position.y, player.position.z]);
      MapManager.visitChunk(Math.floor(player.position.x / 16), Math.floor(player.position.z / 16));

      // Boss Combat State Check
      const nearbyBoss = entities.getActiveBossState(player.position);
      if (nearbyBoss?.id !== activeBossStateRef.current?.id) {
          activeBossStateRef.current = nearbyBoss;
          setActiveBossState(nearbyBoss);
        }

      // Only process player physics and interactions when game is not paused by a modal
      if (activeModalRef.current === 'none') {
        const pAABB = player.getAABB();
        const eyePos = player.getEyePosition();
        const eyeBlock = world.getBlock(Math.floor(eyePos.x), Math.floor(eyePos.y), Math.floor(eyePos.z));
        const isSubmerged = eyeBlock === BlockType.WATER;

        // Underwater visual fog override
        if (isSubmerged && scene.fog) {
          scene.fog.color.setHex(0x0a3f6d);
          if (scene.fog instanceof THREE.FogExp2) {
            scene.fog.density = 0.065;
          }
        }

        // Calculate ambient temperature
        let ambientTemp = biome.temperature || 20;
        // Altitude temperature lapse (-0.1°C per block above y=70)
        if (player.position.y > 70) {
          ambientTemp -= (player.position.y - 70) * 0.1;
        }

        // Check if near furnace or heat source
        const px = Math.floor(player.position.x);
        const py = Math.floor(player.position.y);
        const pz = Math.floor(player.position.z);
        for (let dx = -3; dx <= 3; dx++) {
          for (let dz = -3; dz <= 3; dz++) {
            const b = world.getBlock(px + dx, py, pz + dz);
            if (b === BlockType.FURNACE || b === BlockType.LAVA) ambientTemp += 5;
            if (b === BlockType.LAVA || b === BlockType.MAGMA_ROCK) ambientTemp += 15;
          }
        }

        // 1. Update Player Vitals & Metabolism
        statsRef.current.update(
          deltaTime,
          player.isSprinting,
          isSubmerged,
          player.isSwimming,
          miningStateRef.current.active,
          ambientTemp,
          false
        );

        // 2. Update Player Controller Physics
        if (inputManager.isPointerLocked) {
          player.handleMouseMove(
            inputManager.mouseDeltaX,
            inputManager.mouseDeltaY,
            settingsRef.current.mouseSensitivity,
            settingsRef.current.invertMouse
          );
        }
        player.syncInputs(inputManager, gameMode);
        player.update(deltaTime, world, gameMode, settingsRef.current.viewBobbing, statsRef.current.stamina);

        // 3. Entity Proximity Items Collection
        const collected = entities.checkItemPickup(player.position, 1.8);
        if (collected.length > 0) {
          collected.forEach(item => {
            InventoryManager.addItem(inventoryRef.current, item.itemId, item.count);
          });
          audioRef.current.playItemCollect();
          setInventoryState([...inventoryRef.current]);
        }
        // 4. Raycast Target Block & Entity Selection
        const rayOrigin = player.getCameraPosition();
        const rayDir = player.getForwardVector();
        const hit = world.raycast(rayOrigin, rayDir, 5.5);
        targetHitRef.current = hit;
        const hitEntityId = entities.getEntityRaycastHit(rayOrigin, rayDir, 4.5);

        const activeItem = inventoryRef.current[activeHotbarIndexRef.current];
        const placeBlock = activeItem ? ITEM_DEFS[activeItem.itemId]?.blockType : undefined;
        world.updateTargetHighlight(hit, placeBlock);

        // Update Combat State Machine
        const combatMachine = combatMachineRef.current;
        combatMachine.update(deltaTime);
        player.bowDrawRatio = combatMachine.bowDrawProgress;
        player.isBlockingShield = combatMachine.isBlocking;
        
        // Sync bow charge ratio to HUD
        if (activeItem?.itemId === 'hunting_bow') {
          if (combatMachine.bowDrawProgress !== bowChargeRatio) {
            setBowChargeRatio(combatMachine.bowDrawProgress);
          }
        } else if (bowChargeRatio > 0) {
          setBowChargeRatio(0);
        }

        // 5. Left Click: Combat or Hold-to-Mine
        if (inputManager.isActionActive('Attack')) {
          let hasAttackedEntity = false;

          // Check if we hit an entity first
          if (hitEntityId) {
            const isAirborneOrFalling = !player.isGrounded && player.velocity.y < 0;
            const canSwing = combatMachine.triggerMeleeAttack(activeItem);

            if (canSwing) {
              player.triggerSwing();
              const attackCalc = combatMachine.calculateMeleeDamage(activeItem, isAirborneOrFalling, player.isSprinting);
              const result = entities.attackEntity(
                hitEntityId,
                attackCalc.damage,
                player.position,
                attackCalc.isCritical,
                attackCalc.comboIndex
              );

              // Apply Hit Feedback (Screen Shake, Audio & Event Bus)
              const feedback = combatMachine.applyHitFeedback(
                attackCalc.isCritical,
                attackCalc.damage,
                [player.position.x, player.position.y, player.position.z]
              );
              player.applyScreenShake(feedback.screenShake);

              GameEventBus.emit('COMBAT_HIT', {
                hitType: attackCalc.isCritical ? 'crit' : 'hit',
                damage: attackCalc.damage,
                targetPos: [player.position.x, player.position.y, player.position.z],
              });

              if (attackCalc.isCritical) {
                audioRef.current.playCriticalHit();
              } else {
                audioRef.current.playPlayerHit();
              }

              if (result?.killed) {
                statsRef.current.addXP(5);
              }

              // Consume weapon durability
              if (activeItem && gameMode !== 'creative') {
                const durResult = MiningEngine.consumeDurability(activeItem, 'combat');
                if (durResult.broken) {
                  audioRef.current.playDamage();
                  inventoryRef.current[activeHotbarIndexRef.current] = null;
                } else {
                  inventoryRef.current[activeHotbarIndexRef.current] = durResult.item;
                }
                setInventoryState([...inventoryRef.current]);
              }
            }
            hasAttackedEntity = true;
          }

          // If didn't attack an entity, and we are hitting a block, do mining
          if (!hasAttackedEntity && hit) {
            const hitKey = `${hit.blockPos[0]},${hit.blockPos[1]},${hit.blockPos[2]}`;
            if (miningStateRef.current.targetPosKey !== hitKey) {
              miningStateRef.current.targetPosKey = hitKey;
              miningStateRef.current.progress = 0;
              const breakCalc = MiningEngine.calculateBreakTime(hit.blockType, activeItem, gameMode);
              miningStateRef.current.breakTime = breakCalc.breakTime;
            }
            miningStateRef.current.active = true;
            miningStateRef.current.progress += deltaTime / miningStateRef.current.breakTime;
            player.triggerSwing();
            if (Math.random() < 0.12) {
              audioRef.current.playBlockHit(BLOCK_DEFS[hit.blockType]?.soundType || 'stone');
            }
  
            // Visual crack & break completion
            if (miningStateRef.current.progress >= 1.0) {
              const drops = MiningEngine.getBlockDrops(hit.blockType, activeItem, gameMode);
              particles.spawnBlockBreakParticles(
                new THREE.Vector3(hit.blockPos[0] + 0.5, hit.blockPos[1] + 0.5, hit.blockPos[2] + 0.5),
                hit.blockType
              );
              world.setBlock(hit.blockPos[0], hit.blockPos[1], hit.blockPos[2], BlockType.AIR);
              GameEventBus.emit('BLOCK_MINED', { blockType: hit.blockType, pos: hit.blockPos });
              BlockPlacementEngine.handleBlockDestruction(hit.blockPos, hit.blockType, world);
              audioRef.current.playBlockBreak();
              statsRef.current.addXP(2);
  
              // Add drops to inventory
              if (gameMode !== 'creative') {
                drops.forEach(drop => {
                  InventoryManager.addItem(inventoryRef.current, drop.itemId, drop.count);
                });
                // Consume durability on held tool
                if (activeItem) {
                  const durResult = MiningEngine.consumeDurability(activeItem, 'mine');
                  if (durResult.broken) {
                    audioRef.current.playDamage();
                    inventoryRef.current[activeHotbarIndexRef.current] = null;
                  } else {
                    inventoryRef.current[activeHotbarIndexRef.current] = durResult.item;
                  }
                }
                setInventoryState([...inventoryRef.current]);
              }
  
              miningStateRef.current.active = false;
              miningStateRef.current.progress = 0;
              miningStateRef.current.targetPosKey = '';
            }
          }
        } else {
          miningStateRef.current.active = false;
          miningStateRef.current.progress = 0;
        }

        // 5.5 Ranged Combat (Bow Draw & Release Dynamics)
        if (activeItem && activeItem.itemId === 'hunting_bow') {
          if (inputManager.isActionActive('Use')) {
            if (combatMachine.state === 'IDLE') {
              combatMachine.startBowDraw();
              audioRef.current.playBowDraw();
            }
          } else {
            if (combatMachine.state === 'BOW_DRAWING' || combatMachine.state === 'BOW_CHARGED') {
              const bowRelease = combatMachine.releaseBow(activeItem);
              if (bowRelease.released) {
                const rayOrigin = player.getCameraPosition();
                const rayDir = player.getForwardVector();

                // Spawn Arrow with calculated velocity and damage
                entities.spawnProjectile(
                  rayOrigin.clone().addScaledVector(rayDir, 0.6),
                  rayDir.clone().multiplyScalar(bowRelease.arrowVelocity),
                  bowRelease.arrowDamage,
                  true
                );

                audioRef.current.playBowRelease(bowRelease.isCritical);
                player.applyScreenShake(bowRelease.isCritical ? 0.4 : 0.2);

                // Consume durability
                if (gameMode !== 'creative') {
                  const durResult = MiningEngine.consumeDurability(activeItem, 'combat');
                  if (durResult.broken) {
                    audioRef.current.playDamage();
                    inventoryRef.current[activeHotbarIndexRef.current] = null;
                  } else {
                    inventoryRef.current[activeHotbarIndexRef.current] = durResult.item;
                  }
                  setInventoryState([...inventoryRef.current]);
                }
              }
            }
          }
        }

        // 6. Right Click: Use / Place / Farm / Smelt / Workstation Interaction
        if (inputManager.consumeAction('Use') && hit && (!activeItem || activeItem.itemId !== 'hunting_bow')) {
          const hitBlock = hit.blockType;
          const [hx, hy, hz] = hit.blockPos;

          // Priority 1: Harvest Ripe Crops
          if (
            hitBlock === BlockType.CROP_WHEAT_3 ||
            hitBlock === BlockType.CROP_CARROT ||
            hitBlock === BlockType.CROP_HERB
          ) {
            const farmlandPos: [number, number, number] = [hx, hy - 1, hz];
            const harvestRes = FarmingManager.harvestCrop(farmlandPos, world);
            if (harvestRes.success && harvestRes.drops.length > 0) {
              harvestRes.drops.forEach(drop => {
                InventoryManager.addItem(inventoryRef.current, drop.itemId, drop.count);
              });
              audioRef.current.playItemCollect();
              player.triggerSwing();
              setInventoryState([...inventoryRef.current]);
              return;
            }
          }

          // Priority 2: Workstation Modals
          if (hitBlock === BlockType.CHEST) {
            setActiveChestPos(hit.blockPos);
            setModal('chest');
            return;
          }

          if (hitBlock === BlockType.CRAFTING_BENCH) {
            setModal('crafting');
            return;
          }

          if (hitBlock === BlockType.FURNACE) {
            setActiveFurnacePos(hit.blockPos);
            setModal('furnace');
            return;
          }

          if (hitBlock === BlockType.ANVIL_SMITHING) {
            setActiveAnvilPos(hit.blockPos);
            setModal('anvil');
            return;
          }

          // Priority 3: Agriculture with Held Item (Hoe, Seeds, Fertilizer)
          if (activeItem) {
            const itemDef = ITEM_DEFS[activeItem.itemId];

            // A. Hoe Tilling
            if (itemDef?.toolType === 'hoe') {
              if (hitBlock === BlockType.GRASS || hitBlock === BlockType.DIRT) {
                const tilled = FarmingManager.tillSoil(hit.blockPos, world);
                if (tilled) {
                  audioRef.current.playBlockPlace();
                  player.triggerSwing();

                  const durResult = MiningEngine.consumeDurability(activeItem, 'mine');
                  if (durResult.broken) {
                    inventoryRef.current[activeHotbarIndexRef.current] = null;
                  } else {
                    inventoryRef.current[activeHotbarIndexRef.current] = durResult.item;
                  }
                  setInventoryState([...inventoryRef.current]);
                  return;
                }
              }
            }

            // B. Crop Planting
            if (itemDef?.category === 'seed' || activeItem.itemId === 'seeds_wheat' || activeItem.itemId === 'wild_carrot' || activeItem.itemId === 'crop_herb') {
              if (hitBlock === BlockType.FARMLAND) {
                const planted = FarmingManager.plantSeed(hit.blockPos, activeItem.itemId, world);
                if (planted) {
                  audioRef.current.playBlockPlace();
                  player.triggerSwing();
                  CraftingSystem.consumeItem(inventoryRef.current, activeItem.itemId, 1);
                  setInventoryState([...inventoryRef.current]);
                  return;
                }
              }
            }

            // C. Fertilizer (Bone Meal)
            if (activeItem.itemId === 'monster_bone') {
              const farmlandPos: [number, number, number] = [hx, hy - 1, hz];
              const fertilized = FarmingManager.applyFertilizer(farmlandPos, world);
              if (fertilized) {
                audioRef.current.playItemCollect();
                player.triggerSwing();
                CraftingSystem.consumeItem(inventoryRef.current, activeItem.itemId, 1);
                setInventoryState([...inventoryRef.current]);
                return;
              }
            }

            // Priority 4: Consumables (Food, Drink, Medicine)
            if (itemDef?.category === 'food' || itemDef?.category === 'potion' || itemDef?.foodValue) {
              const consumed = InventoryManager.consumeFoodOrDrink(inventoryRef.current, activeHotbarIndexRef.current, statsRef.current);
              if (consumed) {
                audioRef.current.playUIClick();
                player.triggerSwing();
                setInventoryState([...inventoryRef.current]);
                return;
              }
            }

            // Priority 5: Block Placement via BlockPlacementEngine
            if (itemDef?.blockType) {
              const placeEval = BlockPlacementEngine.evaluatePlacement(
                hit,
                itemDef.blockType,
                player.getAABB(),
                player.yaw,
                world
              );

              if (placeEval.allowed) {
                world.setBlock(
                  placeEval.placePos[0],
                  placeEval.placePos[1],
                  placeEval.placePos[2],
                  placeEval.blockTypeToPlace
                );

                if (placeEval.extraBlocks) {
                  placeEval.extraBlocks.forEach(extra => {
                    world.setBlock(extra.pos[0], extra.pos[1], extra.pos[2], extra.blockType);
                  });
                }

                audioRef.current.playBlockPlace();
                player.triggerSwing();

                if (gameMode !== 'creative') {
                  CraftingSystem.consumeItem(inventoryRef.current, activeItem.itemId, 1);
                  setInventoryState([...inventoryRef.current]);
                }
              }
            }
          }
        }

        // Update target hit state in React only when target block changes
        const currentTargetKey = hit ? `${hit.blockPos[0]},${hit.blockPos[1]},${hit.blockPos[2]},${hit.blockType}` : '';
        if (currentTargetKey !== lastTargetPosKey) {
          lastTargetPosKey = currentTargetKey;
          setTargetHitState(hit);
        }

        // Stream World Chunks around player
        world.updateChunks(player.position, player.getForwardVector(), settingsRef.current.renderDistance, 3.0);

        // Clear single-frame input deltas
        inputManager.postUpdate();
      }

      
        accumulator -= dt;
      } // End while loop (Simulation Tick)
      
      let simEnd = performance.now();
      lastSimTimeMs = simEnd - simStart;
      let renderStart = performance.now();
      
      // Throttled HUD Telemetry update (~6.6 Hz / every 150ms)
      if (currentTime - lastTelemetryTime >= 150) {
        lastTelemetryTime = currentTime;
        const currentBiome = world.biomeManager.getBiome(player.position.x, player.position.z);
        const armorDefense = (Object.values(equipmentRef.current) as (ItemStack | null)[]).reduce((sum, item) => {
          if (!item) return sum;
          const def = ITEM_DEFS[item.itemId];
          return sum + (def?.armorValue || 0);
        }, 0);

        TelemetryStore.update({
          health: statsRef.current.health,
          maxHealth: statsRef.current.maxHealth,
          stamina: statsRef.current.stamina,
          maxStamina: statsRef.current.maxStamina,
          hunger: statsRef.current.hunger,
          maxHunger: statsRef.current.maxHunger,
          saturation: statsRef.current.saturation,
          temperature: statsRef.current.temperature,
          defenseRating: armorDefense,
          oxygen: statsRef.current.oxygen,
          maxOxygen: statsRef.current.maxOxygen,
          level: statsRef.current.level,
          xp: statsRef.current.xp,
          biomeName: currentBiome.name,
          playerPos: [player.position.x, player.position.y, player.position.z],
          playerYaw: player.yaw,
          fps: currentFps,
          loadedChunks: world.chunks.size,
          profilerMetrics: {
            ...world.scheduler.metrics,
            frameTimeMs: frameTime * 1000,
            simTimeMs: lastSimTimeMs,
            renderTimeMs: lastRenderTimeMs,
            drawCalls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            memoryEst: (performance as any).memory ? (performance as any).memory.usedJSHeapSize / 1048576 : 0,
          },
          timeOfDay: sky.timeOfDay,
          weatherType: weather.weather.type,
          breakProgress: miningStateRef.current.progress,
        });
      }

      // Render Scene
      renderer.render(scene, camera);
      lastRenderTimeMs = performance.now() - renderStart;
    };

    reqId = requestAnimationFrame(animate);

    // Auto-Save interval every 30 seconds
    const autoSaveInterval = setInterval(() => {
      saveGame();
    }, 30000);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(reqId);
      clearInterval(autoSaveInterval);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('contextmenu', handleContextMenu);
      inputManager.dispose();

      if (document.pointerLockElement) {
        document.exitPointerLock();
      }

      world.dispose();
      sky.dispose();
      weather.dispose();
      clouds.dispose();
      particles.dispose();
      entities.dispose();

      if (renderer.domElement && containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isWorldLoaded, worldId, seed, gameMode, worldName, preset, saveGame]);

  const handleResume = () => {
    setModal('none');
    containerRef.current?.requestPointerLock();
  };

  const handleSaveAndQuit = () => {
    saveGame();
    onExitToMenu();
  };

  const handleRespawn = () => {
    if (!playerRef.current || !worldRef.current) return;
    const safeSpawn = worldRef.current.findSafeSpawn(seed);
    playerRef.current.position.set(...safeSpawn);
    playerRef.current.velocity.set(0, 0, 0);

    statsRef.current.health = 100;
    statsRef.current.hunger = 100;
    statsRef.current.saturation = 20;
    statsRef.current.stamina = 100;
    statsRef.current.isDead = false;
    statsRef.current.activeEffects = [];

    setModal('none');
    containerRef.current?.requestPointerLock();
  };

  return (
    <div id="game-canvas-wrapper" className="relative w-full h-full min-h-screen overflow-hidden select-none bg-black">
      {/* Three.js Canvas Container */}
      <div
        id="voxel-canvas-container"
        ref={containerRef}
        className="w-full h-full cursor-crosshair"
        onClick={() => {
          if (activeModal === 'none' && !isPointerLocked) {
            containerRef.current?.requestPointerLock();
          }
        }}
      />

      {/* Click Screen to Lock Pointer & Move Player Overlay */}
      {activeModal === 'none' && !isPointerLocked && (
        <div
          onClick={() => {
            containerRef.current?.requestPointerLock();
          }}
          className="absolute inset-0 z-40 bg-black/40 backdrop-blur-[2px] flex flex-col items-center justify-center cursor-pointer select-none animate-fade-in"
        >
          <div className="bg-[#0c0e14]/90 border border-sky-400/40 p-6 rounded-3xl shadow-2xl text-center space-y-3 max-w-sm pointer-events-auto">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-500/20 border border-sky-400 flex items-center justify-center text-sky-400 text-xl font-bold animate-bounce">
              🎮
            </div>
            <h3 className="text-base font-black uppercase tracking-wider text-white">Klik Layar Untuk Bergerak</h3>
            <p className="text-xs text-white/70 leading-relaxed">
              Klik di mana saja pada layar untuk mengaktifkan kendali kamera dan karakter. Gunakan <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-sky-300 font-bold">WASD</kbd> untuk jalan & <kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-sky-300 font-bold">Space</kbd> untuk lompat.
            </p>
            <div className="pt-1 text-[11px] font-mono text-sky-400 font-bold uppercase tracking-widest animate-pulse">
              [ Klik Layar Untuk Mulai ]
            </div>
          </div>
        </div>
      )}

      {/* In-Game HUD & Telemetry */}
      {activeModal === 'none' && (
        <HUD
          hotbar={inventoryState.slice(0, 9)}
          activeHotbarIndex={activeHotbarIndex}
          onSelectHotbar={idx => {
            activeHotbarIndexRef.current = idx;
            setActiveHotbarIndex(idx);
          }}
          targetHit={targetHitState}
          onOpenInventory={() => setModal('inventory')}
          onOpenCrafting={() => setModal('crafting')}
          onToggleCamera={() => playerRef.current?.togglePerspective()}
          onOpenPause={() => setModal('pause')}
          onToggleDebugMap={() => setShowDebugMap(prev => !prev)}
          onOpenJournal={() => setModal('journal')}
          onOpenContentDebug={() => setModal('contentDebug')}
          activeBoss={activeBossState}
          bowChargeRatio={bowChargeRatio}
        />
      )}

      {/* Development Debug World Region Map Overlay */}
      {showDebugMap && worldRef.current && (
        <DebugMap
          world={worldRef.current}
          playerPos={TelemetryStore.state.playerPos}
          onClose={() => setShowDebugMap(false)}
        />
      )}

      {/* Modals & Dialogs */}
      {activeModal === 'journal' && (
        <JournalModal
          isOpen={true}
          onClose={() => setModal('none')}
          playerPos={TelemetryStore.state.playerPos}
          playerXp={TelemetryStore.state.xp}
          playerLevel={TelemetryStore.state.level}
        />
      )}

      {activeModal === 'map' && (
        <MapModal
          isOpen={true}
          onClose={() => setModal('none')}
          world={worldRef.current}
          playerPos={TelemetryStore.state.playerPos}
          playerYaw={TelemetryStore.state.playerYaw}
        />
      )}

      {activeModal === 'contentDebug' && (
        <ContentDebugModal
          isOpen={true}
          onClose={() => setModal('none')}
          playerPos={TelemetryStore.state.playerPos}
          onTeleport={(tx, ty, tz) => {
            if (playerRef.current) {
              playerRef.current.position.set(tx, ty, tz);
              playerRef.current.velocity.set(0, 0, 0);
            }
          }}
          onSpawnBoss={(type) => {
            if (entitiesRef.current && worldRef.current && playerRef.current) {
              entitiesRef.current.spawnBoss(
                type,
                [playerRef.current.position.x + 8, playerRef.current.position.y, playerRef.current.position.z + 8],
                worldRef.current
              );
            }
          }}
        />
      )}

      {/* Modals & Dialogs */}
      {activeModal === 'inventory' && (
        <InventoryModal
          inventory={inventoryState}
          setInventory={setInventoryState}
          equipment={equipmentState}
          setEquipment={setEquipmentState}
          onClose={() => setModal('none')}
        />
      )}

      {activeModal === 'crafting' && (
        <CraftingModal
          inventory={inventoryState}
          setInventory={setInventoryState}
          onClose={() => setModal('none')}
          station="crafting_bench"
        />
      )}

      {activeModal === 'furnace' && activeFurnacePos && (
        <FurnaceModal
          furnacePos={activeFurnacePos}
          playerInventory={inventoryState}
          setPlayerInventory={setInventoryState}
          onClose={() => setModal('none')}
        />
      )}

      {activeModal === 'chest' && activeChestPos && (
        <ChestModal
          chestPos={activeChestPos}
          playerInventory={inventoryState}
          setPlayerInventory={setInventoryState}
          onClose={() => setModal('none')}
        />
      )}

      {activeModal === 'anvil' && activeAnvilPos && (
        <AnvilModal
          anvilPos={activeAnvilPos}
          playerInventory={inventoryState}
          setPlayerInventory={setInventoryState}
          onClose={() => setModal('none')}
        />
      )}

      {activeModal === 'death' && (
        <DeathModal
          score={statsRef.current.xp}
          level={statsRef.current.level}
          daysSurvived={Math.floor((skyRef.current?.timeOfDay || 8) / 24) + 1}
          onRespawn={handleRespawn}
          onExitToMenu={onExitToMenu}
        />
      )}

      {activeModal === 'dialogue' && activeDialogueEntity && (
        <DialogueModal
          entity={activeDialogueEntity}
          inventory={inventoryState}
          setInventory={setInventoryState}
          onClose={() => setModal('none')}
        />
      )}

      {activeModal === 'pause' && (
        <PauseMenu
          onResume={handleResume}
          onSaveAndQuit={handleSaveAndQuit}
        />
      )}

      {/* Mobile Controls Overlay if touch screen */}
      <MobileControls
        onMove={(forward, strafe) => {
          if (playerRef.current) {
            playerRef.current.keys.forward = forward > 0.3;
            playerRef.current.keys.backward = forward < -0.3;
            playerRef.current.keys.left = strafe < -0.3;
            playerRef.current.keys.right = strafe > 0.3;
          }
        }}
        onJump={() => {
          if (playerRef.current) playerRef.current.keys.jump = true;
          setTimeout(() => {
            if (playerRef.current) playerRef.current.keys.jump = false;
          }, 150);
        }}
        onSprint={() => {
          if (playerRef.current) playerRef.current.keys.sprint = !playerRef.current.keys.sprint;
        }}
        onAttack={() => {
          if (playerRef.current) playerRef.current.triggerSwing();
        }}
        onPlace={() => {
          // Block placement action
        }}
        onOpenInventory={() => setModal('inventory')}
        onOpenCrafting={() => setModal('crafting')}
      />
    </div>
  );
};
