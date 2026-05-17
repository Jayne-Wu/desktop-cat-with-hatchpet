import assert from "node:assert/strict";
import { test } from "node:test";
import { MovementController } from "../app/main/movement-controller.mjs";

test("focus interaction briefly boosts movement before settling back down", () => {
  const emittedStates = [];
  const fakeWindow = createFakeWindow();
  const controller = new MovementController({
    mainWindow: fakeWindow,
    onStateChange: (state) => emittedStates.push(state),
    onPositionChanged: () => {},
    random: () => 0.5,
    screenApi: {
      getDisplayMatching: () => ({
        workArea: { x: 0, y: 0, width: 1200, height: 900 }
      })
    }
  });

  controller.setCompanionStyle("focus");
  controller.noteInteraction();
  controller.tick(1401);

  assert.equal(emittedStates.at(-1).phase, "stroll");
  assert.equal(emittedStates.at(-1).locomotion, "none");
  controller.stop();
});

test("pet does not physically move until directional animation is active", () => {
  const emittedStates = [];
  const fakeWindow = createFakeWindow();
  const controller = new MovementController({
    mainWindow: fakeWindow,
    onStateChange: (state) => emittedStates.push(state),
    onPositionChanged: () => {},
    random: () => 0.5,
    screenApi: {
      getDisplayMatching: () => ({
        workArea: { x: 0, y: 0, width: 1200, height: 900 }
      })
    }
  });

  const initialBounds = fakeWindow.getBounds();

  controller.phase = "stroll";
  controller.phaseRemainingMs = 5000;
  controller.edge = "bottom";
  controller.horizontalDirection = 1;
  controller.setAnimationState("waving");
  controller.tick(50);

  assert.equal(fakeWindow.getBounds().x, initialBounds.x);
  assert.equal(emittedStates.at(-1).locomotion, "right");

  controller.setAnimationState("running-right");
  controller.tick(50);

  assert.ok(fakeWindow.getBounds().x > initialBounds.x);
  controller.stop();
});

test("rehome snaps back to the bottom edge without animated travel", () => {
  const fakeWindow = createFakeWindow({ x: 420, y: 320 });
  const controller = new MovementController({
    mainWindow: fakeWindow,
    onStateChange: () => {},
    onPositionChanged: () => {},
    random: () => 0.5,
    screenApi: {
      getDisplayMatching: () => ({
        workArea: { x: 0, y: 0, width: 1200, height: 900 }
      })
    }
  });

  controller.phase = "rehome";
  controller.rehomeTarget = null;
  controller.tick(50);

  assert.equal(fakeWindow.getBounds().y, 576);
  controller.stop();
});

function createFakeWindow(initialBounds = {}) {
  let bounds = { x: 100, y: 576, width: 280, height: 300, ...initialBounds };

  return {
    getBounds: () => ({ ...bounds }),
    setPosition: (x, y) => {
      bounds = { ...bounds, x, y };
    },
    isVisible: () => true,
    setIgnoreMouseEvents: () => {}
  };
}
