export const MOVEMENT_MODES = [
  { id: "still" },
  { id: "bottom-walk" },
  { id: "dock-left" },
  { id: "dock-right" }
];

export const DEFAULT_MOVEMENT_MODE = "still";
export const DEFAULT_CLICK_THROUGH = false;

export function normalizeMovementMode(mode) {
  return MOVEMENT_MODES.some((option) => option.id === mode) ? mode : DEFAULT_MOVEMENT_MODE;
}

export function normalizeClickThrough(value) {
  return value === true;
}
