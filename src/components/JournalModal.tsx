// World Journal Modal: Quests, Bounties, Treasure Maps, Lore Codex, Artifact Synergies, Ley Stability & World Tiers UI
import React, { useState, useEffect } from 'react';
import { QuestManager } from '../engine/progression/QuestManager';
import { DiscoverySystem } from '../engine/progression/DiscoverySystem';
import { LORE_REGISTRY } from '../engine/progression/LoreRegistry';
import { ARTIFACT_REGISTRY } from '../engine/progression/ArtifactRegistry';
import { WORLD_TIERS } from '../engine/progression/WorldProgression';
import { BountyContractManager, BountyContract } from '../engine/exploration/BountyContractManager';
import { TreasureMapSystem, TreasureMap } from '../engine/exploration/TreasureMapSystem';
import { ArtifactSynergyManager, ARTIFACT_SYNERGIES } from '../engine/artifacts/ArtifactSynergyManager';
import { WorldStabilitySystem } from '../engine/exploration/WorldStabilitySystem';
import { QuestDef, QuestState, DiscoveryRecord, WorldTierId } from '../types';
import { 
  BookOpen, 
  Compass, 
  Award, 
  Sparkles, 
  MapPin, 
  CheckCircle2, 
  Clock, 
  X, 
  Shield, 
  AlertTriangle, 
  Flame, 
  Snowflake, 
  Skull,
  Scroll,
  Crosshair,
  Map,
  Activity,
  Zap,
  Menu,
  ChevronRight
} from 'lucide-react';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerPos: [number, number, number];
  playerXp: number;
  playerLevel: number;
}

type TabType = 'quests' | 'bounties' | 'treasure' | 'discoveries' | 'artifacts' | 'tiers' | 'stability' | 'lore';

export const JournalModal: React.FC<JournalModalProps> = ({
  isOpen,
  onClose,
  playerPos,
  playerXp,
  playerLevel,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('quests');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [quests, setQuests] = useState<{ def: QuestDef; progress: number[]; state: QuestState }[]>([]);
  const [bounties, setBounties] = useState<BountyContract[]>([]);
  const [treasureMaps, setTreasureMaps] = useState<TreasureMap[]>([]);
  const [equippedArtifacts, setEquippedArtifacts] = useState<(string | null)[]>([]);
  const [stabilityVal, setStabilityVal] = useState<number>(75);
  const [discoveries, setDiscoveries] = useState<DiscoveryRecord[]>([]);
  const [selectedLoreId, setSelectedLoreId] = useState<string>('chronicle_origin');

  useEffect(() => {
    if (!isOpen) return;

    setQuests(QuestManager.getActiveQuests());
    setBounties(BountyContractManager.getContracts());
    setTreasureMaps(TreasureMapSystem.getMaps());
    setEquippedArtifacts(ArtifactSynergyManager.getEquipped());
    setStabilityVal(WorldStabilitySystem.stability);
    setDiscoveries(DiscoverySystem.getDiscoveries());

    const unsubQuests = QuestManager.onQuestChange(() => {
      setQuests(QuestManager.getActiveQuests());
    });
    const unsubBounties = BountyContractManager.subscribe(() => {
      setBounties(BountyContractManager.getContracts());
    });
    const unsubMaps = TreasureMapSystem.subscribe(() => {
      setTreasureMaps(TreasureMapSystem.getMaps());
    });
    const unsubArtifacts = ArtifactSynergyManager.subscribe(() => {
      setEquippedArtifacts(ArtifactSynergyManager.getEquipped());
    });
    const unsubStability = WorldStabilitySystem.subscribe(() => {
      setStabilityVal(WorldStabilitySystem.stability);
    });

    return () => {
      unsubQuests();
      unsubBounties();
      unsubMaps();
      unsubArtifacts();
      unsubStability();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const activeSynergies = ArtifactSynergyManager.getActiveSynergies();
  const stabilityTier = WorldStabilitySystem.getStabilityTier();

  const NAV_CATEGORIES = [
    {
      title: 'ADVENTURES',
      items: [
        { id: 'quests', label: 'Quests', icon: Compass },
        { id: 'bounties', label: 'Bounties & Contracts', icon: Crosshair },
      ]
    },
    {
      title: 'EXPLORATION',
      items: [
        { id: 'treasure', label: 'Treasure Maps', icon: Map },
        { id: 'discoveries', label: 'Landmarks', icon: MapPin },
      ]
    },
    {
      title: 'CHARACTER',
      items: [
        { id: 'artifacts', label: 'Artifact Synergies', icon: Sparkles },
        { id: 'tiers', label: 'World Tier', icon: Shield },
      ]
    },
    {
      title: 'WORLD',
      items: [
        { id: 'stability', label: 'Ley Stability', icon: Activity },
        { id: 'lore', label: 'Lore Codex', icon: Scroll },
      ]
    }
  ];

  return (
    <div id="journal_modal_overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-8 select-none animate-in fade-in duration-200 ui-scaled">
      <div id="journal_modal_container" className="bg-[var(--vv-bg)] border border-[var(--vv-border)] rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden text-[var(--vv-text-main)] font-sans">
        
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between px-4 sm:px-6 py-4 border-b border-[var(--vv-border)] bg-[var(--vv-surface)]">
          <div className="flex items-center gap-3">
            <button 
              className="sm:hidden p-2 -ml-2 rounded hover:bg-[var(--vv-elevated)]"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <Menu className="w-5 h-5 text-[var(--vv-text-main)]" />
            </button>
            <div className="p-2 rounded-xl bg-[var(--vv-warning)]/10 border border-[var(--vv-warning)]/30 text-[var(--vv-warning)] hidden sm:block">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wide text-white flex items-center gap-2">
                World Journal & Codex
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--vv-elevated)] border border-[var(--vv-border-subtle)] text-xs">
              <span className="text-[var(--vv-text-muted)]">Level <strong className="text-[var(--vv-warning)]">{playerLevel}</strong></span>
              <span className="text-[var(--vv-text-muted)]">•</span>
              <span className="text-[var(--vv-text-muted)]">XP: <strong className="text-[var(--vv-primary)]">{playerXp}</strong></span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[var(--vv-elevated)] hover:bg-[var(--vv-border)] text-[var(--vv-text-muted)] hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
          {/* Mobile Overlay */}
          {isMobileMenuOpen && (
            <div 
              className="absolute inset-0 bg-black/50 z-10 sm:hidden" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          {/* Sidebar Navigation */}
          <div className={`${isMobileMenuOpen ? 'absolute inset-y-0 left-0 w-64 z-20 shadow-2xl border-r border-[var(--vv-border)]' : 'hidden'} sm:flex sm:relative sm:w-64 flex-col bg-[var(--vv-surface)] border-r border-[var(--vv-border-subtle)] overflow-y-auto`}>
            {NAV_CATEGORIES.map(category => (
              <div key={category.title} className="py-4 border-b border-[var(--vv-border-subtle)] last:border-0">
                <div className="px-6 text-[10px] font-bold text-[var(--vv-text-muted)] tracking-widest mb-2">
                  {category.title}
                </div>
                <div className="space-y-0.5 px-2">
                  {category.items.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id as TabType); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm font-semibold ${
                          isActive 
                            ? 'bg-[var(--vv-warning)]/10 text-[var(--vv-warning)] border border-[var(--vv-warning)]/20 shadow-inner' 
                            : 'text-[var(--vv-text-muted)] hover:bg-[var(--vv-elevated)] hover:text-[var(--vv-text-main)] border border-transparent'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--vv-warning)]' : 'opacity-70'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto bg-[var(--vv-bg)]">
            <div className="max-w-4xl mx-auto p-4 sm:p-8">
              
              {/* QUESTS TAB */}
              {activeTab === 'quests' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                  <h3 className="text-xl font-bold font-display text-white mb-6 border-b border-[var(--vv-border-subtle)] pb-2 flex items-center gap-2">
                    <Compass className="w-5 h-5 text-[var(--vv-warning)]" />
                    Active Quests
                  </h3>
                  {quests.length === 0 ? (
                    <div className="text-center py-16 text-[var(--vv-text-muted)] bg-[var(--vv-surface)] rounded-xl border border-[var(--vv-border-subtle)]">
                      <Compass className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="font-semibold text-white">No active quests.</p>
                      <p className="text-xs mt-1">Explore the world or talk to NPCs to find quests.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {quests.map(q => (
                        <div key={q.def.id} className="voxel-panel-subtle p-5">
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="text-lg font-bold text-[var(--vv-warning)]">{q.def.title}</h4>
                            <span className="text-xs px-2 py-1 bg-black/40 rounded text-[var(--vv-text-muted)] font-mono border border-[var(--vv-border-subtle)]">
                              {q.state.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-[var(--vv-text-muted)] mb-5 max-w-2xl leading-relaxed">{q.def.description}</p>
                          <div className="space-y-3 bg-black/20 p-4 rounded-lg border border-[var(--vv-border-subtle)]">
                            <div className="text-[10px] font-bold text-[var(--vv-text-muted)] uppercase tracking-wider mb-2">Objectives</div>
                            {q.def.objectives.map((obj, idx) => {
                              const count = q.progress[idx] || 0;
                              const isDone = count >= obj.requiredCount;
                              return (
                                <div key={idx} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-3">
                                    <CheckCircle2 className={`w-4 h-4 ${isDone ? 'text-[var(--vv-success)]' : 'text-[var(--vv-border)]'}`} />
                                    <span className={isDone ? 'text-[var(--vv-text-muted)] line-through' : 'text-white'}>
                                      {obj.description}
                                    </span>
                                  </div>
                                  <span className="font-mono text-xs text-[var(--vv-text-muted)]">
                                    {count} / {obj.requiredCount}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* BOUNTIES TAB */}
              {activeTab === 'bounties' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                  <h3 className="text-xl font-bold font-display text-white mb-6 border-b border-[var(--vv-border-subtle)] pb-2 flex items-center gap-2">
                    <Crosshair className="w-5 h-5 text-[var(--vv-danger)]" />
                    Bounties & Contracts
                  </h3>
                  {bounties.length === 0 ? (
                    <div className="text-center py-16 text-[var(--vv-text-muted)] bg-[var(--vv-surface)] rounded-xl border border-[var(--vv-border-subtle)]">
                      <Crosshair className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="font-semibold text-white">No active bounties.</p>
                      <p className="text-xs mt-1">Visit a settlement warden to accept contracts.</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {bounties.map(b => (
                        <div key={b.id} className="voxel-panel-subtle p-5 relative overflow-hidden group">
                          {b.status === 'completed' && <div className="absolute top-0 right-0 w-16 h-16 bg-[var(--vv-success)]/10 flex items-center justify-center rounded-bl-3xl border-b border-l border-[var(--vv-success)]/20"><CheckCircle2 className="w-6 h-6 text-[var(--vv-success)]" /></div>}
                          <div className={`text-[10px] font-bold tracking-widest uppercase mb-1 ${
                            b.dangerStars >= 4 ? 'text-[var(--vv-warning)]' : b.dangerStars === 3 ? 'text-purple-400' : 'text-[var(--vv-primary)]'
                          }`}>
                            {b.dangerStars} Star Contract
                          </div>
                          <h4 className="text-lg font-bold text-white mb-2">{b.title}</h4>
                          <p className="text-xs text-[var(--vv-text-muted)] mb-4 leading-relaxed">{b.description}</p>
                          <div className="flex justify-between items-end mt-auto pt-4 border-t border-[var(--vv-border-subtle)]">
                            <div className="text-xs flex items-center gap-2 bg-[var(--vv-surface)] px-2 py-1 rounded border border-[var(--vv-border-subtle)]">
                              <span className="text-[var(--vv-text-muted)]">Status:</span>
                              <span className={`font-bold uppercase tracking-wide ${b.status === 'completed' ? 'text-[var(--vv-success)]' : 'text-[var(--vv-warning)]'}`}>
                                {b.status}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-[9px] font-bold text-[var(--vv-text-muted)] uppercase tracking-wider mb-0.5">Target Area</div>
                              <div className="text-xs font-mono text-[var(--vv-aether)] font-bold">
                                {b.targetType}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* STABILITY TAB */}
              {activeTab === 'stability' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                  <h3 className="text-xl font-bold font-display text-white mb-6 border-b border-[var(--vv-border-subtle)] pb-2 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[var(--vv-aether)]" />
                    Ley Resonance
                  </h3>
                  <div className="voxel-panel-subtle p-8 max-w-2xl mx-auto text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end mb-6 gap-4">
                      <div>
                        <h4 className="text-3xl font-black font-display text-white">{stabilityTier.name}</h4>
                        <p className="text-sm text-[var(--vv-text-muted)] mt-2 max-w-md">{stabilityTier.desc}</p>
                      </div>
                      <div className="text-center sm:text-right">
                        <div className="text-5xl font-bold font-mono text-[var(--vv-aether)]">{Math.round(stabilityVal)}%</div>
                        <div className="text-[10px] text-[var(--vv-text-muted)] font-bold uppercase tracking-widest mt-1">Global Stability</div>
                      </div>
                    </div>
                    
                    <div className="h-3 bg-black/60 rounded-full border border-[var(--vv-border-subtle)] overflow-hidden relative">
                      <div 
                        className={`h-full transition-all duration-1000 ${
                          stabilityVal > 75 ? 'bg-[var(--vv-success)]' : stabilityVal > 40 ? 'bg-[var(--vv-warning)]' : 'bg-[var(--vv-danger)]'
                        }`}
                        style={{ width: `${stabilityVal}%` }}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-8">
                      <div className="bg-black/20 p-5 rounded-xl border border-[var(--vv-border-subtle)] flex flex-col items-center justify-center">
                        <div className="text-[10px] font-bold text-[var(--vv-text-muted)] uppercase tracking-wider mb-2">Hostility Modifier</div>
                        <div className="text-2xl font-mono text-[var(--vv-danger)] font-bold">
                          {stabilityTier.key === 'cataclysm' ? 'x2.2' : stabilityTier.key === 'turbulent' ? 'x1.5' : stabilityTier.key === 'harmonious' ? 'x0.75' : 'x1.0'}
                        </div>
                      </div>
                      <div className="bg-black/20 p-5 rounded-xl border border-[var(--vv-border-subtle)] flex flex-col items-center justify-center">
                        <div className="text-[10px] font-bold text-[var(--vv-text-muted)] uppercase tracking-wider mb-2">Loot Resonance</div>
                        <div className="text-2xl font-mono text-[var(--vv-success)] font-bold">
                          {stabilityTier.key === 'harmonious' ? '+15%' : '0%'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* LORE TAB */}
              {activeTab === 'lore' && (
                <div className="flex flex-col sm:flex-row h-full min-h-[500px] bg-[var(--vv-surface)] border border-[var(--vv-border-subtle)] rounded-xl overflow-hidden animate-in slide-in-from-bottom-2 fade-in duration-300">
                  <div className="w-full sm:w-1/3 border-b sm:border-b-0 sm:border-r border-[var(--vv-border-subtle)] overflow-y-auto max-h-[30vh] sm:max-h-full">
                    <div className="p-4 border-b border-[var(--vv-border-subtle)] bg-[var(--vv-elevated)] sticky top-0 z-10 shadow-sm">
                      <h4 className="font-bold text-xs text-[var(--vv-text-muted)] uppercase tracking-widest">Codex Entries</h4>
                    </div>
                    <div className="p-2 space-y-1">
                      {Object.values(LORE_REGISTRY).map(lore => (
                        <button
                          key={lore.id}
                          onClick={() => setSelectedLoreId(lore.id)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                            selectedLoreId === lore.id 
                              ? 'bg-[var(--vv-aether)]/10 text-[var(--vv-aether)]' 
                              : 'text-[var(--vv-text-muted)] hover:bg-[var(--vv-elevated)] hover:text-white'
                          }`}
                        >
                          {lore.title}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 p-6 sm:p-8 overflow-y-auto bg-[var(--vv-bg)]">
                    {selectedLoreId && LORE_REGISTRY[selectedLoreId] ? (
                      <div className="max-w-2xl animate-fade-in">
                        <div className="text-[10px] font-bold text-[var(--vv-primary)] tracking-widest uppercase mb-2">
                          {LORE_REGISTRY[selectedLoreId].category}
                        </div>
                        <h3 className="text-2xl font-display text-white mb-6 border-b border-[var(--vv-border-subtle)] pb-4">
                          {LORE_REGISTRY[selectedLoreId].title}
                        </h3>
                        <div className="prose prose-invert prose-zinc max-w-none font-serif">
                          {LORE_REGISTRY[selectedLoreId].content.split('\n\n').map((paragraph, i) => (
                            <p key={i} className={`text-[var(--vv-text-muted)] leading-relaxed mb-4 ${i === 0 ? 'text-lg text-zinc-300' : 'text-sm'}`}>
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-[var(--vv-text-muted)]">
                        Select an entry to read.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* DISCOVERIES TAB */}
              {activeTab === 'discoveries' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                  <h3 className="text-xl font-bold font-display text-white mb-6 border-b border-[var(--vv-border-subtle)] pb-2 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-emerald-400" />
                    Landmarks & Discoveries
                  </h3>
                  {discoveries.length === 0 ? (
                    <div className="text-center py-16 text-[var(--vv-text-muted)] bg-[var(--vv-surface)] rounded-xl border border-[var(--vv-border-subtle)]">
                      <MapPin className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="font-semibold text-white">No landmarks discovered yet.</p>
                      <p className="text-xs mt-1">Explore the world to find points of interest.</p>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {discoveries.map((d, idx) => (
                        <div key={idx} className="voxel-panel-subtle p-5 flex flex-col items-center text-center">
                          <div className="w-12 h-12 rounded-full bg-[var(--vv-primary)]/10 flex items-center justify-center border border-[var(--vv-primary)]/30 mb-4">
                            <MapPin className="w-6 h-6 text-[var(--vv-primary)]" />
                          </div>
                          <h4 className="font-bold text-white mb-1 capitalize text-lg">{d.id.replace(/_/g, ' ')}</h4>
                          <p className="text-[10px] text-[var(--vv-text-muted)] font-mono uppercase tracking-widest bg-black/40 px-2 py-1 rounded">Recorded</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TREASURE TAB */}
              {activeTab === 'treasure' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                  <h3 className="text-xl font-bold font-display text-white mb-6 border-b border-[var(--vv-border-subtle)] pb-2 flex items-center gap-2">
                    <Map className="w-5 h-5 text-[var(--vv-warning)]" />
                    Treasure Maps
                  </h3>
                  {treasureMaps.length === 0 ? (
                    <div className="text-center py-16 text-[var(--vv-text-muted)] bg-[var(--vv-surface)] rounded-xl border border-[var(--vv-border-subtle)]">
                      <Map className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="font-semibold text-white">No treasure maps found.</p>
                      <p className="text-xs mt-1">Defeat enemies or find them in chests.</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {treasureMaps.map((map) => (
                        <div key={map.id} className="voxel-panel-subtle p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="flex gap-4 items-center">
                            <div className="w-14 h-14 rounded-lg bg-[var(--vv-warning)]/10 flex items-center justify-center border border-[var(--vv-warning)]/30 shrink-0">
                              <Map className="w-6 h-6 text-[var(--vv-warning)]" />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-[var(--vv-warning)] tracking-widest uppercase mb-1">
                                {map.xpReward} XP Reward
                              </div>
                              <h4 className="font-bold text-white text-lg">Buried Treasure</h4>
                              <p className="text-sm text-[var(--vv-text-muted)] mt-1">
                                {map.isDeciphered ? 'Coordinates revealed. Travel to the marked location.' : 'Needs to be deciphered at a cartography table.'}
                              </p>
                            </div>
                          </div>
                          <div className="w-full sm:w-auto text-left sm:text-right bg-black/20 p-3 rounded-lg border border-[var(--vv-border-subtle)]">
                            {map.isDeciphered && map.targetPos ? (
                              <>
                                <div className="text-[10px] text-[var(--vv-text-muted)] uppercase tracking-widest font-bold mb-1">Coordinates</div>
                                <div className="font-mono text-[var(--vv-primary)] text-sm font-bold">
                                  {Math.round(map.targetPos[0])}, {Math.round(map.targetPos[2])}
                                </div>
                              </>
                            ) : (
                              <div className="text-sm text-[var(--vv-danger)] italic font-semibold">Encrypted</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ARTIFACTS TAB */}
              {activeTab === 'artifacts' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                  <h3 className="text-xl font-bold font-display text-white mb-6 border-b border-[var(--vv-border-subtle)] pb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    Artifacts & Synergies
                  </h3>
                  <div className="grid md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-bold text-xs text-[var(--vv-text-muted)] uppercase tracking-widest mb-4">Equipped Relics</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {equippedArtifacts.map((artId, idx) => {
                          const art = artId ? ARTIFACT_REGISTRY[artId] : null;
                          return (
                            <div key={`equipped-${idx}`} className={`p-5 rounded-xl border transition-colors ${art ? 'bg-[var(--vv-aether)]/10 border-[var(--vv-aether)]/30 shadow-[0_0_15px_rgba(139,92,246,0.1)]' : 'bg-[var(--vv-surface)] border-[var(--vv-border-subtle)] border-dashed'}`}>
                              {art ? (
                                <div className="flex flex-col items-center text-center">
                                  <div className="w-12 h-12 rounded-full bg-[var(--vv-aether)]/20 flex items-center justify-center mb-3 border border-[var(--vv-aether)]/30">
                                    <Sparkles className="w-6 h-6 text-[var(--vv-aether)]" />
                                  </div>
                                  <div className="font-bold text-sm text-white mb-2">{art.name}</div>
                                  <div className="flex flex-wrap justify-center gap-1">
                                    {art.tags.map(tag => (
                                      <span key={tag} className="text-[9px] font-mono bg-black/40 text-[var(--vv-text-muted)] px-1.5 py-0.5 rounded border border-[var(--vv-border-subtle)]">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs font-semibold text-[var(--vv-text-muted)] text-center h-full flex items-center justify-center min-h-[100px]">
                                  Empty Slot
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-[var(--vv-text-muted)] uppercase tracking-widest mb-4">Active Synergies</h4>
                      <div className="bg-[var(--vv-surface)] p-5 rounded-xl border border-[var(--vv-border-subtle)] min-h-[200px]">
                        {activeSynergies.length === 0 ? (
                          <div className="text-sm text-[var(--vv-text-muted)] h-full flex flex-col items-center justify-center text-center pt-8">
                            <Zap className="w-8 h-8 opacity-20 mb-3" />
                            <p>No synergies active.</p>
                            <p className="text-xs mt-1">Equip artifacts with matching tags.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {activeSynergies.map((syn, idx) => (
                              <div key={idx} className="p-4 rounded-lg bg-[var(--vv-success)]/10 border border-[var(--vv-success)]/30">
                                <h5 className="font-bold text-[var(--vv-success)] text-sm mb-1 flex items-center gap-2">
                                  <Zap className="w-4 h-4" />
                                  {syn.name}
                                </h5>
                                <p className="text-sm text-zinc-300 opacity-90">{syn.description}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* WORLD TIERS TAB */}
              {activeTab === 'tiers' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                  <h3 className="text-xl font-bold font-display text-white mb-4 border-b border-[var(--vv-border-subtle)] pb-2 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[var(--vv-warning)]" />
                    World Tiers
                  </h3>
                  <p className="text-sm text-[var(--vv-text-muted)] max-w-2xl mb-6">
                    As you progress and level up, the world enters new epochs. These tiers alter mechanics, enemy strength, and resource availability.
                  </p>
                  
                  <div className="space-y-4 max-w-3xl">
                    {Object.values(WORLD_TIERS).map(tier => {
                      const isActive = playerLevel >= tier.minDistance;
                      
                      return (
                        <div 
                          key={tier.id} 
                          className={`p-6 rounded-xl border relative overflow-hidden transition-all ${
                            isActive ? 'bg-[var(--vv-warning)]/10 border-[var(--vv-warning)]/40 shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 
                            'bg-[var(--vv-surface)] border-[var(--vv-border-subtle)]'
                          }`}
                        >
                          {isActive && (
                            <div className="absolute top-0 right-0 px-4 py-1.5 bg-[var(--vv-warning)] text-black text-[10px] font-black uppercase tracking-widest rounded-bl-xl shadow-lg">
                              Current Era
                            </div>
                          )}
                          <div className="flex justify-between items-start mb-3">
                            <h4 className={`text-xl font-bold font-display ${isActive ? 'text-[var(--vv-warning)]' : 'text-white'}`}>
                              {tier.name}
                            </h4>
                            <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${isActive ? 'bg-[var(--vv-warning)]/20 text-[var(--vv-warning)]' : 'bg-[var(--vv-elevated)] text-[var(--vv-text-muted)]'}`}>
                              &gt; {tier.minDistance} Chunks
                            </span>
                          </div>
                          <p className={`text-sm ${isActive ? 'text-amber-100/90' : 'text-[var(--vv-text-muted)]'}`}>
                            {tier.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
