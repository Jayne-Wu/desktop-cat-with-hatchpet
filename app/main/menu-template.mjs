import { LANGUAGE_OPTIONS, getMenuText } from "../shared/menu-i18n.mjs";
import { MOVEMENT_MODES } from "../shared/movement-options.mjs";
import { SCALE_OPTIONS } from "../shared/scale-options.mjs";

const ACTIONS = [
  { labelKey: "idle", state: "idle" },
  { labelKey: "waving", state: "waving" },
  { labelKey: "jumping", state: "jumping" },
  { labelKey: "waiting", state: "waiting" },
  { labelKey: "running", state: "running" },
  { labelKey: "review", state: "review" },
  { labelKey: "failed", state: "failed" },
  { labelKey: "runningLeft", state: "running-left" },
  { labelKey: "runningRight", state: "running-right" }
];

const SCALE_LABEL_KEYS = {
  small: "small",
  medium: "medium",
  large: "large"
};

const MOVEMENT_LABEL_KEYS = {
  still: "still",
  "bottom-walk": "bottomWalk",
  "dock-left": "dockLeft",
  "dock-right": "dockRight"
};

export function buildDesktopPetMenuTemplate({
  mainWindow,
  pets,
  selectedPetId,
  scale,
  movementMode,
  clickThrough,
  language,
  visibilityLabel,
  onSelectPet,
  onSelectScale,
  onSelectMovementMode,
  onToggleClickThrough,
  onResetPosition,
  onTogglePin,
  onSelectLanguage,
  onVisibilityToggle,
  onQuit
}) {
  const text = getMenuText(language);
  const currentPet = pets.find((pet) => pet.id === selectedPetId) ?? pets[0] ?? null;
  const pinned = mainWindow.isAlwaysOnTop();

  return [
    {
      label: currentPet ? `${text.currentPet}: ${currentPet.displayName}` : text.petUnavailable,
      enabled: false
    },
    {
      type: "separator"
    },
    {
      label: text.pet,
      submenu: buildPetItems({ text, pets, selectedPetId, onSelectPet })
    },
    {
      label: text.appearance,
      submenu: [
        {
          label: text.size,
          submenu: buildScaleItems({ text, scale, onSelectScale })
        }
      ]
    },
    {
      label: text.behavior,
      submenu: buildMovementItems({ text, movementMode, onSelectMovementMode })
    },
    {
      label: text.interaction,
      submenu: [
        {
          label: text.clickThrough,
          type: "checkbox",
          checked: clickThrough,
          click: () => onToggleClickThrough(!clickThrough)
        },
        {
          label: pinned ? text.unpin : text.pin,
          click: onTogglePin
        }
      ]
    },
    {
      label: text.position,
      submenu: [
        {
          label: text.center,
          click: () => onResetPosition("center")
        },
        {
          label: text.bottomRight,
          click: () => onResetPosition("bottom-right")
        }
      ]
    },
    {
      label: text.actionTest,
      submenu: ACTIONS.map((action) => ({
        label: text[action.labelKey],
        click: () => mainWindow.webContents.send("pet:set-state", action.state)
      }))
    },
    {
      label: text.language,
      submenu: LANGUAGE_OPTIONS.map((option) => ({
        label: option.label,
        type: "radio",
        checked: option.id === language,
        click: () => onSelectLanguage(option.id)
      }))
    },
    {
      type: "separator"
    },
    {
      label: visibilityLabel,
      click: onVisibilityToggle
    },
    {
      label: text.quit,
      click: onQuit
    }
  ];
}

function buildPetItems({ text, pets, selectedPetId, onSelectPet }) {
  if (pets.length === 0) {
    return [
      {
        label: text.noPetsFound,
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

function buildScaleItems({ text, scale, onSelectScale }) {
  return SCALE_OPTIONS.map((option) => ({
    label: text[SCALE_LABEL_KEYS[option.id]],
    type: "radio",
    checked: Math.abs(scale - option.value) < 0.001,
    click: () => onSelectScale(option.value)
  }));
}

function buildMovementItems({ text, movementMode, onSelectMovementMode }) {
  return MOVEMENT_MODES.map((option) => ({
    label: text[MOVEMENT_LABEL_KEYS[option.id]],
    type: "radio",
    checked: option.id === movementMode,
    click: () => onSelectMovementMode(option.id)
  }));
}
