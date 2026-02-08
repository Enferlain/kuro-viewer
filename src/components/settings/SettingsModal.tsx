import {
	ChevronRight,
	FileType,
	Globe,
	HardDrive,
	Layout as LayoutIcon,
	MousePointer2,
	Palette,
	Play,
	Puzzle,
	Scissors,
	Settings,
	Shield,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { AppearanceTab } from "./tabs/AppearanceTab";
import { CategoryStub } from "./tabs/CategoryStub";
import { GeneralTab } from "./tabs/GeneralTab";
import { LayoutTab } from "./tabs/LayoutTab";

export type SettingCategory =
	| "general"
	| "appearance"
	| "layout"
	| "slideshow"
	| "controls"
	| "language"
	| "plugins"
	| "fileType"
	| "edit"
	| "content"
	| "privacy";

interface CategoryItem {
	id: SettingCategory;
	label: string;
	icon: React.ReactNode;
}

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

interface SettingsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

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
	const [accentColor, setAccentColor] = useState("#3b82f6");
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

	if (!isVisible && !isOpen) return null;

	const renderContent = () => {
		switch (activeCategory) {
			case "general":
				return (
					<GeneralTab
						startupRun={startupRun}
						setStartupRun={setStartupRun}
						checkUpdates={checkUpdates}
						setCheckUpdates={setCheckUpdates}
						allowInstances={allowInstances}
						setAllowInstances={setAllowInstances}
						watchChanges={watchChanges}
						setWatchChanges={setWatchChanges}
						autoOpenNew={autoOpenNew}
						setAutoOpenNew={setAutoOpenNew}
						gpuEnabled={gpuEnabled}
						setGpuEnabled={setGpuEnabled}
						lowPower={lowPower}
						setLowPower={setLowPower}
						cacheSize={cacheSize}
						setCacheSize={setCacheSize}
					/>
				);
			case "appearance":
				return (
					<AppearanceTab
						theme={theme}
						setTheme={setTheme}
						customThemes={customThemes}
						setCustomThemes={setCustomThemes}
						selectedThemeId={selectedThemeId}
						setSelectedThemeId={setSelectedThemeId}
						backdropStyle={backdropStyle}
						setBackdropStyle={setBackdropStyle}
						accentColor={accentColor}
						setAccentColor={setAccentColor}
					/>
				);
			case "layout":
				return (
					<LayoutTab
						toolbarPos={toolbarPos}
						setToolbarPos={setToolbarPos}
						toolbarOrder={toolbarOrder}
						galleryPos={galleryPos}
						setGalleryPos={setGalleryPos}
						galleryOrder={galleryOrder}
						sidebarPos={sidebarPos}
						setSidebarPos={setSidebarPos}
						autoHideToolbar={autoHideToolbar}
						setAutoHideToolbar={setAutoHideToolbar}
						gridOpacity={gridOpacity}
						setGridOpacity={setGridOpacity}
						draggingItem={draggingItem}
						setDraggingItem={setDraggingItem}
					/>
				);
			default: {
				const cat = categories.find((c) => c.id === activeCategory);
				return (
					<CategoryStub
						label={cat?.label || "Settings"}
						icon={cat?.icon}
						description={`Configure your ${cat?.label.toLowerCase()} preferences and system behavior.`}
					/>
				);
			}
		}
	};

	return (
		<div
			className={`
        fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ease-out
        ${isOpen ? "opacity-100 pointer-events-auto backdrop-blur-md" : "opacity-0 pointer-events-none backdrop-blur-0"}
      `}
		>
			<button
				type="button"
				className="absolute inset-0 bg-black/40"
				onClick={onClose}
				aria-label="Close settings"
			/>

			<div
				className={`
          relative bg-[#0a0a0c] border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex
          transform transition-all ease-out transform-gpu
          ${isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}
          ${isResizing ? "duration-0 transition-none select-none" : "duration-300"}
        `}
				style={{
					width: `${size.width}px`,
					height: `${size.height}px`,
				}}
			>
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
						<button
							type="button"
							onClick={onClose}
							className="p-2 rounded-xl text-foreground-muted hover:text-white hover:bg-white/[0.05] transition-all"
						>
							<X size={18} />
						</button>
					</div>

					{/* Scrollable Content */}
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

				{/* Resize Handle */}
				<button
					type="button"
					onMouseDown={(e) => {
						e.preventDefault();
						setIsResizing(true);
						document.body.style.cursor = "nwse-resize";
					}}
					className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize flex items-center justify-center group z-50"
					aria-label="Resize settings window"
				>
					<div className="w-1.5 h-1.5 bg-white/20 rounded-full transition-all group-hover:bg-accent group-hover:scale-125 translate-x-1 translate-y-1" />
				</button>
			</div>
		</div>
	);
};
