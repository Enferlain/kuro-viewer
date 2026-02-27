<div align="center">
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/4fa6deae-f49b-4122-a155-f57104c33e14" />

# 🌌 Kuro Viewer

**Fast. Forensic. Focused.**

</div>

---

Kuro Viewer is a high-fidelity image viewer designed for rapid forensic comparison. It specializes in revealing subtle details through in-place analysis filters, making it a powerful tool for AI researchers, digital forensic artists, and anyone who needs to "pixel-peep" with speed.

## ✨ Features

- **🚀 Rapid Comparison**: Toggle between original images and analysis maps (Noise, PCA) instantly with zero-latency hotkeys.
- **🔍 Precision Viewer**: High-performance transformation engine with fit-to-view, limitless zoom, and smooth panning.
- **⌨️ Hotkey-First UX**: Designed for power users. Navigate, zoom, reset, and analyze without ever touching the mouse.
- **💠 Premium Aesthetics**: Dark-mode-first glassmorphism design with smooth transitions and coordinated visual feedback.
- **📱 Focused Mode**: Toggle the UI toolbar for distraction-free forensic analysis.

## 🛠 Tech Stack

- **Frontend**: [React 19](https://react.dev/), [Vite 7](https://vitejs.dev/), [TypeScript](https://www.typescriptlang.org/), [Lucide React](https://lucide.dev/).
- **Backend**: [Rust](https://www.rust-lang.org/) via [Tauri v2](https://v2.tauri.app/).
- **Package Management**: [Cargo](https://doc.rust-lang.org/cargo/) (Backend), [pnpm](https://pnpm.io/) (Frontend).
- **Quality**: [Biome](https://biomejs.dev/) (JS/TS), [Clippy](https://doc.rust-lang.org/clippy/) (Rust).

## 🚀 Getting Started

### Prerequisites

- Node.js (Latest stable)
- [pnpm](https://pnpm.io/)
- [Rust toolchain](https://rustup.rs/) (rustc, cargo)
- MSVC Build Tools with Windows SDK (Windows only)

### Setup

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   pnpm install
   ```
3. **Run in development mode**:
   ```bash
   pnpm tauri dev
   ```

## 📖 Documentation

- [AGENTS.md](AGENTS.md): Detailed architectural guide and developer workflows.
- [docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md): Aesthetic and interaction standards.
- [CHANGELOG.md](CHANGELOG.md): History of notable changes.

---

<div align="center">
Built for the next generation of image analysis.
</div>
