export const CELL_WIDTH = 192;
export const CELL_HEIGHT = 208;
export const ATLAS_COLUMNS = 8;
export const ATLAS_ROWS = 9;
export const ATLAS_WIDTH = CELL_WIDTH * ATLAS_COLUMNS;
export const ATLAS_HEIGHT = CELL_HEIGHT * ATLAS_ROWS;
export const COMPANION_IDLE_DURATIONS_MS = [3600, 480, 900, 420, 1320, 4200];
export const DIRECTIONAL_LOCOMOTION_DURATIONS_MS = [120, 120, 120, 120, 120, 120, 120, 220];
export const FEEDBACK_WAVING_DURATIONS_MS = [240, 220, 280, 980];
export const FEEDBACK_JUMPING_DURATIONS_MS = [220, 180, 220, 180, 880];
export const FEEDBACK_FAILED_DURATIONS_MS = [320, 240, 340, 260, 360, 280, 420, 1280];
export const FEEDBACK_RUNNING_DURATIONS_MS = [220, 180, 220, 180, 260, 820];
export const REVIEW_DURATIONS_MS = [980, 260, 340, 260, 520, 1320];

export const ATLAS_STATES = [
  { id: "idle", row: 0, durationsMs: [...COMPANION_IDLE_DURATIONS_MS] },
  { id: "running-right", row: 1, durationsMs: [...DIRECTIONAL_LOCOMOTION_DURATIONS_MS] },
  { id: "running-left", row: 2, durationsMs: [...DIRECTIONAL_LOCOMOTION_DURATIONS_MS] },
  { id: "waving", row: 3, durationsMs: [...FEEDBACK_WAVING_DURATIONS_MS] },
  { id: "jumping", row: 4, durationsMs: [...FEEDBACK_JUMPING_DURATIONS_MS] },
  { id: "failed", row: 5, durationsMs: [...FEEDBACK_FAILED_DURATIONS_MS] },
  { id: "waiting", row: 6, durationsMs: [...COMPANION_IDLE_DURATIONS_MS] },
  { id: "running", row: 7, durationsMs: [...FEEDBACK_RUNNING_DURATIONS_MS] },
  { id: "review", row: 8, durationsMs: [...REVIEW_DURATIONS_MS] }
];

export function getStateSpec(stateId) {
  return ATLAS_STATES.find((state) => state.id === stateId) ?? ATLAS_STATES[0];
}

export function getStateCycleDurationMs(stateId) {
  return getStateSpec(stateId).durationsMs.reduce((total, duration) => total + duration, 0);
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
