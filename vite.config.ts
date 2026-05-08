import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "es2022",
    sourcemap: true,
    rollupOptions: {
      external: ["canvas"],
    },
  },
  optimizeDeps: {
    exclude: ["canvas"],
  },
});
