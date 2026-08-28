// Overhauled Game Main Menu & World Browser (Phase 10 Production Release Candidate)
import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GameMode, WorldSaveData } from '../types';
import { SaveManager, WorldSummary } from '../engine/storage/SaveManager';
import { WorldPreset } from '../engine/world/WorldConfig';
import { SettingsModal } from './SettingsModal';
import { ErrorBoundary } from './ErrorBoundary';
import { Download, Upload, RefreshCw, Trash2, Edit3, Copy, Play } from 'lucide-react';

interface MainMenuProps {
  onStartGame: (
    worldId: string,
    seed: number,
    gameMode: GameMode,
    worldName: string,
    preset?: WorldPreset,
    isMultiplayer?: boolean
  ) => void;
}

type MenuViewState = 'main' | 'worlds' | 'create' | 'multiplayer' | 'credits';

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => {
  const [viewState, setViewState] = useState<MenuViewState>('main');
  const [worlds, setWorlds] = useState<WorldSummary[]>([]);
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);

  // Crash Recovery State
  const [crashRecoveryData, setCrashRecoveryData] = useState<WorldSaveData | null>(null);

  // Rename & Delete Modal States
  const [worldToRename, setWorldToRename] = useState<{ id: string; name: string } | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Create World Form States
  const [createTab, setCreateTab] = useState<'basic' | 'advanced'>('basic');
  const [newWorldName, setNewWorldName] = useState('Aetheria Realm');
  const [newWorldSeed, setNewWorldSeed] = useState<string>('');
  const [newGameMode, setNewGameMode] = useState<GameMode>('survival');
  const [newWorldPreset, setNewWorldPreset] = useState<WorldPreset>('standard');

  // Settings & Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // File Import Input Ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Background WebGL Canvas Ref
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const list = SaveManager.getWorlds();
    setWorlds(list);
    if (list.length > 0) {
      setSelectedWorldId(list[0].id);
    }

    // Check for Crash Recovery Data
    const recovery = SaveManager.getCrashRecoveryState();
    if (recovery) {
      setCrashRecoveryData(recovery);
    }
  }, []);

  // Background WebGL Scene Animation
  useEffect(() => {
    if (!bgCanvasRef.current) return;
    const canvas = bgCanvasRef.current;
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0c14, 0.03);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 5, 12);
    camera.lookAt(0, 0, 0);

    const ambLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const group = new THREE.Group();
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const matA = new THREE.MeshLambertMaterial({ color: 0x1e293b });
    const matB = new THREE.MeshLambertMaterial({ color: 0x38bdf8 });

    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(boxGeo, Math.random() > 0.3 ? matA : matB);
      mesh.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 20
      );
      mesh.rotation.set(Math.random(), Math.random(), 0);
      group.add(mesh);
    }
    scene.add(group);

    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      group.rotation.y += 0.003;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, []);

  const handleContinue = () => {
    if (worlds.length > 0) {
      const target = worlds[0];
      onStartGame(target.id, target.seed, target.gameMode, target.name);
    } else {
      setViewState('create');
    }
  };

  const handlePlaySelected = () => {
    if (!selectedWorldId) return;
    const target = worlds.find((w) => w.id === selectedWorldId);
    if (target) {
      onStartGame(target.id, target.seed, target.gameMode, target.name);
    }
  };

  const handleCreateWorldSubmit = () => {
    const seedNum = newWorldSeed.trim() ? parseInt(newWorldSeed, 10) || 42819 : Math.floor(Math.random() * 9999999);
    const worldId = `world_${Date.now()}`;
    const worldName = newWorldName.trim() || 'Aetheria Realm';

    onStartGame(worldId, seedNum, newGameMode, worldName, newWorldPreset);
  };

  const handleRenameConfirm = () => {
    if (!worldToRename) return;
    const success = SaveManager.renameWorld(worldToRename.id, renameInput);
    if (success) {
      setWorlds(SaveManager.getWorlds());
    }
    setWorldToRename(null);
  };

  const handleDeleteConfirm = () => {
    if (!deleteConfirmId) return;
    SaveManager.deleteWorld(deleteConfirmId);
    const updated = SaveManager.getWorlds();
    setWorlds(updated);
    if (selectedWorldId === deleteConfirmId) {
      setSelectedWorldId(updated.length > 0 ? updated[0].id : null);
    }
    setDeleteConfirmId(null);
  };

  const handleDuplicateWorld = (worldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const created = SaveManager.duplicateWorld(worldId);
    if (created) {
      const updated = SaveManager.getWorlds();
      setWorlds(updated);
      setSelectedWorldId(created.id);
    }
  };

  const handleExportWorld = (worldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const json = SaveManager.exportWorldJSON(worldId);
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voxelverse-realm-${worldId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const imported = SaveManager.importWorldJSON(content);
        if (imported) {
          const updated = SaveManager.getWorlds();
          setWorlds(updated);
          setSelectedWorldId(imported.id);
        } else {
          alert('Failed to import world file. Unsupported or corrupted save format.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleRecoverSession = () => {
    if (!crashRecoveryData) return;
    onStartGame(
      crashRecoveryData.id,
      crashRecoveryData.seed,
      crashRecoveryData.gameMode,
      `${crashRecoveryData.name} (Recovered)`
    );
    SaveManager.clearCrashRecoveryState();
    setCrashRecoveryData(null);
  };

  const handleDiscardRecovery = () => {
    SaveManager.clearCrashRecoveryState();
    setCrashRecoveryData(null);
  };

  return (
    <ErrorBoundary>
      <div className="relative w-full h-screen bg-[#07090e] text-white overflow-hidden flex flex-col justify-between p-6 select-none font-sans">
        {/* WebGL Animated Background Canvas */}
        <canvas ref={bgCanvasRef} className="absolute inset-0 z-0 pointer-events-none opacity-40" />

        {/* Top Branding & Version Tag */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 font-bold text-sm">
              V
            </div>
            <span className="font-black tracking-widest text-sm text-white/90">VOXELVERSE</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono px-2.5 py-1 bg-sky-500/10 text-sky-300 border border-sky-500/20 rounded-full font-bold">
              v0.9.0-RC1 Production Candidate
            </span>
          </div>
        </div>

        {/* Hidden File Input for Importing World */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".json"
          className="hidden"
          onChange={handleImportFileChange}
        />

        {/* Main Interface Cards Container */}
        <div className="relative z-10 max-w-lg mx-auto w-full space-y-4 my-auto">
          {/* Crash Recovery Prompt Banner */}
          {crashRecoveryData && (
            <div className="bg-amber-500/20 border border-amber-500/50 p-4 rounded-3xl backdrop-blur-md shadow-xl text-center space-y-2 animate-fade-in">
              <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Unsaved Recovery Session Detected
              </div>
              <p className="text-[11px] text-white/80">
                A previous session ('{crashRecoveryData.name}') was closed unexpectedly. Would you like to recover your progress?
              </p>
              <div className="flex gap-2 pt-1 justify-center">
                <button
                  onClick={handleRecoverSession}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold text-xs cursor-pointer shadow-md"
                >
                  Recover Progress
                </button>
                <button
                  onClick={handleDiscardRecovery}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* Main Navigation View */}
          {viewState === 'main' && (
            <div className="bg-[#0c0e14]/85 backdrop-blur-2xl rounded-3xl border border-white/15 p-8 shadow-2xl text-center space-y-6 animate-fade-in">
              <div className="space-y-1.5">
                <h2 className="text-3xl font-black tracking-tight text-white">VOXELVERSE</h2>
                <p className="text-xs text-white/50">Procedural 3D Voxel Sandbox • Survival • Crafting • Desktop Ready</p>
              </div>

              <div className="space-y-2.5 max-w-md mx-auto pt-2">
                <button
                  onClick={handleContinue}
                  className="w-full py-3.5 bg-sky-500 hover:bg-sky-400 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl shadow-sky-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  Continue Game
                </button>

                <button
                  onClick={() => setViewState('worlds')}
                  className="w-full py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-sm border border-white/10 transition-all cursor-pointer"
                >
                  Singleplayer Realms
                </button>

                <button
                  onClick={() => setViewState('multiplayer')}
                  className="w-full py-3.5 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 rounded-2xl font-bold text-sm border border-emerald-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🌐 Multiplayer Test Harness</span>
                </button>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    onClick={() => setShowSettingsModal(true)}
                    className="py-3 bg-white/5 hover:bg-white/15 text-white/80 hover:text-white rounded-2xl font-bold text-xs border border-white/5 transition-all cursor-pointer"
                  >
                    ⚙ Settings
                  </button>
                  <button
                    onClick={() => setViewState('credits')}
                    className="py-3 bg-white/5 hover:bg-white/15 text-white/80 hover:text-white rounded-2xl font-bold text-xs border border-white/5 transition-all cursor-pointer"
                  >
                    📜 Credits
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* World Browser View */}
          {viewState === 'worlds' && (
            <div className="bg-[#0c0e14]/90 backdrop-blur-2xl rounded-3xl border border-white/15 p-6 shadow-2xl space-y-5 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-black uppercase tracking-wider">World Browser</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                    title="Import World Save File"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Import Realm
                  </button>

                  <button
                    onClick={() => setViewState('main')}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/15 text-xs font-mono rounded-xl cursor-pointer"
                  >
                    ← Back
                  </button>
                </div>
              </div>

              {/* Worlds List */}
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {worlds.length === 0 ? (
                  <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/5 text-xs text-white/40 space-y-3">
                    <p>No saved realms discovered.</p>
                    <button
                      onClick={() => setViewState('create')}
                      className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-bold shadow-lg cursor-pointer"
                    >
                      + Create New Realm
                    </button>
                  </div>
                ) : (
                  worlds.map((w) => {
                    const isSelected = selectedWorldId === w.id;
                    return (
                      <div
                        key={w.id}
                        onClick={() => setSelectedWorldId(w.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-sky-500/20 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            <span>{w.name}</span>
                            <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-white/10 text-sky-300 font-mono">
                              {w.gameMode}
                            </span>
                          </div>
                          <div className="text-[10px] text-white/40 font-mono">
                            Seed: {w.seed} • Last Played {new Date(w.lastPlayed).toLocaleDateString()}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleExportWorld(w.id, e)}
                            title="Export Realm Save"
                            className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-mono cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setWorldToRename({ id: w.id, name: w.name });
                              setRenameInput(w.name);
                            }}
                            title="Rename Realm"
                            className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-mono cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDuplicateWorld(w.id, e)}
                            title="Duplicate Realm"
                            className="w-7 h-7 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-mono cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(w.id);
                            }}
                            title="Delete Realm"
                            className="w-7 h-7 rounded-xl bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 flex items-center justify-center text-xs font-mono cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bottom World Browser Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                <button
                  onClick={handlePlaySelected}
                  className="py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-2xl font-bold text-sm shadow-xl cursor-pointer"
                >
                  ▶ Play Realm
                </button>
                <button
                  onClick={() => setViewState('create')}
                  className="py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold text-sm border border-white/10 cursor-pointer"
                >
                  + Create New Realm
                </button>
              </div>
            </div>
          )}

          {/* Create World Flow View */}
          {viewState === 'create' && (
            <div className="bg-[#0c0e14]/90 backdrop-blur-2xl rounded-3xl border border-white/15 p-6 shadow-2xl space-y-5 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-base font-black uppercase tracking-wider">New Realm Configuration</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCreateTab('basic')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      createTab === 'basic' ? 'bg-sky-500 text-white' : 'bg-white/5 text-white/50'
                    }`}
                  >
                    Basic
                  </button>
                  <button
                    onClick={() => setCreateTab('advanced')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      createTab === 'advanced' ? 'bg-sky-500 text-white' : 'bg-white/5 text-white/50'
                    }`}
                  >
                    Advanced
                  </button>
                </div>
              </div>

              {createTab === 'basic' && (
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-white/70">World Name</label>
                    <input
                      type="text"
                      value={newWorldName}
                      onChange={(e) => setNewWorldName(e.target.value)}
                      className="w-full bg-black/60 p-3 rounded-xl border border-white/10 text-white focus:outline-none focus:border-sky-400 font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-white/70">Game Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['survival', 'creative', 'adventure', 'hardcore'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setNewGameMode(mode)}
                          className={`py-2.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                            newGameMode === mode
                              ? 'bg-sky-500 text-white shadow-md'
                              : 'bg-white/5 text-white/50 hover:bg-white/10'
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {createTab === 'advanced' && (
                <div className="space-y-3 text-xs">
                  <div className="space-y-1">
                    <label className="font-bold text-white/70">Generation Seed (Optional)</label>
                    <input
                      type="text"
                      placeholder="Randomized if empty"
                      value={newWorldSeed}
                      onChange={(e) => setNewWorldSeed(e.target.value)}
                      className="w-full bg-black/60 p-3 rounded-xl border border-white/10 text-white focus:outline-none focus:border-sky-400 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-white/70">World Preset</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['standard', 'continental', 'archipelago', 'mountainous', 'flattish'] as const).map((p) => (
                        <button
                          key={p}
                          onClick={() => setNewWorldPreset(p)}
                          className={`py-2 px-2 rounded-xl text-[10px] font-bold capitalize transition-all cursor-pointer ${
                            newWorldPreset === p
                              ? 'bg-indigo-500 text-white shadow-md'
                              : 'bg-white/5 text-white/50 hover:bg-white/10'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-white/10">
                <button
                  onClick={() => setViewState('worlds')}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateWorldSubmit}
                  className="flex-1 py-3 bg-sky-500 hover:bg-sky-400 text-white rounded-2xl font-bold text-xs shadow-lg cursor-pointer"
                >
                  Generate Realm
                </button>
              </div>
            </div>
          )}

          {/* Multiplayer Harness View */}
          {viewState === 'multiplayer' && (
            <div className="bg-[#0c0e14]/90 backdrop-blur-2xl rounded-3xl border border-emerald-500/30 p-6 shadow-2xl space-y-4 animate-fade-in text-center">
              <h3 className="text-xl font-black uppercase tracking-wider text-emerald-300">Multiplayer Test Harness</h3>
              <p className="text-xs text-white/60 leading-relaxed">
                VoxelVerse is built with a server-authoritative network foundation. You can launch a local loopback session with a simulated second player ('Aetheria_Explorer_02') to verify real-time movement interpolation, block modification replication, and network chat.
              </p>

              <div className="pt-2 flex gap-3">
                <button
                  onClick={() => setViewState('main')}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-2xl font-bold text-xs cursor-pointer"
                >
                  Back to Menu
                </button>
                <button
                  onClick={() => {
                    const seed = Math.floor(Math.random() * 9999999);
                    onStartGame(`world_mp_${Date.now()}`, seed, 'survival', 'Multiplayer Testing Realm', 'standard', true);
                  }}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold text-xs shadow-lg cursor-pointer"
                >
                  Launch Harness Realm
                </button>
              </div>
            </div>
          )}

          {/* Credits View */}
          {viewState === 'credits' && (
            <div className="bg-[#0c0e14]/90 backdrop-blur-2xl rounded-3xl border border-white/15 p-6 shadow-2xl space-y-4 animate-fade-in text-center">
              <h3 className="text-xl font-black uppercase tracking-wider text-sky-400">VoxelVerse Credits</h3>
              <div className="space-y-2 text-xs text-white/70">
                <p>Designed & Engineered with TypeScript, Three.js, and React.</p>
                <p className="font-mono text-white/40">Pure WebGL Procedural Voxel Engine</p>
              </div>
              <button
                onClick={() => setViewState('main')}
                className="px-6 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close Credits
              </button>
            </div>
          )}
        </div>

        {/* Rename Confirmation Modal */}
        {worldToRename && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-[#0c0e14] rounded-3xl border border-white/15 p-6 space-y-4 text-white">
              <h4 className="font-bold text-sm uppercase">Rename Realm</h4>
              <input
                type="text"
                value={renameInput}
                onChange={(e) => setRenameInput(e.target.value)}
                className="w-full bg-black/60 p-3 rounded-xl border border-white/10 text-xs focus:outline-none focus:border-sky-400"
              />
              <div className="flex gap-2">
                <button onClick={() => setWorldToRename(null)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleRenameConfirm} className="flex-1 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-bold cursor-pointer">
                  Save Name
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-[#0c0e14] rounded-3xl border border-rose-500/30 p-6 space-y-4 text-white">
              <h4 className="font-bold text-sm uppercase text-rose-400">Delete Realm Confirmation</h4>
              <p className="text-xs text-white/60">Are you sure you want to delete this world? This action is permanent and cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold cursor-pointer">
                  Cancel
                </button>
                <button onClick={handleDeleteConfirm} className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer">
                  Delete Realm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal Component */}
        <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />

        {/* Footer Info */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-white/40 font-mono">
          <div>VoxelVerse Engine • Production Candidate v0.9.0-RC1</div>
          <div>TypeScript & WebGL</div>
        </div>
      </div>
    </ErrorBoundary>
  );
};
