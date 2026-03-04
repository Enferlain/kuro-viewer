import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { FilterType } from "../../types";
import type { PluginManifestSummary } from "../pluginManifest";
import type {
	PluginSettingsDefinition,
	PluginSettingsStore,
} from "../settings/types";
import { ForensicsPanel } from "./ForensicsPanel";
import {
	createForensicsModeActions,
	DEFAULT_FORENSICS_HOTKEYS,
	DEFAULT_FORENSICS_STATE,
	FORENSICS_PLUGIN,
	type ForensicsPluginState,
	type PcaAnalysisMode,
	type PcaInputMode,
	sanitizeHotkey,
	type TextureAnalysisMode,
} from "./forensicsPlugin";

const BACKEND = "builtin";
const SLOTS = ["toolbar", "panel"];

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
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

function readMode(value: unknown, fallback: FilterType): FilterType {
	if (
		value === FilterType.NONE ||
		value === FilterType.NOISE ||
		value === FilterType.PCA ||
		value === FilterType.TEXTURE
	) {
		return value;
	}
	return fallback;
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
	fallback: "none" | "equalize-histogram" | "stretch-contrast",
) {
	return value === "none" ||
		value === "equalize-histogram" ||
		value === "stretch-contrast"
		? value
		: fallback;
}

export function normalizeForensicsPluginState(
	value: unknown,
): ForensicsPluginState {
	const defaults = DEFAULT_FORENSICS_STATE;
	if (!isRecord(value)) {
		return defaults;
	}

	const noise = isRecord(value.noise) ? value.noise : {};
	const pca = isRecord(value.pca) ? value.pca : {};
	const texture = isRecord(value.texture) ? value.texture : {};
	const magnifier = isRecord(value.magnifier) ? value.magnifier : {};
	const view = isRecord(value.view) ? value.view : {};
	const hotkeys = isRecord(value.hotkeys) ? value.hotkeys : {};
	const fallbackHotkeys = defaults.hotkeys ?? DEFAULT_FORENSICS_HOTKEYS;

	return {
		mode: readMode(value.mode, defaults.mode),
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
			opacity: readClampedNumber(pca.opacity, defaults.pca.opacity, 0, 1),
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
				0,
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
				fallbackHotkeys.original,
			),
			noise: sanitizeHotkey(String(hotkeys.noise ?? ""), fallbackHotkeys.noise),
			pca: sanitizeHotkey(String(hotkeys.pca ?? ""), fallbackHotkeys.pca),
			texture: sanitizeHotkey(
				String(hotkeys.texture ?? ""),
				fallbackHotkeys.texture,
			),
			sideBySide: sanitizeHotkey(
				String(hotkeys.sideBySide ?? ""),
				fallbackHotkeys.sideBySide,
			),
		},
	};
}

interface ForensicsSettingsProps {
	value: unknown;
	onChange: (next: unknown) => void;
}

const ForensicsSettingsPanel: React.FC<ForensicsSettingsProps> = ({
	value,
	onChange,
}) => {
	const state = useMemo(() => normalizeForensicsPluginState(value), [value]);
	const settingsModes = useMemo(
		() =>
			createForensicsModeActions(state.hotkeys).filter(
				(action) => action.mode !== FilterType.NONE,
			),
		[state.hotkeys],
	);
	const settingsModeValues = useMemo(
		() => new Set(settingsModes.map((action) => action.mode)),
		[settingsModes],
	);
	const defaultMode =
		state.mode !== FilterType.NONE && settingsModeValues.has(state.mode)
			? state.mode
			: FilterType.NOISE;
	const [settingsMode, setSettingsMode] = useState<FilterType>(defaultMode);

	useEffect(() => {
		setSettingsMode(defaultMode);
	}, [defaultMode]);

	const setState = (next: ForensicsPluginState) => {
		onChange(next);
	};

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap gap-1">
				{settingsModes.map((action) => (
					<button
						type="button"
						key={action.mode}
						onClick={() => {
							setSettingsMode(action.mode);
							setState({ ...state, mode: action.mode });
						}}
						className={[
							"px-2 py-1 rounded-lg text-[10px] border transition-colors cursor-pointer",
							settingsMode === action.mode
								? "border-accent/40 bg-accent/15 text-accent"
								: "border-glass-border-base bg-glass-bg-base text-foreground-muted hover:text-foreground hover:bg-glass-bg-hover",
						].join(" ")}
					>
						{action.label}
					</button>
				))}
			</div>
			<ForensicsPanel
				state={{ ...state, mode: settingsMode }}
				onNoiseChange={(noise) => setState({ ...state, noise })}
				onPcaChange={(pca) => setState({ ...state, pca })}
				onTextureChange={(texture) => setState({ ...state, texture })}
				onMagnifierChange={(enabled, zoom) =>
					setState({
						...state,
						magnifier: { enabled, zoom },
					})
				}
				onViewChange={(view) =>
					setState({
						...state,
						view,
					})
				}
				onHotkeysChange={(hotkeys) =>
					setState({
						...state,
						hotkeys,
					})
				}
			/>
		</div>
	);
};

export const FORENSICS_PLUGIN_MANIFEST: PluginManifestSummary = {
	id: FORENSICS_PLUGIN.id,
	name: FORENSICS_PLUGIN.name,
	version: FORENSICS_PLUGIN.version,
	description: FORENSICS_PLUGIN.description,
	author: "Kuro Viewer Team",
	source_url: "https://github.com/kuro-viewer/kuro-viewer",
	docs_url:
		"https://github.com/kuro-viewer/kuro-viewer/blob/main/docs/PLUGIN_CONTRACT_1.0.md",
	usage:
		"Use Noise, PCA, or Texture modes for forensic overlays. Open Configure from Settings > Plugins to tune magnifier, hotkeys, and mode-specific controls.",
	backend: BACKEND,
	slots: SLOTS,
	permissions: [],
};

export const FORENSICS_SETTINGS_DEFINITION: PluginSettingsDefinition = {
	pluginId: FORENSICS_PLUGIN.id,
	presentation: "inline",
	title: "Forensics Suite Settings",
	description: "Configure analysis overlays and magnifier behavior.",
	createDefaultValue: () => DEFAULT_FORENSICS_STATE,
	render: ({ value, onChange }) => (
		<ForensicsSettingsPanel value={value} onChange={onChange} />
	),
};

export function readForensicsStateFromStore(
	store: PluginSettingsStore,
): ForensicsPluginState {
	return normalizeForensicsPluginState(store[FORENSICS_PLUGIN.id]);
}
