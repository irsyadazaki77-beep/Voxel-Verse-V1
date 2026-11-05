// Multiplayer Co-op Party, Guild & Authoritative Replication Interface
import React, { useState, useEffect } from 'react';
import { NetworkSession } from '../engine/network/NetworkSession';
import { MultiplayerHarness } from '../engine/network/MultiplayerHarness';
import { TransportStats } from '../engine/network/NetworkTransport';
import { CharacterProgressionManager, CoopPartyMember } from '../engine/progression/CharacterProgressionManager';
import { NotificationManager } from '../engine/ui/NotificationManager';
import { Users, Shield, Navigation, Heart, Radio, MessageSquare, X } from 'lucide-react';

interface MultiplayerLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: NetworkSession;
  playerPos: [number, number, number];
}

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  isOpen,
  onClose,
  session,
  playerPos,
}) => {
  const [activeTab, setActiveTab] = useState<'party_guild' | 'network_chat'>('party_guild');
  const [harnessActive, setHarnessActive] = useState(MultiplayerHarness.isActive());
  const [stats, setStats] = useState<TransportStats>(session.getStats());
  const [latency, setLatency] = useState(25);
  const [jitter, setJitter] = useState(5);
  const [lossRate, setLossRate] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ senderName: string; text: string }>>([]);

  const [partyName, setPartyName] = useState(CharacterProgressionManager.partyState.partyName);
  const [guildTag, setGuildTag] = useState(CharacterProgressionManager.partyState.guildTag);
  const [sharedQuestSync, setSharedQuestSync] = useState(CharacterProgressionManager.partyState.sharedQuestSync);
  const [partyMembers, setPartyMembers] = useState<CoopPartyMember[]>(CharacterProgressionManager.partyState.members);

  useEffect(() => {
    const unsub = session.onChat((msg) => {
      setChatMessages((prev) => [...prev, { senderName: msg.senderName, text: msg.text }]);
    });
    return unsub;
  }, [session]);

  useEffect(() => {
    const unsubProg = CharacterProgressionManager.subscribe(() => {
      setPartyName(CharacterProgressionManager.partyState.partyName);
      setGuildTag(CharacterProgressionManager.partyState.guildTag);
      setSharedQuestSync(CharacterProgressionManager.partyState.sharedQuestSync);
      setPartyMembers([...CharacterProgressionManager.partyState.members]);
    });
    return unsubProg;
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setStats(session.getStats());
      session.setSimulationParams(latency, jitter, lossRate);
    }, 500);
    return () => clearInterval(timer);
  }, [session, latency, jitter, lossRate]);

  if (!isOpen) return null;

  const toggleHarness = () => {
    if (harnessActive) {
      MultiplayerHarness.stop(session);
      setHarnessActive(false);
    } else {
      MultiplayerHarness.start(session, playerPos);
      setHarnessActive(true);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    session.sendChat(chatInput.trim());
    setChatInput('');
  };

  const handleSavePartySettings = () => {
    CharacterProgressionManager.updatePartyConfig({
      partyName: partyName.trim() || 'Ekspedisi Garuda Nusantara',
      guildTag: (guildTag.trim() || 'NSNT').toUpperCase().slice(0, 5),
      sharedQuestSync,
    });
    NotificationManager.push({
      title: 'Konfigurasi Party & Guild Disimpan',
      message: `[${guildTag.toUpperCase()}] ${partyName} aktif (${sharedQuestSync ? 'Sinkronisasi Quest & XP Aktif' : 'Progres Mandiri'}).`,
      priority: 'NORMAL',
      colorTheme: 'sky',
      durationMs: 3000,
    });
  };

  const handleTeleportToMember = (member: CoopPartyMember) => {
    const rt = (window as any).__voxelRuntime;
    if (rt && rt.player) {
      rt.player.position.set(member.position[0], member.position[1], member.position[2]);
      rt.player.velocity.set(0, 0, 0);
      rt.audio?.playItemCollect?.();
      NotificationManager.push({
        title: `Bergabung ke Posisi ${member.name}`,
        message: `Berpindah ke koordinat [${member.position.join(', ')}].`,
        priority: 'NORMAL',
        colorTheme: 'emerald',
        durationMs: 2800,
      });
      onClose();
    }
  };

  const handleRallyPartyToPlayer = () => {
    const rt = (window as any).__voxelRuntime;
    const px = Math.round(playerPos[0]);
    const py = Math.round(playerPos[1]);
    const pz = Math.round(playerPos[2]);
    const updated = partyMembers.map((m, idx) => ({
      ...m,
      health: m.maxHealth,
      position: [px + (idx === 0 ? 3 : -3), py, pz + 3] as [number, number, number],
    }));
    CharacterProgressionManager.updatePartyConfig({ members: updated });
    rt?.audio?.playAncientGong?.();
    NotificationManager.push({
      title: 'Panggilan Kumpul Party Nusantara!',
      message: 'Seluruh rekan Party dipulihkan dan berkumpul di koordinat Anda.',
      priority: 'HIGH',
      colorTheme: 'amber',
      durationMs: 3200,
    });
  };

  return (
    <div
      id="modal-multiplayer-lobby"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in font-sans select-none"
    >
      <div className="w-full max-w-3xl bg-[#090d16] rounded-2xl border border-white/10 p-6 shadow-2xl space-y-5 text-slate-100 flex flex-col max-h-[86vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-300">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                Lobi Co-op Party, Guild & Jaringan Realm
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                [{guildTag}] {partyName} · Sinkronisasi Server Authoritative
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-white/10 rounded-xl">
              <button
                onClick={() => setActiveTab('party_guild')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'party_guild'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Party & Guild ({partyMembers.length + 1}/4)
              </button>
              <button
                onClick={() => setActiveTab('network_chat')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  activeTab === 'network_chat'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                Telemetri & Chat
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {activeTab === 'party_guild' ? (
            <div className="space-y-5">
              {/* Guild & Party Identity Bar */}
              <div className="p-4 rounded-xl bg-[#0e1525] border border-white/10 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-xs text-slate-400 mb-1">Tag Guild</label>
                    <input
                      type="text"
                      maxLength={5}
                      value={guildTag}
                      onChange={(e) => setGuildTag(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs font-mono font-bold text-amber-300 uppercase"
                    />
                  </div>
                  <div className="sm:col-span-6">
                    <label className="block text-xs text-slate-400 mb-1">Nama Party / Ekspedisi</label>
                    <input
                      type="text"
                      value={partyName}
                      onChange={(e) => setPartyName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-white/10 text-xs text-white"
                    />
                  </div>
                  <div className="sm:col-span-3 flex items-end">
                    <button
                      onClick={handleSavePartySettings}
                      className="w-full py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs cursor-pointer transition-colors"
                    >
                      Simpan Identitas
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                    <input
                      type="checkbox"
                      checked={sharedQuestSync}
                      onChange={(e) => {
                        setSharedQuestSync(e.target.checked);
                        CharacterProgressionManager.updatePartyConfig({ sharedQuestSync: e.target.checked });
                      }}
                      className="accent-amber-400"
                    />
                    <span>Bagi Progres Quest, Bounty & Bonus XP Party (+15% Co-op Synergy)</span>
                  </label>

                  <button
                    onClick={handleRallyPartyToPlayer}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-medium text-xs cursor-pointer"
                  >
                    Kumpulkan & Pulihkan Party di Sini
                  </button>
                </div>
              </div>

              {/* Active Party Roster */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-slate-300">
                  Daftar Anggota Party Aktif
                </div>

                {/* Local Player Leader Row */}
                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-400/40 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <span>[{guildTag}] Anda (Pemimpin Party)</span>
                      <span className="text-xs font-normal text-amber-300">
                        · {CharacterProgressionManager.getDominantArchetypeTitle()}
                      </span>
                    </div>
                    <div className="text-xs font-mono tabular-nums text-slate-400">
                      Posisi [{Math.round(playerPos[0])}, {Math.round(playerPos[1])}, {Math.round(playerPos[2])}] · Status Aktif
                    </div>
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-semibold">Leader</span>
                </div>

                {/* Companion / Remote Members */}
                {partyMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-3.5 rounded-xl bg-[#0e1525] border border-white/10 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <span>[{guildTag}] {member.name}</span>
                        <span className="text-xs font-mono text-sky-300">
                          · Lv.{member.level} {member.role}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-400">
                        <span className="text-rose-400">
                          HP {member.health}/{member.maxHealth}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Koordinat [{member.position[0]}, {member.position[1]}, {member.position[2]}]
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleTeleportToMember(member)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-xs font-medium text-sky-300 cursor-pointer whitespace-nowrap"
                      >
                        Teleport ke Rekan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Harness Control Panel */}
              <div className="bg-[#0e1525] border border-white/10 p-4 rounded-xl flex items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-emerald-300 text-xs">
                    Simulasi Rekan Penjelajah Jarak Jauh (20 Hz Sync)
                  </div>
                  <p className="text-xs text-slate-400">
                    Menghadirkan avatar penjelajah kedua secara real-time untuk menguji interpolasi gerakan dan replikasi blok.
                  </p>
                </div>
                <button
                  onClick={toggleHarness}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                    harnessActive
                      ? 'bg-rose-500 hover:bg-rose-400 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  {harnessActive ? 'Hentikan Avatar Bot' : 'Panggil Avatar Rekan'}
                </button>
              </div>

              {/* Network Metrics & Simulator Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-[#0e1525] border border-white/10 p-4 rounded-xl space-y-2 text-xs font-mono tabular-nums">
                  <div className="font-bold text-slate-300 border-b border-white/10 pb-1.5">
                    Telemetri Transport WebSocket
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ping / Latency:</span>
                    <span className="text-sky-400 font-bold">{stats.pingMs} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Paket (TX/RX):</span>
                    <span className="text-slate-200">{stats.packetsSent} / {stats.packetsReceived}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Data (TX/RX):</span>
                    <span className="text-slate-200">{stats.bytesSent} B / {stats.bytesReceived} B</span>
                  </div>
                </div>

                <div className="bg-[#0e1525] border border-white/10 p-4 rounded-xl space-y-2 text-xs">
                  <div className="font-bold text-slate-300 border-b border-white/10 pb-1.5 font-mono">
                    Simulasi Kondisi Jaringan
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between font-mono tabular-nums">
                      <span className="text-slate-400">Latensi Simulasi:</span>
                      <span className="text-amber-300">{latency} ms</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="250"
                      value={latency}
                      onChange={(e) => setLatency(parseInt(e.target.value, 10))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between font-mono tabular-nums">
                      <span className="text-slate-400">Packet Loss:</span>
                      <span className="text-rose-300">{(lossRate * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="0.2"
                      step="0.02"
                      value={lossRate}
                      onChange={(e) => setLossRate(parseFloat(e.target.value))}
                      className="w-full accent-rose-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Chat Feed */}
              <div className="space-y-2 flex-1 flex flex-col min-h-[140px]">
                <div className="font-semibold text-slate-300 text-xs">Obrolan Party & Realm</div>
                <div className="flex-1 bg-slate-950 border border-white/10 rounded-xl p-3 overflow-y-auto space-y-1 text-xs font-mono max-h-32">
                  {chatMessages.length === 0 ? (
                    <span className="text-slate-500 text-xs">Belum ada pesan obrolan...</span>
                  ) : (
                    chatMessages.map((m, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="font-bold text-sky-400">&lt;{m.senderName}&gt;</span>
                        <span className="text-slate-200">{m.text}</span>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendChat} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ketik pesan ke anggota Party..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-lg text-xs cursor-pointer"
                  >
                    Kirim
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
