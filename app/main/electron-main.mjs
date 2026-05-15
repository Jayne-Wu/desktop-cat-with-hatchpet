import { app, ipcMain } from "electron";
import { createMainWindow } from "./window.mjs";
import { createTray } from "./tray.mjs";
import { showPetContextMenu } from "./context-menu.mjs";
import { getDefaultPet, getPetSpritesheetDataUrl, listLocalPets } from "./pet-registry.mjs";
import { readSettings, writeSettings } from "./settings-store.mjs";

let mainWindow = null;
let tray = null;

app.whenReady().then(async () => {
  mainWindow = createMainWindow();
  tray = createTray(mainWindow);

  mainWindow.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    console.error(`[renderer-gone] ${details.reason}`);
  });

  ipcMain.handle("pets:list", async () => {
    return listLocalPets(app.getAppPath());
  });

  ipcMain.handle("pets:default", async () => {
    return getDefaultPet(app.getAppPath());
  });

  ipcMain.handle("pets:spritesheet-data-url", async (_event, petId) => {
    return getPetSpritesheetDataUrl(app.getAppPath(), petId);
  });

  ipcMain.handle("pet:show-context-menu", async () => {
    if (mainWindow) {
      showPetContextMenu(mainWindow);
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

    const nextPinned = !mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(nextPinned, "screen-saver");
    return { ok: true, alwaysOnTop: nextPinned };
  });

  ipcMain.handle("window:minimize", async () => {
    mainWindow?.minimize();
    return { ok: true };
  });

  app.on("activate", () => {
    if (mainWindow === null) {
      mainWindow = createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  tray?.destroy();
});
