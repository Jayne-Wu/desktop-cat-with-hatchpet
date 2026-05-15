import { getStateSpec } from "./codex-pet-spec.js";

export class AtlasPlayer {
  constructor() {
    this.pet = null;
    this.currentState = "idle";
    this.frameIndex = 0;
    this.frameElapsedMs = 0;
  }

  attachPet(pet) {
    this.pet = pet;
    this.setState("idle");
  }

  setState(stateId) {
    if (!this.pet) {
      this.currentState = stateId;
      return;
    }

    this.currentState = this.pet.states[stateId] ? stateId : "idle";
    this.frameIndex = 0;
    this.frameElapsedMs = 0;
  }

  update(deltaMs) {
    if (!this.pet) {
      return null;
    }

    const state = getStateSpec(this.currentState);
    const durations = state.durationsMs;
    this.frameElapsedMs += deltaMs;

    while (this.frameElapsedMs >= durations[this.frameIndex]) {
      this.frameElapsedMs -= durations[this.frameIndex];
      this.frameIndex = (this.frameIndex + 1) % durations.length;
    }

    return {
      stateId: state.id,
      row: state.row,
      frameIndex: this.frameIndex,
      frameCount: durations.length,
      sourceX: this.frameIndex * this.pet.atlas.cellWidth,
      sourceY: state.row * this.pet.atlas.cellHeight,
      sourceWidth: this.pet.atlas.cellWidth,
      sourceHeight: this.pet.atlas.cellHeight
    };
  }
}
