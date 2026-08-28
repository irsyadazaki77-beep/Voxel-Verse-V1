// Multiplayer Lobby & Testing Harness Interface
import React, { useState, useEffect } from 'react';
import { NetworkSession } from '../engine/network/NetworkSession';
import { MultiplayerHarness } from '../engine/network/MultiplayerHarness';
import { TransportStats } from '../engine/network/NetworkTransport';

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
  const [harnessActive, setHarnessActive] = useState(MultiplayerHarness.isActive());
  const [stats, setStats] = useState<TransportStats>(session.getStats());
  const [latency, setLatency] = useState(25);
  const [jitter, setJitter] = useState(5);
  const [lossRate, setLossRate] = useState(0);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ senderName: string; text: string }>>([]);

  useEffect(() => {
    const unsub = session.onChat((msg) => {
      setChatMessages((prev) => [...prev, { senderName: msg.senderName, text: msg.text }]);
    });
    return unsub;
  }, [session]);

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

  return (
    <div id="modal-multiplayer-lobby" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans select-none">
      <div className="w-full max-w-2xl bg-[#0c0e15] rounded-3xl border border-white/15 p-6 shadow-2xl space-y-6 text-white flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)]"></div>
            <div>
              <h2 className="text-lg font-black tracking-wider uppercase">Multiplayer Replication Harness</h2>
              <span className="text-[10px] text-emerald-400 font-mono">Local Loopback Architecture Foundation</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-xs font-mono transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Harness Control Panel */}
        <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <div className="font-bold text-emerald-300 text-xs">Simulated Remote Explorer (20 Hz Sync)</div>
            <p className="text-[10px] text-white/50">Spawns simulated player 'Aetheria_Explorer_02' to test movement interpolation & block changes in real time.</p>
          </div>
          <button
            onClick={toggleHarness}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
              harnessActive ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-lg' : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg'
            }`}
          >
            {harnessActive ? 'Disconnect Bot' : 'Spawn Test Bot'}
          </button>
        </div>

        {/* Network Metrics & Simulator Controls */}
        <div className="grid grid-cols-2 gap-4">
          {/* Telemetry */}
          <div className="bg-black/40 border border-white/5 p-3 rounded-2xl space-y-2 text-xs font-mono">
            <div className="font-bold text-white/70 uppercase tracking-wider text-[10px] border-b border-white/10 pb-1">Transport Telemetry</div>
            <div className="flex justify-between"><span>Ping / Latency:</span><span className="text-sky-400 font-bold">{stats.pingMs} ms</span></div>
            <div className="flex justify-between"><span>Packets (TX/RX):</span><span className="text-white/80">{stats.packetsSent} / {stats.packetsReceived}</span></div>
            <div className="flex justify-between"><span>Bytes (TX/RX):</span><span className="text-white/80">{stats.bytesSent} B / {stats.bytesReceived} B</span></div>
          </div>

          {/* Network Simulator */}
          <div className="bg-black/40 border border-white/5 p-3 rounded-2xl space-y-2 text-xs">
            <div className="font-bold text-white/70 uppercase tracking-wider text-[10px] border-b border-white/10 pb-1 font-mono">Network Condition Simulator</div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono"><span>Simulated Latency:</span><span className="text-amber-300">{latency} ms</span></div>
              <input type="range" min="0" max="250" value={latency} onChange={(e) => setLatency(parseInt(e.target.value, 10))} className="w-full accent-amber-400 cursor-pointer" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono"><span>Packet Loss:</span><span className="text-rose-300">{(lossRate * 100).toFixed(0)}%</span></div>
              <input type="range" min="0" max="0.2" step="0.02" value={lossRate} onChange={(e) => setLossRate(parseFloat(e.target.value))} className="w-full accent-rose-400 cursor-pointer" />
            </div>
          </div>
        </div>

        {/* Chat Feed */}
        <div className="space-y-2 flex-1 flex flex-col min-h-[140px]">
          <div className="font-bold text-white/70 text-xs font-mono">Session Text Chat Feed</div>
          <div className="flex-1 bg-black/50 border border-white/10 rounded-2xl p-3 overflow-y-auto space-y-1 text-xs font-mono max-h-32">
            {chatMessages.length === 0 ? (
              <span className="text-white/30 italic text-[11px]">No chat messages yet...</span>
            ) : (
              chatMessages.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <span className="font-bold text-sky-400">&lt;{m.senderName}&gt;</span>
                  <span className="text-white/90">{m.text}</span>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendChat} className="flex gap-2">
            <input
              type="text"
              placeholder="Send network chat message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
            />
            <button type="submit" className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl text-xs cursor-pointer">
              Send
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-white/10">
          <button onClick={onClose} className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs cursor-pointer">
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
