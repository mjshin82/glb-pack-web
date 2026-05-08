import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      // glb-pack/web has an `import("canvas")` Node-only fallback. In a real
      // browser the native Canvas2D path runs first, so this branch is never
      // executed at runtime. Aliasing to an empty stub module satisfies Vite's
      // static import-analysis (which runs even on pre-bundled deps).
      canvas: fileURLToPath(new URL("./src/canvas-stub.ts", import.meta.url)),
    },
  },
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
