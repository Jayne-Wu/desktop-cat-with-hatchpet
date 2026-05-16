import assert from "node:assert/strict";
import { test } from "node:test";
import { ATLAS_STATES, getStateCycleDurationMs } from "../app/renderer/pet/codex-pet-spec.js";
import { PetBehavior } from "../app/renderer/pet/pet-behavior.js";

const fakePet = {
  states: Object.fromEntries(ATLAS_STATES.map((state) => [state.id, state]))
};

test("interaction action returns to idle after a finite duration", () => {
  const states = [];
  const behavior = createBehavior(states);

  behavior.attachPet(fakePet);
  behavior.triggerInteraction();

  assert.equal(states.at(-1), "waving");
  behavior.update(getStateCycleDurationMs("waving") * 2 + 1);
  assert.equal(states.at(-1), "idle");
});

test("click cooldown prevents immediate repeat and combo advances after cooldown", () => {
  const states = [];
  const behavior = createBehavior(states, {
    clickCooldownMs: 360
  });

  behavior.attachPet(fakePet);
  behavior.triggerInteraction();
  behavior.triggerInteraction();

  assert.equal(states.at(-1), "waving");

  behavior.update(361);
  behavior.triggerInteraction();

  assert.equal(states.at(-1), "jumping");
});

test("ambient actions return to idle and avoid immediate repeats", () => {
  const states = [];
  const behavior = createBehavior(states, {
    ambientDelayMsByMood: {
      calm: [1, 1]
    }
  });

  behavior.attachPet(fakePet);
  behavior.update(2);
  const firstAmbientState = states.at(-1);

  assert.equal(firstAmbientState, "waiting");

  behavior.update(getStateCycleDurationMs(firstAmbientState) * 2 + 1);
  assert.equal(states.at(-1), "idle");

  behavior.update(2);
  assert.notEqual(states.at(-1), firstAmbientState);
});

test("long inactivity becomes sleepy and a click wakes the behavior", () => {
  const behavior = createBehavior([], {
    sleepAfterMs: 1000,
    ambientDelayMsByMood: {
      calm: [999999, 999999]
    }
  });

  behavior.attachPet(fakePet);
  behavior.update(1001);

  assert.equal(behavior.getSnapshot().mood, "sleepy");

  behavior.triggerInteraction();

  assert.equal(behavior.getSnapshot().mood, "curious");
});

function createBehavior(states, timings = {}) {
  return new PetBehavior({
    onStateChange: (state) => states.push(state),
    random: () => 0,
    timings
  });
}
