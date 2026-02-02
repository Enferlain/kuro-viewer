# Agent Guide - Kuro Viewer

This document is a guide for AI Agents working on this codebase. It outlines the tech stack, architecture, design philosophy, and standard workflows.

## 🌟 Design Philosophy

1.  **Premium & Modern UI**: We prioritize a "Wow" factor. The UI uses **glassmorphism**, **smooth transitions**, **dark mode by default**, and **curated color palettes**.
2.  **Rapid Comparison**: Specialized for pixel-peeping. Direct toggling between original and analysis filters (Noise, PCA) is a core feature.
3.  **Future-Proofing**: We are building toward a native **Tauri (Rust)** application. Keep frontend logic decoupled from the browser environment where possible.

## 🛠 Tech Stack

### Frontend

- **Framework**: React 19 + Vite 7
- **Language**: TypeScript
- **Styling**: Vanilla CSS (Premium Aesthetics)
- **Linting & Formatting**: **Biome** (configured in `biome.json`)
- **Icons**: Lucide React

### Backend

- **Framework**: FastAPI (Python 3.11+)
- **Build System**: **Hatchling** (configured in `backend/pyproject.toml`)
- **Linting & Formatting**: **Ruff** (target py313)
- **Image Processing**: Pillow, OpenCV
- **Analysis**: Scikit-Learn (PCA, KMeans)

## 📂 Architecture

### Directory Structure

```
kuro-viewer/
├── backend/                  # Python Backend (Service & Scorers)
│   ├── main.py               # API Endpoints
│   ├── scorers.py            # Image Analysis Logic (Noise, PCA)
│   └── requirements.txt
├── frontend/                 # React Frontend (Primary App)
│   ├── src/
│   │   ├── components/       # UI Components (Toolbar, ImageViewer)
│   │   ├── types.ts          # Shared Types
│   │   └── App.tsx           # Main Application Logic
├── docs/                     # Documentation
└── todo.md                   # Roadmap & Tasks
```

## 🤖 Agent Workflows

### 1. Adding Features

- **Plan**: Create/update `implementation_plan.md` before coding.
- **Task Mode**: Use `task_boundary` for granular steps.
- **Linting**: Run `npm run check` (Frontend/Root) or `npm run check:backend` (Backend).

### 2. UI Development

- **Aesthetics**: Follow the "Luxury" feel—use Backdrop blur, rounded corners (xl/2xl), and subtle borders.
- **Hotkeys**: Keep hotkeys documented and consistent (0=Reset, T=Toolbar, X=Metadata, N=Noise, P=PCA).

### 3. Backend Development

- **Type Hinting**: Use strict Python type hints.
- **Exception Handling**: Use `raise ... from e` for better tracebacks.

### 4. Code Quality

- **Linting (Frontend)**: Run `npm run check` for Biome.
- **Linting (Backend)**: Run `npm run check:backend` for Ruff.
  - Check: `ruff check .`
  - Fix: `ruff check . --fix`
  - Format: `ruff format .`
- **Global Check**: Run `npm run check:all` to verify the entire repository.
- **Type Checking**:
  - **Frontend**: Run `npm run typecheck` for `tsc`.
  - **Backend**: Use **Ty**.
    - Check all: `uvx ty check`
    - Check directory: `uvx ty check backend/services`
    - Check file: `uvx ty check backend/services/analysis.py`
- **Style**: Follow existing styles (Tabs for JS/TS, Spaces for Python).
- **Imports**: Keep imports organized (handled by Biome and Ruff isort).

## 📝 Common Tasks

- **Adding a dependency**:
  - Frontend: `npm install <package>` in `frontend/`.
  - Backend: Use **uv**. `uv add <package>` -> Update `backend/requirements.txt`.
