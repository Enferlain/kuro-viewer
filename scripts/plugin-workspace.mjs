import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { build } from "vite";

const repoRoot = path.resolve(import.meta.dirname, "..");
const pluginsRoot = path.join(repoRoot, "plugins");
const buildRoot = path.join(pluginsRoot, ".build");
const distRoot = path.join(pluginsRoot, "dist");

function fail(message) {
	console.error(message);
	process.exit(1);
}

function formatRelative(targetPath) {
	return path.relative(repoRoot, targetPath).split(path.sep).join("/");
}

async function pathExists(targetPath) {
	try {
		await fs.access(targetPath);
		return true;
	} catch {
		return false;
	}
}

async function readJson(targetPath) {
	const contents = await fs.readFile(targetPath, "utf8");
	return JSON.parse(contents);
}

async function resolvePluginWorkspace(pluginId) {
	if (!pluginId || pluginId.trim().length === 0) {
		fail(
			"Usage: pnpm plugin:build <plugin-id> or pnpm plugin:pack <plugin-id>",
		);
	}

	const pluginDir = path.join(pluginsRoot, pluginId);
	const manifestPath = path.join(pluginDir, "plugin.json");
	if (!(await pathExists(manifestPath))) {
		fail(
			`Workspace plugin '${pluginId}' was not found at ${formatRelative(pluginDir)}.`,
		);
	}

	const manifest = await readJson(manifestPath);
	return { pluginDir, manifestPath, manifest };
}

async function findSourceEntry(pluginDir) {
	const candidates = [
		"src/index.ts",
		"src/index.tsx",
		"src/index.js",
		"src/index.jsx",
	].map((relativePath) => path.join(pluginDir, relativePath));

	for (const candidate of candidates) {
		if (await pathExists(candidate)) {
			return candidate;
		}
	}

	return null;
}

async function buildWorkspacePlugin(pluginId) {
	const { pluginDir, manifest } = await resolvePluginWorkspace(pluginId);
	const sourceEntry = await findSourceEntry(pluginDir);
	if (!sourceEntry) {
		fail(
			`No workspace source entry was found for '${pluginId}'. Expected src/index.ts(x|js|jsx).`,
		);
	}

	if (
		typeof manifest.frontend_entry !== "string" ||
		manifest.frontend_entry.trim().length === 0
	) {
		fail(
			`plugin.json for '${pluginId}' must declare frontend_entry before it can be built.`,
		);
	}

	const outputDir = path.join(buildRoot, pluginId);
	await fs.rm(outputDir, { recursive: true, force: true });

	await build({
		configFile: false,
		plugins: [react()],
		resolve: {
			alias: {
				"@": path.join(repoRoot, "src"),
			},
		},
		build: {
			target: "es2022",
			outDir: outputDir,
			emptyOutDir: true,
			sourcemap: true,
			minify: false,
			lib: {
				entry: sourceEntry,
				formats: ["es"],
			},
			rollupOptions: {
				output: {
					entryFileNames: manifest.frontend_entry,
					chunkFileNames: "chunks/[name]-[hash].js",
					assetFileNames: "assets/[name]-[hash][extname]",
				},
			},
		},
	});

	const builtEntryPath = path.join(outputDir, manifest.frontend_entry);
	if (!(await pathExists(builtEntryPath))) {
		fail(
			`Build completed but did not emit ${manifest.frontend_entry} for '${pluginId}'.`,
		);
	}

	console.log(
		`Built ${pluginId}: ${formatRelative(sourceEntry)} -> ${formatRelative(builtEntryPath)}`,
	);

	return {
		pluginDir,
		manifest,
		outputDir,
		builtEntryPath,
		sourceEntry,
	};
}

function runCommand(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: repoRoot,
		stdio: "inherit",
		...options,
	});

	if (result.error) {
		fail(`Failed to run ${command}: ${result.error.message}`);
	}
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

async function packWorkspacePlugin(pluginId) {
	const { pluginDir, manifest } = await resolvePluginWorkspace(pluginId);
	const sourceEntry = await findSourceEntry(pluginDir);
	const hasWorkspaceFrontend =
		typeof manifest.frontend_entry === "string" &&
		(await pathExists(path.join(pluginDir, manifest.frontend_entry)));

	let overlayDir = null;
	if (sourceEntry) {
		const buildResult = await buildWorkspacePlugin(pluginId);
		overlayDir = buildResult.outputDir;
	} else if (!hasWorkspaceFrontend) {
		fail(
			`Workspace plugin '${pluginId}' has no buildable source entry and no existing ${manifest.frontend_entry ?? "frontend entry"} file to package.`,
		);
	}

	await fs.mkdir(distRoot, { recursive: true });
	const archivePath = path.join(
		distRoot,
		`${manifest.id ?? pluginId}-${manifest.version ?? "0.0.0"}.plugin`,
	);

	const cargoArgs = [
		"run",
		"--quiet",
		"--manifest-path",
		"src-tauri/Cargo.toml",
		"--bin",
		"workspace_plugin_packager",
		"--",
		pluginDir,
		archivePath,
	];

	if (overlayDir) {
		cargoArgs.push(overlayDir);
	}

	runCommand("cargo", cargoArgs);
	console.log(`Packaged ${pluginId}: ${formatRelative(archivePath)}`);
}

async function main() {
	const [, , action, pluginId] = process.argv;
	if (action === "build") {
		await buildWorkspacePlugin(pluginId);
		return;
	}
	if (action === "pack") {
		await packWorkspacePlugin(pluginId);
		return;
	}

	fail("Usage: pnpm plugin:build <plugin-id> or pnpm plugin:pack <plugin-id>");
}

await main();
