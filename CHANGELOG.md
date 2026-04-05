# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-04-05

### Changed

- Frontend/Backend/Settings: **Inspect source opening now supports editor line jumps across common and custom setups** (`DevTools.tsx`, `InspectTab.tsx`, `SettingsModal.tsx`, `EditTab.tsx`, `settingsSchema.ts`, `src-tauri/src/devtools.rs`, `src-tauri/Cargo.toml`) — Inspect now passes tagged source line metadata through to the backend, auto-detects common editor families for goto-style launch arguments, and adds optional per-editor argument templates so non-standard editor setups can still jump to the selected source location.
- Frontend/Devtools: **Inspect tab selection now persists across tab switches** (`DevTools.tsx`, `InspectTab.tsx`) — lifted `selectedElement` state from `InspectTab` into the parent `DevTools` shell so inspected element details survive tab navigation instead of clearing on unmount.
- Frontend/Devtools: **Inspect tab is now source-aware for tagged app surfaces** (`InspectTab.tsx`, `inspectTargets.ts`, `App.tsx`, `Toolbar.tsx`, `ImageViewer.tsx`, `ThumbnailStrip.tsx`, `MetadataModal.tsx`, `SettingsModal.tsx`) — click-to-inspect now resolves the nearest tagged host owner, shows source/context details, and enables `Open in Editor` for mapped repo files instead of logging a placeholder.
- Backend/Devtools: **Inspect source opening now has a safe repo-relative command** (`src-tauri/src/devtools.rs`, `src-tauri/src/lib.rs`) — added `open_repo_source_path` with repository-root path validation so inspect can open mapped source files without exposing arbitrary filesystem traversal.
- Tooling/Plugins: **Workspace plugins now have a supported build/package helper flow** (`package.json`, `scripts/plugin-workspace.mjs`, `src-tauri/src/workspace_packaging.rs`, `src-tauri/src/bin/workspace_plugin_packager.rs`) — added `pnpm plugin:build <id>` to bundle `src/index.*` into the manifest’s frontend entry under `plugins/.build/`, plus `pnpm plugin:pack <id>` to validate and emit `plugins/dist/<id>-<version>.plugin` without shipping `src/`.
- Docs/Devtools: **Workspace scaffold guidance now matches the real author workflow** (`docs/PLUGIN_WORKSPACE_DEV.md`, `src-tauri/src/devtools.rs`, `implementation_plan.md`, `conductor/tracks/plugin_devtools_20260322/plan.md`) — generated scaffold READMEs now point at the new build/package steps, and the plugin-devtools track docs now treat packaging as part of the supported loop.
- Frontend/Devtools: **Plugin cards now expand on click to reveal action buttons** (`PluginsTab.tsx`) — Reload, Folder, Source, and Manifest buttons are hidden by default and appear when a plugin card is clicked, with a rotating chevron indicator and accent border highlight on the selected card.
- Frontend/Devtools: **Create panel no longer pushes content out of scrollable view** (`PluginsTab.tsx`, `DevTools.tsx`) — fixed nested flex overflow chain by propagating `min-h-0` through all ancestor flex containers and changing the tab content wrapper from `overflow-y-auto` to `overflow-hidden` so the inner scroll area properly constrains. Opening the Create panel now also auto-scrolls to top.
- Frontend/Devtools: **Plugin card actions bar simplified** (`PluginsTab.tsx`) — removed the redundant "Actions" label and nested `justify-between` layout that was cramping buttons and pushing Manifest off-screen; replaced with a flat `flex-wrap` row.

### Fixed

- Backend/Devtools: **Inspect editor jumps now normalize launch paths before building goto arguments** (`src-tauri/src/devtools.rs`) — fixed `Open in Editor` on Windows setups where repo-relative source paths resolved through verbatim `\\?\...` paths, which caused VS Code and similar editors to reject `--goto` targets instead of opening the file at the tagged line.
- Frontend/Devtools: **Inspect tab content was clipped without scrollbar when element info overflowed** (`DevTools.tsx`) — changed tab content container from `overflow-hidden` to `overflow-y-auto` so the full Inspect tab scrolls when content exceeds panel height.
- Frontend/Devtools: **Plugin action buttons were invisible when card was selected** (`PluginsTab.tsx`) — removed `overflow-hidden` from plugin cards that was clipping the dynamically-rendered actions bar; rounded corners are preserved via `border-radius` alone.

## [Unreleased] - 2026-04-04

### Changed

- Frontend/Devtools: **Plugin Devtools now supports real workspace authoring actions** (`src/components/devtools/tabs/PluginsTab.tsx`, `src/components/devtools/useWorkspacePlugins.ts`) — the `Plugins` tab can now create starter workspace plugins, open their folders/source, and makes the still-unimplemented registration path explicitly disabled instead of logging placeholder text.
- Backend/Devtools: **Workspace plugin scanning and scaffold generation are now host-backed** (`src-tauri/src/devtools.rs`, `src-tauri/src/lib.rs`, `src-tauri/src/plugin_install.rs`, `src-tauri/src/plugin_install/schema_validation.rs`) — dev mode now scans `plugins/` from the filesystem, validates workspace manifests plus settings schemas through the host contract, and exposes Tauri commands for scaffold creation plus folder/editor opening.
- Docs/Planning: **Plugin devtools planning was advanced to the scaffold/open-source loop** (`implementation_plan.md`, `conductor/tracks/plugin_devtools_20260322/plan.md`, `conductor/tracks/plugin_devtools_20260322/metadata.json`) — updated the active implementation slice and marked the scaffold/action work as in progress/completed where applicable.

## [Unreleased] - 2026-03-23

### Changed

- Frontend: **Forensics is no longer built into the host app** (`App.tsx`, `ImageViewer.tsx`, `Toolbar.tsx`, `src/plugin-system/settings/registry.ts`, `src/stores/settings/settingsSchema.ts`) — removed the in-app forensics runtime, settings registration, and viewer wiring so the base app no longer ships forensics behavior directly.
- Plugins/Workspace: **Forensics was extracted into a standalone workspace plugin package** (`plugins/forensics-suite/*`) — moved the remaining frontend/plugin-shaped forensics code into its own plugin folder with manifest, schema, and source entrypoints instead of leaving host-owned copies in `src/`.
- Frontend/Devtools: **Plugin Devtools shell now exists as a separate dev-only surface** (`src/components/devtools/*`, `src/App.tsx`) — added a floating draggable developer panel with workspace-focused `Plugins`, `Inspect`, `State`, and `Logs` tabs rather than overloading the user-facing Settings UI.
- Frontend/Devtools: **Workspace plugin discovery is now live in the app shell** (`src/components/devtools/useWorkspacePlugins.ts`, `src/components/devtools/tabs/PluginsTab.tsx`) — dev mode can now discover `plugins/*/plugin.json`, summarize manifest/schema health, and expose a first-pass reload/inspection workflow for local plugin development.
- Docs/Planning: **Plugin development now has its own conductor track** (`conductor/tracks/plugin_devtools_20260322/*`, `conductor/tracks.md`, `implementation_plan.md`) — split plugin authoring/devtools work out from the plugin-system closeout track and documented the initial workspace/devtools direction.

## [Unreleased] - 2026-03-21

### Changed

- Frontend/Settings: **Plugin enable/disable lifecycle is now persisted in app settings** (`settingsSchema.ts`, `SettingsModal.tsx`, `PluginsTab.tsx`) — disabled plugins now live under `plugins.disabledPlugins`, follow the same Apply/Cancel flow as other settings, hide Configure when inactive, and present clearer state in the Plugins tab.
- Frontend/Runtime: **Built-in forensics plugin disable now affects real app behavior** (`App.tsx`) — disabling the plugin now neutralizes active forensic modes, suppresses plugin hotkeys/runtime actions, and removes stale plugin-owned state instead of only changing settings UI.
- Backend: **Install metadata is now host-owned and centralized** (`plugin_install.rs`) — installs/upgrades/uninstalls now maintain `plugins/index.json` with plugin id, version, source filename, install timestamp, and archive SHA-256.
- Backend: **Settings schema string regex validation is now explicitly unsupported in 1.0** (`plugin_install/schema_validation.rs`, `schemaRuntime.tsx`) — the host now rejects string-field `pattern` in `settings.schema.json` and no longer executes plugin-supplied regex in the frontend runtime.

### Added

- Backend tests: **Plugin lifecycle/install metadata coverage** (`plugin_install/tests.rs`) — added regression coverage for symlink-entry archive rejection, string-pattern schema rejection, and `plugins/index.json` creation/update/cleanup across install and upgrade flows.

- Docs: **Settings schema 1.0 surface tightened** (`docs/schemas/plugin-settings.schema.json`, `docs/PLUGIN_CONTRACT_1.0.md`) — string-field `pattern` is now documented as unsupported in host 1.0, and install metadata plus lifecycle support are reflected in the contract.
- Docs: **Plugin Phase 1 closeout docs refreshed** (`plugin_system_implementation_plan.md`, `conductor/tracks/plugin_system_20260321/*`) — synced the remaining plan and track state with shipped lifecycle, hardening, and install-metadata behavior.

## [Unreleased] - 2026-03-05

### Changed

- Frontend/Settings: **Installed plugin settings persistence is now host-backed** (`App.tsx`, `settingsSchema.ts`, `SettingsModal.tsx`, `PluginsTab.tsx`) — plugin settings now persist under `plugins.installedSettings`, follow Apply/Cancel draft semantics, and are pruned on uninstall.
- Frontend/Backend: **Settings schema validation is now host-enforced** (`plugin_install.rs`, `PluginsTab.tsx`) — added `validate_plugin_settings_schema` command and fail-closed UI behavior (invalid schemas hide Configure and show an actionable error banner).
- Backend: **Plugin install module refactor** (`plugin_install.rs`, `plugin_install/schema_validation.rs`, `plugin_install/tests.rs`) — split installer runtime logic, schema contract validation, and unit tests into focused submodules for maintainability.
- Backend: **Server-side archive extension guard** (`plugin_install.rs`, `plugin_install/tests.rs`) — inspect/install paths now reject non-`.plugin` archives before extraction and include explicit tests for invalid extension rejection.
- Backend: **Clippy cleanup** (`plugin_install.rs`, `plugin_manifest.rs`) — removed needless borrows and replaced manual `Default` impl for `PluginBackend` with derive + `#[default]`.

### Added

- Backend tests: **Schema/security coverage expansion** (`plugin_install/tests.rs`) — added validation-path tests for settings schema contract and explicit read-path security checks (invalid plugin id, missing `plugin.json`, oversized `settings.schema.json`).
- Docs: **Plugin contract status split + fallback behavior** (`docs/PLUGIN_CONTRACT_1.0.md`) — now explicitly marks implemented vs planned capabilities and documents invalid/missing schema fallback behavior.
- Docs: **Settings schema limits updated** (`docs/schemas/plugin-settings.schema.json`) — added host-aligned `maxItems` caps for sections/fields/options and `pattern.maxLength`.

## [Unreleased] - 2026-03-04

### Changed

- Frontend: **Forensics plugin controls expanded** (`forensicsPlugin.ts`, `ForensicsPanel.tsx`, `settingsExtension.tsx`) — added plugin-level behavior toggles (`side-by-side compare`, `show output score`) and plugin-configurable mode hotkeys (`Original/Noise/PCA/Texture`) with duplicate-hotkey warning.
- Frontend: **Forensics settings UI overhaul** (`ForensicsPanel.tsx`) — flattened the nested "onion" border layout into clean divider-separated sections. Reordered controls logically, added numeric value readouts to sliders, fixed phrasing, and swapped plain-text hotkey inputs for `KeyRecorder`-style buttons that capture keypresses.
- Frontend: **ImageViewer forensic magnifier fix** (`ImageViewer.tsx`) — removed `mixBlendMode: "screen"` from the magnifier lens and added a solid background to prevent the filtered view from becoming transparent against the background.
- Frontend: **Forensics defaults/ranges aligned** (`forensicsPlugin.ts`, `ForensicsPanel.tsx`) — Noise amplitude now uses `1..100` (default `1`) and Noise opacity uses `0.00..1.00` (default `0.95`), with normalization/clamping in settings migration.
- Frontend: **Forensics hotkey runtime wiring** (`App.tsx`, `Toolbar.tsx`) — mode switching now uses configured plugin hotkeys at runtime, and toolbar tooltips/readout reflect configured bindings plus score visibility toggle.
- Frontend: **ImageViewer forensic presentation update** (`ImageViewer.tsx`) — magnifier lens is now square and offset to the lower-right of cursor; added optional side-by-side filter presentation (right-half overlay with center divider).
- Docs: **Forensics finish tracker refreshed** (`implementation_plan.md`) — converted to a phase-based checklist covering spec alignment, reference parity against `ref_functions`, packaging readiness, and manual QA matrix.
- Docs: **Plugin 1.0 authoring contract** (`docs/PLUGIN_CONTRACT_1.0.md`, `docs/schemas/plugin-settings.schema.json`) — added a detailed plugin packaging/manifest/frontend/settings/backend contract, including declarative settings schema format, worked examples, and explicit configure-surface rules (`inline` host expansion vs host modal).
- Frontend: **Removed hardcoded contract demo plugin registration** (`registry.ts`) — `contract-demo` is no longer injected as a built-in plugin/settings definition and must be tested through the install flow.
- Frontend/Backend: **Installed plugin Configure now supports declarative schemas** (`PluginsTab.tsx`, `schemaRuntime.tsx`, `plugin_install.rs`) — host loads `settings.schema.json` from installed plugins and renders a contract-driven settings UI (`boolean`, `number`, `enum`, `string`, `keybinding`) for Configure.
- Frontend: **Plugins tab management actions** (`PluginsTab.tsx`) — added explicit `About` and `Remove` actions per installed plugin. `Remove` now uses shared `ConfirmDialog` for destructive confirmation.
- Frontend: **Plugin About modal** (`PluginsTab.tsx`, `pluginManifest.ts`) — added a host-owned plugin details modal showing description, author, source/docs links, usage notes, backend, slots, and permissions.
- Backend/Contracts: **Manifest metadata fields for About view** (`plugin_manifest.rs`, `docs/schemas/plugin-manifest.schema.json`) — added optional `author`, `source_url`, `docs_url`, and `usage` fields with host-side validation.

### Added

- Examples: **Installable contract sample plugin** (`plugins/examples/contract-demo/*`) — added `plugin.json`, `settings.schema.json`, and `frontend.js` stub demonstrating Plugin 1.0 contract + settings schema conventions.

### Changed

- Frontend: **Safer plugin install UX** (`PluginsTab.tsx`) — file-picker and drag-drop flows now inspect manifests first, then require explicit user confirmation before install. The confirmation card shows plugin id/name/version/backend and declared permissions.
- Backend: **Pre-install manifest inspection command** (`plugin_install.rs`, `lib.rs`) — added `inspect_plugin_manifest` Tauri command for archive preflight manifest validation without extraction/install side effects.
- Frontend: **Viewer forensic controls extracted into plugin module** (`plugin-system/forensics/`) — introduced typed forensics plugin state/defaults/hotkeys and mode metadata driving toolbar behavior and control panel rendering.
- Frontend: **Toolbar forensic integration** (`Toolbar.tsx`, `App.tsx`) — mode actions now include `Original/Noise/PCA/Texture` with plugin hotkeys (`O/N/P/M`), mode cycling (`[` and `]`), score readout, and a dedicated forensic controls panel toggle.
- Frontend: **ImageViewer forensic rendering** (`ImageViewer.tsx`) — added filtered forensic overlay with per-mode opacity, cursor magnifier lens, and heuristic mode scoring pipeline for noise/PCA/texture output.

### Added

- Backend: **Phase 2 hardening tests** (`plugin_install.rs`) — added coverage for archive traversal-entry rejection, archive entry-count cap rejection, archive uncompressed-size cap rejection, duplicate `plugin.json` post-extract mismatch rejection, and rollback restoration behavior when finalize rename fails.
- Frontend: **Forensics plugin controls panel** (`ForensicsPanel.tsx`) — Noise controls (`rembg` optional, amplitude, equalize histogram, opacity), PCA controls (input, mode, component, linearize, invert, enhancement, opacity), Texture controls (mode, strength, smoothness, enhancement, opacity), and magnifier controls.

## [Unreleased] - 2026-03-03

### Changed

- Backend: **Plugin install hardening** (`plugin_install.rs`) — full manifest equality check post-extraction (added `PartialEq` to `PluginManifest` + `PluginBackend`), chunk-by-chunk runtime byte cap during file writes (8 KiB buffer with per-chunk limit enforcement), rollback-safe atomic upgrade with surfaced rollback failure context, fail-closed archive preflight with `checked_add` and early exit, and logged event emission failures.
- Backend: **Plugin install testability refactor** (`plugin_install.rs`) — extracted pure path-based core functions (`install_plugin_in_dir`, `list_plugins_in_dir`, `uninstall_plugin_in_dir`) with no `AppHandle` dependency. Tauri commands are now thin wrappers that resolve paths and emit events. Fixed extraction loop-brace bug. Changed `&PathBuf` params to idiomatic `&Path`.
- Backend: **Settings write fallback** (`settings.rs`) — fixed direct-write fallback so a successful fallback no longer returns an error; added temp-file cleanup.
- Frontend: **localStorage corruption recovery** (`settingsService.ts`) — corrupt JSON in browser fallback is cleared after migration fallback to prevent repeated parse failures.

### Added

- Frontend: **Plugin Contract Inspector** (`PluginsTab.tsx`) — Settings > Plugins tab with installed plugins table (hover-reveal uninstall), "Install Plugin…" button with strict file path validation, drag-and-drop install via Tauri's native `onDragDropEvent` with ref-based drop zone hit-testing (`isDropPositionInZone` using DPI-scaled coordinates), inline status/error banners, and auto-refreshing via race-safe event subscription. Host Contract section is dev-only. Browser mode skips Tauri calls and disables install.
- Backend: **Plugin install unit tests** (`plugin_install.rs`) — install/list/uninstall roundtrip, same-version install rejection, invalid plugin ID rejection on uninstall, `.staging-*` and `.backup-*` directory filtering in list.

## [Unreleased] - 2026-02-28

### Added

- Contracts: **Plugin Manifest JSON Schema** (`docs/schemas/plugin-manifest.schema.json`) — formal contract for `plugin.json` with conditional validation rules per backend type.
- Backend: **Rust manifest model + validation** (`plugin_manifest.rs`) — semver checks, plugin ID enforcement, path traversal guards, and security-focused tests (traversal rejection, `backend: none` with `backend_entry` rejection).
- Backend: **Tauri IPC hooks** for plugin contract info and manifest validation in `lib.rs`.
- Backend: **Settings persistence** (`settings.rs`) — `read_settings` / `write_settings` Tauri commands with atomic temp-file-rename writes and corrupt-file recovery.
- Frontend: **Typed settings schema** (`settingsSchema.ts`) — versioned `AppSettingsV1` with defaults, legacy flat-state migration, and V1 fast-path normalization.
- Frontend: **Settings service boundary** (`settingsService.ts`) — `loadSettings()` / `saveSettings()` abstraction over Tauri IPC, with browser `localStorage` fallback for dev.
- Frontend: **Settings context** (`SettingsContext.tsx` + `useSettings.ts`) — loads settings at app startup, provides typed access to the entire component tree.
- Backend: **Plugin install flow** (`plugin_install.rs`) — `install_plugin` (ZIP validation → staged extraction → post-extraction manifest re-validation → rollback-safe atomic upgrade), `list_plugins` (scan installed manifests), `uninstall_plugin` (plugin ID validation + safety-checked removal). Includes archive resource limits (500 entries, 50 MiB cap with fail-closed checks), path traversal protection via `enclosed_name()`, and `plugin-installed`/`plugin-uninstalled` event emission.
- Dependency: Added `@tauri-apps/api` v2.10.1 and `zip` crate.

### Changed

- Frontend: **SettingsModal refactored** — replaced ~40 individual `useState` calls with context-backed draft pattern using `useField` helper. Apply now persists to disk.
- Structure: Moved settings data layer from `src/settings/` → `src/stores/settings/` to disambiguate from `src/components/settings/` (UI).
- Docs: Normalized `ROADMAP.md` and `TODO.md` state language to **UI / Wired / Prod** delivery model; aligned completed UI items.

## [Unreleased] - 2026-02-27

### Added

- Architecture: **Tauri v2 Backend** scaffolded (`src-tauri/`) — Rust-native backend replacing the Python/FastAPI prototype.
- Architecture: Defined **WASM + Python-subprocess dual plugin model** in updated `AGENTS.md` and `ROADMAP.md`.
- Theming: Added **Plugin Theming** contract (Section 9 in `THEME_CONTRACT.md`) — automatic inheritance, CSS scoping, contract version targeting, injection order, and themes-as-plugins.
- Tooling: `setup_msvc_env.ps1` helper to permanently configure MSVC build environment for Rust on Windows.

### Changed

- Tooling: Migrated from **npm** to **pnpm** for faster installs and disk efficiency.
- Architecture: `AGENTS.md` fully rewritten — backend is now Rust/Tauri + `wasmtime`, Python tooling scoped to plugin development only.
- Architecture: `ROADMAP.md` restructured — Tauri is the active core (not a future migration), Plugin Foundation expanded with Architecture/Distribution/Safety subsections, Forensics moved to a plugin.
- Tooling: Removed Python backend scripts (`check:backend`, `format:backend`) from `package.json`.

## [Unreleased] - 2026-02-26

### Added

- Frontend: **Settings Search** autocomplete input in the settings modal header.
- Frontend: Implemented native smooth-scrolling navigation and a temporary glowing pulse animation (`data-highlight`) when jumping to search results.
- Architecture: Centralized `searchIndex.ts` registry to map search queries efficiently to component IDs.

### Changed

- UX: Standardized helper descriptions across all settings tabs for consistency.
- Styling: `SettingsSearch` dropdown aligned flush left with the input and matched perfectly to the core `Dropdown` component for consistent glassmorphism.

## [Unreleased] - 2026-02-22

### Added

- UX: **Gallery Hotkey ('G')** to instantly toggle the Thumbnail Strip visibility.
- UX: **Space+Drag Panning** in the ImageViewer for standard canvas navigation.
- UX: **Dynamic UI Refit** logic, allowing the image to smoothly scale and fill available space when modifying UI panels (like hiding the toolbar or gallery) as long as it isn't manually zoomed/panned.
- Documentation: Added `.agents/workflows/check-style-violations.md` with an explicit 3-file batch workflow for style audits/fixes, including both Bash and PowerShell command variants.

### Changed

- UX: **Zoom-to-Cursor** behavior in the ImageViewer, proportionally translating the image alongside scaling so the pixel under the mouse remains stationary.
- UX: Changed the default image hover cursor from `grab/move` to the standard default pointer.
- UX: Removed artificial padding constraints from the `fitToView` calculation, maximizing image area across the application layout.
- UX: Added missing standard `cursor-pointer` styles to the settings sidebar categories and close buttons.

- Styling: Completed a systematic semantic-token adherence pass for core viewer components (`App.tsx`, `ImageViewer.tsx`, `MetadataModal.tsx`, `ThumbnailStrip.tsx`, `Toolbar.tsx`).
- Styling: Completed the same adherence pass for reusable UI primitives (`Button.tsx`, `ConfirmDialog.tsx`, `Dropdown.tsx`, `SettingRow.tsx`) and settings shell (`SettingsModal.tsx`).
- Styling: Completed a full adherence pass across all settings tabs (`Appearance`, `CategoryStub`, `Content`, `Controls`, `FileTypes`, `General`, `Layout`, `Privacy`, `Slideshow`).
- Documentation: Clarified `STYLING_GUIDE.md` to explicitly allow semantic token opacity variants, require semantic tokens in inline style strings, document current naming ergonomics debt, and define the raw-hex exception for non-presentational data/state.

### Fixed

- Styling: Replaced lingering non-semantic utility usage (`text-white`, `hover:text-white`, raw red utility classes, `shadow-2xl`, and `bg-[#...]`) with semantic/tokenized alternatives.
- Styling: Removed remaining raw presentational color usage in targeted components while preserving intentional hex color values used only as color-picker data/state.
- Validation: Completed repo-wide style-pattern sweeps and type checks after each batch pass.

## [Unreleased] - 2026-02-21

### Added

- Frontend: **Universal ConfirmDialog Component** for standardizing destructive actions across the UI.
- Frontend: **Explicit Session State UI** in the Privacy tab to clearly visualize saved cursor/zoom interactions.
- Styling: Added future-ready structural token families in `src/styles/design-system.css` (layers, motion, density/sizing, material, and analysis/forensics).
- Documentation: Added `THEME_CONTRACT.md` to define required theme token surface, compatibility, and override boundaries.

### Changed

- UX: Centered and aligned the `ConfirmDialog` layout to match luxury modal aesthetics.
- Documentation: Synchronized `STYLING_GUIDE.md` with the exact token strategy and Tailwind v4 behaviors.
- Styling: Replaced hardcoded layer utilities with tokenized layer values in `App.tsx`, `Toolbar.tsx`, `MetadataModal.tsx`, `SettingsModal.tsx`, `Dropdown.tsx`, and `ConfirmDialog.tsx`.
- Styling: Replaced targeted fixed structural heights with semantic spacing/density tokens across shell controls, thumbnail strip/cards, and layout preview/drop-zones.
- Styling: Tokenized motion timing/easing in shared UI primitives (`Button`, `Dropdown`, settings rows/toggles) and settings tab entry animations.

### Fixed

- Styling: Added missing semantic wrapper tokens (e.g., `text-foreground-subtle`, `text-status-success`) to `design-system.css`.
- Styling: Expanded token bridge coverage in `design-system.css` for background, text, accent, border, and status families.
- Styling: Fixed critical silent failures in `index.css` where custom scrollbars and selections were referencing undefined variables.
- Styling: Replaced hardcoded HEX/Tailwind opacity colors (e.g., `bg-black/40`, `text-red-400`) in modals and toggles with compliant semantic `--ui-` tokens.
- Styling: Completed validation sweep for targeted legacy patterns; no remaining hardcoded `z-10/20/50/100`, targeted fixed-height utilities, or literal `duration-200/300` and `ease-out/ease-in-out` classes in `src/`.
- Tooling: Resolved remaining Biome formatting/import-order issues in settings files (`SettingsModal.tsx`, `PrivacyTab.tsx`).

## [Unreleased] - 2026-02-20

### Added

- Frontend: **Custom Dropdown Component** (`Dropdown.tsx`) to replace native HTML `<select>` elements, fixing OS styling artifacts and adhering to the Tailwind OKLCH design system.
- Tooling: **CSS Support in Biome** for native Tailwind directive parsing and formatting.

### Changed

- Frontend: Migrated the "Thumbnail Cache Limit" (General tab) and "Backdrop Style" (Appearance tab) settings to use the newly created custom `Dropdown` component.
- Frontend: Fully implemented **Slideshow** auto-play timing, loop controls, and custom playlist state interfaces within `SlideshowTab.tsx`.
- Frontend: Fully implemented **Controls** shortcut remapper within `ControlsTab.tsx`, adding mapping states for scrolling, modifier keys (`Ctrl`, `Shift`), spacebar triggers, and keybinds.
- UX: Systematized all nested Settings modal components (`General`, `Appearance`, `SlideShow`, `Controls`, `Layout`) to strictly use `--ui-glass-*` design tokens instead of hard-coded inline Tailwind Opacity strings.
- Tooling: Updated **Biome** to version `2.4.3` to resolve linter issues and improve CSS/Tailwind support.

## [Unreleased] - 2026-02-09

### Added

- **Tailwind v4 Build**: Transitioned from runtime CDN to a professional production build process using `@tailwindcss/vite`.
- **Engineering Standards**: Created [STYLING_GUIDE.md](file:///d:/Projects/kuro-viewer/STYLING_GUIDE.md) and updated [AGENTS.md](file:///d:/Projects/kuro-viewer/AGENTS.md) to formalize design system practices.
- **Standardized Transparency**: Added a dedicated `--palette-white-t*` scale for consistent glassmorphism and UI overlays.

### Changed

- **Full OKLCH Refactor**: Migrated the entire `design-system.css` from hardcoded HEX/RGBA to a peroxically consistent OKLCH palette.
- **3-Tier Design System**: Implemented a robust `Palette` (primitives) -> `UI` (semantic tokens) -> `@theme inline` (utility bridge) architecture.
- **Shadow Palette**: Replaced standard shadows with high-fidelity OKLCH primitives in `--palette-shadow-*`.
- **Variable Namespacing**: Refactored raw values to `--palette-*` and semantic intent to `--ui-*` to prevent conflicts with Tailwind v4 internals.

### Fixed

- **Settings Modal Restoration**: Successfully restored visual fidelity and exact UI layout from historical references.
- **Design System Correctness**: Fixed broken primary color references (`ruri`), missing transparency vars (`t05`), and circular shadow definitions.

## [Unreleased] - 2026-02-08

### Added

- Frontend: **Appearance** settings tab with Theme selection (Light/Dark/System), Window Backdrop effects (Acrylic/Mica), and Accent Color picker.
- Frontend: **Custom Theme Management** UI for adding, removing, and applying community theme packs.
- Frontend: **Layout** settings tab featuring an **Interactive Drag-and-Drop Builder**.
- Frontend: Direct-manipulation minimap for positioning **Toolbar** and **Gallery** components.
- Frontend: Clickable minimap sidebar for instant Left/Right positioning.
- Frontend: Polished visual feedback for layout builder (scaling, ghosting, drop zones).
- Tooling: Integrated **Biome** at the project root for unified linting and formatting.

### Changed

- Project: **Consolidated structure** by migrating `frontend/` to `src/` and moving all configurations (Vite, TS, Biome) to the project root.
- Frontend: **Accessibility Revamp**: Standardized all buttons with `type="button"`, replaced interactive `div`s with semantic `section`/`button` tags, and added proper ARIA roles.
- Frontend: Refactored Layout settings from select-menus to a visual interactive builder.
- Frontend: Restructured Layout tab to a vertical stack for better responsive behavior and clarity.
- UX: Streamlined settings by removing redundant layout controls and status tips.

### Fixed

- Tooling: Resolved over **120 Biome linting diagnostics** across the entire codebase.
- Frontend: Enhanced type safety by replacing `any` casts with specific interfaces and using `import type`.
- Frontend: Fixed **useExhaustiveDependencies** issues by wrapping handlers in `useCallback`.
- Frontend: Resolved UI clipping in Layout tab where the "Interactive Minimap" badge overlapped controls.
- Frontend: Removed redundant "Contextual Toolbar" references from state and UI.

## [0.2.0] - 2026-02-03

### Added

- Backend: `/metadata` endpoint for real PNG chunk parsing (SD/A1111, ComfyUI).
- Backend: `metadata_utils.py` for metadata extraction logic.
- Frontend: Resizable `SettingsModal` with persistence and viewport constraints.
- Frontend: High-fidelity **General** settings implementation (Startup, Monitoring, Performance).
- Frontend: `SettingGroup`, `SettingRow`, and `SettingToggle` reusable components.

### Changed

- Frontend: Expanded `SettingsModal` to **11 categories**, including Slideshow and Privacy.
- Frontend: Renamed "Tile Type Associations" to **"File Types"** for clarity.
- Frontend: Refined Toolbar with icon-only "Fit to Screen" action and updated tooltip.
- Frontend: Improved image switching performance by removing CSS transitions (instant "A/B" comparison).
- Frontend: Synchronized image navigation with viewer state reset in `App.tsx` (fixed visual "popping").
- Frontend: Capped automatic fitting scale at 1.0 (1:1) in `ImageViewer.tsx` to prevent blurring.

### Fixed

- Fixed unwanted transparency in Settings Modal introduced during modularization.

### Fixed

- Frontend: Resolved "SettingToggle" styling regression where track was collapsing.
- Backend: Cleaned up unused imports in `main.py`.
- Backend: Fixed syntax and type hinting in `metadata_utils.py`.
