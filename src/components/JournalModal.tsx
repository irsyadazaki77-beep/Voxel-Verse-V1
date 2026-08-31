// World Journal Modal: Quests, Discoveries, Ancient Lore Codex, Relics & World Tiers UI
import React, { useState, useEffect } from 'react';
import { QuestManager } from '../engine/progression/QuestManager';
import { DiscoverySystem } from '../engine/progression/DiscoverySystem';
import { LORE_REGISTRY } from '../engine/progression/LoreRegistry';
import { ARTIFACT_REGISTRY } from '../engine/progression/ArtifactRegistry';
import { WORLD_TIERS } from '../engine/progression/WorldProgression';
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
  Scroll
} from 'lucide-react';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerPos: [number, number, number];
  playerXp: number;
  playerLevel: number;
}

type TabType = 'quests' | 'discoveries' | 'lore' | 'artifacts' | 'tiers';

export const JournalModal: React.FC<JournalModalProps> = ({
  isOpen,
  onClose,
  playerPos,
  playerXp,
  playerLevel,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('quests');
  const [quests, setQuests] = useState<{ def: QuestDef; progress: number[]; state: QuestState }[]>([]);
  const [discoveries, setDiscoveries] = useState<DiscoveryRecord[]>([]);
  const [selectedLoreId, setSelectedLoreId] = useState<string>('chronicle_origin');

  useEffect(() => {
    if (!isOpen) return;

    setQuests(QuestManager.getActiveQuests());
    setDiscoveries(DiscoverySystem.getDiscoveries());

    const unsubQuests = QuestManager.onQuestChange(() => {
      setQuests(QuestManager.getActiveQuests());
    });

    return () => {
      unsubQuests();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div id="journal_modal_overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none animate-in fade-in duration-200">
      <div id="journal_modal_container" className="bg-zinc-900/95 border border-amber-900/40 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden text-zinc-100 font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-wide text-zinc-100 flex items-center gap-2">
                World Journal & Exploration Codex
              </h2>
              <p className="text-xs text-zinc-400">Chronicle of realms, questlines, ancient relics & discovered landmarks</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700/60 text-xs">
              <span className="text-zinc-400">Level <strong className="text-amber-400">{playerLevel}</strong></span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">XP: <strong className="text-cyan-400">{playerXp}</strong></span>
            </div>
            <button
              id="btn_close_journal"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 px-6 gap-2 overflow-x-auto py-2">
          {[
            { id: 'quests', label: 'Quests & Bounties', icon: Award, count: quests.filter(q => q.state === 'active').length },
            { id: 'discoveries', label: 'Discoveries', icon: Compass, count: discoveries.length },
            { id: 'lore', label: 'Ancient Lore', icon: Scroll },
            { id: 'artifacts', label: 'Artifacts & Relics', icon: Sparkles },
            { id: 'tiers', label: 'World Tiers', icon: Shield },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab_${tab.id}`}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wider transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive ? 'bg-amber-400 text-zinc-950 font-bold' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 p-6 overflow-y-auto min-h-[420px]">
          {/* 1. QUESTS TAB */}
          {activeTab === 'quests' && (
            <div className="space-y-4">
              {quests.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-sm">
                  No active quests in journal. Speak to settlement elders or explore ancient ruins to discover bounties!
                </div>
              ) : (
                quests.map(({ def, progress, state }) => {
                  const isComplete = state === 'completed';
                  return (
                    <div
                      key={def.id}
                      id={`quest_card_${def.id}`}
                      className={`p-4 rounded-xl border transition-all ${
                        isComplete
                          ? 'bg-emerald-950/20 border-emerald-800/40'
                          : 'bg-zinc-800/40 border-zinc-700/60 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-zinc-100">{def.title}</h3>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase ${
                              isComplete ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                            }`}>
                              {isComplete ? 'Completed' : def.category}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-1">{def.description}</p>
                          <div className="text-[11px] text-zinc-500 mt-1">
                            Quest Giver: <span className="text-zinc-300">{def.giverName}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-xs font-semibold text-amber-400">+{def.rewards.xp} XP</div>
                          {isComplete && (
                            <div className="flex items-center gap-1 text-emerald-400 text-xs mt-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Done</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Objectives */}
                      <div className="mt-3 space-y-2 border-t border-zinc-800/80 pt-3">
                        {def.objectives.map((obj, idx) => {
                          const cur = progress[idx] || 0;
                          const req = obj.requiredCount;
                          const objDone = cur >= req;
                          return (
                            <div key={`journal-obj-${def.id}-${idx}`} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                                  objDone ? 'bg-emerald-500 border-emerald-400 text-zinc-950' : 'border-zinc-600 bg-zinc-800'
                                }`}>
                                  {objDone && <CheckCircle2 className="w-2.5 h-2.5" />}
                                </div>
                                <span className={objDone ? 'text-zinc-400 line-through' : 'text-zinc-300'}>
                                  {obj.description}
                                </span>
                              </div>
                              <span className="font-mono text-zinc-400 font-semibold">{cur}/{req}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* 2. DISCOVERIES TAB */}
          {activeTab === 'discoveries' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {discoveries.length === 0 ? (
                <div className="col-span-2 text-center py-12 text-zinc-500 text-sm">
                  No landmarks or biomes discovered yet. Travel beyond your spawn to map the world!
                </div>
              ) : (
                discoveries.map(rec => (
                  <div
                    key={rec.id}
                    id={`disc_${rec.id}`}
                    className="p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-700/60 flex items-start gap-3 hover:border-amber-500/40 transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 mt-0.5">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-zinc-200 truncate">{rec.name}</h4>
                        <span className="text-[10px] text-amber-400 font-semibold">+{rec.xpReward} XP</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{rec.description}</p>
                      {rec.worldPos && (
                        <div className="text-[10px] font-mono text-zinc-500 mt-1">
                          Pos: [{Math.round(rec.worldPos[0])}, {Math.round(rec.worldPos[1])}, {Math.round(rec.worldPos[2])}]
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 3. ANCIENT LORE TAB */}
          {activeTab === 'lore' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
              {/* Lore Selector Sidebar */}
              <div className="space-y-2 border-r border-zinc-800 pr-3">
                {Object.values(LORE_REGISTRY).map(entry => (
                  <button
                    key={entry.id}
                    onClick={() => setSelectedLoreId(entry.id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors ${
                      selectedLoreId === entry.id
                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    }`}
                  >
                    <div className="font-bold truncate">{entry.title}</div>
                    <div className="text-[10px] text-zinc-500">{entry.era}</div>
                  </button>
                ))}
              </div>

              {/* Lore Text View */}
              <div className="md:col-span-2 p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/80 flex flex-col justify-between">
                {(() => {
                  const entry = LORE_REGISTRY[selectedLoreId] || LORE_REGISTRY['chronicle_origin'];
                  return (
                    <div>
                      <div className="border-b border-zinc-800 pb-3 mb-4">
                        <span className="text-[10px] tracking-wider uppercase text-amber-400 font-semibold">{entry.era}</span>
                        <h3 className="text-lg font-bold text-zinc-100">{entry.title}</h3>
                        {entry.discoveryLocation && (
                          <div className="text-[11px] text-zinc-500 mt-1">Found in: {entry.discoveryLocation}</div>
                        )}
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed italic font-serif">
                        "{entry.content}"
                      </p>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 4. ARTIFACTS TAB */}
          {activeTab === 'artifacts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(ARTIFACT_REGISTRY).map(art => (
                <div
                  key={art.id}
                  id={`artifact_card_${art.id}`}
                  className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/60 space-y-2 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md font-bold text-xs"
                      style={{ backgroundColor: `${art.iconColor}22`, color: art.iconColor, border: `1px solid ${art.iconColor}66` }}
                    >
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-zinc-100">{art.name}</h4>
                      <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: art.iconColor }}>
                        {art.rarity}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-zinc-400">{art.description}</p>
                  
                  <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                    <div className="text-[10px] font-bold text-amber-400">Passive Relic Power:</div>
                    <div className="text-[11px] text-zinc-300">{art.passiveAbility}</div>
                  </div>

                  {art.unlockedRecipes && art.unlockedRecipes.length > 0 && (
                    <div className="text-[10px] text-zinc-500">
                      Unlocks blueprints: <span className="text-cyan-400 font-mono">{art.unlockedRecipes.join(', ')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 5. WORLD TIERS TAB */}
          {activeTab === 'tiers' && (
            <div className="space-y-3">
              {Object.values(WORLD_TIERS).map(tier => {
                const distFromSpawn = Math.round(Math.sqrt(playerPos[0] ** 2 + playerPos[2] ** 2));
                const isCurrentTier = distFromSpawn >= tier.minDistance && (
                  tier.id === 'tier5_void' || distFromSpawn < (tier.id === 'tier1_haven' ? 250 : tier.id === 'tier2_frontier' ? 550 : tier.id === 'tier3_ancient' ? 900 : 1400)
                );

                return (
                  <div
                    key={tier.id}
                    id={`tier_card_${tier.id}`}
                    className={`p-4 rounded-xl border transition-all ${
                      isCurrentTier
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                        : 'bg-zinc-800/30 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-zinc-100">{tier.name}</h4>
                          <span className="text-xs text-zinc-500">({tier.subtitle})</span>
                          {isCurrentTier && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-zinc-950">
                              Current Region
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-1">{tier.description}</p>
                      </div>

                      <div className="text-right whitespace-nowrap">
                        <div className="text-xs font-mono text-zinc-400">Dist: {tier.minDistance}+ blocks</div>
                        <div className="text-[11px] text-amber-400 font-semibold mt-0.5">Danger: ★ {tier.dangerLevel}/5</div>
                      </div>
                    </div>

                    {tier.hazard && tier.hazard !== 'none' && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-400 bg-rose-950/30 border border-rose-900/40 px-2.5 py-1 rounded-lg">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Environmental Hazard: {tier.hazard.toUpperCase()} (Requires proper insulation or relic)</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
