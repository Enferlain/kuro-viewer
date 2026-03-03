import type { Keybind, MouseAction } from "../../types.ts";

export const SETTINGS_SCHEMA_VERSION = 1 as const;

export interface ThemeDescriptor {
	id: string;
	name: string;
	author: string;
}

export interface AppSettingsV1 {
	schemaVersion: typeof SETTINGS_SCHEMA_VERSION;
	general: {
		startupRun: boolean;
		checkUpdates: boolean;
		allowInstances: boolean;
		watchChanges: boolean;
		autoOpenNew: boolean;
		gpuEnabled: boolean;
		lowPower: boolean;
		cacheSize: number;
	};
	appearance: {
		theme: "dark" | "light" | "system";
		backdropStyle: "None" | "Acrylic" | "Mica";
		accentColor: string;
		gridOpacity: number;
		customThemes: ThemeDescriptor[];
		selectedThemeId: string | null;
	};
	layout: {
		toolbarPos: "Top" | "Bottom" | "Hidden";
		galleryPos: "Top" | "Bottom" | "Hidden";
		sidebarPos: "Left" | "Right";
		autoHideToolbar: boolean;
	};
	slideshow: {
		enabled: boolean;
		intervalSeconds: number;
		loop: boolean;
		shuffle: boolean;
		transitionStyle: "Instant" | "Fade" | "Slide";
	};
	controls: {
		primaryScroll: MouseAction;
		middleClick: MouseAction;
		invertScroll: boolean;
		ctrlScroll: MouseAction;
		shiftScroll: MouseAction;
		spacebarAction: MouseAction;
		keybinds: Keybind[];
	};
	fileTypes: {
		associations: string[];
	};
	content: {
		libraryPaths: string[];
		clipEnabled: boolean;
		extractMetadata: boolean;
	};
	privacy: {
		telemetryEnabled: boolean;
	};
	language: {
		displayLanguage: string;
		fallbackLanguage: string;
		dateFormat: string;
		timeFormat: "12h" | "24h";
		firstDayOfWeek: "0" | "1";
		numberFormat: "dot" | "comma";
	};
	edit: {
		confirmDelete: boolean;
		confirmOverwrite: boolean;
		defaultSaveBehavior: "save_as" | "save_copy" | "overwrite";
		preserveMetadata: boolean;
		saveAsCurrentFolder: boolean;
		enableClipboardPasting: boolean;
		multiFileSelection: boolean;
		primaryEditorPath: string;
		secondaryEditorPath: string;
		cropGridType: "thirds" | "golden" | "center" | "none";
		preserveCropAspectRatio: boolean;
	};
	plugins: {
		pluginDirectory: string;
		autoLoadPlugins: boolean;
		devMode: boolean;
	};
}

export type AppSettings = AppSettingsV1;

export const defaultAppSettings: AppSettings = {
	schemaVersion: SETTINGS_SCHEMA_VERSION,
	general: {
		startupRun: false,
		checkUpdates: true,
		allowInstances: false,
		watchChanges: true,
		autoOpenNew: false,
		gpuEnabled: true,
		lowPower: false,
		cacheSize: 512,
	},
	appearance: {
		theme: "dark",
		backdropStyle: "Mica",
		accentColor: "#3b82f6",
		gridOpacity: 20,
		customThemes: [
			{ id: "kobe-default", name: "Kobe 9.0", author: "Dương Diệu Pháp" },
			{ id: "mocha-dark", name: "Mocha Dark", author: "Catppuccin" },
		],
		selectedThemeId: "kobe-default",
	},
	layout: {
		toolbarPos: "Top",
		galleryPos: "Bottom",
		sidebarPos: "Left",
		autoHideToolbar: true,
	},
	slideshow: {
		enabled: false,
		intervalSeconds: 5,
		loop: true,
		shuffle: false,
		transitionStyle: "Fade",
	},
	controls: {
		primaryScroll: "Zoom",
		middleClick: "Reset Zoom",
		invertScroll: false,
		ctrlScroll: "Vertical Pan",
		shiftScroll: "Horizontal Pan",
		spacebarAction: "Drag/Pan Mode",
		keybinds: [
			{ action: "next", label: "Next Image", key: "Right" },
			{ action: "prev", label: "Previous Image", key: "Left" },
			{ action: "reset", label: "Reset View", key: "0" },
			{ action: "noise", label: "Toggle Noise Filter", key: "N" },
			{ action: "pca", label: "Toggle PCA Filter", key: "P" },
			{ action: "metadata", label: "Toggle Metadata", key: "I" },
			{ action: "toolbar", label: "Toggle Toolbar", key: "T" },
			{ action: "gallery", label: "Toggle Gallery", key: "G" },
		],
	},
	fileTypes: {
		associations: [".png", ".jpg", ".jpeg", ".webp", ".gif"],
	},
	content: {
		libraryPaths: [],
		clipEnabled: false,
		extractMetadata: true,
	},
	privacy: {
		telemetryEnabled: false,
	},
	language: {
		displayLanguage: "en-US",
		fallbackLanguage: "en-US",
		dateFormat: "MM/DD/YYYY",
		timeFormat: "12h",
		firstDayOfWeek: "0",
		numberFormat: "dot",
	},
	edit: {
		confirmDelete: true,
		confirmOverwrite: true,
		defaultSaveBehavior: "save_as",
		preserveMetadata: true,
		saveAsCurrentFolder: true,
		enableClipboardPasting: true,
		multiFileSelection: false,
		primaryEditorPath: "",
		secondaryEditorPath: "",
		cropGridType: "thirds",
		preserveCropAspectRatio: true,
	},
	plugins: {
		pluginDirectory: "",
		autoLoadPlugins: true,
		devMode: false,
	},
};

type LegacyFlatSettings = Record<string, unknown>;

export function migrateSettingsSnapshot(input: unknown): AppSettings {
	const record = asRecord(input);

	if (record && record.schemaVersion === SETTINGS_SCHEMA_VERSION) {
		return normalizeV1(record);
	}

	return migrateLegacyFlatSettings(record);
}

function migrateLegacyFlatSettings(
	source: LegacyFlatSettings | null,
): AppSettings {
	const settings = structuredClone(defaultAppSettings);
	if (!source) return settings;

	settings.general.startupRun = readBoolean(
		source.startupRun,
		settings.general.startupRun,
	);
	settings.general.checkUpdates = readBoolean(
		source.checkUpdates,
		settings.general.checkUpdates,
	);
	settings.general.allowInstances = readBoolean(
		source.allowInstances,
		settings.general.allowInstances,
	);
	settings.general.watchChanges = readBoolean(
		source.watchChanges,
		settings.general.watchChanges,
	);
	settings.general.autoOpenNew = readBoolean(
		source.autoOpenNew,
		settings.general.autoOpenNew,
	);
	settings.general.gpuEnabled = readBoolean(
		source.gpuEnabled,
		settings.general.gpuEnabled,
	);
	settings.general.lowPower = readBoolean(
		source.lowPower,
		settings.general.lowPower,
	);
	settings.general.cacheSize = readNumber(
		source.cacheSize,
		settings.general.cacheSize,
	);

	settings.appearance.theme = readEnum(
		source.theme,
		settings.appearance.theme,
		["dark", "light", "system"],
	);
	settings.appearance.backdropStyle = readEnum(
		source.backdropStyle,
		settings.appearance.backdropStyle,
		["None", "Acrylic", "Mica"],
	);
	settings.appearance.accentColor = readString(
		source.accentColor,
		settings.appearance.accentColor,
	);
	settings.appearance.gridOpacity = readNumber(
		source.gridOpacity,
		settings.appearance.gridOpacity,
	);
	settings.appearance.selectedThemeId = readNullableString(
		source.selectedThemeId,
		settings.appearance.selectedThemeId,
	);
	settings.appearance.customThemes = readThemeDescriptors(
		source.customThemes,
		settings.appearance.customThemes,
	);

	settings.layout.toolbarPos = readEnum(
		source.toolbarPos,
		settings.layout.toolbarPos,
		["Top", "Bottom", "Hidden"],
	);
	settings.layout.galleryPos = readEnum(
		source.galleryPos,
		settings.layout.galleryPos,
		["Top", "Bottom", "Hidden"],
	);
	settings.layout.sidebarPos = readEnum(
		source.sidebarPos,
		settings.layout.sidebarPos,
		["Left", "Right"],
	);
	settings.layout.autoHideToolbar = readBoolean(
		source.autoHideToolbar,
		settings.layout.autoHideToolbar,
	);

	settings.slideshow.enabled = readBoolean(
		source.slideshowEnabled,
		settings.slideshow.enabled,
	);
	settings.slideshow.intervalSeconds = readNumber(
		source.slideshowInterval,
		settings.slideshow.intervalSeconds,
	);
	settings.slideshow.loop = readBoolean(
		source.slideshowLoop,
		settings.slideshow.loop,
	);
	settings.slideshow.shuffle = readBoolean(
		source.slideshowShuffle,
		settings.slideshow.shuffle,
	);
	settings.slideshow.transitionStyle = readEnum(
		source.transitionStyle,
		settings.slideshow.transitionStyle,
		["Instant", "Fade", "Slide"],
	);

	settings.controls.primaryScroll = readMouseAction(
		source.primaryScroll,
		settings.controls.primaryScroll,
	);
	settings.controls.middleClick = readMouseAction(
		source.middleClick,
		settings.controls.middleClick,
	);
	settings.controls.invertScroll = readBoolean(
		source.invertScroll,
		settings.controls.invertScroll,
	);
	settings.controls.ctrlScroll = readMouseAction(
		source.ctrlScroll,
		settings.controls.ctrlScroll,
	);
	settings.controls.shiftScroll = readMouseAction(
		source.shiftScroll,
		settings.controls.shiftScroll,
	);
	settings.controls.spacebarAction = readMouseAction(
		source.spacebarAction,
		settings.controls.spacebarAction,
	);
	settings.controls.keybinds = readKeybinds(
		source.keybinds,
		settings.controls.keybinds,
	);

	settings.fileTypes.associations = readStringArray(
		source.fileAssociations,
		settings.fileTypes.associations,
	);
	settings.content.libraryPaths = readStringArray(
		source.libraryPaths,
		settings.content.libraryPaths,
	);
	settings.content.clipEnabled = readBoolean(
		source.clipEnabled,
		settings.content.clipEnabled,
	);
	settings.content.extractMetadata = readBoolean(
		source.extractMetadata,
		settings.content.extractMetadata,
	);
	settings.privacy.telemetryEnabled = readBoolean(
		source.telemetryEnabled,
		settings.privacy.telemetryEnabled,
	);

	settings.language.displayLanguage = readString(
		source.displayLanguage,
		settings.language.displayLanguage,
	);
	settings.language.fallbackLanguage = readString(
		source.fallbackLanguage,
		settings.language.fallbackLanguage,
	);
	settings.language.dateFormat = readString(
		source.dateFormat,
		settings.language.dateFormat,
	);
	settings.language.timeFormat = readEnum(
		source.timeFormat,
		settings.language.timeFormat,
		["12h", "24h"],
	);
	settings.language.firstDayOfWeek = readEnum(
		source.firstDayOfWeek,
		settings.language.firstDayOfWeek,
		["0", "1"],
	);
	settings.language.numberFormat = readEnum(
		source.numberFormat,
		settings.language.numberFormat,
		["dot", "comma"],
	);

	settings.edit.confirmDelete = readBoolean(
		source.confirmDelete,
		settings.edit.confirmDelete,
	);
	settings.edit.confirmOverwrite = readBoolean(
		source.confirmOverwrite,
		settings.edit.confirmOverwrite,
	);
	settings.edit.defaultSaveBehavior = readEnum(
		source.defaultSaveBehavior,
		settings.edit.defaultSaveBehavior,
		["save_as", "save_copy", "overwrite"],
	);
	settings.edit.preserveMetadata = readBoolean(
		source.preserveMetadata,
		settings.edit.preserveMetadata,
	);
	settings.edit.saveAsCurrentFolder = readBoolean(
		source.saveAsCurrentFolder,
		settings.edit.saveAsCurrentFolder,
	);
	settings.edit.enableClipboardPasting = readBoolean(
		source.enableClipboardPasting,
		settings.edit.enableClipboardPasting,
	);
	settings.edit.multiFileSelection = readBoolean(
		source.multiFileSelection,
		settings.edit.multiFileSelection,
	);
	settings.edit.primaryEditorPath = readString(
		source.primaryEditorPath,
		settings.edit.primaryEditorPath,
	);
	settings.edit.secondaryEditorPath = readString(
		source.secondaryEditorPath,
		settings.edit.secondaryEditorPath,
	);
	settings.edit.cropGridType = readEnum(
		source.cropGridType,
		settings.edit.cropGridType,
		["thirds", "golden", "center", "none"],
	);
	settings.edit.preserveCropAspectRatio = readBoolean(
		source.preserveCropAspectRatio,
		settings.edit.preserveCropAspectRatio,
	);

	settings.plugins.pluginDirectory = readString(
		source.pluginDirectory,
		settings.plugins.pluginDirectory,
	);
	settings.plugins.autoLoadPlugins = readBoolean(
		source.autoLoadPlugins,
		settings.plugins.autoLoadPlugins,
	);
	settings.plugins.devMode = readBoolean(
		source.pluginDevMode,
		settings.plugins.devMode,
	);

	return settings;
}

function normalizeV1(source: LegacyFlatSettings): AppSettings {
	if (isAppSettingsV1(source)) {
		return structuredClone(source);
	}

	const migrated = migrateLegacyFlatSettings(source);
	return {
		...migrated,
		schemaVersion: SETTINGS_SCHEMA_VERSION,
	};
}

function asRecord(value: unknown): LegacyFlatSettings | null {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		return null;
	}
	return value as LegacyFlatSettings;
}

function isAppSettingsV1(value: unknown): value is AppSettingsV1 {
	if (!isRecord(value)) return false;

	return (
		value.schemaVersion === SETTINGS_SCHEMA_VERSION &&
		isRecord(value.general) &&
		isRecord(value.appearance) &&
		isRecord(value.layout) &&
		isRecord(value.slideshow) &&
		isRecord(value.controls) &&
		isRecord(value.fileTypes) &&
		isRecord(value.content) &&
		isRecord(value.privacy) &&
		isRecord(value.language) &&
		isRecord(value.edit) &&
		isRecord(value.plugins)
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readString(value: unknown, fallback: string): string {
	return typeof value === "string" ? value : fallback;
}

function readNullableString(
	value: unknown,
	fallback: string | null,
): string | null {
	if (typeof value === "string") return value;
	if (value === null) return null;
	return fallback;
}

function readStringArray(value: unknown, fallback: string[]): string[] {
	if (!Array.isArray(value)) return fallback;
	return value.filter((entry): entry is string => typeof entry === "string");
}

function readThemeDescriptors(
	value: unknown,
	fallback: ThemeDescriptor[],
): ThemeDescriptor[] {
	if (!Array.isArray(value)) return fallback;
	const parsed = value
		.map((entry) => {
			if (!entry || typeof entry !== "object" || Array.isArray(entry))
				return null;
			const record = entry as Record<string, unknown>;
			if (
				typeof record.id !== "string" ||
				typeof record.name !== "string" ||
				typeof record.author !== "string"
			) {
				return null;
			}
			return { id: record.id, name: record.name, author: record.author };
		})
		.filter((entry): entry is ThemeDescriptor => entry !== null);

	return parsed.length > 0 ? parsed : fallback;
}

function readEnum<T extends string>(
	value: unknown,
	fallback: T,
	allowed: readonly T[],
): T {
	return typeof value === "string" && allowed.includes(value as T)
		? (value as T)
		: fallback;
}

function readMouseAction(value: unknown, fallback: MouseAction): MouseAction {
	return readEnum(value, fallback, mouseActionValues);
}

function readKeybinds(value: unknown, fallback: Keybind[]): Keybind[] {
	if (!Array.isArray(value)) return fallback;

	const parsed = value
		.map((entry) => {
			if (!entry || typeof entry !== "object" || Array.isArray(entry))
				return null;
			const record = entry as Record<string, unknown>;
			if (
				typeof record.action !== "string" ||
				typeof record.key !== "string" ||
				typeof record.label !== "string"
			) {
				return null;
			}
			return {
				action: record.action,
				key: record.key,
				label: record.label,
			};
		})
		.filter((entry): entry is Keybind => entry !== null);

	return parsed.length > 0 ? parsed : fallback;
}

const mouseActionValues = [
	"Zoom",
	"Next/Prev Image",
	"Vertical Pan",
	"Horizontal Pan",
	"Reset Zoom",
	"Fit to Screen",
	"Toggle Fullscreen",
	"Toggle Metadata",
	"Toggle Toolbar",
	"Toggle Gallery",
	"Play/Pause Slideshow",
	"Drag/Pan Mode",
] as const;
