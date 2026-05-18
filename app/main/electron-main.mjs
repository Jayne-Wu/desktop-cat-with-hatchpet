import { app, ipcMain } from "electron";
import { createMainWindow, moveWindowToAnchor } from "./window.mjs";
import { buildTrayMenu, createTray } from "./tray.mjs";
import { showPetContextMenu } from "./context-menu.mjs";
import { MovementController } from "./movement-controller.mjs";
import { getDefaultPet, getPetById, getPetSpritesheetDataUrl, getStartupPet, listLocalPets } from "./pet-registry.mjs";
import { readSettings, writeSettings } from "./settings-store.mjs";
import { scaleToWindowSize, windowSizeToScale } from "../shared/scale-options.mjs";

let mainWindow = null;
let tray = null;
let windowDragState = null;
let windowResizeState = null;
let movementController = null;
let positionPersistTimer = null;

app.whenReady().then(async () => {
  const settings = await readSettings(app.getPath("userData"));
  mainWindow = createMainWindow(settings, app.getAppPath());
  movementController = new MovementController({
    mainWindow,
    onStateChange: (state) => {
      mainWindow?.webContents.send("pet:movement-state", state);
    },
    onPositionChanged: schedulePersistWindowPosition
  });
  movementController.applySettings(settings);
  tray = createTray(app.getAppPath());

  const refreshMenus = async () => {
    if (!mainWindow || !tray) {
      return;
    }

    const state = await getUiState();
    tray.setContextMenu(
      buildTrayMenu({
        mainWindow,
        pets: state.registry.pets,
        selectedPetId: state.selectedPet?.id ?? null,
        companionStyle: state.settings.companionStyle,
        language: state.settings.language,
        onSelectPet: selectPet,
        onSelectCompanionStyle: applyCompanionStyle,
        onResetPosition: resetWindowPosition,
        onTogglePin: async () => {
          togglePin();
          await refreshMenus();
        },
        onSelectLanguage: applyLanguage
      })
    );
  };

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error(`[renderer-gone] ${details.reason}`);
  });

  mainWindow.on("show", () => {
    refreshMenus();
  });

  mainWindow.on("hide", () => {
    refreshMenus();
  });

  ipcMain.handle("pets:list", async () => {
    return listLocalPets(app.getAppPath());
  });

  ipcMain.handle("pets:default", async () => {
    return getDefaultPet(app.getAppPath());
  });

  ipcMain.handle("pets:startup", async () => {
    const currentSettings = await readSettings(app.getPath("userData"));
    return getStartupPet(app.getAppPath(), currentSettings.selectedPetId);
  });

  ipcMain.handle("pets:spritesheet-data-url", async (_event, petId) => {
    return getPetSpritesheetDataUrl(app.getAppPath(), petId);
  });

  ipcMain.handle("pet:show-context-menu", async () => {
    if (mainWindow) {
      const state = await getUiState();
      showPetContextMenu({
        mainWindow,
        pets: state.registry.pets,
        selectedPetId: state.selectedPet?.id ?? null,
        companionStyle: state.settings.companionStyle,
        language: state.settings.language,
        onSelectPet: selectPet,
        onSelectCompanionStyle: applyCompanionStyle,
        onResetPosition: resetWindowPosition,
        onTogglePin: async () => {
          togglePin();
          await refreshMenus();
        },
        onSelectLanguage: applyLanguage,
      });
    }

    return { ok: true };
  });

  ipcMain.handle("settings:read", async () => {
    return readSettings(app.getPath("userData"));
  });

  ipcMain.handle("settings:write", async (_event, settings) => {
    return writeSettings(app.getPath("userData"), settings);
  });

  ipcMain.handle("pet:interaction", async () => {
    movementController?.noteInteraction();
    return { ok: true };
  });

  ipcMain.handle("pet:animation-state", async (_event, stateId) => {
    movementController?.setAnimationState(stateId);
    return { ok: true };
  });

  ipcMain.handle("window:toggle-pin", async () => {
    if (!mainWindow) {
      return { ok: false };
    }

    const nextPinned = togglePin();
    await refreshMenus();
    return { ok: true, alwaysOnTop: nextPinned };
  });

  ipcMain.handle("window:minimize", async () => {
    mainWindow?.minimize();
    return { ok: true };
  });

  ipcMain.handle("window:drag-start", async (_event, pointer) => {
    if (!mainWindow || !isValidPointer(pointer)) {
      return { ok: false };
    }

    const [windowX, windowY] = mainWindow.getPosition();
    movementController?.setDragging(true);
    windowDragState = {
      offsetX: pointer.screenX - windowX,
      offsetY: pointer.screenY - windowY
    };

    return { ok: true };
  });

  ipcMain.handle("window:drag-update", async (_event, pointer) => {
    if (!mainWindow || !windowDragState || !isValidPointer(pointer)) {
      return { ok: false };
    }

    mainWindow.setPosition(
      Math.round(pointer.screenX - windowDragState.offsetX),
      Math.round(pointer.screenY - windowDragState.offsetY)
    );

    return { ok: true };
  });

  ipcMain.handle("window:resize-start", async (_event, pointer) => {
    if (!mainWindow || !isValidPointer(pointer)) {
      return { ok: false };
    }

    const bounds = mainWindow.getBounds();
    const currentSettings = await readSettings(app.getPath("userData"));
    clearTimeout(positionPersistTimer);
    positionPersistTimer = null;
    movementController?.setDragging(true);
    windowResizeState = {
      startScreenX: pointer.screenX,
      startScreenY: pointer.screenY,
      startBounds: bounds,
      scale: currentSettings.scale
    };

    return { ok: true };
  });

  ipcMain.handle("window:resize-update", async (_event, pointer) => {
    if (!mainWindow || !windowResizeState || !isValidPointer(pointer)) {
      return { ok: false };
    }

    const deltaX = pointer.screenX - windowResizeState.startScreenX;
    const deltaY = pointer.screenY - windowResizeState.startScreenY;
    const requestedWidth = windowResizeState.startBounds.width + deltaX;
    const requestedHeight = windowResizeState.startBounds.height + deltaY;
    const nextScale = windowSizeToScale(requestedWidth, requestedHeight);

    resizeWindowForScale(nextScale, { anchorBottom: true, startBounds: windowResizeState.startBounds });
    windowResizeState.scale = nextScale;
    mainWindow.webContents.send("pet:scale-changed", nextScale);

    return { ok: true, scale: nextScale };
  });

  ipcMain.handle("window:resize-end", async () => {
    if (!mainWindow) {
      return { ok: false };
    }

    const finalScale = windowResizeState?.scale;
    windowResizeState = null;
    movementController?.setDragging(false);

    if (Number.isFinite(finalScale)) {
      const [x, y] = mainWindow.getPosition();
      await writeSettings(app.getPath("userData"), {
        scale: finalScale,
        windowPosition: { x, y }
      });
      await refreshMenus();
      return { ok: true, scale: finalScale };
    }

    return { ok: false };
  });

  ipcMain.handle("window:drag-end", async () => {
    if (!mainWindow) {
      return { ok: false };
    }

    windowDragState = null;
    movementController?.setDragging(false);
    await persistWindowPosition();
    return { ok: true };
  });

  app.on("activate", () => {
    if (mainWindow === null) {
      mainWindow = createMainWindow({}, app.getAppPath());
      refreshMenus();
    }
  });

  tray.on("click", () => {
    if (!mainWindow) {
      return;
    }

    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  await refreshMenus();

  async function getUiState() {
    const [registry, currentSettings] = await Promise.all([
      listLocalPets(app.getAppPath()),
      readSettings(app.getPath("userData"))
    ]);

    const selectedPet =
      registry.pets.find((pet) => pet.id === currentSettings.selectedPetId) ??
      registry.pets.find((pet) => pet.id === "xigua") ??
      registry.pets[0] ??
      null;

    return {
      registry,
      settings: currentSettings,
      selectedPet
    };
  }

  async function selectPet(petId) {
    const pet = await getPetById(app.getAppPath(), petId);
    await writeSettings(app.getPath("userData"), { selectedPetId: pet.id });
    mainWindow?.webContents.send("pet:selected", pet);
    await refreshMenus();
  }

  async function applyScale(scale) {
    const nextSettings = await writeSettings(app.getPath("userData"), { scale });
    resizeWindowForScale(nextSettings.scale, { anchorBottom: true });
    mainWindow?.webContents.send("pet:scale-changed", nextSettings.scale);
    await refreshMenus();
  }

  async function applyCompanionStyle(companionStyle) {
    const nextSettings = await writeSettings(app.getPath("userData"), { companionStyle });
    movementController?.setCompanionStyle(nextSettings.companionStyle);
    await refreshMenus();
  }

  async function applyLanguage(language) {
    await writeSettings(app.getPath("userData"), { language });
    await refreshMenus();
  }

  async function resetWindowPosition(anchor) {
    if (!mainWindow) {
      return;
    }

    const nextPosition = moveWindowToAnchor(mainWindow, anchor);
    await writeSettings(app.getPath("userData"), { windowPosition: nextPosition });
  }

  function togglePin() {
    const nextPinned = !mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(nextPinned, "screen-saver");
    return nextPinned;
  }

  function resizeWindowForScale(scale, options = {}) {
    if (!mainWindow) {
      return;
    }

    const bounds = options.startBounds ?? mainWindow.getBounds();
    const size = scaleToWindowSize(scale);
    const nextBounds = {
      x: bounds.x,
      y: options.anchorBottom ? bounds.y + bounds.height - size.height : bounds.y,
      width: size.width,
      height: size.height
    };

    mainWindow.setBounds(nextBounds);
  }

  async function persistWindowPosition() {
    if (!mainWindow) {
      return;
    }

    const [x, y] = mainWindow.getPosition();
    await writeSettings(app.getPath("userData"), {
      windowPosition: { x, y }
    });
  }

  function schedulePersistWindowPosition(options = {}) {
    if (options.immediate) {
      clearTimeout(positionPersistTimer);
      positionPersistTimer = null;
      persistWindowPosition();
      return;
    }

    if (positionPersistTimer) {
      return;
    }

    positionPersistTimer = setTimeout(() => {
      positionPersistTimer = null;
      persistWindowPosition();
    }, 2000);
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  movementController?.stop();
  tray?.destroy();
});

function isValidPointer(pointer) {
  return Number.isFinite(pointer?.screenX) && Number.isFinite(pointer?.screenY);
}
