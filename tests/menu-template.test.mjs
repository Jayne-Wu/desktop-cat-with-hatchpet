import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDesktopPetMenuTemplate } from "../app/main/menu-template.mjs";

test("click through lives under interaction and action test is removed", () => {
  const menu = buildDesktopPetMenuTemplate({
    mainWindow: fakeWindow(),
    pets: [],
    selectedPetId: null,
    scale: 0.92,
    companionStyle: "curious",
    clickThrough: false,
    language: "en-US",
    visibilityLabel: "Hide",
    onSelectPet: noop,
    onSelectScale: noop,
    onSelectCompanionStyle: noop,
    onToggleClickThrough: noop,
    onResetPosition: noop,
    onTogglePin: noop,
    onSelectLanguage: noop,
    onVisibilityToggle: noop,
    onQuit: noop
  });

  const companion = menu.find((item) => item.label === "Companion Style");
  const interaction = menu.find((item) => item.label === "Interaction");
  const actionTest = menu.find((item) => item.label === "Action Test");

  assert.ok(companion);
  assert.ok(interaction);
  assert.equal(companion.submenu.some((item) => item.label === "Click Through"), false);
  assert.equal(interaction.submenu.some((item) => item.label === "Click Through"), true);
  assert.equal(actionTest, undefined);
});

function fakeWindow() {
  return {
    isAlwaysOnTop: () => true
  };
}

function noop() {}
