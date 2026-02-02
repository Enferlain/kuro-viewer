import React, { useState, useEffect } from 'react';
import { X, Monitor, Eye, Zap } from 'lucide-react';
import { Button } from './Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  // Mock State
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [gridOpacity, setGridOpacity] = useState(20);
  const [gpuEnabled, setGpuEnabled] = useState(true);
  const [cacheSize, setCacheSize] = useState(512);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose}
      />
      
      <div 
        className={`
          relative w-full max-w-md bg-[#0a0a0c] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col
          transform transition-all duration-300 ease-out
          ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
        `}
      >
        <div className="flex-none px-6 py-4 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground tracking-tight">Preferences</h3>
          <Button variant="icon" onClick={onClose}><X size={18} /></Button>
        </div>

        <div className="p-6 space-y-8">
            {/* Theme Section */}
            <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] font-bold text-foreground-muted uppercase tracking-widest">
                    <Monitor size={12} /> Appearance
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-1 flex">
                    {(['dark', 'light', 'system'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTheme(t)}
                            className={`
                                flex-1 py-1.5 text-xs font-medium rounded-md transition-all capitalize
                                ${theme === t 
                                    ? 'bg-accent text-white shadow-glow' 
                                    : 'text-foreground-muted hover:text-foreground hover:bg-white/[0.05]'
                                }
                            `}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* Viewport Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-foreground-muted uppercase tracking-widest">
                    <Eye size={12} /> Viewport
                </div>
                
                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-sm text-foreground">Grid Opacity</label>
                        <span className="text-xs font-mono text-foreground-muted">{gridOpacity}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" max="100" 
                        value={gridOpacity}
                        onChange={(e) => setGridOpacity(Number(e.target.value))}
                        className="w-full h-1 bg-white/[0.1] rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-glow hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                    />
                </div>
            </div>

            {/* System Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-foreground-muted uppercase tracking-widest">
                    <Zap size={12} /> System
                </div>
                
                <div className="flex items-center justify-between group">
                    <div className="flex flex-col">
                        <span className="text-sm text-foreground group-hover:text-white transition-colors">GPU Acceleration</span>
                        <span className="text-xs text-foreground-muted">Enable WebGL compute for filters</span>
                    </div>
                    <button 
                        onClick={() => setGpuEnabled(!gpuEnabled)}
                        className={`w-11 h-6 rounded-full relative transition-colors duration-200 border border-transparent ${gpuEnabled ? 'bg-accent border-accent' : 'bg-white/[0.1] border-white/[0.05] hover:border-white/[0.2]'}`}
                    >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${gpuEnabled ? 'translate-x-5.5' : 'translate-x-0.5'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                         <span className="text-sm text-foreground">Cache Limit</span>
                         <span className="text-xs text-foreground-muted">Max memory for thumbnails</span>
                    </div>
                    <select 
                        value={cacheSize}
                        onChange={(e) => setCacheSize(Number(e.target.value))}
                        className="bg-white/[0.05] border border-white/[0.1] rounded-md text-xs text-foreground px-2 py-1 outline-none focus:border-accent/50"
                    >
                        <option value={256}>256 MB</option>
                        <option value={512}>512 MB</option>
                        <option value={1024}>1024 MB</option>
                    </select>
                </div>
            </div>
        </div>

        <div className="flex-none px-6 py-4 bg-white/[0.02] border-t border-white/[0.06] flex justify-end">
          <Button variant="primary" onClick={onClose} className="px-6">Done</Button>
        </div>
      </div>
    </div>
  );
};