import { loadPet } from "./pet/pet-loader.js";
import { AtlasPlayer } from "./pet/atlas-player.js";
import { PetBehavior } from "./pet/pet-behavior.js";
import { PetRenderer } from "./pet/pet-renderer.js";
import { DEFAULT_SCALE } from "../shared/scale-options.mjs";

const canvas = document.querySelector("#petCanvas");
const errorState = document.querySelector("#errorState");
const DRAG_THRESHOLD_PX = 8;

const renderer = new PetRenderer(canvas);
const player = new AtlasPlayer();
const behavior = new PetBehavior({
  onStateChange: (state) => {
    player.setState(state);
  }
});

let activePet = null;
let suppressClick = false;
let dragSession = null;

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
  await activatePet(startupPet);
}

function applyScale(scale) {
  renderer.setScale(Number(scale) || DEFAULT_SCALE);
}

canvas.addEventListener("click", () => {
  if (suppressClick) {
    suppressClick = false;
    return;
  }

  behavior.triggerInteraction();
});

canvas.addEventListener("pointerdown", (event) => {
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

window.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  window.desktopPet.showPetContextMenu();
});

window.desktopPet.onPetSelected((petRecord) => {
  void activatePet(petRecord);
});

window.desktopPet.onSetState((state) => {
  behavior.setManualState(state);
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

await loadStartupState();
requestAnimationFrame(tick);

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
