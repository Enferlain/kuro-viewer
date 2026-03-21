import {
	AlertCircle,
	Check,
	Download,
	Info,
	Puzzle,
	Shield,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type {
	PluginManifestEntry,
	PluginManifestSummary,
} from "../../../plugin-system/pluginManifest";
import type { PluginSettingsDefinition } from "../../../plugin-system/settings";
import {
	getPluginSettingsDefinition,
	listBuiltinPluginManifests,
	type PluginSettingsStore,
} from "../../../plugin-system/settings";
import { createPluginSettingsDefinitionFromSchema } from "../../../plugin-system/settings/schemaRuntime";
import { Button } from "../../ui/Button";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { SettingGroup } from "../ui/SettingGroup";

interface HostPluginContract {
	manifest_schema_version: string;
	plugin_api_version: string;
	theme_contract_version: string;
	supported_backends: string[];
	supported_slots: string[];
	supported_permissions: string[];
}

type StatusBanner = {
	type: "success" | "error" | "info";
	message: string;
};

type PendingInstall = {
	path: string;
	manifest: PluginManifestSummary;
};

interface PluginsTabProps {
	disabledPlugins: string[];
	onDisabledPluginsChange: React.Dispatch<React.SetStateAction<string[]>>;
	pluginSettings: PluginSettingsStore;
	onPluginSettingsChange: React.Dispatch<
		React.SetStateAction<PluginSettingsStore>
	>;
	hostModalSize?: {
		width: number;
		height: number;
	};
}

const IS_TAURI = "__TAURI_INTERNALS__" in window;

async function tauriInvoke<T>(
	cmd: string,
	args?: Record<string, unknown>,
): Promise<T> {
	if (!IS_TAURI) {
		throw new Error(`Tauri not available — cannot invoke '${cmd}'`);
	}
	const { invoke } = await import("@tauri-apps/api/core");
	return invoke<T>(cmd, args);
}

async function tauriListen(
	event: string,
	handler: () => void,
): Promise<() => void> {
	if (!IS_TAURI) {
		return () => {};
	}
	const { listen } = await import("@tauri-apps/api/event");
	const unlisten = await listen(event, handler);
	return unlisten;
}

function pickPluginFilePathWithInput(): Promise<string | null> {
	return new Promise((resolve, reject) => {
		const input = document.createElement("input");
		let settled = false;

		const cleanup = () => {
			input.removeEventListener("change", onChange);
			input.removeEventListener("cancel", onCancel);
			input.remove();
		};

		const settle = (next: () => void) => {
			if (settled) {
				return;
			}
			settled = true;
			cleanup();
			next();
		};

		const onCancel = () => {
			settle(() => resolve(null));
		};

		const onChange = () => {
			const file = input.files?.[0];
			if (!file) {
				settle(() => resolve(null));
				return;
			}

			const filePath = (file as File & { path?: unknown }).path;
			if (typeof filePath !== "string" || filePath.length === 0) {
				settle(() =>
					reject(
						new Error(
							"Selected file path is unavailable in this runtime. Install from the Tauri desktop app.",
						),
					),
				);
				return;
			}

			settle(() => resolve(filePath));
		};

		input.type = "file";
		input.accept = ".plugin";
		input.style.display = "none";
		input.addEventListener("change", onChange, { once: true });
		input.addEventListener("cancel", onCancel, { once: true });
		document.body.appendChild(input);
		input.click();
	});
}

export const PluginsTab: React.FC<PluginsTabProps> = ({
	disabledPlugins,
	onDisabledPluginsChange,
	pluginSettings,
	onPluginSettingsChange,
	hostModalSize,
}) => {
	const modalPortalTarget =
		typeof document !== "undefined" ? document.body : null;
	const [contract, setContract] = useState<HostPluginContract | null>(null);
	const [plugins, setPlugins] = useState<PluginManifestSummary[]>([]);
	const [status, setStatus] = useState<StatusBanner | null>(null);
	const [loading, setLoading] = useState(true);
	const [isDragActive, setIsDragActive] = useState(false);
	const [isInstalling, setIsInstalling] = useState(false);
	const [pendingInstall, setPendingInstall] = useState<PendingInstall | null>(
		null,
	);
	const [activeInlinePluginId, setActiveInlinePluginId] = useState<
		string | null
	>(null);
	const [activeModalPluginId, setActiveModalPluginId] = useState<string | null>(
		null,
	);
	const [dynamicSettingsDefinitions, setDynamicSettingsDefinitions] = useState<
		Record<string, PluginSettingsDefinition>
	>({});
	const [schemaValidationErrors, setSchemaValidationErrors] = useState<
		Record<string, string>
	>({});
	const [aboutPlugin, setAboutPlugin] = useState<PluginManifestEntry | null>(
		null,
	);
	const [pendingRemoval, setPendingRemoval] =
		useState<PluginManifestEntry | null>(null);
	const dropZoneRef = useRef<HTMLDivElement | null>(null);
	const disabledPluginIds = useMemo(
		() => new Set(disabledPlugins),
		[disabledPlugins],
	);

	const displayPlugins = useMemo<PluginManifestEntry[]>(() => {
		const installedEntries = plugins.map((plugin) => ({
			...plugin,
			origin: "installed" as const,
		}));

		const builtins = listBuiltinPluginManifests();
		const missingBuiltins = builtins
			.filter(
				(manifest) =>
					!installedEntries.some((plugin) => plugin.id === manifest.id),
			)
			.map((manifest) => ({
				...manifest,
				origin: "builtin" as const,
			}));

		return [...missingBuiltins, ...installedEntries];
	}, [plugins]);

	const activeModalManifest = useMemo(
		() =>
			activeModalPluginId
				? (displayPlugins.find((plugin) => plugin.id === activeModalPluginId) ??
					null)
				: null,
		[activeModalPluginId, displayPlugins],
	);

	const activeModalDefinition = useMemo(() => {
		if (!activeModalManifest) {
			return undefined;
		}

		const definition =
			getPluginSettingsDefinition(activeModalManifest.id) ??
			dynamicSettingsDefinitions[activeModalManifest.id];
		if (!definition) {
			return undefined;
		}

		return (definition.presentation ?? "inline") === "modal"
			? definition
			: undefined;
	}, [activeModalManifest, dynamicSettingsDefinitions]);

	const activeModalValue = useMemo(() => {
		if (!activeModalManifest || !activeModalDefinition) {
			return undefined;
		}
		return (
			pluginSettings[activeModalManifest.id] ??
			activeModalDefinition.createDefaultValue()
		);
	}, [activeModalDefinition, activeModalManifest, pluginSettings]);

	// Dev-only visibility: true during Vite dev server
	const isDev = (() => {
		try {
			// Vite injects import.meta.env at build time
			return (
				(import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV ===
				true
			);
		} catch {
			return false;
		}
	})();

	const fetchData = useCallback(async () => {
		if (!IS_TAURI) {
			setLoading(false);
			return;
		}

		try {
			const [contractData, pluginList] = await Promise.all([
				tauriInvoke<HostPluginContract>("plugin_contract_info"),
				tauriInvoke<PluginManifestSummary[]>("list_plugins"),
			]);
			setContract(contractData);
			setPlugins(pluginList);
		} catch (err) {
			setStatus({
				type: "error",
				message: `Failed to load plugin data: ${err}`,
			});
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchData();
	}, [fetchData]);

	useEffect(() => {
		if (!IS_TAURI) {
			return;
		}

		let cancelled = false;

		const loadDynamicDefinitions = async () => {
			const installedPlugins = displayPlugins.filter(
				(plugin) => plugin.origin === "installed",
			);
			const missingStaticDefinition = installedPlugins.filter(
				(plugin) => !getPluginSettingsDefinition(plugin.id),
			);

			if (missingStaticDefinition.length === 0) {
				setDynamicSettingsDefinitions({});
				setSchemaValidationErrors({});
				return;
			}

			const loaded: Record<string, PluginSettingsDefinition> = {};
			const validationErrors: Record<string, string> = {};
			for (const plugin of missingStaticDefinition) {
				try {
					const schemaJson = await tauriInvoke<string | null>(
						"read_plugin_settings_schema",
						{
							pluginId: plugin.id,
						},
					);
					if (!schemaJson) {
						continue;
					}

					try {
						await tauriInvoke("validate_plugin_settings_schema", {
							pluginId: plugin.id,
						});
					} catch (err) {
						const errorMessage =
							err instanceof Error ? err.message : String(err);
						validationErrors[plugin.id] =
							`Invalid settings schema: ${errorMessage}. Update the plugin package and reinstall.`;
						continue;
					}

					const definition = createPluginSettingsDefinitionFromSchema(
						schemaJson,
						plugin.id,
					);
					if (definition) {
						loaded[plugin.id] = definition;
						continue;
					}
					validationErrors[plugin.id] =
						"Schema could not be rendered by the host UI runtime. Update the plugin package and reinstall.";
				} catch (err) {
					console.warn(
						`Failed to load settings schema for plugin '${plugin.id}':`,
						err,
					);
					const errorMessage = err instanceof Error ? err.message : String(err);
					validationErrors[plugin.id] =
						`Failed to load settings schema: ${errorMessage}`;
				}
			}

			if (cancelled) {
				return;
			}

			setDynamicSettingsDefinitions(loaded);
			setSchemaValidationErrors(validationErrors);
		};

		void loadDynamicDefinitions();

		return () => {
			cancelled = true;
		};
	}, [displayPlugins]);

	// Subscribe to install/uninstall events
	useEffect(() => {
		if (!IS_TAURI) {
			return;
		}

		let disposed = false;
		const cleanups: Array<() => void> = [];

		const registerCleanup = (cleanup: () => void) => {
			if (disposed) {
				cleanup();
				return;
			}
			cleanups.push(cleanup);
		};

		void (async () => {
			try {
				registerCleanup(
					await tauriListen("plugin-installed", () => {
						void fetchData();
					}),
				);
				registerCleanup(
					await tauriListen("plugin-uninstalled", () => {
						void fetchData();
					}),
				);
			} catch (err) {
				if (!disposed) {
					setStatus({
						type: "error",
						message: `Failed to subscribe to plugin events: ${err}`,
					});
				}
			}
		})();

		return () => {
			disposed = true;
			for (const cleanup of cleanups) {
				cleanup();
			}
		};
	}, [fetchData]);

	useEffect(() => {
		if (
			activeInlinePluginId &&
			!displayPlugins.some((plugin) => plugin.id === activeInlinePluginId)
		) {
			setActiveInlinePluginId(null);
		}
		if (
			activeModalPluginId &&
			!displayPlugins.some((plugin) => plugin.id === activeModalPluginId)
		) {
			setActiveModalPluginId(null);
		}
		if (
			aboutPlugin &&
			!displayPlugins.some(
				(plugin) =>
					plugin.id === aboutPlugin.id && plugin.origin === aboutPlugin.origin,
			)
		) {
			setAboutPlugin(null);
		}
		if (
			pendingRemoval &&
			!displayPlugins.some(
				(plugin) =>
					plugin.id === pendingRemoval.id &&
					plugin.origin === pendingRemoval.origin,
			)
		) {
			setPendingRemoval(null);
		}
	}, [
		activeInlinePluginId,
		activeModalPluginId,
		aboutPlugin,
		pendingRemoval,
		displayPlugins,
	]);

	useEffect(() => {
		if (!activeModalPluginId) {
			return;
		}

		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setActiveModalPluginId(null);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [activeModalPluginId]);

	const handleConfigurePlugin = useCallback(
		(pluginId: string) => {
			const definition =
				getPluginSettingsDefinition(pluginId) ??
				dynamicSettingsDefinitions[pluginId];
			if (!definition) {
				return;
			}

			if ((definition.presentation ?? "inline") === "modal") {
				setActiveInlinePluginId(null);
				setActiveModalPluginId(pluginId);
				return;
			}

			setActiveModalPluginId(null);
			setActiveInlinePluginId((current) =>
				current === pluginId ? null : pluginId,
			);
		},
		[dynamicSettingsDefinitions],
	);

	const handleToggleDisabled = useCallback(
		(pluginId: string) => {
			const isCurrentlyDisabled = disabledPluginIds.has(pluginId);
			const nextDisabled = !isCurrentlyDisabled;

			onDisabledPluginsChange((prev) => {
				if (nextDisabled) {
					return prev.includes(pluginId) ? prev : [...prev, pluginId];
				}
				return prev.filter((id) => id !== pluginId);
			});

			if (nextDisabled) {
				setActiveInlinePluginId((current) =>
					current === pluginId ? null : current,
				);
				setActiveModalPluginId((current) =>
					current === pluginId ? null : current,
				);
			}
		},
		[disabledPluginIds, onDisabledPluginsChange],
	);

	const installFromPath = useCallback(async (path: string) => {
		setIsInstalling(true);
		try {
			const manifest = await tauriInvoke<PluginManifestSummary>(
				"install_plugin",
				{
					path,
				},
			);
			setStatus({
				type: "success",
				message: `Installed ${manifest.name} v${manifest.version}`,
			});
		} catch (err) {
			setStatus({ type: "error", message: `Install failed: ${err}` });
		} finally {
			setIsInstalling(false);
		}
	}, []);

	const queueInstallConfirmation = useCallback(async (path: string) => {
		try {
			const manifest = await tauriInvoke<PluginManifestSummary>(
				"inspect_plugin_manifest",
				{
					path,
				},
			);
			setPendingInstall({ path, manifest });
		} catch (err) {
			setPendingInstall(null);
			setStatus({ type: "error", message: `Inspect failed: ${err}` });
		}
	}, []);

	const isDropPositionInZone = useCallback((x: number, y: number) => {
		const zone = dropZoneRef.current;
		if (!zone) {
			return false;
		}

		const rect = zone.getBoundingClientRect();
		const scale = window.devicePixelRatio || 1;
		const cssX = x / scale;
		const cssY = y / scale;

		return (
			cssX >= rect.left &&
			cssX <= rect.right &&
			cssY >= rect.top &&
			cssY <= rect.bottom
		);
	}, []);

	// Subscribe to Tauri window-level drag-drop events
	useEffect(() => {
		if (!IS_TAURI) {
			return;
		}

		let disposed = false;
		let unlistenFn: (() => void) | null = null;

		void (async () => {
			try {
				const { getCurrentWebviewWindow } = await import(
					"@tauri-apps/api/webviewWindow"
				);
				const unlisten = await getCurrentWebviewWindow().onDragDropEvent(
					(event) => {
						if (disposed) return;

						const { type } = event.payload;
						if (type === "over" || type === "enter") {
							setIsDragActive(
								isDropPositionInZone(
									event.payload.position.x,
									event.payload.position.y,
								),
							);
						} else if (type === "leave") {
							setIsDragActive(false);
						} else if (type === "drop") {
							const droppedInZone = isDropPositionInZone(
								event.payload.position.x,
								event.payload.position.y,
							);
							setIsDragActive(false);

							if (!droppedInZone) {
								return;
							}

							setStatus(null);

							const paths = event.payload.paths;
							const path = paths?.[0];
							if (!path) return;

							if (!path.toLowerCase().endsWith(".plugin")) {
								setStatus({
									type: "error",
									message: "Only .plugin archives can be installed.",
								});
								return;
							}

							void queueInstallConfirmation(path);
						}
					},
				);

				if (disposed) {
					unlisten();
				} else {
					unlistenFn = unlisten;
				}
			} catch (err) {
				if (!disposed) {
					console.warn("Failed to register drag-drop listener:", err);
				}
			}
		})();

		return () => {
			disposed = true;
			unlistenFn?.();
		};
	}, [isDropPositionInZone, queueInstallConfirmation]);

	const handleInstall = async () => {
		setStatus(null);

		if (!IS_TAURI) {
			setStatus({
				type: "info",
				message:
					"Plugin install is only available in the Tauri desktop runtime.",
			});
			return;
		}

		let selectedPath: string | null = null;
		try {
			selectedPath = await pickPluginFilePathWithInput();
		} catch (err) {
			setStatus({ type: "error", message: `Install failed: ${err}` });
			return;
		}

		if (!selectedPath) {
			return;
		}

		await queueInstallConfirmation(selectedPath);
	};

	const handleConfirmInstall = async () => {
		if (!pendingInstall) {
			return;
		}
		const { path } = pendingInstall;
		setPendingInstall(null);
		await installFromPath(path);
	};

	const handleCancelInstall = () => {
		setPendingInstall(null);
	};

	const handleUninstall = async (pluginId: string, pluginName: string) => {
		setStatus(null);
		try {
			await tauriInvoke("uninstall_plugin", { pluginId });
			onDisabledPluginsChange((prev) => prev.filter((id) => id !== pluginId));
			onPluginSettingsChange((prev) => {
				if (!(pluginId in prev)) {
					return prev;
				}
				const next = { ...prev };
				delete next[pluginId];
				return next;
			});
			setStatus({
				type: "success",
				message: `Removed ${pluginName} (${pluginId})`,
			});
		} catch (err) {
			setStatus({
				type: "error",
				message: `Uninstall failed: ${err}`,
			});
		}
	};

	const handleConfirmRemoval = async () => {
		if (!pendingRemoval) {
			return;
		}
		const plugin = pendingRemoval;
		setPendingRemoval(null);
		await handleUninstall(plugin.id, plugin.name);
	};

	const showPluginAbout = (plugin: PluginManifestEntry) => {
		setAboutPlugin(plugin);
	};

	const statusIcon = {
		success: <Check size={14} />,
		error: <AlertCircle size={14} />,
		info: <Info size={14} />,
	};

	const statusColors = {
		success: "bg-success/10 border-success/30 text-success",
		error: "bg-destructive/10 border-destructive/30 text-destructive",
		info: "bg-accent/10 border-accent/30 text-accent",
	};

	const configureModalStyle = useMemo(() => {
		if (!hostModalSize) {
			return undefined;
		}

		// Keep configure modal clearly smaller than host settings modal,
		// while still adapting to resizes and staying viewport-safe.
		const parentWidth = Math.max(360, hostModalSize.width - 48);
		const parentHeight = Math.max(280, hostModalSize.height - 48);
		const maxWidth = Math.max(420, Math.floor(parentWidth * 0.82));
		const maxHeight = Math.max(320, Math.floor(parentHeight * 0.86));

		return {
			maxWidth: `min(calc(100vw - 2rem), ${maxWidth}px)`,
			maxHeight: `min(calc(100vh - 2rem), ${maxHeight}px)`,
		};
	}, [hostModalSize]);

	const aboutField = (value?: string) =>
		value && value.trim().length > 0 ? value : "Not provided";

	return (
		<div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-[var(--ui-motion-duration-slow)]">
			<div>
				<div className="flex items-center justify-between">
					<div>
						<h4 className="text-xl font-bold text-foreground mb-1">Plugins</h4>
						<p className="text-sm text-foreground-muted">
							{isDev
								? "Manage plugins and inspect host contract capabilities."
								: "Manage installed plugins."}
						</p>
					</div>
					{isDev && (
						<span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/20">
							Dev Mode
						</span>
					)}
				</div>
			</div>

			{/* Status Banner */}
			{status && (
				<div
					className={`flex items-start gap-2 px-4 py-3 rounded-xl border text-xs font-medium ${statusColors[status.type]}`}
				>
					<span className="mt-0.5 flex-none">{statusIcon[status.type]}</span>
					<span className="break-all">{status.message}</span>
					<button
						type="button"
						onClick={() => setStatus(null)}
						className="ml-auto flex-none opacity-60 hover:opacity-100 cursor-pointer transition-opacity"
					>
						×
					</button>
				</div>
			)}

			{/* Host Contract Info */}
			{isDev && contract && (
				<SettingGroup title="Host Contract" icon={<Shield size={12} />}>
					<div className="px-4 py-3 space-y-3">
						<div className="grid grid-cols-3 gap-4 text-xs">
							<ContractField
								label="Schema Version"
								value={contract.manifest_schema_version}
							/>
							<ContractField
								label="Plugin API"
								value={contract.plugin_api_version}
							/>
							<ContractField
								label="Theme Contract"
								value={contract.theme_contract_version}
							/>
						</div>
						<div className="pt-2 border-t border-glass-border-base space-y-2">
							<TagRow label="Backends" items={contract.supported_backends} />
							<TagRow label="Slots" items={contract.supported_slots} />
							<TagRow
								label="Permissions"
								items={contract.supported_permissions}
							/>
						</div>
					</div>
				</SettingGroup>
			)}

			{/* Installed Plugins */}
			<SettingGroup title="Installed Plugins" icon={<Puzzle size={12} />}>
				<div className="px-4 py-3">
					{loading ? (
						<p className="text-xs text-foreground-muted py-6 text-center">
							Loading…
						</p>
					) : displayPlugins.length === 0 ? (
						<div className="py-8 flex flex-col items-center gap-2">
							<Puzzle size={24} className="text-foreground-muted opacity-30" />
							<p className="text-xs text-foreground-muted">
								No plugins installed
							</p>
							<p className="text-[11px] text-foreground-subtle">
								Install a <code className="font-mono">.plugin</code> file with
								the button below.
							</p>
						</div>
					) : (
						<div className="space-y-2">
							{displayPlugins.map((plugin) => {
								const isDisabled = disabledPluginIds.has(plugin.id);
								const settingsDefinition =
									getPluginSettingsDefinition(plugin.id) ??
									dynamicSettingsDefinitions[plugin.id];
								const schemaValidationError =
									plugin.origin === "installed" &&
									!getPluginSettingsDefinition(plugin.id)
										? schemaValidationErrors[plugin.id]
										: undefined;
								const settingsPresentation =
									settingsDefinition?.presentation ?? "inline";
								const hasSettings = settingsDefinition !== undefined;
								const showInlineSettings =
									!isDisabled &&
									hasSettings &&
									settingsPresentation === "inline" &&
									activeInlinePluginId === plugin.id;
								const pluginSettingsValue =
									hasSettings && settingsDefinition
										? (pluginSettings[plugin.id] ??
											settingsDefinition.createDefaultValue())
										: undefined;

								return (
									<div
										key={`${plugin.origin}-${plugin.id}`}
										className={[
											"rounded-xl border group transition-colors",
											isDisabled
												? "bg-transparent border-glass-border-subtle"
												: "bg-glass-bg-subtle border-glass-border-base hover:border-glass-border-strong",
										].join(" ")}
									>
										<div className="flex items-center justify-between px-3 py-2.5">
											<div className="flex items-center gap-2.5 min-w-0">
												<ToggleSwitch
													checked={!isDisabled}
													onChange={() => handleToggleDisabled(plugin.id)}
													title={
														isDisabled
															? `Enable ${plugin.name}`
															: `Disable ${plugin.name}`
													}
												/>
												<div
													className={[
														"min-w-0 transition-opacity",
														isDisabled ? "opacity-35" : "",
													].join(" ")}
												>
													<div className="flex items-center gap-2">
														<span className="text-xs font-semibold text-foreground truncate">
															{plugin.name}
														</span>
														<span className="text-[10px] text-foreground-muted font-mono">
															v{plugin.version}
														</span>
													</div>
													<div className="flex items-center gap-2 mt-0.5">
														<span className="text-[10px] text-foreground-subtle font-mono">
															{plugin.id}
														</span>
														<span className="text-[10px] px-1.5 py-0 rounded bg-glass-bg-hover text-foreground-muted">
															{plugin.backend}
														</span>
														{plugin.origin === "builtin" && (
															<span className="text-[10px] px-1.5 py-0 rounded border border-accent/20 bg-accent/10 text-accent">
																built-in
															</span>
														)}
													</div>
													{schemaValidationError && (
														<div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-[10px] text-destructive flex items-start gap-1.5">
															<AlertCircle
																size={12}
																className="mt-0.5 flex-none"
															/>
															<span className="break-words">
																{schemaValidationError}
															</span>
														</div>
													)}
												</div>
											</div>
											<div
												className={[
													"flex items-center gap-1",
													isDisabled ? "opacity-50" : "",
												].join(" ")}
											>
												<button
													type="button"
													onClick={() => showPluginAbout(plugin)}
													className="px-2 py-1 text-[10px] rounded-lg border border-glass-border-base text-foreground-muted hover:text-foreground hover:bg-glass-bg-hover cursor-pointer transition-colors"
													title="Plugin information"
												>
													About
												</button>

												{hasSettings && !isDisabled && (
													<button
														type="button"
														onClick={() => handleConfigurePlugin(plugin.id)}
														className="px-2 py-1 text-[10px] rounded-lg border border-glass-border-base text-foreground-muted hover:text-foreground hover:bg-glass-bg-hover cursor-pointer transition-colors"
														title="Configure plugin settings"
													>
														{showInlineSettings ? "Hide" : "Configure"}
													</button>
												)}
												{plugin.origin === "installed" && (
													<button
														type="button"
														onClick={() => setPendingRemoval(plugin)}
														className="px-2 py-1 text-[10px] rounded-lg border border-glass-border-base text-foreground-muted hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 cursor-pointer transition-colors"
														title={`Remove ${plugin.name}`}
													>
														Remove
													</button>
												)}
											</div>
										</div>

										{showInlineSettings &&
											settingsDefinition &&
											pluginSettingsValue !== undefined && (
												<div className="px-3 pb-3 pt-2 border-t border-glass-border-base space-y-3">
													<div>
														<p className="text-xs font-semibold text-foreground">
															{settingsDefinition.title ??
																`${plugin.name} Settings`}
														</p>
														{settingsDefinition.description && (
															<p className="text-[11px] text-foreground-muted mt-0.5">
																{settingsDefinition.description}
															</p>
														)}
													</div>
													{settingsDefinition.render({
														manifest: plugin,
														value: pluginSettingsValue,
														onChange: (next) => {
															onPluginSettingsChange((prev) => ({
																...prev,
																[plugin.id]: next,
															}));
														},
													})}
												</div>
											)}
									</div>
								);
							})}
						</div>
					)}

					<div className="mt-4 pt-3 border-t border-glass-border-base">
						{pendingInstall && (
							<div className="mb-3 rounded-xl border border-accent/30 bg-accent/5 px-3 py-3 space-y-3">
								<div>
									<p className="text-xs font-semibold text-foreground">
										Confirm Plugin Install
									</p>
									<p className="text-[11px] text-foreground-muted break-all">
										{pendingInstall.path}
									</p>
								</div>
								<div className="grid grid-cols-2 gap-2 text-[11px]">
									<div>
										<span className="text-foreground-subtle">Name</span>
										<p className="text-foreground font-medium">
											{pendingInstall.manifest.name}
										</p>
									</div>
									<div>
										<span className="text-foreground-subtle">Version</span>
										<p className="text-foreground font-mono">
											{pendingInstall.manifest.version}
										</p>
									</div>
									<div>
										<span className="text-foreground-subtle">ID</span>
										<p className="text-foreground font-mono break-all">
											{pendingInstall.manifest.id}
										</p>
									</div>
									<div>
										<span className="text-foreground-subtle">Backend</span>
										<p className="text-foreground font-mono">
											{pendingInstall.manifest.backend}
										</p>
									</div>
								</div>
								<div>
									<p className="text-[10px] uppercase tracking-wider text-foreground-subtle mb-1">
										Permissions
									</p>
									<div className="flex flex-wrap gap-1">
										{pendingInstall.manifest.permissions.length === 0 ? (
											<span className="text-[10px] px-2 py-0.5 rounded-full bg-glass-bg-hover text-foreground-muted border border-glass-border-base font-mono">
												none
											</span>
										) : (
											pendingInstall.manifest.permissions.map((permission) => (
												<span
													key={permission}
													className="text-[10px] px-2 py-0.5 rounded-full bg-glass-bg-hover text-foreground-muted border border-glass-border-base font-mono"
												>
													{permission}
												</span>
											))
										)}
									</div>
								</div>
								<div className="flex items-center gap-2">
									<Button
										variant="primary"
										className="text-xs h-8 px-4"
										onClick={() => {
											void handleConfirmInstall();
										}}
										disabled={isInstalling}
									>
										{isInstalling ? "Installing…" : "Confirm Install"}
									</Button>
									<Button
										variant="ghost"
										className="text-xs h-8 px-3"
										onClick={handleCancelInstall}
										disabled={isInstalling}
									>
										Cancel
									</Button>
								</div>
							</div>
						)}

						<div
							ref={dropZoneRef}
							className={`mb-3 rounded-xl border border-dashed px-3 py-4 text-center transition-colors ${
								isDragActive
									? "border-accent bg-accent/10"
									: "border-glass-border-base bg-glass-bg-subtle"
							}`}
						>
							<p className="text-xs text-foreground-muted">
								{isDragActive ? (
									"Drop to install"
								) : (
									<>
										Drag and drop a{" "}
										<code className="font-mono text-[11px]">.plugin</code> file
										here
									</>
								)}
							</p>
						</div>
						<Button
							variant="secondary"
							className="text-xs h-8 px-4"
							onClick={handleInstall}
							disabled={!IS_TAURI || isInstalling}
						>
							<Download size={14} className="mr-2" />
							{isInstalling ? "Installing…" : "Install Plugin…"}
						</Button>
					</div>
				</div>
			</SettingGroup>

			{modalPortalTarget &&
				activeModalManifest &&
				activeModalDefinition &&
				activeModalValue !== undefined &&
				createPortal(
					<div className="fixed inset-0 z-[var(--ui-layer-modal)] flex items-center justify-center p-4">
						<button
							type="button"
							className="absolute inset-0 w-full h-full bg-overlay-dim backdrop-blur-sm"
							onClick={() => setActiveModalPluginId(null)}
							aria-label="Close settings modal"
						/>
						<div
							role="dialog"
							aria-modal="true"
							className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-glass-border-strong bg-background-elevated shadow-xl p-4 sm:p-5"
							style={configureModalStyle}
						>
							<div className="flex items-start justify-between gap-4 mb-4">
								<div className="min-w-0">
									<h5 className="text-sm font-semibold text-foreground">
										{activeModalDefinition.title ??
											`${activeModalManifest.name} Settings`}
									</h5>
									{activeModalDefinition.description && (
										<p className="text-[11px] text-foreground-muted mt-0.5">
											{activeModalDefinition.description}
										</p>
									)}
									<p className="text-[10px] text-foreground-subtle font-mono mt-1 break-all">
										{activeModalManifest.id}
									</p>
								</div>
								<button
									type="button"
									onClick={() => setActiveModalPluginId(null)}
									className="px-2 py-1 text-[10px] rounded-lg border border-glass-border-base text-foreground-muted hover:text-foreground hover:bg-glass-bg-hover cursor-pointer transition-colors"
								>
									Close
								</button>
							</div>
							{activeModalDefinition.render({
								manifest: activeModalManifest,
								value: activeModalValue,
								onChange: (next) => {
									const pluginId = activeModalManifest.id;
									onPluginSettingsChange((prev) => ({
										...prev,
										[pluginId]: next,
									}));
								},
							})}
						</div>
					</div>,
					modalPortalTarget,
				)}

			{modalPortalTarget &&
				aboutPlugin &&
				createPortal(
					<div className="fixed inset-0 z-[var(--ui-layer-modal)] flex items-center justify-center p-4">
						<button
							type="button"
							className="absolute inset-0 w-full h-full bg-overlay-dim backdrop-blur-sm"
							onClick={() => setAboutPlugin(null)}
							aria-label="Close plugin info modal"
						/>
						<div
							role="dialog"
							aria-modal="true"
							className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-glass-border-strong bg-background-elevated shadow-xl p-4 sm:p-5"
						>
							<div className="flex items-start justify-between gap-4 mb-4">
								<div className="min-w-0">
									<h5 className="text-sm font-semibold text-foreground">
										{aboutPlugin.name}
									</h5>
									<p className="text-[10px] text-foreground-subtle font-mono mt-1 break-all">
										{aboutPlugin.id} · v{aboutPlugin.version}
									</p>
								</div>
								<button
									type="button"
									onClick={() => setAboutPlugin(null)}
									className="px-2 py-1 text-[10px] rounded-lg border border-glass-border-base text-foreground-muted hover:text-foreground hover:bg-glass-bg-hover cursor-pointer transition-colors"
								>
									Close
								</button>
							</div>

							<div className="space-y-3">
								<AboutField
									label="Description"
									value={aboutField(aboutPlugin.description)}
								/>
								<AboutField
									label="Author"
									value={aboutField(aboutPlugin.author)}
								/>
								<div>
									<p className="text-[10px] uppercase tracking-wider text-foreground-subtle font-bold mb-1">
										Source
									</p>
									{aboutPlugin.source_url ? (
										<a
											href={aboutPlugin.source_url}
											target="_blank"
											rel="noreferrer noopener"
											className="text-xs text-accent hover:underline break-all"
										>
											{aboutPlugin.source_url}
										</a>
									) : (
										<p className="text-xs text-foreground-muted">
											Not provided
										</p>
									)}
								</div>
								<div>
									<p className="text-[10px] uppercase tracking-wider text-foreground-subtle font-bold mb-1">
										Docs
									</p>
									{aboutPlugin.docs_url ? (
										<a
											href={aboutPlugin.docs_url}
											target="_blank"
											rel="noreferrer noopener"
											className="text-xs text-accent hover:underline break-all"
										>
											{aboutPlugin.docs_url}
										</a>
									) : (
										<p className="text-xs text-foreground-muted">
											Not provided
										</p>
									)}
								</div>
								<AboutField
									label="How To Use"
									value={aboutField(aboutPlugin.usage)}
									className="whitespace-pre-wrap"
								/>
								<div>
									<p className="text-[10px] uppercase tracking-wider text-foreground-subtle font-bold mb-1">
										Backend
									</p>
									<p className="text-xs text-foreground-muted font-mono">
										{aboutPlugin.backend}
									</p>
								</div>
								<div>
									<p className="text-[10px] uppercase tracking-wider text-foreground-subtle font-bold mb-1">
										Slots
									</p>
									<div className="flex flex-wrap gap-1">
										{aboutPlugin.slots.length > 0 ? (
											aboutPlugin.slots.map((slot) => (
												<span
													key={slot}
													className="text-[10px] px-2 py-0.5 rounded-full bg-glass-bg-hover text-foreground-muted border border-glass-border-base font-mono"
												>
													{slot}
												</span>
											))
										) : (
											<p className="text-xs text-foreground-muted">None</p>
										)}
									</div>
								</div>
								<div>
									<p className="text-[10px] uppercase tracking-wider text-foreground-subtle font-bold mb-1">
										Permissions
									</p>
									<div className="flex flex-wrap gap-1">
										{aboutPlugin.permissions.length > 0 ? (
											aboutPlugin.permissions.map((permission) => (
												<span
													key={permission}
													className="text-[10px] px-2 py-0.5 rounded-full bg-glass-bg-hover text-foreground-muted border border-glass-border-base font-mono"
												>
													{permission}
												</span>
											))
										) : (
											<p className="text-xs text-foreground-muted">None</p>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>,
					modalPortalTarget,
				)}

			{!IS_TAURI && (
				<div className="flex items-start gap-2 px-4 py-3 rounded-xl border border-accent/20 bg-accent/5 text-xs text-accent">
					<Info size={14} className="mt-0.5 flex-none" />
					<span>
						Running in browser mode — plugin operations require the Tauri
						runtime. Use{" "}
						<code className="font-mono text-[10px]">pnpm tauri dev</code> for
						full functionality.
					</span>
				</div>
			)}

			{modalPortalTarget &&
				createPortal(
					<ConfirmDialog
						isOpen={pendingRemoval !== null}
						onClose={() => setPendingRemoval(null)}
						onConfirm={() => {
							void handleConfirmRemoval();
						}}
						title="Remove Plugin?"
						description={
							pendingRemoval
								? `This will uninstall '${pendingRemoval.name}' (${pendingRemoval.id}) from this device.`
								: ""
						}
						confirmText="Remove"
						cancelText="Cancel"
						isDestructive
					/>,
					modalPortalTarget,
				)}
		</div>
	);
};

const AboutField: React.FC<{
	label: string;
	value: string;
	className?: string;
}> = ({ label, value, className }) => (
	<div>
		<p className="text-[10px] uppercase tracking-wider text-foreground-subtle font-bold mb-1">
			{label}
		</p>
		<p className={`text-xs text-foreground-muted ${className ?? ""}`}>
			{value}
		</p>
	</div>
);

const ContractField: React.FC<{ label: string; value: string }> = ({
	label,
	value,
}) => (
	<div>
		<span className="text-[10px] text-foreground-muted uppercase tracking-wider font-bold block mb-0.5">
			{label}
		</span>
		<span className="text-foreground font-mono text-xs">{value}</span>
	</div>
);

const TagRow: React.FC<{ label: string; items: string[] }> = ({
	label,
	items,
}) => (
	<div className="flex items-start gap-3">
		<span className="text-[10px] text-foreground-muted uppercase tracking-wider font-bold w-20 flex-none pt-0.5">
			{label}
		</span>
		<div className="flex flex-wrap gap-1">
			{items.map((item) => (
				<span
					key={item}
					className="text-[10px] px-2 py-0.5 rounded-full bg-glass-bg-hover text-foreground-muted border border-glass-border-base font-mono"
				>
					{item}
				</span>
			))}
		</div>
	</div>
);

const ToggleSwitch: React.FC<{
	checked: boolean;
	onChange: () => void;
	title?: string;
}> = ({ checked, onChange, title }) => (
	<button
		type="button"
		role="switch"
		aria-checked={checked}
		onClick={onChange}
		title={title}
		className={[
			"relative inline-flex h-[18px] w-[32px] flex-none items-center rounded-full cursor-pointer transition-colors duration-(--ui-motion-duration-standard)",
			checked
				? "bg-accent hover:bg-accent-bright"
				: "bg-foreground-subtle/20 hover:bg-foreground-subtle/30",
		].join(" ")}
	>
		<span
			className={[
				"inline-block h-[14px] w-[14px] rounded-full shadow-sm transition-transform duration-(--ui-motion-duration-standard)",
				checked
					? "translate-x-[16px] bg-foreground"
					: "translate-x-[2px] bg-foreground-muted",
			].join(" ")}
		/>
	</button>
);
