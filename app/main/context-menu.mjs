import { Menu, app } from "electron";
import { SCALE_OPTIONS } from "../shared/scale-options.mjs";

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

export function showPetContextMenu({
  mainWindow,
  pets,
  selectedPetId,
  scale,
  onSelectPet,
  onSelectScale,
  onResetPosition,
  onTogglePin
}) {
  const currentPet = pets.find((pet) => pet.id === selectedPetId) ?? pets[0] ?? null;
  const pinned = mainWindow.isAlwaysOnTop();

  const menu = Menu.buildFromTemplate([
    {
      label: currentPet ? `Pet: ${currentPet.displayName}` : "Pet: unavailable",
      enabled: false
    },
    {
      type: "separator"
    },
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
      click: onTogglePin
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
