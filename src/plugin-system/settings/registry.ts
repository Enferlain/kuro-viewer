import {
	FORENSICS_PLUGIN_MANIFEST,
	FORENSICS_SETTINGS_DEFINITION,
} from "../forensics/settingsExtension";
import type { PluginManifestSummary } from "../pluginManifest";
import type { PluginSettingsDefinition, PluginSettingsStore } from "./types";

const BUILTIN_PLUGIN_MANIFESTS: PluginManifestSummary[] = [
	FORENSICS_PLUGIN_MANIFEST,
];

const PLUGIN_SETTINGS_DEFINITIONS: PluginSettingsDefinition[] = [
	FORENSICS_SETTINGS_DEFINITION,
];

const SETTINGS_BY_PLUGIN_ID = new Map(
	PLUGIN_SETTINGS_DEFINITIONS.map((definition) => [
		definition.pluginId,
		definition,
	]),
);

export function listBuiltinPluginManifests(): PluginManifestSummary[] {
	return BUILTIN_PLUGIN_MANIFESTS.map((manifest) => ({ ...manifest }));
}

export function getPluginSettingsDefinition(
	pluginId: string,
): PluginSettingsDefinition | undefined {
	return SETTINGS_BY_PLUGIN_ID.get(pluginId);
}

export function createInitialPluginSettingsStore(): PluginSettingsStore {
	const store: PluginSettingsStore = {};
	for (const definition of PLUGIN_SETTINGS_DEFINITIONS) {
		store[definition.pluginId] = definition.createDefaultValue();
	}
	return store;
}
