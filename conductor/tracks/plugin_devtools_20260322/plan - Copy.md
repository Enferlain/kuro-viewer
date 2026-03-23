# Implementation Plan: Plugin Workspace And Devtools

## Status Snapshot

Already true in the repo:

- [x] Plugin archives can be installed, inspected, listed, and uninstalled.
- [x] `settings.schema.json` can drive host-rendered Configure UI.
- [x] Host-side schema validation fails closed for invalid plugin settings.
- [x] A plugin can now exist as a repo workspace under `plugins/`.

Still missing:

- [ ] Workspace plugin discovery
- [ ] Plugin workspace scaffolding and registration
- [ ] Reload workflow for workspace plugins
- [ ] Dev-only plugin tooling surface
- [ ] In-app inspection support for plugin authors
- [ ] Workspace build/package author workflow docs

## Phase 1: Workspace Foundations

- [ ] Task: Add workspace plugin discovery
  - [ ] Scan `plugins/*/plugin.json` in dev mode.
  - [ ] Keep workspace plugins distinct from installed app-data plugins.
  - [ ] Validate manifest shape before surfacing the plugin.
  - [ ] Show actionable errors for invalid workspaces.

- [ ] Task: Support workspace plugin registration
  - [ ] Allow the app to register an existing plugin folder created outside the app.
  - [ ] Decide whether registration is implicit from discovery or explicit via a saved list.
  - [ ] Keep this dev-only and separate from installed plugin state.

- [ ] Task: Add plugin scaffolding
  - [ ] Create a dev-only “Create Plugin” flow.
  - [ ] Offer lightweight starter shapes such as:
    - [ ] panel-first
    - [ ] toolbar-first
    - [ ] python-backed
    - [ ] blank
  - [ ] Generate only a minimal practical folder:
    - [ ] `plugin.json`
    - [ ] `settings.schema.json`
    - [ ] `src/`
    - [ ] optional `python/`
    - [ ] optional `README.md`

## Phase 2: Devtools Surface

- [ ] Task: Add a separate dev-only Plugin Devtools surface
  - [ ] Keep it separate from normal Settings > Plugins.
  - [ ] Start with a modal or floating panel rather than a large new app area.
  - [ ] Support drag, minimize, and hide behavior.
  - [ ] Consider optional low-emphasis or translucent mode for live inspection.

- [ ] Task: Add core devtools panes
  - [ ] `Inspect`
  - [ ] `Plugins`
  - [ ] `State`
  - [ ] `Logs`

- [ ] Task: Define workspace plugin row actions
  - [ ] reload
  - [ ] open folder
  - [ ] open source in editor
  - [ ] view manifest
  - [ ] view schema errors

## Phase 3: Inspection And Reload Loop

- [ ] Task: Add workspace plugin reload flow
  - [ ] Re-read `plugin.json`.
  - [ ] Revalidate `settings.schema.json`.
  - [ ] Reload plugin frontend artifacts if present.
  - [ ] Surface load failures clearly.
  - [ ] Start with explicit reload before considering file watching.

- [ ] Task: Add in-app inspection support
  - [ ] Evaluate an existing React inspection package rather than building from scratch.
  - [ ] Support click-to-inspect in dev mode.
  - [ ] Show likely component/source ownership and useful plugin-relevant context.
  - [ ] Prefer “open in editor” over trying to become a full source editor.

- [ ] Task: Add safe live manipulation
  - [ ] Allow live plugin settings tweaking.
  - [ ] Consider temporary visual or token preview controls.
  - [ ] Keep source rewriting out of scope for the first version.

## Phase 4: Author Workflow And Docs

- [ ] Task: Document the supported workspace author workflow
  - [ ] create plugin
  - [ ] register existing folder
  - [ ] build or bundle plugin frontend
  - [ ] reload in app
  - [ ] package as `.plugin`

- [ ] Task: Define the boundary between workspace and installed plugins
  - [ ] Make the UI distinction obvious.
  - [ ] Ensure user-facing plugin settings stay clean.
  - [ ] Keep dev-only behavior hidden when dev mode is off.

- [ ] Task: Manual Verification
  - [ ] Verify a new plugin scaffold can be created and discovered.
  - [ ] Verify an external existing plugin folder can be surfaced.
  - [ ] Verify invalid manifest and schema cases produce clear errors.
  - [ ] Verify reload updates the devtools state cleanly.
  - [ ] Verify the devtools surface stays out of normal user settings flows.

## Open Decisions

- [ ] Should workspace discovery be fully automatic from `plugins/*/plugin.json`, or should the app maintain an explicit registered-workspace list?
- [ ] Should Plugin Devtools open as a modal, floating panel, or dockable panel first?
- [ ] Which external inspection package fits this repo best for the first version?

## Done Criteria

- [ ] Dev mode supports workspace plugin discovery and validation.
- [ ] A plugin author can start from either scaffolded or existing plugin folders.
- [ ] A separate dev-only Plugin Devtools surface exists.
- [ ] Reload and inspection materially reduce the need to touch base app files during plugin work.
- [ ] The supported author workflow is documented and matches reality.
