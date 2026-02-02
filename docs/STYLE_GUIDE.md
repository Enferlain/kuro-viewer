# UI/UX Style Guide - Kuro Viewer

This guide defines the aesthetic and interaction principles for Kuro Viewer.

## 🎨 Aesthetics

### Color Palette

- **Background**: Deep Zinc/Slate (#09090b)
- **Foreground**: Off-white (#f4f4f5)
- **Accent**: Cool Blue / Indigo (#6366f1)
- **Muted**: Low-opacity greys for secondary text.

### Visual Styling

- **Glassmorphism**: Use `backdrop-blur-md` or `backdrop-blur-xl` for overlays (Toolbar, Modals).
- **Borders**: Subtle `border-white/[0.06]` or `border-accent/20`.
- **Shadows**: Large, soft shadows (`shadow-2xl`) and subtle glows for active elements.
- **Corners**: Large radii for a modern look (`rounded-xl` or `rounded-2xl`).

## 🎡 Interaction

### Transitions

- Use smooth CSS transitions for all visibility toggles (Toolbar fade, Image filter swaps).
- Recommended: `transition-all duration-300 ease-in-out`.

### Hotkeys (The "Speed" Pillar)

The app must be fully navigable via keyboard:

- `ArrowRight` / `ArrowLeft`: Navigate image list.
- `0`: Reset zoom and center view (Fit).
- `T`: Toggle Toolbar visibility (for distraction-free viewing).
- `X`: Toggle Image Metadata information.
- `N`: Toggle Noise Analysis filter.
- `P`: Toggle PCA Analysis filter.

## 📸 Image Display

- **Containment**: Images should never overflow the screen boundaries unless zoomed.
- **Scaling**: Preserve aspect ratio. Zoom should center on the cursor or viewport center.
- **Filters**: Applied in-place on the main image element.
