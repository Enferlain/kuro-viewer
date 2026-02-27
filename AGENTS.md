# Agent Guide - Kuro Viewer

This document is a guide for AI Agents working on this codebase. It outlines the tech stack, architecture, design philosophy, and standard workflows.

## 🌟 Design Philosophy

1.  **Premium & Modern UI**: We prioritize a "Wow" factor. The UI uses **glassmorphism**, **smooth transitions**, **dark mode by default**, and **curated color palettes**.
2.  **Rapid Comparison**: Specialized for pixel-peeping. Direct toggling between original and analysis filters (Noise, PCA) is a core feature.
3.  **Native-First**: The app is a **Tauri (Rust)** desktop application. The Rust backend handles image decoding, file I/O, and plugin hosting. Keep frontend logic decoupled from browser-specific APIs where possible.

## 🛠 Tech Stack

### Frontend

- **Framework**: React 19 + Vite 7
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (CSS-first architecture)
  - **Core Tokens**: Centralized in `src/styles/design-system.css` via the `@theme` block.
    - > [!TIP]
    - > Use `@theme` (not `inline`) for semantic tokens you want to override globally (e.g., `--color-accent`). Use `@theme inline` only as an optimization for values that will never be overridden.
  - **Integration**: Standard Tailwind v4 `@import` directive in `src/index.css`.
  - **Zero-runtime**: Built using `@tailwindcss/vite` (no `tailwind.config.js` needed).
- **Linting & Formatting**: **Biome** (configured in `biome.json`)
- **Icons**: Lucide React

### Backend

- **Runtime**: Rust via **Tauri**
- **Image Decoding**: `image` crate (JPEG, PNG, WebP, TIFF, etc.) + `libvips` bindings for RAW/high-performance decoding
- **Plugin Host**: `wasmtime` crate — WASM plugin runtime with sandboxed execution

### Plugin System

Plugins extend the app with new features — filters, UI panels, AI tools, or any other capability. The core app ships with no plugins; all extensions are installed separately.

- **Archive Format**: `.plugin` files (ZIP) containing:
  - `plugin.json` — manifest (id, name, version, slots, permissions, backend type)
  - `backend.wasm` — compiled WASM module (for WASM plugins)
  - `frontend.js` — pre-bundled ESM React component
  - `python/` — self-contained Python environment (for Python subprocess plugins only)
- **Backend Types**:
  - **WASM** (default): Runs inside `wasmtime` sandbox. Near-native speed, full memory isolation. Best for image processing, filters, format converters.
  - **Python Subprocess**: Spawns a managed child process with bundled Python runtime. Best for AI/ML plugins (CLIP, captioning, upscaling) where the IPC overhead is negligible.
- **Frontend Plugin Model**: `PluginRegistry` + slot-based UI injection (`toolbar`, `sidebar`, `panel`, `context-menu`) + `React.lazy` loading.
- **Distribution**: Sideloading (drag-and-drop / "Install from file") + in-app registry (future).
- **Installation**: Unpacked to `AppData/kuro-viewer/plugins/<id>/`. At startup, only `plugin.json` manifests are read. WASM/JS/Python are loaded lazily on first use — zero startup overhead.

## 📂 Architecture

### Directory Structure

```
kuro-viewer/
├── src-tauri/                # Rust Backend (Tauri)
│   ├── src/
│   │   ├── main.rs           # App entry point & Tauri commands
│   │   └── plugin_host.rs    # WASM plugin loader & runtime
│   └── Cargo.toml
├── src/                      # React Frontend
│   ├── components/           # UI Components (Toolbar, ImageViewer)
│   ├── plugin-system/        # Plugin registry, slots, loader
│   ├── styles/               # Design system tokens
│   ├── types.ts              # Shared Types
│   └── App.tsx               # Main Application Logic
├── docs/                     # Documentation
└── ROADMAP.md                # Roadmap & Tasks
```

## 🤖 Agent Workflows

### 1. Adding Features

- **Plan**: Create/update `implementation_plan.md` before coding.
- **Task Mode**: Use `task_boundary` for granular steps.
- **Linting**: Run `pnpm check` (Frontend) or `cargo clippy` (Backend).

### 2. UI Development

- **Aesthetics**: Follow the "Luxury" feel—use Backdrop blur, rounded corners (xl/2xl), and subtle borders.
- **Hotkeys**: Keep hotkeys documented and consistent (0=Reset, T=Toolbar, X=Metadata, N=Noise, P=PCA).

### 3. Backend Development (Rust)

- **Type Safety**: Leverage Rust's type system. Avoid `unwrap()` in production paths — use `Result`/`?` propagation.
- **Error Handling**: Use `thiserror` for typed errors, return `Result<T, String>` from Tauri commands.
- **Plugin Host**: All plugin interactions go through the `PluginHost` abstraction — never call WASM directly from command handlers.

### 4. Code Quality

- **Linting (Frontend)**: Run `pnpm check` for Biome.
- **Linting (Backend)**: Run `cargo clippy` for Rust lints, `cargo fmt` for formatting.
- **Global Check**: Run `pnpm check` (frontend) + `cargo clippy` (backend) to verify the entire repository.
- **Ignoring (Biome)**:
  - Biome is configured with **VCS Integration** (`vcs: { enabled: true, useIgnoreFile: true }`).
  - **Implicit Ignores**: Biome automatically respects all patterns in `.gitignore`. There is no need to manually add `node_modules` or `dist` to Biome's ignore list.
  - **Explicit Ignores**: Use `.biomeignore` (or `files.ignore` in `biome.json`) ONLY for files that are **tracked by Git** but should still be ignored by Biome (e.g., minified libraries, reference code in `ref_*` folders).
- **Type Checking**:
  - **Frontend**: Run `pnpm typecheck` for `tsc`.
  - **Backend**: `cargo check` for Rust type checking.
- **Style**: Follow existing styles (Tabs for JS/TS, Spaces for Rust — standard `rustfmt` defaults).
- **Imports**: Keep imports organized (handled by Biome for JS/TS, `rustfmt` for Rust).
- **Searching**: Use `rg` (ripgrep) instead of `grep` — it respects `.gitignore`, is faster, and avoids false matches in `node_modules`/`target`.

## 📝 Common Tasks

- **Adding a dependency**:
  - Frontend: `pnpm add <package>`.
  - Backend: `cargo add <crate>` in `src-tauri/`.
- **Plugin development (Python)**:
  - Python plugins are developed externally using **uv** for package management, **Ruff** for linting, and **Ty** for type checking. These tools are not part of the core app.
