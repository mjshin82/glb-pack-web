# glb-pack-web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page web app at `/Users/oracle/Documents/concode/glb-pack-web` that drag-drops a GLB, calls `runPack` from `glb-pack@0.2.0`'s `/web` sub-export, shows a 3D preview and size-reduction stats, and auto-downloads a zip.

**Architecture:** Vanilla TypeScript + Vite. A single `app.ts` state machine drives small UI modules (drop-zone, model-preview, stats-panel, error-panel) that are pure DOM emitters/renderers. `pack.ts` wraps the library call and computes display stats; `download.ts` triggers the browser download.

**Tech Stack:** Vite, TypeScript (strict, NodeNext), `glb-pack@^0.2.0` (`/web` sub-export), `@google/model-viewer` (3D preview web component), `vitest` for unit tests.

**Spec:** `docs/superpowers/specs/2026-05-08-glb-pack-web-design.md`

---

## File Map

```
/Users/oracle/Documents/concode/glb-pack-web/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ .gitignore
│
├─ src/
│  ├─ main.ts                # entry: mount app
│  ├─ app.ts                 # state machine + orchestration
│  ├─ pack.ts                # runAndPack() + computeStats() + probeOriginalTextureSize()
│  ├─ download.ts            # Blob → <a download> click trigger
│  ├─ types.ts               # AppState, Stats interfaces
│  ├─ styles.css             # one shared stylesheet
│  └─ ui/
│     ├─ drop-zone.ts        # drag/drop + click-to-browse → onFile callback
│     ├─ model-preview.ts    # <model-viewer> wrapper with setSrc/clear/dispose
│     ├─ stats-panel.ts      # render Stats
│     └─ error-panel.ts      # render error message + "Drop another" button
│
└─ tests/
   └─ unit/
      └─ compute-stats.test.ts   # pack.ts's computeStats()
```

---

## Task 1: Project bootstrap

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.ts`, `src/styles.css`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "glb-pack-web",
  "version": "0.1.0",
  "private": true,
  "description": "Browser app that crops unused texture space from GLBs using glb-pack",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@google/model-viewer": "^4.0.0",
    "glb-pack": "^0.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.14.0",
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `cd /Users/oracle/Documents/concode/glb-pack-web && npm install`
Expected: `node_modules/` populated, no errors. `node_modules/glb-pack/dist/web/index.js` and `node_modules/@google/model-viewer` should both exist.

If `@google/model-viewer@^4.0.0` does not exist on npm, fall back to `^3.5.0` and report.

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "isolatedModules": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

- [ ] **Step 4: Write `vite.config.ts`**

```ts
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    sourcemap: true,
  },
  optimizeDeps: {
    exclude: ["canvas"],
  },
});
```

- [ ] **Step 5: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>glb-pack-web</title>
    <link rel="stylesheet" href="/src/styles.css" />
  </head>
  <body>
    <main id="app">Loading…</main>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: Write `src/main.ts` placeholder**

```ts
const root = document.querySelector<HTMLElement>("#app");
if (root) {
  root.textContent = "glb-pack-web bootstrapping… (placeholder)";
}
```

- [ ] **Step 7: Write `src/styles.css` placeholder**

```css
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; font-family: system-ui, sans-serif; }
#app { padding: 2rem; max-width: 1100px; margin: 0 auto; }
```

- [ ] **Step 8: Write `.gitignore`**

```
node_modules/
dist/
.DS_Store
*.log
```

- [ ] **Step 9: Smoke check the dev server**

Run: `npm run dev` (in the project directory) — but as a subagent you cannot keep it running interactively. Instead use `timeout`:

```bash
timeout 5 npm run dev 2>&1 | head -10
```

Expected: prints `VITE v5.x.x  ready in NNN ms` and a local URL. Don't worry about the timeout exit code — we just need to confirm Vite launches.

Also run: `npm run build`
Expected: `dist/` is created with `index.html` and a JS bundle. Type-check passes.

- [ ] **Step 10: Commit**

```bash
cd /Users/oracle/Documents/concode/glb-pack-web
git add -A
git -c user.email=dev@concode.co -c user.name=dev commit -m "chore: project bootstrap (Vite + TS + deps)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: types.ts

**Files:**
- Create: `src/types.ts`

Defines the shared shapes: `AppState` discriminated union and `Stats` interface. No tests — interface-only file.

- [ ] **Step 1: Write the file**

```ts
import type { PackResult } from "glb-pack/web";

export interface Stats {
  /** Filename stem of the input file (no extension). */
  filename: string;
  /** baseColor texture pixel dimensions before packing. */
  originalSize: { width: number; height: number };
  /** baseColor texture pixel dimensions after packing. */
  packedSize: { width: number; height: number };
  /**
   * 0..100. Percent reduction in baseColor pixel area.
   * Example: 128*128 → 84*60 → 100 * (1 - 5040/16384) ≈ 69.24
   */
  areaReductionPct: number;
}

export type AppState =
  | { kind: "idle" }
  | { kind: "loading-preview"; file: File }
  | { kind: "packing"; file: File }
  | { kind: "done"; file: File; result: PackResult; stats: Stats; zipName: string }
  | { kind: "error"; message: string };
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git -c user.email=dev@concode.co -c user.name=dev commit -m "feat(types): AppState + Stats shapes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: pack.ts (with computeStats unit test)

**Files:**
- Create: `src/pack.ts`
- Test: `tests/unit/compute-stats.test.ts`

Three responsibilities, each as an exported function:
1. `computeStats({ filename, originalSize, packedSize })` — pure math.
2. `probeOriginalTextureSize(glbBytes)` — uses `gltf-transform` WebIO + `Image()` to measure baseColor texture dimensions.
3. `runAndPack(file)` — orchestrates probe + `runPack` in parallel, returns `{ result, stats }` or throws.

Only `computeStats` gets a unit test in V1; the other two are exercised manually.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/compute-stats.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeStats } from "../../src/pack.js";

describe("computeStats", () => {
  it("computes pixel area reduction percent (full to quarter)", () => {
    const stats = computeStats({
      filename: "model",
      originalSize: { width: 128, height: 128 },
      packedSize: { width: 64, height: 64 },
    });
    // originalArea = 16384, packedArea = 4096
    // reductionPct = 100 * (1 - 4096/16384) = 75
    expect(stats.areaReductionPct).toBeCloseTo(75, 5);
  });

  it("matches the JerseyBarrier sample (128x128 → 84x60 ≈ 69.24%)", () => {
    const stats = computeStats({
      filename: "JerseyBarrierB",
      originalSize: { width: 128, height: 128 },
      packedSize: { width: 84, height: 60 },
    });
    expect(stats.areaReductionPct).toBeCloseTo(69.24, 1);
  });

  it("returns 0 for identical sizes", () => {
    const stats = computeStats({
      filename: "x",
      originalSize: { width: 1024, height: 1024 },
      packedSize: { width: 1024, height: 1024 },
    });
    expect(stats.areaReductionPct).toBe(0);
  });

  it("preserves filename and sizes verbatim", () => {
    const stats = computeStats({
      filename: "JerseyBarrierB",
      originalSize: { width: 128, height: 128 },
      packedSize: { width: 84, height: 60 },
    });
    expect(stats.filename).toBe("JerseyBarrierB");
    expect(stats.originalSize).toEqual({ width: 128, height: 128 });
    expect(stats.packedSize).toEqual({ width: 84, height: 60 });
  });

  it("clamps negative reductions to 0 (defensive — packed shouldn't be larger)", () => {
    const stats = computeStats({
      filename: "x",
      originalSize: { width: 64, height: 64 },
      packedSize: { width: 128, height: 128 },
    });
    expect(stats.areaReductionPct).toBe(0);
  });
});
```

- [ ] **Step 2: Run, see it fail**

Run: `npx vitest run tests/unit/compute-stats.test.ts`
Expected: module-not-found.

- [ ] **Step 3: Implement `src/pack.ts`**

```ts
import { runPack, type PackResult } from "glb-pack/web";
import { NodeIO } from "@gltf-transform/core";
import type { Stats } from "./types.js";

export interface ComputeStatsInput {
  filename: string;
  originalSize: { width: number; height: number };
  packedSize: { width: number; height: number };
}

export function computeStats(input: ComputeStatsInput): Stats {
  const originalArea = input.originalSize.width * input.originalSize.height;
  const packedArea = input.packedSize.width * input.packedSize.height;
  const raw = 100 * (1 - packedArea / originalArea);
  return {
    filename: input.filename,
    originalSize: input.originalSize,
    packedSize: input.packedSize,
    areaReductionPct: raw < 0 ? 0 : raw,
  };
}

export async function probeOriginalTextureSize(
  glbBytes: Uint8Array,
): Promise<{ width: number; height: number }> {
  // Parse GLB, find baseColor texture, decode bytes via Image() to read dimensions.
  const io = new NodeIO();
  const doc = await io.readBinary(glbBytes);
  const material = doc.getRoot().listMaterials()[0];
  if (!material) throw new Error("probeOriginalTextureSize: no material in GLB");
  const tex = material.getBaseColorTexture();
  if (!tex) throw new Error("probeOriginalTextureSize: no baseColor texture");
  const buf = tex.getImage();
  if (!buf) throw new Error("probeOriginalTextureSize: baseColor has no image data");

  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const blob = new Blob([buf as unknown as BlobPart]);
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("probeOriginalTextureSize: Image decode failed"));
    };
    img.src = url;
  });
}

export interface RunAndPackResult {
  result: PackResult;
  stats: Stats;
}

export async function runAndPack(file: File): Promise<RunAndPackResult> {
  const glbBytes = new Uint8Array(await file.arrayBuffer());
  const stem = file.name.replace(/\.glb$/i, "");
  // Run probe and pack in parallel
  const [originalSize, result] = await Promise.all([
    probeOriginalTextureSize(glbBytes),
    runPack(glbBytes, { filename: stem, zip: true }),
  ]);
  const stats = computeStats({
    filename: stem,
    originalSize,
    packedSize: result.baseColorSize,
  });
  return { result, stats };
}
```

- [ ] **Step 4: Run, see it pass**

Run: `npx vitest run tests/unit/compute-stats.test.ts`
Expected: 5 passing.

- [ ] **Step 5: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/pack.ts tests/unit/compute-stats.test.ts
git -c user.email=dev@concode.co -c user.name=dev commit -m "feat(pack): runAndPack + probe + computeStats with unit tests

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: download.ts

**Files:**
- Create: `src/download.ts`

Single-purpose: trigger a browser download for a Blob with a given filename. No test — DOM-mutation function, exercised manually.

- [ ] **Step 1: Write the file**

```ts
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a short tick so the click handler has time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/download.ts
git -c user.email=dev@concode.co -c user.name=dev commit -m "feat(download): trigger browser download for a Blob

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: ui/model-preview.ts

**Files:**
- Create: `src/ui/model-preview.ts`

Wraps Google's `<model-viewer>` web component. Manages blob URL lifecycle so we don't leak.

- [ ] **Step 1: Write the file**

```ts
import "@google/model-viewer";

export interface ModelPreview {
  readonly element: HTMLElement;
  setSrc(blob: Blob): void;
  clear(): void;
  dispose(): void;
}

export function createModelPreview(): ModelPreview {
  const el = document.createElement("model-viewer") as HTMLElement & {
    src?: string;
  };
  el.setAttribute("camera-controls", "");
  el.setAttribute("auto-rotate", "");
  el.setAttribute("style", "width: 100%; height: 400px; background: #f5f5f5;");

  let currentUrl: string | null = null;

  function revokeCurrent() {
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
      currentUrl = null;
    }
  }

  return {
    element: el,
    setSrc(blob: Blob) {
      revokeCurrent();
      currentUrl = URL.createObjectURL(blob);
      // model-viewer reads `src` as a property
      (el as HTMLElement & { src?: string }).src = currentUrl;
    },
    clear() {
      revokeCurrent();
      (el as HTMLElement & { src?: string }).src = "";
    },
    dispose() {
      revokeCurrent();
      el.remove();
    },
  };
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean. The cast `as HTMLElement & { src?: string }` is necessary because `<model-viewer>` is not typed in the standard DOM lib. If tsc errors with `Property 'src' does not exist on type 'HTMLElement'`, the cast handles it.

- [ ] **Step 3: Commit**

```bash
git add src/ui/model-preview.ts
git -c user.email=dev@concode.co -c user.name=dev commit -m "feat(ui/model-preview): <model-viewer> wrapper with blob URL lifecycle

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: ui/drop-zone.ts

**Files:**
- Create: `src/ui/drop-zone.ts`

A drop zone with click-to-browse fallback. Calls back with the first `.glb` file dropped/selected.

- [ ] **Step 1: Write the file**

```ts
export interface DropZone {
  readonly element: HTMLElement;
  setMessage(text: string): void;
  setEnabled(enabled: boolean): void;
}

export interface CreateDropZoneOptions {
  onFile: (file: File) => void;
  initialMessage?: string;
}

export function createDropZone(opts: CreateDropZoneOptions): DropZone {
  const el = document.createElement("div");
  el.className = "drop-zone";
  el.setAttribute("tabindex", "0");

  const message = document.createElement("div");
  message.className = "drop-zone__message";
  message.textContent = opts.initialMessage ?? "📦  Drop a .glb file here\nor click to browse";
  el.appendChild(message);

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = ".glb,model/gltf-binary";
  fileInput.style.display = "none";
  el.appendChild(fileInput);

  let enabled = true;

  function handleFile(file: File) {
    if (!enabled) return;
    if (!/\.glb$/i.test(file.name)) {
      // Wrong extension; ignore (the spec accepts .glb only)
      return;
    }
    opts.onFile(file);
  }

  el.addEventListener("click", () => {
    if (enabled) fileInput.click();
  });
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) handleFile(file);
    fileInput.value = "";
  });
  el.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (enabled) el.classList.add("drop-zone--hover");
  });
  el.addEventListener("dragleave", () => {
    el.classList.remove("drop-zone--hover");
  });
  el.addEventListener("drop", (e) => {
    e.preventDefault();
    el.classList.remove("drop-zone--hover");
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  });

  return {
    element: el,
    setMessage(text: string) {
      message.textContent = text;
    },
    setEnabled(value: boolean) {
      enabled = value;
      el.classList.toggle("drop-zone--disabled", !value);
    },
  };
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/ui/drop-zone.ts
git -c user.email=dev@concode.co -c user.name=dev commit -m "feat(ui/drop-zone): drag-drop + click-to-browse with .glb filter

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: ui/stats-panel.ts

**Files:**
- Create: `src/ui/stats-panel.ts`

- [ ] **Step 1: Write the file**

```ts
import type { Stats } from "../types.js";

export interface StatsPanel {
  readonly element: HTMLElement;
  render(stats: Stats, zipName: string): void;
  clear(): void;
}

export function createStatsPanel(): StatsPanel {
  const el = document.createElement("div");
  el.className = "stats-panel";

  return {
    element: el,
    render(stats: Stats, zipName: string) {
      const o = stats.originalSize;
      const p = stats.packedSize;
      el.innerHTML = `
        <div class="stats-panel__file">📁 ${escapeHtml(stats.filename)}</div>
        <dl class="stats-panel__list">
          <dt>Texture</dt>
          <dd>${o.width}×${o.height} → ${p.width}×${p.height}</dd>
          <dt>Pixel area</dt>
          <dd>−${stats.areaReductionPct.toFixed(1)}%</dd>
          <dt>Downloaded</dt>
          <dd>✓ ${escapeHtml(zipName)}</dd>
        </dl>
      `;
    },
    clear() {
      el.innerHTML = "";
    },
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c] ?? c);
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/ui/stats-panel.ts
git -c user.email=dev@concode.co -c user.name=dev commit -m "feat(ui/stats-panel): render stats with HTML escape

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: ui/error-panel.ts

**Files:**
- Create: `src/ui/error-panel.ts`

- [ ] **Step 1: Write the file**

```ts
export interface ErrorPanel {
  readonly element: HTMLElement;
  render(message: string, onDismiss: () => void): void;
  clear(): void;
}

export function createErrorPanel(): ErrorPanel {
  const el = document.createElement("div");
  el.className = "error-panel";

  return {
    element: el,
    render(message: string, onDismiss: () => void) {
      el.innerHTML = "";
      const text = document.createElement("p");
      text.className = "error-panel__message";
      text.textContent = `❌  ${message}`;
      const button = document.createElement("button");
      button.className = "error-panel__dismiss";
      button.type = "button";
      button.textContent = "Drop another";
      button.addEventListener("click", onDismiss);
      el.appendChild(text);
      el.appendChild(button);
    },
    clear() {
      el.innerHTML = "";
    },
  };
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/ui/error-panel.ts
git -c user.email=dev@concode.co -c user.name=dev commit -m "feat(ui/error-panel): error message with dismiss button

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: app.ts (state machine)

**Files:**
- Create: `src/app.ts`

Holds the `AppState`, transitions, calls UI/pack functions. The only module that knows about state.

- [ ] **Step 1: Write the file**

```ts
import { ValidationError } from "glb-pack/web";
import { runAndPack } from "./pack.js";
import { triggerDownload } from "./download.js";
import type { AppState } from "./types.js";
import { createDropZone, type DropZone } from "./ui/drop-zone.js";
import { createModelPreview, type ModelPreview } from "./ui/model-preview.js";
import { createStatsPanel, type StatsPanel } from "./ui/stats-panel.js";
import { createErrorPanel, type ErrorPanel } from "./ui/error-panel.js";

export function mountApp(root: HTMLElement): void {
  // --- DOM scaffold -----------------------------------------------------
  root.innerHTML = "";
  root.classList.add("app");

  const header = document.createElement("header");
  header.className = "app__header";
  header.innerHTML = `
    <h1>glb-pack-web</h1>
    <p>Drag a GLB to crop unused texture space, get a zip.</p>
  `;
  root.appendChild(header);

  const main = document.createElement("section");
  main.className = "app__main";
  root.appendChild(main);

  // --- UI components ----------------------------------------------------
  const preview: ModelPreview = createModelPreview();
  const stats: StatsPanel = createStatsPanel();
  const error: ErrorPanel = createErrorPanel();
  const drop: DropZone = createDropZone({ onFile: handleFile });

  // --- State ------------------------------------------------------------
  let state: AppState = { kind: "idle" };
  render();

  // --- Handlers ---------------------------------------------------------
  function reset() {
    preview.clear();
    stats.clear();
    error.clear();
    state = { kind: "idle" };
    render();
  }

  async function handleFile(file: File) {
    // 1. Show preview of the original GLB immediately
    state = { kind: "loading-preview", file };
    preview.setSrc(file);
    drop.setEnabled(false);
    render();

    // 2. Transition to packing
    state = { kind: "packing", file };
    drop.setMessage("Packing… please wait");
    render();

    try {
      const { result, stats: s } = await runAndPack(file);
      const zipName = `${file.name.replace(/\.glb$/i, "")}.zip`;

      // 3. Swap preview to packed GLB
      const packedGlbBlob = new Blob([result.glbBytes as unknown as BlobPart], {
        type: "model/gltf-binary",
      });
      preview.setSrc(packedGlbBlob);

      // 4. Trigger zip download
      if (result.zipBytes) {
        const zipBlob = new Blob([result.zipBytes as unknown as BlobPart], {
          type: "application/zip",
        });
        triggerDownload(zipBlob, zipName);
      }

      state = { kind: "done", file, result, stats: s, zipName };
      render();
    } catch (err) {
      const message = err instanceof ValidationError
        ? err.message
        : (err as Error).message ?? String(err);
      // Log full stack for non-validation errors
      if (!(err instanceof ValidationError)) {
        console.error(err);
      }
      preview.clear();
      state = { kind: "error", message };
      render();
    } finally {
      drop.setEnabled(true);
    }
  }

  // --- Rendering --------------------------------------------------------
  function render() {
    main.innerHTML = "";
    switch (state.kind) {
      case "idle":
        drop.setMessage("📦  Drop a .glb file here\nor click to browse");
        main.appendChild(drop.element);
        break;
      case "loading-preview":
      case "packing": {
        const grid = document.createElement("div");
        grid.className = "app__grid";
        grid.appendChild(preview.element);
        const aside = document.createElement("aside");
        aside.className = "app__aside";
        aside.innerHTML = `
          <div class="status">
            <p>📁 ${escapeHtml(state.file.name)}</p>
            <p class="status__line">Status: ${state.kind === "loading-preview" ? "loading…" : "packing…"}</p>
          </div>
        `;
        grid.appendChild(aside);
        main.appendChild(grid);
        break;
      }
      case "done": {
        const grid = document.createElement("div");
        grid.className = "app__grid";
        grid.appendChild(preview.element);
        const aside = document.createElement("aside");
        aside.className = "app__aside";
        aside.appendChild(stats.element);
        stats.render(state.stats, state.zipName);
        const button = document.createElement("button");
        button.className = "app__reset";
        button.type = "button";
        button.textContent = "Drop another";
        button.addEventListener("click", reset);
        aside.appendChild(button);
        grid.appendChild(aside);
        main.appendChild(grid);
        break;
      }
      case "error":
        main.appendChild(error.element);
        error.render(state.message, reset);
        break;
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c] ?? c);
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/app.ts
git -c user.email=dev@concode.co -c user.name=dev commit -m "feat(app): state machine + render loop

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: main.ts wiring + styles.css

**Files:**
- Modify: `src/main.ts`
- Modify: `src/styles.css`

Replace the placeholder main.ts with the actual mount call and replace styles.css with a minimal but complete stylesheet.

- [ ] **Step 1: Replace `src/main.ts`**

```ts
import { mountApp } from "./app.js";
import "./styles.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) {
  throw new Error("main.ts: #app element not found");
}
mountApp(root);
```

- [ ] **Step 2: Replace `src/styles.css`**

```css
* {
  box-sizing: border-box;
}
html, body {
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
  background: #fafafa;
  color: #222;
}
#app {
  padding: 2rem;
  max-width: 1100px;
  margin: 0 auto;
}

/* Header */
.app__header h1 {
  margin: 0 0 0.25rem;
  font-size: 1.6rem;
}
.app__header p {
  margin: 0 0 2rem;
  color: #666;
}

/* Layouts */
.app__grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
}
@media (max-width: 720px) {
  .app__grid {
    grid-template-columns: 1fr;
  }
}

/* Drop zone */
.drop-zone {
  border: 2px dashed #aaa;
  border-radius: 8px;
  padding: 4rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  white-space: pre-line;
  min-height: 300px;
  display: grid;
  place-items: center;
}
.drop-zone:hover, .drop-zone:focus {
  border-color: #4a90e2;
  background: #f0f7ff;
  outline: none;
}
.drop-zone--hover {
  border-color: #4a90e2;
  background: #e8f1fb;
}
.drop-zone--disabled {
  opacity: 0.6;
  cursor: default;
}

/* Aside / status / stats */
.app__aside {
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 1.25rem;
}
.status p {
  margin: 0 0 0.5rem;
}
.status__line {
  color: #666;
}
.stats-panel__file {
  font-weight: 600;
  margin-bottom: 0.5rem;
}
.stats-panel__list {
  margin: 0.5rem 0 0;
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 0.4rem 1rem;
}
.stats-panel__list dt {
  color: #666;
}
.stats-panel__list dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
}

/* Error */
.error-panel {
  background: #fff4f4;
  border: 1px solid #f4c4c4;
  border-radius: 8px;
  padding: 1.5rem;
}
.error-panel__message {
  margin: 0 0 1rem;
  color: #b03a3a;
}

/* Buttons */
.app__reset, .error-panel__dismiss {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  border: 1px solid #aaa;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.95rem;
}
.app__reset:hover, .error-panel__dismiss:hover {
  background: #f0f7ff;
  border-color: #4a90e2;
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: type-check passes, `dist/` produced. No console errors.

- [ ] **Step 4: Smoke test the dev server**

Run: `timeout 5 npm run dev 2>&1 | head -10`
Expected: prints `VITE v5.x.x  ready` and a URL. Don't worry about timeout exit code.

- [ ] **Step 5: Manual visual smoke (informational; cannot be automated by subagent)**

```
1. Run `npm run dev` in a terminal.
2. Open the printed local URL in a browser.
3. Confirm the drop zone is visible and centered, with the placeholder text.
4. (Cannot fully drag-test from a subagent context — defer to Task 11.)
```

- [ ] **Step 6: Commit**

```bash
git add src/main.ts src/styles.css
git -c user.email=dev@concode.co -c user.name=dev commit -m "feat(main+styles): wire up app and add stylesheet

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Manual smoke test + sample fixture + README

**Files:**
- Create: `samples/JerseyBarrierB.glb` (copy from sibling `glb-pack` project)
- Create: `README.md`
- Modify: `.gitignore` (add `samples/` if you want to keep the fixture out of git)

This task ends with a manual end-to-end smoke test (the only V1 integration verification) and a README.

- [ ] **Step 1: Copy a real GLB sample for manual testing**

```bash
mkdir -p /Users/oracle/Documents/concode/glb-pack-web/samples
cp /Users/oracle/Documents/concode/glb-pack/models/JerseyBarrierB.glb \
   /Users/oracle/Documents/concode/glb-pack-web/samples/JerseyBarrierB.glb
```

- [ ] **Step 2: Optionally git-ignore the samples directory**

If you do not want to commit a binary GLB, add `samples/` to `.gitignore`:

```
node_modules/
dist/
.DS_Store
*.log
samples/
```

(If the user prefers to commit the sample for convenience, skip this gitignore change. Default: ignore.)

- [ ] **Step 3: Manual smoke test**

This step requires the user (or their interactive shell). The subagent should report DONE_WITH_CONCERNS if it cannot complete this step itself, with a clear note that "manual smoke is for the human operator."

In the user's terminal:
```bash
cd /Users/oracle/Documents/concode/glb-pack-web
npm run dev
```

Then in a browser, drag `samples/JerseyBarrierB.glb` onto the drop zone. Expected:
1. Drop zone disappears, model preview shows the original GLB rotating.
2. Status briefly shows "packing…".
3. Within ~1–2 seconds: stats panel appears showing `Texture: 128×128 → 84×60` and `Pixel area: −69.2%`.
4. Browser auto-downloads `JerseyBarrierB.zip` (~5 KB).
5. Preview swaps to the packed GLB (visually identical to the original — the textures' usage is the same, just on a smaller atlas).
6. "Drop another" button is visible; clicking it returns to idle.

Also test the error path: the spec lists abort cases. Easiest is a multi-material model. If unavailable, skip — the error UI is straightforward.

- [ ] **Step 4: Write `README.md`**

```markdown
# glb-pack-web

A single-page browser app that crops unused texture space from a `.glb` file
using [`glb-pack`](https://www.npmjs.com/package/glb-pack), shows a 3D preview,
and downloads a zip with the packed GLB and its baseColor PNG.

## Run locally

```bash
npm install
npm run dev
```

Open the printed URL in a modern browser (Chrome 91+, Firefox 90+, Safari 15+).
Drag a `.glb` onto the page and the app:

1. Renders an immediate 3D preview of the original model.
2. Crops every texture in place using the same UV bounding box.
3. Remaps the UVs into the new `[0, 1]` space.
4. Auto-downloads a zip containing `<name>.glb` and `<name>.png`.
5. Shows pixel-area reduction stats.

## Supported / not supported

`glb-pack` V1 supports a single material across the whole model with all PBR
textures sharing one UV bbox. See the
[`glb-pack` README](https://github.com/mjshin82/glb-pack#readme) for the full
constraint list (no multi-material atlases, no UV wrap/repeat, etc.). Models
that violate these constraints are rejected with a user-facing error message.

## Build

```bash
npm run build       # → dist/ static bundle
npm run preview     # serve dist/ locally to verify the production build
```

`dist/` is a fully static bundle — host it anywhere (GH Pages, Vercel, Netlify, S3, …).

## Tests

```bash
npm test
```

V1 has unit tests only for the pure stats math. End-to-end visual verification
is manual: drop a sample GLB and confirm the flow works.
```

- [ ] **Step 5: Commit**

```bash
git add README.md .gitignore
git -c user.email=dev@concode.co -c user.name=dev commit -m "docs: README + smoke test sample

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review Notes

**Spec coverage:**
- Drag-drop GLB → process → auto-download zip ✓ Tasks 6, 9, 4
- Show 3D preview ✓ Task 5 + 9
- Show size reduction (texture dims + pixel area %) ✓ Tasks 3, 7, 9
- Error display ✓ Tasks 8, 9
- "Drop another" ✓ Task 9
- State machine (idle / loading-preview / packing / done / error) ✓ Tasks 2, 9
- `probeOriginalTextureSize` (Option A — gltf-transform parse) ✓ Task 3
- `glb-pack/web` `runPack` integration ✓ Tasks 1, 3
- Vite `optimizeDeps.exclude: ["canvas"]` ✓ Task 1
- Bundle to static `dist/` ready for any host ✓ Tasks 1, 11

**Type / name consistency:**
- `Stats` defined Task 2, used Tasks 3, 7, 9.
- `AppState` defined Task 2, used Task 9.
- `PackResult` (from `glb-pack/web`) used in Tasks 2, 3, 9.
- `runAndPack` defined Task 3, used Task 9.
- `createDropZone` / `createModelPreview` / `createStatsPanel` / `createErrorPanel` factories defined in their respective tasks, used in Task 9.
- `triggerDownload` defined Task 4, used Task 9.

**Known risk (carried over from glb-pack v0.2 plan):**
- `<model-viewer>` is not typed in standard DOM lib. The implementation casts it via `as HTMLElement & { src?: string }` (Task 5) — sufficient for V1 since we only set `src`. If more attributes are needed later, a `declare global { interface HTMLElementTagNameMap { ... } }` augmentation would be cleaner, but that's V2+ polish.

**Deferred (V2+):**
- Playwright integration test for the drag-drop flow.
- "Before / after" texture image comparison (current V1 shows only stats).
- Hosting / GH Pages auto-deploy.
