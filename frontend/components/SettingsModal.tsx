import React, { useState, useEffect } from 'react';
import { 
  X, Monitor, Eye, Zap, Palette, Layout as LayoutIcon, 
  MousePointer2, Globe, Puzzle, FileType, Scissors, 
  HardDrive, Settings, ChevronRight, Play, Shield
} from 'lucide-react';
import { Button } from './Button';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingCategory = 
  | 'appearance' | 'language' | 'plugins' | 'fileType' 
  | 'controls' | 'layout' | 'edit' | 'content' | 'general'
  | 'slideshow' | 'privacy';

interface CategoryItem {
  id: SettingCategory;
  label: string;
  icon: React.ReactNode;
}

// Helper Components for Cleaner Organization
const SettingGroup: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 px-1">
      {icon && <span className="text-foreground-muted">{icon}</span>}
      <h5 className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">{title}</h5>
    </div>
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
      {children}
    </div>
  </div>
);

const SettingRow: React.FC<{ 
  label: string; 
  description?: string; 
  children: React.ReactNode;
  onClick?: () => void;
}> = ({ label, description, children, onClick }) => (
  <div 
    className={`flex items-center justify-between p-4 group transition-colors duration-200 ${onClick ? 'cursor-pointer hover:bg-white/[0.02]' : ''}`}
    onClick={onClick}
  >
    <div className="flex flex-col gap-0.5">
      <span className="text-sm font-medium text-foreground group-hover:text-white transition-colors">{label}</span>
      {description && <span className="text-[11px] text-foreground-muted leading-relaxed max-w-[400px]">{description}</span>}
    </div>
    <div className="flex-none ml-6">
      {children}
    </div>
  </div>
);

const SettingToggle: React.FC<{ checked: boolean; onChange: (val: boolean) => void }> = ({ checked, onChange }) => (
  <button 
    onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
    className={`
      w-9 h-5 rounded-full relative transition-all duration-300 border flex items-center
      ${checked ? 'bg-accent border-accent shadow-[0_0_10px_rgba(var(--accent-rgb),0.3)]' : 'bg-white/[0.05] border-white/[0.1]'}
    `}
  >
    <div className={`
      w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all duration-300
      ${checked ? 'translate-x-[18px]' : 'translate-x-0.5'}
    `} />
  </button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<SettingCategory>('general');
  
  // Size State
  const [size, setSize] = useState({ width: 860, height: 680 });
  const [isResizing, setIsResizing] = useState(false);

  // --- SETTINGS STATE ---
  // General
  const [startupRun, setStartupRun] = useState(false);
  const [checkUpdates, setCheckUpdates] = useState(true);
  const [allowInstances, setAllowInstances] = useState(false);
  const [watchChanges, setWatchChanges] = useState(true);
  const [autoOpenNew, setAutoOpenNew] = useState(false);
  const [gpuEnabled, setGpuEnabled] = useState(true);
  const [lowPower, setLowPower] = useState(false);
  const [cacheSize, setCacheSize] = useState(512);

  // Appearance
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark');
  const [gridOpacity, setGridOpacity] = useState(20);

  const categories: CategoryItem[] = [
    { id: 'general', label: 'General', icon: <Settings size={16} /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette size={16} /> },
    { id: 'layout', label: 'Layout', icon: <LayoutIcon size={16} /> },
    { id: 'slideshow', label: 'Slideshow', icon: <Play size={16} /> },
    { id: 'controls', label: 'Controls', icon: <MousePointer2 size={16} /> },
    { id: 'language', label: 'Language', icon: <Globe size={16} /> },
    { id: 'plugins', label: 'Plugins', icon: <Puzzle size={16} /> },
    { id: 'fileType', label: 'File Types', icon: <FileType size={16} /> },
    { id: 'edit', label: 'Edit', icon: <Scissors size={16} /> },
    { id: 'content', label: 'Content', icon: <HardDrive size={16} /> },
    { id: 'privacy', label: 'Privacy', icon: <Shield size={16} /> },
  ];

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Resizing Logic
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      
      setSize({
        width: Math.min(window.innerWidth - 40, Math.max(640, (e.clientX - centerX) * 2)),
        height: Math.min(window.innerHeight - 40, Math.max(480, (e.clientY - centerY) * 2)),
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = 'nwse-resize';
  };

  if (!isVisible && !isOpen) return null;

  const renderContent = () => {
    switch (activeCategory) {
      case 'general':
        return (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div>
              <h4 className="text-xl font-bold text-white mb-1">General</h4>
              <p className="text-sm text-foreground-muted">System behavior and core performance settings.</p>
            </div>
            
            <SettingGroup title="System" icon={<Monitor size={12} />}>
              <SettingRow 
                label="Launch on Startup" 
                description="Automatically run Kuro Viewer when you log into Windows."
              >
                <SettingToggle checked={startupRun} onChange={setStartupRun} />
              </SettingRow>
              <SettingRow 
                label="Auto-Update" 
                description="Keep the viewer up to date with the latest features and security fixes."
              >
                <SettingToggle checked={checkUpdates} onChange={setCheckUpdates} />
              </SettingRow>
              <SettingRow 
                label="Allow Multiple Instances" 
                description="Open images in new windows instead of replacing the current one."
              >
                <SettingToggle checked={allowInstances} onChange={setAllowInstances} />
              </SettingRow>
            </SettingGroup>

            <SettingGroup title="Files & Monitoring" icon={<Eye size={12} />}>
              <SettingRow 
                label="Watch for Changes" 
                description="Real-time monitoring of the current folder. Refreshes list when files are added or removed."
              >
                <SettingToggle checked={watchChanges} onChange={setWatchChanges} />
              </SettingRow>
              <SettingRow 
                label="Auto-Open New Images" 
                description="Automatically switch to the newest image when it's added to the folder (useful for AI generation)."
              >
                <SettingToggle checked={autoOpenNew} onChange={setAutoOpenNew} />
              </SettingRow>
            </SettingGroup>

            <SettingGroup title="Performance" icon={<Zap size={12} />}>
              <SettingRow 
                label="Hardware Acceleration" 
                description="Use the GPU for image decoding and filter processing. Improves pan/zoom smoothness."
              >
                <SettingToggle checked={gpuEnabled} onChange={setGpuEnabled} />
              </SettingRow>
              <SettingRow 
                label="Low Power Mode" 
                description="Reduce animation frame rates and background indexing priority to save battery."
              >
                <SettingToggle checked={lowPower} onChange={setLowPower} />
              </SettingRow>
              <SettingRow 
                label="Thumbnail Cache Limit" 
                description="Maximum disk space allocated for image previews."
              >
                <div className="flex items-center gap-3">
                   <select 
                    value={cacheSize}
                    onChange={(e) => setCacheSize(Number(e.target.value))}
                    className="bg-white/[0.05] border border-white/[0.1] rounded-lg text-xs text-foreground px-3 py-1.5 outline-none focus:border-accent/50 transition-colors"
                  >
                    <option value={256}>256 MB</option>
                    <option value={512}>512 MB</option>
                    <option value={1024}>1024 MB</option>
                    <option value={2048}>2.0 GB</option>
                  </select>
                  <Button variant="secondary" className="text-[10px] h-8 px-3 py-0 border-white/[0.05]">Clear</Button>
                </div>
              </SettingRow>
            </SettingGroup>

            <div className="pt-4 flex justify-between items-center px-1">
               <span className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold">Reset Settings</span>
               <Button variant="secondary" className="text-red-400 hover:text-red-300 hover:bg-red-400/10 border-red-400/20 text-xs">Reset to Factory Defaults</Button>
            </div>
          </div>
        );
      case 'appearance':
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-medium text-white mb-4">Appearance</h4>
            <div className="space-y-4">
              <div className="space-y-3">
                <label className="text-sm text-foreground-muted uppercase tracking-wider text-[10px] font-bold">Theme</label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  {(['dark', 'light', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`
                        py-2 text-xs font-medium rounded-lg transition-all capitalize
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
              <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <span className="text-xs text-foreground-muted block mb-2 italic">Placeholder: Customize accent colors and transparency levels in a future update.</span>
              </div>
            </div>
          </div>
        );
      case 'layout':
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-medium text-white mb-4">Layout</h4>
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm text-foreground">Background Grid Opacity</label>
                  <span className="text-xs font-mono text-foreground-muted">{gridOpacity}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" max="100" 
                  value={gridOpacity}
                  onChange={(e) => setGridOpacity(Number(e.target.value))}
                  className="w-full h-1 bg-white/[0.1] rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                />
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                <span className="text-xs text-foreground-muted block mb-2 italic">Placeholder: Toggle toolbar positions (Top/Bottom) and side panel docking behavior.</span>
              </div>
            </div>
          </div>
        );
      case 'slideshow':
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-medium text-white mb-4">Slideshow</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-foreground">Interval (seconds)</span>
                <span className="text-xs font-mono text-foreground-muted">5.0s</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Random Order</span>
                  <button className="w-11 h-6 rounded-full relative transition-colors bg-white/[0.1] border border-white/[0.05]">
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">Loop after finishing</span>
                  <button className="w-11 h-6 rounded-full relative transition-colors bg-accent">
                    <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl italic text-foreground-muted text-xs">
                Placeholder: Customize transition effects (fade, slide, zoom) and autoplay logic.
              </div>
            </div>
          </div>
        );
      case 'controls':
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-medium text-white mb-4">Controls</h4>
            <div className="space-y-4 italic text-foreground-muted text-sm">
              <p>Customize mouse wheel behavior (Zoom vs. Next Image).</p>
              <p>Configure keyboard shortcut mapping.</p>
              <p>Adjust drag-to-pan sensitivity.</p>
            </div>
          </div>
        );
      case 'language':
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-medium text-white mb-4">Language</h4>
            <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl flex items-center justify-between">
              <span className="text-sm text-foreground">Select Display Language</span>
              <select className="bg-white/[0.05] border border-white/[0.1] rounded-md text-xs text-foreground px-2 py-1 outline-none">
                <option>English (US)</option>
                <option>Japanese (日本語)</option>
                <option>German (Deutsch)</option>
              </select>
            </div>
          </div>
        );
      case 'plugins':
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-medium text-white mb-4">Plugins</h4>
            <div className="p-8 border-2 border-dashed border-white/[0.06] rounded-2xl flex flex-col items-center justify-center text-center gap-3">
              <Puzzle size={32} className="text-foreground-muted" />
              <div>
                <p className="text-sm text-foreground">No Plugins Installed</p>
                <p className="text-xs text-foreground-muted">Extend Kuro Viewer with community extensions.</p>
              </div>
              <Button variant="secondary" className="text-xs mt-2">Browse Plugins</Button>
            </div>
          </div>
        );
      case 'fileType':
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-medium text-white mb-4">File Types</h4>
            <div className="space-y-2">
              <p className="text-xs text-foreground-muted italic mb-4">Define how specific file formats are handled in the library views.</p>
              {['PNG', 'WebP', 'JXL', 'AVIF'].map(ext => (
                <div key={ext} className="flex justify-between items-center py-2 border-b border-white/[0.03]">
                  <span className="text-sm font-mono">{ext}</span>
                  <span className="text-[10px] text-accent uppercase font-bold tracking-widest">Default Viewer</span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'edit':
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-medium text-white mb-4">Edit</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Default Export Quality</span>
                <span className="text-xs font-mono text-foreground-muted">90%</span>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl italic text-foreground-muted text-xs">
                Placeholder: Set external editor paths and non-destructive sidecar file options.
              </div>
            </div>
          </div>
        );
      case 'content':
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-medium text-white mb-4">Content</h4>
            <div className="space-y-4">
              <Button variant="secondary" className="w-full text-xs py-3 border-dashed">Manage Library Paths</Button>
              <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2">
                <div className="flex justify-between text-[10px] uppercase font-bold text-foreground-muted tracking-widest">
                  <span>Indexing</span>
                  <span className="text-accent">Active</span>
                </div>
                <p className="text-xs text-foreground-muted italic">Configure deep indexing for metadata and embedding search.</p>
              </div>
            </div>
          </div>
        );
      case 'privacy':
        return (
          <div className="space-y-6">
            <h4 className="text-lg font-medium text-white mb-4">Privacy & History</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Keep usage history</span>
                <button className="w-11 h-6 rounded-full relative transition-colors bg-accent">
                    <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-foreground">Allow usage diagnostics</span>
                <button className="w-11 h-6 rounded-full relative transition-colors bg-white/[0.1] border border-white/[0.05]">
                    <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>
              <div className="pt-4 border-t border-white/[0.06] flex flex-col gap-2">
                <Button variant="secondary" className="text-xs py-2 text-red-400 hover:text-red-300">Clear Search History</Button>
                <Button variant="secondary" className="text-xs py-2 text-red-400 hover:text-red-300">Clear Thumbnail Cache</Button>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose}
      />
      
      <div 
        style={{ width: `${size.width}px`, height: `${size.height}px` }}
        className={`
          relative bg-[#0a0a0c] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex
          transform transition-all ease-out
          ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
          ${isResizing ? 'duration-0 transition-none select-none' : 'duration-300'}
        `}
      >
        {/* Resize Handle */}
        <div 
          onMouseDown={startResizing}
          className="absolute bottom-0 right-0 w-6 h-6 z-50 cursor-nwse-resize group flex items-center justify-center pointer-events-auto"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-accent group-hover:scale-125 transition-all shadow-glow" />
        </div>
        {/* Sidebar Navigation */}
        <div className="w-[240px] flex-none border-r border-white/[0.06] bg-white/[0.01] flex flex-col">
          <div className="p-6">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
               Settings
            </h3>
          </div>
          
          <nav className="flex-1 overflow-y-auto px-3 pb-6 space-y-1 custom-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group
                  ${activeCategory === cat.id 
                    ? 'bg-accent text-white shadow-glow translate-x-1' 
                    : 'text-foreground-muted hover:text-foreground hover:bg-white/[0.03]'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <span className={`transition-transform duration-200 ${activeCategory === cat.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                    {cat.icon}
                  </span>
                  <span className="text-xs font-medium tracking-tight">{cat.label}</span>
                </div>
                {activeCategory === cat.id && <ChevronRight size={14} className="opacity-50" />}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-white/[0.06] bg-black/20">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-foreground-muted font-bold uppercase tracking-widest">Kuro Viewer</span>
              <span className="text-[10px] text-white/20">Version 0.4.2-alpha</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-none flex justify-end p-4">
            <Button variant="icon" onClick={onClose} className="hover:bg-white/5"><X size={18} /></Button>
          </div>
          
          <div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
            {renderContent()}
          </div>

          <div className="flex-none px-10 py-6 border-t border-white/[0.06] bg-white/[0.01] flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} className="px-6">Cancel</Button>
            <Button variant="primary" onClick={onClose} className="px-8 shadow-glow">Apply Changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
};