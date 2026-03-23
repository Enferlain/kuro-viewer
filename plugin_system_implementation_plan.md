# Plugin System 1.0 Closeout — Phase 1 Implementation Plan

Phase 1 should stay focused on the current shipping blockers:

- plugin enable and disable lifecycle
- runtime gating for disabled plugins
- remaining archive hardening

This version is intentionally aligned with the codebase as it exists today. It
does not assume a fuller plugin runtime than the host currently has.

## Implementation Approach

### 1. Enable And Disable State Lives In App Settings

Use a deny-list in settings:

- `settings.plugins.disabledPlugins: string[]`

Why this shape:

- new installs are enabled by default
- it matches user expectations better than an allow-list
- it fits the app's existing settings draft and apply model

This state should follow the same `Apply` and `Cancel` semantics as other
settings in the settings modal.

## Proposed Changes

### Plugin Lifecycle

#### [MODIFY] [settingsSchema.ts](/mnt/d/Projects/kuro-viewer/src/stores/settings/settingsSchema.ts)

- Add `disabledPlugins: string[]` to `AppSettingsV1.plugins`.
- Set the default to `[]`.
- Add migration and normalization support using the existing settings helpers.
- Ensure uninstall cleanup can safely remove a plugin ID from `disabledPlugins`
  if present.

#### [MODIFY] [SettingsModal.tsx](/mnt/d/Projects/kuro-viewer/src/components/settings/SettingsModal.tsx)

- Thread `disabledPlugins` through the existing settings draft state.
- Pass `disabledPlugins` and `onDisabledPluginsChange` into `PluginsTab`.
- Keep enable and disable changes in the draft until the user applies them.
- Confirm cancel restores the prior lifecycle state just like other settings.

#### [MODIFY] [PluginsTab.tsx](/mnt/d/Projects/kuro-viewer/src/components/settings/tabs/PluginsTab.tsx)

- Accept `disabledPlugins: string[]` and `onDisabledPluginsChange`.
- Derive enabled or disabled UI state per plugin locally rather than mutating
  the manifest type.
- Add an enable or disable action to each plugin row.
- Add a visible status label such as `Enabled`, `Disabled`, or `Builtin`.
- Hide `Configure` when a plugin is disabled.
- Visually dim disabled plugin rows so the state is obvious.
- On uninstall, also remove that plugin ID from `disabledPlugins`.

#### [DO NOT MODIFY] [pluginManifest.ts](/mnt/d/Projects/kuro-viewer/src/plugin-system/pluginManifest.ts)

- Do not add `enabled` to `PluginManifestEntry`.
- Enabled state is host runtime state, not manifest data.
- If a richer UI model is needed, create a separate derived display type inside
  the settings UI layer.

### Runtime Gating

#### [MODIFY] [App.tsx](/mnt/d/Projects/kuro-viewer/src/App.tsx)

- Add a helper that answers whether a plugin is currently disabled based on
  settings.
- Gate built-in plugin behavior at runtime using that helper.
- For the current host, this mainly means the built-in forensics plugin should
  not contribute hotkeys, active modes, or plugin-owned UI behavior while
  disabled.
- When the forensics plugin is disabled, the app should fall back to safe
  neutral behavior rather than preserving stale active plugin state.

Notes:

- This is the most important missing piece from UI-only disable plans.
- A plugin is not truly disabled if its keyboard handlers or runtime behavior
  still execute in the app shell.

### Security Hardening

#### [MODIFY] [plugin_install.rs](/mnt/d/Projects/kuro-viewer/src-tauri/src/plugin_install.rs)

Add symlink-style archive rejection inside extraction:

- After opening each zip entry, reject it if the archive layer exposes it as a
  symlink-like entry.
- Fail closed and clean up staging output before returning.

#### [MODIFY] [tests.rs](/mnt/d/Projects/kuro-viewer/src-tauri/src/plugin_install/tests.rs)

- Add a test for symlink-style archive rejection.
- Expand backend coverage around security-sensitive archive behavior where
  practical.

#### [MODIFY] [schema_validation.rs](/mnt/d/Projects/kuro-viewer/src-tauri/src/plugin_install/schema_validation.rs)

For Phase 1, explicitly disallow plugin-defined regex validation in
`settings.schema.json` string fields:

- reject schemas that provide `pattern`
- fail closed with a clear validation error
- keep string settings limited to default, min length, and max length

Reasoning:

- the current frontend runtime would otherwise need to execute plugin-supplied
  regex via `new RegExp(...)`
- we do not have a safe-regex contract or engine-level guardrails yet
- disallowing `pattern` is the cleanest safe 1.0 behavior

### Install Metadata

#### [MODIFY] central host-owned plugin install metadata

Store install metadata in a single host-owned file:

- `plugins/index.json`

Keep it outside plugin contents and update it on install, upgrade, and
uninstall.

Recommended stored fields per plugin:

- `id`
- `version`
- `installed_at_unix_ms`
- `source_filename`
- `archive_sha256`

Why this shape:

- it keeps metadata clearly host-owned rather than plugin-owned
- it avoids custom `_provenance.json` sidecars inside every plugin directory
- it is easy to extend later if we add authoring tools, diagnostics, or a
  registry

## Explicit Non-Goals For Phase 1

- full plugin runtime loading for arbitrary frontend or backend plugins
- marketplace or registry behavior
- turning install metadata into a trust or signature system
- hotkey conflict resolution beyond simple disable gating

## Verification Plan

### Automated Checks

Frontend:

```bash
pnpm typecheck
pnpm check
```

Backend:

```bash
cd src-tauri
cargo test --lib
```

### Manual Verification

These require the Tauri app path, not browser-only dev mode.

1. Install a plugin and verify it appears enabled by default.
2. Disable the plugin in Settings and verify the row shows `Disabled`, the
   Configure action is unavailable, and the row is visually dimmed.
3. Close and reopen the modal without applying and verify the disable change is
   discarded.
4. Apply the disable change and verify it persists after reopening Settings.
5. Restart the app and verify the disabled state persists.
6. If the built-in forensics plugin is disabled, verify its hotkeys and runtime
   behavior no longer activate.
7. Uninstall a disabled plugin and verify its ID is removed from
   `disabledPlugins`.
8. Attempt installation from a malicious or synthetic symlink-style archive and
   verify install fails cleanly.
9. Attempt to load a plugin settings schema that uses `pattern` on a string
   field and verify Configure fails closed with a clear validation error.
10. Install, upgrade, and uninstall a plugin and verify `plugins/index.json`
    tracks the entry lifecycle correctly.

## Open Decisions

These are the only decisions I think still matter before implementation:

- whether built-in plugins should use the exact same disable model as installed
  plugins from day one
- the exact fallback behavior when the active plugin is disabled while in use
  for example resetting to a neutral mode versus preserving visible state until
  the next interaction

My default recommendation:

- yes, built-ins should follow the same disable model
- if a currently active plugin is disabled, reset immediately to safe neutral
  host behavior
