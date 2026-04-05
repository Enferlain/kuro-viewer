# Implementation Plan: Plugin Workspace And Devtools

## Status Snapshot

Already true in the repo:

- [x] Plugin archives can be installed, inspected, listed, and uninstalled.
- [x] `settings.schema.json` can drive host-rendered Configure UI.
- [x] Host-side schema validation fails closed for invalid plugin settings.
- [x] A plugin can now exist as a repo workspace under `plugins/`.

Still missing:

- [x] Workspace plugin discovery
- [~] Plugin workspace scaffolding and registration
- [~] Reload workflow for workspace plugins
- [x] Dev-only plugin tooling surface
- [~] In-app inspection support for plugin authors
- [ ] Workspace build/package author workflow docs

Legend:

- `[x]` done
- `[ ]` not started
- `[~]` partial / in progress

## Phase 1: Workspace Foundations

- [x] Task: Add workspace plugin discovery
  - [x] Scan `plugins/*/plugin.json` in dev mode.
  - [x] Keep workspace plugins distinct from installed app-data plugins.
  - [x] Validate manifest shape before surfacing the plugin.
  - [x] Show actionable errors for invalid workspaces.
  - [x] Expand validation beyond the current lightweight devtools checks.

- [ ] Task: Support workspace plugin registration
  - [ ] Allow the app to register an existing plugin folder created outside the app.
  - [ ] Decide whether registration is implicit from discovery or explicit via a saved list.
  - [ ] Keep this dev-only and separate from installed plugin state.

- [~] Task: Add plugin scaffolding
  - [x] Create a dev-only “Create Plugin” flow.
  - [x] Offer lightweight starter shapes such as:
    - [x] panel-first
    - [x] toolbar-first
    - [x] python-backed
    - [x] blank
  - [x] Generate only a minimal practical folder:
    - [x] `plugin.json`
    - [x] `settings.schema.json`
    - [x] `src/`
    - [x] optional `python/`
    - [x] optional `README.md`
  - [x] Add build/package helper scripts for scaffolded workspaces.

## Phase 2: Devtools Surface

- [x] Task: Add a separate dev-only Plugin Devtools surface
  - [x] Keep it separate from normal Settings > Plugins.
  - [x] Start with a modal or floating panel rather than a large new app area.
  - [x] Support drag, minimize, and hide behavior.
  - [x] Consider optional low-emphasis or translucent mode for live inspection.
  - [ ] Decide whether it should stay floating-only or become dockable later.

- [x] Task: Add core devtools panes
  - [x] `Inspect`
  - [x] `Plugins`
  - [x] `State`
  - [x] `Logs`

- [~] Task: Define workspace plugin row actions
  - [x] reload
  - [x] view manifest
  - [x] view schema errors
  - [x] open folder
  - [x] open source in editor
  - [x] make non-implemented actions explicit or disable them cleanly

## Phase 3: Inspection And Reload Loop

- [~] Task: Add workspace plugin reload flow
  - [x] Re-read workspace manifest/module discovery state via explicit rescan.
  - [x] Revalidate `settings.schema.json` via the host-side contract validator.
  - [ ] Reload plugin frontend artifacts if present.
  - [x] Surface load failures clearly.
  - [x] Start with explicit reload before considering file watching.

- [~] Task: Add in-app inspection support
  - [ ] Evaluate an existing React inspection package rather than building from scratch.
  - [x] Support click-to-inspect in dev mode.
  - [x] Show useful live DOM ownership/context even before source mapping exists.
  - [x] Prefer “open in editor” over trying to become a full source editor.
  - [x] Pass tagged source line metadata through to editor launchers.
  - [x] Support configurable editor jump arguments for non-standard setups.

- [ ] Task: Add safe live manipulation
  - [ ] Allow live plugin settings tweaking.
  - [ ] Consider temporary visual or token preview controls.
  - [ ] Keep source rewriting out of scope for the first version.

## Phase 4: Author Workflow And Docs

- [ ] Task: Document the supported workspace author workflow
  - [x] create plugin
  - [ ] register existing folder
  - [x] build or bundle plugin frontend
  - [x] reload in app
  - [x] package as `.plugin`

- [ ] Task: Define the boundary between workspace and installed plugins
  - [ ] Make the UI distinction obvious.
  - [ ] Ensure user-facing plugin settings stay clean.
  - [ ] Keep dev-only behavior hidden when dev mode is off.

- [ ] Task: Manual Verification
  - [x] Verify a new plugin scaffold can be created and discovered. _(Covered by backend scaffold tests + devtools filesystem scan path.)_
  - [ ] Verify an external existing plugin folder can be surfaced.
  - [ ] Verify invalid manifest and schema cases produce clear errors.
  - [ ] Verify reload updates the devtools state cleanly.
  - [ ] Verify inspect line-jump behavior across at least one auto-detected editor and one custom argument-template setup.
  - [ ] Verify the devtools surface stays out of normal user settings flows.

## Open Decisions

- [ ] Should workspace discovery be fully automatic from `plugins/*/plugin.json`, or should the app maintain an explicit registered-workspace list?
- [~] Should Plugin Devtools open as a modal, floating panel, or dockable panel first?
  - Current implementation is a floating panel.
- [ ] Which external inspection package fits this repo best for the first version?

## Done Criteria

- [x] Dev mode supports workspace plugin discovery and validation.
- [~] A plugin author can start from either scaffolded or existing plugin folders.
- [ ] A separate dev-only Plugin Devtools surface exists.
- [ ] Reload and inspection materially reduce the need to touch base app files during plugin work.
- [ ] The supported author workflow is documented and matches reality.
