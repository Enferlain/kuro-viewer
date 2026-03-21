import { ChevronLeft, ChevronRight } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImageViewer } from "./components/ImageViewer";
import { MetadataModal } from "./components/MetadataModal";
import { SettingsModal } from "./components/settings/SettingsModal";
import { ThumbnailStrip } from "./components/ThumbnailStrip";
import { Toolbar } from "./components/Toolbar";
import {
	createForensicsModeActions,
	cycleForensicsMode,
	FORENSICS_PLUGIN,
	type ForensicsPluginState,
	getForensicsModeHotkey,
	readForensicsStateFromStore,
} from "./plugin-system/forensics";
import {
	createInitialPluginSettingsStore,
	type PluginSettingsStore,
} from "./plugin-system/settings";
import { useSettings } from "./stores/settings";
import {
	FilterType,
	type ImageFile,
	type ImageMetadata,
	type ViewerState,
} from "./types";

const IS_TAURI = "__TAURI_INTERNALS__" in window;

function isPluginDisabled(
	disabledPlugins: string[],
	pluginId: string,
): boolean {
	return disabledPlugins.includes(pluginId);
}

function createRuntimeDisabledForensicsState(
	state: ForensicsPluginState,
): ForensicsPluginState {
	return {
		...state,
		mode: FilterType.NONE,
		magnifier: {
			...state.magnifier,
			enabled: false,
		},
		view: {
			...state.view,
			sideBySide: false,
			outputScore: false,
		},
	};
}

function createHydratedPluginSettingsStore(
	stored: Record<string, unknown> | undefined,
): PluginSettingsStore {
	return {
		...createInitialPluginSettingsStore(),
		...(stored ?? {}),
	};
}

// Placeholder data generation
const generateMockImages = (): ImageFile[] => {
	const images = [];
	const subjects = [
		"mountain",
		"river",
		"city",
		"abstract",
		"technology",
		"space",
	];
	for (let i = 0; i < 15; i++) {
		const id = i + 1;
		// Varying aspect ratios for testing fit
		const width = 1200 + Math.floor(Math.random() * 800);
		const height = 800 + Math.floor(Math.random() * 800);
		const subject = subjects[i % subjects.length];
		images.push({
			id: `img-${id}`,
			url: `https://picsum.photos/seed/${id + 50}/${width}/${height}`,
			name: `${subject}_sample_${id.toString().padStart(3, "0")}.png`,
		});
	}
	return images;
};

const MOCK_IMAGES = generateMockImages();

const App: React.FC = () => {
	const { settings, updateSettings } = useSettings();
	const settingsRef = useRef(settings);
	useEffect(() => {
		settingsRef.current = settings;
	}, [settings]);

	const [images] = useState<ImageFile[]>(MOCK_IMAGES);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [pluginSettings, setPluginSettings] = useState<PluginSettingsStore>(
		() => createHydratedPluginSettingsStore(settings.plugins.installedSettings),
	);
	useEffect(() => {
		setPluginSettings(
			createHydratedPluginSettingsStore(settings.plugins.installedSettings),
		);
	}, [settings.plugins.installedSettings]);

	const removePluginFromPersistedState = useCallback(
		(pluginId: string) => {
			const currentSettings = settingsRef.current;
			const hasInstalledSettings =
				pluginId in currentSettings.plugins.installedSettings;
			const hasDisabledState =
				currentSettings.plugins.disabledPlugins.includes(pluginId);

			if (!hasInstalledSettings && !hasDisabledState) {
				return;
			}

			const nextInstalledSettings = {
				...currentSettings.plugins.installedSettings,
			};
			delete nextInstalledSettings[pluginId];

			updateSettings({
				...currentSettings,
				plugins: {
					...currentSettings.plugins,
					disabledPlugins: currentSettings.plugins.disabledPlugins.filter(
						(id) => id !== pluginId,
					),
					installedSettings: nextInstalledSettings,
				},
			});
		},
		[updateSettings],
	);

	useEffect(() => {
		if (!IS_TAURI) {
			return;
		}

		let disposed = false;
		let unlisten: (() => void) | null = null;

		void (async () => {
			try {
				const { listen } = await import("@tauri-apps/api/event");
				const teardown = await listen<string>("plugin-uninstalled", (event) => {
					if (disposed || typeof event.payload !== "string") {
						return;
					}
					const pluginId = event.payload;
					setPluginSettings((prev) => {
						if (!(pluginId in prev)) {
							return prev;
						}
						const next = { ...prev };
						delete next[pluginId];
						return next;
					});
					removePluginFromPersistedState(pluginId);
				});

				if (disposed) {
					teardown();
					return;
				}
				unlisten = teardown;
			} catch (error) {
				console.warn("Failed to subscribe to plugin-uninstalled event:", error);
			}
		})();

		return () => {
			disposed = true;
			unlisten?.();
		};
	}, [removePluginFromPersistedState]);

	const isForensicsDisabled = isPluginDisabled(
		settings.plugins.disabledPlugins,
		FORENSICS_PLUGIN.id,
	);

	const forensicsState = useMemo(
		() => readForensicsStateFromStore(pluginSettings),
		[pluginSettings],
	);
	const runtimeForensicsState = useMemo(
		() =>
			isForensicsDisabled
				? createRuntimeDisabledForensicsState(forensicsState)
				: forensicsState,
		[forensicsState, isForensicsDisabled],
	);
	const forensicsModeActions = useMemo(
		() =>
			isForensicsDisabled
				? []
				: createForensicsModeActions(runtimeForensicsState.hotkeys),
		[runtimeForensicsState.hotkeys, isForensicsDisabled],
	);
	const updateForensicsState = useCallback(
		(next: React.SetStateAction<ForensicsPluginState>) => {
			setPluginSettings((prev) => {
				const current = readForensicsStateFromStore(prev);
				const resolved = typeof next === "function" ? next(current) : next;
				return {
					...prev,
					[FORENSICS_PLUGIN.id]: resolved,
				};
			});
		},
		[],
	);
	const [analysisScore, setAnalysisScore] = useState<number | null>(null);
	const [isMetadataOpen, setIsMetadataOpen] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [isToolbarVisible, setIsToolbarVisible] = useState(true);
	const [isGalleryVisible, setIsGalleryVisible] = useState(true);

	// Hover zone state for navigation arrows
	const [hoverZone, setHoverZone] = useState<"left" | "right" | null>(null);

	// Initialize scale with 0 to indicate "uncalculated" or "fit to view pending"
	const [viewerState, setViewerState] = useState<ViewerState>({
		scale: 0,
		translation: { x: 0, y: 0 },
		isFit: true,
	});

	const currentImage = images[selectedIndex];
	const activeFilter = runtimeForensicsState.mode;
	const navControlButtonClass =
		"pointer-events-auto h-[var(--spacing-nav-control)] w-[var(--spacing-nav-control)] rounded-full flex items-center justify-center border border-glass-border-base bg-overlay-dim backdrop-blur-xl text-foreground-secondary shadow-xl transition-[transform,background-color,border-color,box-shadow,color] duration-[var(--ui-motion-duration-standard)] ease-[var(--ease-decelerate)] transform-gpu will-change-transform hover:bg-glass-bg-hover hover:border-glass-border-hover hover:text-foreground hover:shadow-glow hover:scale-110 active:scale-95";

	// Generate deterministic mock metadata for the current image (Simulating Stable Diffusion / Gen AI metadata)
	const currentMetadata: ImageMetadata = useMemo(() => {
		if (!currentImage) return [];
		const seed = parseInt(currentImage.id.replace(/\D/g, ""), 10) || 1;

		// Simulate realistic varied data
		const steps = 20 + (seed % 4) * 10;
		const cfg = 7 + (seed % 5) * 0.5;
		const width = 1024;
		const height = 1024;

		return [
			{
				id: "file",
				label: "File Information",
				entries: [
					{ key: "File Name", value: currentImage.name },
					{
						key: "File Size",
						value: `${(2.4 + (seed % 10) * 0.3).toFixed(2)} MB`,
					},
					{ key: "Dimensions", value: `${width}x${height}` },
					{
						key: "Date Created",
						value: new Date().toISOString().split("T")[0],
					},
					{ key: "MIME Type", value: "image/png" },
				],
			},
			{
				id: "generation",
				label: "Generation Parameters",
				entries: [
					{
						key: "Prompt",
						value:
							"masterpiece, best quality, ultra-detailed, 8k, cyberpunk city, neon lights, rain, reflection, volumetric lighting, cinematic composition, intricate details, highly detailed texture, ray tracing",
						isLong: true,
					},
					{
						key: "Negative Prompt",
						value:
							"low quality, worst quality, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
						isLong: true,
					},
				],
			},
			{
				id: "config",
				label: "Model Configuration",
				entries: [
					{ key: "Model", value: "revAnimated_v122" },
					{ key: "Model Hash", value: "4199bcdd14" },
					{ key: "Sampler", value: "DPM++ 2M Karras" },
					{ key: "Steps", value: steps.toString() },
					{ key: "CFG Scale", value: cfg.toString() },
					{ key: "Seed", value: (34293482 + seed * 1234).toString() },
					{ key: "Clip Skip", value: "2" },
					{ key: "VAE", value: "vae-ft-mse-840000-ema-pruned.ckpt" },
				],
			},
			{
				id: "env",
				label: "Environment",
				entries: [
					{ key: "Software", value: "Automatic1111 WebUI" },
					{ key: "Version", value: "v1.6.0" },
					{ key: "GPU", value: "NVIDIA GeForce RTX 4090" },
				],
			},
		];
	}, [currentImage]);

	// -- Handlers --

	const handleSelectIndex = useCallback((index: number) => {
		// Synchronously update both to avoid "popping" where new image is seen at old scale
		setSelectedIndex(index);
		setViewerState({ scale: 0, translation: { x: 0, y: 0 }, isFit: true });
	}, []);

	const handleNext = useCallback(() => {
		handleSelectIndex((selectedIndex + 1) % images.length);
	}, [selectedIndex, images.length, handleSelectIndex]);

	const handlePrev = useCallback(() => {
		handleSelectIndex((selectedIndex - 1 + images.length) % images.length);
	}, [selectedIndex, images.length, handleSelectIndex]);

	// Triggers the ImageViewer to recalculate fit
	const handleResetView = useCallback(() => {
		setViewerState({ scale: 0, translation: { x: 0, y: 0 }, isFit: true });
	}, []);

	const handleZoomIn = useCallback(() => {
		setViewerState((prev) => ({
			...prev,
			scale: prev.scale === 0 ? 1.2 : Math.min(prev.scale * 1.2, 50),
			isFit: false,
		}));
	}, []);

	const handleZoomOut = useCallback(() => {
		setViewerState((prev) => ({
			...prev,
			scale: prev.scale === 0 ? 0.8 : Math.max(prev.scale / 1.2, 0.05),
			isFit: false,
		}));
	}, []);

	const handleMouseMove = useCallback((e: React.MouseEvent) => {
		// Only process if we have a valid container width
		const container = e.currentTarget;
		const width = container.clientWidth;
		const x = e.clientX;

		// Define the threshold for side zones (15% of screen or max 180px)
		const threshold = Math.min(width * 0.15, 180);

		if (x < threshold) {
			setHoverZone("left");
		} else if (x > width - threshold) {
			setHoverZone("right");
		} else {
			setHoverZone(null);
		}
	}, []);

	const handleMouseLeave = useCallback(() => {
		setHoverZone(null);
	}, []);

	// -- Keyboard Shortcuts --

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Ignore if input is focused
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			)
				return;

			const modeAction = getForensicsModeHotkey(e.key, forensicsState.hotkeys);
			if (!isForensicsDisabled && modeAction) {
				e.preventDefault();
				updateForensicsState((prev) => ({ ...prev, mode: modeAction.mode }));
				return;
			}

			if (
				!isForensicsDisabled &&
				e.key.toLowerCase() === forensicsState.hotkeys.sideBySide.toLowerCase()
			) {
				e.preventDefault();
				updateForensicsState((prev) => ({
					...prev,
					view: {
						...prev.view,
						sideBySide: !prev.view.sideBySide,
					},
				}));
				return;
			}

			switch (e.key) {
				case "ArrowRight":
					e.preventDefault();
					handleNext();
					break;
				case "ArrowLeft":
					e.preventDefault();
					handlePrev();
					break;
				case "[":
					if (isForensicsDisabled) break;
					e.preventDefault();
					updateForensicsState((prev) => ({
						...prev,
						mode: cycleForensicsMode(prev.mode, "prev"),
					}));
					break;
				case "]":
					if (isForensicsDisabled) break;
					e.preventDefault();
					updateForensicsState((prev) => ({
						...prev,
						mode: cycleForensicsMode(prev.mode, "next"),
					}));
					break;
				case "0":
					e.preventDefault();
					handleResetView();
					break;
				case "+":
				case "=":
					e.preventDefault();
					handleZoomIn();
					break;
				case "-":
				case "_":
					e.preventDefault();
					handleZoomOut();
					break;
				case "i":
				case "I":
				case "x":
				case "X":
					e.preventDefault();
					setIsMetadataOpen((prev) => !prev);
					break;
				case "t":
				case "T":
					e.preventDefault();
					setIsToolbarVisible((prev) => !prev);
					break;
				case "g":
				case "G":
					e.preventDefault();
					setIsGalleryVisible((prev) => !prev);
					break;
				case ",":
					e.preventDefault();
					setIsSettingsOpen((prev) => !prev);
					break;
				case "Escape":
					e.preventDefault();
					setIsMetadataOpen(false);
					setIsSettingsOpen(false);
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		isForensicsDisabled,
		forensicsState.hotkeys,
		handleNext,
		handlePrev,
		handleResetView,
		handleZoomIn,
		handleZoomOut,
		updateForensicsState,
	]);

	return (
		<div className="flex flex-col h-screen w-screen bg-background-deep text-foreground font-sans overflow-hidden">
			{/* 1. Header / Toolbar */}
			<div
				className={`transition-[height,opacity] duration-(--ui-motion-duration-slow) ease-standard overflow-hidden ${
					isToolbarVisible ? "h-toolbar opacity-100" : "h-0 opacity-0"
				}`}
			>
				<Toolbar
					currentFilter={activeFilter}
					modeActions={forensicsModeActions}
					onFilterChange={(mode) =>
						updateForensicsState((prev) => ({ ...prev, mode }))
					}
					score={analysisScore}
					showScore={runtimeForensicsState.view.outputScore}
					onZoomIn={handleZoomIn}
					onZoomOut={handleZoomOut}
					onReset={handleResetView}
					onInfo={() => setIsMetadataOpen(true)}
					onSettings={() => setIsSettingsOpen(true)}
					filename={currentImage?.name || "No Image"}
					zoomLevel={viewerState.scale}
				/>
			</div>

			{/* 2. Main Content Area */}
			<section
				className="flex-1 flex flex-col relative min-h-0"
				onMouseMove={handleMouseMove}
				onMouseLeave={handleMouseLeave}
				aria-label="Main Content Area"
			>
				{currentImage ? (
					<>
						<ImageViewer
							src={currentImage.url}
							activeFilter={activeFilter}
							forensicsState={runtimeForensicsState}
							onAnalysisScoreChange={setAnalysisScore}
							viewerState={viewerState}
							setViewerState={setViewerState}
						/>

						{/* Left Navigation Zone Overlay */}
						<div
							className={`
                absolute left-0 top-0 bottom-0 w-32 flex items-center justify-start pl-6 
		                transition-opacity duration-[var(--ui-motion-duration-slow)] pointer-events-none z-[var(--ui-layer-content)]
                ${hoverZone === "left" ? "opacity-100" : "opacity-0"}
              `}
						>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handlePrev();
								}}
								className={`${navControlButtonClass} pr-1`}
								title="Previous Image"
							>
								<ChevronLeft size={32} strokeWidth={1.5} />
							</button>
						</div>

						{/* Right Navigation Zone Overlay */}
						<div
							className={`
                absolute right-0 top-0 bottom-0 w-32 flex items-center justify-end pr-6 
		                transition-opacity duration-[var(--ui-motion-duration-slow)] pointer-events-none z-[var(--ui-layer-content)]
                ${hoverZone === "right" ? "opacity-100" : "opacity-0"}
              `}
						>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handleNext();
								}}
								className={`${navControlButtonClass} pl-1`}
								title="Next Image"
							>
								<ChevronRight size={32} strokeWidth={1.5} />
							</button>
						</div>
					</>
				) : (
					<div className="flex-1 flex items-center justify-center text-foreground-muted">
						No images loaded
					</div>
				)}
			</section>

			{/* 3. Footer / Thumbnails */}
			<div
				className={`transition-[height,opacity] duration-(--ui-motion-duration-slow) ease-standard overflow-hidden ${isGalleryVisible ? "h-thumbnail-strip opacity-100" : "h-0 opacity-0"}`}
			>
				<ThumbnailStrip
					images={images}
					selectedIndex={selectedIndex}
					onSelect={handleSelectIndex}
				/>
			</div>

			{/* 4. Overlays */}
			<MetadataModal
				isOpen={isMetadataOpen}
				onClose={() => setIsMetadataOpen(false)}
				filename={currentImage?.name || ""}
				data={currentMetadata}
			/>

			<SettingsModal
				isOpen={isSettingsOpen}
				onClose={() => setIsSettingsOpen(false)}
				pluginSettings={pluginSettings}
				onPluginSettingsCommit={setPluginSettings}
			/>
		</div>
	);
};

export default App;
