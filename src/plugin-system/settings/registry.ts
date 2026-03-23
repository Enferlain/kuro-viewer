import type { PluginManifestSummary } from "../pluginManifest";
import type { PluginSettingsDefinition, PluginSettingsStore } from "./types";

export function listBuiltinPluginManifests(): PluginManifestSummary[] {
	return [];
}

export function getPluginSettingsDefinition(
	_pluginId: string,
): PluginSettingsDefinition | undefined {
	return undefined;
}

export function createInitialPluginSettingsStore(): PluginSettingsStore {
	return {};
}
