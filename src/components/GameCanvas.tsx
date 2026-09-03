// Master 3D Voxel Game Canvas with Three.js & Modern Modular Systems Architecture (Phase 2 Refactor)
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameMode, ItemStack, PlayerEquipment, GameSettings, EntityState, BossCombatState } from '../types';
import { WorldPreset } from '../engine/world/WorldConfig';
import { GameRuntime } from '../engine/core/GameRuntime';
import { SaveManager } from '../engine/storage/SaveManager';
import { HUD } from './HUD';
import { LoadingScreen } from './LoadingScreen';
import { TelemetryStore } from '../engine/ui/TelemetryStore';
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
import { EngineeringModal } from './EngineeringModal';
import { NetworkSession } from '../engine/network/NetworkSession';
import { QuestManager } from '../engine/progression/QuestManager';
import { SettingsManager } from '../engine/ui/SettingsManager';

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

export type ModalType = 'none' | 'inventory' | 'crafting' | 'furnace' | 'chest' | 'anvil' | 'dialogue' | 'pause' | 'death' | 'journal' | 'map' | 'contentDebug' | 'engineering';

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

  // Loading state
  const [isWorldLoaded, setIsWorldLoaded] = useState(false);
  const [loadingStage, setLoadingStage] = useState("Initializing Engine...");
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Reactive UI state synchronized bidirectionally with GameRuntime
  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [inventoryState, setInventoryState] = useState<(ItemStack | null)[]>([]);
  const [equipmentState, setEquipmentState] = useState<PlayerEquipment>({ head: null, chest: null, legs: null, feet: null, accessory: null });
  const [activeHotbarIndex, setActiveHotbarIndex] = useState(0);
  const [activeBossState, setActiveBossState] = useState<BossCombatState | null>(null);
  const [targetHitState, setTargetHitState] = useState<any | null>(null);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [showDebugMap, setShowDebugMap] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Active interaction positions
  const [activeChestPos, setActiveChestPos] = useState<[number, number, number] | null>(null);
  const [activeFurnacePos, setActiveFurnacePos] = useState<[number, number, number] | null>(null);
  const [activeAnvilPos, setActiveAnvilPos] = useState<[number, number, number] | null>(null);
  const [activeEngineeringPos, setActiveEngineeringPos] = useState<[number, number, number] | null>(null);
  const [activeDialogueEntity, setActiveDialogueEntity] = useState<EntityState | null>(null);
  const [activeObjective, setActiveObjective] = useState<string>('');

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

  // Async load save data
  useEffect(() => {
    const loadData = async () => {
      setLoadingStage("Loading Save Data...");
      setLoadingProgress(30);
      const existingSave = await SaveManager.loadWorldAsync(worldId);
      
      setLoadingProgress(70);
      setLoadingStage("Generating Spawns & Biomes...");

      // Short delay for visual progress feedback
      setTimeout(async () => {
        // Initialize GameRuntime inside container
        if (containerRef.current) {
          const runtime = new GameRuntime(
            containerRef.current,
            worldId,
            worldName,
            seed,
            gameMode,
            SettingsManager.get(),
            preset,
            existingSave
          );

          // Register bidirectional sync callbacks
          runtime.registerCallbacks({
            onBossUpdated: (boss) => setActiveBossState(boss),
            onTargetHitChanged: (hit) => setTargetHitState(hit),
            onInventoryUpdated: (inv) => setInventoryState(inv),
            onEquipmentUpdated: (eq) => setEquipmentState(eq),
            onActiveHotbarIndexChanged: (idx) => setActiveHotbarIndex(idx),
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
            setLoadingProgress(85);

            // Construct secure ws protocol pointing directly to the authoritative Express gateway
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const serverUrl = `${protocol}//${window.location.host}/ws`;
            console.log('[GameCanvas] Connecting to authoritative server:', serverUrl);

            if (sessionToken) {
              NetworkSession.getInstance().sessionToken = sessionToken;
            }

            const nameToUse = playerName || 'Explorer_' + Math.random().toString(36).substring(2, 6);

            const sessionStarted = await NetworkSession.getInstance().startSession(
              runtime.scene,
              true,
              nameToUse,
              true,
              serverUrl
            );

            if (!sessionStarted) {
              setConnectionError("Failed to connect to the authoritative realm server. Please try again later.");
              runtime.stop();
              return;
            }
          }

          runtime.start();

          setIsWorldLoaded(true);
          setLoadingProgress(100);
        }
      }, 500);
    };

    loadData();

    return () => {
      delete (window as any).__voxelRuntime;
      if (runtimeRef.current) {
        runtimeRef.current.stop();
        runtimeRef.current = null;
      }
    };
  }, [worldId, seed, gameMode, worldName, preset, isMultiplayer, setModal]);

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

  // Handle window resizing
  useEffect(() => {
    const handleResize = () => {
      if (runtimeRef.current) {
        runtimeRef.current.resize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleResume = () => {
    setModal('none');
    containerRef.current?.requestPointerLock();
  };

  const handleSaveAndQuit = () => {
    if (runtimeRef.current) {
      runtimeRef.current.persistenceSystem.saveGame();
    }
    onExitToMenu();
  };

  const handleRespawn = () => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    const safeSpawn = runtime.world.findSafeSpawn(seed);
    runtime.player.position.set(...safeSpawn);
    runtime.player.velocity.set(0, 0, 0);

    runtime.stats.health = 100;
    runtime.stats.hunger = 100;
    runtime.stats.saturation = 20;
    runtime.stats.stamina = 100;
    runtime.stats.isDead = false;
    runtime.stats.activeEffects = [];

    setModal('none');
    containerRef.current?.requestPointerLock();
  };

  return (
    <div id="game-canvas-wrapper" className="relative w-full h-full min-h-screen overflow-hidden select-none bg-black">
      {/* Authoritative Connection Failure Overlay */}
      {connectionError && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-6">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-red-400 uppercase tracking-widest mb-2">Connection Failed</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">{connectionError}</p>
            <button
              onClick={onExitToMenu}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition shadow-lg shadow-red-500/10 active:scale-[0.98]"
            >
              Back to Main Menu
            </button>
          </div>
        </div>
      )}

      {/* Loading overlay screen */}
      {!isWorldLoaded && (
        <LoadingScreen
          worldName={worldName}
          seed={seed}
          stageName={loadingStage}
          progressPercent={loadingProgress}
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
          onOpenCrafting={() => setModal('crafting')}
          onToggleCamera={() => {
            if (runtimeRef.current) {
              runtimeRef.current.player.togglePerspective();
            }
          }}
          onOpenPause={() => setModal('pause')}
          onToggleDebugMap={() => setModal('map')}
          onOpenJournal={() => setModal('journal')}
          onOpenContentDebug={() => setModal('contentDebug')}
          activeBoss={activeBossState}
          objectiveText={activeObjective}
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
        <JournalModal
          isOpen={true}
          onClose={() => setModal('none')}
          playerPos={TelemetryStore.state.playerPos}
          playerXp={TelemetryStore.state.xp}
          playerLevel={TelemetryStore.state.level}
        />
      )}

      {activeModal === 'map' && runtimeRef.current && (
        <MapModal
          isOpen={true}
          onClose={() => setModal('none')}
          world={runtimeRef.current.world}
          playerPos={TelemetryStore.state.playerPos}
          playerYaw={TelemetryStore.state.playerYaw}
        />
      )}

      {activeModal === 'contentDebug' && runtimeRef.current && (
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
      )}

      {/* Active Workstation Modals */}
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

      {activeModal === 'engineering' && activeEngineeringPos && (
        <EngineeringModal
          pos={activeEngineeringPos}
          onClose={() => setModal('none')}
        />
      )}

      {activeModal === 'death' && runtimeRef.current && (
        <DeathModal
          score={runtimeRef.current.stats.xp}
          level={runtimeRef.current.stats.level}
          daysSurvived={Math.floor((runtimeRef.current.sky.timeOfDay || 8) / 24) + 1}
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

      {/* Mobile Input Controls Overlay */}
      <MobileControls
        onMove={(forward, strafe) => {
          if (runtimeRef.current) {
            runtimeRef.current.player.keys.forward = forward > 0.3;
            runtimeRef.current.player.keys.backward = forward < -0.3;
            runtimeRef.current.player.keys.left = strafe < -0.3;
            runtimeRef.current.player.keys.right = strafe > 0.3;
          }
        }}
        onJump={() => {
          if (runtimeRef.current) {
            runtimeRef.current.player.keys.jump = true;
            setTimeout(() => {
              if (runtimeRef.current) runtimeRef.current.player.keys.jump = false;
            }, 150);
          }
        }}
        onSprint={() => {
          if (runtimeRef.current) {
            runtimeRef.current.player.keys.sprint = !runtimeRef.current.player.keys.sprint;
          }
        }}
        onAttack={() => {
          if (runtimeRef.current) {
            runtimeRef.current.player.triggerSwing();
          }
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
