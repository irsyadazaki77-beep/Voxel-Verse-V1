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
  Zap
} from 'lucide-react';

interface JournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerPos: [number, number, number];
  playerXp: number;
  playerLevel: number;
}

type TabType = 'quests' | 'bounties' | 'treasure' | 'artifacts' | 'stability' | 'discoveries' | 'lore' | 'tiers';

export const JournalModal: React.FC<JournalModalProps> = ({
  isOpen,
  onClose,
  playerPos,
  playerXp,
  playerLevel,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('quests');
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
              <p className="text-xs text-zinc-400">Chronicle of realms, contracts, relics, treasure maps & ley stability</p>
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
            { id: 'quests', label: 'Questlines', icon: Compass },
            { id: 'bounties', label: 'Bounties & Hunts', icon: Crosshair },
            { id: 'treasure', label: 'Treasure Maps', icon: Map },
            { id: 'artifacts', label: 'Artifact Synergies', icon: Sparkles },
            { id: 'stability', label: 'Ley Resonance', icon: Activity },
            { id: 'discoveries', label: 'Landmarks', icon: MapPin },
            { id: 'lore', label: 'Lore Codex', icon: Scroll },
            { id: 'tiers', label: 'World Tiers', icon: Shield },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab_${tab.id}`}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* 1. QUESTS TAB */}
          {activeTab === 'quests' && (
            <div className="space-y-3">
              {quests.map(({ def, progress, state }) => (
                <div
                  key={def.id}
                  id={`quest_card_${def.id}`}
                  className={`p-4 rounded-xl border transition-all ${
                    state === 'completed'
                      ? 'bg-emerald-950/20 border-emerald-800/40 opacity-75'
                      : 'bg-zinc-800/40 border-zinc-700/60 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-zinc-100">{def.title}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 uppercase tracking-wider">
                          {def.category}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{def.description}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {state === 'completed' ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-950/50 px-2.5 py-1 rounded-lg border border-emerald-800/60">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Complete
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-800/60">
                          <Clock className="w-3.5 h-3.5" /> In Progress
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Objectives */}
                  <div className="mt-3 space-y-1.5 pt-2 border-t border-zinc-800/60">
                    {def.objectives.map((obj, idx) => {
                      const cur = progress[idx] || 0;
                      const req = obj.requiredCount || 1;
                      const isObjDone = cur >= req;
                      return (
                        <div key={idx} className="flex items-center justify-between text-xs">
                          <span className={isObjDone ? 'text-zinc-500 line-through' : 'text-zinc-300'}>
                            {obj.description}
                          </span>
                          <span className="font-mono text-zinc-400">
                            {cur}/{req}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Rewards */}
                  <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400 bg-zinc-900/60 px-3 py-1.5 rounded-lg">
                    <span className="text-zinc-500">Rewards:</span>
                    <div className="flex items-center gap-3">
                      <span className="text-cyan-400 font-mono">+{def.rewards.xp} XP</span>
                      {def.rewards.items && def.rewards.items.map((it, i) => (
                        <span key={i} className="text-amber-400 font-mono">
                          {it.count}x {it.itemId}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 2. BOUNTIES & HUNTS TAB */}
          {activeTab === 'bounties' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-amber-950/20 border border-amber-900/30 text-xs text-amber-200">
                <span>Accept settlement hunting bounties to earn credits, rare materials, and faction standing.</span>
                <span className="font-mono font-bold text-amber-400">{bounties.filter(b => b.status === 'active').length} Active</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {bounties.map(b => (
                  <div
                    key={b.id}
                    id={`bounty_card_${b.id}`}
                    className={`p-4 rounded-xl border transition-all ${
                      b.status === 'claimed'
                        ? 'bg-zinc-900/40 border-zinc-800 opacity-60'
                        : b.status === 'completed'
                        ? 'bg-emerald-950/30 border-emerald-700/60'
                        : b.status === 'active'
                        ? 'bg-amber-950/20 border-amber-600/50'
                        : 'bg-zinc-800/40 border-zinc-700/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-zinc-100">{b.title}</h4>
                        <span className="text-[10px] text-zinc-400">{b.issuerSettlement} • {'★'.repeat(b.dangerStars)}</span>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        b.status === 'active' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        b.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        b.status === 'claimed' ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-800 text-zinc-300'
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 mt-2">{b.description}</p>

                    <div className="mt-3 flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-400">Target: {b.targetType}</span>
                      <span className="text-amber-400 font-bold">{b.currentCount} / {b.targetCount}</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
                      <div className="flex items-center gap-2 text-zinc-400">
                        <span className="text-cyan-400">+{b.rewards.xp} XP</span>
                        <span className="text-amber-400">+{b.rewards.credits} C</span>
                        {b.rewards.itemReward && (
                          <span className="text-emerald-400">{b.rewards.itemReward.count}x {b.rewards.itemReward.itemId}</span>
                        )}
                      </div>

                      {b.status === 'available' && (
                        <button
                          id={`btn_accept_bounty_${b.id}`}
                          onClick={() => BountyContractManager.acceptContract(b.id)}
                          className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors"
                        >
                          Accept
                        </button>
                      )}
                      {b.status === 'completed' && (
                        <button
                          id={`btn_claim_bounty_${b.id}`}
                          onClick={() => BountyContractManager.claimContractReward(b.id)}
                          className="px-3 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors"
                        >
                          Claim Reward
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. TREASURE MAPS TAB */}
          {activeTab === 'treasure' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-900/30 text-xs text-cyan-200">
                Cartographic charts pointing to buried relics and subterranean treasure caches across the world.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {treasureMaps.map(map => (
                  <div
                    key={map.id}
                    id={`treasure_card_${map.id}`}
                    className={`p-4 rounded-xl border ${
                      map.isFound
                        ? 'bg-zinc-900/40 border-zinc-800 opacity-60'
                        : map.isDeciphered
                        ? 'bg-cyan-950/20 border-cyan-700/50'
                        : 'bg-zinc-800/40 border-zinc-700/60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="font-bold text-sm text-zinc-100">{map.name}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        map.isFound ? 'bg-emerald-950 text-emerald-400' :
                        map.isDeciphered ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
                        'bg-zinc-800 text-zinc-400'
                      }`}>
                        {map.isFound ? 'Discovered' : map.isDeciphered ? 'Deciphered' : 'Encrypted'}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-zinc-400">
                      <strong>Region:</strong> {map.regionHint}
                    </div>

                    <div className="mt-1 p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs italic text-zinc-300">
                      "{map.landmarkClue}"
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs pt-2 border-t border-zinc-800">
                      <div className="text-zinc-400 font-mono">
                        Target: X:{map.targetPos[0]} Z:{map.targetPos[2]}
                      </div>
                      {!map.isDeciphered && !map.isFound && (
                        <button
                          id={`btn_decipher_${map.id}`}
                          onClick={() => TreasureMapSystem.decipherMap(map.id)}
                          className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                        >
                          Decipher Clues
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. ARTIFACT SYNERGIES TAB */}
          {activeTab === 'artifacts' && (
            <div className="space-y-4">
              {/* 3 Relic Loadout Slots */}
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-amber-500/30">
                <h3 className="font-bold text-sm text-amber-400 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Active 3-Relic Loadout & Resonance Matrix
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  Equipping matching relics unlocks powerful archetype synergies and combat passives.
                </p>

                <div className="grid grid-cols-3 gap-3 mt-3">
                  {[0, 1, 2].map(slotIdx => {
                    const artId = equippedArtifacts[slotIdx];
                    const artDef = artId ? ARTIFACT_REGISTRY[artId] : null;

                    return (
                      <div
                        key={slotIdx}
                        id={`artifact_slot_${slotIdx}`}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center min-h-[100px] ${
                          artDef ? 'bg-amber-950/20 border-amber-500/40' : 'bg-zinc-900 border-zinc-800 border-dashed'
                        }`}
                      >
                        {artDef ? (
                          <>
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center mb-1 shadow-md font-bold text-xs"
                              style={{ backgroundColor: `${artDef.iconColor}22`, color: artDef.iconColor, border: `1px solid ${artDef.iconColor}66` }}
                            >
                              <Sparkles className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-xs text-zinc-100">{artDef.name}</span>
                            <span className="text-[10px] text-amber-400 mt-0.5">{artDef.rarity}</span>
                            <button
                              onClick={() => ArtifactSynergyManager.equipArtifact(slotIdx, null)}
                              className="text-[10px] text-zinc-500 hover:text-rose-400 mt-1 underline"
                            >
                              Unequip
                            </button>
                          </>
                        ) : (
                          <>
                            <span className="text-zinc-600 text-xs font-semibold">Slot #{slotIdx + 1} Empty</span>
                            <span className="text-[10px] text-zinc-500 mt-1">Select relic below</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Active Synergy Badges */}
                {activeSynergies.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-zinc-800 space-y-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" /> Active Synergies Triggered ({activeSynergies.length})
                    </span>
                    {activeSynergies.map(syn => (
                      <div key={syn.id} className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-700/50 text-xs">
                        <div className="font-bold text-emerald-300">{syn.name}</div>
                        <div className="text-zinc-300 text-[11px] mt-0.5">{syn.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* All Discovered Relics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.values(ARTIFACT_REGISTRY).map(art => {
                  const isEquipped = equippedArtifacts.includes(art.id);
                  return (
                    <div
                      key={art.id}
                      id={`artifact_card_${art.id}`}
                      className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/60 space-y-2 hover:border-zinc-600 transition-colors"
                    >
                      <div className="flex items-center justify-between">
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

                        <button
                          onClick={() => {
                            if (isEquipped) {
                              const idx = equippedArtifacts.indexOf(art.id);
                              ArtifactSynergyManager.equipArtifact(idx, null);
                            } else {
                              const emptyIdx = equippedArtifacts.indexOf(null);
                              ArtifactSynergyManager.equipArtifact(emptyIdx !== -1 ? emptyIdx : 0, art.id);
                            }
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                            isEquipped
                              ? 'bg-rose-900/40 text-rose-300 border border-rose-800 hover:bg-rose-900/60'
                              : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold'
                          }`}
                        >
                          {isEquipped ? 'Unequip' : 'Equip Relic'}
                        </button>
                      </div>

                      <p className="text-[11px] text-zinc-400">{art.description}</p>
                      
                      <div className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                        <div className="text-[10px] font-bold text-amber-400">Passive Relic Power:</div>
                        <div className="text-[11px] text-zinc-300">{art.passiveAbility}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. WORLD STABILITY & LEY LINES TAB */}
          {activeTab === 'stability' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-zinc-100">Global Ley Line Equilibrium</h3>
                    <p className="text-xs text-zinc-400">Restoring monoliths and vanquishing void bosses stabilizes the realm.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold font-mono" style={{ color: stabilityTier.color }}>
                      {stabilityVal}%
                    </span>
                    <div className="text-[11px] font-bold" style={{ color: stabilityTier.color }}>
                      {stabilityTier.name}
                    </div>
                  </div>
                </div>

                {/* Stability Progress Bar */}
                <div className="w-full h-3 bg-zinc-800 rounded-full overflow-hidden mt-3 border border-zinc-700">
                  <div
                    className="h-full transition-all duration-500 rounded-full"
                    style={{ width: `${stabilityVal}%`, backgroundColor: stabilityTier.color }}
                  />
                </div>
                <div className="text-xs text-zinc-300 mt-2">{stabilityTier.desc}</div>
              </div>

              {/* Ley Monolith Spires */}
              <h4 className="font-bold text-xs uppercase text-zinc-400 tracking-wider">Ancient Ley Monoliths</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {WorldStabilitySystem.monoliths.map(mono => (
                  <div
                    key={mono.id}
                    className={`p-3.5 rounded-xl border ${
                      mono.activated ? 'bg-cyan-950/30 border-cyan-600/50' : 'bg-zinc-800/40 border-zinc-700/60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="font-bold text-xs text-zinc-100">{mono.name}</h5>
                        <div className="text-[11px] text-zinc-400">Biome: {mono.biomeId} (X: {mono.pos[0]}, Z: {mono.pos[2]})</div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        mono.activated ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-zinc-800 text-zinc-500'
                      }`}>
                        {mono.activated ? 'Harmonized' : 'Dormant'}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-emerald-400 font-semibold bg-zinc-950/50 p-2 rounded-lg border border-zinc-800">
                      {mono.blessing}
                    </div>

                    {!mono.activated && (
                      <button
                        onClick={() => WorldStabilitySystem.activateMonolith(mono.id)}
                        className="mt-2 w-full py-1 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors"
                      >
                        Attune & Harmonize Spire
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. DISCOVERIES TAB */}
          {activeTab === 'discoveries' && (
            <div className="space-y-3">
              {discoveries.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  No landmarks or biomes registered yet. Explore the realm to uncover new territories!
                </div>
              ) : (
                discoveries.map(record => (
                  <div
                    key={record.id}
                    id={`discovery_card_${record.id}`}
                    className="p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/60 flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-zinc-100">{record.name}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/50 border border-cyan-800/60 text-cyan-400 uppercase tracking-wider">
                          {record.type}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{record.description}</p>
                    </div>

                    <div className="text-right whitespace-nowrap">
                      {record.worldPos && (
                        <div className="text-xs font-mono text-amber-400">
                          X: {record.worldPos[0]}, Z: {record.worldPos[2]}
                        </div>
                      )}
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {new Date(record.timestamp).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* 7. LORE CODEX TAB */}
          {activeTab === 'lore' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[380px]">
              {/* Lore List */}
              <div className="md:col-span-1 border-r border-zinc-800 pr-3 space-y-1.5 overflow-y-auto">
                {Object.values(LORE_REGISTRY).map(entry => (
                  <button
                    key={entry.id}
                    id={`btn_lore_${entry.id}`}
                    onClick={() => setSelectedLoreId(entry.id)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      selectedLoreId === entry.id
                        ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    }`}
                  >
                    <span className="truncate">{entry.title}</span>
                    <span className="text-[10px] text-zinc-500 uppercase">{entry.category}</span>
                  </button>
                ))}
              </div>

              {/* Lore Entry Display */}
              <div className="md:col-span-2 pl-2 overflow-y-auto">
                {(() => {
                  const entry = LORE_REGISTRY[selectedLoreId];
                  if (!entry) return null;
                  return (
                    <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-3">
                      <div>
                        <div className="text-[10px] text-amber-400 uppercase font-bold tracking-wider">{entry.category}</div>
                        <h3 className="text-base font-bold text-zinc-100 mt-0.5">{entry.title}</h3>
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

          {/* 8. WORLD TIERS TAB */}
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
