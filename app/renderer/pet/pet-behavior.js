const INTERACTION_QUEUE = ["waving", "jumping", "review"];
const AMBIENT_QUEUE = ["review", "running", "waiting", "idle"];

export class PetBehavior {
  constructor({ onStateChange }) {
    this.onStateChange = onStateChange;
    this.pet = null;
    this.currentState = "idle";
    this.stateLockMs = 0;
    this.ambientTimerMs = this.randomAmbientDelay();
    this.interactionIndex = 0;
    this.manualOverride = false;
  }

  attachPet(pet) {
    this.pet = pet;
    this.forceState("idle");
  }

  forceState(stateId, options = {}) {
    this.currentState = stateId;
    this.stateLockMs = this.lockDurationFor(stateId);
    this.manualOverride = options.manual === true;
    this.onStateChange(stateId);
  }

  setManualState(stateId) {
    this.forceState(stateId, { manual: true });
  }

  triggerInteraction() {
    const nextState = INTERACTION_QUEUE[this.interactionIndex % INTERACTION_QUEUE.length];
    this.interactionIndex += 1;
    this.manualOverride = false;
    this.forceState(nextState);
  }

  update(deltaMs) {
    if (!this.pet) {
      return;
    }

    if (this.manualOverride) {
      return;
    }

    if (this.stateLockMs > 0) {
      this.stateLockMs = Math.max(0, this.stateLockMs - deltaMs);
      if (this.stateLockMs > 0) {
        return;
      }
    }

    this.ambientTimerMs -= deltaMs;

    if (this.currentState !== "idle" && this.ambientTimerMs > 0) {
      this.forceState("idle");
      return;
    }

    if (this.ambientTimerMs <= 0) {
      const nextState = AMBIENT_QUEUE[Math.floor(Math.random() * AMBIENT_QUEUE.length)];
      this.ambientTimerMs = this.randomAmbientDelay();
      this.forceState(nextState);
    }
  }

  lockDurationFor(stateId) {
    switch (stateId) {
      case "waving":
      case "jumping":
        return 1400;
      case "review":
      case "running":
      case "waiting":
        return 2200;
      default:
        return 0;
    }
  }

  randomAmbientDelay() {
    return 3200 + Math.random() * 3200;
  }
}
