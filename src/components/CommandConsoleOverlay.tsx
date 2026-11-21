// VoxelVerse v6.1.0: Minecraft Java & Bedrock Slash Command Console Overlay (Press '/' to toggle)
import React, { useState, useEffect, useRef } from 'react';
import { CommandConsoleSystem } from '../engine/core/CommandConsoleSystem';

export const CommandConsoleOverlay: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('/');
  const [logs, setLogs] = useState(CommandConsoleSystem.logs);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (!isOpen && e.key === '/' && activeTag !== 'INPUT' && activeTag !== 'TEXTAREA') {
        e.preventDefault();
        setInput('/');
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 20);
      } else if (isOpen && e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const suggestions = CommandConsoleSystem.getSuggestions(input);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const rt = (window as any).__voxelRuntime;
    CommandConsoleSystem.execute(input, rt);
    setLogs([...CommandConsoleSystem.logs]);
    setInput('/');
  };

  return (
    <div className="fixed inset-x-0 bottom-20 z-50 flex flex-col items-center px-4 pointer-events-auto font-mono">
      <div className="w-full max-w-2xl bg-slate-950/90 border border-slate-700/80 rounded-xl shadow-2xl p-3 space-y-2 text-xs text-slate-100">
        {logs.length > 0 && (
          <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
            {logs.slice(0, 6).map((l, idx) => (
              <div
                key={idx}
                className={`whitespace-pre-wrap px-2 py-1 rounded ${
                  l.ok ? 'bg-emerald-950/50 text-emerald-200' : 'bg-rose-950/50 text-rose-200'
                }`}
              >
                {l.text}
              </div>
            ))}
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1 text-[10px]">
            {suggestions.slice(0, 5).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setInput(s.split(' ')[0] + ' ')}
                className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ketik perintah slash (/help, /tp, /time set day, /gamemode creative)..."
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/70 border border-amber-500/40 text-white focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
          >
            Jalankan
          </button>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            ✕
          </button>
        </form>
      </div>
    </div>
  );
};
