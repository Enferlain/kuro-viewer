# Plugin Workspace Author Workflow

Last updated: `2026-04-05`

This guide covers the supported dev-only workflow for plugins developed directly
inside this repo under `plugins/`.

## Supported Loop

1. Create or edit a workspace plugin under `plugins/<id>/`.
2. Reload it in Plugin Devtools to validate `plugin.json` and
   `settings.schema.json`.
3. Build the workspace frontend when you want a packageable artifact.
4. Pack the workspace into a `.plugin` archive.
5. Install that archive through the normal Settings > Plugins flow when you
   want to validate install-time behavior.

## Workspace Layout

Typical scaffolded plugin:

```text
plugins/<id>/
├── plugin.json
├── settings.schema.json
├── README.md
└── src/
    └── index.ts
```

Generated workspaces keep authoring source in `src/`. Packaging does not ship
that source folder directly. Instead, the build helper bundles it into the
manifest's `frontend_entry` path during packaging.

## Build A Workspace Plugin

Use:

```bash
pnpm plugin:build <plugin-id>
```

What it does:

- reads `plugins/<plugin-id>/plugin.json`
- looks for a source entry at `src/index.ts`, `src/index.tsx`, `src/index.js`,
  or `src/index.jsx`
- bundles that entry with Vite
- writes the generated artifact to `plugins/.build/<plugin-id>/...` using the
  manifest's `frontend_entry` path

Notes:

- the helper respects the repo `@/` alias for imports from `src/`
- `plugin.json` must declare `frontend_entry`
- if there is no `src/index.*`, build fails fast instead of guessing

## Package A Workspace Plugin

Use:

```bash
pnpm plugin:pack <plugin-id>
```

What it does:

- auto-builds the workspace frontend first when `src/index.*` exists
- validates `plugin.json`
- validates `settings.schema.json` when present
- creates `plugins/dist/<id>-<version>.plugin`
- excludes author-only folders like `src/`, `.build/`, `node_modules/`, and
  `target/`

If the workspace already contains a ready-to-ship `frontend.js` or `.mjs`
without a `src/index.*` authoring entry, `plugin:pack` uses that file directly.

## Install And Verify

After packaging:

1. Open Settings > Plugins.
2. Install the generated `.plugin` archive from `plugins/dist/`.
3. Confirm the installed plugin appears in the normal user-facing plugin list.
4. Re-open Plugin Devtools if you also want to keep iterating on the workspace
   copy separately.

## Current Limits

- existing-folder registration from outside `plugins/` is still not implemented
  in-app
- frontend/backend runtime hot-reload beyond explicit workspace rescan is still
  not implemented
- the Inspect tab still does not map arbitrary DOM selection back to source
  files automatically
