export const DEFAULT_SCALE = 0.92;
export const MIN_SCALE = 0.45;
export const MAX_SCALE = 1.8;
export const BASE_WINDOW_WIDTH = 280;
export const BASE_WINDOW_HEIGHT = 300;

export function normalizeScale(scale) {
  const value = Number(scale);

  if (!Number.isFinite(value)) {
    return DEFAULT_SCALE;
  }

  return Math.round(clamp(value, MIN_SCALE, MAX_SCALE) * 100) / 100;
}

export function scaleToWindowSize(scale) {
  const normalizedScale = normalizeScale(scale);
  const ratio = normalizedScale / DEFAULT_SCALE;

  return {
    width: Math.round(BASE_WINDOW_WIDTH * ratio),
    height: Math.round(BASE_WINDOW_HEIGHT * ratio)
  };
}

export function windowSizeToScale(width, height) {
  const widthScale = (Number(width) / BASE_WINDOW_WIDTH) * DEFAULT_SCALE;
  const heightScale = (Number(height) / BASE_WINDOW_HEIGHT) * DEFAULT_SCALE;
  return normalizeScale(Math.max(widthScale, heightScale));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
