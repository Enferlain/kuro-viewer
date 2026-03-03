# 🗺️ Kuro Viewer Roadmap

This document outlines the long-term vision and development phases for Kuro Viewer — a high-performance native desktop image viewer built with Tauri (Rust) and React.

## 📊 Delivery State Model

To avoid ambiguous progress tracking, roadmap items use these states:

- **UI**: Screen/interaction implemented in frontend.
- **Wired**: Connected to real persistence/backend/native behavior.
- **Prod**: Guardrailed and verified (validation, tests, failure handling).

## ⚙️ Settings Content (High-Fidelity Implementation)

Each setting tab will be implemented with the "General" tab's premium design standard.

The exact prompt is:

```plaintext
Also check the equivalent reference image for the current tab you're working on but prioritize your own plan and the best direction for our app, we can always add more settings later on, this is just for what we'll need to work on the backend for sure

Also keep in mind function scope and file organization in the repo. The script might grow too long, but I'm not familiar with safe/manageable lengths for js code so I'll trust your judgment
```

- **[x] Appearance**: Theme selection, Backdrop styles (Acrylic/Mica), and Accent color picking. _(UI: done, Wired: pending, Prod: pending)_
- **[x] Layout**: Grid vs. List behavior, Sidebar positioning, and Auto-hide toolbar logic. _(UI: done, Wired: pending, Prod: pending)_
- **[x] Slideshow**: Detailed transition controls, Shuffle/Loop modes. _(UI: done, Wired: pending, Prod: pending)_
- **[x] Controls**: Shortcut remapping and mouse wheel behavior customization. _(UI: done, Wired: pending, Prod: pending)_
- **[x] File Types**: System-level extension associations and default opener settings. _(UI: done, Wired: pending, Prod: pending)_
- **[x] Content**: Library monitoring paths and metadata deep-scanning (CLIP semantic search). _(UI: done, Wired: pending, Prod: pending)_
- **[x] Privacy**: History management and anonymous telemetry toggles. _(UI: done, Wired: pending, Prod: pending)_
- **[x] Language**: Localization preferences, locale fallback behavior, and date/number formatting rules. _(UI: done, Wired: pending, Prod: pending)_
- **[x] Edit**: Core edit entry points for crop/save/caption workflows. _(UI: done, Wired: pending, Prod: pending)_
- **[x] Plugins**: Plugin installation and management surface in Settings (list/install/uninstall + drop zone). _(UI: done, Wired: partial, Prod: partial; discovery/marketplace pending)_
- **[ ] Persistence Wiring**: Apply/save/load lifecycle for settings is wired; real Export/Import backend behavior remains. _(UI: done, Wired: partial, Prod: partial)_

## 🚀 Rust/Tauri Core

The backend is pure Rust via Tauri — no Python dependency in the core app.

- **[x] Tauri Scaffolding**: Initialize `src-tauri/` with Tauri v2 and build pipeline. _(IPC surface still early-stage)_
- **[ ] Native Image Decoding**: `image` crate for standard formats (JPEG, PNG, WebP, TIFF), `libvips` bindings for RAW/high-performance decoding.
- **[ ] Native UX**: Frameless Glass UI (Acrylic/Mica) and system-level window management.
- **[ ] Global Hotkeys**: Support for viewer controls even when the app is out of focus.
- **[ ] Drag-and-Drop Bridge**: Native bridge to drag images directly into Photoshop, GIMP, or Discord.

## 🔌 Plugin System

Plugins extend the app with any feature — filters, UI panels, AI tools, format converters, or anything else. The core ships with no plugins; all extensions are user-installed.

### Architecture

- **[ ] Plugin Host (`wasmtime`)**: Initialize the WASM engine, load/unload plugins, manage the `PluginBackend::Wasm` and `PluginBackend::PythonSubprocess` dual model.
- **[ ] `.plugin` Archive Format**: ZIP containing `plugin.json` manifest + `backend.wasm` + `frontend.js`. Unpacked to `AppData/plugins/<id>/` on install.
- **[x] Manifest Contract**: Define `plugin.json` schema — id, name, version, slots, permissions, backend type (`wasm` | `python-subprocess`), API/theme contract targeting. _(Backend validation wired; frontend authoring/docs still evolving)_
- **[ ] Frontend Plugin Registry**: `PluginRegistry.ts` + `PluginSlot.tsx` + `React.lazy` dynamic loading. Slot types: `toolbar`, `sidebar`, `panel`, `context-menu`.
- **[ ] Lazy Initialization**: Only read `plugin.json` at startup. Load WASM/JS/Python on first use — zero startup overhead regardless of plugin count.

### Distribution

- **[x] Sideloading**: "Install from file…" and drag-and-drop `.plugin` install flow in the Plugins settings tab. _(UI: done, Wired: done, Prod: partial)_
- **[ ] In-App Marketplace**: Built-in plugin browser in the Plugins settings tab, backed by a remote registry (e.g., GitHub-hosted `index.json`).
- **[x] Install/Uninstall Flow**: Tauri commands + Plugins tab integration to unpack, register, and remove plugins with no app restart required. _(UI: done, Wired: done, Prod: partial)_

### Safety & Contracts

- **[ ] Theme Contract Enforcement**: Namespace + fallback guarantees for plugin tokens (`--plugin-<id>-*`).
- **[ ] WASM Sandbox**: Plugins cannot access filesystem, network, or OS unless explicitly granted via host imports.
- **[ ] Permissions Model**: Plugins declare required capabilities in `plugin.json`. Shown to user on install.
- **[ ] Internal Reference Plugin**: Ship one sample WASM plugin to validate the full lifecycle and UI integration.

## ✂️ Core Edit MVP (Default Experience)

The default app should provide quick, non-destructive edits without requiring plugins.

- **[ ] Non-destructive Crop**: Crop geometry stored in sidecar/state first, with reversible behavior.
- **[ ] Save Flows**: `Save As`, `Save Copy`, and `Copy to Clipboard` (no destructive overwrite by default).
- **[ ] Caption/Notes Baseline**: Lightweight notes persisted via sidecar schema.

## ⚡ Performance

- **[ ] Thumbnail Pre-generation**: Rust background job to pre-cache thumbnails using WebP.
- **[ ] List Virtualization Hardening**: Stress test and stabilize large-library behavior (selection sync, scroll consistency).
- **[ ] GPU Decoding**: Leverage Rust `image`/`wgpu` for high refresh rate smooth pan/zoom.

## 📂 UX & Organization

- **[ ] Sidecar Support**: Non-destructive edits saved in `.json` or `.xmp` files.
- **[ ] List Virtualization**: Handle 100,000+ files instantly using `react-virtuoso`.
- **[ ] Embedding Search**: Local CLIP model (as a plugin) for searching images by natural language descriptions.
- **[ ] Sidecar Schema Stability**: Define versioning + migration policy for long-term compatibility.

## 🔬 Forensics Plugin (Optional)

Forensics is a plugin, not a core feature. It builds on the plugin system once stable.

- **[ ] Side-by-side synced multi-view** (locked zoom/pan).
- **[ ] Rapid flicker comparison** (hotkey toggle).
- **[ ] Difference overlays / image subtraction**.
