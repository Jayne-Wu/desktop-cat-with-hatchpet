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
    onSelectCompanionStyle: noop,
    onResetPosition: noop,
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

function fakeWindow() {
  return {
    isAlwaysOnTop: () => true
  };
}

function noop() {}
