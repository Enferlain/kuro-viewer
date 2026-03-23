import { useCallback, useMemo, useState } from "react";
import type { PluginManifestSummary } from "../../plugin-system/pluginManifest";
import type {
	DevLogEntry,
	WorkspacePluginIssue,
	WorkspacePluginRecord,
} from "./types";

const manifestModules = import.meta.glob("../../../plugins/*/plugin.json", {
	eager: true,
	import: "default",
}) as Record<string, unknown>;

const schemaModules = import.meta.glob(
	"../../../plugins/*/settings.schema.json",
	{
		eager: true,
		import: "default",
	},
) as Record<string, unknown>;

const sourceEntryModules = import.meta.glob("../../../plugins/*/src/index.ts", {
	eager: false,
});

function isRecord(value: unknown): value is Record<string, unknown> {
	return !!value && typeof value === "object" && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
	return (
		Array.isArray(value) && value.every((entry) => typeof entry === "string")
	);
}

function parseManifest(value: unknown): PluginManifestSummary | null {
	if (!isRecord(value)) {
		return null;
	}

	const {
		id,
		name,
		version,
		description,
		author,
		source_url,
		docs_url,
		usage,
		backend,
		slots,
		permissions,
	} = value;

	if (
		typeof id !== "string" ||
		typeof name !== "string" ||
		typeof version !== "string" ||
		typeof backend !== "string" ||
		!isStringArray(slots) ||
		!isStringArray(permissions)
	) {
		return null;
	}

	return {
		id,
		name,
		version,
		description: typeof description === "string" ? description : undefined,
		author: typeof author === "string" ? author : undefined,
		source_url: typeof source_url === "string" ? source_url : undefined,
		docs_url: typeof docs_url === "string" ? docs_url : undefined,
		usage: typeof usage === "string" ? usage : undefined,
		backend,
		slots,
		permissions,
	};
}

function createTimestamp(): string {
	return new Date().toLocaleTimeString("en-GB", { hour12: false });
}

function buildWorkspacePlugins(): WorkspacePluginRecord[] {
	const records = Object.entries(manifestModules)
		.map(([manifestPath, manifestValue]) => {
			const match = manifestPath.match(/plugins\/([^/]+)\/plugin\.json$/);
			if (!match) {
				return null;
			}

			const directory = match[1];
			const manifest = parseManifest(manifestValue);
			if (!manifest) {
				return {
					id: directory,
					name: directory,
					version: "invalid",
					directory,
					manifestPath,
					settingsSchemaPath: null,
					sourceEntryPath: null,
					status: "error" as const,
					manifest: {
						id: directory,
						name: directory,
						version: "invalid",
						backend: "unknown",
						slots: [],
						permissions: [],
					},
					issues: [
						{
							level: "error" as const,
							message: "Manifest is not valid JSON for the host contract.",
						},
					],
				};
			}

			const settingsSchemaPath =
				Object.keys(schemaModules).find((path) =>
					path.endsWith(`/plugins/${directory}/settings.schema.json`),
				) ?? null;
			const sourceEntryPath =
				Object.keys(sourceEntryModules).find((path) =>
					path.endsWith(`/plugins/${directory}/src/index.ts`),
				) ?? null;

			const issues: WorkspacePluginIssue[] = [];
			if (directory !== manifest.id) {
				issues.push({
					level: "warning",
					message: `Workspace folder '${directory}' does not match manifest id '${manifest.id}'.`,
				});
			}

			const schemaValue = settingsSchemaPath
				? schemaModules[settingsSchemaPath]
				: undefined;
			if (schemaValue) {
				if (!isRecord(schemaValue) || schemaValue.plugin_id !== manifest.id) {
					issues.push({
						level: "error",
						message:
							"settings.schema.json exists but its plugin_id does not match the manifest id.",
					});
				}
			} else {
				issues.push({
					level: "warning",
					message: "No settings.schema.json found in the workspace root.",
				});
			}

			if (!sourceEntryPath) {
				issues.push({
					level: "warning",
					message: "No src/index.ts entry found for the workspace plugin.",
				});
			}

			return {
				id: manifest.id,
				name: manifest.name,
				version: manifest.version,
				directory,
				manifestPath,
				settingsSchemaPath,
				sourceEntryPath,
				status: issues.some((issue) => issue.level === "error")
					? "error"
					: issues.length > 0
						? "warning"
						: "ready",
				manifest,
				issues,
			} satisfies WorkspacePluginRecord;
		})
		.filter((plugin): plugin is WorkspacePluginRecord => plugin !== null);

	return records.sort((left, right) => left.id.localeCompare(right.id));
}

function createScanLogs(plugins: WorkspacePluginRecord[]): DevLogEntry[] {
	const entries: DevLogEntry[] = [
		{
			id: 1,
			type: "info",
			time: createTimestamp(),
			message: `Scanned workspace plugins in /plugins/*. Found ${plugins.length} candidate${plugins.length === 1 ? "" : "s"}.`,
		},
	];

	for (const plugin of plugins) {
		entries.push({
			id: entries.length + 1,
			type:
				plugin.status === "error"
					? "error"
					: plugin.status === "warning"
						? "info"
						: "success",
			time: createTimestamp(),
			message:
				plugin.status === "ready"
					? `Workspace plugin ready: ${plugin.id} (${plugin.version})`
					: `${plugin.id}: ${plugin.issues.map((issue) => issue.message).join(" ")}`,
		});
	}

	return entries;
}

export function useWorkspacePlugins() {
	const [plugins, setPlugins] = useState<WorkspacePluginRecord[]>(() =>
		buildWorkspacePlugins(),
	);
	const [logs, setLogs] = useState<DevLogEntry[]>(() =>
		createScanLogs(buildWorkspacePlugins()),
	);

	const appendLog = useCallback((entry: Omit<DevLogEntry, "id" | "time">) => {
		setLogs((prev) => [
			...prev,
			{
				id: prev.length === 0 ? 1 : (prev.at(-1)?.id ?? 0) + 1,
				time: createTimestamp(),
				...entry,
			},
		]);
	}, []);

	const reloadWorkspacePlugins = useCallback(
		(targetPluginId?: string) => {
			const nextPlugins = buildWorkspacePlugins();
			setPlugins(nextPlugins);

			if (targetPluginId) {
				const target = nextPlugins.find(
					(plugin) => plugin.id === targetPluginId,
				);
				if (!target) {
					appendLog({
						type: "error",
						message: `Reload failed: workspace plugin '${targetPluginId}' was not found.`,
					});
					return;
				}

				appendLog({
					type: target.status === "error" ? "error" : "success",
					message:
						target.status === "ready"
							? `Reloaded workspace plugin '${target.id}'.`
							: `Reloaded '${target.id}' with issues: ${target.issues
									.map((issue) => issue.message)
									.join(" ")}`,
				});
				return;
			}

			appendLog({
				type: "info",
				message: `Reloaded ${nextPlugins.length} workspace plugin${nextPlugins.length === 1 ? "" : "s"}.`,
			});
		},
		[appendLog],
	);

	const summary = useMemo(
		() => ({
			total: plugins.length,
			ready: plugins.filter((plugin) => plugin.status === "ready").length,
			warnings: plugins.filter((plugin) => plugin.status === "warning").length,
			errors: plugins.filter((plugin) => plugin.status === "error").length,
		}),
		[plugins],
	);

	return {
		plugins,
		logs,
		summary,
		appendLog,
		reloadWorkspacePlugins,
	};
}
