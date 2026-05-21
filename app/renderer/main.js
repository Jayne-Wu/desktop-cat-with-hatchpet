import { loadPet } from "./pet/pet-loader.js";
import { AtlasPlayer } from "./pet/atlas-player.js";
import { PetBehavior } from "./pet/pet-behavior.js";
import { PetRenderer } from "./pet/pet-renderer.js";
import { DEFAULT_SCALE } from "../shared/scale-options.mjs";
import { CELL_HEIGHT } from "./pet/codex-pet-spec.js";

const canvas = document.querySelector("#petCanvas");
const resizeGrip = document.querySelector("#resizeGrip");
const errorState = document.querySelector("#errorState");
const DRAG_THRESHOLD_PX = 8;
const TASKBAR_DOUBLE_CLICK_MS = 520;
const TASKBAR_DOUBLE_CLICK_DISTANCE_PX = 12;

const renderer = new PetRenderer(canvas);
const player = new AtlasPlayer();
const behavior = new PetBehavior({
  onStateChange: (state) => {
    player.setState(state);
    void window.desktopPet.reportAnimationState(state);
  }
});

let activePet = null;
let suppressClick = false;
let dragSession = null;
let resizeSession = null;
let runtimeMode = "desktop";
let desktopScale = DEFAULT_SCALE;
let taskbarClickCandidate = null;

async function activatePet(petRecord) {
  try {
    console.log(`Loading pet ${petRecord.id}...`);
    const nextPet = await loadPet(petRecord);
    activePet = nextPet;
    player.attachPet(activePet);
    behavior.attachPet(activePet);
    errorState.classList.add("hidden");
    console.log(`Loaded pet ${activePet.manifest.id}`);
  } catch (error) {
    console.error(error.stack ?? error.message);

    if (!activePet) {
      player.attachPet(null);
      behavior.attachPet(null);
    }

    errorState.textContent = error.message;
    errorState.classList.remove("hidden");
  }
}

async function loadStartupState() {
  const settings = await window.desktopPet.readSettings();
  const startupPet = await window.desktopPet.getStartupPet();

  applyScale(settings.scale);
  behavior.setMovementState({
    companionStyle: settings.companionStyle
  });
  await activatePet(startupPet);
}

function applyScale(scale) {
  desktopScale = Number(scale) || DEFAULT_SCALE;
  applyRendererScale();
}

function resizeCanvasToWindow() {
  canvas.width = Math.max(1, Math.round(window.innerWidth));
  canvas.height = Math.max(1, Math.round(window.innerHeight));
  applyRendererScale();
  renderer.clear();
}

canvas.addEventListener("click", (event) => {
  if (runtimeMode === "taskbar" && event.detail >= 2) {
    exitTaskbarModeFromRenderer();
    return;
  }

  if (runtimeMode === "taskbar") {
    return;
  }

  if (suppressClick) {
    suppressClick = false;
    return;
  }

  void window.desktopPet.notifyInteraction();
  behavior.triggerInteraction();
});

canvas.addEventListener("dblclick", () => {
  exitTaskbarModeFromRenderer();
});

window.addEventListener("dblclick", () => {
  exitTaskbarModeFromRenderer();
});

canvas.addEventListener("pointerdown", (event) => {
  if (runtimeMode === "taskbar") {
    handleTaskbarPointerDown(event);
    return;
  }

  if (event.button !== 0) {
    return;
  }

  dragSession = {
    pointerId: event.pointerId,
    startScreenX: event.screenX,
    startScreenY: event.screenY,
    active: false
  };

  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", async (event) => {
  if (!dragSession || event.pointerId !== dragSession.pointerId) {
    return;
  }

  const deltaX = event.screenX - dragSession.startScreenX;
  const deltaY = event.screenY - dragSession.startScreenY;

  if (!dragSession.active && Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD_PX) {
    dragSession.active = true;
    suppressClick = true;
    await window.desktopPet.beginWindowDrag({
      screenX: dragSession.startScreenX,
      screenY: dragSession.startScreenY
    });
  }

  if (dragSession.active) {
    void window.desktopPet.updateWindowDrag({
      screenX: event.screenX,
      screenY: event.screenY
    });
  }
});

canvas.addEventListener("pointerup", (event) => {
  void finishDrag(event);
});

canvas.addEventListener("pointercancel", (event) => {
  void finishDrag(event);
});

resizeGrip.addEventListener("pointerdown", async (event) => {
  if (runtimeMode === "taskbar") {
    return;
  }

  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  suppressClick = true;
  resizeSession = {
    pointerId: event.pointerId
  };

  resizeGrip.setPointerCapture(event.pointerId);
  await window.desktopPet.beginWindowResize({
    screenX: event.screenX,
    screenY: event.screenY
  });
});

resizeGrip.addEventListener("pointermove", (event) => {
  if (!resizeSession || event.pointerId !== resizeSession.pointerId) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  void window.desktopPet.updateWindowResize({
    screenX: event.screenX,
    screenY: event.screenY
  });
});

resizeGrip.addEventListener("pointerup", (event) => {
  void finishResize(event);
});

resizeGrip.addEventListener("pointercancel", (event) => {
  void finishResize(event);
});

window.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  if (runtimeMode === "taskbar") {
    return;
  }

  window.desktopPet.showPetContextMenu();
});

window.addEventListener("resize", resizeCanvasToWindow);

window.desktopPet.onPetSelected((petRecord) => {
  void activatePet(petRecord);
});

window.desktopPet.onMovementState((state) => {
  setRuntimeMode(state?.mode === "taskbar" ? "taskbar" : "desktop");
  behavior.setMovementState(state);
});

window.desktopPet.onScaleChanged((scale) => {
  applyScale(scale);
});

let previousTime = performance.now();

function tick(now) {
  const deltaMs = now - previousTime;
  previousTime = now;

  behavior.update(deltaMs);
  const frame = player.update(deltaMs);

  if (activePet && frame) {
    renderer.draw(activePet, frame);
  } else {
    renderer.clear();
  }

  requestAnimationFrame(tick);
}

resizeCanvasToWindow();
await loadStartupState();
requestAnimationFrame(tick);

function setRuntimeMode(mode) {
  runtimeMode = mode;
  document.body.classList.toggle("taskbar-mode", runtimeMode === "taskbar");
  applyRendererScale();
}

function applyRendererScale() {
  if (runtimeMode === "taskbar") {
    renderer.setScale(Math.max(0.01, canvas.height / CELL_HEIGHT));
    return;
  }

  renderer.setScale(desktopScale);
}

function exitTaskbarModeFromRenderer() {
  if (runtimeMode !== "taskbar") {
    return;
  }

  void window.desktopPet.exitTaskbarMode();
}

function handleTaskbarPointerDown(event) {
  if (event.button !== 0) {
    return;
  }

  const now = performance.now();
  const previous = taskbarClickCandidate;
  taskbarClickCandidate = {
    time: now,
    screenX: event.screenX,
    screenY: event.screenY
  };

  if (!previous) {
    return;
  }

  const elapsedMs = now - previous.time;
  const distance = Math.hypot(event.screenX - previous.screenX, event.screenY - previous.screenY);

  if (elapsedMs <= TASKBAR_DOUBLE_CLICK_MS && distance <= TASKBAR_DOUBLE_CLICK_DISTANCE_PX) {
    taskbarClickCandidate = null;
    exitTaskbarModeFromRenderer();
  }
}

async function finishDrag(event) {
  if (!dragSession || event.pointerId !== dragSession.pointerId) {
    return;
  }

  const shouldPersist = dragSession.active;

  try {
    canvas.releasePointerCapture(event.pointerId);
  } catch {
    // Ignore capture release errors if the pointer is already gone.
  }

  dragSession = null;

  if (shouldPersist) {
    await window.desktopPet.endWindowDrag();
    setTimeout(() => {
      suppressClick = false;
    }, 0);
  }
}

async function finishResize(event) {
  if (!resizeSession || event.pointerId !== resizeSession.pointerId) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  try {
    resizeGrip.releasePointerCapture(event.pointerId);
  } catch {
    // Ignore capture release errors if the pointer is already gone.
  }

  resizeSession = null;
  await window.desktopPet.endWindowResize();
  setTimeout(() => {
    suppressClick = false;
  }, 0);
}
