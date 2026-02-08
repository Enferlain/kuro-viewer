import { ChevronLeft, ChevronRight } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ImageViewer } from "./components/ImageViewer";
import { MetadataModal } from "./components/MetadataModal";
import { SettingsModal } from "./components/settings/SettingsModal";
import { ThumbnailStrip } from "./components/ThumbnailStrip";
import { Toolbar } from "./components/Toolbar";
import {
	FilterType,
	type ImageFile,
	type ImageMetadata,
	type ViewerState,
} from "./types";

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
	const [images] = useState<ImageFile[]>(MOCK_IMAGES);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [activeFilter, setActiveFilter] = useState<FilterType>(FilterType.NONE);
	const [isMetadataOpen, setIsMetadataOpen] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [isToolbarVisible, setIsToolbarVisible] = useState(true);

	// Hover zone state for navigation arrows
	const [hoverZone, setHoverZone] = useState<"left" | "right" | null>(null);

	// Initialize scale with 0 to indicate "uncalculated" or "fit to view pending"
	const [viewerState, setViewerState] = useState<ViewerState>({
		scale: 0,
		translation: { x: 0, y: 0 },
	});

	const currentImage = images[selectedIndex];

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
		setViewerState({ scale: 0, translation: { x: 0, y: 0 } });
	}, []);

	const handleNext = useCallback(() => {
		handleSelectIndex((selectedIndex + 1) % images.length);
	}, [selectedIndex, images.length, handleSelectIndex]);

	const handlePrev = useCallback(() => {
		handleSelectIndex((selectedIndex - 1 + images.length) % images.length);
	}, [selectedIndex, images.length, handleSelectIndex]);

	// Triggers the ImageViewer to recalculate fit
	const handleResetView = useCallback(() => {
		setViewerState({ scale: 0, translation: { x: 0, y: 0 } });
	}, []);

	const handleZoomIn = useCallback(() => {
		setViewerState((prev) => ({
			...prev,
			scale: prev.scale === 0 ? 1.2 : Math.min(prev.scale * 1.2, 50),
		}));
	}, []);

	const handleZoomOut = useCallback(() => {
		setViewerState((prev) => ({
			...prev,
			scale: prev.scale === 0 ? 0.8 : Math.max(prev.scale / 1.2, 0.05),
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

			switch (e.key) {
				case "ArrowRight":
					e.preventDefault();
					handleNext();
					break;
				case "ArrowLeft":
					e.preventDefault();
					handlePrev();
					break;
				case "n":
				case "N":
					e.preventDefault();
					setActiveFilter((prev) =>
						prev === FilterType.NOISE ? FilterType.NONE : FilterType.NOISE,
					);
					break;
				case "p":
				case "P":
					e.preventDefault();
					setActiveFilter((prev) =>
						prev === FilterType.PCA ? FilterType.NONE : FilterType.PCA,
					);
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
	}, [handleNext, handlePrev, handleResetView, handleZoomIn, handleZoomOut]);

	return (
		<div className="flex flex-col h-screen w-screen bg-background-deep text-foreground font-sans overflow-hidden">
			{/* 1. Header / Toolbar */}
			<div
				className={`transition-all duration-300 ease-in-out overflow-hidden ${isToolbarVisible ? "h-14 opacity-100" : "h-0 opacity-0"}`}
			>
				<Toolbar
					currentFilter={activeFilter}
					onFilterChange={setActiveFilter}
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
							viewerState={viewerState}
							setViewerState={setViewerState}
						/>

						{/* Left Navigation Zone Overlay */}
						<div
							className={`
                absolute left-0 top-0 bottom-0 w-32 flex items-center justify-start pl-6 
                transition-opacity duration-300 pointer-events-none z-20
                ${hoverZone === "left" ? "opacity-100" : "opacity-0"}
              `}
						>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handlePrev();
								}}
								className="
                  pointer-events-auto h-14 w-14 rounded-full flex items-center justify-center
                  bg-black/40 backdrop-blur-xl 
                  text-white/80 
                  shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.5)]
                  transition-[transform,background-color,box-shadow,color] duration-200 ease-out transform-gpu will-change-transform
                  hover:bg-accent/20 hover:text-white hover:scale-110 
                  hover:shadow-[0_0_0_1px_rgba(94,106,210,0.5),0_0_20px_rgba(94,106,210,0.4),inset_0_1px_0_0_rgba(255,255,255,0.2)]
                  active:scale-95
                  pr-1
                "
								title="Previous Image"
							>
								<ChevronLeft size={32} strokeWidth={1.5} />
							</button>
						</div>

						{/* Right Navigation Zone Overlay */}
						<div
							className={`
                absolute right-0 top-0 bottom-0 w-32 flex items-center justify-end pr-6 
                transition-opacity duration-300 pointer-events-none z-20
                ${hoverZone === "right" ? "opacity-100" : "opacity-0"}
              `}
						>
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handleNext();
								}}
								className="
                  pointer-events-auto h-14 w-14 rounded-full flex items-center justify-center
                  bg-black/40 backdrop-blur-xl 
                  text-white/80 
                  shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_32px_rgba(0,0,0,0.5)]
                  transition-[transform,background-color,box-shadow,color] duration-200 ease-out transform-gpu will-change-transform
                  hover:bg-accent/20 hover:text-white hover:scale-110 
                  hover:shadow-[0_0_0_1px_rgba(94,106,210,0.5),0_0_20px_rgba(94,106,210,0.4),inset_0_1px_0_0_rgba(255,255,255,0.2)]
                  active:scale-95
                  pl-1
                "
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
			<ThumbnailStrip
				images={images}
				selectedIndex={selectedIndex}
				onSelect={handleSelectIndex}
			/>

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
			/>
		</div>
	);
};

export default App;
