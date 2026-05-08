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
