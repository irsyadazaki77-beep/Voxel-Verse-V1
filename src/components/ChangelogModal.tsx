import React from 'react';
import { X, History, Sparkles, Wrench, Rocket } from 'lucide-react';
import { GAME_CHANGELOG, ChangelogEntry } from '../data/ChangelogData';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const getTypeIcon = (type: ChangelogEntry['type']) => {
    switch (type) {
      case 'major': return <Rocket className="w-4 h-4 text-purple-400" />;
      case 'minor': return <Sparkles className="w-4 h-4 text-blue-400" />;
      case 'patch': return <Wrench className="w-4 h-4 text-gray-400" />;
      default: return null;
    }
  };

  const getTypeColor = (type: ChangelogEntry['type']) => {
    switch (type) {
      case 'major': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'minor': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'patch': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div id="modal-changelog" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-8 animate-fade-in font-sans select-none ui-scaled">
      <div className="w-full max-w-3xl bg-[var(--vv-bg)] border border-[var(--vv-border)] rounded-2xl shadow-2xl flex flex-col h-[85vh] sm:h-[80vh] overflow-hidden text-[var(--vv-text-main)]">
        
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between px-6 py-4 border-b border-[var(--vv-border)] bg-[var(--vv-surface)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wide text-white flex items-center gap-2">
                Update History
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[var(--vv-elevated)] hover:bg-[var(--vv-border)] text-[var(--vv-text-muted)] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[var(--vv-bg)]">
          <div className="max-w-2xl mx-auto space-y-12 animate-in fade-in duration-200">
            {GAME_CHANGELOG.map((entry, index) => (
              <div key={entry.version} className="relative">
                {/* Timeline connector */}
                {index !== GAME_CHANGELOG.length - 1 && (
                  <div className="absolute left-[15px] top-10 bottom-[-48px] w-px bg-[var(--vv-border)] hidden sm:block" />
                )}

                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                  {/* Version & Date Column */}
                  <div className="sm:w-32 shrink-0 flex flex-col items-start gap-1 z-10">
                    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md border text-sm font-bold ${getTypeColor(entry.type)}`}>
                      {getTypeIcon(entry.type)}
                      v{entry.version}
                    </div>
                    <span className="text-xs text-[var(--vv-text-muted)] font-mono pl-1">
                      {entry.date}
                    </span>
                  </div>

                  {/* Changes Column */}
                  <div className="flex-1 space-y-4">
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {entry.title}
                    </h3>
                    
                    <div className="space-y-4">
                      {entry.changes.map((changeGroup, idx) => (
                        <div key={idx} className="space-y-2">
                          <h4 className="text-sm font-semibold text-[var(--vv-text-muted)] uppercase tracking-wider">
                            {changeGroup.category}
                          </h4>
                          <ul className="space-y-2">
                            {changeGroup.items.map((item, itemIdx) => (
                              <li key={itemIdx} className="flex gap-2 text-sm text-[var(--vv-text-main)] leading-relaxed">
                                <span className="text-[var(--vv-border)] mt-1.5">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
