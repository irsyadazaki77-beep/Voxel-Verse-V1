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
import { CREATURE_REGISTRY } from '../engine/entities/CreatureRegistry';
import { AETHER_TRADITIONS, AetherTraditionId } from '../engine/engineering/AetherTraditions';
import { ResonanceNexusManager, NEXUS_PILLARS, NexusPillarId } from '../engine/engineering/ResonanceNexusManager';
import { REGIONAL_ENGINEERING_RECIPES, RegionalRecipe } from '../engine/engineering/RegionalEngineeringRegistry';
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
  ChevronRight,
  Cpu,
  Radio,
  Layers,
  Check,
  Lock,
  Boxes
} from 'lucide-react';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerPos: [number, number, number];
  playerXp: number;
  playerLevel: number;
}

type TabType = 'quests' | 'bounties' | 'treasure' | 'discoveries' | 'artifacts' | 'tiers' | 'stability' | 'traditions' | 'nexus' | 'lore' | 'bestiary';

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
  const [selectedTraditionId, setSelectedTraditionId] = useState<AetherTraditionId>('jawa_tirta');
  const [nexusPillars, setNexusPillars] = useState(ResonanceNexusManager.getPillarStates());
  const [nexusConvergence, setNexusConvergence] = useState(ResonanceNexusManager.isConvergenceAchieved());

  useEffect(() => {
    if (!isOpen) return;

    setQuests(QuestManager.getActiveQuests());
    setBounties(BountyContractManager.getContracts());
    setTreasureMaps(TreasureMapSystem.getMaps());
    setEquippedArtifacts(ArtifactSynergyManager.getEquipped());
    setStabilityVal(WorldStabilitySystem.stability);
    setDiscoveries(DiscoverySystem.getDiscoveries());
    setNexusPillars(ResonanceNexusManager.getPillarStates());
    setNexusConvergence(ResonanceNexusManager.isConvergenceAchieved());

    const unsubNexus = ResonanceNexusManager.subscribe(() => {
      setNexusPillars(ResonanceNexusManager.getPillarStates());
      setNexusConvergence(ResonanceNexusManager.isConvergenceAchieved());
    });

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
      unsubNexus();
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
      title: 'AETHER NUSANTARA',
      items: [
        { id: 'traditions', label: 'Aether Traditions', icon: Layers },
        { id: 'nexus', label: 'Resonance Nexus', icon: Radio },
      ]
    },
    {
      title: 'WORLD',
      items: [
        { id: 'stability', label: 'Ley Stability', icon: Activity },
        { id: 'bestiary', label: 'Fauna Bestiary', icon: Flame },
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

              {/* AETHER TRADITIONS TAB */}
              {activeTab === 'traditions' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                  <div className="border-b border-[var(--vv-border-subtle)] pb-3">
                    <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
                      <Layers className="w-5 h-5 text-cyan-400" />
                      Aether Traditions (Tradisi Rekayasa Budaya Nusantara)
                    </h3>
                    <p className="text-xs text-[var(--vv-text-muted)] mt-1">
                      Harmonisasi teknologi purba Aether dengan kearifan lokal 7 Region Budaya Nusantara. Bukan sekadar mesin sci-fi, melainkan tradisi yang mengalir ratusan generasi.
                    </p>
                  </div>

                  {/* Region Selection Pills */}
                  <div className="flex flex-wrap gap-2">
                    {Object.values(AETHER_TRADITIONS).map(trad => {
                      const isSelected = selectedTraditionId === trad.id;
                      return (
                        <button
                          key={trad.id}
                          onClick={() => setSelectedTraditionId(trad.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                              : 'bg-[var(--vv-surface)] text-[var(--vv-text-muted)] hover:text-white border border-[var(--vv-border-subtle)]'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: trad.materialAesthetics.energyColor }} />
                          {trad.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Tradition Detail Panel */}
                  {(() => {
                    const currentTrad = AETHER_TRADITIONS[selectedTraditionId];
                    if (!currentTrad) return null;

                    return (
                      <div className="space-y-6">
                        <div className="voxel-panel-subtle p-6 border-cyan-500/30">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold mb-1">
                                {currentTrad.title}
                              </div>
                              <h4 className="text-xl font-bold text-white font-display">{currentTrad.name}</h4>
                            </div>
                            <div className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: currentTrad.materialAesthetics.energyColor }} />
                              {currentTrad.materialAesthetics.lightCharacter}
                            </div>
                          </div>

                          {/* Lore & Philosophy */}
                          <p className="text-sm text-zinc-300 leading-relaxed mb-4">
                            {currentTrad.philosophy}
                          </p>

                          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/40 italic text-xs text-cyan-200/90 leading-relaxed mb-5">
                            &ldquo;{currentTrad.lorePassage}&rdquo;
                          </div>

                          {/* Aesthetic & Material Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5 text-xs">
                            <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                              <span className="text-[var(--vv-text-muted)] block mb-1 font-bold">Material Utama:</span>
                              <span className="text-white">{currentTrad.materialAesthetics.primaryMaterials.join(', ')}</span>
                            </div>
                            <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                              <span className="text-[var(--vv-text-muted)] block mb-1 font-bold">Aksen Logam:</span>
                              <span className="text-white">{currentTrad.materialAesthetics.metalAccents.join(', ')}</span>
                            </div>
                            <div className="p-3 rounded-lg bg-black/40 border border-white/5">
                              <span className="text-[var(--vv-text-muted)] block mb-1 font-bold">Motif Ukiran:</span>
                              <span className="text-white">{currentTrad.materialAesthetics.carvingStyle}</span>
                            </div>
                          </div>

                          {/* Infrastructure Archetypes */}
                          <div className="border-t border-white/10 pt-4">
                            <h5 className="text-xs font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-2">
                              <Cpu className="w-4 h-4" />
                              Arsitektur Infrastruktur Regional
                            </h5>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                                <strong className="text-amber-300 block mb-0.5">Energy Gatherer:</strong>
                                <span className="text-zinc-300">{currentTrad.infrastructureArchetypes.energyGatherer}</span>
                              </div>
                              <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                                <strong className="text-amber-300 block mb-0.5">Conduit Style:</strong>
                                <span className="text-zinc-300">{currentTrad.infrastructureArchetypes.conduitStyle}</span>
                              </div>
                              <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                                <strong className="text-amber-300 block mb-0.5">Terminal Node:</strong>
                                <span className="text-zinc-300">{currentTrad.infrastructureArchetypes.terminalNode}</span>
                              </div>
                              <div className="p-3 rounded-lg bg-black/30 border border-white/5">
                                <strong className="text-amber-300 block mb-0.5">Defense Node:</strong>
                                <span className="text-zinc-300">{currentTrad.infrastructureArchetypes.defenseNode}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Regional Schematics List */}
                        <div>
                          <h5 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Boxes className="w-4 h-4 text-cyan-400" />
                            Cetak Biru Rekayasa ({currentTrad.schematics.length} Schematics)
                          </h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentTrad.schematics.map(sch => {
                              const isUnlocked = ResonanceNexusManager.isSchematicUnlocked(sch.id) ||
                                                ResonanceNexusManager.isSchematicUnlocked(`schematic_${sch.id}`);
                              return (
                                <div
                                  key={sch.id}
                                  className={`p-4 rounded-xl border transition-all ${
                                    isUnlocked
                                      ? 'bg-cyan-950/20 border-cyan-500/30'
                                      : 'bg-[var(--vv-surface)] border-[var(--vv-border-subtle)] opacity-75'
                                  }`}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <h6 className="font-bold text-sm text-white flex items-center gap-2">
                                      {sch.name}
                                    </h6>
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                      isUnlocked ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-zinc-800 text-zinc-400'
                                    }`}>
                                      {isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-[var(--vv-text-muted)] mb-3">{sch.description}</p>
                                  
                                  <div className="text-[11px] p-2.5 rounded bg-black/40 border border-white/5 mb-3 text-cyan-300">
                                    <strong>Khasiat:</strong> {sch.functionalEffect}
                                  </div>

                                  <div className="text-[10px] text-[var(--vv-text-muted)] flex justify-between border-t border-white/5 pt-2">
                                    <span>Kategori: <strong className="text-white capitalize">{sch.functionalCategory}</strong></span>
                                    <span>Syarat: <strong className="text-amber-300">{sch.unlockRequirement}</strong></span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* NUSANTARA RESONANCE NEXUS TAB */}
              {activeTab === 'nexus' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                  <div className="border-b border-[var(--vv-border-subtle)] pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
                          <Radio className="w-5 h-5 text-amber-400" />
                          Nusantara Resonance Nexus (Late-Game Mega-Project)
                        </h3>
                        <p className="text-xs text-[var(--vv-text-muted)] mt-1">
                          Proyek akhir penyatuan 7 Pilar Resonansi Nusantara untuk mengunci kestabilan leylines global dan membuka Altar Mahakarya Konvergensi.
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${
                          nexusConvergence
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-400'
                            : 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                        }`}>
                          {nexusConvergence ? 'CONVERGENCE ACHIEVED' : `${nexusPillars.filter(p => p.activated).length} / 7 PILLARS ACTIVE`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Nexus Convergence Banner */}
                  <div className={`p-6 rounded-2xl border transition-all ${
                    nexusConvergence
                      ? 'bg-gradient-to-r from-amber-950/40 via-purple-950/40 to-cyan-950/40 border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
                      : 'bg-gradient-to-r from-cyan-950/30 to-purple-950/30 border-cyan-500/30'
                  }`}>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="p-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                        <Sparkles className="w-7 h-7 animate-spin" style={{ animationDuration: '8s' }} />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white font-display">
                          {nexusConvergence ? 'Mahakarya Konvergensi Nusantara Telah Terbuka!' : 'Ritual 7 Pilar Resonansi'}
                        </h4>
                        <p className="text-xs text-zinc-300">
                          {nexusConvergence
                            ? 'Seluruh 7 Pilar Tradisi telah selaras. Resonansi leylines global memberikan +100% stabilitas abadi dan membuka resep Altar Konvergensi.'
                            : 'Kunjungi 7 Landmark Monolit di setiap region, selesaikan reputasi nagari, tumpas anomali wilayah, dan persembahkan pusaka leluhur.'}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-black/60 rounded-full h-3.5 border border-white/10 p-0.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 via-amber-400 to-purple-500 h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                        style={{ width: `${(nexusPillars.filter(p => p.activated).length / 7) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* 7 Pillars Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {nexusPillars.map(pillar => {
                      const isReady = pillar.canActivate;
                      return (
                        <div
                          key={pillar.id}
                          className={`p-5 rounded-xl border relative transition-all ${
                            pillar.activated
                              ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                              : isReady
                              ? 'bg-amber-950/20 border-amber-500/40'
                              : 'bg-[var(--vv-surface)] border-[var(--vv-border-subtle)]'
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-wider">
                                {pillar.traditionId.replace('_', ' ').toUpperCase()}
                              </span>
                              <h5 className="font-bold text-base text-white">{pillar.name}</h5>
                            </div>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-1 ${
                              pillar.activated
                                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-600'
                                : isReady
                                ? 'bg-amber-900/60 text-amber-300 border border-amber-600'
                                : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                            }`}>
                              {pillar.activated ? <Check className="w-3 h-3" /> : isReady ? <Zap className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                              {pillar.activated ? 'ACTIVE' : isReady ? 'READY' : 'LOCKED'}
                            </span>
                          </div>

                          <p className="text-xs text-[var(--vv-text-muted)] mb-3">{pillar.description}</p>
                          <div className="text-[11px] text-zinc-400 mb-3 font-mono">
                            📍 Lokasi Monolit: <strong className="text-white">{pillar.landmarkLocation}</strong>
                          </div>

                          {/* Requirements Breakdown */}
                          <div className="space-y-1.5 p-3 rounded-lg bg-black/40 border border-white/5 text-xs mb-4">
                            <div className="flex justify-between text-[11px]">
                              <span className="text-[var(--vv-text-muted)]">Pusaka Diperlukan:</span>
                              <strong className="text-amber-300">{pillar.requiredArtifact.replace(/_/g, ' ').toUpperCase()}</strong>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-[var(--vv-text-muted)]">Reputasi Pemukiman:</span>
                              <strong className={pillar.reputationMet ? 'text-emerald-400' : 'text-zinc-500'}>
                                {pillar.reputationMet ? '✓ Memadai' : `Min. ${pillar.requiredReputation} Rep`}
                              </strong>
                            </div>
                            <div className="flex justify-between text-[11px]">
                              <span className="text-[var(--vv-text-muted)]">Anomali Terpecahkan:</span>
                              <strong className={pillar.anomalyResolved ? 'text-emerald-400' : 'text-zinc-500'}>
                                {pillar.anomalyResolved ? '✓ Purged' : 'Belum Ditumpas'}
                              </strong>
                            </div>
                          </div>

                          {/* Action Button */}
                          {!pillar.activated && (
                            <button
                              onClick={() => {
                                ResonanceNexusManager.activatePillar(pillar.id as NexusPillarId);
                              }}
                              disabled={!isReady}
                              className={`w-full py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                                isReady
                                  ? 'bg-amber-600 hover:bg-amber-500 text-black shadow-lg cursor-pointer'
                                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5'
                              }`}
                            >
                              <Zap className="w-3.5 h-3.5" />
                              {isReady ? 'Harmonisasikan Pilar Resonansi' : 'Syarat Belum Terpenuhi'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* BESTIARY TAB */}
              {activeTab === 'bestiary' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-2 fade-in duration-300">
                  <div className="border-b border-[var(--vv-border-subtle)] pb-3">
                    <h3 className="text-xl font-bold font-display text-white flex items-center gap-2">
                      <Flame className="w-5 h-5 text-[var(--vv-warning)]" />
                      Fauna & Mythic Creatures Bestiary
                    </h3>
                    <p className="text-xs text-[var(--vv-text-muted)] mt-1">
                      Species profiles, regional lore, biomes, diets, taming mechanics, and cleansing rituals in VoxelVerse Ecosystem 2.0 & Nusantara Mythic Expansion.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.values(CREATURE_REGISTRY).map(creature => (
                      <div 
                        key={creature.id} 
                        className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
                          creature.isMythic 
                            ? 'bg-[var(--vv-aether)]/10 border-[var(--vv-aether)]/40 shadow-[0_0_15px_rgba(139,92,246,0.1)]' 
                            : 'bg-[var(--vv-surface)] border-[var(--vv-border-subtle)]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-base font-bold text-white flex items-center gap-2">
                              {creature.name}
                              {creature.isBoss && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                                  Boss / Mythic Titan
                                </span>
                              )}
                            </h4>
                            <div className="flex items-center gap-1.5">
                              {creature.culturalRegion && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                                  {creature.culturalRegion}
                                </span>
                              )}
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--vv-aether)]/20 text-[var(--vv-aether)] border border-[var(--vv-aether)]/30">
                                {creature.rarity}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-[var(--vv-text-muted)] mb-3 leading-relaxed">
                            {creature.description}
                          </p>

                          {creature.lore && (
                            <div className="p-3 mb-3 rounded bg-amber-950/20 border border-amber-800/30 italic text-[11px] text-amber-200/90 leading-relaxed">
                              &ldquo;{creature.lore}&rdquo;
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 text-[11px] mb-3 bg-black/30 p-3 rounded-lg border border-white/5">
                            <div>
                              <span className="text-[var(--vv-text-muted)]">Role:</span> <strong className="text-white">{creature.role}</strong>
                            </div>
                            <div>
                              <span className="text-[var(--vv-text-muted)]">Activity:</span> <strong className="text-white">{creature.activity}</strong>
                            </div>
                            <div>
                              <span className="text-[var(--vv-text-muted)]">Diet:</span> <strong className="text-white">{creature.diet}</strong>
                            </div>
                            <div>
                              <span className="text-[var(--vv-text-muted)]">Tameable:</span> <strong className={creature.tameable ? 'text-[var(--vv-success)]' : 'text-zinc-500'}>{creature.tameable ? 'Yes' : 'No'}</strong>
                            </div>
                          </div>

                          {creature.cleansingItem && (
                            <div className="text-[11px] bg-cyan-950/30 text-cyan-300 p-2.5 rounded border border-cyan-800/40 mb-2">
                              <strong>Cleansing Rite:</strong> Offer <span className="underline font-semibold">{creature.cleansingItem.replace(/_/g, ' ')}</span> to grant harmonic peace & unlock <span className="text-amber-300 font-semibold">{creature.cleansingRewardArtifact?.replace(/_/g, ' ')}</span>.
                            </div>
                          )}

                          {creature.productOutput && (
                            <div className="text-[11px] bg-[var(--vv-success)]/10 text-[var(--vv-success)] p-2 rounded border border-[var(--vv-success)]/20 mb-2">
                              <strong>Yields:</strong> {creature.productOutput.itemId.replace(/_/g, ' ')} every {creature.productOutput.intervalSeconds}s
                            </div>
                          )}
                        </div>

                        <div className="text-[10px] font-mono text-[var(--vv-text-muted)] flex justify-between border-t border-[var(--vv-border-subtle)] pt-2 mt-2">
                          <span>Biomes: {creature.biomes.join(', ')}</span>
                          <span>HP: {creature.baseHealth}</span>
                        </div>
                      </div>
                    ))}
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
