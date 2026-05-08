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

  function handleFile(file: File) {
    // Show preview of the original GLB immediately, then wait for the user
    // to click "Pack & Download". The preview-ready state is the resting
    // place between drop and pack.
    state = { kind: "loading-preview", file };
    preview.setSrc(file);
    drop.setEnabled(false);
    render();

    state = { kind: "preview-ready", file };
    render();
  }

  async function handlePack(file: File) {
    state = { kind: "packing", file };
    render();

    try {
      const { result, stats: s } = await runAndPack(file);
      const zipName = `${file.name.replace(/\.glb$/i, "")}.zip`;

      // Swap preview to packed GLB
      const packedGlbBlob = new Blob([result.glbBytes as unknown as BlobPart], {
        type: "model/gltf-binary",
      });
      preview.setSrc(packedGlbBlob);

      // Trigger zip download
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
      case "preview-ready": {
        const grid = document.createElement("div");
        grid.className = "app__grid";
        grid.appendChild(preview.element);
        const aside = document.createElement("aside");
        aside.className = "app__aside";
        const fileLine = document.createElement("p");
        fileLine.textContent = `📁 ${state.file.name}`;
        aside.appendChild(fileLine);

        const packBtn = document.createElement("button");
        packBtn.className = "app__pack";
        packBtn.type = "button";
        packBtn.textContent = "Pack & Download";
        const fileForClosure = state.file;
        packBtn.addEventListener("click", () => handlePack(fileForClosure));
        aside.appendChild(packBtn);

        const cancelBtn = document.createElement("button");
        cancelBtn.className = "app__reset";
        cancelBtn.type = "button";
        cancelBtn.textContent = "Cancel";
        cancelBtn.addEventListener("click", reset);
        aside.appendChild(cancelBtn);

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
