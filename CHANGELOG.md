# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-02-03

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

- Frontend: Resolved "SettingToggle" styling regression where track was collapsing.
- Backend: Cleaned up unused imports in `main.py`.
- Backend: Fixed syntax and type hinting in `metadata_utils.py`.
