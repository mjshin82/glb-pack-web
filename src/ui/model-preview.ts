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
