// VoxelVerse v6.0.0: Panel Terpadu Era Keemasan Nusantara
// Menyatukan: Studio Batik 16x16, Pujangga AI & Prasasti, Subak 2.0 & Gua Karst, Multi-Crew & Gelanggang Duel, Blueprint UGC & Gamepad
import React, { useState } from 'react';
import * as THREE from 'three';
import {
  SubakAndBatikSystem,
  BATIK_PALETTE,
  BatikPresetId,
} from '../engine/systems/SubakAndBatikSystem';
import {
  MultiplayerArenaSystem,
  VehicleCrewSeat,
} from '../engine/systems/MultiplayerArenaSystem';
import {
  NusantaraAIService,
  PrasastiDecipherResult,
  KidungVerseResult,
} from '../engine/ai/NusantaraAIService';
import { VernacularHologramSystem } from '../engine/systems/VernacularHologramSystem';

export const EraKeemasanPanel: React.FC = () => {
  const [subTab, setSubTab] = useState<'BATIK' | 'PUJANGGA' | 'SUBAK_KARST' | 'ARENA_CREW' | 'UGC_GAMEPAD'>('BATIK');

  // Batik Studio state
  const [selectedColor, setSelectedColor] = useState<string>(BATIK_PALETTE[2]);
  const [batikGrid, setBatikGrid] = useState<string[]>(() => [...SubakAndBatikSystem.batikGrid]);
  const [batikPreset, setBatikPreset] = useState<BatikPresetId>(SubakAndBatikSystem.activePreset);

  // Pujangga AI state
  const [aiBusy, setAiBusy] = useState(false);
  const [prasastiResult, setPrasastiResult] = useState<PrasastiDecipherResult | null>(null);
  const [kidungResult, setKidungResult] = useState<KidungVerseResult | null>(
    () => NusantaraAIService.savedKidungList[0] || null
  );

  // Subak & Arena telemetry refresh
  const [, setTick] = useState(0);
  const bump = () => setTick((v) => v + 1);

  // Blueprint UGC state
  const [bpCode, setBpCode] = useState<string>('');
  const [bpStatus, setBpStatus] = useState<string>('');

  const getRuntime = () => (window as any).__voxelRuntime;

  const handlePaintCell = (idx: number) => {
    const x = idx % 16;
    const y = Math.floor(idx / 16);
    SubakAndBatikSystem.paintBatikPixel(x, y, selectedColor);
    setBatikGrid([...SubakAndBatikSystem.batikGrid]);
  };

  const handlePreset = (preset: BatikPresetId) => {
    setBatikPreset(preset);
    const next = SubakAndBatikSystem.applyBatikPreset(preset);
    setBatikGrid([...next]);
  };

  const handleDecipherPrasasti = async () => {
    setAiBusy(true);
    const rt = getRuntime();
    const pos: [number, number, number] = rt?.player?.position
      ? [rt.player.position.x, rt.player.position.y, rt.player.position.z]
      : [0, 66, 0];
    const result = await NusantaraAIService.decipherPrasasti({
      biome: 'Nusantara',
      playerPos: pos,
      playerLevel: rt?.stats?.level || 1,
      seed: Math.floor(Math.random() * 9999),
    });
    setPrasastiResult(result);
    setAiBusy(false);
  };

  const handleComposeKidung = async () => {
    setAiBusy(true);
    const rt = getRuntime();
    const result = await NusantaraAIService.composeKidung({
      playerName: 'Satria Nusantara',
      level: rt?.stats?.level || 1,
      defeatedBosses: rt?.gameStats?.bossesDefeated || 1,
      structuresBuilt: VernacularHologramSystem.TEMPLATES.length,
      activeKhodam: null,
    });
    setKidungResult(result);
    setAiBusy(false);
  };

  const subakTel = SubakAndBatikSystem.getTelemetry();
  const arenaTel = MultiplayerArenaSystem.getTelemetry();
  const rt = getRuntime();
  const gamepadInfo = rt?.inputManager?.getConnectedGamepadInfo?.() || {
    connected: false,
    name: 'Tidak Terhubung',
  };

  return (
    <div className="space-y-3 text-xs text-slate-200">
      {/* Sub-navigation Pills */}
      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ['BATIK', '🎨 Studio Batik 16×16'],
            ['PUJANGGA', '📜 Pujangga AI & Prasasti'],
            ['SUBAK_KARST', '🎋 Subak 2.0 & Gua Karst'],
            ['ARENA_CREW', '⚓ Multi-Crew & Gelanggang'],
            ['UGC_GAMEPAD', '📐 Blueprint & Gamepad'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
              subTab === id
                ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                : 'bg-slate-900/70 border-slate-700/70 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 1. STUDIO BATIK TULIS 16x16 */}
      {subTab === 'BATIK' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/70 border border-amber-500/25 rounded-xl p-3">
          <div className="flex flex-col items-center gap-2">
            <div className="text-[11px] font-bold text-amber-300">
              Kanvas Canting & Malam (16×16) — {batikPreset}
            </div>
            <div
              className="grid border border-amber-500/40 rounded overflow-hidden"
              style={{ gridTemplateColumns: 'repeat(16, 12px)', gridTemplateRows: 'repeat(16, 12px)' }}
            >
              {batikGrid.map((hex, i) => (
                <button
                  key={i}
                  onClick={() => handlePaintCell(i)}
                  style={{ backgroundColor: hex, width: 12, height: 12 }}
                  className="p-0 border-0 hover:opacity-80"
                  title={`Pixel (${i % 16}, ${Math.floor(i / 16)})`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <div>
              <div className="text-[11px] text-slate-400 mb-1">Palet Pewarna Alam Soga & Nila:</div>
              <div className="flex flex-wrap gap-1.5">
                {BATIK_PALETTE.map((hex) => (
                  <button
                    key={hex}
                    onClick={() => setSelectedColor(hex)}
                    style={{ backgroundColor: hex }}
                    className={`w-6 h-6 rounded-md border-2 ${
                      selectedColor === hex ? 'border-white scale-110' : 'border-slate-700'
                    }`}
                    title={hex}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="text-[11px] text-slate-400 mb-1">Pola Tradisional Cepat:</div>
              <div className="grid grid-cols-2 gap-1.5">
                {(['PARANG_RUSAK', 'MEGAMENDUNG', 'KAWUNG_MATARAM', 'TRUNTUM'] as BatikPresetId[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePreset(p)}
                    className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] font-semibold"
                  >
                    {p.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                const p = rt?.player?.position;
                SubakAndBatikSystem.placeBatikBannerInWorld(
                  p ? [p.x, p.y, p.z] : [0, 65, 0],
                  rt?.audio
                );
                bump();
              }}
              className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow"
            >
              🚩 Kibarkan Panji Batik 3D di Dunia ({subakTel.activeBatikBannerCount})
            </button>
          </div>
        </div>
      )}

      {/* 2. SUARA SANG PUJANGGA (GEMINI AI) */}
      {subTab === 'PUJANGGA' && (
        <div className="space-y-2.5 bg-slate-950/70 border border-cyan-500/25 rounded-xl p-3">
          <div className="flex flex-wrap gap-2">
            <button
              disabled={aiBusy}
              onClick={handleDecipherPrasasti}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold"
            >
              {aiBusy ? '⏳ Menafsirkan...' : '🪨 Dekripsi Prasasti Kuno (AI)'}
            </button>
            <button
              disabled={aiBusy}
              onClick={handleComposeKidung}
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold"
            >
              {aiBusy ? '⏳ Menggubah...' : '🎵 Gubah Kidung Pujangga (AI)'}
            </button>
          </div>

          {prasastiResult && (
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-cyan-500/30 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-cyan-300">{prasastiResult.title}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 uppercase">
                  {prasastiResult.source}
                </span>
              </div>
              <div className="italic text-amber-300/90 text-[11px]">{prasastiResult.kawiScript}</div>
              <p className="text-slate-200">{prasastiResult.translation}</p>
              <div className="text-emerald-300 font-mono text-[11px]">
                🧭 {prasastiResult.riddle}
              </div>
            </div>
          )}

          {kidungResult && (
            <div className="p-2.5 rounded-lg bg-slate-900/90 border border-purple-500/30 space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-purple-300">{kidungResult.title}</span>
                <span className="text-[10px] text-slate-400">{kidungResult.pupuhStyle}</span>
              </div>
              <div className="space-y-0.5 italic text-slate-200">
                {kidungResult.stanzas.map((line, idx) => (
                  <div key={idx}>“{line}”</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. SUBAK 2.0 & GUA KARST MAROS */}
      {subTab === 'SUBAK_KARST' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-950/70 border border-emerald-500/25 rounded-xl p-3">
          <div className="space-y-2">
            <div className="font-bold text-emerald-300">
              🎋 Irigasi Subak 2.0 ({subakTel.openSluiceCount}/{subakTel.sluiceGateCount} Pintu Terbuka)
            </div>
            <div className="text-[11px] text-slate-400">
              Lesung Padi: {subakTel.lesungCount} · Beras Ditumbuk: {subakTel.totalRiceMilled}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => {
                  const p = rt?.player?.position;
                  if (rt?.world) {
                    SubakAndBatikSystem.buildSubakAqueductAndSluice(
                      rt.world,
                      p ? [p.x, p.y, p.z + 3] : [0, 65, 3],
                      rt?.audio,
                      rt?.particles
                    );
                    bump();
                  }
                }}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                + Pasang Talang Bambu
              </button>
              <button
                onClick={() => {
                  SubakAndBatikSystem.toggleAllSluiceGates(rt?.world, rt?.audio);
                  bump();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-sky-700 hover:bg-sky-600 text-white font-semibold"
              >
                🌊 Buka/Tutup Pintu Air
              </button>
              <button
                onClick={() => {
                  const p = rt?.player?.position;
                  SubakAndBatikSystem.spawnLesungPadiOtomatis(
                    p ? [p.x, p.y, p.z] : [0, 65, 0],
                    rt?.audio
                  );
                  bump();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold"
              >
                🌾 Dirikan Lesung Otomatis
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-bold text-cyan-300">🦇 Ekspedisi Gua Karst Maros-Pangkep</div>
            <div className="text-[11px] text-slate-400">
              {subakTel.karstCavePos
                ? `Ditemukan di [${subakTel.karstCavePos.join(', ')}]`
                : 'Belum dipetakan — buka celah karst bawah tanah dengan stalaktit & lukisan cadas bercahaya.'}
            </div>
            <button
              onClick={() => {
                const p = rt?.player?.position;
                if (rt?.world) {
                  SubakAndBatikSystem.summonKarstCaveExpedition(
                    rt.world,
                    p ? [p.x, p.y, p.z] : [0, 65, 0],
                    rt?.audio,
                    rt?.particles
                  );
                  bump();
                }
              }}
              className="w-full py-2 rounded-lg bg-cyan-700 hover:bg-cyan-600 text-white font-bold"
            >
              🕳️ Buka Gua Karst & Lukisan Cadas Purba
            </button>
          </div>
        </div>
      )}

      {/* 4. MULTI-CREW VEHICLES, GELANGGANG DUEL & VOICE SPASIAL */}
      {subTab === 'ARENA_CREW' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-950/70 border border-rose-500/25 rounded-xl p-3">
          <div className="space-y-2">
            <div className="font-bold text-sky-300">
              ⚓ Multi-Crew Phinisi & Nanggala ({arenaTel.activeCrewSeat})
            </div>
            <div className="flex flex-wrap gap-1">
              {(['HELM', 'CETBANG_GUNNER', 'SONAR_OPERATOR'] as VehicleCrewSeat[]).map((seat) => (
                <button
                  key={seat}
                  onClick={() => {
                    MultiplayerArenaSystem.setCrewSeat(seat, rt?.audio);
                    bump();
                  }}
                  className={`px-2 py-1 rounded text-[10px] font-bold border ${
                    arenaTel.activeCrewSeat === seat
                      ? 'bg-sky-600 border-sky-400 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  {seat.replace('_', ' ')}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  const pos = rt?.player?.position || new THREE.Vector3(0, 66, 0);
                  const dir = new THREE.Vector3(0, 0, -1);
                  if (rt?.camera) rt.camera.getWorldDirection(dir);
                  MultiplayerArenaSystem.fireCetbangCannon(pos, dir, rt?.audio, rt?.particles);
                  bump();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-bold"
              >
                💥 Tembak Meriam Cetbang ({arenaTel.cetbangShotsFired})
              </button>
              <button
                onClick={() => {
                  MultiplayerArenaSystem.toggleProximityVoice();
                  bump();
                }}
                className={`px-2.5 py-1.5 rounded-lg font-bold ${
                  arenaTel.voice.enabled
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {arenaTel.voice.enabled ? '🎙️ Voice 3D ON' : '🔇 Voice 3D OFF'}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-bold text-amber-300">
              ⚔️ Gelanggang Tanding Pendekar 1v1
            </div>
            <div className="text-[11px] text-slate-300">
              {arenaTel.duel.active
                ? `Ronde ${arenaTel.duel.round}/${arenaTel.duel.maxRounds} · Anda ${arenaTel.duel.playerWins}-${arenaTel.duel.opponentWins} ${arenaTel.duel.opponentName} (HP Lawan: ${arenaTel.duel.opponentHp})`
                : 'Siap bertanding 3 ronde dengan gong wasit & slow-mo finishing.'}
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  const p = rt?.player?.position;
                  MultiplayerArenaSystem.startSilatDuel(
                    p ? [p.x, p.y, p.z] : [0, 65, 0],
                    'Pendekar Bayangan',
                    25,
                    rt?.audio
                  );
                  bump();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold"
              >
                🔔 Mulai Duel 1v1
              </button>
              {arenaTel.duel.active && (
                <button
                  onClick={() => {
                    MultiplayerArenaSystem.registerDuelStrike('PLAYER', 38, rt?.audio);
                    bump();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  🗡️ Jurus Keris (+38)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. BLUEPRINT UGC EXPORTER/IMPORTER & GAMEPAD */}
      {subTab === 'UGC_GAMEPAD' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-950/70 border border-indigo-500/25 rounded-xl p-3">
          <div className="space-y-2">
            <div className="font-bold text-indigo-300">📐 Blueprint Arsitektur Komunitas (UGC)</div>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  const tmpl = VernacularHologramSystem.getActiveTemplate();
                  const code = VernacularHologramSystem.exportBlueprintCode(tmpl);
                  setBpCode(code);
                  setBpStatus(`Diekspor: ${tmpl.name} (${tmpl.blocks.length} blok)`);
                }}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                📤 Ekspor Template Aktif
              </button>
              <button
                onClick={() => {
                  const imported = VernacularHologramSystem.importBlueprintCode(bpCode);
                  setBpStatus(
                    imported
                      ? `✅ Diimpor: ${imported.name} (${imported.blocks.length} blok)`
                      : '❌ Kode blueprint tidak valid (harus diawali VVBP1:)'
                  );
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              >
                📥 Impor Kode
              </button>
            </div>
            <textarea
              value={bpCode}
              onChange={(e) => setBpCode(e.target.value)}
              placeholder="Tempel kode blueprint VVBP1:... di sini"
              className="w-full h-14 p-1.5 rounded bg-slate-900 border border-slate-700 font-mono text-[10px] text-slate-200"
            />
            {bpStatus && <div className="text-[10px] text-amber-300">{bpStatus}</div>}
          </div>

          <div className="space-y-2">
            <div className="font-bold text-emerald-300">🎮 Dukungan Gamepad & Haptic Rumble</div>
            <div className="text-[11px] text-slate-300">
              Status: {gamepadInfo.connected ? `🟢 Terhubung (${gamepadInfo.name})` : '⚪ Menunggu Stik/Controller'}
            </div>
            <div className="text-[10px] text-slate-400">
              Stik Kiri: Gerak · Stik Kanan: Kamera · A/Cross: Lompat · X/RT: Tebas Keris · B: Elak · LB/RB: Hotbar
            </div>
            <button
              onClick={() => {
                rt?.inputManager?.triggerGamepadRumble?.(0.8, 0.4, 220);
                rt?.audio?.playAncientGong();
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-semibold"
            >
              📳 Uji Getaran Haptic Controller
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
