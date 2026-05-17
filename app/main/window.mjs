import { BrowserWindow, screen } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WINDOW_WIDTH = 280;
const WINDOW_HEIGHT = 300;
const WINDOW_MARGIN = 24;

export function createMainWindow(settings = {}, appRoot) {
  const initialPosition = resolveInitialPosition(settings.windowPosition);

  const window = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: 240,
    minHeight: 260,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    hasShadow: false,
    show: false,
    icon: appRoot ? getIconPath(appRoot) : undefined,
    x: initialPosition?.x,
    y: initialPosition?.y,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.once("ready-to-show", () => {
    if (!initialPosition) {
      moveWindowToAnchor(window, "bottom-right");
    }

    window.show();
    window.focus();
  });

  window.setBackgroundColor("#00000000");
  window.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  return window;
}

export function moveWindowToAnchor(window, anchor) {
  const { x, y } = getAnchorPosition(window, anchor);
  window.setPosition(x, y);
  return { x, y };
}

function resolveInitialPosition(position) {
  if (!position || typeof position.x !== "number" || typeof position.y !== "number") {
    return null;
  }

  return isPositionVisible(position) ? position : null;
}

function isPositionVisible(position) {
  return screen.getAllDisplays().some((display) => {
    const { x, y, width, height } = display.workArea;

    return (
      position.x >= x - WINDOW_WIDTH + WINDOW_MARGIN &&
      position.x <= x + width - WINDOW_MARGIN &&
      position.y >= y - WINDOW_HEIGHT + WINDOW_MARGIN &&
      position.y <= y + height - WINDOW_MARGIN
    );
  });
}

function getAnchorPosition(window, anchor) {
  const bounds = window.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const { x, y, width, height } = display.workArea;

  if (anchor === "center") {
    return {
      x: Math.round(x + (width - bounds.width) / 2),
      y: Math.round(y + (height - bounds.height) / 2)
    };
  }

  return {
    x: Math.round(x + width - bounds.width - WINDOW_MARGIN),
    y: Math.round(y + height - bounds.height - WINDOW_MARGIN)
  };
}

function getIconPath(appRoot) {
  return path.join(appRoot, "build", "icon.ico");
}
