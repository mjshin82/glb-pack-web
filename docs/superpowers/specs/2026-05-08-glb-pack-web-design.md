# glb-pack-web — Browser App for glb-pack

**Date:** 2026-05-08
**Status:** Design approved
**Project location:** `/Users/oracle/Documents/concode/glb-pack-web`
**Library used:** `glb-pack@^0.2.0` (the `glb-pack/web` sub-export)

## Purpose

A single-page web app: drag a `.glb` onto the page, the app crops unused texture
space using `glb-pack/web`, shows a 3D preview and size-reduction stats, and
auto-downloads a zip containing the packed GLB and PNG.

## Key Decisions (Approved)

1. **Tech stack:** Vite + Vanilla TypeScript + Google's `<model-viewer>` web component for 3D preview. No frontend framework. Minimal moving parts.
2. **Drop-to-download flow:** Show preview immediately on drop; run `runPack` in parallel; on completion, swap preview to the packed result, render stats, and auto-trigger zip download.
3. **Original texture size measurement:** The web app parses the input GLB once on its own (separate from `runPack`) to extract the baseColor texture's original pixel dimensions. The `glb-pack` library is *not* modified.
4. **Hosting:** Static build artifacts (`dist/`) ready for any static host (GH Pages, Vercel, Netlify, etc.). Deploy is deferred — V1 stops at "works locally with `npm run dev` / `npm run preview`."
5. **No frontend framework, no styling library:** plain CSS, vanilla TS modules, single page.

## Page Layout

**Idle state:**

```
┌─────────────────────────────────────────────────────────┐
│  glb-pack-web                                            │
│  Drag a GLB to crop unused texture space, get a zip.     │
├─────────────────────────────────────────────────────────┤
│   ┌───────────────────────────────────────────────┐     │
│   │         📦  Drop a .glb file here             │     │
│   │              or click to browse               │     │
│   └───────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

**Processing → Done state:**

```
┌─────────────────────────────────────────────────────────┐
│   ┌─────────────────────────┐  ┌─────────────────────┐  │
│   │   <model-viewer>        │  │  📁 JerseyBarrierB  │  │
│   │   (PACKED model)        │  │  Texture: 128×128   │  │
│   │                         │  │       → 84×60       │  │
│   │                         │  │  Pixel area: -69%   │  │
│   │                         │  │  ✓ packed.zip       │  │
│   │                         │  │     downloaded      │  │
│   │                         │  │  [ Drop another ]   │  │
│   └─────────────────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Error state:**

```
┌─────────────────────────────────────────────────────────┐
│   ❌  Multiple materials detected (got 3).               │
│       V1 supports single-material models only.           │
│       [ Drop another ]                                   │
└─────────────────────────────────────────────────────────┘
```

## State Machine

```
idle
  │  drop file
  ▼
loading-preview          (model-viewer renders original GLB ~ instant)
  │
  ▼
packing                  (runPack in parallel; preview already showing)
  │
  ├── ValidationError ──▶ error
  │
  ▼
done                     (stats rendered, zip auto-downloaded, preview now shows packed result)
  │
  │  user clicks "Drop another" or drops a new file
  ▼
idle
```

## File / Module Structure

```
glb-pack-web/
├─ index.html
├─ package.json
├─ tsconfig.json
├─ vite.config.ts
├─ .gitignore
│
├─ src/
│  ├─ main.ts              # entry: DOM mount + event wiring
│  ├─ app.ts               # state machine + transitions
│  ├─ ui/
│  │  ├─ drop-zone.ts      # drag/drop events → File callback
│  │  ├─ stats-panel.ts    # render texture sizes + area %
│  │  ├─ model-preview.ts  # <model-viewer> wrapper: setSrc/clear
│  │  └─ error-panel.ts    # render error message
│  ├─ pack.ts              # runPack() call + stats computation
│  ├─ download.ts          # Blob → URL → <a download> click
│  └─ types.ts             # AppState, Stats, etc.
│
└─ public/
   └─ favicon.svg
```

**Module boundary rules:**
- `app.ts` is the only module that knows the state. UI modules are dumb — they receive props and emit events via callbacks.
- `pack.ts` does the `runPack` call + stats math; no UI logic.
- `download.ts` does one thing: trigger a browser download for a Blob.
- `model-preview.ts` wraps the `<model-viewer>` element with explicit `setSrc(blobUrl)` / `clear()` API. No other module touches the web component directly.

## Data Flow (one cycle)

```
User drops file.glb
     │
     ▼
drop-zone → file: File
     │
     ▼
app.ts: setState("loading-preview", { file })
     │
     ├──▶ model-preview.setSrc(URL.createObjectURL(file))
     │
     ▼
app.ts: setState("packing", { file })
     │
     ▼
pack.ts: parallel
     ├──▶ probeOriginalTextureSize(glbBytes) → { width, height }   (own GLB parse)
     └──▶ runPack(glbBytes, { filename: stem, zip: true })
              │ Canvas2D crop + fflate zip inside the library
              │
              ├── ValidationError → setState("error", { message })
              │
              ▼
pack.ts: stats = computeStats({ originalSize, result })
              originalArea = origW * origH
              resultArea   = result.baseColorSize.w * result.baseColorSize.h
              areaReductionPct = 100 * (1 - resultArea / originalArea)
              fileSizeBytes (input)  = file.size
              fileSizeBytes (output) = result.glbBytes.byteLength
     │
     ▼
app.ts: setState("done", { result, stats })
     │
     ├──▶ stats-panel.render(stats)
     ├──▶ model-preview.setSrc(URL.createObjectURL(packedGlbBlob))
     └──▶ download.trigger(zipBlob, `${stem}.zip`)
```

### `probeOriginalTextureSize` (V1 implementation)

The web app parses the input GLB once to extract the baseColor texture and
measure its dimensions. Two reasonable implementations:

- **Option A (simpler, larger code):** use `gltf-transform`'s `WebIO.readBinary`
  to load the document, locate the baseColor texture, then `Image()`-decode
  its bytes to get `naturalWidth`/`naturalHeight`.
- **Option B (smaller, manual):** sniff the PNG/JPEG header from the GLB's
  embedded image bytes (PNG: bytes 16-23 contain width/height as big-endian
  u32; JPEG: scan for SOF0 marker).

V1 chooses **Option A**. Reusing the gltf-transform pipeline keeps the code
short and avoids re-implementing format-specific header parsers. Cost: one
additional decode pass per drop (negligible at V1 scale).

## Statistics Display

Stats panel shows:

| Field | Source |
|---|---|
| File name | `file.name` (without extension) |
| Texture (original) | from `probeOriginalTextureSize` |
| Texture (packed) | `result.baseColorSize` |
| Pixel area reduction | `100 * (1 - packedArea / originalArea)` |
| Downloaded zip name | `<stem>.zip` |

Texture file size deltas (input GLB bytes vs output GLB bytes) are *not* shown
in V1 — the focus is on pixel area reduction, which is the actually meaningful
metric. (Output GLB byte size can occasionally be larger than input due to
PNG re-encoding settings, which would be confusing.)

## Error Handling

- `ValidationError` (imported from `glb-pack/web`) → render the error message
  verbatim in `error-panel`. The library's messages are already user-friendly.
- Anything else → render `(err as Error).message`, log full stack to `console`.
- After error display, drop zone is re-enabled so the user can retry.
- All blob URLs revoked when state transitions away from them.

## Build / Run

**Dev:**
```bash
npm install
npm run dev                # Vite dev server with HMR
```

**Prod:**
```bash
npm run build              # → dist/ static bundle
npm run preview            # serve dist/ locally to verify
```

**`vite.config.ts`:**
```ts
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    sourcemap: true,
  },
  optimizeDeps: {
    exclude: ["canvas"],   // glb-pack/web's Node-only happy-dom fallback dep
  },
});
```

The `canvas` exclusion: `glb-pack/web`'s `image-canvas.ts` has a runtime
`hasNativeCanvas()` check + dynamic `import("canvas")` fallback for
test/Node environments. In a real browser, `hasNativeCanvas()` returns true
and the dynamic import is never executed — but Vite's pre-bundler still
tries to resolve `canvas` and warns. Excluding it silences the warning and
keeps the browser bundle clean.

## Bundle Size (estimate)

| Component | Minzipped |
|---|---|
| `glb-pack/web` + `@gltf-transform/core` + `fflate` | ~64 KB |
| `@google/model-viewer` (includes Three.js) | ~250 KB |
| App TS code | ~5 KB |
| **Total** | **~320 KB** |

One-time download; cached after first load. Acceptable for a single-shot tool.

## Browser Support

Same baseline as `glb-pack/web`: Chrome 91+, Firefox 90+, Safari 15+, Edge 91+.
`<model-viewer>` requires WebGL2-capable browsers (covered by the same baseline).

## Testing

**V1 unit tests (vitest):**
- `pack.ts`'s `computeStats` — pure function, deterministic. Verify area
  percentage math against fixed inputs.

**V1 manual verification:**
- Run `npm run dev`, drop the `JerseyBarrierB.glb` fixture (copied from the
  `glb-pack` project), confirm preview shows, zip downloads, stats match
  expected values (`128×128 → 84×60`, `~69%` area reduction).
- Verify error path with a multi-material model.

**Out of scope for V1:**
- Playwright / browser integration tests (defer to V2).
- CI / automated deployment.
- Visual regression testing.

## Out of Scope (V1)

- Multi-file batch upload.
- Drag-drop folder of multiple GLBs.
- "Before/after" texture image comparison panel (only stats are shown).
- Padding / resolution policy controls (passed as `runPack` options).
- History / persistence of previously processed files.
- Dark mode / theming controls.
- Progress percentage during packing (just "packing…" text).
- Server-side anything.

## Future Improvements (V2+)

- Side-by-side texture image comparison (`<img src=originalPng>` vs `<img src=packedPng>`).
- Multi-file batch with a results list.
- Padding control via UI slider.
- Web Worker offload for `runPack` so the page stays responsive on large GLBs.
- Save/share results via URL or persistent storage.
- Playwright integration tests across Chrome/Firefox/Safari.
- Hosted demo (GitHub Pages auto-deploy via Actions).
