export interface PluginManifestSummary {
	id: string;
	name: string;
	version: string;
	description?: string;
	author?: string;
	source_url?: string;
	docs_url?: string;
	usage?: string;
	backend: string;
	slots: string[];
	permissions: string[];
}

export type PluginManifestOrigin = "installed" | "builtin";

export interface PluginManifestEntry extends PluginManifestSummary {
	origin: PluginManifestOrigin;
}
