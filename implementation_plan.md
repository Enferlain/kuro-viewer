# Plugin System Closeout Plan

## Current Active Slice: Plugin Devtools Author Loop

Date: 2026-04-04
Track: `conductor/tracks/plugin_devtools_20260322`

This repo is currently focused on the plugin devtools track rather than the
remaining end-user plugin-system closeout items.

Immediate goal for this slice:

- add a real dev-only plugin scaffold flow from the in-app Plugin Devtools
- replace placeholder workspace row actions with real folder/source opening
- keep the workflow clearly separate from installed plugin management

Planned implementation for this pass:

- add Tauri commands for dev-only workspace actions
- create minimal scaffold templates that satisfy the current plugin contract
- wire the `Plugins` devtools tab to create a workspace and jump straight into it
- make action failures/logging explicit so the author loop is understandable

Out of scope for this pass:

- full plugin frontend runtime hot-reload
- file watching
- arbitrary external-folder registration
- in-app source editing

Date: 2026-03-22
Owner: Core app + plugin host

## Objective

Finish the remaining must-do work for Plugin 1.0 so the system is safe, predictable, and usable for real third-party plugins.

This plan focuses on:

- security hardening
- settings persistence correctness
- schema accuracy and validation
- performance/scalability
- docs and onboarding quality

## Current Snapshot

Implemented and working today:

- Install flow with inspect-before-install confirmation.
- Hardened archive extraction (staging, rollback, traversal protections, size/entry caps).
- Installed plugins list + About + Remove actions.
- Dynamic Configure rendering for installed plugins using `settings.schema.json`.
- Built-in forensics plugin settings definition.
- Plugin settings persisted under app settings (`plugins.installedSettings`).
- Plugin enable/disable lifecycle persisted under app settings (`plugins.disabledPlugins`).
- Built-in forensics runtime gating when disabled.
- Host-side `settings.schema.json` validation with fail-closed Configure behavior.
- Host-owned install metadata in `plugins/index.json`.

Known gaps:

- High-count plugin performance/index caching is not implemented yet.
- Full docs/onboarding quickstart and troubleshooting are still incomplete.
- Manual QA is mostly complete, but install-metadata creation/update should still be checked explicitly during install/upgrade.

---

## P0 Must-Do (Shipping Blockers)

### 1) Persist plugin settings end-to-end

Status: Implemented (manual QA in progress)

Tasks:

- [x] Extend `AppSettings` with `plugins.installedSettings: Record<string, unknown>` (or equivalent top-level stable field).
- [x] Add migration/normalization for this new field in `settingsSchema.ts`.
- [x] Replace `App.tsx` local-only plugin settings state with settings-context-backed state.
- [x] Wire `SettingsModal` Apply/Cancel behavior so plugin settings follow the same draft semantics as other settings.
- [x] On uninstall, remove that plugin's persisted settings entry.
- [x] On reinstall/upgrade, preserve settings when plugin ID is unchanged.

Acceptance criteria:

- [x] Plugin settings survive full app restart.
- [ ] Cancel in settings modal reverts plugin edits.
- [ ] Apply persists plugin edits.
- [x] Uninstall removes plugin settings state for removed plugin.

### 2) Validate settings schema against contract (not just parse)

Status: Implemented (manual QA pending)

Tasks:

- [x] Add host-side schema validation command (`validate_plugin_settings_schema`) and call it when loading installed plugin settings schema.
- [x] Enforce required contract fields (`schema_version`, `plugin_id`, `presentation`, `sections`) with limits.
- [x] Enforce max counts to prevent pathological schemas (example: max sections, max fields per section).
- [x] Enforce field-level constraints consistently with `docs/schemas/plugin-settings.schema.json`.
- [x] Require `plugin_id` in schema to match installed plugin ID.
- [x] Fail closed in UI: when invalid, hide Configure and show actionable error banner.

Acceptance criteria:

- [x] Invalid schema cannot render settings UI.
- [x] Error path is clear to user and to logs.
- [x] Validation behavior is deterministic and test-covered.

### 3) Complete plugin security envelope for current scope

Status: Implemented, with manual QA follow-up pending

Tasks:

- [x] Enforce `.plugin` extension and MIME assumptions server-side (not only in frontend).
- [x] Reject symlink-like archive entries if platform/zip crate exposes them.
- [x] Add explicit tests for `read_plugin_settings_schema` security paths:
  - invalid plugin ID
  - missing plugin.json in install directory
  - oversized settings schema
- [x] Add central install metadata (`installed_at`, source filename, archive hash) for audit/debugging via `plugins/index.json`.
- [x] Add explicit guardrails for user-provided regex in settings schema fields by disallowing runtime regex execution in host 1.0.

Acceptance criteria:

- [x] Security checks exist in backend and are test-covered.
- [x] No security-critical path depends only on frontend enforcement.

### 4) Plugin lifecycle correctness beyond install/remove

Status: Implemented, with manual QA follow-up pending

Tasks:

- [x] Add per-plugin enabled/disabled state persisted in settings.
- [x] Ensure disabled plugins do not mount slot UI or hotkeys.
- [x] Add clear status labels in Plugins tab (`installed`, `disabled`, `builtin`).
- [ ] Add command/event contract for enable/disable transitions.

Acceptance criteria:

- [x] Users can disable plugin without uninstalling.
- [x] Disabled plugin has no runtime effects.

---

## P1 High-Value (After P0)

### 5) Performance and startup behavior

Status: In progress

Tasks:

- [ ] Add plugin index cache file in app data (manifest summary + timestamps/hash) to avoid full directory parse on every refresh.
- [ ] Only re-read changed plugin manifests/schemas when mtime/hash changed.
- [ ] Keep configure-schema loading lazy per plugin row expansion/open.
- [ ] Add lightweight perf instrumentation around list/install/configure operations.

Acceptance criteria:

- [ ] Plugin list refresh remains responsive with 50+ plugins.
- [ ] Startup does not load plugin frontend/backend binaries eagerly.

### 6) Cross-plugin hotkey conflict management

Status: Not started

Tasks:

- [ ] Build a central hotkey registry for app-core viewer bindings plus built-in plugin hotkeys.
- [ ] Normalize bindings from draft settings so conflicts can be detected before Apply.
- [ ] Surface conflict warnings in both plugin Configure UI and the Controls tab.
- [ ] Define precedence and blocked-binding behavior for core-vs-plugin and plugin-vs-plugin collisions.

Acceptance criteria:

- [ ] Conflicts are detected before applying settings.
- [ ] Effective binding is always explicit to user.

### 7) Schema-driven UI parity and consistency

Status: In progress

Tasks:

- [ ] Add richer field rendering parity where needed (group hints, disabled states, optional badges, unit labels).
- [ ] Ensure inline and modal Configure surfaces match host visual system consistently.
- [ ] Add deterministic ordering/stability for schema sections and fields.

Acceptance criteria:

- [ ] Third-party schema UIs look native, not ad hoc.
- [ ] No duplicate outer containers in inline presentation.

---

## P2 Testing and Reliability

### 8) Backend test completion

Status: Partial

Tasks:

- [ ] Unit tests for `read_plugin_settings_schema` happy/error/security paths.
- [ ] Regression tests for install + settings schema roundtrip behaviors.
- [ ] Add negative tests for malformed settings schemas.

### 9) Frontend test completion

Status: Not started

Tasks:

- [ ] Unit tests for `schemaRuntime` parsing/sanitization.
- [ ] Tests for field behaviors (`boolean`, `number`, `enum`, `string`, `keybinding`).
- [ ] UI tests for Configure availability rules (static definition vs dynamic schema vs invalid schema).

### 10) Manual QA matrix

Status: In progress

Tasks:

- [ ] Install/uninstall/upgrade matrix for at least 3 plugin samples.
- [x] Restart persistence checks for plugin settings.
- [x] Corrupt/missing schema behavior checks.
- [ ] Drag-drop + file-picker parity checks.
- [x] Verify uninstall removes installed plugin folder from app data.
- [x] Verify invalid schema fails closed after schema re-read/reopen.
- [ ] Verify `plugins/index.json` creation/update during install and upgrade.

---

## Docs and Contract Must-Do

### 11) Split docs into "implemented now" vs "target"

Status: Implemented (manual QA pending)

Tasks:

- [x] In `docs/PLUGIN_CONTRACT_1.0.md`, clearly mark which sections are current host behavior vs forward-looking target.
- [x] Add a concise compatibility table (`supported now`, `planned`, `unsupported`).
- [x] Document exact fallback behavior when settings schema is invalid or missing.

### 12) Authoring quickstart and reference plugin packaging

Status: Partial

Tasks:

- [ ] Add a one-command packaging script for example plugin(s) (`pnpm plugin:pack <id>` or script equivalent).
- [ ] Add "build, package, install, debug" quickstart for plugin authors.
- [ ] Add troubleshooting section for common install/configure failures and corresponding error messages.

---

## Recommended Execution Order

1. P0.1 plugin settings persistence
2. P0.2 schema validation in backend + UI fail-closed path
3. P0.3 security envelope completion
4. P0.4 enable/disable lifecycle
5. P1 hotkey conflict management
6. P1 performance/index caching
7. P2 tests and docs polish

## Next Slice: Hotkey Conflict Management

Objective: detect and surface keybinding conflicts before Apply so app-core
controls and plugin hotkeys cannot silently shadow each other.

Scope for the first pass:

- include app-core viewer bindings from `controls.keybinds`
- include built-in forensics bindings from `plugins.installedSettings.forensics-suite.hotkeys`
- exclude arbitrary third-party runtime hotkeys until a generic plugin runtime
  registration path exists

Implementation shape:

- add a central hotkey registry builder that normalizes all known bindings into a
  shared model
- compute conflicts from the settings draft, not only from live runtime state
- show warnings in both the Controls surface and plugin Configure UI
- block Apply only for direct collisions, while allowing harmless duplicates to
  remain informational if we decide that is less disruptive

Recommended precedence rule:

- app-core bindings win by default
- built-in plugin bindings must not silently override app-core bindings
- plugin-plugin collisions are blocked unless one side changes

---

## Definition of Done (Plugin System 1.0)

- [ ] Install/inspect/list/uninstall/enable-disable all work and are test-covered.
- [ ] Plugin settings are persisted, migrated, and removed correctly with lifecycle events.
- [ ] Settings schema validation is host-enforced and contract-accurate.
- [ ] Plugin list and configure surfaces remain responsive at higher plugin counts.
- [ ] Docs are accurate, practical, and clearly separate current behavior from future targets.

---

## Appendix A: Forensics Plugin Follow-Ups

(Kept from previous plan so this work does not get lost.)

- [ ] App-level/global hotkey conflict resolver (forensics vs app core vs other plugins).
- [ ] Noise visual output parity pass vs `ref_functions/test_noise.py`.
- [ ] PCA visual output parity pass vs `ref_functions/test_pca.py`.
- [ ] Texture visual output parity pass vs `ref_functions/test_texture.py`.
- [ ] Decide whether current CSS overlay path is sufficient or move to real pixel pipeline (canvas/WASM backend).
- [ ] Decide final `rembg` behavior semantics (visual-only, score-only, or full segmentation).
- [ ] Add packaging script + release checklist for external forensics `.plugin` artifact.

---

## Forensics Capability Pass (2026-03-05)

Objective: make forensics controls produce real image-processing output (not CSS-only approximations), and close missing runtime behavior wiring.

Scope:

- [x] Replace CSS-filter overlay path in `ImageViewer` with pixel-processing overlays for `Noise`, `PCA`, and `Texture`.
- [x] Ensure mode-specific controls (amplitude/input/mode/component/linearize/invert/enhancement/strength/smoothness/opacity) directly affect rendered output.
- [x] Wire `sideBySide` hotkey to toggle split-compare behavior at runtime.
- [x] Gate score computation behind `view.outputScore` so disabling score also disables compute path.
- [ ] Validate with `pnpm typecheck` and quick manual behavior checks in viewer.

Acceptance criteria:

- [ ] Visual output changes immediately and materially when each forensics control changes.
- [ ] Side-by-side toggle works from both settings toggle and configured hotkey.
- [x] No TypeScript errors introduced.
