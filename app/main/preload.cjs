const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopPet", {
  getDefaultPet: () => ipcRenderer.invoke("pets:default"),
  getStartupPet: () => ipcRenderer.invoke("pets:startup"),
  listPets: () => ipcRenderer.invoke("pets:list"),
  getSpritesheetDataUrl: (petId) => ipcRenderer.invoke("pets:spritesheet-data-url", petId),
  showPetContextMenu: () => ipcRenderer.invoke("pet:show-context-menu"),
  notifyInteraction: () => ipcRenderer.invoke("pet:interaction"),
  reportAnimationState: (stateId) => ipcRenderer.invoke("pet:animation-state", stateId),
  onPetSelected: (callback) => {
    const listener = (_event, pet) => callback(pet);
    ipcRenderer.on("pet:selected", listener);
    return () => ipcRenderer.removeListener("pet:selected", listener);
  },
  onMovementState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("pet:movement-state", listener);
    return () => ipcRenderer.removeListener("pet:movement-state", listener);
  },
  onScaleChanged: (callback) => {
    const listener = (_event, scale) => callback(scale);
    ipcRenderer.on("pet:scale-changed", listener);
    return () => ipcRenderer.removeListener("pet:scale-changed", listener);
  },
  readSettings: () => ipcRenderer.invoke("settings:read"),
  writeSettings: (settings) => ipcRenderer.invoke("settings:write", settings),
  togglePin: () => ipcRenderer.invoke("window:toggle-pin"),
  minimize: () => ipcRenderer.invoke("window:minimize"),
  beginWindowDrag: (pointer) => ipcRenderer.invoke("window:drag-start", pointer),
  updateWindowDrag: (pointer) => ipcRenderer.invoke("window:drag-update", pointer),
  endWindowDrag: () => ipcRenderer.invoke("window:drag-end")
});
