import { loadPet } from "./pet/pet-loader.js";
import { AtlasPlayer } from "./pet/atlas-player.js";
import { PetBehavior } from "./pet/pet-behavior.js";
import { PetRenderer } from "./pet/pet-renderer.js";

const canvas = document.querySelector("#petCanvas");
const errorState = document.querySelector("#errorState");

const renderer = new PetRenderer(canvas);
const player = new AtlasPlayer();
const behavior = new PetBehavior({
  onStateChange: (state) => {
    player.setState(state);
  }
});

let activePet = null;

async function loadDefaultPet() {
  try {
    console.log("Loading default pet...");
    const settings = await window.desktopPet.readSettings();
    const defaultPet = await window.desktopPet.getDefaultPet();

    renderer.setScale(Number(settings.scale) || 1.25);
    activePet = await loadPet(defaultPet);
    player.attachPet(activePet);
    behavior.attachPet(activePet);
    errorState.classList.add("hidden");
    console.log(`Loaded pet ${activePet.manifest.id}`);
  } catch (error) {
    console.error(error.stack ?? error.message);
    activePet = null;
    player.attachPet(null);
    behavior.attachPet(null);
    errorState.textContent = error.message;
    errorState.classList.remove("hidden");
  }
}

canvas.addEventListener("click", () => {
  behavior.triggerInteraction();
});

window.addEventListener("contextmenu", (event) => {
  event.preventDefault();
  window.desktopPet.showPetContextMenu();
});

window.desktopPet.onSetState((state) => {
  behavior.setManualState(state);
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

await loadDefaultPet();
requestAnimationFrame(tick);
