const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopPet", {
  getDefaultPet: () => ipcRenderer.invoke("pets:default"),
  listPets: () => ipcRenderer.invoke("pets:list"),
  getSpritesheetDataUrl: (petId) => ipcRenderer.invoke("pets:spritesheet-data-url", petId),
  showPetContextMenu: () => ipcRenderer.invoke("pet:show-context-menu"),
  onSetState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("pet:set-state", listener);
    return () => ipcRenderer.removeListener("pet:set-state", listener);
  },
  readSettings: () => ipcRenderer.invoke("settings:read"),
  writeSettings: (settings) => ipcRenderer.invoke("settings:write", settings),
  togglePin: () => ipcRenderer.invoke("window:toggle-pin"),
  minimize: () => ipcRenderer.invoke("window:minimize")
});
