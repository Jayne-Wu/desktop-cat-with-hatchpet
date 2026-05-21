import { LANGUAGE_OPTIONS, getMenuText } from "../shared/menu-i18n.mjs";
import { COMPANION_STYLES } from "../shared/companion-options.mjs";

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
  companionStyle,
  language,
  visibilityLabel,
  onSelectPet,
  onImportPet,
  onSelectCompanionStyle,
  onResetPosition,
  onEnterTaskbarMode,
  onExitTaskbarMode,
  onTogglePin,
  onSelectLanguage,
  onVisibilityToggle,
  onQuit,
  taskbarMode = false
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
      submenu: buildPetItems({ text, pets, selectedPetId, onSelectPet, onImportPet })
    },
    {
      label: text.companion,
      submenu: buildCompanionItems({ text, companionStyle, onSelectCompanionStyle })
    },
    {
      label: text.position,
      submenu: [
        {
          label: text.center,
          enabled: !taskbarMode,
          click: () => onResetPosition("center")
        },
        {
          label: text.bottomRight,
          enabled: !taskbarMode,
          click: () => onResetPosition("bottom-right")
        },
        {
          type: "separator"
        },
        {
          label: taskbarMode ? text.backToDesktop : text.taskbarRun,
          click: () => {
            if (taskbarMode) {
              onExitTaskbarMode();
              return;
            }

            onEnterTaskbarMode();
          }
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
      label: pinned ? text.unpin : text.pin,
      click: onTogglePin
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

function buildPetItems({ text, pets, selectedPetId, onSelectPet, onImportPet }) {
  const importItem = {
    label: text.importPet,
    click: onImportPet
  };

  if (pets.length === 0) {
    return [
      importItem,
      {
        type: "separator"
      },
      {
        label: text.noPetsFound,
        enabled: false
      }
    ];
  }

  return [
    importItem,
    {
      type: "separator"
    },
    ...pets.map((pet) => ({
      label: pet.displayName,
      type: "radio",
      checked: pet.id === selectedPetId,
      click: () => onSelectPet(pet.id)
    }))
  ];
}

function buildCompanionItems({ text, companionStyle, onSelectCompanionStyle }) {
  return COMPANION_STYLES.map((option) => ({
    label: text[COMPANION_LABEL_KEYS[option.id]],
    type: "radio",
    checked: option.id === companionStyle,
    click: () => onSelectCompanionStyle(option.id)
  }));
}
