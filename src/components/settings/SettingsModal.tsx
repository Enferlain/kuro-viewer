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
import { useCallback, useEffect, useRef, useState } from "react";
import type { PluginSettingsStore } from "../../plugin-system/settings";
import type { AppSettings } from "../../stores/settings";
import { useSettings } from "../../stores/settings";
import { createInspectTargetAttrs } from "../devtools/inspectTargets";
import { Button } from "../ui/Button";
import { SettingsSearch } from "./SettingsSearch";
import { AppearanceTab } from "./tabs/AppearanceTab";
import { CategoryStub } from "./tabs/CategoryStub";
import { ContentTab } from "./tabs/ContentTab";
import { ControlsTab } from "./tabs/ControlsTab";
import { EditTab } from "./tabs/EditTab";
import { FileTypesTab } from "./tabs/FileTypesTab";
import { GeneralTab } from "./tabs/GeneralTab";
import { LanguageTab } from "./tabs/LanguageTab";
import { LayoutTab } from "./tabs/LayoutTab";
import { PluginsTab } from "./tabs/PluginsTab";
import { PrivacyTab } from "./tabs/PrivacyTab";
import { type Playlist, SlideshowTab } from "./tabs/SlideshowTab";

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
	pluginSettings: PluginSettingsStore;
	onPluginSettingsCommit: (next: PluginSettingsStore) => void;
}

/**
 * Helper to produce a setter for a nested field inside the draft.
 * Usage: `field(draft, setDraft, "general", "gpuEnabled")`
 * returns [currentValue, setter] like useState.
 */
function useField<S extends keyof AppSettings, K extends keyof AppSettings[S]>(
	draft: AppSettings,
	setDraft: React.Dispatch<React.SetStateAction<AppSettings>>,
	section: S,
	key: K,
): [AppSettings[S][K], (v: AppSettings[S][K]) => void] {
	const value = draft[section][key];
	const setter = (v: AppSettings[S][K]) => {
		setDraft((prev) => ({
			...prev,
			[section]: { ...prev[section], [key]: v },
		}));
	};
	return [value, setter];
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
	isOpen,
	onClose,
	pluginSettings,
	onPluginSettingsCommit,
}) => {
	const { settings, updateSettings } = useSettings();
	const [isVisible, setIsVisible] = useState(false);
	const [activeCategory, setActiveCategory] =
		useState<SettingCategory>("general");

	// Size State
	const [size, setSize] = useState({ width: 860, height: 680 });
	const [isResizing, setIsResizing] = useState(false);

	// --- DRAFT STATE ---
	// Clone of persisted settings, mutated locally until Apply.
	const [draft, setDraft] = useState<AppSettings>(() =>
		structuredClone(settings),
	);
	const [pluginSettingsDraft, setPluginSettingsDraft] =
		useState<PluginSettingsStore>(() => structuredClone(pluginSettings));
	const baselineRef = useRef<string>("");
	const pluginBaselineRef = useRef<string>("");
	const wasOpenRef = useRef(false);

	// General
	const [startupRun, setStartupRun] = useField(
		draft,
		setDraft,
		"general",
		"startupRun",
	);
	const [checkUpdates, setCheckUpdates] = useField(
		draft,
		setDraft,
		"general",
		"checkUpdates",
	);
	const [allowInstances, setAllowInstances] = useField(
		draft,
		setDraft,
		"general",
		"allowInstances",
	);
	const [watchChanges, setWatchChanges] = useField(
		draft,
		setDraft,
		"general",
		"watchChanges",
	);
	const [autoOpenNew, setAutoOpenNew] = useField(
		draft,
		setDraft,
		"general",
		"autoOpenNew",
	);
	const [gpuEnabled, setGpuEnabled] = useField(
		draft,
		setDraft,
		"general",
		"gpuEnabled",
	);
	const [lowPower, setLowPower] = useField(
		draft,
		setDraft,
		"general",
		"lowPower",
	);
	const [cacheSize, setCacheSize] = useField(
		draft,
		setDraft,
		"general",
		"cacheSize",
	);

	// Appearance
	const [theme, setTheme] = useField(draft, setDraft, "appearance", "theme");
	const [backdropStyle, setBackdropStyle] = useField(
		draft,
		setDraft,
		"appearance",
		"backdropStyle",
	);
	const [accentColor, setAccentColor] = useField(
		draft,
		setDraft,
		"appearance",
		"accentColor",
	);
	const [gridOpacity, _setGridOpacity] = useField(
		draft,
		setDraft,
		"appearance",
		"gridOpacity",
	);
	const [customThemes, setCustomThemes] = useField(
		draft,
		setDraft,
		"appearance",
		"customThemes",
	);
	const [selectedThemeId, setSelectedThemeId] = useField(
		draft,
		setDraft,
		"appearance",
		"selectedThemeId",
	);

	// Layout
	const [toolbarPos, setToolbarPos] = useField(
		draft,
		setDraft,
		"layout",
		"toolbarPos",
	);
	const [galleryPos, setGalleryPos] = useField(
		draft,
		setDraft,
		"layout",
		"galleryPos",
	);
	const [sidebarPos, setSidebarPos] = useField(
		draft,
		setDraft,
		"layout",
		"sidebarPos",
	);
	const [autoHideToolbar, setAutoHideToolbar] = useField(
		draft,
		setDraft,
		"layout",
		"autoHideToolbar",
	);
	const [draggingItem, setDraggingItem] = useState<string | null>(null);

	// Slideshow
	const [slideshowEnabled, setSlideshowEnabled] = useField(
		draft,
		setDraft,
		"slideshow",
		"enabled",
	);
	const [slideshowInterval, setSlideshowInterval] = useField(
		draft,
		setDraft,
		"slideshow",
		"intervalSeconds",
	);
	const [slideshowLoop, setSlideshowLoop] = useField(
		draft,
		setDraft,
		"slideshow",
		"loop",
	);
	const [slideshowShuffle, setSlideshowShuffle] = useField(
		draft,
		setDraft,
		"slideshow",
		"shuffle",
	);
	const [transitionStyle, setTransitionStyle] = useField(
		draft,
		setDraft,
		"slideshow",
		"transitionStyle",
	);
	const [playlists, setPlaylists] = useState<Playlist[]>([]);
	const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

	// Controls
	const [primaryScroll, setPrimaryScroll] = useField(
		draft,
		setDraft,
		"controls",
		"primaryScroll",
	);
	const [middleClick, setMiddleClick] = useField(
		draft,
		setDraft,
		"controls",
		"middleClick",
	);
	const [invertScroll, setInvertScroll] = useField(
		draft,
		setDraft,
		"controls",
		"invertScroll",
	);
	const [ctrlScroll, setCtrlScroll] = useField(
		draft,
		setDraft,
		"controls",
		"ctrlScroll",
	);
	const [shiftScroll, setShiftScroll] = useField(
		draft,
		setDraft,
		"controls",
		"shiftScroll",
	);
	const [spacebarAction, setSpacebarAction] = useField(
		draft,
		setDraft,
		"controls",
		"spacebarAction",
	);
	const [keybinds, setKeybinds] = useField(
		draft,
		setDraft,
		"controls",
		"keybinds",
	);

	// File Types
	const [fileAssociations, setFileAssociations] = useField(
		draft,
		setDraft,
		"fileTypes",
		"associations",
	);

	// Content
	const [libraryPaths, setLibraryPaths] = useField(
		draft,
		setDraft,
		"content",
		"libraryPaths",
	);
	const [clipEnabled, setClipEnabled] = useField(
		draft,
		setDraft,
		"content",
		"clipEnabled",
	);
	const [extractMetadata, setExtractMetadata] = useField(
		draft,
		setDraft,
		"content",
		"extractMetadata",
	);

	// Privacy
	const [telemetryEnabled, setTelemetryEnabled] = useField(
		draft,
		setDraft,
		"privacy",
		"telemetryEnabled",
	);

	// Language
	const [displayLanguage, setDisplayLanguage] = useField(
		draft,
		setDraft,
		"language",
		"displayLanguage",
	);
	const [fallbackLanguage, setFallbackLanguage] = useField(
		draft,
		setDraft,
		"language",
		"fallbackLanguage",
	);
	const [dateFormat, setDateFormat] = useField(
		draft,
		setDraft,
		"language",
		"dateFormat",
	);
	const [timeFormat, setTimeFormat] = useField(
		draft,
		setDraft,
		"language",
		"timeFormat",
	);
	const [firstDayOfWeek, setFirstDayOfWeek] = useField(
		draft,
		setDraft,
		"language",
		"firstDayOfWeek",
	);
	const [numberFormat, setNumberFormat] = useField(
		draft,
		setDraft,
		"language",
		"numberFormat",
	);

	// Edit
	const [confirmDelete, setConfirmDelete] = useField(
		draft,
		setDraft,
		"edit",
		"confirmDelete",
	);
	const [confirmOverwrite, setConfirmOverwrite] = useField(
		draft,
		setDraft,
		"edit",
		"confirmOverwrite",
	);
	const [defaultSaveBehavior, setDefaultSaveBehavior] = useField(
		draft,
		setDraft,
		"edit",
		"defaultSaveBehavior",
	);
	const [preserveMetadata, setPreserveMetadata] = useField(
		draft,
		setDraft,
		"edit",
		"preserveMetadata",
	);
	const [saveAsCurrentFolder, setSaveAsCurrentFolder] = useField(
		draft,
		setDraft,
		"edit",
		"saveAsCurrentFolder",
	);
	const [enableClipboardPasting, setEnableClipboardPasting] = useField(
		draft,
		setDraft,
		"edit",
		"enableClipboardPasting",
	);
	const [multiFileSelection, setMultiFileSelection] = useField(
		draft,
		setDraft,
		"edit",
		"multiFileSelection",
	);
	const [primaryEditorPath, setPrimaryEditorPath] = useField(
		draft,
		setDraft,
		"edit",
		"primaryEditorPath",
	);
	const [secondaryEditorPath, setSecondaryEditorPath] = useField(
		draft,
		setDraft,
		"edit",
		"secondaryEditorPath",
	);
	const [cropGridType, setCropGridType] = useField(
		draft,
		setDraft,
		"edit",
		"cropGridType",
	);
	const [preserveCropAspectRatio, setPreserveCropAspectRatio] = useField(
		draft,
		setDraft,
		"edit",
		"preserveCropAspectRatio",
	);

	// Plugins
	const [disabledPlugins, setDisabledPlugins] = useField(
		draft,
		setDraft,
		"plugins",
		"disabledPlugins",
	);
	const updateDisabledPlugins = useCallback(
		(next: React.SetStateAction<string[]>) => {
			setDisabledPlugins(
				typeof next === "function" ? next(disabledPlugins) : next,
			);
		},
		[disabledPlugins, setDisabledPlugins],
	);

	// --- CHANGE TRACKING ---
	const hasChanges =
		(baselineRef.current !== "" &&
			baselineRef.current !== JSON.stringify(draft)) ||
		(pluginBaselineRef.current !== "" &&
			pluginBaselineRef.current !== JSON.stringify(pluginSettingsDraft));

	// Snapshot baseline + reset draft when modal opens
	useEffect(() => {
		if (isOpen) {
			setIsVisible(true);
			if (!wasOpenRef.current) {
				const cloned = structuredClone(settings);
				const clonedPluginSettings = structuredClone(pluginSettings);
				setDraft(cloned);
				setPluginSettingsDraft(clonedPluginSettings);
				baselineRef.current = JSON.stringify(cloned);
				pluginBaselineRef.current = JSON.stringify(clonedPluginSettings);
			}
		} else {
			const timer = setTimeout(() => setIsVisible(false), 200);
			wasOpenRef.current = false;
			return () => clearTimeout(timer);
		}
		wasOpenRef.current = true;
	}, [isOpen, settings, pluginSettings]);

	const handleApply = () => {
		const nextPluginSettings = structuredClone(pluginSettingsDraft);
		const nextSettings: AppSettings = {
			...draft,
			plugins: {
				...draft.plugins,
				installedSettings: nextPluginSettings,
			},
		};
		updateSettings(nextSettings);
		onPluginSettingsCommit(nextPluginSettings);
		baselineRef.current = JSON.stringify(nextSettings);
		pluginBaselineRef.current = JSON.stringify(nextPluginSettings);
		onClose();
	};

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
						toolbarOrder={0}
						galleryPos={galleryPos}
						setGalleryPos={setGalleryPos}
						galleryOrder={0}
						sidebarPos={sidebarPos}
						setSidebarPos={setSidebarPos}
						autoHideToolbar={autoHideToolbar}
						setAutoHideToolbar={setAutoHideToolbar}
						gridOpacity={gridOpacity}
						setGridOpacity={(v: number) => {
							setDraft((prev) => ({
								...prev,
								appearance: { ...prev.appearance, gridOpacity: v },
							}));
						}}
						draggingItem={draggingItem}
						setDraggingItem={setDraggingItem}
					/>
				);
			case "slideshow":
				return (
					<SlideshowTab
						slideshowEnabled={slideshowEnabled}
						setSlideshowEnabled={setSlideshowEnabled}
						slideshowInterval={slideshowInterval}
						setSlideshowInterval={setSlideshowInterval}
						slideshowLoop={slideshowLoop}
						setSlideshowLoop={setSlideshowLoop}
						slideshowShuffle={slideshowShuffle}
						setSlideshowShuffle={setSlideshowShuffle}
						transitionStyle={transitionStyle}
						setTransitionStyle={setTransitionStyle}
						playlists={playlists}
						setPlaylists={setPlaylists}
						activePlaylistId={activePlaylistId}
						setActivePlaylistId={setActivePlaylistId}
					/>
				);
			case "controls":
				return (
					<ControlsTab
						primaryScroll={primaryScroll}
						setPrimaryScroll={setPrimaryScroll}
						middleClick={middleClick}
						setMiddleClick={setMiddleClick}
						invertScroll={invertScroll}
						setInvertScroll={setInvertScroll}
						ctrlScroll={ctrlScroll}
						setCtrlScroll={setCtrlScroll}
						shiftScroll={shiftScroll}
						setShiftScroll={setShiftScroll}
						spacebarAction={spacebarAction}
						setSpacebarAction={setSpacebarAction}
						keybinds={keybinds}
						setKeybinds={setKeybinds}
					/>
				);
			case "fileType":
				return (
					<FileTypesTab
						fileAssociations={fileAssociations}
						setFileAssociations={setFileAssociations}
					/>
				);
			case "content":
				return (
					<ContentTab
						libraryPaths={libraryPaths}
						setLibraryPaths={setLibraryPaths}
						clipEnabled={clipEnabled}
						setClipEnabled={setClipEnabled}
						extractMetadata={extractMetadata}
						setExtractMetadata={setExtractMetadata}
					/>
				);
			case "privacy":
				return (
					<PrivacyTab
						telemetryEnabled={telemetryEnabled}
						setTelemetryEnabled={setTelemetryEnabled}
					/>
				);
			case "language":
				return (
					<LanguageTab
						displayLanguage={displayLanguage}
						setDisplayLanguage={setDisplayLanguage}
						fallbackLanguage={fallbackLanguage}
						setFallbackLanguage={setFallbackLanguage}
						dateFormat={dateFormat}
						setDateFormat={setDateFormat}
						timeFormat={timeFormat}
						setTimeFormat={setTimeFormat}
						firstDayOfWeek={firstDayOfWeek}
						setFirstDayOfWeek={setFirstDayOfWeek}
						numberFormat={numberFormat}
						setNumberFormat={setNumberFormat}
					/>
				);
			case "edit":
				return (
					<EditTab
						confirmDelete={confirmDelete}
						setConfirmDelete={setConfirmDelete}
						confirmOverwrite={confirmOverwrite}
						setConfirmOverwrite={setConfirmOverwrite}
						defaultSaveBehavior={defaultSaveBehavior}
						setDefaultSaveBehavior={setDefaultSaveBehavior}
						preserveMetadata={preserveMetadata}
						setPreserveMetadata={setPreserveMetadata}
						saveAsCurrentFolder={saveAsCurrentFolder}
						setSaveAsCurrentFolder={setSaveAsCurrentFolder}
						enableClipboardPasting={enableClipboardPasting}
						setEnableClipboardPasting={setEnableClipboardPasting}
						multiFileSelection={multiFileSelection}
						setMultiFileSelection={setMultiFileSelection}
						primaryEditorPath={primaryEditorPath}
						setPrimaryEditorPath={setPrimaryEditorPath}
						secondaryEditorPath={secondaryEditorPath}
						setSecondaryEditorPath={setSecondaryEditorPath}
						cropGridType={cropGridType}
						setCropGridType={setCropGridType}
						preserveCropAspectRatio={preserveCropAspectRatio}
						setPreserveCropAspectRatio={setPreserveCropAspectRatio}
					/>
				);
			case "plugins":
				return (
					<PluginsTab
						disabledPlugins={disabledPlugins}
						onDisabledPluginsChange={updateDisabledPlugins}
						pluginSettings={pluginSettingsDraft}
						onPluginSettingsChange={setPluginSettingsDraft}
						hostModalSize={size}
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

	const handleSearchSelect = (category: SettingCategory, elementId: string) => {
		setActiveCategory(category);

		// Yield execution so the new tab renders before we attempt scrolling
		setTimeout(() => {
			const target = document.getElementById(elementId);
			if (target) {
				target.scrollIntoView({ behavior: "smooth", block: "center" });

				// Pulse animation mechanism
				target.setAttribute("data-highlight", "true");
				setTimeout(() => target.removeAttribute("data-highlight"), 1500);
			}
		}, 150);
	};

	return (
		<div
			className={`
	        fixed inset-0 z-[var(--ui-layer-modal)] flex items-center justify-center p-4 transition-opacity duration-[var(--ui-motion-duration-slow)] ease-[var(--ease-decelerate)]
	        ${isOpen ? "opacity-100 pointer-events-auto backdrop-blur-md" : "opacity-0 pointer-events-none backdrop-blur-0"}
	      `}
		>
			<button
				type="button"
				className="absolute inset-0 bg-overlay-dim"
				onClick={onClose}
				aria-label="Close settings"
			/>

			<div
				{...createInspectTargetAttrs({
					label: "Settings Modal",
					sourcePath: "src/components/settings/SettingsModal.tsx",
					sourceLine: 770,
					kind: "host-component",
					area: "modal",
				})}
				className={`
	          relative bg-background-deep border border-glass-border-strong rounded-2xl shadow-xl overflow-hidden flex
	          transform transition-[transform,opacity] ease-[var(--ease-decelerate)] transform-gpu
	          ${isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"}
	          ${isResizing ? "duration-[var(--ui-motion-duration-instant)] transition-none select-none" : "duration-[var(--ui-motion-duration-slow)]"}
	        `}
				style={{
					width: `${size.width}px`,
					height: `${size.height}px`,
				}}
			>
				{/* Sidebar Navigation */}
				<div className="w-[240px] flex-none border-r border-glass-border-base bg-glass-bg-base flex flex-col">
					<div className="p-6">
						<h3 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
							Settings
						</h3>
					</div>

					<nav className="flex-1 overflow-y-auto px-3 pb-6 space-y-1 custom-scrollbar">
						{categories.map((cat) => (
							<button
								type="button"
								key={cat.id}
								onClick={() => setActiveCategory(cat.id)}
								className={[
									"w-full flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-[transform,background-color,color,box-shadow] duration-[var(--ui-motion-duration-standard)] group",
									activeCategory === cat.id
										? "bg-accent text-accent-foreground shadow-glow translate-x-1"
										: "text-foreground-muted hover:text-foreground hover:bg-glass-bg-base",
								].join(" ")}
							>
								<div className="flex items-center gap-3">
									<span
										className={`transition-transform duration-[var(--ui-motion-duration-standard)] ${activeCategory === cat.id ? "scale-110" : "group-hover:scale-110"}`}
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

					<div className="p-4 border-t border-glass-border-base bg-overlay-focus">
						<div className="flex flex-col gap-1">
							<span className="text-[10px] text-foreground-muted font-bold uppercase tracking-widest">
								Kuro Viewer
							</span>
							<span className="text-[10px] text-foreground-subtle/60">
								Version 0.4.2-alpha
							</span>
						</div>
					</div>
				</div>

				{/* Content Area */}
				<div className="flex-1 flex flex-col min-w-0">
					<div className="flex-none flex justify-between items-center px-10 py-5">
						<SettingsSearch onSelect={handleSearchSelect} />
						<button
							type="button"
							onClick={onClose}
							className="p-2 rounded-xl text-foreground-muted hover:text-foreground-hover hover:bg-glass-bg-hover cursor-pointer transition-[background-color,color] duration-[var(--ui-motion-duration-standard)]"
						>
							<X size={18} />
						</button>
					</div>

					{/* Scrollable Content */}
					<div className="flex-1 overflow-y-auto px-10 pb-6 custom-scrollbar scroll-smooth">
						{renderContent()}
					</div>

					<div className="flex-none px-10 py-4 border-t border-glass-border-base bg-glass-bg-base flex justify-end gap-3 items-center">
						<Button variant="secondary" onClick={onClose} className="px-6 h-9">
							Cancel
						</Button>
						<Button
							variant="primary"
							onClick={handleApply}
							disabled={!hasChanges}
							className={`px-8 h-9 transition-[opacity,box-shadow,transform] duration-[var(--ui-motion-duration-standard)] 
								${hasChanges ? "shadow-glow opacity-100" : "opacity-40 cursor-not-allowed shadow-none"}`}
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
					className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize flex items-center justify-center group z-[var(--ui-layer-overlay)]"
					aria-label="Resize settings window"
				>
					<div className="w-1.5 h-1.5 bg-glass-bg-strong rounded-full transition-[transform,background-color] duration-[var(--ui-motion-duration-standard)] group-hover:bg-accent group-hover:scale-125 translate-x-1 translate-y-1" />
				</button>
			</div>
		</div>
	);
};
