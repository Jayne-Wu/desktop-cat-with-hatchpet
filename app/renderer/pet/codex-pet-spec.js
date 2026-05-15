export const CELL_WIDTH = 192;
export const CELL_HEIGHT = 208;
export const ATLAS_COLUMNS = 8;
export const ATLAS_ROWS = 9;
export const ATLAS_WIDTH = CELL_WIDTH * ATLAS_COLUMNS;
export const ATLAS_HEIGHT = CELL_HEIGHT * ATLAS_ROWS;

export const ATLAS_STATES = [
  { id: "idle", row: 0, durationsMs: [280, 110, 110, 140, 140, 320] },
  { id: "running-right", row: 1, durationsMs: [120, 120, 120, 120, 120, 120, 120, 220] },
  { id: "running-left", row: 2, durationsMs: [120, 120, 120, 120, 120, 120, 120, 220] },
  { id: "waving", row: 3, durationsMs: [140, 140, 140, 280] },
  { id: "jumping", row: 4, durationsMs: [140, 140, 140, 140, 280] },
  { id: "failed", row: 5, durationsMs: [140, 140, 140, 140, 140, 140, 140, 240] },
  { id: "waiting", row: 6, durationsMs: [150, 150, 150, 150, 150, 260] },
  { id: "running", row: 7, durationsMs: [120, 120, 120, 120, 120, 220] },
  { id: "review", row: 8, durationsMs: [150, 150, 150, 150, 150, 280] }
];

export function getStateSpec(stateId) {
  return ATLAS_STATES.find((state) => state.id === stateId) ?? ATLAS_STATES[0];
}

export function validateCodexPetSpec(statesById) {
  for (const state of ATLAS_STATES) {
    const actual = statesById[state.id];

    if (!actual) {
      throw new Error(`Missing animation state: ${state.id}`);
    }

    if (actual.row < 0 || actual.row >= ATLAS_ROWS) {
      throw new Error(`Animation state has invalid row: ${state.id}`);
    }

    if (!Array.isArray(actual.durationsMs) || actual.durationsMs.length === 0) {
      throw new Error(`Animation state has no frame durations: ${state.id}`);
    }

    if (actual.durationsMs.length > ATLAS_COLUMNS) {
      throw new Error(`Animation state uses too many frames: ${state.id}`);
    }
  }
}
