<div align="center">
<img width="1200" height="475" alt="Kuro Viewer Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

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
- **Backend**: [FastAPI](https://fastapi.tiangolo.com/), [OpenCV](https://opencv.org/), [NumPy](https://numpy.org/), [Scikit-Learn](https://scikit-learn.org/).
- **Package Management**: [uv](https://docs.astral.sh/uv/) (Backend), [npm](https://www.npmjs.com/) (Frontend).
- **Quality**: [Biome](https://biomejs.dev/) (JS/TS), [Ruff](https://astral.sh/ruff) (Python), [Ty](https://github.com/Yelp/ty) (Python Types).

## 🚀 Getting Started

### Prerequisites

- Node.js (Latest stable)
- Python 3.11+
- [uv](https://docs.astral.sh/uv/)

### Setup

1. **Clone the repository**
2. **Frontend initialization**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
3. **Backend initialization**:
   ```bash
   cd backend
   uv sync
   python main.py
   ```

## 📖 Documentation

- [AGENTS.md](AGENTS.md): Detailed architectural guide and developer workflows.
- [docs/STYLE_GUIDE.md](docs/STYLE_GUIDE.md): Aesthetic and interaction standards.
- [CHANGELOG.md](CHANGELOG.md): History of notable changes.

---

<div align="center">
Built for the next generation of image analysis.
</div>
