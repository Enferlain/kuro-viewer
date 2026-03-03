import {
	AlertCircle,
	Check,
	Download,
	Info,
	Puzzle,
	Shield,
	Trash2,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../../ui/Button";
import { SettingGroup } from "../ui/SettingGroup";

interface HostPluginContract {
	manifest_schema_version: string;
	plugin_api_version: string;
	theme_contract_version: string;
	supported_backends: string[];
	supported_slots: string[];
	supported_permissions: string[];
}

interface PluginManifest {
	id: string;
	name: string;
	version: string;
	description?: string;
	backend: string;
	slots: string[];
	permissions: string[];
}

type StatusBanner = {
	type: "success" | "error" | "info";
	message: string;
};

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

export const PluginsTab: React.FC = () => {
	const [contract, setContract] = useState<HostPluginContract | null>(null);
	const [plugins, setPlugins] = useState<PluginManifest[]>([]);
	const [status, setStatus] = useState<StatusBanner | null>(null);
	const [loading, setLoading] = useState(true);
	const [isDragActive, setIsDragActive] = useState(false);
	const [isInstalling, setIsInstalling] = useState(false);
	const dropZoneRef = useRef<HTMLDivElement | null>(null);

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
				tauriInvoke<PluginManifest[]>("list_plugins"),
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

	const installFromPath = useCallback(async (path: string) => {
		setIsInstalling(true);
		try {
			const manifest = await tauriInvoke<PluginManifest>("install_plugin", {
				path,
			});
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

							void installFromPath(path);
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
	}, [installFromPath, isDropPositionInZone]);

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

		await installFromPath(selectedPath);
	};

	const handleUninstall = async (pluginId: string) => {
		setStatus(null);
		try {
			await tauriInvoke("uninstall_plugin", { pluginId });
			setStatus({
				type: "success",
				message: `Uninstalled '${pluginId}'`,
			});
		} catch (err) {
			setStatus({
				type: "error",
				message: `Uninstall failed: ${err}`,
			});
		}
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
					) : plugins.length === 0 ? (
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
							{plugins.map((plugin) => (
								<div
									key={plugin.id}
									className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-glass-bg-subtle border border-glass-border-base group hover:border-glass-border-strong transition-colors"
								>
									<div className="min-w-0">
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
										</div>
									</div>
									<button
										type="button"
										onClick={() => handleUninstall(plugin.id)}
										className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-foreground-muted hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-all duration-[var(--ui-motion-duration-standard)]"
										title={`Uninstall ${plugin.name}`}
									>
										<Trash2 size={14} />
									</button>
								</div>
							))}
						</div>
					)}

					<div className="mt-4 pt-3 border-t border-glass-border-base">
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
		</div>
	);
};

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
