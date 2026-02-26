# 🗺️ Kuro Viewer Roadmap

This document outlines the long-term vision and development phases for Kuro Viewer as it transitions from a web-based prototype to a high-performance native desktop application.

## 🚀 Phase 3: Desktop Evolution (Tauri Transition)

The goal is to move away from the Python/React web server model to a self-contained Rust-powered native app.

- **[ ] Rust/Tauri Transition**: Port the backend logic to Rust for better startup speed and memory efficiency.
- **[ ] Native UX**: Implement Frameless Glass UI (Acrylic/Mica) and system-level window management.
- **[ ] Global Hotkeys**: Support for viewer controls even when the app is out of focus.
- **[ ] Drag-and-Drop Bridge**: Native bridge to drag images directly into Photoshop, GIMP, or Discord.

## ⚙️ Settings Content (High-Fidelity Implementation)

Each setting tab will be implemented with the "General" tab's premium design standard.

The exact prompt is:

```plaintext
Also check the equivalent reference image for the current tab you're working on but prioritize your own plan and the best direction for our app, we can always add more settings later on, this is just for what we'll need to work on the backend for sure

Also keep in mind function scope and file organization in the repo. The script might grow too long, but I'm not familiar with safe/manageable lengths for js code so I'll trust your judgment
```

- **[x] Appearance**: Theme selection, Backdrop styles (Acrylic/Mica), and Accent color picking.
- **[x] Layout**: Grid vs. List behavior, Sidebar positioning, and Auto-hide toolbar logic.
- **[x] Slideshow**: Detailed transition controls, Shuffle/Loop modes.
- **[x] Controls**: Shortcut remapping and mouse wheel behavior customization.
- **[x] File Types**: System-level extension associations and default opener settings.
- **[x] Content**: Library monitoring paths and metadata deep-scanning (CLIP semantic search).
- **[x] Privacy**: History management and anonymous telemetry toggles.
- **[ ] Language**: Localization preferences, locale fallback behavior, and date/number formatting rules.
- **[ ] Edit**: Core edit entry points for crop/save/caption workflows.
- **[ ] Plugins**: Plugin discovery and management surface.
- **[ ] Persistence Wiring**: Apply/save/load lifecycle for settings and real Export/Import behavior.

## ✂️ Core Edit MVP (Default Experience)

The default app should provide quick, non-destructive edits without requiring plugins.

- **[ ] Non-destructive Crop**: Crop geometry stored in sidecar/state first, with reversible behavior.
- **[ ] Save Flows**: `Save As`, `Save Copy`, and `Copy to Clipboard` (no destructive overwrite by default).
- **[ ] Caption/Notes Baseline**: Lightweight notes persisted via sidecar schema.

## 🔌 Plugin Foundation

Forensics and advanced editing should build on a stable plugin host contract.

- **[ ] Plugin API Surface**: Tab registration, command/hotkey hooks, and UI mount points.
- **[ ] Theme Contract Enforcement**: Namespace + fallback guarantees for plugin tokens (`--plugin-<id>-*`).
- **[ ] Internal Reference Plugin**: Ship one sample plugin to validate lifecycle and UI integration.

## ⚡ Performance & Plugin Forensics

- **[ ] Thumbnail Pre-generation**: Rust background job to pre-cache thumbnails using WebP.
- **[ ] List Virtualization Hardening**: Stress test and stabilize large-library behavior (selection sync, scroll consistency).
- **[ ] GPU Decoding**: Leverage `opencv` & `ndarray` crates for high refresh rate smooth pan/zoom.
- **[ ] Forensics Plugin (Optional, Non-Default Experience)**:
  - Side-by-side synced multi-view (locked zoom/pan).
  - Rapid flicker comparison (hotkey toggle).
  - Difference overlays / image subtraction.

## 📂 UX & Organization

- **[ ] Sidecar Support**: Non-destructive edits saved in `.json` or `.xmp` files.
- **[ ] Prompt List Virtualization**: Handle 100,000+ files instantly using `react-virtuoso`.
- **[ ] Embedding Search**: Local CLIP model for searching images by natural language descriptions.
- **[ ] Frontend Runtime Adapters**: Route file/system behavior through portable adapters for Tauri migration.
- **[ ] Sidecar Schema Stability**: Define versioning + migration policy for long-term compatibility.
- **[ ] Rust Parity Plan**: Map current Python analysis/edit pipelines to Rust equivalents with phased cutover.
