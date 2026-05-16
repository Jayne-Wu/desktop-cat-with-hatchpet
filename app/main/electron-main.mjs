import { app, ipcMain } from "electron";
import { createMainWindow, moveWindowToAnchor } from "./window.mjs";
import { buildTrayMenu, createTray } from "./tray.mjs";
import { showPetContextMenu } from "./context-menu.mjs";
import { getDefaultPet, getPetById, getPetSpritesheetDataUrl, getStartupPet, listLocalPets } from "./pet-registry.mjs";
import { readSettings, writeSettings } from "./settings-store.mjs";

let mainWindow = null;
let tray = null;
let windowDragState = null;

app.whenReady().then(async () => {
  const settings = await readSettings(app.getPath("userData"));
  mainWindow = createMainWindow(settings);
  tray = createTray();

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
        scale: state.settings.scale,
        onSelectPet: selectPet,
        onSelectScale: applyScale,
        onResetPosition: resetWindowPosition,
        onTogglePin: togglePin
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
        scale: state.settings.scale,
        onSelectPet: selectPet,
        onSelectScale: applyScale,
        onResetPosition: resetWindowPosition,
        onTogglePin: async () => {
          togglePin();
          await refreshMenus();
        }
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

  ipcMain.handle("window:drag-end", async () => {
    if (!mainWindow) {
      return { ok: false };
    }

    windowDragState = null;
    await persistWindowPosition();
    return { ok: true };
  });

  app.on("activate", () => {
    if (mainWindow === null) {
      mainWindow = createMainWindow();
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
    mainWindow?.webContents.send("pet:scale-changed", nextSettings.scale);
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

  async function persistWindowPosition() {
    if (!mainWindow) {
      return;
    }

    const [x, y] = mainWindow.getPosition();
    await writeSettings(app.getPath("userData"), {
      windowPosition: { x, y }
    });
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  tray?.destroy();
});

function isValidPointer(pointer) {
  return Number.isFinite(pointer?.screenX) && Number.isFinite(pointer?.screenY);
}
