import assert from "node:assert/strict";
import { test } from "node:test";
import { COMPANION_STYLE_PROFILES } from "../app/shared/companion-options.mjs";
import { ATLAS_STATES, getStateCycleDurationMs } from "../app/renderer/pet/codex-pet-spec.js";
import { PetBehavior } from "../app/renderer/pet/pet-behavior.js";

const fakePet = {
  states: Object.fromEntries(ATLAS_STATES.map((state) => [state.id, state]))
};

test("interaction burst returns to companion-driven state after a finite duration", () => {
  const states = [];
  const behavior = createBehavior(states);

  behavior.attachPet(fakePet);
  behavior.setMovementState({
    companionStyle: "quiet",
    phase: "settle",
    locomotion: "none"
  });
  behavior.triggerInteraction();

  assert.equal(states.at(-1), "waving");
  behavior.update(getStateCycleDurationMs("waving") * 2 + 1);
  assert.equal(states.at(-1), "waiting");
});

test("click cooldown prevents immediate repeat and playful style gets a stronger response", () => {
  const states = [];
  const behavior = createBehavior(states);

  behavior.attachPet(fakePet);
  behavior.setMovementState({
    companionStyle: "curious",
    phase: "observe",
    locomotion: "none"
  });
  behavior.triggerInteraction();
  behavior.triggerInteraction();

  assert.equal(states.at(-1), "waving");

  behavior.update(COMPANION_STYLE_PROFILES.curious.interactionCooldownMs + 1);
  behavior.setMovementState({
    companionStyle: "playful",
    phase: "observe",
    locomotion: "none"
  });
  behavior.triggerInteraction();

  assert.equal(states.at(-1), "jumping");
});

test("long inactivity becomes sleepy and a click wakes the behavior", () => {
  const behavior = createBehavior([], {
    sleepAfterMs: 1000
  });

  behavior.attachPet(fakePet);
  behavior.setMovementState({
    companionStyle: "focus",
    phase: "observe",
    locomotion: "none"
  });
  behavior.update(1001);

  assert.equal(behavior.getSnapshot().mood, "sleepy");

  behavior.triggerInteraction();

  assert.equal(behavior.getSnapshot().mood, "playful");
});

test("movement locomotion still drives directional states", () => {
  const states = [];
  const behavior = createBehavior(states);

  behavior.attachPet(fakePet);
  behavior.setMovementState({
    companionStyle: "curious",
    phase: "stroll",
    locomotion: "right"
  });
  assert.equal(states.at(-1), "running-right");
});

test("focus observe resolves to a true still runtime state", () => {
  const states = [];
  const behavior = createBehavior(states);

  behavior.attachPet(fakePet);
  behavior.setMovementState({
    companionStyle: "focus",
    phase: "observe",
    locomotion: "none"
  });

  assert.equal(states.at(-1), "still");
});

function createBehavior(states, timings = {}) {
  return new PetBehavior({
    onStateChange: (state) => states.push(state),
    random: () => 0,
    timings
  });
}
