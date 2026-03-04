import type { CSSProperties } from "react";
import { FilterType } from "../../types";

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
	mode: FilterType;
	noise: NoiseOptions;
	pca: PcaOptions;
	texture: TextureOptions;
	magnifier: MagnifierOptions;
	view: ForensicsViewOptions;
	hotkeys: ForensicsHotkeys;
}

export interface ForensicsModeAction {
	mode: FilterType;
	label: string;
	hotkey: string;
}

export const FORENSICS_PLUGIN = {
	id: "forensics-suite",
	name: "Forensics Suite",
	version: "0.1.0-internal",
	description:
		"Pixel-level forensic tools for noise, PCA, and texture analysis with interactive overlays.",
};

export const DEFAULT_FORENSICS_HOTKEYS: ForensicsHotkeys = {
	original: "O",
	noise: "N",
	pca: "P",
	texture: "M",
	sideBySide: "S",
};

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

export function createForensicsModeActions(
	hotkeys: ForensicsHotkeys = DEFAULT_FORENSICS_HOTKEYS,
): ForensicsModeAction[] {
	return [
		{ mode: FilterType.NONE, label: "Original", hotkey: hotkeys.original },
		{ mode: FilterType.NOISE, label: "Noise", hotkey: hotkeys.noise },
		{ mode: FilterType.PCA, label: "PCA", hotkey: hotkeys.pca },
		{ mode: FilterType.TEXTURE, label: "Texture", hotkey: hotkeys.texture },
	];
}

export const FORENSICS_MODE_ACTIONS: ForensicsModeAction[] =
	createForensicsModeActions();

export const DEFAULT_FORENSICS_STATE: ForensicsPluginState = {
	mode: FilterType.NONE,
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

export function getForensicsModeHotkey(
	key: string,
	hotkeys: ForensicsHotkeys = DEFAULT_FORENSICS_HOTKEYS,
): ForensicsModeAction | undefined {
	return createForensicsModeActions(hotkeys).find(
		(action) => action.hotkey.toLowerCase() === key.toLowerCase(),
	);
}

export function cycleForensicsMode(
	currentMode: FilterType,
	direction: "next" | "prev",
): FilterType {
	const order = FORENSICS_MODE_ACTIONS.map((entry) => entry.mode);
	const currentIndex = order.indexOf(currentMode);
	const safeIndex = currentIndex === -1 ? 0 : currentIndex;
	const delta = direction === "next" ? 1 : -1;
	const nextIndex = (safeIndex + delta + order.length) % order.length;
	return order[nextIndex];
}

function clamp01(value: number): number {
	return Math.min(1, Math.max(0, value));
}

export function modeOverlayOpacity(state: ForensicsPluginState): number {
	switch (state.mode) {
		case FilterType.NOISE:
			return clamp01(state.noise.opacity);
		case FilterType.PCA:
			return clamp01(state.pca.opacity);
		case FilterType.TEXTURE:
			return clamp01(state.texture.opacity);
		default:
			return 0;
	}
}

export function modeFilterStyle(state: ForensicsPluginState): CSSProperties {
	if (state.mode === FilterType.NONE) {
		return {};
	}

	if (state.mode === FilterType.NOISE) {
		const amplitudeNorm = (state.noise.amplitude - 1) / 99;
		const contrast = Math.round(120 + amplitudeNorm * 220);
		const brightness = state.noise.equalizeHistogram ? 1.05 : 0.95;
		const rembgBoost = state.noise.rembg ? "saturate(60%)" : "saturate(100%)";
		return {
			filter: `grayscale(100%) contrast(${contrast}%) brightness(${brightness}) ${rembgBoost}`,
			mixBlendMode: "screen",
		};
	}

	if (state.mode === FilterType.PCA) {
		const base =
			state.pca.input === "luminance-gradient"
				? "grayscale(100%)"
				: "grayscale(30%) saturate(150%)";
		const pcaModeFilter = (() => {
			switch (state.pca.mode) {
				case "projection":
					return "contrast(165%) brightness(1.05)";
				case "difference":
					return "contrast(190%) brightness(0.95)";
				case "distance":
					return "contrast(155%) brightness(1.12) saturate(85%)";
				case "component":
					return `hue-rotate(${(state.pca.component - 1) * 35}deg) contrast(175%)`;
				default:
					return "contrast(160%)";
			}
		})();
		const linearize = state.pca.linearize ? "brightness(1.08)" : "";
		const invert = state.pca.invert ? "invert(100%)" : "";
		const enhancement =
			state.pca.enhancement === "equalize-histogram"
				? "contrast(200%)"
				: state.pca.enhancement === "stretch-contrast"
					? "contrast(180%) brightness(1.05)"
					: "";
		return {
			filter: `${base} ${pcaModeFilter} ${linearize} ${enhancement} ${invert}`
				.replace(/\s+/g, " ")
				.trim(),
			mixBlendMode: "screen",
		};
	}

	const textureModeFilter = (() => {
		switch (state.texture.mode) {
			case "edge-balance":
				return "grayscale(100%) contrast(170%) brightness(1.1)";
			case "residual-noise":
				return "grayscale(100%) invert(100%) contrast(220%)";
			case "micro-contrast":
				return "grayscale(70%) contrast(210%) saturate(120%)";
			default:
				return "grayscale(100%) contrast(170%)";
		}
	})();
	const strength = `contrast(${Math.round(120 + state.texture.strength * 120)}%)`;
	const smoothness = `blur(${(state.texture.smoothness * 0.9).toFixed(2)}px)`;
	const enhancement =
		state.texture.enhancement === "equalize-histogram"
			? "brightness(1.08)"
			: state.texture.enhancement === "stretch-contrast"
				? "brightness(1.05) saturate(115%)"
				: "";

	return {
		filter: `${textureModeFilter} ${strength} ${smoothness} ${enhancement}`
			.replace(/\s+/g, " ")
			.trim(),
		mixBlendMode: "screen",
	};
}
