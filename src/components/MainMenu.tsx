// Overhauled Game Main Menu & World Browser (Asymmetrical Hero Layout & Production Polish)
import React, { useState, useEffect, useRef } from 'react';
import { GameMode, WorldSaveData } from '../types';
import { SaveManager, WorldSummary } from '../engine/storage/SaveManager';
import { WorldPreset } from '../engine/world/WorldConfig';
import { SettingsModal } from './SettingsModal';
import { ErrorBoundary } from './ErrorBoundary';
import { MenuVoxelDiorama } from './MenuVoxelDiorama';
import { Download, Upload, RefreshCw, Trash2, Edit3, Copy, Play, Compass, Globe, Settings as SettingsIcon, Scroll } from 'lucide-react';

interface MainMenuProps {
  onStartGame: (
    worldId: string,
    seed: number,
    gameMode: GameMode,
    worldName: string,
    preset?: WorldPreset,
    isMultiplayer?: boolean,
    sessionToken?: string,
    playerName?: string
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

  // Multiplayer Persistent Realms State
  const [mpRealms, setMpRealms] = useState<any[]>([]);
  const [mpPlayerName, setMpPlayerName] = useState<string>('');
  const [newMpRealmName, setNewMpRealmName] = useState<string>('Aether Realm');
  const [newMpRealmPreset, setNewMpRealmPreset] = useState<WorldPreset>('standard');
  const [newMpRealmSeed, setNewMpRealmSeed] = useState<string>('');
  const [isCreatingMpRealm, setIsCreatingMpRealm] = useState<boolean>(false);
  const [mpLoading, setMpLoading] = useState<boolean>(false);

  // Settings & Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // File Import Input Ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMpPlayerName('Explorer_' + Math.floor(Math.random() * 900 + 100));
  }, []);

  const fetchMpRealms = async () => {
    setMpLoading(true);
    try {
      const res = await fetch('/api/realms');
      if (res.ok) {
        const data = await res.json();
        setMpRealms(data);
      }
    } catch (e) {
      console.error('Failed to fetch multiplayer realms:', e);
    } finally {
      setMpLoading(false);
    }
  };

  useEffect(() => {
    if (viewState === 'multiplayer') {
      fetchMpRealms();
    }
  }, [viewState]);

  const handleCreateMpRealmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMpRealmName.trim()) return;
    try {
      const res = await fetch('/api/realms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          realmName: newMpRealmName,
          worldPreset: newMpRealmPreset,
          worldSeed: newMpRealmSeed.trim() ? parseInt(newMpRealmSeed, 10) : undefined,
        }),
      });
      if (res.ok) {
        setNewMpRealmName('Aether Realm');
        setNewMpRealmSeed('');
        setIsCreatingMpRealm(false);
        fetchMpRealms();
      }
    } catch (e) {
      console.error('Failed to create multiplayer realm:', e);
    }
  };

  const handleDeleteMpRealm = async (realmId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/realms/${realmId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMpRealms();
      }
    } catch (e) {
      console.error('Failed to delete realm:', e);
    }
  };

  const handleJoinMpRealm = async (realmId: string) => {
    try {
      const res = await fetch('/api/session/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          realmId,
          playerName: mpPlayerName.trim() || 'Realm Explorer',
        }),
      });
      if (res.ok) {
        const session = await res.json();
        onStartGame(
          session.realmId,
          session.worldSeed,
          'survival',
          session.realmName,
          session.worldPreset as WorldPreset,
          true,
          session.sessionToken,
          session.playerName
        );
      } else {
        alert('Could not join selected realm. Please try again.');
      }
    } catch (e) {
      console.error('Failed to join realm:', e);
    }
  };

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
    const duplicated = SaveManager.duplicateWorld(worldId);
    if (duplicated) {
      const updated = SaveManager.getWorlds();
      setWorlds(updated);
      setSelectedWorldId(duplicated.id);
    }
  };

  const handleExportWorld = (worldId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const jsonStr = SaveManager.exportWorldJSON(worldId);
    if (!jsonStr) return;

    const targetWorld = worlds.find((w) => w.id === worldId);
    const filename = `${(targetWorld?.name || 'voxelverse_realm').replace(/\s+/g, '_')}_backup.json`;
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const imported = SaveManager.importWorldJSON(content);
      if (imported) {
        const updated = SaveManager.getWorlds();
        setWorlds(updated);
        setSelectedWorldId(imported.id);
        setViewState('worlds');
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
      <div className="relative w-full h-screen bg-[#05070e] text-white overflow-hidden flex flex-col justify-between select-none font-sans">
        {/* Realtime Stylized Voxel Diorama Background */}
        <MenuVoxelDiorama />

        {/* Ambient Dark Gradient on Left for Pristine UI Contrast */}
        <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-r from-[#04060c]/95 via-[#060812]/85 lg:via-[#060812]/70 to-transparent w-full lg:w-[52%] h-full" />

        {/* Top Header Branding & Version Tag */}
        <div className="relative z-10 flex items-center justify-between px-6 lg:px-12 pt-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400 font-black text-lg shadow-lg shadow-sky-500/10 backdrop-blur-md">
              V
            </div>
            <div>
              <span className="font-black tracking-widest text-base text-transparent bg-clip-text bg-gradient-to-br from-white via-sky-50 to-sky-300 block leading-none">VOXELVERSE</span>
              <span className="text-[10px] text-sky-200/50 font-mono tracking-wider">STYLIZED SURVIVAL</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[9px] font-mono px-2 py-0.5 text-white/40 border border-white/10 rounded-full font-bold">
              v1.0 Edition
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

        {/* Main Content Area: Left Asymmetrical UI Panel with Right Hero Stage */}
        <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center px-6 lg:px-12 py-4 max-w-7xl w-full mx-auto">
          {/* Left Column: UI Panels (max-width 460-480px, constrained safe-zone) */}
          <div className="w-full max-w-[460px] lg:max-w-[480px] space-y-4 my-auto">
            {/* Crash Recovery Prompt Banner */}
            {crashRecoveryData && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-3xl backdrop-blur-2xl shadow-xl text-center space-y-2 animate-fade-in">
                <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Unsaved Recovery Session Detected
                </div>
                <p className="text-[11px] text-white/70">
                  A previous session ('{crashRecoveryData.name}') was closed unexpectedly. Would you like to recover your progress?
                </p>
                <div className="flex gap-2 pt-1 justify-center">
                  <button
                    onClick={handleRecoverSession}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-bold text-xs cursor-pointer shadow-md transition-all active:scale-[0.98] hover:-translate-y-0.5"
                  >
                    Recover Progress
                  </button>
                  <button
                    onClick={handleDiscardRecovery}
                    className="px-4 py-2 bg-white/5 hover:bg-white/15 text-white/80 rounded-xl font-bold text-xs cursor-pointer transition-all active:scale-[0.98] hover:-translate-y-0.5"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            {/* Main Navigation Card */}
            {viewState === 'main' && (
              <div className="bg-[#070a12]/70 backdrop-blur-3xl rounded-3xl border border-white/5 p-7 shadow-2xl space-y-5 animate-fade-in relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-sky-500/5 to-transparent pointer-events-none" />
                
                <div className="space-y-1.5 text-left relative z-10">
                  <h2 className="text-3xl lg:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-sky-100 to-sky-400">
                    VOXELVERSE
                  </h2>
                  <p className="text-xs text-white/50 tracking-wide font-medium">Procedural 3D Voxel Survival • Living Atmosphere</p>
                </div>

                <div className="space-y-2.5 pt-1 relative z-10">
                  {/* Primary Continue / Play Button */}
                  <button
                    onClick={handleContinue}
                    className="group relative w-full py-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-xl shadow-sky-500/20 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2.5 active:scale-[0.98] hover:-translate-y-1 hover:shadow-sky-500/40 overflow-hidden"
                  >
                    <Play className="w-4 h-4 fill-white transition-transform group-hover:scale-110 group-hover:translate-x-0.5" />
                    <span>Continue Game</span>
                    {/* Subtle Sweep Effect */}
                    <div className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                  </button>

                  {/* Singleplayer Realms */}
                  <button
                    onClick={() => setViewState('worlds')}
                    className="group w-full py-3.5 bg-white/5 hover:bg-white/10 text-white/90 hover:text-white rounded-2xl font-bold text-sm border border-white/10 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] hover:-translate-y-0.5 shadow-lg shadow-black/20"
                  >
                    <Compass className="w-4 h-4 text-sky-400 transition-transform group-hover:rotate-45" />
                    <span>Singleplayer Realms</span>
                  </button>

                  {/* Multiplayer */}
                  <button
                    onClick={() => setViewState('multiplayer')}
                    className="group w-full py-3.5 bg-emerald-950/30 hover:bg-emerald-900/50 text-emerald-300 rounded-2xl font-bold text-sm border border-emerald-500/20 transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98] hover:-translate-y-0.5 shadow-lg shadow-black/20"
                  >
                    <Globe className="w-4 h-4 text-emerald-400 transition-transform group-hover:rotate-12" />
                    <span>Multiplayer</span>
                  </button>

                  {/* Settings & Credits */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      onClick={() => setShowSettingsModal(true)}
                      className="group py-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-2xl font-bold text-xs border border-white/5 transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] hover:-translate-y-0.5"
                    >
                      <SettingsIcon className="w-3.5 h-3.5 transition-transform group-hover:rotate-90" />
                      <span>Settings</span>
                    </button>
                    <button
                      onClick={() => setViewState('credits')}
                      className="group py-3 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white rounded-2xl font-bold text-xs border border-white/5 transition-all duration-300 cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98] hover:-translate-y-0.5"
                    >
                      <Scroll className="w-3.5 h-3.5 transition-transform group-hover:-translate-y-0.5" />
                      <span>Credits</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* World Browser View */}
            {viewState === 'worlds' && (
              <div className="bg-[#090c15]/90 backdrop-blur-2xl rounded-3xl border border-white/15 p-6 shadow-2xl space-y-5 animate-fade-in">
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
              <div className="bg-[#090c15]/90 backdrop-blur-2xl rounded-3xl border border-white/15 p-6 shadow-2xl space-y-5 animate-fade-in">
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

            {/* Multiplayer View */}
            {viewState === 'multiplayer' && (
              <div className="bg-[#090c15]/90 backdrop-blur-2xl rounded-3xl border border-emerald-500/20 p-6 shadow-2xl space-y-4 animate-fade-in text-left">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <h3 className="text-base font-black uppercase tracking-wider text-emerald-400">Multiplayer Realms</h3>
                  <button
                    onClick={() => setViewState('main')}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/15 text-xs font-mono rounded-xl cursor-pointer text-white"
                  >
                    ← Back
                  </button>
                </div>

                {/* Identity Panel */}
                <div className="bg-emerald-950/10 border border-emerald-500/15 p-3 rounded-2xl space-y-1.5">
                  <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest font-mono">Explorer Display Name (Account Session Identity)</label>
                  <input
                    type="text"
                    value={mpPlayerName}
                    onChange={(e) => setMpPlayerName(e.target.value)}
                    placeholder="Enter nickname..."
                    className="w-full bg-black/60 p-2.5 rounded-xl border border-white/10 text-xs text-white focus:outline-none focus:border-emerald-400 font-sans font-semibold"
                  />
                </div>

                {isCreatingMpRealm ? (
                  /* Create Mp Realm Form */
                  <form onSubmit={handleCreateMpRealmSubmit} className="space-y-3 p-3 bg-white/5 rounded-2xl border border-white/5 animate-fade-in text-xs">
                    <div className="font-bold text-white/90 text-xs pb-1 border-b border-white/5">Configure New Realm</div>
                    <div className="space-y-1">
                      <label className="text-white/60 font-bold">Realm Name</label>
                      <input
                        type="text"
                        value={newMpRealmName}
                        onChange={(e) => setNewMpRealmName(e.target.value)}
                        className="w-full bg-black/40 p-2.5 rounded-xl border border-white/10 text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-white/60 font-bold">Preset</label>
                        <select
                          value={newMpRealmPreset}
                          onChange={(e) => setNewMpRealmPreset(e.target.value as WorldPreset)}
                          className="w-full bg-black/40 p-2 rounded-xl border border-white/10 text-white"
                        >
                          <option value="standard">Standard</option>
                          <option value="mountainous">Mountainous</option>
                          <option value="continental">Continental</option>
                          <option value="archipelago">Archipelago</option>
                          <option value="flattish">Flatland</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-white/60 font-bold">Seed (Optional)</label>
                        <input
                          type="text"
                          placeholder="Random"
                          value={newMpRealmSeed}
                          onChange={(e) => setNewMpRealmSeed(e.target.value)}
                          className="w-full bg-black/40 p-2 rounded-xl border border-white/10 text-white font-mono"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsCreatingMpRealm(false)}
                        className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl font-bold cursor-pointer text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl cursor-pointer"
                      >
                        Create Realm
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Realms List */
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] uppercase font-bold text-white/50 tracking-wider">Online Realms List</span>
                      <button
                        onClick={() => setIsCreatingMpRealm(true)}
                        className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-[10px] font-bold border border-emerald-500/20 cursor-pointer"
                      >
                        + Create Realm
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {mpLoading ? (
                        <div className="p-6 text-center text-xs text-white/30 italic">Querying realms...</div>
                      ) : mpRealms.length === 0 ? (
                        <div className="p-6 text-center bg-white/5 rounded-2xl border border-white/5 text-xs text-white/30 italic">
                          No multiplayer realms currently active.
                        </div>
                      ) : (
                        mpRealms.map((r) => (
                          <div
                            key={r.realmId}
                            onClick={() => handleJoinMpRealm(r.realmId)}
                            className="p-3 bg-white/5 border border-white/10 hover:border-emerald-500/40 rounded-xl hover:bg-emerald-950/10 cursor-pointer transition-all flex items-center justify-between"
                          >
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                <span>{r.realmName}</span>
                              </div>
                              <div className="text-[9px] text-white/40 font-mono mt-0.5 capitalize">
                                Seed: {r.worldSeed} • Preset: {r.worldPreset}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => handleJoinMpRealm(r.realmId)}
                                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg text-[10px] cursor-pointer"
                              >
                                Join
                              </button>
                              <button
                                onClick={(e) => handleDeleteMpRealm(r.realmId, e)}
                                className="w-6 h-6 bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 rounded-lg flex items-center justify-center text-[10px] cursor-pointer"
                                title="Delete Realm"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-between border-t border-white/5">
                  <span className="text-[9px] text-emerald-400/50 font-mono">Real-time Authoritative Replication Grid</span>
                  <button
                    onClick={() => setViewState('main')}
                    className="text-[10px] font-bold text-white/60 hover:text-white cursor-pointer"
                  >
                    Main Menu
                  </button>
                </div>
              </div>
            )}

            {/* Credits View */}
            {viewState === 'credits' && (
              <div className="bg-[#090c15]/90 backdrop-blur-2xl rounded-3xl border border-white/15 p-6 shadow-2xl space-y-4 animate-fade-in text-center">
                <h3 className="text-xl font-black uppercase tracking-wider text-sky-400">VoxelVerse Credits</h3>
                <div className="space-y-2 text-xs text-white/70">
                  <p>VoxelVerse Procedural 3D Sandbox Engine</p>
                  <p className="text-white/50">Engineered for browser performance and immersive survival crafting.</p>
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

          {/* Right Column: Hero Visual Open Stage (Allowing Diorama to be the Centerpiece) */}
          <div className="hidden lg:flex flex-1 pointer-events-none items-center justify-center" />
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
        <div className="relative z-10 flex items-center justify-between px-6 lg:px-12 pb-5 text-[10px] text-white/30 font-mono tracking-widest uppercase">
          <div>VoxelVerse • Procedural Voxel Sandbox</div>
          <div>Craft • Build • Explore</div>
        </div>
      </div>
    </ErrorBoundary>
  );
};
