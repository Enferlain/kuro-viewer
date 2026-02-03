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

- **[ ] Appearance**: Theme selection, Backdrop styles (Acrylic/Mica), and Accent color picking.
- **[ ] Layout**: Grid vs. List behavior, Sidebar positioning, and Auto-hide toolbar logic.
- **[ ] Slideshow**: Detailed transition controls, Shuffle/Loop modes.
- **[ ] Controls**: Shortcut remapping and mouse wheel behavior customization.
- **[ ] File Types**: System-level extension associations and default opener settings.
- **[ ] Content**: Library monitoring paths and metadata deep-scanning (CLIP semantic search).
- **[ ] Privacy**: History management and anonymous telemetry toggles.

## ⚡ Performance & Forensics

- **[ ] Thumbnail Pre-generation**: Rust background job to pre-cache thumbnails using WebP.
- **[ ] GPU Decoding**: Leverage `opencv` & `ndarray` crates for 120Hz smooth pan/zoom.
- **[ ] Forensic Comparison**:
  - Synced Multi-View (Locked zoom/pan).
  - Rapid Flicker Comparison (Hotkey toggle).
  - Image Subtraction / Difference Overlays.

## 📂 UX & Organization

- **[ ] Sidecar Support**: Non-destructive edits saved in `.json` or `.xmp` files.
- **[ ] Prompt List Virtualization**: Handle 100,000+ files instantly using `react-virtuoso`.
- **[ ] Embedding Search**: Local CLIP model for searching images by natural language descriptions.
