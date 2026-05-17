import {
  COMPANION_STYLE_PROFILES,
  DEFAULT_COMPANION_STYLE,
  normalizeCompanionStyle
} from "../../shared/companion-options.mjs";
import { getStateCycleDurationMs } from "./codex-pet-spec.js";

const IDLE_STATE = "idle";
const STILL_STATE = "still";
const DEFAULT_MOVEMENT_STATE = {
  companionStyle: DEFAULT_COMPANION_STYLE,
  phase: "observe",
  locomotion: "none",
  edge: "bottom"
};

const DEFAULT_TIMING = {
  calmAfterMs: 45000,
  sleepAfterMs: 120000
};

const INTERACTION_LOOPS = {
  waving: 2,
  jumping: 1,
  review: 2
};

export class PetBehavior {
  constructor({ onStateChange, random = Math.random, timings = {} }) {
    this.onStateChange = onStateChange;
    this.random = random;
    this.timing = {
      ...DEFAULT_TIMING,
      ...timings
    };
    this.pet = null;
    this.currentState = IDLE_STATE;
    this.movementState = { ...DEFAULT_MOVEMENT_STATE };
    this.profile = COMPANION_STYLE_PROFILES[DEFAULT_COMPANION_STYLE];
    this.mood = "calm";
    this.clickCooldownMs = 0;
    this.playfulBurstMs = 0;
    this.timeSinceInteractionMs = 0;
    this.activeAction = null;
  }

  attachPet(pet) {
    this.pet = pet;
    this.currentState = IDLE_STATE;
    this.mood = "calm";
    this.clickCooldownMs = 0;
    this.playfulBurstMs = 0;
    this.timeSinceInteractionMs = 0;
    this.activeAction = null;
    this.setState(this.resolveAutomaticState());
  }

  setMovementState(state = {}) {
    const companionStyle = normalizeCompanionStyle(state?.companionStyle);

    this.movementState = {
      companionStyle,
      phase: state?.phase ?? DEFAULT_MOVEMENT_STATE.phase,
      locomotion: state?.locomotion ?? DEFAULT_MOVEMENT_STATE.locomotion,
      edge: state?.edge ?? DEFAULT_MOVEMENT_STATE.edge
    };
    this.profile = COMPANION_STYLE_PROFILES[companionStyle];

    if (!this.activeAction) {
      this.setState(this.resolveAutomaticState());
    }
  }

  triggerInteraction() {
    if (!this.pet || this.clickCooldownMs > 0) {
      return;
    }

    this.timeSinceInteractionMs = 0;
    this.playfulBurstMs = Math.max(this.playfulBurstMs, this.profile.interactionBurstMs);
    this.clickCooldownMs = this.profile.interactionCooldownMs;
    this.mood = "playful";
    this.startTimedAction(this.selectInteractionState());
  }

  update(deltaMs) {
    if (!this.pet) {
      return;
    }

    this.tickSharedTimers(deltaMs);
    this.updateMood();

    if (this.activeAction) {
      this.activeAction.remainingMs -= deltaMs;
      if (this.activeAction.remainingMs > 0) {
        return;
      }

      this.activeAction = null;
    }

    this.setState(this.resolveAutomaticState());
  }

  getSnapshot() {
    return {
      state: this.currentState,
      mood: this.mood,
      companionStyle: this.movementState.companionStyle,
      movementState: { ...this.movementState },
      activeAction: this.activeAction ? { ...this.activeAction } : null,
      playfulBurstMs: this.playfulBurstMs
    };
  }

  startTimedAction(stateId) {
    if (!this.hasState(stateId)) {
      this.setState(this.resolveAutomaticState());
      return;
    }

    this.activeAction = {
      stateId,
      remainingMs: getStateCycleDurationMs(stateId) * (INTERACTION_LOOPS[stateId] ?? 1)
    };
    this.setState(stateId);
  }

  resolveAutomaticState() {
    if (this.activeAction) {
      return this.activeAction.stateId;
    }

    if (this.movementState.locomotion === "left") {
      return this.hasState("running-left") ? "running-left" : IDLE_STATE;
    }

    if (this.movementState.locomotion === "right") {
      return this.hasState("running-right") ? "running-right" : IDLE_STATE;
    }

    if (this.movementState.locomotion === "vertical") {
      return this.hasState("running") ? "running" : IDLE_STATE;
    }

    if (this.movementState.phase === "settle") {
      return this.resolveSettleState();
    }

    if (this.movementState.phase === "rehome") {
      return this.hasState("running") ? "running" : IDLE_STATE;
    }

    if (this.movementState.phase === "observe") {
      return this.resolveObserveState();
    }

    return this.resolveObserveState();
  }

  resolveObserveState() {
    if (this.mood === "sleepy") {
      return this.hasState("waiting") ? "waiting" : IDLE_STATE;
    }

    if (this.playfulBurstMs > 0 && this.hasState("review")) {
      return "review";
    }

    if (this.movementState.companionStyle === "focus") {
      return STILL_STATE;
    }

    if (this.movementState.companionStyle === "quiet") {
      return this.hasState("idle") ? "idle" : IDLE_STATE;
    }

    if (this.movementState.companionStyle === "playful" && this.hasState("running")) {
      return "running";
    }

    if (this.hasState("review")) {
      return "review";
    }

    return IDLE_STATE;
  }

  resolveSettleState() {
    if (this.mood === "sleepy" && this.hasState("waiting")) {
      return "waiting";
    }

    if (this.movementState.companionStyle === "focus") {
      return STILL_STATE;
    }

    if (this.movementState.companionStyle === "quiet" && this.hasState("waiting")) {
      return "waiting";
    }

    return this.hasState("idle") ? "idle" : IDLE_STATE;
  }

  selectInteractionState() {
    const style = this.movementState.companionStyle;
    const weightedStates =
      style === "quiet"
        ? [
            ["waving", 50],
            ["review", 35],
            ["jumping", 15]
          ]
        : style === "focus"
          ? [
              ["review", 50],
              ["waving", 35],
              ["jumping", 15]
            ]
          : style === "playful"
            ? [
                ["jumping", 45],
                ["waving", 35],
                ["review", 20]
              ]
            : [
                ["waving", 40],
                ["jumping", 25],
                ["review", 35]
              ];

    return pickWeighted(weightedStates, this.random);
  }

  setState(stateId) {
    if (this.currentState === stateId) {
      return;
    }

    this.currentState = stateId;
    this.onStateChange(stateId);
  }

  tickSharedTimers(deltaMs) {
    this.timeSinceInteractionMs += deltaMs;
    this.clickCooldownMs = Math.max(0, this.clickCooldownMs - deltaMs);
    this.playfulBurstMs = Math.max(0, this.playfulBurstMs - deltaMs);
  }

  updateMood() {
    if (this.timeSinceInteractionMs >= this.timing.sleepAfterMs) {
      this.mood = "sleepy";
      return;
    }

    if (this.playfulBurstMs > 0) {
      this.mood = "playful";
      return;
    }

    if (this.timeSinceInteractionMs < 12000) {
      this.mood = "curious";
      return;
    }

    if (this.timeSinceInteractionMs >= this.timing.calmAfterMs) {
      this.mood = "calm";
    }
  }

  hasState(stateId) {
    return Boolean(this.pet?.states?.[stateId]);
  }
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
