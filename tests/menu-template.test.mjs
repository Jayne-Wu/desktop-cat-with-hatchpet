import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDesktopPetMenuTemplate } from "../app/main/menu-template.mjs";

test("pin toggle lives with visibility controls and click through is removed", () => {
  const menu = buildDesktopPetMenuTemplate({
    mainWindow: fakeWindow(),
    pets: [],
    selectedPetId: null,
    companionStyle: "curious",
    language: "en-US",
    visibilityLabel: "Hide",
    onSelectPet: noop,
    onImportPet: noop,
    onSelectCompanionStyle: noop,
    onResetPosition: noop,
    onEnterTaskbarMode: noop,
    onExitTaskbarMode: noop,
    onTogglePin: noop,
    onSelectLanguage: noop,
    onVisibilityToggle: noop,
    onQuit: noop
  });

  const companion = menu.find((item) => item.label === "Companion Style");
  const interaction = menu.find((item) => item.label === "Interaction");
  const unpin = menu.find((item) => item.label === "Unpin");
  const unpinIndex = menu.indexOf(unpin);
  const hideIndex = menu.findIndex((item) => item.label === "Hide");
  const actionTest = menu.find((item) => item.label === "Action Test");

  assert.ok(companion);
  assert.ok(unpin);
  assert.equal(unpinIndex, hideIndex - 1);
  assert.equal(interaction, undefined);
  assert.equal(actionTest, undefined);
});

test("pet menu exposes import before pet choices", () => {
  const menu = buildDesktopPetMenuTemplate({
    mainWindow: fakeWindow(),
    pets: [
      {
        id: "xigua",
        displayName: "Xigua"
      }
    ],
    selectedPetId: "xigua",
    companionStyle: "curious",
    language: "en-US",
    visibilityLabel: "Hide",
    onSelectPet: noop,
    onImportPet: noop,
    onSelectCompanionStyle: noop,
    onResetPosition: noop,
    onEnterTaskbarMode: noop,
    onExitTaskbarMode: noop,
    onTogglePin: noop,
    onSelectLanguage: noop,
    onVisibilityToggle: noop,
    onQuit: noop
  });

  const petMenu = menu.find((item) => item.label === "Pet");

  assert.equal(petMenu.submenu[0].label, "Import Pet…");
  assert.equal(petMenu.submenu[1].type, "separator");
  assert.equal(petMenu.submenu[2].label, "Xigua");
});

test("position menu can switch into and out of taskbar mode", () => {
  const desktopMenu = buildDesktopPetMenuTemplate({
    mainWindow: fakeWindow(),
    pets: [],
    selectedPetId: null,
    companionStyle: "curious",
    language: "en-US",
    visibilityLabel: "Hide",
    onSelectPet: noop,
    onImportPet: noop,
    onSelectCompanionStyle: noop,
    onResetPosition: noop,
    onEnterTaskbarMode: noop,
    onExitTaskbarMode: noop,
    onTogglePin: noop,
    onSelectLanguage: noop,
    onVisibilityToggle: noop,
    onQuit: noop
  });
  const taskbarMenu = buildDesktopPetMenuTemplate({
    mainWindow: fakeWindow(),
    pets: [],
    selectedPetId: null,
    companionStyle: "curious",
    language: "en-US",
    visibilityLabel: "Hide",
    onSelectPet: noop,
    onImportPet: noop,
    onSelectCompanionStyle: noop,
    onResetPosition: noop,
    onEnterTaskbarMode: noop,
    onExitTaskbarMode: noop,
    onTogglePin: noop,
    onSelectLanguage: noop,
    onVisibilityToggle: noop,
    onQuit: noop,
    taskbarMode: true
  });

  const desktopPosition = desktopMenu.find((item) => item.label === "Position");
  const taskbarPosition = taskbarMenu.find((item) => item.label === "Position");

  assert.equal(desktopPosition.submenu.at(-1).label, "Run on Taskbar");
  assert.equal(taskbarPosition.submenu[0].enabled, false);
  assert.equal(taskbarPosition.submenu[1].enabled, false);
  assert.equal(taskbarPosition.submenu.at(-1).label, "Back to Desktop");
});

function fakeWindow() {
  return {
    isAlwaysOnTop: () => true
  };
}

function noop() {}
