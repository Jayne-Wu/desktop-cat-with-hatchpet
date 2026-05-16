import { Menu, Tray, nativeImage } from "electron";
import { SCALE_OPTIONS } from "../shared/scale-options.mjs";

export function createTray() {
  const tray = new Tray(nativeImage.createEmpty());
  tray.setToolTip("Desktop Pet");
  return tray;
}

export function buildTrayMenu({
  mainWindow,
  pets,
  selectedPetId,
  scale,
  onSelectPet,
  onSelectScale,
  onResetPosition,
  onTogglePin
}) {
  const pinned = mainWindow?.isAlwaysOnTop?.() ?? true;
  const visible = mainWindow?.isVisible?.() ?? true;

  return Menu.buildFromTemplate([
    {
      label: "Pets",
      submenu: buildPetItems(pets, selectedPetId, onSelectPet)
    },
    {
      label: "Size",
      submenu: buildScaleItems(scale, onSelectScale)
    },
    {
      label: "Reset Position",
      submenu: [
        {
          label: "Center",
          click: () => onResetPosition("center")
        },
        {
          label: "Bottom Right",
          click: () => onResetPosition("bottom-right")
        }
      ]
    },
    {
      type: "separator"
    },
    {
      label: pinned ? "Unpin Window" : "Pin Window",
      click: onTogglePin
    },
    {
      label: visible ? "Hide" : "Show",
      click: () => {
        if (visible) {
          mainWindow.hide();
          return;
        }

        mainWindow.show();
        mainWindow.focus();
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
}

function buildPetItems(pets, selectedPetId, onSelectPet) {
  if (pets.length === 0) {
    return [
      {
        label: "No pets found",
        enabled: false
      }
    ];
  }

  return pets.map((pet) => ({
    label: pet.displayName,
    type: "radio",
    checked: pet.id === selectedPetId,
    click: () => onSelectPet(pet.id)
  }));
}

function buildScaleItems(scale, onSelectScale) {
  return SCALE_OPTIONS.map((option) => ({
    label: option.label,
    type: "radio",
    checked: Math.abs(scale - option.value) < 0.001,
    click: () => onSelectScale(option.value)
  }));
}
