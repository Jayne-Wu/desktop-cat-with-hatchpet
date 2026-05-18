import { LANGUAGE_OPTIONS, getMenuText } from "../shared/menu-i18n.mjs";
import { COMPANION_STYLES } from "../shared/companion-options.mjs";

const COMPANION_LABEL_KEYS = {
  quiet: "quiet",
  curious: "curious",
  playful: "playful",
  focus: "focus"
};

export function buildDesktopPetMenuTemplate({
  pets,
  selectedPetId,
  companionStyle,
  clickThrough,
  language,
  visibilityLabel,
  onSelectPet,
  onSelectCompanionStyle,
  onToggleClickThrough,
  onResetPosition,
  onSelectLanguage,
  onVisibilityToggle,
  onQuit
}) {
  const text = getMenuText(language);
  const currentPet = pets.find((pet) => pet.id === selectedPetId) ?? pets[0] ?? null;

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

function buildCompanionItems({ text, companionStyle, onSelectCompanionStyle }) {
  return COMPANION_STYLES.map((option) => ({
    label: text[COMPANION_LABEL_KEYS[option.id]],
    type: "radio",
    checked: option.id === companionStyle,
    click: () => onSelectCompanionStyle(option.id)
  }));
}
