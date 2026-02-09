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
3.  **Tailwind Bridge**: The custom `@theme inline` block that maps `--ui-*` tokens to standard utility namespaces (e.g., `--color-[name]`).
    - _Why inline?_ As per Tailwind v4 documentation, when theme variables reference _other_ variables (like our `--ui-*` tokens), using `inline` ensures utilities reference the source variable directly. This maintains correct CSS scoping for sub-tree overrides.

### Layer 2: Global Integration (`src/index.css`)

This is the **Entry Point**. It handles:

- Importing Tailwind v4: `@import "tailwindcss";`.
- Importing the Core System: `@import "./styles/design-system.css";`.
- Global overrides (Body background, Scrollbars, Selection styles).
- Custom `@layer` definitions.

---

## 🎨 Token Usage Policies

### 1. Semantic Over Explicit

**Never** use raw hex codes or base palette variables in your JSX/TSX. Always use the semantic Tailwind utility or the semantic variable.

| ✅ Good (Semantic)           | ❌ Bad (Explicit) |
| :--------------------------- | :---------------- |
| `text-foreground-muted`      | `text-slate-400`  |
| `bg-accent`                  | `bg-[#5e6ad2]`    |
| `var(--color-border-subtle)` | `#ffffff0f`       |

### 2. OKLCH for Color Ramp Perfection

We use **OKLCH** (`oklch(L C H)`) for our color scales. It is mathematically "perceptually uniform," meaning shifting the Hue (H) preserves the perceived brightness (L).

- **L (Lightness)**: `0.0` - `1.0`. Keep this consistent across themes to maintain contrast.
- **C (Chroma)**: `0` - `~0.4`. Controls the intensity.
- **H (Hue)**: `0` - `360`. 285 is our signature Blue.

> [!TIP]
> When creating a new theme (e.g., Forest), simply swap the **Hue** (H) while keeping Lightness (L) and Chroma (C) identical to the default theme. This ensures perfect accessibility with zero extra effort.

---

## 🛠 Project Standards

### Built-in Support

- **Framework**: Tailwind CSS v4.
- **Build Plugin**: `@tailwindcss/vite` (configured in `vite.config.ts`).
- **Config-less**: We do **not** use `tailwind.config.js`. All configuration happens inside `@theme` blocks in CSS.

### Design Principles (Luxury UI)

To maintain the "Premium" look:

- **Rounded Corners**: Use `rounded-xl` or `rounded-2xl` for main panels.
- **Glassmorphism**: Use `bg-white/[0.03]` + `backdrop-blur-xl` + `border border-white/[0.06]`.
- **Shadows**: Use `shadow-glow` (for accents) or `shadow-xl` (for depth).
- **Transitions**: Every interactive element must have `transition-all duration-200`.

---

## 🧑‍💻 Component Workflow

When building a new component, follow these steps:

1.  **Check Tokens**: Does the color/spacing I need exist in `design-system.css`?
2.  **Apply Utilities**: Use standard Tailwind utilities (e.g., `flex items-center gap-2`).
3.  **Styling Overrides**: If a specific component needs a unique tweak, define a local CSS variable and reference it, allowing it to be themed later.

```tsx
// Example of a correctly styled "Luxury" Button
<button className="px-4 py-2 rounded-xl bg-accent text-white shadow-glow hover:bg-accent-bright transition-all">
  Confirm Action
</button>
```

---

## 📋 Tailwind v4 Variable Schema

Tailwind v4 automatically generates utilities based on specific CSS variable prefixes defined within a `@theme` block.

| Feature          | CSS Variable Prefix | Resulting Utility Example |
| :--------------- | :------------------ | :------------------------ |
| **Colors**       | `--color-*`         | `text-accent`, `bg-base`  |
| **Spacing**      | `--spacing-*`       | `p-section`, `m-panel`    |
| **Font Family**  | `--font-*`          | `font-mono`               |
| **Font Size**    | `--text-*`          | `text-label`              |
| **Radius**       | `--radius-*`        | `rounded-card`            |
| **Shadows**      | `--shadow-*`        | `shadow-glow`             |
| **Aspect Ratio** | `--aspect-*`        | `aspect-video`            |
| **Breakpoints**  | `--breakpoint-*`    | `sm:flex`, `lg:grid`      |

> [!NOTE]
> In Tailwind v4, **Font size** variables use the `--text-` prefix, not `--font-size-`. This allows Tailwind to automatically pair it with a line-height if needed.

---

## 📚 References (use context7 mcp for specific docs if available)

- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [Tailwind v4 Theme Configuration](https://tailwindcss.com/docs/theme)
- [Tailwind v4 Upgrade Guide](https://tailwindcss.com/docs/upgrade-guide)
