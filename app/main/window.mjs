import { BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createMainWindow() {
  const window = new BrowserWindow({
    width: 280,
    height: 300,
    minWidth: 240,
    minHeight: 260,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.once("ready-to-show", () => {
    window.center();
    window.show();
    window.focus();
  });

  window.setBackgroundColor("#00000000");
  window.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  return window;
}
