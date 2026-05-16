export const SCALE_OPTIONS = [
  { label: "Small", value: 0.72 },
  { label: "Medium", value: 0.92 },
  { label: "Large", value: 1.12 }
];

export const DEFAULT_SCALE = 0.92;

export function normalizeScale(scale) {
  const value = Number(scale);

  if (!Number.isFinite(value)) {
    return DEFAULT_SCALE;
  }

  return SCALE_OPTIONS.reduce((closest, option) => {
    return Math.abs(option.value - value) < Math.abs(closest.value - value) ? option : closest;
  }, SCALE_OPTIONS[0]).value;
}
