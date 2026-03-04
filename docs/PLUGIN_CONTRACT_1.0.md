# Kuro Viewer Plugin Contract 1.0 (Authoring Guide)

Contract version: `1.0.0`  
Status: **Target contract for plugin authoring and host implementation hardening**  
Last updated: `2026-03-04`

This document defines a practical, detailed plugin contract for Kuro Viewer 1.0.
It is designed so plugin authors can build against one clear format while host-side loading continues to mature.

## 1. Scope

This contract covers:

- `.plugin` archive format and required file layout
- `plugin.json` manifest requirements and validation rules
- frontend extension points and slot model
- plugin settings model (declarative schema + optional custom UI)
- persistence shape and settings migration expectations
- backend mode expectations (`none`, `wasm`, `python-subprocess`)
- packaging checklist

## 2. Normative Terms

- **MUST**: required for compatibility
- **SHOULD**: recommended unless a strong reason exists
- **MAY**: optional

## 3. Plugin Package Format

A plugin is distributed as a ZIP archive with extension `.plugin`.

Required top-level file:

- `plugin.json` (MUST exist)

Optional additional files (depending on manifest):

- `frontend.js` / `frontend.mjs` (or other relative `frontend_entry` path)
- `backend.wasm` (or other relative `backend_entry` path for `backend: "wasm"`)
- `python/...` (for `backend: "python-subprocess"`)
- `settings.schema.json` (recommended for host-generated settings UI)
- `README.md`, `LICENSE`, static assets, etc.

### 3.1 Archive Structure Example

```text
forensics-suite.plugin
├── plugin.json
├── frontend.js
├── backend.wasm                # only for wasm backend plugins
├── settings.schema.json        # recommended
└── assets/
    └── icons/
```

## 4. Manifest Contract (`plugin.json`)

Primary manifest schema:

- `docs/schemas/plugin-manifest.schema.json`
- Contract major: `1.x.x`

### 4.1 Required Fields

- `schema_version` (semver, major must match host schema major)
- `id` (kebab-case, `3..64` chars)
- `name` (`1..80` chars)
- `version` (semver)
- `api_version` (semver, major must match host plugin API major)
- `min_host_version` (semver)
- `theme_contract` (`<major>.x`)
- `backend` (`"wasm" | "python-subprocess" | "none"`)

### 4.1.1 Optional About Fields (Recommended)

These fields power the host `About` view in installed plugins:

- `description` (short summary, max 280 chars)
- `author` (display author/team name, max 80 chars)
- `source_url` (HTTP(S) project/repo URL)
- `docs_url` (HTTP(S) usage/docs URL)
- `usage` (how-to text shown in About modal, max 2000 chars)

### 4.2 Conditional Requirements

- If `slots` is non-empty, `frontend_entry` MUST be present (`.js` or `.mjs`).
- If `backend` is `"wasm"`, `backend_entry` MUST exist and end with `.wasm`.
- If `backend` is `"python-subprocess"`, `backend_entry` MUST start with `python/`.
- If `backend` is `"none"`, `backend_entry` MUST be omitted.

### 4.3 Path Safety Rules

`frontend_entry` and `backend_entry` MUST be safe relative paths:

- no `..` traversal
- no absolute paths
- no Windows drive prefixes

## 5. Frontend Extension Contract (1.0 Target)

When `frontend_entry` is provided, the module SHOULD default-export a plugin frontend descriptor.

```ts
export type PluginSlot = "toolbar" | "sidebar" | "panel" | "context-menu";

export interface PluginFrontendModule {
  id: string;
  slots?: Partial<Record<PluginSlot, React.ComponentType<unknown>>>;

  // Optional lifecycle
  onActivate?: () => void | Promise<void>;
  onDeactivate?: () => void | Promise<void>;

  // Optional settings contribution
  settings?: {
    presentation?: "inline" | "modal";
    title?: string;
    description?: string;

    // Use declarative schema first; custom render is optional.
    schemaPath?: string;          // usually "settings.schema.json"
    render?: React.ComponentType<PluginSettingsRenderProps>;

    // If omitted, host can derive defaults from schema.
    createDefaultValue?: () => unknown;
    migrate?: (input: unknown) => unknown;
  };
}

export default plugin;
```

### 5.1 Slot Injection Rules

- Plugin UI MUST only render within declared `slots` in `plugin.json`.
- Plugin UI SHOULD tolerate missing host capabilities gracefully.
- Plugin UI MUST avoid leaking global CSS (scope classes and custom properties).

### 5.2 Configure Surface Rules (Settings UX Consistency)

The host `Configure` action MUST support exactly two settings surfaces:

- `presentation: "inline"`: expands under the plugin row in the host's existing settings container shell.
- `presentation: "modal"`: opens a host modal shell that wraps plugin settings content.

Consistency requirements:

- Plugin settings in `inline` mode MUST use host shell layout/spacing/typography (same visual container family as built-in example).
- Plugin-provided custom renderers in `inline` mode MUST render **content only** (fields/controls), not a second outer card/modal shell.
- `modal` mode MAY be more free-form internally, but modal chrome/backdrop/close controls remain host-owned.

## 6. Settings Contract (1.0)

For plugin settings, use a **declarative schema** file at plugin root:

- Recommended path: `settings.schema.json`
- Schema: `docs/schemas/plugin-settings.schema.json`

This enables:

- host-generated settings UI
- consistent validation and range enforcement
- stable persistence and migration behavior

### 6.1 Declarative vs Custom Settings

- Declarative (`settings.schema.json`) is the default and SHOULD be used first.
- Custom renderer is optional for advanced cases, but it MUST still follow the surface rules in **5.2**.
- Plugin fields MAY be unique or domain-specific (random feature content is allowed), but presentation must stay consistent with host patterns.

### 6.2 Declarative Settings Example

```json
{
  "schema_version": "1.0.0",
  "plugin_id": "forensics-suite",
  "presentation": "inline",
  "title": "Forensics Suite Settings",
  "sections": [
    {
      "id": "view",
      "label": "View",
      "fields": [
        {
          "id": "view.sideBySide",
          "type": "boolean",
          "label": "Side-by-side compare",
          "default": false
        },
        {
          "id": "view.outputScore",
          "type": "boolean",
          "label": "Show output score",
          "default": true
        }
      ]
    },
    {
      "id": "noise",
      "label": "Noise",
      "fields": [
        {
          "id": "noise.amplitude",
          "type": "number",
          "label": "Amplitude",
          "default": 1,
          "min": 1,
          "max": 100,
          "step": 1,
          "ui": "slider"
        },
        {
          "id": "noise.opacity",
          "type": "number",
          "label": "Opacity",
          "default": 0.95,
          "min": 0,
          "max": 1,
          "step": 0.01,
          "ui": "slider"
        }
      ]
    }
  ]
}
```

### 6.3 Persistence Shape

Host persists plugin settings in a plugin-keyed map:

```json
{
  "forensics-suite": {
    "view": {
      "sideBySide": false,
      "outputScore": true
    },
    "noise": {
      "amplitude": 1,
      "opacity": 0.95
    }
  }
}
```

### 6.4 Migration Rule

When plugin settings shape changes:

- plugin SHOULD provide a `migrate(input)` function in frontend module settings descriptor
- migration MUST be idempotent for already-current snapshots
- migration MUST handle unknown/missing fields safely

## 7. Backend Contract (1.0 Target)

### 7.1 `backend: "none"`

- No backend file required.
- Use for UI-only plugins, themes, command-only frontend actions.

### 7.2 `backend: "wasm"`

- `backend_entry` MUST point to `.wasm` file.
- Plugin SHOULD treat host imports as capability-based (no implicit filesystem/network access).
- Plugin MUST declare all host-sensitive behavior in `permissions`.

### 7.3 `backend: "python-subprocess"`

- `backend_entry` MUST be under `python/`.
- Python runtime and dependencies SHOULD be self-contained inside plugin package.
- Plugin MUST gracefully fail if required runtime assets are missing.

## 8. Permissions Contract

Manifest `permissions` MUST only use host-supported permissions:

- `fs.read`
- `fs.write`
- `net.http`
- `clipboard.read`
- `clipboard.write`
- `process.spawn`
- `shell.open`
- `image.decode`

Plugin authors SHOULD request minimal permissions.

## 9. Theme Compatibility

Plugins MUST target the app theme contract via `theme_contract` in `plugin.json`.
See `THEME_CONTRACT.md` for required semantic tokens and namespacing rules.

## 10. Packaging Checklist (Author)

1. Validate `plugin.json` against `docs/schemas/plugin-manifest.schema.json`.
2. Validate `settings.schema.json` against `docs/schemas/plugin-settings.schema.json` (if present).
3. Verify `id` is stable and kebab-case.
4. Verify all entry paths are relative and safe.
5. Verify slot declarations match actual frontend exports.
6. Verify defaults exist for every settings field.
7. Verify plugin loads with zero warnings in dev host.
8. Build archive with `plugin.json` at root.

## 11. Forensics Plugin Mapping (Current Example)

Current forensics settings already map cleanly to this contract:

- View: `sideBySide`, `outputScore`
- Magnifier: `enabled`, `zoom`
- Hotkeys: `original`, `noise`, `pca`, `texture`
- Noise: `rembg`, `amplitude`, `equalizeHistogram`, `opacity`
- PCA: `input`, `mode`, `component`, `linearize`, `invert`, `enhancement`, `opacity`
- Texture: `mode`, `strength`, `smoothness`, `enhancement`, `opacity`

This makes Forensics the canonical sample plugin for 1.0.
