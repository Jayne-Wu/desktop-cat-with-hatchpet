import { Menu, Tray, app, nativeImage } from "electron";
import { getMenuText } from "../shared/menu-i18n.mjs";
import { buildDesktopPetMenuTemplate } from "./menu-template.mjs";
import path from "node:path";

export function createTray(appRoot) {
  const icon = appRoot ? nativeImage.createFromPath(path.join(appRoot, "build", "icon.ico")) : nativeImage.createEmpty();
  const tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon);
  tray.setToolTip("Desktop Pet");
  return tray;
}

export function buildTrayMenu(options) {
  const text = getMenuText(options.language);
  const visible = options.mainWindow?.isVisible?.() ?? true;

  return Menu.buildFromTemplate(
    buildDesktopPetMenuTemplate({
      ...options,
      visibilityLabel: visible ? text.hide : text.show,
      onVisibilityToggle: () => {
        if (visible) {
          options.mainWindow.hide();
          return;
        }

        options.mainWindow.show();
        options.mainWindow.focus();
      },
      onQuit: () => {
        app.quit();
      }
    })
  );
}
