import { Menu, Tray, app, nativeImage } from "electron";
import { getMenuText } from "../shared/menu-i18n.mjs";
import { buildDesktopPetMenuTemplate } from "./menu-template.mjs";

export function createTray() {
  const tray = new Tray(nativeImage.createEmpty());
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
