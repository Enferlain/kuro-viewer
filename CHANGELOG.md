# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
