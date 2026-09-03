// Settings & Accessibility Interface Modal
import React, { useState, useEffect } from 'react';
import { SettingsManager, GameSettings, KeyBindingAction } from '../engine/ui/SettingsManager';
import { 
  Monitor, Volume2, Keyboard, Gamepad2, Settings2, 
  Eye, Zap, X, AlertTriangle, MonitorSmartphone
} from 'lucide-react';

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

  const applyPreset = (presetType: 'performance' | 'balanced' | '2k_smooth' | 'ultra_4k') => {
    switch (presetType) {
      case 'performance':
        updateGraphics({
          preset: 'low',
          resolutionMode: 'auto',
          renderScale: 0.85,
          renderDistance: 4,
          postProcessing: false,
          antiAliasing: false,
          antiAliasingMode: 'off',
          shadows: false,
          shadowQuality: 'low',
          shadowMapSize: 512,
          bloom: false,
          sharpening: false,
          ambientOcclusion: false,
          waterReflections: false,
          waterQuality: 'low',
          vegetationDensity: 'low',
          particleQuality: 'low',
          clouds: false,
          cloudQuality: 'low',
          dynamicResolution: true,
          targetFps: 60,
        });
        break;
      case 'balanced':
        updateGraphics({
          preset: 'medium',
          resolutionMode: 'auto',
          renderDistance: 6,
          postProcessing: true,
          antiAliasingMode: 'fxaa',
          shadows: true,
          shadowMapSize: 1024,
          dynamicResolution: true,
        });
        break;
      case '2k_smooth':
        updateGraphics({
          preset: 'high',
          resolutionMode: '1440p',
          renderDistance: 8,
          postProcessing: true,
          antiAliasing: true,
          antiAliasingMode: 'smaa',
          shadows: true,
          shadowQuality: 'high',
          shadowMapSize: 2048,
          bloom: true,
          bloomStrength: 0.35,
          colorGrading: 'cinematic',
          sharpening: true,
          sharpenStrength: 0.25,
          dynamicResolution: true,
          targetFps: 60,
        });
        break;
      case 'ultra_4k':
        updateGraphics({
          preset: 'ultra',
          resolutionMode: '4k',
          renderDistance: 12,
          postProcessing: true,
          antiAliasing: true,
          antiAliasingMode: 'smaa',
          shadows: true,
          shadowQuality: 'ultra',
          shadowMapSize: 4096,
          bloom: true,
          bloomStrength: 0.45,
          colorGrading: 'cinematic',
          sharpening: true,
          sharpenStrength: 0.3,
          dynamicResolution: true,
        });
        break;
    }
  };

  const TABS = [
    { id: 'graphics', label: 'Graphics', icon: Monitor },
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'controls', label: 'Controls', icon: Keyboard },
    { id: 'gameplay', label: 'Gameplay', icon: Gamepad2 },
    { id: 'accessibility', label: 'Accessibility', icon: Eye },
  ] as const;

  return (
    <div id="modal-settings" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-8 animate-fade-in font-sans select-none ui-scaled">
      <div className="w-full max-w-4xl bg-[var(--vv-bg)] border border-[var(--vv-border)] rounded-2xl shadow-2xl flex flex-col h-[85vh] sm:h-[80vh] overflow-hidden text-[var(--vv-text-main)]">
        
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between px-6 py-4 border-b border-[var(--vv-border)] bg-[var(--vv-surface)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--vv-primary)]/10 border border-[var(--vv-primary)]/30 text-[var(--vv-primary)]">
              <Settings2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-wide text-white flex items-center gap-2">
                System Settings
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

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          
          {/* Sidebar Tabs */}
          <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-[var(--vv-border-subtle)] bg-[var(--vv-surface)] flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto shrink-0 p-4 gap-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-semibold text-sm whitespace-nowrap ${
                    isActive 
                      ? 'bg-[var(--vv-primary)]/10 text-[var(--vv-primary)] border border-[var(--vv-primary)]/20 shadow-inner' 
                      : 'text-[var(--vv-text-muted)] hover:bg-[var(--vv-elevated)] hover:text-[var(--vv-text-main)] border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--vv-primary)]' : 'opacity-70'}`} />
                  <span className={isActive ? 'block' : 'hidden md:block'}>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[var(--vv-bg)]">
            <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-200">
              
              {/* GRAPHICS TAB */}
              {activeTab === 'graphics' && (
                <>
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white border-b border-[var(--vv-border-subtle)] pb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[var(--vv-warning)]" /> Recommended Quality Presets
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <button 
                        onClick={() => applyPreset('performance')}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                          settings.graphics.preset === 'low' ? 'bg-[var(--vv-warning)]/10 border-[var(--vv-warning)] shadow-inner' : 'bg-[var(--vv-surface)] border-[var(--vv-border-subtle)] hover:border-[var(--vv-border)]'
                        }`}
                      >
                        <Zap className={`w-5 h-5 ${settings.graphics.preset === 'low' ? 'text-[var(--vv-warning)]' : 'text-[var(--vv-text-muted)]'}`} />
                        <span className={`text-xs font-bold ${settings.graphics.preset === 'low' ? 'text-[var(--vv-warning)]' : 'text-white'}`}>Performance</span>
                      </button>
                      <button 
                        onClick={() => applyPreset('balanced')}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                          settings.graphics.preset === 'medium' ? 'bg-[var(--vv-primary)]/10 border-[var(--vv-primary)] shadow-inner' : 'bg-[var(--vv-surface)] border-[var(--vv-border-subtle)] hover:border-[var(--vv-border)]'
                        }`}
                      >
                        <MonitorSmartphone className={`w-5 h-5 ${settings.graphics.preset === 'medium' ? 'text-[var(--vv-primary)]' : 'text-[var(--vv-text-muted)]'}`} />
                        <span className={`text-xs font-bold ${settings.graphics.preset === 'medium' ? 'text-[var(--vv-primary)]' : 'text-white'}`}>Balanced</span>
                      </button>
                      <button 
                        onClick={() => applyPreset('2k_smooth')}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                          settings.graphics.preset === 'high' ? 'bg-[var(--vv-success)]/10 border-[var(--vv-success)] shadow-inner' : 'bg-[var(--vv-surface)] border-[var(--vv-border-subtle)] hover:border-[var(--vv-border)]'
                        }`}
                      >
                        <Eye className={`w-5 h-5 ${settings.graphics.preset === 'high' ? 'text-[var(--vv-success)]' : 'text-[var(--vv-text-muted)]'}`} />
                        <span className={`text-xs font-bold ${settings.graphics.preset === 'high' ? 'text-[var(--vv-success)]' : 'text-white'}`}>2K QHD</span>
                      </button>
                      <button 
                        onClick={() => applyPreset('ultra_4k')}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                          settings.graphics.preset === 'ultra' ? 'bg-purple-500/10 border-purple-500 shadow-inner' : 'bg-[var(--vv-surface)] border-[var(--vv-border-subtle)] hover:border-[var(--vv-border)]'
                        }`}
                      >
                        <Monitor className={`w-5 h-5 ${settings.graphics.preset === 'ultra' ? 'text-purple-400' : 'text-[var(--vv-text-muted)]'}`} />
                        <span className={`text-xs font-bold ${settings.graphics.preset === 'ultra' ? 'text-purple-400' : 'text-white'}`}>4K Ultra</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-white border-b border-[var(--vv-border-subtle)] pb-2">2K & 4K Resolution Pipeline</h3>
                    
                    {/* Resolution Mode Dropdown */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2 bg-[var(--vv-surface)] p-4 rounded-xl border border-[var(--vv-border-subtle)]">
                        <label className="block font-bold text-white text-sm">Resolution Mode</label>
                        <select
                          value={settings.graphics.resolutionMode || 'auto'}
                          onChange={(e) => updateGraphics({ resolutionMode: e.target.value as any, preset: 'custom' })}
                          className="w-full bg-black/40 border border-[var(--vv-border)] rounded-lg p-2 text-sm text-white font-mono focus:outline-none focus:border-[var(--vv-primary)]"
                        >
                          <option value="auto">Auto (Responsive DPR)</option>
                          <option value="native">Native Screen Resolution</option>
                          <option value="1080p">1080p Full HD (1920x1080)</option>
                          <option value="1440p">1440p 2K QHD (2560x1440)</option>
                          <option value="4k">4K UHD (3840x2160)</option>
                          <option value="custom">Custom Scale</option>
                        </select>
                      </div>

                      <div className="space-y-2 bg-[var(--vv-surface)] p-4 rounded-xl border border-[var(--vv-border-subtle)]">
                        <label className="block font-bold text-white text-sm">Anti-Aliasing (AA)</label>
                        <select
                          value={settings.graphics.antiAliasingMode || 'smaa'}
                          onChange={(e) => updateGraphics({ antiAliasingMode: e.target.value as any, preset: 'custom' })}
                          className="w-full bg-black/40 border border-[var(--vv-border)] rounded-lg p-2 text-sm text-white font-mono focus:outline-none focus:border-[var(--vv-primary)]"
                        >
                          <option value="off">Off (Sharp Voxels)</option>
                          <option value="fxaa">FXAA (Fast AA)</option>
                          <option value="smaa">SMAA (Ultra Crisp Edge AA)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2 bg-[var(--vv-surface)] p-4 rounded-xl border border-[var(--vv-border-subtle)]">
                        <label className="block font-bold text-white text-sm">Color Grading</label>
                        <select
                          value={settings.graphics.colorGrading || 'cinematic'}
                          onChange={(e) => updateGraphics({ colorGrading: e.target.value as any, preset: 'custom' })}
                          className="w-full bg-black/40 border border-[var(--vv-border)] rounded-lg p-2 text-sm text-white font-mono focus:outline-none focus:border-[var(--vv-primary)]"
                        >
                          <option value="none">None (Standard)</option>
                          <option value="cinematic">Cinematic ACES (Teal/Orange)</option>
                          <option value="vibrant">Vibrant & Punchy</option>
                          <option value="warm_golden">Warm Golden Hour</option>
                          <option value="cool_twilight">Cool Twilight</option>
                        </select>
                      </div>

                      <div className="space-y-2 bg-[var(--vv-surface)] p-4 rounded-xl border border-[var(--vv-border-subtle)]">
                        <label className="block font-bold text-white text-sm">Shadow Map Resolution</label>
                        <select
                          value={settings.graphics.shadowMapSize || 2048}
                          onChange={(e) => updateGraphics({ shadowMapSize: parseInt(e.target.value, 10) as any, preset: 'custom' })}
                          className="w-full bg-black/40 border border-[var(--vv-border)] rounded-lg p-2 text-sm text-white font-mono focus:outline-none focus:border-[var(--vv-primary)]"
                        >
                          <option value="512">512 (Low)</option>
                          <option value="1024">1024 (Medium)</option>
                          <option value="2048">2048 (High HD)</option>
                          <option value="4096">4096 (Ultra 4K Crisp)</option>
                        </select>
                      </div>
                    </div>

                    {/* Render Distance with Cost Indicator */}
                    <div className="space-y-2 bg-[var(--vv-surface)] p-4 rounded-xl border border-[var(--vv-border-subtle)]">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">Render Distance</span>
                          {settings.graphics.renderDistance > 8 && (
                            <span className="text-[10px] font-bold bg-[var(--vv-danger)]/20 text-[var(--vv-danger)] px-2 py-0.5 rounded border border-[var(--vv-danger)]/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> High Cost
                            </span>
                          )}
                        </div>
                        <span className={`font-mono font-bold ${settings.graphics.renderDistance > 8 ? 'text-[var(--vv-danger)]' : 'text-[var(--vv-primary)]'}`}>
                          {settings.graphics.renderDistance} Chunks
                        </span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="16"
                        value={settings.graphics.renderDistance}
                        onChange={(e) => updateGraphics({ renderDistance: parseInt(e.target.value, 10), preset: 'custom' })}
                        className="w-full accent-[var(--vv-primary)] cursor-pointer h-2 bg-black/40 rounded-lg appearance-none"
                      />
                      <div className="flex justify-between text-[10px] text-[var(--vv-text-muted)] font-mono">
                        <span>2 (Fast)</span>
                        <span>16 (Extreme)</span>
                      </div>
                    </div>

                    <div className="space-y-2 bg-[var(--vv-surface)] p-4 rounded-xl border border-[var(--vv-border-subtle)]">
                      <div className="flex justify-between font-bold text-white">
                        <span>Field of View (FOV)</span>
                        <span className="font-mono text-[var(--vv-primary)]">{settings.graphics.fov}°</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="110"
                        value={settings.graphics.fov}
                        onChange={(e) => updateGraphics({ fov: parseInt(e.target.value, 10), preset: 'custom' })}
                        className="w-full accent-[var(--vv-primary)] cursor-pointer h-2 bg-black/40 rounded-lg appearance-none"
                      />
                    </div>

                    {/* Night Visibility / Moonlight Balance */}
                    <div className="space-y-2 bg-[var(--vv-surface)] p-4 rounded-xl border border-[var(--vv-border-subtle)]">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-bold text-white text-sm">Night Visibility & Balance</div>
                          <div className="text-[10px] text-[var(--vv-text-muted)]">Balances moonlight exposure & nocturnal visibility</div>
                        </div>
                        <span className="font-mono font-bold text-[var(--vv-primary)] text-sm">
                          {Math.round((settings.graphics.nightBrightness ?? 1.0) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="80"
                        max="120"
                        step="5"
                        value={Math.round((settings.graphics.nightBrightness ?? 1.0) * 100)}
                        onChange={(e) => updateGraphics({ nightBrightness: parseInt(e.target.value, 10) / 100, preset: 'custom' })}
                        className="w-full accent-[var(--vv-primary)] cursor-pointer h-2 bg-black/40 rounded-lg appearance-none"
                      />
                      <div className="flex justify-between text-[10px] text-[var(--vv-text-muted)] font-mono">
                        <span>80% (Moody Deep)</span>
                        <span>100% (Balanced)</span>
                        <span>120% (High Visibility)</span>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <label className="flex items-center justify-between bg-[var(--vv-surface)] p-4 rounded-xl border border-[var(--vv-border-subtle)] cursor-pointer hover:border-[var(--vv-border)] transition-colors">
                        <div>
                          <div className="font-bold text-sm text-white">Dynamic Resolution</div>
                          <div className="text-[10px] text-[var(--vv-text-muted)] mt-0.5">Smooth FPS Lock (60FPS)</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.graphics.dynamicResolution !== false}
                          onChange={(e) => updateGraphics({ dynamicResolution: e.target.checked, preset: 'custom' })}
                          className="w-5 h-5 accent-[var(--vv-primary)] cursor-pointer"
                        />
                      </label>

                      <label className="flex items-center justify-between bg-[var(--vv-surface)] p-4 rounded-xl border border-[var(--vv-border-subtle)] cursor-pointer hover:border-[var(--vv-border)] transition-colors">
                        <div>
                          <div className="font-bold text-sm text-white">Post-Processing</div>
                          <div className="text-[10px] text-[var(--vv-text-muted)] mt-0.5">Bloom & Color Pass</div>
                        </div>
                        <input
                          type="checkbox"
                          checked={settings.graphics.postProcessing}
                          onChange={(e) => updateGraphics({ postProcessing: e.target.checked, preset: 'custom' })}
                          className="w-5 h-5 accent-[var(--vv-primary)] cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </>
              )}

              {/* AUDIO TAB */}
              {activeTab === 'audio' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-white border-b border-[var(--vv-border-subtle)] pb-2">Volume Mixers</h3>
                  {(['masterVolume', 'musicVolume', 'sfxVolume', 'ambientVolume'] as const).map(key => (
                    <div key={key} className="space-y-2 bg-[var(--vv-surface)] p-4 rounded-xl border border-[var(--vv-border-subtle)]">
                      <div className="flex justify-between font-bold text-white capitalize">
                        <span>{key.replace('Volume', '')} Volume</span>
                        <span className="font-mono text-[var(--vv-primary)]">{Math.round(settings.audio[key] * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={settings.audio[key]}
                        onChange={(e) => updateAudio(key, parseFloat(e.target.value))}
                        className="w-full accent-[var(--vv-primary)] cursor-pointer h-2 bg-black/40 rounded-lg appearance-none"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* CONTROLS TAB */}
              {activeTab === 'controls' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-white border-b border-[var(--vv-border-subtle)] pb-2">Mouse Settings</h3>
                  <div className="space-y-2 bg-[var(--vv-surface)] p-4 rounded-xl border border-[var(--vv-border-subtle)]">
                    <div className="flex justify-between font-bold text-white">
                      <span>Mouse Sensitivity</span>
                      <span className="font-mono text-[var(--vv-primary)]">{settings.controls.mouseSensitivity.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="2.0"
                      step="0.1"
                      value={settings.controls.mouseSensitivity}
                      onChange={(e) => updateControls({ mouseSensitivity: parseFloat(e.target.value) })}
                      className="w-full accent-[var(--vv-primary)] cursor-pointer h-2 bg-black/40 rounded-lg appearance-none"
                    />
                  </div>

                  <label className="flex items-center justify-between bg-[var(--vv-surface)] p-4 rounded-xl border border-[var(--vv-border-subtle)] cursor-pointer hover:border-[var(--vv-border)] transition-colors">
                    <div className="font-bold text-sm text-white">Invert Y-Axis</div>
                    <input
                      type="checkbox"
                      checked={settings.controls.invertY}
                      onChange={(e) => updateControls({ invertY: e.target.checked })}
                      className="w-5 h-5 accent-[var(--vv-primary)] cursor-pointer"
                    />
                  </label>

                  <h3 className="text-lg font-bold text-white border-b border-[var(--vv-border-subtle)] pb-2 pt-4">Key Bindings</h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {Object.entries(settings.controls.keyBindings).map(([action, key]) => (
                      <div key={action} className="flex justify-between items-center bg-[var(--vv-surface)] p-3 rounded-lg border border-[var(--vv-border-subtle)]">
                        <span className="uppercase text-xs font-bold text-[var(--vv-text-muted)]">{action.replace('_', ' ')}</span>
                        <button
                          onClick={() => setRebindingAction(action as KeyBindingAction)}
                          className={`px-3 py-1.5 rounded-md font-mono text-xs font-bold transition-colors ${
                            rebindingAction === action 
                              ? 'bg-[var(--vv-warning)] text-black animate-pulse' 
                              : 'bg-black/40 text-white hover:bg-[var(--vv-primary)]/20 hover:text-[var(--vv-primary)] border border-white/10'
                          }`}
                        >
                          {rebindingAction === action ? 'PRESS ANY KEY' : (key as string).replace('Key', '')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GAMEPLAY TAB */}
              {activeTab === 'gameplay' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-white border-b border-[var(--vv-border-subtle)] pb-2">Interface & HUD</h3>
                  
                  <label className="flex items-center justify-between bg-[var(--vv-surface)] p-4 rounded-xl border border-[var(--vv-border-subtle)] cursor-pointer hover:border-[var(--vv-border)] transition-colors">
                    <div>
                      <div className="font-bold text-sm text-white">Show Telemetry Overlay</div>
                      <div className="text-[10px] text-[var(--vv-text-muted)] mt-0.5">FPS, Coordinates, Engine Stats</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.gameplay.showFps}
                      onChange={(e) => updateGameplay({ showFps: e.target.checked })}
                      className="w-5 h-5 accent-[var(--vv-primary)] cursor-pointer"
                    />
                  </label>

                  <h3 className="text-lg font-bold text-white border-b border-[var(--vv-border-subtle)] pb-2 pt-4">Mechanics</h3>
                  
                  <div className="space-y-2 bg-[var(--vv-surface)] p-4 rounded-xl border border-[var(--vv-border-subtle)]">
                    <div className="flex justify-between font-bold text-white">
                      <span>Auto-Save Interval</span>
                      <span className="font-mono text-[var(--vv-primary)] uppercase">{settings.gameplay.autoSaveInterval} Mins</span>
                    </div>
                    <div className="flex gap-2 mt-2">
                      {([1, 5, 10] as const).map(interval => (
                        <button
                          key={interval}
                          onClick={() => updateGameplay({ autoSaveInterval: interval })}
                          className={`flex-1 py-2 rounded-lg font-bold text-xs transition-colors ${
                            settings.gameplay.autoSaveInterval === interval 
                              ? 'bg-[var(--vv-primary)] text-black' 
                              : 'bg-black/40 text-[var(--vv-text-muted)] hover:bg-[var(--vv-elevated)]'
                          }`}
                        >
                          {interval} Min
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ACCESSIBILITY TAB */}
              {activeTab === 'accessibility' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-white border-b border-[var(--vv-border-subtle)] pb-2 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-[var(--vv-primary)]" /> Visual Comfort & Scaling
                  </h3>

                  <div className="space-y-2 bg-[var(--vv-surface)] p-4 rounded-xl border border-[var(--vv-border-subtle)]">
                    <div className="flex justify-between font-bold text-white">
                      <span>Global UI Scale</span>
                      <span className="font-mono text-[var(--vv-primary)]">{Math.round(settings.accessibility.uiScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="1.5"
                      step="0.1"
                      value={settings.accessibility.uiScale}
                      onChange={(e) => updateAccessibility({ uiScale: parseFloat(e.target.value) })}
                      className="w-full accent-[var(--vv-primary)] cursor-pointer h-2 bg-black/40 rounded-lg appearance-none"
                    />
                    <div className="text-[10px] text-[var(--vv-text-muted)] mt-1">Changes size of menus, text, and icons globally.</div>
                  </div>

                  <div className="space-y-2 bg-[var(--vv-surface)] p-4 rounded-xl border border-[var(--vv-border-subtle)]">
                    <div className="flex justify-between font-bold text-white">
                      <span>HUD Scale</span>
                      <span className="font-mono text-[var(--vv-primary)]">{Math.round(settings.accessibility.hudScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.1"
                      value={settings.accessibility.hudScale}
                      onChange={(e) => updateAccessibility({ hudScale: parseFloat(e.target.value) })}
                      className="w-full accent-[var(--vv-primary)] cursor-pointer h-2 bg-black/40 rounded-lg appearance-none"
                    />
                    <div className="text-[10px] text-[var(--vv-text-muted)] mt-1">Changes size of in-game HUD elements (health, hotbar).</div>
                  </div>

                  <div className="space-y-2 bg-[var(--vv-surface)] p-4 rounded-xl border border-[var(--vv-border-subtle)]">
                    <div className="flex justify-between font-bold text-white">
                      <span>Safe Area Padding</span>
                      <span className="font-mono text-[var(--vv-primary)]">{settings.accessibility.safeAreaPadding}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="64"
                      step="4"
                      value={settings.accessibility.safeAreaPadding}
                      onChange={(e) => updateAccessibility({ safeAreaPadding: parseInt(e.target.value, 10) })}
                      className="w-full accent-[var(--vv-primary)] cursor-pointer h-2 bg-black/40 rounded-lg appearance-none"
                    />
                    <div className="text-[10px] text-[var(--vv-text-muted)] mt-1">Distance of HUD from screen edges (useful for ultrawide).</div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4 mt-4">
                    <label className="flex items-center justify-between bg-[var(--vv-surface)] p-4 rounded-xl border border-[var(--vv-border-subtle)] cursor-pointer hover:border-[var(--vv-border)] transition-colors">
                      <div className="font-bold text-sm text-white">High Contrast</div>
                      <input
                        type="checkbox"
                        checked={settings.accessibility.highContrast}
                        onChange={(e) => updateAccessibility({ highContrast: e.target.checked })}
                        className="w-5 h-5 accent-[var(--vv-primary)] cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between bg-[var(--vv-surface)] p-4 rounded-xl border border-[var(--vv-border-subtle)] cursor-pointer hover:border-[var(--vv-border)] transition-colors">
                      <div className="font-bold text-sm text-white">Reduce Motion</div>
                      <input
                        type="checkbox"
                        checked={settings.accessibility.motionReduction}
                        onChange={(e) => updateAccessibility({ motionReduction: e.target.checked })}
                        className="w-5 h-5 accent-[var(--vv-primary)] cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
