import { Menu, app } from "electron";

const ACTIONS = [
  ["Idle", "idle"],
  ["Wave", "waving"],
  ["Jump", "jumping"],
  ["Waiting", "waiting"],
  ["Working", "running"],
  ["Review", "review"],
  ["Failed", "failed"],
  ["Move Left", "running-left"],
  ["Move Right", "running-right"]
];

export function showPetContextMenu(mainWindow) {
  const pinned = mainWindow.isAlwaysOnTop();

  const menu = Menu.buildFromTemplate([
    {
      label: "西瓜",
      enabled: false
    },
    {
      type: "separator"
    },
    ...ACTIONS.map(([label, state]) => ({
      label,
      click: () => {
        mainWindow.webContents.send("pet:set-state", state);
      }
    })),
    {
      type: "separator"
    },
    {
      label: pinned ? "Unpin" : "Pin",
      click: () => {
        mainWindow.setAlwaysOnTop(!pinned, "screen-saver");
      }
    },
    {
      label: "Hide",
      click: () => {
        mainWindow.hide();
      }
    },
    {
      label: "Quit",
      click: () => {
        app.quit();
      }
    }
  ]);

  menu.popup({ window: mainWindow });
}
