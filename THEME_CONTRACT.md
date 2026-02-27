# Kuro Viewer Theme Contract

Contract version: `1.0.0`  
Last updated: `2026-02-21`

This document defines the stable token interface for app themes, workspace/profile overrides, and future plugin UI surfaces.

## 1. Scope

This contract governs:

- Core app theming in `:root` and `@theme inline`
- Workspace/profile level visual overrides
- Plugin token fallback behavior
- Native/web backdrop material compatibility

## 2. Required Tokens

The following semantic token families are required in every compatible theme:

- Foreground: `--ui-foreground`, `--ui-foreground-muted`, `--ui-foreground-subtle`
- Background: `--ui-bg-base`, `--ui-bg-elevated`, `--ui-bg-deep`
- Accent: `--ui-primary`, `--ui-primary-hover`, `--ui-primary-foreground`
- Destructive: `--ui-destructive`, `--ui-destructive-foreground`
- Border: `--ui-border-subtle`, `--ui-border-hover`, `--ui-border-strong`
- Glass: `--ui-glass-bg-base`, `--ui-glass-bg-hover`, `--ui-glass-border-base`
- Overlay: `--ui-overlay-dim`, `--ui-overlay-blur`
- Status: `--ui-status-info`, `--ui-status-success`, `--ui-status-warning`
- Shadow: `--ui-shadow-sm`, `--ui-shadow-md`, `--ui-shadow-xl`, `--ui-shadow-glow`
- Motion: `--ui-motion-duration-fast`, `--ui-motion-duration-standard`, `--ui-motion-ease-standard`
- Layering: `--ui-layer-content`, `--ui-layer-overlay`, `--ui-layer-modal`
- Density: `--ui-density-row-compact`, `--ui-density-row-comfortable`, `--ui-density-thumbnail-comfortable`
- Native material fallbacks: `--ui-material-none`, `--ui-material-acrylic`, `--ui-material-mica`
- Analysis: `--ui-analysis-diff-positive`, `--ui-analysis-diff-negative`, `--ui-analysis-heat-high`

## 3. Optional Extension Tokens

Optional tokens may be added freely (for example plugin-specific or brand-specific tokens), but they must:

- Follow namespacing rules (`--plugin-<id>-*` for plugin-owned tokens)
- Provide fallback to required semantic tokens
- Avoid redefining required token semantics

## 4. Compatibility Rules (SemVer)

- `MAJOR`: Remove/rename required tokens, or change token meaning in a breaking way
- `MINOR`: Add new required tokens with safe fallback defaults, or add optional token families
- `PATCH`: Adjust default values, docs, comments, or non-breaking refinements

## 5. Override Scopes

Allowed override scopes:

- Global default: `:root`
- Theme mode scope: `[data-theme="..."]`
- Density scope: `[data-density="compact|comfortable|relaxed"]`
- Backdrop scope: `[data-backdrop="none|acrylic|mica"]`
- Workspace/profile scope: container-level data attribute

Disallowed:

- Hardcoded per-component overrides that bypass semantic tokens for shared UI primitives
- Plugin CSS that assumes a specific base palette token exists

## 6. Accessibility Requirements

Themes must remain usable under:

- `@media (prefers-reduced-motion: reduce)`
- `@media (prefers-contrast: more)`
- `@media (forced-colors: active)`

Critical state must not rely only on color (especially forensic difference views).

## 7. Validation Checklist

Before shipping a theme/profile/plugin UI:

1. All required tokens resolve to valid values.
2. Text and controls remain readable over background/material variants.
3. Reduced-motion mode removes rapid transitions/flicker-heavy effects.
4. Modal/overlay stacking still works with layer tokens.
5. Density modes render without clipping at compact and relaxed sizes.
6. Analysis colors are distinguishable and backed by non-color cues.

## 8. Minimal Override Example

```css
[data-theme="forest"] {
  --ui-primary: oklch(0.58 0.14 150);
  --ui-primary-hover: oklch(0.62 0.14 150);
  --ui-bg-base: oklch(0.13 0.01 150);
  --ui-bg-elevated: oklch(0.16 0.01 150);
  --ui-glass-bg-base: oklch(1 0 0 / 4%);
  --ui-border-subtle: oklch(1 0 0 / 10%);
}
```

## 9. Plugin Theming

### 9.1 Automatic Theme Inheritance

Plugin frontend components render inside the host app's DOM and inherit its CSS cascade. Any plugin that uses standard semantic utilities (`bg-glass-bg-base`, `text-foreground-muted`, etc.) will automatically match the active theme with no additional wiring.

### 9.2 CSS Scoping

Plugin-specific styles must be scoped to prevent leaking into the host UI or other plugins:

- Wrap custom classes under a plugin-scoped ancestor: `.plugin-<id> .custom-class { ... }`
- Namespaced custom properties: `--plugin-<id>-*`
- Custom properties must always provide a semantic fallback:

```css
.plugin-sepia .highlight {
  color: var(--plugin-sepia-highlight, var(--ui-primary));
}
```

### 9.3 Contract Version Targeting

Plugins declare which theme contract version they target in `plugin.json`:

```json
{
  "id": "sepia-filter",
  "theme_contract": "1.x"
}
```

If the host upgrades to a new major contract version (e.g., `2.0.0`) that removes or renames required tokens, plugins targeting an older major version can be flagged as potentially incompatible. Minor/patch upgrades remain safe per the SemVer rules in Section 4.

### 9.4 Style Injection Order

Plugin styles load **after** the host's design system (since plugin components mount later via `React.lazy`). This means:

1. Host `design-system.css` and `index.css` load at app startup
2. Plugin `frontend.js` mounts on first use, injecting its styles into the cascade
3. Plugin styles can reference and override semantic tokens without `!important`

Plugins must **not** redefine core `--ui-*` tokens globally — only within their own scoped selectors.

### 9.5 Themes as Plugins

Community themes can be distributed as plugins. A theme plugin is a frontend-only `.plugin` (no WASM backend) whose `frontend.js` injects a `<style>` block that overrides `--ui-*` tokens under a `[data-theme="<name>"]` scope. The Appearance settings tab shows installed theme plugins alongside built-in themes.
