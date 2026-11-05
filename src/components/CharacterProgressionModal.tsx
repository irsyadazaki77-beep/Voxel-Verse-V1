import React, { useState, useEffect } from 'react';
import {
  X,
  Shield,
  Zap,
  Compass,
  Sword,
  Hammer,
  RotateCcw,
  Plus,
  Check,
  Lock,
  Copy,
  Download,
  Upload,
  Sliders,
  Layers,
} from 'lucide-react';
import {
  CharacterProgressionManager,
  CoreAttributeId,
  SKILL_TREE_REGISTRY,
  SkillBranchId,
  SkillNodeDef,
  WeaponMasteryEntry,
} from '../engine/progression/CharacterProgressionManager';
import { WeaponArchetypes } from '../engine/combat/WeaponArchetypes';
import { BlueprintSystem } from '../engine/engineering/BlueprintSystem';
import { NotificationManager } from '../engine/ui/NotificationManager';
import { NusantaraSanctumSilatSubakSystem } from '../engine/systems/NusantaraSanctumSilatSubakSystem';

interface CharacterProgressionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'attributes' | 'skill_tree' | 'mastery' | 'blueprint_modding';
}

export const CharacterProgressionModal: React.FC<CharacterProgressionModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'skill_tree',
}) => {
  const [activeTab, setActiveTab] = useState<'attributes' | 'skill_tree' | 'mastery' | 'blueprint_modding'>(initialTab);
  const [, setTick] = useState(0);

  // Blueprint Studio State
  const [scanRadius, setScanRadius] = useState<number>(4);
  const [newBlueprintName, setNewBlueprintName] = useState<string>('Pendopo Pusaka Kustom');
  const [importCodeText, setImportCodeText] = useState<string>('');
  const [exportedCodePreview, setExportedCodePreview] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = CharacterProgressionManager.subscribe(() => {
      setTick((t) => t + 1);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const rt = (window as any).__voxelRuntime;
  const playerLevel = rt?.stats?.level || 1;
  const playerXp = rt?.stats?.xp || 0;
  const activeItem = rt?.getActiveHotbarItem?.() || null;
  const activeWeaponCat = WeaponArchetypes.getProfile(activeItem).category;

  const attrs = CharacterProgressionManager.attributes;
  const attrPoints = CharacterProgressionManager.availableAttributePoints;
  const skillPoints = CharacterProgressionManager.availableSkillPoints;
  const computed = CharacterProgressionManager.getComputedBonuses(activeWeaponCat);
  const archetypeTitle = CharacterProgressionManager.getDominantArchetypeTitle();
  const masteryList = CharacterProgressionManager.getWeaponMasteryList();
  const worldMods = CharacterProgressionManager.worldModConfig;

  const handleAllocateAttr = (id: CoreAttributeId) => {
    if (CharacterProgressionManager.allocateAttribute(id)) {
      rt?.audio?.playItemCollect?.();
      if (rt?.stats) {
        rt.stats.recalculateProgressionBonuses?.();
      }
    }
  };

  const handleUnlockSkill = (node: SkillNodeDef) => {
    if (CharacterProgressionManager.unlockSkill(node.id)) {
      rt?.audio?.playAncientGong?.();
      if (rt?.stats) {
        rt.stats.recalculateProgressionBonuses?.();
      }
    }
  };

  const handleScanPlayerStructure = () => {
    if (!rt || !rt.world || !rt.player) return;
    const px = Math.floor(rt.player.position.x);
    const py = Math.floor(rt.player.position.y);
    const pz = Math.floor(rt.player.position.z);

    const minPos: [number, number, number] = [px - scanRadius, py - 1, pz - scanRadius];
    const maxPos: [number, number, number] = [px + scanRadius, py + scanRadius + 2, pz + scanRadius];
    const bpId = `bp_scan_${Date.now()}`;
    const bpName = newBlueprintName.trim() || `Struktur Nusantara (${scanRadius * 2 + 1}m)`;

    const bp = BlueprintSystem.createFromWorld(bpId, bpName, minPos, maxPos, rt.world);
    const code = BlueprintSystem.exportBlueprintCode(bp);

    CharacterProgressionManager.saveCustomBlueprint({
      id: bp.id,
      name: bp.name,
      code,
      dimensions: bp.dimensions,
      blockCount: bp.blocks.length,
    });

    setExportedCodePreview(code);
    rt.audio?.playItemCollect?.();
    NotificationManager.push({
      title: 'Struktur Berhasil Dipindai!',
      message: `${bp.name} (${bp.blocks.length} balok) disimpan ke Pustaka Blueprint.`,
      priority: 'HIGH',
      colorTheme: 'emerald',
      durationMs: 3500,
    });
  };

  const handleImportBlueprint = () => {
    const bp = BlueprintSystem.importBlueprintCode(importCodeText);
    if (!bp) {
      NotificationManager.push({
        title: 'Kode Blueprint Tidak Valid',
        message: 'Pastikan string dimulai dengan VVBP1: atau format JSON struktur yang benar.',
        priority: 'HIGH',
        colorTheme: 'rose',
        durationMs: 3200,
      });
      return;
    }

    const cleanCode = BlueprintSystem.exportBlueprintCode(bp);
    CharacterProgressionManager.saveCustomBlueprint({
      id: bp.id,
      name: bp.name,
      code: cleanCode,
      dimensions: bp.dimensions,
      blockCount: bp.blocks.length,
    });
    setImportCodeText('');
    setExportedCodePreview(cleanCode);
    rt?.audio?.playItemCollect?.();
    NotificationManager.push({
      title: 'Blueprint Berhasil Diimpor!',
      message: `${bp.name} (${bp.dimensions.join('×')}) siap dibangun di dunia Anda.`,
      priority: 'HIGH',
      colorTheme: 'sky',
      durationMs: 3500,
    });
  };

  const handleBuildBlueprintAtPlayer = (bpIdOrCode: string, isCode: boolean = false) => {
    if (!rt || !rt.world || !rt.player) return;
    const bp = isCode
      ? BlueprintSystem.importBlueprintCode(bpIdOrCode)
      : BlueprintSystem.BLUEPRINT_REGISTRY.get(bpIdOrCode);
    if (!bp) return;

    const forward = rt.player.getForwardVector();
    const ox = Math.floor(rt.player.position.x + forward.x * 4);
    const oy = Math.floor(rt.player.position.y);
    const oz = Math.floor(rt.player.position.z + forward.z * 4);

    const built = BlueprintSystem.buildBlueprint(bp, [ox, oy, oz], rt.world);
    if (built) {
      rt.audio?.playBlockPlace?.('stone');
      NotificationManager.push({
        title: `Konstruksi Selesai: ${bp.name}`,
        message: `Ditempatkan pada koordinat [${ox}, ${oy}, ${oz}].`,
        priority: 'HIGH',
        colorTheme: 'amber',
        durationMs: 3200,
      });
    }
  };

  const handleCopyCode = (id: string, code: string) => {
    setExportedCodePreview(code);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const attributeDefs: Array<{
    id: CoreAttributeId;
    name: string;
    subtitle: string;
    value: number;
    accent: string;
    detail: string;
  }> = [
    {
      id: 'raga',
      name: 'Raga (Vitality)',
      subtitle: 'Ketahanan Tubuh & Regenerasi',
      value: attrs.raga,
      accent: 'text-rose-400',
      detail: `+${(attrs.raga - 1) * 12} Maks Darah · Ketahanan Cuaca & Racun`,
    },
    {
      id: 'daya',
      name: 'Daya (Strength)',
      subtitle: 'Kekuatan Tebasan & Penambangan',
      value: attrs.daya,
      accent: 'text-amber-400',
      detail: `+${Math.round((attrs.daya - 1) * 3.5)}% Damage Fisik · +${(attrs.daya - 1) * 4}% Poise Damage`,
    },
    {
      id: 'lincah',
      name: 'Lincah (Agility)',
      subtitle: 'Kecepatan Serang, Stamina & Kritikal',
      value: attrs.lincah,
      accent: 'text-emerald-400',
      detail: `+${(attrs.lincah - 1) * 8} Maks Stamina · +${((attrs.lincah - 1) * 1.5).toFixed(1)}% Peluang Kritikal`,
    },
    {
      id: 'karsa',
      name: 'Karsa (Aether Resonance)',
      subtitle: 'Penguasaan Jurus Pusaka & Mesin Ley',
      value: attrs.karsa,
      accent: 'text-cyan-400',
      detail: `+${Math.round((attrs.karsa - 1) * 4.5)}% Daya Jurus · -${((attrs.karsa - 1) * 1.5).toFixed(1)}% Cooldown Jurus`,
    },
  ];

  const branches: Array<{
    id: SkillBranchId;
    title: string;
    subtitle: string;
    accentBorder: string;
    accentText: string;
  }> = [
    {
      id: 'jawara_silat',
      title: '01. Cabang Jawara Silat',
      subtitle: 'Kombo Senjata, Tangkisan Parry & Jurus Pusaka',
      accentBorder: 'border-amber-500/30',
      accentText: 'text-amber-300',
    },
    {
      id: 'empu_aether',
      title: '02. Cabang Empu Mekanika Aether',
      subtitle: 'Jaringan Energi Ley, Otomasi Subak & Pertahanan Desa',
      accentBorder: 'border-cyan-500/30',
      accentText: 'text-cyan-300',
    },
    {
      id: 'penjelajah_cakrawala',
      title: '03. Cabang Penjelajah Cakrawala',
      subtitle: 'Navigasi Bahari/Udara, Cartografi & Lintas Dimensi',
      accentBorder: 'border-emerald-500/30',
      accentText: 'text-emerald-300',
    },
  ];

  return (
    <div
      id="modal-character-progression"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 select-none font-sans animate-fade-in"
    >
      <div className="w-full max-w-5xl h-[86vh] bg-[#090d16] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-6 px-6 py-4 border-b border-white/10 bg-[#0c1220]">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-sm font-mono tabular-nums shrink-0">
              Lv.{playerLevel}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold tracking-tight text-white truncate">
                Karakter, Pohon Keahlian & Studio Nusantara
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums truncate">
                <span className="text-amber-300 font-medium">{archetypeTitle}</span>
                <span aria-hidden="true">·</span>
                <span>XP {playerXp}</span>
                <span aria-hidden="true">·</span>
                <span className="text-sky-300">{attrPoints} Poin Atribut</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-300">{skillPoints} Poin Bakat</span>
              </div>
            </div>
          </div>

          {/* Segmented Navigation Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 border border-white/10 rounded-xl shrink-0">
            <button
              onClick={() => setActiveTab('skill_tree')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'skill_tree'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Pohon Keahlian ({skillPoints})
            </button>
            <button
              onClick={() => setActiveTab('attributes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'attributes'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Atribut ({attrPoints})
            </button>
            <button
              onClick={() => setActiveTab('mastery')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'mastery'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Mastery Senjata
            </button>
            <button
              onClick={() => setActiveTab('blueprint_modding')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'blueprint_modding'
                  ? 'bg-amber-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Blueprint & Modding
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
            title="Tutup [ESC / K]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ========================================== */}
          {/* TAB 1: POHON KEAHLIAN (3-BRANCH SKILL TREE) */}
          {/* ========================================== */}
          {activeTab === 'skill_tree' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Tiga Cabang Keahlian Nusantara
                  </h3>
                  <p className="text-xs text-slate-400">
                    Buka keahlian bertingkat dari Tier 1 hingga Tier 4 Keystone. Anda bebas mengombinasikan ketiga cabang sesuai gaya bermain.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono tabular-nums text-amber-300">
                    Tersedia: {skillPoints} Poin Bakat
                  </span>
                  <button
                    onClick={() => {
                      CharacterProgressionManager.resetSkills();
                      rt?.stats?.recalculateProgressionBonuses?.();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Bakat</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {branches.map((branch) => {
                  const nodes = SKILL_TREE_REGISTRY.filter((n) => n.branch === branch.id);
                  return (
                    <div
                      key={branch.id}
                      className={`rounded-xl bg-[#0e1525] border ${branch.accentBorder} p-4 flex flex-col gap-3.5`}
                    >
                      <div className="pb-2.5 border-b border-white/10">
                        <h4 className={`text-sm font-bold ${branch.accentText}`}>
                          {branch.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">{branch.subtitle}</p>
                      </div>

                      <div className="flex flex-col gap-3">
                        {nodes.map((node) => {
                          const rank = CharacterProgressionManager.getSkillRank(node.id);
                          const isMaxed = rank >= node.maxRank;
                          const unlockCheck = CharacterProgressionManager.canUnlockSkill(node.id);

                          return (
                            <div
                              key={node.id}
                              className={`p-3.5 rounded-xl border transition-colors ${
                                isMaxed
                                  ? 'bg-amber-500/10 border-amber-400/50'
                                  : rank > 0
                                  ? 'bg-slate-900/95 border-sky-400/40'
                                  : unlockCheck.allowed
                                  ? 'bg-slate-900/80 border-white/15 hover:border-amber-400/40'
                                  : 'bg-slate-950/60 border-white/5 opacity-75'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div>
                                  <div className="text-[11px] font-mono text-slate-400">
                                    Tier {node.tier} · Biaya {node.costPerRank} Poin
                                  </div>
                                  <div className="text-sm font-semibold text-white">
                                    {node.name}
                                  </div>
                                </div>
                                <span className="text-xs font-mono tabular-nums font-bold text-amber-300 shrink-0">
                                  {rank}/{node.maxRank}
                                </span>
                              </div>

                              <p className="text-xs text-slate-300 leading-relaxed mb-2">
                                {node.description}
                              </p>

                              <div className="text-[11px] font-mono text-emerald-300 mb-3">
                                {node.effectSummary}
                              </div>

                              <button
                                onClick={() => handleUnlockSkill(node)}
                                disabled={!unlockCheck.allowed}
                                className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                                  isMaxed
                                    ? 'bg-emerald-500/20 text-emerald-300 cursor-default'
                                    : unlockCheck.allowed
                                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                    : 'bg-slate-800/80 text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                {isMaxed ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Tingkat Maksimal</span>
                                  </>
                                ) : unlockCheck.allowed ? (
                                  <>
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Pelajari Keahlian ({node.costPerRank} Poin)</span>
                                  </>
                                ) : (
                                  <>
                                    <Lock className="w-3.5 h-3.5" />
                                    <span className="truncate">{unlockCheck.reason}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 2: ATRIBUT & STATISTIK KARAKTER        */}
          {/* ========================================== */}
          {activeTab === 'attributes' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left 7 Cols: 4 Core Attributes Allocation */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      Alokasi 4 Atribut Dasar Karakter
                    </h3>
                    <p className="text-xs text-slate-400">
                      Setiap kenaikan level memberikan +2 Poin Atribut yang meningkatkan kemampuan tempur dan bertahan hidup.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      CharacterProgressionManager.resetAttributes();
                      rt?.stats?.recalculateProgressionBonuses?.();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Atribut</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {attributeDefs.map((attr) => (
                    <div
                      key={attr.id}
                      className="p-4 rounded-xl bg-[#0e1525] border border-white/10 flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-bold ${attr.accent}`}>
                            {attr.name}
                          </span>
                          <span className="text-xs text-slate-400">· {attr.subtitle}</span>
                        </div>
                        <div className="text-xs font-mono text-slate-300">
                          {attr.detail}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-[10px] font-mono text-slate-400">Nilai</div>
                          <div className="text-lg font-mono tabular-nums font-bold text-white">
                            {attr.value}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAllocateAttr(attr.id)}
                          disabled={attrPoints <= 0}
                          className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer ${
                            attrPoints > 0
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 5 Cols: Live Computed Combat & Survival Telemetry */}
              <div className="lg:col-span-5 rounded-xl bg-[#0e1525] border border-white/10 p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="pb-3 border-b border-white/10">
                    <h4 className="text-sm font-bold text-amber-300">
                      Ringkasan Statistik Terhitung
                    </h4>
                    <p className="text-xs text-slate-400">
                      Penggabungan Atribut, Skill Tree, dan Senjata Aktif ({activeWeaponCat.toUpperCase()})
                    </p>
                  </div>

                  <div className="space-y-2.5 text-xs font-mono tabular-nums">
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-slate-400">Bonus Maksimum Darah:</span>
                      <span className="text-rose-400 font-bold">+{computed.maxHealthBonus} HP</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-slate-400">Bonus Maksimum Stamina:</span>
                      <span className="text-emerald-400 font-bold">+{computed.maxStaminaBonus} Stamina</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-slate-400">Pengali Kerusakan Fisik:</span>
                      <span className="text-amber-300 font-bold">{(computed.meleeDamageMultiplier * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-slate-400">Pengali Daya Hancur Poise:</span>
                      <span className="text-amber-300 font-bold">{(computed.poiseDamageMultiplier * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-slate-400">Bonus Peluang Kritikal:</span>
                      <span className="text-sky-300 font-bold">+{(computed.critChanceBonus * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-slate-400">Pengali Jurus Pusaka [R]:</span>
                      <span className="text-cyan-300 font-bold">{(computed.skillDamageMultiplier * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-slate-400">Durasi Cooldown Jurus:</span>
                      <span className="text-cyan-300 font-bold">{(computed.skillCooldownMultiplier * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-slate-400">Efisiensi Kecepatan Tambang:</span>
                      <span className="text-emerald-300 font-bold">{(computed.miningSpeedMultiplier * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span className="text-slate-400">Kecepatan Jelajah Darat/Laut:</span>
                      <span className="text-emerald-300 font-bold">{(computed.moveSpeedMultiplier * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Pengali Perolehan XP Dunia:</span>
                      <span className="text-amber-400 font-bold">{(computed.xpGainMultiplier * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900/90 border border-white/5 text-xs text-slate-300">
                  Tip: Gunakan tombol pintas <kbd className="px-1.5 py-0.5 bg-slate-800 rounded font-mono text-amber-300">R</kbd> saat bertarung untuk melepaskan Jurus Pusaka sesuai senjata yang sedang digenggam.
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 3: MASTERY SENJATA & JURUS PUSAKA      */}
          {/* ========================================== */}
          {activeTab === 'mastery' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-white/10">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Penguasaan Arketipe Senjata (Weapon Mastery)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Setiap serangan dan kemenangan menggunakan jenis senjata tertentu meningkatkan Mastery dan membuka teknik pasif di Level 3, 6, dan 10.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      NusantaraSanctumSilatSubakSystem.cycleSilatStance(rt?.audio);
                      setTick((t) => t + 1);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-medium text-amber-300 cursor-pointer whitespace-nowrap"
                  >
                    Ganti Kuda-Kuda Silat: {NusantaraSanctumSilatSubakSystem.getActiveStanceDef().name}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {masteryList.map((entry: WeaponMasteryEntry) => {
                  const pct = entry.level >= 10 ? 100 : Math.min(100, Math.round((entry.xp / entry.nextLevelXp) * 100));
                  const isCurrent = entry.category === activeWeaponCat;

                  return (
                    <div
                      key={entry.category}
                      className={`p-4 rounded-xl border transition-colors ${
                        isCurrent
                          ? 'bg-[#111a2e] border-amber-400/50'
                          : 'bg-[#0e1525] border-white/10'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{entry.name}</span>
                            {isCurrent && (
                              <span className="text-[11px] font-mono text-amber-300">
                                · Sedang Digunakan
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">{entry.nusantaraExamples}</div>
                        </div>

                        <div className="text-right font-mono tabular-nums shrink-0">
                          <div className="text-sm font-bold text-emerald-400">Lv. {entry.level}/10</div>
                          <div className="text-[11px] text-slate-400">
                            {entry.level >= 10 ? 'MAKS' : `${entry.xp}/${entry.nextLevelXp} XP`}
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden mb-3 border border-white/5">
                        <div
                          className="h-full bg-amber-400 transition-all duration-200"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Mastery Perks */}
                      <div className="space-y-1 text-xs font-mono mb-3">
                        <div className={entry.level >= 3 ? 'text-emerald-300' : 'text-slate-500'}>
                          {entry.level >= 3 ? '✓ ' : '○ '}
                          {entry.tier1Perk}
                        </div>
                        <div className={entry.level >= 6 ? 'text-emerald-300' : 'text-slate-500'}>
                          {entry.level >= 6 ? '✓ ' : '○ '}
                          {entry.tier2Perk}
                        </div>
                        <div className={entry.level >= 10 ? 'text-amber-300 font-semibold' : 'text-slate-500'}>
                          {entry.level >= 10 ? '★ ' : '○ '}
                          {entry.tier3Perk}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            CharacterProgressionManager.addWeaponMasteryXp(entry.category, 25);
                            rt?.audio?.playSwordSwing?.();
                          }}
                          disabled={entry.level >= 10}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
                        >
                          Latih Jurus (+25 Mastery XP)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* TAB 4: BLUEPRINT STUDIO & MODDING DUNIA    */}
          {/* ========================================== */}
          {activeTab === 'blueprint_modding' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 Cols: 3D Structure Scanner & Blueprint Sharing */}
              <div className="lg:col-span-7 space-y-5">
                <div className="p-4 rounded-xl bg-[#0e1525] border border-white/10 space-y-4">
                  <div className="border-b border-white/10 pb-2.5">
                    <h3 className="text-sm font-bold text-amber-300">
                      Pemindai Struktur 3D & Berbagi Blueprint (Blueprint Sharing)
                    </h3>
                    <p className="text-xs text-slate-400">
                      Rekam bangunan atau rangkaian mesin Aether di sekitar posisi Anda menjadi kode Blueprint yang dapat diekspor, dibagikan, atau dibangun kembali secara instan.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-slate-300 mb-1">Nama Struktur Blueprint</label>
                      <input
                        type="text"
                        value={newBlueprintName}
                        onChange={(e) => setNewBlueprintName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
                        placeholder="Nama bangunan atau mesin..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-300 mb-1 font-mono tabular-nums">
                        Radius Pindai ({scanRadius * 2 + 1}×{scanRadius * 2 + 1}m)
                      </label>
                      <input
                        type="range"
                        min={2}
                        max={8}
                        value={scanRadius}
                        onChange={(e) => setScanRadius(Number(e.target.value))}
                        className="w-full accent-amber-400 cursor-pointer mt-2"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleScanPlayerStructure}
                      className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Pindai & Simpan Struktur di Sekitar Pemain</span>
                    </button>
                  </div>

                  {exportedCodePreview && (
                    <div className="p-3 rounded-lg bg-slate-950 border border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-mono">Kode String Blueprint (Siap Dibagikan):</span>
                        <button
                          onClick={() => handleCopyCode('preview', exportedCodePreview)}
                          className="text-amber-300 hover:text-amber-200 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{copiedId === 'preview' ? 'Tersalin!' : 'Salin Kode'}</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        readOnly
                        value={exportedCodePreview}
                        className="w-full bg-slate-900 border border-white/5 rounded px-2.5 py-1.5 text-[11px] font-mono text-sky-300 select-all"
                      />
                    </div>
                  )}

                  {/* Import Blueprint Code Box */}
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <label className="block text-xs font-medium text-slate-300">
                      Impor Kode Blueprint Komunitas (Format VVBP1:...)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={importCodeText}
                        onChange={(e) => setImportCodeText(e.target.value)}
                        placeholder="Tempel kode VVBP1:... di sini"
                        className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-sky-400"
                      />
                      <button
                        onClick={handleImportBlueprint}
                        className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Impor Blueprint</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Built-in & Custom Blueprint Library */}
                <div className="p-4 rounded-xl bg-[#0e1525] border border-white/10 space-y-3">
                  <h4 className="text-sm font-bold text-white">
                    Pustaka Cetak Biru & Otomasi Nusantara
                  </h4>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {Array.from(BlueprintSystem.BLUEPRINT_REGISTRY.values()).map((bp) => {
                      const code = BlueprintSystem.exportBlueprintCode(bp);
                      return (
                        <div
                          key={bp.id}
                          className="p-3 rounded-lg bg-slate-900/90 border border-white/10 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="text-xs font-semibold text-white">{bp.name}</div>
                            <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                              Ukuran {bp.dimensions.join('×')}m · {bp.blocks.length} Balok
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleCopyCode(bp.id, code)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedId === bp.id ? 'Tersalin' : 'Ekspor'}</span>
                            </button>
                            <button
                              onClick={() => handleBuildBlueprintAtPlayer(bp.id, false)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs cursor-pointer"
                            >
                              Bangun di Depan Pemain
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right 5 Cols: Custom World Modding Rules */}
              <div className="lg:col-span-5 p-5 rounded-xl bg-[#0e1525] border border-white/10 space-y-5">
                <div className="border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                    <Sliders className="w-4 h-4" />
                    <span>Modifikasi Parameter Dunia (World Modding)</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Sesuaikan aturan simulasi dunia secara langsung untuk kustomisasi tantangan atau eksperimen sandbox.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <div className="flex justify-between font-mono tabular-nums">
                      <span className="text-slate-300">Pengali Perolehan XP & Mastery:</span>
                      <span className="text-amber-300 font-bold">{worldMods.xpMultiplier.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={5.0}
                      step={0.5}
                      value={worldMods.xpMultiplier}
                      onChange={(e) =>
                        CharacterProgressionManager.updateWorldModConfig({
                          xpMultiplier: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between font-mono tabular-nums">
                      <span className="text-slate-300">Pengali Hasil Panen & Otomasi Aether:</span>
                      <span className="text-emerald-300 font-bold">{worldMods.resourceYieldMultiplier.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min={1.0}
                      max={4.0}
                      step={0.5}
                      value={worldMods.resourceYieldMultiplier}
                      onChange={(e) =>
                        CharacterProgressionManager.updateWorldModConfig({
                          resourceYieldMultiplier: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between font-mono tabular-nums">
                      <span className="text-slate-300">Frekuensi Anomali & Gelombang Siege:</span>
                      <span className="text-cyan-300 font-bold">{worldMods.anomalyFrequencyMultiplier.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={3.0}
                      step={0.5}
                      value={worldMods.anomalyFrequencyMultiplier}
                      onChange={(e) =>
                        CharacterProgressionManager.updateWorldModConfig({
                          anomalyFrequencyMultiplier: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </div>

                  <div className="pt-3 border-t border-white/10 space-y-2.5">
                    <div className="font-semibold text-white">Pemicu Event & Eksplorasi Cepat</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          if (!rt || !rt.player || !rt.world) return;
                          import('../engine/systems/AerialFlightAndSiegeSystem').then(
                            ({ AerialFlightAndSiegeSystem }) => {
                              AerialFlightAndSiegeSystem.startVillageSiege(
                                rt.world,
                                rt.player,
                                rt.entities,
                                rt.audio,
                                rt.particles
                              );
                              onClose();
                            }
                          );
                        }}
                        className="py-2 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-200 font-medium text-xs cursor-pointer"
                      >
                        Mulai Pertahanan Desa
                      </button>
                      <button
                        onClick={() => {
                          if (!rt) return;
                          const nextDim =
                            rt.world.currentDimension === 'overworld' ? 'aether_expanse' : 'overworld';
                          rt.changeDimension(nextDim);
                          onClose();
                        }}
                        className="py-2 px-3 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 font-medium text-xs cursor-pointer"
                      >
                        Lintas Dimensi Aether
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
