# Kuro Viewer Styling Guide

This guide outlines the styling architecture and best practices for the Kuro Viewer project. We follow a **CSS-first**, **token-layered** approach designed for high-fidelity aesthetics and robust theming.

---

## 🏗 Architecture: The 2-Layer System

We separate our styling into two logical layers to balance core design rules with application-specific integration.

### Layer 1: Core Design System (`src/styles/design-system.css`)

This is the **Source of Truth**. It is built with three distinct tiers of variables to ensure absolute clarity and prevent conflicts with Tailwind's internal resolver:

1.  **Base Palette**: Raw color, transparency, and shadow values using the `--palette-*` prefix.
2.  **Semantic Tokens**: Design intent variables using the `--ui-*` prefix (e.g., `--ui-bg-base`, `--ui-shadow-md`).
    - _Why?_ Tailwind uses `--color-*` and `--shadow-*` for utility generation. By using `--ui-*` in `:root`, we avoid naming collisions and circular references.
3.  **Tailwind Bridge**: A `@theme inline` block that maps `--ui-*` tokens to standard utility namespaces (e.g., `--color-[name]`).
    - _Why inline?_ The bridge tokens reference other variables (`--ui-*`). `inline` keeps utility output bound to those source tokens.
4.  **Accessibility Overrides**: Media-query overrides (`prefers-reduced-motion`, `prefers-contrast`, `forced-colors`) tune the semantic layer instead of patching component styles one-by-one.

> [!TIP]
> Use `@theme` for direct semantic tokens you want to override by redefining `--color-*` globally. Use `@theme inline` for bridge aliases that point to other variables.

### Layer 2: Global Integration (`src/index.css`)

This is the **Entry Point**. It handles:

- Importing Tailwind v4: `@import "tailwindcss";`.
- Importing the Core System: `@import "./styles/design-system.css";`.
- Global overrides (Body background, Scrollbars, Selection styles).
- Custom `@layer` definitions.

---

## 🎨 Token Usage Policies

### 1. Semantic Over Explicit

**Never** use raw hex codes or `--palette-*` variables in JSX/TSX. Prefer semantic Tailwind utilities in components; use `var(--color-*)` directly only in CSS or rare inline-style edge cases.

| ✅ Good (Semantic)      | ❌ Bad (Explicit) |
| :---------------------- | :---------------- |
| `text-foreground-muted` | `text-slate-400`  |
| `bg-glass-bg-base`      | `bg-white/[0.03]` |
| `border-border-subtle`  | `#ffffff0f`       |

- Avoid arbitrary color/shadow utilities in JSX/TSX (for example `bg-black/40`, `text-white/80`, `shadow-[0_8px_32px_rgba(...)]`).
- If a visual treatment is reusable and not expressible by existing semantic tokens, add or map a semantic token in `design-system.css` first.
- This applies to inline style strings too (for example `backgroundImage` gradients): use `var(--color-*)`/semantic tokens instead of raw hex values.
- Semantic token opacity variants are allowed (for example `ring-accent/30`, `bg-accent/10`, `border-glass-border-base/60`) because they still derive from the semantic token surface.
- Exception: raw hex values are allowed only for non-presentational data/state (for example user-selected values for `input[type=\"color\"]`), not for utility classes or hardcoded presentational styles.

> [!NOTE]
> Some current bridge names are semantically redundant (for example `border-glass-border-base`). This is valid today, but tracked as naming ergonomics debt for a future aliasing cleanup pass.

### 2. OKLCH for Color Ramp Perfection

We use **OKLCH** (`oklch(L C H)`) for our color scales. It is mathematically "perceptually uniform," meaning shifting the Hue (H) preserves the perceived brightness (L).

- **L (Lightness)**: `0.0` - `1.0`. Keep this consistent across themes to maintain contrast.
- **C (Chroma)**: `0` - `~0.4`. Controls the intensity.
- **H (Hue)**: `0` - `360`. Our default Ruri accent is around `276`.

> [!TIP]
> When creating a new theme (e.g., Forest), start by swapping **Hue** while keeping Lightness and Chroma close. Then verify contrast in-app; hue shifts can still affect readability and gamut clipping.

---

## 🛠 Project Standards

### Built-in Support

- **Framework**: Tailwind CSS v4.
- **Build Plugin**: `@tailwindcss/vite` (configured in `vite.config.ts`).
- **Config-less**: We do **not** use `tailwind.config.js`. All configuration happens inside `@theme` blocks in CSS.
- **Theme Contract**: Required/optional token surface is versioned in `THEME_CONTRACT.md`.

### Design Principles (Luxury UI)

To maintain the "Premium" look:

- **Rounded Corners**: Use `rounded-xl` or `rounded-2xl` for main panels.
- **Glassmorphism**: Use semantic glass tokens (e.g., `bg-glass-bg-base border border-glass-border-base backdrop-blur-xl`).
- **Shadows**: Use `shadow-glow` (for accents) or `shadow-xl` (for depth).
- **Transitions**: Prefer `transition-colors`, `transition-opacity`, or `transition-transform` with tokenized durations (for example `duration-[var(--ui-motion-duration-standard)]`); use `transition-all` only when genuinely needed.

---

## 🚀 Phase 3 Styling Contract (Native + Plugins)

These rules are required for roadmap work in Tauri/native UX, plugins, workspaces/profiles, sidecars, and forensic tooling.

### 1. Native Backdrop Policy (Acrylic/Mica)

- Use semantic material tokens (`bg-material-none`, `bg-material-acrylic`, `bg-material-mica`) instead of hardcoded RGBA recipes.
- Treat current values as **web fallback** tokens. Tauri-native material integration should map to the same semantic names.
- Keep content legible regardless of material mode (minimum readable contrast over textured/blurred backgrounds).

### 2. Layering Policy (No Ad-Hoc z-index)

- Do not introduce new hardcoded `z-*` values for structural layers.
- Use layer tokens (`--ui-layer-*`) via `z-[var(--ui-layer-modal)]` style utilities for overlays, modals, toasts, drag surfaces, and plugin popups.
- If a new layer tier is needed, add it in `design-system.css` and document it in `THEME_CONTRACT.md`.

### 3. Motion Safety Policy

- Prefer semantic motion durations/easing (tokenized in `--ui-motion-*`) over arbitrary custom cubic-bezier values.
- Features that may flicker rapidly (forensic compare modes) must provide a reduced-motion-safe path.
- Respect `prefers-reduced-motion`; transitions should degrade to instant or near-instant behavior.

### 4. Density & Virtualization Policy

- List-heavy or virtualized surfaces must use density tokens (`--ui-density-*`) for row/thumbnail heights.
- Do not hardcode density-specific pixel heights in feature code; derive from density tokens so profiles/workspaces can switch compact/comfortable modes.

### 5. Forensics Visualization Policy

- Difference overlays, heatmaps, and analysis indicators must use semantic analysis tokens (`--color-analysis-*`), not ad-hoc red/green ramps.
- Never rely on color alone for critical forensic state. Pair color with labels/icons/patterns where possible.
- Forensic visualization is plugin-scoped by default: treat these surfaces as optional plugin UI, not guaranteed core/default experience.

### 6. Plugin/Workspace Theme Boundary

- Plugin-specific tokens must be namespaced (for example `--plugin-<id>-*`) and always provide fallback to core semantic tokens.
- Workspace/profile themes can override core semantic tokens, but must keep required tokens from `THEME_CONTRACT.md`.

---

## 🧑‍💻 Component Workflow

When building a new component, follow these steps:

1.  **Check Tokens**: Does the color/spacing I need exist in `design-system.css`?
2.  **Apply Utilities**: Use standard Tailwind utilities (e.g., `flex items-center gap-2`).
3.  **Contract Check**: If a missing token is structural (layer, motion, density, analysis, material), add it to `design-system.css` and `THEME_CONTRACT.md`.
4.  **Styling Overrides**: If a specific component needs a unique tweak, define a local CSS variable and reference it, allowing it to be themed later.

```tsx
// Example of a correctly styled "Luxury" Button
<button className="px-4 py-2 rounded-xl bg-accent text-accent-foreground shadow-glow hover:bg-accent-bright transition-colors duration-[var(--ui-motion-duration-standard)]">
  Confirm Action
</button>
```

---

## 📋 Tailwind v4 Variable Schema

Tailwind v4 automatically generates utilities based on specific CSS variable prefixes defined within a `@theme` block.

| Feature          | CSS Variable Prefix | Resulting Utility Example |
| :--------------- | :------------------ | :------------------------ |
| **Colors**       | `--color-*`         | `text-accent`, `bg-background-base` |
| **Spacing**      | `--spacing-*`       | `p-section`, `m-panel`    |
| **Font Family**  | `--font-*`          | `font-mono`               |
| **Font Size**    | `--text-*`          | `text-label`              |
| **Radius**       | `--radius-*`        | `rounded-card`            |
| **Shadows**      | `--shadow-*`        | `shadow-glow`             |
| **Easing**       | `--ease-*`          | `ease-standard`           |
| **Aspect Ratio** | `--aspect-*`        | `aspect-video`            |
| **Breakpoints**  | `--breakpoint-*`    | `sm:flex`, `lg:grid`      |

> [!NOTE]
> In Tailwind v4, **Font size** variables use the `--text-` prefix, not `--font-size-`. This allows Tailwind to automatically pair it with a line-height if needed.
>
> Utility names must match token suffixes exactly. If a `--color-*` token does not exist, the corresponding class (e.g., `text-foo`) will not be generated.

---

## 🎡 Interaction & Accessibility

### The "Speed" Pillar (Hotkeys)

The app must be fully navigable via keyboard to support the "luxury" efficiency of a high-performance viewer.

- **`ArrowRight` / `ArrowLeft`**: Navigate image list.
- **`0`**: Reset zoom and center view (Fit).
- **`+` / `-`**: Zoom in / out.
- **`T`**: Toggle Toolbar visibility (distraction-free mode).
- **`X` or `I`**: Toggle Image Metadata panel.
- **`N`**: Toggle Noise Analysis filter.
- **`P`**: Toggle PCA Analysis filter.
- **`,`**: Open/close Settings.
- **`Escape`**: Close Metadata/Settings dialogs.

### Transitions & Motion

- **Micro-animations**: Use targeted transitions (`colors`, `opacity`, `transform`) with semantic motion tokens (for example `--ui-motion-duration-standard`); avoid blanket `transition-all` for layout-heavy elements.
- **Layout Swaps**: Structural changes (like opening the Settings Modal or switching image filters) should be smooth but fast.
- **Image Navigation**: Navigating between images remains **instant** (no animation) to support perfect A/B comparison.

---

## 📸 Image Display Logic

- **Containment**: Images should never overflow screen boundaries unless zoomed.
- **Scaling**: Preserve aspect ratio at all times.
- **Viewport Constraints**: Automatic fitting scale is capped at `1.0` (1:1) to prevent blurring on small images.

---

## 📚 References (use context7 mcp for specific docs)

- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [Tailwind v4 Theme Configuration](https://tailwindcss.com/docs/theme)
- [Tailwind v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)
