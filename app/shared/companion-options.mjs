export const COMPANION_STYLES = [
  { id: "quiet" },
  { id: "curious" },
  { id: "playful" },
  { id: "focus" }
];

export const DEFAULT_COMPANION_STYLE = "curious";
export const DEFAULT_CLICK_THROUGH = false;

export const COMPANION_STYLE_PROFILES = {
  quiet: {
    speedPxPerSecond: 58,
    strollRangeMs: [3600, 6200],
    observeRangeMs: [11000, 17000],
    settleRangeMs: [9000, 14000],
    rehomeDelayRangeMs: [4200, 6500],
    sideTripChance: 0.12,
    observeToStrollChance: 0.52,
    settleToStrollChance: 0.3,
    interactionBurstMs: 4200,
    interactionCooldownMs: 520,
    interactionMoveBoostMs: 0,
    interactionBoostProfileId: null
  },
  curious: {
    speedPxPerSecond: 72,
    strollRangeMs: [5600, 9200],
    observeRangeMs: [7000, 12000],
    settleRangeMs: [5000, 8500],
    rehomeDelayRangeMs: [3200, 5200],
    sideTripChance: 0.28,
    observeToStrollChance: 0.76,
    settleToStrollChance: 0.74,
    interactionBurstMs: 5600,
    interactionCooldownMs: 420,
    interactionMoveBoostMs: 0,
    interactionBoostProfileId: null
  },
  playful: {
    speedPxPerSecond: 86,
    strollRangeMs: [7600, 11800],
    observeRangeMs: [3600, 7200],
    settleRangeMs: [2800, 5600],
    rehomeDelayRangeMs: [2200, 4200],
    sideTripChance: 0.38,
    observeToStrollChance: 0.88,
    settleToStrollChance: 0.86,
    interactionBurstMs: 7200,
    interactionCooldownMs: 320,
    interactionMoveBoostMs: 0,
    interactionBoostProfileId: null
  },
  focus: {
    speedPxPerSecond: 44,
    strollRangeMs: [1400, 2400],
    observeRangeMs: [18000, 30000],
    settleRangeMs: [16000, 26000],
    rehomeDelayRangeMs: [5200, 7600],
    sideTripChance: 0.04,
    observeToStrollChance: 0,
    settleToStrollChance: 0,
    interactionBurstMs: 3200,
    interactionCooldownMs: 620,
    interactionMoveBoostMs: 6500,
    interactionBoostProfileId: "curious"
  }
};

export function normalizeCompanionStyle(style) {
  return COMPANION_STYLES.some((option) => option.id === style) ? style : DEFAULT_COMPANION_STYLE;
}

export function normalizeClickThrough(value) {
  return value === true;
}
