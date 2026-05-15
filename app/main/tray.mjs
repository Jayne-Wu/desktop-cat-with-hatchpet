import { Menu, Tray, nativeImage } from "electron";

export function createTray(mainWindow) {
  const emptyIcon = nativeImage.createEmpty();
  const tray = new Tray(emptyIcon);

  const refreshMenu = () => {
    const pinned = mainWindow?.isAlwaysOnTop?.() ?? true;

    const menu = Menu.buildFromTemplate([
      {
        label: pinned ? "Unpin Window" : "Pin Window",
        click: () => {
          const nextPinned = !mainWindow.isAlwaysOnTop();
          mainWindow.setAlwaysOnTop(nextPinned, "screen-saver");
          refreshMenu();
        }
      },
      {
        label: "Show",
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        }
      },
      {
        label: "Hide",
        click: () => {
          mainWindow.hide();
        }
      },
      {
        type: "separator"
      },
      {
        label: "Quit",
        role: "quit"
      }
    ]);

    tray.setContextMenu(menu);
  };

  tray.setToolTip("Desktop Pet");
  refreshMenu();
  tray.on("click", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return tray;
}
