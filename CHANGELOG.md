# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
