### Random TODOs

State tags used below:
- `UI`: Frontend visuals/interactions are implemented.
- `Wired`: Connected to real backend/native/storage.
- `Prod`: Validated, tested, and hardened.

- [ ] C hotkey for cropping/editing, save should copy to clipboard or save copy as, not replace
- [x] biome, ruff, ty for linting
- [/] docs (Added STYLING_GUIDE.md & updated AGENTS.md)
- [x] no animation when switching images, instant
- [x] all aspect ratios fitted to max possible space instead of random initial sizes (now with 1:1 scale cap)
- [x] Settings: **Appearance** tab implementation (Themes, Colors, Backdrops)
- [x] Settings: **Layout** tab implementation (Interactive drag-and-drop builder)
- [x] Settings: **Slideshow** transition and auto-play controls
- [x] Settings: **Controls** shortcut remapper
- [x] Settings: **General** tab - Build Export/Import settings logic & UI
- [x] Settings: **Controls** tab - Build `<KeyRecorder />` keystroke interception logic
- [x] Hover: Ensure all buttons, toggles, and dropdowns have explicit `cursor-pointer` styles
- [x] Settings Tabs Implementation: **File Types**, **Content**, **Privacy**
- [ ] Stats: About the image (color codes for background, dominant colors, etc.), maybe indexed for instant reuse
- [x] Settings: Apply only lights up when a setting changes
- [x] Controls: Default pan is space + drag. Default cursor is normal cursor, not pan cursor. Default zoom is to the cursor, not center of image.
- [x] Settings: Global Search mechanism (Highlight & Navigate) and Dropdown styling alignment
- [ ] Settings: SettingsModal scrollbar doesn't shift contents to left
- [ ] devtools: maybe always visible cute icon that brings it up either in a floating movable container like now, or like a dev console (vue devtools style). Leaning towards first one for now

### Near-term Execution

#### Settings Completion

- [x] Settings: Implement **Language** tab (`UI: done`, `Wired: pending`, `Prod: pending`)
- [x] Settings: Implement **Edit** tab (crop/save/caption entry points) (`UI: done`, `Wired: pending`, `Prod: pending`)
- [x] Settings: Implement **Plugins** tab (`UI: done`, `Wired: partial`, `Prod: partial`)
- [x] Settings: Persist state on Apply (load on startup + baseline reset flow) (`UI: done`, `Wired: done`, `Prod: partial`)
- [ ] Settings: Wire real Export/Import settings behavior (storage/backend bridge) (`UI: partial`, `Wired: pending`, `Prod: pending`)

#### Core Edit MVP (Default Experience)

- [ ] Non-destructive Crop (core)
- [ ] Save As / Save Copy / Copy to Clipboard (do not overwrite by default)
- [ ] Caption/Notes baseline with sidecar-backed persistence

### Future Roadmap & App Transition

#### Performance

- [ ] Thumbnail Pre-generation (Rust background job, WebP)
- [ ] List Virtualization (Handle 10,000+ files)
- [ ] Virtualization hardening (selection sync, scroll-to-item reliability, stress profiling)
- [ ] GPU Decoding (120Hz smooth pan/zoom)

#### Forensics Plugin (Optional, Non-Default Experience)

- [ ] Plugin: Synced Multi-View (Locked zoom/pan across multiple cards)
- [ ] Plugin: Flicker Comparison (Rapid toggle hotkey)
- [ ] Plugin: Difference Overlays (Image subtraction)

#### Metadata & AI

- [x] Hidden PNG Chunk Parsing (Backend implementation for SD/A1111 and ComfyUI)
- [ ] Embedding Search (Local CLIP model for semantic search)

#### Technical Stack Evolution

- [x] Rust/Tauri Transition baseline (Tauri v2 scaffolding + native shell in place)
- [ ] Port Scorer/Filters to Rust (Leverage `opencv` & `ndarray` crates)
- [ ] Sidecar support for non-destructive edits (.json/.xmp)
- [ ] File/system operation adapters (frontend decoupled from browser-only APIs)
- [ ] Stabilize sidecar schema versioning and migration strategy
- [ ] Rust parity plan for current Python image/analysis paths

#### UX & Native Integration

- [ ] Frameless Glass UI (Acrylic/Vibrant windows)
- [ ] Drag-and-drop bridge to external apps (Photoshop, etc.)
- [ ] Global hotkey support
- [ ] Note button/plugin/hotkey for persistent notes for images
- [ ] Comparison plugin/view (side-by-side, flicker, difference overlays; non-default)
- [ ] Check for consistent style usage in the components

#### Plugins

- [x] Plugin backend: install/list/uninstall commands with hardened extraction + manifest validation (`UI: done`, `Wired: done`, `Prod: partial`)
- [ ] Plugin foundation: API for tab registration, commands/hotkeys, and UI mounts (`UI: pending`, `Wired: pending`, `Prod: pending`)
- [ ] Plugin foundation: enforce token namespace/fallback contract (`--plugin-<id>-*`) (`UI: partial`, `Wired: pending`, `Prod: pending`)
- [ ] Plugin foundation: internal sample plugin scaffold (`UI: pending`, `Wired: pending`, `Prod: pending`)
- [ ] Workspaces/profiles
- [ ] Forensics (ask for more detail)
