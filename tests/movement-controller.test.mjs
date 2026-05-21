import assert from "node:assert/strict";
import { test } from "node:test";
import { MovementController } from "../app/main/movement-controller.mjs";

test("focus style does not stroll along the bottom edge", () => {
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
  controller.phase = "observe";
  controller.phaseRemainingMs = 1;
  controller.tick(50);

  assert.notEqual(emittedStates.at(-1).phase, "stroll");
  assert.equal(emittedStates.at(-1).locomotion, "none");
  controller.stop();
});

test("focus interaction briefly borrows curious movement", () => {
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
  controller.phase = "observe";
  controller.phaseRemainingMs = 1;
  controller.tick(50);

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

test("taskbar mode runs along the display taskbar area until exited", () => {
  const emittedStates = [];
  const fakeWindow = createFakeWindow({ x: 100, y: 528 });
  const controller = new MovementController({
    mainWindow: fakeWindow,
    onStateChange: (state) => emittedStates.push(state),
    onPositionChanged: () => {},
    random: () => 0.5,
    screenApi: createTaskbarScreen()
  });

  controller.enterTaskbarMode();

  assert.equal(controller.isTaskbarMode(), true);
  assert.equal(fakeWindow.getBounds().y, 852);
  assert.equal(fakeWindow.getBounds().height, 48);
  assert.equal(fakeWindow.getBounds().width, 60);
  assert.equal(fakeWindow.isAlwaysOnTop(), true);
  assert.equal(fakeWindow.isSkipTaskbar(), true);
  assert.equal(fakeWindow.getMoveTopCount(), 2);
  assert.equal(emittedStates.at(-1).mode, "taskbar");
  assert.equal(emittedStates.at(-1).phase, "taskbar");

  controller.tick(1000);
  assert.equal(fakeWindow.getBounds().x, 100);

  controller.setAnimationState("running-right");
  controller.tick(1000);
  assert.equal(fakeWindow.getBounds().x, 138);
  assert.equal(fakeWindow.getBounds().y, 852);
  assert.equal(fakeWindow.getBounds().height, 48);
  assert.equal(fakeWindow.getBounds().width, 60);
  assert.ok(fakeWindow.getMoveTopCount() >= 4);

  controller.tick(120000);
  assert.equal(fakeWindow.getBounds().y, 852);
  assert.equal(fakeWindow.getBounds().height, 48);
  assert.equal(fakeWindow.getBounds().width, 60);
  assert.ok(fakeWindow.getBounds().x >= 24);
  assert.ok(fakeWindow.getBounds().x <= 1116);

  controller.exitTaskbarMode();
  assert.equal(controller.isTaskbarMode(), false);
  assert.equal(fakeWindow.getBounds().y, 528);
  assert.equal(fakeWindow.getBounds().height, 300);
  assert.equal(fakeWindow.getBounds().width, 280);
  assert.equal(fakeWindow.isAlwaysOnTop(), false);
  assert.equal(fakeWindow.isSkipTaskbar(), false);
  assert.equal(emittedStates.at(-1).mode, "desktop");
  controller.stop();
});

test("taskbar mode detects top taskbars", () => {
  const emittedStates = [];
  const fakeWindow = createFakeWindow({ x: 100, y: 528 });
  const controller = new MovementController({
    mainWindow: fakeWindow,
    onStateChange: (state) => emittedStates.push(state),
    onPositionChanged: () => {},
    random: () => 0.5,
    screenApi: createTaskbarScreen("top")
  });

  controller.enterTaskbarMode();

  assert.equal(fakeWindow.getBounds().x, 100);
  assert.equal(fakeWindow.getBounds().y, 0);
  assert.equal(fakeWindow.getBounds().height, 48);
  assert.equal(fakeWindow.getBounds().width, 60);
  assert.equal(emittedStates.at(-1).edge, "top");
  controller.stop();
});

test("taskbar mode detects side taskbars and moves vertically", () => {
  const emittedStates = [];
  const fakeWindow = createFakeWindow({ x: 100, y: 100 });
  const controller = new MovementController({
    mainWindow: fakeWindow,
    onStateChange: (state) => emittedStates.push(state),
    onPositionChanged: () => {},
    random: () => 0.5,
    screenApi: createTaskbarScreen("left")
  });

  controller.enterTaskbarMode();

  assert.equal(fakeWindow.getBounds().x, 0);
  assert.equal(fakeWindow.getBounds().y, 100);
  assert.equal(fakeWindow.getBounds().height, 60);
  assert.equal(fakeWindow.getBounds().width, 48);
  assert.equal(emittedStates.at(-1).edge, "left");
  assert.equal(emittedStates.at(-1).locomotion, "vertical");

  controller.setAnimationState("running");
  controller.tick(1000);
  assert.equal(fakeWindow.getBounds().x, 0);
  assert.equal(fakeWindow.getBounds().y, 62);
  assert.equal(fakeWindow.getBounds().height, 60);
  assert.equal(fakeWindow.getBounds().width, 48);
  controller.stop();
});

function createFakeWindow(initialBounds = {}) {
  let bounds = { x: 100, y: 576, width: 280, height: 300, ...initialBounds };
  let minimumSize = [126, 147];
  let alwaysOnTop = false;
  let skipTaskbar = false;
  let moveTopCount = 0;

  return {
    getBounds: () => ({ ...bounds }),
    setBounds: (nextBounds) => {
      bounds = { ...bounds, ...nextBounds };
    },
    setPosition: (x, y) => {
      bounds = { ...bounds, x, y };
    },
    getMinimumSize: () => [...minimumSize],
    setMinimumSize: (width, height) => {
      minimumSize = [width, height];
    },
    isAlwaysOnTop: () => alwaysOnTop,
    setAlwaysOnTop: (nextAlwaysOnTop) => {
      alwaysOnTop = nextAlwaysOnTop;
    },
    isSkipTaskbar: () => skipTaskbar,
    setSkipTaskbar: (nextSkipTaskbar) => {
      skipTaskbar = nextSkipTaskbar;
    },
    moveTop: () => {
      moveTopCount += 1;
    },
    getMoveTopCount: () => moveTopCount,
    isVisible: () => true
  };
}

function createTaskbarScreen(edge = "bottom") {
  const workAreas = {
    bottom: { x: 0, y: 0, width: 1200, height: 852 },
    top: { x: 0, y: 48, width: 1200, height: 852 },
    left: { x: 48, y: 0, width: 1152, height: 900 },
    right: { x: 0, y: 0, width: 1152, height: 900 }
  };

  return {
    getDisplayMatching: () => ({
      bounds: { x: 0, y: 0, width: 1200, height: 900 },
      workArea: workAreas[edge]
    })
  };
}
