# Implementation Plan: Plugin System 1.0 Closeout

## Status Snapshot

Already completed in the repo:

- [x] Inspect-before-install flow
- [x] Manifest validation
- [x] Hardened extraction with staging and rollback
- [x] Install, list, and uninstall commands
- [x] Dynamic Configure from `settings.schema.json`
- [x] Persisted plugin settings under app settings
- [x] Host-side schema validation with fail-closed UI behavior

Still remaining:

- [x] Lifecycle beyond install and uninstall
- [x] Remaining security hardening
- [ ] Performance and startup behavior for larger plugin counts
- [ ] Hotkey conflict management
- [ ] Test, QA, packaging, and docs closeout

## Phase 1: Shipping Blockers

- [x] Task: Finish plugin lifecycle beyond install and uninstall
  - [x] Persist per-plugin enabled and disabled state in settings.
  - [x] Ensure disabled plugins do not mount UI contributions or hotkeys.
  - [x] Add clear status labels in the Plugins settings tab.
  - [ ] Keep a separate host command and event lifecycle contract deferred until a generic plugin runtime exists.

- [ ] Task: Complete the remaining plugin security envelope
  - [x] Add central host-owned install metadata in `plugins/index.json`.
  - [x] Reject symlink-like archive entries if supported by the archive layer.
  - [x] Explicitly disallow regex-style schema inputs for host-rendered string settings.
  - [x] Verify security-sensitive paths are covered by backend tests rather than frontend-only assumptions.

- [ ] Task: Manual Verification - Shipping Blockers
  - [ ] Verify enable and disable behavior survives restart.
  - [ ] Verify uninstall removes plugin settings for the removed plugin.
  - [ ] Verify invalid schema paths fail closed with a clear user-facing message.
  - [ ] Verify `plugins/index.json` is created, updated on upgrade, and cleaned up on uninstall.

## Phase 2: Scale And Interaction Quality

- [ ] Task: Improve plugin list performance and startup behavior
  - [ ] Add a plugin index cache or equivalent manifest summary layer.
  - [ ] Avoid re-reading unchanged manifests and schemas.
  - [ ] Keep configure-schema loading lazy.
  - [ ] Add lightweight instrumentation around list, install, and configure flows.

- [ ] Task: Add cross-plugin hotkey conflict management
  - [ ] Create a central registry for app and plugin hotkeys.
  - [ ] Detect conflicts before applying settings.
  - [ ] Surface conflict warnings in the relevant settings surfaces.
  - [ ] Define explicit precedence rules.

- [ ] Task: Polish schema-driven Configure UI consistency
  - [ ] Improve field rendering parity where needed.
  - [ ] Keep inline and modal Configure surfaces visually consistent with the host.
  - [ ] Ensure deterministic ordering and stable rendering of sections and fields.

- [ ] Task: Manual Verification - Scale And Interaction Quality
  - [ ] Verify plugin list responsiveness with a larger installed set.
  - [ ] Verify conflicting hotkeys are surfaced clearly.
  - [ ] Verify third-party Configure UIs feel native rather than ad hoc.

## Phase 3: Reliability, QA, And Authoring Closeout

- [ ] Task: Complete backend and frontend test coverage for current host behavior
  - [ ] Add missing backend tests for schema loading and install roundtrips.
  - [ ] Add negative tests for malformed settings schemas.
  - [ ] Add frontend tests for schema runtime parsing and Configure availability rules.
  - [ ] Add field behavior tests for the core schema-driven controls.

- [ ] Task: Build a practical manual QA matrix
  - [ ] Test install, uninstall, and upgrade flows with multiple sample plugins.
  - [ ] Test restart persistence scenarios.
  - [ ] Test corrupt, missing, and oversized schema behavior.
  - [ ] Test drag-and-drop and file-picker install parity.

- [ ] Task: Finish plugin authoring and packaging docs
  - [ ] Add a one-command packaging path for at least one reference plugin.
  - [ ] Document build, package, install, and debug steps for plugin authors.
  - [ ] Add troubleshooting guidance for common install and Configure failures.

- [ ] Task: Manual Verification - Reliability, QA, And Docs
  - [ ] Confirm the documented author workflow matches the actual repo flow.
  - [ ] Confirm the sample plugin packaging path produces an installable artifact.
  - [ ] Confirm QA notes capture the final supported-now behavior accurately.

## Done Criteria

- [ ] Plugin lifecycle includes enable and disable, not only install and remove.
- [ ] Security-sensitive host behavior is backend-enforced and test-covered.
- [ ] Configure flows remain usable and consistent as plugin count grows.
- [ ] Test and QA coverage is credible for the current feature surface.
- [ ] Plugin author docs match actual supported host behavior.
