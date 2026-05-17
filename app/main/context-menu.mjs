import { Menu, app } from "electron";
import { getMenuText } from "../shared/menu-i18n.mjs";
import { buildDesktopPetMenuTemplate } from "./menu-template.mjs";

export function showPetContextMenu(options) {
  const text = getMenuText(options.language);
  const menu = Menu.buildFromTemplate(
    buildDesktopPetMenuTemplate({
      ...options,
      visibilityLabel: text.hide,
      onVisibilityToggle: () => {
        options.mainWindow.hide();
      },
      onQuit: () => {
        app.quit();
      }
    })
  );

  menu.popup({ window: options.mainWindow });
}
