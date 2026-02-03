### Random TODOs

- [ ] stats about the image (color codes for background, dominant colors, etc.), maybe indexed for instant reuse
- [ ] C hotkey for cropping/editing, save should copy to clipboard or save copy as, not replace
- [x] biome, ruff, ty for linting
- [ ] docs
- [x] no animation when switching images, instant
- [x] all aspect ratios fitted to max possible space instead of random initial sizes (now with 1:1 scale cap)

### Future Roadmap & App Transition

#### Performance

- [ ] Thumbnail Pre-generation (Rust background job, WebP)
- [ ] List Virtualization (Handle 10,000+ files)
- [ ] GPU Decoding (120Hz smooth pan/zoom)

#### Forensic Comparison

- [ ] Synced Multi-View (Locked zoom/pan across multiple cards)
- [ ] Flicker Comparison (Rapid toggle hotkey)
- [ ] Difference Overlays (Image subtraction)

#### Metadata & AI

- [x] Hidden PNG Chunk Parsing (Backend implementation for SD/A1111 and ComfyUI)
- [ ] Embedding Search (Local CLIP model for semantic search)

#### Technical Stack Evolution

- [ ] Rust/Tauri Transition (Move away from WebUI to native Desktop App)
- [ ] Port Scorer/Filters to Rust (Leverage `opencv` & `ndarray` crates)
- [ ] Sidecar support for non-destructive edits (.json/.xmp)

#### UX & Native Integration

- [ ] Frameless Glass UI (Acrylic/Vibrant windows)
- [ ] Drag-and-drop bridge to external apps (Photoshop, etc.)
- [ ] Global hotkey support
