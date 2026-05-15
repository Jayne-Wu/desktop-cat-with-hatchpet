import {
  ATLAS_COLUMNS,
  ATLAS_HEIGHT,
  ATLAS_ROWS,
  ATLAS_STATES,
  ATLAS_WIDTH,
  CELL_HEIGHT,
  CELL_WIDTH,
  validateCodexPetSpec
} from "./codex-pet-spec.js";

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export async function loadPet(petRecord) {
  const imageSrc = await window.desktopPet.getSpritesheetDataUrl(petRecord.id);
  const image = await loadImage(imageSrc);
  const states = Object.fromEntries(ATLAS_STATES.map((state) => [state.id, state]));

  if (image.naturalWidth !== ATLAS_WIDTH || image.naturalHeight !== ATLAS_HEIGHT) {
    throw new Error(
      `Expected ${ATLAS_WIDTH}x${ATLAS_HEIGHT} atlas, got ${image.naturalWidth}x${image.naturalHeight}`
    );
  }

  validateCodexPetSpec(states);

  return {
    manifest: {
      id: petRecord.id,
      displayName: petRecord.displayName,
      description: petRecord.description,
      spritesheetPath: petRecord.spritesheetPath
    },
    image,
    atlas: {
      width: ATLAS_WIDTH,
      height: ATLAS_HEIGHT,
      columns: ATLAS_COLUMNS,
      rows: ATLAS_ROWS,
      cellWidth: CELL_WIDTH,
      cellHeight: CELL_HEIGHT
    },
    states
  };
}
