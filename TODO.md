### Random TODOs

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

### Near-term Execution

#### Settings Completion

- [ ] Settings: Implement **Language** tab
- [ ] Settings: Implement **Edit** tab (crop/save/caption entry points)
- [ ] Settings: Implement **Plugins** tab
- [ ] Settings: Persist state on Apply (load on startup + baseline reset flow)
- [ ] Settings: Wire real Export/Import settings behavior (storage/backend bridge)

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

- [ ] Rust/Tauri Transition (Move away from WebUI to native Desktop App)
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

- [ ] Plugin foundation: API for tab registration, commands/hotkeys, and UI mounts
- [ ] Plugin foundation: enforce token namespace/fallback contract (`--plugin-<id>-*`)
- [ ] Plugin foundation: internal sample plugin scaffold
- [ ] Workspaces/profiles
- [ ] Forensics (comparison/flicker/diff plugin surface)
