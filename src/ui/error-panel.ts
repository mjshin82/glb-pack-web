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
