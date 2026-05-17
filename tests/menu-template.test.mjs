import assert from "node:assert/strict";
import { test } from "node:test";
import { buildDesktopPetMenuTemplate } from "../app/main/menu-template.mjs";

test("click through lives under interaction instead of behavior", () => {
  const menu = buildDesktopPetMenuTemplate({
    mainWindow: fakeWindow(),
    pets: [],
    selectedPetId: null,
    scale: 0.92,
    movementMode: "still",
    clickThrough: false,
    language: "en-US",
    visibilityLabel: "Hide",
    onSelectPet: noop,
    onSelectScale: noop,
    onSelectMovementMode: noop,
    onToggleClickThrough: noop,
    onResetPosition: noop,
    onTogglePin: noop,
    onSelectLanguage: noop,
    onVisibilityToggle: noop,
    onQuit: noop
  });

  const behavior = menu.find((item) => item.label === "Behavior");
  const interaction = menu.find((item) => item.label === "Interaction");

  assert.ok(behavior);
  assert.ok(interaction);
  assert.equal(behavior.submenu.some((item) => item.label === "Click Through"), false);
  assert.equal(interaction.submenu.some((item) => item.label === "Click Through"), true);
});

function fakeWindow() {
  return {
    isAlwaysOnTop: () => true,
    webContents: {
      send: noop
    }
  };
}

function noop() {}
