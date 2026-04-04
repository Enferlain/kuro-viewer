import {
	AlertCircle,
	CheckCircle2,
	ChevronDown,
	Code2,
	FileCode,
	FolderOpen,
	FolderPlus,
	Plus,
	RefreshCw,
	TriangleAlert,
} from "lucide-react";
import type React from "react";
import { useRef, useState } from "react";
import { Button } from "../../ui/Button";
import type { DevLogEntry, WorkspacePluginRecord } from "../types";

const IS_TAURI = "__TAURI_INTERNALS__" in window;

type WorkspacePluginTemplate =
	| "blank"
	| "panel-first"
	| "toolbar-first"
	| "python-backed";

type CreateWorkspacePluginScaffoldResult = {
	pluginId: string;
	directoryPath: string;
	manifestPath: string;
	settingsSchemaPath: string;
	sourceEntryPath: string;
	backendEntryPath: string | null;
	readmePath: string | null;
};

type OpenWorkspacePathResult = {
	openedPath: string;
	method: string;
};

const TEMPLATE_OPTIONS: Array<{
	id: WorkspacePluginTemplate;
	label: string;
	description: string;
}> = [
	{
		id: "panel-first",
		label: "Panel",
		description: "Starts with a panel slot and host-rendered settings.",
	},
	{
		id: "toolbar-first",
		label: "Toolbar",
		description: "Starts with a toolbar slot and quick surface controls.",
	},
	{
		id: "python-backed",
		label: "Python",
		description: "Adds a `python/` stub for subprocess-backed plugin work.",
	},
	{
		id: "blank",
		label: "Blank",
		description: "Minimal manifest, schema, and source placeholders.",
	},
];

const STATUS_ICONS: Record<WorkspacePluginRecord["status"], React.ReactNode> = {
	ready: <CheckCircle2 size={16} className="text-status-success" />,
	warning: <TriangleAlert size={16} className="text-status-warning" />,
	error: <AlertCircle size={16} className="text-destructive" />,
};

function slugifyPluginId(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/-{2,}/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 64);
}

async function tauriInvoke<T>(
	command: string,
	args?: Record<string, unknown>,
): Promise<T> {
	const { invoke } = await import("@tauri-apps/api/core");
	return invoke<T>(command, args);
}

export function PluginsTab({
	plugins,
	summary,
	onReload,
	onLog,
}: {
	plugins: WorkspacePluginRecord[];
	summary: {
		total: number;
		ready: number;
		warnings: number;
		errors: number;
	};
	onReload: (pluginId?: string) => Promise<void>;
	onLog: (entry: Omit<DevLogEntry, "id" | "time">) => void;
}) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [reloadingId, setReloadingId] = useState<string | null>(null);
	const [actionPluginId, setActionPluginId] = useState<string | null>(null);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);
	const [isCreating, setIsCreating] = useState(false);
	const [draftName, setDraftName] = useState("");
	const [draftId, setDraftId] = useState("");
	const [draftIdTouched, setDraftIdTouched] = useState(false);
	const [draftTemplate, setDraftTemplate] =
		useState<WorkspacePluginTemplate>("panel-first");
	const [includeReadme, setIncludeReadme] = useState(true);
	const [formError, setFormError] = useState<string | null>(null);

	const handleReload = async (id?: string) => {
		setReloadingId(id ?? "__all__");
		try {
			await onReload(id);
		} finally {
			setReloadingId(null);
		}
	};

	const handleCreateToggle = () => {
		setFormError(null);
		setIsCreateOpen((current) => {
			if (!current) {
				scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
			}
			return !current;
		});
	};

	const handleNameChange = (value: string) => {
		setDraftName(value);
		if (!draftIdTouched) {
			setDraftId(slugifyPluginId(value));
		}
	};

	const handleCreate = async () => {
		setFormError(null);

		if (!IS_TAURI) {
			setFormError(
				"Workspace scaffold creation is only available in the Tauri desktop runtime.",
			);
			return;
		}

		if (draftName.trim().length === 0) {
			setFormError("Plugin name is required.");
			return;
		}
		if (draftId.trim().length === 0) {
			setFormError("Plugin id is required.");
			return;
		}

		setIsCreating(true);
		try {
			const result = await tauriInvoke<CreateWorkspacePluginScaffoldResult>(
				"create_workspace_plugin_scaffold",
				{
					request: {
						pluginId: draftId.trim(),
						name: draftName.trim(),
						template: draftTemplate,
						includeReadme,
					},
				},
			);

			onLog({
				type: "success",
				message: `Created workspace plugin '${result.pluginId}' at ${result.directoryPath}.`,
			});
			await onReload(result.pluginId);
			setIsCreateOpen(false);
			setDraftName("");
			setDraftId("");
			setDraftIdTouched(false);
			setDraftTemplate("panel-first");
			setIncludeReadme(true);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			setFormError(message);
			onLog({
				type: "error",
				message: `Scaffold creation failed: ${message}`,
			});
		} finally {
			setIsCreating(false);
		}
	};

	const handleOpenFolder = async (plugin: WorkspacePluginRecord) => {
		if (!IS_TAURI) {
			onLog({
				type: "info",
				message: `Workspace folder: plugins/${plugin.directory}`,
			});
			return;
		}

		setActionPluginId(`folder:${plugin.directory}`);
		try {
			const result = await tauriInvoke<OpenWorkspacePathResult>(
				"open_workspace_plugin_folder",
				{
					workspaceDirectory: plugin.directory,
				},
			);
			onLog({
				type: "success",
				message: `Opened workspace folder via ${result.method}: ${result.openedPath}`,
			});
		} catch (error) {
			onLog({
				type: "error",
				message: `Failed to open folder for '${plugin.id}': ${error instanceof Error ? error.message : String(error)}`,
			});
		} finally {
			setActionPluginId(null);
		}
	};

	const handleOpenSource = async (plugin: WorkspacePluginRecord) => {
		if (!plugin.sourceEntryPath) {
			onLog({
				type: "info",
				message: `No source entry exists yet for '${plugin.id}'.`,
			});
			return;
		}

		if (!IS_TAURI) {
			onLog({
				type: "info",
				message: `Source entry: ${plugin.sourceEntryPath}`,
			});
			return;
		}

		setActionPluginId(`source:${plugin.directory}`);
		try {
			const result = await tauriInvoke<OpenWorkspacePathResult>(
				"open_workspace_plugin_source",
				{
					workspaceDirectory: plugin.directory,
				},
			);
			onLog({
				type: "success",
				message: `Opened workspace source via ${result.method}: ${result.openedPath}`,
			});
		} catch (error) {
			onLog({
				type: "error",
				message: `Failed to open source for '${plugin.id}': ${error instanceof Error ? error.message : String(error)}`,
			});
		} finally {
			setActionPluginId(null);
		}
	};

	const handleOpenManifest = async (plugin: WorkspacePluginRecord) => {
		if (!IS_TAURI) {
			onLog({
				type: "info",
				message: `Manifest path: ${plugin.manifestPath}`,
			});
			return;
		}

		setActionPluginId(`manifest:${plugin.directory}`);
		try {
			const result = await tauriInvoke<OpenWorkspacePathResult>(
				"open_workspace_plugin_manifest",
				{
					workspaceDirectory: plugin.directory,
				},
			);
			onLog({
				type: "success",
				message: `Opened workspace manifest via ${result.method}: ${result.openedPath}`,
			});
		} catch (error) {
			onLog({
				type: "error",
				message: `Failed to open manifest for '${plugin.id}': ${error instanceof Error ? error.message : String(error)}`,
			});
		} finally {
			setActionPluginId(null);
		}
	};

	return (
		<div className="flex h-full flex-col">
			<div className="flex items-start justify-between border-b border-glass-border-base bg-transparent p-4">
				<div>
					<h2 className="text-sm font-semibold">Workspace Plugins</h2>
					<p className="mt-1 text-xs text-foreground-muted">
						Scanned directly from{" "}
						<code className="font-mono">plugins/*/plugin.json</code>
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="secondary"
						disabled
						onClick={() => undefined}
						className="h-8 gap-1.5 px-3 text-xs"
						title="Automatic discovery is the only supported workspace registration path for now."
					>
						<FolderPlus size={14} />
						Register
					</Button>
					<Button
						variant="secondary"
						onClick={handleCreateToggle}
						active={isCreateOpen}
						className="h-8 gap-1.5 px-3 text-xs"
					>
						<Plus size={14} />
						Create
					</Button>
				</div>
			</div>

			<div
				ref={scrollRef}
				className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4"
			>
				{isCreateOpen && (
					<div className="rounded-2xl border border-accent/20 bg-accent/8 p-4 shadow-glow/30">
						<div className="flex items-start justify-between gap-4">
							<div>
								<h3 className="text-sm font-semibold text-foreground">
									Create Workspace Plugin
								</h3>
								<p className="mt-1 text-xs text-foreground-muted">
									Generates a minimal workspace scaffold directly under{" "}
									<code className="font-mono">plugins/</code>.
								</p>
							</div>
							<Button
								variant="ghost"
								onClick={() => setIsCreateOpen(false)}
								className="h-7 px-2 text-xs"
							>
								Close
							</Button>
						</div>

						<div className="mt-4 grid gap-3">
							<label className="grid gap-1.5">
								<span className="text-[10px] uppercase tracking-wider text-foreground-subtle">
									Plugin Name
								</span>
								<input
									type="text"
									value={draftName}
									onChange={(event) => handleNameChange(event.target.value)}
									placeholder="Forensics Notes"
									className="rounded-xl border border-glass-border-base bg-background-deep px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-foreground-subtle focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
								/>
							</label>

							<label className="grid gap-1.5">
								<span className="text-[10px] uppercase tracking-wider text-foreground-subtle">
									Plugin Id
								</span>
								<input
									type="text"
									value={draftId}
									onChange={(event) => {
										setDraftIdTouched(true);
										setDraftId(event.target.value.toLowerCase());
									}}
									placeholder="forensics-notes"
									className="rounded-xl border border-glass-border-base bg-background-deep px-3 py-2 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-foreground-subtle focus:border-accent/40 focus:ring-2 focus:ring-accent/20"
								/>
							</label>

							<div className="grid gap-1.5">
								<span className="text-[10px] uppercase tracking-wider text-foreground-subtle">
									Starter Shape
								</span>
								<div className="grid grid-cols-2 gap-2">
									{TEMPLATE_OPTIONS.map((template) => (
										<button
											type="button"
											key={template.id}
											onClick={() => setDraftTemplate(template.id)}
											className={`rounded-xl border px-3 py-2 text-left transition-colors ${
												draftTemplate === template.id
													? "border-accent/40 bg-accent/12 text-foreground"
													: "border-glass-border-base bg-glass-bg-base text-foreground-muted hover:border-glass-border-hover hover:text-foreground"
											}`}
										>
											<p className="text-sm font-medium">{template.label}</p>
											<p className="mt-1 text-xs leading-relaxed">
												{template.description}
											</p>
										</button>
									))}
								</div>
							</div>

							<label className="flex cursor-pointer items-center gap-3 rounded-xl border border-glass-border-base bg-glass-bg-base px-3 py-2">
								<input
									type="checkbox"
									checked={includeReadme}
									onChange={(event) => setIncludeReadme(event.target.checked)}
									className="h-4 w-4 accent-accent"
								/>
								<span className="text-sm text-foreground">
									Include starter <code className="font-mono">README.md</code>
								</span>
							</label>

							{formError && (
								<p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs text-destructive">
									{formError}
								</p>
							)}

							<div className="flex items-center justify-end gap-2">
								<Button
									variant="ghost"
									onClick={() => setIsCreateOpen(false)}
									className="h-8 px-3 text-xs"
								>
									Cancel
								</Button>
								<Button
									variant="secondary"
									onClick={() => void handleCreate()}
									disabled={isCreating}
									className="h-8 gap-1.5 px-3 text-xs"
								>
									<Plus size={13} />
									{isCreating ? "Creating..." : "Create Scaffold"}
								</Button>
							</div>
						</div>
					</div>
				)}

				<div className="grid grid-cols-4 gap-2">
					<StatPill label="Total" value={summary.total} />
					<StatPill label="Ready" value={summary.ready} tone="success" />
					<StatPill label="Warnings" value={summary.warnings} tone="warning" />
					<StatPill label="Errors" value={summary.errors} tone="error" />
				</div>

				<div className="flex justify-between gap-3">
					<p className="max-w-[320px] text-xs leading-relaxed text-foreground-muted">
						Workspace tooling stays dev-only and separate from installed plugin
						management in Settings.
					</p>
					<Button
						variant="secondary"
						onClick={() => void handleReload()}
						disabled={reloadingId === "__all__"}
						className="h-8 gap-1.5 px-3 text-xs"
					>
						<RefreshCw
							size={13}
							className={reloadingId === "__all__" ? "animate-spin" : ""}
						/>
						Rescan
					</Button>
				</div>

				{plugins.length === 0 && (
					<div className="rounded-2xl border border-glass-border-base bg-glass-bg-base px-4 py-8 text-center text-sm text-foreground-muted">
						No workspace plugins found under{" "}
						<code className="font-mono">plugins/</code>.
					</div>
				)}

				{plugins.map((plugin) => {
					const isSelected = selectedPluginId === plugin.id;
					return (
						<div
							key={`${plugin.directory}-${plugin.id}`}
							className={`flex flex-col rounded-2xl border transition-colors ${
								isSelected
									? "border-accent/30 bg-glass-bg-base"
									: "border-glass-border-base bg-glass-bg-base hover:border-glass-border-hover"
							}`}
						>
							<button
								type="button"
								onClick={() =>
									setSelectedPluginId(isSelected ? null : plugin.id)
								}
								className="flex w-full cursor-pointer items-start justify-between p-3 text-left"
							>
								<div className="flex items-start gap-3">
									<div className="mt-0.5">{STATUS_ICONS[plugin.status]}</div>
									<div>
										<h3 className="flex items-center gap-2 text-sm font-medium text-foreground">
											{plugin.name}
											<span className="rounded-lg bg-glass-bg-hover px-1.5 py-0.5 font-mono text-[10px] text-foreground-muted">
												v{plugin.version}
											</span>
										</h3>
										<p className="mt-1 font-mono text-xs text-foreground-muted">
											plugins/{plugin.directory}
										</p>
										<div className="mt-2 flex flex-wrap gap-2">
											<span className="rounded-lg bg-glass-bg-hover px-1.5 py-0.5 text-[10px] text-foreground-muted">
												{plugin.manifest.backend}
											</span>
											{plugin.manifest.slots.length === 0 ? (
												<span className="rounded-lg bg-glass-bg-hover px-1.5 py-0.5 text-[10px] text-foreground-muted">
													no slots
												</span>
											) : (
												plugin.manifest.slots.map((slot) => (
													<span
														key={slot}
														className="rounded-lg bg-glass-bg-hover px-1.5 py-0.5 text-[10px] text-foreground-muted"
													>
														{slot}
													</span>
												))
											)}
										</div>
									</div>
								</div>
								<ChevronDown
									size={14}
									className={`mt-1 shrink-0 text-foreground-muted transition-transform duration-[var(--ui-motion-duration-standard)] ${isSelected ? "rotate-180" : ""}`}
								/>
							</button>

							{plugin.issues.length > 0 && (
								<div className="flex flex-col gap-1.5 px-3 pb-3">
									{plugin.issues.map((issue) => (
										<p
											key={`${plugin.id}-${issue.message}`}
											className={`rounded-lg border px-2 py-1 text-xs ${
												issue.level === "error"
													? "border-destructive/20 bg-destructive/10 text-destructive"
													: "border-status-warning/20 bg-status-warning/10 text-status-warning"
											}`}
										>
											{issue.message}
										</p>
									))}
								</div>
							)}

							{isSelected && (
								<div className="flex flex-wrap items-center gap-2 border-t border-glass-border-base bg-background-deep/35 px-3 py-2">
									<Button
										variant="ghost"
										onClick={() => void handleReload(plugin.id)}
										disabled={reloadingId === plugin.id}
										className="h-7 gap-1.5 px-2 text-xs"
									>
										<RefreshCw
											size={12}
											className={
												reloadingId === plugin.id ? "animate-spin" : ""
											}
										/>
										Reload
									</Button>
									<Button
										variant="ghost"
										onClick={() => void handleOpenFolder(plugin)}
										disabled={actionPluginId === `folder:${plugin.directory}`}
										className="h-7 gap-1.5 px-2 text-xs"
									>
										<FolderOpen size={12} />
										Folder
									</Button>
									<Button
										variant="ghost"
										onClick={() => void handleOpenSource(plugin)}
										disabled={
											!plugin.sourceEntryPath ||
											actionPluginId === `source:${plugin.directory}`
										}
										className="h-7 gap-1.5 px-2 text-xs"
									>
										<Code2 size={12} />
										Source
									</Button>
									<Button
										variant="ghost"
										onClick={() => void handleOpenManifest(plugin)}
										disabled={actionPluginId === `manifest:${plugin.directory}`}
										className="h-7 gap-1.5 px-2 text-xs"
									>
										<FileCode size={12} />
										Manifest
									</Button>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

function StatPill({
	label,
	value,
	tone = "default",
}: {
	label: string;
	value: number;
	tone?: "default" | "success" | "warning" | "error";
}) {
	const toneClass =
		tone === "success"
			? "text-status-success"
			: tone === "warning"
				? "text-status-warning"
				: tone === "error"
					? "text-destructive"
					: "text-foreground";

	return (
		<div className="rounded-xl border border-glass-border-base bg-glass-bg-base px-3 py-2">
			<p className="text-[10px] uppercase tracking-wider text-foreground-subtle">
				{label}
			</p>
			<p className={`mt-1 text-sm font-semibold ${toneClass}`}>{value}</p>
		</div>
	);
}
