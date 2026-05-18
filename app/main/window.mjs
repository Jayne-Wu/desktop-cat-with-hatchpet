import { BrowserWindow, screen } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_SCALE, MIN_SCALE, scaleToWindowSize } from "../shared/scale-options.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WINDOW_MARGIN = 24;

export function createMainWindow(settings = {}, appRoot) {
  const initialSize = scaleToWindowSize(settings.scale);
  const minSize = scaleToWindowSize(MIN_SCALE);
  const maxSize = scaleToWindowSize(MAX_SCALE);
  const initialPosition = resolveInitialPosition(settings.windowPosition, initialSize);

  const window = new BrowserWindow({
    width: initialSize.width,
    height: initialSize.height,
    minWidth: minSize.width,
    minHeight: minSize.height,
    maxWidth: maxSize.width,
    maxHeight: maxSize.height,
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

function resolveInitialPosition(position, windowSize) {
  if (!position || typeof position.x !== "number" || typeof position.y !== "number") {
    return null;
  }

  return isPositionVisible(position, windowSize) ? position : null;
}

function isPositionVisible(position, windowSize) {
  return screen.getAllDisplays().some((display) => {
    const { x, y, width, height } = display.workArea;

    return (
      position.x >= x - windowSize.width + WINDOW_MARGIN &&
      position.x <= x + width - WINDOW_MARGIN &&
      position.y >= y - windowSize.height + WINDOW_MARGIN &&
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
