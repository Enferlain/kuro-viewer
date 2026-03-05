import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	type ForensicsPluginState,
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

function clampByte(value: number): number {
	return Math.min(255, Math.max(0, Math.round(value)));
}

function luminanceFromRgb(r: number, g: number, b: number): number {
	return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function buildLuminanceMap(data: Uint8ClampedArray): Float32Array {
	const luminance = new Float32Array(data.length / 4);
	for (let dataIndex = 0, pixel = 0; dataIndex < data.length; dataIndex += 4) {
		luminance[pixel] = luminanceFromRgb(
			data[dataIndex],
			data[dataIndex + 1],
			data[dataIndex + 2],
		);
		pixel += 1;
	}
	return luminance;
}

function blurMap3x3(
	source: Float32Array,
	width: number,
	height: number,
): Float32Array {
	const out = new Float32Array(source.length);
	const kernel = [
		[1, 2, 1],
		[2, 4, 2],
		[1, 2, 1],
	];
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			let sum = 0;
			let weight = 0;
			for (let ky = -1; ky <= 1; ky += 1) {
				const sy = Math.min(height - 1, Math.max(0, y + ky));
				for (let kx = -1; kx <= 1; kx += 1) {
					const sx = Math.min(width - 1, Math.max(0, x + kx));
					const w = kernel[ky + 1][kx + 1];
					sum += source[sy * width + sx] * w;
					weight += w;
				}
			}
			out[y * width + x] = sum / Math.max(weight, 1);
		}
	}
	return out;
}

function blurMapBox(
	source: Float32Array,
	width: number,
	height: number,
	radius: number,
): Float32Array {
	const out = new Float32Array(source.length);
	if (radius <= 0) {
		out.set(source);
		return out;
	}
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			let sum = 0;
			let count = 0;
			for (let oy = -radius; oy <= radius; oy += 1) {
				const sy = y + oy;
				if (sy < 0 || sy >= height) continue;
				for (let ox = -radius; ox <= radius; ox += 1) {
					const sx = x + ox;
					if (sx < 0 || sx >= width) continue;
					sum += source[sy * width + sx];
					count += 1;
				}
			}
			out[y * width + x] = sum / Math.max(count, 1);
		}
	}
	return out;
}

function equalizeMapHistogram(values: Float32Array): Float32Array {
	const bins = new Uint32Array(256);
	for (let i = 0; i < values.length; i += 1) {
		const bin = Math.round(clamp01(values[i]) * 255);
		bins[bin] += 1;
	}
	const cdf = new Uint32Array(256);
	let running = 0;
	for (let i = 0; i < bins.length; i += 1) {
		running += bins[i];
		cdf[i] = running;
	}
	let cdfMin = 0;
	for (let i = 0; i < cdf.length; i += 1) {
		if (cdf[i] > 0) {
			cdfMin = cdf[i];
			break;
		}
	}
	const denominator = Math.max(values.length - cdfMin, 1);
	const out = new Float32Array(values.length);
	for (let i = 0; i < values.length; i += 1) {
		const bin = Math.round(clamp01(values[i]) * 255);
		out[i] = clamp01((cdf[bin] - cdfMin) / denominator);
	}
	return out;
}

function stretchMapContrast(values: Float32Array): Float32Array {
	const bins = new Uint32Array(256);
	for (let i = 0; i < values.length; i += 1) {
		const bin = Math.round(clamp01(values[i]) * 255);
		bins[bin] += 1;
	}
	const lowTarget = values.length * 0.02;
	const highTarget = values.length * 0.98;
	let cumulative = 0;
	let lowBin = 0;
	let highBin = 255;

	for (let i = 0; i < bins.length; i += 1) {
		cumulative += bins[i];
		if (cumulative >= lowTarget) {
			lowBin = i;
			break;
		}
	}
	cumulative = 0;
	for (let i = 0; i < bins.length; i += 1) {
		cumulative += bins[i];
		if (cumulative >= highTarget) {
			highBin = i;
			break;
		}
	}
	const low = lowBin / 255;
	const high = Math.max(low + 1e-4, highBin / 255);
	const out = new Float32Array(values.length);
	for (let i = 0; i < values.length; i += 1) {
		out[i] = clamp01((values[i] - low) / (high - low));
	}
	return out;
}

function applyEnhancement(
	values: Float32Array,
	enhancement: "none" | "equalize-histogram" | "stretch-contrast",
): Float32Array {
	if (enhancement === "equalize-histogram") {
		return equalizeMapHistogram(values);
	}
	if (enhancement === "stretch-contrast") {
		return stretchMapContrast(values);
	}
	return values;
}

function renderNoiseOverlay(
	data: Uint8ClampedArray,
	width: number,
	height: number,
	forensicsState: ForensicsPluginState,
): Uint8ClampedArray {
	const luminance = buildLuminanceMap(data);
	const blurred = blurMap3x3(luminance, width, height);
	const amplitudeNorm = (forensicsState.noise.amplitude - 1) / 99;
	const gain = 1 + amplitudeNorm * 4.25;
	const map = new Float32Array(luminance.length);

	for (let i = 0; i < luminance.length; i += 1) {
		let residual = Math.abs(luminance[i] - blurred[i]) * gain * 4.1;
		if (forensicsState.noise.rembg) {
			const base = i * 4;
			const r = data[base] / 255;
			const g = data[base + 1] / 255;
			const b = data[base + 2] / 255;
			const maxChannel = Math.max(r, g, b);
			const minChannel = Math.min(r, g, b);
			const saturation =
				maxChannel > 0 ? (maxChannel - minChannel) / maxChannel : 0;
			const foregroundMask = clamp01(
				saturation * 1.1 + Math.abs(luminance[i] - 0.5) * 0.9,
			);
			residual *= foregroundMask;
		}
		map[i] = clamp01(residual);
	}

	const enhanced = forensicsState.noise.equalizeHistogram
		? equalizeMapHistogram(map)
		: map;

	const out = new Uint8ClampedArray(data.length);
	for (let i = 0; i < enhanced.length; i += 1) {
		const value = enhanced[i];
		const base = i * 4;
		out[base] = clampByte(value * 205);
		out[base + 1] = clampByte(value * 235);
		out[base + 2] = clampByte(value * 255);
		out[base + 3] = data[base + 3];
	}
	return out;
}

function renderPcaOverlay(
	data: Uint8ClampedArray,
	width: number,
	height: number,
	forensicsState: ForensicsPluginState,
): Uint8ClampedArray {
	const luminance = buildLuminanceMap(data);
	const c1 = new Float32Array(luminance.length);
	const c2 = new Float32Array(luminance.length);
	const c3 = new Float32Array(luminance.length);

	if (forensicsState.pca.input === "color") {
		for (let i = 0; i < luminance.length; i += 1) {
			const base = i * 4;
			const r = data[base] / 255;
			const g = data[base + 1] / 255;
			const b = data[base + 2] / 255;
			c1[i] = clamp01((r + g + b) / 3);
			c2[i] = clamp01(Math.abs(r - g) * 1.7);
			c3[i] = clamp01(Math.abs(g - b) * 1.7);
		}
	} else {
		for (let y = 0; y < height; y += 1) {
			for (let x = 0; x < width; x += 1) {
				const i = y * width + x;
				const left = luminance[y * width + Math.max(0, x - 1)];
				const right = luminance[y * width + Math.min(width - 1, x + 1)];
				const up = luminance[Math.max(0, y - 1) * width + x];
				const down = luminance[Math.min(height - 1, y + 1) * width + x];
				const gx = (right - left) * 0.5;
				const gy = (down - up) * 0.5;
				c1[i] = luminance[i];
				c2[i] = clamp01(Math.abs(gx) * 4.5);
				c3[i] = clamp01(Math.abs(gy) * 4.5);
			}
		}
	}

	const raw = new Float32Array(luminance.length);
	for (let i = 0; i < raw.length; i += 1) {
		switch (forensicsState.pca.mode) {
			case "projection":
				raw[i] = clamp01(c1[i] * 0.58 + c2[i] * 0.27 + c3[i] * 0.15);
				break;
			case "difference":
				raw[i] = clamp01(Math.abs(c2[i] - c3[i]) * 1.4);
				break;
			case "distance":
				raw[i] = clamp01(
					Math.sqrt(
						(c1[i] - 0.5) * (c1[i] - 0.5) + c2[i] * c2[i] + c3[i] * c3[i],
					) * 1.35,
				);
				break;
			case "component":
				raw[i] =
					forensicsState.pca.component === 1
						? c1[i]
						: forensicsState.pca.component === 2
							? c2[i]
							: c3[i];
				break;
		}
	}

	for (let i = 0; i < raw.length; i += 1) {
		raw[i] = forensicsState.pca.linearize
			? clamp01(raw[i]) ** 2.2
			: clamp01(raw[i]);
	}

	const enhanced = applyEnhancement(raw, forensicsState.pca.enhancement);
	const out = new Uint8ClampedArray(data.length);
	for (let i = 0; i < enhanced.length; i += 1) {
		const value = forensicsState.pca.invert ? 1 - enhanced[i] : enhanced[i];
		const base = i * 4;

		if (forensicsState.pca.mode === "component") {
			if (forensicsState.pca.component === 1) {
				out[base] = clampByte(value * 255);
				out[base + 1] = clampByte(value * 195);
				out[base + 2] = clampByte(value * 120);
			} else if (forensicsState.pca.component === 2) {
				out[base] = clampByte(value * 110);
				out[base + 1] = clampByte(value * 245);
				out[base + 2] = clampByte(value * 235);
			} else {
				out[base] = clampByte(value * 245);
				out[base + 1] = clampByte(value * 145);
				out[base + 2] = clampByte(value * 255);
			}
		} else if (forensicsState.pca.input === "luminance-gradient") {
			out[base] = clampByte(value * 120 + c2[i] * 40);
			out[base + 1] = clampByte(value * 220 + c3[i] * 35);
			out[base + 2] = clampByte(value * 255);
		} else {
			out[base] = clampByte(value * 200 + c2[i] * 30);
			out[base + 1] = clampByte(value * 150 + c3[i] * 40);
			out[base + 2] = clampByte(value * 255);
		}
		out[base + 3] = data[base + 3];
	}
	return out;
}

function renderTextureOverlay(
	data: Uint8ClampedArray,
	width: number,
	height: number,
	forensicsState: ForensicsPluginState,
): Uint8ClampedArray {
	const luminance = buildLuminanceMap(data);
	const blurSmall = blurMap3x3(luminance, width, height);
	const blurRadius = Math.max(
		1,
		Math.round(forensicsState.texture.smoothness * 3),
	);
	const blurWide = blurMapBox(luminance, width, height, blurRadius);

	const map = new Float32Array(luminance.length);
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const i = y * width + x;
			const left = luminance[y * width + Math.max(0, x - 1)];
			const right = luminance[y * width + Math.min(width - 1, x + 1)];
			const up = luminance[Math.max(0, y - 1) * width + x];
			const down = luminance[Math.min(height - 1, y + 1) * width + x];

			const gradient = clamp01(
				Math.sqrt((right - left) * (right - left) + (down - up) * (down - up)) *
					3,
			);
			const residual = clamp01(Math.abs(luminance[i] - blurSmall[i]) * 4.6);
			const microContrast = clamp01(Math.abs(luminance[i] - blurWide[i]) * 5.2);

			if (forensicsState.texture.mode === "edge-balance") {
				map[i] = gradient;
			} else if (forensicsState.texture.mode === "residual-noise") {
				map[i] = residual;
			} else {
				map[i] = microContrast;
			}
		}
	}

	for (let i = 0; i < map.length; i += 1) {
		map[i] = clamp01(map[i] * (0.7 + forensicsState.texture.strength * 1.8));
	}

	const smoothMix = forensicsState.texture.smoothness * 0.85;
	const smoothed = blurMapBox(map, width, height, blurRadius);
	for (let i = 0; i < map.length; i += 1) {
		map[i] = clamp01(map[i] * (1 - smoothMix) + smoothed[i] * smoothMix);
	}

	const enhanced = applyEnhancement(map, forensicsState.texture.enhancement);
	const out = new Uint8ClampedArray(data.length);
	for (let i = 0; i < enhanced.length; i += 1) {
		const value = enhanced[i];
		const base = i * 4;
		out[base] = clampByte(value * 255);
		out[base + 1] = clampByte(value * 228);
		out[base + 2] = clampByte(value * 185);
		out[base + 3] = data[base + 3];
	}
	return out;
}

function renderForensicsOverlay(
	data: Uint8ClampedArray,
	width: number,
	height: number,
	filter: FilterType,
	forensicsState: ForensicsPluginState,
): Uint8ClampedArray {
	if (filter === FilterType.NOISE) {
		return renderNoiseOverlay(data, width, height, forensicsState);
	}
	if (filter === FilterType.PCA) {
		return renderPcaOverlay(data, width, height, forensicsState);
	}
	if (filter === FilterType.TEXTURE) {
		return renderTextureOverlay(data, width, height, forensicsState);
	}
	return new Uint8ClampedArray(data);
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
	const [imageLoadNonce, setImageLoadNonce] = useState(0);
	const [processedOverlaySrc, setProcessedOverlaySrc] = useState<string | null>(
		null,
	);
	const overlayObjectUrlRef = useRef<string | null>(null);
	const latestImageLoadNonceRef = useRef(0);

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

	useEffect(
		() => () => {
			if (overlayObjectUrlRef.current) {
				URL.revokeObjectURL(overlayObjectUrlRef.current);
				overlayObjectUrlRef.current = null;
			}
		},
		[],
	);

	useEffect(() => {
		latestImageLoadNonceRef.current = imageLoadNonce;
	}, [imageLoadNonce]);

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
			setProcessedOverlaySrc(null);
			return;
		}

		const source = imgRef.current;
		const renderedSrc = source?.getAttribute("src");
		if (
			!source ||
			renderedSrc !== src ||
			!source.complete ||
			source.naturalWidth === 0
		) {
			setProcessedOverlaySrc(null);
			return;
		}

		const MAX_OVERLAY_DIMENSION = 1400;
		const requestedLoad = imageLoadNonce;
		let cancelled = false;
		const frame = window.requestAnimationFrame(() => {
			try {
				const scale = Math.min(
					1,
					MAX_OVERLAY_DIMENSION /
						Math.max(source.naturalWidth, source.naturalHeight),
				);
				const width = Math.max(1, Math.floor(source.naturalWidth * scale));
				const height = Math.max(1, Math.floor(source.naturalHeight * scale));
				const canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = height;

				const context = canvas.getContext("2d", { willReadFrequently: true });
				if (!context) {
					if (!cancelled) {
						setProcessedOverlaySrc(null);
					}
					return;
				}

				context.drawImage(source, 0, 0, width, height);
				const imageData = context.getImageData(0, 0, width, height);
				const overlayData = renderForensicsOverlay(
					imageData.data,
					width,
					height,
					activeFilter,
					forensicsState,
				);

				const outData = new ImageData(overlayData, width, height);
				context.putImageData(outData, 0, 0);
				canvas.toBlob((blob) => {
					if (cancelled || requestedLoad !== latestImageLoadNonceRef.current) {
						return;
					}
					if (!blob) {
						setProcessedOverlaySrc(null);
						return;
					}
					const nextUrl = URL.createObjectURL(blob);
					if (overlayObjectUrlRef.current) {
						URL.revokeObjectURL(overlayObjectUrlRef.current);
					}
					overlayObjectUrlRef.current = nextUrl;
					setProcessedOverlaySrc(nextUrl);
				});
			} catch {
				if (!cancelled) {
					setProcessedOverlaySrc(null);
				}
			}
		});

		return () => {
			cancelled = true;
			window.cancelAnimationFrame(frame);
		};
	}, [activeFilter, forensicsState, src, imageLoadNonce]);

	useEffect(() => {
		if (activeFilter === FilterType.NONE || !forensicsState.view.outputScore) {
			onAnalysisScoreChange?.(null);
			return;
		}

		const source = imgRef.current;
		const renderedSrc = source?.getAttribute("src");
		if (
			!source ||
			renderedSrc !== src ||
			!source.complete ||
			source.naturalWidth === 0
		) {
			onAnalysisScoreChange?.(null);
			return;
		}

		const requestedLoad = imageLoadNonce;
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

				if (!cancelled && requestedLoad === latestImageLoadNonceRef.current) {
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
	}, [
		activeFilter,
		forensicsState,
		onAnalysisScoreChange,
		src,
		imageLoadNonce,
	]);

	// Handle scale=0 (reset/loading signal) for rendering
	// If scale is 0, we render at opacity 0 to prevent FOUC until calculation is done
	const renderScale = viewerState.scale === 0 ? 0.01 : viewerState.scale;
	const isHidden = viewerState.scale === 0;
	const overlayOpacity =
		activeFilter === FilterType.NONE ? 0 : modeOverlayOpacity(forensicsState);
	const overlayImageSrc = processedOverlaySrc ?? src;
	const showOverlay = activeFilter !== FilterType.NONE;
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
		const imageElement = imgRef.current;
		if (!container || !imageElement || !cursorPos || isHidden) {
			return null;
		}

		const rect = container.getBoundingClientRect();
		const imageRect = imageElement.getBoundingClientRect();
		if (imageRect.width <= 0 || imageRect.height <= 0) {
			return null;
		}

		const cursorViewportX = rect.left + cursorPos.x;
		const cursorViewportY = rect.top + cursorPos.y;
		const insideImage =
			cursorViewportX >= imageRect.left &&
			cursorViewportX <= imageRect.right &&
			cursorViewportY >= imageRect.top &&
			cursorViewportY <= imageRect.bottom;
		if (!insideImage) {
			return null;
		}

		const zoom = forensicsState.magnifier.zoom;
		const cursorImageX = cursorViewportX - imageRect.left;
		const cursorImageY = cursorViewportY - imageRect.top;
		const bgPosX = -cursorImageX * zoom + magnifierCenterOffset;
		const bgPosY = -cursorImageY * zoom + magnifierCenterOffset;
		const splitX = imageRect.left + imageRect.width / 2;
		const cursorOnProcessedSide =
			!sideBySideEnabled || cursorViewportX >= splitX;
		const magnifierOverlayEnabled = showOverlay && cursorOnProcessedSide;
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
					backgroundSize: `${imageRect.width * zoom}px ${imageRect.height * zoom}px`,
					backgroundPosition: `${bgPosX}px ${bgPosY}px`,
					overflow: "hidden",
					opacity: 1,
					zIndex: 20,
				}}
			>
				{magnifierOverlayEnabled && (
					<div
						className="absolute inset-0 pointer-events-none"
						style={{
							backgroundImage: `url(${overlayImageSrc})`,
							backgroundRepeat: "no-repeat",
							backgroundSize: `${imageRect.width * zoom}px ${imageRect.height * zoom}px`,
							backgroundPosition: `${bgPosX}px ${bgPosY}px`,
							opacity: overlayOpacity,
						}}
					/>
				)}
			</div>
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
							setImageLoadNonce((current) => current + 1);
							fitToView();
						}}
					/>
					{showOverlay && (
						<img
							src={overlayImageSrc}
							alt=""
							aria-hidden
							className="absolute inset-0 w-full h-full pointer-events-none select-none"
							style={{
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
