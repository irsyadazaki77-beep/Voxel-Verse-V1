// Settings & Accessibility Interface Modal
import React, { useState, useEffect } from 'react';
import { SettingsManager, GameSettings, KeyBindingAction } from '../engine/ui/SettingsManager';
import { InputManager } from '../engine/input/InputManager';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<GameSettings>(SettingsManager.get());
  const [activeTab, setActiveTab] = useState<'graphics' | 'audio' | 'controls' | 'gameplay' | 'accessibility'>('graphics');
  const [rebindingAction, setRebindingAction] = useState<KeyBindingAction | null>(null);

  useEffect(() => {
    return SettingsManager.subscribe((s) => setSettings(s));
  }, []);

  useEffect(() => {
    if (!rebindingAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const newBindings = { ...settings.controls.keyBindings, [rebindingAction]: e.code };
      SettingsManager.update({
        controls: { ...settings.controls, keyBindings: newBindings },
      });
      setRebindingAction(null);
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true, once: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [rebindingAction, settings]);

  if (!isOpen) return null;

  const updateAudio = (key: keyof typeof settings.audio, val: number) => {
    SettingsManager.update({ audio: { ...settings.audio, [key]: val } });
  };

  const updateGraphics = (partial: Partial<typeof settings.graphics>) => {
    SettingsManager.update({ graphics: { ...settings.graphics, ...partial } });
  };

  const updateControls = (partial: Partial<typeof settings.controls>) => {
    SettingsManager.update({ controls: { ...settings.controls, ...partial } });
  };

  const updateAccessibility = (partial: Partial<typeof settings.accessibility>) => {
    SettingsManager.update({ accessibility: { ...settings.accessibility, ...partial } });
  };

  const updateGameplay = (partial: Partial<typeof settings.gameplay>) => {
    SettingsManager.update({ gameplay: { ...settings.gameplay, ...partial } });
  };

  return (
    <div id="modal-settings" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in font-sans select-none">
      <div className="w-full max-w-2xl bg-[#0c0e15] rounded-3xl border border-white/15 p-6 shadow-2xl space-y-6 text-white flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.6)]"></div>
            <h2 className="text-lg font-black tracking-wider uppercase">System & Accessibility Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 flex items-center justify-center text-xs font-mono transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-1 border-b border-white/5 text-xs font-bold">
          {(['graphics', 'audio', 'controls', 'gameplay', 'accessibility'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                activeTab === tab
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-xs">
          {/* Graphics Tab */}
          {activeTab === 'graphics' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5">
                <div>
                  <div className="font-bold">Graphics Preset</div>
                  <div className="text-[10px] text-white/50">Auto-configure visual fidelity settings</div>
                </div>
                <div className="flex gap-1.5">
                  {(['low', 'medium', 'high', 'ultra'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => updateGraphics({ preset: p })}
                      className={`px-3 py-1.5 rounded-xl uppercase font-mono text-[10px] font-bold transition-all cursor-pointer ${
                        settings.graphics.preset === p ? 'bg-sky-500 text-white shadow-md' : 'bg-black/40 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Render Distance</span>
                  <span className="font-mono text-sky-400">{settings.graphics.renderDistance} Chunks</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={settings.graphics.renderDistance}
                  onChange={(e) => updateGraphics({ renderDistance: parseInt(e.target.value, 10) })}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Field of View (FOV)</span>
                  <span className="font-mono text-sky-400">{settings.graphics.fov}°</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="110"
                  value={settings.graphics.fov}
                  onChange={(e) => updateGraphics({ fov: parseInt(e.target.value, 10) })}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5 cursor-pointer">
                  <span className="font-bold">Cascading Shadows</span>
                  <input
                    type="checkbox"
                    checked={settings.graphics.shadows}
                    onChange={(e) => updateGraphics({ shadows: e.target.checked })}
                    className="w-4 h-4 accent-sky-400 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5 cursor-pointer">
                  <span className="font-bold">Water Reflection/Refraction</span>
                  <input
                    type="checkbox"
                    checked={settings.graphics.waterReflections}
                    onChange={(e) => updateGraphics({ waterReflections: e.target.checked })}
                    className="w-4 h-4 accent-sky-400 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Audio Tab */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              {(['masterVolume', 'musicVolume', 'environmentVolume', 'creatureVolume', 'combatVolume', 'uiVolume'] as const).map(
                (volKey) => {
                  const labels: Record<string, string> = {
                    masterVolume: 'Master Volume',
                    musicVolume: 'Ambient Music',
                    environmentVolume: 'Environment & Weather',
                    creatureVolume: 'Creatures & Mobs',
                    combatVolume: 'Combat & Weapon Sounds',
                    uiVolume: 'UI & Interface Sounds',
                  };

                  return (
                    <div key={volKey} className="space-y-1">
                      <div className="flex justify-between font-bold">
                        <span>{labels[volKey]}</span>
                        <span className="font-mono text-sky-400">{Math.round(settings.audio[volKey] * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settings.audio[volKey]}
                        onChange={(e) => updateAudio(volKey, parseFloat(e.target.value))}
                        className="w-full accent-sky-400 cursor-pointer"
                      />
                    </div>
                  );
                }
              )}
            </div>
          )}

          {/* Controls Tab */}
          {activeTab === 'controls' && (
            <div className="space-y-4">
              <div className="text-[11px] text-white/50 bg-sky-500/10 border border-sky-500/20 p-2.5 rounded-xl flex items-center justify-between">
                <span>Active Input Device: <strong className="uppercase text-sky-300 font-mono">{InputManager.getActiveDevice()}</strong></span>
                <span className="text-[10px] text-white/40">Click any key binding to reassign</span>
              </div>

              <div className="space-y-1 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                <div className="flex justify-between font-bold">
                  <span>Mouse / Look Sensitivity</span>
                  <span className="font-mono text-sky-400">{settings.controls.mouseSensitivity.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.05"
                  value={settings.controls.mouseSensitivity}
                  onChange={(e) => updateControls({ mouseSensitivity: parseFloat(e.target.value) })}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <label className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5 cursor-pointer">
                <span className="font-bold">Invert Y-Axis</span>
                <input
                  type="checkbox"
                  checked={settings.controls.invertY}
                  onChange={(e) => updateControls({ invertY: e.target.checked })}
                  className="w-4 h-4 accent-sky-400 cursor-pointer"
                />
              </label>

              <div className="font-bold text-white/70 text-[11px] uppercase tracking-wider pt-2 border-t border-white/10">Key Bindings</div>

              <div className="grid grid-cols-2 gap-2">
                {Object.entries(settings.controls.keyBindings).map(([act, code]) => {
                  const actionKey = act as KeyBindingAction;
                  const isRebinding = rebindingAction === actionKey;

                  return (
                    <div
                      key={actionKey}
                      onClick={() => setRebindingAction(actionKey)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isRebinding
                          ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                          : 'bg-white/5 border-white/5 hover:bg-white/10'
                      }`}
                    >
                      <span className="font-bold text-white/80 capitalize">{actionKey.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="font-mono text-[10px] px-2.5 py-1 rounded-lg bg-black/60 text-sky-300 border border-white/10">
                        {isRebinding ? 'Press Key...' : code}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Accessibility Tab */}
          {activeTab === 'accessibility' && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between font-bold">
                  <span>UI Scale Factor</span>
                  <span className="font-mono text-sky-400">{settings.accessibility.uiScale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={settings.accessibility.uiScale}
                  onChange={(e) => updateAccessibility({ uiScale: parseFloat(e.target.value) })}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Safe Area Padding</span>
                  <span className="font-mono text-sky-400">{settings.accessibility.safeAreaPadding}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="32"
                  value={settings.accessibility.safeAreaPadding}
                  onChange={(e) => updateAccessibility({ safeAreaPadding: parseInt(e.target.value, 10) })}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5 cursor-pointer">
                  <span className="font-bold">Motion Reduction</span>
                  <input
                    type="checkbox"
                    checked={settings.accessibility.motionReduction}
                    onChange={(e) => updateAccessibility({ motionReduction: e.target.checked })}
                    className="w-4 h-4 accent-sky-400 cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5 cursor-pointer">
                  <span className="font-bold">Audio Subtitles</span>
                  <input
                    type="checkbox"
                    checked={settings.accessibility.subtitles}
                    onChange={(e) => updateAccessibility({ subtitles: e.target.checked })}
                    className="w-4 h-4 accent-sky-400 cursor-pointer"
                  />
                </label>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between font-bold">
                  <span>Camera Shake Intensity</span>
                  <span className="font-mono text-sky-400">{Math.round(settings.accessibility.cameraShakeIntensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.accessibility.cameraShakeIntensity}
                  onChange={(e) => updateAccessibility({ cameraShakeIntensity: parseFloat(e.target.value) })}
                  className="w-full accent-sky-400 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Gameplay Tab */}
          {activeTab === 'gameplay' && (
            <div className="space-y-3">
              <label className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5 cursor-pointer">
                <span className="font-bold">Display FPS & Profiler Telemetry</span>
                <input
                  type="checkbox"
                  checked={settings.gameplay.showFps}
                  onChange={(e) => updateGameplay({ showFps: e.target.checked })}
                  className="w-4 h-4 accent-sky-400 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/5 cursor-pointer">
                <span className="font-bold">HUD Minimap Widget</span>
                <input
                  type="checkbox"
                  checked={settings.gameplay.showMinimap}
                  onChange={(e) => updateGameplay({ showMinimap: e.target.checked })}
                  className="w-4 h-4 accent-sky-400 cursor-pointer"
                />
              </label>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <button
            onClick={() => SettingsManager.resetToDefault()}
            className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl font-bold text-xs border border-rose-500/20 transition-all cursor-pointer"
          >
            Reset All to Default
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-sky-500 hover:bg-sky-400 text-white rounded-xl font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
