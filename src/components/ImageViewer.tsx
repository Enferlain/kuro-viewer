import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	type ForensicsPluginState,
	modeFilterStyle,
	modeOverlayOpacity,
} from "../plugin-system/forensics";
import { FilterType, type ViewerState } from "../types";

interface ImageViewerProps {
	src: string;
	activeFilter: FilterType;
	forensicsState: ForensicsPluginState;
	onAnalysisScoreChange?: (score: number | null) => void;
	viewerState: ViewerState;
	setViewerState: React.Dispatch<React.SetStateAction<ViewerState>>;
}

type ImageMetrics = {
	noise: number;
	gradient: number;
	texture: number;
	colorDivergence: number;
	luminanceStd: number;
};

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

function clampScore(value: number): number {
	return Math.min(10, Math.max(0, value));
}

function computeImageMetrics(
	data: Uint8ClampedArray,
	width: number,
	height: number,
): ImageMetrics {
	const luminance = new Float32Array(width * height);
	let luminanceSum = 0;
	let colorDivergenceSum = 0;

	for (let index = 0, pixel = 0; index < data.length; index += 4, pixel += 1) {
		const r = data[index];
		const g = data[index + 1];
		const b = data[index + 2];
		const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
		luminance[pixel] = luma;
		luminanceSum += luma;
		colorDivergenceSum +=
			(Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r)) / (3 * 255);
	}

	const pixelCount = width * height;
	const meanLuma = luminanceSum / Math.max(pixelCount, 1);
	let lumaVariance = 0;
	for (let i = 0; i < luminance.length; i += 1) {
		const diff = luminance[i] - meanLuma;
		lumaVariance += diff * diff;
	}
	const luminanceStd = Math.sqrt(lumaVariance / Math.max(pixelCount, 1));

	let gradientAccumulator = 0;
	let gradientSamples = 0;
	for (let y = 0; y < height - 1; y += 1) {
		const row = y * width;
		for (let x = 0; x < width - 1; x += 1) {
			const index = row + x;
			const dx = Math.abs(luminance[index] - luminance[index + 1]);
			const dy = Math.abs(luminance[index] - luminance[index + width]);
			gradientAccumulator += dx + dy;
			gradientSamples += 2;
		}
	}
	const gradient = gradientAccumulator / Math.max(gradientSamples, 1);
	const noise = clamp01(gradient * 1.75);

	let laplacianAccumulator = 0;
	let laplacianSamples = 0;
	for (let y = 1; y < height - 1; y += 1) {
		const row = y * width;
		for (let x = 1; x < width - 1; x += 1) {
			const center = row + x;
			const laplacian =
				Math.abs(
					4 * luminance[center] -
						luminance[center - 1] -
						luminance[center + 1] -
						luminance[center - width] -
						luminance[center + width],
				) / 4;
			laplacianAccumulator += laplacian;
			laplacianSamples += 1;
		}
	}
	const texture = clamp01(
		(laplacianAccumulator / Math.max(laplacianSamples, 1)) * 2.2,
	);

	return {
		noise,
		gradient,
		texture,
		colorDivergence: clamp01(colorDivergenceSum / Math.max(pixelCount, 1)),
		luminanceStd: clamp01(luminanceStd * 2.2),
	};
}

function scoreFromMetrics(
	mode: FilterType,
	forensicsState: ForensicsPluginState,
	metrics: ImageMetrics,
): number {
	if (mode === FilterType.NOISE) {
		const amplitudeNorm = (forensicsState.noise.amplitude - 1) / 99;
		let score = 10 * (1 - metrics.noise);
		score -= amplitudeNorm * 2.2;
		score += forensicsState.noise.equalizeHistogram ? 0.4 : -0.2;
		score += forensicsState.noise.rembg ? 0.25 : 0;
		score += (1 - forensicsState.noise.opacity) * 0.6;
		return clampScore(score);
	}

	if (mode === FilterType.PCA) {
		let signal = metrics.luminanceStd;
		switch (forensicsState.pca.mode) {
			case "projection":
				signal = metrics.luminanceStd;
				break;
			case "difference":
				signal = clamp01((metrics.colorDivergence + metrics.noise) * 0.6);
				break;
			case "distance":
				signal = clamp01((metrics.gradient + metrics.colorDivergence) * 0.5);
				break;
			case "component":
				signal =
					forensicsState.pca.component === 1
						? metrics.luminanceStd
						: forensicsState.pca.component === 2
							? metrics.colorDivergence
							: metrics.noise;
				break;
		}
		let score = 10 * (1 - signal);
		if (forensicsState.pca.linearize) score += 0.25;
		if (forensicsState.pca.invert) score -= 0.15;
		if (forensicsState.pca.enhancement === "equalize-histogram") score += 0.35;
		if (forensicsState.pca.enhancement === "stretch-contrast") score += 0.2;
		if (forensicsState.pca.input === "luminance-gradient") score += 0.1;
		score += (1 - forensicsState.pca.opacity) * 0.35;
		return clampScore(score);
	}

	if (mode === FilterType.TEXTURE) {
		const edgeBalance = 1 - clamp01(Math.abs(metrics.gradient - 0.22) / 0.22);
		const residualNoisePenalty = clamp01(metrics.noise * 1.15);
		const microContrast = clamp01(metrics.texture * 1.1);

		let raw = edgeBalance;
		switch (forensicsState.texture.mode) {
			case "edge-balance":
				raw = edgeBalance;
				break;
			case "residual-noise":
				raw = 1 - residualNoisePenalty;
				break;
			case "micro-contrast":
				raw = microContrast;
				break;
		}

		let score = 10 * raw;
		score += forensicsState.texture.strength * 0.9;
		score -= forensicsState.texture.smoothness * 0.9;
		if (forensicsState.texture.enhancement === "equalize-histogram")
			score += 0.25;
		if (forensicsState.texture.enhancement === "stretch-contrast")
			score += 0.15;
		score += (1 - forensicsState.texture.opacity) * 0.3;
		return clampScore(score);
	}

	return 0;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
	src,
	activeFilter,
	forensicsState,
	onAnalysisScoreChange,
	viewerState,
	setViewerState,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const imgRef = useRef<HTMLImageElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
	const [isSpacePressed, setIsSpacePressed] = useState(false);
	const [isMouseDown, setIsMouseDown] = useState(false);
	const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(
		null,
	);
	const [naturalImageSize, setNaturalImageSize] = useState({
		width: 0,
		height: 0,
	});

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.code === "Space") {
				// Prevent spacebar scrolling page, but typically Vite app takes whole height
				e.preventDefault();
				setIsSpacePressed(true);
			}
		};
		const handleKeyUp = (e: KeyboardEvent) => {
			if (e.code === "Space") {
				setIsSpacePressed(false);
				setIsDragging(false); // Still cancel drag when space released
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, []);

	// Function to calculate fit scale based on container and image dimensions
	const fitToView = useCallback(() => {
		const container = containerRef.current;
		const img = imgRef.current;

		if (!container || !img || img.naturalWidth === 0) return;

		const { width: containerWidth, height: containerHeight } =
			container.getBoundingClientRect();
		const availWidth = Math.max(containerWidth, 200);
		const availHeight = Math.max(containerHeight, 200);

		const scaleX = availWidth / img.naturalWidth;
		const scaleY = availHeight / img.naturalHeight;

		const fitScale = Math.min(scaleX, scaleY, 1.0);

		setViewerState({
			scale: fitScale,
			translation: { x: 0, y: 0 },
			isFit: true,
		});
	}, [setViewerState]);

	// Watch for window resize to maintain fit if user hasn't zoomed manually
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const observer = new ResizeObserver(() => {
			// Only re-fit if we are currently in "fit mode" (scale was calculated or reset)
			// or if the scale is very close to the fit scale.
			// For simplicity in this rapid viewer, we maintain fit if the user hit '0' recently.
			// Here we just check if scale is 0 (pending) or if we want to enforce it.
			// A simple heuristic: if scale is 0 or isFit=true, we fit.
			if (viewerState.scale === 0 || viewerState.isFit) {
				fitToView();
			}
		});

		observer.observe(container);
		return () => observer.disconnect();
	}, [viewerState.scale, viewerState.isFit, fitToView]);

	// Watch for the specific "reset" signal (scale === 0) from parent
	useEffect(() => {
		if (viewerState.scale === 0) {
			fitToView();
		}
	}, [viewerState.scale, fitToView]);

	const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
		const container = containerRef.current;
		if (!container) return;

		const scaleFactor = 1.1;
		const delta = -e.deltaY;

		const currentScale = viewerState.scale === 0 ? 1 : viewerState.scale;
		let newScale =
			delta > 0 ? currentScale * scaleFactor : currentScale / scaleFactor;
		newScale = Math.min(Math.max(newScale, 0.05), 50);

		if (newScale === currentScale) return;

		const rect = container.getBoundingClientRect();
		// Compute mouse offset from the center of the viewport
		const cursorX = e.clientX - rect.left - rect.width / 2;
		const cursorY = e.clientY - rect.top - rect.height / 2;

		// Calculate translation shift to keep cursor over the same image pixel
		// Since scaling happens from the center of the translation wrapper, the apparent movement
		// of the point (cursor) under scaling needs to be offset.
		const ratio = 1 - newScale / currentScale;
		const dx = (cursorX - viewerState.translation.x) * ratio;
		const dy = (cursorY - viewerState.translation.y) * ratio;

		setViewerState((prev) => ({
			...prev,
			scale: newScale,
			translation: {
				x: prev.translation.x + dx,
				y: prev.translation.y + dy,
			},
			isFit: false,
		}));
	};

	const handleMouseDown = (e: React.MouseEvent) => {
		if (e.button !== 0) return; // Only left click
		setIsMouseDown(true);
		if (isSpacePressed) {
			e.preventDefault();
			setIsDragging(true);
			setDragStart({
				x: e.clientX - viewerState.translation.x,
				y: e.clientY - viewerState.translation.y,
			});
		}
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		const container = containerRef.current;
		if (container) {
			const rect = container.getBoundingClientRect();
			setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
		}

		if (!isDragging) return;
		e.preventDefault();
		setViewerState((prev) => ({
			...prev,
			translation: {
				x: e.clientX - dragStart.x,
				y: e.clientY - dragStart.y,
			},
			isFit: false,
		}));
	};

	const handleMouseUp = () => {
		setIsMouseDown(false);
		setIsDragging(false);
	};

	useEffect(() => {
		if (activeFilter === FilterType.NONE) {
			onAnalysisScoreChange?.(null);
			return;
		}

		const source = imgRef.current;
		if (!source || !source.complete || source.naturalWidth === 0) {
			onAnalysisScoreChange?.(null);
			return;
		}

		let cancelled = false;
		const frame = window.requestAnimationFrame(() => {
			try {
				const maxDimension = 220;
				const scale = Math.min(
					1,
					maxDimension / Math.max(source.naturalWidth, source.naturalHeight),
				);
				const width = Math.max(1, Math.floor(source.naturalWidth * scale));
				const height = Math.max(1, Math.floor(source.naturalHeight * scale));
				const canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = height;
				const context = canvas.getContext("2d", { willReadFrequently: true });
				if (!context) {
					onAnalysisScoreChange?.(null);
					return;
				}
				context.drawImage(source, 0, 0, width, height);
				const imageData = context.getImageData(0, 0, width, height).data;
				const metrics = computeImageMetrics(imageData, width, height);
				const score = scoreFromMetrics(activeFilter, forensicsState, metrics);

				if (!cancelled) {
					onAnalysisScoreChange?.(score);
				}
			} catch {
				if (!cancelled) {
					onAnalysisScoreChange?.(null);
				}
			}
		});

		return () => {
			cancelled = true;
			window.cancelAnimationFrame(frame);
		};
	}, [activeFilter, forensicsState, onAnalysisScoreChange]);

	// Handle scale=0 (reset/loading signal) for rendering
	// If scale is 0, we render at opacity 0 to prevent FOUC until calculation is done
	const renderScale = viewerState.scale === 0 ? 0.01 : viewerState.scale;
	const isHidden = viewerState.scale === 0;
	const overlayOpacity =
		activeFilter === FilterType.NONE ? 0 : modeOverlayOpacity(forensicsState);
	const overlayFilterStyle = modeFilterStyle(forensicsState);
	const sideBySideEnabled =
		activeFilter !== FilterType.NONE && forensicsState.view.sideBySide;
	const magnifierSize = 170;
	const magnifierCenterOffset = magnifierSize / 2;
	const magnifierCursorOffset = 18;

	const magnifierLens = (() => {
		if (!forensicsState.magnifier.enabled || activeFilter === FilterType.NONE) {
			return null;
		}
		const container = containerRef.current;
		if (!container || !cursorPos || naturalImageSize.width === 0 || isHidden) {
			return null;
		}

		const rect = container.getBoundingClientRect();
		const imageWidth = naturalImageSize.width * renderScale;
		const imageHeight = naturalImageSize.height * renderScale;
		const imageLeft =
			rect.width / 2 + viewerState.translation.x - imageWidth / 2;
		const imageTop =
			rect.height / 2 + viewerState.translation.y - imageHeight / 2;
		const insideImage =
			cursorPos.x >= imageLeft &&
			cursorPos.x <= imageLeft + imageWidth &&
			cursorPos.y >= imageTop &&
			cursorPos.y <= imageTop + imageHeight;
		if (!insideImage) {
			return null;
		}

		const zoom = forensicsState.magnifier.zoom;
		const bgPosX = -(cursorPos.x - imageLeft) * zoom + magnifierCenterOffset;
		const bgPosY = -(cursorPos.y - imageTop) * zoom + magnifierCenterOffset;
		const lensLeft = clamp01(
			(cursorPos.x + magnifierCursorOffset) /
				Math.max(rect.width - magnifierSize, 1),
		);
		const lensTop = clamp01(
			(cursorPos.y + magnifierCursorOffset) /
				Math.max(rect.height - magnifierSize, 1),
		);

		return (
			<div
				className="absolute pointer-events-none border border-accent/50 rounded-md shadow-glow"
				style={{
					left: lensLeft * Math.max(rect.width - magnifierSize, 0),
					top: lensTop * Math.max(rect.height - magnifierSize, 0),
					width: magnifierSize,
					height: magnifierSize,
					backgroundColor: "var(--color-background-deep)",
					backgroundImage: `url(${src})`,
					backgroundRepeat: "no-repeat",
					backgroundSize: `${imageWidth * zoom}px ${imageHeight * zoom}px`,
					backgroundPosition: `${bgPosX}px ${bgPosY}px`,
					filter:
						typeof overlayFilterStyle.filter === "string"
							? overlayFilterStyle.filter
							: undefined,
					opacity: 1,
					zIndex: 20,
				}}
			/>
		);
	})();

	return (
		<section
			ref={containerRef}
			aria-label="Image Viewer"
			className="flex-1 relative overflow-hidden bg-background-deep select-none"
			style={{
				cursor: isSpacePressed
					? isMouseDown
						? "grabbing"
						: "grab"
					: "default",
			}}
			onWheel={handleWheel}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
			onMouseLeave={() => {
				handleMouseUp();
				setCursorPos(null);
			}}
		>
			{/* Grid Background */}
			<div
				className="absolute inset-0 opacity-10 pointer-events-none"
				style={{
					backgroundImage:
						"radial-gradient(circle, var(--color-border-subtle) 1px, transparent 1px)",
					backgroundSize: "24px 24px",
				}}
			/>

			<div
				className="absolute w-full h-full flex items-center justify-center"
				style={{
					transform: `translate3d(${viewerState.translation.x}px, ${viewerState.translation.y}px, 0) scale(${renderScale})`,
					transformOrigin: "center center",
					opacity: isHidden ? 0 : 1,
				}}
			>
				<div className="relative shadow-xl">
					<img
						ref={imgRef}
						src={src}
						alt="View"
						className="max-w-none pointer-events-none"
						style={{}}
						crossOrigin="anonymous"
						draggable={false}
						onLoad={() => {
							const img = imgRef.current;
							if (img) {
								setNaturalImageSize({
									width: img.naturalWidth,
									height: img.naturalHeight,
								});
							}
							fitToView();
						}}
					/>
					{activeFilter !== FilterType.NONE && (
						<img
							src={src}
							alt=""
							aria-hidden
							className="absolute inset-0 w-full h-full pointer-events-none select-none"
							style={{
								...overlayFilterStyle,
								opacity: overlayOpacity,
								clipPath: sideBySideEnabled ? "inset(0 0 0 50%)" : undefined,
							}}
							draggable={false}
						/>
					)}
					{sideBySideEnabled && (
						<div
							className="absolute top-0 bottom-0 w-px bg-accent/70 pointer-events-none"
							style={{ left: "50%" }}
						/>
					)}
				</div>
			</div>
			{magnifierLens}
		</section>
	);
};
