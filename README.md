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
