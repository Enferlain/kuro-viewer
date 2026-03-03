import type React from "react";
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import type { AppSettings } from "./settingsSchema.ts";
import {
	defaultAppSettings,
	loadSettings,
	saveSettings,
} from "./settingsService.ts";

export interface SettingsContextValue {
	/** Current persisted settings. Always normalized and typed. */
	settings: AppSettings;
	/** Replace the full settings object, persist to disk. */
	updateSettings: (next: AppSettings) => void;
	/** True while the initial load is in progress. */
	loading: boolean;
}

export const SettingsContext = createContext<SettingsContextValue>({
	settings: defaultAppSettings,
	updateSettings: () => {},
	loading: true,
});

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [settings, setSettings] = useState<AppSettings>(defaultAppSettings);
	const [loading, setLoading] = useState(true);
	const mountedRef = useRef(true);

	// Load settings once on app startup
	useEffect(() => {
		mountedRef.current = true;
		loadSettings()
			.then((loaded) => {
				if (mountedRef.current) {
					setSettings(loaded);
					setLoading(false);
				}
			})
			.catch((err) => {
				console.error("Failed to load settings, using defaults:", err);
				if (mountedRef.current) {
					setLoading(false);
				}
			});

		return () => {
			mountedRef.current = false;
		};
	}, []);

	const updateSettings = useCallback((next: AppSettings) => {
		setSettings(next);
		saveSettings(next).catch((err) => {
			console.error("Failed to save settings:", err);
		});
	}, []);

	return (
		<SettingsContext.Provider value={{ settings, updateSettings, loading }}>
			{children}
		</SettingsContext.Provider>
	);
};
