import type React from "react";
import type { PluginManifestEntry } from "../pluginManifest";

export type PluginSettingsStore = Record<string, unknown>;
export type PluginSettingsPresentation = "inline" | "modal";

export interface PluginSettingsRendererProps {
	manifest: PluginManifestEntry;
	value: unknown;
	onChange: (next: unknown) => void;
}

export interface PluginSettingsDefinition {
	pluginId: string;
	presentation?: PluginSettingsPresentation;
	title?: string;
	description?: string;
	createDefaultValue: () => unknown;
	render: (props: PluginSettingsRendererProps) => React.ReactNode;
}
