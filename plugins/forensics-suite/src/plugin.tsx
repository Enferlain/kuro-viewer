import { Activity, Microscope, Waves } from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import type { PluginManifestSummary } from "@/plugin-system/pluginManifest";
import type {
	AnalysisModeAction,
	AnalysisPluginRuntime,
	AnalysisPresentation,
} from "@/plugin-system/runtime";
import type { PluginSettingsDefinition } from "@/plugin-system/settings";
import { ForensicsPanel } from "./ForensicsPanel";

export type ForensicsModeId = "noise" | "pca" | "texture" | null;
export type PcaInputMode = "color" | "luminance-gradient";
export type PcaAnalysisMode =
	| "projection"
	| "difference"
	| "distance"
	| "component";
export type EnhancementMode =
	| "none"
	| "equalize-histogram"
	| "stretch-contrast";
export type TextureAnalysisMode =
	| "edge-balance"
	| "residual-noise"
	| "micro-contrast";

export interface NoiseOptions {
	rembg: boolean;
	amplitude: number;
	equalizeHistogram: boolean;
	opacity: number;
}

export interface PcaOptions {
	input: PcaInputMode;
	mode: PcaAnalysisMode;
	component: number;
	linearize: boolean;
	invert: boolean;
	enhancement: EnhancementMode;
	opacity: number;
}

export interface TextureOptions {
	mode: TextureAnalysisMode;
	strength: number;
	smoothness: number;
	enhancement: EnhancementMode;
	opacity: number;
}

export interface MagnifierOptions {
	enabled: boolean;
	zoom: number;
}

export interface ForensicsViewOptions {
	sideBySide: boolean;
	outputScore: boolean;
}

export interface ForensicsHotkeys {
	original: string;
	noise: string;
	pca: string;
	texture: string;
	sideBySide: string;
}

export interface ForensicsPluginState {
	mode: ForensicsModeId;
	noise: NoiseOptions;
	pca: PcaOptions;
	texture: TextureOptions;
	magnifier: MagnifierOptions;
	view: ForensicsViewOptions;
	hotkeys: ForensicsHotkeys;
}

type ImageMetrics = {
	noise: number;
	gradient: number;
	texture: number;
	colorDivergence: number;
	luminanceStd: number;
};

const FORENSICS_PLUGIN_ID = "forensics-suite";
const MODE_ORDER: ForensicsModeId[] = [null, "noise", "pca", "texture"];
const ICONS: Record<Exclude<ForensicsModeId, null>, React.ReactNode> = {
	noise: <Waves size={12} />,
	pca: <Activity size={12} />,
	texture: <Microscope size={12} />,
};

export const FORENSICS_MANIFEST: PluginManifestSummary = {
	id: FORENSICS_PLUGIN_ID,
	name: "Forensics Suite",
	version: "0.2.0-workspace",
	description:
		"Pixel-level forensic tools for noise, PCA, and texture analysis with interactive overlays.",
	author: "Kuro Viewer Team",
	source_url: "https://github.com/kuro-viewer/kuro-viewer",
	docs_url:
		"https://github.com/kuro-viewer/kuro-viewer/blob/main/docs/PLUGIN_CONTRACT_1.0.md",
	usage:
		"Use Noise, PCA, or Texture modes for forensic overlays. Open Configure from Settings > Plugins to tune magnifier, hotkeys, and mode-specific controls.",
	backend: "none",
	slots: ["toolbar", "panel"],
	permissions: [],
};

export const DEFAULT_FORENSICS_HOTKEYS: ForensicsHotkeys = {
	original: "O",
	noise: "N",
	pca: "P",
	texture: "M",
	sideBySide: "S",
};

export const DEFAULT_FORENSICS_STATE: ForensicsPluginState = {
	mode: null,
	noise: {
		rembg: false,
		amplitude: 1,
		equalizeHistogram: true,
		opacity: 0.95,
	},
	pca: {
		input: "color",
		mode: "projection",
		component: 1,
		linearize: false,
		invert: false,
		enhancement: "equalize-histogram",
		opacity: 0.75,
	},
	texture: {
		mode: "edge-balance",
		strength: 0.55,
		smoothness: 0.3,
		enhancement: "equalize-histogram",
		opacity: 0.65,
	},
	magnifier: {
		enabled: true,
		zoom: 2.25,
	},
	view: {
		sideBySide: false,
		outputScore: false,
	},
	hotkeys: DEFAULT_FORENSICS_HOTKEYS,
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

function clampScore(value: number): number {
	return Math.min(10, Math.max(0, value));
}

function clampByte(value: number): number {
	return Math.min(255, Math.max(0, Math.round(value)));
}

function readBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampNumber(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function readClampedNumber(
	value: unknown,
	fallback: number,
	min: number,
	max: number,
): number {
	return clampNumber(readNumber(value, fallback), min, max);
}

function sanitizeMode(
	value: unknown,
	fallback: ForensicsModeId,
): ForensicsModeId {
	switch (value) {
		case null:
		case undefined:
		case "NONE":
		case "original":
		case "ORIGINAL":
			return null;
		case "NOISE":
		case "noise":
			return "noise";
		case "PCA":
		case "pca":
			return "pca";
		case "TEXTURE":
		case "texture":
			return "texture";
		default:
			return fallback;
	}
}

function readPcaInput(value: unknown, fallback: PcaInputMode): PcaInputMode {
	return value === "color" || value === "luminance-gradient" ? value : fallback;
}

function readPcaMode(
	value: unknown,
	fallback: PcaAnalysisMode,
): PcaAnalysisMode {
	return value === "projection" ||
		value === "difference" ||
		value === "distance" ||
		value === "component"
		? value
		: fallback;
}

function readTextureMode(
	value: unknown,
	fallback: TextureAnalysisMode,
): TextureAnalysisMode {
	return value === "edge-balance" ||
		value === "residual-noise" ||
		value === "micro-contrast"
		? value
		: fallback;
}

function readEnhancement(
	value: unknown,
	fallback: EnhancementMode,
): EnhancementMode {
	return value === "none" ||
		value === "equalize-histogram" ||
		value === "stretch-contrast"
		? value
		: fallback;
}

export function sanitizeHotkey(value: string, fallback: string): string {
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		return fallback;
	}

	const last = trimmed.at(-1);
	if (!last) {
		return fallback;
	}
	return last.toUpperCase();
}

export function normalizeForensicsPluginState(
	value: unknown,
): ForensicsPluginState {
	const defaults = DEFAULT_FORENSICS_STATE;
	if (!isRecord(value)) {
		return structuredClone(defaults);
	}

	const noise = isRecord(value.noise) ? value.noise : {};
	const pca = isRecord(value.pca) ? value.pca : {};
	const texture = isRecord(value.texture) ? value.texture : {};
	const magnifier = isRecord(value.magnifier) ? value.magnifier : {};
	const view = isRecord(value.view) ? value.view : {};
	const hotkeys = isRecord(value.hotkeys) ? value.hotkeys : {};

	return {
		mode: sanitizeMode(value.mode, defaults.mode),
		noise: {
			rembg: readBoolean(noise.rembg, defaults.noise.rembg),
			amplitude: Math.round(
				readClampedNumber(noise.amplitude, defaults.noise.amplitude, 1, 100),
			),
			equalizeHistogram: readBoolean(
				noise.equalizeHistogram,
				defaults.noise.equalizeHistogram,
			),
			opacity: readClampedNumber(noise.opacity, defaults.noise.opacity, 0, 1),
		},
		pca: {
			input: readPcaInput(pca.input, defaults.pca.input),
			mode: readPcaMode(pca.mode, defaults.pca.mode),
			component: Math.round(
				readClampedNumber(pca.component, defaults.pca.component, 1, 3),
			),
			linearize: readBoolean(pca.linearize, defaults.pca.linearize),
			invert: readBoolean(pca.invert, defaults.pca.invert),
			enhancement: readEnhancement(pca.enhancement, defaults.pca.enhancement),
			opacity: readClampedNumber(pca.opacity, defaults.pca.opacity, 0.1, 1),
		},
		texture: {
			mode: readTextureMode(texture.mode, defaults.texture.mode),
			strength: readClampedNumber(
				texture.strength,
				defaults.texture.strength,
				0,
				1,
			),
			smoothness: readClampedNumber(
				texture.smoothness,
				defaults.texture.smoothness,
				0,
				1,
			),
			enhancement: readEnhancement(
				texture.enhancement,
				defaults.texture.enhancement,
			),
			opacity: readClampedNumber(
				texture.opacity,
				defaults.texture.opacity,
				0.1,
				1,
			),
		},
		magnifier: {
			enabled: readBoolean(magnifier.enabled, defaults.magnifier.enabled),
			zoom: readClampedNumber(magnifier.zoom, defaults.magnifier.zoom, 1.25, 4),
		},
		view: {
			sideBySide: readBoolean(view.sideBySide, defaults.view.sideBySide),
			outputScore: readBoolean(view.outputScore, defaults.view.outputScore),
		},
		hotkeys: {
			original: sanitizeHotkey(
				String(hotkeys.original ?? ""),
				DEFAULT_FORENSICS_HOTKEYS.original,
			),
			noise: sanitizeHotkey(
				String(hotkeys.noise ?? ""),
				DEFAULT_FORENSICS_HOTKEYS.noise,
			),
			pca: sanitizeHotkey(
				String(hotkeys.pca ?? ""),
				DEFAULT_FORENSICS_HOTKEYS.pca,
			),
			texture: sanitizeHotkey(
				String(hotkeys.texture ?? ""),
				DEFAULT_FORENSICS_HOTKEYS.texture,
			),
			sideBySide: sanitizeHotkey(
				String(hotkeys.sideBySide ?? ""),
				DEFAULT_FORENSICS_HOTKEYS.sideBySide,
			),
		},
	};
}

function createForensicsModeActions(
	hotkeys: ForensicsHotkeys,
): AnalysisModeAction[] {
	return [
		{ modeId: null, label: "Original", hotkey: hotkeys.original },
		{
			modeId: "noise",
			label: "Noise",
			hotkey: hotkeys.noise,
			icon: ICONS.noise,
		},
		{
			modeId: "pca",
			label: "PCA",
			hotkey: hotkeys.pca,
			icon: ICONS.pca,
		},
		{
			modeId: "texture",
			label: "Texture",
			hotkey: hotkeys.texture,
			icon: ICONS.texture,
		},
	];
}

function getModeActionForHotkey(
	key: string,
	hotkeys: ForensicsHotkeys,
): AnalysisModeAction | undefined {
	return createForensicsModeActions(hotkeys).find(
		(action) => action.hotkey.toLowerCase() === key.toLowerCase(),
	);
}

function cycleMode(
	currentMode: ForensicsModeId,
	direction: "next" | "prev",
): ForensicsModeId {
	const currentIndex = MODE_ORDER.indexOf(currentMode);
	const safeIndex = currentIndex === -1 ? 0 : currentIndex;
	const delta = direction === "next" ? 1 : -1;
	const nextIndex = (safeIndex + delta + MODE_ORDER.length) % MODE_ORDER.length;
	return MODE_ORDER[nextIndex];
}

function buildPresentation(state: ForensicsPluginState): AnalysisPresentation {
	if (state.mode === null) {
		return {
			activeModeId: null,
			overlayOpacity: 0,
			sideBySide: false,
			showScore: false,
			magnifier: {
				enabled: false,
				zoom: state.magnifier.zoom,
			},
		};
	}

	const overlayOpacity =
		state.mode === "noise"
			? clamp01(state.noise.opacity)
			: state.mode === "pca"
				? clamp01(state.pca.opacity)
				: clamp01(state.texture.opacity);

	return {
		activeModeId: state.mode,
		overlayOpacity,
		sideBySide: state.view.sideBySide,
		showScore: state.view.outputScore,
		magnifier: {
			enabled: state.magnifier.enabled,
			zoom: state.magnifier.zoom,
		},
	};
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
	for (let index = 0; index < values.length; index += 1) {
		const bin = Math.round(clamp01(values[index]) * 255);
		bins[bin] += 1;
	}
	const cdf = new Uint32Array(256);
	let running = 0;
	for (let index = 0; index < bins.length; index += 1) {
		running += bins[index];
		cdf[index] = running;
	}
	let cdfMin = 0;
	for (let index = 0; index < cdf.length; index += 1) {
		if (cdf[index] > 0) {
			cdfMin = cdf[index];
			break;
		}
	}
	const denominator = Math.max(values.length - cdfMin, 1);
	const out = new Float32Array(values.length);
	for (let index = 0; index < values.length; index += 1) {
		const bin = Math.round(clamp01(values[index]) * 255);
		out[index] = clamp01((cdf[bin] - cdfMin) / denominator);
	}
	return out;
}

function stretchMapContrast(values: Float32Array): Float32Array {
	const bins = new Uint32Array(256);
	for (let index = 0; index < values.length; index += 1) {
		const bin = Math.round(clamp01(values[index]) * 255);
		bins[bin] += 1;
	}
	const lowTarget = values.length * 0.02;
	const highTarget = values.length * 0.98;
	let cumulative = 0;
	let lowBin = 0;
	let highBin = 255;

	for (let index = 0; index < bins.length; index += 1) {
		cumulative += bins[index];
		if (cumulative >= lowTarget) {
			lowBin = index;
			break;
		}
	}

	cumulative = 0;
	for (let index = 0; index < bins.length; index += 1) {
		cumulative += bins[index];
		if (cumulative >= highTarget) {
			highBin = index;
			break;
		}
	}

	const low = lowBin / 255;
	const high = Math.max(low + 1e-4, highBin / 255);
	const out = new Float32Array(values.length);
	for (let index = 0; index < values.length; index += 1) {
		out[index] = clamp01((values[index] - low) / (high - low));
	}
	return out;
}

function applyEnhancement(
	values: Float32Array,
	enhancement: EnhancementMode,
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
	state: ForensicsPluginState,
): Uint8ClampedArray {
	const luminance = buildLuminanceMap(data);
	const blurred = blurMap3x3(luminance, width, height);
	const amplitudeNorm = (state.noise.amplitude - 1) / 99;
	const gain = 1 + amplitudeNorm * 4.25;
	const map = new Float32Array(luminance.length);

	for (let index = 0; index < luminance.length; index += 1) {
		let residual = Math.abs(luminance[index] - blurred[index]) * gain * 4.1;
		if (state.noise.rembg) {
			const base = index * 4;
			const r = data[base] / 255;
			const g = data[base + 1] / 255;
			const b = data[base + 2] / 255;
			const maxChannel = Math.max(r, g, b);
			const minChannel = Math.min(r, g, b);
			const saturation =
				maxChannel > 0 ? (maxChannel - minChannel) / maxChannel : 0;
			const foregroundMask = clamp01(
				saturation * 1.1 + Math.abs(luminance[index] - 0.5) * 0.9,
			);
			residual *= foregroundMask;
		}
		map[index] = clamp01(residual);
	}

	const enhanced = state.noise.equalizeHistogram
		? equalizeMapHistogram(map)
		: map;

	const out = new Uint8ClampedArray(data.length);
	for (let index = 0; index < enhanced.length; index += 1) {
		const value = enhanced[index];
		const base = index * 4;
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
	state: ForensicsPluginState,
): Uint8ClampedArray {
	const luminance = buildLuminanceMap(data);
	const c1 = new Float32Array(luminance.length);
	const c2 = new Float32Array(luminance.length);
	const c3 = new Float32Array(luminance.length);

	if (state.pca.input === "color") {
		for (let index = 0; index < luminance.length; index += 1) {
			const base = index * 4;
			const r = data[base] / 255;
			const g = data[base + 1] / 255;
			const b = data[base + 2] / 255;
			c1[index] = clamp01((r + g + b) / 3);
			c2[index] = clamp01(Math.abs(r - g) * 1.7);
			c3[index] = clamp01(Math.abs(g - b) * 1.7);
		}
	} else {
		for (let y = 0; y < height; y += 1) {
			for (let x = 0; x < width; x += 1) {
				const index = y * width + x;
				const left = luminance[y * width + Math.max(0, x - 1)];
				const right = luminance[y * width + Math.min(width - 1, x + 1)];
				const up = luminance[Math.max(0, y - 1) * width + x];
				const down = luminance[Math.min(height - 1, y + 1) * width + x];
				const gx = (right - left) * 0.5;
				const gy = (down - up) * 0.5;
				c1[index] = luminance[index];
				c2[index] = clamp01(Math.abs(gx) * 4.5);
				c3[index] = clamp01(Math.abs(gy) * 4.5);
			}
		}
	}

	const raw = new Float32Array(luminance.length);
	for (let index = 0; index < raw.length; index += 1) {
		switch (state.pca.mode) {
			case "projection":
				raw[index] = clamp01(
					c1[index] * 0.58 + c2[index] * 0.27 + c3[index] * 0.15,
				);
				break;
			case "difference":
				raw[index] = clamp01(Math.abs(c2[index] - c3[index]) * 1.4);
				break;
			case "distance":
				raw[index] = clamp01(
					Math.sqrt(
						(c1[index] - 0.5) * (c1[index] - 0.5) +
							c2[index] * c2[index] +
							c3[index] * c3[index],
					) * 1.35,
				);
				break;
			case "component":
				raw[index] =
					state.pca.component === 1
						? c1[index]
						: state.pca.component === 2
							? c2[index]
							: c3[index];
				break;
		}
	}

	for (let index = 0; index < raw.length; index += 1) {
		raw[index] = state.pca.linearize
			? clamp01(raw[index]) ** 2.2
			: clamp01(raw[index]);
	}

	const enhanced = applyEnhancement(raw, state.pca.enhancement);
	const out = new Uint8ClampedArray(data.length);
	for (let index = 0; index < enhanced.length; index += 1) {
		const value = state.pca.invert ? 1 - enhanced[index] : enhanced[index];
		const base = index * 4;

		if (state.pca.mode === "component") {
			if (state.pca.component === 1) {
				out[base] = clampByte(value * 255);
				out[base + 1] = clampByte(value * 195);
				out[base + 2] = clampByte(value * 120);
			} else if (state.pca.component === 2) {
				out[base] = clampByte(value * 110);
				out[base + 1] = clampByte(value * 245);
				out[base + 2] = clampByte(value * 235);
			} else {
				out[base] = clampByte(value * 245);
				out[base + 1] = clampByte(value * 145);
				out[base + 2] = clampByte(value * 255);
			}
		} else if (state.pca.input === "luminance-gradient") {
			out[base] = clampByte(value * 120 + c2[index] * 40);
			out[base + 1] = clampByte(value * 220 + c3[index] * 35);
			out[base + 2] = clampByte(value * 255);
		} else {
			out[base] = clampByte(value * 200 + c2[index] * 30);
			out[base + 1] = clampByte(value * 150 + c3[index] * 40);
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
	state: ForensicsPluginState,
): Uint8ClampedArray {
	const luminance = buildLuminanceMap(data);
	const blurSmall = blurMap3x3(luminance, width, height);
	const blurRadius = Math.max(1, Math.round(state.texture.smoothness * 3));
	const blurWide = blurMapBox(luminance, width, height, blurRadius);

	const map = new Float32Array(luminance.length);
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const index = y * width + x;
			const left = luminance[y * width + Math.max(0, x - 1)];
			const right = luminance[y * width + Math.min(width - 1, x + 1)];
			const up = luminance[Math.max(0, y - 1) * width + x];
			const down = luminance[Math.min(height - 1, y + 1) * width + x];

			const gradient = clamp01(
				Math.sqrt((right - left) * (right - left) + (down - up) * (down - up)) *
					3,
			);
			const residual = clamp01(
				Math.abs(luminance[index] - blurSmall[index]) * 4.6,
			);
			const microContrast = clamp01(
				Math.abs(luminance[index] - blurWide[index]) * 5.2,
			);

			if (state.texture.mode === "edge-balance") {
				map[index] = gradient;
			} else if (state.texture.mode === "residual-noise") {
				map[index] = residual;
			} else {
				map[index] = microContrast;
			}
		}
	}

	for (let index = 0; index < map.length; index += 1) {
		map[index] = clamp01(map[index] * (0.7 + state.texture.strength * 1.8));
	}

	const smoothMix = state.texture.smoothness * 0.85;
	const smoothed = blurMapBox(map, width, height, blurRadius);
	for (let index = 0; index < map.length; index += 1) {
		map[index] = clamp01(
			map[index] * (1 - smoothMix) + smoothed[index] * smoothMix,
		);
	}

	const enhanced = applyEnhancement(map, state.texture.enhancement);
	const out = new Uint8ClampedArray(data.length);
	for (let index = 0; index < enhanced.length; index += 1) {
		const value = enhanced[index];
		const base = index * 4;
		out[base] = clampByte(value * 255);
		out[base + 1] = clampByte(value * 228);
		out[base + 2] = clampByte(value * 185);
		out[base + 3] = data[base + 3];
	}
	return out;
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
	for (let index = 0; index < luminance.length; index += 1) {
		const diff = luminance[index] - meanLuma;
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
	mode: Exclude<ForensicsModeId, null>,
	state: ForensicsPluginState,
	metrics: ImageMetrics,
): number {
	if (mode === "noise") {
		const amplitudeNorm = (state.noise.amplitude - 1) / 99;
		let score = 10 * (1 - metrics.noise);
		score -= amplitudeNorm * 2.2;
		score += state.noise.equalizeHistogram ? 0.4 : -0.2;
		score += state.noise.rembg ? 0.25 : 0;
		score += (1 - state.noise.opacity) * 0.6;
		return clampScore(score);
	}

	if (mode === "pca") {
		let signal = metrics.luminanceStd;
		switch (state.pca.mode) {
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
					state.pca.component === 1
						? metrics.luminanceStd
						: state.pca.component === 2
							? metrics.colorDivergence
							: metrics.noise;
				break;
		}
		let score = 10 * (1 - signal);
		if (state.pca.linearize) score += 0.25;
		if (state.pca.invert) score -= 0.15;
		if (state.pca.enhancement === "equalize-histogram") score += 0.35;
		if (state.pca.enhancement === "stretch-contrast") score += 0.2;
		if (state.pca.input === "luminance-gradient") score += 0.1;
		score += (1 - state.pca.opacity) * 0.35;
		return clampScore(score);
	}

	const edgeBalance = 1 - clamp01(Math.abs(metrics.gradient - 0.22) / 0.22);
	const residualNoisePenalty = clamp01(metrics.noise * 1.15);
	const microContrast = clamp01(metrics.texture * 1.1);

	let raw = edgeBalance;
	switch (state.texture.mode) {
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
	score += state.texture.strength * 0.9;
	score -= state.texture.smoothness * 0.9;
	if (state.texture.enhancement === "equalize-histogram") score += 0.25;
	if (state.texture.enhancement === "stretch-contrast") score += 0.15;
	score += (1 - state.texture.opacity) * 0.3;
	return clampScore(score);
}

const ForensicsSettingsPanel: React.FC<{
	value: unknown;
	onChange: (next: unknown) => void;
}> = ({ value, onChange }) => {
	const state = useMemo(() => normalizeForensicsPluginState(value), [value]);
	const settingsMode = state.mode ?? "noise";

	return (
		<ForensicsPanel
			state={{ ...state, mode: settingsMode }}
			onModeChange={(mode) => onChange({ ...state, mode })}
			onNoiseChange={(noise) => onChange({ ...state, noise })}
			onPcaChange={(pca) => onChange({ ...state, pca })}
			onTextureChange={(texture) => onChange({ ...state, texture })}
			onMagnifierChange={(enabled, zoom) =>
				onChange({
					...state,
					magnifier: { enabled, zoom },
				})
			}
			onViewChange={(view) =>
				onChange({
					...state,
					view,
				})
			}
			onHotkeysChange={(hotkeys) =>
				onChange({
					...state,
					hotkeys,
				})
			}
		/>
	);
};

export const FORENSICS_SETTINGS_DEFINITION: PluginSettingsDefinition = {
	pluginId: FORENSICS_PLUGIN_ID,
	presentation: "inline",
	title: "Forensics Suite Settings",
	description: "Configure analysis overlays and magnifier behavior.",
	createDefaultValue: () => structuredClone(DEFAULT_FORENSICS_STATE),
	render: ({ value, onChange }) => (
		<ForensicsSettingsPanel value={value} onChange={onChange} />
	),
};

export const FORENSICS_ANALYSIS_RUNTIME: AnalysisPluginRuntime = {
	pluginId: FORENSICS_PLUGIN_ID,
	normalizeState: (value) => normalizeForensicsPluginState(value),
	getModeActions: (value) =>
		createForensicsModeActions(normalizeForensicsPluginState(value).hotkeys),
	setActiveMode: (value, modeId) => {
		const state = normalizeForensicsPluginState(value);
		return {
			...state,
			mode:
				modeId === "noise" || modeId === "pca" || modeId === "texture"
					? modeId
					: null,
		};
	},
	handleKeydown: ({ key, state: value }) => {
		const state = normalizeForensicsPluginState(value);
		const modeAction = getModeActionForHotkey(key, state.hotkeys);
		if (modeAction) {
			return {
				...state,
				mode:
					modeAction.modeId === "noise" ||
					modeAction.modeId === "pca" ||
					modeAction.modeId === "texture"
						? modeAction.modeId
						: null,
			};
		}

		if (key.toLowerCase() === state.hotkeys.sideBySide.toLowerCase()) {
			return {
				...state,
				view: {
					...state.view,
					sideBySide: !state.view.sideBySide,
				},
			};
		}

		if (key === "[") {
			return {
				...state,
				mode: cycleMode(state.mode, "prev"),
			};
		}

		if (key === "]") {
			return {
				...state,
				mode: cycleMode(state.mode, "next"),
			};
		}

		return null;
	},
	getPresentation: (value) =>
		buildPresentation(normalizeForensicsPluginState(value)),
	renderOverlay: ({ data, width, height, state: value, activeModeId }) => {
		const state = normalizeForensicsPluginState(value);
		if (activeModeId === "noise") {
			return renderNoiseOverlay(data, width, height, state);
		}
		if (activeModeId === "pca") {
			return renderPcaOverlay(data, width, height, state);
		}
		if (activeModeId === "texture") {
			return renderTextureOverlay(data, width, height, state);
		}
		return new Uint8ClampedArray(data);
	},
	computeScore: ({ data, width, height, state: value, activeModeId }) => {
		if (
			activeModeId !== "noise" &&
			activeModeId !== "pca" &&
			activeModeId !== "texture"
		) {
			return null;
		}
		const state = normalizeForensicsPluginState(value);
		const metrics = computeImageMetrics(data, width, height);
		return scoreFromMetrics(activeModeId, state, metrics);
	},
};
