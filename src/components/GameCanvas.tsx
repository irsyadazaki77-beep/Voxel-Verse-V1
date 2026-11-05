// Master 3D Voxel Game Canvas with Three.js & Modern Modular Systems Architecture (Phase 2 Refactor)
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameMode, ItemStack, PlayerEquipment, GameSettings, EntityState, BossCombatState, StartupStateMachineState, WorldSaveData } from '../types';
import { WorldPreset } from '../engine/world/WorldConfig';
import { GameRuntime } from '../engine/core/GameRuntime';
import { WorldStartupPipeline, StartupProgress } from '../engine/world/WorldStartupPipeline';
import { SaveManager } from '../engine/storage/SaveManager';
import { HUD } from './HUD';
import { LoadingScreen } from './LoadingScreen';
import { TelemetryStore } from '../engine/ui/TelemetryStore';
const InventoryModal = React.lazy(() =>
  import('./InventoryModal').then((m) => ({ default: m.InventoryModal }))
);
const ChestModal = React.lazy(() =>
  import('./ChestModal').then((m) => ({ default: m.ChestModal }))
);
const DeathModal = React.lazy(() =>
  import('./DeathModal').then((m) => ({ default: m.DeathModal }))
);

const CraftingModal = React.lazy(() =>
  import('./CraftingModal').then((m) => ({ default: m.CraftingModal }))
);
const FurnaceModal = React.lazy(() =>
  import('./FurnaceModal').then((m) => ({ default: m.FurnaceModal }))
);
const AnvilModal = React.lazy(() =>
  import('./AnvilModal').then((m) => ({ default: m.AnvilModal }))
);
const DialogueModal = React.lazy(() =>
  import('./DialogueModal').then((m) => ({ default: m.DialogueModal }))
);
const PauseMenu = React.lazy(() =>
  import('./PauseMenu').then((m) => ({ default: m.PauseMenu }))
);
const JournalModal = React.lazy(() =>
  import('./JournalModal').then((m) => ({ default: m.JournalModal }))
);
const MapModal = React.lazy(() =>
  import('./MapModal').then((m) => ({ default: m.MapModal }))
);
const ContentDebugModal = React.lazy(() =>
  import('./ContentDebugModal').then((m) => ({ default: m.ContentDebugModal }))
);
const EngineeringModal = React.lazy(() =>
  import('./EngineeringModal').then((m) => ({ default: m.EngineeringModal }))
);
const MultiplayerLobbyModal = React.lazy(() =>
  import('./MultiplayerLobbyModal').then((m) => ({ default: m.MultiplayerLobbyModal }))
);
const CharacterProgressionModal = React.lazy(() =>
  import('./CharacterProgressionModal').then((m) => ({ default: m.CharacterProgressionModal }))
);
import { MobileControls } from './MobileControls';
import { DebugMap } from './DebugMap';
import { NetworkSession } from '../engine/network/NetworkSession';
import { ConnectionState } from '../engine/network/NetworkProtocol';
import { QuestManager } from '../engine/progression/QuestManager';
import { SettingsManager } from '../engine/ui/SettingsManager';
import { useOrientation } from '../hooks/useOrientation';
import { RotateDeviceOverlay } from './RotateDeviceOverlay';
import { TouchDebugOverlay, TouchDebugData } from './TouchDebugOverlay';

interface GameCanvasProps {
  worldId: string;
  seed: number;
  gameMode: GameMode;
  worldName: string;
  preset?: WorldPreset;
  isMultiplayer?: boolean;
  sessionToken?: string;
  playerName?: string;
  onExitToMenu: () => void;
}

export type ModalType = 'none' | 'inventory' | 'crafting' | 'furnace' | 'chest' | 'anvil' | 'dialogue' | 'pause' | 'death' | 'journal' | 'map' | 'character' | 'contentDebug' | 'engineering';

export const GameCanvas: React.FC<GameCanvasProps> = ({
  worldId,
  seed,
  gameMode,
  worldName,
  preset = 'standard',
  isMultiplayer = false,
  sessionToken,
  playerName,
  onExitToMenu,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<GameRuntime | null>(null);

  // Orientation & Responsive Mobile Viewport
  const { 
    isMobile, 
    isPortrait, 
    requestLandscape, 
    toggleFullscreen, 
    viewportWidth, 
    viewportHeight 
  } = useOrientation();

  // Attempt automatic orientation lock to landscape on mobile game startup
  useEffect(() => {
    if (isMobile) {
      requestLandscape().catch(() => {});
    }
  }, [isMobile, requestLandscape]);

  // Loading state machine & recovery
  const [startupState, setStartupState] = useState<StartupStateMachineState>('IDLE');
  const [isWorldLoaded, setIsWorldLoaded] = useState(false);
  const [loadingStage, setLoadingStage] = useState("Initializing Engine...");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [initErrorMessage, setInitErrorMessage] = useState<string | null>(null);
  const [recoverySnapshotLayer, setRecoverySnapshotLayer] = useState<string | null>(null);
  const [recoverySnapshotData, setRecoverySnapshotData] = useState<WorldSaveData | null>(null);

  // Persistence status
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reactive UI state synchronized bidirectionally with GameRuntime
  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [inventoryState, setInventoryState] = useState<(ItemStack | null)[]>([]);
  const [equipmentState, setEquipmentState] = useState<PlayerEquipment>({ head: null, chest: null, legs: null, feet: null, accessory: null });
  const [activeHotbarIndex, setActiveHotbarIndex] = useState(0);
  const [activeBossState, setActiveBossState] = useState<BossCombatState | null>(null);
  const [targetHitState, setTargetHitState] = useState<any | null>(null);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [showDebugMap, setShowDebugMap] = useState(false);
  const [touchTelemetry, setTouchTelemetry] = useState<TouchDebugData | null>(null);
  const [showTouchDebug, setShowTouchDebug] = useState<boolean>(SettingsManager.get().mobileControls.showTouchDebug);

  useEffect(() => {
    return SettingsManager.subscribe((s) => {
      setShowTouchDebug(s.mobileControls.showTouchDebug);
    });
  }, []);

  // Active interaction positions
  const [activeChestPos, setActiveChestPos] = useState<[number, number, number] | null>(null);
  const [activeFurnacePos, setActiveFurnacePos] = useState<[number, number, number] | null>(null);
  const [activeAnvilPos, setActiveAnvilPos] = useState<[number, number, number] | null>(null);
  const [activeCraftingPos, setActiveCraftingPos] = useState<[number, number, number] | null>(null);
  const [activeEngineeringPos, setActiveEngineeringPos] = useState<[number, number, number] | null>(null);
  const [activeDialogueEntity, setActiveDialogueEntity] = useState<EntityState | null>(null);
  const [activeObjective, setActiveObjective] = useState<string>('');

  // Multiplayer Connection State Monitoring & Diagnostics
  const [netConnectionState, setNetConnectionState] = useState<ConnectionState>('READY');
  const [netStateReason, setNetStateReason] = useState<string>('');
  const [reconnectAttempt, setReconnectAttempt] = useState<number>(0);
  const [maxReconnectAttempts, setMaxReconnectAttempts] = useState<number>(5);
  const [nextRetryMs, setNextRetryMs] = useState<number>(0);
  const [showMultiplayerLobby, setShowMultiplayerLobby] = useState<boolean>(false);

  useEffect(() => {
    if (!isMultiplayer) return;
    const session = NetworkSession.getInstance();
    const unsub = session.onConnectionStateChange((state, reason) => {
      setNetConnectionState(state);
      setNetStateReason(reason || '');
      const prog = session.getReconnectProgress();
      setReconnectAttempt(prog.attempt);
      setMaxReconnectAttempts(prog.maxAttempts);
      setNextRetryMs(prog.nextRetryDelayMs);
    });
    return unsub;
  }, [isMultiplayer]);

  // Quest objective tracker
  useEffect(() => {
    const updateObjective = () => {
      const activeQuests = QuestManager.getActiveQuests().filter(q => q.state === 'active');
      const current = activeQuests[0];
      if (current) {
        const nextObjIdx = current.def.objectives.findIndex((obj, idx) => (current.progress[idx] || 0) < obj.requiredCount);
        if (nextObjIdx !== -1) {
          const obj = current.def.objectives[nextObjIdx];
          const curr = current.progress[nextObjIdx] || 0;
          setActiveObjective(`${obj.description} (${curr}/${obj.requiredCount})`);
          return;
        }
      }
      setActiveObjective('');
    };

    updateObjective();
    const unsub = QuestManager.onQuestChange(updateObjective);
    return () => {
      unsub();
    };
  }, []);

  const setModal = useCallback((modal: ModalType) => {
    setActiveModal(modal);
    if (runtimeRef.current) {
      runtimeRef.current.isPaused = modal !== 'none';
    }
    if (modal !== 'none' && document.pointerLockElement) {
      document.exitPointerLock();
    }
  }, []);

  // Cancellation and initialization mutex references
  const isInitializingRef = useRef(false);
  const cancelTokenRef = useRef<{ isCancelled: boolean }>({ isCancelled: false });

  // Async load save data & progressive non-blocking world initialization pipeline
  const loadData = useCallback(async (forcedSave?: WorldSaveData | null) => {
    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    // Reset cancellation token
    cancelTokenRef.current = { isCancelled: false };
    const cancelToken = cancelTokenRef.current;

    setStartupState('VALIDATING');
    setLoadingStage("Validating Engine & World...");
    setLoadingProgress(5);
    setInitErrorMessage(null);
    setRecoverySnapshotLayer(null);
    setRecoverySnapshotData(null);

    try {
      // Poll for containerRef if not immediately attached
      let container = containerRef.current;
      if (!container) {
        for (let attempt = 0; attempt < 15; attempt++) {
          await new Promise(r => setTimeout(r, 20));
          if (cancelToken.isCancelled) return;
          if (containerRef.current) {
            container = containerRef.current;
            break;
          }
        }
      }

      if (!container) {
        throw new Error("Canvas container reference is missing or detached.");
      }

      console.log('[GameCanvas] [LoadingPipeline] Running staged WorldStartupPipeline for world:', worldId);
      
      const { runtime, diagnostics } = await WorldStartupPipeline.run({
        container,
        worldId,
        worldName,
        seed,
        gameMode,
        preset,
        settings: SettingsManager.get(),
        existingSave: forcedSave,
        isCancelled: () => cancelToken.isCancelled,
        onProgress: (progress: StartupProgress) => {
          if (!cancelToken.isCancelled) {
            setLoadingStage(progress.stageName);
            setLoadingProgress(progress.progressPercent);
            if (progress.stage === 'validate') setStartupState('VALIDATING');
            else if (progress.stage === 'load_save') setStartupState('LOADING_SAVE');
            else if (progress.stage === 'generate_spawn_area') setStartupState('GENERATING');
            else if (progress.stage === 'init_systems') setStartupState('INITIALIZING');
            else if (progress.stage === 'ready') setStartupState('READY');
          }
        },
      });

      if (cancelToken.isCancelled) {
        runtime.stop();
        setStartupState('CANCELLED');
        return;
      }

      // Register bidirectional sync callbacks with diff-guarded state updates
      let lastBossKey = '';
      let lastHitKey = '';

      runtime.registerCallbacks({
        onBossUpdated: (boss) => {
          const bossKey = boss ? `${boss.id}:${boss.health}:${boss.phase}:${boss.enraged}` : 'none';
          if (bossKey !== lastBossKey) {
            lastBossKey = bossKey;
            setActiveBossState(boss);
          }
        },
        onTargetHitChanged: (hit) => {
          const hitKey = hit ? `${hit.blockPos[0]},${hit.blockPos[1]},${hit.blockPos[2]},${hit.blockType}` : '';
          if (hitKey !== lastHitKey) {
            lastHitKey = hitKey;
            setTargetHitState(hit);
          }
        },
        onInventoryUpdated: (inv) => setInventoryState(inv),
        onEquipmentUpdated: (eq) => setEquipmentState(eq),
        onActiveHotbarIndexChanged: (idx) => {
          setActiveHotbarIndex((prev) => (prev !== idx ? idx : prev));
        },
        onPointerLockChange: (locked) => setIsPointerLocked(locked),
        onOpenModal: (modalType, data) => {
          if (modalType === 'dialogue') {
            setActiveDialogueEntity(data);
          } else if (modalType === 'chest') {
            setActiveChestPos(data);
          } else if (modalType === 'furnace') {
            setActiveFurnacePos(data);
          } else if (modalType === 'anvil') {
            setActiveAnvilPos(data);
          } else if (modalType === 'crafting') {
            setActiveCraftingPos(
              Array.isArray(data) && data.length === 3
                ? [Number(data[0]), Number(data[1]), Number(data[2])]
                : null
            );
          } else if (modalType === 'engineering') {
            setActiveEngineeringPos(data);
          }
          setModal(modalType);
        },
        onPlayerDeath: () => setModal('death'),
      });

      runtimeRef.current = runtime;
      (window as any).__voxelRuntime = runtime;

      if (isMultiplayer) {
        setLoadingStage("Connecting to Authoritative Realm Server...");
        setLoadingProgress(98);

        if (cancelToken.isCancelled) {
          runtime.stop();
          setStartupState('CANCELLED');
          return;
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const serverUrl = `${protocol}//${window.location.host}/ws`;
        console.log('[GameCanvas] Connecting to authoritative server:', serverUrl);

        if (sessionToken) {
          NetworkSession.getInstance().sessionToken = sessionToken;
        }

        const nameToUse = playerName || 'Explorer_' + Math.random().toString(36).substring(2, 6);

        try {
          const sessionStarted = await NetworkSession.getInstance().startSession(
            runtime.scene,
            true,
            nameToUse,
            true,
            serverUrl
          );

          if (cancelToken.isCancelled) {
            runtime.stop();
            setStartupState('CANCELLED');
            return;
          }

          if (!sessionStarted) {
            runtime.stop();
            const failureReason = NetworkSession.getInstance().connectionState === 'FAILED'
              ? 'Gagal terhubung ke realm multiplayer: Server tidak merespons atau sesi kedaluwarsa.'
              : 'Gagal mengotentikasi dan menyinkronkan bootstrap dunia multiplayer.';
            setInitErrorMessage(failureReason);
            setStartupState('FAILED');
            return;
          }
        } catch (netErr: any) {
          runtime.stop();
          console.error("[GameCanvas] Multiplayer network connection failed:", netErr);
          setInitErrorMessage(netErr?.message || 'Gagal terhubung ke server realm multiplayer.');
          setStartupState('FAILED');
          return;
        }
      }

      runtime.start();
      runtime.resize(window.innerWidth, window.innerHeight);

      console.log('[GameCanvas] [LoadingPipeline] World successfully loaded in', diagnostics.totalDurationMs.toFixed(1), 'ms');
      setLoadingStage("Entering World...");
      setLoadingProgress(100);
      setStartupState('READY');
      
      // Complete transition
      setTimeout(() => {
        if (!cancelToken.isCancelled) {
          setIsWorldLoaded(true);
        }
      }, 30);
    } catch (err: any) {
      if (cancelToken.isCancelled) {
        setStartupState('CANCELLED');
        return;
      }
      console.error("Fatal error during GameRuntime initialization pipeline:", err);
      const msg = err?.message || String(err);
      setStartupState('FAILED');
      setInitErrorMessage(msg);

      try {
        const snapshot = await SaveManager.getAvailableRecoverySnapshot(worldId);
        if (snapshot) {
          setRecoverySnapshotLayer(snapshot.layer);
          setRecoverySnapshotData(snapshot.data);
        }
      } catch {}
    } finally {
      isInitializingRef.current = false;
    }
  }, [worldId, seed, gameMode, worldName, preset, isMultiplayer, sessionToken, playerName, setModal]);

  useEffect(() => {
    loadData();

    return () => {
      cancelTokenRef.current.isCancelled = true;
      delete (window as any).__voxelRuntime;
      if (typeof document !== 'undefined' && document.pointerLockElement) {
        try {
          document.exitPointerLock();
        } catch {}
      }
      NetworkSession.getInstance().dispose();
      if (runtimeRef.current) {
        runtimeRef.current.stop();
        runtimeRef.current = null;
      }
      isInitializingRef.current = false;
    };
  }, [loadData]);

  // Keep GameRuntime in sync with inventory & equipment updates from React Modals
  useEffect(() => {
    if (runtimeRef.current) {
      runtimeRef.current.inventory = inventoryState;
    }
  }, [inventoryState]);

  useEffect(() => {
    if (runtimeRef.current) {
      runtimeRef.current.equipment = equipmentState;
    }
  }, [equipmentState]);

  // Handle responsive window and visual viewport resizing
  useEffect(() => {
    if (runtimeRef.current && viewportWidth > 0 && viewportHeight > 0) {
      runtimeRef.current.resize(viewportWidth, viewportHeight);
    }
  }, [viewportWidth, viewportHeight]);

  const handleResume = () => {
    setModal('none');
    containerRef.current?.requestPointerLock();
  };

  const handleSaveAndQuit = async () => {
    if (isSaving) return;
    if (!runtimeRef.current) {
      onExitToMenu();
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const result = await runtimeRef.current.persistenceSystem.saveGameWithResult();
      if (!result.success) {
        setSaveError(result.error || 'Failed to persist world data to storage.');
        setIsSaving(false);
        return; // Session progress preserved in memory!
      }
      setIsSaving(false);
      onExitToMenu();
    } catch (err: any) {
      setSaveError(err?.message || 'Unexpected failure while persisting world.');
      setIsSaving(false);
    }
  };

  const handleRetryInit = () => {
    loadData();
  };

  const handleRecoverSnapshot = () => {
    if (recoverySnapshotData) {
      loadData(recoverySnapshotData);
    }
  };

  const handleCancelAndExit = () => {
    cancelTokenRef.current.isCancelled = true;
    onExitToMenu();
  };

  const handleRespawn = () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const safeSpawn = runtime.world.findSafeSpawn(seed);
    runtime.player.position.set(...safeSpawn);
    runtime.player.velocity.set(0, 0, 0);
    runtime.player.highestFallY = safeSpawn[1];

    runtime.stats.health = 100;
    runtime.stats.hunger = 100;
    runtime.stats.saturation = 20;
    runtime.stats.stamina = 100;
    runtime.stats.isDead = false;
    runtime.stats.activeEffects = [];
    runtime.isPaused = false;

    setModal('none');
    containerRef.current?.requestPointerLock();
  };

  return (
    <div id="game-canvas-wrapper" className="relative w-full h-full min-h-screen overflow-hidden select-none bg-black">
      {/* Loading overlay screen with state machine and recovery */}
      {!isWorldLoaded && (
        <LoadingScreen
          worldName={worldName}
          seed={seed}
          stageName={loadingStage}
          progressPercent={loadingProgress}
          errorMessage={initErrorMessage}
          recoverySnapshotLayer={recoverySnapshotLayer}
          onExit={handleCancelAndExit}
          onRetry={handleRetryInit}
          onRecoverSnapshot={handleRecoverSnapshot}
        />
      )}

      {/* Central 3D Voxel Container */}
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

      {/* Touch locked guidance overlay */}
      {activeModal === 'none' && !isPointerLocked && isWorldLoaded && (
        <div
          onClick={() => {
            containerRef.current?.requestPointerLock();
          }}
          className="absolute inset-0 z-40 bg-black/40 backdrop-blur-[2px] hidden md:flex flex-col items-center justify-center cursor-pointer select-none animate-fade-in"
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

      {/* Interactive HUD overlay */}
      {activeModal === 'none' && isWorldLoaded && (
        <HUD
          hotbar={inventoryState.slice(0, 9)}
          activeHotbarIndex={activeHotbarIndex}
          onSelectHotbar={(idx) => {
            if (runtimeRef.current) {
              runtimeRef.current.activeHotbarIndex = idx;
              setActiveHotbarIndex(idx);
            }
          }}
          targetHit={targetHitState}
          onOpenInventory={() => setModal('inventory')}
          onOpenCrafting={() => {
            setActiveCraftingPos(null);
            setModal('crafting');
          }}
          onToggleCamera={() => {
            if (runtimeRef.current) {
              runtimeRef.current.player.togglePerspective();
            }
          }}
          onOpenPause={() => setModal('pause')}
          onToggleDebugMap={() => setModal('map')}
          onOpenJournal={() => setModal('journal')}
          onOpenCharacter={() => setModal('character')}
          onOpenContentDebug={() => setModal('contentDebug')}
          activeBoss={activeBossState}
          objectiveText={activeObjective}
          onOpenMultiplayerLobby={() => setShowMultiplayerLobby(true)}
        />
      )}

      {/* Analytical Map & Exploration panels */}
      {showDebugMap && runtimeRef.current && (
        <DebugMap
          world={runtimeRef.current.world}
          playerPos={TelemetryStore.state.playerPos}
          onClose={() => setShowDebugMap(false)}
        />
      )}

      {activeModal === 'journal' && (
        <React.Suspense fallback={null}>
          <JournalModal
            isOpen={true}
            onClose={() => setModal('none')}
            playerPos={TelemetryStore.state.playerPos}
            playerXp={TelemetryStore.state.xp}
            playerLevel={TelemetryStore.state.level}
          />
        </React.Suspense>
      )}

      {activeModal === 'character' && (
        <React.Suspense fallback={null}>
          <CharacterProgressionModal
            isOpen={true}
            onClose={() => setModal('none')}
          />
        </React.Suspense>
      )}

      {activeModal === 'map' && runtimeRef.current && (
        <React.Suspense fallback={null}>
          <MapModal
            isOpen={true}
            onClose={() => setModal('none')}
            world={runtimeRef.current.world}
            playerPos={TelemetryStore.state.playerPos}
            playerYaw={TelemetryStore.state.playerYaw}
          />
        </React.Suspense>
      )}

      {activeModal === 'contentDebug' && runtimeRef.current && (
        <React.Suspense fallback={null}>
          <ContentDebugModal
            isOpen={true}
            onClose={() => setModal('none')}
            playerPos={TelemetryStore.state.playerPos}
            onTeleport={(tx, ty, tz) => {
              if (runtimeRef.current) {
                runtimeRef.current.player.position.set(tx, ty, tz);
                runtimeRef.current.player.velocity.set(0, 0, 0);
              }
            }}
            onChangeDimension={(dim) => {
              if (runtimeRef.current) {
                runtimeRef.current.changeDimension(dim);
              }
            }}
            onSpawnBoss={(type) => {
              if (runtimeRef.current) {
                runtimeRef.current.entities.spawnBoss(
                  type,
                  [runtimeRef.current.player.position.x + 8, runtimeRef.current.player.position.y, runtimeRef.current.player.position.z + 8],
                  runtimeRef.current.world
                );
              }
            }}
          />
        </React.Suspense>
      )}

      {/* Active Workstation Modals */}
      {activeModal === 'inventory' && (
        <React.Suspense fallback={null}>
          <InventoryModal
            inventory={inventoryState}
            setInventory={setInventoryState}
            equipment={equipmentState}
            setEquipment={setEquipmentState}
            onClose={() => setModal('none')}
          />
        </React.Suspense>
      )}

      {activeModal === 'crafting' && (
        <React.Suspense fallback={null}>
          <CraftingModal
            inventory={inventoryState}
            setInventory={setInventoryState}
            onClose={() => setModal('none')}
            station={activeCraftingPos ? 'crafting_bench' : 'hand'}
            stationPos={activeCraftingPos}
          />
        </React.Suspense>
      )}

      {activeModal === 'furnace' && activeFurnacePos && (
        <React.Suspense fallback={null}>
          <FurnaceModal
            furnacePos={activeFurnacePos}
            playerInventory={inventoryState}
            setPlayerInventory={setInventoryState}
            onClose={() => setModal('none')}
          />
        </React.Suspense>
      )}

      {activeModal === 'chest' && activeChestPos && (
        <React.Suspense fallback={null}>
          <ChestModal
            chestPos={activeChestPos}
            playerInventory={inventoryState}
            setPlayerInventory={setInventoryState}
            onClose={() => setModal('none')}
          />
        </React.Suspense>
      )}

      {activeModal === 'anvil' && activeAnvilPos && (
        <React.Suspense fallback={null}>
          <AnvilModal
            anvilPos={activeAnvilPos}
            playerInventory={inventoryState}
            setPlayerInventory={setInventoryState}
            onClose={() => setModal('none')}
          />
        </React.Suspense>
      )}

      {activeModal === 'engineering' && activeEngineeringPos && (
        <React.Suspense fallback={null}>
          <EngineeringModal
            pos={activeEngineeringPos}
            onClose={() => setModal('none')}
          />
        </React.Suspense>
      )}

      {activeModal === 'death' && runtimeRef.current && (
        <React.Suspense fallback={null}>
          <DeathModal
            score={runtimeRef.current.stats.xp}
            level={runtimeRef.current.stats.level}
            daysSurvived={Math.floor((runtimeRef.current.sky.timeOfDay || 8) / 24) + 1}
            onRespawn={handleRespawn}
            onExitToMenu={onExitToMenu}
          />
        </React.Suspense>
      )}

      {activeModal === 'dialogue' && activeDialogueEntity && (
        <React.Suspense fallback={null}>
          <DialogueModal
            entity={activeDialogueEntity}
            inventory={inventoryState}
            setInventory={setInventoryState}
            timeOfDay={runtimeRef.current?.sky?.timeOfDay ?? 12.0}
            onClose={() => setModal('none')}
          />
        </React.Suspense>
      )}

      {activeModal === 'pause' && (
        <React.Suspense fallback={null}>
          <PauseMenu
            onResume={handleResume}
            onSaveAndQuit={handleSaveAndQuit}
            isSaving={isSaving}
            saveError={saveError}
          />
        </React.Suspense>
      )}

      {/* Persistent Save Error Alert Overlay */}
      {saveError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans select-none">
          <div className="max-w-md w-full bg-[#0c0e14] border border-rose-500/40 rounded-3xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm uppercase tracking-wider">
              <span>⚠️ World Save Error</span>
            </div>
            <p className="text-xs text-white/80 leading-relaxed font-mono bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
              {saveError}
            </p>
            <p className="text-[11px] text-white/60">
              Your game session is still active and progress has NOT been discarded. You can retry saving now, or return to gameplay.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleSaveAndQuit}
                disabled={isSaving}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white rounded-xl font-bold text-xs cursor-pointer transition shadow"
              >
                Retry Save & Exit
              </button>
              <button
                onClick={() => setSaveError(null)}
                disabled={isSaving}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-xl font-bold text-xs cursor-pointer transition"
              >
                Back to Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multiplayer Live Connection Overlays */}
      {isMultiplayer && isWorldLoaded && netConnectionState === 'RECONNECTING' && (
        <div id="modal-multiplayer-reconnecting" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none animate-fade-in font-sans">
          <div className="w-full max-w-md bg-[#0d1117] border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-white space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-400/40 flex items-center justify-center text-amber-400 text-2xl font-bold animate-pulse">
              ⚡
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black uppercase tracking-wider text-amber-300">Menyambung Ulang ke Realm...</h3>
              <p className="text-xs text-white/70 font-mono">Koneksi terputus. Sedang mencoba memulihkan sesi secara otomatis.</p>
            </div>
            <div className="p-3 bg-black/40 border border-white/5 rounded-2xl space-y-2 text-xs font-mono">
              <div className="flex justify-between text-white/80">
                <span>Percobaan Reconnect:</span>
                <span className="text-amber-400 font-bold">{reconnectAttempt} / {maxReconnectAttempts}</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-amber-400 h-full transition-all duration-300"
                  style={{ width: `${Math.min(100, (reconnectAttempt / maxReconnectAttempts) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-white/50 text-left pt-1">
                Data blok, posisi, dan inventaris kamu tersimpan aman dan akan diverifikasi dengan server authoritative.
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => NetworkSession.getInstance().retryNow()}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs cursor-pointer transition shadow"
              >
                Coba Sekarang
              </button>
              <button
                onClick={() => {
                  NetworkSession.getInstance().cancelReconnect();
                  onExitToMenu();
                }}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs cursor-pointer transition"
              >
                Keluar ke Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {isMultiplayer && isWorldLoaded && netConnectionState === 'FAILED' && (
        <div id="modal-multiplayer-failed" className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 select-none animate-fade-in font-sans">
          <div className="w-full max-w-md bg-[#0d1117] border border-rose-500/40 rounded-3xl p-6 shadow-2xl text-white space-y-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-400/40 flex items-center justify-center text-rose-400 text-2xl font-bold">
              ✕
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black uppercase tracking-wider text-rose-400">Koneksi Multiplayer Terputus</h3>
              <p className="text-xs text-rose-200/80 font-mono">
                {netStateReason || 'Koneksi ke server realm hilang dan tidak dapat dipulihkan.'}
              </p>
            </div>
            <div className="p-3 bg-rose-950/20 border border-rose-500/20 rounded-2xl text-left text-xs text-white/70 font-mono space-y-1">
              <p>• Sesi multiplayer telah dihentikan secara aman.</p>
              <p>• Snapshot inventaris dan posisi terakhir telah tercatat.</p>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => NetworkSession.getInstance().retryNow()}
                className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-xl text-xs cursor-pointer transition shadow"
              >
                Coba Sambung Ulang
              </button>
              <button
                onClick={onExitToMenu}
                className="flex-1 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs cursor-pointer transition"
              >
                Kembali ke Menu Utama
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multiplayer Replication & Telemetry Modal */}
      {showMultiplayerLobby && (
        <React.Suspense fallback={null}>
          <MultiplayerLobbyModal
            isOpen={showMultiplayerLobby}
            onClose={() => setShowMultiplayerLobby(false)}
            session={NetworkSession.getInstance()}
            playerPos={[
              runtimeRef.current?.player?.position.x || 0,
              runtimeRef.current?.player?.position.y || 80,
              runtimeRef.current?.player?.position.z || 0,
            ]}
          />
        </React.Suspense>
      )}

      {/* Mobile Portrait Warning Overlay (Prompts user to rotate to landscape) */}
      {isMobile && isPortrait && (
        <RotateDeviceOverlay
          onRotateClick={requestLandscape}
          onFullscreenClick={toggleFullscreen}
        />
      )}

      {/* Mobile Input Controls Overlay */}
      <MobileControls
        isBlocked={activeModal !== 'none'}
        onTelemetryUpdate={setTouchTelemetry}
        onMove={(forward, strafe) => {
          if (runtimeRef.current) {
            runtimeRef.current.inputManager.setMobileJoystick(forward, strafe);
          }
        }}
        onLook={(dx, dy) => {
          if (runtimeRef.current) {
            runtimeRef.current.inputManager.setMobileLook(dx, dy);
          }
        }}
        onJump={(active) => {
          if (runtimeRef.current) {
            runtimeRef.current.inputManager.setMobileAction('Jump', active);
          }
        }}
        onSprint={(active) => {
          if (runtimeRef.current) {
            runtimeRef.current.inputManager.setMobileAction('Sprint', active);
          }
        }}
        onCrouch={(active) => {
          if (runtimeRef.current) {
            runtimeRef.current.inputManager.setMobileAction('Crouch', active);
          }
        }}
        onAttack={(active) => {
          if (runtimeRef.current) {
            runtimeRef.current.inputManager.setMobileAction('Attack', active);
          }
        }}
        onPlace={(active) => {
          if (runtimeRef.current) {
            runtimeRef.current.inputManager.setMobileAction('Use', active);
          }
        }}
        onOpenInventory={() => {
          if (runtimeRef.current) runtimeRef.current.inputManager.triggerMobileAction('Inventory');
        }}
        onOpenCrafting={() => {
          if (runtimeRef.current) runtimeRef.current.inputManager.triggerMobileAction('Crafting');
        }}
        onToggleCamera={() => {
          if (runtimeRef.current) runtimeRef.current.inputManager.triggerMobileAction('Perspective');
        }}
        onOpenPause={() => {
          setModal('pause');
        }}
        onOpenMap={() => {
          setModal('map');
        }}
        onOpenJournal={() => {
          setModal('journal');
        }}
        onToggleLockOn={() => {
          if (runtimeRef.current) {
            runtimeRef.current.toggleTargetLockOn();
          }
        }}
        isLockOnActive={runtimeRef.current?.player?.isLockOnActive ?? false}
        onTriggerSkill={() => {
          if (runtimeRef.current) {
            runtimeRef.current.triggerWeaponSkill();
          }
        }}
      />

      {/* Multitouch Telemetry Debug Overlay */}
      {showTouchDebug && (
        <TouchDebugOverlay 
          data={touchTelemetry} 
          onClose={() => {
            SettingsManager.update({ mobileControls: { ...SettingsManager.get().mobileControls, showTouchDebug: false } });
          }}
        />
      )}
    </div>
  );
};
