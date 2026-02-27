<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# how can I make a plugin system for my image viewer app that can add new backend and frontend components/features/modifications?

(Tauri/rust)
Frontend: React 19, Vite 7, TypeScript, Lucide React.
Backend: FastAPI, OpenCV, NumPy, Scikit-Learn.
Package Management: uv (Backend), npm (Frontend).
Quality: Biome (JS/TS), Ruff (Python), Ty (Python Types).

Here's a comprehensive architecture for a plugin system in your Tauri/React image viewer app. The system has three layers: a **Rust/Tauri plugin layer**, a **Python/FastAPI plugin layer**, and a **React frontend plugin layer**, with a manifest-driven loader connecting all three.

***

## Overall Architecture

Each plugin is a self-contained directory (e.g., `plugins/my-filter/`) containing:

- A Python module for backend logic (new routes, OpenCV filters, etc.)
- A TypeScript/React module for frontend UI (new panels, toolbar buttons, etc.)
- A `plugin.json` manifest declaring its capabilities

```
image-viewer/
├── src-tauri/          # Tauri/Rust host
├── backend/
│   ├── main.py
│   ├── plugin_loader.py
│   └── plugins/
│       └── sepia_filter/
│           ├── plugin.json
│           ├── backend.py   # FastAPI routes / OpenCV logic
│           └── frontend/    # (or symlinked to src/plugins/)
│               └── index.tsx
└── src/                # React frontend
    ├── plugin-system/
    │   ├── PluginRegistry.ts
    │   └── PluginSlot.tsx
    └── plugins/
        └── sepia_filter/
            └── index.tsx
```


***

## The Plugin Manifest

Each plugin declares its metadata and extension points in `plugin.json`:

```json
{
  "id": "sepia_filter",
  "name": "Sepia Filter",
  "version": "1.0.0",
  "backend": "backend.py",
  "frontend": "index.tsx",
  "slots": ["toolbar", "sidebar"],
  "permissions": ["read_image", "write_image"]
}
```


***

## Backend: FastAPI Dynamic Loading

Using Python's `importlib`, you can scan the plugins directory and mount each plugin's router onto the main FastAPI app at startup [^1_1]. Create a base class all backend plugins must implement:

```python
# backend/plugin_base.py
from abc import ABC, abstractmethod
from fastapi import APIRouter

class PluginBase(ABC):
    @property
    @abstractmethod
    def router(self) -> APIRouter:
        """Return the plugin's FastAPI router."""
        ...

    @property
    def plugin_id(self) -> str:
        return self.__class__.__module__.split(".")[-2]
```

Then the loader scans and mounts all plugins dynamically [^1_2][^1_1]:

```python
# backend/plugin_loader.py
import importlib
import json
from pathlib import Path
from fastapi import FastAPI

def load_plugins(app: FastAPI, plugins_dir: str = "plugins") -> None:
    base = Path(plugins_dir)
    for manifest_path in base.glob("*/plugin.json"):
        manifest = json.loads(manifest_path.read_text())
        plugin_id = manifest["id"]
        module_path = f"plugins.{plugin_id}.backend"
        try:
            module = importlib.import_module(module_path)
            plugin: PluginBase = module.Plugin()
            app.include_router(
                plugin.router,
                prefix=f"/plugins/{plugin_id}",
                tags=[plugin_id],
            )
            print(f"[plugins] Loaded: {plugin_id}")
        except Exception as e:
            print(f"[plugins] Failed to load {plugin_id}: {e}")
```

A concrete plugin example for a sepia filter:

```python
# backend/plugins/sepia_filter/backend.py
import cv2, numpy as np
from fastapi import APIRouter, UploadFile

router_instance = APIRouter()

@router_instance.post("/apply")
async def apply_sepia(file: UploadFile):
    data = np.frombuffer(await file.read(), np.uint8)
    img = cv2.imdecode(data, cv2.IMREAD_COLOR)
    kernel = np.array([[0.272,0.534,0.131],[0.349,0.686,0.168],[0.393,0.769,0.189]])
    sepia = cv2.transform(img, kernel)
    _, buf = cv2.imencode(".jpg", sepia)
    return {"result": buf.tobytes().hex()}

class Plugin:
    @property
    def router(self): return router_instance
```

In `main.py`:

```python
from fastapi import FastAPI
from plugin_loader import load_plugins

app = FastAPI()
load_plugins(app, "plugins")
```


***

## Frontend: React Dynamic Plugin Registry

Use a registry pattern with `React.lazy` and dynamic `import()` to load plugin UI components [^1_3][^1_4]. Tauri plugins can hook into lifecycle events like `on_webview_ready` to inject initialization scripts as well [^1_5].

**The registry** (`src/plugin-system/PluginRegistry.ts`):

```typescript
import { lazy, ComponentType } from "react";

export type PluginSlot = "toolbar" | "sidebar" | "context-menu" | "panel";

export interface PluginMeta {
  id: string;
  name: string;
  slots: PluginSlot[];
  component: ReturnType<typeof lazy>;
}

const registry = new Map<string, PluginMeta>();

export function registerPlugin(meta: Omit<PluginMeta, "component"> & { importFn: () => Promise<{ default: ComponentType }> }) {
  registry.set(meta.id, {
    ...meta,
    component: lazy(meta.importFn),
  });
}

export function getPluginsForSlot(slot: PluginSlot): PluginMeta[] {
  return [...registry.values()].filter(p => p.slots.includes(slot));
}
```

**A plugin slot component** (`src/plugin-system/PluginSlot.tsx`):

```tsx
import { Suspense } from "react";
import { getPluginsForSlot, PluginSlot as SlotType } from "./PluginRegistry";

interface Props { slot: SlotType; }

export function PluginSlot({ slot }: Props) {
  const plugins = getPluginsForSlot(slot);
  return (
    <>
      {plugins.map(p => (
        <Suspense key={p.id} fallback={null}>
          <p.component />
        </Suspense>
      ))}
    </>
  );
}
```

**Register plugins in one central file** (`src/plugins/index.ts`):

```typescript
import { registerPlugin } from "../plugin-system/PluginRegistry";

registerPlugin({
  id: "sepia_filter",
  name: "Sepia Filter",
  slots: ["toolbar", "sidebar"],
  importFn: () => import("./sepia_filter"),
});
```

**Drop the slot anywhere in your app:**

```tsx
// In your toolbar component
import { PluginSlot } from "../plugin-system/PluginSlot";

export function Toolbar() {
  return (
    <div className="toolbar">
      <PluginSlot slot="toolbar" />
    </div>
  );
}
```


***

## Tauri: Bridging the Two Sides

Tauri's `invoke` IPC is how your React plugin components call the FastAPI backend [^1_5][^1_6]. Since your backend is FastAPI (not native Rust), the Tauri layer acts as a proxy or you call the FastAPI HTTP server directly from the webview:

```typescript
// In a plugin's frontend component
import { fetch } from "@tauri-apps/plugin-http";

export default function SepiaFilterButton() {
  const applyFilter = async () => {
    const res = await fetch("http://localhost:8000/plugins/sepia_filter/apply", {
      method: "POST",
      body: imageFormData,
    });
    // handle result
  };
  return <button onClick={applyFilter}>Sepia</button>;
}
```

For native Tauri commands (file I/O, OS integrations), define them in `src-tauri/src/main.rs` as `#[tauri::command]` functions, which plugins can invoke via `invoke("command_name")` [^1_5].

***

## Key Design Decisions

| Concern | Solution |
| :-- | :-- |
| Backend plugin discovery | `importlib` + manifest scan at FastAPI startup [^1_2] |
| Frontend lazy loading | `React.lazy` + dynamic `import()` per plugin [^1_4] |
| Slot-based UI extension | `PluginSlot` component queries registry by slot name |
| Type safety | `PluginBase` ABC in Python, typed `PluginMeta` interface in TS [^1_3] |
| Permissions | Declared in `plugin.json`, enforced by Tauri's capability system [^1_5] |
| Hot reload (dev) | Vite's HMR handles frontend; `watchdog` + `importlib.reload` for backend |

For linting, Ruff/Ty will naturally enforce the `PluginBase` abstract interface on backend plugins, and Biome will catch TypeScript slot mismatches in the frontend registry — keeping plugin authors honest with zero extra tooling.
<span style="display:none">[^1_10][^1_11][^1_12][^1_13][^1_14][^1_15][^1_7][^1_8][^1_9]</span>

<div align="center">⁂</div>

[^1_1]: https://github.com/skitsanos/fastapi-dynamic-routes

[^1_2]: https://www.youtube.com/watch?v=cbot48lckOs

[^1_3]: https://www.youtube.com/watch?v=0Fl8R_lVj9c

[^1_4]: https://www.youtube.com/watch?v=V4aFn3RpZG8

[^1_5]: https://v2.tauri.app/develop/plugins/

[^1_6]: https://v2.tauri.app/concept/architecture/

[^1_7]: https://github.com/tauri-apps/tauri/blob/dev/ARCHITECTURE.md

[^1_8]: https://www.reddit.com/r/rust/comments/1nvvoee/built_a_desktop_app_with_tauri_20_impressions/

[^1_9]: https://deepwiki.com/tauri-apps/tauri-plugin-store/4-rust-backend-implementation

[^1_10]: https://dev.to/mdabir1203/tauri-framework-code-first-deep-dive-e1-411d

[^1_11]: https://it.linkedin.com/pulse/come-creare-un-sistema-di-plugin-per-unapplicazione-luca-montemagno-goikf

[^1_12]: https://github.com/tauri-apps/tauri/discussions/9990

[^1_13]: https://fastapi.tiangolo.com

[^1_14]: https://www.youtube.com/watch?v=4k9iex038cA

[^1_15]: https://www.youtube.com/watch?v=VMcTNqH5J5g


---

# is there a way to compile the plugin into one file and then it gets treated as the entire package or unpacked to the plugin folder?

Yes — a great pattern for this is a **`.plugin` archive format** (essentially a renamed `.zip`) that can either be imported directly without extraction, or unpacked to the plugins folder on install. Here's how to implement both approaches across your stack:

***

## The `.plugin` Archive Format

Design a single `.plugin` file (just a ZIP under the hood) with this structure:

```
my-edge-detection.plugin   (ZIP archive)
├── plugin.json            ← manifest: id, name, version, provides
├── backend/
│   ├── __init__.py
│   └── plugin.py          ← ImageViewerPlugin subclass
└── frontend/
    └── index.js           ← pre-bundled ESM module (Vite build output)
```

You then offer two modes: **install** (unpack to `plugins/`) or **import directly** from the zip.

***

## Backend: Python Zip Import

Python's built-in `zipimport` module lets you import `.py` files directly from a ZIP archive without ever extracting it [^2_1][^2_2]. Add the zip path to `sys.path` and Python handles the rest:

```python
# app/plugin_loader.py
import sys, zipimport, json, zipfile
from pathlib import Path
from app.plugin_base import ImageViewerPlugin

PLUGINS_DIR = Path("plugins")

def load_from_archive(archive_path: Path) -> ImageViewerPlugin:
    # Read manifest from zip
    with zipfile.ZipFile(archive_path) as zf:
        manifest = json.loads(zf.read("plugin.json"))

    # Add zip to sys.path so Python can import backend/ as a package
    sys.path.insert(0, str(archive_path))
    importer = zipimport.zipimporter(str(archive_path / "backend"))
    module = importer.load_module("plugin")
    instance = module.Plugin()
    instance.manifest = manifest
    return instance

def discover_plugins() -> list[ImageViewerPlugin]:
    plugins = []
    # Load installed (unpacked) plugins
    for d in PLUGINS_DIR.iterdir():
        if d.is_dir() and (d / "backend" / "plugin.py").exists():
            # regular importlib path (as before)
            ...
    # Load zipped plugins directly
    for archive in PLUGINS_DIR.glob("*.plugin"):
        plugins.append(load_from_archive(archive))
    return plugins
```

Python automatically compiles `.py` files inside the zip on first import and won't modify the archive [^2_1].

***

## Frontend: Pre-bundled ESM from the Archive

The frontend side uses Vite to **pre-bundle the plugin's React components into a single `index.js` ESM file** at plugin build time. At runtime, Tauri extracts just that JS file to a temp/assets path, then dynamically imports it:

**Plugin's own `vite.config.ts` (in the plugin's source repo):**

```typescript
// builds frontend/index.js as a self-contained ESM bundle
export default defineConfig({
  build: {
    lib: {
      entry: "src/index.tsx",
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      // treat React as external — host app provides it
      external: ["react", "react-dom", "lucide-react"],
      output: { globals: { react: "React" } },
    },
    outDir: "frontend",
  },
});
```

**Host app loader — extract JS and dynamic-import it:**

```typescript
// src/plugin-system/loader.ts
import { invoke } from "@tauri-apps/api/core";

export async function loadPluginFromArchive(pluginId: string) {
  // Tauri command extracts frontend/index.js to a temp file, returns its path
  const jsPath: string = await invoke("extract_plugin_frontend", { pluginId });

  // Dynamic import of the extracted ESM bundle
  const mod = await import(/* @vite-ignore */ jsPath);
  pluginRegistry.register(mod.default);
}
```

The `/* @vite-ignore */` comment is required to prevent Vite from trying to statically analyze the dynamic path [^2_3].

***

## Tauri: Install vs. Direct-Load Command

The Rust side handles both the **install** (unpack) flow and the **extract-for-import** flow:

```rust
use std::fs;
use zip::ZipArchive;

// Install: unpack .plugin file to plugins dir
#[tauri::command]
fn install_plugin(app: tauri::AppHandle, archive_path: String) -> Result<(), String> {
    let plugins_dir = app.path().app_data_dir().unwrap().join("plugins");
    let file = fs::File::open(&archive_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    
    // Read manifest to get plugin id
    let manifest: serde_json::Value = {
        let mut f = archive.by_name("plugin.json").map_err(|e| e.to_string())?;
        serde_json::from_reader(&mut f).map_err(|e| e.to_string())?
    };
    let id = manifest["id"].as_str().unwrap_or("unknown");
    archive.extract(plugins_dir.join(id)).map_err(|e| e.to_string())?;
    Ok(())
}

// Extract just the JS for direct-load without full install
#[tauri::command]
fn extract_plugin_frontend(app: tauri::AppHandle, plugin_id: String) -> Result<String, String> {
    let archive_path = app.path().app_data_dir().unwrap()
        .join("plugins").join(format!("{}.plugin", plugin_id));
    let tmp_path = std::env::temp_dir().join(format!("{}_index.js", plugin_id));
    
    let file = fs::File::open(archive_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;
    let mut js = archive.by_name("frontend/index.js").map_err(|e| e.to_string())?;
    let mut out = fs::File::create(&tmp_path).map_err(|e| e.to_string())?;
    std::io::copy(&mut js, &mut out).map_err(|e| e.to_string())?;
    
    Ok(tmp_path.to_string_lossy().to_string())
}
```

Add the `zip` crate to `Cargo.toml`: `zip = "2"`.

***

## Packaging a Plugin (Developer Workflow)

Add this script to each plugin's repo to produce the final `.plugin` file:

```python
# build_plugin.py  (run with `uv run build_plugin.py`)
import zipfile, subprocess, shutil
from pathlib import Path

# 1. Build frontend
subprocess.run(["npm", "run", "build"], check=True)

# 2. Package everything into .plugin archive
with zipfile.ZipFile("my-plugin.plugin", "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write("plugin.json")
    for f in Path("backend").rglob("*.py"):
        zf.write(f)
    zf.write("frontend/index.js")

print("Built my-plugin.plugin")
```


***

## Two Deployment Modes at a Glance

| Mode | How it works | Best for |
| :-- | :-- | :-- |
| **Direct load** | `.plugin` zip stays as-is, Python uses `zipimport`, JS is extracted to temp | Quick try-out, sandboxed loading |
| **Install** (unpack) | Tauri unpacks zip to `plugins/<id>/` dir, standard folder-based loading | Persistent install, easier debugging |

Both modes share the same `.plugin` archive format — the only difference is whether Tauri unpacks it first or hands it off directly to the loaders.
<span style="display:none">[^2_10][^2_11][^2_12][^2_13][^2_14][^2_15][^2_4][^2_5][^2_6][^2_7][^2_8][^2_9]</span>

<div align="center">⁂</div>

[^2_1]: https://realpython.com/python-zip-import/

[^2_2]: https://www.w3schools.com/python/ref_module_zipimport.asp

[^2_3]: https://github.com/vitejs/vite/discussions/12104

[^2_4]: https://docs.python.org/3/library/zipimport.html

[^2_5]: https://docs.python.org/3/library/importlib.resources.html

[^2_6]: https://stackoverflow.com/questions/39135750/python-load-zip-with-modules-from-memory

[^2_7]: https://github.com/vitejs/vite/issues/14541

[^2_8]: https://docs.python.org/ja/dev/library/zipimport.html

[^2_9]: https://github.com/vitejs/vite/discussions/18097

[^2_10]: https://documentation.help/IronPython/zipimport.html

[^2_11]: https://stackoverflow.com/questions/75372216/how-do-i-bundle-my-node-js-code-into-a-single-file-using-vite-js

[^2_12]: https://python.flowdas.com/library/zipimport.html

[^2_13]: https://runebook.dev/ja/docs/python/library/zipimport

[^2_14]: https://v2.vitejs.dev/guide/features

[^2_15]: https://docs.pythonlang.cn/3/library/zipimport.html


---

# is there a way to compile the plugin into one file and then it gets treated as the entire package or unpacked to the plugin folder? this is planned to be a proper app not something where the user has to mess with vite and whatnot

Good clarification — the goal is that a **plugin author** just ships one opaque binary/archive file, and the **end user** double-clicks it (or drops it into a folder) to install. No Vite, no uv, no toolchain needed on the user's side. Here's how to build that properly:

***

## The End-User Flow

```
plugin-author builds → my-plugin.plugin
end-user drops it → app installs it automatically
```

The `.plugin` file is still a ZIP, but the **plugin author** does all the building. Inside is only compiled/bundled artifacts — no source files, no build tools required on the user machine.

***

## What Goes Inside the `.plugin` File

```
my-edge-detection.plugin  (ZIP)
├── plugin.json            ← manifest
├── backend.pyc            ← compiled Python bytecode (no .py source needed)
└── frontend.js            ← pre-bundled single ESM file (no node_modules)
```

That's it. Two files + manifest. No subdirectories, no dependencies, no toolchain.

***

## Backend: Compiled Bytecode (`.pyc`)

Python's `zipimport` can load `.pyc` files directly from a zip — no source required [^3_1][^3_2]. The plugin author compiles their code once:

```python
# Plugin author runs this to produce backend.pyc
import py_compile, shutil
py_compile.compile("backend/plugin.py", cfile="backend.pyc", optimize=2)
```

The host app loads it directly from the archive at runtime:

```python
import zipimport, zipfile, json
from pathlib import Path

def load_plugin(archive: Path):
    with zipfile.ZipFile(archive) as zf:
        manifest = json.loads(zf.read("plugin.json"))

    # zipimport handles .pyc directly — no extraction needed
    importer = zipimport.zipimporter(str(archive))
    module = importer.load_module("backend")  # finds backend.pyc inside zip
    return module.Plugin(), manifest
```

Python finds and executes `backend.pyc` inside the ZIP transparently [^3_1]. No `.py` source is needed, and nothing is written to disk.

***

## Frontend: Single Bundled JS File

The plugin author uses Vite's library mode to produce one self-contained `frontend.js`. The user never touches Vite — the author runs the build once before publishing [^3_3]:

```typescript
// Plugin author's vite.config.ts (they run this, not the user)
export default defineConfig({
  build: {
    lib: {
      entry: "src/index.tsx",
      formats: ["es"],
      fileName: () => "frontend",
    },
    rollupOptions: {
      // React and Lucide come from the host app — keep them external
      external: ["react", "react-dom", "react/jsx-runtime", "lucide-react"],
    },
    // No code splitting — everything in one file
    cssCodeSplit: false,
  },
});
```

This outputs a single `frontend.js` with all the plugin's React components inlined. The host app extracts and imports it:

```typescript
// Host: extract frontend.js to app cache dir, then dynamic import
import { appCacheDir } from "@tauri-apps/api/path";
import { invoke } from "@tauri-apps/api/core";
import { registerPlugin } from "./PluginRegistry";

export async function installPlugin(archivePath: string) {
  // Tauri Rust command: reads plugin.json + extracts frontend.js to cache
  const { id, jsPath }: { id: string; jsPath: string } =
    await invoke("install_plugin", { archivePath });

  // Dynamic import of the extracted single file
  const mod = await import(/* @vite-ignore */ `file://${jsPath}`);
  registerPlugin(id, mod.default);
}
```


***

## Tauri Install Command (Rust)

This is the only place any extraction happens — into the app's own data directory, not anywhere the user has to care about [^3_4]:

```rust
use std::{fs, io::Read};
use zip::ZipArchive;
use tauri::Manager;

#[tauri::command]
fn install_plugin(
    app: tauri::AppHandle,
    archive_path: String,
) -> Result<serde_json::Value, String> {
    let cache = app.path().app_cache_dir().map_err(|e| e.to_string())?;
    let file = fs::File::open(&archive_path).map_err(|e| e.to_string())?;
    let mut zip = ZipArchive::new(file).map_err(|e| e.to_string())?;

    // Read manifest
    let manifest: serde_json::Value = {
        let mut f = zip.by_name("plugin.json").map_err(|e| e.to_string())?;
        let mut s = String::new();
        f.read_to_string(&mut s).map_err(|e| e.to_string())?;
        serde_json::from_str(&s).map_err(|e| e.to_string())?
    };

    let id = manifest["id"].as_str().unwrap_or("unknown").to_string();
    let plugin_dir = cache.join("plugins").join(&id);
    fs::create_dir_all(&plugin_dir).map_err(|e| e.to_string())?;

    // Extract only what's needed
    for name in ["plugin.json", "backend.pyc", "frontend.js"] {
        if let Ok(mut entry) = zip.by_name(name) {
            let out_path = plugin_dir.join(name);
            let mut out = fs::File::create(&out_path).map_err(|e| e.to_string())?;
            std::io::copy(&mut entry, &mut out).map_err(|e| e.to_string())?;
        }
    }

    let js_path = plugin_dir.join("frontend.js").to_string_lossy().to_string();
    Ok(serde_json::json!({ "id": id, "jsPath": js_path }))
}
```


***

## Plugin Author's Full Build Script

They run this once, ship the `.plugin` file — that's it:

```python
# build.py  (plugin author only, run once before publishing)
import py_compile, zipfile, subprocess, os

# 1. Compile Python to bytecode
py_compile.compile("src/backend/plugin.py", cfile="dist/backend.pyc", optimize=2)

# 2. Bundle React components to single JS
subprocess.run(["npm", "run", "build"], check=True)  # outputs dist/frontend.js

# 3. Pack into .plugin archive
with zipfile.ZipFile("my-edge-detection.plugin", "w", zipfile.ZIP_DEFLATED) as zf:
    zf.write("plugin.json")
    zf.write("dist/backend.pyc", "backend.pyc")
    zf.write("dist/frontend.js", "frontend.js")

print("✓ my-edge-detection.plugin ready to distribute")
```


***

## What Each Party Deals With

| Role | Tools needed | What they touch |
| :-- | :-- | :-- |
| **Plugin author** | Python, Node/npm, Vite | Writes code, runs `build.py` once, ships `.plugin` |
| **End user** | Just your app | Drops `.plugin` into app or uses Install button |
| **Your app (host)** | `zipimport`, `dynamic import()` | Reads the `.plugin`, loads bytecode + JS |

The end user never sees a terminal, a config file, or a dependency manager.
<span style="display:none">[^3_10][^3_11][^3_12][^3_13][^3_14][^3_15][^3_5][^3_6][^3_7][^3_8][^3_9]</span>

<div align="center">⁂</div>

[^3_1]: https://realpython.com/python-zip-import/

[^3_2]: https://pymotw.com/2/zipimport/

[^3_3]: https://vite.dev/guide/build

[^3_4]: https://v2.tauri.app/develop/resources/

[^3_5]: https://dev.to/receter/how-to-create-a-react-component-library-using-vites-library-mode-4lma

[^3_6]: https://v3.vitejs.dev/guide/build

[^3_7]: https://www.npmjs.com/package/vite-plugin-singlefile

[^3_8]: https://stackoverflow.com/questions/75372216/how-do-i-bundle-my-node-js-code-into-a-single-file-using-vite-js

[^3_9]: https://github.com/tauri-apps/tauri/discussions/5206

[^3_10]: https://github.com/vitejs/vite/discussions/16123

[^3_11]: https://jonaskruckenberg.github.io/tauri-docs-wip/examples/sidecar.html

[^3_12]: https://github.com/ManBearTM/vite-plugin-no-bundle

[^3_13]: https://stackoverflow.com/questions/32923952/how-do-i-list-the-files-inside-a-python-wheel

[^3_14]: https://stackoverflow.com/questions/79605225/producing-types-for-commonjs-modules-with-vite-plugin-dts

[^3_15]: https://docs.python.org/3/library/importlib.resources.html


---

# is that fast? what about the plugin being installed to a plugin folder? how do you handle safety?

These are three genuinely separate concerns — let's break them down honestly.

***

## Performance

**The short answer: fast enough, with one caveat.**

For the backend, `zipimport` with pre-compiled `.pyc` files has negligible overhead — Python only reads the zip's central directory index once and caches it in memory [^4_1]. The **only real cost is decompression on first load**. To avoid even that, use `ZIP_STORED` (no compression) instead of `ZIP_DEFLATED` in your build script [^4_1]:

```python
# In build.py — use ZIP_STORED for faster import
with zipfile.ZipFile("my-plugin.plugin", "w", zipfile.ZIP_STORED) as zf:
    ...
```

After the first load, the module is cached in `sys.modules` like any normal import — subsequent calls to plugin code are identical in speed to regular Python. The `frontend.js` extraction is a one-time disk write at install time, so after that, `dynamic import()` hits the local filesystem directly and is fast.

***

## Install-to-Folder (Persistent Install)

This is the better model for a proper app. Instead of extracting to a temp dir each run, **install once → load from folder every time**. Add an install/uninstall flow with a UI:

**Rust install command — unpacks to `AppData/plugins/<id>/`:**

```rust
#[tauri::command]
fn install_plugin(app: tauri::AppHandle, archive_path: String) -> Result<String, String> {
    let plugins_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?
        .join("plugins");

    let file = fs::File::open(&archive_path).map_err(|e| e.to_string())?;
    let mut zip = ZipArchive::new(file).map_err(|e| e.to_string())?;

    // Read manifest first to get ID
    let manifest: serde_json::Value = {
        let mut f = zip.by_name("plugin.json").map_err(|e| e.to_string())?;
        let mut s = String::new();
        f.read_to_string(&mut s).map_err(|e| e.to_string())?;
        serde_json::from_str(&s).map_err(|e| e.to_string())?
    };
    let id = manifest["id"].as_str().unwrap_or("unknown").to_string();

    // Unpack to permanent plugin folder
    let dest = plugins_dir.join(&id);
    fs::create_dir_all(&dest).map_err(|e| e.to_string())?;
    zip.extract(&dest).map_err(|e| e.to_string())?;

    Ok(id) // return id so frontend can register immediately
}

#[tauri::command]
fn uninstall_plugin(app: tauri::AppHandle, plugin_id: String) -> Result<(), String> {
    let dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?
        .join("plugins").join(&plugin_id);
    fs::remove_dir_all(dir).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_installed_plugins(app: tauri::AppHandle) -> Result<Vec<serde_json::Value>, String> {
    let plugins_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?
        .join("plugins");
    let mut manifests = vec![];
    for entry in fs::read_dir(plugins_dir).map_err(|e| e.to_string())? {
        let path = entry.map_err(|e| e.to_string())?.path().join("plugin.json");
        if path.exists() {
            let s = fs::read_to_string(&path).map_err(|e| e.to_string())?;
            manifests.push(serde_json::from_str(&s).map_err(|e| e.to_string())?);
        }
    }
    Ok(manifests)
}
```

At
<span style="display:none">[^4_10][^4_11][^4_12][^4_13][^4_14][^4_15][^4_2][^4_3][^4_4][^4_5][^4_6][^4_7][^4_8][^4_9]</span>

<div align="center">⁂</div>

[^4_1]: https://realpython.com/python-zip-import/

[^4_2]: https://stackoverflow.com/questions/61903422/whats-the-overhead-of-using-built-in-python-functions-like-zip-and-join-on

[^4_3]: https://www.reddit.com/r/Python/comments/198vrtj/are_local_imports_a_good_idea_to_speed_up_import/

[^4_4]: https://gregoryszorc.com/blog/2019/01/10/what-i've-learned-about-optimizing-python/

[^4_5]: https://python.plainenglish.io/python-imports-are-killing-your-app-speed-and-how-to-fix-it-a21647142649

[^4_6]: https://huakun.tech/Full-Stack/Framework/Tauri/tauri-v2

[^4_7]: https://www.youtube.com/watch?v=buAEExOsHZA

[^4_8]: https://docs.python.org/uk/3/library/zipimport.html

[^4_9]: https://app.studyraid.com/en/read/32061/1400834/limitations-with-external-file-loading-in-sandboxes

[^4_10]: https://5.docs.plone.org/develop/plone/security/sandboxing.html

[^4_11]: https://docs.python.org/3/library/zipimport.html

[^4_12]: https://github.com/tauri-apps/tauri/discussions/8687\&rut=d1d2eee317e068778640230c8addd13b08295c88c3a2be1f5517b6e02cd57d72

[^4_13]: https://github.com/zopefoundation/RestrictedPython

[^4_14]: https://runebook.dev/ja/docs/python/library/zipimport

[^4_15]: https://v2.tauri.app/security/capabilities/


---

# is that fast? what about the plugin being installed to a plugin folder? how do you handle safety? this kind of app needs to have no overhead if possible, you want it to open instantly and just work

Great question — since this is a performance-sensitive image viewer, these decisions matter a lot. Let's be direct about each concern.

***

## Performance: The Honest Picture

**Startup cost is zero if you don't load plugins eagerly.** The key rule is: **never load plugins at app startup**. Load them only when first used.

### Backend (Python)

`zipimport` with `.pyc` files is fast [^5_1], but the real win is **not loading plugin modules at FastAPI startup at all**. Instead, use a lazy registry — scan manifests only (just reading `plugin.json`), and import the actual Python module only when the first HTTP request hits that plugin's route:

```python
# plugin_loader.py — scan manifests at startup, import code on first request
from fastapi import FastAPI, APIRouter
import importlib, json
from pathlib import Path

class LazyPluginRouter:
    def __init__(self, plugin_dir: Path, manifest: dict):
        self._dir = plugin_dir
        self._manifest = manifest
        self._loaded = False
        self._router: APIRouter | None = None

    def get_router(self) -> APIRouter:
        if not self._loaded:
            module = importlib.import_module(f"plugins.{self._manifest['id']}.backend")
            self._router = module.Plugin().router
            self._loaded = True
        return self._router

def register_plugins(app: FastAPI, plugins_dir: Path):
    for manifest_path in plugins_dir.glob("*/plugin.json"):
        manifest = json.loads(manifest_path.read_text())
        lazy = LazyPluginRouter(manifest_path.parent, manifest)

        # Mount a thin wrapper — only imports plugin code on first actual call
        router = APIRouter()

        @router.api_route("/{path:path}", methods=["GET","POST","PUT","DELETE"])
        async def proxy(path: str, lazy=lazy):
            # First call triggers the real import
            return await lazy.get_router()  # delegate properly in real impl

        app.include_router(router, prefix=f"/plugins/{manifest['id']}")
```

In practice, even eager import of a compiled `.pyc` plugin is measured in **single-digit milliseconds** — it's the `import cv2` / `import numpy` cold-start in the plugin that costs time, and lazy loading defers that entirely.

### Frontend (React)

`React.lazy` already handles this — plugin UI bundles are **never downloaded until a user opens a feature that needs them** [^5_2][^5_3]. The main app JS bundle stays small regardless of how many plugins are installed.

***

## Plugin Folder Install (Persistent)

On install, unpack once to `AppData/plugins/<id>/`. On every subsequent launch, the app just reads the folder — no zip overhead at all. This is the correct model:

```
~/.local/share/your-app/plugins/
    sepia-filter/
        plugin.json     ← read at startup (tiny, fast)
        backend.pyc     ← imported lazily on first use
        frontend.js     ← loaded lazily by React when needed
    edge-detect/
        plugin.json
        ...
```

Startup only reads `plugin.json` files — that's a few kilobytes of JSON at most, even with 50 plugins installed. The Rust side for install/uninstall:

```rust
#[tauri::command]
fn install_plugin(app: tauri::AppHandle, archive_path: String) -> Result<serde_json::Value, String> {
    let plugins_dir = app.path().app_data_dir()
        .map_err(|e| e.to_string())?.join("plugins");

    let file = fs::File::open(&archive_path).map_err(|e| e.to_string())?;
    let mut zip = ZipArchive::new(file).map_err(|e| e.to_string())?;

    // Read manifest to get the plugin ID before extracting
    let manifest: serde_json::Value = serde_json::from_reader(
        zip.by_name("plugin.json").map_err(|e| e.to_string())?
    ).map_err(|e| e.to_string())?;

    let id = manifest["id"].as_str().unwrap_or("unknown");
    zip.extract(plugins_dir.join(id)).map_err(|e| e.to_string())?;

    Ok(manifest) // return manifest so frontend can register immediately without restart
}

#[tauri::command]
fn uninstall_plugin(app: tauri::AppHandle, id: String) -> Result<(), String> {
    fs::remove_dir_all(
        app.path().app_data_dir().map_err(|e| e.to_string())?.join("plugins").join(id)
    ).map_err(|e| e.to_string())
}
```

No app restart needed — install returns the manifest, and the frontend registers the plugin immediately in the live registry.

***

## Safety

This is the honest part: **Python has no true sandboxing at the language level** [^5_4]. Any pure-Python sandbox (RestrictedPython, AST filtering, etc.) has known bypasses via the object system [^5_4][^5_5]. For a real app, your options are:


| Approach | Isolation | Overhead | Complexity |
| :-- | :-- | :-- | :-- |
| **Trust model** (signed plugins) | None — but verified author | Zero | Low |
| **Subprocess isolation** | Process boundary — can't touch your memory | ~10–50ms per call | Medium |
| **OS-level permissions** (Tauri capabilities) | Restricts what Tauri IPC the plugin's UI can call | Zero | Low |
| **Container/VM** | Full isolation | Too heavy for a desktop app | Very high |

### Recommended for your app: Trust + Tauri Capabilities

The practical approach used by apps like VS Code and Obsidian is a **trust model with capability restrictions** — not a sandbox:

- **Signed plugins**: You (or a marketplace) sign `.plugin` files with a private key. Tauri verifies the signature before install. Unknown/unsigned plugins show a warning.
- **Declared permissions in `plugin.json`**: Plugins declare what they need (`read_image`, `write_image`, `network`, etc.). You show this to the user on install like Android app permissions.
- **Tauri capabilities** restrict what IPC commands plugin frontend code can invoke [^5_6][^5_7]:

```json
// src-tauri/capabilities/plugin-limited.json
{
  "identifier": "plugin-sandbox",
  "windows": ["plugin-*"],
  "permissions": [
    "fs:allow-read-dir",
    "http:default"
  ]
  // notably absent: shell:execute, fs:allow-write-home, etc.
}
```

- **Subprocess isolation for backend** (optional, high-trust scenarios): Run each plugin's Python code in a separate process with restricted OS permissions. Adds ~10–50ms latency per call but fully prevents a rogue plugin from accessing your app's memory or files [^5_4].

The honest recommendation: for a desktop image viewer, **signing + declared permissions** is the right balance. Full sandboxing is what browser vendors spend years building — don't try to replicate it in Python. Make it clear in your docs that plugins run with user-level trust, the same as any installed desktop app.
<span style="display:none">[^5_10][^5_11][^5_12][^5_13][^5_14][^5_15][^5_16][^5_8][^5_9]</span>

<div align="center">⁂</div>

[^5_1]: https://realpython.com/python-zip-import/

[^5_2]: https://www.linkedin.com/posts/rayied_react-webdevelopment-performance-activity-7403868712896020480-p7jG

[^5_3]: https://strapi.io/blog/lazy-loading-in-react

[^5_4]: https://checkmarx.com/zero-post/glass-sandbox-complexity-of-python-sandboxing/

[^5_5]: https://stackoverflow.com/questions/3068139/how-can-i-sandbox-python-in-pure-python

[^5_6]: https://v2.tauri.app/security/permissions/

[^5_7]: https://playbooks.com/skills/dchuk/claude-code-tauri-skills/tauri-runtime-authority

[^5_8]: https://discuss.python.org/t/extending-subinterpreters-with-sandboxing-capabilities/45355

[^5_9]: https://blogs.windows.com/windowsdeveloper/2024/03/06/sandboxing-python-with-win32-app-isolation/

[^5_10]: https://healeycodes.com/running-untrusted-python-code

[^5_11]: https://doc.pypy.org/en/stable/sandbox.html

[^5_12]: https://v2.tauri.app/learn/security/using-plugin-permissions/

[^5_13]: https://playbooks.com/skills/amnadtaowsoam/cerebraskills/sandboxing

[^5_14]: https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/learn/Security/using-plugin-permissions.mdx

[^5_15]: https://dev.to/rfornal/lazy-loading-as-a-security-measure-3odb

[^5_16]: https://5.docs.plone.org/develop/plone/security/sandboxing.html


---

# it's not mandatory to use python if there's something better. but is there?

Great question to step back and ask. The Python backend is there because of OpenCV/NumPy/Scikit-Learn — if you're willing to move those, you have better options. Here's the honest breakdown:

***

## Why Python Is There in the First Place

Your current stack uses Python purely as a **compute backend** — OpenCV for image processing, NumPy for arrays, Scikit-Learn for ML. It's not serving a web API in the traditional sense; it's just doing math on pixels. That's the lens to evaluate alternatives through.

***

## The Alternatives

| Option | Image Processing | Plugin Safety | Startup | Complexity |
| :-- | :-- | :-- | :-- | :-- |
| **Python (current)** | Best ecosystem (cv2, sk-learn) | Poor native sandboxing | Slow cold start | Medium |
| **Rust (native Tauri)** | Good (`image`, `imageproc`, `ndarray`) | Full memory safety, OS process isolation | Instant | High |
| **WASM plugins** | Moderate (`opencv-wasm`, raw computation) | Near-perfect — WASM sandbox | Instant | Medium-High |
| **Node.js sidecar** | Weak (no real cv2 equivalent) | Poor | Fast | Low |
| **Lua/Wren embedded** | Only via FFI | Moderate | Instant | Medium |


***

## The Real Contender: WASM Plugins

This is arguably the **best fit for your specific goals** — instant startup, zero overhead after load, and a real security sandbox by design. Tauri runs in a WebView which already has a WASM runtime built in [^6_1].

- Plugins compile to `.wasm` — one file, cross-platform, no Python runtime needed
- The WASM sandbox is a **real, proven security boundary** (same model browsers use) — no file system, no network, no OS access unless explicitly given via imports
- Rust, C, C++, AssemblyScript, and even Python (via Pyodide) can compile to WASM
- `opencv-wasm` exists and covers a large portion of OpenCV's API
- For ML, `tract` (ONNX runtime in WASM) handles inference

The catch: **WASM is purely computational** — it can't do I/O on its own. You pass data in, get data out. For an image viewer plugin (take pixels → transform pixels → return pixels), that's actually a perfect match.

```
Plugin WASM module:
  export fn apply(image_bytes: &[u8]) -> Vec<u8>
  
Host (Tauri/Rust):
  1. Read image → bytes
  2. Pass bytes into WASM linear memory
  3. Call export fn
  4. Read result bytes back → display
```


***

## The Recommendation

**Keep Python OR switch to WASM, depending on your plugin author audience:**

- If plugin authors are **data scientists / ML people** → keep Python. They know NumPy, they have models in scikit-learn, fighting that is pointless.
- If plugin authors are **developers building image filters/effects** → WASM is strictly better. Safer, faster, truly portable, no runtime to ship.
- If you want **both**: use WASM for pure image processing plugins and keep a Python sidecar only for ML-heavy features (model inference, feature extraction). Most image viewer plugins won't need ML at all.

The hybrid is actually what production apps do — the core stays in Rust/WASM for performance and safety, and Python is an optional heavyweight sidecar only pulled in when genuinely needed.

<div align="center">⁂</div>

[^6_1]: https://v2.tauri.app/security/permissions/


---

# it's not mandatory to use python if there's something better. but is there? the packages listed are for one of the planned plugins, not the base code

That completely changes the picture. If OpenCV/NumPy/Scikit-Learn are just for **one specific plugin** and not the core app, then there's no reason to make Python a base dependency at all.

***

## What the Core Actually Needs

An image viewer's base requirements are:

- Read/decode image files (JPEG, PNG, TIFF, WebP, RAW, etc.)
- Display them fast in the Tauri WebView
- Expose an API for plugins to hook into
- Pass image data to/from plugins

None of that needs Python. **Rust handles all of it natively and better.**

***

## Revised Architecture

| Layer | Technology | Why |
| :-- | :-- | :-- |
| **Core backend** | Rust (in Tauri) | Fast image decoding, file I/O, zero overhead |
| **Image decoding** | `image` crate + `libvips` bindings | Handles virtually every format including RAW |
| **Plugin runtime** | WASM (via `wasmtime` in Rust) | Real sandbox, one-file plugins, instant load |
| **Frontend** | React 19 + TypeScript (unchanged) | Unchanged |
| **Python plugin** | `.plugin` with embedded Python via `pyo3` or subprocess | Just for that one ML plugin, isolated |


***

## Core in Pure Rust + Wasmtime

With `wasmtime` embedded in Tauri's Rust backend, you get a proper plugin host with zero external runtime:

```rust
// src-tauri/src/plugin_host.rs
use wasmtime::*;

pub struct PluginHost {
    engine: Engine,
    plugins: HashMap<String, Instance>,
}

impl PluginHost {
    pub fn new() -> Self {
        // Engine is created once at startup — instant
        Self { engine: Engine::default(), plugins: HashMap::new() }
    }

    pub fn load_plugin(&mut self, id: &str, wasm_bytes: &[u8]) -> Result<()> {
        let module = Module::new(&self.engine, wasm_bytes)?;
        let mut store = Store::new(&self.engine, ());
        let instance = Instance::new(&mut store, &module, &[])?;
        self.plugins.insert(id.to_string(), instance);
        Ok(())
    }

    pub fn apply_filter(&self, plugin_id: &str, image: &[u8]) -> Result<Vec<u8>> {
        // Call the plugin's exported WASM function directly
        // No HTTP, no IPC overhead — just a function call
        todo!()
    }
}
```

No FastAPI, no HTTP server, no process boundary for the hot path — plugins are just **function calls into WASM memory**.

***

## Plugin Contract

Every WASM plugin exports a simple interface, definable in any language that compiles to WASM:

```rust
// plugin author writes this in Rust (or C, Zig, AssemblyScript...)
#[no_mangle]
pub extern "C" fn apply(ptr: *const u8, len: usize, out_ptr: *mut u8) -> usize {
    // read input image bytes, write result, return output length
}
```

The `.plugin` file becomes even simpler:

```
my-filter.plugin (ZIP)
├── plugin.json
├── backend.wasm    ← compiled WASM, runs everywhere
└── frontend.js     ← pre-bundled React UI (unchanged)
```


***

## The Python ML Plugin Specifically

For that one plugin with OpenCV/NumPy/Scikit-Learn, it just **spawns its own Python subprocess** — completely isolated from the core app. The core doesn't know or care that it's Python:

```rust
// It's just another plugin to the host, but its backend.wasm
// is a thin wrapper that shells out to a bundled Python environment
// OR the plugin ships a self-contained Python via uv's --standalone export
```

With `uv`'s standalone Python export, the plugin can bundle its own Python interpreter + dependencies into the `.plugin` archive — the user still installs one file, and the core app still doesn't have a Python dependency [^7_1].

***

## Bottom Line

- **Drop FastAPI and Python from the core entirely** — pure Rust + Wasmtime is faster, safer, and simpler
- **WASM plugins** are the right default: one file, real sandbox, instant load, any language
- **The ML plugin** is just a heavier plugin that bundles its own Python — treated identically by the plugin system, just larger
- The frontend plugin system (React lazy loading, slots, registry) stays **exactly the same** — that design was already correct

<div align="center">⁂</div>

[^7_1]: https://realpython.com/python-zip-import/


---

# so this will give us security and speed and still allow for all kinds of python based plugins like ai stuff?

Yes, exactly — and it's worth being precise about *why* each property holds.

***

## Security

WASM plugins run in `wasmtime`'s sandbox — they physically cannot access the filesystem, network, or OS unless your Rust host explicitly hands them a capability [^8_1]. This is not a "we trust the author" model or a software convention — it's enforced at the CPU/memory level by the WASM runtime. A malicious WASM plugin literally has no mechanism to escape. For the Python ML plugin, it runs in a subprocess with no special privileges — if it misbehaves, the OS kills it and your core app is untouched.

***

## Speed

The call path for a WASM plugin is:

```
Rust → WASM linear memory (memcpy) → WASM function call → result
```

No HTTP, no sockets, no serialization, no process spawn. `wasmtime` compiles WASM to native machine code at load time (AOT or JIT), so plugin execution runs at near-native speed. Startup is instant because the `wasmtime` `Engine` is initialized once when the app starts, and loading a plugin is just compiling a small binary blob.

***

## Python AI Plugins Still Work

The plugin system doesn't care what's inside the `.plugin` file — it just calls the contract. For Python-heavy plugins, the author has two options:

**Option A — WASM wrapper around Python logic** (clean, harder to build):
The plugin compiles a thin WASM shim that calls out to a bundled Python subprocess via WASI. Wasmtime supports WASI so the plugin can declare exactly what system access it needs.

**Option B — Subprocess plugin** (easy, practical for AI plugins):
The plugin's `backend.wasm` is replaced with a `backend.zip` containing a self-contained Python environment. Your plugin host detects this and spawns it as a managed subprocess:

```
stable-diffusion.plugin (ZIP)
├── plugin.json           ← declares type: "python-subprocess"
├── frontend.js           ← React UI, same as any plugin
└── python/
    ├── python.exe        ← standalone Python (bundled via uv)
    ├── plugin.py         ← the actual logic
    └── site-packages/    ← cv2, torch, diffusers, etc.
```

The host handles both transparently:

```rust
pub enum PluginBackend {
    Wasm(wasmtime::Instance),
    PythonSubprocess(std::process::Child),
}

impl PluginHost {
    pub fn load(&mut self, archive: &Path) -> Result<()> {
        let manifest = read_manifest(archive)?;
        let backend = match manifest["type"].as_str() {
            Some("python-subprocess") => {
                let python_dir = extract_python(archive)?;
                PluginBackend::PythonSubprocess(
                    std::process::Command::new(python_dir.join("python"))
                        .arg(python_dir.join("plugin.py"))
                        .spawn()?
                )
            }
            _ => {
                let wasm = extract_wasm(archive)?;
                PluginBackend::Wasm(self.load_wasm(&wasm)?)
            }
        };
        self.plugins.insert(manifest["id"].to_string(), backend);
        Ok(())
    }
}
```


***

## The Full Picture

| Plugin type | Example | Mechanism | Security | Speed |
| :-- | :-- | :-- | :-- | :-- |
| **WASM** | Color grading, sharpening, blur | `wasmtime` function call | Full sandbox | Near-native |
| **WASM + WASI** | File export formats, metadata | `wasmtime` + declared capabilities | Capability-gated | Near-native |
| **Python subprocess** | AI upscaling, object detection, Stable Diffusion | Managed child process, stdin/stdout IPC | Process isolation | Fast for bulk ops |

The Python subprocess type has slightly more call overhead (IPC instead of direct memory), but for AI workloads that's irrelevant — a Stable Diffusion inference takes seconds regardless. The overhead only matters for per-pixel hot loops, which WASM handles instead.

So yes — one plugin system, one `.plugin` format, real security for all types, and Python AI plugins are first-class citizens that just happen to be heavier.

<div align="center">⁂</div>

[^8_1]: https://v2.tauri.app/security/permissions/


---

# sounds great. I'll have to update my design docs. I've only been doing the frontend so there's no backend code basically

That's actually the ideal time to make this switch — no backend code to rewrite, just update the design docs before you build anything.

***

## What to Update in Your Design Docs

**Remove entirely:**

- FastAPI as a core dependency
- Python as a base runtime requirement
- uv as a base package manager (it moves to being a plugin-author tool only)
- Ruff/Ty from core quality tools (same — plugin author concern)

**Add to core stack:**

- `wasmtime` crate (Rust) — WASM plugin host
- `image` crate (Rust) — core image decoding/encoding
- Plugin manifest spec — document the `plugin.json` contract and the two backend types (`wasm`, `python-subprocess`)

**Keep exactly as-is:**

- All your frontend stack (React 19, Vite 7, TypeScript, Lucide React, Biome)
- The frontend plugin system design (registry, slots, `React.lazy`, `PluginSlot` component)
- The `.plugin` archive format
- npm for frontend

***

## Revised Stack Summary

```
Core App
├── Frontend:  React 19, Vite 7, TypeScript, Lucide React (Biome)
└── Backend:   Rust/Tauri + wasmtime + image crate

Plugins (external, by plugin authors)
├── WASM plugins:    any language → .wasm + frontend.js
└── Python plugins:  uv + Ruff/Ty + bundled Python → python/ + frontend.js
```

The core stack is actually **simpler** than what you had documented — one language (Rust) for the backend instead of two (Rust + Python). Since you're still on the frontend, the transition cost is zero.

