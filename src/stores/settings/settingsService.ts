import { invoke } from "@tauri-apps/api/core";
import {
	type AppSettings,
	defaultAppSettings,
	migrateSettingsSnapshot,
} from "./settingsSchema.ts";

/**
 * Service boundary for settings persistence.
 * Swap the implementation here to change storage backend
 * without touching UI code.
 */

const IS_TAURI = "__TAURI_INTERNALS__" in window;

export async function loadSettings(): Promise<AppSettings> {
	if (!IS_TAURI) {
		// Browser-only fallback (dev without Tauri shell)
		const raw = localStorage.getItem("kuro-settings");
		if (raw) {
			try {
				return migrateSettingsSnapshot(JSON.parse(raw));
			} catch {
				// Corrupt JSON — clear it so we don't fail repeatedly
				localStorage.removeItem("kuro-settings");
			}
		}
		return migrateSettingsSnapshot(null);
	}

	const json: string = await invoke("read_settings");
	const parsed = json ? JSON.parse(json) : null;
	return migrateSettingsSnapshot(parsed);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
	const json = JSON.stringify(settings, null, "\t");

	if (!IS_TAURI) {
		localStorage.setItem("kuro-settings", json);
		return;
	}

	await invoke("write_settings", { json });
}

export { defaultAppSettings };
export type { AppSettings };
