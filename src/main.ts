import { mountApp } from "./app.js";
import "./styles.css";

const root = document.querySelector<HTMLElement>("#app");
if (!root) {
  throw new Error("main.ts: #app element not found");
}
mountApp(root);
