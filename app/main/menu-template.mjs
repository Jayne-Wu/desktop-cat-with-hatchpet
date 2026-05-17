import { LANGUAGE_OPTIONS, getMenuText } from "../shared/menu-i18n.mjs";
import { COMPANION_STYLES } from "../shared/companion-options.mjs";
import { SCALE_OPTIONS } from "../shared/scale-options.mjs";

const SCALE_LABEL_KEYS = {
  small: "small",
  medium: "medium",
  large: "large"
};

const COMPANION_LABEL_KEYS = {
  quiet: "quiet",
  curious: "curious",
  playful: "playful",
  focus: "focus"
};

export function buildDesktopPetMenuTemplate({
  mainWindow,
  pets,
  selectedPetId,
  scale,
  companionStyle,
  clickThrough,
  language,
  visibilityLabel,
  onSelectPet,
  onSelectScale,
  onSelectCompanionStyle,
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
      label: text.companion,
      submenu: buildCompanionItems({ text, companionStyle, onSelectCompanionStyle })
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

function buildCompanionItems({ text, companionStyle, onSelectCompanionStyle }) {
  return COMPANION_STYLES.map((option) => ({
    label: text[COMPANION_LABEL_KEYS[option.id]],
    type: "radio",
    checked: option.id === companionStyle,
    click: () => onSelectCompanionStyle(option.id)
  }));
}
