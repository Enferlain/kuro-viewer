import {
	ChevronRight,
	Eye,
	FileType,
	Globe,
	HardDrive,
	Layout as LayoutIcon,
	Monitor,
	MousePointer2,
	Palette,
	Play,
	Plus,
	Puzzle,
	Scissors,
	Settings,
	Shield,
	Trash2,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "./Button";

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

type SettingCategory =
	| "appearance"
	| "language"
	| "plugins"
	| "fileType"
	| "controls"
	| "layout"
	| "edit"
	| "content"
	| "general"
	| "slideshow"
	| "privacy";

interface CategoryItem {
	id: SettingCategory;
	label: string;
	icon: React.ReactNode;
}

// Helper Components for Cleaner Organization
const SettingGroup: React.FC<{
	title: string;
	icon?: React.ReactNode;
	children: React.ReactNode;
}> = ({ title, icon, children }) => (
	<div className="space-y-3">
		<div className="flex items-center gap-2 px-1">
			{icon && <span className="text-foreground-muted">{icon}</span>}
			<h5 className="text-[10px] font-bold text-foreground-muted uppercase tracking-widest">
				{title}
			</h5>
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
	<section
		className={`flex items-center justify-between p-4 group transition-colors duration-200 ${onClick ? "cursor-pointer hover:bg-white/[0.02]" : ""}`}
		onClick={onClick}
		onKeyDown={(e) =>
			onClick && (e.key === "Enter" || e.key === " ") && onClick()
		}
		aria-label={label}
		tabIndex={onClick ? 0 : undefined}
	>
		<div className="flex flex-col gap-0.5">
			<span className="text-sm font-medium text-foreground group-hover:text-white transition-colors">
				{label}
			</span>
			{description && (
				<span className="text-[11px] text-foreground-muted leading-relaxed max-w-[400px]">
					{description}
				</span>
			)}
		</div>
		<div className="flex-none ml-6">{children}</div>
	</section>
);

const SettingToggle: React.FC<{
	checked: boolean;
	onChange: (val: boolean) => void;
}> = ({ checked, onChange }) => (
	<button
		type="button"
		onClick={(e) => {
			e.stopPropagation();
			onChange(!checked);
		}}
		className={`
      w-9 h-5 rounded-full relative transition-all duration-300 border flex items-center
      ${checked ? "bg-accent border-accent shadow-[0_0_10px_rgba(var(--accent-rgb),0.3)]" : "bg-white/[0.05] border-white/[0.1]"}
    `}
	>
		<div
			className={`
      w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-all duration-300
      ${checked ? "translate-x-[18px]" : "translate-x-0.5"}
    `}
		/>
	</button>
);

export const SettingsModal: React.FC<SettingsModalProps> = ({
	isOpen,
	onClose,
}) => {
	const [isVisible, setIsVisible] = useState(false);
	const [activeCategory, setActiveCategory] =
		useState<SettingCategory>("general");

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
	const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");
	const [backdropStyle, setBackdropStyle] = useState<
		"None" | "Acrylic" | "Mica"
	>("Mica");
	const [accentColor, setAccentColor] = useState("#3b82f6"); // Default blue
	const [gridOpacity, setGridOpacity] = useState(20);

	// Layout Positioning
	const [toolbarPos, setToolbarPos] = useState<"Top" | "Bottom" | "Hidden">(
		"Top",
	);
	const [toolbarOrder, _setToolbarOrder] = useState(0);
	const [galleryPos, setGalleryPos] = useState<"Top" | "Bottom" | "Hidden">(
		"Bottom",
	);
	const [galleryOrder, _setGalleryOrder] = useState(0);
	const [sidebarPos, setSidebarPos] = useState<"Left" | "Right">("Left");
	const [autoHideToolbar, setAutoHideToolbar] = useState(true);
	const [draggingItem, setDraggingItem] = useState<string | null>(null);

	// Custom Themes
	const [customThemes, setCustomThemes] = useState([
		{ id: "kobe-default", name: "Kobe 9.0", author: "Dương Diệu Pháp" },
		{ id: "mocha-dark", name: "Mocha Dark", author: "Catppuccin" },
	]);
	const [selectedThemeId, setSelectedThemeId] = useState<string | null>(
		"kobe-default",
	);

	const categories: CategoryItem[] = [
		{ id: "general", label: "General", icon: <Settings size={16} /> },
		{ id: "appearance", label: "Appearance", icon: <Palette size={16} /> },
		{ id: "layout", label: "Layout", icon: <LayoutIcon size={16} /> },
		{ id: "slideshow", label: "Slideshow", icon: <Play size={16} /> },
		{ id: "controls", label: "Controls", icon: <MousePointer2 size={16} /> },
		{ id: "language", label: "Language", icon: <Globe size={16} /> },
		{ id: "plugins", label: "Plugins", icon: <Puzzle size={16} /> },
		{ id: "fileType", label: "File Types", icon: <FileType size={16} /> },
		{ id: "edit", label: "Edit", icon: <Scissors size={16} /> },
		{ id: "content", label: "Content", icon: <HardDrive size={16} /> },
		{ id: "privacy", label: "Privacy", icon: <Shield size={16} /> },
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
				width: Math.min(
					window.innerWidth - 40,
					Math.max(640, (e.clientX - centerX) * 2),
				),
				height: Math.min(
					window.innerHeight - 40,
					Math.max(480, (e.clientY - centerY) * 2),
				),
			});
		};

		const handleMouseUp = () => {
			setIsResizing(false);
			document.body.style.cursor = "default";
		};

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isResizing]);

	const startResizing = (e: React.MouseEvent) => {
		e.preventDefault();
		setIsResizing(true);
		document.body.style.cursor = "nwse-resize";
	};

	if (!isVisible && !isOpen) return null;

	const renderContent = () => {
		switch (activeCategory) {
			case "general":
				return (
					<div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
						<div>
							<h4 className="text-xl font-bold text-white mb-1">General</h4>
							<p className="text-sm text-foreground-muted">
								System behavior and core performance settings.
							</p>
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
								<SettingToggle
									checked={checkUpdates}
									onChange={setCheckUpdates}
								/>
							</SettingRow>
							<SettingRow
								label="Allow Multiple Instances"
								description="Open images in new windows instead of replacing the current one."
							>
								<SettingToggle
									checked={allowInstances}
									onChange={setAllowInstances}
								/>
							</SettingRow>
						</SettingGroup>

						<SettingGroup title="Files & Monitoring" icon={<Eye size={12} />}>
							<SettingRow
								label="Watch for Changes"
								description="Real-time monitoring of the current folder. Refreshes list when files are added or removed."
							>
								<SettingToggle
									checked={watchChanges}
									onChange={setWatchChanges}
								/>
							</SettingRow>
							<SettingRow
								label="Auto-Open New Images"
								description="Automatically switch to the newest image when it's added to the folder (useful for AI generation)."
							>
								<SettingToggle
									checked={autoOpenNew}
									onChange={setAutoOpenNew}
								/>
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
									<Button
										variant="secondary"
										className="text-[10px] h-8 px-3 py-0 border-white/[0.05]"
									>
										Clear
									</Button>
								</div>
							</SettingRow>
						</SettingGroup>

						<div className="pt-4 flex justify-between items-center px-1">
							<span className="text-[10px] text-foreground-muted uppercase tracking-widest font-bold">
								Reset Settings
							</span>
							<Button
								type="button"
								variant="secondary"
								className="text-red-400 hover:text-red-300 hover:bg-red-400/10 border-red-400/20 text-xs"
							>
								Reset to Factory Defaults
							</Button>
						</div>
					</div>
				);
			case "appearance":
				return (
					<div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
						<div>
							<h4 className="text-xl font-bold text-white mb-1">Appearance</h4>
							<p className="text-sm text-foreground-muted">
								Personalize the look and feel of your viewer.
							</p>
						</div>

						<SettingGroup title="Theme" icon={<Palette size={12} />}>
							<SettingRow
								label="Application Theme"
								description="Select between light, dark, or follow your system preference."
							>
								<div className="grid grid-cols-3 gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-xl w-[240px]">
									{(["dark", "light", "system"] as const).map((t) => (
										<button
											type="button"
											key={t}
											onClick={() => setTheme(t)}
											className={`
                        py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all
                        ${
													theme === t
														? "bg-accent text-white shadow-glow"
														: "text-foreground-muted hover:text-foreground hover:bg-white/[0.05]"
												}
                      `}
										>
											{t}
										</button>
									))}
								</div>
							</SettingRow>
						</SettingGroup>

						<SettingGroup title="Custom Themes" icon={<Puzzle size={12} />}>
							{customThemes.length > 0 ? (
								customThemes.map((t) => (
									<SettingRow
										key={t.id}
										label={t.name}
										description={`by ${t.author}`}
										onClick={() => setSelectedThemeId(t.id)}
									>
										<div className="flex items-center gap-2">
											{selectedThemeId === t.id ? (
												<div className="flex items-center gap-2 px-2 py-1 bg-accent/10 border border-accent/20 rounded-md">
													<div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
													<span className="text-[10px] font-bold text-accent uppercase tracking-widest">
														Active
													</span>
												</div>
											) : (
												<Button
													variant="secondary"
													className="text-[10px] h-7 px-3 border-white/[0.05]"
													onClick={(e) => {
														e.stopPropagation();
														setSelectedThemeId(t.id);
													}}
												>
													Apply
												</Button>
											)}
											<Button
												variant="icon"
												className="text-foreground-muted hover:text-red-400 hover:bg-red-400/10 w-7 h-7"
												onClick={(e) => {
													e.stopPropagation();
													setCustomThemes(
														customThemes.filter((theme) => theme.id !== t.id),
													);
													if (selectedThemeId === t.id)
														setSelectedThemeId(null);
												}}
											>
												<Trash2 size={14} />
											</Button>
										</div>
									</SettingRow>
								))
							) : (
								<div className="p-8 text-center flex flex-col items-center gap-2">
									<Puzzle size={24} className="text-white/10" />
									<p className="text-[11px] text-foreground-muted italic">
										No custom themes installed.
									</p>
								</div>
							)}
							<div className="p-3 border-t border-white/[0.04]">
								<Button
									variant="secondary"
									className="w-full text-[10px] h-9 border-dashed flex items-center justify-center gap-2 hover:border-accent/50 hover:text-accent transition-all"
									onClick={() => {
										const id = `new-theme-${Date.now()}`;
										setCustomThemes([
											...customThemes,
											{
												id,
												name: `Untitled Theme ${customThemes.length + 1}`,
												author: "User",
											},
										]);
									}}
								>
									<Plus size={14} />
									Add Theme Pack
								</Button>
							</div>
						</SettingGroup>

						<SettingGroup title="Window Effects" icon={<Monitor size={12} />}>
							<SettingRow
								label="Backdrop Style"
								description="Windows 11 system transparency effects for the application window."
							>
								<select
									value={backdropStyle}
									onChange={(e) =>
										setBackdropStyle(e.target.value as typeof backdropStyle)
									}
									className="bg-white/[0.05] border border-white/[0.1] rounded-lg text-xs text-foreground px-3 py-1.5 outline-none focus:border-accent/50 transition-colors w-[120px]"
								>
									<option value="None">None</option>
									<option value="Acrylic">Acrylic</option>
									<option value="Mica">Mica</option>
								</select>
							</SettingRow>
						</SettingGroup>

						<SettingGroup title="Colors" icon={<Palette size={12} />}>
							<SettingRow
								label="Accent Color"
								description="Choose the primary highlight color used throughout the interface."
							>
								<div className="flex items-center gap-2">
									{[
										"#3b82f6", // Blue
										"#8b5cf6", // Violet
										"#ec4899", // Pink
										"#f43f5e", // Rose
										"#f59e0b", // Amber
										"#10b981", // Emerald
									].map((color) => (
										<button
											type="button"
											key={color}
											onClick={() => setAccentColor(color)}
											className={`
                        w-6 h-6 rounded-full transition-all border-2
                        ${accentColor === color ? "border-white scale-110 shadow-glow" : "border-transparent hover:scale-105"}
                      `}
											style={{ backgroundColor: color }}
										/>
									))}
									<div className="w-[1px] h-4 bg-white/[0.1] mx-1" />
									<input
										type="color"
										value={accentColor}
										onChange={(e) => setAccentColor(e.target.value)}
										className="w-6 h-6 rounded-md bg-transparent border-none cursor-pointer overflow-hidden p-0"
									/>
								</div>
							</SettingRow>
						</SettingGroup>

						<div className="p-4 bg-accent/5 border border-accent/10 rounded-2xl flex items-start gap-4">
							<div className="p-2 bg-accent/10 rounded-lg text-accent">
								<Settings size={16} />
							</div>
							<div>
								<h5 className="text-xs font-bold text-white mb-1">
									Theme Support
								</h5>
								<p className="text-[11px] text-foreground-muted leading-relaxed">
									Support for full CSS variable-based themes is Coming Soon.
									You'll be able to create and share your own UI skins.
								</p>
							</div>
						</div>
					</div>
				);
			case "layout": {
				const handleDragStart = (id: string) => setDraggingItem(id);
				const handleDrop = (newPos: "Top" | "Bottom") => {
					if (!draggingItem) return;
					if (draggingItem === "toolbar") setToolbarPos(newPos);
					if (draggingItem === "gallery") setGalleryPos(newPos);
					setDraggingItem(null);
				};

				const renderDraggableItem = (item: { id: string; label: string }) => (
					<button
						type="button"
						draggable
						onDragStart={() => handleDragStart(item.id)}
						className={`
              h-8 px-3 bg-accent border border-accent/20 rounded flex items-center justify-center 
              text-[9px] font-bold text-white uppercase tracking-widest shadow-lg cursor-grab active:cursor-grabbing
              transition-all duration-300 hover:scale-[1.02] active:scale-95
              ${draggingItem === item.id ? "opacity-40 scale-95 grayscale" : "opacity-100"}
            `}
					>
						{item.label}
					</button>
				);

				return (
					<div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
						<div>
							<h4 className="text-xl font-bold text-white mb-1">Layout</h4>
							<p className="text-sm text-foreground-muted">
								Directly drag components to position them in your interface.
							</p>
						</div>

						<div className="space-y-10">
							{/* Visual Preview / Drag Interface - Full Width Row */}
							<div className="flex justify-center">
								<div className="w-full max-w-[500px] h-[380px] bg-black/40 border border-white/[0.06] rounded-3xl flex flex-col overflow-hidden shadow-2xl relative group">
									<div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />

									{/* Top Drop Zone */}
									<section
										aria-label="Top drop zone"
										onDragOver={(e) => e.preventDefault()}
										onDrop={() => handleDrop("Top")}
										className={`
                      flex flex-col gap-1.5 p-4 min-h-[70px] transition-colors duration-300
                      ${draggingItem ? "bg-accent/[0.02] border-b border-dashed border-accent/20" : ""}
                    `}
									>
										{[
											{
												id: "toolbar",
												pos: toolbarPos,
												order: toolbarOrder,
												label: "Toolbar",
											},
											{
												id: "gallery",
												pos: galleryPos,
												order: galleryOrder,
												label: "Gallery",
											},
										]
											.filter((item) => item.pos === "Top")
											.sort((a, b) => a.order - b.order)
											.map((item) => renderDraggableItem(item))}
									</section>

									{/* Center / Viewer Area */}
									<div className="flex-1 flex gap-3 px-4 py-2">
										{sidebarPos === "Left" && (
											<button
												type="button"
												onClick={() => setSidebarPos("Right")}
												className="w-16 bg-white/[0.03] border border-white/[0.08] rounded-2xl flex items-center justify-center text-[8px] text-foreground-muted font-bold rotate-180 [writing-mode:vertical-lr] tracking-[0.3em] cursor-pointer hover:bg-white/[0.08] hover:text-white transition-all active:scale-95"
											>
												SIDEBAR
											</button>
										)}
										<div className="flex-1 bg-white/[0.01] border border-dashed border-white/[0.05] rounded-2xl flex items-center justify-center relative overflow-hidden group/viewer">
											<div className="absolute inset-0 bg-[#0a0a0c] checkered-bg opacity-5" />
											<Eye
												size={40}
												className="text-white/[0.02] group-hover/viewer:text-accent/10 transition-colors duration-700"
											/>
										</div>
										{sidebarPos === "Right" && (
											<button
												type="button"
												onClick={() => setSidebarPos("Left")}
												className="w-16 bg-white/[0.03] border border-white/[0.08] rounded-2xl flex items-center justify-center text-[8px] text-foreground-muted font-bold rotate-180 [writing-mode:vertical-lr] tracking-[0.3em] cursor-pointer hover:bg-white/[0.08] hover:text-white transition-all active:scale-95"
											>
												SIDEBAR
											</button>
										)}
									</div>

									{/* Bottom Drop Zone */}
									<section
										aria-label="Bottom drop zone"
										onDragOver={(e) => e.preventDefault()}
										onDrop={() => handleDrop("Bottom")}
										className={`
                      flex flex-col gap-1.5 p-4 min-h-[70px] transition-colors duration-300
                      ${draggingItem ? "bg-accent/[0.02] border-t border-dashed border-accent/20" : ""}
                    `}
									>
										{[
											{
												id: "toolbar",
												pos: toolbarPos,
												order: toolbarOrder,
												label: "Toolbar",
											},
											{
												id: "gallery",
												pos: galleryPos,
												order: galleryOrder,
												label: "Gallery",
											},
										]
											.filter((item) => item.pos === "Bottom")
											.sort((a, b) => a.order - b.order)
											.map((item) => renderDraggableItem(item))}
									</section>

									<div className="absolute -top-7 right-0 flex items-center gap-2 pointer-events-none opacity-40 group-hover:opacity-80 transition-opacity">
										<div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
										<span className="text-[8px] font-bold text-white/40 uppercase tracking-[0.4em]">
											Interactive Layout Builder
										</span>
									</div>
								</div>
							</div>

							{/* Controls Row - Full Width Stack */}
							<div className="space-y-6 pt-2">
								<div className="space-y-4">
									<h5 className="text-[10px] font-bold text-foreground-muted uppercase tracking-[0.2em] px-1">
										Navigation Panels
									</h5>
									<div className="bg-white/[0.02] border border-white/[0.06] rounded-3xl p-6">
										<div className="flex items-center justify-between">
											<div className="space-y-1">
												<span className="text-xs font-semibold text-white">
													Auto-hide Toolbar
												</span>
												<p className="text-[10px] text-foreground-muted leading-relaxed">
													Automatically hide the main controls when inactive.
												</p>
											</div>
											<SettingToggle
												checked={autoHideToolbar}
												onChange={setAutoHideToolbar}
											/>
										</div>
									</div>
								</div>

								<div className="space-y-4">
									<h5 className="text-[10px] font-bold text-foreground-muted uppercase tracking-[0.2em] px-1">
										Viewer Experience
									</h5>
									<div className="p-6 bg-white/[0.02] border border-white/[0.06] rounded-3xl">
										<div className="flex items-center justify-between gap-10">
											<div className="space-y-1">
												<span className="text-xs font-semibold text-white">
													Grid Opacity
												</span>
												<p className="text-[10px] text-foreground-muted leading-relaxed">
													Transparency of the checkered pattern background.
												</p>
											</div>
											<div className="flex items-center gap-5 flex-1 max-w-sm">
												<input
													type="range"
													min="0"
													max="100"
													value={gridOpacity}
													onChange={(e) =>
														setGridOpacity(Number(e.target.value))
													}
													className="flex-1 h-1 bg-white/[0.1] rounded-lg appearance-none cursor-pointer outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
												/>
												<span className="text-xs font-mono text-foreground-muted w-10 text-right">
													{gridOpacity}%
												</span>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				);
			}
			case "slideshow":
				return (
					<div className="space-y-6">
						<h4 className="text-lg font-medium text-white mb-4">Slideshow</h4>
						<div className="space-y-4">
							<div className="flex justify-between items-center">
								<span className="text-sm text-foreground">
									Interval (seconds)
								</span>
								<span className="text-xs font-mono text-foreground-muted">
									5.0s
								</span>
							</div>
							<div className="space-y-2">
								<div className="flex items-center justify-between">
									<span className="text-sm text-foreground">Random Order</span>
									<button
										type="button"
										className="w-11 h-6 rounded-full relative transition-colors bg-white/[0.1] border border-white/[0.05]"
									>
										<div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
									</button>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm text-foreground">
										Loop after finishing
									</span>
									<button
										type="button"
										className="w-11 h-6 rounded-full relative transition-colors bg-accent"
									>
										<div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
									</button>
								</div>
							</div>
							<div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl italic text-foreground-muted text-xs">
								Placeholder: Customize transition effects (fade, slide, zoom)
								and autoplay logic.
							</div>
						</div>
					</div>
				);
			case "controls":
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
			case "language":
				return (
					<div className="space-y-6">
						<h4 className="text-lg font-medium text-white mb-4">Language</h4>
						<div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl flex items-center justify-between">
							<span className="text-sm text-foreground">
								Select Display Language
							</span>
							<select className="bg-white/[0.05] border border-white/[0.1] rounded-md text-xs text-foreground px-2 py-1 outline-none">
								<option>English (US)</option>
								<option>Japanese (日本語)</option>
								<option>German (Deutsch)</option>
							</select>
						</div>
					</div>
				);
			case "plugins":
				return (
					<div className="space-y-6">
						<h4 className="text-lg font-medium text-white mb-4">Plugins</h4>
						<div className="p-8 border-2 border-dashed border-white/[0.06] rounded-2xl flex flex-col items-center justify-center text-center gap-3">
							<Puzzle size={32} className="text-foreground-muted" />
							<div>
								<p className="text-sm text-foreground">No Plugins Installed</p>
								<p className="text-xs text-foreground-muted">
									Extend Kuro Viewer with community extensions.
								</p>
							</div>
							<Button variant="secondary" className="text-xs mt-2">
								Browse Plugins
							</Button>
						</div>
					</div>
				);
			case "fileType":
				return (
					<div className="space-y-6">
						<h4 className="text-lg font-medium text-white mb-4">File Types</h4>
						<div className="space-y-2">
							<p className="text-xs text-foreground-muted italic mb-4">
								Define how specific file formats are handled in the library
								views.
							</p>
							{["PNG", "WebP", "JXL", "AVIF"].map((ext) => (
								<div
									key={ext}
									className="flex justify-between items-center py-2 border-b border-white/[0.03]"
								>
									<span className="text-sm font-mono">{ext}</span>
									<span className="text-[10px] text-accent uppercase font-bold tracking-widest">
										Default Viewer
									</span>
								</div>
							))}
						</div>
					</div>
				);
			case "edit":
				return (
					<div className="space-y-6">
						<h4 className="text-lg font-medium text-white mb-4">Edit</h4>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<span className="text-sm text-foreground">
									Default Export Quality
								</span>
								<span className="text-xs font-mono text-foreground-muted">
									90%
								</span>
							</div>
							<div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl italic text-foreground-muted text-xs">
								Placeholder: Set external editor paths and non-destructive
								sidecar file options.
							</div>
						</div>
					</div>
				);
			case "content":
				return (
					<div className="space-y-6">
						<h4 className="text-lg font-medium text-white mb-4">Content</h4>
						<div className="space-y-4">
							<Button
								variant="secondary"
								className="w-full text-xs py-3 border-dashed"
							>
								Manage Library Paths
							</Button>
							<div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2">
								<div className="flex justify-between text-[10px] uppercase font-bold text-foreground-muted tracking-widest">
									<span>Indexing</span>
									<span className="text-accent">Active</span>
								</div>
								<p className="text-xs text-foreground-muted italic">
									Configure deep indexing for metadata and embedding search.
								</p>
							</div>
						</div>
					</div>
				);
			case "privacy":
				return (
					<div className="space-y-6">
						<h4 className="text-lg font-medium text-white mb-4">
							Privacy & History
						</h4>
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<span className="text-sm text-foreground">
									Keep usage history
								</span>
								<button
									type="button"
									className="w-11 h-6 rounded-full relative transition-colors bg-accent"
								>
									<div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
								</button>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-sm text-foreground">
									Allow usage diagnostics
								</span>
								<button
									type="button"
									className="w-11 h-6 rounded-full relative transition-colors bg-white/[0.1] border border-white/[0.05]"
								>
									<div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm" />
								</button>
							</div>
							<div className="pt-4 border-t border-white/[0.06] flex flex-col gap-2">
								<Button
									variant="secondary"
									className="text-xs py-2 text-red-400 hover:text-red-300"
								>
									Clear Search History
								</Button>
								<Button
									variant="secondary"
									className="text-xs py-2 text-red-400 hover:text-red-300"
								>
									Clear Thumbnail Cache
								</Button>
							</div>
						</div>
					</div>
				);
			default:
				return null;
		}
	};

	return (
		<div
			className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-200 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
		>
			<button
				type="button"
				className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 w-full h-full border-none p-0 m-0"
				onClick={onClose}
				aria-label="Close settings"
			/>

			<div
				style={{ width: `${size.width}px`, height: `${size.height}px` }}
				className={`
          relative bg-[#0a0a0c] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex
          transform transition-all ease-out
          ${isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}
          ${isResizing ? "duration-0 transition-none select-none" : "duration-300"}
        `}
			>
				{/* Resize Handle */}
				<button
					type="button"
					onMouseDown={startResizing}
					className="absolute bottom-0 right-0 w-6 h-6 z-50 cursor-nwse-resize group flex items-center justify-center pointer-events-auto bg-transparent border-none p-0"
					aria-label="Resize settings"
				>
					<div className="w-1.5 h-1.5 rounded-full bg-white/20 group-hover:bg-accent group-hover:scale-125 transition-all shadow-glow" />
				</button>
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
								type="button"
								key={cat.id}
								onClick={() => setActiveCategory(cat.id)}
								className={`
                  w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all group
                  ${
										activeCategory === cat.id
											? "bg-accent text-white shadow-glow translate-x-1"
											: "text-foreground-muted hover:text-foreground hover:bg-white/[0.03]"
									}
                `}
							>
								<div className="flex items-center gap-3">
									<span
										className={`transition-transform duration-200 ${activeCategory === cat.id ? "scale-110" : "group-hover:scale-110"}`}
									>
										{cat.icon}
									</span>
									<span className="text-xs font-medium tracking-tight">
										{cat.label}
									</span>
								</div>
								{activeCategory === cat.id && (
									<ChevronRight size={14} className="opacity-50" />
								)}
							</button>
						))}
					</nav>

					<div className="p-4 border-t border-white/[0.06] bg-black/20">
						<div className="flex flex-col gap-1">
							<span className="text-[10px] text-foreground-muted font-bold uppercase tracking-widest">
								Kuro Viewer
							</span>
							<span className="text-[10px] text-white/20">
								Version 0.4.2-alpha
							</span>
						</div>
					</div>
				</div>

				{/* Content Area */}
				<div className="flex-1 flex flex-col min-w-0">
					<div className="flex-none flex justify-end p-4">
						<Button
							variant="icon"
							onClick={onClose}
							className="hover:bg-white/5"
						>
							<X size={18} />
						</Button>
					</div>

					<div className="flex-1 overflow-y-auto px-10 pb-10 custom-scrollbar">
						{renderContent()}
					</div>

					<div className="flex-none px-10 py-6 border-t border-white/[0.06] bg-white/[0.01] flex justify-end gap-3">
						<Button variant="secondary" onClick={onClose} className="px-6">
							Cancel
						</Button>
						<Button
							variant="primary"
							onClick={onClose}
							className="px-8 shadow-glow"
						>
							Apply Changes
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
};
