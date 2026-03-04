# Plugin System Closeout Plan

Date: 2026-03-04
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

Known gaps:

- Installed plugin settings are not yet persisted in the app settings snapshot.
- Settings schema parsing is frontend-only and not fully contract-validated.
- Plugin lifecycle is still "install/list/uninstall" only (no enable/disable/state/index metadata).
- Docs mix "target contract" and "currently implemented" behavior.

---

## P0 Must-Do (Shipping Blockers)

### 1) Persist plugin settings end-to-end

Status: Not started

Tasks:

- [ ] Extend `AppSettings` with `plugins.installedSettings: Record<string, unknown>` (or equivalent top-level stable field).
- [ ] Add migration/normalization for this new field in `settingsSchema.ts`.
- [ ] Replace `App.tsx` local-only plugin settings state with settings-context-backed state.
- [ ] Wire `SettingsModal` Apply/Cancel behavior so plugin settings follow the same draft semantics as other settings.
- [ ] On uninstall, remove that plugin's persisted settings entry.
- [ ] On reinstall/upgrade, preserve settings when plugin ID is unchanged.

Acceptance criteria:

- [ ] Plugin settings survive full app restart.
- [ ] Cancel in settings modal reverts plugin edits.
- [ ] Apply persists plugin edits.
- [ ] Uninstall removes plugin settings state for removed plugin.

### 2) Validate settings schema against contract (not just parse)

Status: Partial

Tasks:

- [ ] Add host-side schema validation command (`validate_plugin_settings_schema`) and call it when loading installed plugin settings schema.
- [ ] Enforce required contract fields (`schema_version`, `plugin_id`, `presentation`, `sections`) with limits.
- [ ] Enforce max counts to prevent pathological schemas (example: max sections, max fields per section).
- [ ] Enforce field-level constraints consistently with `docs/schemas/plugin-settings.schema.json`.
- [ ] Require `plugin_id` in schema to match installed plugin ID.
- [ ] Fail closed in UI: when invalid, hide Configure and show actionable error banner.

Acceptance criteria:

- [ ] Invalid schema cannot render settings UI.
- [ ] Error path is clear to user and to logs.
- [ ] Validation behavior is deterministic and test-covered.

### 3) Complete plugin security envelope for current scope

Status: Partial

Tasks:

- [ ] Enforce `.plugin` extension and MIME assumptions server-side (not only in frontend).
- [ ] Reject symlink-like archive entries if platform/zip crate exposes them.
- [ ] Add explicit tests for `read_plugin_settings_schema` security paths:
  - invalid plugin ID
  - missing plugin.json in install directory
  - oversized settings schema
- [ ] Add install provenance metadata (`installed_at`, source filename, archive hash) for audit/debugging.
- [ ] Add explicit guardrails for user-provided regex in settings schema fields (length/complexity/timeout strategy or disallow runtime regex execution).

Acceptance criteria:

- [ ] Security checks exist in backend and are test-covered.
- [ ] No security-critical path depends only on frontend enforcement.

### 4) Plugin lifecycle correctness beyond install/remove

Status: Not started

Tasks:

- [ ] Add per-plugin enabled/disabled state persisted in settings.
- [ ] Ensure disabled plugins do not mount slot UI or hotkeys.
- [ ] Add clear status labels in Plugins tab (`installed`, `disabled`, `builtin`).
- [ ] Add command/event contract for enable/disable transitions.

Acceptance criteria:

- [ ] Users can disable plugin without uninstalling.
- [ ] Disabled plugin has no runtime effects.

---

## P1 High-Value (After P0)

### 5) Performance and startup behavior

Status: Not started

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

- [ ] Build central hotkey registry for app core + built-in plugins + installed plugins.
- [ ] Surface conflict warnings in plugin Configure UI and Controls tab.
- [ ] Define resolution precedence policy (core vs plugin, plugin vs plugin).

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

Status: Not started

Tasks:

- [ ] Install/uninstall/upgrade matrix for at least 3 plugin samples.
- [ ] Restart persistence checks for plugin settings.
- [ ] Corrupt/missing schema behavior checks.
- [ ] Drag-drop + file-picker parity checks.

---

## Docs and Contract Must-Do

### 11) Split docs into "implemented now" vs "target"

Status: Not started

Tasks:

- [ ] In `docs/PLUGIN_CONTRACT_1.0.md`, clearly mark which sections are current host behavior vs forward-looking target.
- [ ] Add a concise compatibility table (`supported now`, `planned`, `unsupported`).
- [ ] Document exact fallback behavior when settings schema is invalid or missing.

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
5. P1 performance + hotkey registry
6. P2 tests and docs polish

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
