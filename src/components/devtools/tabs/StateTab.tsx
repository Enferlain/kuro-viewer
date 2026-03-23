import type React from "react";
import type { AppSettings } from "../../../stores/settings";
import type { DevToolsHostSnapshot, WorkspacePluginRecord } from "../types";

/**
 * Syntax-highlights a JSON string using semantic color tokens.
 * Returns an array of React elements instead of innerHTML.
 */
function tokenizeJson(json: string): React.ReactNode[] {
	const pattern =
		/("(?:\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\b(?:true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;

	const parts: React.ReactNode[] = [];
	let lastIndex = 0;
	let match: RegExpExecArray | null = null;

	match = pattern.exec(json);
	while (match !== null) {
		if (match.index > lastIndex) {
			parts.push(json.slice(lastIndex, match.index));
		}

		const value = match[0];
		let colorClass = "text-foreground";

		if (value.startsWith('"')) {
			colorClass = value.endsWith(":")
				? "text-foreground-muted"
				: "text-foreground";
		} else if (value === "true" || value === "false") {
			colorClass = "text-status-warning";
		} else if (value === "null") {
			colorClass = "text-foreground-subtle";
		}

		parts.push(
			<span key={`${match.index}-${value}`} className={colorClass}>
				{value}
			</span>,
		);

		lastIndex = match.index + value.length;
		match = pattern.exec(json);
	}

	if (lastIndex < json.length) {
		parts.push(json.slice(lastIndex));
	}

	return parts;
}

export function StateTab({
	host,
	settings,
	workspacePlugins,
}: {
	host: DevToolsHostSnapshot;
	settings: AppSettings;
	workspacePlugins: WorkspacePluginRecord[];
}) {
	const formattedJson = JSON.stringify(
		{
			host: {
				mode: import.meta.env.DEV ? "development" : "production",
				currentImageName: host.currentImageName,
				viewerState: host.viewerState,
				workspaceRoot: "plugins/",
			},
			settings: {
				devMode: settings.plugins.devMode,
				disabledPlugins: settings.plugins.disabledPlugins,
				installedSettingsKeys: Object.keys(settings.plugins.installedSettings),
			},
			runtimePluginSettings: host.pluginSettings,
			workspacePlugins: workspacePlugins.map((plugin) => ({
				id: plugin.id,
				status: plugin.status,
				directory: plugin.directory,
				backend: plugin.manifest.backend,
				slots: plugin.manifest.slots,
				issues: plugin.issues,
			})),
		},
		null,
		2,
	);

	return (
		<div className="flex flex-col h-full">
			<div className="p-4 border-b border-glass-border-base bg-glass-bg-base/30">
				<h2 className="text-sm font-semibold">Plugin State</h2>
				<p className="text-xs text-foreground-muted mt-1">
					Live view of registered plugins and their current settings.
				</p>
			</div>
			<div className="flex-1 p-4 overflow-y-auto">
				<pre className="text-xs font-mono text-foreground-subtle bg-background-deep p-4 rounded-xl border border-glass-border-base overflow-x-auto whitespace-pre-wrap">
					<code>{tokenizeJson(formattedJson)}</code>
				</pre>
			</div>
		</div>
	);
}
