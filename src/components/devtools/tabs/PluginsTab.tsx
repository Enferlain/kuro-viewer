import {
	AlertCircle,
	CheckCircle2,
	FileCode,
	FolderOpen,
	FolderPlus,
	Plus,
	RefreshCw,
	TriangleAlert,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { Button } from "../../ui/Button";
import type { DevLogEntry, WorkspacePluginRecord } from "../types";

const STATUS_ICONS: Record<WorkspacePluginRecord["status"], React.ReactNode> = {
	ready: <CheckCircle2 size={16} className="text-status-success" />,
	warning: <TriangleAlert size={16} className="text-status-warning" />,
	error: <AlertCircle size={16} className="text-destructive" />,
};

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
	onReload: (pluginId?: string) => void;
	onLog: (entry: Omit<DevLogEntry, "id" | "time">) => void;
}) {
	const [reloadingId, setReloadingId] = useState<string | null>(null);

	const handleReload = (id?: string) => {
		setReloadingId(id);
		setTimeout(() => {
			setReloadingId(null);
			onReload(id);
		}, 120);
	};

	return (
		<div className="flex flex-col h-full">
			<div className="p-4 border-b border-glass-border-base flex items-start justify-between bg-transparent">
				<div>
					<h2 className="text-sm font-semibold">Workspace Plugins</h2>
					<p className="text-xs text-foreground-muted mt-1">
						Discovered from{" "}
						<code className="font-mono">plugins/*/plugin.json</code>
					</p>
				</div>
				<div className="flex gap-2">
					<Button
						variant="secondary"
						onClick={() =>
							onLog({
								type: "info",
								message:
									"Register existing workspace plugin is planned, but not wired yet.",
							})
						}
						className="h-8 px-3 text-xs gap-1.5"
					>
						<FolderPlus size={14} />
						Register
					</Button>
					<Button
						variant="secondary"
						onClick={() =>
							onLog({
								type: "info",
								message:
									"Create Plugin scaffold flow is planned, but not wired yet.",
							})
						}
						className="h-8 px-3 text-xs gap-1.5"
					>
						<Plus size={14} />
						Create
					</Button>
				</div>
			</div>

			<div className="flex-1 p-4 flex flex-col gap-3 overflow-y-auto">
				<div className="grid grid-cols-4 gap-2">
					<StatPill label="Total" value={summary.total} />
					<StatPill label="Ready" value={summary.ready} tone="success" />
					<StatPill label="Warnings" value={summary.warnings} tone="warning" />
					<StatPill label="Errors" value={summary.errors} tone="error" />
				</div>

				<div className="flex justify-end">
					<Button
						variant="secondary"
						onClick={() => handleReload()}
						className="h-8 px-3 text-xs gap-1.5"
					>
						<RefreshCw size={13} />
						Rescan
					</Button>
				</div>

				{plugins.length === 0 && (
					<div className="rounded-2xl border border-glass-border-base bg-glass-bg-base px-4 py-8 text-center text-sm text-foreground-muted">
						No workspace plugins found under{" "}
						<code className="font-mono">plugins/</code>.
					</div>
				)}

				{plugins.map((plugin) => (
					<div
						key={plugin.id}
						className="flex flex-col rounded-2xl border border-glass-border-base bg-glass-bg-base overflow-hidden transition-colors hover:border-glass-border-hover"
					>
						<div className="p-3 flex items-start justify-between">
							<div className="flex items-start gap-3">
								<div className="mt-0.5">{STATUS_ICONS[plugin.status]}</div>
								<div>
									<h3 className="text-sm font-medium text-foreground flex items-center gap-2">
										{plugin.name}
										<span className="text-[10px] font-mono text-foreground-muted px-1.5 py-0.5 rounded-lg bg-glass-bg-hover">
											v{plugin.version}
										</span>
									</h3>
									<p className="text-xs text-foreground-muted font-mono mt-1">
										plugins/{plugin.directory}
									</p>
									<div className="flex flex-wrap gap-2 mt-2">
										<span className="text-[10px] px-1.5 py-0.5 rounded-lg bg-glass-bg-hover text-foreground-muted">
											{plugin.manifest.backend}
										</span>
										{plugin.manifest.slots.map((slot) => (
											<span
												key={slot}
												className="text-[10px] px-1.5 py-0.5 rounded-lg bg-glass-bg-hover text-foreground-muted"
											>
												{slot}
											</span>
										))}
									</div>
								</div>
							</div>
						</div>
						{plugin.issues.length > 0 && (
							<div className="px-3 pb-3 flex flex-col gap-1.5">
								{plugin.issues.map((issue) => (
									<p
										key={`${plugin.id}-${issue.message}`}
										className={`text-xs px-2 py-1 rounded-lg border ${
											issue.level === "error"
												? "text-destructive bg-destructive/10 border-destructive/20"
												: "text-status-warning bg-status-warning/10 border-status-warning/20"
										}`}
									>
										{issue.message}
									</p>
								))}
							</div>
						)}
						<div className="px-3 py-2 bg-transparent border-t border-glass-border-base flex items-center gap-2">
							<Button
								variant="ghost"
								onClick={() => handleReload(plugin.id)}
								disabled={reloadingId === plugin.id}
								className="h-7 px-2 text-xs gap-1.5"
							>
								<RefreshCw
									size={12}
									className={reloadingId === plugin.id ? "animate-spin" : ""}
								/>
								Reload
							</Button>
							<div className="w-px h-3 bg-glass-border-base mx-1" />
							<Button
								variant="ghost"
								onClick={() =>
									onLog({
										type: "info",
										message: `Workspace folder: ${plugin.directory}`,
									})
								}
								className="h-7 px-2 text-xs gap-1.5"
							>
								<FolderOpen size={12} />
								Folder
							</Button>
							<Button
								variant="ghost"
								onClick={() =>
									onLog({
										type: "info",
										message: `Manifest path: ${plugin.manifestPath}`,
									})
								}
								className="h-7 px-2 text-xs gap-1.5"
							>
								<FileCode size={12} />
								Manifest
							</Button>
						</div>
					</div>
				))}
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
			<p className={`text-sm font-semibold mt-1 ${toneClass}`}>{value}</p>
		</div>
	);
}
