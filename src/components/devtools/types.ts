import type { PluginManifestSummary } from "../../plugin-system/pluginManifest";
import type { PluginSettingsStore } from "../../plugin-system/settings";
import type { ViewerState } from "../../types";

export type DevLogType = "info" | "success" | "error";

export interface DevLogEntry {
	id: number;
	type: DevLogType;
	time: string;
	message: string;
}

export interface WorkspacePluginIssue {
	level: "warning" | "error";
	message: string;
}

export interface WorkspacePluginRecord {
	id: string;
	name: string;
	version: string;
	directory: string;
	manifestPath: string;
	settingsSchemaPath: string | null;
	sourceEntryPath: string | null;
	status: "ready" | "warning" | "error";
	manifest: PluginManifestSummary;
	issues: WorkspacePluginIssue[];
}

export interface DevToolsHostSnapshot {
	currentImageName: string | null;
	viewerState: ViewerState;
	pluginSettings: PluginSettingsStore;
}
