import type { BundledPluginModule } from "@/plugin-system/runtime";
import {
	FORENSICS_ANALYSIS_RUNTIME,
	FORENSICS_MANIFEST,
	FORENSICS_SETTINGS_DEFINITION,
} from "./plugin";

export const plugin: BundledPluginModule = {
	manifest: FORENSICS_MANIFEST,
	settings: FORENSICS_SETTINGS_DEFINITION,
	analysis: FORENSICS_ANALYSIS_RUNTIME,
};
