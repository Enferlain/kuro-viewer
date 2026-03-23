import { ChevronLeft, ChevronRight } from "lucide-react";
import type React from "react";
import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { ImageViewer } from "./components/ImageViewer";
import { MetadataModal } from "./components/MetadataModal";
import { SettingsModal } from "./components/settings/SettingsModal";
import { ThumbnailStrip } from "./components/ThumbnailStrip";
import { Toolbar } from "./components/Toolbar";
import {
	createInitialPluginSettingsStore,
	type PluginSettingsStore,
} from "./plugin-system/settings";
import { useSettings } from "./stores/settings";
import type { ImageFile, ImageMetadata, ViewerState } from "./types";

const DevTools = import.meta.env.DEV
	? lazy(() =>
			import("./components/devtools/DevTools").then((m) => ({
				default: m.DevTools,
			})),
		)
	: null;

const IS_TAURI = "__TAURI_INTERNALS__" in window;

function createHydratedPluginSettingsStore(
	stored: Record<string, unknown> | undefined,
): PluginSettingsStore {
	return {
		...createInitialPluginSettingsStore(),
		...(stored ?? {}),
	};
}

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
	for (let index = 0; index < 15; index += 1) {
		const id = index + 1;
		const width = 1200 + Math.floor(Math.random() * 800);
		const height = 800 + Math.floor(Math.random() * 800);
		const subject = subjects[index % subjects.length];
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

	const [isMetadataOpen, setIsMetadataOpen] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);
	const [isToolbarVisible, setIsToolbarVisible] = useState(true);
	const [isGalleryVisible, setIsGalleryVisible] = useState(true);
	const [hoverZone, setHoverZone] = useState<"left" | "right" | null>(null);
	const [viewerState, setViewerState] = useState<ViewerState>({
		scale: 0,
		translation: { x: 0, y: 0 },
		isFit: true,
	});

	const currentImage = images[selectedIndex];
	const navControlButtonClass =
		"pointer-events-auto h-[var(--spacing-nav-control)] w-[var(--spacing-nav-control)] rounded-full flex items-center justify-center border border-glass-border-base bg-overlay-dim backdrop-blur-xl text-foreground-secondary shadow-xl transition-[transform,background-color,border-color,box-shadow,color] duration-[var(--ui-motion-duration-standard)] ease-[var(--ease-decelerate)] transform-gpu will-change-transform hover:bg-glass-bg-hover hover:border-glass-border-hover hover:text-foreground hover:shadow-glow hover:scale-110 active:scale-95";

	const currentMetadata: ImageMetadata = (() => {
		if (!currentImage) return [];
		const seed = Number.parseInt(currentImage.id.replace(/\D/g, ""), 10) || 1;
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
	})();

	const handleSelectIndex = useCallback((index: number) => {
		setSelectedIndex(index);
		setViewerState({ scale: 0, translation: { x: 0, y: 0 }, isFit: true });
	}, []);

	const handleNext = useCallback(() => {
		handleSelectIndex((selectedIndex + 1) % images.length);
	}, [selectedIndex, images.length, handleSelectIndex]);

	const handlePrev = useCallback(() => {
		handleSelectIndex((selectedIndex - 1 + images.length) % images.length);
	}, [selectedIndex, images.length, handleSelectIndex]);

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

	const handleMouseMove = useCallback((event: React.MouseEvent) => {
		const container = event.currentTarget;
		const width = container.clientWidth;
		const x = event.clientX;
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

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				event.target instanceof HTMLInputElement ||
				event.target instanceof HTMLTextAreaElement
			) {
				return;
			}

			switch (event.key) {
				case "ArrowRight":
					event.preventDefault();
					handleNext();
					break;
				case "ArrowLeft":
					event.preventDefault();
					handlePrev();
					break;
				case "0":
					event.preventDefault();
					handleResetView();
					break;
				case "+":
				case "=":
					event.preventDefault();
					handleZoomIn();
					break;
				case "-":
				case "_":
					event.preventDefault();
					handleZoomOut();
					break;
				case "i":
				case "I":
				case "x":
				case "X":
					event.preventDefault();
					setIsMetadataOpen((prev) => !prev);
					break;
				case "t":
				case "T":
					event.preventDefault();
					setIsToolbarVisible((prev) => !prev);
					break;
				case "g":
				case "G":
					event.preventDefault();
					setIsGalleryVisible((prev) => !prev);
					break;
				case ",":
					event.preventDefault();
					setIsSettingsOpen((prev) => !prev);
					break;
				case "F12":
					if (import.meta.env.DEV) {
						event.preventDefault();
						setIsDevToolsOpen((prev) => !prev);
					}
					break;
				case "Escape":
					event.preventDefault();
					setIsMetadataOpen(false);
					setIsSettingsOpen(false);
					setIsDevToolsOpen(false);
					break;
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleNext, handlePrev, handleResetView, handleZoomIn, handleZoomOut]);

	return (
		<div className="flex flex-col h-screen w-screen bg-background-deep text-foreground font-sans overflow-hidden">
			<div
				className={`transition-[height,opacity] duration-(--ui-motion-duration-slow) ease-standard overflow-hidden ${
					isToolbarVisible ? "h-toolbar opacity-100" : "h-0 opacity-0"
				}`}
			>
				<Toolbar
					onZoomIn={handleZoomIn}
					onZoomOut={handleZoomOut}
					onReset={handleResetView}
					onInfo={() => setIsMetadataOpen(true)}
					onSettings={() => setIsSettingsOpen(true)}
					filename={currentImage?.name || "No Image"}
					zoomLevel={viewerState.scale}
				/>
			</div>

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
							viewerState={viewerState}
							setViewerState={setViewerState}
						/>

						<div
							className={`
                absolute left-0 top-0 bottom-0 w-32 flex items-center justify-start pl-6
                transition-opacity duration-[var(--ui-motion-duration-slow)] pointer-events-none z-[var(--ui-layer-content)]
                ${hoverZone === "left" ? "opacity-100" : "opacity-0"}
              `}
						>
							<button
								type="button"
								onClick={(event) => {
									event.stopPropagation();
									handlePrev();
								}}
								className={`${navControlButtonClass} pr-1`}
								title="Previous Image"
							>
								<ChevronLeft size={32} strokeWidth={1.5} />
							</button>
						</div>

						<div
							className={`
                absolute right-0 top-0 bottom-0 w-32 flex items-center justify-end pr-6
                transition-opacity duration-[var(--ui-motion-duration-slow)] pointer-events-none z-[var(--ui-layer-content)]
                ${hoverZone === "right" ? "opacity-100" : "opacity-0"}
              `}
						>
							<button
								type="button"
								onClick={(event) => {
									event.stopPropagation();
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

			<div
				className={`transition-[height,opacity] duration-(--ui-motion-duration-slow) ease-standard overflow-hidden ${isGalleryVisible ? "h-thumbnail-strip opacity-100" : "h-0 opacity-0"}`}
			>
				<ThumbnailStrip
					images={images}
					selectedIndex={selectedIndex}
					onSelect={handleSelectIndex}
				/>
			</div>

			<MetadataModal
				isOpen={isMetadataOpen}
				onClose={() => setIsMetadataOpen(false)}
				filename={currentImage?.name || ""}
				data={currentMetadata}
			/>

			{import.meta.env.DEV && DevTools && isDevToolsOpen && (
				<Suspense>
					<DevTools
						onClose={() => setIsDevToolsOpen(false)}
						host={{
							currentImageName: currentImage?.name ?? null,
							viewerState,
							pluginSettings,
						}}
					/>
				</Suspense>
			)}

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
