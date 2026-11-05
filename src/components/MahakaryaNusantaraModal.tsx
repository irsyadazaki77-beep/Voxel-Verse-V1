import React, { useState, useEffect } from 'react';
import {
  MahakaryaNusantaraSystem,
  KHODAM_COMPANIONS,
  NUSANTARA_WARDROBE_OUTFITS,
  KhodamCompanionId,
  NusantaraWardrobeId,
  ExtremeWeatherEventId,
  PhotoFrameStyleId,
  MahakaryaTelemetryState,
} from '../engine/systems/MahakaryaNusantaraSystem';
import { TelemetryStore } from '../engine/ui/TelemetryStore';

interface MahakaryaNusantaraModalProps {
  isOpen: boolean;
  initialTab?: 'SAMUDRA_KERETA' | 'GAMELAN_STUDIO' | 'KHODAM_ARENA' | 'BUSANA_FOTO';
  onClose: () => void;
}

const PELOG_NOTES = [
  { idx: 0, label: '1 · Ji', saron: 'Panunggul' },
  { idx: 1, label: '2 · Ro', saron: 'Gulu' },
  { idx: 2, label: '3 · Lu', saron: 'Dada' },
  { idx: 3, label: '4 · Pat', saron: 'Pelog' },
  { idx: 4, label: '5 · Ma', saron: 'Lima' },
  { idx: 5, label: '6 · Nem', saron: 'Nem' },
  { idx: 6, label: '7 · Pi', saron: 'Barang' },
];

export const MahakaryaNusantaraModal: React.FC<MahakaryaNusantaraModalProps> = ({
  isOpen,
  initialTab = 'SAMUDRA_KERETA',
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'SAMUDRA_KERETA' | 'GAMELAN_STUDIO' | 'KHODAM_ARENA' | 'BUSANA_FOTO'>(initialTab);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [instrument, setInstrument] = useState<'SARON' | 'BONANG' | 'ANGKLUNG' | 'GONG'>('SARON');
  const [state, setState] = useState<MahakaryaTelemetryState>(() =>
    MahakaryaNusantaraSystem.getTelemetry()
  );

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    setState(MahakaryaNusantaraSystem.getTelemetry());
    return TelemetryStore.subscribe((telemetry) => {
      if (telemetry.mahakaryaV48) {
        setState(telemetry.mahakaryaV48);
      }
    });
  }, [isOpen]);

  // Keyboard shortcuts for playing Gamelan notes (1-7) & collapsing dock (H)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab === 'GAMELAN_STUDIO' && e.key >= '1' && e.key <= '7') {
        e.preventDefault();
        const noteIdx = parseInt(e.key, 10) - 1;
        const rt = (window as any).__voxelRuntime;
        MahakaryaNusantaraSystem.strikeGamelanNote(noteIdx, instrument, rt?.audio, rt?.stats);
        setState(MahakaryaNusantaraSystem.getTelemetry(rt?.player?.position));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeTab, instrument]);

  if (!isOpen) return null;

  const refreshLocalState = () => {
    const rt = (window as any).__voxelRuntime;
    setState(MahakaryaNusantaraSystem.getTelemetry(rt?.player?.position));
  };

  return (
    <div className="fixed inset-0 z-40 pointer-events-none select-none font-sans flex flex-col justify-between">
      {/* Cinematic Frame Overlays when in Photo Mode */}
      {state.photoModeActive && state.photoFrame === 'SINEMA_21_9' && (
        <>
          <div className="w-full h-14 bg-black pointer-events-none" />
          <div className="w-full h-14 bg-black pointer-events-none fixed bottom-0 left-0 right-0 z-10" />
        </>
      )}

      {state.photoModeActive && state.photoFrame === 'UKIRAN_MAJAPAHIT' && (
        <div className="fixed inset-3 border-2 border-amber-500/60 rounded-2xl pointer-events-none z-20 flex flex-col justify-between p-3">
          <div className="flex justify-between text-[11px] font-mono text-amber-300/90">
            <span>VOXELVERSE · WARISAN MAJAPAHIT</span>
            <span className="tabular-nums">FOV {state.photoFov}°</span>
          </div>
          <div className="flex justify-between text-[11px] font-mono text-amber-300/90">
            <span>BUSANA: {state.activeWardrobeName}</span>
            <span>KHODAM: {state.activeKhodamName || 'Nonaktif'}</span>
          </div>
        </div>
      )}

      {state.photoModeActive && state.photoFrame === 'WAYANG_KLASIK' && (
        <div className="fixed inset-4 border border-amber-300/50 rounded-xl pointer-events-none z-20 flex items-end justify-center pb-4">
          <span className="px-3 py-1 rounded bg-slate-950/90 border border-amber-400/40 text-xs font-serif italic text-amber-200">
            “Lakon Mahakarya Bumi Nusantara”
          </span>
        </div>
      )}

      {/* Minimal Top Badge (Never blocks center 3D viewport) */}
      <div className="w-full flex justify-center pt-3 pointer-events-none z-30">
        <div className="px-4 py-1.5 rounded-xl bg-[#0b0e17] border border-amber-500/35 text-xs text-slate-200 flex items-center gap-3 pointer-events-auto shadow-xl">
          <span className="font-bold text-amber-300 whitespace-nowrap">
            Mahakarya Nusantara v4.8
          </span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="text-slate-300 text-[11px] whitespace-nowrap">
            {state.photoModeActive
              ? 'Kamera Bebas 3D Aktif (Gunakan W/A/S/D/Spasi/Shift)'
              : `Busana: ${state.activeWardrobeName}`}
          </span>
          <button
            onClick={() => {
              const rt = (window as any).__voxelRuntime;
              if (MahakaryaNusantaraSystem.photoModeActive && rt?.player && rt?.camera) {
                MahakaryaNusantaraSystem.togglePhotoMode(rt.player, rt.camera, rt.audio);
              }
              onClose();
            }}
            className="ml-2 px-2.5 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium cursor-pointer transition-colors whitespace-nowrap"
          >
            Tutup [ESC]
          </button>
        </div>
      </div>

      {/* Unified Collapsible Bottom Control Dock (100% Unobstructed Center 3D Viewport) */}
      <div className="w-full flex flex-col items-center pb-4 px-3 pointer-events-none z-30">
        <div className="w-full max-w-[940px] flex flex-col items-center pointer-events-auto">
          {/* Collapse / Expand Toggle Drawer Handle */}
          <div className="flex items-center gap-2 mb-1.5">
            <button
              onClick={() => setDockCollapsed((prev) => !prev)}
              className="px-3.5 py-1 rounded-lg bg-[#0d111c] hover:bg-[#161c2e] border border-slate-700/80 text-[11px] font-medium text-amber-300 cursor-pointer transition-colors whitespace-nowrap shadow-lg"
            >
              {dockCollapsed ? '▴ Tampilkan Panel Mahakarya' : '▾ Sembunyikan Kontrol (Mode Zen)'}
            </button>

            {state.photoModeActive && (
              <button
                onClick={() => {
                  const rt = (window as any).__voxelRuntime;
                  if (rt?.renderer && rt?.scene && rt?.camera) {
                    MahakaryaNusantaraSystem.captureScreenshotPNG(
                      rt.renderer,
                      rt.scene,
                      rt.camera,
                      rt.audio
                    );
                  }
                }}
                className="px-3.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] cursor-pointer transition-colors whitespace-nowrap shadow-lg"
              >
                Potret Layar (PNG)
              </button>
            )}
          </div>

          {/* Collapsible Dock Container (Solid high-contrast dark slate — zero backdrop-filter stall) */}
          {!dockCollapsed && (
            <div className="w-full rounded-2xl bg-[#0b0e17] border border-slate-800 shadow-2xl p-4 text-slate-100">
              {/* Segmented Tab Bar */}
              <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800/90 overflow-x-auto">
                <div className="flex items-center gap-1 p-1 bg-[#131826] rounded-xl">
                  <button
                    onClick={() => setActiveTab('SAMUDRA_KERETA')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      activeTab === 'SAMUDRA_KERETA'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    01. Samudra & Kereta Aether
                  </button>
                  <button
                    onClick={() => setActiveTab('GAMELAN_STUDIO')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      activeTab === 'GAMELAN_STUDIO'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    02. Studio Gamelan & Angklung 3D
                  </button>
                  <button
                    onClick={() => setActiveTab('KHODAM_ARENA')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      activeTab === 'KHODAM_ARENA'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    03. Khodam, Arena & Cuaca Ekstrem
                  </button>
                  <button
                    onClick={() => setActiveTab('BUSANA_FOTO')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      activeTab === 'BUSANA_FOTO'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    04. Busana Batik & Mode Foto 3D
                  </button>
                </div>

                <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 font-mono tabular-nums shrink-0">
                  <span>Tambang Otomatis: {state.quarryTotalMined}</span>
                  <span aria-hidden="true">·</span>
                  <span>Berkah Gamelan: {state.gamelanBlessingTimer}d</span>
                </div>
              </div>

              {/* TAB 1: KAPAL SELAM NANGGALA, CANDI SAMUDRA, KERETA UAP AETHER & BOR TAMBANG */}
              {activeTab === 'SAMUDRA_KERETA' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Submarine & Ocean Candi */}
                  <div className="p-3.5 rounded-xl bg-[#121726] border border-slate-800 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-bold text-cyan-300">
                          Ekspedisi Kapal Selam Nanggala & Candi Samudra 3D
                        </h3>
                        <span className="text-[11px] font-mono tabular-nums text-slate-400">
                          Kedalaman: {state.submarineDepth}m
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Kemudikan kapal selam berkubah kaca bertekanan dengan lampu sorot bawah laut, atau buka ruang suci Candi Samudra Selatan beserta Bos Raja Kala Samudra.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          const rt = (window as any).__voxelRuntime;
                          if (rt?.player) {
                            MahakaryaNusantaraSystem.toggleSubmarine(
                              rt.player,
                              rt.audio,
                              rt.particles
                            );
                            refreshLocalState();
                          }
                        }}
                        className="px-3.5 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors whitespace-nowrap"
                      >
                        {state.submarineActive ? 'Simpan Kapal Selam' : 'Panggil Kapal Selam 3D'}
                      </button>

                      <button
                        onClick={() => {
                          const rt = (window as any).__voxelRuntime;
                          if (rt?.world && rt?.entities && rt?.player) {
                            MahakaryaNusantaraSystem.buildUnderwaterOceanCandi(
                              rt.world,
                              rt.entities,
                              rt.player,
                              rt.audio,
                              rt.particles,
                              rt.stats,
                              (id, cnt) => rt.addItemToInventory(id, cnt)
                            );
                            refreshLocalState();
                          }
                        }}
                        className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 text-cyan-200 font-semibold text-xs cursor-pointer transition-colors whitespace-nowrap"
                      >
                        Bangun Candi Samudra & Bos
                      </button>
                    </div>
                  </div>

                  {/* Steam Locomotive & Automated Quarry */}
                  <div className="p-3.5 rounded-xl bg-[#121726] border border-slate-800 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-sm font-bold text-amber-300">
                          Lokomotif Uap Aether 3D & Bor Tambang Otomatis
                        </h3>
                        <span className="text-[11px] font-mono tabular-nums text-slate-400">
                          Bor Aktif: {state.quarryCount} · Hasil: {state.quarryTotalMined}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Gelar jaringan rel melingkar lengkap dengan Lokomotif Uap Aether 3D dan Mesin Bor Tambang otomatis yang menambang bijih besi, emas, batu bara & Starfall.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => {
                          const rt = (window as any).__voxelRuntime;
                          if (rt?.world && rt?.player) {
                            MahakaryaNusantaraSystem.deployLocomotiveAndQuarry(
                              rt.world,
                              rt.player,
                              rt.audio,
                              rt.particles
                            );
                            refreshLocalState();
                          }
                        }}
                        className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors whitespace-nowrap"
                      >
                        Bangun Rel, Lokomotif & Bor 3D
                      </button>

                      <button
                        onClick={() => {
                          const rt = (window as any).__voxelRuntime;
                          MahakaryaNusantaraSystem.toggleRideLocomotive(rt?.audio);
                          refreshLocalState();
                        }}
                        disabled={!state.locomotiveActive}
                        className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-amber-500/40 text-amber-200 font-semibold text-xs cursor-pointer transition-colors whitespace-nowrap"
                      >
                        {state.locomotiveRiding ? 'Turun dari Kereta' : 'Naiki Lokomotif Uap'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STUDIO GAMELAN & ANGKLUNG 3D INTERAKTIF */}
              {activeTab === 'GAMELAN_STUDIO' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const rt = (window as any).__voxelRuntime;
                          if (rt?.world && rt?.player) {
                            MahakaryaNusantaraSystem.deployGamelanStage(
                              rt.world,
                              rt.player,
                              rt.audio,
                              rt.particles
                            );
                            refreshLocalState();
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors whitespace-nowrap"
                      >
                        Dirikan Pendopo Gamelan 3D di Dunia
                      </button>

                      {/* Scale Switcher: Pelog vs Slendro */}
                      <div className="flex items-center gap-1 p-1 bg-[#141a29] rounded-lg border border-slate-800">
                        {(['PELOG', 'SLENDRO'] as const).map((sc) => (
                          <button
                            key={sc}
                            onClick={() => {
                              MahakaryaNusantaraSystem.gamelanScale = sc;
                              refreshLocalState();
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                              state.gamelanScale === sc
                                ? 'bg-amber-500/25 text-amber-300 border border-amber-400/40'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Laras {sc === 'PELOG' ? 'Pelog' : 'Slendro'}
                          </button>
                        ))}
                      </div>

                      {/* Instrument Switcher */}
                      <div className="flex items-center gap-1 p-1 bg-[#141a29] rounded-lg border border-slate-800">
                        {(['SARON', 'BONANG', 'ANGKLUNG', 'GONG'] as const).map((inst) => (
                          <button
                            key={inst}
                            onClick={() => setInstrument(inst)}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                              instrument === inst
                                ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/40'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {inst === 'SARON'
                              ? 'Saron'
                              : inst === 'BONANG'
                              ? 'Bonang'
                              : inst === 'ANGKLUNG'
                              ? 'Angklung'
                              : 'Gong Ageng'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Auto Gending Player */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          MahakaryaNusantaraSystem.gamelanAutoSong =
                            MahakaryaNusantaraSystem.gamelanAutoSong === 'GENDING_SRIWIJAYA'
                              ? null
                              : 'GENDING_SRIWIJAYA';
                          refreshLocalState();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border cursor-pointer whitespace-nowrap ${
                          state.gamelanAutoSong === 'GENDING_SRIWIJAYA'
                            ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                      >
                        {state.gamelanAutoSong === 'GENDING_SRIWIJAYA'
                          ? 'Hentikan Gending'
                          : 'Putar Gending Sriwijaya'}
                      </button>
                    </div>
                  </div>

                  {/* Interactive 7-Key Bronze Saron / Angklung Bar Pad */}
                  <div className="grid grid-cols-7 gap-2 pt-1">
                    {PELOG_NOTES.map((n) => (
                      <button
                        key={n.idx}
                        onClick={() => {
                          const rt = (window as any).__voxelRuntime;
                          MahakaryaNusantaraSystem.strikeGamelanNote(
                            n.idx,
                            instrument,
                            rt?.audio,
                            rt?.stats
                          );
                          refreshLocalState();
                        }}
                        className="h-16 rounded-xl bg-gradient-to-b from-amber-500/30 to-amber-700/20 hover:from-amber-400/45 hover:to-amber-600/35 border border-amber-400/50 flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform cursor-pointer"
                      >
                        <span className="text-xs font-bold text-amber-200 whitespace-nowrap">
                          {n.label}
                        </span>
                        <span className="text-[10px] text-slate-300 whitespace-nowrap">
                          {n.saron}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: COMPANION KHODAM 3D, TURNAMEN ARENA PENDEKAR & CUACA EKSTREM */}
              {activeTab === 'KHODAM_ARENA' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Companion Khodam Selector */}
                  <div className="p-3 rounded-xl bg-[#121726] border border-slate-800 flex flex-col justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-emerald-300 mb-1">
                        Companion Khodam Pendamping 3D
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        Roh penjaga Nusantara yang mengorbit pemain & menyerang musuh otomatis.
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {(Object.keys(KHODAM_COMPANIONS) as KhodamCompanionId[]).map((kId) => {
                        const kDef = KHODAM_COMPANIONS[kId];
                        const isSelected = state.activeKhodamId === kId;
                        return (
                          <button
                            key={kId}
                            onClick={() => {
                              const rt = (window as any).__voxelRuntime;
                              if (rt?.player) {
                                MahakaryaNusantaraSystem.selectAndSummonKhodam(
                                  kId,
                                  rt.player,
                                  rt.audio,
                                  rt.particles
                                );
                                refreshLocalState();
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-left text-xs font-semibold border transition-colors cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                            }`}
                          >
                            <span className="truncate">{kDef.name}</span>
                            <span className="text-[10px] font-mono tabular-nums text-emerald-300 shrink-0 ml-2">
                              {kDef.attackDamage} DMG
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pendekar Tournament Arena */}
                  <div className="p-3 rounded-xl bg-[#121726] border border-slate-800 flex flex-col justify-between gap-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-amber-300">
                          Gelanggang Turnamen Pendekar
                        </h4>
                        <span className="text-[11px] font-mono tabular-nums text-slate-400">
                          {state.arenaActive
                            ? `Babak ${state.arenaWave}/${state.arenaMaxWaves}`
                            : 'Siap Tantang'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Bangun arena batu candi terbuka dan hadapi 3 gelombang pendekar bayangan serta Bos Naga untuk memenangkan Mustika & Mutiara Pusaka.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const rt = (window as any).__voxelRuntime;
                        if (rt?.world && rt?.entities && rt?.player) {
                          MahakaryaNusantaraSystem.startPendekarTournamentArena(
                            rt.world,
                            rt.entities,
                            rt.player,
                            rt.audio,
                            rt.particles
                          );
                          refreshLocalState();
                        }
                      }}
                      className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors whitespace-nowrap"
                    >
                      {state.arenaActive
                        ? `Turnamen Berlangsung (Babak ${state.arenaWave}/3)`
                        : 'Mulai Turnamen Arena Pendekar'}
                    </button>
                  </div>

                  {/* Extreme Weather & Volcanic Eruption */}
                  <div className="p-3 rounded-xl bg-[#121726] border border-slate-800 flex flex-col justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-rose-300 mb-1">
                        Cuaca Ekstrem & Erupsi Vulkanik
                      </h4>
                      <p className="text-[11px] text-slate-300">
                        Aktif: <strong className="text-white">{state.weatherEventName}</strong>
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: 'VOLCANIC_ERUPTION', label: 'Erupsi Merapi' },
                          { id: 'EQUATORIAL_THUNDERSTORM', label: 'Badai Petir' },
                          { id: 'MYSTIC_CALDERA_MIST', label: 'Aurora Kawah' },
                          { id: 'CLEAR', label: 'Langit Cerah' },
                        ] as { id: ExtremeWeatherEventId; label: string }[]
                      ).map((w) => (
                        <button
                          key={w.id}
                          onClick={() => {
                            const rt = (window as any).__voxelRuntime;
                            if (rt?.player) {
                              MahakaryaNusantaraSystem.triggerExtremeWeatherEvent(
                                w.id,
                                rt.player,
                                rt.sky,
                                rt.weather,
                                rt.audio
                              );
                              refreshLocalState();
                            }
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer whitespace-nowrap ${
                            state.weatherEventId === w.id
                              ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                          }`}
                        >
                          {w.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: KUSTOMISASI BUSANA BATIK & MODE FOTO SINEMATIK 3D (FREE-CAM) */}
              {activeTab === 'BUSANA_FOTO' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Wardrobe Selector */}
                  <div className="p-3 rounded-xl bg-[#121726] border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-amber-300">
                        Kustomisasi Jubah Batik & Zirah Prajurit 3D
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        Tampil langsung di model 3D
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(NUSANTARA_WARDROBE_OUTFITS) as NusantaraWardrobeId[]).map(
                        (oId) => {
                          const oDef = NUSANTARA_WARDROBE_OUTFITS[oId];
                          const isEquipped = state.activeWardrobeId === oId;
                          return (
                            <button
                              key={oId}
                              onClick={() => {
                                const rt = (window as any).__voxelRuntime;
                                if (rt?.player) {
                                  MahakaryaNusantaraSystem.equipWardrobeOutfit(
                                    oId,
                                    rt.player,
                                    rt.stats,
                                    rt.audio
                                  );
                                  refreshLocalState();
                                }
                              }}
                              className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                                isEquipped
                                  ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                              }`}
                            >
                              <div className="text-xs font-bold truncate">{oDef.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {oDef.originRegion}
                              </div>
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>

                  {/* 3D Free-Cam Photo Mode Studio Controls */}
                  <div className="p-3 rounded-xl bg-[#121726] border border-slate-800 flex flex-col justify-between gap-2.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-sky-300">
                        Mode Foto Sinematik 3D & Kamera Bebas (Free-Cam)
                      </h4>
                      <span className="text-[11px] font-mono tabular-nums text-sky-300">
                        FOV {state.photoFov}°
                      </span>
                    </div>

                    {/* FOV Slider & Frame Selector */}
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-400 shrink-0">Lensa FOV</span>
                      <input
                        type="range"
                        min={35}
                        max={100}
                        value={state.photoFov}
                        onChange={(e) => {
                          MahakaryaNusantaraSystem.photoFov = Number(e.target.value);
                          refreshLocalState();
                        }}
                        className="flex-1 accent-sky-400 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {(
                          [
                            { id: 'UKIRAN_MAJAPAHIT', label: 'Bingkai Majapahit' },
                            { id: 'WAYANG_KLASIK', label: 'Wayang' },
                            { id: 'SINEMA_21_9', label: 'Sinema 21:9' },
                            { id: 'NONE', label: 'Polos' },
                          ] as { id: PhotoFrameStyleId; label: string }[]
                        ).map((f) => (
                          <button
                            key={f.id}
                            onClick={() => {
                              MahakaryaNusantaraSystem.photoFrame = f.id;
                              refreshLocalState();
                            }}
                            className={`px-2 py-1 rounded text-[10px] font-semibold border cursor-pointer whitespace-nowrap ${
                              state.photoFrame === f.id
                                ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            const rt = (window as any).__voxelRuntime;
                            if (rt?.player && rt?.camera) {
                              MahakaryaNusantaraSystem.togglePhotoMode(
                                rt.player,
                                rt.camera,
                                rt.audio
                              );
                              refreshLocalState();
                            }
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap ${
                            state.photoModeActive
                              ? 'bg-rose-500 text-white'
                              : 'bg-sky-500 text-slate-950'
                          }`}
                        >
                          {state.photoModeActive ? 'Keluar Free-Cam' : 'Aktifkan Free-Cam'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
