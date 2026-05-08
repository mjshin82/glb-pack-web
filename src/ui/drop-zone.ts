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
