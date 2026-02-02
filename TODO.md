### Random TODOs

- [ ] stats about the image, maybe cached
- [ ] C hotkey for cropping/editing, save should copy to clipboard or save copy as, not replace
- [x] biome, ruff, ty for linting
- [ ] docs
- [ ] no animation when switching images, instant
- [ ] all aspect ratios fitted to max possible space instead of random initial sizes

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

- [ ] Hidden PNG Chunk Parsing (SD, ComfyUI, Midjourney params)
- [ ] Embedding Search (Local CLIP model for semantic search)

#### Technical Stack Evolution

- [ ] Rust/Tauri Transition (Move away from WebUI to native Desktop App)
- [ ] Port Scorer/Filters to Rust (Leverage `opencv` & `ndarray` crates)
- [ ] Sidecar support for non-destructive edits (.json/.xmp)

#### UX & Native Integration

- [ ] Frameless Glass UI (Acrylic/Vibrant windows)
- [ ] Drag-and-drop bridge to external apps (Photoshop, etc.)
- [ ] Global hotkey support
