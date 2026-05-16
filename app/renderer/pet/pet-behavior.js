import { getStateCycleDurationMs } from "./codex-pet-spec.js";

const IDLE_STATE = "idle";
const INTERACTION_SEQUENCE = ["waving", "jumping", "review"];
const DEFAULT_TIMING = {
  clickCooldownMs: 360,
  clickComboWindowMs: 2400,
  calmAfterMs: 45000,
  sleepAfterMs: 120000,
  ambientDelayMsByMood: {
    calm: [11000, 19000],
    curious: [9000, 15000],
    playful: [7000, 12000],
    sleepy: [24000, 38000]
  }
};

const INTERACTION_LOOPS = {
  waving: 2,
  jumping: 1,
  review: 2
};

const AMBIENT_LOOPS = {
  waving: 1,
  waiting: 2,
  review: 2,
  running: 2
};

const AMBIENT_WEIGHTS_BY_MOOD = {
  calm: [
    ["waiting", 35],
    ["review", 35],
    ["waving", 20],
    ["running", 10]
  ],
  curious: [
    ["review", 45],
    ["waiting", 25],
    ["waving", 20],
    ["running", 10]
  ],
  playful: [
    ["waving", 45],
    ["running", 20],
    ["review", 20],
    ["waiting", 15]
  ],
  sleepy: [
    ["waiting", 50],
    ["review", 35],
    ["waving", 15]
  ]
};

export class PetBehavior {
  constructor({ onStateChange, random = Math.random, timings = {} }) {
    this.onStateChange = onStateChange;
    this.random = random;
    this.timing = mergeTiming(timings);
    this.pet = null;
    this.currentState = IDLE_STATE;
    this.mood = "calm";
    this.ambientTimerMs = this.randomAmbientDelay();
    this.clickCooldownMs = 0;
    this.clickComboTimerMs = 0;
    this.clickComboCount = 0;
    this.timeSinceInteractionMs = 0;
    this.activeAction = null;
    this.lastAmbientState = null;
    this.manualOverride = false;
  }

  attachPet(pet) {
    this.pet = pet;
    this.mood = "calm";
    this.activeAction = null;
    this.manualOverride = false;
    this.clickCooldownMs = 0;
    this.clickComboTimerMs = 0;
    this.clickComboCount = 0;
    this.timeSinceInteractionMs = 0;
    this.lastAmbientState = null;
    this.ambientTimerMs = this.randomAmbientDelay();
    this.setState(IDLE_STATE);
  }

  setManualState(stateId) {
    this.activeAction = null;
    this.manualOverride = true;
    this.setState(this.hasState(stateId) ? stateId : IDLE_STATE);
  }

  triggerInteraction() {
    if (!this.pet || this.clickCooldownMs > 0) {
      return;
    }

    this.manualOverride = false;
    this.timeSinceInteractionMs = 0;
    this.mood = this.clickComboTimerMs > 0 ? "playful" : "curious";
    this.clickComboCount = this.clickComboTimerMs > 0 ? this.clickComboCount + 1 : 1;
    this.clickComboTimerMs = this.timing.clickComboWindowMs;
    this.clickCooldownMs = this.timing.clickCooldownMs;

    const stateId = INTERACTION_SEQUENCE[Math.min(this.clickComboCount - 1, INTERACTION_SEQUENCE.length - 1)];
    this.startTimedAction(stateId, "interaction");
  }

  update(deltaMs) {
    if (!this.pet) {
      return;
    }

    this.tickSharedTimers(deltaMs);

    if (this.manualOverride) {
      return;
    }

    if (this.activeAction) {
      this.activeAction.remainingMs -= deltaMs;
      if (this.activeAction.remainingMs > 0) {
        return;
      }

      this.activeAction = null;
      this.setState(IDLE_STATE);
      return;
    }

    this.updateMood();
    this.ambientTimerMs -= deltaMs;

    if (this.ambientTimerMs <= 0) {
      const stateId = this.selectAmbientState();
      this.lastAmbientState = stateId;
      this.ambientTimerMs = this.randomAmbientDelay();
      this.startTimedAction(stateId, "ambient");
    }
  }

  getSnapshot() {
    return {
      state: this.currentState,
      mood: this.mood,
      manualOverride: this.manualOverride,
      activeAction: this.activeAction ? { ...this.activeAction } : null,
      ambientTimerMs: this.ambientTimerMs
    };
  }

  startTimedAction(stateId, source) {
    if (!this.hasState(stateId)) {
      this.setState(IDLE_STATE);
      return;
    }

    this.activeAction = {
      source,
      stateId,
      remainingMs: this.actionDurationMs(stateId, source)
    };
    this.setState(stateId);
  }

  setState(stateId) {
    this.currentState = stateId;
    this.onStateChange(stateId);
  }

  tickSharedTimers(deltaMs) {
    this.timeSinceInteractionMs += deltaMs;
    this.clickCooldownMs = Math.max(0, this.clickCooldownMs - deltaMs);
    this.clickComboTimerMs = Math.max(0, this.clickComboTimerMs - deltaMs);

    if (this.clickComboTimerMs === 0) {
      this.clickComboCount = 0;
    }
  }

  updateMood() {
    if (this.timeSinceInteractionMs >= this.timing.sleepAfterMs) {
      this.mood = "sleepy";
      return;
    }

    if (this.timeSinceInteractionMs >= this.timing.calmAfterMs && this.mood !== "calm") {
      this.mood = "calm";
    }
  }

  selectAmbientState() {
    const weightedStates = AMBIENT_WEIGHTS_BY_MOOD[this.mood] ?? AMBIENT_WEIGHTS_BY_MOOD.calm;
    const pickedState = pickWeighted(weightedStates, this.random);

    if (pickedState !== this.lastAmbientState || weightedStates.length < 2) {
      return pickedState;
    }

    const fallback = weightedStates.find(([stateId]) => stateId !== pickedState);
    return fallback?.[0] ?? pickedState;
  }

  actionDurationMs(stateId, source) {
    const loops = source === "interaction" ? INTERACTION_LOOPS[stateId] : AMBIENT_LOOPS[stateId];
    return getStateCycleDurationMs(stateId) * (loops ?? 1);
  }

  randomAmbientDelay() {
    const [min, max] =
      this.timing.ambientDelayMsByMood[this.mood] ?? this.timing.ambientDelayMsByMood.calm;
    return min + this.random() * (max - min);
  }

  hasState(stateId) {
    return Boolean(this.pet?.states?.[stateId]);
  }
}

function mergeTiming(timings) {
  return {
    ...DEFAULT_TIMING,
    ...timings,
    ambientDelayMsByMood: {
      ...DEFAULT_TIMING.ambientDelayMsByMood,
      ...timings.ambientDelayMsByMood
    }
  };
}

function pickWeighted(weightedStates, random) {
  const total = weightedStates.reduce((sum, [, weight]) => sum + weight, 0);
  let cursor = random() * total;

  for (const [stateId, weight] of weightedStates) {
    cursor -= weight;
    if (cursor <= 0) {
      return stateId;
    }
  }

  return weightedStates[weightedStates.length - 1][0];
}
